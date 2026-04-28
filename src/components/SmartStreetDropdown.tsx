export interface SmartStreetDropdownItem {
  id: string
  value: string
  [key: string]: unknown
}

/** @deprecated Use SmartStreetDropdownItem */
export const SEARCHABLE_DROPDOWN_TYPE = 'searchableDropdown'

export class SmartStreetDropdownComponent {
  static schema(overrides?: Record<string, unknown>) {
    return {
      type: SEARCHABLE_DROPDOWN_TYPE,
      label: 'Smart Street',
      key: 'smartStreet',
      input: true,
      placeholder: 'Type to search address...',
      description: 'Smart Street address autocomplete',
      minSearchLength: 2,
      debounceDelay: 300,
      hidden: false,
      autofocus: false,
      disabled: false,
      // data source defaults
      apiType: 'custom' as 'custom' | 'secure',
      addressApi: {
        url: 'https://gtw-oci.statehub.hawaii.gov/oci-psd91/API/address/autocomplete',
        partnerId: '',
        username: '',
        password: '',
      },
      addressMapping: {
        streetLine: 'Street Address',
        secondary: 'Unit / Secondary',
        city: 'City',
        state: 'State',
        zipcode: 'Zipcode',
      },
      tabindex: '',
      ...overrides,
    }
  }

  static get builderInfo() {
    return {
      title: 'Smart Street',
      group: 'basic',
      icon: 'map-marker',
      weight: 28,
      documentation: 'Smart Street address autocomplete with field mapping',
      schema: SmartStreetDropdownComponent.schema(),
    }
  }

  static editForm() {
    return {
      components: [
        {
          type: 'tabs',
          key: 'tabs',
          components: [
            // ── Display tab ──────────────────────────────────────────────────
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
                  validate: { required: true },
                  defaultValue: 'Smart Street',
                  weight: 10,
                },
                {
                  type: 'textfield',
                  key: 'placeholder',
                  label: 'Placeholder',
                  input: true,
                  defaultValue: 'Type to search address...',
                  weight: 20,
                },
                {
                  type: 'number',
                  key: 'minSearchLength',
                  label: 'Minimum Search Length',
                  input: true,
                  defaultValue: 2,
                  description: 'Minimum characters before searching',
                  weight: 30,
                },
                {
                  type: 'number',
                  key: 'debounceDelay',
                  label: 'Debounce Delay (ms)',
                  input: true,
                  defaultValue: 300,
                  description: 'Delay in ms before sending search request',
                  weight: 40,
                },
                {
                  type: 'number',
                  key: 'tabindex',
                  label: 'Tab Index',
                  input: true,
                  defaultValue: '',
                  placeholder: '0',
                  weight: 80,
                  tooltip: 'Sets the tabindex attribute of this component to override the tab order of the form. See the MDN documentation on tabindex for details.',
                },
                {
                  type: 'checkbox',
                  key: 'autofocus',
                  label: 'Initial Focus',
                  input: true,
                  defaultValue: false,
                  weight: 50,
                  tooltip: 'When enabled, focuses the component when the page loads.',
                },
                {
                  type: 'checkbox',
                  key: 'hidden',
                  label: 'Hidden',
                  input: true,
                  defaultValue: false,
                  weight: 60,
                  tooltip: 'When enabled, this component is hidden from the form.',
                },
                {
                  type: 'checkbox',
                  key: 'disabled',
                  label: 'Disabled',
                  input: true,
                  defaultValue: false,
                  weight: 70,
                  tooltip: 'When enabled, this component is disabled and the user cannot interact with it.',
                }
              ],
            },
            // ── API tab ──────────────────────────────────────────────────────
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
                  validate: { required: true },
                  defaultValue: 'smartStreet',
                  description: 'Unique key for this component.',
                  weight: 10,
                },
              ],
            },
            // ── Data Source tab (formerly Configuration) ──────────────────────
            {
              label: 'Data Source',
              key: 'dataSourceTab',
              components: [
                // API type dropdown — controls which fields are visible below
                {
                  type: 'select',
                  key: 'apiType',
                  label: 'API Type',
                  input: true,
                  defaultValue: 'custom',
                  data: {
                    values: [
                      { label: 'Custom API', value: 'custom' },
                      { label: 'Secure API', value: 'secure' },
                    ],
                  },
                  description: 'Select Custom API for standard endpoints, or Secure API for endpoints requiring authentication and headers.',
                  weight: 5,
                },
                {
                  type: 'panel',
                  title: 'API Settings',
                  collapsible: false,
                  weight: 10,
                  components: [
                    {
                      type: 'textfield',
                      key: 'addressApi.url',
                      label: 'API Endpoint URL',
                      input: true,
                      defaultValue: 'https://gtw-oci.statehub.hawaii.gov/oci-psd91/API/address/autocomplete',
                      weight: 10,
                    },
                    {
                      type: 'textfield',
                      key: 'addressApi.partnerId',
                      label: 'Partner ID (partner-id header)',
                      input: true,
                      placeholder: 'kolea',
                      weight: 20,
                      conditional: { json: { '===': [{ var: 'data.apiType' }, 'secure'] } },
                    },
                    {
                      type: 'textfield',
                      key: 'addressApi.username',
                      label: 'API Username (Basic Auth)',
                      input: true,
                      weight: 30,
                      conditional: { json: { '===': [{ var: 'data.apiType' }, 'secure'] } },
                    },
                    {
                      type: 'password',
                      key: 'addressApi.password',
                      label: 'API Password (Basic Auth)',
                      input: true,
                      weight: 40,
                      conditional: { json: { '===': [{ var: 'data.apiType' }, 'secure'] } },
                    },
                  ],
                },
                {
                  type: 'panel',
                  title: 'Address Field Mapping',
                  collapsible: false,
                  weight: 20,
                  components: [
                    {
                      type: 'htmlelement',
                      key: 'addressMappingInfo',
                      tag: 'p',
                      content:
                        'Provide a <strong>display label</strong> for each address field shown in the UI after selection.',
                      className: 'text-muted small mb-2',
                      weight: 5,
                    },
                    {
                      type: 'textfield',
                      key: 'addressMapping.secondary',
                      label: 'Secondary / Unit label',
                      input: true,
                      defaultValue: 'Unit / Secondary',
                      weight: 20,
                    },
                    {
                      type: 'textfield',
                      key: 'addressMapping.city',
                      label: 'City label',
                      input: true,
                      defaultValue: 'City',
                      weight: 30,
                    },
                    {
                      type: 'textfield',
                      key: 'addressMapping.state',
                      label: 'State label',
                      input: true,
                      defaultValue: 'State',
                      weight: 40,
                    },
                    {
                      type: 'textfield',
                      key: 'addressMapping.zipcode',
                      label: 'Zipcode label',
                      input: true,
                      defaultValue: 'Zipcode',
                      weight: 50,
                    },
                  ],
                },
              ],
            },
            // ── Validation tab ────────────────────────────────────────────────
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
                  placeholder: 'Enter custom validation error message',
                  description: 'Error message shown when validation fails.',
                  weight: 20,
                },
                {
                  type: 'textarea',
                  key: 'validate.custom',
                  label: 'Custom JavaScript Validation',
                  input: true,
                  rows: 5,
                  weight: 30,
                  description:
                    'Write custom JavaScript validation. Set "valid" to true, false, or an error message string. Available variables: valid, input, data, row, component, instance.',
                },
              ],
            },
            // ── Conditional tab ───────────────────────────────────────────────
            {
              label: 'Conditional',
              key: 'conditional',
              components: [
                {
                  type: 'panel',
                  title: 'Simple Conditional',
                  collapsible: true,
                  collapsed: false,
                  components: [
                    {
                      type: 'select',
                      key: 'conditional.show',
                      label: 'This component should Display:',
                      input: true,
                      dataSrc: 'values',
                      data: {
                        values: [
                          { label: 'True', value: 'true' },
                          { label: 'False', value: 'false' },
                        ],
                      },
                    },
                    {
                      type: 'select',
                      key: 'conditional.when',
                      label: 'When the form component:',
                      input: true,
                      dataSrc: 'custom',
                      data: {
                        custom: 'values = utils.getContextComponents()',
                      },
                    },
                    {
                      type: 'textfield',
                      key: 'conditional.eq',
                      label: 'Has the value:',
                      input: true,
                    },
                  ],
                },
              ],
            },
            // ── Logic tab ─────────────────────────────────────────────────────
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
