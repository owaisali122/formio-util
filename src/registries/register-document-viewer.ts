import { DocumentViewerComponent, DOCUMENT_VIEWER_TYPE } from '../components/DocumentViewer'
import type { FormioComponents } from './types'

/**
 * Register the Document Viewer designer (builder-side) component.
 *
 * Reference pattern: registerGenericPopup (register-generic-popup.ts)
 *
 * Provides a lightweight builder preview that does not run PDF rendering
 * or open the popup — keeping the designer stable regardless of URL validity.
 */
export async function registerDocumentViewer(Components: FormioComponents): Promise<void> {
  const FieldComponent = (Components.components as any).field as any

  class DocumentViewer extends FieldComponent {
    static schema(...extend: any[]) {
      return FieldComponent.schema(DocumentViewerComponent.schema(), ...extend)
    }

    static get builderInfo() {
      return DocumentViewerComponent.builderInfo
    }

    static editForm() {
      return DocumentViewerComponent.editForm()
    }

    get defaultSchema() {
      return DocumentViewer.schema()
    }

    // Lightweight designer preview — no PDF rendering, no popup opening.
    render() {
      const c = this.component
      const label: string = c.label || 'Document Viewer'
      const buttonText: string = c.buttonText || ''
      const iconClass: string = c.iconCssClass || 'fa fa-file'
      const sourceType: string = c.sourceType || 'static'
      const fileUrl: string = c.fileUrl || ''
      const sourceDisplay =
        sourceType === 'static' ? (fileUrl || '(no URL set)') : 'Submission Data'
      const iconMargin = buttonText ? 'margin-right:6px;' : ''

      return super.render(`
        <div class="panel panel-info">
          <div class="panel-heading" style="padding:8px 12px;">
            <small class="text-uppercase" style="letter-spacing:.04em;font-weight:600;">
              <i class="fa fa-file-text-o"></i> Document Viewer
            </small>
          </div>
          <div class="panel-body" style="padding:12px;">
            <button type="button" class="btn btn-primary btn-sm" tabindex="-1" disabled>
              <i class="${iconClass}" aria-hidden="true" style="${iconMargin}"></i>${buttonText}
            </button>
            <p class="help-block small" style="margin-top:8px;margin-bottom:0;">
              <strong>Label:</strong> ${label} &nbsp;|&nbsp; <strong>Source:</strong> ${sourceDisplay}
            </p>
          </div>
        </div>
      `)
    }
  }

  Components.setComponent(DOCUMENT_VIEWER_TYPE, DocumentViewer as never)
}