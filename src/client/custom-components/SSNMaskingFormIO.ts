/**
 * Tax ID Masking FormIO Component (Renderer)
 *
 * Runtime renderer for the Tax ID (SSN / ITIN) component. Extends
 * TextFieldComponent to provide custom masking display with reveal/hide
 * toggle and configurable SSN / ITIN validation.
 *
 * Designer properties read from this.component:
 *   masked, allowToggleMask, maskedDisplayMode, maskCharacter, preventCopy,
 *   validationMode ('any' | 'ssn' | 'itin')
 */

export function createSSNMaskingClass(TextFieldComponent: any) {
  return class SSNMaskingFormIO extends TextFieldComponent {
    _rawValue = ''
    _revealed = false
    _inputEl: HTMLInputElement | null = null
    _toggleEl: HTMLButtonElement | null = null

    static schema(...extend: any[]) {
      return TextFieldComponent.schema({ type: 'ssn' }, ...extend)
    }

    // ── Prevent Form.io from initializing its Inputmask library ──

    constructor(component: any, options: any, data: any) {
      if (component) {
        component.inputMask = ''
        component.displayMask = ''
      }
      super(component, options, data)
      this.skipMaskValidation = true
      if (data && component?.key && data[component.key]) {
        this._rawValue = this._digits(data[component.key])
      }
    }

    setInputMask() { /* no-op */ }

    get inputInfo() {
      const info = super.inputInfo
      if (info?.attr) {
        delete info.attr.mask
        delete info.attr.inputMask
      }
      return info
    }

    // ── Lifecycle ──

    attach(element: HTMLElement) {
      const result = super.attach(element)
      this._injectStyles()
      setTimeout(() => this._setup(), 0)
      return result
    }

    // ── Value binding ──

    getValue() {
      return this._rawValue
    }

    setValue(value: any, flags?: any) {
      if (value === undefined) return
      this._rawValue = value ? this._digits(value) : ''
      const result = super.setValue(this._rawValue, flags)
      // Apply mask after super.setValue so Form.io's render doesn't overwrite
      if (this._inputEl && document.activeElement !== this._inputEl) {
        this._inputEl.value = this._revealed ? this._format(this._rawValue) : this._masked()
      }
      return result
    }

    get dataValue() {
      return this._rawValue || super.dataValue || ''
    }

    set dataValue(value: any) {
      this._rawValue = value ? this._digits(value) : ''
      super.dataValue = this._rawValue
    }

    get validationValue() {
      const raw = this._rawValue
      if (raw.length !== 9) return raw
      // Return formatted if the validation pattern expects dashes
      const pattern = this.component?.validate?.pattern || ''
      if (pattern.includes('-') || pattern.includes('{3}')) {
        return this._format(raw)
      }
      return raw
    }

    // ── SSN / ITIN validation ──

    checkValidity(data: any, dirty: boolean, row: any) {
      // Clear any previous custom validity from this component before re-checking
      this.setCustomValidity('', dirty)
      const baseResult = super.checkValidity(data, dirty, row)
      if (!baseResult) return baseResult

      const raw = this._rawValue
      // Empty field is handled by the required validator above; skip here
      if (!raw || raw.length === 0) return baseResult

      if (raw.length !== 9) {
        const msg = this.component?.validate?.customMessage ||
          'Tax ID must be exactly 9 digits (NNN-NN-NNNN).'
        this.setCustomValidity(msg, dirty)
        return false
      }

      const mode: string = this.component?.validationMode || 'any'
      const validSSN = this._isValidSSN(raw)
      const validITIN = this._isValidITIN(raw)
      let isValid: boolean
      if (mode === 'ssn') isValid = validSSN
      else if (mode === 'itin') isValid = validITIN
      else isValid = validSSN || validITIN

      if (!isValid) {
        const msg = this.component?.validate?.customMessage || this._taxIdValidationMessage(mode)
        this.setCustomValidity(msg, dirty)
        return false
      }

      return baseResult
    }

    _isValidSSN(digits: string): boolean {
      if (digits.length !== 9) return false
      // ITINs start with 9 — reject here for SSN-only check
      if (digits[0] === '9') return false
      const area = digits.substring(0, 3)
      const group = digits.substring(3, 5)
      const serial = digits.substring(5)
      // SSA never issues 000 area, 00 group, or 0000 serial
      if (area === '000' || group === '00' || serial === '0000') return false
      return true
    }

    _isValidITIN(digits: string): boolean {
      if (digits.length !== 9) return false
      // ITINs must begin with 9
      if (digits[0] !== '9') return false
      const group = parseInt(digits.substring(3, 5), 10)
      // IRS valid ITIN group ranges
      const validRanges: [number, number][] = [
        [50, 65], [70, 88], [90, 92], [94, 99],
      ]
      return validRanges.some(([lo, hi]) => group >= lo && group <= hi)
    }

    _taxIdValidationMessage(mode: string): string {
      if (mode === 'ssn') return 'Please enter a valid Social Security Number (NNN-NN-NNNN).'
      if (mode === 'itin') return 'Please enter a valid ITIN (NNN-NN-NNNN). First digit must be 9 with valid group digits.'
      return 'Please enter a valid SSN or ITIN (NNN-NN-NNNN).'
    }

    // ── Setup (runs once after attach) ──

    _setup() {
      if (!this.element) return
      const input = this.element.querySelector('input[type="text"]') as HTMLInputElement
      if (!input) return
      this._inputEl = input

      // Remove any residual Inputmask instance
      if ((input as any).inputmask) (input as any).inputmask.remove()

      input.placeholder = this.component?.placeholder || 'XXX-XX-XXXX'
      input.maxLength = 11
      input.autocomplete = 'off'
      input.setAttribute('inputmode', 'numeric')

      const tabindex = this.component?.tabindex
      if (tabindex !== '' && tabindex != null) {
        input.setAttribute('tabindex', String(Number(tabindex)))
      }

      // Avoid double-initializing
      if (input.parentElement?.classList.contains('ssn-wrap')) return
      const wrap = document.createElement('div')
      wrap.className = 'ssn-wrap'
      input.parentNode!.insertBefore(wrap, input)
      wrap.appendChild(input)

      // Toggle button
      if (this.component?.allowToggleMask !== false) {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = 'ssn-eye'
        btn.setAttribute('aria-label', 'Toggle SSN visibility')
        this._setToggleIcon(btn)
        wrap.appendChild(btn)
        this._toggleEl = btn
        input.style.paddingRight = '36px'
        btn.addEventListener('click', (e) => {
          e.preventDefault()
          e.stopPropagation()
          this._toggle()
        })
      }

      // Input events
      input.addEventListener('keydown', (e) => this._onKeydown(e))
      input.addEventListener('input', () => this._onInput())
      input.addEventListener('focus', () => this._onFocus())
      input.addEventListener('blur', () => this._onBlur())
      input.addEventListener('paste', (e) => this._onPaste(e))

      // Copy prevention
      if (this.component?.preventCopy !== false) {
        const block = (e: Event) => e.preventDefault()
        input.addEventListener('copy', block)
        input.addEventListener('cut', block)
      }

      // Populate from existing submission data
      const existing = super.dataValue
      if (existing) {
        this._rawValue = this._digits(existing)
        this._commit()
      }

      // Apply masked display immediately
      if (this._rawValue && this.component?.masked !== false && !this._revealed) {
        input.value = this._masked()
      } else if (this._rawValue) {
        input.value = this._format(this._rawValue)
      }

      // Re-apply mask after Form.io's own lifecycle finishes setting the value
      setTimeout(() => this._syncDisplay(), 50)

      // Apply autofocus if configured
      if (this.component?.autofocus) {
        input.focus()
      }
    }

    // ── Event handlers ──

    _onKeydown(e: KeyboardEvent) {
      // In masked mode, handle digit input and deletion directly so that
      // _rawValue is never incorrectly derived from the masked display chars.
      if (this._revealed) return
      if (/^\d$/.test(e.key)) {
        e.preventDefault()
        if (this._rawValue.length < 9) {
          this._rawValue += e.key
          this._inputEl!.value = this._masked()
          this._commit()
        }
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        this._rawValue = this._rawValue.slice(0, -1)
        this._inputEl!.value = this._masked()
        this._commit()
      } else if (e.key === 'Delete') {
        e.preventDefault()
        this._rawValue = this._rawValue.slice(0, -1)
        this._inputEl!.value = this._masked()
        this._commit()
      }
    }

    _onInput() {
      const inp = this._inputEl!
      if (!this._revealed) {
        // Masked mode: _onKeydown already updated _rawValue and set inp.value.
        // Just keep the display in sync for any edge-case browser changes.
        inp.value = this._masked()
        return
      }
      const pos = inp.selectionStart || 0
      this._rawValue = this._digits(inp.value)
      // Show formatted digits while typing in revealed mode.
      inp.value = this._format(this._rawValue)
      // Adjust cursor for inserted dashes
      let newPos = pos
      if (this._rawValue.length > 3 && pos > 3) newPos++
      if (this._rawValue.length > 5 && pos > 6) newPos++
      const max = inp.value.length
      inp.setSelectionRange(Math.min(newPos, max), Math.min(newPos, max))
      this._commit()
    }

    _onFocus() {
      // Only show raw digits when the eye toggle has revealed the value;
      // otherwise keep the masked display so focus alone never exposes the SSN.
      if (this._revealed && this._rawValue) {
        this._inputEl!.value = this._format(this._rawValue)
      }
    }

    _onBlur() {
      this._commit()
      this._syncDisplay()
    }

    _onPaste(e: ClipboardEvent) {
      e.preventDefault()
      this._rawValue = this._digits(e.clipboardData?.getData('text') || '')
      this._inputEl!.value = this._format(this._rawValue)
      this._commit()
    }

    // ── Toggle reveal/hide ──

    _toggle() {
      this._revealed = !this._revealed
      if (this._toggleEl) this._setToggleIcon(this._toggleEl)
      this._syncDisplay()
    }

    _setToggleIcon(btn: HTMLButtonElement) {
      btn.innerHTML = this._revealed ? '🙈' : '👁️'
      btn.title = this._revealed ? 'Hide SSN' : 'Show SSN'
    }

    // ── Display helpers ──

    _syncDisplay() {
      if (!this._inputEl) return
      if (!this._rawValue) { this._inputEl.value = ''; return }
      this._inputEl.value = this._revealed ? this._format(this._rawValue) : this._masked()
    }

    _masked(): string {
      const raw = this._rawValue
      if (!raw) return ''
      const ch = this.component?.maskCharacter || '*'
      const mode = this.component?.maskedDisplayMode || 'last4'

      if (mode === 'fullMask') {
        if (raw.length <= 3) return ch.repeat(raw.length)
        if (raw.length <= 5) return `${ch.repeat(3)}-${ch.repeat(raw.length - 3)}`
        return `${ch.repeat(3)}-${ch.repeat(2)}-${ch.repeat(raw.length - 5)}`
      }

      // last4: show only last 4 digits for a complete SSN
      if (raw.length <= 5) return ch.repeat(raw.length)
      if (raw.length < 9) {
        const visible = raw.substring(5)
        return `${ch.repeat(3)}-${ch.repeat(2)}-${visible}`
      }
      return `${ch.repeat(3)}-${ch.repeat(2)}-${raw.substring(5)}`
    }

    _format(digits: string): string {
      if (!digits) return ''
      if (digits.length <= 3) return digits
      if (digits.length <= 5) return `${digits.substring(0, 3)}-${digits.substring(3)}`
      return `${digits.substring(0, 3)}-${digits.substring(3, 5)}-${digits.substring(5)}`
    }

    _digits(v: any): string {
      return String(v || '').replace(/\D/g, '').substring(0, 9)
    }

    // ── Commit value to Form.io data ──

    _commit() {
      const key = this.component?.key
      if (key && this.data) this.data[key] = this._rawValue
      super.dataValue = this._rawValue
      this.triggerChange()
    }

    // ── Cleanup ──

    destroy() {
      this._inputEl = null
      this._toggleEl = null
      super.destroy()
    }

    // ── Styles (injected once) ──

    _injectStyles() {
      if (document.getElementById('ssn-mask-css')) return
      const s = document.createElement('style')
      s.id = 'ssn-mask-css'
      s.textContent = `
.ssn-wrap{position:relative;width:100%;display:block}
.ssn-wrap input{width:100%;box-sizing:border-box}
.ssn-eye{position:absolute;right:6px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:16px;padding:2px 4px;z-index:2;line-height:1}
.ssn-eye:hover{opacity:.7}
.ssn-eye:focus{outline:2px solid #007bff;outline-offset:2px;border-radius:3px}`
      document.head.appendChild(s)
    }
  }
}

export default createSSNMaskingClass
