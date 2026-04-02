/**
 * usePopup — React hook for opening and closing the generic popup.
 *
 * Works in any React component within the application (forms, pages, tables).
 * The popup renders at page-root via PopupContainer — not inside this component.
 *
 * Usage:
 *   const { open, close } = usePopup()
 *   open({ title: 'Are you sure?', variant: 'delete', onAction: (key) => ... })
 */

import { openPopup, closePopup } from './popupStore'
import type { PopupConfig, PopupPayload } from './PopupTypes'

export interface UsePopupReturn {
  /**
   * Open the popup.
   * @param config - Title, message, buttons, variant, callbacks, etc.
   * @param payload - Optional dynamic context (row data, record id, etc.)
   * @returns The internal popup id (rarely needed by callers)
   */
  open: (config: PopupConfig, payload?: PopupPayload) => string
  /** Close the currently open popup programmatically. */
  close: () => void
}

export function usePopup(): UsePopupReturn {
  return {
    open: openPopup,
    close: closePopup,
  }
}
