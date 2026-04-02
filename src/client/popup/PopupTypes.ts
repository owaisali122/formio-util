// ─── Popup Types ─────────────────────────────────────────────────────────────

/** Button variant controls visual style */
export type PopupButtonVariant = 'primary' | 'secondary' | 'danger' | 'warning' | 'success'

/** Popup visual variant / purpose */
export type PopupVariant = 'alert' | 'confirm' | 'warning' | 'delete' | 'custom'

/** Popup size */
export type PopupSize = 'sm' | 'md' | 'lg'

/** A single configurable button in the popup */
export interface PopupButton {
  /** The text shown on the button */
  label: string
  /** Unique key identifying which action was taken — passed to onAction callback */
  actionKey: string
  /** Visual style */
  variant?: PopupButtonVariant
  /** Optional Font Awesome icon class, e.g. "fa fa-trash" */
  icon?: string
  /** If true (default), clicking this button automatically closes the popup */
  closeOnClick?: boolean
  /** If true, button is rendered disabled */
  disabled?: boolean
}

/**
 * Configuration passed when opening the popup.
 * All fields are optional — sensible defaults are applied.
 */
export interface PopupConfig {
  /** Modal title */
  title?: string
  /** Body text / message */
  message?: string
  /** Visual purpose variant — affects default icon and button set if buttons are not provided */
  variant?: PopupVariant
  /** Modal width */
  size?: PopupSize
  /** Optional Font Awesome icon class shown next to the title, e.g. "fa fa-exclamation-triangle" */
  icon?: string
  /**
   * Configurable button array. If omitted, sensible defaults are used
   * based on the variant (e.g. confirm → OK + Cancel, delete → Delete + Cancel).
   */
  buttons?: PopupButton[]
  /** Show the × close icon in the top-right corner. Default: true */
  showCloseIcon?: boolean
  /** Close the popup when the backdrop (outside area) is clicked. Default: false */
  closeOnBackdrop?: boolean
  /** Close the popup on Escape key press. Default: true */
  closeOnEscape?: boolean
  /**
   * Called when a button is clicked (after optional close).
   * Receives the actionKey from the clicked button and the dynamic payload
   * that was passed when the popup was opened.
   */
  onAction?: (actionKey: string, payload: PopupPayload) => void
  /** Called whenever the popup closes (via X, backdrop, Escape, or any button with closeOnClick). */
  onClose?: () => void
}

/**
 * Arbitrary dynamic data/context attached when opening the popup.
 * Examples: row data from a table, record id, item name.
 */
export type PopupPayload = Record<string, unknown>

/** Internal snapshot of an open popup instance */
export interface PopupState {
  id: string
  config: PopupConfig
  payload: PopupPayload
  isOpen: boolean
}
