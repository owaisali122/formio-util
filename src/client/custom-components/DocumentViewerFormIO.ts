/**
 * FormIO: Document Viewer Runtime Component
 *
 * Reference pattern: GenericPopupFormIO.ts + FileDownloadFormIO.ts
 *
 * Renders a trigger button inside the form. When clicked it:
 *   1. Resolves the file URL (from static config or submission data)
 *   2. Resolves the file name and popup title
 *   3. Detects the file type (PDF / image / other)
 *   4. Opens the existing popup via openPopup()
 *   5. Uses onMount to render DocumentViewerContent (react-pdf / image / fallback)
 *      inside the popup body via React 18 createRoot
 *
 * react-pdf is imported dynamically inside DocumentViewerContent â€” it is
 * only loaded when a PDF is actually opened. Consumers must have react-pdf
 * installed as a peerDependency.
 */

import React from 'react'
import { createRoot } from 'react-dom/client'

import { DOCUMENT_VIEWER_TYPE } from '../../components/DocumentViewer'
import { openPopup } from '../popup/popupStore'
import { DocumentViewerContent, resolveFileType } from './DocumentViewerContent'

// Re-export worker setup so consumers can import it from one place.
export { setupDocumentViewerWorker } from './DocumentViewerContent'

function escAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function createDocumentViewerClass(FieldComponent: any) {
  return class DocumentViewerFormIO extends FieldComponent {
    _triggerBtn: HTMLButtonElement | null = null
    _clickBound: (() => void) | null = null
    /** React root mounted inside the popup body. Unmounted on popup close or detach. */
    _reactRoot: { unmount: () => void } | null = null

    // â”€â”€ Schema â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    static schema(...extend: any[]) {
      return FieldComponent.schema(
        {
          type: DOCUMENT_VIEWER_TYPE,
          label: 'Document Viewer',
          key: 'documentViewer',
          input: false,
          tableView: false,
          description: '',
          iconCssClass: 'fa fa-file',
          autofocus: false,
          hidden: false,
          disabled: false,
          sourceType: 'static',
          fileUrl: '',
          fileUrlDataKey: '',
          fileNameDataKey: '',
          viewerHeight: '400px',
          maxWidth: '100%',
          buttonText: '',
          popupTitle: '',
          fallbackText: 'Preview not available for this file type.',
          forceFileType: 'auto',
          openInPopup: true,
          viewMode: 'page',
          showToolbarSidebar: true,
          showToolbarFind: true,
          showToolbarNavigation: true,
          showToolbarZoom: true,
          showToolbarRotate: true,
          showToolbarPrint: true,
          showToolbarDownload: true,
        },
        ...extend,
      )
    }

    static get builderInfo() {
      return {
        title: 'Document Viewer',
        group: 'basic',
        icon: 'file',
        weight: 34,
        schema: DocumentViewerFormIO.schema(),
      }
    }

    get defaultSchema() {
      return DocumentViewerFormIO.schema()
    }

    // â”€â”€ Data Resolution â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    _resolveFileUrl(): string {
      const c = this.component
      const data = this.root?.data ?? this.data ?? {}

      if (c.sourceType === 'submission') {
        const key = (c.fileUrlDataKey || '').trim()
        if (!key) return ''
        return String(data[key] ?? '').trim()
      }

      const url = (c.fileUrl || '').trim()
      if (!url) return ''
      // Simple {{fieldKey}} interpolation
      return url.replace(/\{\{(\w+)\}\}/g, (_: string, k: string) => String(data[k] ?? ''))
    }

    _resolveFileName(): string {
      const c = this.component
      const data = this.root?.data ?? this.data ?? {}
      const key = (c.fileNameDataKey || '').trim()
      if (!key) return ''
      return String(data[key] ?? '').trim()
    }

    _resolvePopupTitle(fileName: string): string {
      const c = this.component
      const configured = (c.popupTitle || '').trim()
      if (configured) return configured
      if (fileName) return fileName
      return 'Document Viewer'
    }

    // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    render() {
      const c = this.component
      const buttonText = escAttr(c.buttonText ?? '')
      const iconClass = escAttr(c.iconCssClass || 'fa fa-file')
      const iconStyle = buttonText ? 'margin-right:6px;' : ''
      const description = c.description || ''
      const isDisabled = c.disabled === true
      const url = this._resolveFileUrl()
      const noUrl = !url

      // Disable the button when there is no URL or the component is disabled.
      const disabledAttr = noUrl || isDisabled ? 'disabled' : ''

      const descHtml = description
        ? `<div class="help-block">${escAttr(description)}</div>`
        : ''

      return super.render(`
        <div ref="documentViewerWrapper">
          <button
            ref="documentViewerTrigger"
            type="button"
            class="btn btn-primary"
            ${disabledAttr}
          >
            <i class="${iconClass}" aria-hidden="true" style="${iconStyle}"></i>${buttonText}
          </button>
          ${descHtml}
        </div>
      `)
    }

    // â”€â”€ Attach â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    attach(element: HTMLElement) {
      const result = super.attach(element)

      this.loadRefs(element, {
        documentViewerWrapper: 'single',
        documentViewerTrigger: 'single',
      })

      const btn = (this.refs as any)?.documentViewerTrigger as HTMLButtonElement | undefined
      if (btn && !this.component.disabled) {
        this._triggerBtn = btn
        this._clickBound = () => this._openDocumentPopup()
        btn.addEventListener('click', this._clickBound)
      }

      return result
    }

    // â”€â”€ Detach â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    detach() {
      if (this._triggerBtn && this._clickBound) {
        this._triggerBtn.removeEventListener('click', this._clickBound)
        this._triggerBtn = null
        this._clickBound = null
      }
      this._unmountReactRoot()
      return super.detach()
    }

    _unmountReactRoot() {
      if (this._reactRoot) {
        try {
          this._reactRoot.unmount()
        } catch {
          // Ignore unmount errors â€” popup may have already cleaned the DOM.
        }
        this._reactRoot = null
      }
    }

    // â”€â”€ Popup Integration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    _openDocumentPopup() {
      const c = this.component
      const url = this._resolveFileUrl()
      const fileName = this._resolveFileName()
      const title = this._resolvePopupTitle(fileName)

      const viewerHeight: string = c.viewerHeight || '400px'
      const maxWidth: string = c.maxWidth || '100%'
      const fallbackText: string = c.fallbackText || 'Preview not available for this file type.'
      const forceFileType = c.forceFileType || 'auto'
      const viewMode: 'page' | 'scroll' = c.viewMode === 'scroll' ? 'scroll' : 'page'
      const showToolbarSidebar: boolean = c.showToolbarSidebar !== false
      const showToolbarFind: boolean = c.showToolbarFind !== false
      const showToolbarNavigation: boolean = c.showToolbarNavigation !== false
      const showToolbarZoom: boolean = c.showToolbarZoom !== false
      const showToolbarRotate: boolean = c.showToolbarRotate !== false
      const showToolbarPrint: boolean = c.showToolbarPrint !== false
      const showToolbarDownload: boolean = c.showToolbarDownload !== false

      const fileType = resolveFileType(
        forceFileType,
        fileName || undefined,
        url || undefined,
      )

      // Keep a stable self-reference for the closure â€” avoids capturing `this`
      // after a potential detach/redraw cycle.
      const self = this

      openPopup(
        {
          title,
          variant: 'custom',
          size: 'lg',
          icon: 'fa fa-file',
          buttons: [
            { label: 'Close', actionKey: 'close', variant: 'secondary', closeOnClick: true },
          ],
          showCloseIcon: true,
          closeOnEscape: true,
          closeOnBackdrop: false,
          // htmlContent must be a non-empty string so PopupContainer renders
          // the modal-body div and fires onMount. React content is injected via
          // createRoot into a child container inside that body element.
          htmlContent: '<div></div>',
          onMount: (bodyEl: HTMLElement) => {
            // Create a child container managed exclusively by our React root.
            // This avoids React's createRoot conflicting with the outer popup
            // component which rendered bodyEl via dangerouslySetInnerHTML.
            const container = document.createElement('div')
            bodyEl.appendChild(container)

            const root = createRoot(container)
            root.render(
              React.createElement(DocumentViewerContent, {
                url,
                fileType,
                fileName: fileName || undefined,
                viewerHeight,
                maxWidth,
                fallbackText,
                viewMode,
                showToolbarSidebar,
                showToolbarFind,
                showToolbarNavigation,
                showToolbarZoom,
                showToolbarRotate,
                showToolbarPrint,
                showToolbarDownload,
              }),
            )
            self._reactRoot = root
          },
          onClose: () => {
            self._unmountReactRoot()
            self.emit('documentViewerClose', { component: self })
          },
          onAction: (actionKey: string) => {
            self.emit('documentViewerAction', { actionKey, component: self })
          },
        },
        {},
      )
    }
  }
}

export default createDocumentViewerClass
