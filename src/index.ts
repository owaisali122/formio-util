export {
  registerCustomComponents,
  getBuilderConfig,
  configure,
  getFormsListUrl,
  ensureWizardSchema,
  createFormBuilder,
  setupAppDetailRefFormDropdown,
} from './registry'
export type { RegistryConfig } from './registry'

export { BootstrapProvider } from './components/BootstrapProvider'
export { FormRenderer } from './components/FormRenderer'
export type { FormRendererProps, FormRendererSchema } from './components/FormRenderer'

export {
  AppDetailRefComponent,
  APP_DETAIL_REF_TYPE,
  APP_DETAIL_REF_EXCLUDE_TYPES,
} from './components/AppDetailRef'
export type {
  AppDetailRefSchema,
  AppDetailRefBuilderInfo,
  AppDetailRefEditFormComponent,
} from './components/AppDetailRef'

export {
  getFormSchemaForPreview,
  getDocComponents,
  getReferencableComponents,
  runAppDetailRefInjection,
} from './utils/formio-app-detail-ref-logic'
