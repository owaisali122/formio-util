'use client'

import { useEffect, useState } from 'react'
import { FormRenderer } from '../components/FormRenderer'

/**
 * Wrapper component for single form rendering with schema fetching by slug
 * 
 * Fetches form schema from /api/forms/get-by-slug?slug={slug}
 * Then renders FormRenderer with the schema.
 * 
 * Usage:
 *   <FormIORenderSingleWithSlug
 *     slug="user-registration"
 *     onSubmit={async (data, formRef) => { await submitForm(data) }}
 *   />
 */
interface FormIORenderSingleWithSlugProps {
  slug: string
  initialData?: Record<string, any>
  onSubmit?: (data: Record<string, any>, formInstanceRef?: React.MutableRefObject<any>) => void | Promise<void>
  onError?: (error: string) => void
  onCancel?: () => void
}

// Stub components - these will be in consumer app
const FormLoading = () => <div className="formio-loading">Loading form...</div>
const FormErrorComponent = ({ message }: { message: string }) => (
  <div className="formio-error" role="alert" style={{ color: 'red', padding: '12px', border: '1px solid red', borderRadius: '4px' }}>
    Error: {message}
  </div>
)

export default function FormIORenderSingleWithSlug({
  slug,
  initialData,
  onSubmit,
  onError,
  onCancel,
}: FormIORenderSingleWithSlugProps) {
  const [form, setForm] = useState<{ id: number; schema: any } | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    const load = async () => {
      try {
        setLoadError(null)
        const res = await fetch(`/api/forms/get-by-slug?slug=${encodeURIComponent(slug)}`)
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
        setForm({ id: data.id, schema: data.schema })
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to load form'
        setLoadError(errorMessage)
        onError?.(errorMessage)
      }
    }
    load()
  }, [slug, onError])

  if (loadError) return <FormErrorComponent message={loadError} />
  if (!form) return <FormLoading />

  return (
    <FormRenderer
      schema={form.schema}
      onSubmit={onSubmit}
      submission={initialData}
      readOnly={false}
    />
  )
}
