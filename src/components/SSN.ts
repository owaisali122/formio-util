export const SSN_TYPE = 'ssn'

export interface SSNSchema {
  type: string
  label: string
  key: string
  input: boolean
  tableView: boolean
  inputMask: string
  placeholder: string
  masked: boolean
  maskedDisplayMode: 'last4' | 'fullMask'
  maskCharacter: string
  allowToggleMask: boolean
  preventCopy: boolean
  hidden: boolean
  autofocus: boolean
  [k: string]: unknown
}

export class SSNComponent {
  static schema(overrides?: Record<string, unknown>): SSNSchema {
    return {
      type: SSN_TYPE,
      label: 'Social Security Number',
      key: 'ssn',
      input: true,
      tableView: false,
      inputMask: '999-99-9999',
      placeholder: '___-__-____',
      masked: true,
      maskedDisplayMode: 'last4',
      maskCharacter: '*',
      allowToggleMask: true,
      preventCopy: true,
      hidden: false,
      autofocus: false,
      ...overrides,
    }
  }

  static get builderInfo() {
    return {
      title: 'SSN',
      group: 'basic',
      icon: 'id-card',
      weight: 26,
      documentation: 'Social Security Number input with masking, reveal toggle, and validation.',
      schema: SSNComponent.schema(),
    }
  }

  static editForm() {
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
                  type: 'textfield',
                  key: 'label',
                  label: 'Label',
                  input: true,
                  required: true,
                  validate: {
                    required: true,
                  },
                  defaultValue: 'Social Security Number',
                  weight: 10,
                },
                {
                  type: 'textfield',
                  key: 'placeholder',
                  label: 'Placeholder',
                  input: true,
                  defaultValue: '___-__-____',
                  weight: 20,
                },
                {
                  type: 'textarea',
                  key: 'description',
                  label: 'Description',
                  input: true,
                  defaultValue: 'Enter your 9-digit Social Security Number',
                  weight: 30,
                },
                {
                  type: 'checkbox',
                  key: 'autofocus',
                  label: 'Initial Focus',
                  input: true,
                  defaultValue: false,
                  weight: 40,
                  tooltip:
                    'When enabled, this field receives focus when the form loads.',
                },
                {
                  type: 'checkbox',
                  key: 'hidden',
                  label: 'Hidden',
                  input: true,
                  defaultValue: false,
                  weight: 50,
                  tooltip:
                    'When enabled, this component is hidden from the form.',
                },
                {
                  type: 'checkbox',
                  key: 'disabled',
                  label: 'Disabled',
                  input: true,
                  defaultValue: false,
                  weight: 60,
                },
              ],
            },
            // ── Masking tab ─────────────────────────────────────────
            {
              label: 'Masking',
              key: 'masking',
              components: [
                {
                  type: 'checkbox',
                  key: 'masked',
                  label: 'Enable Masked Display',
                  input: true,
                  defaultValue: true,
                  description: 'When enabled, the SSN is masked when not being edited.',
                  weight: 10,
                },
                {
                  type: 'select',
                  key: 'maskedDisplayMode',
                  label: 'Default Display Mode',
                  input: true,
                  required: true,
                  validate: {
                    required: true,
                  },
                  defaultValue: 'last4',
                  data: {
                    values: [
                      { label: 'Show Last 4 Digits (***-**-1234)', value: 'last4' },
                      { label: 'Fully Masked (***-**-****)', value: 'fullMask' },
                    ],
                  },
                  description: 'How the SSN appears when masked.',
                  weight: 20,
                },
                {
                  type: 'textfield',
                  key: 'maskCharacter',
                  label: 'Mask Character',
                  input: true,
                  defaultValue: '*',
                  placeholder: '*',
                  description: 'Single character used to replace hidden digits.',
                  weight: 30,
                },
                {
                  type: 'checkbox',
                  key: 'allowToggleMask',
                  label: 'Enable Eye Icon Toggle',
                  input: true,
                  defaultValue: true,
                  description: 'Show an eye icon that lets the user reveal or hide the full SSN.',
                  weight: 40,
                },
                {
                  type: 'checkbox',
                  key: 'preventCopy',
                  label: 'Prevent Copy',
                  input: true,
                  defaultValue: true,
                  description: 'Prevent the user from copying the SSN value.',
                  weight: 50,
                },
              ],
            },
            // ── Validation tab ──────────────────────────────────────
            {
              label: 'Validation',
              key: 'validation',
              components: [
                {
                  type: 'checkbox',
                  key: 'validate.required',
                  label: 'Required',
                  input: true,
                  defaultValue: false,
                  weight: 10,
                },
                {
                  type: 'textfield',
                  key: 'validate.customMessage',
                  label: 'Custom Error Message',
                  input: true,
                  placeholder: 'Please enter a valid SSN',
                  description: 'Error message shown when validation fails.',
                  weight: 20,
                },
                {
                  type: 'textarea',
                  key: 'validate.custom',
                  label: 'Custom Validation',
                  input: true,
                  rows: 5,
                  weight: 30,
                  description:
                    'Write custom JavaScript validation. Set "valid" to true or an error message string. Available variables: valid, input, data, row, component, instance.',
                },
                {
                  type: 'textarea',
                  key: 'customDefaultValue',
                  label: 'Custom Default Value',
                  input: true,
                  rows: 5,
                  weight: 40,
                  description:
                    'Write custom JavaScript for the default value. Set the "value" variable.',
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
                  key: 'key',
                  label: 'Property Name',
                  input: true,
                  required: true,
                  validate: {
                    required: true,
                  },
                  defaultValue: 'ssn',
                  description:
                    'Unique key for this component (e.g. ssn).',
                  weight: 10,
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
                {
                  type: 'textarea',
                  key: 'customConditional',
                  label: 'Custom Conditional (JavaScript)',
                  input: true,
                  rows: 5,
                  weight: 30,
                  description:
                    'Write custom JavaScript. Set "show" to true/false. Available variables: show, data, row, component, instance.',
                },
              ],
            },
          ],
        },
      ],
    }
  }
}
