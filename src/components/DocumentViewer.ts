/**
 * Form.io Document Viewer — Designer (builder-side) component definition.
 *
 * Reference pattern: FileDownloadComponent (src/components/FileDownload.tsx)
 *
 * Renders a trigger button that opens a document (PDF, image, or other)
 * inside the existing project popup. Configurable source type, viewer
 * settings, and file type detection.
 */

export const DOCUMENT_VIEWER_TYPE = 'documentViewer'

export type DocumentViewerSourceType = 'static' | 'submission'
export type DocumentViewerFileType = 'auto' | 'pdf' | 'image' | 'text' | 'other'

export interface DocumentViewerSchema {
  type: string
  label: string
  key: string
  input: boolean
  tableView: boolean
  // Display
  description: string
  iconCssClass: string
  autofocus: boolean
  hidden: boolean
  disabled: boolean
  tabindex: number | string
  // File Source
  sourceType: DocumentViewerSourceType
  fileUrl: string
  fileUrlDataKey: string
  fileNameDataKey: string
  // Viewer Settings
  viewerHeight: string
  maxWidth: string
  buttonText: string
  popupTitle: string
  fallbackText: string
  forceFileType: DocumentViewerFileType
  openInPopup: boolean
  // View mode + toolbar visibility
  viewMode: 'page' | 'scroll'
  showToolbarSidebar: boolean
  showToolbarFind: boolean
  showToolbarNavigation: boolean
  showToolbarZoom: boolean
  showToolbarRotate: boolean
  showToolbarPrint: boolean
  showToolbarDownload: boolean
  // cache
  enableCache: boolean
  [k: string]: unknown
}

export class DocumentViewerComponent {
  static schema(overrides?: Partial<DocumentViewerSchema>): DocumentViewerSchema {
    return {
      type: DOCUMENT_VIEWER_TYPE,
      label: 'Document Viewer',
      key: 'documentViewer',
      input: false,
      tableView: false,
      description: '',
      iconCssClass: 'fa fa-file',
      autofocus: false,
      hidden: false,
      disabled: false,
      tabindex: '',
      sourceType: 'static',
      fileUrl: '',
      fileUrlDataKey: '',
      fileNameDataKey: '',
      viewerHeight: '400px',
      maxWidth: '100%',
      buttonText: '',
      popupTitle: '',
      fallbackText: 'Preview not available for this file type.',
      forceFileType: 'auto',
      openInPopup: true,
      viewMode: 'page',
      showToolbarSidebar: true,
      showToolbarFind: true,
      showToolbarNavigation: true,
      showToolbarZoom: true,
      showToolbarRotate: true,
      showToolbarPrint: true,
      showToolbarDownload: true,
      // cache
      enableCache: true,
      ...overrides,
    }
  }

  static get builderInfo() {
    return {
      title: 'Document Viewer',
      group: 'basic',
      icon: 'file',
      weight: 34,
      documentation: 'Opens a document (PDF, image, etc.) inside the popup for inline preview.',
      schema: DocumentViewerComponent.schema(),
    }
  }

  static editForm() {
    return {
      components: [
        {
          type: 'tabs',
          key: 'tabs',
          components: [
            // ── Display Tab ──────────────────────────────────────────────────
            {
              label: 'Display',
              key: 'display',
              components: [
                {
                  type: 'textfield',
                  key: 'label',
                  label: 'Label',
                  input: true,
                  defaultValue: 'Document Viewer',
                  weight: 10,
                },
                {
                  type: 'textarea',
                  key: 'description',
                  label: 'Description / Help Text',
                  input: true,
                  placeholder: 'e.g., Click to preview the document',
                  rows: 2,
                  weight: 20,
                },
                {
                  type: 'textfield',
                  key: 'iconCssClass',
                  label: 'Icon CSS Class',
                  input: true,
                  defaultValue: 'fa fa-file',
                  description: 'Font Awesome icon class shown on the trigger button (e.g., fa fa-file-pdf-o).',
                  weight: 30,
                },
                {
                  type: 'number',
                  key: 'tabindex',
                  label: 'Tab Index',
                  input: true,
                  defaultValue: '',
                  placeholder: '0',
                  weight: 70,
                  tooltip: 'Sets the tabindex attribute of this component to override the tab order of the form. See the MDN documentation on tabindex for details.',
                },
                {
                  type: 'checkbox',
                  key: 'autofocus',
                  label: 'Initial Focus',
                  input: true,
                  defaultValue: false,
                  tooltip: 'When enabled, focuses the trigger button when the form loads.',
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
                {
                  type: 'checkbox',
                  key: 'enableCache',
                  label: 'Enable Cache',
                  input: true,
                  defaultValue: true,
                  weight: 65,
                  tooltip: 'When enabled, the viewer preserves its state across wizard page navigation. Static URLs and resolved file metadata are not reloaded unnecessarily.',
                }
              ],
            },
            // ── File Source Tab ──────────────────────────────────────────────
            {
              label: 'File Source',
              key: 'fileSourceTab',
              components: [
                {
                  type: 'select',
                  key: 'sourceType',
                  label: 'Source Type',
                  input: true,
                  defaultValue: 'static',
                  dataSrc: 'values',
                  data: {
                    values: [
                      { label: 'Static URL', value: 'static' },
                      { label: 'Submission Data', value: 'submission' },
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
                  placeholder: 'https://example.com/document.pdf',
                  description: 'Direct URL to the file. Supports {{fieldKey}} interpolation.',
                  weight: 20,
                  conditional: { json: { '===': [{ var: 'data.sourceType' }, 'static'] } },
                },
                {
                  type: 'textfield',
                  key: 'fileUrlDataKey',
                  label: 'File URL Data Key',
                  input: true,
                  placeholder: 'e.g., documentUrl',
                  description: 'Submission data key to read the file URL from.',
                  weight: 20,
                  conditional: { json: { '===': [{ var: 'data.sourceType' }, 'submission'] } },
                },
                {
                  type: 'textfield',
                  key: 'fileNameDataKey',
                  label: 'File Name Data Key',
                  input: true,
                  placeholder: 'e.g., fileName',
                  description:
                    'Optional. Submission data key for the original file name. Used for type detection and popup title.',
                  weight: 30,
                },
              ],
            },
            // ── Viewer Settings Tab ──────────────────────────────────────────
            {
              label: 'Viewer Settings',
              key: 'viewerSettingsTab',
              components: [
                {
                  type: 'textfield',
                  key: 'buttonText',
                  label: 'Button Text (optional)',
                  input: true,
                  placeholder: 'e.g., Open Document',
                  description: 'Text shown on the trigger button. Leave empty for icon-only button.',
                  weight: 10,
                },
                {
                  type: 'textfield',
                  key: 'popupTitle',
                  label: 'Popup Title',
                  input: true,
                  placeholder: 'e.g., Document Preview',
                  description:
                    'Title shown in the popup header. Defaults to file name or "Document Viewer" if empty.',
                  weight: 20,
                },
                {
                  type: 'textfield',
                  key: 'viewerHeight',
                  label: 'Viewer Height',
                  input: true,
                  defaultValue: '400px',
                  description: 'CSS height for the document preview area inside the popup.',
                  weight: 30,
                },
                {
                  type: 'textfield',
                  key: 'maxWidth',
                  label: 'Max Width',
                  input: true,
                  defaultValue: '100%',
                  description: 'CSS max-width for the document or image preview.',
                  weight: 40,
                },
                {
                  type: 'textfield',
                  key: 'fallbackText',
                  label: 'Fallback Text',
                  input: true,
                  defaultValue: 'Preview not available for this file type.',
                  description: 'Text shown when the document cannot be previewed.',
                  weight: 60,
                },
                {
                  type: 'select',
                  key: 'forceFileType',
                  label: 'Force File Type',
                  input: true,
                  defaultValue: 'auto',
                  dataSrc: 'values',
                  data: {
                    values: [
                      { label: 'Auto (detect from URL or name)', value: 'auto' },
                      { label: 'PDF', value: 'pdf' },
                      { label: 'Image', value: 'image' },
                      { label: 'Text', value: 'text' },
                      { label: 'Other / Unknown', value: 'other' },
                    ],
                  },
                  description: 'Override automatic file type detection.',
                  weight: 70,
                },
                {
                  type: 'select',
                  key: 'viewMode',
                  label: 'PDF View Mode',
                  input: true,
                  defaultValue: 'page',
                  dataSrc: 'values',
                  data: {
                    values: [
                      { label: 'Page (navigate one page at a time)', value: 'page' },
                      { label: 'Scroll (all pages stacked)', value: 'scroll' },
                    ],
                  },
                  description: 'Controls whether the PDF shows one page at a time or all pages in a scrollable view.',
                  weight: 75,
                },
                {
                  type: 'checkbox',
                  key: 'showToolbarSidebar',
                  label: 'Show Toolbar: Thumbnails Sidebar',
                  input: true,
                  defaultValue: true,
                  weight: 80,
                },
                {
                  type: 'checkbox',
                  key: 'showToolbarFind',
                  label: 'Show Toolbar: Find / Search',
                  input: true,
                  defaultValue: true,
                  weight: 81,
                },
                {
                  type: 'checkbox',
                  key: 'showToolbarNavigation',
                  label: 'Show Toolbar: Page Navigation',
                  input: true,
                  defaultValue: true,
                  weight: 82,
                },
                {
                  type: 'checkbox',
                  key: 'showToolbarZoom',
                  label: 'Show Toolbar: Zoom Controls',
                  input: true,
                  defaultValue: true,
                  weight: 83,
                },
                {
                  type: 'checkbox',
                  key: 'showToolbarRotate',
                  label: 'Show Toolbar: Rotate Buttons',
                  input: true,
                  defaultValue: true,
                  weight: 84,
                },
                {
                  type: 'checkbox',
                  key: 'showToolbarPrint',
                  label: 'Show Toolbar: Print Button',
                  input: true,
                  defaultValue: true,
                  weight: 85,
                },
                {
                  type: 'checkbox',
                  key: 'showToolbarDownload',
                  label: 'Show Toolbar: Download Button',
                  input: true,
                  defaultValue: true,
                  weight: 86,
                },
              ],
            },
            // ── API Tab ──────────────────────────────────────────────────────
            {
              label: 'API',
              key: 'api',
              components: [
                {
                  type: 'textfield',
                  key: 'key',
                  label: 'Property Name',
                  input: true,
                  defaultValue: 'documentViewer',
                  description: 'The unique key for this component in the form schema.',
                  weight: 10,
                },
              ],
            },
            // ── Conditional Tab ──────────────────────────────────────────────
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
            // ── Logic Tab ────────────────────────────────────────────────────
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
                    'Write JavaScript. Set "show" to true/false. Available variables: show, data, row, component, instance.',
                },
                {
                  type: 'textarea',
                  key: 'customDefaultValue',
                  label: 'Custom Default Value',
                  input: true,
                  rows: 5,
                  weight: 20,
                  description: 'Write JavaScript for the default value. Set the "value" variable.',
                },
              ],
            },
          ],
        },
      ],
    }
  }
}
