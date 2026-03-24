export const PDF_VIEWER_TYPE = 'pdfViewer'

export interface PdfViewerSchema {
  type: string
  label: string
  key: string
  input: boolean
  tableView: boolean
  pdfSource: string
  sourceType: 'url' | 'documentKey'
  documentTitle: string
  viewerHeight: string
  showToolbar: boolean
  [k: string]: unknown
}

export class PdfViewerComponent {
  static schema(overrides?: Record<string, unknown>): PdfViewerSchema {
    return {
      type: PDF_VIEWER_TYPE,
      label: 'PDF Viewer',
      key: 'pdfViewer',
      input: false,
      tableView: false,
      pdfSource: '',
      sourceType: 'url',
      documentTitle: '',
      viewerHeight: '600px',
      showToolbar: true,
      ...overrides,
    }
  }

  static get builderInfo() {
    return {
      title: 'PDF Viewer',
      group: 'basic',
      icon: 'file-pdf-o',
      weight: 30,
      documentation: 'Displays a PDF document from a URL or document key.',
      schema: PdfViewerComponent.schema(),
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
                  defaultValue: 'PDF Viewer',
                  weight: 10,
                },
                {
                  type: 'textfield',
                  key: 'key',
                  label: 'Property Name',
                  input: true,
                  defaultValue: 'pdfViewer',
                  weight: 20,
                },
                {
                  type: 'textfield',
                  key: 'documentTitle',
                  label: 'Document Title',
                  input: true,
                  placeholder: 'e.g., Application Form',
                  description: 'Title displayed above the PDF viewer.',
                  weight: 30,
                },
              ],
            },
            {
              label: 'PDF Source',
              key: 'pdfSource',
              components: [
                {
                  type: 'select',
                  key: 'sourceType',
                  label: 'Source Type',
                  input: true,
                  defaultValue: 'url',
                  data: {
                    values: [
                      { label: 'URL', value: 'url' },
                      { label: 'Document Key', value: 'documentKey' },
                    ],
                  },
                  description: 'Choose whether the PDF is loaded from a URL or a document key.',
                  weight: 10,
                },
                {
                  type: 'textfield',
                  key: 'pdfSource',
                  label: 'PDF URL / Document Key',
                  input: true,
                  placeholder: 'https://example.com/document.pdf',
                  description: 'The URL or document key for the PDF to display.',
                  validate: { required: true },
                  weight: 20,
                },
              ],
            },
            {
              label: 'Viewer Settings',
              key: 'viewerSettings',
              components: [
                {
                  type: 'textfield',
                  key: 'viewerHeight',
                  label: 'Viewer Height',
                  input: true,
                  defaultValue: '600px',
                  placeholder: '600px',
                  description: 'Height of the PDF viewer (e.g., 600px, 80vh).',
                  weight: 10,
                },
                {
                  type: 'checkbox',
                  key: 'showToolbar',
                  label: 'Show Toolbar',
                  input: true,
                  defaultValue: true,
                  description: 'Show the browser PDF toolbar (zoom, download, print).',
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
