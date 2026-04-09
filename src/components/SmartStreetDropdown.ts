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
                  defaultValue: 'Smart Street',
                  weight: 10,
                },
                {
                  type: 'textfield',
                  key: 'key',
                  label: 'Property Name',
                  input: true,
                  defaultValue: 'smartStreet',
                  weight: 20,
                },
                {
                  type: 'textfield',
                  key: 'placeholder',
                  label: 'Placeholder',
                  input: true,
                  defaultValue: 'Type to search address...',
                  weight: 30,
                },
                {
                  type: 'number',
                  key: 'minSearchLength',
                  label: 'Minimum Search Length',
                  input: true,
                  defaultValue: 2,
                  description: 'Minimum characters before searching',
                  weight: 40,
                },
                {
                  type: 'number',
                  key: 'debounceDelay',
                  label: 'Debounce Delay (ms)',
                  input: true,
                  defaultValue: 300,
                  description: 'Delay in ms before sending search request',
                  weight: 50,
                },
              ],
            },
            // ── Configuration tab ─────────────────────────────────────────────
            {
              label: 'Configuration',
              key: 'configuration',
              components: [
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
                    },
                    {
                      type: 'textfield',
                      key: 'addressApi.username',
                      label: 'API Username (Basic Auth)',
                      input: true,
                      weight: 30,
                    },
                    {
                      type: 'password',
                      key: 'addressApi.password',
                      label: 'API Password (Basic Auth)',
                      input: true,
                      weight: 40,
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
                      key: 'addressMapping.streetLine',
                      label: 'Street Address label',
                      input: true,
                      defaultValue: 'Street Address',
                      weight: 10,
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
          ],
        },
      ],
    }
  }
}
