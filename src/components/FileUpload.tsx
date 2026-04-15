export const FILE_UPLOADER_TYPE = 'fileUploader'

export interface FileUploaderSchema {
  type: string
  label: string
  key: string
  input: boolean
  tableView: boolean
  description: string
  uploadButtonLabel: string
  uploadIcon: string
  multiple: boolean
  allowedFileTypes: string
  acceptedExtensions: string
  maxFileSize: string
  maxFiles: number
  deferredUpload: boolean
  allowRemove: boolean
  allowReplace: boolean
  showFileList: boolean
  showFileSize: boolean
  scanEnabled: boolean
  scanApiUrl: string
  uploadApiUrl: string
  autofocus: boolean
  [k: string]: unknown
}

export class FileUploaderComponent {
  static schema(overrides?: Record<string, unknown>): FileUploaderSchema {
    return {
      type: FILE_UPLOADER_TYPE,
      label: 'File Upload',
      key: 'fileUploader',
      input: true,
      tableView: false,
      description: '',
      uploadButtonLabel: 'Upload',
      uploadIcon: 'fa fa-upload',
      multiple: false,
      allowedFileTypes: '',
      acceptedExtensions: '.pdf,.jpg,.jpeg,.png,.doc,.docx',
      maxFileSize: '10MB',
      maxFiles: 1,
      deferredUpload: true,
      allowRemove: true,
      allowReplace: false,
      showFileList: true,
      showFileSize: true,
      scanEnabled: false,
      scanApiUrl: '',
      uploadApiUrl: '',
      autofocus: false,
      ...overrides,
    }
  }

  static get builderInfo() {
    return {
      title: 'File Upload',
      group: 'basic',
      icon: 'upload',
      weight: 31,
      documentation:
        'Reusable file uploader with deferred upload, scan support, and configurable file constraints. Can be used standalone or nested inside other components.',
      schema: FileUploaderComponent.schema(),
    }
  }

  static editForm() {
    return {
      components: [
        {
          type: 'tabs',
          key: 'tabs',
          components: [
            // ── Display tab ──────────────────────────────────────────
            {
              label: 'Display',
              key: 'display',
              components: [
                {
                  type: 'textfield',
                  key: 'label',
                  label: 'Label',
                  input: true,
                  defaultValue: 'File Upload',
                  weight: 10,
                },
                {
                  type: 'textarea',
                  key: 'description',
                  label: 'Description / Help Text',
                  input: true,
                  placeholder: 'e.g., Upload a scanned copy of your document',
                  description: 'Guidance text shown below the upload area.',
                  weight: 20,
                },
                {
                  type: 'textfield',
                  key: 'uploadButtonLabel',
                  label: 'Upload Button Label',
                  input: true,
                  defaultValue: 'Upload',
                  description: 'Label displayed on the upload trigger button.',
                  weight: 30,
                },
                {
                  type: 'textfield',
                  key: 'uploadIcon',
                  label: 'Upload Icon CSS Class',
                  input: true,
                  defaultValue: 'fa fa-upload',
                  description: 'Font Awesome icon class for the upload trigger (e.g., fa fa-upload).',
                  weight: 40,
                },
                {
                  type: 'checkbox',
                  key: 'autofocus',
                  label: 'Initial Focus',
                  input: true,
                  defaultValue: false,
                  tooltip: 'When enabled, this field receives focus when the form loads.',
                  weight: 50,
                },
                {
                  type: 'checkbox',
                  key: 'hidden',
                  label: 'Hidden',
                  input: true,
                  defaultValue: false,
                  weight: 60,
                },
                {
                  type: 'checkbox',
                  key: 'disabled',
                  label: 'Disabled',
                  input: true,
                  defaultValue: false,
                  weight: 70,
                },
              ],
            },
            // ── File Settings tab ────────────────────────────────────
            {
              label: 'File Settings',
              key: 'fileSettings',
              components: [
                {
                  type: 'checkbox',
                  key: 'multiple',
                  label: 'Allow Multiple File Selection',
                  input: true,
                  defaultValue: false,
                  description: 'Allow the user to select more than one file at a time.',
                  weight: 10,
                },
                {
                  type: 'textfield',
                  key: 'allowedFileTypes',
                  label: 'Allowed File Types (MIME)',
                  input: true,
                  placeholder: 'e.g., image/*,application/pdf',
                  description: 'Comma-separated MIME types. Leave empty to allow all.',
                  weight: 20,
                },
                {
                  type: 'textfield',
                  key: 'acceptedExtensions',
                  label: 'Accepted Extensions',
                  input: true,
                  defaultValue: '.pdf,.jpg,.jpeg,.png,.doc,.docx',
                  placeholder: '.pdf,.jpg,.png',
                  description: 'Comma-separated file extensions.',
                  weight: 30,
                },
                {
                  type: 'textfield',
                  key: 'maxFileSize',
                  label: 'Maximum File Size',
                  input: true,
                  defaultValue: '10MB',
                  placeholder: '10MB',
                  description: 'Maximum size per file (e.g., 5MB, 500KB).',
                  weight: 40,
                },
                {
                  type: 'number',
                  key: 'maxFiles',
                  label: 'Maximum Number of Files',
                  input: true,
                  defaultValue: 1,
                  description: 'Maximum number of files that can be uploaded. 0 = unlimited.',
                  weight: 50,
                },
                {
                  type: 'checkbox',
                  key: 'deferredUpload',
                  label: 'Deferred Upload',
                  input: true,
                  defaultValue: true,
                  description: 'When enabled, selected files are held locally and not uploaded immediately.',
                  weight: 60,
                },
              ],
            },
            // ── Behavior tab ─────────────────────────────────────────
            {
              label: 'Behavior',
              key: 'behavior',
              components: [
                {
                  type: 'checkbox',
                  key: 'allowRemove',
                  label: 'Allow Remove',
                  input: true,
                  defaultValue: true,
                  description: 'Allow the user to remove a selected file.',
                  weight: 10,
                },
                {
                  type: 'checkbox',
                  key: 'allowReplace',
                  label: 'Allow Replace',
                  input: true,
                  defaultValue: false,
                  description: 'Allow the user to replace a selected file.',
                  weight: 20,
                },
                {
                  type: 'checkbox',
                  key: 'showFileList',
                  label: 'Show Selected File List',
                  input: true,
                  defaultValue: true,
                  description: 'Display a list of selected files below the upload area.',
                  weight: 30,
                },
                {
                  type: 'checkbox',
                  key: 'showFileSize',
                  label: 'Show File Size',
                  input: true,
                  defaultValue: true,
                  description: 'Display the file size next to each selected file.',
                  weight: 40,
                },
              ],
            },
            // ── Scan tab ─────────────────────────────────────────────
            {
              label: 'Scan',
              key: 'scan',
              components: [
                {
                  type: 'textfield',
                  key: 'uploadApiUrl',
                  label: 'Upload API URL',
                  input: true,
                  placeholder: 'https://example.com/api/upload',
                  description:
                    'Endpoint called on form submit to upload the file. The response must return the server file path/URL. Leave empty to keep files deferred (no server upload).',
                  weight: 5,
                },
                {
                  type: 'checkbox',
                  key: 'scanEnabled',
                  label: 'Enable File Scanning',
                  input: true,
                  defaultValue: false,
                  description: 'Enable virus/malware scanning before upload. Requires Scan API URL.',
                  weight: 10,
                },
                {
                  type: 'textfield',
                  key: 'scanApiUrl',
                  label: 'Scan API URL',
                  input: true,
                  placeholder: 'https://example.com/api/scan',
                  description:
                    'Endpoint called before upload to scan the file. Upload is blocked if scan fails.',
                  weight: 20,
                  conditional: { show: true, when: 'scanEnabled', eq: 'true' },
                },
              ],
            },
            // ── Validation tab ───────────────────────────────────────
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
                  placeholder: 'Please upload the required file',
                  description: 'Error message shown when validation fails.',
                  weight: 20,
                },
                {
                  type: 'textarea',
                  key: 'validate.custom',
                  label: 'Custom Validation (JavaScript)',
                  input: true,
                  rows: 5,
                  weight: 30,
                  description:
                    'Write custom JavaScript validation. Set "valid" to true or an error message string. Available variables: valid, input, data, row, component, instance.',
                },
              ],
            },
            // ── API tab ──────────────────────────────────────────────
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
                  validate: {
                    required: true,
                  },
                  defaultValue: 'fileUploader',
                  description: 'Unique key for this component used in submission data (e.g. fileUploader).',
                  weight: 10,
                },
              ],
            },
            // ── Conditional tab ──────────────────────────────────────
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
                    'Write custom JavaScript. Set "show" to true/false. Available variables: show, data, row, component, instance.',
                },
              ],
            },
            // ── Logic tab ────────────────────────────────────────────
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
