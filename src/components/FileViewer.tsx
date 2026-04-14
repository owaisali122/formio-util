/**
 * Form.io File Viewer — Designer (builder-side) component definition.
 *
 * Reference pattern: FileUploaderComponent (src/components/FileUploader.ts)
 *
 * Reusable file preview component that detects file type and renders
 * the appropriate viewer (image, PDF, video, audio) with graceful
 * fallback for unsupported types.
 *
 * Works standalone, inside tables, lists, or any container layout.
 */

export const FILE_VIEWER_TYPE = 'fileViewer'

export interface FileViewerSchema {
  type: string
  label: string
  key: string
  input: boolean
  tableView: boolean
  /** Description / help text shown below the viewer */
  description: string
  /** Icon CSS class (Font Awesome) for the viewer trigger */
  viewerIcon: string
  /** How the file URL is resolved */
  sourceType: 'url' | 'dataKey'
  /** Static URL or URL template with {{fieldKey}} interpolation */
  fileUrl: string
  /** Submission data key to read the file URL from (when sourceType = 'dataKey') */
  fileUrlKey: string
  /** Optional data key for the original file name */
  fileNameKey: string
  /** CSS height for the viewer container */
  viewerHeight: string
  /** Maximum width (CSS) for image previews */
  maxWidth: string
  /** Show a download link alongside the preview */
  showDownloadLink: boolean
  /** Fallback text when file type is unsupported or URL is missing */
  fallbackText: string
  /** PDF viewer mode: 'fetch' (default) downloads file & auto-detects type, 'direct' uses browser iframe, 'google' uses Google Docs Viewer */
  pdfViewerMode: 'direct' | 'google' | 'fetch'
  /**
   * Force the file type category, overriding automatic URL extension detection.
   * Use 'pdf' when the URL ends in .html or has no extension but serves a PDF.
   */
  forceFileType: '' | 'pdf' | 'image' | 'video' | 'audio'
  [k: string]: unknown
}

export class FileViewerComponent {
  static schema(overrides?: Partial<FileViewerSchema>): FileViewerSchema {
    return {
      type: FILE_VIEWER_TYPE,
      label: 'File Viewer',
      key: 'fileViewer',
      input: false,
      tableView: false,
      description: '',
      viewerIcon: 'fa fa-eye',
      sourceType: 'url',
      fileUrl: '',
      fileUrlKey: '',
      fileNameKey: '',
      viewerHeight: '400px',
      maxWidth: '100%',
      showDownloadLink: false,
      fallbackText: 'Preview not available for this file type.',
      pdfViewerMode: 'fetch',
      forceFileType: '',
      ...overrides,
    }
  }

  static get builderInfo() {
    return {
      title: 'File Viewer',
      group: 'basic',
      icon: 'eye',
      weight: 32,
      documentation: 'Reusable file preview component. Supports images, PDFs, video, and audio with fallback for unsupported types.',
      schema: FileViewerComponent.schema(),
    }
  }

  static editForm() {
    return {
      components: [
        {
          type: 'tabs',
          key: 'tabs',
          components: [
            // ── Display Tab (matches FileUploader pattern) ──
            {
              label: 'Display',
              key: 'display',
              components: [
                {
                  type: 'textfield',
                  key: 'label',
                  label: 'Label',
                  input: true,
                  defaultValue: 'File Viewer',
                  weight: 10,
                },
                {
                  type: 'textfield',
                  key: 'key',
                  label: 'Property Name',
                  input: true,
                  defaultValue: 'fileViewer',
                  weight: 20,
                },
                {
                  type: 'textarea',
                  key: 'description',
                  label: 'Description / Help Text',
                  input: true,
                  placeholder: 'e.g., Preview of uploaded document',
                  description: 'Optional guidance text shown below the viewer.',
                  weight: 30,
                },
                {
                  type: 'textfield',
                  key: 'viewerIcon',
                  label: 'Icon CSS Class',
                  input: true,
                  defaultValue: 'fa fa-eye',
                  description: 'Font Awesome icon class (e.g., fa fa-eye).',
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
                  description: 'Field key or URL template. Plain key reads the value from submission data. With {{fieldKey}} syntax, values are interpolated (URL-encoded). e.g. /api/file-preview{{link}}',
                  weight: 20,
                  conditional: { json: { '===': [{ var: 'data.sourceType' }, 'dataKey'] } },
                },
                {
                  type: 'textfield',
                  key: 'fileNameKey',
                  label: 'File Name Data Key',
                  input: true,
                  placeholder: 'e.g., fileName',
                  description: 'Optional submission data key for the original file name. Used for download link text and type detection.',
                  weight: 30,
                },
              ],
            },
            // ── Viewer Settings Tab ──
            {
              label: 'Viewer Settings',
              key: 'viewerSettingsTab',
              components: [
                { type: 'textfield', key: 'viewerHeight', label: 'Viewer Height', input: true, defaultValue: '400px', description: 'CSS height for the viewer container (e.g., 400px, 50vh).', weight: 10 },
                { type: 'textfield', key: 'maxWidth', label: 'Max Width', input: true, defaultValue: '100%', description: 'Maximum width for image previews (e.g., 100%, 600px).', weight: 20 },
                {
                  type: 'select',
                  key: 'pdfViewerMode',
                  label: 'PDF Viewer Mode',
                  input: true,
                  defaultValue: 'fetch',
                  data: {
                    values: [
                      { label: 'Fetch & Embed (auto-detect, default)', value: 'fetch' },
                      { label: 'Direct Embed (browser PDF viewer)', value: 'direct' },
                      { label: 'Google Docs Viewer (better cross-origin support)', value: 'google' },
                    ],
                  },
                  description: 'Choose how PDFs are displayed. Direct uses the browser\'s built-in viewer. Google Docs Viewer works with public URLs. Fetch & Embed downloads the file first via JavaScript then displays it — best for protected/authenticated URLs that block iframe embedding.',
                  weight: 25,
                },
                { type: 'checkbox', key: 'showDownloadLink', label: 'Show Download Link', input: true, defaultValue: false, description: 'Display a download link below the preview.', weight: 30 },
                { type: 'textfield', key: 'fallbackText', label: 'Fallback Text', input: true, defaultValue: 'Preview not available for this file type.', description: 'Text shown when the file type cannot be previewed.', weight: 40 },
                {
                  type: 'select',
                  key: 'forceFileType',
                  label: 'Force File Type',
                  input: true,
                  defaultValue: '',
                  data: {
                    values: [
                      { label: 'Auto-detect from URL (default)', value: '' },
                      { label: 'PDF', value: 'pdf' },
                      { label: 'Image', value: 'image' },
                      { label: 'Video', value: 'video' },
                      { label: 'Audio', value: 'audio' },
                    ],
                  },
                  description: 'Override automatic file type detection. Use "PDF" when the URL ends in .html or has no extension but serves a PDF file.',
                  weight: 50,
                },
              ],
            },
          ],
        },
      ],
    }
  }
}
