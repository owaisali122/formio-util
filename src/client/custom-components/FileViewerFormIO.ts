/**
 * FormIO: File Viewer Renderer Runtime Component
 *
 * Reference pattern: GenericPopupFormIO (GenericPopupFormIO.ts)
 *
 * Renders a trigger button. On click, opens the existing popup/modal
 * with the file content (image, PDF, video, audio) displayed inside.
 *
 * Works standalone, in tables, lists, or any container layout.
 * Resolves file URL from static config or submission data key.
 */

import { FILE_VIEWER_TYPE } from '../../components/FileViewer'
import type { PopupConfig } from '../popup/PopupTypes'
import { openPopup } from '../popup/popupStore'

// ── File type detection ────────────────────────────────────────────────

type FileCategory = 'image' | 'pdf' | 'video' | 'audio' | 'unknown'

const EXT_MAP: Record<string, FileCategory> = {
  // images
  jpg: 'image', jpeg: 'image', png: 'image', gif: 'image',
  webp: 'image', svg: 'image', bmp: 'image', ico: 'image',
  // pdf
  pdf: 'pdf',
  // video
  mp4: 'video', webm: 'video', ogg: 'video', ogv: 'video', mov: 'video',
  // audio
  mp3: 'audio', wav: 'audio', oga: 'audio', m4a: 'audio', flac: 'audio',
}

function getExtension(urlOrName: string): string {
  try {
    const pathname = new URL(urlOrName, 'https://placeholder').pathname
    const dot = pathname.lastIndexOf('.')
    if (dot === -1) return ''
    return pathname.slice(dot + 1).toLowerCase()
  } catch {
    const dot = urlOrName.lastIndexOf('.')
    if (dot === -1) return ''
    return urlOrName.slice(dot + 1).toLowerCase().split(/[?#]/)[0]
  }
}

function detectFileCategory(url: string, fileName?: string): FileCategory {
  const ext = (fileName ? getExtension(fileName) : '') || getExtension(url)
  return EXT_MAP[ext] || 'unknown'
}

/** Detect content category from Content-Type header */
function categoryFromContentType(ct: string): FileCategory {
  const t = ct.toLowerCase()
  if (t.includes('pdf')) return 'pdf'
  if (t.startsWith('image/')) return 'image'
  if (t.startsWith('video/')) return 'video'
  if (t.startsWith('audio/')) return 'audio'
  return 'unknown'
}

function escAttr(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ── Factory ────────────────────────────────────────────────────────────

export function createFileViewerClass(FieldComponent: any) {
  return class FileViewerFormIO extends FieldComponent {
    _triggerBtn: HTMLButtonElement | null = null
    _clickBound: (() => void) | null = null
    _keydownBound: ((e: KeyboardEvent) => void) | null = null
    _onChangeBound: (() => void) | null = null
    _lastRenderedUrl: string = ''

    static schema(...extend: any[]) {
      return FieldComponent.schema(
        {
          type: FILE_VIEWER_TYPE,
          label: 'File Viewer',
          key: 'fileViewer',
          input: false,
          tableView: false,
          description: '',
          viewerIcon: 'fa fa-eye',
          sourceType: 'url',
          fileUrl: '',
          fileUrlKey: '',
          fileNameKey: '',
          viewerHeight: '400px',
          maxWidth: '100%',
          showDownloadLink: false,
          fallbackText: 'Preview not available for this file type.',
          pdfViewerMode: 'fetch',
          forceFileType: '',
        },
        ...extend,
      )
    }

    static get builderInfo() {
      return {
        title: 'File Viewer',
        group: 'basic',
        icon: 'eye',
        weight: 32,
        schema: FileViewerFormIO.schema(),
      }
    }

    get defaultSchema() {
      return FileViewerFormIO.schema()
    }

    // ── Resolve file URL ──

    _resolveFileUrl(): string {
      const c = this.component
      const data = this.root?.data ?? this.data ?? {}
      if (c.sourceType === 'dataKey' && c.fileUrlKey) {
        // Template (has {{}}) → interpolate (no encoding), else raw field read
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

    // ── Build viewer HTML for popup body ──

    _buildPdfSrc(url: string): string {
      const mode = this.component.pdfViewerMode || 'fetch'
      if (mode === 'google') {
        return `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`
      }
      return url
    }

    _buildViewerHtml(url: string, fileName: string): string {
      const c = this.component
      // forceFileType overrides automatic extension detection
      const category: FileCategory = (c.forceFileType as FileCategory) || detectFileCategory(url, fileName)
      const maxWidth = c.maxWidth || '100%'

      switch (category) {
        case 'image':
          return `<div style="text-align:center;"><img src="${escAttr(url)}" alt="${escAttr(fileName || 'File preview')}" style="max-width:${maxWidth};height:auto;display:block;margin:0 auto;" /></div>`

        case 'pdf': {
          const pdfSrc = this._buildPdfSrc(url)
          return `<iframe src="${escAttr(pdfSrc)}" style="width:100%;height:70vh;border:none;" title="${escAttr(fileName || 'PDF Document')}" allow="fullscreen"></iframe>`
        }

        case 'video':
          return `<video controls style="max-width:100%;height:auto;display:block;margin:0 auto;" preload="metadata"><source src="${escAttr(url)}" />Your browser does not support video playback.</video>`

        case 'audio':
          return `<div style="padding:20px;"><audio controls style="width:100%;" preload="metadata"><source src="${escAttr(url)}" />Your browser does not support audio playback.</audio></div>`

        default: {
          const fallbackText = c.fallbackText || 'Preview not available for this file type.'
          return `<div style="padding:30px;text-align:center;color:#888;font-size:14px;">
            <i class="fa fa-file-o" style="font-size:36px;margin-bottom:12px;display:block;"></i>
            ${this.t(fallbackText)}
          </div>`
        }
      }
    }

    // ── Open popup with viewer ──

    _openViewer() {
      const url = this._resolveFileUrl()
      const fileName = this._resolveFileName()
      const c = this.component

      if (!url) return

      const showDownload = c.showDownloadLink === true
      const downloadBtn = showDownload
        ? `<div style="text-align:center;padding:8px 0 0;"><a href="${escAttr(url)}" download="${escAttr(fileName || '')}" style="font-size:12px;color:#337ab7;text-decoration:underline;"><i class="fa fa-download"></i> Download${fileName ? ` (${fileName})` : ''}</a></div>`
        : ''
      const mode = c.pdfViewerMode || 'fetch'
      const extCategory: FileCategory = (c.forceFileType as FileCategory) || detectFileCategory(url, fileName)

      // For known image URLs, use direct embed (no fetch needed)
      if (mode === 'direct' && extCategory !== 'unknown') {
        const viewerHtml = this._buildViewerHtml(url, fileName)
        openPopup({
          title: c.label || 'File Viewer',
          icon: c.viewerIcon || 'fa fa-eye',
          variant: 'custom',
          size: 'lg',
          htmlContent: viewerHtml + downloadBtn,
          buttons: [{ label: 'Close', actionKey: 'close', variant: 'secondary', closeOnClick: true }],
          showCloseIcon: true,
          closeOnBackdrop: true,
          closeOnEscape: true,
        }, {})
        return
      }

      if (mode === 'google') {
        const viewerHtml = this._buildViewerHtml(url, fileName)
        openPopup({
          title: c.label || 'File Viewer',
          icon: c.viewerIcon || 'fa fa-eye',
          variant: 'custom',
          size: 'lg',
          htmlContent: viewerHtml + downloadBtn,
          buttons: [{ label: 'Close', actionKey: 'close', variant: 'secondary', closeOnClick: true }],
          showCloseIcon: true,
          closeOnBackdrop: true,
          closeOnEscape: true,
        }, {})
        return
      }

      // Fetch mode (default): download file, auto-detect type from Content-Type, embed blob
      const loadingHtml = `<div style="text-align:center;padding:40px;"><i class="fa fa-spinner fa-spin" style="font-size:28px;color:#337ab7;"></i><p style="margin-top:12px;color:#666;font-size:14px;">Loading preview...</p></div>${downloadBtn}`

      openPopup({
        title: c.label || 'File Viewer',
        icon: c.viewerIcon || 'fa fa-eye',
        variant: 'custom',
        size: 'lg',
        htmlContent: loadingHtml,
        buttons: [{ label: 'Close', actionKey: 'close', variant: 'secondary', closeOnClick: true }],
        showCloseIcon: true,
        closeOnBackdrop: true,
        closeOnEscape: true,
        onMount: (bodyEl: HTMLElement) => {
          fetch(url, { credentials: 'include' })
            .then(r => {
              if (!r.ok) throw new Error(`HTTP ${r.status}`)
              const ct = r.headers.get('content-type') || ''
              return r.blob().then(blob => ({ blob, ct }))
            })
            .then(({ blob, ct }) => {
              const detectedCat = (c.forceFileType as FileCategory) || categoryFromContentType(ct) || extCategory
              const blobUrl = URL.createObjectURL(blob)
              if (detectedCat === 'image') {
                bodyEl.innerHTML = `<div style="text-align:center;"><img src="${escAttr(blobUrl)}" alt="Preview" style="max-width:100%;height:auto;" /></div>${downloadBtn}`
              } else if (detectedCat === 'video') {
                bodyEl.innerHTML = `<video controls style="max-width:100%;height:auto;display:block;margin:0 auto;"><source src="${escAttr(blobUrl)}" type="${escAttr(ct)}" /></video>${downloadBtn}`
              } else if (detectedCat === 'audio') {
                bodyEl.innerHTML = `<div style="padding:20px;"><audio controls style="width:100%;"><source src="${escAttr(blobUrl)}" type="${escAttr(ct)}" /></audio></div>${downloadBtn}`
              } else {
                // PDF or unknown — iframe with browser's built-in viewer
                bodyEl.innerHTML = `<iframe src="${escAttr(blobUrl)}" style="width:100%;height:70vh;border:none;" title="${escAttr(fileName || 'Document')}" allow="fullscreen"></iframe>${downloadBtn}`
              }
            })
            .catch(() => {
              bodyEl.innerHTML = `<div style="padding:30px;text-align:center;color:#c00;font-size:14px;"><i class="fa fa-exclamation-triangle" style="font-size:28px;margin-bottom:8px;display:block;"></i>Failed to load file preview.<br/><a href="${escAttr(url)}" target="_blank" rel="noopener noreferrer" style="font-size:12px;color:#337ab7;text-decoration:underline;margin-top:8px;display:inline-block;"><i class="fa fa-external-link"></i> Open in new tab</a></div>`
            })
        },
      }, {})
    }

    // ── Render trigger icon ──

    render() {
      const c = this.component
      const icon = c.viewerIcon || 'fa fa-eye'
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

      return super.render(`
        <div ref="fileViewerContainer" style="display:inline-block;">
          <span
            ref="fileViewerTrigger"
            role="button"
            tabindex="0"
            style="cursor:${hasUrl ? 'pointer' : 'default'};opacity:${hasUrl ? '1' : '0.4'};display:inline-flex;align-items:center;"
          >
            <i class="${escAttr(icon)}" aria-hidden="true" style="font-size:1.4em;"></i>${labelHtml}
          </span>
          ${descHtml}
        </div>
      `)
    }

    // ── Trigger listener cleanup helper ──

    _cleanupTrigger() {
      if (this._triggerBtn) {
        if (this._clickBound) {
          this._triggerBtn.removeEventListener('click', this._clickBound)
        }
        if (this._keydownBound) {
          this._triggerBtn.removeEventListener('keydown', this._keydownBound)
        }
      }
      this._triggerBtn = null
      this._clickBound = null
      this._keydownBound = null
    }

    // ── Attach ──

    attach(element: HTMLElement) {
      // Always clean up previous listeners before re-attaching.
      // Form.io can call attach() on re-renders without a preceding detach(),
      // which would stack duplicate listeners on the same trigger element.
      this._cleanupTrigger()

      const result = super.attach(element)

      this.loadRefs(element, {
        fileViewerContainer: 'single',
        fileViewerTrigger: 'single',
      })

      const btn = (this.refs as any)?.fileViewerTrigger as HTMLElement | undefined
      if (btn) {
        this._triggerBtn = btn as HTMLButtonElement
        this._clickBound = () => this._openViewer()
        this._keydownBound = (e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this._openViewer() }
        }
        btn.addEventListener('click', this._clickBound)
        btn.addEventListener('keydown', this._keydownBound)
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
      this._cleanupTrigger()
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

export default createFileViewerClass
