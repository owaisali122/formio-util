/**
 * FormIO: File Upload Renderer Component
 *
 * Renders a compact icon-button file uploader inside a Form.io field.
 * Works standalone and inside table/grid/list rows.
 *
 * Schema properties (from designer):
 *   type: 'fileUploader', uploadButtonLabel, uploadIcon, multiple,
 *   allowedFileTypes, acceptedExtensions, maxFileSize, maxFiles,
 *   allowRemove, showFileList, showFileSize, autofocus,
 *   apiType, scanEnabled, scanApiUrl, uploadApiUrl,
 *   authType, authUsername, authPassword, partnerId
 *
 * File lifecycle:
 *   1. On file pick: status → 'pending'. If scanEnabled + scanApiUrl → immediate POST to
 *      scan API; status → 'scanned' (pass) or 'error' (fail/infected).
 *   2. beforeSubmit: blocks if any file is still 'scanning'.
 *   3. POST to uploadApiUrl for each 'scanned' (scan on) or 'pending' (scan off) file.
 *   4. Full server response bound into submission data (status → 'success').
 *   5. On form reload: file shown as clickable link using the stored server URL.
 */

import { FileUploaderComponent } from '../../components/FileUpload'
import { createComponentLogger, describeFile, type ComponentLogger } from '../../utils/logger'

interface SelectedFile {
  name: string
  size: number
  type: string
  file?: File
  url?: string
  path?: string
  serverResponse?: Record<string, any>
  status: 'pending' | 'scanning' | 'scanned' | 'success' | 'error'
  error?: string
}

/**
 * Module-level cache: preserves selectedFiles across Form.io destroy/recreate cycles
 * in the builder preview. Keyed by component key.
 */
const _fileCache = new Map<string, SelectedFile[]>()

export default function createFileUploaderClass(FieldComponent: any) {
  return class FileUploaderFormIO extends FieldComponent {
    selectedFiles: SelectedFile[] = []
    _syncing: boolean = false
    _lastValueJSON: string = ''
    _submitInProgress: boolean = false
    _logger!: ComponentLogger

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

    get acceptedExtensions(): string {
      return this.component?.acceptedExtensions || ''
    }

    get allowedFileTypes(): string {
      return this.component?.allowedFileTypes || ''
    }

    get maxFileSizeBytes(): number {
      const raw = this.component?.maxFileSize || '10MB'
      const match = raw.match(/^(\d+(?:\.\d+)?)\s*(KB|MB|GB)?$/i)
      if (!match) return 10 * 1024 * 1024
      const num = parseFloat(match[1])
      const unit = (match[2] || 'MB').toUpperCase()
      if (unit === 'KB') return num * 1024
      if (unit === 'GB') return num * 1024 * 1024 * 1024
      return num * 1024 * 1024
    }

    constructor(component: any, options: any, data: any) {
      super(component, options, data)
      this._logger = createComponentLogger({
        component: 'FileUpload',
        key: component?.key,
        multiple: !!component?.multiple,
        scanEnabled: !!component?.scanEnabled,
      })
      const key = component.key
      if (data && key && Array.isArray(data[key])) {
        this.selectedFiles = data[key]
          .filter((v: any) => v)
          .map((v: any) => ({
            name: v.name || 'file',
            size: v.size || 0,
            type: v.type || '',
            url: v.url,
            path: v.path,
            serverResponse: v,
            status: 'success' as const,
          }))
      } else if (key) {
        // Restore from preview cache when Form.io recreates the component in the builder
        const cached = _fileCache.get(key)
        if (cached) this.selectedFiles = [...cached]
      }
    }

    getValue() {
      return this.selectedFiles
        .filter((f) => f.status !== 'error')
        .map((f) => {
          // Return the full server response object when available so the
          // exact payload the upload API returned is what gets persisted to DB.
          if (f.serverResponse) return { ...f.serverResponse }
          // Pending / scanned files not yet uploaded: return local metadata.
          return {
            name: f.name,
            size: f.size,
            type: f.type,
            ...(f.url && !f.url.startsWith('blob:') ? { url: f.url } : {}),
            ...(f.path ? { path: f.path } : {}),
          }
        })
    }

    setValue(value: any, flags?: any) {
      if (this._syncing) return super.setValue(value, flags)
      if (value != null && value !== '') {
        const valueJSON = JSON.stringify(value)
        if (valueJSON === this._lastValueJSON) return super.setValue(value, flags)
        this._lastValueJSON = valueJSON

        const arr = Array.isArray(value) ? value : [value]
        this.selectedFiles = arr
          .filter((v: any) => v)
          .map((v: any) => ({
            name: v.name || 'file',
            size: v.size || 0,
            type: v.type || '',
            url: v.url,
            path: v.path,
            serverResponse: v,
            status: 'success' as const,
          }))
        this.updateFileListUI()
      }
      return super.setValue(value, flags)
    }

    isEmpty(value?: any) {
      const val = value ?? this.dataValue
      if (Array.isArray(val)) return val.length === 0
      return !val
    }

    checkComponentValidity(data?: any, dirty?: boolean, rowData?: any, options?: any) {
      // Always block while a scan is in progress — regardless of dirty state
      if (this.selectedFiles.some((f) => f.status === 'scanning')) {
        const msg = 'File scan is in progress. Please wait.'
        this.setCustomValidity(msg)
        return false
      }

      // Required + custom JS validation only fires when the field has been
      // touched or the form is submitted (dirty=true). This prevents the
      // error from appearing permanently on initial render.
      if (!dirty) {
        this.setCustomValidity('')
        return true
      }

      if (this.component?.validate?.required) {
        if (this.selectedFiles.length === 0 || !this.selectedFiles.some((f) => f.status !== 'error')) {
          const msg = this.component.validate.customMessage || 'File is required'
          this.setCustomValidity(msg)
          return false
        }
      }

      // Custom JavaScript validation
      const customValidation = this.component?.validate?.custom
      if (customValidation && this.selectedFiles.length > 0) {
        try {
          const input = this.getValue()
          const formData = this.data
          const row = rowData || this.data
          const component = this.component
          const instance = this
          const fn = new Function('input', 'formData', 'row', 'component', 'instance',
            `let valid = true;\n${customValidation}\nreturn valid;`)
          const valid: boolean | string = fn(input, formData, row, component, instance)
          if (valid !== true) {
            const msg = typeof valid === 'string' ? valid : (this.component.validate?.customMessage || 'Custom validation failed')
            this.setCustomValidity(msg)
            return false
          }
        } catch (err) {
          this._logger.error('Custom validation error', err, { action: 'checkComponentValidity' })
        }
      }

      this.setCustomValidity('')
      return true
    }

    async beforeSubmit(): Promise<any> {
      const uploadApiUrl = (this.component?.uploadApiUrl as string | undefined)?.trim()

      // Backward compat: no upload API configured → deferred mode, skip API calls
      if (!uploadApiUrl) {
        return typeof FieldComponent.prototype.beforeSubmit === 'function'
          ? FieldComponent.prototype.beforeSubmit.call(this)
          : Promise.resolve()
      }

      // Guard against duplicate calls during a single submit
      if (this._submitInProgress) {
        return typeof FieldComponent.prototype.beforeSubmit === 'function'
          ? FieldComponent.prototype.beforeSubmit.call(this)
          : Promise.resolve()
      }

      this._submitInProgress = true

      try {
        const scanEnabled = this.component?.scanEnabled ?? false

        // Block submit if any file is still being scanned (triggered at pick time)
        if (this.selectedFiles.some((f) => f.status === 'scanning')) {
          const msg = 'File scan is in progress. Please wait before submitting.'
          this.setCustomValidity(msg)
          this._submitInProgress = false
          return Promise.reject(new Error(msg))
        }

        // Upload scanned files (scan enabled) or pending files (scan disabled)
        const pendingFiles = this.selectedFiles.filter((f) => {
          if (f.status === 'error' || f.status === 'success') return false
          if (scanEnabled) return f.status === 'scanned' && !!f.file
          return f.status === 'pending' && !!f.file
        })

        for (const fileEntry of pendingFiles) {
          const file = fileEntry.file!

          // Upload
          const uploadForm = new FormData()
          uploadForm.append('file', file)
          let uploadResponse: Response
          try {
            uploadResponse = await fetch(uploadApiUrl, { method: 'POST', body: uploadForm, headers: this.buildApiHeaders() })
          } catch (err) {
            const msg = 'File upload failed: service unavailable.'
            this._logger.error('Upload network error', err, { action: 'upload.networkError', ...describeFile(fileEntry) })
            fileEntry.status = 'error'
            fileEntry.error = msg
            this.updateFileListUI()
            this.setCustomValidity(msg)
            this._submitInProgress = false
            return Promise.reject(new Error(msg))
          }

          if (!uploadResponse.ok) {
            let msg = 'File upload failed.'
            try {
              const text = await uploadResponse.text()
              try {
                const body = JSON.parse(text)
                if (typeof body === 'string') msg = body
                else if (body?.message) msg = body.message
                else if (body?.error) msg = body.error
              } catch { msg = text.trim() || msg }
            } catch { /* ignore */ }
            this._logger.warn('Upload returned non-OK status', {
              action: 'upload.failure',
              status: uploadResponse.status,
              ...describeFile(fileEntry),
            })
            fileEntry.status = 'error'
            fileEntry.error = msg
            this.updateFileListUI()
            this.setCustomValidity(msg)
            this._submitInProgress = false
            return Promise.reject(new Error(msg))
          }

          // Bind full server response into the file entry so the DB receives
          // exactly what the upload API returned.
          try {
            const body = JSON.parse(await uploadResponse.text())
            if (body && typeof body === 'object') {
              fileEntry.serverResponse = body
              fileEntry.url = body.url || body.path || body.location || body.fileUrl || body.filePath || fileEntry.url
              fileEntry.path = body.path
              fileEntry.name = body.name || fileEntry.name
              fileEntry.size = body.size || fileEntry.size
              fileEntry.type = body.type || fileEntry.type
            } else if (typeof body === 'string') {
              fileEntry.url = body
            }
          } catch { /* ignore — url already set from headers if needed */ }

          fileEntry.status = 'success'
          fileEntry.file = undefined
        }

        // Flush the resolved server URLs into submission data
        this.syncFormValue()
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

    syncFormValue() {
      const key = this.component?.key
      const val = this.getValue()
      if (key && this.data) this.data[key] = val
      this._syncing = true
      super.dataValue = val
      this.triggerChange()
      this._syncing = false
    }

    render() {
      const iconClass = this.component.uploadIcon || 'fa fa-upload'
      const label = this.component.uploadButtonLabel || ''
      const accept = this.acceptedExtensions || this.allowedFileTypes || ''
      const isDisabled = this.disabled
      const tabindex = this.component.tabindex !== '' && this.component.tabindex != null
        ? ` tabindex="${Number(this.component.tabindex)}"` : ''

      return super.render(`
        <div ref="fileUploaderContainer" class="formio-file-uploader">
          <button type="button" ref="uploadBtn"
                  class="btn btn-outline-secondary btn-sm${isDisabled ? ' disabled' : ''}"
                  title="${label || 'Upload file'}"
                  ${isDisabled ? 'disabled' : ''}${tabindex}>
            <i class="${iconClass}"></i>${label ? ' ' + this.t(label) : ''}
          </button>
          <input ref="fileInput" type="file"
                 ${this.isMultiple ? 'multiple' : ''}
                 ${accept ? 'accept="' + accept + '"' : ''}
                 ${isDisabled ? 'disabled' : ''}
                 style="display:none;" />
          <div ref="fileList" class="formio-file-uploader-list"></div>
        </div>
      `)
    }

    attach(element: HTMLElement) {
      const result = super.attach(element)
      this.loadRefs(element, {
        fileUploaderContainer: 'single',
        uploadBtn: 'single',
        fileInput: 'single',
        fileList: 'single',
      })

      const btn = (this.refs as any)?.uploadBtn as HTMLElement | undefined
      const fileInput = (this.refs as any)?.fileInput as HTMLInputElement | undefined

      if (btn && fileInput) {
        if (!this.disabled) {
          this.addEventListener(btn, 'click', (e: Event) => {
            e.preventDefault()
            fileInput.click()
          })

          this.addEventListener(fileInput, 'change', () => {
            const files = fileInput.files
            if (files && files.length > 0) {
              this.handleFiles(files)
              fileInput.value = ''
            }
          })
        }
      }

      if (this.selectedFiles.length > 0) {
        this.updateFileListUI()
      }

      // Initial focus
      if (this.component?.autofocus) {
        const focusBtn = (this.refs as any)?.uploadBtn as HTMLElement | undefined
        if (focusBtn) setTimeout(() => focusBtn.focus(), 50)
      }

      return result
    }

    handleFiles(fileList: FileList) {
      const files = Array.from(fileList)

      if (!this.isMultiple) {
        this.selectedFiles = []
      }

      const maxFiles = this.maxFiles
      // Read once — these don't change between files
      const scanEnabled = this.component?.scanEnabled ?? false
      const scanApiUrl = (this.component?.scanApiUrl as string | undefined)?.trim()

      for (const file of files) {
        if (maxFiles > 0 && this.selectedFiles.length >= maxFiles) break

        const error = this.validateFile(file)
        if (error) {
          this.selectedFiles.push({
            name: file.name,
            size: file.size,
            type: file.type,
            status: 'error',
            error,
          })
          continue
        }

        const fileEntry: SelectedFile = {
          name: file.name,
          size: file.size,
          type: file.type,
          file,
          url: URL.createObjectURL(file),
          status: 'pending',
        }
        this.selectedFiles.push(fileEntry)

        if (scanEnabled && scanApiUrl) {
          this.runScanNow(fileEntry)
        }
      }

      this.updateFileListUI()
      this.syncFormValue()
      const cKey = this.component?.key
      if (cKey) _fileCache.set(cKey, [...this.selectedFiles])
    }

    // Builds authorization headers for scan/upload API calls.
    // Returns an empty object for 'custom' apiType; adds Authorization + partner-id for 'secure'.
    buildApiHeaders(): Record<string, string> {
      const apiType = (this.component?.apiType as string | undefined) ?? 'custom'
      if (apiType !== 'secure') return {}

      const headers: Record<string, string> = {}
      const authType = (this.component?.authType as string | undefined) ?? 'basic'
      if (authType === 'basic') {
        const username = (this.component?.authUsername as string | undefined) ?? ''
        const password = (this.component?.authPassword as string | undefined) ?? ''
        if (username || password) {
          headers['Authorization'] = `Basic ${btoa(`${username}:${password}`)}`
        }
      }
      const partnerId = (this.component?.partnerId as string | undefined)?.trim()
      if (partnerId) headers['partner-id'] = partnerId
      return headers
    }

    // Called immediately when a file is picked and scanEnabled is true.
    // Updates the file entry status as the scan progresses and re-renders the list.
    async runScanNow(fileEntry: SelectedFile): Promise<void> {
      const scanApiUrl = (this.component?.scanApiUrl as string | undefined)?.trim()
      if (!scanApiUrl || !fileEntry.file) return

      fileEntry.status = 'scanning'
      this.updateFileListUI()

      try {
        const scanForm = new FormData()
        scanForm.append('file', fileEntry.file)
        let response: Response
        try {
          this._logger.debug('Starting file scan', { action: 'scan.start', ...describeFile(fileEntry) })
          response = await fetch(scanApiUrl, { method: 'POST', body: scanForm, headers: this.buildApiHeaders() })
        } catch (err) {
          this._logger.error('Scan network error', err, { action: 'scan.networkError', ...describeFile(fileEntry) })
          fileEntry.status = 'error'
          fileEntry.error = 'File scan failed: service unavailable.'
          return
        }

        if (!response.ok) {
          // Non-2xx → scan rejected (e.g. 422 for infected)
          let msg = 'File did not pass security scan.'
          try {
            const body = JSON.parse(await response.text())
            if (body?.message) msg = body.message
            else if (body?.error) msg = body.error
          } catch { /* ignore */ }
          this._logger.warn('Scan rejected file', {
            action: 'scan.rejected',
            status: response.status,
            ...describeFile(fileEntry),
          })
          fileEntry.status = 'error'
          fileEntry.error = msg
          return
        }

        // 2xx response — check `status` field in body (some APIs return 200 with 'infected')
        try {
          const body = JSON.parse(await response.text())
          if (body?.status === 'infected') {
            fileEntry.status = 'error'
            fileEntry.error = body.message || 'File did not pass security scan.'
          } else {
            // status: 'clean' or any successful response
            fileEntry.status = 'scanned'
            fileEntry.error = undefined
          }
        } catch {
          // Unparseable body but response was OK → treat as passed
          fileEntry.status = 'scanned'
          fileEntry.error = undefined
        }
      } finally {
        this.updateFileListUI()
        this.syncFormValue()
      }
    }

    validateFile(file: File): string | null {
      if (file.size > this.maxFileSizeBytes) {
        return `File exceeds maximum size of ${this.component?.maxFileSize || '10MB'}.`
      }

      const accepted = this.acceptedExtensions
      if (accepted) {
        const exts = accepted.split(',').map((e: string) => e.trim().toLowerCase())
        const name = file.name.toLowerCase()
        const valid = exts.some((ext: string) => {
          if (ext.startsWith('.')) return name.endsWith(ext)
          return file.type === ext
        })
        if (!valid) return `File type not allowed. Accepted: ${accepted}`
      }

      const mimeTypes = this.allowedFileTypes
      if (mimeTypes) {
        const types = mimeTypes.split(',').map((t: string) => t.trim().toLowerCase())
        const valid = types.some((t: string) => {
          if (t.endsWith('/*')) return file.type.startsWith(t.replace('/*', '/'))
          return file.type === t
        })
        if (!valid) return `File type not allowed. Accepted: ${mimeTypes}`
      }

      return null
    }

    updateFileListUI() {
      const listEl = (this.refs as any)?.fileList as HTMLElement | undefined
      if (!listEl) return

      const showList = this.component?.showFileList ?? true
      if (!showList || this.selectedFiles.length === 0) {
        listEl.innerHTML = ''
        return
      }

      const showSize = this.component?.showFileSize ?? true
      const allowRemove = this.component?.allowRemove ?? true
      listEl.innerHTML = ''

      for (let i = 0; i < this.selectedFiles.length; i++) {
        const f = this.selectedFiles[i]
        const row = document.createElement('div')
        row.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:12px;margin-top:4px;'

        // Status icon — only rendered for statuses that have a visual indicator
        if (f.status !== 'pending') {
          const iconSpan = document.createElement('span')
          if (f.status === 'scanning') {
            iconSpan.innerHTML = '<i class="fa fa-spinner fa-spin text-primary"></i>'
            iconSpan.title = 'Scanning…'
          } else if (f.status === 'scanned') {
            iconSpan.innerHTML = '<i class="fa fa-shield text-success"></i>'
            iconSpan.title = 'Scan passed'
          } else if (f.status === 'success') {
            iconSpan.innerHTML = '<i class="fa fa-check-circle text-success"></i>'
            iconSpan.title = 'Uploaded'
          } else if (f.status === 'error') {
            iconSpan.innerHTML = '<i class="fa fa-exclamation-circle text-danger"></i>'
            iconSpan.title = 'Error'
          }
          row.appendChild(iconSpan)
        }

        // File name: clickable link for server-uploaded files, plain text otherwise
        const isServerUrl = !!f.url && !f.url.startsWith('blob:')
        if (f.status === 'success' && isServerUrl) {
          const link = document.createElement('a')
          link.href = f.url!
          link.target = '_blank'
          link.rel = 'noopener noreferrer'
          link.style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:160px;'
          link.title = f.name
          link.textContent = f.name
          row.appendChild(link)
        } else {
          const nameSpan = document.createElement('span')
          nameSpan.style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:160px;'
          nameSpan.title = f.name
          nameSpan.textContent = f.name
          row.appendChild(nameSpan)
        }

        if (showSize && f.size > 0) {
          const sizeSpan = document.createElement('span')
          sizeSpan.style.color = '#aaa'
          sizeSpan.textContent = '(' + this.formatFileSize(f.size) + ')'
          row.appendChild(sizeSpan)
        }

        if (f.status === 'scanning') {
          const scanMsg = document.createElement('span')
          scanMsg.style.color = '#0d6efd'
          scanMsg.textContent = 'Scanning…'
          row.appendChild(scanMsg)
        }

        if (f.error) {
          const errSpan = document.createElement('span')
          errSpan.style.color = '#dc3545'
          errSpan.textContent = f.error
          row.appendChild(errSpan)
        }

        if (allowRemove && f.status !== 'scanning') {
          const removeBtn = document.createElement('button')
          removeBtn.type = 'button'
          removeBtn.style.cssText = 'background:none;border:none;color:#dc3545;cursor:pointer;font-size:12px;padding:0 2px;'
          removeBtn.innerHTML = '<i class="fa fa-times"></i>'
          removeBtn.title = 'Remove'
          removeBtn.setAttribute('aria-label', `Remove ${f.name}`)
          const idx = i
          removeBtn.addEventListener('click', (e) => {
            e.preventDefault()
            e.stopPropagation()
            this.removeFile(idx)
          })
          row.appendChild(removeBtn)
        }

        listEl.appendChild(row)
      }
    }

    formatFileSize(bytes: number): string {
      if (bytes < 1024) return `${bytes} B`
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    removeFile(index: number) {
      this.selectedFiles.splice(index, 1)
      this.updateFileListUI()
      this.syncFormValue()
      const cKey = this.component?.key
      if (cKey) _fileCache.set(cKey, [...this.selectedFiles])
    }

    destroy() {
      // Preserve files in cache so the builder preview can restore them on recreate
      const key = this.component?.key
      if (key && this.selectedFiles.length > 0) _fileCache.set(key, [...this.selectedFiles])
      this.selectedFiles = []
      super.destroy()
    }
  }
}
