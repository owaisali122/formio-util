/**
 * Runtime App Detail Reference component for Form.io renderer.
 *
 * Based on portal POC implementation:
 * C:\Projects\HI-POC-1\public\medquest_kolea\app\components\formio\custom-components\AppDetailRefFormIO.ts
 *
 * This component:
 * - Fetches a target form by ID from `formApiBasePath` (default `/api/forms`).
 * - Renders the embedded form inside this component.
 * - Synchronizes embedded submission data with this component's value.
 */

export const APP_DETAIL_REF_RUNTIME_TYPE = 'appDetailRefRuntime' as const

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createAppDetailRefRuntimeClass(FieldComponent: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return class AppDetailRefRuntime extends FieldComponent {
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
        type: APP_DETAIL_REF_RUNTIME_TYPE,
        label: 'App Detail Reference',
        key: 'appDetailRef',
        input: true,
        hideLabel: true,
        selectedFormId: null,
        formApiBasePath: '/api/forms',
        ...overrides,
      })
    }

    constructor(component: any, options: any, data: any) {
      super(component, options, data)
      this.component.hideLabel = true
    }

    static get builderInfo() {
      return {
        title: 'App Detail Reference',
        group: 'advanced',
        icon: 'list-alt',
        weight: 190,
        schema: AppDetailRefRuntime.schema(),
      }
    }

    get defaultSchema() {
      return AppDetailRefRuntime.schema()
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

    checkValidity(data: any, dirty?: boolean, row?: any, silentCheck?: boolean) {
      if (this.embeddedForm && typeof this.embeddedForm.checkValidity === 'function') {
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
        <div class="app-detail-ref-container" ref="container">
          <div class="app-detail-ref-placeholder" ref="placeholder">Loading...</div>
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

      const basePath = this.component?.formApiBasePath || '/api/forms'
      const origin = typeof window !== 'undefined' ? window.location?.origin ?? '' : ''
      const apiUrl = `${origin}${basePath}/${formId}`

      fetch(apiUrl)
        .then((res) => {
          if (!res.ok) throw new Error(`Form ${formId} not found`)
          return res.json()
        })
        .then((formResponse) => {
          const schema = formResponse?.schema ?? formResponse
          if (!schema || typeof schema !== 'object') {
            this.showError('Invalid form schema.')
            return null
          }
          const schemaClone = JSON.parse(JSON.stringify(schema))
          return Formio.createForm(placeholder, schemaClone, {
            readOnly: this.options?.readOnly ?? false,
            noAlerts: true,
            form: schemaClone,
          })
        })
        .then(async (form: any) => {
          if (!form) return
          this.embeddedForm = form
          ;(form as any)._formSchema = form.component ?? form.root?.component
          if (form.ready) await form.ready

          const key = this.component?.key
          const existingData =
            this._pendingValue ??
            (key && this.root?.data?.[key]) ??
            (key && this.data?.[key])

          if (existingData != null && typeof existingData === 'object' && form.setSubmission) {
            form.setSubmission({ data: existingData }, { noValidate: true })
          }
          this._pendingValue = undefined

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
      err.className = 'alert alert-danger app-detail-ref-error'
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

