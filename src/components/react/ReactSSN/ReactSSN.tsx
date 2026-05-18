'use client'

/**
 * ReactSSN — standalone React wrapper around the shared SSNInputCore.
 *
 * Mirrors the ReactDocumentViewer pattern:
 *   1. Render an optional label above the input.
 *   2. Manage the bound SSN value as raw 9-digit (or shorter) string.
 *   3. Forward all UI / behavior props to <SSNInputCore />, the single
 *      source of truth for masking, eye toggle, copy prevention, paste, etc.
 *
 * No Formio.createForm. No Form.io schema. No registration. The shared core
 * is also rendered by the Form.io SSN runtime (SSNMaskingFormIO) via
 * createRoot inside attach(), so behavior stays identical between the two.
 *
 * Validation logic for SSN/ITIN is exposed via `validateTaxId` from
 * '../SSNInputCore' for consumers who want to mirror the Form.io rules.
 */

import React, { useCallback, useMemo } from 'react'

import { BootstrapProvider } from '../../../providers/BootstrapProvider'
import { SSNInputCore } from '../../../coreHelper/SSNInputCore/SSNInputCore'
import { digitsOnly } from '../../../coreHelper/SSNInputCore/SSNInputCore.helpers'

import type { ReactSSNProps, ReactSSNValue } from './ReactSSN.types'

export function ReactSSN({
  value,
  onChange,
  label,
  description,
  placeholder,
  className,
  required = false,
  disabled = false,
  readOnly = false,
  masked,
  maskedDisplayMode,
  maskCharacter,
  allowToggleMask,
  preventCopy,
  // validationMode is accepted for API parity with the Form.io schema; the
  // standalone wrapper does not surface validation messaging itself, but
  // consumers can call validateTaxId(rawDigits, validationMode) from
  // '../SSNInputCore' to mirror the Form.io rules.
  validationMode: _validationMode,
}: ReactSSNProps) {
  const rawValue = useMemo(() => digitsOnly(value ?? ''), [value])

  const handleChange = useCallback(
    (raw: string) => {
      const out: ReactSSNValue = raw === '' ? null : raw
      onChange?.(out)
    },
    [onChange],
  )

  const tabIndexNum = undefined // schema parity hook reserved for future use

  const wrapperClassName = ['formio-ssn-standalone', className]
    .filter(Boolean)
    .join(' ')

  return (
    <BootstrapProvider>
      <div className={wrapperClassName}>
        {label && (
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
            {label}
          </label>
        )}

        <SSNInputCore
          value={rawValue}
          onChange={handleChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
          tabIndex={tabIndexNum}
          masked={masked}
          maskedDisplayMode={maskedDisplayMode}
          maskCharacter={maskCharacter}
          allowToggleMask={allowToggleMask}
          preventCopy={preventCopy}
        />

        {description && (
          <div className="help-block" style={{ marginTop: 4 }}>
            {description}
          </div>
        )}
      </div>
    </BootstrapProvider>
  )
}

export default ReactSSN
