'use client'

/**
 * DocumentViewerCore — shared React core for the document viewer.
 *
 * Renders a trigger button. On click, opens the existing popup via openPopup()
 * and renders DocumentViewerContent (PDF / image / fallback) inside it via
 * React 18 createRoot.
 *
 * This is the single source of truth for the document viewer trigger UI and
 * popup wiring. Both consumers render this component directly:
 *
 *   - ReactDocumentViewer (standalone)
 *   - DocumentViewerFormIO (Form.io runtime, via createRoot in attach())
 *
 * NOTE: Consumers must mount the popup container at the app level so openPopup
 * has somewhere to render.
 */

import React, { useCallback, useEffect, useRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'

import { openPopup } from '../../../client/popup/popupStore'
import {
  DocumentViewerContent,
  resolveFileType,
} from '../../../client/custom-components/DocumentViewerContent'
import type { DocumentViewerCoreProps } from './DocumentViewerCore.types'

export type { DocumentViewerCoreProps } from './DocumentViewerCore.types'

function resolvePopupTitle(configured: string | undefined, fileName: string | undefined): string {
  const c = (configured ?? '').trim()
  if (c) return c
  const f = (fileName ?? '').trim()
  if (f) return f
  return 'Document Viewer'
}

export function DocumentViewerCore({
  buttonText = '',
  iconCssClass = 'fa fa-file',
  description = '',
  disabled = false,
  tabIndex,
  className,
  fileUrl,
  fileName,
  popupTitle,
  viewerHeight = '400px',
  maxWidth = '100%',
  fallbackText = 'Preview not available for this file type.',
  forceFileType = 'auto',
  viewMode = 'page',
  showToolbarSidebar = true,
  showToolbarFind = true,
  showToolbarNavigation = true,
  showToolbarZoom = true,
  showToolbarRotate = true,
  showToolbarPrint = true,
  showToolbarDownload = true,
  onPopupClose,
  onPopupAction,
}: DocumentViewerCoreProps) {
  // Track the React root mounted inside the popup so we can clean it up on
  // unmount (covers detach during builder redraw / unmount of the standalone
  // wrapper while the popup may still be open).
  const popupRootRef = useRef<Root | null>(null)

  const unmountPopupRoot = useCallback(() => {
    if (popupRootRef.current) {
      try {
        popupRootRef.current.unmount()
      } catch {
        // Ignore — popup may have already cleaned the DOM.
      }
      popupRootRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      unmountPopupRoot()
    }
  }, [unmountPopupRoot])

  const isTriggerDisabled = disabled || !fileUrl

  const handleClick = useCallback(() => {
    if (isTriggerDisabled) return

    const fileType = resolveFileType(
      forceFileType,
      fileName || undefined,
      fileUrl || undefined,
    )

    const title = resolvePopupTitle(popupTitle, fileName)

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
          // Child container managed exclusively by our React root — avoids
          // React createRoot conflicting with the outer popup that already
          // rendered bodyEl via dangerouslySetInnerHTML.
          const container = document.createElement('div')
          bodyEl.appendChild(container)

          const root = createRoot(container)
          root.render(
            React.createElement(DocumentViewerContent, {
              url: fileUrl,
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
          popupRootRef.current = root
        },
        onClose: () => {
          unmountPopupRoot()
          onPopupClose?.()
        },
        onAction: (actionKey: string) => {
          onPopupAction?.(actionKey)
        },
      },
      {},
    )
  }, [
    isTriggerDisabled, forceFileType, fileName, fileUrl, popupTitle,
    viewerHeight, maxWidth, fallbackText, viewMode,
    showToolbarSidebar, showToolbarFind, showToolbarNavigation,
    showToolbarZoom, showToolbarRotate, showToolbarPrint, showToolbarDownload,
    onPopupClose, onPopupAction, unmountPopupRoot,
  ])

  return (
    <div className={className}>
      <button
        type="button"
        className="btn btn-primary"
        disabled={isTriggerDisabled}
        tabIndex={tabIndex}
        onClick={handleClick}
      >
        <i
          className={iconCssClass}
          aria-hidden="true"
          style={buttonText ? { marginRight: 6 } : undefined}
        />
        {buttonText}
      </button>
      {description && <div className="help-block">{description}</div>}
    </div>
  )
}

export default DocumentViewerCore
