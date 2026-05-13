'use client'

/**
 * ReactDatePicker — standalone React wrapper around the existing DatePickerInput
 * component.
 *
 * This component does NOT reimplement any date picking, masking, range,
 * time-zone, or validation logic. All behavior lives in
 * src/components/DatePickerInput.tsx and flows through automatically whenever
 * that file changes.
 *
 * This wrapper is responsible only for:
 *   1. Rendering an optional label with required indicator.
 *   2. Forwarding all DatePickerInputProps to the underlying DatePickerInput.
 *   3. Rendering an optional validation error message.
 */

import React from 'react'

import { BootstrapProvider } from '../../BootstrapProvider'
import { DatePickerInput } from '../../DatePickerInput'

import type { ReactDatePickerProps } from './ReactDatePicker.types'

export function ReactDatePicker({
  // ── Wrapper-only props (consumed here, NOT forwarded) ──
  label,
  required,
  errorMessage,
  id,
  className,
  style,

  // ── Remaining props are forwarded to DatePickerInput via spread, so any
  //    new prop added to DatePickerInputProps is automatically picked up here. ──
  ...datePickerInputProps
}: ReactDatePickerProps) {
  const wrapperClassName = ['react-date-picker-standalone', className]
    .filter(Boolean)
    .join(' ')

  return (
    <BootstrapProvider>
      <div id={id} className={wrapperClassName} style={style}>
        {label && (
          <label
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

        <DatePickerInput {...datePickerInputProps} />

        {errorMessage && (
          <span role="alert" className="help-block text-danger small">
            {errorMessage}
          </span>
        )}
      </div>
    </BootstrapProvider>
  )
}
