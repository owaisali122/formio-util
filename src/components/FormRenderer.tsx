'use client'

import React, { useEffect, useRef } from 'react'
import { registerCustomComponents } from '../registry'

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

export function FormRenderer({
  schema,
  onSubmit,
  submission,
  readOnly = false,
}: FormRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const formInstanceRef = useRef<{ destroy: () => void } | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container || !schema) return

    let cancelled = false

    ensureComponentsRegistered().then((Formio) => {
      if (cancelled || !containerRef.current) return

      const F = Formio as {
        createForm: (
          el: HTMLElement,
          schema: FormRendererSchema,
          opts?: { readOnly?: boolean; [key: string]: unknown }
        ) => Promise<{ on: (e: string, fn: (sub: { data: Record<string, unknown> }) => void) => void; submission: { data: Record<string, unknown> }; destroy: () => void }>
      }

      F.createForm(container, schema, { readOnly })
        .then((form) => {
          if (cancelled) {
            form.destroy()
            return
          }
          formInstanceRef.current = form

          if (submission && Object.keys(submission).length > 0) {
            form.submission = { data: submission }
          }

          if (onSubmit) {
            form.on('submit', (sub: { data: Record<string, unknown> }) => {
              onSubmit(sub.data)
            })
          }
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
  }, [schema, readOnly, submission, onSubmit])

  return <div ref={containerRef} className="formio-renderer" />
}
