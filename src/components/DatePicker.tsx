export const DATE_PICKER_TYPE = 'datePicker'

export interface DatePickerSchema {
  type: string
  label: string
  key: string
  input: boolean
  tableView: boolean
  placeholder: string
  displayFormat: string
  allowManualInput: boolean
  openOnInputClick: boolean
  showCalendarIcon: boolean
  clearable: boolean
  hidden: boolean
  autofocus: boolean
  disabled: boolean
  persistent: boolean
  defaultValue: string
  minDate: string
  maxDate: string
  disablePastDates: boolean
  disableFutureDates: boolean
  disableWeekends: boolean
  [k: string]: unknown
}

export class DatePickerComponent {
  static schema(overrides?: Record<string, unknown>): DatePickerSchema {
    return {
      type: DATE_PICKER_TYPE,
      label: 'Date Picker',
      key: 'datePicker',
      input: true,
      tableView: true,
      placeholder: 'MM/DD/YYYY',
      displayFormat: 'MM/dd/yyyy',
      allowManualInput: false,
      openOnInputClick: true,
      showCalendarIcon: true,
      clearable: true,
      hidden: false,
      autofocus: false,
      disabled: false,
      persistent: true,
      defaultValue: '',
      minDate: '',
      maxDate: '',
      disablePastDates: false,
      disableFutureDates: false,
      disableWeekends: false,
      ...overrides,
    }
  }

  static get builderInfo() {
    return {
      title: 'Date Picker',
      group: 'basic',
      icon: 'calendar',
      weight: 27,
      documentation: 'Date picker with calendar popup, configurable display format, and date validation.',
      schema: DatePickerComponent.schema(),
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
                  validate: { required: true },
                  defaultValue: 'Date Picker',
                  weight: 10,
                },
                {
                  type: 'textfield',
                  key: 'placeholder',
                  label: 'Placeholder',
                  input: true,
                  defaultValue: 'MM/DD/YYYY',
                  weight: 20,
                },
                {
                  type: 'textarea',
                  key: 'description',
                  label: 'Description',
                  input: true,
                  weight: 30,
                },
                {
                  type: 'select',
                  key: 'displayFormat',
                  label: 'Display Format',
                  input: true,
                  defaultValue: 'MM/dd/yyyy',
                  dataSrc: 'values',
                  data: {
                    values: [
                      { label: 'MM/DD/YYYY', value: 'MM/dd/yyyy' },
                      { label: 'DD/MM/YYYY', value: 'dd/MM/yyyy' },
                      { label: 'YYYY-MM-DD', value: 'yyyy-MM-dd' },
                      { label: 'MM-DD-YYYY', value: 'MM-dd-yyyy' },
                      { label: 'DD-MM-YYYY', value: 'dd-MM-yyyy' },
                    ],
                  },
                  description:
                    'How the date appears in the input field. Stored value is always yyyy-MM-dd.',
                  weight: 35,
                },
                {
                  type: 'checkbox',
                  key: 'showCalendarIcon',
                  label: 'Show Calendar Icon',
                  input: true,
                  defaultValue: true,
                  tooltip: 'Display a calendar icon inside the input field.',
                  weight: 40,
                },
                {
                  type: 'checkbox',
                  key: 'allowManualInput',
                  label: 'Allow Manual Input',
                  input: true,
                  defaultValue: false,
                  tooltip:
                    'When enabled, users can type a date directly. When disabled, dates can only be selected from the calendar.',
                  weight: 50,
                },
                {
                  type: 'checkbox',
                  key: 'openOnInputClick',
                  label: 'Open Calendar On Input Click',
                  input: true,
                  defaultValue: true,
                  tooltip:
                    'When enabled, clicking the input opens the calendar popup.',
                  weight: 55,
                },
                {
                  type: 'checkbox',
                  key: 'clearable',
                  label: 'Allow Clear',
                  input: true,
                  defaultValue: true,
                  tooltip: 'Show a clear button when a date is selected.',
                  weight: 60,
                },
                {
                  type: 'checkbox',
                  key: 'autofocus',
                  label: 'Initial Focus',
                  input: true,
                  defaultValue: false,
                  weight: 70,
                  tooltip:
                    'When enabled, this field receives focus when the form loads.',
                },
                {
                  type: 'checkbox',
                  key: 'hidden',
                  label: 'Hidden',
                  input: true,
                  defaultValue: false,
                  weight: 80,
                  tooltip:
                    'When enabled, this component is hidden from the form.',
                },
                {
                  type: 'checkbox',
                  key: 'disabled',
                  label: 'Disabled',
                  input: true,
                  defaultValue: false,
                  weight: 90,
                },
              ],
            },
            // ── Data tab ────────────────────────────────────────────
            {
              label: 'Data',
              key: 'data',
              components: [
                {
                  type: 'textfield',
                  key: 'defaultValue',
                  label: 'Default Value',
                  input: true,
                  placeholder: 'yyyy-MM-dd (e.g. 2025-01-15)',
                  description:
                    'Enter a default date in yyyy-MM-dd format. Leave empty for no default.',
                  weight: 10,
                },
                {
                  type: 'checkbox',
                  key: 'persistent',
                  label: 'Persistent',
                  input: true,
                  defaultValue: true,
                  tooltip:
                    'When enabled, the value is saved in the submission data.',
                  weight: 20,
                },
                {
                  type: 'checkbox',
                  key: 'protected',
                  label: 'Protected',
                  input: true,
                  defaultValue: false,
                  tooltip:
                    'When enabled, the value is not returned in API responses.',
                  weight: 30,
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
                  key: 'minDate',
                  label: 'Min Date',
                  input: true,
                  placeholder: 'yyyy-MM-dd (e.g. 2020-01-01)',
                  description:
                    'Earliest selectable date. Dates before this are disabled.',
                  weight: 20,
                },
                {
                  type: 'textfield',
                  key: 'maxDate',
                  label: 'Max Date',
                  input: true,
                  placeholder: 'yyyy-MM-dd (e.g. 2030-12-31)',
                  description:
                    'Latest selectable date. Dates after this are disabled.',
                  weight: 30,
                },
                {
                  type: 'checkbox',
                  key: 'disablePastDates',
                  label: 'Disable Past Dates',
                  input: true,
                  defaultValue: false,
                  tooltip: 'Prevent selecting dates before today.',
                  weight: 40,
                },
                {
                  type: 'checkbox',
                  key: 'disableFutureDates',
                  label: 'Disable Future Dates',
                  input: true,
                  defaultValue: false,
                  tooltip: 'Prevent selecting dates after today.',
                  weight: 50,
                },
                {
                  type: 'checkbox',
                  key: 'disableWeekends',
                  label: 'Disable Weekends',
                  input: true,
                  defaultValue: false,
                  tooltip: 'Prevent selecting Saturday and Sunday.',
                  weight: 60,
                },
                {
                  type: 'textfield',
                  key: 'validate.customMessage',
                  label: 'Custom Error Message',
                  input: true,
                  placeholder: 'Please select a valid date',
                  description:
                    'Error message shown when validation fails.',
                  weight: 70,
                },
                {
                  type: 'textarea',
                  key: 'validate.custom',
                  label: 'Custom Validation (JavaScript)',
                  input: true,
                  rows: 5,
                  weight: 80,
                  description:
                    'Write custom JavaScript validation. Set "valid" to true or an error message string. Available variables: valid, input, data, row, component, instance.',
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
                  validate: { required: true },
                  defaultValue: 'datePicker',
                  description:
                    'Unique key for this component in submission data.',
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
