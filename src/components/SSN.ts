// Backward-compatible alias — existing forms store type: 'ssn' in their JSON schema
export const SSN_TYPE = 'ssn'
// New primary type constant for forms created going forward
export const TAX_ID_TYPE = 'taxId'

export interface TaxIdSchema {
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
  /** Controls which tax ID formats are accepted: 'any' (SSN or ITIN), 'ssn', or 'itin' */
  validationMode: 'any' | 'ssn' | 'itin'
  [k: string]: unknown
}

export class TaxIdComponent {
  static schema(overrides?: Record<string, unknown>): TaxIdSchema {
    return {
      type: SSN_TYPE,
      label: 'SSN / ITIN',
      key: 'taxId',
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
      validationMode: 'any',
      ...overrides,
    }
  }

  static get builderInfo() {
    return {
      title: 'SSN / ITIN',
      group: 'basic',
      icon: 'id-card',
      weight: 26,
      documentation: 'SSN or ITIN input with NNN-NN-NNNN masking, reveal toggle, and configurable validation.',
      schema: TaxIdComponent.schema(),
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
                  defaultValue: 'SSN / ITIN',
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
                  defaultValue: 'Enter your 9-digit SSN or ITIN (NNN-NN-NNNN)',
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
                  description: 'When enabled, the SSN / ITIN is masked when not being edited.',
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
                  description: 'How the SSN / ITIN appears when masked.',
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
                  description: 'Show an eye icon that lets the user reveal or hide the full SSN / ITIN.',
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
                  type: 'select',
                  key: 'validationMode',
                  label: 'Validation Mode',
                  input: true,
                  required: true,
                  validate: { required: true },
                  defaultValue: 'any',
                  dataSrc: 'values',
                  data: {
                    values: [
                      { label: 'SSN or ITIN', value: 'any' },
                      { label: 'SSN Only', value: 'ssn' },
                      { label: 'ITIN Only', value: 'itin' },
                    ],
                  },
                  description: 'Controls which tax ID formats are accepted during validation.',
                  weight: 15,
                },
                {
                  type: 'textfield',
                  key: 'validate.customMessage',
                  label: 'Custom Error Message',
                  input: true,
                  placeholder: 'Please enter a valid SSN / ITIN',
                  description: 'Error message shown when validation fails.',
                  weight: 20,
                },
                {
                  type: 'textarea',
                  key: 'validate.custom',
                  label: 'Custom Validation (JavaScript)',
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
                  defaultValue: 'taxId',
                  description:
                    'Unique key for this component (e.g. taxId).',
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
            // ── Logic tab ───────────────────────────────────────────
            {
              label: 'Logic',
              key: 'logic',
              components: [
                {
                  weight: 0,
                  type: 'datagrid',
                  input: true,
                  key: 'logic',
                  label: 'Logic',
                  reorder: true,
                  addAnother: 'Add Logic',
                  components: [
                    {
                      type: 'textfield',
                      key: 'name',
                      label: 'Name',
                      input: true,
                    },
                    {
                      type: 'panel',
                      title: 'Trigger',
                      key: 'logicTrigger',
                      theme: 'default',
                      components: [
                        {
                          type: 'select',
                          key: 'trigger.type',
                          label: 'Type',
                          dataSrc: 'values',
                          data: {
                            values: [
                              { label: 'Simple', value: 'simple' },
                              { label: 'JavaScript', value: 'javascript' },
                              { label: 'JSON Logic', value: 'json' },
                              { label: 'Event', value: 'event' },
                            ],
                          },
                          input: true,
                          weight: 10,
                        },
                        {
                          type: 'textarea',
                          key: 'trigger.javascript',
                          label: 'JavaScript',
                          input: true,
                          rows: 5,
                          weight: 20,
                          conditional: { json: { '===': [{ var: 'row.trigger.type' }, 'javascript'] } },
                        },
                        {
                          type: 'textarea',
                          key: 'trigger.json',
                          label: 'JSON Logic',
                          input: true,
                          rows: 5,
                          weight: 30,
                          conditional: { json: { '===': [{ var: 'row.trigger.type' }, 'json'] } },
                        },
                        {
                          type: 'textfield',
                          key: 'trigger.event',
                          label: 'Event Name',
                          input: true,
                          weight: 40,
                          conditional: { json: { '===': [{ var: 'row.trigger.type' }, 'event'] } },
                        },
                      ],
                    },
                    {
                      type: 'panel',
                      title: 'Actions',
                      key: 'logicActions',
                      theme: 'default',
                      components: [
                        {
                          type: 'datagrid',
                          key: 'actions',
                          label: 'Actions',
                          addAnother: 'Add Action',
                          components: [
                            {
                              type: 'textfield',
                              key: 'name',
                              label: 'Action Name',
                              input: true,
                            },
                            {
                              type: 'select',
                              key: 'type',
                              label: 'Type',
                              dataSrc: 'values',
                              data: {
                                values: [
                                  { label: 'Property', value: 'property' },
                                  { label: 'Value', value: 'value' },
                                  { label: 'Merge Component Schema', value: 'mergeComponentSchema' },
                                  { label: 'Custom Action (JavaScript)', value: 'customAction' },
                                ],
                              },
                              input: true,
                            },
                            {
                              type: 'select',
                              key: 'property.label',
                              label: 'Component Property',
                              dataSrc: 'values',
                              data: {
                                values: [
                                  { label: 'Hidden', value: 'hidden' },
                                  { label: 'Required', value: 'validate.required' },
                                  { label: 'Disabled', value: 'disabled' },
                                ],
                              },
                              input: true,
                              conditional: { json: { '===': [{ var: 'row.type' }, 'property'] } },
                            },
                            {
                              type: 'select',
                              key: 'property.type',
                              label: 'Property Type',
                              dataSrc: 'values',
                              data: {
                                values: [
                                  { label: 'Boolean', value: 'boolean' },
                                  { label: 'String', value: 'string' },
                                ],
                              },
                              input: true,
                              conditional: { json: { '===': [{ var: 'row.type' }, 'property'] } },
                            },
                            {
                              type: 'checkbox',
                              key: 'state',
                              label: 'Toggle Component Visibility',
                              input: true,
                              conditional: {
                                json: {
                                  and: [
                                    { '===': [{ var: 'row.type' }, 'property'] },
                                    { '===': [{ var: 'row.property.type' }, 'boolean'] },
                                  ],
                                },
                              },
                            },
                            {
                              type: 'textfield',
                              key: 'text',
                              label: 'Value (String)',
                              input: true,
                              conditional: {
                                json: {
                                  and: [
                                    { '===': [{ var: 'row.type' }, 'property'] },
                                    { '===': [{ var: 'row.property.type' }, 'string'] },
                                  ],
                                },
                              },
                            },
                            {
                              type: 'textarea',
                              key: 'customAction',
                              label: 'Custom Action (JavaScript)',
                              input: true,
                              rows: 5,
                              conditional: { json: { '===': [{ var: 'row.type' }, 'customAction'] } },
                            },
                            {
                              type: 'textarea',
                              key: 'schemaDefinition',
                              label: 'Schema Definition',
                              input: true,
                              rows: 5,
                              conditional: { json: { '===': [{ var: 'row.type' }, 'mergeComponentSchema'] } },
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }
  }
}
