/**
 * FormIO: Document Viewer Runtime Component
 *
 * Reference pattern: SmartStreet — render an empty container in Form.io's
 * `render()` and mount a shared React component into it via createRoot inside
 * `attach()`. The trigger button + popup wiring lives entirely in the shared
 * DocumentViewerTrigger React component; this file is now a thin Form.io
 * adapter that resolves submission-driven values and bridges popup events
 * back through `this.emit`.
 *
 * react-pdf is imported dynamically inside DocumentViewerContent — it is only
 * loaded when a PDF is actually opened. Consumers must have react-pdf
 * installed as a peerDependency.
 */

import React from 'react'
import { createRoot, type Root } from 'react-dom/client'

import { DOCUMENT_VIEWER_TYPE } from '../../components/DocumentViewer'
import { DocumentViewerTrigger } from '../../components/react/DocumentViewerTrigger'

// Re-export worker setup so consumers can import it from one place.
export { setupDocumentViewerWorker } from './DocumentViewerContent'

export function createDocumentViewerClass(FieldComponent: any) {
  return class DocumentViewerFormIO extends FieldComponent {
    /** React root mounted inside the trigger container. Unmounted on detach. */
    _triggerRoot: Root | null = null

    // ── Schema ──────────────────────────────────────────────────────────

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

    // ── Data Resolution ─────────────────────────────────────────────────

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

    // ── Render (empty container — React mounts in attach) ───────────────

    render() {
      return super.render('<div ref="documentViewerReactContainer"></div>')
    }

    // ── Attach ──────────────────────────────────────────────────────────

    attach(element: HTMLElement) {
      const result = super.attach(element)

      this.loadRefs(element, {
        documentViewerReactContainer: 'single',
      })

      const container = (this.refs as any)?.documentViewerReactContainer as
        | HTMLElement
        | undefined
      if (!container) return result

      // Always create a fresh root on attach. Form.io's redraw cycle calls
      // detach() then attach(), so previous roots are already torn down.
      this._triggerRoot = createRoot(container)
      this._renderTrigger()

      return result
    }

    _renderTrigger() {
      if (!this._triggerRoot) return

      const c = this.component
      const url = this._resolveFileUrl()
      const fileName = this._resolveFileName()

      const tabIndex =
        c.tabindex !== '' && c.tabindex != null && Number.isFinite(Number(c.tabindex))
          ? Number(c.tabindex)
          : undefined

      // Stable self-reference for popup callbacks — avoids capturing `this`
      // after a potential detach/redraw cycle.
      const self = this

      this._triggerRoot.render(
        React.createElement(DocumentViewerTrigger, {
          buttonText: c.buttonText ?? '',
          iconCssClass: c.iconCssClass || 'fa fa-file',
          description: c.description || '',
          disabled: c.disabled === true,
          tabIndex,
          fileUrl: url,
          fileName: fileName || undefined,
          popupTitle: c.popupTitle || undefined,
          viewerHeight: c.viewerHeight || '400px',
          maxWidth: c.maxWidth || '100%',
          fallbackText: c.fallbackText || 'Preview not available for this file type.',
          forceFileType: c.forceFileType || 'auto',
          viewMode: c.viewMode === 'scroll' ? 'scroll' : 'page',
          showToolbarSidebar: c.showToolbarSidebar !== false,
          showToolbarFind: c.showToolbarFind !== false,
          showToolbarNavigation: c.showToolbarNavigation !== false,
          showToolbarZoom: c.showToolbarZoom !== false,
          showToolbarRotate: c.showToolbarRotate !== false,
          showToolbarPrint: c.showToolbarPrint !== false,
          showToolbarDownload: c.showToolbarDownload !== false,
          onPopupClose: () => {
            self.emit('documentViewerClose', { component: self })
          },
          onPopupAction: (actionKey: string) => {
            self.emit('documentViewerAction', { actionKey, component: self })
          },
        }),
      )
    }

    // ── Detach ──────────────────────────────────────────────────────────

    detach() {
      if (this._triggerRoot) {
        const root = this._triggerRoot
        this._triggerRoot = null
        queueMicrotask(() => { try { root.unmount() } catch { /* already gone */ } })
      }
      return super.detach()
    }
  }
}

export default createDocumentViewerClass
