import type { DocumentViewerFileType } from '../../components/DocumentViewer'

export interface DocumentViewerCoreProps {
  // ── Trigger button ───────────────────────────────────────────────────
  buttonText?: string
  iconCssClass?: string
  description?: string
  disabled?: boolean
  tabIndex?: number
  className?: string

  // ── Resolved data (caller resolves URL/name from static or submission) ─
  /** Resolved file URL. Empty string disables the trigger. */
  fileUrl: string
  /** Resolved file name (used in title fallback and DocumentViewerContent). */
  fileName?: string
  /** Configured popup title; falls back to fileName then 'Document Viewer'. */
  popupTitle?: string

  // ── Viewer settings (forwarded to DocumentViewerContent) ─────────────
  viewerHeight?: string
  maxWidth?: string
  fallbackText?: string
  forceFileType?: DocumentViewerFileType
  viewMode?: 'page' | 'scroll'
  showToolbarSidebar?: boolean
  showToolbarFind?: boolean
  showToolbarNavigation?: boolean
  showToolbarZoom?: boolean
  showToolbarRotate?: boolean
  showToolbarPrint?: boolean
  showToolbarDownload?: boolean

  // ── Optional callbacks (used by Form.io to bridge `this.emit`) ───────
  onPopupClose?: () => void
  onPopupAction?: (actionKey: string) => void
}
