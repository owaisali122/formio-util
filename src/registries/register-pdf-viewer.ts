import { PdfViewerComponent, PDF_VIEWER_TYPE } from '../components/PdfViewer'
import type { FormioComponents } from './types'

export async function registerPdfViewer(Components: FormioComponents): Promise<void> {
  const FieldComponent = (Components.components as any).field as any

  class PdfViewer extends FieldComponent {
    static schema(...extend: any[]) {
      return FieldComponent.schema(PdfViewerComponent.schema(), ...extend)
    }

    static get builderInfo() {
      return PdfViewerComponent.builderInfo
    }

    static editForm() {
      return PdfViewerComponent.editForm()
    }

    get defaultSchema() {
      return PdfViewer.schema()
    }

    render() {
      const title = this.component.documentTitle || ''
      const titleHtml = title ? `<div style="font-weight:600;margin-bottom:4px;">${this.t(title)}</div>` : ''
      return super.render(`
        <div ref="pdfViewerContainer" class="formio-pdf-viewer">
          ${titleHtml}
          <div style="border:1px dashed #ccc;padding:20px;text-align:center;color:#888;min-height:80px;">
            PDF Viewer — <em>${this.component.pdfSource || 'no source configured'}</em>
          </div>
        </div>
      `)
    }
  }

  Components.setComponent(PDF_VIEWER_TYPE, PdfViewer as never)
}
