/**
 * FormIO: File Upload Renderer Component
 *
 * Thin Form.io adapter — all UI (button, file list, status icons, remove)
 * is rendered by the shared `FileUploaderCore` React component via createRoot.
 *
 * This file is responsible only for:
 *   - schema / statics delegation to FileUploaderComponent
 *   - mounting / unmounting the React core (attach / detach / destroy)
 *   - mirroring file state from React → Form.io data (getValue / setValue / dataValue)
 *   - checkComponentValidity (required + scan-in-progress guard)
 *   - beforeSubmit (deferred upload for files in 'scanned' or 'pending' state)
 *   - builder _fileCache for preview across Form.io destroy/recreate cycles
 *
 * Upload + scan helpers live in:
 *   src/components/react/FileUploaderCore/file-uploader-helpers.ts
 *
 * File lifecycle:
 *   1. On file pick: status → 'pending'. If scanEnabled → immediate scan;
 *      status → 'scanned' (pass) or 'error' (fail).
 *   2. beforeSubmit: uploads each 'scanned' (scan on) / 'pending' (scan off)
 *      file to uploadApiUrl; status → 'success'. Blocks on any ongoing scan.
 *   3. Submission data: full server response bound per file.
 *   4. On form reload: files shown as clickable links via stored server URL.
 */

import React from 'react'
import { createRoot, type Root } from 'react-dom/client'

import { FileUploaderComponent } from '../../components/FileUpload'
import { FileUploaderCore } from '../../components/react/FileUploaderCore/FileUploaderCore'
import {
  buildApiHeaders,
  normalizeValueToEntries,
  selectedFilesToValue,
  uploadFileEntry,
} from '../../components/react/FileUploaderCore/file-uploader-helpers'
import type { SelectedFileEntry } from '../../components/react/FileUploaderCore/file-uploader-helpers'

/**
 * Module-level cache: preserves selectedFiles across Form.io destroy/recreate
 * cycles in the builder preview. Keyed by component key.
 */
const _fileCache = new Map<string, SelectedFileEntry[]>()

/**
 * Module-level React mount cache: preserves the React root + persistent mount
 * div across Form.io destroy/recreate cycles in the designer preview.
 *
 * Form.io destroys and recreates the preview instance on every edit-dialog
 * tab change. Without this cache, each recreate triggers a fresh createRoot()
 * which causes the visible "jerk". With it, the new instance retrieves the
 * same React root + div and skips the full remount.
 *
 * Keyed by component key (same as _fileCache).
 */
const _reactMountCache = new Map<string, { mount: HTMLDivElement; root: Root }>()

export default function createFileUploaderClass(FieldComponent: any) {
  return class FileUploaderFormIO extends FieldComponent {
    /** Mirror of the React core's current file state. Used by getValue/beforeSubmit. */
    _selectedFiles: SelectedFileEntry[] = []
    _syncing = false
    _lastValueJSON = ''
    _submitInProgress = false
    _reactRoot: Root | null = null
    /**
     * Persistent mount div — survives Form.io attach/detach/destroy cycles.
     * Moved into the new container on each attach() via appendChild() so the
     * React tree is never torn down when Form.io rebuilds the outer DOM.
     */
    _persistentMount: HTMLDivElement | null = null

    static schema(...extend: any[]) {
      return FieldComponent.schema(FileUploaderComponent.schema(), ...extend)
    }

    static get builderInfo() {
      return FileUploaderComponent.builderInfo
    }

    static editForm() {
      return FileUploaderComponent.editForm()
    }

    get defaultSchema() {
      return FileUploaderFormIO.schema()
    }

    get isMultiple(): boolean {
      return this.component?.multiple ?? false
    }

    get maxFiles(): number {
      return this.component?.maxFiles ?? 1
    }

    constructor(component: any, options: any, data: any) {
      super(component, options, data)
      const key = component?.key
      if (data && key && Array.isArray(data[key])) {
        this._selectedFiles = normalizeValueToEntries(data[key])
        this._lastValueJSON = JSON.stringify(selectedFilesToValue(this._selectedFiles))
      } else if (key) {
        const cached = _fileCache.get(key)
        if (cached) {
          this._selectedFiles = [...cached]
          this._lastValueJSON = JSON.stringify(selectedFilesToValue(this._selectedFiles))
        }
      }
    }

    // ── Value binding ─────────────────────────────────────────────────────

    getValue() {
      return selectedFilesToValue(this._selectedFiles)
    }

    setValue(value: any, flags?: any) {
      if (this._syncing) return super.setValue(value, flags)
      if (value != null && value !== '') {
        const valueJSON = JSON.stringify(value)
        if (valueJSON === this._lastValueJSON) return super.setValue(value, flags)
        this._lastValueJSON = valueJSON
        this._selectedFiles = normalizeValueToEntries(value)
        this._renderReact()
      }
      return super.setValue(value, flags)
    }

    isEmpty(value?: any) {
      const val = value ?? this.dataValue
      if (Array.isArray(val)) return val.length === 0
      return !val
    }

    // ── Validation ────────────────────────────────────────────────────────

    checkComponentValidity(data?: any, dirty?: boolean, rowData?: any, options?: any) {
      if (this._selectedFiles.some((f) => f.status === 'scanning')) {
        this.setCustomValidity('File scan is in progress. Please wait.')
        return false
      }

      if (!dirty) {
        this.setCustomValidity('')
        return true
      }

      if (this.component?.validate?.required) {
        const hasValid = this._selectedFiles.some((f) => f.status !== 'error')
        if (this._selectedFiles.length === 0 || !hasValid) {
          const msg = this.component.validate.customMessage || 'File is required'
          this.setCustomValidity(msg)
          return false
        }
      }

      const customValidation = this.component?.validate?.custom
      if (customValidation && this._selectedFiles.length > 0) {
        try {
          const input = this.getValue()
          const formData = this.data
          const row = rowData || this.data
          const component = this.component
          const instance = this
          const fn = new Function(
            'input', 'formData', 'row', 'component', 'instance',
            `let valid = true;\n${customValidation}\nreturn valid;`,
          )
          const valid: boolean | string = fn(input, formData, row, component, instance)
          if (valid !== true) {
            const msg =
              typeof valid === 'string'
                ? valid
                : this.component.validate?.customMessage || 'Custom validation failed'
            this.setCustomValidity(msg)
            return false
          }
        } catch (err) {
          // Intentionally swallowed to preserve Form.io behavior; log for debugging.
          // eslint-disable-next-line no-console
          console.warn('[FileUploaderFormIO] Custom validation error:', err)
        }
      }

      this.setCustomValidity('')
      return true
    }

    // ── Before submit (deferred upload) ──────────────────────────────────

    async beforeSubmit(): Promise<any> {
      const uploadApiUrl = (this.component?.uploadApiUrl as string | undefined)?.trim()

      if (!uploadApiUrl) {
        return typeof FieldComponent.prototype.beforeSubmit === 'function'
          ? FieldComponent.prototype.beforeSubmit.call(this)
          : Promise.resolve()
      }

      if (this._submitInProgress) {
        return typeof FieldComponent.prototype.beforeSubmit === 'function'
          ? FieldComponent.prototype.beforeSubmit.call(this)
          : Promise.resolve()
      }

      this._submitInProgress = true

      try {
        if (this._selectedFiles.some((f) => f.status === 'scanning')) {
          const msg = 'File scan is in progress. Please wait before submitting.'
          this.setCustomValidity(msg)
          this._submitInProgress = false
          return Promise.reject(new Error(msg))
        }

        const scanEnabled = this.component?.scanEnabled ?? false
        const pendingFiles = this._selectedFiles.filter((f) => {
          if (f.status === 'error' || f.status === 'success') return false
          if (scanEnabled) return f.status === 'scanned' && !!f.file
          return f.status === 'pending' && !!f.file
        })

        const headers = buildApiHeaders(
          this.component?.apiType,
          this.component?.authType,
          this.component?.authUsername,
          this.component?.authPassword,
          this.component?.partnerId,
        )

        for (const fileEntry of pendingFiles) {
          const result = await uploadFileEntry(fileEntry.file!, uploadApiUrl, headers)
          if (!result.success) {
            fileEntry.status = 'error'
            fileEntry.error = result.message
            this._renderReact()
            this.setCustomValidity(result.message ?? 'File upload failed.')
            this._submitInProgress = false
            return Promise.reject(new Error(result.message))
          }

          const resp = result.response
          fileEntry.status = 'success'
          fileEntry.file = undefined
          fileEntry.serverResponse = resp
          if (resp) {
            fileEntry.url = String(
              resp.url ?? resp.path ?? resp.location ?? resp.fileUrl ?? resp.filePath ?? fileEntry.url ?? '',
            )
            fileEntry.path = typeof resp.path === 'string' ? resp.path : fileEntry.path
            fileEntry.name = typeof resp.name === 'string' ? resp.name : fileEntry.name
            fileEntry.size = typeof resp.size === 'number' ? resp.size : fileEntry.size
            fileEntry.type = typeof resp.type === 'string' ? resp.type : fileEntry.type
          }
        }

        this._syncFormValue()
        this.setCustomValidity('')
        this._submitInProgress = false
        return typeof FieldComponent.prototype.beforeSubmit === 'function'
          ? FieldComponent.prototype.beforeSubmit.call(this)
          : Promise.resolve()
      } catch (err) {
        this._submitInProgress = false
        return Promise.reject(err)
      }
    }

    // ── Sync files → Form.io data ─────────────────────────────────────────

    _syncFormValue() {
      const key = this.component?.key
      const val = this.getValue()
      if (key && this.data) this.data[key] = val
      this._syncing = true
      super.dataValue = val
      this.triggerChange()
      this._syncing = false
    }

    /**
     * Called by the React core whenever its file state changes.
     * Updates the mirror and propagates the change through Form.io.
     */
    _commitFromReact(files: SelectedFileEntry[]) {
      if (this._syncing) return
      this._selectedFiles = files
      const key = this.component?.key
      if (key) _fileCache.set(key, [...files])
      this._syncFormValue()
    }

    // ── Render / attach ───────────────────────────────────────────────────

    render() {
      return super.render('<div ref="fileUploaderReactContainer"></div>')
    }

    /**
     * Override redraw() to block the DOM rebuild when React is already live.
     *
     * Form.io calls redraw() on every edit-form property change and on every
     * tab switch in the designer. Without this override, each redraw triggers
     * detach() → attach(), which destroys and recreates the React root —
     * causing the visible jerk in the preview.
     *
     * When the persistent mount is live, we skip the DOM rebuild entirely and
     * just push updated props into the existing React tree.
     */
    redraw() {
      if (this._reactRoot && this._persistentMount) {
        this._renderReact()
        return Promise.resolve()
      }
      return super.redraw()
    }

    attach(element: HTMLElement) {
      const result = super.attach(element)

      this.loadRefs(element, {
        fileUploaderReactContainer: 'single',
      })

      const container = (this.refs as any)?.fileUploaderReactContainer as
        | HTMLElement
        | undefined
      if (!container) return result

      const cacheKey = this.component?.key || ''

      // Retrieve cached root + mount from a previous instance if available.
      // This fires when Form.io destroys + recreates the instance (designer tab
      // change). The new instance reuses the existing React root so no remount.
      if (!this._persistentMount && cacheKey) {
        const cached = _reactMountCache.get(cacheKey)
        if (cached) {
          this._persistentMount = cached.mount
          this._reactRoot = cached.root
          _reactMountCache.delete(cacheKey)
        }
      }

      // Create the persistent mount div on first-ever attach.
      if (!this._persistentMount) {
        this._persistentMount = document.createElement('div')
        this._persistentMount.className = 'file-uploader-react-mount'
      }

      // Move (or append) the persistent div into the new container.
      // appendChild on an already-in-DOM node simply moves it — the React
      // tree stays intact, no unmount/remount, no visible jerk.
      container.innerHTML = ''
      container.appendChild(this._persistentMount)

      if (!this._reactRoot) {
        this._reactRoot = createRoot(this._persistentMount)
      }

      this._renderReact()
      return result
    }

    detach() {
      // Do NOT unmount the React root on detach — Form.io calls detach()
      // before every redraw/reattach cycle in the designer, so unmounting
      // here would cause the visible jerk. The root stays live and is reused
      // on the next attach(). It is only fully unmounted in destroy().
      return super.detach()
    }

    destroy() {
      const key = this.component?.key
      if (key && this._selectedFiles.length > 0) {
        _fileCache.set(key, [...this._selectedFiles])
      }

      // Cache the React root + mount div so the next preview instance created
      // after Form.io's destroy/recreate cycle can reuse them.
      const cacheKey = key || ''
      if (cacheKey && this._persistentMount && this._reactRoot) {
        _reactMountCache.set(cacheKey, {
          mount: this._persistentMount,
          root: this._reactRoot,
        })
        this._reactRoot = null
        this._persistentMount = null
      } else {
        this._unmountReact()
      }

      this._selectedFiles = []
      super.destroy()
    }

    // ── React helpers ─────────────────────────────────────────────────────

    _unmountReact() {
      if (this._reactRoot) {
        const root = this._reactRoot
        this._reactRoot = null
        queueMicrotask(() => { try { root.unmount() } catch { /* already gone */ } })
      }
    }

    _renderReact() {
      if (!this._reactRoot) return
      const c = this.component || {}

      const tabIndex =
        c.tabindex !== '' && c.tabindex != null && Number.isFinite(Number(c.tabindex))
          ? Number(c.tabindex)
          : undefined

      const self = this
      const currentValue = selectedFilesToValue(this._selectedFiles)

      this._reactRoot.render(
        React.createElement(FileUploaderCore, {
          value: currentValue,
          uploadButtonLabel: c.uploadButtonLabel || 'Upload',
          uploadIcon: c.uploadIcon || 'fa fa-upload',
          showFileList: c.showFileList !== false,
          showFileSize: c.showFileSize !== false,
          disabled: c.disabled === true || (this as any).disabled === true,
          readOnly: (this as any).options?.readOnly === true,
          multiple: c.multiple === true,
          maxFiles: typeof c.maxFiles === 'number' ? c.maxFiles : 1,
          allowRemove: c.allowRemove !== false,
          autoFocus: c.autofocus === true,
          tabIndex,
          acceptedExtensions: c.acceptedExtensions || '',
          allowedFileTypes: c.allowedFileTypes || '',
          maxFileSize: c.maxFileSize || '10MB',
          uploadApiUrl: c.uploadApiUrl || '',
          scanEnabled: c.scanEnabled === true,
          scanApiUrl: c.scanApiUrl || '',
          // Form.io always uses deferred upload — upload runs in beforeSubmit.
          uploadMode: 'deferred',
          apiType: c.apiType || 'custom',
          authType: c.authType,
          authUsername: c.authUsername,
          authPassword: c.authPassword,
          partnerId: c.partnerId,
          onChange: (files: SelectedFileEntry[]) => self._commitFromReact(files),
        }),
      )
    }
  }
}
