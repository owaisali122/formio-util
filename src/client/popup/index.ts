/**
 * Popup module — public API
 *
 * Re-exports from the canonical Core location (src/coreHelper/PopupCore/).
 * PopupContainer remains here as the app-root provider component.
 */

export { PopupContainer } from './PopupContainer'

export {
  usePopup,
  openPopup,
  closePopup,
  getPopupState,
  subscribePopup,
} from '../../coreHelper/PopupCore/PopupCore.helpers'
export type { UsePopupReturn } from '../../coreHelper/PopupCore/PopupCore.helpers'

export type {
  PopupButton,
  PopupButtonVariant,
  PopupConfig,
  PopupPayload,
  PopupSize,
  PopupState,
  PopupVariant,
} from '../../coreHelper/PopupCore/PopupCore.types'
