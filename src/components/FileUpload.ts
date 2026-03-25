export const FILE_UPLOAD_TYPE = 'fileUpload'

export interface FileUploadSchema {
  type: string
  label: string
  key: string
  input: boolean
  tableView: boolean
  multiple: boolean
  allowedFileTypes: string
  maxFileSize: string
  enableScan: boolean
  scanProvider: string
  uploadCategory: string
  uploadEndpoint: string
  description: string
  [k: string]: unknown
}

export class FileUploadComponent {
  static schema(overrides?: Record<string, unknown>): FileUploadSchema {
    return {
      type: FILE_UPLOAD_TYPE,
      label: 'File Upload',
      key: 'fileUpload',
      input: true,
      tableView: false,
      multiple: false,
      allowedFileTypes: '.pdf,.jpg,.jpeg,.png,.doc,.docx',
      maxFileSize: '10MB',
      enableScan: false,
      scanProvider: '',
      uploadCategory: '',
      uploadEndpoint: '',
      description: '',
      ...overrides,
    }
  }

  static get builderInfo() {
    return {
      title: 'File Upload',
      group: 'basic',
      icon: 'upload',
      weight: 31,
      documentation: 'File upload with configurable file types, size limits, and optional scan integration.',
      schema: FileUploadComponent.schema(),
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
                  defaultValue: 'File Upload',
                  weight: 10,
                },
                {
                  type: 'textfield',
                  key: 'key',
                  label: 'Property Name',
                  input: true,
                  defaultValue: 'fileUpload',
                  weight: 20,
                },
                {
                  type: 'textarea',
                  key: 'description',
                  label: 'Help Text',
                  input: true,
                  placeholder: 'e.g., Upload a scanned copy of your document',
                  description: 'Guidance text shown below the upload area.',
                  weight: 30,
                },
                {
                  type: 'checkbox',
                  key: 'hidden',
                  label: 'Hidden',
                  input: true,
                  defaultValue: false,
                  weight: 40,
                },
                {
                  type: 'checkbox',
                  key: 'disabled',
                  label: 'Disabled',
                  input: true,
                  defaultValue: false,
                  weight: 50,
                },
              ],
            },
            {
              label: 'File Settings',
              key: 'fileSettings',
              components: [
                {
                  type: 'textfield',
                  key: 'allowedFileTypes',
                  label: 'Allowed File Types',
                  input: true,
                  defaultValue: '.pdf,.jpg,.jpeg,.png,.doc,.docx',
                  placeholder: '.pdf,.jpg,.png',
                  description: 'Comma-separated list of accepted file extensions.',
                  weight: 10,
                },
                {
                  type: 'textfield',
                  key: 'maxFileSize',
                  label: 'Max File Size',
                  input: true,
                  defaultValue: '10MB',
                  placeholder: '10MB',
                  description: 'Maximum file size (e.g., 5MB, 500KB).',
                  weight: 20,
                },
                {
                  type: 'checkbox',
                  key: 'multiple',
                  label: 'Allow Multiple Files',
                  input: true,
                  defaultValue: false,
                  description: 'Allow the user to upload more than one file.',
                  weight: 30,
                },
                {
                  type: 'textfield',
                  key: 'uploadCategory',
                  label: 'Document Category',
                  input: true,
                  placeholder: 'e.g., identity, medical, financial',
                  description: 'Category tag for organizing uploaded documents.',
                  weight: 40,
                },
              ],
            },
            {
              label: 'Upload Source',
              key: 'uploadSource',
              components: [
                {
                  type: 'textfield',
                  key: 'uploadEndpoint',
                  label: 'Upload Endpoint',
                  input: true,
                  placeholder: 'https://api.example.com/upload',
                  description: 'API endpoint where files are uploaded. Resolved by the renderer at runtime.',
                  weight: 10,
                },
              ],
            },
            {
              label: 'Scan',
              key: 'scan',
              components: [
                {
                  type: 'checkbox',
                  key: 'enableScan',
                  label: 'Enable File Scanning',
                  input: true,
                  defaultValue: false,
                  description: 'Enable virus/malware scanning on uploaded files.',
                  weight: 10,
                },
                {
                  type: 'textfield',
                  key: 'scanProvider',
                  label: 'Scan Provider',
                  input: true,
                  placeholder: 'e.g., clamav, custom',
                  description: 'Identifier of the scan provider used by the renderer. Leave blank to use the default.',
                  weight: 20,
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
                  placeholder: 'Please upload the required document',
                  description: 'Error message shown when validation fails.',
                  weight: 20,
                },
              ],
            },
          ],
        },
      ],
    }
  }
}
