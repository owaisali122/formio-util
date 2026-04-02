// ─── Types ───────────────────────────────────────────────────────────

export interface DataGridColumn {
  label: string
  key: string
  visible?: boolean
  sortable?: boolean
  groupable?: boolean
  width?: string
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

export interface DataGridSchema {
  type: string
  label: string
  key: string
  input: boolean
  tableView: boolean
  dataMode: 'client' | 'server'
  columns: DataGridColumn[]
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
  // data source
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
}

// ─── Constants ───────────────────────────────────────────────────────

export const TANSTACK_TABLE_TYPE = 'tanstackTable'

// ─── Component ───────────────────────────────────────────────────────

export class TanStackTableComponent {
  static schema(overrides?: Partial<DataGridSchema>): DataGridSchema {
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
      apiEndpoint: '',
      apiMethod: 'GET',
      dataPath: 'data',
      totalCountPath: 'total',
      pageParamName: 'page',
      pageSizeParamName: 'pageSize',
      sortFieldParamName: 'sortField',
      sortDirectionParamName: 'sortDirection',
      groupParamName: 'group',
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
      ...overrides,
    } as DataGridSchema
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
                { type: 'textfield', key: 'key', label: 'Property Name', input: true, defaultValue: 'tanstackTable', weight: 20 },
                {
                  type: 'select',
                  key: 'dataMode',
                  label: 'Data Mode',
                  input: true,
                  defaultValue: 'client',
                  data: { values: [{ label: 'Client-side', value: 'client' }, { label: 'Server-side', value: 'server' }] },
                  description: 'Client loads all data at once. Server fetches per page/sort/search.',
                  weight: 30,
                },
                { type: 'checkbox', key: 'toolbarEnabled', label: 'Show Toolbar', input: true, defaultValue: true, weight: 40 },
                { type: 'textfield', key: 'emptyStateText', label: 'Empty State Text', input: true, defaultValue: 'No data available', weight: 50 },
                { type: 'textfield', key: 'loadingText', label: 'Loading Text', input: true, defaultValue: 'Loading…', weight: 60 },
                { type: 'textfield', key: 'errorText', label: 'Error Text', input: true, defaultValue: 'Failed to load data', weight: 70 },
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
                  content: '.tanstack-col-grid input[type="text"], .tanstack-col-grid textarea { min-width: 140px; }',
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
                  content: '<small style="color:#666;">Tip: Add columns matching your API response field names. When Render is set to Icon, configure the Icon Map with JSON mapping value patterns to icon classes or {"icon":"...","text":"..."} objects. Additional options (groupable, width) can be set via the JSON schema.</small>',
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
              ],
            },
            // ── Data Source Tab ──
            {
              label: 'Data Source',
              key: 'dataSourceTab',
              components: [
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
                { type: 'textfield', key: 'dataPath', label: 'Data Path in Response', input: true, defaultValue: 'data', description: 'Dot-path to rows array in response (e.g. "data", "results.items")', weight: 30 },
                { type: 'textfield', key: 'totalCountPath', label: 'Total Count Path', input: true, defaultValue: 'total', description: 'Dot-path to total row count in response', weight: 40 },
                { type: 'textfield', key: 'pageParamName', label: 'Page Param Name', input: true, defaultValue: 'page', weight: 50 },
                { type: 'textfield', key: 'pageSizeParamName', label: 'Page Size Param Name', input: true, defaultValue: 'pageSize', weight: 60 },
                { type: 'textfield', key: 'sortFieldParamName', label: 'Sort Field Param Name', input: true, defaultValue: 'sortField', weight: 70 },
                { type: 'textfield', key: 'sortDirectionParamName', label: 'Sort Dir Param Name', input: true, defaultValue: 'sortDirection', weight: 80 },
                { type: 'textfield', key: 'groupParamName', label: 'Group Param Name', input: true, defaultValue: 'group', weight: 90 },
              ],
            },
          ],
        },
      ],
    }
  }
}
