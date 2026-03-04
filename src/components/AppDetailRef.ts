/**
 * Form.io App Detail Ref – standalone designer component.
 * POC: C:\Projects\HI-POC-1\poc\src\components\formio\AppDetailRef.ts
 *
 * Form list URL is set by consumer app via configure({ formsListUrl }) or registerCustomComponents({ formsListUrl }).
 */

import { getFormsListUrl } from '../registry'

export const APP_DETAIL_REF_TYPE = 'appDetailRef'
export const APP_DETAIL_REF_EXCLUDE_TYPES: string[] = ['fieldReference', 'appDetailRef']

const DEFAULT_KEY = 'appDetailRef'
const DEFAULT_LABEL = 'App Detail Reference'

const EDIT_FIELD_KEYS = {
  selectedFormId: 'selectedFormId',
  key: 'key',
} as const

export interface AppDetailRefSchema {
  type: string
  label: string
  key: string
  input: boolean
  tableView: boolean
  selectedFormId: string
  [k: string]: unknown
}

export interface AppDetailRefBuilderInfo {
  title: string
  group: string
  icon: string
  weight: number
  documentation: string
  schema: AppDetailRefSchema
}

export interface AppDetailRefEditFormComponent {
  type: string
  key: string
  label: string
  input: boolean
  required: boolean
  data?: { values: unknown[] }
  dataSrc?: string
  valueProperty?: string
  labelProperty?: string
  template?: string
  description?: string
}

export class AppDetailRefComponent {
  static schema(overrides?: Record<string, unknown>): AppDetailRefSchema {
    return {
      type: APP_DETAIL_REF_TYPE,
      label: DEFAULT_LABEL,
      key: DEFAULT_KEY,
      input: false,
      tableView: false,
      selectedFormId: '',
      ...overrides,
    }
  }

  static get builderInfo(): AppDetailRefBuilderInfo {
    const formsListUrl = getFormsListUrl()
    const docText = formsListUrl
      ? `Select a form from the API (stores reference only; add Reference Field separately). Options load from: ${formsListUrl}.`
      : 'Select a form from the API (stores reference only; add Reference Field separately). Set formsListUrl via configure() or registerCustomComponents({ formsListUrl }) to load the dropdown.'
    return {
      title: 'App Detail Ref',
      group: 'basic',
      icon: 'list-alt',
      weight: 25,
      documentation: docText,
      schema: AppDetailRefComponent.schema(),
    }
  }

  static editForm(): { components: AppDetailRefEditFormComponent[] } {
    return {
      components: [
        {
          type: 'select',
          key: EDIT_FIELD_KEYS.selectedFormId,
          label: 'Form',
          input: true,
          required: false,
          data: { values: [] },
          dataSrc: 'values',
          valueProperty: 'value',
          labelProperty: 'label',
          template: '<span>{{ item.label }}</span>',
          description:
            'Select a form (listed by title and slug). This stores the reference only; add Reference Field components separately to reference specific fields.',
        },
        {
          type: 'textfield',
          key: EDIT_FIELD_KEYS.key,
          label: 'Property Name',
          input: true,
          required: true,
          description: 'Unique key for this component (e.g. appDetailRef).',
        },
      ],
    }
  }
}
