/**
 * FormIO: PDF Viewer Renderer Component
 *
 * Renders a PDF document inside a Form.io field using an iframe.
 * Supports two source types:
 * - 'url': direct URL to a PDF file
 * - 'documentKey': a key resolved via a configurable API endpoint
 *
 * Schema properties (from designer):
 *   type: 'pdfViewer', pdfSource, sourceType, documentTitle, viewerHeight, showToolbar
 */

import { PdfViewerComponent, PDF_VIEWER_TYPE } from '../../components/PdfViewer'

export default function createPdfViewerClass(FieldComponent: any) {
  return class PdfViewerFormIO extends FieldComponent {
    pdfIframe: HTMLIFrameElement | null = null
    resolvedUrl: string = ''

    static schema(...extend: any[]) {
      return FieldComponent.schema(PdfViewerComponent.schema(), ...extend)
    }

    static get builderInfo() {
      return PdfViewerComponent.builderInfo
    }

    get defaultSchema() {
      return PdfViewerFormIO.schema()
    }

    get sourceType(): 'url' | 'documentKey' {
      return this.component?.sourceType || 'url'
    }

    get pdfSource(): string {
      return this.component?.pdfSource || ''
    }

    get viewerHeight(): string {
      return this.component?.viewerHeight || '600px'
    }

    get showToolbar(): boolean {
      return this.component?.showToolbar !== false
    }

    get documentTitle(): string {
      return this.component?.documentTitle || ''
    }

    render() {
      const title = this.documentTitle
      const titleHtml = title
        ? `<div ref="pdfTitle" style="font-weight:600;margin-bottom:4px;">${this.t(title)}</div>`
        : ''

      return super.render(`
        <div ref="pdfViewerContainer" class="formio-pdf-viewer">
          ${titleHtml}
          <div ref="pdfContent" class="formio-pdf-viewer-content">
            <div ref="pdfLoading" style="border:1px solid #dee2e6;padding:20px;text-align:center;color:#888;min-height:80px;">
              Loading PDF...
            </div>
          </div>
        </div>
      `)
    }

    attach(element: HTMLElement) {
      const result = super.attach(element)
      this.loadRefs(element, {
        pdfViewerContainer: 'single',
        pdfContent: 'single',
        pdfLoading: 'single',
      })

      const content = (this.refs as any)?.pdfContent as HTMLElement | undefined
      if (content) {
        this.loadPdf(content)
      }

      return result
    }

    async loadPdf(container: HTMLElement) {
      const source = this.pdfSource
      if (!source) {
        this.showPlaceholder(container, 'No PDF source configured.')
        return
      }

      if (this.sourceType === 'documentKey') {
        await this.loadFromDocumentKey(container, source)
      } else {
        this.renderIframe(container, source)
      }
    }

    async loadFromDocumentKey(container: HTMLElement, documentKey: string) {
      const basePath = this.component?.documentApiBasePath || '/api/documents'
      const origin = typeof window !== 'undefined' ? window.location?.origin ?? '' : ''
      const apiUrl = `${origin}${basePath}/${encodeURIComponent(documentKey)}`

      try {
        const res = await fetch(apiUrl)
        if (!res.ok) {
          this.showPlaceholder(container, `Document "${documentKey}" not found.`)
          return
        }
        const data = await res.json()
        const url = data?.url || data?.pdfUrl || data?.src
        if (!url || typeof url !== 'string') {
          this.showPlaceholder(container, 'Invalid document response.')
          return
        }
        this.renderIframe(container, url)
      } catch {
        this.showPlaceholder(container, 'Failed to load document.')
      }
    }

    renderIframe(container: HTMLElement, url: string) {
      this.resolvedUrl = url
      container.innerHTML = ''

      const iframe = document.createElement('iframe')
      iframe.className = 'formio-pdf-viewer-iframe'
      iframe.style.width = '100%'
      iframe.style.height = this.viewerHeight
      iframe.style.border = '1px solid #dee2e6'
      iframe.style.borderRadius = '4px'
      iframe.setAttribute('title', this.documentTitle || 'PDF Viewer')

      const toolbarParam = this.showToolbar ? '' : '#toolbar=0'
      iframe.src = `${url}${toolbarParam}`

      iframe.onerror = () => {
        this.showPlaceholder(container, 'Failed to load PDF.')
      }

      this.pdfIframe = iframe
      container.appendChild(iframe)
    }

    showPlaceholder(container: HTMLElement, message: string) {
      container.innerHTML = ''
      const placeholder = document.createElement('div')
      placeholder.style.cssText =
        'border:1px dashed #ccc;padding:20px;text-align:center;color:#888;min-height:80px;'
      placeholder.textContent = message
      container.appendChild(placeholder)
    }

    destroy() {
      this.pdfIframe = null
      this.resolvedUrl = ''
      super.destroy()
    }
  }
}
