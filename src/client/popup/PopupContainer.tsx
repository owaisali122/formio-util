/**
 * PopupContainer — root-level React component.
 *
 * Mount this ONCE at the application root (outside any Form.io or table tree).
 * It subscribes to popupStore and renders the modal UI via ReactDOM.createPortal
 * to document.body, guaranteeing it always sits above every z-index layer.
 *
 * Modal rendering is handled by PopupModal (shared core). Any changes to
 * variants, icons, button defaults, or modal markup belong there.
 *
 * Usage in your app layout:
 *   import { PopupContainer } from '@your-org/kolea-shared-package/client'
 *   // Place once at app root:
 *   <PopupContainer />
 */

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { closePopup, subscribePopup } from './popupStore'
import { PopupModal } from './PopupModal'
import type { PopupState } from './PopupTypes'

// ─── PopupContainer ───────────────────────────────────────────────────────────

/**
 * Mount this once at your application root.
 * It listens to popupStore and renders the active popup into document.body
 * via a React Portal, keeping it visually above all other content.
 */
export function PopupContainer() {
  const [popupState, setPopupState] = useState<PopupState | null>(null)

  useEffect(() => {
    return subscribePopup((state) => setPopupState(state ? { ...state } : null))
  }, [])

  if (!popupState || !popupState.isOpen) return null

  return createPortal(
    <PopupModal
      config={popupState.config}
      payload={popupState.payload}
      onClose={closePopup}
    />,
    document.body,
  )
}
