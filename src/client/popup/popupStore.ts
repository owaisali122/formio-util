/**
 * popupStore — zero-dependency global singleton for popup state.
 *
 * Any module (React component, Form.io vanilla component, TanStack Table action)
 * can call openPopup / closePopup without knowing anything about React or the DOM.
 *
 * A single PopupContainer React component subscribes here and renders the
 * actual modal UI at page-root level via ReactDOM.createPortal.
 */

import type { PopupConfig, PopupPayload, PopupState } from './PopupTypes'

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
