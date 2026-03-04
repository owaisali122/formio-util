import { registerAppDetailRef, setupAppDetailRefFormDropdown } from './registries/register-app-detail-ref'
import { registerSSN } from './registries/register-ssn'
import type { FormioComponents } from './registries/types'

export type { FormioComponents }

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

/**
 * Ensures a wizard schema has at least one panel so the Form.io builder shows
 * the page tabs (Page 1, Page 2, …) and the "+ PAGE" button. Call this before
 * passing the schema to FormBuilder when display is 'wizard'.
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

  const FormioClass = (FormioModule as any).Formio
    ?? (FormioModule as any).default?.Formio
    ?? (FormioModule as any).default
    ?? FormioModule

  if (typeof window !== 'undefined') {
    (window as any).Formio = FormioClass
    ;(window as any).__FormioModule = FormioModule
  }
  if (typeof globalThis !== 'undefined') {
    (globalThis as any).Formio = FormioClass
  }

  const FormioModuleObj = FormioModule as any
  if (FormioModuleObj?.Components?.setComponent) {
    const Components = FormioModuleObj.Components as FormioComponents

    await registerAppDetailRef(Components)
    await registerSSN(Components)
  }

  // Wrap FormBuilder so wizard schema always has at least one panel (Page 1, + PAGE).
  const OriginalFormBuilder = (FormioModule as any)?.FormBuilder
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
      Object.defineProperty(FormioModule, 'FormBuilder', {
        value: FormBuilderWrapper,
        writable: true,
        configurable: true,
        enumerable: true,
      })
    } catch {
      // Formio may be frozen or FormBuilder non-configurable; app should use createFormBuilder() instead
    }
  }

  return FormioModule
}

/**
 * Use this when Formio.FormBuilder cannot be patched (read-only). Creates the builder with wizard schema fixed
 * so Page 1 and "+ PAGE" show.
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
          ssn: true,
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

export { setupAppDetailRefFormDropdown }
