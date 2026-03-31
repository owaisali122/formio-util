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
export { FormBuilder } from './components/FormBuilder'
export type {
  FormBuilderProps,
  FormBuilderSchema,
  FormioBuilderInstance,
  DisplayType,
} from './components/FormBuilder'

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

export { formBuilderPlugin } from './plugins/formBuilderPlugin'

export { SSNComponent, SSN_TYPE } from './components/SSN'
export type { SSNSchema } from './components/SSN'

export {
  SearchableDropdownComponent,
  SEARCHABLE_DROPDOWN_TYPE,
} from './components/SearchableDropdown'
export type { SearchableDropdownItem } from './components/SearchableDropdown'

export { SearchableDropdownReact } from './components/SearchableDropdownReact'
export type { SearchableDropdownReactProps } from './components/SearchableDropdownReact'

// ...PdfViewer exports removed...

// ...FileUpload exports removed...

export {
  FileUploaderComponent,
  FILE_UPLOADER_TYPE,
} from './components/FileUploader'
export type { FileUploaderSchema } from './components/FileUploader'

export {
  OverlayPopupComponent,
  OVERLAY_POPUP_TYPE,
} from './components/OverlayPopup'
export type { OverlayPopupSchema } from './components/OverlayPopup'

export {
  ProfileFieldSectionComponent,
  PROFILE_FIELD_SECTION_TYPE,
} from './components/ProfileFieldSection'
export type { ProfileFieldSectionSchema } from './components/ProfileFieldSection'
