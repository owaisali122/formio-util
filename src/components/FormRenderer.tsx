'use client'

import React, { useEffect, useRef } from 'react'
import { registerCustomComponents } from '../registry'
import { injectFormioOverrides } from '../utils/inject-formio-overrides'
import { runAppDetailRefInjection } from '../utils/formio-app-detail-ref-logic'
import { BootstrapProvider } from './BootstrapProvider'

/** Schema shape matches Form.io form JSON (display, components, etc.) */
export interface FormRendererSchema {
  display?: 'form' | 'wizard'
  components?: unknown[]
  [key: string]: unknown
}

export interface FormRendererProps {
  /** Form.io JSON schema (from builder) */
  schema: FormRendererSchema
  /** Called when the form is submitted */
  onSubmit?: (data: Record<string, unknown>) => void
  /** Prefill form values */
  submission?: Record<string, unknown>
  /** Render form as read-only */
  readOnly?: boolean
  /** Called once when the underlying Form.io form instance is created */
  onFormReady?: (form: FormioFormInstance) => void
  /** Optional Form.io createForm() options (e.g. buttonSettings to hide wizard buttons) */
  createFormOptions?: Record<string, unknown>
}

let registrationPromise: Promise<FormioStatic> | null = null

function ensureComponentsRegistered(): Promise<FormioStatic> {
  if (!registrationPromise) {
    registrationPromise = registerCustomComponents().then(() => {
      const globalAny = globalThis as any
      const formioFromWindow = typeof window !== 'undefined' ? (window as any).Formio : undefined
      const FormioGlobal = (formioFromWindow ?? globalAny.Formio) as FormioStatic | undefined

      if (!FormioGlobal || typeof FormioGlobal.createForm !== 'function') {
        throw new Error('[FormRenderer] Formio.createForm is not available after registration')
      }

      return FormioGlobal
    })
  }
  return registrationPromise
}

type FormioFormInstance = {
  on: (e: string, fn: (sub: { data: Record<string, unknown> }) => void) => void
  submission: { data: Record<string, unknown> }
  destroy: () => void
}

type FormioStatic = {
  createForm: (
    el: HTMLElement,
    schema: FormRendererSchema,
    opts?: { readOnly?: boolean; [key: string]: unknown }
  ) => Promise<FormioFormInstance>
}

export function FormRenderer(props: FormRendererProps) {
  const { schema, onSubmit, submission, readOnly = false, onFormReady, createFormOptions } = props
  const containerRef = useRef<HTMLDivElement>(null)
  const formInstanceRef = useRef<FormioFormInstance | null>(null)

  useEffect(() => {
    injectFormioOverrides()
  }, [])

  // Keep latest callbacks/values in refs so the effect never needs to re-run for them
  const onSubmitRef = useRef(onSubmit)
  useEffect(() => {
    onSubmitRef.current = onSubmit
  }, [onSubmit])

  const onFormReadyRef = useRef(onFormReady)
  useEffect(() => {
    onFormReadyRef.current = onFormReady
  }, [onFormReady])

  const createFormOptionsRef = useRef(createFormOptions)
  useEffect(() => {
    createFormOptionsRef.current = createFormOptions
  }, [createFormOptions])

  const submissionRef = useRef(submission)
  useEffect(() => {
    submissionRef.current = submission

    // If the form is already mounted just update submission in place — no rebuild needed
    if (formInstanceRef.current && submission && Object.keys(submission).length > 0) {
      formInstanceRef.current.submission = { data: submission }
    }
  }, [submission])

  // Only re-create the form when schema or readOnly actually changes
  useEffect(() => {
    const container = containerRef.current
    if (!container || !schema) return

    let cancelled = false

    ensureComponentsRegistered()
      .then((F) => {
        if (cancelled || !containerRef.current) return

        return runAppDetailRefInjection(schema)
          .then((effectiveSchema) => {
            if (cancelled || !containerRef.current) return null
            const opts = { readOnly, ...createFormOptionsRef.current }
            return F.createForm(container, effectiveSchema, opts)
          })
          .then((form) => {
            if (!form) return
            if (cancelled) {
              form.destroy()
              return
            }

            formInstanceRef.current = form

            // Expose the raw Form.io instance to consumers when requested
            onFormReadyRef.current?.(form)

            // Use the ref so we always call the latest submission/callback
            const currentSubmission = submissionRef.current
            if (currentSubmission && Object.keys(currentSubmission).length > 0) {
              form.submission = { data: currentSubmission }
            }

            form.on('submit', (sub: { data: Record<string, unknown> }) => {
              onSubmitRef.current?.(sub.data)
            })
          })
      })
      .catch((err) => {
        if (!cancelled) console.error('[FormRenderer] createForm error:', err)
      })

    return () => {
      cancelled = true
      if (formInstanceRef.current) {
        formInstanceRef.current.destroy()
        formInstanceRef.current = null
      }
    }
  }, [schema, readOnly]) // ← onSubmit and submission intentionally removed

  return (
    <BootstrapProvider>
      <div ref={containerRef} className="formio-renderer" />
    </BootstrapProvider>
  )
}
