import { TaxIdComponent, SSN_TYPE, TAX_ID_TYPE } from '../components/SSN'
import type { FormioComponents } from './types'

function injectBuilderTabStyles() {
  if (typeof document === 'undefined') return
  if (document.getElementById('taxid-builder-tab-css')) return
  const s = document.createElement('style')
  s.id = 'taxid-builder-tab-css'
  // Form.io appends its native "Preview" tab as a bare <a> after our last tab,
  // causing "LogicPreview" to run together. Ensure nav-links have padding so
  // adjacent tab anchors are visually separated.
  s.textContent = `.formio-component-tabs .nav.nav-tabs .nav-link{padding:.375rem .75rem;white-space:nowrap}`
  document.head.appendChild(s)
}

export async function registerSSN(Components: FormioComponents): Promise<void> {
  injectBuilderTabStyles()
  const TextFieldComponent = (Components.components as any).textfield as any

  class TaxIdField extends TextFieldComponent {
    static schema(...extend: any[]) {
      return TextFieldComponent.schema(TaxIdComponent.schema(), ...extend)
    }

    static get builderInfo() {
      return TaxIdComponent.builderInfo
    }

    static editForm() {
      return TaxIdComponent.editForm()
    }

    get defaultSchema() {
      return TaxIdField.schema()
    }

    /**
     * Block saving the component settings when Property Name (key) is empty.
     * Form.io calls this method when the user clicks Save in the edit dialog.
     */
    saveComponentSettings(component: any) {
      if (!component?.key?.trim()) {
        const editForm = (this as any).editForm
        if (editForm) {
          // Trigger validation on the editForm so the required error is shown
          editForm.setPristine(false)
          editForm.checkValidity(null, true, null, false)
        }
        return false
      }
      return super.saveComponentSettings(component)
    }

    render() {
      return super.render()
    }
  }

  // Single registration under 'ssn' — one palette entry, backward-compatible
  // with all existing saved forms. TAX_ID_TYPE is available as a constant
  // but does not get its own builder registration to avoid duplicates.
  Components.setComponent(SSN_TYPE, TaxIdField as never)
}
