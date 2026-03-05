/** Form.io override styles – injected into document.head at runtime by FormBuilder and FormRenderer. */
export const formioOverridesCss = `/* Ensure cards render correctly inside Form.io dialogs */
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

.formio-builder .formio-component-textfield,
.formio-builder .formio-component-textarea,
.formio-builder .formio-component-email,
.formio-builder .formio-component-number,
.formio-builder .formio-component-password,
.formio-builder .formio-component-select,
.formio-builder .formio-component-radio,
.formio-builder .formio-component-checkbox,
.formio-builder .formio-component-button,
.formbuilder .formio-component-textfield,
.formbuilder .formio-component-textarea,
.formbuilder .formio-component-email,
.formbuilder .formio-component-number,
.formbuilder .formio-component-password,
.formbuilder .formio-component-select,
.formbuilder .formio-component-radio,
.formbuilder .formio-component-checkbox,
.formbuilder .formio-component-button {
  padding: 8px;
  margin: 4px 0;
  border: 1px dashed #e2e8f0;
  border-radius: 4px;
}

.formio-builder .formio-component:hover,
.formbuilder .formio-component:hover {
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

/* App Detail Ref: preview panel in edit dialog */
.formio-dialog .app-detail-ref-preview-inner {
  min-height: 280px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}
.app-detail-ref-preview-inner {
  min-height: 200px;
}
`
