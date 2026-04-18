/**
 * FormIO: Date Picker Component (Renderer)
 *
 * Wraps a React-based date picker (react-datepicker) inside a FormIO
 * field. The React component is lazily loaded on first mount.
 *
 * Single mode stored value: yyyy-MM-dd (e.g. "2025-06-15")
 * Range mode stored value: JSON {"startDate":"yyyy-MM-dd","endDate":"yyyy-MM-dd"}
 * Display format: configurable via schema (default MM/dd/yyyy)
 */

import { createRoot, Root } from 'react-dom/client'
import React from 'react'
import type { DatePickerInputProps, DateRangeValue } from '../../components/DatePickerInput'
import { parseDateString, parseDisabledDates, parseDisabledRanges } from '../../components/DatePickerInput'
import datepickerCSS from 'react-datepicker/dist/react-datepicker.css'

let DatePickerInputComponent: React.ComponentType<DatePickerInputProps> | null = null
let _cssInjected = false

async function loadReactComponent() {
  if (!DatePickerInputComponent) {
    const mod = await import('../../components/DatePickerInput')
    DatePickerInputComponent = mod.DatePickerInput
  }
  return DatePickerInputComponent
}

function injectDatePickerStyles() {
  if (_cssInjected || typeof document === 'undefined') return
  _cssInjected = true

  // Inject react-datepicker base CSS (imported as text string via tsup loader)
  if (datepickerCSS && !document.getElementById('react-datepicker-css')) {
    const style = document.createElement('style')
    style.id = 'react-datepicker-css'
    style.textContent = datepickerCSS
    document.head.appendChild(style)
  }

  // Custom overrides
  if (!document.getElementById('custom-datepicker-overrides')) {
    const s = document.createElement('style')
    s.id = 'custom-datepicker-overrides'
    s.textContent = `
.formio-datepicker-wrap .react-datepicker-wrapper{display:block;width:100%}
.formio-datepicker-wrap .react-datepicker__input-container{position:relative;display:inline-block;width:100%}
.formio-datepicker-wrap .react-datepicker__input-container input{width:100%;box-sizing:border-box}
.formio-datepicker-wrap .react-datepicker__view-calendar-icon input{padding-left:2.5rem}
.formio-datepicker-wrap .react-datepicker__input-container .react-datepicker__calendar-icon{position:absolute;left:0.5rem;top:50%;transform:translateY(-50%);padding:0;cursor:pointer;width:1rem;height:1rem;pointer-events:all}
.formio-datepicker-wrap .react-datepicker__close-icon::after{background-color:#6c757d;font-size:14px}
.formio-datepicker-wrap .react-datepicker{font-family:inherit;border:1px solid #ced4da;box-shadow:0 2px 8px rgba(0,0,0,.15);z-index:1050}
.formio-datepicker-wrap .react-datepicker-popper{z-index:1050}
.formio-datepicker-wrap .react-datepicker__header{background-color:#f8f9fa;border-bottom:1px solid #dee2e6}
.formio-datepicker-wrap .react-datepicker__day--selected,
.formio-datepicker-wrap .react-datepicker__day--keyboard-selected{background-color:#0d6efd;color:#fff}
.formio-datepicker-wrap .react-datepicker__day--selected:hover{background-color:#0b5ed7}
.formio-datepicker-wrap .react-datepicker__day:hover{background-color:#e9ecef}
.formio-datepicker-wrap .react-datepicker__day--disabled{color:#adb5bd;cursor:not-allowed}
.formio-datepicker-wrap .react-datepicker__day--disabled:hover{background-color:transparent}
`
    document.head.appendChild(s)
  }
}

/**
 * Module-level cache: survives component destroy/recreate cycles in the
 * designer preview. Keyed by component property name.
 */
const _mountCache = new Map<string, { mount: HTMLDivElement; root: Root }>()

export function createDatePickerClass(FieldComponent: any) {
  return class DatePickerFormIO extends FieldComponent {
    reactRoot: Root | null = null
    _persistentMount: HTMLDivElement | null = null
    currentValue: string = ''
    _initialValueTimeout: ReturnType<typeof setTimeout> | null = null
    _onChangeBound: (v: string) => void
    _onRangeChangeBound: (v: string) => void
    _mounted: boolean = false

    static schema(...extend: any[]) {
      return FieldComponent.schema({
        type: 'datePicker',
        label: 'Date Picker',
        key: 'datePicker',
        input: true,
      }, ...extend)
    }

    static get builderInfo() {
      return {
        title: 'Date Picker',
        group: 'basic',
        icon: 'calendar',
        weight: 27,
        schema: DatePickerFormIO.schema(),
      }
    }

    get defaultSchema() {
      return DatePickerFormIO.schema()
    }

    get isRangeMode() {
      return this.component?.pickerMode === 'range'
    }

    constructor(component: any, options: any, data: any) {
      super(component, options, data)
      this.currentValue = ''
      const key = component?.key
      if (data && key && data[key]) {
        const raw = data[key]
        if (typeof raw === 'string') {
          this.currentValue = raw
        } else if (typeof raw === 'object' && raw !== null) {
          this.currentValue = JSON.stringify(raw)
        }
      }
      this._onChangeBound = (v: string) => this.handleReactChange(v)
      this._onRangeChangeBound = (v: string) => this.handleReactChange(v)
    }

    render() {
      return super.render(`
        <div ref="datePickerContainer" class="formio-datepicker-wrap">
          <div class="text-muted small p-2">Loading date picker…</div>
        </div>
      `)
    }

    /**
     * Override redraw to prevent full DOM replacement when React is mounted.
     * Re-renders the React tree with latest props instead.
     */
    redraw() {
      if (this._mounted && this.reactRoot && this._persistentMount) {
        if (DatePickerInputComponent) {
          this.renderReactComponent(DatePickerInputComponent)
        }
        return Promise.resolve()
      }
      return super.redraw()
    }

    attach(element: HTMLElement) {
      if (this._initialValueTimeout) {
        clearTimeout(this._initialValueTimeout)
        this._initialValueTimeout = null
      }

      injectDatePickerStyles()
      const result = super.attach(element)
      this.loadRefs(element, { datePickerContainer: 'single' })

      const container = (this.refs as any)?.datePickerContainer
      if (container) this.mountReactComponent(container as HTMLElement)

      if (!this.currentValue) {
        this._initialValueTimeout = setTimeout(() => {
          this._initialValueTimeout = null
          this.tryLoadInitialValue()
        }, 150)
      }
      return result
    }

    tryLoadInitialValue() {
      const key = this.component?.key
      if (!key) return
      if (this.currentValue) return

      const raw = this.data?.[key]
      if (raw) {
        if (typeof raw === 'string') {
          this.currentValue = raw
        } else if (typeof raw === 'object' && raw !== null) {
          this.currentValue = JSON.stringify(raw)
        }
        if (this.currentValue && this.reactRoot && DatePickerInputComponent) {
          this.renderReactComponent(DatePickerInputComponent)
        }
      }
    }

    async mountReactComponent(container: HTMLElement) {
      try {
        if (!container) return
        const Component = await loadReactComponent()
        if (!Component) return

        const cacheKey = this.component?.key || ''

        // Reuse cached root from previous designer instance
        if (!this._persistentMount && cacheKey) {
          const cached = _mountCache.get(cacheKey)
          if (cached) {
            this._persistentMount = cached.mount
            this.reactRoot = cached.root
            _mountCache.delete(cacheKey)
          }
        }

        if (!this._persistentMount) {
          this._persistentMount = document.createElement('div')
          this._persistentMount.className = 'datepicker-react-mount'
        }

        container.innerHTML = ''
        container.appendChild(this._persistentMount)

        if (!this.reactRoot) {
          this.reactRoot = createRoot(this._persistentMount)
        }

        this._mounted = true
        this.tryLoadInitialValue()
        this.renderReactComponent(Component)
      } catch {
        container.innerHTML = '<div class="text-danger small">Error loading date picker</div>'
      }
    }

    renderReactComponent(Component: React.ComponentType<DatePickerInputProps>) {
      if (!this.reactRoot) return
      const comp = this.component || {}
      const isRange = this.isRangeMode

      const props: DatePickerInputProps = {
        value: isRange ? null : (this.currentValue || null),
        onChange: this._onChangeBound,
        displayFormat: comp.displayFormat || 'MM/dd/yyyy',
        placeholder: comp.placeholder || (isRange ? 'MM/DD/YYYY \u2013 MM/DD/YYYY' : 'MM/DD/YYYY'),
        disabled: comp.disabled || false,
        readOnly: this.options?.readOnly || false,
        allowManualInput: comp.allowManualInput || false,
        openOnInputClick: comp.openOnInputClick !== false,
        showCalendarIcon: comp.showCalendarIcon !== false,
        clearable: comp.clearable !== false,
        autoFocus: comp.autofocus || false,
        minDate: comp.minDate || '',
        maxDate: comp.maxDate || '',
        disablePastDates: comp.disablePastDates || false,
        disableFutureDates: comp.disableFutureDates || false,
        disableWeekends: comp.disableWeekends || false,
        pickerMode: isRange ? 'range' : 'single',
        disabledDates: comp.disabledDates || '',
        disabledDateRanges: comp.disabledDateRanges || '',
      }

      if (isRange) {
        props.rangeValue = this.currentValue || null
        props.onRangeChange = this._onRangeChangeBound
      }

      this.reactRoot.render(React.createElement(Component, props))
    }

    handleReactChange(newValue: string) {
      if (newValue === this.currentValue) return
      this.currentValue = newValue
      const key = this.component?.key

      // For range mode, store the parsed object in Form.io data;
      // for single mode, store the plain string.
      let dataValue: any = newValue
      if (this.isRangeMode && newValue) {
        try {
          dataValue = JSON.parse(newValue)
        } catch {
          dataValue = newValue
        }
      }

      if (this.data && key) this.data[key] = dataValue
      if (this.root?.data && key && this.data === this.root.data) {
        this.root.data[key] = dataValue
      }
      // Re-render React so the controlled DatePicker receives the updated
      // `selected` prop. Without this the input reverts to the old value
      // because triggerChange/updateValue sees the value as already equal.
      if (this.reactRoot && DatePickerInputComponent) {
        this.renderReactComponent(DatePickerInputComponent)
      }
      this.triggerChange()
    }

    // ── Value lifecycle ──

    /** Normalize any value (string, object, null) into the internal string representation. */
    _normalizeValue(value: any): string {
      if (value === undefined || value === null || value === '') return ''
      if (typeof value === 'string') return value
      if (typeof value === 'object') {
        try { return JSON.stringify(value) } catch { return '' }
      }
      return String(value)
    }

    getValue() {
      if (!this.currentValue) return this.currentValue
      // Return parsed object for range mode, plain string for single
      if (this.isRangeMode) {
        try { return JSON.parse(this.currentValue) } catch { return this.currentValue }
      }
      return this.currentValue
    }

    setValue(value: any, flags?: any) {
      if (value === undefined) return
      const strValue = this._normalizeValue(value)
      if (strValue === this.currentValue) return super.setValue(value, flags)
      this.currentValue = strValue
      if (this.reactRoot && DatePickerInputComponent) {
        this.renderReactComponent(DatePickerInputComponent)
      }
      return super.setValue(value, flags)
    }

    get dataValue() {
      if (this.currentValue) {
        if (this.isRangeMode) {
          try { return JSON.parse(this.currentValue) } catch { /* fall through */ }
        }
        return this.currentValue
      }
      return super.dataValue || ''
    }

    set dataValue(value: any) {
      if (value === undefined) return
      const strValue = this._normalizeValue(value)
      if (strValue === this.currentValue) return
      this.currentValue = strValue
      if (this.reactRoot && DatePickerInputComponent) {
        this.renderReactComponent(DatePickerInputComponent)
      }
    }

    // ── Validation ──

    /** Validate a single parsed date against all date-level constraints. */
    _validateSingleDate(parsed: Date, dirty: boolean): boolean {
      const comp = this.component

      // Min date
      const minStr = comp?.minDate
      if (minStr) {
        const minD = parseDateString(minStr)
        if (minD && parsed < minD) {
          this.setCustomValidity(
            comp.validate?.customMessage || `Date must be on or after ${minStr}.`, dirty)
          return false
        }
      }

      // Max date
      const maxStr = comp?.maxDate
      if (maxStr) {
        const maxD = parseDateString(maxStr)
        if (maxD && parsed > maxD) {
          this.setCustomValidity(
            comp.validate?.customMessage || `Date must be on or before ${maxStr}.`, dirty)
          return false
        }
      }

      // Past dates
      if (comp?.disablePastDates) {
        const today = new Date(); today.setHours(0, 0, 0, 0)
        if (parsed < today) {
          this.setCustomValidity(
            comp.validate?.customMessage || 'Past dates are not allowed.', dirty)
          return false
        }
      }

      // Future dates
      if (comp?.disableFutureDates) {
        const today = new Date(); today.setHours(0, 0, 0, 0)
        if (parsed > today) {
          this.setCustomValidity(
            comp.validate?.customMessage || 'Future dates are not allowed.', dirty)
          return false
        }
      }

      // Weekends
      if (comp?.disableWeekends) {
        const day = parsed.getDay()
        if (day === 0 || day === 6) {
          this.setCustomValidity(
            comp.validate?.customMessage || 'Weekends are not allowed.', dirty)
          return false
        }
      }

      // Disabled single dates
      if (comp?.disabledDates) {
        const disabledList = parseDisabledDates(comp.disabledDates)
        const time = parsed.getTime()
        for (const d of disabledList) {
          if (d.getTime() === time) {
            this.setCustomValidity(
              comp.validate?.customMessage || 'This date is not available.', dirty)
            return false
          }
        }
      }

      // Disabled date ranges
      if (comp?.disabledDateRanges) {
        const disabledRanges = parseDisabledRanges(comp.disabledDateRanges)
        const time = parsed.getTime()
        for (const r of disabledRanges) {
          if (time >= r.start.getTime() && time <= r.end.getTime()) {
            this.setCustomValidity(
              comp.validate?.customMessage || 'This date falls within a disabled range.', dirty)
            return false
          }
        }
      }

      return true
    }

    checkValidity(data: any, dirty: boolean, rowData: any) {
      this.setCustomValidity('', dirty)
      const baseValid = super.checkValidity(data, dirty, rowData)
      if (!baseValid) return false

      const rawValue = this.currentValue

      // ── Range mode validation ──
      if (this.isRangeMode) {
        const isEmpty = !rawValue
        if (isEmpty && this.component?.validate?.required) {
          this.setCustomValidity(
            this.component.validate.customMessage || 'This field is required.', dirty)
          return false
        }
        if (!isEmpty) {
          let rangeObj: DateRangeValue
          try { rangeObj = JSON.parse(rawValue) } catch {
            this.setCustomValidity('Invalid date range value.', dirty)
            return false
          }
          const startParsed = parseDateString(rangeObj.startDate)
          const endParsed = parseDateString(rangeObj.endDate)
          if (!startParsed) {
            this.setCustomValidity('Please select a valid start date.', dirty)
            return false
          }
          // End date may be empty while user is still selecting
          if (rangeObj.endDate && !endParsed) {
            this.setCustomValidity('Please select a valid end date.', dirty)
            return false
          }
          if (!this._validateSingleDate(startParsed, dirty)) return false
          if (endParsed) {
            if (!this._validateSingleDate(endParsed, dirty)) return false
            if (endParsed < startParsed) {
              this.setCustomValidity('End date must be on or after start date.', dirty)
              return false
            }
          }
        }
        return true
      }

      // ── Single mode validation ──
      const isEmpty = !rawValue
      if (isEmpty && this.component?.validate?.required) {
        const msg = this.component.validate.customMessage || 'This field is required.'
        this.setCustomValidity(msg, dirty)
        return false
      }

      if (!isEmpty) {
        const parsed = parseDateString(rawValue)
        if (!parsed) {
          this.setCustomValidity('Please enter a valid date.', dirty)
          return false
        }
        if (!this._validateSingleDate(parsed, dirty)) return false

        // Custom JavaScript validation
        const customValidation = this.component?.validate?.custom
        if (customValidation) {
          try {
            const input = rawValue
            const { data: formData, row } = this
            const component = this.component
            const instance = this
            const fn = new Function(
              'input', 'formData', 'row', 'component', 'instance',
              `let valid = true;\n${customValidation}\nreturn valid;`,
            )
            const result: boolean | string = fn(input, formData, row, component, instance)
            if (result !== true) {
              const msg = typeof result === 'string'
                ? result
                : (this.component.validate?.customMessage || 'Custom validation failed.')
              this.setCustomValidity(msg, dirty)
              return false
            }
          } catch (err) {
            console.error('DatePicker: custom validation error', err)
          }
        }
      }

      return true
    }

    // ── Cleanup ──

    destroy() {
      if (this._initialValueTimeout) {
        clearTimeout(this._initialValueTimeout)
        this._initialValueTimeout = null
      }

      // Cache React root + mount for next designer instance
      const cacheKey = this.component?.key || ''
      if (cacheKey && this._persistentMount && this.reactRoot) {
        _mountCache.set(cacheKey, { mount: this._persistentMount, root: this.reactRoot })
      }

      this._mounted = false
      this._persistentMount = null
      this.reactRoot = null
      super.destroy()
    }
  }
}

export default createDatePickerClass
