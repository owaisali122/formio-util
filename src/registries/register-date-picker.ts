import { DatePickerComponent, DATE_PICKER_TYPE } from '../components/DatePicker'
import type { FormioComponents } from './types'

export async function registerDatePicker(Components: FormioComponents): Promise<void> {
  const FieldComponent = (Components.components as any).field as any

  class DatePickerField extends FieldComponent {
    static schema(...extend: any[]) {
      return FieldComponent.schema(DatePickerComponent.schema(), ...extend)
    }

    static get builderInfo() {
      return DatePickerComponent.builderInfo
    }

    static editForm() {
      return DatePickerComponent.editForm()
    }

    get defaultSchema() {
      return DatePickerField.schema()
    }

    /**
     * Block saving when Property Name (key) is empty.
     */
    saveComponentSettings(component: any) {
      if (!component?.key?.trim()) {
        const editForm = (this as any).editForm
        if (editForm) {
          editForm.setPristine(false)
          editForm.checkValidity(null, true, null, false)
        }
        return false
      }
      return super.saveComponentSettings(component)
    }

    render() {
      const showIcon = this.component?.showCalendarIcon !== false
      const placeholder = this.component?.placeholder || 'MM/DD/YYYY'
      return super.render(`
        <div ref="datePickerContainer" class="formio-datepicker-wrap formio-datepicker-preview">
          <div class="input-group">
            ${showIcon ? '<div class="input-group-prepend"><span class="input-group-text"><i class="fa fa-calendar"></i></span></div>' : ''}
            <input type="text" class="form-control" disabled placeholder="${placeholder}" />
          </div>
        </div>
      `)
    }
  }

  Components.setComponent(DATE_PICKER_TYPE, DatePickerField as never)
}
