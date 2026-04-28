/**
 * FormIO: File Download Renderer Runtime Component
 *
 * Reference pattern: FileViewerFormIO.ts
 *
 * Renders a simple icon trigger (no blue button). Click fetches the file
 * and initiates a browser download. Works with cross-origin / proxy URLs.
 *
 * Works standalone, in tables, lists, or any container layout.
 */

import { FILE_DOWNLOAD_TYPE } from '../../components/FileDownload'
import { triggerFileDownload } from './fileDownloadUtils'

function escAttr(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ── Factory ────────────────────────────────────────────────────────────

export function createFileDownloadClass(FieldComponent: any) {
  return class FileDownloadFormIO extends FieldComponent {
    _triggerBtn: HTMLElement | null = null
    _iconEl: HTMLElement | null = null
    _isDownloading = false
    _clickBound: (() => void) | null = null
    _onChangeBound: (() => void) | null = null
    _lastRenderedUrl = ''

    static schema(...extend: any[]) {
      return FieldComponent.schema(
        {
          type: FILE_DOWNLOAD_TYPE,
          label: '',
          key: 'fileDownload',
          input: false,
          tableView: false,
          description: '',
          downloadIcon: 'fa fa-download',
          sourceType: 'url',
          fileUrl: '',
          fileUrlKey: '',
          fileNameKey: '',
          fallbackText: 'No file available',
        },
        ...extend,
      )
    }

    static get builderInfo() {
      return {
        title: 'File Download',
        group: 'basic',
        icon: 'download',
        weight: 33,
        schema: FileDownloadFormIO.schema(),
      }
    }

    get defaultSchema() {
      return FileDownloadFormIO.schema()
    }

    // ── Resolve file URL ──

    _resolveFileUrl(): string {
      const c = this.component
      const data = this.root?.data ?? this.data ?? {}
      if (c.sourceType === 'dataKey' && c.fileUrlKey) {
        return c.fileUrlKey.includes('{{')
          ? c.fileUrlKey.replace(/\{\{(\w+)\}\}/g, (_: string, k: string) => String(data[k] ?? ''))
          : String(data[c.fileUrlKey] ?? '')
      }
      if (c.fileUrl) {
        return c.fileUrl.includes('{{')
          ? c.fileUrl.replace(/\{\{(\w+)\}\}/g, (_: string, k: string) => String(data[k] ?? ''))
          : c.fileUrl
      }
      return ''
    }

    _resolveFileName(): string {
      const c = this.component
      const data = this.root?.data ?? this.data ?? {}
      if (c.fileNameKey) {
        return String(data[c.fileNameKey] ?? '')
      }
      return ''
    }

    // ── Download via fetch ──

    _doDownload() {
      if (this._isDownloading) return
      const url = this._resolveFileUrl()
      if (!url) return

      const fileName = this._resolveFileName() || this._fileNameFromUrl(url) || 'download'
      const btn = this._triggerBtn
      const iconEl = this._iconEl
      const originalIconClass = iconEl ? iconEl.className : ''

      this._isDownloading = true
      if (btn) btn.style.pointerEvents = 'none'
      if (iconEl) iconEl.className = 'fa fa-spinner fa-spin'

      triggerFileDownload(url, fileName).finally(() => {
        this._isDownloading = false
        if (btn) btn.style.pointerEvents = ''
        if (iconEl && originalIconClass) iconEl.className = originalIconClass
      })
    }

    _fileNameFromUrl(url: string): string {
      try {
        const path = new URL(url, window.location.origin).pathname
        const parts = path.split('/')
        return parts[parts.length - 1] || ''
      } catch { return '' }
    }

    // ── Render trigger icon (matches FileViewer pattern) ──

    render() {
      const c = this.component
      const icon = c.downloadIcon || 'fa fa-download'
      const label = c.label || ''
      const description = c.description || ''
      const url = this._resolveFileUrl()
      const hasUrl = !!url

      this._lastRenderedUrl = url

      const labelHtml = label
        ? `<span class="ms-1 small">${this.t(label)}</span>`
        : ''
      const descHtml = description
        ? `<div class="text-muted small mt-1">${this.t(description)}</div>`
        : ''

      if (!hasUrl) {
        const fallback = c.fallbackText || 'No file available'
        return super.render(`
          <div ref="fileDownloadContainer" class="d-inline-block">
            <span class="d-inline-flex align-items-center opacity-50">
              <i class="${escAttr(icon)} fs-5" aria-hidden="true"></i>${labelHtml}
            </span>
            ${descHtml || `<div class="text-muted small mt-1">${this.t(fallback)}</div>`}
          </div>
        `)
      }

      return super.render(`
        <div ref="fileDownloadContainer" class="d-inline-block">
          <span
            ref="fileDownloadTrigger"
            role="button"
            tabindex="${c.tabindex !== '' && c.tabindex != null ? Number(c.tabindex) : 0}"
            class="d-inline-flex align-items-center"
            style="cursor:pointer"
            title="${escAttr(label || 'Download')}"
          >
            <i class="${escAttr(icon)} fs-5" aria-hidden="true"></i>${labelHtml}
          </span>
          ${descHtml}
        </div>
      `)
    }

    // ── Attach ──

    attach(element: HTMLElement) {
      const result = super.attach(element)

      this.loadRefs(element, {
        fileDownloadContainer: 'single',
        fileDownloadTrigger: 'single',
      })

      const btn = (this.refs as any)?.fileDownloadTrigger as HTMLElement | undefined
      if (btn) {
        this._triggerBtn = btn
        this._iconEl = btn.querySelector('i') as HTMLElement | null
        this._clickBound = () => this._doDownload()
        btn.addEventListener('click', this._clickBound)
        btn.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this._doDownload() }
        })
        if (this.component.autofocus) {
          btn.focus()
        }
      }

      // For dataKey mode: re-render only when URL actually changes
      if (this.component.sourceType === 'dataKey') {
        this._onChangeBound = () => {
          const newUrl = this._resolveFileUrl()
          if (newUrl !== this._lastRenderedUrl) {
            this.redraw()
          }
        }
        const root = this.root
        if (root && typeof root.on === 'function') {
          root.on('change', this._onChangeBound)
        }
      }

      return result
    }

    // ── Detach ──

    detach() {
      if (this._triggerBtn && this._clickBound) {
        this._triggerBtn.removeEventListener('click', this._clickBound)
        this._triggerBtn = null
        this._clickBound = null
      }
      this._iconEl = null
      this._isDownloading = false
      return super.detach()
    }

    // ── Cleanup ──

    destroy() {
      if (this._onChangeBound) {
        const root = this.root
        if (root && typeof root.off === 'function') {
          root.off('change', this._onChangeBound)
        }
        this._onChangeBound = null
      }
      super.destroy()
    }
  }
}

export default createFileDownloadClass
