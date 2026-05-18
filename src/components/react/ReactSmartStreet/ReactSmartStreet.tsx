'use client'

/**
 * ReactSmartStreet — standalone React wrapper around the existing SmartStreet
 * address autocomplete component.
 *
 * This component does NOT reimplement any address search, suggestion, or
 * selection logic. All behavior — debounced API calls, suggestion filtering,
 * secondary expansion, editable address sub-fields — lives in
 * src/components/SmartStreet.tsx and flows through automatically whenever
 * that file changes.
 *
 * This wrapper is responsible only for:
 *   1. Rendering an optional label with required indicator.
 *   2. Forwarding all SmartStreetProps to the underlying SmartStreet.
 *   3. Rendering an optional validation error message.
 *
 * The wrapper mirrors the standalone folder pattern used by ReactFileUploader.
 */

import React from 'react'

import { BootstrapProvider } from '../../../providers/BootstrapProvider'
import { SmartStreet } from '../../../coreHelper/SmartStreetCore'

import type { ReactSmartStreetProps } from './ReactSmartStreet.types'

export function ReactSmartStreet({
  // ── Wrapper-only props (consumed here, NOT forwarded) ──
  label,
  required,
  errorMessage,
  id,
  className,
  style,

  // ── Remaining props are forwarded to SmartStreet via spread, so any new
  //    prop added to SmartStreetProps is automatically picked up here. ──
  ...smartStreetProps
}: ReactSmartStreetProps) {
  const wrapperClassName = ['react-smart-street-standalone', className]
    .filter(Boolean)
    .join(' ')

  return (
    <BootstrapProvider>
      <div id={id} className={wrapperClassName} style={style}>
        {label && (
          <label
            htmlFor={smartStreetProps.name}
            style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}
          >
            {label}
            {required && (
              <span aria-hidden="true" className="text-danger" style={{ marginLeft: 2 }}>
                *
              </span>
            )}
          </label>
        )}

        <SmartStreet {...smartStreetProps} />

        {errorMessage && (
          <span role="alert" className="help-block text-danger small">
            {errorMessage}
          </span>
        )}
      </div>
    </BootstrapProvider>
  )
}

