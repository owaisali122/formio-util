/**
 * DateTimeFormIO — Global override for Form.io's built-in datetime component.
 *
 * Problem: when a user types an invalid date string and clicks away (blur),
 * flatpickr and Form.io silently clear the input with no validation feedback.
 *
 * Fix:
 *  - setValueAt() captures the raw DOM text into this._rawInput before Form.io
 *    converts or discards it.
 *  - updateValue() intercepts the "empty value after typed input" scenario:
 *    restores the raw text to the visible DOM input (via rAF, after flatpickr
 *    finishes its own reset), attaches an inline error via setCustomValidity(),
 *    emits a componentError event, and returns false to abort Form.io's clear
 *    of the stored field value.
 *  - attach() wires native input/focus listeners for real-time _rawInput
 *    tracking and error-state reset when the user re-focuses to correct input.
 */

export function createDateTimeOverrideClass(DateTimeBase: any) {
  return class CustomDateTime extends DateTimeBase {
    /** Raw text the user typed, captured before flatpickr / Form.io processes it. */
    _rawInput: string = ''

    /** True while an invalid-input error is currently displayed. */
    _hasInvalidInput: boolean = false

    /** Cleanup references for event listeners added in attach(). */
    _dtListenerCleanup: (() => void) | null = null

    // ── attach ──────────────────────────────────────────────────────────────

    attach(element: HTMLElement) {
      const result = super.attach(element)

      // Locate the human-readable visible input (flatpickr altInput preferred).
      const findVisibleInput = (): HTMLInputElement | null =>
        element.querySelector<HTMLInputElement>('.flatpickr-input.form-control') ??
        element.querySelector<HTMLInputElement>('input.form-control') ??
        element.querySelector<HTMLInputElement>('input[type="text"]') ??
        null

      const onInput = () => {
        const inp = findVisibleInput()
        if (inp) this._rawInput = inp.value
      }

      const onFocus = () => {
        // When the user re-focuses to correct input, reset error state so they
        // get a clean slate — the next blur will re-validate.
        this._rawInput = ''
        if (this._hasInvalidInput) {
          this._hasInvalidInput = false
          this.setCustomValidity('', false)
        }
      }

      // Schedule listener attachment after flatpickr's own listeners are wired.
      const scheduleId = setTimeout(() => {
        const inp = findVisibleInput()
        if (!inp) return
        inp.addEventListener('input', onInput, { capture: true })
        inp.addEventListener('focus', onFocus, { capture: true })
        this._dtListenerCleanup = () => {
          inp.removeEventListener('input', onInput, { capture: true } as any)
          inp.removeEventListener('focus', onFocus, { capture: true } as any)
        }
      }, 0)

      ;(this as any).__dtScheduleId = scheduleId

      return result
    }

    // ── setValueAt ───────────────────────────────────────────────────────────

    /**
     * Capture the raw visible DOM value into this._rawInput BEFORE Form.io
     * converts the flatpickr date into the storage format.  This runs on every
     * flatpickr change event (calendar pick OR manual type).
     */
    setValueAt(index: number, value: any, flags?: any) {
      try {
        // Query all candidate inputs: flatpickr's altInput comes first, then
        // any generic form-control inputs.
        const inputs = this.element?.querySelectorAll(
          '.flatpickr-input, input.form-control, input[type="text"]',
        ) as NodeListOf<HTMLInputElement> | undefined
        if (inputs) {
          for (const inp of Array.from(inputs)) {
            const v = (inp as HTMLInputElement).value?.trim()
            if (v) {
              this._rawInput = (inp as HTMLInputElement).value
              break
            }
          }
        }
      } catch {
        // DOM may not be ready; _rawInput retains its last known value.
      }
      return super.setValueAt(index, value, flags)
    }

    // ── updateValue ──────────────────────────────────────────────────────────

    /**
     * Main interception point.
     *
     * When Form.io is about to commit an empty/null value AND the user had
     * previously typed something (this._rawInput is non-empty), we:
     *   1. Restore the raw typed text to the visible DOM input via rAF so it
     *      runs after flatpickr's own synchronous DOM reset.
     *   2. Attach an inline validation error via setCustomValidity().
     *   3. Emit a 'componentError' event so consumers can react.
     *   4. Return false to abort Form.io's clear of the stored field value.
     *
     * For valid (non-empty) incoming values the method delegates to super and
     * clears any prior invalid-input error.
     */
    updateValue(value: any, flags?: any) {
      const isEmpty = value === null || value === undefined || value === ''

      if (isEmpty && this._rawInput && this._rawInput.trim()) {
        const raw = this._rawInput

        // Restore the typed text after flatpickr's synchronous DOM reset.
        requestAnimationFrame(() => {
          const inp = this.element?.querySelector(
            '.flatpickr-input.form-control, input.form-control, input[type="text"]',
          ) as HTMLInputElement | null | undefined
          // Only restore if flatpickr already cleared the input (value is '').
          if (inp && !inp.value) {
            inp.value = raw
          }
        })

        const msg =
          this.component?.validate?.customMessage ||
          'Invalid date. Please enter a date in the correct format.'

        this.setCustomValidity(msg, true)
        this._hasInvalidInput = true

        this.emit('componentError', {
          component: this.component,
          message: msg,
          instance: this,
        })

        // Return false: Form.io will NOT clear the stored value.
        return false
      }

      // Non-empty value — clear any prior invalid-input error, then delegate.
      if (!isEmpty) {
        this._rawInput = ''
        if (this._hasInvalidInput) {
          this._hasInvalidInput = false
          this.setCustomValidity('', false)
        }
      }

      return super.updateValue(value, flags)
    }

    // ── destroy ──────────────────────────────────────────────────────────────

    destroy() {
      if ((this as any).__dtScheduleId != null) {
        clearTimeout((this as any).__dtScheduleId)
        ;(this as any).__dtScheduleId = null
      }
      this._dtListenerCleanup?.()
      this._dtListenerCleanup = null
      super.destroy()
    }
  }
}

export default createDateTimeOverrideClass
