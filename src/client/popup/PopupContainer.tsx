/**
 * PopupContainer — root-level React component.
 *
 * Mount this ONCE at the application root (outside any Form.io or table tree).
 * It subscribes to popupStore and renders the modal UI via ReactDOM.createPortal
 * to document.body, guaranteeing it always sits above every z-index layer.
 *
 * Uses Bootstrap 3 modal classes. All Bootstrap CSS is available inside the
 * `.modal` div because bootstrap-dialogs.ts scopes full Bootstrap to `.modal`.
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

// Bootstrap 3 size modifier classes (md = default, no extra class needed)
const SIZE_CLASS: Record<string, string> = { sm: 'modal-sm', md: '', lg: 'modal-lg' }

// Bootstrap 3 uses btn-default for the "secondary" semantic variant
const BTN_CLASS: Record<string, string> = {
  primary: 'btn-primary',
  secondary: 'btn-default',
  danger: 'btn-danger',
  warning: 'btn-warning',
  success: 'btn-success',
}

// ─── Internal Modal ───────────────────────────────────────────────────────────

interface ModalProps {
  state: PopupState
}

function Modal({ state }: ModalProps) {
  const { config, payload } = state
  const variant = config.variant ?? 'custom'
  const size = config.size ?? 'md'
  const sizeClass = SIZE_CLASS[size] ?? ''
  const showCloseIcon = config.showCloseIcon !== false
  const closeOnBackdrop = config.closeOnBackdrop === true
  const closeOnEscape = config.closeOnEscape !== false

  const buttons: PopupButton[] = config.buttons?.length
    ? config.buttons
    : DEFAULT_BUTTONS[variant]

  const iconClass = config.icon ?? (DEFAULT_ICONS[variant] || '')

  // Escape key
  useEffect(() => {
    if (!closeOnEscape) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closePopup() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [closeOnEscape])

  // Focus the dialog panel when it mounts
  const dialogRef = useRef<HTMLDivElement>(null)
  useEffect(() => { dialogRef.current?.focus() }, [])

  const handleAction = useCallback((btn: PopupButton) => {
    if (btn.disabled) return
    if (btn.closeOnClick !== false) closePopup()
    config.onAction?.(btn.actionKey, payload as PopupPayload)
  }, [config, payload])

  return (
      /*
       * Bootstrap 3 modal — descendant classes (.modal-dialog, .modal-content, etc.)
       * are styled by bootstrap-dialogs.ts which scopes full BS3 CSS to :is(..., .modal).
       *
       * However, the .modal element itself is the scope root, so BS3's own .modal rules
       * (position:fixed, inset:0) don't apply to it — we must provide those inline.
       * The semi-transparent background replaces a separate .modal-backdrop element.
       */
      <div
        className="modal fade in"
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
        aria-labelledby="popup-title"
        onClick={closeOnBackdrop ? () => closePopup() : undefined}
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
                  onClick={() => closePopup()}
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

            {/* Body */}
            {config.htmlContent ? (
              <div
                className="modal-body"
                dangerouslySetInnerHTML={{ __html: config.htmlContent }}
                ref={(el) => { if (el && config.onMount) config.onMount(el) }}
              />
            ) : config.message ? (
              <div className="modal-body">
                {config.message}
              </div>
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
                  {btn.icon && <i className={btn.icon} aria-hidden="true" style={{ marginRight: 4 }} />}
                  {btn.label}
                </button>
              ))}
            </div>

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
