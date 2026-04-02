/**
 * PopupContainer — root-level React component.
 *
 * Mount this ONCE at the application root (outside any Form.io or table tree).
 * It subscribes to popupStore and renders the modal UI via ReactDOM.createPortal
 * to document.body, guaranteeing it always sits above every z-index layer.
 *
 * Usage in your app layout:
 *   import { PopupContainer } from '@your-org/kolea-shared-package/client'
 *   // Place once at app root:
 *   <PopupContainer />
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { closePopup, subscribePopup } from './popupStore'
import type { PopupButton, PopupPayload, PopupState, PopupVariant } from './PopupTypes'

// ─── Default button sets per variant ────────────────────────────────────────

const DEFAULT_BUTTONS: Record<PopupVariant, PopupButton[]> = {
  alert: [{ label: 'OK', actionKey: 'ok', variant: 'primary', closeOnClick: true }],
  confirm: [
    { label: 'Confirm', actionKey: 'confirm', variant: 'primary', closeOnClick: true },
    { label: 'Cancel', actionKey: 'cancel', variant: 'secondary', closeOnClick: true },
  ],
  warning: [
    { label: 'Continue', actionKey: 'continue', variant: 'warning', closeOnClick: true },
    { label: 'Cancel', actionKey: 'cancel', variant: 'secondary', closeOnClick: true },
  ],
  delete: [
    { label: 'Delete', actionKey: 'delete', variant: 'danger', closeOnClick: true },
    { label: 'Cancel', actionKey: 'cancel', variant: 'secondary', closeOnClick: true },
  ],
  custom: [{ label: 'OK', actionKey: 'ok', variant: 'primary', closeOnClick: true }],
}

const DEFAULT_ICONS: Record<PopupVariant, string> = {
  alert: 'fa fa-info-circle',
  confirm: 'fa fa-question-circle',
  warning: 'fa fa-exclamation-triangle',
  delete: 'fa fa-trash',
  custom: '',
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const SIZE_WIDTH: Record<string, number> = { sm: 380, md: 520, lg: 720 }

const VARIANT_ICON_COLOR: Record<string, string> = {
  alert: '#3b82f6',
  confirm: '#6366f1',
  warning: '#f59e0b',
  delete: '#ef4444',
  custom: '#6b7280',
}

const VARIANT_BTN_COLOR: Record<string, { bg: string; text: string; hover: string }> = {
  primary:   { bg: '#3b82f6', text: '#fff', hover: '#2563eb' },
  secondary: { bg: '#e5e7eb', text: '#374151', hover: '#d1d5db' },
  danger:    { bg: '#ef4444', text: '#fff', hover: '#dc2626' },
  warning:   { bg: '#f59e0b', text: '#fff', hover: '#d97706' },
  success:   { bg: '#10b981', text: '#fff', hover: '#059669' },
}

// ─── Internal Modal ───────────────────────────────────────────────────────────

interface ModalProps {
  state: PopupState
}

function Modal({ state }: ModalProps) {
  const { config, payload } = state
  const variant = config.variant ?? 'custom'
  const size = config.size ?? 'md'
  const width = SIZE_WIDTH[size] ?? 520
  const showCloseIcon = config.showCloseIcon !== false
  const closeOnBackdrop = config.closeOnBackdrop === true
  const closeOnEscape = config.closeOnEscape !== false

  const buttons: PopupButton[] = config.buttons?.length
    ? config.buttons
    : DEFAULT_BUTTONS[variant]

  const iconClass = config.icon ?? (DEFAULT_ICONS[variant] || '')
  const iconColor = VARIANT_ICON_COLOR[variant] ?? '#6b7280'

  // Escape key
  useEffect(() => {
    if (!closeOnEscape) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closePopup() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [closeOnEscape])

  // Focus trap — focus the modal panel when it mounts
  const panelRef = useRef<HTMLDivElement>(null)
  useEffect(() => { panelRef.current?.focus() }, [])

  const handleAction = useCallback((btn: PopupButton) => {
    if (btn.disabled) return
    if (btn.closeOnClick !== false) closePopup()
    config.onAction?.(btn.actionKey, payload as PopupPayload)
  }, [config, payload])

  const backdropStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    background: 'rgba(0,0,0,0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
  }

  const panelStyle: React.CSSProperties = {
    position: 'relative',
    background: '#fff',
    borderRadius: 8,
    boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
    width: '100%',
    maxWidth: width,
    outline: 'none',
    fontFamily: 'inherit',
    fontSize: 14,
  }

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '18px 20px 12px',
    borderBottom: '1px solid #e5e7eb',
  }

  const bodyStyle: React.CSSProperties = {
    padding: '16px 20px',
    color: '#374151',
    lineHeight: 1.6,
    wordBreak: 'break-word',
  }

  const footerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
    padding: '12px 20px 18px',
    borderTop: '1px solid #e5e7eb',
  }

  return (
    <div
      style={backdropStyle}
      onClick={closeOnBackdrop ? () => closePopup() : undefined}
      aria-modal="true"
      role="dialog"
      aria-labelledby="popup-title"
    >
      <div
        ref={panelRef}
        style={panelStyle}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={headerStyle}>
          {iconClass && (
            <i
              className={iconClass}
              style={{ fontSize: 20, color: iconColor, flexShrink: 0 }}
              aria-hidden="true"
            />
          )}
          {config.title && (
            <span
              id="popup-title"
              style={{ flex: 1, fontWeight: 600, fontSize: 16, color: '#111827' }}
            >
              {config.title}
            </span>
          )}
          {showCloseIcon && (
            <button
              aria-label="Close"
              onClick={() => closePopup()}
              style={{
                marginLeft: 'auto',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 18,
                color: '#9ca3af',
                lineHeight: 1,
                padding: '0 2px',
                flexShrink: 0,
              }}
            >
              ×
            </button>
          )}
        </div>

        {/* Body */}
        {config.message && (
          <div style={bodyStyle}>
            {config.message}
          </div>
        )}

        {/* Footer */}
        <div style={footerStyle}>
          {buttons.map((btn) => {
            const colors = VARIANT_BTN_COLOR[btn.variant ?? 'secondary'] ?? VARIANT_BTN_COLOR.secondary
            return (
              <button
                key={btn.actionKey}
                disabled={btn.disabled}
                onClick={() => handleAction(btn)}
                style={{
                  padding: '7px 18px',
                  border: 'none',
                  borderRadius: 5,
                  cursor: btn.disabled ? 'not-allowed' : 'pointer',
                  fontWeight: 500,
                  fontSize: 13,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: colors.bg,
                  color: colors.text,
                  opacity: btn.disabled ? 0.55 : 1,
                  transition: 'background 0.15s',
                }}
              >
                {btn.icon && <i className={btn.icon} aria-hidden="true" />}
                {btn.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── PopupContainer ───────────────────────────────────────────────────────────

/**
 * Mount this once at your application root.
 * It listens to popupStore and renders the active popup into document.body
 * via a React Portal, keeping it visually above all other content.
 */
export function PopupContainer() {
  const [popupState, setPopupState] = useState<PopupState | null>(null)

  useEffect(() => {
    return subscribePopup((state) => setPopupState(state ? { ...state } : null))
  }, [])

  if (!popupState || !popupState.isOpen) return null

  return createPortal(
    <Modal state={popupState} />,
    document.body,
  )
}
