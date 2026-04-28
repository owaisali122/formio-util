import { PopupComponent, POPUP_COMPONENT_TYPE } from '../components/PopupComponent'
import type { FormioComponents } from './types'

/**
 * Register the Popup Component designer (builder-side) component.
 *
 * Reference pattern: registerSmartStreet (register-smart-street.ts)
 */
export async function registerPopupComponent(Components: FormioComponents): Promise<void> {
  const FieldComponent = (Components.components as any).field as any

  class PopupComponentBuilder extends FieldComponent {
    static schema(...extend: any[]) {
      return FieldComponent.schema(PopupComponent.schema(), ...extend)
    }

    static get builderInfo() {
      return PopupComponent.builderInfo
    }

    static editForm() {
      return PopupComponent.editForm()
    }

    get defaultSchema() {
      return PopupComponentBuilder.schema()
    }

    render() {
      const c = this.component
      const triggerLabel: string = c.triggerLabel || 'Open Popup'
      const triggerIcon: string = c.triggerIcon || ''
      const variant: string = c.popupVariant || 'confirm'
      const iconHtml = triggerIcon
        ? `<i class="${triggerIcon} me-1"></i>`
        : ''

      // Designer preview: non-interactive button + metadata strip
      return super.render(`
        <div class="border border-primary rounded p-3 bg-light">
          <div class="mb-2 small fw-semibold text-uppercase text-primary">
            Popup Component \u2014 ${variant}
          </div>
          <button type="button" class="btn btn-primary" tabindex="-1" disabled>
            ${iconHtml}${triggerLabel}
          </button>
          <div class="mt-2 small text-muted">
            Title: ${c.popupTitle || '(none)'} &nbsp;|&nbsp; Size: ${c.popupSize || 'md'}
          </div>
        </div>
      `)
    }
  }

  Components.setComponent(POPUP_COMPONENT_TYPE, PopupComponentBuilder as never)
}
