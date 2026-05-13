'use client'

import React from 'react'
import { SmartStreet } from '../coreHelper/SmartStreetCore'
import type {
  SmartStreetProps,
  SmartStreetValue,
  AddressApiConfig,
  AddressMapping,
  AddressResult,
} from '../coreHelper/SmartStreetCore'

// Re-export the underlying types so consumers of ReactSmartStreetComponent
// never need to import from SmartStreet directly.
export type {
  SmartStreetValue,
  AddressApiConfig,
  AddressMapping,
  AddressResult,
}

// ─── Wrapper-only props ───────────────────────────────────────────────────────
// These props are handled by ReactSmartStreetComponent itself and are NOT
// forwarded to the underlying SmartStreet component.

export interface ReactSmartStreetWrapperProps {
  /**
   * Text label displayed above the field.
   * Optional — omit to render without a label.
   */
  label?: string

  /**
   * When true, an asterisk (*) is appended to the label to indicate the field
   * is required. This is purely visual; wire up actual validation with
   * SmartStreetProps.onChange and SmartStreetProps.value.
   */
  required?: boolean

  /**
   * Error message displayed below the field in red when set.
   * Typically driven by form validation state in the parent component.
   */
  errorMessage?: string

  /**
   * HTML id applied to the outermost wrapper div.
   * Useful for accessibility (htmlFor on external labels) or CSS targeting.
   */
  id?: string

  /**
   * CSS class(es) appended to the outermost wrapper div.
   * Use to apply custom spacing or layout overrides.
   */
  className?: string

  /**
   * Inline styles applied to the outermost wrapper div.
   */
  style?: React.CSSProperties
}

// ─── Combined props ───────────────────────────────────────────────────────────

/**
 * All props accepted by ReactSmartStreetComponent.
 *
 * Extends SmartStreetProps (forwarded to the underlying component) with
 * ReactSmartStreetWrapperProps (handled by this wrapper only).
 *
 * Required props (from SmartStreetProps):
 *   - name  — unique field identifier used as the HTML name attribute
 *
 * Commonly used props:
 *   - value / onChange       — controlled value for form state management
 *   - addressApiConfig       — API endpoint + auth credentials
 *   - addressMapping         — custom display labels for address sub-fields
 *   - placeholder            — text shown in the search box when empty
 *   - disabled               — disables all inputs
 *   - label / required       — label text and required indicator (wrapper-only)
 *   - errorMessage           — validation error text shown below (wrapper-only)
 */
export type ReactSmartStreetComponentProps = SmartStreetProps & ReactSmartStreetWrapperProps

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * ReactSmartStreetComponent
 *
 * A thin React wrapper around the Form.io `SmartStreet` component.
 * Adds a label, required indicator, and error message display while
 * delegating all address-autocomplete logic to the underlying `SmartStreet`.
 *
 * Because this wrapper imports `SmartStreet` directly, any future updates to
 * the Form.io SmartStreet component are automatically picked up here — no
 * reimplementation needed.
 *
 * Basic usage:
 * ```tsx
 * <ReactSmartStreetComponent
 *   name="homeAddress"
 *   label="Home Address"
 *   required
 *   value={addressValue}
 *   onChange={setAddressValue}
 *   addressApiConfig={{ url: 'https://example.com/api/address/autocomplete' }}
 * />
 * ```
 *
 * With secure API (Basic Auth + partner-id header):
 * ```tsx
 * <ReactSmartStreetComponent
 *   name="mailingAddress"
 *   label="Mailing Address"
 *   addressApiConfig={{
 *     url: 'https://secure-api.example.com/address/autocomplete',
 *     partnerId: 'my-partner-id',
 *     username: 'api-user',
 *     password: 'api-password',
 *   }}
 *   value={addressValue}
 *   onChange={setAddressValue}
 * />
 * ```
 *
 * With custom field labels (address mapping):
 * ```tsx
 * <ReactSmartStreetComponent
 *   name="workAddress"
 *   addressMapping={{
 *     secondary: 'Suite / Floor',
 *     city: 'City',
 *     state: 'State',
 *     zipcode: 'ZIP Code',
 *   }}
 *   value={addressValue}
 *   onChange={setAddressValue}
 * />
 * ```
 */
export function ReactSmartStreetComponent({
  // ── Wrapper-only props — consumed here, NOT forwarded to SmartStreet ──
  label,
  required,
  errorMessage,
  id,
  className,
  style,

  // ── All remaining props are forwarded to SmartStreet via spread ──────
  // This means any new prop added to SmartStreetProps in the future is
  // automatically passed through without touching this wrapper.
  ...smartStreetProps
}: ReactSmartStreetComponentProps) {
  return (
    <div id={id} className={className} style={style}>
      {/* Optional field label with required indicator */}
      {label && (
        <label
          htmlFor={smartStreetProps.name}
          style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}
        >
          {label}
          {required && (
            <span aria-hidden="true" style={{ color: '#c00', marginLeft: 2 }}>
              *
            </span>
          )}
        </label>
      )}

      {/*
       * Spread forwards ALL SmartStreetProps directly.
       * Any property added to SmartStreetProps or the Form.io SmartStreet
       * component in the future is automatically adopted here — no wrapper
       * changes needed.
       */}
      <SmartStreet {...smartStreetProps} />

      {/* Optional validation error message */}
      {errorMessage && (
        <span
          role="alert"
          style={{ display: 'block', marginTop: 4, fontSize: 12, color: '#c00' }}
        >
          {errorMessage}
        </span>
      )}
    </div>
  )
}

export default ReactSmartStreetComponent
