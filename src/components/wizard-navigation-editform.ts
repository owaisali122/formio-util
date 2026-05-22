/**
 * Wizard Navigation — Designer editForm definitions
 *
 * Provides:
 * 1. Panel-level "Navigation" tab editForm components (added to wizard panels)
 * 2. Form-level customWizardNavigation editForm components (for FormBuilder UI)
 */

// ---------------------------------------------------------------------------
// Shared: button action options
// ---------------------------------------------------------------------------

const ACTION_OPTIONS = [
  { label: 'Back', value: 'back' },
  { label: 'Next / Continue', value: 'next' },
  { label: 'Skip', value: 'skip' },
  { label: 'Submit', value: 'submit' },
  { label: 'Save & Exit', value: 'saveExit' },
  { label: 'Exit', value: 'exit' },
  { label: 'Finish', value: 'finish' },
  { label: 'Custom', value: 'custom' },
]

const VARIANT_OPTIONS = [
  { label: 'Primary', value: 'primary' },
  { label: 'Secondary', value: 'secondary' },
  { label: 'Outline', value: 'outline' },
  { label: 'Danger', value: 'danger' },
  { label: 'Link', value: 'link' },
]

const ALIGN_OPTIONS = [
  { label: 'Left', value: 'left' },
  { label: 'Center', value: 'center' },
  { label: 'Right', value: 'right' },
]

const CONDITION_OPERATOR_OPTIONS = [
  { label: 'Equals', value: 'equals' },
  { label: 'Not Equals', value: 'notEquals' },
  { label: 'Exists', value: 'exists' },
  { label: 'Not Exists', value: 'notExists' },
  { label: 'Truthy', value: 'truthy' },
  { label: 'Falsy', value: 'falsy' },
]

// ---------------------------------------------------------------------------
// Button row fields (used inside an editgrid)
// ---------------------------------------------------------------------------

const BUTTON_EDITGRID_COMPONENTS = [
  {
    type: 'textfield',
    key: 'key',
    label: 'Key',
    input: true,
    tableView: true,
    weight: 10,
  },
  {
    type: 'textfield',
    key: 'label',
    label: 'Label',
    input: true,
    tableView: true,
    weight: 20,
  },
  {
    type: 'select',
    key: 'action',
    label: 'Action',
    input: true,
    dataSrc: 'values',
    data: { values: ACTION_OPTIONS },
    defaultValue: 'next',
    tableView: true,
    weight: 30,
  },
  {
    type: 'select',
    key: 'variant',
    label: 'Style',
    input: true,
    dataSrc: 'values',
    data: { values: VARIANT_OPTIONS },
    defaultValue: 'primary',
    tableView: true,
    weight: 40,
  },
  {
    type: 'select',
    key: 'align',
    label: 'Align',
    input: true,
    dataSrc: 'values',
    data: { values: ALIGN_OPTIONS },
    defaultValue: 'right',
    tableView: false,
    weight: 50,
  },
  {
    type: 'checkbox',
    key: 'visible',
    label: 'Visible',
    input: true,
    defaultValue: true,
    tableView: false,
    weight: 60,
  },
  {
    type: 'checkbox',
    key: 'disabled',
    label: 'Disabled',
    input: true,
    defaultValue: false,
    tableView: false,
    weight: 70,
  },
  {
    type: 'textfield',
    key: 'targetStepKey',
    label: 'Target Step Key',
    input: true,
    tableView: false,
    description: 'For skip action: key of the target wizard page.',
    weight: 80,
    conditional: {
      json: { '===': [{ var: 'row.action' }, 'skip'] },
    },
  },
  {
    type: 'number',
    key: 'targetStepIndex',
    label: 'Target Step Index',
    input: true,
    tableView: false,
    description: 'For skip action: 0-based index of the target wizard page.',
    weight: 85,
    conditional: {
      json: { '===': [{ var: 'row.action' }, 'skip'] },
    },
  },
  {
    type: 'textfield',
    key: 'customActionKey',
    label: 'Custom Action Key',
    input: true,
    tableView: false,
    description: 'For custom action: unique key passed to the action handler.',
    weight: 86,
    conditional: {
      json: { '===': [{ var: 'row.action' }, 'custom'] },
    },
  },
  {
    type: 'textarea',
    key: 'setFieldValues',
    label: 'Set Field Values (JSON)',
    input: true,
    tableView: false,
    rows: 3,
    description: 'JSON object of field key/value pairs to set on form data when clicked. Example: {"fieldKey": "value", "otherField": ""}',
    placeholder: '{"dataPanelHiddenField": "employee"}',
    weight: 87,
    conditional: {
      json: { '===': [{ var: 'row.action' }, 'custom'] },
    },
  },
  {
    type: 'checkbox',
    key: 'validateBeforeAction',
    label: 'Validate before action',
    input: true,
    defaultValue: false,
    tableView: false,
    weight: 90,
  },
  {
    type: 'checkbox',
    key: 'saveBeforeAction',
    label: 'Save before action',
    input: true,
    defaultValue: false,
    tableView: false,
    weight: 95,
  },
  {
    type: 'checkbox',
    key: 'renderOnlyWhenNested',
    label: 'Show only when inside a nested (referenced) wizard',
    input: true,
    defaultValue: false,
    tableView: false,
    weight: 100,
    tooltip: 'When checked, this button is hidden when the wizard runs standalone and only appears when embedded inside a parent wizard via a Referenced Form component.',
  },
]

// ---------------------------------------------------------------------------
// Condition row fields (used inside a nested datagrid for visibleWhen/disabledWhen)
// ---------------------------------------------------------------------------

const CONDITION_DATAGRID_COMPONENTS = [
  {
    type: 'textfield',
    key: 'field',
    label: 'Field Key',
    input: true,
    weight: 10,
  },
  {
    type: 'select',
    key: 'operator',
    label: 'Operator',
    input: true,
    dataSrc: 'values',
    data: { values: CONDITION_OPERATOR_OPTIONS },
    weight: 20,
  },
  {
    type: 'textfield',
    key: 'value',
    label: 'Value',
    input: true,
    weight: 30,
    description: 'Leave empty for exists/notExists/truthy/falsy operators.',
  },
]

// ---------------------------------------------------------------------------
// Panel-level "Navigation" tab
// ---------------------------------------------------------------------------

/**
 * Returns the editForm "Navigation" tab definition to inject into wizard panels.
 */
export function getWizardPanelNavigationTab() {
  return {
    label: 'Navigation',
    key: 'customNavigationTab',
    weight: 50,
    components: [
      {
        type: 'checkbox',
        key: 'customNavigation.hideDefaultNavigation',
        label: 'Hide Default Navigation',
        input: true,
        defaultValue: false,
        weight: 10,
        tooltip: 'When enabled, the default wizard navigation buttons are hidden for this page.',
      },
      {
        type: 'editgrid',
        key: 'customNavigation.buttons',
        label: 'Custom Navigation Buttons',
        input: true,
        weight: 20,
        addAnother: 'Add Button',
        saveRow: 'Save',
        removeRow: 'Remove',
        rowDrafts: false,
        components: BUTTON_EDITGRID_COMPONENTS,
      },
      {
        type: 'panel',
        title: 'Button Visibility Conditions',
        key: 'buttonVisibilityPanel',
        collapsible: true,
        collapsed: true,
        weight: 30,
        components: [
          {
            type: 'htmlelement',
            tag: 'p',
            content: 'Configure visibility/disabled conditions per button using the button key. Conditions use AND logic (all must pass).',
            weight: 5,
          },
          {
            type: 'textarea',
            key: 'customNavigation.conditionsJson',
            label: 'Conditions JSON (advanced)',
            input: true,
            rows: 6,
            weight: 10,
            description: 'JSON object mapping button keys to { visibleWhen: [...], disabledWhen: [...] }. Each condition: { field, operator, value }.',
            placeholder: '{\n  "continue": {\n    "disabledWhen": [{ "field": "agreeToTerms", "operator": "falsy" }]\n  }\n}',
          },
        ],
      },
    ],
  }
}

// ---------------------------------------------------------------------------
// Form-level customWizardNavigation editForm components
// ---------------------------------------------------------------------------

/**
 * Returns the form-level customWizardNavigation edit form fields.
 * These are rendered in a dedicated config panel in the FormBuilder UI.
 */
export function getFormLevelNavigationEditComponents() {
  return [
    {
      type: 'checkbox',
      key: 'customWizardNavigation.enabled',
      label: 'Enable Custom Wizard Navigation',
      input: true,
      defaultValue: false,
      weight: 10,
      tooltip: 'When enabled, the wizard uses custom navigation buttons instead of the default Previous/Next/Submit.',
    },
    {
      type: 'checkbox',
      key: 'customWizardNavigation.hideDefaultNavigation',
      label: 'Hide Default Navigation (global)',
      input: true,
      defaultValue: true,
      weight: 20,
      tooltip: 'When enabled, default navigation buttons are hidden for all wizard pages unless overridden per page.',
      conditional: {
        json: { '===': [{ var: 'data.customWizardNavigation.enabled' }, true] },
      },
    },
    {
      type: 'editgrid',
      key: 'customWizardNavigation.defaultButtons',
      label: 'Default Buttons (fallback for all pages)',
      input: true,
      weight: 30,
      addAnother: 'Add Default Button',
      saveRow: 'Save',
      removeRow: 'Remove',
      rowDrafts: false,
      conditional: {
        json: { '===': [{ var: 'data.customWizardNavigation.enabled' }, true] },
      },
      components: BUTTON_EDITGRID_COMPONENTS,
    },
  ]
}
