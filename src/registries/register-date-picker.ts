import { DatePickerComponent, DATE_PICKER_TYPE } from '../components/DatePicker'
import {
  getDatePickerDisplayFormatOptions,
  getEffectiveDatePickerPlaceholder,
  normalizeDisplayFormat,
} from '../components/date-picker-shared'
import type { FormioComponents } from './types'

type DatePickerEditFormInstance = {
  on?: (event: string, handler: (component: Record<string, unknown>) => void) => void
  editForm?: {
    getComponent?: (key: string) => {
      setValue?: (value: unknown) => void
    } | null
    on?: (event: string, handler: () => void) => void
    submission?: {
      data?: Record<string, unknown>
    }
  }
}

export function setupDatePickerEditForm(instance: Record<string, unknown>): void {
  const inst = instance as DatePickerEditFormInstance

  inst.on?.('editComponent', (component: Record<string, unknown>) => {
    if (component?.type !== DATE_PICKER_TYPE) return

    let lastDerivedPlaceholder = getEffectiveDatePickerPlaceholder(component)

    const syncDerivedFields = () => {
      const submissionData = inst.editForm?.submission?.data || {}
      const nextState = {
        ...component,
        ...submissionData,
      }

      // Reset displayFormat ONLY if the current value is not a valid option
      // for the new pickerMode/enableTime/enableTimeZone combination.
      // Never auto-derive — the user picks from the dropdown.
      const validFormats = getDatePickerDisplayFormatOptions({
        pickerMode: (nextState.pickerMode as 'single' | 'range') || 'single',
        enableTime: !!nextState.enableTime,
        enableTimeZone: !!nextState.enableTimeZone,
      })
      const currentDisplayFormat = normalizeDisplayFormat(nextState.displayFormat, '')
      const displayFormatComp = inst.editForm?.getComponent?.('displayFormat')
      if (
        displayFormatComp?.setValue
        && (!currentDisplayFormat || !validFormats.includes(currentDisplayFormat))
        && validFormats.length > 0
      ) {
        displayFormatComp.setValue(validFormats[0])
      }

      const placeholderComp = inst.editForm?.getComponent?.('placeholder')
      const currentPlaceholder = String(nextState.placeholder || '')
      const derivedPlaceholder = getEffectiveDatePickerPlaceholder({
        ...nextState,
        // Use the resolved (possibly newly-reset) display format for placeholder derivation.
        displayFormat: validFormats.includes(currentDisplayFormat)
          ? currentDisplayFormat
          : validFormats[0] || currentDisplayFormat,
      })
      const shouldSyncPlaceholder = !currentPlaceholder.trim() || currentPlaceholder === lastDerivedPlaceholder
      if (shouldSyncPlaceholder && placeholderComp?.setValue && currentPlaceholder !== derivedPlaceholder) {
        placeholderComp.setValue(derivedPlaceholder)
      }

      lastDerivedPlaceholder = derivedPlaceholder
    }

    setTimeout(syncDerivedFields, 0)
    inst.editForm?.on?.('change', syncDerivedFields)
  })
}

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
      const isRange = this.component?.pickerMode === 'range'
      const placeholder = this.component?.placeholder || getEffectiveDatePickerPlaceholder({
        pickerMode: isRange ? 'range' : 'single',
        displayFormat: this.component?.displayFormat,
        enableTime: this.component?.enableTime,
        enableTimeZone: this.component?.enableTimeZone,
        timeFormat: this.component?.timeFormat,
      })
      return super.render(`
        <div class="formio-datepicker-wrap formio-datepicker-preview">
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
