export interface SearchableDropdownItem {
  id: string
  value: string
  [key: string]: unknown
}

export const SEARCHABLE_DROPDOWN_TYPE = 'searchableDropdown'

export class SearchableDropdownComponent {
  static schema(overrides?: Record<string, unknown>) {
    return {
      type: SEARCHABLE_DROPDOWN_TYPE,
      label: 'Searchable Dropdown',
      key: 'searchableDropdown',
      input: true,
      placeholder: 'Type to search...',
      description: 'Search and select from dynamic options',
      dataSrc: 'url',
      data: {
        url: '',
        method: 'GET',
      },
      minSearchLength: 2,
      debounceDelay: 300,
      multiple: false,
      ...overrides,
    }
  }

  static get builderInfo() {
    return {
      title: 'Searchable Dropdown',
      group: 'basic',
      icon: 'search',
      weight: 28,
      documentation: 'Async searchable dropdown that fetches options from a configurable API endpoint',
      schema: SearchableDropdownComponent.schema(),
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
                  defaultValue: 'Searchable Dropdown',
                  weight: 10,
                },
                {
                  type: 'textfield',
                  key: 'key',
                  label: 'Property Name',
                  input: true,
                  defaultValue: 'searchableDropdown',
                  weight: 20,
                },
                {
                  type: 'textfield',
                  key: 'placeholder',
                  label: 'Placeholder',
                  input: true,
                  defaultValue: 'Type to search...',
                  weight: 30,
                },
                {
                  type: 'textarea',
                  key: 'description',
                  label: 'Description',
                  input: true,
                  defaultValue: 'Search and select from dynamic options',
                  weight: 40,
                },
                {
                  type: 'checkbox',
                  key: 'clearOnHide',
                  label: 'Clear Value When Hidden',
                  input: true,
                  defaultValue: true,
                  weight: 50,
                },
                {
                  type: 'checkbox',
                  key: 'hideLabel',
                  label: 'Hide Label',
                  input: true,
                  defaultValue: false,
                  weight: 60,
                },
                {
                  type: 'checkbox',
                  key: 'tableView',
                  label: 'Table View',
                  input: true,
                  defaultValue: true,
                  weight: 70,
                },
              ],
            },
            {
              label: 'Data',
              key: 'data',
              components: [
                {
                  type: 'textfield',
                  key: 'data.url',
                  label: 'API Endpoint',
                  input: true,
                  placeholder: 'https://api.example.com/search?q=${query}',
                  description:
                    'URL to fetch options from. Use ${query} or {query} as a placeholder for the search term, ' +
                    'or omit it and ?query=<term> will be appended automatically.',
                  validate: { required: true },
                  weight: 10,
                },
                {
                  type: 'checkbox',
                  key: 'multiple',
                  label: 'Allow Multiple Selections',
                  input: true,
                  defaultValue: false,
                  weight: 20,
                },
                {
                  type: 'number',
                  key: 'minSearchLength',
                  label: 'Minimum Search Length',
                  input: true,
                  defaultValue: 2,
                  description: 'Minimum number of characters before searching',
                  weight: 30,
                },
                {
                  type: 'number',
                  key: 'debounceDelay',
                  label: 'Debounce Delay (ms)',
                  input: true,
                  defaultValue: 300,
                  description: 'Delay in milliseconds before sending search request',
                  weight: 40,
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
                  placeholder: 'Please select a value',
                  description: 'Error message shown when validation fails',
                  weight: 20,
                },
                {
                  type: 'number',
                  key: 'validate.minSelectedCount',
                  label: 'Minimum Selected Count',
                  input: true,
                  placeholder: '0',
                  description: 'Minimum number of items that must be selected (multi-select only)',
                  weight: 30,
                },
                {
                  type: 'number',
                  key: 'validate.maxSelectedCount',
                  label: 'Maximum Selected Count',
                  input: true,
                  placeholder: '0',
                  description: 'Maximum number of items that can be selected (multi-select only). 0 = unlimited.',
                  weight: 40,
                },
              ],
            },
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
