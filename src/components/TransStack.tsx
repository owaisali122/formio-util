// ─── Types ───────────────────────────────────────────────────────────

export interface TransStackColumn {
  label: string
  key: string
  visible?: boolean
  sortable?: boolean
  groupable?: boolean
  width?: string
  /** Column width as a percentage (e.g. '20' for 20%). Applied as CSS width on the column header, overriding the default TanStack pixel width. */
  minWidth?: string
  /** Column render type: 'text' (default), 'icon' (icon mapping) */
  renderType?: 'text' | 'icon'
  /** JSON icon mapping for renderType='icon'. Keys are value patterns (case-insensitive).
   *  Supports glob patterns: "active*" (starts with), "*active" (ends with),
   *  "*active*" (contains), "active" (exact), "*" (catch-all).
   *  Values can be a string (icon class) or object {"icon":"fa fa-check","text":"Active"}.
   *  The "text" property is optional. First match wins.
   *  E.g. {"active*":{"icon":"fa fa-check","text":"Active"},"*not*":"fa fa-times","*":"fa fa-question"} */
  iconMap?: string
}

export interface TransStackSchema {
  type: string
  label: string
  key: string
  input: boolean
  tableView: boolean
  dataMode: 'client' | 'server'
  columns: TransStackColumn[]
  // pagination
  paginationEnabled: boolean
  pageSize: number
  pageSizeOptions: string
  // sorting
  sortingEnabled: boolean
  defaultSortField: string
  defaultSortDirection: 'asc' | 'desc'
  // search
  globalSearchEnabled: boolean
  searchPlaceholder: string
  searchDebounce: number
  searchParamName: string
  // grouping
  groupingEnabled: boolean
  groupingField: string
  // expansion
  expansionEnabled: boolean
  groupedRowExpansion: boolean
  detailFields: string
  // data source — API type selection
  /** API type: 'custom' for standard endpoints, 'secure' for authenticated endpoints */
  apiType: 'custom' | 'secure'
  /** @deprecated Configure via renderer-side registerTanStackTableHandlers({ fetchData }) instead */
  apiEndpoint?: string
  /** @deprecated Configure via renderer-side registerTanStackTableHandlers({ fetchData }) instead */
  apiMethod?: string
  dataPath: string
  totalCountPath: string
  pageParamName: string
  pageSizeParamName: string
  sortFieldParamName: string
  sortDirectionParamName: string
  groupParamName: string
  // secure API configuration (visible when apiType = 'secure')
  /** Authentication type for secure API */
  authType?: 'basic'
  /** Basic Auth username (stored in schema, not exposed in rendered output) */
  authUsername?: string
  /** Basic Auth password (stored in schema, not exposed in rendered output) */
  authPassword?: string
  /** partner-id header value for secure API calls */
  partnerId?: string
  // row navigation
  /** @deprecated Use enableRowClickNavigation + registered onRowClick handler instead */
  rowClickUrl?: string
  enableRowClickNavigation?: boolean
  // action column
  actionColumnEnabled: boolean
  actionColumnLabel: string
  /** JSON array of action definitions. Each: {"icon":"fa fa-edit","text":"Edit","url":"/edit/{{id}}"}
   *  "text" is optional. "url" supports {{fieldKey}} interpolation. */
  actionColumnActions: string
  // UI
  toolbarEnabled: boolean
  pageSizeSelectorEnabled: boolean
  emptyStateText: string
  loadingText: string
  errorText: string
  // cache
  enableCache: boolean
}

// ─── Constants ───────────────────────────────────────────────────────

export const TANSTACK_TABLE_TYPE = 'tanstackTable'

// ─── Component ───────────────────────────────────────────────────────

export class TanStackTableComponent {
  static schema(overrides?: Partial<TransStackSchema>): TransStackSchema {
    return {
      type: TANSTACK_TABLE_TYPE,
      label: 'TanStack Table',
      key: 'tanstackTable',
      input: false,
      tableView: false,
      // core
      dataMode: 'client',
      columns: [],
      // pagination
      paginationEnabled: true,
      pageSize: 10,
      pageSizeOptions: '5,10,25,50',
      // sorting
      sortingEnabled: true,
      defaultSortField: '',
      defaultSortDirection: 'asc',
      // search
      globalSearchEnabled: false,
      searchPlaceholder: 'Search…',
      searchDebounce: 300,
      searchParamName: 'search',
      // grouping
      groupingEnabled: false,
      groupingField: '',
      // expansion
      expansionEnabled: false,
      groupedRowExpansion: false,
      detailFields: '',
      // data source
      apiType: 'custom',
      apiEndpoint: '',
      apiMethod: 'GET',
      dataPath: 'data',
      totalCountPath: 'total',
      pageParamName: 'page',
      pageSizeParamName: 'pageSize',
      sortFieldParamName: 'sortField',
      sortDirectionParamName: 'sortDirection',
      groupParamName: 'group',
      // secure API (defaults empty — only used when apiType = 'secure')
      authType: 'basic',
      authUsername: '',
      authPassword: '',
      partnerId: '',
      // row navigation
      rowClickUrl: '',
      enableRowClickNavigation: false,
      // action column
      actionColumnEnabled: false,
      actionColumnLabel: '',
      actionColumnIcon: '✏️',
      actionColumnUrl: '',
      // UI
      toolbarEnabled: true,
      pageSizeSelectorEnabled: true,
      emptyStateText: 'No data available',
      loadingText: 'Loading…',
      errorText: 'Failed to load data',
      // cache
      enableCache: true,
      ...overrides,
    } as TransStackSchema
  }

  static get builderInfo() {
    return {
      title: 'TanStack Table',
      group: 'basic',
      icon: 'table',
      weight: 35,
      documentation: 'TanStack Table — configurable data table with client/server pagination, sorting, search, grouping, and expandable rows.',
      schema: TanStackTableComponent.schema(),
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
                { type: 'textfield', key: 'label', label: 'Label', input: true, defaultValue: 'TanStack Table', weight: 10 },
                {
                  type: 'select',
                  key: 'dataMode',
                  label: 'Data Mode',
                  input: true,
                  defaultValue: 'client',
                  data: { values: [{ label: 'Client-side', value: 'client' }, { label: 'Server-side', value: 'server' }] },
                  description: 'Client loads all data at once. Server fetches per page/sort/search.',
                  weight: 20,
                },
                { type: 'checkbox', key: 'toolbarEnabled', label: 'Show Toolbar', input: true, defaultValue: true, weight: 30 },
                { type: 'textfield', key: 'emptyStateText', label: 'Empty State Text', input: true, defaultValue: 'No data available', weight: 40 },
                { type: 'textfield', key: 'loadingText', label: 'Loading Text', input: true, defaultValue: 'Loading…', weight: 50 },
                { type: 'textfield', key: 'errorText', label: 'Error Text', input: true, defaultValue: 'Failed to load data', weight: 60 },
                {
                  type: 'checkbox',
                  key: 'autofocus',
                  label: 'Initial Focus',
                  input: true,
                  defaultValue: false,
                  weight: 70,
                  tooltip: 'When enabled, focuses the component when the page loads.',
                },
                {
                  type: 'checkbox',
                  key: 'disabled',
                  label: 'Disabled',
                  input: true,
                  defaultValue: false,
                  weight: 80,
                  tooltip: 'When enabled, this component is disabled and cannot be interacted with.',
                },
                {
                  type: 'checkbox',
                  key: 'hidden',
                  label: 'Hidden',
                  input: true,
                  defaultValue: false,
                  weight: 90,
                  tooltip: 'When enabled, this component is hidden from the form.',
                },
                {
                  type: 'checkbox',
                  key: 'enableCache',
                  label: 'Enable Cache',
                  input: true,
                  defaultValue: true,
                  weight: 95,
                  tooltip: 'When enabled, API responses are cached client-side. Cached data is shown immediately and refreshed in the background.',
                },
                // Validation
                { type: 'htmlelement', tag: 'h5', content: 'Validation', weight: 100 },
                {
                  type: 'checkbox',
                  key: 'validate.required',
                  label: 'Required',
                  input: true,
                  defaultValue: false,
                  weight: 110,
                },
                {
                  type: 'textfield',
                  key: 'validate.customMessage',
                  label: 'Custom Error Message',
                  input: true,
                  placeholder: 'Custom error message when validation fails',
                  description: 'Error message shown when validation fails.',
                  weight: 120,
                },
              ],
            },
            // ── Columns Tab ──
            {
              label: 'Columns',
              key: 'columnsTab',
              components: [
                {
                  type: 'htmlelement',
                  tag: 'style',
                  content: '.tanstack-col-grid input[type="text"], .tanstack-col-grid textarea { width: 140px; }',
                  weight: 5,
                },
                {
                  type: 'datagrid',
                  key: 'columns',
                  label: 'Table Columns',
                  input: true,
                  reorder: true,
                  addAnother: 'Add Column',
                  customClass: 'tanstack-col-grid',
                  weight: 10,
                  components: [
                    { type: 'textfield', key: 'label', label: 'Header', input: true, placeholder: 'Column label' },
                    { type: 'textfield', key: 'key', label: 'Field Key', input: true, placeholder: 'data field key' },
                    { type: 'textfield', key: 'minWidth', label: 'Width (%)', input: true, placeholder: 'e.g. 20', description: 'Column width as a percentage (e.g. enter 20 for 20%). When set, this width is applied directly to the column, overriding the default column sizing.' },
                    { type: 'checkbox', key: 'visible', label: 'Visible', input: true, defaultValue: true },
                    { type: 'checkbox', key: 'sortable', label: 'Sortable', input: true, defaultValue: true },
                    {
                      type: 'select',
                      key: 'renderType',
                      label: 'Render',
                      input: true,
                      defaultValue: 'text',
                      data: { values: [{ label: 'Text', value: 'text' }, { label: 'Icon', value: 'icon' }] },
                    },
                    {
                      type: 'textarea',
                      key: 'iconMap',
                      label: 'Icon Map (JSON)',
                      input: true,
                      rows: 3,
                      placeholder: '{"active*":{"icon":"fa fa-check","text":"Active"},"*not*":"fa fa-times","*":"fa fa-question"}',
                      description: 'JSON mapping of value patterns to icons. Values can be a string (icon class) or object {"icon":"...","text":"..."}. Text is optional. Case-insensitive. Supports: "active*" (starts with), "*active" (ends with), "*active*" (contains), "*" (catch-all). First match wins.',
                      conditional: { json: { '===': [{ var: 'row.renderType' }, 'icon'] } },
                    },
                  ],
                },
                {
                  type: 'htmlelement',
                  tag: 'div',
                  content: '<small style="color:#666;">Tip: Add columns matching your API response field names. When Render is set to Icon, configure the Icon Map with JSON mapping value patterns to icon classes or {"icon":"...","text":"..."} objects. Additional options (groupable) can be set via the JSON schema.</small>',
                  weight: 20,
                },
              ],
            },
            // ── Features Tab (Pagination + Sorting + Search) ──
            {
              label: 'Features',
              key: 'featuresTab',
              components: [
                // Pagination
                { type: 'htmlelement', tag: 'h5', content: 'Pagination', weight: 1 },
                { type: 'checkbox', key: 'paginationEnabled', label: 'Enable Pagination', input: true, defaultValue: true, weight: 10 },
                { type: 'number', key: 'pageSize', label: 'Page Size', input: true, defaultValue: 10, weight: 20 },
                { type: 'textfield', key: 'pageSizeOptions', label: 'Page Size Options', input: true, defaultValue: '5,10,25,50', description: 'Comma-separated list of page sizes', weight: 30 },
                { type: 'checkbox', key: 'pageSizeSelectorEnabled', label: 'Show Page Size Selector', input: true, defaultValue: true, weight: 40 },
                // Sorting
                { type: 'htmlelement', tag: 'h5', content: 'Sorting', weight: 49 },
                { type: 'checkbox', key: 'sortingEnabled', label: 'Enable Sorting', input: true, defaultValue: true, weight: 50 },
                { type: 'textfield', key: 'defaultSortField', label: 'Default Sort Field', input: true, description: 'Column key to sort by initially', weight: 60 },
                {
                  type: 'select',
                  key: 'defaultSortDirection',
                  label: 'Default Sort Direction',
                  input: true,
                  defaultValue: 'asc',
                  data: { values: [{ label: 'Ascending', value: 'asc' }, { label: 'Descending', value: 'desc' }] },
                  weight: 70,
                },
                // Search
                { type: 'htmlelement', tag: 'h5', content: 'Search', weight: 79 },
                { type: 'checkbox', key: 'globalSearchEnabled', label: 'Enable Global Search', input: true, defaultValue: false, weight: 80 },
                { type: 'textfield', key: 'searchPlaceholder', label: 'Search Placeholder', input: true, defaultValue: 'Search…', weight: 90 },
                { type: 'number', key: 'searchDebounce', label: 'Search Debounce (ms)', input: true, defaultValue: 300, weight: 100 },
                { type: 'textfield', key: 'searchParamName', label: 'Search Param Name', input: true, defaultValue: 'search', description: 'Query parameter name sent to server in server mode', weight: 110 },
              ],
            },
            // ── Advanced Tab (Grouping + Expansion) ──
            {
              label: 'Advanced',
              key: 'advancedTab',
              components: [
                // Grouping
                { type: 'htmlelement', tag: 'h5', content: 'Grouping', weight: 1 },
                { type: 'checkbox', key: 'groupingEnabled', label: 'Enable Grouping', input: true, defaultValue: false, weight: 10 },
                { type: 'textfield', key: 'groupingField', label: 'Grouping Field', input: true, description: 'Column key to group rows by', weight: 20 },
                // Expansion
                { type: 'htmlelement', tag: 'h5', content: 'Expansion', weight: 29 },
                { type: 'checkbox', key: 'expansionEnabled', label: 'Enable Row Expansion', input: true, defaultValue: false, weight: 30 },
                { type: 'checkbox', key: 'groupedRowExpansion', label: 'Enable Grouped Row Expansion', input: true, defaultValue: false, weight: 40 },
                {
                  type: 'textarea',
                  key: 'detailFields',
                  label: 'Detail Panel Fields',
                  input: true,
                  description: 'Comma-separated list of field keys to show in expanded detail panel (e.g. "email,phone,address")',
                  weight: 50,
                },
                // Row Navigation
                { type: 'htmlelement', tag: 'h5', content: 'Row Navigation', weight: 59 },
                { type: 'checkbox', key: 'enableRowClickNavigation', label: 'Enable Row Click Navigation', input: true, defaultValue: false, description: 'When enabled, clicking a row calls the renderer-registered navigation handler with the row data.', weight: 60 },
                // Action Column
                { type: 'htmlelement', tag: 'h5', content: 'Action Column', weight: 69 },
                { type: 'checkbox', key: 'actionColumnEnabled', label: 'Enable Action Column', input: true, defaultValue: false, weight: 70 },
                { type: 'textfield', key: 'actionColumnLabel', label: 'Action Column Header', input: true, defaultValue: '', description: 'Header text for the action column', weight: 80 },
                {
                  type: 'textarea',
                  key: 'actionColumnActions',
                  label: 'Actions (JSON)',
                  input: true,
                  rows: 5,
                  placeholder: '[{"icon":"fa fa-edit","text":"Edit","type":"edit"},{"icon":"fa fa-trash","text":"Delete","type":"delete"}]',
                  description: 'JSON array of actions. Each: {"icon":"<class>","text":"<optional>","type":"edit|delete|popup|url"}. Types "edit" and "delete" call renderer-registered handlers. Type "popup" opens a popup. Type "url" navigates to action.url with {{fieldKey}} interpolation.',
                  weight: 90,
                },
                {
                  type: 'htmlelement',
                  tag: 'div',
                  content: `<div class="card card-body bg-light mt-3">
                    <h6 class="mb-2"><i class="fa fa-info-circle"></i> Action Button JSON Reference</h6>
                    <p class="mb-1">The <strong>Actions (JSON)</strong> field above defines which action buttons appear for each row in the table. Provide a JSON array of action objects.</p>
                    <p class="mb-1"><strong>Supported action types:</strong></p>
                    <ul class="mb-2">
                      <li><code>edit</code> — Calls the renderer-registered <em>onEdit</em> handler with the row data.</li>
                      <li><code>delete</code> — Calls the renderer-registered <em>onDelete</em> handler with the row data.</li>
                      <li><code>popup</code> — Opens a popup dialog. Requires <code>popupTitle</code> and <code>popupFormSlug</code>.</li>
                      <li><code>url</code> — Navigates to a URL. Supports <code>{{fieldKey}}</code> interpolation from row data.</li>
                      <li><code>fileUpload</code> — Opens a file upload dialog for the row.</li>
                      <li><code>fileViewer</code> — Opens a file viewer/preview for the row. Requires <code>url</code> with the file path.</li>
                    </ul>
                    <hr class="my-2"/>
                    <p class="mb-1"><strong>1. Edit Button</strong></p>
                    <p class="mb-1 text-muted">Opens the registered edit handler with the full row data. The consuming app decides how to handle editing.</p>
                    <pre class="bg-white p-2 border rounded mb-2">{ "icon": "fa fa-edit", "text": "Edit", "type": "edit" }</pre>
                    <p class="mb-1"><strong>2. Delete Button</strong></p>
                    <p class="mb-1 text-muted">Opens the registered delete handler. Typically triggers a confirmation dialog in the consuming app.</p>
                    <pre class="bg-white p-2 border rounded mb-2">{ "icon": "fa fa-trash", "text": "Delete", "type": "delete" }</pre>
                    <p class="mb-1"><strong>3. Preview PDF (File Viewer)</strong></p>
                    <p class="mb-1 text-muted">Opens the built-in file viewer to preview a PDF or other supported document. Use <code>{{fieldKey}}</code> to reference a row field containing the file URL or path.</p>
                    <pre class="bg-white p-2 border rounded mb-2">{ "icon": "fa fa-file-pdf-o", "text": "Preview PDF", "type": "fileViewer", "url": "/api/files/{{documentId}}" }</pre>
                    <p class="mb-1"><strong>4. Download File</strong></p>
                    <p class="mb-1 text-muted">Triggers a file download for the row. Use <code>{{fieldKey}}</code> to reference a row field containing the download URL.</p>
                    <pre class="bg-white p-2 border rounded mb-2">{ "icon": "fa fa-download", "text": "Download", "type": "fileDownload", "url": "/api/files/{{fileId}}/download" }</pre>
                    <hr class="my-2"/>
                    <p class="mb-1"><strong>Full combined example:</strong></p>
                    <pre class="bg-white p-2 border rounded mb-0">[
  { "icon": "fa fa-edit", "text": "Edit", "type": "edit" },
  { "icon": "fa fa-trash", "text": "Delete", "type": "delete" },
  { "icon": "fa fa-file-pdf-o", "text": "Preview PDF", "type": "fileViewer", "url": "/api/files/{{documentId}}" },
  { "icon": "fa fa-download", "text": "Download", "type": "fileDownload", "url": "/api/files/{{fileId}}/download" }
]</pre>
                  </div>`,
                  weight: 100,
                },
              ],
            },
            // ── Data Source Tab ──
            {
              label: 'Data Source',
              key: 'dataSourceTab',
              components: [
                // API type dropdown — controls which fields are visible below
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

                // ── Fields common to both API types ──
                { type: 'textfield', key: 'apiEndpoint', label: 'API Endpoint', input: true, placeholder: '/api/data', description: 'URL for data fetching. Used when no renderer-side fetchData handler is registered.', weight: 10 },
                {
                  type: 'select',
                  key: 'apiMethod',
                  label: 'HTTP Method',
                  input: true,
                  defaultValue: 'GET',
                  data: { values: [{ label: 'GET', value: 'GET' }, { label: 'POST', value: 'POST' }] },
                  weight: 20,
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
                  weight: 25,
                  conditional: { json: { '===': [{ var: 'data.apiType' }, 'secure'] } },
                },
                {
                  type: 'textfield',
                  key: 'authUsername',
                  label: 'Basic Auth Username',
                  input: true,
                  placeholder: 'Enter username',
                  description: 'Username for Basic Authentication.',
                  weight: 26,
                  // Show when apiType is secure and authType is basic
                  conditional: { json: { and: [{ '===': [{ var: 'data.apiType' }, 'secure'] }, { '===': [{ var: 'data.authType' }, 'basic'] }] } },
                },
                {
                  type: 'password',
                  key: 'authPassword',
                  label: 'Basic Auth Password',
                  input: true,
                  placeholder: 'Enter password',
                  description: 'Password for Basic Authentication. Value is masked in the UI.',
                  weight: 27,
                  // Show when apiType is secure and authType is basic
                  conditional: { json: { and: [{ '===': [{ var: 'data.apiType' }, 'secure'] }, { '===': [{ var: 'data.authType' }, 'basic'] }] } },
                },
                {
                  type: 'textfield',
                  key: 'partnerId',
                  label: 'Partner ID Header',
                  input: true,
                  placeholder: 'Enter partner-id value',
                  description: 'Value for the partner-id HTTP header sent with secure API requests.',
                  weight: 28,
                  conditional: { json: { '===': [{ var: 'data.apiType' }, 'secure'] } },
                },

                // ── Response mapping fields (common to both types) ──
                { type: 'textfield', key: 'dataPath', label: 'Data Path in Response', input: true, defaultValue: 'data', description: 'Dot-path to rows array in response (e.g. "data", "results.items")', weight: 30 },
                { type: 'textfield', key: 'totalCountPath', label: 'Total Count Path', input: true, defaultValue: 'total', description: 'Dot-path to total row count in response', weight: 40 },
                { type: 'textfield', key: 'pageParamName', label: 'Page Param Name', input: true, defaultValue: 'page', weight: 50 },
                { type: 'textfield', key: 'pageSizeParamName', label: 'Page Size Param Name', input: true, defaultValue: 'pageSize', weight: 60 },
                { type: 'textfield', key: 'sortFieldParamName', label: 'Sort Field Param Name', input: true, defaultValue: 'sortField', weight: 70 },
                { type: 'textfield', key: 'sortDirectionParamName', label: 'Sort Dir Param Name', input: true, defaultValue: 'sortDirection', weight: 80 },
                { type: 'textfield', key: 'groupParamName', label: 'Group Param Name', input: true, defaultValue: 'group', weight: 90 },
              ],
            },
            // ── API Tab ──
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
                  defaultValue: 'tanstackTable',
                  description: 'Unique key used to identify this component in form data and API references.',
                  weight: 10,
                },
                // Conditional
                { type: 'htmlelement', tag: 'h5', content: 'Conditional', weight: 19 },
                {
                  type: 'panel',
                  title: 'Simple',
                  key: 'simpleConditional',
                  theme: 'default',
                  weight: 20,
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
                  weight: 30,
                  components: [
                    {
                      type: 'textarea',
                      key: 'conditional.json',
                      label: 'JSONLogic',
                      input: true,
                      rows: 5,
                      weight: 10,
                      description: 'Enter raw JSON Logic to control component visibility. Refer to jsonlogic.com for documentation.',
                    },
                  ],
                },
                // Logic
                { type: 'htmlelement', tag: 'h5', content: 'Logic', weight: 39 },
                {
                  type: 'textarea',
                  key: 'customConditional',
                  label: 'Custom Conditional',
                  input: true,
                  rows: 5,
                  weight: 40,
                  description:
                    'Write custom JavaScript. Set "show" to true/false. Available variables: show, data, row, component, instance.',
                },
                {
                  type: 'textarea',
                  key: 'customDefaultValue',
                  label: 'Custom Default Value',
                  input: true,
                  rows: 5,
                  weight: 50,
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
