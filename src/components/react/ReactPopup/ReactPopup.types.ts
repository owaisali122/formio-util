import type React from 'react'
import type { PopupButton, PopupButtonVariant, PopupConfig, PopupPayload, PopupSize, PopupVariant } from '../../../client/popup/PopupTypes'

// ── Re-export canonical Form.io popup types under React-prefixed aliases ──────
//
// These aliases ensure the public API of ReactPopup is stable regardless of
// internal Form.io naming. Any additions to the underlying Form.io types are
// automatically available here — no changes needed in this file.

export type ReactPopupButton = PopupButton
export type ReactPopupButtonVariant = PopupButtonVariant
export type ReactPopupVariant = PopupVariant
export type ReactPopupSize = PopupSize
export type ReactPopupPayload = PopupPayload

/**
 * Props for ReactPopup.
 *
 * Extends PopupConfig — every field on PopupConfig is available here.
 * When the Form.io popup gains new config options, they are automatically
 * available on ReactPopup without any code change.
 *
 * Additional props beyond PopupConfig:
 *   open      — controlled visibility (the consumer owns state)
 *   payload   — dynamic context passed back to onAction
 *   className — extra CSS class on the .modal element
 *   children  — React body content (takes precedence over htmlContent/message)
 */
export interface ReactPopupProps extends PopupConfig {
  /** When true, the popup is rendered. Consumer controls visibility. */
  open: boolean
  /** Dynamic data passed to onAction. Defaults to {}. */
  payload?: PopupPayload
  /** Optional extra class added to the .modal element. */
  className?: string
  /** React body content — takes precedence over htmlContent and message. */
  children?: React.ReactNode
}

