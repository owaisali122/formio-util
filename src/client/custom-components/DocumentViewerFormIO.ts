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
import { DocumentViewerCore } from '../../components/react/DocumentViewerCore'

// Re-export worker setup so consumers can import it from one place.
export { setupDocumentViewerWorker } from './DocumentViewerContent'

/**
 * Cache: keeps the React root + persistent mount div alive across Form.io's
 * destroy → recreate cycle in the designer (tab switch, property edit).
 * Keyed by component key. The outgoing instance stashes its root here in
 * destroy(); the incoming instance picks it up in attach().
 */
const _reactMountCache = new Map<string, { mount: HTMLDivElement; root: Root }>()

export function createDocumentViewerClass(FieldComponent: any) {
  return class DocumentViewerFormIO extends FieldComponent {
    /** React root mounted inside the persistent mount div. */
    _triggerRoot: Root | null = null
    /** Persistent mount div that survives detach/attach redraw cycles. */
    _persistentMount: HTMLDivElement | null = null

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

    // ── Redraw ──────────────────────────────────────────────────────────

    /**
     * Override redraw() to block the DOM rebuild when React is already live.
     *
     * Form.io calls redraw() on every edit-form property change and on every
     * tab switch in the designer. Without this override, each redraw triggers
     * detach() → attach(), which destroys and recreates the React root —
     * causing the visible jerk/flash in the preview.
     *
     * When the persistent mount is live, we skip the DOM rebuild entirely and
     * just push updated props into the existing React tree.
     */
    redraw() {
      if (this._triggerRoot && this._persistentMount) {
        this._renderTrigger()
        return Promise.resolve()
      }
      return super.redraw()
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

      const cacheKey = this.component?.key || ''

      // Retrieve cached root + mount from a previous instance if available.
      // This fires when Form.io destroys + recreates the instance (designer
      // tab change). The new instance reuses the existing React root so no
      // remount.
      if (!this._persistentMount && cacheKey) {
        const cached = _reactMountCache.get(cacheKey)
        if (cached) {
          this._persistentMount = cached.mount
          this._triggerRoot = cached.root
          _reactMountCache.delete(cacheKey)
        }
      }

      // Create the persistent mount div on first-ever attach.
      if (!this._persistentMount) {
        this._persistentMount = document.createElement('div')
        this._persistentMount.className = 'document-viewer-react-mount'
      }

      // Move (or append) the persistent div into the new container.
      // appendChild on an already-in-DOM node simply moves it — the React
      // tree stays intact, no unmount/remount, no visible jerk.
      container.innerHTML = ''
      container.appendChild(this._persistentMount)

      if (!this._triggerRoot) {
        this._triggerRoot = createRoot(this._persistentMount)
      }

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
        React.createElement(DocumentViewerCore, {
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
      // Do NOT unmount the React root on detach — Form.io calls detach()
      // before every redraw/reattach cycle in the designer, so unmounting
      // here would cause the visible jerk. The root stays live and is reused
      // on the next attach(). It is only fully unmounted in destroy().
      return super.detach()
    }

    // ── Destroy ─────────────────────────────────────────────────────────

    destroy() {
      const cacheKey = this.component?.key || ''

      // Cache the React root + mount div so the next preview instance created
      // after Form.io's destroy/recreate cycle can reuse them.
      if (cacheKey && this._persistentMount && this._triggerRoot) {
        _reactMountCache.set(cacheKey, {
          mount: this._persistentMount,
          root: this._triggerRoot,
        })
        this._triggerRoot = null
        this._persistentMount = null
      } else {
        this._unmountReact()
      }

      super.destroy()
    }

    // ── React helpers ───────────────────────────────────────────────────

    _unmountReact() {
      if (this._triggerRoot) {
        const root = this._triggerRoot
        this._triggerRoot = null
        queueMicrotask(() => { try { root.unmount() } catch { /* already gone */ } })
      }
      this._persistentMount = null
    }
  }
}

export default createDocumentViewerClass
