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

function escAttr(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ── Factory ────────────────────────────────────────────────────────────

export function createFileDownloadClass(FieldComponent: any) {
  return class FileDownloadFormIO extends FieldComponent {
    _triggerBtn: HTMLElement | null = null
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
      const url = this._resolveFileUrl()
      if (!url) return

      const fileName = this._resolveFileName() || this._fileNameFromUrl(url) || 'download'
      const btn = this._triggerBtn
      if (btn) btn.style.opacity = '0.4'

      fetch(url, { credentials: 'include' })
        .then(r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`)
          return r.blob()
        })
        .then(blob => {
          const blobUrl = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = blobUrl
          a.download = fileName
          a.style.display = 'none'
          document.body.appendChild(a)
          a.click()
          setTimeout(() => { URL.revokeObjectURL(blobUrl); a.remove() }, 200)
        })
        .catch(() => {
          // Fallback: open in new tab
          window.open(url, '_blank', 'noopener,noreferrer')
        })
        .finally(() => {
          if (btn) btn.style.opacity = '1'
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
        ? `<span style="margin-left:6px;font-size:14px;">${this.t(label)}</span>`
        : ''
      const descHtml = description
        ? `<div style="color:#666;font-size:12px;margin-top:4px;">${this.t(description)}</div>`
        : ''

      if (!hasUrl) {
        const fallback = c.fallbackText || 'No file available'
        return super.render(`
          <div ref="fileDownloadContainer" style="display:inline-block;">
            <span style="display:inline-flex;align-items:center;opacity:0.4;">
              <i class="${escAttr(icon)}" aria-hidden="true" style="font-size:1.4em;"></i>${labelHtml}
            </span>
            ${descHtml || `<div style="color:#999;font-size:12px;margin-top:2px;">${this.t(fallback)}</div>`}
          </div>
        `)
      }

      return super.render(`
        <div ref="fileDownloadContainer" style="display:inline-block;">
          <span
            ref="fileDownloadTrigger"
            role="button"
            tabindex="0"
            style="cursor:pointer;display:inline-flex;align-items:center;"
            title="${escAttr(label || 'Download')}"
          >
            <i class="${escAttr(icon)}" aria-hidden="true" style="font-size:1.4em;"></i>${labelHtml}
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
        this._clickBound = () => this._doDownload()
        btn.addEventListener('click', this._clickBound)
        btn.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this._doDownload() }
        })
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
