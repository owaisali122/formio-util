import type { TaxIdSchema } from '../../SSN'

// Re-export the underlying schema type so consumers of ReactSSN never
// need to reach into the Form.io SSN module directly.
export type { TaxIdSchema }

/**
 * Value held by ReactSSN.
 *
 * The underlying Form.io TaxId component stores the SSN / ITIN as a plain
 * string in `NNN-NN-NNNN` format (or empty string when unset). The wrapper
 * surfaces it as `string | null` to keep the React API ergonomic.
 */
export type ReactSSNValue = string | null

/**
 * Props for ReactSSN.
 *
 * All behavior props map directly to TaxIdSchema fields
 * (src/components/SSN.tsx) and are forwarded into the existing Form.io
 * component via Formio.createForm. No masking, validation, mask-toggle,
 * or copy-prevention logic is reimplemented here.
 */
export interface ReactSSNProps {
  // ── Value ────────────────────────────────────────────────────────────
  /** Bound SSN / ITIN value in `NNN-NN-NNNN` format, or null when empty. */
  value?: ReactSSNValue
  /** Called whenever the underlying Form.io component emits a change. */
  onChange?: (value: ReactSSNValue) => void

  // ── Display ──────────────────────────────────────────────────────────
  label?: string
  description?: string
  placeholder?: string
  className?: string

  // ── Behavior ─────────────────────────────────────────────────────────
  required?: boolean
  disabled?: boolean
  readOnly?: boolean

  // ── Masking (forwarded to TaxIdSchema) ───────────────────────────────
  masked?: boolean
  maskedDisplayMode?: 'last4' | 'fullMask'
  maskCharacter?: string
  allowToggleMask?: boolean
  preventCopy?: boolean

  // ── Validation ───────────────────────────────────────────────────────
  /** Controls which tax ID formats are accepted: 'any' (SSN or ITIN), 'ssn', or 'itin'. */
  validationMode?: 'any' | 'ssn' | 'itin'
}
