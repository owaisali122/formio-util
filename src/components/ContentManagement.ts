/**
 * Form.io Content Management — Designer (builder-side) component definition.
 *
 * Reference pattern: DocumentViewerComponent (src/components/DocumentViewer.ts)
 *
 * Fetches and renders content from Payload CMS REST API at runtime.
 * Configurable collection, content ID/slug, response path mapping,
 * and render mode (html, richText).
 */

export const CONTENT_MANAGEMENT_TYPE = 'contentManagement'

export type ContentManagementRenderMode = 'html' | 'richText'

export interface ContentManagementSchema {
  type: string
  label: string
  key: string
  input: boolean
  tableView: boolean
  // Display
  hidden: boolean
  disabled: boolean
  customClass: string
  enableCache: boolean
  // Payload CMS
  payloadApiUrl: string
  collectionSlug: string
  contentId: string
  contentSlug: string
  queryParams: string
  responseDataPath: string
  titleFieldPath: string
  contentFieldPath: string
  renderMode: ContentManagementRenderMode
  [k: string]: unknown
}

export class ContentManagementComponent {
  static schema(overrides?: Partial<ContentManagementSchema>): ContentManagementSchema {
    return {
      type: CONTENT_MANAGEMENT_TYPE,
      label: 'Content Management',
      key: 'contentManagement',
      input: false,
      tableView: false,
      hidden: false,
      disabled: false,
      customClass: '',
      enableCache: true,
      payloadApiUrl: '',
      collectionSlug: '',
      contentId: '',
      contentSlug: '',
      queryParams: '',
      responseDataPath: '',
      titleFieldPath: '',
      contentFieldPath: '',
      renderMode: 'richText',
      ...overrides,
    }
  }

  static get builderInfo() {
    return {
      title: 'Content Management',
      group: 'basic',
      icon: 'file-text-o',
      weight: 38,
      documentation:
        'Fetches and renders content from Payload CMS. Supports rich text and HTML render modes.',
      schema: ContentManagementComponent.schema(),
    }
  }

  static editForm() {
    return {
      components: [
        {
          type: 'tabs',
          key: 'tabs',
          components: [
            // ── Display Tab ──────────────────────────────────────────────
            {
              label: 'Display',
              key: 'display',
              components: [
                {
                  type: 'textfield',
                  key: 'label',
                  label: 'Label',
                  input: true,
                  defaultValue: 'Content Management',
                  weight: 10,
                },
                {
                  type: 'textfield',
                  key: 'key',
                  label: 'Property Name',
                  input: true,
                  required: true,
                  weight: 15,
                },
                {
                  type: 'checkbox',
                  key: 'hidden',
                  label: 'Hidden',
                  input: true,
                  defaultValue: false,
                  tooltip:
                    'When enabled, this component is hidden from the form.',
                  weight: 20,
                },
                {
                  type: 'checkbox',
                  key: 'disabled',
                  label: 'Disabled',
                  input: true,
                  defaultValue: false,
                  weight: 30,
                },
                {
                  type: 'textfield',
                  key: 'customClass',
                  label: 'CSS Class',
                  input: true,
                  placeholder: 'e.g., my-content-block',
                  description:
                    'Custom CSS class added to the component wrapper.',
                  weight: 40,
                },
                {
                  type: 'checkbox',
                  key: 'enableCache',
                  label: 'Enable Cache',
                  input: true,
                  defaultValue: true,
                  tooltip:
                    'When enabled, fetched content is cached and reused on repeated loads. Disable to always fetch fresh content.',
                  weight: 50,
                },
              ],
            },
            // ── Payload CMS Tab ──────────────────────────────────────────
            {
              label: 'Payload CMS',
              key: 'payloadCmsTab',
              components: [
                {
                  type: 'textfield',
                  key: 'payloadApiUrl',
                  label: 'Payload API URL',
                  input: true,
                  placeholder: 'e.g., /api or https://cms.example.com/api',
                  description:
                    'Base URL of the Payload CMS REST API. If relative, resolved against the current origin.',
                  weight: 10,
                },
                {
                  type: 'textfield',
                  key: 'collectionSlug',
                  label: 'Collection Slug',
                  input: true,
                  placeholder: 'e.g., pages, posts, globals/site-settings',
                  description:
                    'Payload collection slug. Use "globals/{globalSlug}" for global documents.',
                  weight: 20,
                },
                {
                  type: 'textfield',
                  key: 'contentSlug',
                  label: 'Content Slug',
                  input: true,
                  placeholder: 'e.g., about-us',
                  description:
                    'If the collection uses slugs, provide the slug value here. Adds ?where[slug][equals]=value to the request.',
                  weight: 40,
                },
                {
                  type: 'textfield',
                  key: 'queryParams',
                  label: 'Query Parameters',
                  input: true,
                  placeholder: 'e.g., depth=2&locale=en',
                  description:
                    'Additional query parameters appended to the API request (without leading "?").',
                  weight: 50,
                },
                {
                  type: 'textfield',
                  key: 'responseDataPath',
                  label: 'Response Data Path',
                  input: true,
                  placeholder: 'e.g., docs.0 or doc',
                  description:
                    'Dot-notation path to resolve the target document from the API response. Leave empty if the response is the document itself.',
                  weight: 60,
                },
                {
                  type: 'textfield',
                  key: 'titleFieldPath',
                  label: 'Title Field Path',
                  input: true,
                  placeholder: 'e.g., title or meta.title',
                  description:
                    'Dot-notation path within the resolved document to extract the title.',
                  weight: 70,
                },
                {
                  type: 'textfield',
                  key: 'contentFieldPath',
                  label: 'Content Field Path',
                  input: true,
                  placeholder: 'e.g., content or htmlContent',
                  description:
                    'Dot-notation path to extract the main content. Leave empty for automatic selection: "content" (richText) or "htmlContent" (html mode).',
                  weight: 80,
                },
                {
                  type: 'select',
                  key: 'renderMode',
                  label: 'Render Mode',
                  input: true,
                  defaultValue: 'richText',
                  dataSrc: 'values',
                  data: {
                    values: [
                      { label: 'Rich Text (Lexical/Slate JSON)', value: 'richText' },
                      { label: 'HTML', value: 'html' },
                    ],
                  },
                  description:
                    'How to render the content. "Rich Text" reads from the Lexical editor field. "HTML" reads from the htmlContent field. HTML is sanitized before rendering.',
                  weight: 90,
                },
              ],
            },
            // ── API Tab ──────────────────────────────────────────────────
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
                  description: 'Unique key for this component.',
                  weight: 10,
                },
              ],
            },
            // ── Conditional Tab ──────────────────────────────────────────
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
                      description:
                        'Enter the API key of the component to check.',
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
            // ── Logic Tab ────────────────────────────────────────────────
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
                    'Write custom JavaScript. Set "show" to true/false. Available variables: show, data, row, component, instance.',
                },
                {
                  type: 'textarea',
                  key: 'customDefaultValue',
                  label: 'Custom Default Value',
                  input: true,
                  rows: 5,
                  weight: 20,
                  description:
                    'Write custom JavaScript for the default value. Set the "value" variable.',
                },
              ],
            },
          ],
        },
      ],
    }
  }
}
