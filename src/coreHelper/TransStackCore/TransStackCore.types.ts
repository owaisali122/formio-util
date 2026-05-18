/**
 * TransStackCore — shared types for the TanStack Table component.
 *
 * Used by both the Form.io runtime adapter (TransStackFormIO) and the
 * standalone React wrapper (ReactTranstackTable).
 */

import type React from 'react'

// ── Data Service Types ───────────────────────────────────────────────

export interface TransStackFetchParams {
  page: number
  pageSize: number
  sortField?: string
  sortDirection?: 'asc' | 'desc'
  search?: string
  group?: string
}

export interface TransStackGroupRow {
  _isGroup: true
  groupKey: string
  groupValue: string
  count: number
  children: Record<string, unknown>[]
}

export type TransStackRow = Record<string, unknown>

export interface TransStackFetchResult {
  /** Flat rows or grouped rows */
  rows: (TransStackRow | TransStackGroupRow)[]
  /** Total row count (for server-side pagination) */
  total: number
}

/** Configuration derived from the Form.io component schema */
export interface TransStackServiceConfig {
  apiEndpoint: string
  apiMethod: string
  dataPath: string
  totalCountPath: string
  pageParamName: string
  pageSizeParamName: string
  sortFieldParamName: string
  sortDirectionParamName: string
  groupParamName: string
  searchParamName: string
  // Secure API configuration (optional — used when apiType = 'secure')
  apiType?: 'custom' | 'secure'
  authType?: 'basic'
  authUsername?: string
  authPassword?: string
  partnerId?: string
}

// ── Column Configuration ─────────────────────────────────────────────

export interface TransStackColumn {
  label: string
  key: string
  visible?: boolean
  sortable?: boolean
  groupable?: boolean
  width?: string
  /** Column width as a percentage (e.g. '20' for 20%). Applied as CSS width on the column header. */
  minWidth?: string
  /** Column render type: 'text' (default), 'icon' (icon mapping) */
  renderType?: 'text' | 'icon'
  /** JSON icon mapping for renderType='icon'. */
  iconMap?: string
}

// ── Action Handlers ──────────────────────────────────────────────────

/**
 * Action handlers that the renderer app registers to handle table actions.
 * This keeps the table component generic — the consuming app decides
 * how edit, delete, navigation, and data-fetching work.
 */
export interface TanStackTableActionHandlers {
  /** Called when an 'edit' action is triggered on a row */
  onEdit?: (row: TransStackRow) => void
  /** Called when a 'delete' action is triggered on a row */
  onDelete?: (row: TransStackRow) => void
  /** Called when row click navigation is triggered (if enableRowClickNavigation is true) */
  onRowClick?: (row: TransStackRow) => void
  /** Custom data fetcher. If provided, overrides the built-in apiEndpoint-based fetch. */
  fetchData?: (params: TransStackFetchParams) => Promise<TransStackFetchResult>
}

// ── Icon Rule Types ──────────────────────────────────────────────────

/** Parsed icon rule: value pattern → icon class + optional text */
export interface IconRule {
  pattern: string
  iconClass: string
  text?: string
  type: 'exact' | 'startsWith' | 'endsWith' | 'contains' | 'wildcard'
}

// ── Component Props ──────────────────────────────────────────────────

export interface TransStackCoreProps {
  dataMode: 'client' | 'server'
  columns: TransStackColumn[]
  // pagination
  paginationEnabled: boolean
  pageSize: number
  pageSizeOptions: number[]
  pageSizeSelectorEnabled: boolean
  // sorting
  sortingEnabled: boolean
  defaultSortField: string
  defaultSortDirection: 'asc' | 'desc'
  // search
  globalSearchEnabled: boolean
  searchPlaceholder: string
  searchDebounce: number
  // grouping
  groupingEnabled: boolean
  groupingField: string
  // expansion
  expansionEnabled: boolean
  groupedRowExpansion: boolean
  detailFields: string[]
  // row navigation
  rowClickUrl: string
  enableRowClickNavigation?: boolean
  /** Called when an 'edit' action is triggered on a row */
  onEdit?: (row: TransStackRow) => void
  /** Called when a 'delete' action is triggered on a row */
  onDelete?: (row: TransStackRow) => void
  /** Called when row click navigation is triggered (if enableRowClickNavigation is true) */
  onRowClick?: (row: TransStackRow) => void
  // action column
  actionColumnEnabled: boolean
  actionColumnLabel: string
  actionColumnActions: string
  // UI text
  toolbarEnabled: boolean
  emptyStateText: string
  loadingText: string
  errorText: string
  /**
   * Data fetcher. For client mode, called once with page=0.
   * For server mode, called on every state change.
   */
  fetchData: (params: TransStackFetchParams) => Promise<TransStackFetchResult>
}

// ── Inline Styles ────────────────────────────────────────────────────

export const TRANS_STACK_STYLES = {
  wrapper: { width: '100%', fontFamily: 'inherit', fontSize: 13 } as React.CSSProperties,
  tableScroll: { width: '100%', overflowX: 'auto' as const } as React.CSSProperties,
  toolbar: { display: 'flex', gap: 8, alignItems: 'center', padding: '6px 0', flexWrap: 'wrap' as const } as React.CSSProperties,
  searchInput: { padding: '4px 8px', border: '1px solid #ccc', borderRadius: 3, fontSize: 13, minWidth: 200 } as React.CSSProperties,
  table: { width: '100%', borderCollapse: 'collapse' as const, border: '1px solid #ddd' } as React.CSSProperties,
  th: { padding: '8px 10px', background: '#f5f5f5', borderBottom: '2px solid #ddd', textAlign: 'left' as const, fontWeight: 600, fontSize: 12, cursor: 'default', userSelect: 'none' as const, whiteSpace: 'nowrap' as const, position: 'relative' as const, overflow: 'hidden' as const } as React.CSSProperties,
  thSortable: { cursor: 'pointer' } as React.CSSProperties,
  thDragging: { opacity: 0.5, background: '#e0e4ea' } as React.CSSProperties,
  thDragOver: { borderLeft: '2px solid #4a90d9' } as React.CSSProperties,
  sortIndicator: { marginLeft: 4, fontSize: 10, display: 'inline-block' } as React.CSSProperties,
  sortActive: { color: '#333' } as React.CSSProperties,
  sortInactive: { color: '#bbb' } as React.CSSProperties,
  td: { padding: '6px 10px', borderBottom: '1px solid #eee', fontSize: 13 } as React.CSSProperties,
  groupRow: { background: '#f0f4ff', fontWeight: 600 } as React.CSSProperties,
  detailRow: { background: '#fafafa' } as React.CSSProperties,
  detailCell: { padding: '10px 14px', fontSize: 12, color: '#555' } as React.CSSProperties,
  pager: { display: 'flex', gap: 8, alignItems: 'center', padding: '8px 0', fontSize: 12, flexWrap: 'wrap' as const } as React.CSSProperties,
  btn: { padding: '3px 10px', border: '1px solid #ccc', borderRadius: 3, background: '#fff', cursor: 'pointer', fontSize: 12 } as React.CSSProperties,
  btnDisabled: { opacity: 0.5, cursor: 'default' } as React.CSSProperties,
  center: { padding: 24, textAlign: 'center' as const, color: '#888', fontSize: 13 } as React.CSSProperties,
  expandBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '0 6px', fontSize: 14 } as React.CSSProperties,
  select: { padding: '3px 6px', border: '1px solid #ccc', borderRadius: 3, fontSize: 12 } as React.CSSProperties,
  clickableRow: { cursor: 'pointer' } as React.CSSProperties,
  actionBtn: { background: 'none', border: '1px solid #ccc', borderRadius: 3, cursor: 'pointer', padding: '2px 8px', fontSize: 13 } as React.CSSProperties,
  iconCell: { textAlign: 'center' as const, fontSize: 16 } as React.CSSProperties,
  resizeHandle: { position: 'absolute' as const, top: 0, right: 0, height: '100%', width: 5, cursor: 'col-resize', userSelect: 'none' as const, touchAction: 'none' as const, zIndex: 1, display: 'flex' as const, alignItems: 'stretch', justifyContent: 'center' } as React.CSSProperties,
  resizeHandleInner: { width: 2, borderRadius: 1, flexShrink: 0, transition: 'background 0.15s' } as React.CSSProperties,
} as const
