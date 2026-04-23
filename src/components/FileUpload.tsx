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
  allowRemove: boolean
  showFileList: boolean
  showFileSize: boolean
  // data source
  apiType: 'custom' | 'secure'
  scanEnabled: boolean
  scanApiUrl: string
  uploadApiUrl: string
  // secure API auth
  authType?: 'basic'
  authUsername?: string
  authPassword?: string
  partnerId?: string
  autofocus: boolean
  tabindex: number | string
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
      allowRemove: true,
      showFileList: true,
      showFileSize: true,
      // data source
      apiType: 'custom' as 'custom' | 'secure',
      scanEnabled: false,
      scanApiUrl: '',
      uploadApiUrl: '',
      // secure API auth
      authType: 'basic' as 'basic',
      authUsername: '',
      authPassword: '',
      partnerId: '',
      autofocus: false,
      tabindex: '',
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
                }
              ],
            },
            // ── Files tab (File Settings + Behavior) ─────────────────
            {
              label: 'Files',
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
                  key: 'allowRemove',
                  label: 'Allow Remove',
                  input: true,
                  defaultValue: true,
                  description: 'Allow the user to remove a selected file.',
                  weight: 60,
                },
                {
                  type: 'checkbox',
                  key: 'showFileList',
                  label: 'Show Selected File List',
                  input: true,
                  defaultValue: true,
                  description: 'Display a list of selected files below the upload area.',
                  weight: 80,
                },
                {
                  type: 'checkbox',
                  key: 'showFileSize',
                  label: 'Show File Size',
                  input: true,
                  defaultValue: true,
                  description: 'Display the file size next to each selected file.',
                  weight: 90,
                },
              ],
            },
            // ── Data Source tab ──────────────────────────────────────
            {
              label: 'Source',
              key: 'dataSource',
              components: [
                {
                  type: 'select',
                  key: 'apiType',
                  label: 'API Type',
                  input: true,
                  defaultValue: 'custom',
                  data: { values: [{ label: 'Custom API', value: 'custom' }, { label: 'Secure API', value: 'secure' }] },
                  description: 'Select Custom API for standard endpoints, or Secure API for endpoints requiring authentication and headers.',
                  weight: 5,
                },
                {
                  type: 'textfield',
                  key: 'uploadApiUrl',
                  label: 'Upload API URL',
                  input: true,
                  placeholder: 'https://example.com/api/upload',
                  description:
                    'Endpoint called on form submit to upload the file. The response must return the server file path/URL. Leave empty to skip server upload.',
                  weight: 10,
                },
                {
                  type: 'checkbox',
                  key: 'scanEnabled',
                  label: 'Enable File Scanning',
                  input: true,
                  defaultValue: false,
                  description: 'Enable virus/malware scanning before upload. Requires Scan API URL.',
                  weight: 20,
                },
                {
                  type: 'textfield',
                  key: 'scanApiUrl',
                  label: 'Scan API URL',
                  input: true,
                  placeholder: 'https://example.com/api/scan',
                  description:
                    'Endpoint called before upload to scan the file. Upload is blocked if scan fails.',
                  weight: 30,
                  conditional: { show: true, when: 'scanEnabled', eq: 'true' },
                },
                // ── Secure API fields — shown only when apiType = 'secure' ──
                {
                  type: 'select',
                  key: 'authType',
                  label: 'Authentication Type',
                  input: true,
                  defaultValue: 'basic',
                  data: { values: [{ label: 'Basic Auth', value: 'basic' }] },
                  description: 'Authentication method for the secure API endpoint.',
                  weight: 40,
                  conditional: { json: { '===': [{ var: 'data.apiType' }, 'secure'] } },
                },
                {
                  type: 'textfield',
                  key: 'authUsername',
                  label: 'Basic Auth Username',
                  input: true,
                  placeholder: 'Enter username',
                  description: 'Username for Basic Authentication.',
                  weight: 50,
                  conditional: { json: { and: [{ '===': [{ var: 'data.apiType' }, 'secure'] }, { '===': [{ var: 'data.authType' }, 'basic'] }] } },
                },
                {
                  type: 'password',
                  key: 'authPassword',
                  label: 'Basic Auth Password',
                  input: true,
                  placeholder: 'Enter password',
                  description: 'Password for Basic Authentication. Value is masked in the UI.',
                  weight: 60,
                  conditional: { json: { and: [{ '===': [{ var: 'data.apiType' }, 'secure'] }, { '===': [{ var: 'data.authType' }, 'basic'] }] } },
                },
                {
                  type: 'textfield',
                  key: 'partnerId',
                  label: 'Partner ID Header',
                  input: true,
                  placeholder: 'Enter partner-id value',
                  description: 'Value for the partner-id HTTP header sent with secure API requests.',
                  weight: 70,
                  conditional: { json: { '===': [{ var: 'data.apiType' }, 'secure'] } },
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
                  validate: { required: true },
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
