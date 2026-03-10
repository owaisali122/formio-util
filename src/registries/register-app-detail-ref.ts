import { getFormsListUrl } from '../registry'
import type { FormioComponents } from './types'

const APP_DETAIL_REF_TYPE = 'appDetailRef'

type FormsListResponse = {
  docs?: Array<Record<string, unknown> & { id?: number | string; title?: string; slug?: string }>
}

// ─── Module-level fetch dedup cache ───────────────────────────────────────────
const _individualFetchCache = new Map<string, Promise<Record<string, unknown>>>()

/**
 * Fetch a single form by ID. Returns the SAME in-flight promise if a request
 * is already running, so concurrent attach() calls don't duplicate the fetch.
 * Result is also written into __appDetailRefFormsCache so the next attach()
 * finds the doc in cache and skips the network entirely.
 */
function fetchFormById(id: string): Promise<Record<string, unknown>> {
  if (_individualFetchCache.has(id)) {
    return _individualFetchCache.get(id)!
  }
  const apiUrl = getFormsListUrl()
  const formUrl = `${apiUrl}/${id}`
  const promise = fetch(formUrl)
    .then((r) => r.json())
    .then((doc: Record<string, unknown>) => {
      const win = typeof window !== 'undefined' ? (window as any) : undefined
      if (win) {
        const existing = (win.__appDetailRefFormsCache ?? win?.top?.__appDetailRefFormsCache) as { docs?: Array<Record<string, unknown>> } | undefined
        if (existing?.docs) {
          const idx = existing.docs.findIndex((d: any) => String(d.id) === String(id))
          if (idx >= 0) existing.docs[idx] = doc
          else existing.docs.push(doc)
        } else {
          win.__appDetailRefFormsCache = { docs: [doc] }
          try { if (win.top) win.top.__appDetailRefFormsCache = win.__appDetailRefFormsCache } catch (_) { }
        }
      }
      return doc
    })
    .catch((err) => {
      _individualFetchCache.delete(id)
      throw err
    })

  _individualFetchCache.set(id, promise)
  return promise
}

/**
 * On App Detail Ref edit: fetch forms from getFormsListUrl(), set __appDetailRefFormsCache, fill Form dropdown.
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
        const listUrl = `${url}${url.includes('?') ? '&' : '?'}`
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
    requestAnimationFrame(() => {
      inst.redraw?.()
    })
  })
}

export async function registerAppDetailRef(Components: FormioComponents): Promise<void> {
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

  const { AppDetailRefComponent } = await import('../components/AppDetailRef')
  const { getFormSchemaForPreview } = await import('../utils/formio-app-detail-ref-logic')

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

      let container = el.querySelector('.app-detail-ref-preview-inner') as HTMLElement | null
      if (!container || !container.parentNode) {
        container = document.createElement('div')
        container.className = 'app-detail-ref-preview-inner'
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
        container.textContent = 'App Detail Ref (select a form)'
        return
      }

      const cache = (win?.__appDetailRefFormsCache ?? win?.top?.__appDetailRefFormsCache) as { docs?: Array<Record<string, unknown>> } | undefined
      const cachedDoc = cache?.docs?.find((d: any) => String(d.id) === String(selectedId)) ?? null
      const cachedSchema = getFormSchemaForPreview(cachedDoc)

      if (cachedSchema.components.length > 0) {
        renderForm(cachedSchema, true)
        return
      }

      if (cachedDoc) {
        container.textContent = `App Detail Ref → ${selectedId}`
        return
      }

      container.textContent = 'Loading...'
      fetchFormById(selectedId)
        .then((doc: Record<string, unknown>) => {
          if (!doc || typeof doc !== 'object') {
            container!.textContent = `App Detail Ref → ${selectedId}`
            return
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
    }

    getValue() {
      return null
    }

    setValue() { }
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */

  Components.setComponent('appDetailRef', AppDetailRef)
}
