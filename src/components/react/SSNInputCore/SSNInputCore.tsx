'use client'

/**
 * SSNInputCore — shared React core for the SSN / ITIN input.
 *
 * Single source of truth for:
 *   - digit-only sanitization
 *   - NNN-NN-NNNN formatting
 *   - masked display (last4 / fullMask)
 *   - eye-toggle reveal/hide
 *   - copy / cut prevention
 *   - paste handling
 *   - keystroke handling that keeps the raw value correct in masked mode
 *
 * Consumers:
 *   - ReactSSN (standalone)
 *   - SSNMaskingFormIO (Form.io runtime, mounted via createRoot in attach())
 *
 * Validation logic (SSN/ITIN format) is exported separately from
 * `./ssn-helpers` so the Form.io class can run it inside checkValidity()
 * without instantiating React.
 */

import React, { useEffect, useRef, useState } from 'react'

import {
  digitsOnly,
  formatTaxId,
  maskTaxId,
} from './ssn-helpers'
import type { SSNInputCoreProps } from './SSNInputCore.types'

const STYLE_ELEMENT_ID = 'ssn-mask-css'
const STYLE_TEXT = `
.ssn-wrap{position:relative;width:100%;display:block}
.ssn-wrap input{width:100%;box-sizing:border-box}
.ssn-eye{position:absolute;right:6px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:16px;padding:2px 4px;z-index:2;line-height:1}
.ssn-eye:hover{opacity:.7}
.ssn-eye:focus{outline:2px solid #007bff;outline-offset:2px;border-radius:3px}`

function injectStylesOnce(): void {
  if (typeof document === 'undefined') return
  if (document.getElementById(STYLE_ELEMENT_ID)) return
  const s = document.createElement('style')
  s.id = STYLE_ELEMENT_ID
  s.textContent = STYLE_TEXT
  document.head.appendChild(s)
}

export function SSNInputCore({
  value,
  onChange,
  placeholder = 'XXX-XX-XXXX',
  className,
  id,
  name,
  ariaInvalid,
  ariaDescribedBy,
  disabled = false,
  readOnly = false,
  required = false,
  autoFocus = false,
  tabIndex,
  masked = true,
  maskedDisplayMode = 'last4',
  maskCharacter = '*',
  allowToggleMask = true,
  preventCopy = true,
  onFocus,
  onBlur,
}: SSNInputCoreProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  // Authoritative raw digits — kept in a ref so imperative input.value
  // updates (cursor preservation, masked keystroke handling) stay in sync
  // without forcing extra renders.
  const rawRef = useRef<string>(digitsOnly(value))
  const [revealed, setRevealed] = useState(false)

  // Derived flag: when not masked OR when user toggled reveal, show formatted.
  const showFormatted = revealed || !masked

  // ── Display sync helpers ──────────────────────────────────────────────

  const computeDisplay = (raw: string): string => {
    if (!raw) return ''
    return showFormatted
      ? formatTaxId(raw)
      : maskTaxId(raw, maskedDisplayMode, maskCharacter)
  }

  const syncDisplay = (): void => {
    const inp = inputRef.current
    if (!inp) return
    if (document.activeElement === inp && showFormatted) {
      // Don't clobber cursor while user is actively editing in formatted mode.
      // _onInput keeps the value/cursor correct.
      return
    }
    inp.value = computeDisplay(rawRef.current)
  }

  // Inject the global CSS once (matches the previous Form.io behavior so any
  // existing app styles targeting .ssn-wrap / .ssn-eye keep working).
  useEffect(() => {
    injectStylesOnce()
  }, [])

  // External value prop changes → update raw ref + display.
  useEffect(() => {
    const next = digitsOnly(value)
    if (next !== rawRef.current) {
      rawRef.current = next
    }
    syncDisplay()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  // Display mode flips (revealed / masked / maskedDisplayMode / maskCharacter)
  // → re-render the displayed text.
  useEffect(() => {
    syncDisplay()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed, masked, maskedDisplayMode, maskCharacter])

  // ── Commit helper ─────────────────────────────────────────────────────

  const commit = (newRaw: string): void => {
    if (newRaw === rawRef.current) {
      // Even when raw didn't change, the displayed string may need refreshing
      // (e.g. backspacing past zero). Always sync.
      syncDisplay()
      return
    }
    rawRef.current = newRaw
    syncDisplay()
    onChange?.(newRaw)
  }

  // ── Event handlers ────────────────────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (disabled || readOnly) return
    // In masked (hidden) mode, the visible characters are the mask chars,
    // so `input` events would corrupt the raw value. We handle keys here.
    if (showFormatted) return

    if (/^\d$/.test(e.key)) {
      e.preventDefault()
      if (rawRef.current.length < 9) {
        commit(rawRef.current + e.key)
      }
      return
    }
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault()
      commit(rawRef.current.slice(0, -1))
      return
    }
  }

  const handleInput = (e: React.FormEvent<HTMLInputElement>): void => {
    if (disabled || readOnly) return
    const inp = e.currentTarget
    if (!showFormatted) {
      // Masked mode: keystrokes already handled by handleKeyDown.
      // Just refresh display to defeat any browser-level changes.
      inp.value = maskTaxId(rawRef.current, maskedDisplayMode, maskCharacter)
      return
    }

    // Formatted mode: take what the user typed, sanitize, re-format,
    // and adjust caret to account for inserted dashes.
    const pos = inp.selectionStart || 0
    const newRaw = digitsOnly(inp.value)
    rawRef.current = newRaw
    inp.value = formatTaxId(newRaw)

    let newPos = pos
    if (newRaw.length > 3 && pos > 3) newPos++
    if (newRaw.length > 5 && pos > 6) newPos++
    const max = inp.value.length
    const clamped = Math.min(newPos, max)
    inp.setSelectionRange(clamped, clamped)

    onChange?.(newRaw)
  }

  const handleFocus = (): void => {
    // Only show raw digits when the eye toggle has revealed the value;
    // focus alone never exposes the SSN.
    if (showFormatted && rawRef.current && inputRef.current) {
      inputRef.current.value = formatTaxId(rawRef.current)
    }
    onFocus?.()
  }

  const handleBlur = (): void => {
    syncDisplay()
    onBlur?.()
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>): void => {
    if (disabled || readOnly) return
    e.preventDefault()
    const pasted = e.clipboardData?.getData('text') || ''
    commit(digitsOnly(pasted))
  }

  const handleCopy = (e: React.ClipboardEvent<HTMLInputElement>): void => {
    if (preventCopy) e.preventDefault()
  }

  const toggleReveal = (e: React.MouseEvent<HTMLButtonElement>): void => {
    e.preventDefault()
    e.stopPropagation()
    setRevealed((r) => !r)
  }

  // ── Render ────────────────────────────────────────────────────────────

  const wrapperClass = ['ssn-wrap', className].filter(Boolean).join(' ')
  const showEye = allowToggleMask && masked

  return (
    <div className={wrapperClass}>
      <input
        ref={inputRef}
        type="text"
        id={id}
        name={name}
        className="form-control"
        placeholder={placeholder}
        autoComplete="off"
        inputMode="numeric"
        maxLength={11}
        disabled={disabled}
        readOnly={readOnly}
        required={required}
        autoFocus={autoFocus}
        tabIndex={tabIndex}
        aria-invalid={ariaInvalid || undefined}
        aria-describedby={ariaDescribedBy}
        style={showEye ? { paddingRight: 36 } : undefined}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onPaste={handlePaste}
        onCopy={handleCopy}
        onCut={handleCopy}
        // defaultValue ensures the initial DOM matches rawRef before the
        // first display-sync effect runs.
        defaultValue={computeDisplay(rawRef.current)}
      />
      {showEye && (
        <button
          type="button"
          className="ssn-eye"
          aria-label={revealed ? 'Hide SSN' : 'Show SSN'}
          title={revealed ? 'Hide SSN' : 'Show SSN'}
          tabIndex={-1}
          onClick={toggleReveal}
        >
          {revealed ? '🙈' : '👁️'}
        </button>
      )}
    </div>
  )
}

export default SSNInputCore
