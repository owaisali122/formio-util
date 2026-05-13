/**
 * PopupCore.helpers — zero-dependency global singleton for popup state + React hook.
 *
 * Any module (React component, Form.io vanilla component, TanStack Table action)
 * can call openPopup / closePopup without knowing anything about React or the DOM.
 *
 * A single PopupContainer React component subscribes here and renders the
 * actual modal UI at page-root level via ReactDOM.createPortal.
 */

import type { PopupConfig, PopupPayload, PopupState } from './PopupCore.types'

type Listener = (state: PopupState | null) => void

let _state: PopupState | null = null
let _counter = 0
const _listeners = new Set<Listener>()

function _notify() {
  _listeners.forEach((fn) => fn(_state))
}

/** Open the popup with the given config and optional dynamic payload. */
export function openPopup(config: PopupConfig, payload?: PopupPayload): string {
  const id = `popup-${++_counter}`
  _state = { id, config, payload: payload ?? {}, isOpen: true }
  _notify()
  return id
}

/** Close the currently open popup (if any). */
export function closePopup(): void {
  if (!_state) return
  const { config } = _state
  _state = null
  _notify()
  config.onClose?.()
}

/** Returns the current popup state (null when no popup is open). */
export function getPopupState(): PopupState | null {
  return _state
}

/**
 * Subscribe to popup state changes.
 * @returns an unsubscribe function — call it to stop listening.
 */
export function subscribePopup(listener: Listener): () => void {
  _listeners.add(listener)
  return () => _listeners.delete(listener)
}

// ── usePopup hook ─────────────────────────────────────────────────────────────

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
export function usePopup(): UsePopupReturn {
  return {
    open: openPopup,
    close: closePopup,
  }
}
