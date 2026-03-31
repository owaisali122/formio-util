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
  [k: string]: unknown
}

export class FileUploaderComponent {
  static schema(overrides?: Record<string, unknown>): FileUploaderSchema {
    return {
      type: FILE_UPLOADER_TYPE,
      label: 'File Uploader',
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
      ...overrides,
    }
  }

  static get builderInfo() {
    return {
      title: 'File Uploader',
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
            {
              label: 'Display',
              key: 'display',
              components: [
                {
                  type: 'textfield',
                  key: 'label',
                  label: 'Label',
                  input: true,
                  defaultValue: 'File Uploader',
                  weight: 10,
                },
                {
                  type: 'textfield',
                  key: 'key',
                  label: 'Property Name',
                  input: true,
                  defaultValue: 'fileUploader',
                  weight: 20,
                },
                {
                  type: 'textarea',
                  key: 'description',
                  label: 'Description / Help Text',
                  input: true,
                  placeholder: 'e.g., Upload a scanned copy of your document',
                  description: 'Guidance text shown below the upload area.',
                  weight: 30,
                },
                {
                  type: 'textfield',
                  key: 'uploadButtonLabel',
                  label: 'Upload Button Label',
                  input: true,
                  defaultValue: 'Upload',
                  description: 'Label displayed on the upload trigger button.',
                  weight: 40,
                },
                {
                  type: 'textfield',
                  key: 'uploadIcon',
                  label: 'Upload Icon CSS Class',
                  input: true,
                  defaultValue: 'fa fa-upload',
                  description: 'Font Awesome icon class for the upload trigger (e.g., fa fa-upload).',
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
            {
              label: 'Scan',
              key: 'scan',
              components: [
                {
                  type: 'checkbox',
                  key: 'scanEnabled',
                  label: 'Enable File Scanning',
                  input: true,
                  defaultValue: false,
                  description: 'Enable virus/malware scanning on uploaded files.',
                  weight: 10,
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
                  placeholder: 'Please upload the required file',
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
