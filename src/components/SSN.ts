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
            {
              label: 'Display',
              key: 'display',
              components: [
                {
                  type: 'textfield',
                  key: 'label',
                  label: 'Label',
                  input: true,
                  defaultValue: 'Social Security Number',
                  weight: 10,
                },
                {
                  type: 'textfield',
                  key: 'key',
                  label: 'Property Name',
                  input: true,
                  defaultValue: 'ssn',
                  weight: 20,
                },
                {
                  type: 'textfield',
                  key: 'placeholder',
                  label: 'Placeholder',
                  input: true,
                  defaultValue: '___-__-____',
                  weight: 30,
                },
                {
                  type: 'textarea',
                  key: 'description',
                  label: 'Description',
                  input: true,
                  defaultValue: 'Enter your 9-digit Social Security Number',
                  weight: 40,
                },
                {
                  type: 'checkbox',
                  key: 'hidden',
                  label: 'Hidden',
                  input: true,
                  defaultValue: false,
                  weight: 50,
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
              ],
            },
          ],
        },
      ],
    }
  }
}
