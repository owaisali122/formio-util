import { SSNComponent, SSN_TYPE } from '../components/SSN'
import type { FormioComponents } from './types'

export async function registerSSN(Components: FormioComponents): Promise<void> {
  const TextFieldComponent = (Components.components as any).textfield as any

  class SSNField extends TextFieldComponent {
    static schema(...extend: any[]) {
      return TextFieldComponent.schema(SSNComponent.schema(), ...extend)
    }

    static get builderInfo() {
      return SSNComponent.builderInfo
    }

    static editForm() {
      return SSNComponent.editForm()
    }

    get defaultSchema() {
      return SSNField.schema()
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

  Components.setComponent(SSN_TYPE, SSNField as never)
}
