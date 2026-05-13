import type React from 'react'
import type { DatePickerInputProps, DatePickerSingleValue, DateRangeValue } from '../../DatePickerInput'
import type { DatePickerMode } from '../../date-picker-shared'

// Re-export underlying value/config types so consumers of ReactDatePicker
// never need to reach into the Form.io DatePickerInput module directly.
export type { DatePickerSingleValue, DateRangeValue, DatePickerMode }

/**
 * Wrapper-only props consumed by ReactDatePicker itself.
 * These are NOT forwarded to the underlying DatePickerInput component.
 */
export interface ReactDatePickerWrapperProps {
  /** Text label rendered above the field. Omit to render without a label. */
  label?: string

  /**
   * When true, an asterisk (*) is appended to the label as a visual hint.
   * Validation must still be wired up via value/onChange.
   */
  required?: boolean

  /** Error message displayed below the field in red when set. */
  errorMessage?: string

  /** HTML id applied to the outermost wrapper div. */
  id?: string

  /** CSS class(es) appended to the outermost wrapper div. */
  className?: string

  /** Inline styles applied to the outermost wrapper div. */
  style?: React.CSSProperties
}

/**
 * Props accepted by ReactDatePicker.
 *
 * Extends DatePickerInputProps (forwarded to the underlying DatePickerInput
 * component) with ReactDatePickerWrapperProps (handled by this wrapper only).
 */
export type ReactDatePickerProps = DatePickerInputProps & ReactDatePickerWrapperProps
