/**
 * Custom Form.io SSN (Social Security Number) Component
 * 
 * Features:
 * - Automatic formatting (XXX-XX-XXXX)
 * - Input masking with visual feedback
 * - SSN validation (format and optional ITIN detection)
 * - Masked display option (***-**-1234)
 * - Copy protection
 * - Accessibility support (ARIA labels)
 * - Configurable validation rules
 * - Secure input handling
 */

export class SSNComponent {
  // Instance properties (will be set on the class instance)
  element: HTMLElement | null = null
  component: any = {}
  dataValue: string = ''
  ssnInput: HTMLInputElement | null = null
  maskedDisplay: HTMLSpanElement | null = null
  toggleButton: HTMLButtonElement | null = null
  isMasked: boolean = true
  rawValue: string = ''

  static schema(overrides?: any) {
    return {
      type: 'ssn',
      label: 'Social Security Number',
      key: 'ssn',
      input: true,
      inputType: 'text',
      inputMask: '999-99-9999',
      placeholder: '___-__-____',
      description: 'Enter your 9-digit Social Security Number',
      // Validation settings
      validate: {
        required: false,
        pattern: '^(?!000|666|9\\d{2})\\d{3}-(?!00)\\d{2}-(?!0000)\\d{4}$',
        customMessage: 'Please enter a valid SSN in the format XXX-XX-XXXX',
      },
      // Custom properties
      masked: true, // Show masked value by default
      allowToggleMask: true, // Allow user to toggle mask visibility
      validateFormat: true, // Validate SSN format
      validateRealSSN: true, // Validate against known invalid patterns
      allowITIN: false, // Allow Individual Taxpayer Identification Numbers (9XX-XX-XXXX)
      preventCopy: true, // Prevent copying SSN value
      autocomplete: 'off', // Disable browser autocomplete
      spellcheck: false, // Disable spellcheck
      ...overrides,
    }
  }

  static get builderInfo() {
    return {
      title: 'SSN',
      group: 'basic',
      icon: 'id-card',
      weight: 26,
      documentation: 'Social Security Number input with masking and validation',
      schema: SSNComponent.schema(),
    }
  }

  static editForm() {
    return {
      components: [
        // Display Tab
        {
          type: 'tabs',
          key: 'tabs',
          components: [
            {
              label: 'Display',
              key: 'display',
              components: [
                {
                  type: 'textfield',
                  key: 'label',
                  label: 'Label',
                  input: true,
                  defaultValue: 'Social Security Number',
                  weight: 10,
                },
                {
                  type: 'textfield',
                  key: 'key',
                  label: 'Property Name',
                  input: true,
                  defaultValue: 'ssn',
                  weight: 20,
                },
                {
                  type: 'textfield',
                  key: 'placeholder',
                  label: 'Placeholder',
                  input: true,
                  defaultValue: '___-__-____',
                  weight: 30,
                },
                {
                  type: 'textarea',
                  key: 'description',
                  label: 'Description',
                  input: true,
                  defaultValue: 'Enter your 9-digit Social Security Number',
                  weight: 40,
                },
                {
                  type: 'textfield',
                  key: 'tooltip',
                  label: 'Tooltip',
                  input: true,
                  placeholder: 'Enter tooltip text',
                  weight: 50,
                },
                {
                  type: 'textfield',
                  key: 'prefix',
                  label: 'Prefix',
                  input: true,
                  placeholder: 'e.g., SSN:',
                  weight: 60,
                },
                {
                  type: 'textfield',
                  key: 'suffix',
                  label: 'Suffix',
                  input: true,
                  weight: 70,
                },
                {
                  type: 'checkbox',
                  key: 'hidden',
                  label: 'Hidden',
                  input: true,
                  defaultValue: false,
                  weight: 80,
                },
                {
                  type: 'checkbox',
                  key: 'disabled',
                  label: 'Disabled',
                  input: true,
                  defaultValue: false,
                  weight: 90,
                },
              ],
            },
            // Security Tab
            {
              label: 'Security',
              key: 'security',
              components: [
                {
                  type: 'checkbox',
                  key: 'masked',
                  label: 'Mask SSN by Default',
                  input: true,
                  defaultValue: true,
                  description: 'Display SSN as ***-**-XXXX when not editing',
                  weight: 10,
                },
                {
                  type: 'checkbox',
                  key: 'allowToggleMask',
                  label: 'Allow Toggle Mask Visibility',
                  input: true,
                  defaultValue: true,
                  description: 'Show eye icon to toggle SSN visibility',
                  weight: 20,
                },
                {
                  type: 'checkbox',
                  key: 'preventCopy',
                  label: 'Prevent Copy',
                  input: true,
                  defaultValue: true,
                  description: 'Prevent users from copying the SSN value',
                  weight: 30,
                },
              ],
            },
            // Validation Tab
            {
              label: 'Validation',
              key: 'validation',
              components: [
                {
                  type: 'checkbox',
                  key: 'validate.required',
                  label: 'Required',
                  input: true,
                  defaultValue: false,
                  weight: 10,
                },
                {
                  type: 'checkbox',
                  key: 'validateFormat',
                  label: 'Validate SSN Format',
                  input: true,
                  defaultValue: true,
                  description: 'Ensure SSN matches XXX-XX-XXXX format',
                  weight: 20,
                },
                {
                  type: 'checkbox',
                  key: 'validateRealSSN',
                  label: 'Validate Real SSN Rules',
                  input: true,
                  defaultValue: true,
                  description: 'Check for invalid SSN patterns (000, 666, 9XX area numbers, etc.)',
                  weight: 30,
                },
                {
                  type: 'checkbox',
                  key: 'allowITIN',
                  label: 'Allow ITIN',
                  input: true,
                  defaultValue: false,
                  description: 'Allow Individual Taxpayer Identification Numbers (9XX-XX-XXXX)',
                  weight: 40,
                },
                {
                  type: 'textfield',
                  key: 'validate.customMessage',
                  label: 'Custom Error Message',
                  input: true,
                  defaultValue: 'Please enter a valid SSN in the format XXX-XX-XXXX',
                  weight: 50,
                },
              ],
            },
            // Conditional Tab
            {
              label: 'Conditional',
              key: 'conditional',
              components: [
                {
                  type: 'panel',
                  title: 'Simple Conditional',
                  collapsible: true,
                  collapsed: false,
                  components: [
                    {
                      type: 'select',
                      key: 'conditional.show',
                      label: 'This component should Display:',
                      input: true,
                      dataSrc: 'values',
                      data: {
                        values: [
                          { label: 'True', value: 'true' },
                          { label: 'False', value: 'false' },
                        ],
                      },
                    },
                    {
                      type: 'select',
                      key: 'conditional.when',
                      label: 'When the form component:',
                      input: true,
                      dataSrc: 'custom',
                      data: {
                        custom: 'values = utils.getContextComponents()',
                      },
                    },
                    {
                      type: 'textfield',
                      key: 'conditional.eq',
                      label: 'Has the value:',
                      input: true,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }
  }

  /**
   * Format SSN with dashes (XXX-XX-XXXX)
   */
  static formatSSN(value: string): string {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '')
    
    if (digits.length <= 3) {
      return digits
    } else if (digits.length <= 5) {
      return `${digits.slice(0, 3)}-${digits.slice(3)}`
    } else {
      return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5, 9)}`
    }
  }

  /**
   * Get masked display value (***-**-XXXX)
   */
  static getMaskedValue(value: string): string {
    const digits = value.replace(/\D/g, '')
    
    if (digits.length === 0) {
      return ''
    }
    
    if (digits.length < 9) {
      // Partially mask what we have
      const masked = '*'.repeat(Math.min(digits.length, 5))
      const visible = digits.slice(5)
      if (digits.length <= 3) {
        return '*'.repeat(digits.length)
      } else if (digits.length <= 5) {
        return `***-${'*'.repeat(digits.length - 3)}`
      } else {
        return `***-**-${visible}`
      }
    }
    
    // Full SSN - show last 4 digits
    return `***-**-${digits.slice(5, 9)}`
  }

  /**
   * Validate SSN format and rules
   */
  static validateSSN(value: string, options: {
    validateFormat?: boolean
    validateRealSSN?: boolean
    allowITIN?: boolean
  } = {}): { valid: boolean; message?: string } {
    const { validateFormat = true, validateRealSSN = true, allowITIN = false } = options
    
    if (!value) {
      return { valid: true } // Empty is valid (required check is separate)
    }
    
    const digits = value.replace(/\D/g, '')
    
    // Check length
    if (digits.length !== 9) {
      return { valid: false, message: 'SSN must be exactly 9 digits' }
    }
    
    if (validateFormat) {
      // Check format pattern
      const formatted = SSNComponent.formatSSN(digits)
      const formatPattern = /^\d{3}-\d{2}-\d{4}$/
      if (!formatPattern.test(formatted)) {
        return { valid: false, message: 'SSN must be in format XXX-XX-XXXX' }
      }
    }
    
    if (validateRealSSN) {
      const area = digits.slice(0, 3)
      const group = digits.slice(3, 5)
      const serial = digits.slice(5, 9)
      
      // Area number cannot be 000
      if (area === '000') {
        return { valid: false, message: 'SSN area number cannot be 000' }
      }
      
      // Area number cannot be 666
      if (area === '666') {
        return { valid: false, message: 'SSN area number cannot be 666' }
      }
      
      // Area numbers 900-999 are reserved for ITINs
      if (area.startsWith('9') && !allowITIN) {
        return { valid: false, message: 'SSN area number cannot start with 9 (reserved for ITIN)' }
      }
      
      // Group number cannot be 00
      if (group === '00') {
        return { valid: false, message: 'SSN group number cannot be 00' }
      }
      
      // Serial number cannot be 0000
      if (serial === '0000') {
        return { valid: false, message: 'SSN serial number cannot be 0000' }
      }
      
      // Check for known invalid SSNs (advertising, test SSNs)
      const invalidSSNs = [
        '078051120', // Woolworth wallet SSN
        '219099999', // Advertising SSN
        '457555462', // Lifelock CEO SSN (publicly disclosed)
      ]
      if (invalidSSNs.includes(digits)) {
        return { valid: false, message: 'This SSN is known to be invalid' }
      }
      
      // Check for obvious fake patterns
      if (/^(\d)\1{8}$/.test(digits)) {
        return { valid: false, message: 'SSN cannot be all the same digit' }
      }
      
      if (digits === '123456789' || digits === '987654321') {
        return { valid: false, message: 'SSN cannot be a sequential pattern' }
      }
    }
    
    return { valid: true }
  }

  /**
   * Setup the SSN input field with masking and validation
   */
  setupSSNInput() {
    if (!this.element) return
    
    const component = this.component
    const inputContainer = this.element.querySelector('.formio-component-ssn') || this.element
    
    // Find or create the input
    let input = inputContainer.querySelector('input[type="text"]') as HTMLInputElement
    if (!input) {
      input = document.createElement('input')
      input.type = 'text'
      input.className = 'form-control ssn-input'
      inputContainer.appendChild(input)
    }
    
    this.ssnInput = input
    
    // Set input attributes
    input.setAttribute('autocomplete', 'off')
    input.setAttribute('autocorrect', 'off')
    input.setAttribute('autocapitalize', 'off')
    input.setAttribute('spellcheck', 'false')
    input.setAttribute('maxlength', '11') // XXX-XX-XXXX
    input.setAttribute('inputmode', 'numeric')
    input.setAttribute('aria-label', component.label || 'Social Security Number')
    input.setAttribute('placeholder', component.placeholder || '___-__-____')
    
    if (component.disabled) {
      input.setAttribute('disabled', 'true')
    }
    
    // Prevent copy if configured
    if (component.preventCopy) {
      input.addEventListener('copy', (e) => {
        e.preventDefault()
        return false
      })
      input.addEventListener('cut', (e) => {
        e.preventDefault()
        return false
      })
      input.style.userSelect = 'none'
    }
    
    // Setup input masking
    input.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement
      const cursorPos = target.selectionStart || 0
      const oldValue = target.value
      const formatted = SSNComponent.formatSSN(target.value)
      
      target.value = formatted
      this.rawValue = formatted.replace(/\D/g, '')
      
      // Adjust cursor position after formatting
      const addedChars = formatted.length - oldValue.length
      const newCursorPos = Math.max(0, cursorPos + addedChars)
      target.setSelectionRange(newCursorPos, newCursorPos)
      
      // Update masked display if exists
      this.updateMaskedDisplay()
      
      // Trigger change event for Form.io
      this.updateValue()
    })
    
    // Handle paste
    input.addEventListener('paste', (e) => {
      e.preventDefault()
      const pastedText = e.clipboardData?.getData('text') || ''
      const digits = pastedText.replace(/\D/g, '').slice(0, 9)
      const formatted = SSNComponent.formatSSN(digits)
      input.value = formatted
      this.rawValue = digits
      this.updateMaskedDisplay()
      this.updateValue()
    })
    
    // Handle keydown for better UX
    input.addEventListener('keydown', (e) => {
      const key = e.key
      const target = e.target as HTMLInputElement
      const cursorPos = target.selectionStart || 0
      
      // Allow: backspace, delete, tab, escape, enter
      if (['Backspace', 'Delete', 'Tab', 'Escape', 'Enter'].includes(key)) {
        return
      }
      
      // Allow: Ctrl+A, Ctrl+C (if not prevented), Ctrl+V, Ctrl+X
      if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(key.toLowerCase())) {
        return
      }
      
      // Allow: home, end, left, right
      if (['Home', 'End', 'ArrowLeft', 'ArrowRight'].includes(key)) {
        return
      }
      
      // Block non-numeric input
      if (!/^\d$/.test(key)) {
        e.preventDefault()
        return
      }
      
      // Block if already at max length (9 digits)
      const currentDigits = target.value.replace(/\D/g, '')
      if (currentDigits.length >= 9 && target.selectionStart === target.selectionEnd) {
        e.preventDefault()
      }
    })
    
    // Setup mask toggle button if allowed
    if (component.allowToggleMask && component.masked) {
      this.setupMaskToggle(inputContainer as HTMLElement)
    }
    
    // Set initial value if exists
    if (this.dataValue) {
      input.value = SSNComponent.formatSSN(this.dataValue)
      this.rawValue = this.dataValue.replace(/\D/g, '')
      this.updateMaskedDisplay()
    }
  }

  /**
   * Setup mask toggle button
   */
  setupMaskToggle(container: HTMLElement) {
    // Create toggle button
    const toggleBtn = document.createElement('button')
    toggleBtn.type = 'button'
    toggleBtn.className = 'ssn-mask-toggle btn btn-sm btn-outline-secondary'
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
    
    // Create masked display span
    const maskedSpan = document.createElement('span')
    maskedSpan.className = 'ssn-masked-display'
    maskedSpan.style.display = 'none'
    maskedSpan.setAttribute('aria-live', 'polite')
    
    this.toggleButton = toggleBtn
    this.maskedDisplay = maskedSpan
    this.isMasked = this.component.masked
    
    // Add styles
    const style = document.createElement('style')
    style.textContent = `
      .ssn-input-wrapper {
        position: relative;
        display: flex;
        align-items: center;
      }
      .ssn-input-wrapper input {
        padding-right: 40px;
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
      }
      .ssn-mask-toggle:hover {
        color: #333;
      }
      .ssn-masked-display {
        font-family: monospace;
        letter-spacing: 1px;
        padding: 6px 12px;
        background: #f5f5f5;
        border: 1px solid #ddd;
        border-radius: 4px;
      }
      .ssn-input.masked {
        -webkit-text-security: disc;
        font-family: monospace;
      }
    `
    
    if (!document.querySelector('#ssn-component-styles')) {
      style.id = 'ssn-component-styles'
      document.head.appendChild(style)
    }
    
    // Wrap input in container
    const wrapper = document.createElement('div')
    wrapper.className = 'ssn-input-wrapper'
    
    if (this.ssnInput && this.ssnInput.parentNode) {
      this.ssnInput.parentNode.insertBefore(wrapper, this.ssnInput)
      wrapper.appendChild(this.ssnInput)
      wrapper.appendChild(toggleBtn)
      wrapper.appendChild(maskedSpan)
    }
    
    // Toggle button click handler
    toggleBtn.addEventListener('click', () => {
      this.isMasked = !this.isMasked
      this.updateMaskDisplay()
    })
    
    // Initial mask state
    this.updateMaskDisplay()
  }

  /**
   * Update mask display state
   */
  updateMaskDisplay() {
    if (!this.toggleButton || !this.ssnInput) return
    
    const eyeIcon = this.toggleButton.querySelector('.eye-icon') as HTMLElement
    const eyeOffIcon = this.toggleButton.querySelector('.eye-off-icon') as HTMLElement
    
    if (this.isMasked) {
      this.ssnInput.classList.add('masked')
      this.ssnInput.setAttribute('type', 'password')
      if (eyeIcon) eyeIcon.style.display = 'block'
      if (eyeOffIcon) eyeOffIcon.style.display = 'none'
      this.toggleButton.setAttribute('aria-label', 'Show SSN')
    } else {
      this.ssnInput.classList.remove('masked')
      this.ssnInput.setAttribute('type', 'text')
      if (eyeIcon) eyeIcon.style.display = 'none'
      if (eyeOffIcon) eyeOffIcon.style.display = 'block'
      this.toggleButton.setAttribute('aria-label', 'Hide SSN')
    }
  }

  /**
   * Update masked display text
   */
  updateMaskedDisplay() {
    if (this.maskedDisplay && this.rawValue) {
      this.maskedDisplay.textContent = SSNComponent.getMaskedValue(this.rawValue)
    }
  }

  /**
   * Update the component value
   */
  updateValue() {
    // This will be overridden by the actual Form.io component
    if (this.ssnInput) {
      this.dataValue = this.ssnInput.value
    }
  }

  /**
   * Get the current value
   */
  getValue(): string {
    return this.rawValue ? SSNComponent.formatSSN(this.rawValue) : ''
  }

  /**
   * Set the value
   */
  setValue(value: string) {
    if (!value) {
      this.rawValue = ''
      if (this.ssnInput) {
        this.ssnInput.value = ''
      }
      this.updateMaskedDisplay()
      return
    }
    
    const digits = value.replace(/\D/g, '')
    this.rawValue = digits
    
    if (this.ssnInput) {
      this.ssnInput.value = SSNComponent.formatSSN(digits)
    }
    
    this.updateMaskedDisplay()
  }

  /**
   * Custom validation
   */
  validateSSN(): { valid: boolean; message?: string } {
    const value = this.getValue()
    
    if (!value && this.component.validate?.required) {
      return { valid: false, message: 'SSN is required' }
    }
    
    if (!value) {
      return { valid: true }
    }
    
    return SSNComponent.validateSSN(value, {
      validateFormat: this.component.validateFormat,
      validateRealSSN: this.component.validateRealSSN,
      allowITIN: this.component.allowITIN,
    })
  }
}
