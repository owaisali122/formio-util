/**
 * FormIO: Date Picker Component (Renderer)
 *
 * Wraps a React-based date picker (react-datepicker) inside a FormIO
 * field. The React component is lazily loaded on first mount.
 *
 * Stored value format: yyyy-MM-dd (e.g. "2025-06-15")
 * Display format: configurable via schema (default MM/dd/yyyy)
 */

import { createRoot, Root } from 'react-dom/client'
import React from 'react'
import type { DatePickerInputProps } from '../../components/DatePickerInput'
import { parseDateString } from '../../components/DatePickerInput'
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

    constructor(component: any, options: any, data: any) {
      super(component, options, data)
      this.currentValue = ''
      const key = component?.key
      if (data && key && data[key]) {
        this.currentValue = typeof data[key] === 'string' ? data[key] : ''
      }
      this._onChangeBound = (v: string) => this.handleReactChange(v)
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
      if (raw && typeof raw === 'string') {
        this.currentValue = raw
        if (this.reactRoot && DatePickerInputComponent) {
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

      this.reactRoot.render(
        React.createElement(Component, {
          value: this.currentValue || null,
          onChange: this._onChangeBound,
          displayFormat: comp.displayFormat || 'MM/dd/yyyy',
          placeholder: comp.placeholder || 'MM/DD/YYYY',
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
        }),
      )
    }

    handleReactChange(newValue: string) {
      if (newValue === this.currentValue) return
      this.currentValue = newValue
      const key = this.component?.key
      if (this.data && key) this.data[key] = newValue
      if (this.root?.data && key && this.data === this.root.data) {
        this.root.data[key] = newValue
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

    getValue() {
      return this.currentValue
    }

    setValue(value: any, flags?: any) {
      if (value === undefined) return
      const strValue = (value === null || value === '') ? '' : String(value)
      if (strValue === this.currentValue) return super.setValue(strValue, flags)
      this.currentValue = strValue
      if (this.reactRoot && DatePickerInputComponent) {
        this.renderReactComponent(DatePickerInputComponent)
      }
      return super.setValue(strValue, flags)
    }

    get dataValue() {
      return this.currentValue || super.dataValue || ''
    }

    set dataValue(value: any) {
      if (value === undefined) return
      const strValue = (value === null || value === '') ? '' : String(value)
      if (strValue === this.currentValue) return
      this.currentValue = strValue
      if (this.reactRoot && DatePickerInputComponent) {
        this.renderReactComponent(DatePickerInputComponent)
      }
    }

    // ── Validation ──

    checkValidity(data: any, dirty: boolean, rowData: any) {
      this.setCustomValidity('', dirty)
      const baseValid = super.checkValidity(data, dirty, rowData)
      if (!baseValid) return false

      const value = this.currentValue
      const isEmpty = !value

      // Required validation
      if (isEmpty && this.component?.validate?.required) {
        const msg = this.component.validate.customMessage || 'This field is required.'
        this.setCustomValidity(msg, dirty)
        return false
      }

      if (!isEmpty) {
        // Validate the stored date is parseable
        const parsed = parseDateString(value)
        if (!parsed) {
          this.setCustomValidity('Please enter a valid date.', dirty)
          return false
        }

        // Min date validation
        const minStr = this.component?.minDate
        if (minStr) {
          const minD = parseDateString(minStr)
          if (minD && parsed < minD) {
            const msg = this.component.validate?.customMessage ||
              `Date must be on or after ${minStr}.`
            this.setCustomValidity(msg, dirty)
            return false
          }
        }

        // Max date validation
        const maxStr = this.component?.maxDate
        if (maxStr) {
          const maxD = parseDateString(maxStr)
          if (maxD && parsed > maxD) {
            const msg = this.component.validate?.customMessage ||
              `Date must be on or before ${maxStr}.`
            this.setCustomValidity(msg, dirty)
            return false
          }
        }

        // Disable past dates validation
        if (this.component?.disablePastDates) {
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          if (parsed < today) {
            const msg = this.component.validate?.customMessage ||
              'Past dates are not allowed.'
            this.setCustomValidity(msg, dirty)
            return false
          }
        }

        // Disable future dates validation
        if (this.component?.disableFutureDates) {
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          if (parsed > today) {
            const msg = this.component.validate?.customMessage ||
              'Future dates are not allowed.'
            this.setCustomValidity(msg, dirty)
            return false
          }
        }

        // Disable weekends validation
        if (this.component?.disableWeekends) {
          const day = parsed.getDay()
          if (day === 0 || day === 6) {
            const msg = this.component.validate?.customMessage ||
              'Weekends are not allowed.'
            this.setCustomValidity(msg, dirty)
            return false
          }
        }

        // Custom JavaScript validation
        const customValidation = this.component?.validate?.custom
        if (customValidation) {
          try {
            const input = value
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
            console.error('CustomDatePicker: custom validation error', err)
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
