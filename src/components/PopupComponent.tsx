// ─── Types ───────────────────────────────────────────────────────────────────

export interface PopupComponentButtonSchema {
  label: string
  actionKey: string
  variant: string
  icon: string
  closeOnClick: boolean
  disabled: boolean
}

export interface PopupComponentSchema {
  type: string
  label: string
  key: string
  input: boolean
  /** Visual purpose */
  popupVariant: string
  /** Popup title */
  popupTitle: string
  /** Popup body message */
  popupMessage: string
  /** Font Awesome icon class */
  popupIcon: string
  /** Modal size: sm | md | lg */
  popupSize: string
  /** JSON array of button definitions */
  popupButtons: string
  /** Label on the trigger button rendered inside the form */
  triggerLabel: string
  /** Font Awesome icon on the trigger button */
  triggerIcon: string
  showCloseIcon: boolean
  closeOnBackdrop: boolean
  closeOnEscape: boolean
  /** Focus the trigger button when the form loads */
  autofocus: boolean
  /** Hide this component */
  hidden: boolean
  /** Disable the trigger button */
  disabled: boolean
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const POPUP_COMPONENT_TYPE = 'popupComponent'

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Form.io Designer (builder-side) component definition for Popup Component.
 *
 * Reference pattern: SmartStreetDropdownComponent (src/components/SmartStreetDropdown.ts)
 */
export class PopupComponent {
  static schema(overrides?: Partial<PopupComponentSchema>): PopupComponentSchema {
    return {
      type: POPUP_COMPONENT_TYPE,
      label: 'Popup Component',
      key: 'popupComponent',
      input: false,
      popupVariant: 'confirm',
      popupTitle: 'Are you sure?',
      popupMessage: '',
      popupIcon: '',
      popupSize: 'md',
      popupButtons: '',
      triggerLabel: 'Open Popup',
      triggerIcon: '',
      showCloseIcon: true,
      closeOnBackdrop: false,
      closeOnEscape: true,
      autofocus: false,
      hidden: false,
      disabled: false,
      ...overrides,
    }
  }

  static get builderInfo() {
    return {
      title: 'Popup',
      group: 'basic',
      icon: 'window-restore',
      weight: 35,
      documentation: 'A configurable popup/modal that renders at page-root level',
      schema: PopupComponent.schema(),
    }
  }

  static editForm() {
    return {
      components: [
        {
          type: 'tabs',
          key: 'tabs',
          components: [
            // ── Display tab ─────────────────────────────────────────────────
            {
              label: 'Display',
              key: 'display',
              components: [
                {
                  type: 'textfield',
                  key: 'label',
                  label: 'Component Label',
                  input: true,
                  defaultValue: 'Popup Component',
                  weight: 5,
                  tooltip: 'Label shown in the Form.io designer sidebar and builder',
                },
                {
                  type: 'textfield',
                  key: 'triggerLabel',
                  label: 'Trigger Button Label',
                  input: true,
                  required: true,
                  validate: { required: true },
                  defaultValue: 'Open Popup',
                  weight: 10,
                  tooltip: 'Text displayed on the button that opens the popup. This field is required.',
                },
                {
                  type: 'textfield',
                  key: 'triggerIcon',
                  label: 'Trigger Button Icon (Font Awesome class)',
                  input: true,
                  placeholder: 'e.g. fa fa-bell',
                  weight: 15,
                },
                {
                  type: 'checkbox',
                  key: 'autofocus',
                  label: 'Initial Focus',
                  input: true,
                  defaultValue: false,
                  weight: 20,
                  tooltip: 'Automatically focus the trigger button when the form loads.',
                },
                {
                  type: 'checkbox',
                  key: 'hidden',
                  label: 'Hidden',
                  input: true,
                  defaultValue: false,
                  weight: 25,
                  tooltip: 'Hide this component from the form. Can be toggled via conditional logic.',
                },
                {
                  type: 'checkbox',
                  key: 'disabled',
                  label: 'Disabled',
                  input: true,
                  defaultValue: false,
                  weight: 30,
                  tooltip: 'Disable the trigger button so it cannot be clicked.',
                },
              ],
            },
            // ── Popup Content tab ───────────────────────────────────────────
            {
              label: 'Popup Content',
              key: 'popupContent',
              components: [
                {
                  type: 'select',
                  key: 'popupVariant',
                  label: 'Variant',
                  input: true,
                  dataSrc: 'values',
                  defaultValue: 'confirm',
                  weight: 5,
                  data: {
                    values: [
                      { label: 'Confirm', value: 'confirm' },
                      { label: 'Alert', value: 'alert' },
                      { label: 'Warning', value: 'warning' },
                      { label: 'Delete', value: 'delete' },
                      { label: 'Custom', value: 'custom' },
                    ],
                  },
                  tooltip: 'Controls default icon and button set when no custom buttons are defined',
                },
                {
                  type: 'textfield',
                  key: 'popupTitle',
                  label: 'Title',
                  input: true,
                  defaultValue: 'Are you sure?',
                  weight: 10,
                },
                {
                  type: 'textarea',
                  key: 'popupMessage',
                  label: 'Message / Body Text',
                  input: true,
                  weight: 15,
                  rows: 3,
                },
                {
                  type: 'textfield',
                  key: 'popupIcon',
                  label: 'Header Icon (Font Awesome class)',
                  input: true,
                  placeholder: 'e.g. fa fa-exclamation-triangle',
                  weight: 20,
                  tooltip: 'Overrides the default variant icon',
                },
                {
                  type: 'select',
                  key: 'popupSize',
                  label: 'Size',
                  input: true,
                  dataSrc: 'values',
                  defaultValue: 'md',
                  weight: 25,
                  data: {
                    values: [
                      { label: 'Small (380px)', value: 'sm' },
                      { label: 'Medium (520px)', value: 'md' },
                      { label: 'Large (720px)', value: 'lg' },
                    ],
                  },
                },
              ],
            },
            // ── Buttons tab ─────────────────────────────────────────────────
            {
              label: 'Buttons',
              key: 'buttons',
              components: [
                {
                  type: 'textarea',
                  key: 'popupButtons',
                  label: 'Custom Buttons (JSON)',
                  input: true,
                  rows: 8,
                  weight: 5,
                  description:
                    'Define the buttons shown inside the popup. Each button must have a label (the visible text), an actionKey (the identifier emitted with the popupAction event), a variant (primary, secondary, danger, warning, or success), and a closeOnClick flag. Leave blank to use the default buttons for the selected Variant. Example: [{"label":"Confirm","actionKey":"confirm","variant":"primary","closeOnClick":true},{"label":"Cancel","actionKey":"cancel","variant":"secondary","closeOnClick":true}]',
                  tooltip:
                    'JSON array of button definitions. Each item: label, actionKey, variant (primary|secondary|danger|warning|success), icon (FA class, optional), closeOnClick (boolean), disabled (boolean, optional).',
                },
              ],
            },
            // ── Behavior tab ────────────────────────────────────────────────
            {
              label: 'Behavior',
              key: 'behavior',
              components: [
                {
                  type: 'checkbox',
                  key: 'showCloseIcon',
                  label: 'Show close (×) icon',
                  input: true,
                  defaultValue: true,
                  weight: 5,
                },
                {
                  type: 'checkbox',
                  key: 'closeOnBackdrop',
                  label: 'Close when clicking backdrop',
                  input: true,
                  defaultValue: false,
                  weight: 10,
                },
                {
                  type: 'checkbox',
                  key: 'closeOnEscape',
                  label: 'Close on Escape key',
                  input: true,
                  defaultValue: true,
                  weight: 15,
                },
              ],
            },
            // ── Validation tab ───────────────────────────────────────────────
            {
              label: 'Validation',
              key: 'validation',
              components: [
                {
                  type: 'textfield',
                  key: 'validate.customMessage',
                  label: 'Custom Error Message',
                  input: true,
                  weight: 10,
                  description: 'Error message shown when custom validation fails.',
                },
                {
                  type: 'textarea',
                  key: 'validate.custom',
                  label: 'Custom Validation (JavaScript)',
                  input: true,
                  rows: 5,
                  weight: 20,
                  description:
                    'Write custom JavaScript validation. Set "valid" to true to pass, or set it to an error message string to fail. Available variables: valid, input, data, row, component, instance.',
                },
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
                  defaultValue: 'popupComponent',
                  description: 'Unique key for this component used in form submission data and event handling (e.g. popupComponent).',
                  weight: 10,
                },
              ],
            },
            // ── Conditional tab ──────────────────────────────────────────────
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
                      description: 'Enter the API key of the component to check.',
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
                    'Write custom JavaScript. Set "show" to true or false. Available variables: show, data, row, component, instance.',
                },
              ],
            },
            // ── Logic tab ────────────────────────────────────────────────────
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
