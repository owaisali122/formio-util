import { SSNComponent } from '../components/SSN'
import type { FormioComponents } from './types'

export async function registerSSN(Components: FormioComponents): Promise<void> {
  const TextFieldComponent = Components.components.textfield as any

  const formatSSN = SSNComponent.formatSSN
  const validateSSN = SSNComponent.validateSSN

  const ssnSchema = {
    type: 'ssn',
    label: 'Social Security Number',
    key: 'ssn',
    inputType: 'text',
    inputMask: '999-99-9999',
    placeholder: '___-__-____',
    description: 'Enter your 9-digit Social Security Number',
    masked: true,
    allowToggleMask: true,
    validateFormat: true,
    validateRealSSN: true,
    allowITIN: false,
    preventCopy: true,
    autocomplete: 'off',
    spellcheck: false,
  }

  class SSNField extends TextFieldComponent {
    static schema(...extend: any[]) {
      return TextFieldComponent.schema(ssnSchema, ...extend)
    }

    static get builderInfo() {
      return SSNComponent.builderInfo
    }

    static editForm() {
      return SSNComponent.editForm()
    }

    ssnInput: HTMLInputElement | null = null
    toggleButton: HTMLButtonElement | null = null
    isMasked: boolean = true
    rawValue: string = ''

    constructor(component: any, options: any, data: any) {
      super(component, options, data)
      this.isMasked = component.masked !== false
      this.rawValue = ''
    }

    get defaultSchema() {
      return SSNField.schema()
    }

    init() {
      super.init()
    }

    render() {
      return super.render()
    }

    attach(element: HTMLElement) {
      const attached = super.attach(element)
      Promise.resolve(attached).then(() => {
        this.setupSSNInput()
      })
      return attached
    }

    setupSSNInput() {
      if (!this.element) return

      const inputContainer = this.element.querySelector('.form-control') as HTMLInputElement
      if (!inputContainer || inputContainer.tagName !== 'INPUT') return

      this.ssnInput = inputContainer

      inputContainer.setAttribute('autocomplete', 'off')
      inputContainer.setAttribute('autocorrect', 'off')
      inputContainer.setAttribute('autocapitalize', 'off')
      inputContainer.setAttribute('spellcheck', 'false')
      inputContainer.setAttribute('maxlength', '11')
      inputContainer.setAttribute('inputmode', 'numeric')
      inputContainer.setAttribute('aria-label', this.component.label || 'Social Security Number')
      inputContainer.setAttribute('placeholder', this.component.placeholder || '___-__-____')

      if (this.component.preventCopy) {
        inputContainer.addEventListener('copy', (e: ClipboardEvent) => {
          e.preventDefault()
          return false
        })
        inputContainer.addEventListener('cut', (e: ClipboardEvent) => {
          e.preventDefault()
          return false
        })
      }

      inputContainer.addEventListener('input', (e: Event) => {
        const target = e.target as HTMLInputElement
        const cursorPos = target.selectionStart || 0
        const oldValue = target.value
        const formatted = formatSSN(target.value)

        target.value = formatted
        this.rawValue = formatted.replace(/\D/g, '')

        const addedChars = formatted.length - oldValue.length
        const newCursorPos = Math.max(0, cursorPos + addedChars)
        target.setSelectionRange(newCursorPos, newCursorPos)

        this.updateValue()
      })

      inputContainer.addEventListener('paste', (e: ClipboardEvent) => {
        e.preventDefault()
        const pastedText = e.clipboardData?.getData('text') || ''
        const digits = pastedText.replace(/\D/g, '').slice(0, 9)
        const formatted = formatSSN(digits)
        inputContainer.value = formatted
        this.rawValue = digits
        this.updateValue()
      })

      inputContainer.addEventListener('keydown', (e: KeyboardEvent) => {
        const key = e.key
        const target = e.target as HTMLInputElement

        if (['Backspace', 'Delete', 'Tab', 'Escape', 'Enter'].includes(key)) return
        if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(key.toLowerCase())) return
        if (['Home', 'End', 'ArrowLeft', 'ArrowRight'].includes(key)) return

        if (!/^\d$/.test(key)) {
          e.preventDefault()
          return
        }

        const currentDigits = target.value.replace(/\D/g, '')
        if (currentDigits.length >= 9 && target.selectionStart === target.selectionEnd) {
          e.preventDefault()
        }
      })

      if (this.component.allowToggleMask && this.component.masked) {
        this.setupMaskToggle()
      }

      if (this.dataValue) {
        inputContainer.value = formatSSN(String(this.dataValue))
        this.rawValue = String(this.dataValue).replace(/\D/g, '')
      }
    }

    setupMaskToggle() {
      if (!this.ssnInput) return

      if (!document.querySelector('#ssn-component-styles')) {
        const style = document.createElement('style')
        style.id = 'ssn-component-styles'
        style.textContent = `
          .ssn-input-wrapper {
            position: relative;
            display: flex;
            align-items: center;
          }
          .ssn-input-wrapper input {
            padding-right: 40px !important;
          }
          .ssn-mask-toggle {
            position: absolute;
            right: 8px;
            top: 50%;
            transform: translateY(-50%);
            background: transparent;
            border: none;
            cursor: pointer;
            padding: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #666;
            z-index: 10;
          }
          .ssn-mask-toggle:hover {
            color: #333;
          }
        `
        document.head.appendChild(style)
      }

      const toggleBtn = document.createElement('button')
      toggleBtn.type = 'button'
      toggleBtn.className = 'ssn-mask-toggle'
      toggleBtn.setAttribute('aria-label', 'Toggle SSN visibility')
      toggleBtn.innerHTML = `
        <svg class="eye-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
        <svg class="eye-off-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:none;">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
          <line x1="1" y1="1" x2="23" y2="23"></line>
        </svg>
      `

      this.toggleButton = toggleBtn

      const wrapper = document.createElement('div')
      wrapper.className = 'ssn-input-wrapper'

      if (this.ssnInput.parentNode) {
        this.ssnInput.parentNode.insertBefore(wrapper, this.ssnInput)
        wrapper.appendChild(this.ssnInput)
        wrapper.appendChild(toggleBtn)
      }

      toggleBtn.addEventListener('click', () => {
        this.isMasked = !this.isMasked
        this.updateMaskDisplay()
      })

      this.updateMaskDisplay()
    }

    updateMaskDisplay() {
      if (!this.toggleButton || !this.ssnInput) return

      const eyeIcon = this.toggleButton.querySelector('.eye-icon') as HTMLElement
      const eyeOffIcon = this.toggleButton.querySelector('.eye-off-icon') as HTMLElement

      if (this.isMasked) {
        this.ssnInput.setAttribute('type', 'password')
        if (eyeIcon) eyeIcon.style.display = 'block'
        if (eyeOffIcon) eyeOffIcon.style.display = 'none'
        this.toggleButton.setAttribute('aria-label', 'Show SSN')
      } else {
        this.ssnInput.setAttribute('type', 'text')
        if (eyeIcon) eyeIcon.style.display = 'none'
        if (eyeOffIcon) eyeOffIcon.style.display = 'block'
        this.toggleButton.setAttribute('aria-label', 'Hide SSN')
      }
    }

    getValue() {
      return this.rawValue ? formatSSN(this.rawValue) : ''
    }

    setValue(value: any, flags?: any) {
      if (!value) {
        this.rawValue = ''
        if (this.ssnInput) {
          this.ssnInput.value = ''
        }
        return super.setValue('', flags)
      }

      const strValue = String(value)
      const digits = strValue.replace(/\D/g, '')
      this.rawValue = digits
      const formatted = formatSSN(digits)

      if (this.ssnInput) {
        this.ssnInput.value = formatted
      }

      return super.setValue(formatted, flags)
    }

    checkValidity(data: any, dirty: boolean, rowData: any) {
      const valid = super.checkValidity(data, dirty, rowData)
      if (!valid) return false

      const value = this.getValue()

      if (!value && !this.component.validate?.required) return true

      if (!value && this.component.validate?.required) {
        this.setCustomValidity('SSN is required', dirty)
        return false
      }

      const validation = validateSSN(value, {
        validateFormat: this.component.validateFormat,
        validateRealSSN: this.component.validateRealSSN,
        allowITIN: this.component.allowITIN,
      })

      if (!validation.valid) {
        this.setCustomValidity(validation.message || 'Invalid SSN', dirty)
        return false
      }

      return true
    }

    destroy() {
      super.destroy()
    }
  }

  Components.setComponent('ssn', SSNField)
}
