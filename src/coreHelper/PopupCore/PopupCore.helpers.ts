/**
 * PopupCore.helpers — zero-dependency global singleton for popup state + React hook.
 *
 * Any module (React component, Form.io vanilla component, TanStack Table action)
 * can call openPopup / closePopup without knowing anything about React or the DOM.
 *
 * A single PopupContainer React component subscribes here and renders the
 * actual modal UI at page-root level via ReactDOM.createPortal.
 *
 * IMPORTANT: State is stored on globalThis so that multiple bundled copies of this
 * module (e.g. dist/index.js and dist/client.js with splitting:false) share the
 * same singleton. Without this, openPopup() in one bundle would notify a different
 * _listeners set than PopupContainer subscribes to in another bundle.
 */

import type { PopupConfig, PopupPayload, PopupState } from './PopupCore.types'

type Listener = (state: PopupState | null) => void

interface PopupSingleton {
  state: PopupState | null
  counter: number
  listeners: Set<Listener>
}

const GLOBAL_KEY = '__kolea_popup_singleton__' as const

function _getSingleton(): PopupSingleton {
  const g = globalThis as any
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = { state: null, counter: 0, listeners: new Set<Listener>() }
  }
  return g[GLOBAL_KEY] as PopupSingleton
}

function _notify() {
  const s = _getSingleton()
  s.listeners.forEach((fn) => fn(s.state))
}

/** Open the popup with the given config and optional dynamic payload. */
export function openPopup(config: PopupConfig, payload?: PopupPayload): string {
  const s = _getSingleton()
  const id = `popup-${++s.counter}`
  s.state = { id, config, payload: payload ?? {}, isOpen: true }
  _notify()
  return id
}

/** Close the currently open popup (if any). */
export function closePopup(): void {
  const s = _getSingleton()
  if (!s.state) return
  const { config } = s.state
  s.state = null
  _notify()
  config.onClose?.()
}

/** Returns the current popup state (null when no popup is open). */
export function getPopupState(): PopupState | null {
  return _getSingleton().state
}

/**
 * Subscribe to popup state changes.
 * @returns an unsubscribe function — call it to stop listening.
 */
export function subscribePopup(listener: Listener): () => void {
  const s = _getSingleton()
  s.listeners.add(listener)
  return () => s.listeners.delete(listener)
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
