'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ReactTransStackTable } from '../components/ReactTransStackTable'
import type { CustomWizardNavigation, PanelCustomNavigation, NavigationButton } from '../types/wizard-navigation'
import {
  WizardNavigationRenderer,
  resolveNavigationButtons,
} from './wizard-navigation-renderer'

/**
 * Wizard state passed to onNext / onPrevious / onSaveExit.
 * Library runs validation and nextPage/prevPage; app does API, step persist, and URL update.
 */
export interface WizardState {
  /** Ref to the Form.io form instance (form.root or form is the wizard). Use for checkValidity(), nextPage(), prevPage(). */
  formInstanceRef: React.MutableRefObject<any>
  /** Form ID from DB (for save-step API). */
  formId: number
  /** Draft/record ID if resuming (for save-step API). */
  recordId: number | null
  /** Current step index (0-based). Use for URL step param. */
  currentPage: number
  /** Total number of wizard pages. */
  totalPages: number
  /** Current form data (form.submission.data). */
  data: Record<string, any>
}

/** Result of loading a record for edit; step is 0-based. */
export type LoadRecordResult = { data: Record<string, any>; step?: number } | null

const FormLoading = () => <div className="formio-loading">Loading form...</div>
const FormErrorComponent = ({ message }: { message: string }) => (
  <div className="formio-error" role="alert" style={{ color: 'red', padding: '12px', border: '1px solid red', borderRadius: '4px' }}>
    Error: {message}
  </div>
)

/**
 * Hide default wizard navigation buttons via config.
 * Panel-level: each panel gets buttonSettings so built-in Previous/Next/Cancel/Submit are hidden.
 * Form-level: createFormOptions.buttonSettings hides them at form level; app renders custom buttons.
 */
function hidePanelButtons(components: any[]): void {
  if (!Array.isArray(components)) return
  const hide = { previous: false, next: false, cancel: false, submit: false }
  components.forEach((c: any) => {
    if (c.type === 'panel') {
      c.buttonSettings = { ...(c.buttonSettings || {}), ...hide }
    }
    if (c.components?.length) hidePanelButtons(c.components)
  })
}

function cleanFormData(raw: Record<string, any>): Record<string, any> {
  const d = { ...(raw || {}) }
  delete d.submit
  delete d.cancel
  return d
}

/**
 * Resolves target page index for a skip action.
 * Checks targetStepKey first (matches panel key), then targetStepIndex.
 */
function resolveSkipTarget(button: NavigationButton, schema: any): number | null {
  const components = schema?.components as any[] | undefined
  if (!Array.isArray(components)) return button.targetStepIndex ?? null

  const panels = components.filter((c: any) => c.type === 'panel')

  if (button.targetStepKey) {
    const idx = panels.findIndex((p: any) => p.key === button.targetStepKey)
    if (idx >= 0) return idx
  }

  if (button.targetStepIndex != null && button.targetStepIndex >= 0 && button.targetStepIndex < panels.length) {
    return button.targetStepIndex
  }

  return null
}

/**
 * Unified Form.io renderer entry point.
 *
 * Fetches form schema by slug, inspects `schema.display`, and internally
 * renders the correct flow:
 *  - display === "wizard" → wizard navigation with Previous / Save & Exit / Next buttons
 *  - otherwise → single-form rendering with onSubmit
 *
 * Managed wizard mode (recommended): pass loadRecord + saveRecord + getWizardEditUrl + onExit (edit)
 * or createRecord + onRecordCreated + onExit (new). Library then handles load, save, step, URL, and exit.
 * Unmanaged wizard: pass initialData/initialPage/maxFilledStep and onPrevious/onNext/onSaveExit.
 */
export interface FormIORenderWithSlugProps {
  slug: string

  /**
   * Base URL of the form-schema API endpoint.
   * The slug is always appended as a query param: ?slug=<slug>
   * Example: "/api/my-forms" → fetches "/api/my-forms?slug=my-form-slug"
   */
  formSchemaApiUrl?: string

  // --- Common ---
  initialData?: Record<string, any>
  onError?: (error: string) => void

  // --- Single form mode (display === "form") ---
  onSubmit?: (data: Record<string, any>, formInstanceRef?: React.MutableRefObject<any>) => void | Promise<void>
  onCancel?: () => void

  // --- Wizard mode (display === "wizard") ---
  recordId?: number | null
  initialPage?: number
  maxFilledStep?: number
  onSuccess?: () => void
  onPrevious?: (state: WizardState) => void | Promise<void>
  onNext?: (state: WizardState) => void | Promise<void>
  onSaveExit?: (state: WizardState) => void | Promise<void>
  navigationClassName?: string
  loadRecord?: (recordId: number) => LoadRecordResult | Promise<LoadRecordResult>
  saveRecord?: (recordId: number, data: Record<string, any>, step: number) => Promise<boolean>
  createRecord?: (data: Record<string, any>) => Promise<{ id: number } | null>
  onRecordCreated?: (recordId: number, data?: Record<string, any>, step?: number) => void
  onExit?: () => void
  getWizardEditUrl?: (recordId: number, step: number) => string
}

export default function FormIORenderWithSlug(props: FormIORenderWithSlugProps) {
  const { slug, onError } = props
  const [formMeta, setFormMeta] = useState<{ id: number; schema: any } | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError

  // Schema load
  useEffect(() => {
    if (!slug) return
    const load = async () => {
      try {
        setLoadError(null)
        const baseUrl = props.formSchemaApiUrl 
        const res = await fetch(`${baseUrl}?slug=${encodeURIComponent(slug)}`)
        if (!res.ok) {
          let err: { error?: string } = {}
          try {
            err = await res.json()
          } catch (_) {
            err = { error: res.statusText || 'Failed to load form' }
          }
          throw new Error(err.error || 'Failed to load form')
        }
        const data = await res.json()
        setFormMeta({ id: data.id, schema: data.schema })
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to load form'
        setLoadError(errorMessage)
        onErrorRef.current?.(errorMessage)
      }
    }
    load()
  }, [slug, props.formSchemaApiUrl])

  if (loadError) return <FormErrorComponent message={loadError} />
  if (!formMeta) return <FormLoading />

  const display = formMeta.schema?.display

  if (display === 'wizard') {
    return <WizardRenderer formMeta={formMeta} {...props} />
  }

  return (
    <ReactTransStackTable
      schema={formMeta.schema}
      onSubmit={props.onSubmit}
      submission={props.initialData}
      readOnly={false}
    />
  )
}

// ---------------------------------------------------------------------------
// Wizard-in-wizard: find active referenced wizards on the current parent page
// ---------------------------------------------------------------------------

/**
 * Walks the Form.io component tree for the given parent wizard page and returns
 * all ReferencedFormRuntime instances whose embedded form is itself a wizard AND
 * that are currently visible (not hidden / conditionally invisible).
 *
 * Navigation delegation rule (Case 6):
 * Only the FIRST visible referenced wizard on the current page is controlled.
 * This keeps the implementation deterministic and safe. If multiple nested wizards
 * are present on the same parent page, only the first one receives delegated
 * navigation; the rest are left in their current state.
 */
function findActiveReferencedWizardsOnPage(wizard: any, pageIndex: number): any[] {
  const pages: any[] = wizard?.pages ?? []
  const panel = pages[pageIndex]
  if (!panel) return []

  const results: any[] = []

  function walkComponents(comps: any[]): void {
    if (!Array.isArray(comps)) return
    for (const comp of comps) {
      if (
        comp?.type === 'appDetailRefRuntime' &&
        typeof comp.isReferencedWizard === 'function' &&
        comp.isReferencedWizard() &&
        typeof comp.isReferencedWizardVisible === 'function' &&
        comp.isReferencedWizardVisible()
      ) {
        results.push(comp)
      }
      // Recurse into nested component containers (columns, panels, etc.)
      if (comp?.components?.length) walkComponents(comp.components)
    }
  }

  walkComponents(panel?.components ?? [])
  return results
}

// ---------------------------------------------------------------------------
// File upload flush — called before final submit to resolve all server URLs
// ---------------------------------------------------------------------------

/**
 * Walks every component instance in the wizard/form and calls beforeSubmit()
 * on each fileUploader component that has an uploadApiUrl configured.
 *
 * The fileUploader's beforeSubmit() will:
 *   1. Skip if no pending files
 *   2. POST each pending/scanned file to uploadApiUrl
 *   3. Replace the local blob URL with the server-returned URL in form data
 *
 * After this resolves, form.submission.data contains the final server URLs
 * ready to be sent to saveRecord / createRecord.
 */
async function flushPendingFileUploads(form: any): Promise<void> {
  if (!form) return
  const uploaders: any[] = []
  if (typeof form.everyComponent === 'function') {
    form.everyComponent((comp: any) => {
      if (
        comp?.component?.type === 'fileUploader' &&
        typeof comp.beforeSubmit === 'function' &&
        (comp.component?.uploadApiUrl as string | undefined)?.trim()
      ) {
        uploaders.push(comp)
      }
    })
  }
  for (const uploader of uploaders) {
    await uploader.beforeSubmit()
  }
}

function WizardRenderer({
  formMeta,
  recordId = null,
  initialData,
  initialPage,
  maxFilledStep,
  onError,
  onPrevious,
  onNext,
  onSaveExit,
  navigationClassName = 'form-navigation mt-6 flex flex-wrap gap-3',
  loadRecord,
  saveRecord,
  createRecord,
  onRecordCreated,
  onExit,
  getWizardEditUrl,
}: FormIORenderWithSlugProps & { formMeta: { id: number; schema: any } }) {
  const [currentPage, setCurrentPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  // Incremented whenever a nested wizard changes page so the nav config is recomputed
  const [nestedNavTick, setNestedNavTick] = useState(0)
  // Incremented on form data change so conditional navigation buttons re-evaluate
  const [formDataTick, setFormDataTick] = useState(0)

  // Managed edit: record load state
  const [recordLoading, setRecordLoading] = useState(false)
  const [recordLoadError, setRecordLoadError] = useState<string | null>(null)
  const [recordInitialData, setRecordInitialData] = useState<Record<string, any> | undefined>(undefined)
  const [recordInitialPage, setRecordInitialPage] = useState<number | undefined>(undefined)
  const [recordMaxFilledStep, setRecordMaxFilledStep] = useState<number | undefined>(undefined)

  const effectiveInitialData = recordInitialData !== undefined ? recordInitialData : initialData
  const effectiveInitialPage = recordInitialPage !== undefined ? recordInitialPage : initialPage
  const effectiveMaxFilledStep = recordMaxFilledStep !== undefined ? recordMaxFilledStep : maxFilledStep

  const formInstanceRef = useRef<any>(null)
  const dataPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Managed edit: load record when loadRecord + recordId provided
  const recordIdRef = useRef<number | null>(null)
  useEffect(() => {
    const id = recordId != null ? recordId : null
    if (id == null || !loadRecord) {
      if (id == null) {
        recordIdRef.current = null
        setRecordInitialData(undefined)
        setRecordInitialPage(undefined)
        setRecordMaxFilledStep(undefined)
        setRecordLoadError(null)
      }
      return
    }
    if (recordIdRef.current === id) return
    recordIdRef.current = id
    setRecordLoadError(null)
    const apply = (result: LoadRecordResult) => {
      if (result == null) {
        setRecordInitialData({})
        setRecordInitialPage(0)
        setRecordMaxFilledStep(0)
        return
      }
      setRecordInitialData(result.data ?? {})
      const step = result.step != null ? result.step : 0
      setRecordInitialPage(step)
      setRecordMaxFilledStep(result.step != null ? result.step : step)
      if (typeof window !== 'undefined' && getWizardEditUrl) {
        const url = getWizardEditUrl(id, step)
        window.history.replaceState(null, '', url)
      }
    }
    const maybePromise = loadRecord(id)
    if (maybePromise != null && typeof (maybePromise as Promise<LoadRecordResult>).then === 'function') {
      setRecordLoading(true)
      ;(maybePromise as Promise<LoadRecordResult>)
        .then(apply)
        .catch((err: any) => {
          setRecordLoadError(err?.message || 'Failed to load record')
        })
        .finally(() => {
          setRecordLoading(false)
        })
    } else {
      apply(maybePromise as LoadRecordResult)
    }
  }, [recordId, loadRecord, getWizardEditUrl])

  const getState = useCallback((): WizardState => {
    const form = formInstanceRef.current
    const wizard = form?.root || form
    const page = wizard?.page ?? form?.page ?? 0
    const pages = wizard?.pages ?? form?.pages ?? []
    const total = Array.isArray(pages) ? pages.length : 1
    return {
      formInstanceRef,
      formId: formMeta.id,
      recordId: recordId ?? null,
      currentPage: page,
      totalPages: total,
      data: { ...(form?.submission?.data ?? {}) },
    }
  }, [formMeta.id, recordId])

  const handlePrevious = useCallback(async () => {
    const state = getState()
    const form = state.formInstanceRef?.current
    const wizard = form?.root || form
    const pageBefore = state.currentPage

    // --- Wizard-in-wizard delegation (Case 1) ---
    // If the current parent page contains a visible referenced wizard that is NOT
    // on its first internal step, delegate Previous navigation to it only.
    // The parent wizard only goes back once the nested wizard reaches its first step.
    // Rule (Case 6): only the first visible referenced wizard on this page is controlled.
    const nestedWizards = findActiveReferencedWizardsOnPage(wizard, pageBefore)
    const activeNested = nestedWizards[0] ?? null
    if (activeNested && !activeNested.isReferencedFirstStep()) {
      // Nested wizard still has previous steps — go back in nested wizard only.
      activeNested.goToReferencedPreviousStep()
      return
    }
    // If nested wizard is on its first step (Case 9), or there is no nested wizard
    // (Cases 2/4/5), fall through to normal parent-wizard Previous below.

    const targetPage = Math.max(0, pageBefore - 1)
    if (wizard && typeof (wizard as any).prevPage === 'function') {
      (wizard as any).prevPage()
    }
    const stateWithTarget = { ...getState(), currentPage: targetPage }
    if (saveRecord && recordId != null) {
      const raw = form?.submission?.data ?? state.data ?? {}
      const data = { ...cleanFormData(raw), _wizardStep: targetPage }
      setIsSaving(true)
      try {
        const ok = await saveRecord(recordId, data, targetPage)
        if (ok && typeof window !== 'undefined' && getWizardEditUrl) {
          window.history.replaceState(null, '', getWizardEditUrl(recordId, targetPage))
        }
      } catch (e) {
        onError?.(e instanceof Error ? e.message : 'Error')
      } finally {
        setIsSaving(false)
      }
    }
    if (onPrevious) {
      setIsSaving(true)
      try {
        await onPrevious(stateWithTarget)
      } catch (e) {
        onError?.(e instanceof Error ? e.message : 'Error')
      } finally {
        setIsSaving(false)
      }
    }
  }, [onPrevious, saveRecord, recordId, getWizardEditUrl, getState, onError])

  const handleNext = useCallback(async () => {
    const state = getState()
    const form = state.formInstanceRef?.current
    if (!form) return
    const wizard = form.root || form
    const data = form.submission?.data ?? {}
    const step = wizard?.page ?? form?.page ?? 0
    const currentStepPanel = wizard?.pages?.[step] ?? null
    const isValid = currentStepPanel?.checkValidity
      ? currentStepPanel.checkValidity(data, true, data, false)
      : (wizard?.checkValidity?.(data, true, data, false) ?? form.checkValidity?.(data, true, data, false) !== false)
    if (!isValid) return

    // --- Wizard-in-wizard delegation (Case 1) ---
    // If the current parent page contains a visible referenced wizard, delegate
    // Next navigation to it first. The parent wizard only advances once the
    // nested wizard has exhausted its own internal steps.
    // Rule (Case 6): only the first visible referenced wizard on this page is controlled.
    const nestedWizards = findActiveReferencedWizardsOnPage(wizard, step)
    const activeNested = nestedWizards[0] ?? null
    if (activeNested && !activeNested.isReferencedLastStep()) {
      // Nested wizard still has internal steps to go through — advance it only.
      activeNested.goToReferencedNextStep()
      return
    }
    // If activeNested is on its last step (Case 10), or there is no nested wizard
    // (Cases 2/4/5), fall through to normal parent-wizard navigation below.

    const pageBefore = state.currentPage
    const total = state.totalPages || 1
    const targetPage = Math.min(pageBefore + 1, total - 1)
    const dataToSave = { ...(form.submission?.data ?? state.data ?? {}) }
    if (wizard && typeof (wizard as any).nextPage === 'function') {
      (wizard as any).nextPage()
    }

    // Before saving on any step, flush file upload components that have pending files.
    // Each fileUploader with uploadApiUrl POSTs its file, receives the server URL,
    // and updates form.submission.data in place. If no pending files exist the call
    // is a no-op. This ensures the payload always contains server URLs, not blob URLs.
    setIsSaving(true)
    try {
      await flushPendingFileUploads(wizard || form)
    } catch (uploadErr: any) {
      onError?.(uploadErr?.message || 'File upload failed.')
      setIsSaving(false)
      return
    }

    // Re-read data after upload flush — server URLs are now in form data
    const finalData = { ...(form.submission?.data ?? dataToSave) }

    const isSubmitting = targetPage >= total - 1
    const stateWithTarget = { ...getState(), currentPage: targetPage, data: finalData }

    // Managed new: first Next creates record then app navigates to edit
    if (createRecord && (recordId == null || recordId === undefined)) {
      setIsSaving(true)
      try {
        const payload = { ...cleanFormData(finalData), _wizardStep: targetPage }
        const result = await createRecord(payload)
        if (result?.id != null) {
          onRecordCreated?.(result.id, payload, targetPage)
        } else {
          onError?.('Server did not return an ID.')
        }
      } catch (e) {
        onError?.(e instanceof Error ? e.message : 'Error')
      } finally {
        setIsSaving(false)
      }
      return
    }

    // Managed edit: save then update URL or exit on last step
    if (saveRecord && recordId != null) {
      setIsSaving(true)
      try {
        const payload = { ...cleanFormData(finalData), _wizardStep: targetPage }
        const ok = await saveRecord(recordId, payload, targetPage)
        if (!ok) {
          setIsSaving(false)
          return
        }
        if (targetPage >= total - 1) {
          onExit?.()
          return
        }
        if (typeof window !== 'undefined' && getWizardEditUrl) {
          window.history.replaceState(null, '', getWizardEditUrl(recordId, targetPage))
        }
      } catch (e) {
        onError?.(e instanceof Error ? e.message : 'Error')
      } finally {
        setIsSaving(false)
      }
      return
    }

    if (onNext) {
      setIsSaving(true)
      try {
        await onNext(stateWithTarget)
      } catch (e) {
        onError?.(e instanceof Error ? e.message : 'Error')
      } finally {
        setIsSaving(false)
      }
    }
  }, [onNext, createRecord, saveRecord, recordId, onRecordCreated, onExit, getWizardEditUrl, getState, onError])

  const handleSaveExit = useCallback(async () => {
    const state = getState()
    const form = state.formInstanceRef?.current
    const raw = form?.submission?.data ?? state.data ?? {}

    if (createRecord && (recordId == null || recordId === undefined)) {
      setIsSaving(true)
      try {
        const payload = cleanFormData(raw)
        await createRecord(payload)
        onExit?.()
      } catch (e) {
        onError?.(e instanceof Error ? e.message : 'Error')
      } finally {
        setIsSaving(false)
      }
      return
    }

    if (saveRecord && recordId != null) {
      setIsSaving(true)
      try {
        const payload = { ...cleanFormData(raw), _wizardStep: state.currentPage }
        await saveRecord(recordId, payload, state.currentPage)
        onExit?.()
      } catch (e) {
        onError?.(e instanceof Error ? e.message : 'Error')
      } finally {
        setIsSaving(false)
      }
      return
    }

    if (onSaveExit) {
      setIsSaving(true)
      try {
        await onSaveExit(state)
      } catch (e) {
        onError?.(e instanceof Error ? e.message : 'Error')
      } finally {
        setIsSaving(false)
      }
    }
  }, [onSaveExit, createRecord, saveRecord, recordId, onExit, getState, onError])

  const handleFormReady = useCallback(
    (form: any) => {
      formInstanceRef.current = form
      const wizard = form.root || form
      const pages = wizard?.pages ?? form?.pages ?? []
      const total = Array.isArray(pages) ? pages.length : 1
      setTotalPages(total)

      let page = wizard?.page ?? form?.page ?? 0
      if (effectiveInitialPage != null && effectiveInitialPage >= 0 && effectiveInitialPage < total) {
        try {
          if (typeof (wizard as any).setPage === 'function') {
            (wizard as any).setPage(effectiveInitialPage)
          }
          page = effectiveInitialPage
        } catch {
          /* ignore */
        }
      }
      if (effectiveMaxFilledStep != null && effectiveMaxFilledStep >= 0 && total > 0) {
        try {
          ;(wizard as any).enabledIndex = Math.min(effectiveMaxFilledStep, total - 1)
        } catch {
          /* ignore */
        }
      }
      setCurrentPage(page)

      // Expose global helper for inline onclick handlers to find the correct form instance
      if (typeof window !== 'undefined') {
        ;(window as any).__getClosestFormioForm = (el: HTMLElement) => {
          const Fio = (window as any).Formio
          if (!Fio?.forms) return null
          let current: HTMLElement | null = el
          while (current) {
            if (current.id && Fio.forms[current.id]) return Fio.forms[current.id]
            current = current.parentElement
          }
          const keys = Object.keys(Fio.forms)
          return keys.length > 0 ? Fio.forms[keys[keys.length - 1]] : null
        }
      }

      const updateStepStyles = () => {
        const form = formInstanceRef.current
        if (!form) return
        const el = (form as any).element || (form as any).root?.element
        if (!el) return
        const header = el.querySelector('[id$="-header"]') as HTMLElement | null
        if (!header) return
        const w = form.root || form
        const currentIdx = (w?.page ?? 0) as number
        header.querySelectorAll('li.page-item').forEach((li: Element, idx: number) => {
          (li as HTMLElement).classList.toggle('step-completed', idx < currentIdx)
        })
      }
      const onPageChange = () => {
        setCurrentPage((formInstanceRef.current?.root || formInstanceRef.current)?.page ?? 0)
        // Bump tick so nested wizard nav config is re-read for the new parent page
        setNestedNavTick((t) => t + 1)
        updateStepStyles()
      }
      wizard?.on?.('nextPage', onPageChange)
      wizard?.on?.('prevPage', onPageChange)
      wizard?.on?.('wizardPageSelected', onPageChange)

      // When a nested referenced wizard becomes ready, recompute nav config immediately
      // then subscribe to its page changes so it recomputes again on each nested step.
      // Re-render navigation buttons when form data changes (for visibleWhen conditions).
      // Listen to change, redraw, and customEvent since custom button actions that modify
      // data and call instance.redraw() may not always emit a 'change' event.
      const bumpFormData = () => setFormDataTick((t) => t + 1)
      wizard?.on?.('change', bumpFormData)
      wizard?.on?.('redraw', bumpFormData)
      wizard?.on?.('customEvent', bumpFormData)

      // Fallback: poll submission data to catch changes from custom button actions
      // that set data directly without triggering Form.io events.
      if (dataPollRef.current) clearInterval(dataPollRef.current)
      let lastDataSnapshot = JSON.stringify(wizard?.submission?.data ?? {})
      dataPollRef.current = setInterval(() => {
        const current = JSON.stringify(formInstanceRef.current?.submission?.data ?? {})
        if (current !== lastDataSnapshot) {
          lastDataSnapshot = current
          bumpFormData()
        }
      }, 300)

      wizard?.on?.('referencedFormReady', ({ embeddedForm: ef }: any) => {
        if (!ef) return
        const bumpNested = () => setNestedNavTick((t) => t + 1)
        // Bump immediately — the nested form just loaded, nestedNavInfo must recompute now
        bumpNested()
        ef.on?.('nextPage', bumpNested)
        ef.on?.('prevPage', bumpNested)
      })

      updateStepStyles()
    },
    [effectiveInitialPage, effectiveMaxFilledStep]
  )

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (dataPollRef.current) clearInterval(dataPollRef.current)
    }
  }, [])

  // Hooks must run before any early return (Rules of Hooks)
  const schema = useMemo(() => {
    const s = JSON.parse(JSON.stringify(formMeta.schema))
    if (s.display === 'wizard') {
      s.settings = { ...(s.settings || {}), wizardHeaderType: 'Vertical' }
      hidePanelButtons(s.components || [])
    }
    return s
  }, [formMeta.schema])

  const createFormOptions = useMemo((): Record<string, unknown> => {
    const opts: Record<string, unknown> = { noAlerts: true, readOnly: false }
    if (schema?.display === 'wizard') {
      opts.buttonSettings = {
        showPrevious: false,
        showNext: false,
        showCancel: false,
        showSubmit: false,
      }
      opts.allowPrevious = true
      opts.breadcrumbSettings = { clickable: true }
    }
    // Allow onclick and other event attributes in htmlelement components.
    // Form.io uses DOMPurify — ADD_ATTR allows specific attributes through.
    opts.sanitizeConfig = {
      addAttr: ['onclick', 'onchange', 'style', 'target'],
      addTags: ['iframe'],
      FORCE_BODY: true,
      ADD_ATTR: ['onclick', 'onchange', 'style', 'target'],
      ALLOW_UNKNOWN_PROTOCOLS: true,
    }
    opts.sanitize = false
    return opts
  }, [schema?.display])

  // --- Custom wizard navigation config from schema ---
  // These hooks MUST be above early returns (Rules of Hooks)
  const customNavConfig: CustomWizardNavigation | undefined = (schema as any)?.customWizardNavigation
  const currentPanel = useMemo(() => {
    if (!schema) return undefined
    const panels = (schema as any)?.components as any[] | undefined
    if (!Array.isArray(panels)) return undefined
    const wizardPanels = panels.filter((c: any) => c.type === 'panel')
    return wizardPanels[currentPage]
  }, [schema, currentPage])

  // --- Nested wizard custom navigation (takes priority over main wizard config) ---
  // Reads the active nested referenced wizard's schema and current panel from the
  // live Form.io instance. nestedNavTick causes a recompute when nested pages change.
  const nestedNavInfo = useMemo(() => {
    const form = formInstanceRef.current
    if (!form) return null
    const wizard = form.root || form
    const nested = findActiveReferencedWizardsOnPage(wizard, currentPage)
    const activeNested = nested[0] ?? null
    if (!activeNested?.embeddedForm) return null
    const ef = activeNested.embeddedForm
    // Form.io stores the full schema document in ef.form (internal _form getter)
    const nestedSchema = ef.form ?? ef._form
    const nestedCustomNavConfig: CustomWizardNavigation | undefined = nestedSchema?.customWizardNavigation
    if (!nestedCustomNavConfig?.enabled) return null
    // Read the nested wizard's current panel component definition for per-panel overrides
    const nestedPanelIndex: number = ef.page ?? 0
    const nestedPageComponent = Array.isArray(ef.pages) ? ef.pages[nestedPanelIndex] : null
    const nestedPanelNavigation: PanelCustomNavigation | undefined = nestedPageComponent?.component?.customNavigation
    return { customNavConfig: nestedCustomNavConfig, panelNavigation: nestedPanelNavigation }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, nestedNavTick])

  const handleCustomAction = useCallback(async (button: NavigationButton) => {
    const form = formInstanceRef.current
    if (!form) return
    const wizard = form.root || form

    switch (button.action) {
      case 'back': {
        // Nested wizard delegation — go back in nested wizard first
        const pageBefore = wizard?.page ?? form?.page ?? 0
        const nestedBack = findActiveReferencedWizardsOnPage(wizard, pageBefore)
        const activeNestedBack = nestedBack[0] ?? null
        if (activeNestedBack && !activeNestedBack.isReferencedFirstStep()) {
          activeNestedBack.goToReferencedPreviousStep()
          setNestedNavTick((t) => t + 1)
          break
        }

        const targetBack = Math.max(0, pageBefore - 1)
        if (wizard && typeof wizard.prevPage === 'function') {
          wizard.prevPage()
        }

        // Save only if saveBeforeAction is explicitly true
        if (button.saveBeforeAction && saveRecord && recordId != null) {
          const raw = form.submission?.data ?? {}
          const payload = { ...cleanFormData(raw), _wizardStep: targetBack }
          setIsSaving(true)
          try {
            await saveRecord(recordId, payload, targetBack)
            if (typeof window !== 'undefined' && getWizardEditUrl) {
              window.history.replaceState(null, '', getWizardEditUrl(recordId, targetBack))
            }
          } catch (e) {
            onError?.(e instanceof Error ? e.message : 'Error')
          } finally {
            setIsSaving(false)
          }
        }
        break
      }

      case 'next': {
        // Validate only if validateBeforeAction is true
        if (button.validateBeforeAction) {
          const stepVal = wizard?.page ?? form?.page ?? 0
          const nestedVal = findActiveReferencedWizardsOnPage(wizard, stepVal)
          const activeNestedVal = nestedVal[0] ?? null
          const targetFormVal = activeNestedVal?.embeddedForm ?? wizard ?? form
          const dataVal = targetFormVal?.submission?.data ?? {}
          const nestedPageIdxVal = targetFormVal?.page ?? 0
          const panelVal = targetFormVal?.pages?.[nestedPageIdxVal]

          if (typeof targetFormVal.setPristine === 'function') {
            targetFormVal.setPristine(false)
          }

          const isValid = panelVal?.checkValidity
            ? panelVal.checkValidity(dataVal, true, dataVal, false)
            : (targetFormVal?.checkValidity?.(dataVal, true, dataVal, false) ?? true)
          if (!isValid) return
        }

        // Nested wizard delegation — advance nested wizard first
        const stepNext = wizard?.page ?? form?.page ?? 0
        const nestedNext = findActiveReferencedWizardsOnPage(wizard, stepNext)
        const activeNestedNext = nestedNext[0] ?? null
        if (activeNestedNext && !activeNestedNext.isReferencedLastStep()) {
          if (!button.validateBeforeAction) {
            const nestedEf = activeNestedNext.embeddedForm
            if (nestedEf && typeof nestedEf.setPage === 'function') {
              const nestedCurrentPage = nestedEf.page ?? 0
              const nestedPageComp = nestedEf.pages?.[nestedCurrentPage]
              const origNestedCheck = nestedPageComp?.checkValidity
              if (nestedPageComp) {
                nestedPageComp.checkValidity = () => true
              }
              try {
                nestedEf.setPage(nestedCurrentPage + 1)
              } finally {
                if (nestedPageComp && origNestedCheck) {
                  nestedPageComp.checkValidity = origNestedCheck
                }
              }
            } else {
              activeNestedNext.goToReferencedNextStep()
            }
          } else {
            activeNestedNext.goToReferencedNextStep()
          }
          setNestedNavTick((t) => t + 1)
          break
        }

        const pagesNext = wizard?.pages ?? form?.pages ?? []
        const totalNext = Array.isArray(pagesNext) ? pagesNext.length : 1
        const targetNext = Math.min(stepNext + 1, totalNext - 1)

        if (wizard) {
          if (!button.validateBeforeAction && typeof wizard.setPage === 'function') {
            const currentPageComponent = wizard.pages?.[stepNext]
            const origCheckValidity = currentPageComponent?.checkValidity
            if (currentPageComponent) {
              currentPageComponent.checkValidity = () => true
            }
            try {
              wizard.setPage(targetNext)
            } finally {
              if (currentPageComponent && origCheckValidity) {
                currentPageComponent.checkValidity = origCheckValidity
              }
            }
            setCurrentPage(targetNext)
            setNestedNavTick((t) => t + 1)
          } else if (typeof wizard.nextPage === 'function') {
            wizard.nextPage()
          }
        }

        // Save only if saveBeforeAction is true
        if (button.saveBeforeAction) {
          setIsSaving(true)
          try {
            await flushPendingFileUploads(wizard || form)
          } catch (uploadErr: any) {
            onError?.(uploadErr?.message || 'File upload failed.')
            setIsSaving(false)
            break
          }
          const finalData = { ...(form.submission?.data ?? {}) }

          if (createRecord && (recordId == null || recordId === undefined)) {
            try {
              const payload = { ...cleanFormData(finalData), _wizardStep: targetNext }
              const result = await createRecord(payload)
              if (result?.id != null) {
                onRecordCreated?.(result.id, payload, targetNext)
              }
            } catch (e) {
              onError?.(e instanceof Error ? e.message : 'Error')
            } finally {
              setIsSaving(false)
            }
            break
          }

          if (saveRecord && recordId != null) {
            try {
              const payload = { ...cleanFormData(finalData), _wizardStep: targetNext }
              const ok = await saveRecord(recordId, payload, targetNext)
              if (ok && typeof window !== 'undefined' && getWizardEditUrl) {
                window.history.replaceState(null, '', getWizardEditUrl(recordId, targetNext))
              }
            } catch (e) {
              onError?.(e instanceof Error ? e.message : 'Error')
            } finally {
              setIsSaving(false)
            }
          } else {
            setIsSaving(false)
          }
        }
        break
      }

      case 'skip': {
        const targetIndex = resolveSkipTarget(button, schema)
        if (targetIndex != null && wizard && typeof wizard.setPage === 'function') {
          wizard.setPage(targetIndex)
          // Save only if saveBeforeAction is true
          if (button.saveBeforeAction && saveRecord && recordId != null) {
            const data = { ...cleanFormData(form.submission?.data ?? {}), _wizardStep: targetIndex }
            try {
              setIsSaving(true)
              await saveRecord(recordId, data, targetIndex)
              if (typeof window !== 'undefined' && getWizardEditUrl) {
                window.history.replaceState(null, '', getWizardEditUrl(recordId, targetIndex))
              }
            } catch (e) {
              onError?.(e instanceof Error ? e.message : 'Error')
            } finally {
              setIsSaving(false)
            }
          }
        }
        break
      }

      case 'saveExit':
        await handleSaveExit()
        break

      case 'exit':
        onExit?.()
        break

      case 'finish':
      case 'submit': {
        if (button.validateBeforeAction !== false) {
          const data = form.submission?.data ?? {}
          const step = wizard?.page ?? form?.page ?? 0
          const panel = wizard?.pages?.[step]
          const isValid = panel?.checkValidity
            ? panel.checkValidity(data, true, data, false)
            : (wizard?.checkValidity?.(data, true, data, false) ?? true)
          if (!isValid) return
        }
        setIsSaving(true)
        try {
          await flushPendingFileUploads(wizard || form)
        } catch (uploadErr: any) {
          onError?.(uploadErr?.message || 'File upload failed.')
          setIsSaving(false)
          return
        }
        const finalData = { ...(form.submission?.data ?? {}) }
        if (saveRecord && recordId != null) {
          try {
            const payload = { ...cleanFormData(finalData), _wizardStep: currentPage }
            await saveRecord(recordId, payload, currentPage)
            onExit?.()
          } catch (e) {
            onError?.(e instanceof Error ? e.message : 'Error')
          } finally {
            setIsSaving(false)
          }
        } else if (createRecord) {
          try {
            const payload = cleanFormData(finalData)
            const result = await createRecord(payload)
            if (result?.id != null) {
              onRecordCreated?.(result.id, payload, currentPage)
            }
            onExit?.()
          } catch (e) {
            onError?.(e instanceof Error ? e.message : 'Error')
          } finally {
            setIsSaving(false)
          }
        } else {
          setIsSaving(false)
          onExit?.()
        }
        break
      }

      case 'custom': {
        if (button.validateBeforeAction) {
          const stepCustom = wizard?.page ?? form?.page ?? 0
          const nestedCustom = findActiveReferencedWizardsOnPage(wizard, stepCustom)
          const activeNestedCustom = nestedCustom[0] ?? null
          const targetFormCustom = activeNestedCustom?.embeddedForm ?? wizard ?? form
          const dataCustom = targetFormCustom?.submission?.data ?? {}
          const nestedPageIdx = targetFormCustom?.page ?? 0
          const panelCustom = targetFormCustom?.pages?.[nestedPageIdx]

          if (typeof targetFormCustom.setPristine === 'function') {
            targetFormCustom.setPristine(false)
          }

          const isValid = panelCustom?.checkValidity
            ? panelCustom.checkValidity(dataCustom, true, dataCustom, false)
            : (targetFormCustom?.checkValidity?.(dataCustom, true, dataCustom, false) ?? true)
          if (!isValid) return
        }

        // Set field values on form submission data if configured
        const fieldValues: Record<string, unknown> | null = (() => {
          const raw = button.setFieldValues
          if (!raw) return null
          if (typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>
          if (typeof raw === 'string') {
            try { return JSON.parse(raw) } catch { return null }
          }
          return null
        })()

        if (fieldValues && Object.keys(fieldValues).length > 0) {
          const targetForm = (() => {
            const nested = findActiveReferencedWizardsOnPage(wizard, wizard?.page ?? 0)
            const activeNested = nested[0] ?? null
            return activeNested?.embeddedForm ?? wizard ?? form
          })()
          const submissionData = targetForm?.submission?.data
          if (submissionData) {
            for (const [fieldKey, fieldValue] of Object.entries(fieldValues)) {
              submissionData[fieldKey] = fieldValue
            }
            targetForm.submission = { ...targetForm.submission, data: submissionData }
            if (typeof targetForm.triggerChange === 'function') {
              targetForm.triggerChange()
            }
            if (typeof targetForm.triggerRedraw === 'function') {
              targetForm.triggerRedraw()
            } else if (typeof targetForm.redraw === 'function') {
              targetForm.redraw()
            }
          }
        }

        if (onNext) {
          const state = getState()
          await onNext({ ...state, data: { ...state.data, __customActionKey: button.customActionKey } })
        }
        break
      }

      default:
        break
    }
  }, [handleSaveExit, schema, saveRecord, recordId, createRecord, onRecordCreated, onExit, onError, onNext, getWizardEditUrl, getState, currentPage])

  if (!schema) return <FormLoading />

  const isManagedEdit = loadRecord != null && recordId != null
  if (isManagedEdit && recordLoading) return <FormLoading />
  if (isManagedEdit && recordLoadError) {
    return (
      <div style={{ maxWidth: 600, margin: '40px auto', padding: 24, textAlign: 'center' }}>
        <FormErrorComponent message={recordLoadError} />
        {onExit && (
          <button
            type="button"
            onClick={onExit}
            style={{ marginTop: 16, padding: '8px 16px', cursor: 'pointer' }}
          >
            Back
          </button>
        )}
      </div>
    )
  }

  const isLastPage = totalPages > 0 && currentPage >= totalPages - 1

  const panelNavigation: PanelCustomNavigation | undefined = currentPanel?.customNavigation

  // Nested wizard custom nav takes priority when enabled; falls back to main wizard config
  const effectiveCustomNavConfig = nestedNavInfo?.customNavConfig ?? customNavConfig
  const effectivePanelNavigation = nestedNavInfo?.panelNavigation ?? panelNavigation

  const useCustomNav = effectiveCustomNavConfig?.enabled === true &&
    resolveNavigationButtons(effectiveCustomNavConfig, effectivePanelNavigation).length > 0

  const btnBase = {
    padding: '10px 20px',
    marginRight: 10,
    marginTop: 16,
    borderRadius: 6,
    fontWeight: 500,
    border: 'none',
    cursor: 'pointer' as const,
  }
  const btnPrev = { ...btnBase, background: '#e5e7eb', color: '#374151' }
  const btnSave = { ...btnBase, background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db' }
  const btnNext = { ...btnBase, background: '#2563eb', color: '#fff' }
  const btnDisabled = { opacity: 0.6, cursor: 'not-allowed' as const }

  // Read fresh on every render; formDataTick state change triggers re-render.
  // When a nested wizard is active, merge its submission data so conditions
  // referencing nested form fields (like incomeEntryMethod) evaluate correctly.
  void formDataTick
  const formData = (() => {
    const parentData = formInstanceRef.current?.submission?.data ?? {}
    if (!nestedNavInfo) return parentData
    const form = formInstanceRef.current
    if (!form) return parentData
    const wizard = form.root || form
    const nested = findActiveReferencedWizardsOnPage(wizard, currentPage)
    const activeNested = nested[0] ?? null
    const nestedData = activeNested?.embeddedForm?.submission?.data ?? {}
    return { ...parentData, ...nestedData }
  })()

  return (
    <>
      <ReactTransStackTable
        schema={schema}
        submission={effectiveInitialData}
        readOnly={false}
        onFormReady={handleFormReady}
        createFormOptions={createFormOptions}
      />
      {useCustomNav ? (
        <WizardNavigationRenderer
          config={effectiveCustomNavConfig!}
          panelNavigation={effectivePanelNavigation}
          data={formData}
          onAction={handleCustomAction}
          isSaving={isSaving}
          className={navigationClassName}
          isNested={nestedNavInfo !== null}
        />
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 24 }} className={navigationClassName}>
          {currentPage > 0 && (
            <button
              type="button"
              onClick={handlePrevious}
              disabled={isSaving}
              style={{ ...btnPrev, ...(isSaving ? btnDisabled : {}) }}
            >
              Previous
            </button>
          )}
          <button
            type="button"
            onClick={handleSaveExit}
            disabled={isSaving}
            style={{ ...btnSave, ...(isSaving ? btnDisabled : {}) }}
          >
            {isSaving ? 'Saving...' : 'Save & Exit'}
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={isSaving}
            style={{ ...btnNext, ...(isSaving ? btnDisabled : {}) }}
          >
            {isSaving ? 'Saving...' : isLastPage ? 'Submit' : 'Next'}
          </button>
        </div>
      )}
    </>
  )
}
