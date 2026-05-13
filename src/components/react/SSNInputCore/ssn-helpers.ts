/**
 * SSN / ITIN pure helpers — shared by:
 *   - SSNInputCore (React UI)
 *   - SSNMaskingFormIO (Form.io runtime validation)
 *
 * No DOM, no Form.io, no React dependencies. Pure functions only.
 */

export type TaxIdValidationMode = 'any' | 'ssn' | 'itin'
export type TaxIdMaskedDisplayMode = 'last4' | 'fullMask'

/** Strip non-digits and clamp to 9 characters. */
export function digitsOnly(v: unknown): string {
  return String(v ?? '').replace(/\D/g, '').substring(0, 9)
}

/** Format raw digits into NNN-NN-NNNN (partial values supported). */
export function formatTaxId(digits: string): string {
  if (!digits) return ''
  if (digits.length <= 3) return digits
  if (digits.length <= 5) return `${digits.substring(0, 3)}-${digits.substring(3)}`
  return `${digits.substring(0, 3)}-${digits.substring(3, 5)}-${digits.substring(5)}`
}

/**
 * Build the masked display string for the given raw digits.
 *
 *   - last4    → ***-**-1234 (or progressive while typing)
 *   - fullMask → ***-**-****
 */
export function maskTaxId(
  digits: string,
  mode: TaxIdMaskedDisplayMode = 'last4',
  maskCharacter: string = '*',
): string {
  if (!digits) return ''
  const ch = maskCharacter || '*'

  if (mode === 'fullMask') {
    if (digits.length <= 3) return ch.repeat(digits.length)
    if (digits.length <= 5) return `${ch.repeat(3)}-${ch.repeat(digits.length - 3)}`
    return `${ch.repeat(3)}-${ch.repeat(2)}-${ch.repeat(digits.length - 5)}`
  }

  // last4
  if (digits.length <= 5) return ch.repeat(digits.length)
  if (digits.length < 9) {
    const visible = digits.substring(5)
    return `${ch.repeat(3)}-${ch.repeat(2)}-${visible}`
  }
  return `${ch.repeat(3)}-${ch.repeat(2)}-${digits.substring(5)}`
}

/** SSA-issued SSN — rejects ITIN range (leading 9) and reserved 0-blocks. */
export function isValidSSN(digits: string): boolean {
  if (digits.length !== 9) return false
  if (digits[0] === '9') return false
  const area = digits.substring(0, 3)
  const group = digits.substring(3, 5)
  const serial = digits.substring(5)
  if (area === '000' || group === '00' || serial === '0000') return false
  return true
}

/** IRS-issued ITIN — must lead with 9, group must fall in valid ranges. */
export function isValidITIN(digits: string): boolean {
  if (digits.length !== 9) return false
  if (digits[0] !== '9') return false
  const group = parseInt(digits.substring(3, 5), 10)
  const validRanges: [number, number][] = [
    [50, 65], [70, 88], [90, 92], [94, 99],
  ]
  return validRanges.some(([lo, hi]) => group >= lo && group <= hi)
}

export function defaultTaxIdValidationMessage(mode: TaxIdValidationMode): string {
  if (mode === 'ssn') return 'Please enter a valid Social Security Number (NNN-NN-NNNN).'
  if (mode === 'itin') return 'Please enter a valid ITIN (NNN-NN-NNNN). First digit must be 9 with valid group digits.'
  return 'Please enter a valid SSN or ITIN (NNN-NN-NNNN).'
}

export interface TaxIdValidationResult {
  valid: boolean
  /** Populated when invalid; undefined when valid or empty. */
  message?: string
}

/**
 * Validate a tax ID string of raw digits against the configured mode.
 *
 * Empty input is treated as VALID here (the required check is a separate
 * concern owned by the consumer / Form.io's required validator).
 */
export function validateTaxId(
  digits: string,
  mode: TaxIdValidationMode = 'any',
): TaxIdValidationResult {
  if (!digits) return { valid: true }
  if (digits.length !== 9) {
    return { valid: false, message: 'Tax ID must be exactly 9 digits (NNN-NN-NNNN).' }
  }
  const okSSN = isValidSSN(digits)
  const okITIN = isValidITIN(digits)
  let ok: boolean
  if (mode === 'ssn') ok = okSSN
  else if (mode === 'itin') ok = okITIN
  else ok = okSSN || okITIN
  if (!ok) return { valid: false, message: defaultTaxIdValidationMessage(mode) }
  return { valid: true }
}
