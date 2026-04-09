import { GenericPopupComponent, GENERIC_POPUP_TYPE } from '../components/GenericPopup'
import type { FormioComponents } from './types'

/**
 * Register the Generic Popup designer (builder-side) component.
 *
 * Reference pattern: registerSmartStreet (register-smart-street.ts)
 */
export async function registerGenericPopup(Components: FormioComponents): Promise<void> {
  const FieldComponent = (Components.components as any).field as any

  class GenericPopup extends FieldComponent {
    static schema(...extend: any[]) {
      return FieldComponent.schema(GenericPopupComponent.schema(), ...extend)
    }

    static get builderInfo() {
      return GenericPopupComponent.builderInfo
    }

    static editForm() {
      return GenericPopupComponent.editForm()
    }

    get defaultSchema() {
      return GenericPopup.schema()
    }

    render() {
      const c = this.component
      const triggerLabel: string = c.triggerLabel || 'Open Popup'
      const triggerIcon: string = c.triggerIcon || ''
      const variant: string = c.popupVariant || 'confirm'
      const iconHtml = triggerIcon
        ? `<i class="${triggerIcon}" style="margin-right:6px;"></i>`
        : ''

      // Designer preview: non-interactive button + metadata strip
      return super.render(`
        <div style="border:2px dashed #a5b4fc;border-radius:6px;padding:12px 14px;background:#eef2ff;">
          <div style="margin-bottom:8px;font-size:11px;color:#6366f1;font-weight:600;text-transform:uppercase;letter-spacing:.04em;">
            Generic Popup — ${variant}
          </div>
          <button type="button" class="btn btn-primary" style="pointer-events:none;font-size:13px;" tabindex="-1">
            ${iconHtml}${triggerLabel}
          </button>
          <div style="margin-top:6px;font-size:11px;color:#6b7280;">
            Title: ${c.popupTitle || '(none)'} &nbsp;|&nbsp; Size: ${c.popupSize || 'md'}
          </div>
        </div>
      `)
    }
  }

  Components.setComponent(GENERIC_POPUP_TYPE, GenericPopup as never)
}
