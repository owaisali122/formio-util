import {
  DATE_PICKER_TIME_FORMAT_OPTIONS,
  DEFAULT_DATE_PICKER_DISPLAY_FORMAT,
  DEFAULT_DATE_PICKER_TIME_FORMAT,
  DEFAULT_DATE_PICKER_TIME_INTERVALS,
  getDatePickerDisplayFormatOptions,
} from '../coreHelper/DatePickerInputCore/DatePickerInputCore.helpers'

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
  enableTime: boolean
  enableTimeZone: boolean
  timeFormat: string
  timeIntervals: number
  timeZoneLabel: string
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
  pickerMode: 'single' | 'range'
  disabledDates: string
  disabledDateRanges: string
  tabindex: number | string
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
      placeholder: '',
      displayFormat: DEFAULT_DATE_PICKER_DISPLAY_FORMAT,
      allowManualInput: true,
      openOnInputClick: true,
      showCalendarIcon: true,
      clearable: true,
      enableTime: false,
      enableTimeZone: false,
      timeFormat: DEFAULT_DATE_PICKER_TIME_FORMAT,
      timeIntervals: DEFAULT_DATE_PICKER_TIME_INTERVALS,
      timeZoneLabel: 'Time Zone',
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
      pickerMode: 'single',
      disabledDates: '',
      disabledDateRanges: '',
      tabindex: '',
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
                  type: 'select',
                  key: 'pickerMode',
                  label: 'Picker Mode',
                  input: true,
                  defaultValue: 'single',
                  dataSrc: 'values',
                  data: {
                    values: [
                      { label: 'Single Date', value: 'single' },
                      { label: 'Date Range', value: 'range' },
                    ],
                  },
                  tooltip: 'Choose whether the user selects a single date or a date range (start + end).',
                  weight: 15,
                },
                {
                  type: 'checkbox',
                  key: 'enableTime',
                  label: 'Enable Time',
                  input: true,
                  defaultValue: false,
                  weight: 18,
                  tooltip: 'Allow selecting a time alongside the date in the existing Single Date or Date Range modes.',
                },
                {
                  type: 'select',
                  key: 'timeFormat',
                  label: 'Time Format',
                  input: true,
                  defaultValue: DEFAULT_DATE_PICKER_TIME_FORMAT,
                  dataSrc: 'values',
                  data: {
                    values: [...DATE_PICKER_TIME_FORMAT_OPTIONS],
                  },
                  weight: 19,
                  conditional: {
                    json: { '===': [{ var: 'data.enableTime' }, true] },
                  },
                },
                {
                  type: 'number',
                  key: 'timeIntervals',
                  label: 'Time Intervals',
                  input: true,
                  defaultValue: DEFAULT_DATE_PICKER_TIME_INTERVALS,
                  weight: 20,
                  conditional: {
                    json: { '===': [{ var: 'data.enableTime' }, true] },
                  },
                  description: 'Minutes between time options in the dropdown.',
                },
                {
                  type: 'checkbox',
                  key: 'enableTimeZone',
                  label: 'Enable Time Zone',
                  input: true,
                  defaultValue: false,
                  weight: 22,
                  tooltip: 'Show a time zone selector in the renderer and include the selected zone in the saved value.',
                },
                {
                  type: 'textfield',
                  key: 'timeZoneLabel',
                  label: 'Time Zone Label',
                  input: true,
                  defaultValue: 'Time Zone',
                  weight: 24,
                  conditional: {
                    json: { '===': [{ var: 'data.enableTimeZone' }, true] },
                  },
                  description:
                    'Label shown above the time zone dropdown in the renderer. Leave blank to hide the label. The renderer resolves the time zone dynamically (saved value → browser → UTC); no fixed default is stored in the designer.',
                },
                {
                  type: 'textfield',
                  key: 'placeholder',
                  label: 'Placeholder',
                  input: true,
                  defaultValue: '',
                  weight: 26,
                  description:
                    'Leave blank to derive the placeholder from the effective display format, including time and time zone when enabled.',
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
                  defaultValue: DEFAULT_DATE_PICKER_DISPLAY_FORMAT,
                  dataSrc: 'custom',
                  data: {
                    custom: function (context: { data: Record<string, any> }) {
                      const options = getDatePickerDisplayFormatOptions({
                        pickerMode: context.data.pickerMode || 'single',
                        enableTime: !!context.data.enableTime,
                        enableTimeZone: !!context.data.enableTimeZone,
                      });
                      return options.map((v: string) => ({ label: v, value: v }));
                    }
                  },
                  clearOnRefresh: true,
                  refreshOn: 'pickerMode,enableTime,enableTimeZone',
                  weight: 35,
                  description:
                    'Select the display format for the date picker. Options update based on Picker Mode, Enable Time, and Enable Time Zone.',
                },
                {
                  type: 'number',
                  key: 'tabindex',
                  label: 'Tab Index',
                  input: true,
                  defaultValue: '',
                  placeholder: '0',
                  weight: 100,
                  tooltip: 'Sets the tabindex attribute of this component to override the tab order of the form. See the MDN documentation on tabindex for details.',
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
                  defaultValue: true,
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
                }
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
                  type: 'textarea',
                  key: 'disabledDates',
                  label: 'Disabled Dates',
                  input: true,
                  rows: 2,
                  placeholder: '2026-04-20, 2026-04-25, 2026-05-01',
                  description:
                    'Comma-separated list of dates to disable (yyyy-MM-dd). Example: 2026-04-20, 2026-04-25, 2026-05-01',
                  weight: 62,
                },
                {
                  type: 'textarea',
                  key: 'disabledDateRanges',
                  label: 'Disabled Date Ranges',
                  input: true,
                  rows: 3,
                  placeholder: '2026-04-10 to 2026-04-15\n2026-05-01 to 2026-05-07',
                  description:
                    'One range per line in format: yyyy-MM-dd to yyyy-MM-dd. All dates between start and end (inclusive) will be disabled. Example:\n2026-04-10 to 2026-04-15\n2026-05-01 to 2026-05-07',
                  weight: 64,
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
                {
                  type: 'textarea',
                  key: 'customDefaultValue',
                  label: 'Custom Default Value',
                  input: true,
                  rows: 5,
                  weight: 90,
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
                              key: 'value',
                              label: 'Value (JavaScript)',
                              input: true,
                              rows: 5,
                              conditional: { json: { '===': [{ var: 'row.type' }, 'value'] } },
                            },
                            {
                              type: 'textarea',
                              key: 'schemaDefinition',
                              label: 'Schema Definition',
                              input: true,
                              rows: 5,
                              conditional: { json: { '===': [{ var: 'row.type' }, 'mergeComponentSchema'] } },
                            },
                            {
                              type: 'textarea',
                              key: 'customAction',
                              label: 'Custom Action (JavaScript)',
                              input: true,
                              rows: 5,
                              conditional: { json: { '===': [{ var: 'row.type' }, 'customAction'] } },
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
