/**
 * Runtime Referenced Form component for Form.io renderer.
 * (Formerly named "App Detail Reference".)
 *
 * This component:
 * - Fetches a target form by ID using the endpoint configured in the Data Source tab.
 * - Renders the embedded form inside this component.
 * - Synchronizes embedded submission data with this component's value.
 */

export const REFERENCED_FORM_RUNTIME_TYPE = 'appDetailRefRuntime' as const

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createReferencedFormRuntimeClass(FieldComponent: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return class ReferencedFormRuntime extends FieldComponent {
    // Keep a reference to the embedded form instance and any pending value
    // that should be applied once the embedded form is ready.
    // NOTE: These are public so that DTS build can emit types for this
    // exported anonymous class without TS4094 errors.
    embeddedForm: any = null
    _pendingValue: any = undefined

    // Match the POC schema, but use a distinct runtime type so builder
    // configuration remains separate.
    static schema(overrides?: any) {
      return FieldComponent.schema({
        type: REFERENCED_FORM_RUNTIME_TYPE,
        label: 'Referenced Form',
        key: 'appDetailRef',
        input: true,
        hideLabel: true,
        selectedFormId: null,
        hidden: false,
        autofocus: false,
        hideNestedWizardNavigation: false,
        // data source configuration (from designer)
        apiType: 'custom',
        apiEndpoint: '',
        apiMethod: 'GET',
        dataPath: 'schema',
        authType: 'basic',
        authUsername: '',
        authPassword: '',
        partnerId: '',
        ...overrides,
      })
    }

    constructor(component: any, options: any, data: any) {
      super(component, options, data)
      this.component.hideLabel = true
    }

    static get builderInfo() {
      return {
        title: 'Referenced Form',
        group: 'advanced',
        icon: 'list-alt',
        weight: 190,
        schema: ReferencedFormRuntime.schema(),
      }
    }

    get defaultSchema() {
      return ReferencedFormRuntime.schema()
    }

    get selectedFormId(): number | null {
      const id = this.component?.selectedFormId
      if (id == null) return null
      const n = Number(id)
      return Number.isNaN(n) ? null : n
    }

    getFormio(): any {
      return typeof window !== 'undefined' ? (window as any).Formio ?? null : null
    }

    getValue() {
      if (this.embeddedForm?.submission) {
        return this.embeddedForm.submission.data
      }
      return super.getValue()
    }

    setValue(value: any, flags?: any) {
      if (value != null && value !== '') this._pendingValue = value
      if (this.embeddedForm?.setSubmission && value != null) {
        this.embeddedForm.setSubmission({ data: value }, flags)
        this._pendingValue = undefined
      }
      return super.setValue(value, flags)
    }

    // ---------------------------------------------------------------------------
    // Wizard-in-wizard navigation helpers
    // Used by FormIORenderWithSlug when the parent form is also a wizard.
    // See: FormIORenderWithSlug.tsx → findActiveReferencedWizardsOnPage
    // ---------------------------------------------------------------------------

    /** Returns true if the embedded form is a wizard (has multiple navigable pages). */
    isReferencedWizard(): boolean {
      return Array.isArray(this.embeddedForm?.pages) && this.embeddedForm.pages.length > 0
    }

    /**
     * Returns true if this component is currently visible and has an active embedded wizard.
     * Used to skip hidden or conditionally-invisible referenced wizards (Case 7).
     */
    isReferencedWizardVisible(): boolean {
      if (!this.isReferencedWizard()) return false
      return (this as any).visible !== false
    }

    /**
     * Validates only the current step of the embedded wizard.
     * Called by the parent wizard Next handler (Case 8) so that only the current
     * nested step is checked — later steps have not been filled yet and must not block.
     */
    validateReferencedCurrentStep(dirty = true): boolean {
      const wizard = this.embeddedForm
      if (!wizard) return true
      const page = wizard.page ?? 0
      const currentPanel = Array.isArray(wizard.pages) ? wizard.pages[page] : null
      const subData = wizard.submission?.data ?? {}
      let valid: boolean
      if (currentPanel && typeof currentPanel.checkValidity === 'function') {
        valid = currentPanel.checkValidity(subData, dirty, subData, false)
      } else {
        valid = (wizard.checkValidity?.(subData, dirty, subData, false) ?? true) !== false
      }
      if (!valid) {
        this.setCustomValidity('Please complete the required fields in this step.', dirty)
        if (typeof wizard.showErrors === 'function') wizard.showErrors()
      } else {
        this.setCustomValidity('')
      }
      return valid
    }

    /** Navigates the embedded wizard forward by one step (no-op when on last step). */
    goToReferencedNextStep(): void {
      if (this.embeddedForm && typeof this.embeddedForm.nextPage === 'function') {
        this.embeddedForm.nextPage()
      }
    }

    /** Navigates the embedded wizard backward by one step (no-op when on first step). */
    goToReferencedPreviousStep(): void {
      if (this.embeddedForm && typeof this.embeddedForm.prevPage === 'function') {
        this.embeddedForm.prevPage()
      }
    }

    /** Returns true if the embedded wizard is currently on its first step (Case 9). */
    isReferencedFirstStep(): boolean {
      return (this.embeddedForm?.page ?? 0) === 0
    }

    /** Returns true if the embedded wizard is currently on its last step (Case 10). */
    isReferencedLastStep(): boolean {
      const wizard = this.embeddedForm
      if (!wizard) return true
      const page = wizard.page ?? 0
      const total = Array.isArray(wizard.pages) ? wizard.pages.length : 1
      return page >= total - 1
    }

    checkValidity(data: any, dirty?: boolean, row?: any, silentCheck?: boolean) {
      if (this.embeddedForm && typeof this.embeddedForm.checkValidity === 'function') {
        // Case 1 – Wizard-in-wizard: validate ONLY the current nested step.
        // The parent wizard navigates step-by-step, so validating the whole embedded
        // wizard would fail before the user reaches later steps.
        // This only applies when the root (parent) form is itself a wizard.
        if (this.isReferencedWizard() && Array.isArray((this as any).root?.pages)) {
          return this.validateReferencedCurrentStep(!!dirty)
        }
        // Case 2/3/4 – non-wizard embedded form, or wizard inside a non-wizard parent:
        // validate the entire embedded form as before.
        const subData = this.embeddedForm.submission?.data ?? {}
        const valid = this.embeddedForm.checkValidity(subData, true, subData)
        if (!valid) {
          this.setCustomValidity('Please complete the required fields below.', !!dirty)
          if (this.embeddedForm.showErrors) this.embeddedForm.showErrors()
        } else {
          this.setCustomValidity('')
        }
        return valid
      }
      return super.checkValidity(data, dirty, row, silentCheck)
    }

    render() {
      return super.render(`
        <div class="referenced-form-container" ref="container">
          <div class="referenced-form-placeholder" ref="placeholder">Loading...</div>
        </div>
      `)
    }

    attach(element: HTMLElement) {
      const result = super.attach(element)
      this.loadRefs(element, { container: 'single', placeholder: 'single' })

      if (this.embeddedForm?.destroy) {
        this.embeddedForm.destroy()
        this.embeddedForm = null
      }

      const formId = this.selectedFormId
      if (!formId) {
        this.showError('No form selected.')
        return result
      }

      const container = this.refs?.container as HTMLElement | undefined
      const placeholder = this.refs?.placeholder as HTMLElement | undefined
      if (!container || !placeholder) return result

      const Formio = this.getFormio()
      if (!Formio?.createForm) {
        this.showError('Formio not available.')
        return result
      }

      // Build the API URL from the designer's Data Source tab
      const apiEndpoint = this.component?.apiEndpoint?.trim()
      if (!apiEndpoint) {
        this.showError('No API endpoint configured. Set one in the Data Source tab.')
        return result
      }
      const origin = typeof window !== 'undefined' ? window.location?.origin ?? '' : ''
      const apiUrl = `${origin}${apiEndpoint}/${formId}`
      const httpMethod: string = (this.component?.apiMethod || 'GET').toUpperCase()

      // Build fetch options from designer data source configuration
      const fetchOptions: RequestInit = { method: httpMethod }
      const apiType: string = this.component?.apiType || 'custom'

      if (apiType === 'secure') {
        const headers: Record<string, string> = {}
        const authType: string = this.component?.authType || ''
        if (authType === 'basic') {
          const username: string = this.component?.authUsername || ''
          const password: string = this.component?.authPassword || ''
          if (username) {
            headers['Authorization'] = `Basic ${btoa(`${username}:${password}`)}`
          }
        }
        const partnerId: string = this.component?.partnerId || ''
        if (partnerId) {
          headers['partner-id'] = partnerId
        }
        if (Object.keys(headers).length > 0) {
          fetchOptions.headers = headers
        }
      }

      // Resolve the data path for extracting the form schema from the response
      const dataPath: string = this.component?.dataPath || 'schema'

      fetch(apiUrl, fetchOptions)
        .then((res) => {
          if (!res.ok) throw new Error(`Form ${formId} not found`)
          return res.json()
        })
        .then((formResponse) => {
          // Navigate the response using the configured dataPath (dot-notation)
          let schema = formResponse
          if (dataPath) {
            for (const key of dataPath.split('.')) {
              schema = schema?.[key]
              if (schema === undefined) break
            }
          }
          // Fallback to the full response if dataPath resolved to nothing
          if (schema === undefined || schema === null) {
            schema = formResponse
          }
          if (!schema || typeof schema !== 'object') {
            this.showError('Invalid form schema.')
            return null
          }
          const schemaClone = JSON.parse(JSON.stringify(schema))

          // Determine if nested wizard navigation should be hidden.
          // Explicit per-component flag takes priority; falls back to auto-detection
          // only when the property is undefined (old forms without the setting).
          const embeddedDisplay: string = schemaClone?.display ?? 'form'
          const parentIsWizard = Array.isArray((this as any).root?.pages)
          const hideNavSetting = this.component?.hideNestedWizardNavigation
          const hideNav: boolean =
            hideNavSetting === true ||
            (hideNavSetting == null && parentIsWizard && embeddedDisplay === 'wizard')
          const createFormOpts: Record<string, any> = {
            readOnly: this.options?.readOnly ?? false,
            noAlerts: true,
            form: schemaClone,
            sanitize: false,
            sanitizeConfig: {
              addAttr: ['onclick', 'onchange', 'style', 'target'],
              addTags: ['iframe'],
              FORCE_BODY: true,
              ADD_ATTR: ['onclick', 'onchange', 'style', 'target'],
              ALLOW_UNKNOWN_PROTOCOLS: true,
            },
          }
          if (hideNav && embeddedDisplay === 'wizard') {
            createFormOpts.buttonSettings = {
              showPrevious: false,
              showNext: false,
              showCancel: false,
              showSubmit: false,
            }
            createFormOpts.breadcrumbSettings = { clickable: false }
            createFormOpts.allowPrevious = false
          }

          return Formio.createForm(placeholder, schemaClone, createFormOpts)
        })
        .then(async (form: any) => {
          if (!form) return
          this.embeddedForm = form
          ;(form as any)._formSchema = form.component ?? form.root?.component
          if (form.ready) await form.ready

          // Expose a global helper so inline onclick handlers in htmlelement
          // components can find the correct (nested) form instance by walking
          // up the DOM from the clicked element.
          if (typeof window !== 'undefined') {
            ;(window as any).__getClosestFormioForm = (el: HTMLElement) => {
              const Fio = (window as any).Formio
              if (!Fio?.forms) return null
              let current: HTMLElement | null = el
              while (current) {
                if (current.id && Fio.forms[current.id]) return Fio.forms[current.id]
                current = current.parentElement
              }
              // Fallback: last registered form (most likely the nested one)
              const keys = Object.keys(Fio.forms)
              return keys.length > 0 ? Fio.forms[keys[keys.length - 1]] : null
            }
          }

          // Apply CSS class to hide wizard header/tablist when navigation is suppressed
          const embeddedDisplay: string = (form as any)._form?.display ?? form.display ?? ''
          const hideNavSetting = this.component?.hideNestedWizardNavigation
          const hideNav: boolean =
            hideNavSetting === true ||
            (hideNavSetting == null && Array.isArray((this as any).root?.pages) && embeddedDisplay === 'wizard')
          if (hideNav && embeddedDisplay === 'wizard') {
            container.classList.add('referenced-form--hide-wizard-nav')
          }

          const key = this.component?.key
          const existingData =
            this._pendingValue ??
            (key && this.root?.data?.[key]) ??
            (key && this.data?.[key])

          if (existingData != null && typeof existingData === 'object' && form.setSubmission) {
            await form.setSubmission({ data: existingData }, { noValidate: true })
          }
          this._pendingValue = undefined

          requestAnimationFrame(() => {
            // Apply initial focus if configured.
            if (this.component?.autofocus) {
              const firstInput = placeholder.querySelector('input, select, textarea') as HTMLElement | null
              if (firstInput) firstInput.focus()
            }

            const payload = {
              component: this,
              embeddedForm: form,
              key: this.component?.key,
            }
            const eventTarget =
              this.root && typeof (this.root as any).emit === 'function'
                ? (this.root as any)
                : this
            eventTarget.emit('referencedFormReady', payload)
          })

          form.on('change', () => {
            const key = this.component?.key
            if (!key || !this.root?.data) return
            const subData = this.embeddedForm?.submission?.data
            if (subData == null) return
            this.root.data[key] = subData
            this.triggerChange()
          })
        })
        .catch((err: any) => {
          this.showError(err?.message ?? 'Failed to load form.')
        })

      return result
    }

    showError(message: string) {
      const container = this.refs?.container as HTMLElement | undefined
      if (!container) return
      const err = document.createElement('div')
      err.className = 'alert alert-danger referenced-form-error'
      err.textContent = message
      container.innerHTML = ''
      container.appendChild(err)
    }

    destroy() {
      if (this.embeddedForm && typeof this.embeddedForm.destroy === 'function') {
        try {
          this.embeddedForm.destroy()
        } catch {
          // ignore
        }
        this.embeddedForm = null
      }
      super.destroy()
    }
  }
}

