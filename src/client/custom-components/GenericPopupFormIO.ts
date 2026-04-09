/**
 * FormIO: Generic Popup Renderer Component
 *
 * Extends FieldComponent to render a trigger button inside the form.
 * When clicked, it opens the generic popup via popupStore (root-level rendering).
 *
 * Reference pattern: createSearchableDropdownClass (SmartStreetFormIO.ts)
 */

import type { PopupButton, PopupConfig } from '../popup/PopupTypes'
import { openPopup } from '../popup/popupStore'

export function createGenericPopupClass(FieldComponent: any) {
  return class GenericPopupFormIO extends FieldComponent {
    // The trigger button element reference
    _triggerBtn: HTMLButtonElement | null = null
    _clickBound: (() => void) | null = null

    static schema(...extend: any[]) {
      return FieldComponent.schema({
        type: 'genericPopup',
        label: 'Generic Popup',
        key: 'genericPopup',
        input: false,
      }, ...extend)
    }

    static get builderInfo() {
      return {
        title: 'Generic Popup',
        group: 'basic',
        icon: 'window-restore',
        weight: 35,
        schema: GenericPopupFormIO.schema(),
      }
    }

    get defaultSchema() {
      return GenericPopupFormIO.schema()
    }

    // ── Render ──────────────────────────────────────────────────────────────

    render() {
      const c = this.component
      const triggerLabel: string = c.triggerLabel || 'Open Popup'
      const triggerIcon: string = c.triggerIcon || ''

      const iconHtml = triggerIcon
        ? `<i class="${triggerIcon}" aria-hidden="true" style="margin-right:6px;"></i>`
        : ''

      return super.render(`
        <div ref="genericPopupWrapper" style="display:inline-block;">
          <button
            ref="genericPopupTrigger"
            type="button"
            class="btn btn-primary"
            style="font-size:14px;"
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
        genericPopupTrigger: 'single',
        genericPopupWrapper: 'single',
      })

      const btn = (this.refs as any)?.genericPopupTrigger as HTMLButtonElement | undefined
      if (btn) {
        this._triggerBtn = btn
        this._clickBound = () => this._openPopup()
        btn.addEventListener('click', this._clickBound)
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
