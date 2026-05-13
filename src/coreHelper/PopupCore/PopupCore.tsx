'use client'

/**
 * PopupModal — shared Bootstrap 3 modal rendering core.
 *
 * Single source of truth for all modal rendering, defaults, and behavior.
 *
 * Used by:
 *   - PopupContainer (Form.io / global-store path) — passes onClose=closePopup
 *   - ReactPopup     (standalone React path)       — passes onClose=props.onClose
 *
 * Any change to variants, icons, button defaults, markup, or behavior here
 * is automatically reflected in BOTH consumers without touching either wrapper.
 */

import React, { useCallback, useEffect, useRef } from 'react'
import type { PopupButton, PopupConfig, PopupPayload, PopupVariant } from './PopupCore.types'

// ── Default button sets per variant ──────────────────────────────────────────

export const DEFAULT_BUTTONS: Record<PopupVariant, PopupButton[]> = {
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

export const DEFAULT_ICONS: Record<PopupVariant, string> = {
  alert: 'fa fa-info-circle',
  confirm: 'fa fa-question-circle',
  warning: 'fa fa-exclamation-triangle',
  delete: 'fa fa-trash',
  custom: '',
}

// Bootstrap 3 size modifier classes (md = default, no extra class needed)
export const SIZE_CLASS: Record<string, string> = { sm: 'modal-sm', md: '', lg: 'modal-lg' }

// Bootstrap 3 uses btn-default for the "secondary" semantic variant
export const BTN_CLASS: Record<string, string> = {
  primary: 'btn-primary',
  secondary: 'btn-default',
  danger: 'btn-danger',
  warning: 'btn-warning',
  success: 'btn-success',
}

// ── PopupModal ────────────────────────────────────────────────────────────────

export interface PopupModalProps {
  /** Full popup configuration from PopupConfig. */
  config: PopupConfig
  /** Dynamic data passed to onAction. */
  payload: PopupPayload
  /**
   * Called for every close path (× icon, backdrop click, Escape, or a button
   * with closeOnClick). PopupContainer passes closePopup(); ReactPopup passes
   * its onClose prop.
   */
  onClose: () => void
  /** Optional extra CSS class added to the .modal element. */
  className?: string
  /**
   * React body content — takes precedence over config.htmlContent and
   * config.message. Used by ReactPopup; PopupContainer never passes children.
   */
  children?: React.ReactNode
}

export function PopupModal({
  config,
  payload,
  onClose,
  className,
  children,
}: PopupModalProps) {
  const variant = config.variant ?? 'custom'
  const size = config.size ?? 'md'
  const sizeClass = SIZE_CLASS[size] ?? ''
  const showCloseIcon = config.showCloseIcon !== false
  const closeOnBackdrop = config.closeOnBackdrop === true
  const closeOnEscape = config.closeOnEscape !== false

  // Guard: onMount must fire exactly once per popup open.
  // An inline `ref` callback is a new function on every render, so React calls
  // old-ref(null) then new-ref(el) on re-renders, which would run onMount
  // (and any fetch inside it) multiple times.
  const onMountFiredRef = useRef(false)
  const dialogRef = useRef<HTMLDivElement>(null)

  const buttons: PopupButton[] = config.buttons?.length
    ? config.buttons
    : DEFAULT_BUTTONS[variant]

  const iconClass = config.icon ?? (DEFAULT_ICONS[variant] || '')

  // Escape key — cleaned up on unmount or when closeOnEscape / onClose changes.
  useEffect(() => {
    if (!closeOnEscape) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [closeOnEscape, onClose])

  // Focus the dialog panel when it mounts.
  useEffect(() => { dialogRef.current?.focus() }, [])

  const handleAction = useCallback(
    (btn: PopupButton) => {
      if (btn.disabled) return
      if (btn.closeOnClick !== false) onClose()
      config.onAction?.(btn.actionKey, payload)
    },
    [config, payload, onClose],
  )

  const containerClassName = ['modal', 'fade', 'in', className].filter(Boolean).join(' ')

  return (
    /*
     * Bootstrap 3 modal — descendant classes (.modal-dialog, .modal-content,
     * etc.) are styled by bootstrap-dialogs.ts which scopes full BS3 CSS to
     * :is(..., .modal). However, the .modal element itself is the scope root,
     * so BS3's own .modal rules (position:fixed, inset:0) don't apply to it —
     * we must provide those inline. The semi-transparent background replaces a
     * separate .modal-backdrop element.
     */
    <div
      className={containerClassName}
      style={{
        display: 'block',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1050,
        overflowX: 'hidden',
        overflowY: 'auto',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
      }}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby={config.title ? 'popup-title' : undefined}
      onClick={closeOnBackdrop ? () => onClose() : undefined}
    >
      <div
        ref={dialogRef}
        className={`modal-dialog${sizeClass ? ` ${sizeClass}` : ''}`}
        role="document"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content">

          {/* Header — Bootstrap 3: close button must come before the title */}
          <div className="modal-header">
            {showCloseIcon && (
              <button
                type="button"
                className="close"
                aria-label="Close"
                onClick={() => onClose()}
              >
                <span aria-hidden="true">&times;</span>
              </button>
            )}
            <h4 className="modal-title" id="popup-title">
              {iconClass && (
                <i className={iconClass} aria-hidden="true" style={{ marginRight: 8 }} />
              )}
              {config.title}
            </h4>
          </div>

          {/* Body — children > htmlContent > message */}
          {children ? (
            <div className="modal-body">{children}</div>
          ) : config.htmlContent ? (
            <div
              className="modal-body"
              dangerouslySetInnerHTML={{ __html: config.htmlContent }}
              ref={(el) => {
                if (el && config.onMount && !onMountFiredRef.current) {
                  onMountFiredRef.current = true
                  config.onMount(el)
                }
              }}
            />
          ) : config.message ? (
            <div className="modal-body">{config.message}</div>
          ) : null}

          {/* Footer */}
          <div className="modal-footer">
            {buttons.map((btn) => (
              <button
                key={btn.actionKey}
                type="button"
                className={`btn ${BTN_CLASS[btn.variant ?? 'secondary'] ?? 'btn-default'}`}
                disabled={btn.disabled}
                onClick={() => handleAction(btn)}
              >
                {btn.icon && (
                  <i className={btn.icon} aria-hidden="true" style={{ marginRight: 4 }} />
                )}
                {btn.label}
              </button>
            ))}
          </div>

        </div>
      </div>
    </div>
  )
}
