/**
 * Form.io Referenced Form – standalone designer component.
 *
 * The API endpoint for fetching forms is configured per-component via the
 * "Data Source" tab in the edit dialog.
 */

export const REFERENCED_FORM_TYPE = 'appDetailRef'
export const REFERENCED_FORM_EXCLUDE_TYPES: string[] = ['fieldReference', 'appDetailRef']

const DEFAULT_KEY = 'appDetailRef'
const DEFAULT_LABEL = 'Referenced Form'

const EDIT_FIELD_KEYS = {
  selectedFormId: 'selectedFormId',
  key: 'key',
} as const

export interface ReferencedFormSchema {
  type: string
  label: string
  key: string
  input: boolean
  tableView: boolean
  selectedFormId: string
  hidden: boolean
  autofocus: boolean
  hideNestedWizardNavigation: boolean
  // data source configuration
  apiType: 'custom' | 'secure'
  apiEndpoint: string
  apiMethod: string
  dataPath: string
  authType?: string
  authUsername?: string
  authPassword?: string
  partnerId?: string
  [k: string]: unknown
}

export interface ReferencedFormBuilderInfo {
  title: string
  group: string
  icon: string
  weight: number
  documentation: string
  schema: ReferencedFormSchema
}

export class ReferencedFormComponent {
  static schema(overrides?: Record<string, unknown>): ReferencedFormSchema {
    return {
      type: REFERENCED_FORM_TYPE,
      label: DEFAULT_LABEL,
      key: DEFAULT_KEY,
      input: false,
      tableView: false,
      selectedFormId: '',
      hidden: false,
      autofocus: false,
      hideNestedWizardNavigation: false,
      // data source defaults
      apiType: 'custom',
      apiEndpoint: '',
      apiMethod: 'GET',
      dataPath: 'schema',
      authType: 'basic',
      authUsername: '',
      authPassword: '',
      partnerId: '',
      ...overrides,
    }
  }

  static get builderInfo(): ReferencedFormBuilderInfo {
    return {
      title: 'Referenced Form',
      group: 'basic',
      icon: 'list-alt',
      weight: 25,
      documentation: 'Embeds a referenced form by ID. Configure the API endpoint in the "Data Source" tab.',
      schema: ReferencedFormComponent.schema(),
    }
  }

  static editForm(): { components: unknown[] } {
    return {
      components: [
        {
          type: 'tabs',
          key: 'tabs',
          components: [
            // ── Display tab ─────────────────────────────────────────
            {
              label: 'Display',
              key: 'display',
              components: [
                {
                  type: 'select',
                  key: EDIT_FIELD_KEYS.selectedFormId,
                  label: 'Form',
                  input: true,
                  required: true,
                  validate: {
                    required: true,
                  },
                  data: { values: [] },
                  dataSrc: 'values',
                  valueProperty: 'value',
                  labelProperty: 'label',
                  template: '<span>{{ item.label }}</span>',
                  description:
                    'Select a form (listed by title and slug). This stores the reference only; add Reference Field components separately to reference specific fields.',
                  weight: 10,
                },
                {
                  type: 'textfield',
                  key: 'label',
                  label: 'Label',
                  input: true,
                  defaultValue: DEFAULT_LABEL,
                  weight: 20,
                },
                {
                  type: 'checkbox',
                  key: 'autofocus',
                  label: 'Initial Focus',
                  input: true,
                  defaultValue: false,
                  weight: 30,
                  tooltip:
                    'When enabled, the embedded form receives focus when the page loads.',
                },
                {
                  type: 'checkbox',
                  key: 'hidden',
                  label: 'Hidden',
                  input: true,
                  defaultValue: false,
                  weight: 40,
                  tooltip:
                    'When enabled, this component is hidden from the form.',
                },
                {
                  type: 'checkbox',
                  key: 'hideNestedWizardNavigation',
                  label: 'Hide Nested Wizard Navigation',
                  input: true,
                  defaultValue: false,
                  weight: 50,
                  tooltip:
                    'When enabled and the referenced form is a wizard, hides its internal navigation (tablist, breadcrumb, pagination header, and page buttons). The parent wizard controls navigation instead.',
                },
              ],
            },
            // ── API tab ─────────────────────────────────────────────
            {
              label: 'API',
              key: 'api',
              components: [
                {
                  type: 'textfield',
                  key: EDIT_FIELD_KEYS.key,
                  label: 'Property Name',
                  input: true,
                  required: true,
                  validate: {
                    required: true,
                  },
                  description:
                    'Unique key for this component (e.g. appDetailRef).',
                  weight: 10,
                },
              ],
            },
            // ── Data Source tab ─────────────────────────────
            {
              label: 'Data Source',
              key: 'dataSourceTab',
              components: [
                {
                  type: 'select',
                  key: 'apiType',
                  label: 'API Type',
                  input: true,
                  required: true,
                  validate: {
                    required: true,
                  },
                  defaultValue: 'custom',
                  data: {
                    values: [
                      { label: 'Custom API', value: 'custom' },
                      { label: 'Secure API', value: 'secure' },
                    ],
                  },
                  description:
                    'Select Custom API for standard endpoints, or Secure API for endpoints requiring authentication and headers.',
                  weight: 5,
                },
                {
                  type: 'textfield',
                  key: 'apiEndpoint',
                  label: 'API Endpoint',
                  input: true,
                  required: true,
                  validate: {
                    required: true,
                  },
                  placeholder: '/api/forms',
                  description:
                    'Base URL for fetching the referenced form schema (e.g. /api/forms). The form ID will be appended automatically.',
                  weight: 10,
                },
                {
                  type: 'select',
                  key: 'apiMethod',
                  label: 'HTTP Method',
                  input: true,
                  defaultValue: 'GET',
                  required: true,
                  validate: {
                    required: true,
                  },
                  data: {
                    values: [
                      { label: 'GET', value: 'GET' },
                      { label: 'POST', value: 'POST' },
                    ],
                  },
                  weight: 20,
                },
                // ── Secure API fields — shown only when apiType = 'secure' ──
                {
                  type: 'select',
                  key: 'authType',
                  label: 'Authentication Type',
                  input: true,
                  defaultValue: 'basic',
                  data: { values: [{ label: 'Basic Auth', value: 'basic' }] },
                  description:
                    'Authentication method for the secure API endpoint.',
                  weight: 25,
                  conditional: {
                    json: { '===': [{ var: 'data.apiType' }, 'secure'] },
                  },
                },
                {
                  type: 'textfield',
                  key: 'authUsername',
                  label: 'Basic Auth Username',
                  input: true,
                  validate: {
                    required: true,
                  },
                  placeholder: 'Enter username',
                  description: 'Username for Basic Authentication.',
                  weight: 26,
                  conditional: {
                    json: {
                      and: [
                        { '===': [{ var: 'data.apiType' }, 'secure'] },
                        { '===': [{ var: 'data.authType' }, 'basic'] },
                      ],
                    },
                  },
                },
                {
                  type: 'password',
                  key: 'authPassword',
                  label: 'Basic Auth Password',
                  input: true,
                  validate: {
                    required: true,
                  },
                  placeholder: 'Enter password',
                  description:
                    'Password for Basic Authentication. Value is masked in the UI.',
                  weight: 27,
                  conditional: {
                    json: {
                      and: [
                        { '===': [{ var: 'data.apiType' }, 'secure'] },
                        { '===': [{ var: 'data.authType' }, 'basic'] },
                      ],
                    },
                  },
                },
                {
                  type: 'textfield',
                  key: 'partnerId',
                  label: 'Partner ID Header',
                  input: true,
                  validate: {
                    required: true,
                  },
                  placeholder: 'Enter partner-id value',
                  description:
                    'Value for the partner-id HTTP header sent with secure API requests.',
                  weight: 28,
                  conditional: {
                    json: { '===': [{ var: 'data.apiType' }, 'secure'] },
                  },
                },
                // ── Response mapping ──
                {
                  type: 'textfield',
                  key: 'dataPath',
                  label: 'Data Path in Response',
                  input: true,
                  required: true,
                  validate: {
                    required: true,
                  },
                  defaultValue: 'schema',
                  description:
                    'Dot-path to the form schema in the API response (e.g. "schema", "data.schema").',
                  weight: 30,
                },
              ],
            },
            // ── Conditional tab ─────────────────────────────────────
            {
              label: 'Conditional',
              key: 'conditional',
              components: [
                {
                  type: 'panel',
                  title: 'Simple',
                  key: 'simpleConditional',
                  theme: 'default',
                  components: [
                    {
                      type: 'select',
                      key: 'conditional.show',
                      label: 'This component should Display:',
                      dataSrc: 'values',
                      data: {
                        values: [
                          { label: 'True', value: 'true' },
                          { label: 'False', value: 'false' },
                        ],
                      },
                      input: true,
                      weight: 10,
                    },
                    {
                      type: 'textfield',
                      key: 'conditional.when',
                      label: 'When the form component:',
                      input: true,
                      weight: 20,
                      description:
                        'Enter the API key of the component to check.',
                    },
                    {
                      type: 'textfield',
                      key: 'conditional.eq',
                      label: 'Has the value:',
                      input: true,
                      weight: 30,
                    },
                  ],
                },
                {
                  type: 'panel',
                  title: 'Advanced Conditions',
                  key: 'advancedConditional',
                  theme: 'default',
                  components: [
                    {
                      type: 'textarea',
                      key: 'conditional.json',
                      label: 'JSONLogic',
                      input: true,
                      rows: 5,
                      weight: 10,
                      description:
                        'Enter raw JSON Logic to control component visibility. Refer to jsonlogic.com for documentation.',
                    },
                  ],
                },
              ],
            },
            // ── Logic tab ───────────────────────────────────────────
            {
              label: 'Logic',
              key: 'logic',
              components: [
                {
                  type: 'textarea',
                  key: 'customConditional',
                  label: 'Custom Conditional',
                  input: true,
                  rows: 5,
                  weight: 10,
                  description:
                    'Write custom JavaScript. Set "show" to true/false. Available variables: show, data, row, component, instance.',
                },
                {
                  type: 'textarea',
                  key: 'customDefaultValue',
                  label: 'Custom Default Value',
                  input: true,
                  rows: 5,
                  weight: 20,
                  description:
                    'Write custom JavaScript for the default value. Set the "value" variable.',
                },
              ],
            },
          ],
        },
      ],
    }
  }
}
