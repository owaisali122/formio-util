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

    render() {
      return super.render()
    }
  }

  Components.setComponent(SSN_TYPE, SSNField as never)
}
