/**
 * Popup module — public API
 *
 * Exports:
 * - PopupContainer   : Mount once at app root; renders the modal at page level
 * - usePopup         : React hook for open/close from any component
 * - openPopup        : Imperative open — works from vanilla JS / Form.io components
 * - closePopup       : Imperative close
 * - Types            : PopupConfig, PopupButton, PopupPayload, PopupVariant, etc.
 */

export { PopupContainer } from './PopupContainer'
export { usePopup } from './usePopup'
export type { UsePopupReturn } from './usePopup'

export { openPopup, closePopup, getPopupState, subscribePopup } from './popupStore'

export type {
  PopupButton,
  PopupButtonVariant,
  PopupConfig,
  PopupPayload,
  PopupSize,
  PopupState,
  PopupVariant,
} from './PopupTypes'
