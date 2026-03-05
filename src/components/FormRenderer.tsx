'use client'

import React, { useEffect, useRef } from 'react'
import { registerCustomComponents } from '../registry'
import { injectFormioOverrides } from '../utils/inject-formio-overrides'

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
}

let registrationPromise: Promise<unknown> | null = null

function ensureComponentsRegistered(): Promise<unknown> {
  if (!registrationPromise) {
    registrationPromise = registerCustomComponents()
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

export function FormRenderer({
  schema,
  onSubmit,
  submission,
  readOnly = false,
}: FormRendererProps) {
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

    ensureComponentsRegistered().then((Formio) => {
      if (cancelled || !containerRef.current) return

      const F = Formio as FormioStatic

      F.createForm(container, schema, { readOnly })
        .then((form) => {
          if (cancelled) {
            form.destroy()
            return
          }

          formInstanceRef.current = form

          // Use the ref so we always call the latest submission/callback
          const currentSubmission = submissionRef.current
          if (currentSubmission && Object.keys(currentSubmission).length > 0) {
            form.submission = { data: currentSubmission }
          }

          form.on('submit', (sub: { data: Record<string, unknown> }) => {
            onSubmitRef.current?.(sub.data)
          })
        })
        .catch((err) => {
          if (!cancelled) console.error('[FormRenderer] createForm error:', err)
        })
    })

    return () => {
      cancelled = true
      if (formInstanceRef.current) {
        formInstanceRef.current.destroy()
        formInstanceRef.current = null
      }
    }
  }, [schema, readOnly]) // ← onSubmit and submission intentionally removed

  return <div ref={containerRef} className="formio-renderer" />
}
