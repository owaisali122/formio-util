import type React from 'react'
import type {
  SmartStreetProps,
  SmartStreetValue,
  AddressApiConfig,
  AddressMapping,
  AddressResult,
} from '../../../coreHelper/SmartStreetCore'

// Re-export underlying value/config types so consumers of ReactSmartStreet
// never need to reach into the Form.io SmartStreet module directly.
export type {
  SmartStreetValue,
  AddressApiConfig,
  AddressMapping,
  AddressResult,
}

/**
 * Wrapper-only props consumed by ReactSmartStreet itself.
 * These are NOT forwarded to the underlying SmartStreet component.
 */
export interface ReactSmartStreetWrapperProps {
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
 * Props accepted by ReactSmartStreet.
 *
 * Extends SmartStreetProps (forwarded to the underlying SmartStreet component)
 * with ReactSmartStreetWrapperProps (handled by this wrapper only).
 */
export type ReactSmartStreetProps = SmartStreetProps & ReactSmartStreetWrapperProps
