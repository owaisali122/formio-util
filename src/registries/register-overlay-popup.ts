import { OverlayPopupComponent, OVERLAY_POPUP_TYPE } from '../components/OverlayPopup'
import type { FormioComponents } from './types'

export async function registerOverlayPopup(Components: FormioComponents): Promise<void> {
  const FieldComponent = (Components.components as any).field as any

  class OverlayPopup extends FieldComponent {
    static schema(...extend: any[]) {
      return FieldComponent.schema(OverlayPopupComponent.schema(), ...extend)
    }

    static get builderInfo() {
      return OverlayPopupComponent.builderInfo
    }

    static editForm() {
      return OverlayPopupComponent.editForm()
    }

    get defaultSchema() {
      return OverlayPopup.schema()
    }

    render() {
      const label = this.component.label || 'Overlay Popup'
      const mode = this.component.triggerMode || 'manual'
      const size = this.component.size || 'md'
      return super.render(`
        <div ref="overlayPopupContainer" class="formio-overlay-popup">
          <div style="border:2px dashed #6c757d;border-radius:6px;padding:16px;text-align:center;color:#6c757d;">
            <div style="font-size:20px;margin-bottom:6px;"><i class="fa fa-window-maximize"></i></div>
            <div style="font-weight:600;margin-bottom:4px;">${this.t(label)}</div>
            <div style="font-size:12px;">Trigger: ${mode} &bull; Size: ${size}</div>
          </div>
        </div>
      `)
    }
  }

  Components.setComponent(OVERLAY_POPUP_TYPE, OverlayPopup as never)
}
