/**
 * SSN Masking FormIO Component
 *
 * A custom FormIO component for SSN input with:
 * - Automatic formatting (XXX-XX-XXXX)
 * - Masking display (***-**-XXXX)
 * - Toggle visibility (eye icon)
 * - Copy prevention
 *
 * All properties come from the FormIO component schema (from database):
 * - enableMasking: boolean - Enable/disable masking  (default true)
 * - showToggle: boolean   - Show/hide toggle button  (default true)
 * - preventCopy: boolean  - Prevent copy/paste of SSN (default true)
 */

export function createSSNMaskingClass(TextFieldComponent: any) {
  class SSNMaskingFormIO extends TextFieldComponent {
    rawValue: string = ''
    isHidden: boolean = true
    wrapper: HTMLDivElement | null = null
    toggleBtn: HTMLButtonElement | null = null
    inputElement: HTMLInputElement | null = null

    static schema(...extend: any[]) {
      return TextFieldComponent.schema({ type: 'ssnMasking' }, ...extend)
    }

    static get builderInfo() {
      return {
        title: 'SSN Masking',
        group: 'basic',
        icon: 'id-card',
        weight: 35,
        schema: SSNMaskingFormIO.schema(),
      }
    }

    constructor(component: any, options: any, data: any) {
      super(component, options, data)
      this.skipMaskValidation = true
      const key = component.key
      if (data && key && data[key]) {
        this.rawValue = String(data[key]).replace(/\D/g, '').substring(0, 9)
      }
    }

    flag(name: string): boolean {
      return this.component?.[name] !== false
    }

    attach(element: HTMLElement) {
      const result = super.attach(element)
      this.applyStyles()
      setTimeout(() => {
        this.fixDescriptionDisplay()
        this.setupSSNMasking()
      }, 100)
      return result
    }

    fixDescriptionDisplay() {
      if (!this.element) return
      const descEl = this.element.querySelector('.form-text, .text-muted')
      if (descEl && descEl.textContent?.includes('[object Object]')) {
        const desc = this.component?.description
        if (typeof desc === 'object' && desc !== null) {
          descEl.textContent = (desc as any).text || (desc as any).value || ''
        } else {
          (descEl as HTMLElement).style.display = 'none'
        }
      }
    }

    setupSSNMasking() {
      if (!this.element) return
      const input = this.element.querySelector('input') as HTMLInputElement
      if (!input) return
      this.inputElement = input

      input.placeholder = this.component.placeholder || 'XXX-XX-XXXX'
      input.maxLength = 11
      input.autocomplete = 'off'
      input.setAttribute('inputmode', 'numeric')

      if (input.parentElement?.classList.contains('ssn-masking-wrapper')) return

      this.wrapper = document.createElement('div')
      this.wrapper.className = 'ssn-masking-wrapper'
      input.parentNode?.insertBefore(this.wrapper, input)
      this.wrapper.appendChild(input)

      const hiddenInput = document.createElement('input')
      hiddenInput.type = 'hidden'
      hiddenInput.name = input.name || this.component.key
      hiddenInput.className = 'ssn-masking-hidden-value'
      hiddenInput.setAttribute('data-key', this.component.key)
      hiddenInput.value = this.rawValue
      this.wrapper.appendChild(hiddenInput)

      if (this.flag('showToggle')) {
        this.toggleBtn = document.createElement('button')
        this.toggleBtn.type = 'button'
        this.toggleBtn.className = 'ssn-toggle-btn'
        this.toggleBtn.innerHTML = this.isHidden ? '👁️' : '🙈'
        this.toggleBtn.title = this.isHidden ? 'Show SSN' : 'Hide SSN'
        this.toggleBtn.setAttribute('aria-label', this.isHidden ? 'Show SSN' : 'Hide SSN')
        this.wrapper.appendChild(this.toggleBtn)
        this.toggleBtn.addEventListener('click', (e) => {
          e.preventDefault()
          e.stopPropagation()
          this.toggleVisibility()
        })
        input.style.paddingRight = '40px'
      }

      input.addEventListener('input', (e) => this.handleInput(e))
      input.addEventListener('blur', () => {
        this.updateComponentValue()
        if (this.flag('enableMasking') && this.isHidden && this.rawValue.length > 0) {
          input.value = this.getMaskedDisplay()
        }
      })
      input.addEventListener('focus', () => {
        if (this.rawValue.length > 0) input.value = this.formatSSN(this.rawValue)
      })
      input.addEventListener('paste', (e) => this.handlePaste(e))

      if (this.flag('preventCopy')) {
        const prevent = (e: Event) => e.preventDefault()
        input.addEventListener('copy', prevent)
        input.addEventListener('cut', prevent)
        input.addEventListener('dragstart', prevent)
        input.addEventListener('contextmenu', prevent)
      }

      const existingValue = this.dataValue
      if (existingValue) {
        const digits = String(existingValue).replace(/\D/g, '').substring(0, 9)
        this.rawValue = digits
        this.updateComponentValue()
        const hi = this.wrapper?.querySelector('.ssn-masking-hidden-value') as HTMLInputElement
        if (hi) hi.value = digits
        if (this.flag('enableMasking') && this.isHidden && digits.length > 0) {
          input.value = this.getMaskedDisplay()
        } else {
          input.value = this.formatSSN(this.rawValue)
        }
      }
    }

    handleInput(e: Event) {
      const target = e.target as HTMLInputElement
      const cursorPos = target.selectionStart || 0
      const digits = target.value.replace(/\D/g, '').substring(0, 9)
      this.rawValue = digits
      const formatted = this.formatSSN(digits)
      target.value = formatted

      let newCursorPos = cursorPos
      if (digits.length > 3 && cursorPos > 3) newCursorPos++
      if (digits.length > 5 && cursorPos > 6) newCursorPos++
      target.setSelectionRange(
        Math.min(newCursorPos, formatted.length),
        Math.min(newCursorPos, formatted.length),
      )
      this.updateComponentValue()
    }

    handlePaste(e: ClipboardEvent) {
      e.preventDefault()
      const digits = (e.clipboardData?.getData('text') || '').replace(/\D/g, '').substring(0, 9)
      this.rawValue = digits
      if (this.inputElement) this.inputElement.value = this.formatSSN(digits)
      this.updateComponentValue()
    }

    toggleVisibility() {
      this.isHidden = !this.isHidden
      if (this.toggleBtn) {
        this.toggleBtn.innerHTML = this.isHidden ? '👁️' : '🙈'
        this.toggleBtn.title = this.isHidden ? 'Show SSN' : 'Hide SSN'
        this.toggleBtn.setAttribute('aria-label', this.isHidden ? 'Show SSN' : 'Hide SSN')
      }
      if (this.inputElement && this.rawValue.length > 0 && document.activeElement !== this.inputElement) {
        this.inputElement.value = this.flag('enableMasking') && this.isHidden
          ? this.getMaskedDisplay()
          : this.formatSSN(this.rawValue)
      }
    }

    formatSSN(digits: string): string {
      if (!digits) return ''
      digits = digits.replace(/\D/g, '').substring(0, 9)
      if (digits.length <= 3) return digits
      if (digits.length <= 5) return `${digits.substring(0, 3)}-${digits.substring(3)}`
      return `${digits.substring(0, 3)}-${digits.substring(3, 5)}-${digits.substring(5)}`
    }

    getMaskedDisplay(): string {
      if (!this.rawValue || !this.flag('enableMasking')) return this.formatSSN(this.rawValue)
      const len = this.rawValue.length
      if (len <= 4) return '*'.repeat(len)
      if (len <= 5) return `***-${this.rawValue.substring(3)}`
      return `***-**-${this.rawValue.substring(5)}`
    }

    updateComponentValue() {
      const key = this.component.key
      const valueToStore = this.rawValue
      if (this.data && key) this.data[key] = valueToStore
      if (this.root?.data && key && this.data === this.root.data) this.root.data[key] = valueToStore
      super.dataValue = valueToStore

      if (this.wrapper) {
        const hi = this.wrapper.querySelector('.ssn-masking-hidden-value') as HTMLInputElement
        if (hi) hi.value = valueToStore
      }
      this.triggerChange()
    }

    getValue() {
      return this.rawValue || ''
    }

    setValue(value: any, flags?: any) {
      if (value === undefined) return
      const newValue = value ? String(value).replace(/\D/g, '').substring(0, 9) : ''
      this.rawValue = newValue
      if (this.wrapper) {
        const hi = this.wrapper.querySelector('.ssn-masking-hidden-value') as HTMLInputElement
        if (hi) hi.value = newValue
      }
      if (this.inputElement) {
        if (this.flag('enableMasking') && this.isHidden && document.activeElement !== this.inputElement) {
          this.inputElement.value = this.getMaskedDisplay()
        } else {
          this.inputElement.value = this.formatSSN(this.rawValue)
        }
      }
      return super.setValue(this.rawValue, flags)
    }

    get validationValue() {
      const raw = this.rawValue || ''
      if (raw.length !== 9) return raw
      const comp = this.component || {}
      const inputMask = String(comp.inputMask || '')
      const displayMask = String(comp.displayMask || '')
      const ssnMaskRe = /9{2,3}[-\s]*9{2}[-\s]*9{4}/
      const hasSSNMask =
        ssnMaskRe.test(inputMask) || ssnMaskRe.test(displayMask) ||
        inputMask === '999-99-9999' || displayMask === '999-99-9999'
      const validate = comp.validate || {}
      const pattern = String(validate.pattern || '')
      const minLen = parseInt(validate.minLength, 10)
      const maxLen = parseInt(validate.maxLength, 10)
      const expectsFormattedLength = minLen === 11 || maxLen === 11
      const looksLikeSSNPattern =
        pattern.length > 0 &&
        pattern.includes('{3}') && pattern.includes('{2}') && pattern.includes('{4}') &&
        (pattern.includes('-') || /[d0-9\\\[\]]/.test(pattern))
      if (hasSSNMask || looksLikeSSNPattern || expectsFormattedLength) {
        return this.formatSSN(raw)
      }
      return raw
    }

    get dataValue() {
      const rawValue = this.rawValue || ''
      const superValue = super.dataValue
      if (superValue && typeof superValue === 'string' && superValue.includes('*')) return rawValue
      return rawValue || superValue || ''
    }

    set dataValue(value: any) {
      if (value) {
        this.rawValue = String(value).replace(/\D/g, '').substring(0, 9)
      } else {
        this.rawValue = ''
      }
      super.dataValue = this.rawValue
    }

    destroy() {
      this.wrapper = null
      this.toggleBtn = null
      this.inputElement = null
      super.destroy()
    }

    applyStyles() {
      const styleId = 'ssn-masking-styles'
      if (document.getElementById(styleId)) return
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = `
        .ssn-masking-wrapper { position: relative; width: 100%; display: inline-block; }
        .ssn-masking-wrapper input { width: 100%; box-sizing: border-box; }
        .ssn-toggle-btn { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 16px; padding: 4px; color: #666; line-height: 1; transition: opacity 0.2s ease; }
        .ssn-toggle-btn:hover { opacity: 0.7; }
        .ssn-toggle-btn:focus { outline: 2px solid #007bff; outline-offset: 2px; border-radius: 4px; }
        .ssn-masking-wrapper input[data-prevent-copy="true"] { user-select: none; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; }
      `
      document.head.appendChild(style)
    }
  }

  return SSNMaskingFormIO
}

export default createSSNMaskingClass
