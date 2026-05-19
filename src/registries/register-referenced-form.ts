import type { FormioComponents } from './types'

const REFERENCED_FORM_TYPE = 'appDetailRef'

type FormsListResponse = {
  docs?: Array<Record<string, unknown> & { id?: number | string; title?: string; slug?: string }>
}

// ─── Module-level fetch dedup cache ───────────────────────────────────────────
const _individualFetchCache = new Map<string, Promise<Record<string, unknown>>>()

/**
 * Fetch a single form by ID using the given base endpoint.
 * Returns the SAME in-flight promise if a request is already running,
 * so concurrent attach() calls don't duplicate the fetch.
 * Result is also written into __referencedFormFormsCache so the next attach()
 * finds the doc in cache and skips the network entirely.
 */
function fetchFormById(id: string, baseEndpoint: string): Promise<Record<string, unknown>> {
  const cacheKey = `${baseEndpoint}/${id}`
  if (_individualFetchCache.has(cacheKey)) {
    return _individualFetchCache.get(cacheKey)!
  }
  const formUrl = `${baseEndpoint}/${id}`
  const promise = fetch(formUrl)
    .then((r) => r.json())
    .then((doc: Record<string, unknown>) => {
      const win = typeof window !== 'undefined' ? (window as any) : undefined
      if (win) {
        const existing = (win.__referencedFormFormsCache ?? win?.top?.__referencedFormFormsCache) as { docs?: Array<Record<string, unknown>> } | undefined
        if (existing?.docs) {
          const idx = existing.docs.findIndex((d: any) => String(d.id) === String(id))
          if (idx >= 0) existing.docs[idx] = doc
          else existing.docs.push(doc)
        } else {
          win.__referencedFormFormsCache = { docs: [doc] }
          try { if (win.top) win.top.__referencedFormFormsCache = win.__referencedFormFormsCache } catch (_) { }
        }
      }
      return doc
    })
    .catch((err) => {
      _individualFetchCache.delete(cacheKey)
      throw err
    })

  _individualFetchCache.set(cacheKey, promise)
  return promise
}

/**
 * On Referenced Form edit: fetch forms from the component's apiEndpoint (Data Source tab),
 * set __referencedFormFormsCache, fill Form dropdown.
 * Triggers the fetch when the user leaves the Data Source tab or on dialog open if
 * the endpoint is already configured.
 */
export function setupReferencedFormDropdown(instance: Record<string, unknown>): void {
  const inst = instance as {
    on?: (event: string, fn: (c: Record<string, unknown>) => void) => void
    editForm?: {
      getComponent?: (key: string) => {
        component?: Record<string, unknown>
        updateItems?: () => void
        getValue?: () => unknown
      }
      on?: (event: string, fn: (v: unknown) => void) => void
      submission?: { data?: Record<string, unknown> }
    }
    redraw?: () => void
  }

  inst.on?.('editComponent', (component: Record<string, unknown>) => {
    if (component?.type !== REFERENCED_FORM_TYPE) return

    const editingComp = component as Record<string, unknown>

    // Track last fetched endpoint to avoid redundant requests
    let _lastFetchedEndpoint = ''
    // Current docs from the latest successful fetch
    let _currentDocs: Array<Record<string, unknown> & { id?: number | string; title?: string; slug?: string }> = []

    /**
     * Read apiEndpoint from every available source (edit form submission,
     * Form.io component getValue, DOM input, component reference).
     * Returns the first non-empty value found.
     */
    const readApiEndpoint = (): string => {
      // 1) Edit form submission data (most reliable for in-progress edits)
      const fromSubmission = (inst.editForm?.submission?.data?.apiEndpoint as string)?.trim()
      if (fromSubmission) return fromSubmission

      // 2) Form.io component getValue()
      try {
        const apiEndpointComp = inst.editForm?.getComponent?.('apiEndpoint')
        const fromGetValue = (apiEndpointComp?.getValue?.() as string)?.trim()
        if (fromGetValue) return fromGetValue
      } catch { /* component may not exist yet */ }

      // 3) DOM input element (bulletproof — reads the raw input value)
      try {
        const dialog = document.querySelector('.formio-dialog') ?? document.querySelector('.component-edit-container')
        if (dialog) {
          const input = dialog.querySelector('input[name="data[apiEndpoint]"]') as HTMLInputElement | null
          const fromDom = input?.value?.trim()
          if (fromDom) return fromDom
        }
      } catch { /* SSR guard */ }

      // 4) Component reference (only has the initial value, but works for re-opens)
      const fromComp = (editingComp.apiEndpoint as string)?.trim()
      if (fromComp) return fromComp

      return ''
    }

    // ── Helpers ──────────────────────────────────────────────────

    const renderDialogPreview = (id: string | undefined) => {
      if (typeof document === 'undefined') return
      const previewEl = document.querySelector('.formio-dialog .referenced-form-preview-inner') as HTMLElement | null
      if (!previewEl) return
      previewEl.innerHTML = ''
      if (!id) {
        previewEl.textContent = 'Referenced Form (select a form)'
        return
      }
      const doc = _currentDocs.find((d) => String(d.id) === String(id)) ?? null
      const docSchema = doc?.schema as { display?: string; components?: unknown[] } | undefined
      const components = Array.isArray(docSchema?.components)
        ? (docSchema.components as any[]).filter((c: any) => c?.type !== 'appDetailRef')
        : []
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
        if (document.querySelector('.formio-dialog .referenced-form-preview-inner')) {
          renderDialogPreview(id)
          return
        }
        if (frame < maxFrames) requestAnimationFrame(() => tryRender(frame + 1))
      }
      requestAnimationFrame(() => tryRender(0))
    }

    const onDropdownChange = (id: string | undefined) => {
      editingComp.selectedFormId = id

      // Resolve the display type of the selected form and store it
      const doc = id ? _currentDocs.find((d) => String(d.id) === String(id)) : null
      const docSchema = doc?.schema as { display?: string } | undefined
      const display = docSchema?.display || 'form'
      editingComp.selectedFormDisplay = display

      // Update edit form submission data so conditional visibility reacts
      const subData = inst.editForm?.submission?.data
      if (subData) {
        subData.selectedFormDisplay = display
      }
      // Also update via getComponent for reliable Form.io reactivity
      try {
        const displayComp = inst.editForm?.getComponent?.('selectedFormDisplay') as any
        if (displayComp?.setValue) displayComp.setValue(display)
      } catch { /* ignore */ }

      renderDialogPreview(id)
      inst.redraw?.()
    }

    /**
     * Fetch the forms list from the given endpoint, populate the dropdown,
     * wire up the native <select> listener, and refresh the preview.
     */
    const fetchAndPopulate = async (endpoint: string) => {
      if (!endpoint || endpoint === _lastFetchedEndpoint) return
      _lastFetchedEndpoint = endpoint

      try {
        const listUrl = `${endpoint}${endpoint.includes('?') ? '&' : '?'}`
        const raw = (await fetch(listUrl).then((r) => r.json())) as FormsListResponse
        if (typeof window !== 'undefined') {
          ;(window as unknown as { __referencedFormFormsCache?: FormsListResponse }).__referencedFormFormsCache = raw
          try {
            if ((window as Window & { top?: Window }).top)
              ((window as Window & { top?: Window }).top as unknown as { __referencedFormFormsCache?: FormsListResponse }).__referencedFormFormsCache = raw
          } catch (_) { }
        }
        const docs = raw?.docs ?? []
        _currentDocs = docs

        const values = docs.map((d) => {
          const title = (d.title as string) ?? String(d.id ?? '')
          const slug = typeof d.slug === 'string' ? d.slug : ''
          return { value: String(d.id), label: slug ? `${title} (${slug})` : title }
        })
        const selectComp = inst.editForm?.getComponent?.('selectedFormId')
        if (selectComp?.component) {
          const comp = selectComp.component
          if (!comp.data) comp.data = {}
          ;(comp.data as Record<string, unknown>).values = values
          selectComp.updateItems?.()
        }

        const docIds = new Set(docs.map((d) => String(d.id)))
        requestAnimationFrame(() => {
          const dialogEl =
            typeof document !== 'undefined'
              ? document.querySelector('.formio-dialog') ?? document.querySelector('[class*="formio-builder"]') ?? document.body
              : null
          if (dialogEl) {
            for (const sel of dialogEl.querySelectorAll?.('select') ?? []) {
              const select = sel as HTMLSelectElement
              if (Array.from(select.options).some((o) => docIds.has(o.value))) {
                if (!(select as HTMLElement).dataset.referencedFormListener) {
                  ;(select as HTMLElement).dataset.referencedFormListener = '1'
                  select.addEventListener('change', () => onDropdownChange(select.value || undefined))
                }
                break
              }
            }
          }
          const currentId = (editingComp.selectedFormId as string) || undefined
          // Sync selectedFormDisplay for the currently selected form
          if (currentId) {
            const doc = _currentDocs.find((d) => String(d.id) === String(currentId))
            const docSchema = doc?.schema as { display?: string } | undefined
            const display = docSchema?.display || 'form'
            editingComp.selectedFormDisplay = display
            const subData = inst.editForm?.submission?.data
            if (subData) subData.selectedFormDisplay = display
            try {
              const displayComp = inst.editForm?.getComponent?.('selectedFormDisplay') as any
              if (displayComp?.setValue) displayComp.setValue(display)
            } catch { /* ignore */ }
          }
          runWhenPreviewReady(currentId)
          inst.redraw?.()
        })
      } catch {
        // fetch failed — leave dropdown as-is
      }
    }

    /**
     * Read apiEndpoint and fetch if it changed.
     */
    const checkAndFetch = () => {
      const ep = readApiEndpoint()
      if (ep && ep !== _lastFetchedEndpoint) {
        fetchAndPopulate(ep)
      }
    }

    // ── Strategy 1: Watch tab navigation clicks in the edit dialog ──
    const wireTabListeners = (dialog: Element) => {
      const tabLinks = dialog.querySelectorAll('.nav-link, [role="tab"]')
      for (const link of Array.from(tabLinks)) {
        if ((link as HTMLElement).dataset.rfTabWired) continue
        ;(link as HTMLElement).dataset.rfTabWired = '1'
        link.addEventListener('click', () => {
          // Small delay to let Form.io sync the edit form data
          setTimeout(checkAndFetch, 50)
        })
      }
    }

    // ── Strategy 2: Watch the apiEndpoint input for blur ──────────
    const wireInputBlur = (dialog: Element) => {
      // Form.io renders input with name="data[apiEndpoint]" or similar
      const inputs = dialog.querySelectorAll('input')
      for (const input of Array.from(inputs)) {
        const inp = input as HTMLInputElement
        // Match by name attribute (Form.io pattern) or by traversing labels
        if (
          inp.name === 'data[apiEndpoint]' ||
          inp.getAttribute('name')?.includes('apiEndpoint') ||
          inp.closest('[ref="apiEndpoint"]') ||
          inp.closest('.formio-component-apiEndpoint')
        ) {
          if (inp.dataset.rfBlurWired) continue
          inp.dataset.rfBlurWired = '1'
          // Fire on blur (user leaves field) and on Enter key
          inp.addEventListener('blur', () => setTimeout(checkAndFetch, 50))
          inp.addEventListener('keydown', (e) => {
            if ((e as KeyboardEvent).key === 'Enter') setTimeout(checkAndFetch, 50)
          })
        }
      }
    }

    // ── Poll for dialog then wire listeners ──────────────────────
    const pollForDialog = (attempt = 0) => {
      const dialog = typeof document !== 'undefined'
        ? document.querySelector('.formio-dialog') ?? document.querySelector('.component-edit-container')
        : null
      if (!dialog) {
        if (attempt < 15) requestAnimationFrame(() => pollForDialog(attempt + 1))
        return
      }

      wireTabListeners(dialog)
      wireInputBlur(dialog)

      // MutationObserver to catch dynamic re-renders (tab content changes)
      const observer = new MutationObserver(() => {
        wireTabListeners(dialog)
        wireInputBlur(dialog)
      })
      observer.observe(dialog, { childList: true, subtree: true })
    }

    requestAnimationFrame(() => pollForDialog())

    // ── Strategy 3: editForm change event (reads from submission data) ─
    inst.editForm?.on?.('change', () => {
      // Check endpoint from edit form submission data
      checkAndFetch()
      // Update preview for selectedFormId
      const subData = inst.editForm?.submission?.data
      const currentId = (subData?.selectedFormId as string) || (editingComp.selectedFormId as string) || undefined
      renderDialogPreview(currentId)

      // Sync selectedFormDisplay when docs are available
      if (currentId && _currentDocs.length > 0) {
        const doc = _currentDocs.find((d) => String(d.id) === String(currentId))
        const docSchema = doc?.schema as { display?: string } | undefined
        const display = docSchema?.display || 'form'
        if (subData && subData.selectedFormDisplay !== display) {
          subData.selectedFormDisplay = display
          editingComp.selectedFormDisplay = display
          try {
            const displayComp = inst.editForm?.getComponent?.('selectedFormDisplay') as any
            if (displayComp?.setValue) displayComp.setValue(display)
          } catch { /* ignore */ }
        }
      }
    })

    // ── Initial fetch if endpoint is already configured ──────────
    requestAnimationFrame(() => {
      const initialEndpoint = readApiEndpoint()
      if (initialEndpoint) {
        fetchAndPopulate(initialEndpoint)
      }
    })
  })

  inst.on?.('saveComponent', () => {
    requestAnimationFrame(() => {
      inst.redraw?.()
    })
  })
}

export async function registerReferencedForm(Components: FormioComponents): Promise<void> {
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

  const { ReferencedFormComponent } = await import('../components/ReferencedForm')
  const { getFormSchemaForPreview } = await import('../utils/formio-referenced-form-logic')

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const ReferencedForm = class extends (BaseComponent as any) {
    static schema(overrides?: any) {
      return ReferencedFormComponent.schema(overrides)
    }

    static get builderInfo() {
      return ReferencedFormComponent.builderInfo
    }

    static editForm() {
      return ReferencedFormComponent.editForm()
    }

     /**
     * Block saving the component settings when Property Name (key) is empty.
     * Form.io calls this method when the user clicks Save in the edit dialog.
     */
    saveComponentSettings(component: any) {
      if (!component?.key?.trim()) {
        const editForm = (this as any).editForm
        if (editForm) {
          // Trigger validation on the editForm so the required error is shown
          editForm.setPristine(false)
          editForm.checkValidity(null, true, null, false)
        }
        return false
      }
      return super.saveComponentSettings(component)
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
      const rawId = this.component.selectedFormId
      const selectedId: string | undefined =
        rawId !== undefined && rawId !== null && rawId !== ''
          ? String(rawId)
          : undefined
      const el = this.element as HTMLElement | undefined
      if (!el) return

      const win = typeof window !== 'undefined' ? (window as any) : undefined

      if ((this as any)._previewFormInstance?.destroy) {
        try { (this as any)._previewFormInstance.destroy() } catch (_) { }
        ; (this as any)._previewFormInstance = undefined
      }

      let container = el.querySelector('.referenced-form-preview-inner') as HTMLElement | null
      if (!container || !container.parentNode) {
        container = document.createElement('div')
        container.className = 'referenced-form-preview-inner'
        el.appendChild(container)
      }
      container.innerHTML = ''

      const renderForm = (formSchema: { display: string; components: unknown[] }, readOnly: boolean) => {
        if (!container?.parentNode) return

        const safeComponents = (formSchema.components as any[]).filter(
          (c: any) => c?.type !== 'appDetailRef'
        )
        const safeSchema = { ...formSchema, components: safeComponents }

        const FormioLib = win?.Formio ?? win?.top?.Formio
        const createFormFn =
          FormioLib?.createForm ??
          (win?.__FormioModule as any)?.Formio?.createForm ??
          (win?.__FormioModule as any)?.createForm
        if (typeof createFormFn !== 'function') {
          import('formiojs').then((mod: any) => {
            const fn = mod?.Formio?.createForm ?? mod?.default?.Formio?.createForm
            if (typeof fn !== 'function') { container!.textContent = 'Formio not available.'; return }
            if (!container?.parentNode) return
            fn(container, safeSchema, { readOnly })
              .then((instance: { destroy?: () => void }) => { (this as any)._previewFormInstance = instance })
              .catch(() => { container!.textContent = 'Could not load.' })
          }).catch(() => { container!.textContent = 'Not available.' })
          return
        }
        createFormFn(container, safeSchema, { readOnly })
          .then((instance: { destroy?: () => void }) => { (this as any)._previewFormInstance = instance })
          .catch(() => { container!.textContent = 'Could not load.' })
      }

      if (!selectedId) {
        container.textContent = 'Referenced Form (select a form)'
        return
      }

      const cache = (win?.__referencedFormFormsCache ?? win?.top?.__referencedFormFormsCache) as { docs?: Array<Record<string, unknown>> } | undefined
      const cachedDoc = cache?.docs?.find((d: any) => String(d.id) === String(selectedId)) ?? null
      const cachedSchema = getFormSchemaForPreview(cachedDoc)

      if (cachedSchema.components.length > 0) {
        renderForm(cachedSchema, true)
        return
      }

      if (cachedDoc) {
        container.textContent = `Referenced Form → ${selectedId}`
        return
      }

      container.textContent = 'Loading...'
      const previewEndpoint = (this.component.apiEndpoint as string)?.trim()
      if (!previewEndpoint) {
        container.textContent = `Referenced Form → ${selectedId} (no API endpoint configured)`
        return
      }
      fetchFormById(selectedId, previewEndpoint)
        .then((doc: Record<string, unknown>) => {
          if (!doc || typeof doc !== 'object') {
            container!.textContent = `Referenced Form → ${selectedId}`
            return
          }
          const fetchedSchema = getFormSchemaForPreview(doc)
          if (!container!.parentNode) return
          container!.innerHTML = ''
          if (fetchedSchema.components.length > 0) {
            renderForm(fetchedSchema, true)
          } else {
            container!.textContent = `Referenced Form → ${selectedId}`
          }
        })
        .catch(() => {
          container!.textContent = `Referenced Form → ${selectedId}`
        })
    }

    getValue() {
      return null
    }

    setValue() { }
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */

  Components.setComponent('appDetailRef', ReferencedForm)
}
