export const PROFILE_FIELD_SECTION_TYPE = 'profileFieldSection'

export interface ProfileFieldSectionSchema {
  type: string
  label: string
  key: string
  input: boolean
  persistent: boolean
  components: Record<string, unknown>[]
  [k: string]: unknown
}

/**
 * Default child fields that auto-populate when the component is dragged
 * into the builder.
 */
function defaultChildComponents(): Record<string, unknown>[] {
  return [
    {
      type: 'columns',
      key: 'profileColumns1',
      label: 'Columns',
      columns: [
        {
          components: [
            { type: 'textfield', label: 'First Name', key: 'firstName', input: true, tableView: true, validate: { required: true } },
          ],
          width: 6, offset: 0, push: 0, pull: 0, size: 'md',
        },
        {
          components: [
            { type: 'textfield', label: 'Middle Name', key: 'middleName', input: true, tableView: true },
          ],
          width: 6, offset: 0, push: 0, pull: 0, size: 'md',
        },
      ],
      input: false, tableView: false, clearOnHide: false, persistent: false, autoAdjust: false,
    },
    {
      type: 'columns',
      key: 'profileColumns2',
      label: 'Columns',
      columns: [
        {
          components: [
            { type: 'textfield', label: 'Last Name', key: 'lastName', input: true, tableView: true, validate: { required: true } },
          ],
          width: 6, offset: 0, push: 0, pull: 0, size: 'md',
        },
        {
          components: [
            {
              type: 'select',
              label: 'Suffix',
              key: 'suffix',
              input: true,
              tableView: true,
              data: {
                values: [
                  { label: 'Jr.', value: 'jr' },
                  { label: 'Sr.', value: 'sr' },
                  { label: 'II', value: 'ii' },
                  { label: 'III', value: 'iii' },
                  { label: 'IV', value: 'iv' },
                  { label: 'Esq.', value: 'esq' },
                ],
              },
            },
          ],
          width: 6, offset: 0, push: 0, pull: 0, size: 'md',
        },
      ],
      input: false, tableView: false, clearOnHide: false, persistent: false, autoAdjust: false,
    },
  ]
}

export class ProfileFieldSectionComponent {
  static schema(overrides?: Record<string, unknown>): ProfileFieldSectionSchema {
    return {
      type: 'container',
      label: 'Profile Fields Section',
      key: 'profileFieldsSection',
      input: false,
      persistent: false,
      components: defaultChildComponents(),
      ...overrides,
    }
  }

  static get builderInfo() {
    return {
      title: 'Profile Fields Section',
      group: 'layout',
      icon: 'th-list',
      weight: 25,
      showPreview: false,
      documentation: 'A fieldset that auto-populates with First Name, Middle Name, Last Name, and Suffix fields.',
      schema: ProfileFieldSectionComponent.schema(),
    }
  }

  // No custom editForm — inherits the standard fieldset editForm
  // (Display with legend, Conditional, Logic, Layout tabs) so that
  // child components remain fully editable through the builder UI.
}
