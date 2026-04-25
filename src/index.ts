export {
  registerCustomComponents,
  getBuilderConfig,
  configure,
  getFormsListUrl,
  ensureWizardSchema,
  createFormBuilder,
  setupReferencedFormDropdown,
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
  ReferencedFormComponent,
  REFERENCED_FORM_TYPE,
  REFERENCED_FORM_EXCLUDE_TYPES,
} from './components/ReferencedForm'
export type {
  ReferencedFormSchema,
  ReferencedFormBuilderInfo,
} from './components/ReferencedForm'

export {
  getFormSchemaForPreview,
  getDocComponents,
  getReferencableComponents,
  runReferencedFormInjection,
} from './utils/formio-referenced-form-logic'

export { formBuilderPlugin } from './plugins/formBuilderPlugin'

export {
  TaxIdComponent,
  TAX_ID_TYPE,
  SSN_TYPE,
} from './components/SSN'
export type { TaxIdSchema } from './components/SSN'

export {
  SmartStreetDropdownComponent,
  SEARCHABLE_DROPDOWN_TYPE,
} from './components/SmartStreetDropdown'
export type { SmartStreetDropdownItem } from './components/SmartStreetDropdown'

export { SmartStreet } from './components/SmartStreet'
export type { SmartStreetProps, SmartStreetValue, AddressApiConfig, AddressResult, AddressMapping } from './components/SmartStreet'

export {
  FileUploaderComponent,
  FILE_UPLOADER_TYPE,
} from './components/FileUpload'
export type { FileUploaderSchema } from './components/FileUpload'

export {
  ProfileFieldSectionComponent,
  PROFILE_FIELD_SECTION_TYPE,
} from './components/ProfileFieldSection'
export type { ProfileFieldSectionSchema } from './components/ProfileFieldSection'

export {
  TanStackTableComponent,
  TANSTACK_TABLE_TYPE,
} from './components/TransStack'
export type { TransStackSchema, TransStackColumn } from './components/TransStack'

export {
  PopupComponent,
  POPUP_COMPONENT_TYPE,
} from './components/PopupComponent'
export type { PopupComponentSchema, PopupComponentButtonSchema } from './components/PopupComponent'

export {
  ProgressBarComponent,
  PROGRESS_BAR_TYPE,
} from './components/ProgressBar'
export type { ProgressBarSchema } from './components/ProgressBar'

export {
  FileDownloadComponent,
  FILE_DOWNLOAD_TYPE,
} from './components/FileDownload'
export type { FileDownloadSchema } from './components/FileDownload'

export {
  FormReviewComponent,
  FORM_REVIEW_TYPE,
} from './components/FormReview'
export type {
  FormReviewSchema,
  FormReviewSectionSchema,
  FormReviewItemSchema,
} from './components/FormReview'

export {
  DatePickerComponent,
  DATE_PICKER_TYPE,
} from './components/DatePicker'
export type { DatePickerSchema } from './components/DatePicker'

export { DatePickerInput, parseDateString, formatDateString, parseDisabledDates, parseDisabledRanges } from './components/DatePickerInput'
export type { DatePickerInputProps, DateRangeValue, DisabledDateRange } from './components/DatePickerInput'

export {
  TabIndexManagerComponent,
  TAB_INDEX_MANAGER_TYPE,
} from './components/TabIndexManager'
export type { TabIndexManagerSchema, TabIndexManagerRow } from './components/TabIndexManager'

export { setupTabIndexManagerDropdown, collectBuilderKeys } from './registries/register-tab-index-manager'

export {
  buildComponentMap,
  resolveLabel,
  getSubmissionValue,
  formatValue,
  resolveSections,
} from './utils/form-review-helpers'
export type {
  ReviewItemConfig,
  ReviewSectionConfig,
  FormReviewSettings,
  ResolvedReviewItem,
  ResolvedReviewSection,
} from './utils/form-review-helpers'

export {
  createComponentLogger,
  configureSharedLogger,
  packageLogger,
  maskTaxId,
  describeFile,
  truncate,
} from './utils/logger'
export type { ComponentLogger, LogContext, LogLevel } from './utils/logger'
