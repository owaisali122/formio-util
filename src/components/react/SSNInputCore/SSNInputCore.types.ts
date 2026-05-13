import type {
  TaxIdMaskedDisplayMode,
  TaxIdValidationMode,
} from './ssn-helpers'

export type { TaxIdMaskedDisplayMode, TaxIdValidationMode }

/**
 * Props for SSNInputCore — the shared React UI for SSN / ITIN entry.
 *
 * Controlled component: parent owns the value (raw 9-digit string or empty).
 * The core does NOT own validation messaging; it exposes value changes via
 * onChange and leaves rendering of validation feedback to the consumer
 * (standalone wrapper / Form.io error template).
 */
export interface SSNInputCoreProps {
  // ── Value (controlled) ────────────────────────────────────────────────
  /** Raw digits or formatted string. Normalized internally to digits-only. */
  value?: string
  /** Fires with the raw 9-digit (or shorter) string whenever the value changes. */
  onChange?: (rawDigits: string) => void

  // ── Display ───────────────────────────────────────────────────────────
  placeholder?: string
  className?: string
  id?: string
  name?: string
  ariaInvalid?: boolean
  ariaDescribedBy?: string

  // ── Behavior ──────────────────────────────────────────────────────────
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  autoFocus?: boolean
  tabIndex?: number

  // ── Masking ───────────────────────────────────────────────────────────
  /** Default true. When false, the value is always shown formatted. */
  masked?: boolean
  maskedDisplayMode?: TaxIdMaskedDisplayMode
  maskCharacter?: string
  /** Default true. When false, the eye toggle button is hidden. */
  allowToggleMask?: boolean
  /** Default true. When false, copy/cut from the input is allowed. */
  preventCopy?: boolean

  // ── Optional callbacks (forwarded for Form.io bridging) ───────────────
  onFocus?: () => void
  onBlur?: () => void
}
