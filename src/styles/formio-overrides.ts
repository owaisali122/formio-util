/** Form.io override styles – injected into document.head at runtime by FormBuilder and FormRenderer. */
export const formioOverridesCss = `/* Ensure the date picker calendar portal floats above all page containers.
   react-datepicker renders the popper into #date-picker-portal at body level
   when portalId is set. Without an explicit z-index it defaults to 1, which
   puts it behind Bootstrap modals (1050), navbars (1030), and fixed headers. */
.react-datepicker-popper {
  z-index: 9999 !important;
}

/* Ensure cards render correctly inside Form.io dialogs */
.formio-dialog .card {
  display: block;
}

/* Make nav visible and sized properly inside dialogs */
.formio-dialog .nav {
  height: fit-content;
  width: auto;
  opacity: 1;
}

/* Ensure builder nav is visible and auto-sized */
.formio-builder .nav {
  opacity: 1;
  height: auto;
}

/* ========== Form Builder layout (so wizard pages and builder look correct) ========== */
.formio-builder,
.formbuilder {
  background: #ffffff;
  min-height: 500px;
}

.formio-builder .builder-sidebar,
.formbuilder .builder-sidebar {
  background: #f8fafc;
}

.formio-builder .formio-component,
.formbuilder .formio-component {
  margin: 0;
}

.formio-builder .drag-container,
.formbuilder .drag-container {
  padding: 10px;
}

/* Dashed border only in builder drop zone (not in renderer) */
.formio-builder .drag-container .formio-component-textfield,
.formio-builder .drag-container .formio-component-textarea,
.formio-builder .drag-container .formio-component-email,
.formio-builder .drag-container .formio-component-number,
.formio-builder .drag-container .formio-component-password,
.formio-builder .drag-container .formio-component-select,
.formio-builder .drag-container .formio-component-radio,
.formio-builder .drag-container .formio-component-checkbox,
.formio-builder .drag-container .formio-component-button,
.formbuilder .drag-container .formio-component-textfield,
.formbuilder .drag-container .formio-component-textarea,
.formbuilder .drag-container .formio-component-email,
.formbuilder .drag-container .formio-component-number,
.formbuilder .drag-container .formio-component-password,
.formbuilder .drag-container .formio-component-select,
.formbuilder .drag-container .formio-component-radio,
.formbuilder .drag-container .formio-component-checkbox,
.formbuilder .drag-container .formio-component-button {
  padding: 8px;
  margin: 4px 0;
  border: 1px dashed #e2e8f0;
  border-radius: 4px;
}

.formio-builder .drag-container .formio-component:hover,
.formbuilder .drag-container .formio-component:hover {
  border-color: #3b82f6;
}

/* Wizard builder: page tabs and "+ PAGE" button visible */
.formio-builder .wizard-pages,
.formbuilder .wizard-pages {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  list-style: none;
  margin: 0 0 1rem 0;
  padding: 0;
}

.formio-builder .wizard-pages li,
.formbuilder .wizard-pages li {
  display: inline-flex;
  margin: 0;
}

.formio-builder .wizard-page-label,
.formbuilder .wizard-page-label {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  color: #fff;
  border: none;
}

.formio-builder .wizard-pages li:not(.wizard-add-page) .wizard-page-label,
.formbuilder .wizard-pages li:not(.wizard-add-page) .wizard-page-label {
  background-color: #0d6efd;
}

.formio-builder .wizard-pages li:not(.wizard-add-page) .badge-info,
.formbuilder .wizard-pages li:not(.wizard-add-page) .badge-info {
  background-color: #0dcaf0;
}

.formio-builder .wizard-pages li:not(.wizard-add-page) .badge-primary,
.formbuilder .wizard-pages li:not(.wizard-add-page) .badge-primary {
  background-color: #0d6efd;
}

.formio-builder .wizard-add-page .wizard-page-label,
.formbuilder .wizard-add-page .wizard-page-label {
  background-color: #198754;
  cursor: pointer;
}

.formio-builder .wizard-add-page .wizard-page-label:hover,
.formbuilder .wizard-add-page .wizard-page-label:hover {
  background-color: #157347;
}

.formio-builder .wizard-add-page,
.formbuilder .wizard-add-page {
  list-style: none;
}

/* Referenced Form: preview panel in builder edit dialog only */
.formio-dialog .referenced-form-preview-inner {
  min-height: 280px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}
.referenced-form-preview-inner {
  min-height: 200px;
}

/* Referenced Form in renderer: force plain look (no dashed/gray box) */
.formio-renderer .referenced-form-container,
.formio-renderer .referenced-form-placeholder,
.formio-renderer .referenced-form-preview-inner {
  border: none !important;
  background: transparent !important;
  padding: 0 !important;
  margin: 0 !important;
  min-height: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}
.formio-renderer .formio-component-appDetailRefRuntime,
.formio-renderer .formio-component-appdetailrefruntime,
.formio-renderer .formio-component-appDetailRef,
.formio-renderer .formio-component-appdetailref {
  border: none !important;
  background: transparent !important;
  padding: 0 !important;
  margin: 0 0 1rem 0 !important;
  box-shadow: none !important;
}

/* If builder classes leak into renderer, neutralize dashed component wrappers */
.formio-renderer .formio-component-textfield,
.formio-renderer .formio-component-textarea,
.formio-renderer .formio-component-email,
.formio-renderer .formio-component-number,
.formio-renderer .formio-component-password,
.formio-renderer .formio-component-select,
.formio-renderer .formio-component-radio,
.formio-renderer .formio-component-checkbox,
.formio-renderer .formio-component-button {
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
}

/* ========== Form Review — Renderer ========== */

.form-review-description {
  color: #6c757d;
  margin-bottom: 0.5rem;
}

.form-review-toolbar {
  text-align: right;
  margin-bottom: 0.5rem;
}

.form-review-section {
  margin-bottom: 0.75rem;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  overflow: hidden;
}

.form-review-section-header {
  padding: 0.625rem 1rem;
  cursor: pointer;
  background-color: #f8f9fa;
  border-bottom: 1px solid transparent;
  transition: background-color 0.15s ease;
}

.form-review-section-header[aria-expanded="true"] {
  background-color: #e8f0fe;
  border-bottom-color: #dee2e6;
}

.form-review-section-header[aria-expanded="false"] {
  background-color: #f8f9fa;
  border-bottom-color: transparent;
}

.form-review-section-header--static {
  padding: 0.625rem 1rem;
  background-color: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
}

.form-review-section-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.form-review-section-body {
  padding: 1rem;
}

.form-review-section-body--hidden {
  display: none;
}

.form-review-item-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #6c757d;
  margin-bottom: 2px;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.form-review-item-value {
  word-wrap: break-word;
  overflow-wrap: break-word;
  white-space: normal;
}

.form-review-sensitive-value {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
}

.form-review-sensitive-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: #6c757d;
  cursor: pointer;
  line-height: 1;
}

.form-review-sensitive-toggle:hover,
.form-review-sensitive-toggle:focus {
  color: #495057;
  text-decoration: none;
}

.form-review-item-value--empty {
  color: #6c757d;
}

.form-review-bool-icon--checked {
  color: #28a745;
  margin-right: 4px;
}

.form-review-bool-icon--unchecked {
  color: #6c757d;
  margin-right: 4px;
}

.form-review-empty-text {
  color: #6c757d;
  font-style: italic;
  margin: 0;
}

/* ========== Form Review — Designer Configuration Tab ========== */

.formio-dialog .formio-component-sections {
  overflow-x: auto;
}

.formio-dialog .formio-component-sections .datagrid-table {
  min-width: 860px;
  table-layout: auto;
}

.formio-dialog .formio-component-sections .datagrid-table th {
  white-space: nowrap;
  font-size: 0.85rem;
  padding: 0.5rem;
}

.formio-dialog .formio-component-sections .datagrid-table td {
  padding: 0.5rem;
  vertical-align: top;
}

.formio-dialog .formio-component-sections .datagrid-table td .form-control {
  min-width: 120px;
}

.formio-dialog .formio-component-sections .datagrid-table td textarea.form-control {
  min-width: 200px;
}

/* ========== Tab Index Manager — Designer Select Wrapping ========== */

.tab-index-manager-key-select .choices__inner {
  overflow: visible;
  min-height: 44px;
  height: auto;
}

.tab-index-manager-key-select .choices__list--single,
.tab-index-manager-key-select .choices__list--single .choices__item,
.tab-index-manager-key-select .choices__list--dropdown .choices__item,
.tab-index-manager-key-select .choices__item.choices__item--selectable,
.tab-index-manager-key-select .tab-index-manager-key-option {
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.tab-index-manager-key-select .choices__list--single .choices__item {
  padding-right: 28px;
}

.tab-index-manager-key-select .choices__list--dropdown .choices__item--selectable,
.tab-index-manager-key-select[dir='rtl'] .choices__list--dropdown .choices__item--selectable {
  padding-right: 10px;
  padding-left: 10px;
}

.tab-index-manager-key-select .choices__list--dropdown .choices__item--selectable::after {
  display: none;
}
`
