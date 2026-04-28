/**
 * FormIO: Popup Component Renderer Component
 *
 * Extends FieldComponent to render a trigger button inside the form.
 * When clicked, it opens the popup via popupStore (root-level rendering).
 *
 * Reference pattern: createSearchableDropdownClass (SmartStreetFormIO.ts)
 */

import type { PopupButton, PopupConfig } from '../popup/PopupTypes'
import { openPopup } from '../popup/popupStore'

export function createPopupComponentClass(FieldComponent: any) {
  return class PopupComponentFormIO extends FieldComponent {
    // The trigger button element reference
    _triggerBtn: HTMLButtonElement | null = null
    _clickBound: (() => void) | null = null

    static schema(...extend: any[]) {
      return FieldComponent.schema({
        type: 'popupComponent',
        label: 'Popup Component',
        key: 'popupComponent',
        input: false,
      }, ...extend)
    }

    static get builderInfo() {
      return {
        title: 'Popup Component',
        group: 'basic',
        icon: 'window-restore',
        weight: 35,
        schema: PopupComponentFormIO.schema(),
      }
    }

    get defaultSchema() {
      return PopupComponentFormIO.schema()
    }

    // ── Render ──────────────────────────────────────────────────────────────

    render() {
      const c = this.component
      const triggerLabel: string = c.triggerLabel || 'Open Popup'
      const triggerIcon: string = c.triggerIcon || ''
      const isDisabled: boolean = c.disabled === true

      const iconHtml = triggerIcon
        ? `<i class="${triggerIcon} me-1" aria-hidden="true"></i>`
        : ''

      return super.render(`
        <div ref="popupComponentWrapper" class="d-inline-block">
          <button
            ref="popupComponentTrigger"
            type="button"
            class="btn btn-primary"
            ${isDisabled ? 'disabled' : ''}
          >
            ${iconHtml}${triggerLabel}
          </button>
        </div>
      `)
    }

    // ── Attach ──────────────────────────────────────────────────────────────

    attach(element: HTMLElement) {
      const result = super.attach(element)

      this.loadRefs(element, {
        popupComponentTrigger: 'single',
        popupComponentWrapper: 'single',
      })

      const btn = (this.refs as any)?.popupComponentTrigger as HTMLButtonElement | undefined
      if (btn) {
        this._triggerBtn = btn
        this._clickBound = () => this._openPopup()
        btn.addEventListener('click', this._clickBound)

        if (this.component.autofocus) {
          btn.focus()
        }
      }

      return result
    }

    // ── Detach ──────────────────────────────────────────────────────────────

    detach() {
      if (this._triggerBtn && this._clickBound) {
        this._triggerBtn.removeEventListener('click', this._clickBound)
        this._triggerBtn = null
        this._clickBound = null
      }
      return super.detach()
    }

    // ── Popup logic ──────────────────────────────────────────────────────────

    _openPopup() {
      const c = this.component

      // Parse custom buttons from JSON field (if provided)
      let buttons: PopupButton[] | undefined
      if (c.popupButtons?.trim()) {
        try {
          const parsed = JSON.parse(c.popupButtons)
          if (Array.isArray(parsed) && parsed.length > 0) buttons = parsed
        } catch { /* bad JSON — fall back to variant defaults */ }
      }

      const config: PopupConfig = {
        title: c.popupTitle || undefined,
        message: c.popupMessage || undefined,
        variant: c.popupVariant || 'confirm',
        size: c.popupSize || 'md',
        icon: c.popupIcon || undefined,
        buttons,
        showCloseIcon: c.showCloseIcon !== false,
        closeOnBackdrop: c.closeOnBackdrop === true,
        closeOnEscape: c.closeOnEscape !== false,
        onAction: (actionKey, payload) => {
          // Emit Form.io event so form logic / custom events can react
          this.emit('popupAction', { actionKey, payload, component: this })
        },
        onClose: () => {
          this.emit('popupClose', { component: this })
        },
      }

      openPopup(config, {})
    }
  }
}
