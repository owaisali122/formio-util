/**
 * Form.io File Download — Designer (builder-side) component definition.
 *
 * Reference pattern: FileViewerComponent (src/components/FileViewer.ts)
 *
 * Reusable file download component that renders a simple icon trigger.
 * Click initiates a file download via fetch (works with cross-origin / proxy URLs).
 * Works standalone, inside tables, lists, or any container layout.
 */

export const FILE_DOWNLOAD_TYPE = 'fileDownload'

export interface FileDownloadSchema {
  type: string
  label: string
  key: string
  input: boolean
  tableView: boolean
  /** Description / help text shown below the download trigger */
  description: string
  /** Icon CSS class (Font Awesome) for the download trigger */
  downloadIcon: string
  /** How the file URL is resolved */
  sourceType: 'url' | 'dataKey'
  /** Static URL or URL template with {{fieldKey}} interpolation */
  fileUrl: string
  /** Submission data key or URL template to read the file URL from (when sourceType = 'dataKey') */
  fileUrlKey: string
  /** Optional data key for the original file name */
  fileNameKey: string
  /** Fallback text when no file URL is available */
  fallbackText: string
  [k: string]: unknown
}

export class FileDownloadComponent {
  static schema(overrides?: Partial<FileDownloadSchema>): FileDownloadSchema {
    return {
      type: FILE_DOWNLOAD_TYPE,
      label: '',
      key: 'fileDownload',
      input: false,
      tableView: false,
      description: '',
      downloadIcon: 'fa fa-download',
      sourceType: 'url',
      fileUrl: '',
      fileUrlKey: '',
      fileNameKey: '',
      fallbackText: 'No file available',
      ...overrides,
    }
  }

  static get builderInfo() {
    return {
      title: 'File Download',
      group: 'basic',
      icon: 'download',
      weight: 33,
      documentation: 'Reusable file download component. Renders a download icon/link that fetches and downloads any file type.',
      schema: FileDownloadComponent.schema(),
    }
  }

  static editForm() {
    return {
      components: [
        {
          type: 'tabs',
          key: 'tabs',
          components: [
            // ── Display Tab ──
            {
              label: 'Display',
              key: 'display',
              components: [
                {
                  type: 'textfield',
                  key: 'label',
                  label: 'Label',
                  input: true,
                  defaultValue: '',
                  description: 'Optional label shown next to the icon. Leave empty for icon-only.',
                  weight: 10,
                },
                {
                  type: 'textfield',
                  key: 'key',
                  label: 'Property Name',
                  input: true,
                  defaultValue: 'fileDownload',
                  weight: 20,
                },
                {
                  type: 'textarea',
                  key: 'description',
                  label: 'Description / Help Text',
                  input: true,
                  placeholder: 'e.g., Click to download the document',
                  description: 'Optional guidance text shown below the download trigger.',
                  weight: 30,
                },
                {
                  type: 'textfield',
                  key: 'downloadIcon',
                  label: 'Icon CSS Class',
                  input: true,
                  defaultValue: 'fa fa-download',
                  description: 'Font Awesome icon class (e.g., fa fa-download).',
                  weight: 40,
                },
                {
                  type: 'checkbox',
                  key: 'hidden',
                  label: 'Hidden',
                  input: true,
                  defaultValue: false,
                  weight: 50,
                },
                {
                  type: 'checkbox',
                  key: 'disabled',
                  label: 'Disabled',
                  input: true,
                  defaultValue: false,
                  weight: 60,
                },
              ],
            },
            // ── File Source Tab ──
            {
              label: 'File Source',
              key: 'fileSourceTab',
              components: [
                {
                  type: 'select',
                  key: 'sourceType',
                  label: 'Source Type',
                  input: true,
                  defaultValue: 'url',
                  data: {
                    values: [
                      { label: 'Static URL', value: 'url' },
                      { label: 'Data Key (from submission)', value: 'dataKey' },
                    ],
                  },
                  description: 'Choose whether the file URL is a static value or read from submission data.',
                  weight: 10,
                },
                {
                  type: 'textfield',
                  key: 'fileUrl',
                  label: 'File URL',
                  input: true,
                  placeholder: 'https://example.com/file.pdf',
                  description: 'Direct URL to the file. Supports {{fieldKey}} interpolation for dynamic URLs.',
                  weight: 20,
                  conditional: { json: { '===': [{ var: 'data.sourceType' }, 'url'] } },
                },
                {
                  type: 'textfield',
                  key: 'fileUrlKey',
                  label: 'File URL Data Key',
                  input: true,
                  placeholder: 'e.g., documentUrl or /api/file-preview{{documentUrl}}',
                  description: 'Field key or URL template. Plain key reads the value from submission data. With {{fieldKey}} syntax, values are interpolated. e.g. /api/file-preview{{link}}',
                  weight: 20,
                  conditional: { json: { '===': [{ var: 'data.sourceType' }, 'dataKey'] } },
                },
                {
                  type: 'textfield',
                  key: 'fileNameKey',
                  label: 'File Name Data Key',
                  input: true,
                  placeholder: 'e.g., fileName',
                  description: 'Optional submission data key for the original file name. Used as the downloaded file name.',
                  weight: 30,
                },
                {
                  type: 'textfield',
                  key: 'fallbackText',
                  label: 'Fallback Text',
                  input: true,
                  defaultValue: 'No file available',
                  description: 'Text shown when no file URL is available.',
                  weight: 40,
                },
              ],
            },
          ],
        },
      ],
    }
  }
}
