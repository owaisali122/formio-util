import { registerAppDetailRef, setupAppDetailRefFormDropdown } from './registries/register-app-detail-ref'
import { registerSSN } from './registries/register-ssn'
import { registerSearchableDropdown } from './registries/register-searchable-dropdown'
import { registerFileUploader } from './registries/register-file-uploader'
import { registerOverlayPopup } from './registries/register-overlay-popup'
import { registerProfileFieldSection } from './registries/register-profile-field-section'
import { registerTanStackTable } from './registries/register-data-grid'
import type { FormioComponents } from './registries/types'

export type { FormioComponents }

export interface RegistryConfig {
  formsListUrl?: string
}

let _config: RegistryConfig = {}

export function configure(config: RegistryConfig): void {
  _config = { ..._config, ...config }
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
    await registerSearchableDropdown(Components)
    await registerFileUploader(Components)
    await registerOverlayPopup(Components)
    await registerProfileFieldSection(Components)
    await registerTanStackTable(Components)

    // Register runtime App Detail Ref component for renderer.
    // This uses the base FieldComponent so it plays nicely with Form.io's
    // standard value/update lifecycle, while keeping the builder behavior
    // (designer component + preview) unchanged.
    try {
      const FieldComponent = (FormioModuleObj.Components as any)?.components?.field
      if (FieldComponent) {
        const { createAppDetailRefRuntimeClass } = await import('./components/AppDetailRefRuntime')
        const AppDetailRefRuntime = createAppDetailRefRuntimeClass(FieldComponent)
        Components.setComponent('appDetailRefRuntime', AppDetailRefRuntime as never)

        // For each runtime class, preserve the designer statics (editForm,
        // builderInfo, schema) so the builder keeps showing the clean designer
        // preview and edit form when both sides run in the same context.

        const { default: createFileUploaderClass } = await import('./client/custom-components/FileUploaderFormIO')
        const FileUploaderRuntime = createFileUploaderClass(FieldComponent)
        const ExistingFileUploader = (Components as any).components?.fileUploader
        if (ExistingFileUploader) {
          if (ExistingFileUploader.editForm) FileUploaderRuntime.editForm = ExistingFileUploader.editForm
          if (ExistingFileUploader.builderInfo) {
            Object.defineProperty(FileUploaderRuntime, 'builderInfo', {
              get: () => ExistingFileUploader.builderInfo,
              configurable: true,
            })
          }
          const origFileUploaderSchema = ExistingFileUploader.schema
          if (typeof origFileUploaderSchema === 'function') {
            FileUploaderRuntime.schema = origFileUploaderSchema.bind(ExistingFileUploader)
          }
        }
        Components.setComponent('fileUploader', FileUploaderRuntime as never)

        const { default: createOverlayPopupClass } = await import('./client/custom-components/OverlayPopupFormIO')
        const OverlayPopupRuntime = createOverlayPopupClass(FieldComponent)
        const ExistingOverlayPopup = (Components as any).components?.overlayPopup
        if (ExistingOverlayPopup) {
          if (ExistingOverlayPopup.editForm) OverlayPopupRuntime.editForm = ExistingOverlayPopup.editForm
          if (ExistingOverlayPopup.builderInfo) {
            Object.defineProperty(OverlayPopupRuntime, 'builderInfo', {
              get: () => ExistingOverlayPopup.builderInfo,
              configurable: true,
            })
          }
          const origOverlaySchema = ExistingOverlayPopup.schema
          if (typeof origOverlaySchema === 'function') {
            OverlayPopupRuntime.schema = origOverlaySchema.bind(ExistingOverlayPopup)
          }
        }
        Components.setComponent('overlayPopup', OverlayPopupRuntime as never)

        const TextFieldComponent = (FormioModuleObj.Components as any)?.components?.textfield
        if (TextFieldComponent) {
          const ExistingSSN = (Components as any).components?.ssn
          const { default: createSSNMaskingClass } = await import('./client/custom-components/SSNMaskingFormIO')
          const SSNRuntime = createSSNMaskingClass(TextFieldComponent)
          // Preserve designer statics (editForm, builderInfo, schema) so the
          // builder keeps working when both run in the same context.
          if (ExistingSSN) {
            if (ExistingSSN.editForm) SSNRuntime.editForm = ExistingSSN.editForm
            if (ExistingSSN.builderInfo) {
              Object.defineProperty(SSNRuntime, 'builderInfo', {
                get: () => ExistingSSN.builderInfo,
                configurable: true,
              })
            }
            const origSchema = ExistingSSN.schema
            if (typeof origSchema === 'function') {
              SSNRuntime.schema = origSchema.bind(ExistingSSN)
            }
          }
          Components.setComponent('ssn', SSNRuntime as never)
        }

        const FieldsetComponent = (FormioModuleObj.Components as any)?.components?.fieldset
        if (FieldsetComponent) {
          const { default: createProfileFieldSectionClass } = await import('./client/custom-components/ProfileFieldSectionFormIO')
          const ProfileFieldSectionRuntime = createProfileFieldSectionClass(FieldsetComponent)
          const ExistingProfileFieldSection = (Components as any).components?.profileFieldSection
          if (ExistingProfileFieldSection) {
            if (ExistingProfileFieldSection.editForm) ProfileFieldSectionRuntime.editForm = ExistingProfileFieldSection.editForm
            if (ExistingProfileFieldSection.builderInfo) {
              Object.defineProperty(ProfileFieldSectionRuntime, 'builderInfo', {
                get: () => ExistingProfileFieldSection.builderInfo,
                configurable: true,
              })
            }
            const origProfileSchema = ExistingProfileFieldSection.schema
            if (typeof origProfileSchema === 'function') {
              ProfileFieldSectionRuntime.schema = origProfileSchema.bind(ExistingProfileFieldSection)
            }
          }
          Components.setComponent('profileFieldSection', ProfileFieldSectionRuntime as never)
        }

        // TanStack Table runtime
        const { default: createTanStackTableClass } = await import('./client/custom-components/data-grid/DataGridFormIO')
        const TanStackTableRuntime = createTanStackTableClass(FieldComponent)
        const ExistingTanStackTable = (Components as any).components?.tanstackTable
        if (ExistingTanStackTable) {
          if (ExistingTanStackTable.editForm) TanStackTableRuntime.editForm = ExistingTanStackTable.editForm
          if (ExistingTanStackTable.builderInfo) {
            Object.defineProperty(TanStackTableRuntime, 'builderInfo', {
              get: () => ExistingTanStackTable.builderInfo,
              configurable: true,
            })
          }
          const origTanStackTableSchema = ExistingTanStackTable.schema
          if (typeof origTanStackTableSchema === 'function') {
            TanStackTableRuntime.schema = origTanStackTableSchema.bind(ExistingTanStackTable)
          }
        }
        Components.setComponent('tanstackTable', TanStackTableRuntime as never)
      }
    } catch {
      // If registration fails, designer behavior remains intact; renderer
      // simply won't have the runtime components.
    }
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
          searchableDropdown: true,
          fileUploader: true,
          overlayPopup: true,
          tanstackTable: true,
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
          profileFieldSection: true,
        },
      },
      data: { default: false },
      premium: false,
    },
    ...overrides,
  }
}

export { setupAppDetailRefFormDropdown }
