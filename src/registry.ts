export interface RegistryConfig {
  formsListUrl?: string
  bootstrapCssUrl?: string
  formioCssUrl?: string
}

let _config: RegistryConfig = {}

export function configure(config: RegistryConfig): void {
  _config = { ..._config, ...config }
  if (typeof window !== 'undefined') {
    ; (window as unknown as { __formioConfig?: RegistryConfig }).__formioConfig = {
      bootstrapCssUrl: _config.bootstrapCssUrl ?? '/api/bootstrap-css',
      formioCssUrl: _config.formioCssUrl ?? '/api/formio-css',
    }
  }
}

/** Returns the forms list URL set via configure() or registerCustomComponents(options). Consumer app provides this. */
export function getFormsListUrl(): string {
  return _config.formsListUrl ?? ''
}

const APP_DETAIL_REF_TYPE = 'appDetailRef'

type FormsListResponse = {
  docs?: Array<Record<string, unknown> & { id?: number | string; title?: string; slug?: string }>
}

/**
 * On App Detail Ref edit: fetch forms from getFormsListUrl(), set __appDetailRefFormsCache, fill Form dropdown.
 * Consumer app passes URL via configure() or registerCustomComponents({ formsListUrl }). Call after builder.ready.
 */
export function setupAppDetailRefFormDropdown(instance: Record<string, unknown>): void {
  const url = getFormsListUrl()
  if (!url?.trim()) return

  const inst = instance as {
    on?: (event: string, fn: (c: Record<string, unknown>) => void) => void
    editForm?: {
      getComponent?: (key: string) => { component?: Record<string, unknown>; updateItems?: () => void }
      on?: (event: string, fn: (v: unknown) => void) => void
    }
    redraw?: () => void
  }

  inst.on?.('editComponent', (component: Record<string, unknown>) => {
    if (component?.type !== APP_DETAIL_REF_TYPE) return
    requestAnimationFrame(async () => {
      try {
        if (!inst.editForm?.getComponent) return
        const listUrl = `${url}${url.includes('?') ? '&' : '?'}limit=500`
        const raw = (await fetch(listUrl).then((r) => r.json())) as FormsListResponse
        if (typeof window !== 'undefined') {
          ; (window as unknown as { __appDetailRefFormsCache?: FormsListResponse }).__appDetailRefFormsCache = raw
          try {
            if ((window as Window & { top?: Window }).top)
              ((window as Window & { top?: Window }).top as unknown as { __appDetailRefFormsCache?: FormsListResponse }).__appDetailRefFormsCache = raw
          } catch (_) { }
        }
        const docs = raw?.docs ?? []
        const values = docs.map((d) => {
          const title = (d.title as string) ?? String(d.id ?? '')
          const slug = typeof d.slug === 'string' ? d.slug : ''
          return { value: String(d.id), label: slug ? `${title} (${slug})` : title }
        })
        const selectComp = inst.editForm.getComponent('selectedFormId')
        if (selectComp?.component) {
          const comp = selectComp.component
          if (!comp.data) comp.data = {}
            ; (comp.data as Record<string, unknown>).values = values
          selectComp.updateItems?.()
        }
        const editingComp = component as Record<string, unknown>
        const docIds = new Set(docs.map((d) => String(d.id)))

        // Render form preview into the dialog's preview container (dialog preview is a separate
        // instance; inst.redraw() does not re-run its attach(), so we update the DOM directly).
        const renderDialogPreview = (id: string | undefined) => {
          if (typeof document === 'undefined') return
          const previewEl = document.querySelector('.formio-dialog .app-detail-ref-preview-inner') as HTMLElement | null
          if (!previewEl) return
          previewEl.innerHTML = ''
          if (!id) {
            previewEl.textContent = 'App Detail Ref (select a form)'
            return
          }
          const doc = docs.find((d: Record<string, unknown>) => String(d.id) === String(id)) ?? null
          const docSchema = doc?.schema as { display?: string; components?: unknown[] } | undefined
          const components = Array.isArray(docSchema?.components) ? docSchema.components : []
          if (components.length > 0) {
            const win2 = typeof window !== 'undefined' ? (window as unknown as { Formio?: { createForm?: (el: HTMLElement, s: unknown, o: unknown) => Promise<unknown> }; top?: { Formio?: { createForm?: (el: HTMLElement, s: unknown, o: unknown) => Promise<unknown> } } }) : undefined
            const F = win2?.top?.Formio ?? win2?.Formio
            const createFn = F?.createForm
            if (typeof createFn === 'function') {
              const schema = { display: String(docSchema?.display || 'form'), components }
              const result = createFn(previewEl, schema, { readOnly: true }) as Promise<unknown>
              if (result?.catch) result.catch(() => { previewEl.textContent = 'Could not load preview.' })
            } else {
              const title = String((doc as Record<string, unknown>)?.title ?? id)
              previewEl.textContent = `Form: ${title} (${components.length} field${components.length !== 1 ? 's' : ''})`
            }
          } else {
            const title = String((doc as Record<string, unknown>)?.title ?? id)
            previewEl.textContent = `Form: ${title} (no fields)`
          }
        }

        const runWhenPreviewReady = (id: string | undefined) => {
          const maxFrames = 4
          const tryRender = (frame = 0) => {
            if (document.querySelector('.formio-dialog .app-detail-ref-preview-inner')) {
              renderDialogPreview(id)
              return
            }
            if (frame < maxFrames) requestAnimationFrame(() => tryRender(frame + 1))
          }
          requestAnimationFrame(() => tryRender(0))
        }

        const onDropdownChange = (id: string | undefined) => {
          editingComp.selectedFormId = id
          renderDialogPreview(id)
          inst.redraw?.()
        }
        inst.editForm.on?.('change', (value: unknown) => {
          const id = (value as Record<string, unknown>)?.selectedFormId as string | undefined
          if (id !== undefined) onDropdownChange(id)
        })
        requestAnimationFrame(() => {
          const dialogEl =
            typeof document !== 'undefined'
              ? document.querySelector('.formio-dialog') ?? document.querySelector('[class*="formio-builder"]') ?? document.body
              : null
          if (dialogEl) {
            for (const sel of dialogEl.querySelectorAll?.('select') ?? []) {
              const select = sel as HTMLSelectElement
              if (Array.from(select.options).some((o) => docIds.has(o.value))) {
                if (!(select as HTMLElement).dataset.appDetailRefListener) {
                  ; (select as HTMLElement).dataset.appDetailRefListener = '1'
                  select.addEventListener('change', () => onDropdownChange(select.value || undefined))
                }
                break
              }
            }
          }
          const currentId = (editingComp.selectedFormId as string) || undefined
          runWhenPreviewReady(currentId)
          inst.redraw?.()
        })
      } catch {
        // fetch or edit form not ready
      }
    })
  })

  inst.on?.('saveComponent', () => {
    // This fires after the user clicks Save in the edit dialog
    // and the component schema is actually updated
    requestAnimationFrame(() => {
      inst.redraw?.()
    })
  })

}

/**
 * Ensures a wizard schema has at least one panel so the Form.io builder shows
 * the page tabs (Page 1, Page 2, …) and the "+ PAGE" button. Call this before
 * passing the schema to FormBuilder when display is 'wizard'.
 * POC / working example: wizard works because either the schema already had
 * panels or the builder was given a schema with at least one panel.
 */
export function ensureWizardSchema(schema: Record<string, unknown>): Record<string, unknown> {
  if (schema?.display !== 'wizard') return schema
  const components = schema.components
  if (Array.isArray(components) && components.length > 0) return schema
  return {
    ...schema,
    components: [{ type: 'panel', title: 'Page 1', components: [] }],
  }
}

/**
 * Register custom Form.io components. Optionally pass config (e.g. formsListUrl) here so the URL
 * is set where the builder is used — no static default; the app provides the URL.
 */
export async function registerCustomComponents(options?: RegistryConfig): Promise<unknown> {
  if (options) _config = { ..._config, ...options }

  const FormioModule = await import('formiojs')
  const Formio = (FormioModule as { default?: unknown }).default ?? FormioModule

  if (typeof window !== 'undefined') (window as unknown as { Formio?: unknown }).Formio = Formio
  if (typeof globalThis !== 'undefined') (globalThis as unknown as { Formio?: unknown }).Formio = Formio

  if (Formio && typeof Formio === 'object' && (Formio as { Components?: { setComponent?: unknown; components?: { component?: unknown } } }).Components?.setComponent) {
    const Components = (Formio as { Components: { components: { component: unknown }; setComponent: (key: string, cls: unknown) => void } }).Components
    const BaseComponent = Components.components.component as new (
      c: unknown,
      o: unknown,
      d: unknown
    ) => {
      component: unknown
      element?: HTMLElement
      init(): void
      render(html: string): unknown
      attach(el: HTMLElement): void
      getValue(): unknown
      setValue(v: unknown): void
    }

    const { AppDetailRefComponent } = await import('./components/AppDetailRef')
    const { getFormSchemaForPreview } = await import('./utils/formio-app-detail-ref-logic')

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const AppDetailRef = class extends (BaseComponent as any) {
      static schema(overrides?: any) {
        return AppDetailRefComponent.schema(overrides)
      }

      static get builderInfo() {
        return AppDetailRefComponent.builderInfo
      }

      static editForm() {
        return AppDetailRefComponent.editForm()
      }

      constructor(component: any, options: any, data: any) {
        super(component, options, data)
      }

      init() {
        super.init()
      }

      render() {
        return super.render('')
      }

      attach(element: HTMLElement) {
        super.attach(element)
        const selectedId = this.component.selectedFormId
        const el = this.element as HTMLElement | undefined
        if (!el) return
        const win = typeof window !== 'undefined' ? (window as any) : undefined
        const cache = (win?.__appDetailRefFormsCache ?? win?.top?.__appDetailRefFormsCache) as { docs?: Array<Record<string, unknown>> } | undefined
        const docs = cache?.docs ?? []
        const doc = selectedId ? (docs.find((d: any) => String(d.id) === String(selectedId)) ?? null) : null
        const schema = getFormSchemaForPreview(doc)
        if ((this as any)._previewFormInstance?.destroy) {
          try { (this as any)._previewFormInstance.destroy() } catch (_) { }
          ; (this as any)._previewFormInstance = undefined
        }
        let container = el.querySelector('.app-detail-ref-preview-inner') as HTMLElement | null
        if (!container || !container.parentNode) {
          container = document.createElement('div')
          container.className = 'app-detail-ref-preview-inner'
          el.appendChild(container)
        }
        container.innerHTML = ''
        const renderForm = (formSchema: { display: string; components: unknown[] }, readOnly: boolean) => {
          if (!container?.parentNode) return
          const FormioLib = win?.Formio ?? win?.top?.Formio ?? (Formio as any)
          const createFormFn = 
          FormioLib?.createForm ?? 
          FormioLib?.GlobalFormio?.createForm ??
          FormioLib?.default?.createForm ??
          FormioLib?.Formio?.createForm
          if (typeof createFormFn !== 'function') {
            import('formiojs').then((mod: any) => {
              const F = mod?.default ?? mod?.Formio
              const fn = F?.createForm ?? F?.GlobalFormio?.createForm
              if (typeof fn !== 'function') return
              if (!container?.parentNode) return
              fn(container, formSchema, { readOnly })
                .then((instance: { destroy?: () => void }) => { (this as any)._previewFormInstance = instance })
                .catch(() => { container!.textContent = 'Could not load.' })
            }).catch(() => { container!.textContent = 'Not available.' })
            return
          }
          createFormFn(container, formSchema, { readOnly })
            .then((instance: { destroy?: () => void }) => { (this as any)._previewFormInstance = instance })
            .catch(() => { container!.textContent = 'Could not load.' })
        }

        if (schema.components.length > 0) {
          renderForm(schema, true)
          return
        }
        if (selectedId) {
          container.textContent = 'Loading...'
          const apiUrl = getFormsListUrl()
          // Fetch the INDIVIDUAL form by ID, not the entire list
          const formUrl = `${apiUrl}/${selectedId}`
          fetch(formUrl)
            .then((r: any) => r.json())
            .then((doc: Record<string, unknown>) => {
              if (!doc || typeof doc !== 'object') {
                container!.textContent = `App Detail Ref → ${selectedId}`
                return
              }
              // Update cache with this doc
              if (typeof win !== 'undefined') {
                const existing = win.__appDetailRefFormsCache as { docs?: Array<Record<string, unknown>> } | undefined
                if (existing?.docs) {
                  const idx = existing.docs.findIndex((d: any) => String(d.id) === String(selectedId))
                  if (idx >= 0) existing.docs[idx] = doc
                  else existing.docs.push(doc)
                }
              }
              const fetchedSchema = getFormSchemaForPreview(doc)
              if (!container!.parentNode) return
              container!.innerHTML = ''
              if (fetchedSchema.components.length > 0) {
                renderForm(fetchedSchema, true)
              } else {
                container!.textContent = `App Detail Ref → ${selectedId}`
              }
            })
            .catch(() => {
              container!.textContent = `App Detail Ref → ${selectedId}`
            })
          return
        }

        container.textContent = 'App Detail Ref (select a form)'
      }

      getValue() {
        return null
      }

      setValue() { }
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */

    Components.setComponent('appDetailRef', AppDetailRef)
  }

  // Wrap FormBuilder so wizard schema always has at least one panel (Page 1, + PAGE). Formio.FormBuilder is
  // read-only (getter-only), so we use defineProperty; if that fails, app must use createFormBuilder() instead.
  const OriginalFormBuilder = (Formio as { FormBuilder?: new (c: unknown, s: Record<string, unknown>, o?: unknown) => unknown })?.FormBuilder
  if (OriginalFormBuilder) {
    const FormBuilderWrapper = function (container: unknown, schema: unknown, options?: unknown) {
      const schemaObj =
        schema && typeof schema === 'object' ? (schema as Record<string, unknown>) : { display: 'form', components: [] }
      const safeSchema = ensureWizardSchema(schemaObj)
      const formBuilder = new OriginalFormBuilder(container, safeSchema, options) as { ready: Promise<Record<string, unknown>> }
      const url = getFormsListUrl()
      if (url?.trim()) {
        const originalReady = formBuilder.ready
        formBuilder.ready = originalReady.then((instance) => {
          setupAppDetailRefFormDropdown(instance)
          return instance
        }) as typeof formBuilder.ready
      }
      return formBuilder
    }
    try {
      Object.defineProperty(Formio, 'FormBuilder', {
        value: FormBuilderWrapper,
        writable: true,
        configurable: true,
        enumerable: true,
      })
    } catch {
      // Formio may be frozen or FormBuilder non-configurable; app should use createFormBuilder() instead
    }
  }

  return Formio
}

/**
 * Use this when Formio.FormBuilder cannot be patched (read-only). Creates the builder with wizard schema fixed
 * so Page 1 and "+ PAGE" show. Same as: new Formio.FormBuilder(container, ensureWizardSchema(schema), options)
 */
export function createFormBuilder(
  FormioInstance: { FormBuilder: new (c: unknown, s: Record<string, unknown>, o?: unknown) => unknown },
  container: unknown,
  schema: Record<string, unknown>,
  options?: unknown
): InstanceType<(typeof FormioInstance)['FormBuilder']> {
  const safeSchema = ensureWizardSchema(schema)
  return new FormioInstance.FormBuilder(container, safeSchema, options) as InstanceType<
    (typeof FormioInstance)['FormBuilder']
  >
}

export function getBuilderConfig(overrides?: Record<string, unknown>): Record<string, unknown> {
  return {
    template: 'bootstrap',
    builder: {
      basic: {
        default: true,
        components: {
          textfield: true,
          textarea: true,
          number: true,
          password: true,
          checkbox: true,
          email: true,
          select: true,
          radio: true,
          button: true,
          currency: true,
          datetime: true,
          appDetailRef: true,
        },
      },
      advanced: false,
      layout: {
        default: true,
        components: {
          htmlelement: true,
          content: true,
          columns: true,
          panel: true,
          well: true,
        },
      },
      data: { default: false },
      premium: false,
    },
    ...overrides,
  }
}
