/**
 * Form.io Form Review — Designer (builder-side) component definition.
 *
 * Reference pattern: ProgressBar (src/components/ProgressBar.tsx)
 *
 * A display-only component that shows a review/summary of values from
 * fields already present in the current form or wizard. Configured with
 * sections and referenced field keys; renders label + value pairs grouped
 * into collapsible sections.
 */

export const FORM_REVIEW_TYPE = 'formReview'

export interface FormReviewItemSchema {
  componentKey: string
  customLabel?: string
  emptyValueText?: string
  excludeIfEmpty?: boolean
  booleanTrueLabel?: string
  booleanFalseLabel?: string
  dateFormat?: string
  ssnFormat?: 'last4' | 'hidden' | 'full'
}

export interface FormReviewSectionSchema {
  title: string
  sectionKey?: string
  collapsible?: boolean
  defaultExpanded?: boolean
  columns?: number
  itemsJson?: string
}

export interface FormReviewSchema {
  type: string
  label: string
  key: string
  input: boolean
  persistent: boolean
  tableView: boolean
  sections: FormReviewSectionSchema[]
  showExpandAll: boolean
  emptyValueText: string
  defaultSectionExpanded: boolean
  [k: string]: unknown
}

export class FormReviewComponent {
  static schema(overrides?: Partial<FormReviewSchema>): FormReviewSchema {
    return {
      type: FORM_REVIEW_TYPE,
      label: 'Form Review',
      key: 'formReview',
      input: false,
      persistent: false,
      tableView: false,
      sections: [],
      showExpandAll: true,
      emptyValueText: '\u2014',
      defaultSectionExpanded: true,
      ...overrides,
    }
  }

  static get builderInfo() {
    return {
      title: 'Form Review',
      group: 'layout',
      icon: 'list-alt',
      weight: 30,
      documentation: 'A review/summary component that displays field labels and values from the current form or wizard.',
      schema: FormReviewComponent.schema(),
    }
  }

  static editForm() {
    return {
      components: [
        {
          type: 'tabs',
          key: 'tabs',
          components: [
            // ── Display Tab ──────────────────────────────────────────
            {
              label: 'Display',
              key: 'display',
              components: [
                {
                  type: 'textfield',
                  key: 'label',
                  label: 'Label',
                  input: true,
                  defaultValue: 'Form Review',
                  weight: 10,
                },
                {
                  type: 'textarea',
                  key: 'description',
                  label: 'Description / Help Text',
                  input: true,
                  rows: 2,
                  weight: 20,
                  description: 'Optional description shown above the review sections.',
                },
                {
                  type: 'checkbox',
                  key: 'hidden',
                  label: 'Hidden',
                  input: true,
                  defaultValue: false,
                  weight: 30,
                  tooltip: 'When enabled, this component is hidden from the form.',
                },
                {
                  type: 'checkbox',
                  key: 'disabled',
                  label: 'Disabled',
                  input: true,
                  defaultValue: false,
                  weight: 40,
                },
              ],
            },
            // ── Review Configuration Tab ─────────────────────────────
            {
              label: 'Review Configuration',
              key: 'reviewConfiguration',
              components: [
                // Global settings
                {
                  type: 'htmlelement',
                  tag: 'h5',
                  content: 'Global Settings',
                  weight: 1,
                },
                {
                  type: 'checkbox',
                  key: 'showExpandAll',
                  label: 'Show Expand All / Collapse All Button',
                  input: true,
                  defaultValue: true,
                  weight: 5,
                },
                {
                  type: 'checkbox',
                  key: 'defaultSectionExpanded',
                  label: 'Sections Expanded by Default',
                  input: true,
                  defaultValue: true,
                  weight: 10,
                },
                {
                  type: 'textfield',
                  key: 'emptyValueText',
                  label: 'Fallback Text for Empty Values',
                  input: true,
                  defaultValue: '\u2014',
                  weight: 15,
                  description: 'Text shown when a referenced field has no value.',
                },
                // Sections datagrid with nested items
                {
                  type: 'htmlelement',
                  tag: 'h5',
                  content: 'Review Sections',
                  weight: 19,
                },
                {
                  type: 'datagrid',
                  key: 'sections',
                  label: 'Sections',
                  input: true,
                  reorder: true,
                  addAnother: 'Add Section',
                  weight: 20,
                  defaultValue: [],
                  components: [
                    {
                      type: 'textfield',
                      key: 'title',
                      label: 'Section Title',
                      input: true,
                      placeholder: 'e.g. Applicant Details',
                    },
                    {
                      type: 'textfield',
                      key: 'sectionKey',
                      label: 'Section Key',
                      input: true,
                      placeholder: 'e.g. applicantDetails',
                      description: 'Optional unique key for this section.',
                    },
                    {
                      type: 'checkbox',
                      key: 'collapsible',
                      label: 'Collapsible',
                      input: true,
                      defaultValue: true,
                    },
                    {
                      type: 'checkbox',
                      key: 'defaultExpanded',
                      label: 'Expanded by Default',
                      input: true,
                      defaultValue: true,
                    },
                    {
                      type: 'select',
                      key: 'columns',
                      label: 'Columns',
                      input: true,
                      defaultValue: 2,
                      data: {
                        values: [
                          { label: '1 Column', value: 1 },
                          { label: '2 Columns', value: 2 },
                          { label: '3 Columns', value: 3 },
                          { label: '4 Columns', value: 4 },
                        ],
                      },
                    },
                    {
                      type: 'textarea',
                      key: 'itemsJson',
                      label: 'Fields (JSON)',
                      input: true,
                      rows: 4,
                      defaultValue: '[]',
                      description:
                        'JSON array of field references. Each entry: { "componentKey": "firstName", "customLabel": "", "excludeIfEmpty": false, "booleanTrueLabel": "", "booleanFalseLabel": "", "dateFormat": "", "ssnFormat": "last4|hidden|full" }',
                      placeholder:
                        '[{"componentKey":"firstName"},{"componentKey":"lastName","customLabel":"Surname"}]',
                    },
                  ],
                },
              ],
            },
            // ── API Tab ──────────────────────────────────────────────
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
                  description: 'Unique key for this component.',
                  weight: 10,
                },
              ],
            },
            // ── Conditional Tab ──────────────────────────────────────
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
              ],
            },
            // ── Logic Tab ────────────────────────────────────────────
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
