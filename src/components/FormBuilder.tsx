'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  configure,
  getBuilderConfig,
  registerCustomComponents,
  setupAppDetailRefFormDropdown,
} from '../registry'
import { BootstrapProvider } from './BootstrapProvider'
import { injectFormioOverrides } from '../utils/inject-formio-overrides'

/** Form.io form JSON schema (display, components, etc.) */
export interface FormBuilderSchema {
  display?: 'form' | 'wizard'
  components?: unknown[]
  [key: string]: unknown
}

export type DisplayType = 'form' | 'wizard'

/** Inner builder instance (WizardBuilder / WebformBuilder) from formBuilder.ready */
export interface FormioBuilderInstance {
  form?: { display?: string; components?: unknown[] }
  schema?: FormBuilderSchema
  on?(event: string, fn: (schema: FormBuilderSchema) => void): void
  destroy?(): void
}

const DEFAULT_SCHEMA: FormBuilderSchema = {
  display: 'form',
  components: [],
}

function cloneSchema(schema: FormBuilderSchema): FormBuilderSchema {
  return JSON.parse(JSON.stringify(schema))
}

export interface FormBuilderProps {
  /** Current schema value (controlled) */
  value: FormBuilderSchema | null | undefined
  /** Called when schema changes */
  setValue: (schema: FormBuilderSchema) => void
  /** Forms list API URL for App Detail Ref dropdown. If not set, configure() must have been called with formsListUrl. */
  formsListUrl?: string
  /** Optional class name for the root wrapper */
  className?: string
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { width: '100%', minHeight: 400 },
  toolbar: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' },
  label: { fontWeight: 500 },
  select: { padding: '0.25rem 0.5rem', borderRadius: 4, border: '1px solid #ccc' },
  builder: { minHeight: 360 },
  loading: { padding: '1rem', color: '#666' },
  error: { padding: '1rem', background: '#fef2f2', color: '#b91c1c', borderRadius: 4 },
}

function FormBuilderInner({
  value,
  setValue,
  formsListUrl,
  className,
}: FormBuilderProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const builderInstanceRef = useRef<FormioBuilderInstance | null>(null)
  const [packageError, setPackageError] = useState<string | null>(null)
  const [builderReady, setBuilderReady] = useState(false)
  const [containerReady, setContainerReady] = useState(false)
  const valueRef = useRef(value)
  valueRef.current = value

  const displayType = useMemo<DisplayType>(() => {
    const v = value
    if (v?.display === 'wizard' || v?.display === 'form') return v.display
    return 'form'
  }, [value?.display])

  useEffect(() => {
    if (formsListUrl !== undefined) {
      configure({ formsListUrl })
    }
  }, [formsListUrl])

  useEffect(() => {
    if (value == null) {
      setValue(DEFAULT_SCHEMA)
    }
  }, [value, setValue])

  const initBuilder = useCallback(
    async (overrideSchema?: FormBuilderSchema) => {
      if (!containerRef.current) return

      await registerCustomComponents({ formsListUrl })
      const win =
        typeof window !== 'undefined'
          ? (window as unknown as {
              Formio?: {
                FormBuilder?: new (
                  el: HTMLElement,
                  s: FormBuilderSchema,
                  o: Record<string, unknown>
                ) => { ready: Promise<FormioBuilderInstance> }
              }
            })
          : undefined
      const FormBuilderClass = win?.Formio?.FormBuilder
      if (!FormBuilderClass) {
        setPackageError('formiojs could not be loaded.')
        return
      }

      if (builderInstanceRef.current?.destroy) {
        try {
          builderInstanceRef.current.destroy()
        } catch (_) {}
        builderInstanceRef.current = null
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }

      const currentValue = valueRef.current
      const initialSchema: FormBuilderSchema =
        overrideSchema ??
        (currentValue &&
        typeof currentValue === 'object' &&
        Array.isArray((currentValue as FormBuilderSchema).components)
          ? (currentValue as FormBuilderSchema)
          : DEFAULT_SCHEMA)

      const schemaWithDisplay = cloneSchema(initialSchema)
      if (schemaWithDisplay.display !== 'form' && schemaWithDisplay.display !== 'wizard') {
        schemaWithDisplay.display = 'form'
      }

      const builderConfig = getBuilderConfig({ template: 'bootstrap' })
      const formBuilder = new FormBuilderClass(
        containerRef.current,
        schemaWithDisplay,
        builderConfig
      )
      const instance = (await formBuilder.ready) as FormioBuilderInstance
      builderInstanceRef.current = instance
      setupAppDetailRefFormDropdown(instance as unknown as Record<string, unknown>)

      const getSchemaFromInstance = (): FormBuilderSchema | null => {
        try {
          const inst = builderInstanceRef.current
          if (!inst) return null
          const form = inst.form
          if (form && typeof form === 'object' && Array.isArray(form.components)) {
            return { ...form, display: schemaWithDisplay.display } as FormBuilderSchema
          }
          if (inst.schema && typeof inst.schema === 'object') {
            return inst.schema as FormBuilderSchema
          }
          return null
        } catch {
          return null
        }
      }

      const syncSchemaToField = (schema: FormBuilderSchema | null) => {
        if (!schema || typeof schema !== 'object') return
        const comps = schema.components
        if (!Array.isArray(comps)) return
        const withDisplay = schema.display
          ? schema
          : { ...schema, display: schemaWithDisplay.display }
        setValue(cloneSchema(withDisplay))
      }

      const schemaToSave = getSchemaFromInstance()
      if (schemaToSave && Array.isArray(schemaToSave.components)) {
        syncSchemaToField(schemaToSave)
      }

      instance.on?.('change', (schema: FormBuilderSchema) => {
        if (schema && typeof schema === 'object') syncSchemaToField(schema)
      })

      instance.on?.('saveComponent', () => {
        queueMicrotask(() => {
          const s = getSchemaFromInstance()
          if (s) syncSchemaToField(s)
        })
      })

      const syncAfterChange = () => {
        queueMicrotask(() => {
          const s = getSchemaFromInstance()
          if (s) syncSchemaToField(s)
        })
      }
      instance.on?.('addComponent', syncAfterChange)
      instance.on?.('removeComponent', syncAfterChange)
      instance.on?.('updateComponent', syncAfterChange)

      setPackageError(null)
      setBuilderReady(true)
    },
    [setValue, formsListUrl]
  )

  useEffect(() => {
    if (!containerReady) return
    initBuilder()
    return () => {
      if (builderInstanceRef.current?.destroy) {
        try {
          builderInstanceRef.current.destroy()
        } catch (_) {}
        builderInstanceRef.current = null
      }
    }
  }, [containerReady, initBuilder])

  const handleDisplayChange = useCallback(
    (newDisplay: DisplayType) => {
      const currentSchema =
        value &&
        typeof value === 'object' &&
        Array.isArray((value as FormBuilderSchema).components)
          ? cloneSchema(value as FormBuilderSchema)
          : cloneSchema(DEFAULT_SCHEMA)
      currentSchema.display = newDisplay
      if (
        newDisplay === 'wizard' &&
        (!currentSchema.components || currentSchema.components.length === 0)
      ) {
        currentSchema.components = [{ type: 'panel', title: 'Page 1', components: [] }]
      }
      setValue(currentSchema)
      if (builderInstanceRef.current?.destroy) {
        try {
          builderInstanceRef.current.destroy()
        } catch (_) {}
        builderInstanceRef.current = null
      }
      setBuilderReady(false)
      initBuilder(currentSchema)
    },
    [value, setValue, initBuilder]
  )

  return (
    <div className={className} style={styles.wrapper}>
      <div style={styles.toolbar}>
        <label style={styles.label}>Display as:</label>
        <select
          style={styles.select}
          value={displayType}
          onChange={(e) => handleDisplayChange(e.target.value as DisplayType)}
        >
          <option value="form">Form</option>
          <option value="wizard">Wizard</option>
        </select>
      </div>
      {packageError && <div style={styles.error}>{packageError}</div>}
      {!packageError && (
        <div
          ref={(el) => {
            (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = el
            if (el) setContainerReady(true)
          }}
          style={styles.builder}
        />
      )}
      {!packageError && !builderReady && (
        <div style={styles.loading}>Loading builder…</div>
      )}
    </div>
  )
}

/**
 * Form.io schema builder with Bootstrap and all custom components handled inside the library.
 * Wrap once at app level with configure({ formsListUrl, bootstrapCssUrl?, formioCssUrl? }) or pass formsListUrl here.
 */
export function FormBuilder(props: FormBuilderProps) {
  useEffect(() => {
    injectFormioOverrides()
  }, [])

  return (
    <BootstrapProvider>
      <FormBuilderInner {...props} />
    </BootstrapProvider>
  )
}
