import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getGroupedRowModel,
  getExpandedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ExpandedState,
  type GroupingState,
  type PaginationState,
  type ColumnOrderState,
} from '@tanstack/react-table'
import type { DataGridFetchParams, DataGridFetchResult, DataGridGroupRow, DataGridRow } from './DataGridService'
import type { DataGridColumn } from '../../../components/DataGrid'
import { openPopup } from '../../popup/popupStore'
import type { PopupButton, PopupConfig } from '../../popup/PopupTypes'

// ─── Props ───────────────────────────────────────────────────────────

export interface DataGridReactProps {
  dataMode: 'client' | 'server'
  columns: DataGridColumn[]
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
  onEdit?: (row: DataGridRow) => void
  /** Called when a 'delete' action is triggered on a row */
  onDelete?: (row: DataGridRow) => void
  /** Called when row click navigation is triggered (if enableRowClickNavigation is true) */
  onRowClick?: (row: DataGridRow) => void
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
  fetchData: (params: DataGridFetchParams) => Promise<DataGridFetchResult>
}

// ─── Styles (inline to avoid external CSS dep in shared package) ─────

const S = {
  wrapper: { width: '100%', fontFamily: 'inherit', fontSize: 13 } as React.CSSProperties,
  tableScroll: { width: '100%', overflowX: 'auto' as const } as React.CSSProperties,
  toolbar: { display: 'flex', gap: 8, alignItems: 'center', padding: '6px 0', flexWrap: 'wrap' as const } as React.CSSProperties,
  searchInput: { padding: '4px 8px', border: '1px solid #ccc', borderRadius: 3, fontSize: 13, minWidth: 200 } as React.CSSProperties,
  table: { width: '100%', borderCollapse: 'collapse' as const, border: '1px solid #ddd' } as React.CSSProperties,
  th: { padding: '8px 10px', background: '#f5f5f5', borderBottom: '2px solid #ddd', textAlign: 'left' as const, fontWeight: 600, fontSize: 12, cursor: 'default', userSelect: 'none' as const, whiteSpace: 'nowrap' as const } as React.CSSProperties,
  thSortable: { cursor: 'pointer' } as React.CSSProperties,
  /** Drag-and-drop: visual cue when a column header is being dragged */
  thDragging: { opacity: 0.5, background: '#e0e4ea' } as React.CSSProperties,
  thDragOver: { borderLeft: '2px solid #4a90d9' } as React.CSSProperties,
  /** Sort indicator styles */
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
} as const

// ─── Helpers ─────────────────────────────────────────────────────────

/** Interpolate {{fieldKey}} tokens in a URL template using row data */
function interpolateUrl(template: string, row: DataGridRow): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    encodeURIComponent(String(row[key] ?? '')),
  )
}

/** Parsed icon rule: value pattern → icon class + optional text */
interface IconRule {
  pattern: string
  iconClass: string
  text?: string
  type: 'exact' | 'startsWith' | 'endsWith' | 'contains' | 'wildcard'
}

/** Parse icon map JSON into ordered rules. Keys support glob patterns:
 *  - "active"   → exact match (case-insensitive)
 *  - "active*"  → starts with
 *  - "*active"  → ends with
 *  - "*active*" → contains
 *  - "*"        → catch-all wildcard
 */
function parseIconRules(raw?: string): IconRule[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    const rules: IconRule[] = []
    for (const [k, v] of Object.entries(parsed)) {
      const key = k.toLowerCase()
      let iconClass: string
      let text: string | undefined
      if (typeof v === 'object' && v !== null) {
        const obj = v as Record<string, unknown>
        iconClass = String(obj.icon ?? '')
        text = obj.text != null ? String(obj.text) : undefined
      } else {
        iconClass = String(v)
      }
      if (key === '*') {
        rules.push({ pattern: '*', iconClass, text, type: 'wildcard' })
      } else if (key.startsWith('*') && key.endsWith('*') && key.length > 2) {
        rules.push({ pattern: key.slice(1, -1), iconClass, text, type: 'contains' })
      } else if (key.endsWith('*')) {
        rules.push({ pattern: key.slice(0, -1), iconClass, text, type: 'startsWith' })
      } else if (key.startsWith('*')) {
        rules.push({ pattern: key.slice(1), iconClass, text, type: 'endsWith' })
      } else {
        rules.push({ pattern: key, iconClass, text, type: 'exact' })
      }
    }
    return rules
  } catch { return [] }
}

/** Resolve an icon rule using ordered rules. First match wins. Returns null if no match. */
function resolveIconRule(rules: IconRule[], rawValue: string): IconRule | null {
  const lower = rawValue.toLowerCase()
  for (const rule of rules) {
    switch (rule.type) {
      case 'exact':      if (lower === rule.pattern) return rule; break
      case 'startsWith': if (lower.startsWith(rule.pattern)) return rule; break
      case 'endsWith':   if (lower.endsWith(rule.pattern)) return rule; break
      case 'contains':   if (lower.includes(rule.pattern)) return rule; break
      case 'wildcard':   return rule
    }
  }
  return null
}

// ─── Component ───────────────────────────────────────────────────────

export function DataGridReact(props: DataGridReactProps) {
  const {
    dataMode, columns: colDefs, paginationEnabled, pageSize: initialPageSize,
    pageSizeOptions, pageSizeSelectorEnabled,
    sortingEnabled, defaultSortField, defaultSortDirection,
    globalSearchEnabled, searchPlaceholder, searchDebounce,
    groupingEnabled, groupingField,
    expansionEnabled, groupedRowExpansion, detailFields,
    rowClickUrl,
    enableRowClickNavigation, onEdit, onDelete, onRowClick,
    actionColumnEnabled, actionColumnLabel, actionColumnActions,
    toolbarEnabled, emptyStateText, loadingText, errorText,
    fetchData,
  } = props

  // ── Local state ──
  const [data, setData] = useState<DataGridRow[]>([])
  const [groupedData, setGroupedData] = useState<DataGridGroupRow[]>([])
  const [totalRows, setTotalRows] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchValue, setSearchValue] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const mountedRef = useRef(true)
  // client-side: all data loaded flag
  const [clientDataLoaded, setClientDataLoaded] = useState(false)

  // TanStack state
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: initialPageSize })
  const [sorting, setSorting] = useState<SortingState>(
    defaultSortField ? [{ id: defaultSortField, desc: defaultSortDirection === 'desc' }] : [],
  )
  const [expanded, setExpanded] = useState<ExpandedState>({})
  const [grouping, setGrouping] = useState<GroupingState>(
    groupingEnabled && groupingField ? [groupingField] : [],
  )

  // Column reorder state — drag-and-drop reordering is UI-only, not persisted
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([])
  const dragColumnRef = useRef<string | null>(null)
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null)

  // ── Debounced search ──
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchValue)
      setPagination((p) => ({ ...p, pageIndex: 0 }))
    }, searchDebounce)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchValue, searchDebounce])

  // ── Cleanup ──
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // ── Build fetch params ──
  const buildParams = useCallback((): DataGridFetchParams => {
    const s = sorting[0]
    return {
      page: pagination.pageIndex,
      pageSize: pagination.pageSize,
      sortField: s?.id,
      sortDirection: s ? (s.desc ? 'desc' : 'asc') : undefined,
      search: debouncedSearch || undefined,
      group: groupingEnabled && groupingField ? groupingField : undefined,
    }
  }, [pagination, sorting, debouncedSearch, groupingEnabled, groupingField])

  // ── Data fetching ──
  // Server mode: re-fetch whenever params change (pagination, sorting, search).
  // Client mode: fetch once, TanStack handles the rest locally.
  const fetchVersion = useRef(0)
  useEffect(() => {
    if (dataMode === 'client' && clientDataLoaded) return

    const version = ++fetchVersion.current
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchData(buildParams())
      .then((result) => {
        if (cancelled || !mountedRef.current || version !== fetchVersion.current) return
        const hasGroups = result.rows.length > 0 && (result.rows[0] as DataGridGroupRow)?._isGroup
        if (hasGroups) {
          setGroupedData(result.rows as DataGridGroupRow[])
          setData([])
        } else {
          setData(result.rows as DataGridRow[])
          setGroupedData([])
        }
        setTotalRows(result.total)
        if (dataMode === 'client') setClientDataLoaded(true)
      })
      .catch((err) => {
        if (cancelled || !mountedRef.current || version !== fetchVersion.current) return
        setError(err?.message || errorText)
      })
      .finally(() => {
        if (!cancelled && mountedRef.current && version === fetchVersion.current) setLoading(false)
      })

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataMode, fetchData, dataMode === 'server' ? buildParams : null])

  // ── Column definitions for TanStack ──
  const tanCols = useMemo<ColumnDef<DataGridRow>[]>(() => {
    const result: ColumnDef<DataGridRow>[] = []

    // Expansion toggle column
    if (expansionEnabled) {
      result.push({
        id: '__expand',
        header: '',
        size: 36,
        cell: ({ row }) => {
          if (!row.getCanExpand()) return null
          return (
            <button style={S.expandBtn} onClick={row.getToggleExpandedHandler()}>
              {row.getIsExpanded() ? '▼' : '▶'}
            </button>
          )
        },
      })
    }

    for (const col of colDefs) {
      if (col.visible === false) continue
      const renderType = col.renderType || 'text'
      const colDef: ColumnDef<DataGridRow> = {
        id: col.key,
        accessorKey: col.key,
        header: col.label || col.key,
        enableSorting: sortingEnabled && col.sortable !== false,
        enableGrouping: col.groupable === true,
        size: col.width ? parseInt(col.width, 10) || undefined : undefined,
      }

      if (renderType === 'icon') {
        const rules = parseIconRules(col.iconMap)
        colDef.cell = ({ getValue }) => {
          const raw = String(getValue() ?? '')
          const matched = resolveIconRule(rules, raw)
          if (matched) {
            return (
              <span style={S.iconCell} title={raw}>
                <i className={matched.iconClass} />{matched.text && <span style={{ marginLeft: 4, fontSize: 13 }}>{matched.text}</span>}
              </span>
            )
          }
          return <span style={S.iconCell}>{raw}</span>
        }
      }

      result.push(colDef)
    }

    // Action column (appended at the end)
    if (actionColumnEnabled) {
      let actions: {
        icon?: string
        text?: string
        /** Navigation URL — supports {{fieldKey}} interpolation. Used when type is 'url' (default). */
        url?: string
        /**
         * Action type. Defaults to 'url'.
         * - 'url'   : navigate to action.url (existing behaviour)
         * - 'popup' : open the generic popup with action.popup config and row data as payload
         */
        type?: 'url' | 'popup' | 'edit' | 'delete'
        /** Popup configuration for type='popup' actions */
        popup?: {
          title?: string
          message?: string
          variant?: string
          size?: string
          icon?: string
          /** JSON array of PopupButton definitions */
          buttons?: string
          showCloseIcon?: boolean
          closeOnBackdrop?: boolean
          closeOnEscape?: boolean
          /**
           * Handler type for the popup confirm action.
           * - 'delete' : calls the renderer-registered onDelete handler
           * - 'edit'   : calls the renderer-registered onEdit handler
           * - omitted  : falls back to apiEndpoint fetch (legacy)
           */
          type?: 'delete' | 'edit'
          /** @deprecated Use popup.type='delete' with registered handler instead. */
          apiEndpoint?: string
          /** @deprecated Use popup.type with registered handler instead. */
          apiMethod?: string
        }
      }[] = []
      try { actions = JSON.parse(actionColumnActions || '[]') } catch { /* invalid JSON */ }
      if (!Array.isArray(actions)) actions = []

      result.push({
        id: '__action',
        header: actionColumnLabel || '',
        size: actions.length > 1 ? actions.length * 40 : 60,
        enableSorting: false,
        cell: ({ row }) => (
          <span style={{ display: 'flex', gap: 4 }}>
            {actions.map((action, i) => (
              <button
                key={i}
                style={S.actionBtn}
                title={action.text || ''}
                onClick={(e) => {
                  e.stopPropagation()
                  if (action.type === 'edit') {
                    if (onEdit) onEdit(row.original)
                  } else if (action.type === 'delete') {
                    if (onDelete) onDelete(row.original)
                  } else if (action.type === 'popup' && action.popup) {
                    // Build popup config from action definition
                    let buttons: PopupButton[] | undefined
                    if (action.popup.buttons) {
                      try {
                        const parsed = JSON.parse(action.popup.buttons)
                        if (Array.isArray(parsed) && parsed.length > 0) buttons = parsed
                      } catch { /* fall back to variant defaults */ }
                    }
                    const config: PopupConfig = {
                      title: action.popup.title,
                      message: action.popup.message,
                      variant: (action.popup.variant as PopupConfig['variant']) ?? 'confirm',
                      size: (action.popup.size as PopupConfig['size']) ?? 'md',
                      icon: action.popup.icon,
                      buttons,
                      showCloseIcon: action.popup.showCloseIcon !== false,
                      closeOnBackdrop: action.popup.closeOnBackdrop === true,
                      closeOnEscape: action.popup.closeOnEscape !== false,
                      onAction: (actionKey) => {
                        // Only act on the confirming action (not cancel)
                        if (actionKey === 'cancel') return
                        const popupType = action.popup?.type
                        if (popupType === 'delete') {
                          if (onDelete) onDelete(row.original)
                        } else if (popupType === 'edit') {
                          if (onEdit) onEdit(row.original)
                        } else {
                          // Legacy: direct API call via apiEndpoint
                          const endpoint = action.popup?.apiEndpoint
                          if (!endpoint) return
                          const method = (action.popup?.apiMethod || 'DELETE').toUpperCase()
                          const resolvedUrl = interpolateUrl(endpoint, row.original)
                          fetch(resolvedUrl, { method }).catch(() => {})
                        }
                      },
                    }
                    // Pass the full row data as popup payload so onAction handlers have context
                    openPopup(config, { ...row.original })
                  } else if (action.url) {
                    window.location.href = interpolateUrl(action.url, row.original)
                  }
                }}
              >
                {action.icon && <i className={action.icon} />}
                {action.text && <span style={action.icon ? { marginLeft: 4 } : undefined}>{action.text}</span>}
              </button>
            ))}
          </span>
        ),
      })
    }

    return result
  }, [colDefs, sortingEnabled, expansionEnabled, actionColumnEnabled, actionColumnLabel, actionColumnActions])

  // Initialize column order from column definitions (reset on column config changes)
  useEffect(() => {
    setColumnOrder(tanCols.map((c) => c.id!).filter(Boolean))
  }, [tanCols])

  // ── Is server-side grouped response? ──
  const isGroupedResponse = groupedData.length > 0

  // ── TanStack table instance ──
  const table = useReactTable({
    data,
    columns: tanCols,
    state: {
      pagination,
      sorting,
      expanded,
      columnOrder,
      grouping: !isGroupedResponse ? grouping : [],
      // Client-side global filter — ignored in server mode
      ...(globalSearchEnabled && dataMode === 'client' ? { globalFilter: debouncedSearch } : {}),
    },
    onColumnOrderChange: setColumnOrder,
    // Pagination
    ...(paginationEnabled
      ? dataMode === 'client'
        ? { getPaginationRowModel: getPaginationRowModel() }
        : { manualPagination: true, pageCount: Math.ceil(totalRows / pagination.pageSize) }
      : {}),
    onPaginationChange: setPagination,
    // Sorting
    ...(sortingEnabled
      ? dataMode === 'client'
        ? { getSortedRowModel: getSortedRowModel() }
        : { manualSorting: true }
      : {}),
    onSortingChange: setSorting,
    // Client-side global search filtering
    ...(globalSearchEnabled && dataMode === 'client'
      ? { getFilteredRowModel: getFilteredRowModel(), globalFilterFn: 'includesString' }
      : {}),
    // Server-side search is handled via re-fetch (manualFiltering)
    ...(globalSearchEnabled && dataMode === 'server' ? { manualFiltering: true } : {}),
    // Grouping (client-side only via TanStack)
    ...(groupingEnabled && !isGroupedResponse ? { getGroupedRowModel: getGroupedRowModel() } : {}),
    onGroupingChange: setGrouping,
    // Expansion — sub-rows are rendered manually in a detail panel,
    // NOT via TanStack's getSubRows, because child rows typically have
    // a different shape than parent rows.
    onExpandedChange: setExpanded,
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: (row) => {
      const originalSubRows = (row.original as any).subRows
      if (Array.isArray(originalSubRows) && originalSubRows.length > 0) return true
      if (expansionEnabled && detailFields.length > 0) return true
      return false
    },
    getCoreRowModel: getCoreRowModel(),
  })

  // ── Render helpers ──

  const renderToolbar = () => {
    if (!toolbarEnabled) return null
    return (
      <div style={S.toolbar}>
        {globalSearchEnabled && (
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder={searchPlaceholder}
            style={S.searchInput}
          />
        )}
        {paginationEnabled && pageSizeSelectorEnabled && (
          <select
            value={pagination.pageSize}
            onChange={(e) => setPagination({ pageIndex: 0, pageSize: Number(e.target.value) })}
            style={S.select}
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>Show {size}</option>
            ))}
          </select>
        )}
      </div>
    )
  }

  const renderPagination = () => {
    if (!paginationEnabled) return null
    const pageCount = dataMode === 'server'
      ? Math.ceil(totalRows / pagination.pageSize)
      : table.getPageCount()
    const currentPage = pagination.pageIndex + 1

    return (
      <div style={S.pager}>
        <button style={{ ...S.btn, ...(pagination.pageIndex === 0 ? S.btnDisabled : {}) }} disabled={pagination.pageIndex === 0} onClick={() => setPagination((p) => ({ ...p, pageIndex: 0 }))}>{'«'}</button>
        <button style={{ ...S.btn, ...(pagination.pageIndex === 0 ? S.btnDisabled : {}) }} disabled={pagination.pageIndex === 0} onClick={() => setPagination((p) => ({ ...p, pageIndex: p.pageIndex - 1 }))}>{'‹'}</button>
        <span>Page {currentPage} of {pageCount || 1}</span>
        <button style={{ ...S.btn, ...(currentPage >= pageCount ? S.btnDisabled : {}) }} disabled={currentPage >= pageCount} onClick={() => setPagination((p) => ({ ...p, pageIndex: p.pageIndex + 1 }))}>{'›'}</button>
        <button style={{ ...S.btn, ...(currentPage >= pageCount ? S.btnDisabled : {}) }} disabled={currentPage >= pageCount} onClick={() => setPagination((p) => ({ ...p, pageIndex: pageCount - 1 }))}>{'»'}</button>
        <span style={{ marginLeft: 8, color: '#999' }}>
          {totalRows > 0 ? `${totalRows} total rows` : ''}
        </span>
      </div>
    )
  }

  const renderDetailPanel = (row: DataGridRow) => {
    const subRows = row.subRows as DataGridRow[] | undefined
    if (Array.isArray(subRows) && subRows.length > 0) {
      // Sub-row expansion: render a nested table
      const subFields = detailFields.length > 0
        ? detailFields
        : Object.keys(subRows[0]).filter((k) => k !== 'subRows')
      return (
        <div style={S.detailCell}>
          <table style={{ ...S.table, margin: '4px 0 4px 20px', width: 'calc(100% - 20px)' }}>
            <thead>
              <tr>
                {subFields.map((f) => (
                  <th key={f} style={{ ...S.th, fontSize: 11 }}>{f}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subRows.map((sr, i) => (
                <tr key={i}>
                  {subFields.map((f) => (
                    <td key={f} style={{ ...S.td, fontSize: 12 }}>{String(sr[f] ?? '—')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }
    // Detail field expansion: show key–value pairs from the row
    if (detailFields.length > 0) {
      return (
        <div style={S.detailCell}>
          {detailFields.map((f) => (
            <div key={f} style={{ marginBottom: 4 }}>
              <strong>{f}: </strong>{String(row[f] ?? '—')}
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  // ── Grouped response rendering (server-side groups) ──
  const renderGroupedTable = () => (
    <table style={S.table}>
      <thead>
        <tr>
          {groupedRowExpansion && <th style={{ ...S.th, width: 36 }} />}
          {tanCols.filter((c) => c.id !== '__expand').map((col) => (
            <th key={col.id} style={S.th}>{typeof col.header === 'string' ? col.header : col.id}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {groupedData.map((group) => (
          <GroupRowBlock
            key={group.groupValue}
            group={group}
            tanCols={tanCols.filter((c) => c.id !== '__expand')}
            groupedRowExpansion={groupedRowExpansion}
            expansionEnabled={expansionEnabled}
            detailFields={detailFields}
          />
        ))}
      </tbody>
    </table>
  )

  // ── Guard: no columns configured yet → avoid TanStack crash ──
  const hasDataColumns = colDefs.length > 0

  // ── Main table rendering ──
  if (!hasDataColumns) {
    return (
      <div style={S.center}>
        No columns configured. Open the component settings and add columns.
      </div>
    )
  }
  if (loading) return <div style={S.center}>{loadingText}</div>
  if (error) return <div style={{ ...S.center, color: '#c00' }}>{error}</div>
  if (data.length === 0 && groupedData.length === 0) return <div style={S.center}>{emptyStateText}</div>

  return (
    <div style={S.wrapper}>
      {renderToolbar()}
      <div style={S.tableScroll}>
      {isGroupedResponse ? renderGroupedTable() : (
        <table style={{ ...S.table, tableLayout: 'auto' }}>
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const sortDir = header.column.getIsSorted()
                  const colId = header.column.id
                  // Drag-and-drop: only data columns are draggable (not __expand / __action)
                  const isDraggable = colId !== '__expand' && colId !== '__action'
                  const isDragOver = dragOverColumnId === colId

                  return (
                    <th
                      key={header.id}
                      style={{
                        ...S.th,
                        ...(canSort ? S.thSortable : {}),
                        // Auto-width: let browser determine from content, use explicit size only as hint
                        ...(header.column.getSize() ? { minWidth: header.column.getSize() } : {}),
                        ...(isDragOver ? S.thDragOver : {}),
                        ...(dragColumnRef.current === colId ? S.thDragging : {}),
                      }}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      // Drag-and-drop column reordering handlers
                      draggable={isDraggable}
                      onDragStart={isDraggable ? (e) => {
                        dragColumnRef.current = colId
                        e.dataTransfer.effectAllowed = 'move'
                      } : undefined}
                      onDragOver={isDraggable ? (e) => {
                        e.preventDefault()
                        e.dataTransfer.dropEffect = 'move'
                        if (dragOverColumnId !== colId) setDragOverColumnId(colId)
                      } : undefined}
                      onDragLeave={isDraggable ? () => {
                        if (dragOverColumnId === colId) setDragOverColumnId(null)
                      } : undefined}
                      onDrop={isDraggable ? (e) => {
                        e.preventDefault()
                        setDragOverColumnId(null)
                        const dragId = dragColumnRef.current
                        if (!dragId || dragId === colId) return
                        // Reorder columns — swap dragged column to drop target position
                        setColumnOrder((prev) => {
                          const order = [...prev]
                          const fromIdx = order.indexOf(dragId)
                          const toIdx = order.indexOf(colId)
                          if (fromIdx === -1 || toIdx === -1) return prev
                          order.splice(fromIdx, 1)
                          order.splice(toIdx, 0, dragId)
                          return order
                        })
                      } : undefined}
                      onDragEnd={() => {
                        dragColumnRef.current = null
                        setDragOverColumnId(null)
                      }}
                    >
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      {/* Sort indicator: visible on all sortable columns */}
                      {canSort && (
                        <span style={{ ...S.sortIndicator, ...(sortDir ? S.sortActive : S.sortInactive) }}>
                          {sortDir === 'asc' ? ' ▲' : sortDir === 'desc' ? ' ▼' : ' ⇅'}
                        </span>
                      )}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => {
              const isGroupRow = row.getIsGrouped()
              const hasRowNav = !isGroupRow && (enableRowClickNavigation ? !!onRowClick : !!rowClickUrl)
              return (
                <React.Fragment key={row.id}>
                  <tr
                    style={{ ...(isGroupRow ? S.groupRow : undefined), ...(hasRowNav ? S.clickableRow : undefined) }}
                    onClick={hasRowNav ? () => {
                      if (enableRowClickNavigation && onRowClick) {
                        onRowClick(row.original)
                      } else if (rowClickUrl) {
                        window.location.href = interpolateUrl(rowClickUrl, row.original)
                      }
                    } : undefined}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} style={S.td}>
                        {cell.getIsGrouped() ? (
                          <button style={S.expandBtn} onClick={row.getToggleExpandedHandler()}>
                            {row.getIsExpanded() ? '▼' : '▶'}{' '}
                            {flexRender(cell.column.columnDef.cell, cell.getContext())} ({row.subRows.length})
                          </button>
                        ) : cell.getIsAggregated() ? null : (
                          flexRender(cell.column.columnDef.cell, cell.getContext())
                        )}
                      </td>
                    ))}
                  </tr>
                  {/* Detail / sub-row panel for expanded non-group rows */}
                  {!isGroupRow && row.getIsExpanded() && expansionEnabled && (
                    <tr style={S.detailRow}>
                      <td colSpan={row.getVisibleCells().length}>
                        {renderDetailPanel(row.original)}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      )}
      </div>
      {renderPagination()}
    </div>
  )
}

// ─── Server-side group row block (for grouped response) ──────────────

function GroupRowBlock(props: {
  group: DataGridGroupRow
  tanCols: ColumnDef<DataGridRow>[]
  groupedRowExpansion: boolean
  expansionEnabled: boolean
  detailFields: string[]
}) {
  const { group, tanCols, groupedRowExpansion, expansionEnabled, detailFields } = props
  const [open, setOpen] = useState(false)

  return (
    <>
      <tr style={S.groupRow}>
        {groupedRowExpansion && (
          <td style={S.td}>
            <button style={S.expandBtn} onClick={() => setOpen(!open)}>
              {open ? '▼' : '▶'}
            </button>
          </td>
        )}
        <td colSpan={tanCols.length} style={S.td}>
          <strong>{group.groupValue}</strong> ({group.count} items)
        </td>
      </tr>
      {open && group.children.map((child, idx) => (
        <ChildRow key={idx} row={child} tanCols={tanCols} groupedRowExpansion={groupedRowExpansion} expansionEnabled={expansionEnabled} detailFields={detailFields} />
      ))}
    </>
  )
}

function ChildRow(props: {
  row: Record<string, unknown>
  tanCols: ColumnDef<DataGridRow>[]
  groupedRowExpansion: boolean
  expansionEnabled: boolean
  detailFields: string[]
}) {
  const { row, tanCols, groupedRowExpansion, expansionEnabled, detailFields } = props
  const [open, setOpen] = useState(false)

  return (
    <>
      <tr>
        {groupedRowExpansion && (
          <td style={S.td}>
            {expansionEnabled && detailFields.length > 0 && (
              <button style={S.expandBtn} onClick={() => setOpen(!open)}>{open ? '▼' : '▶'}</button>
            )}
          </td>
        )}
        {tanCols.map((col) => {
          const key = (col as any).accessorKey || col.id || ''
          return <td key={key} style={S.td}>{String(row[key] ?? '')}</td>
        })}
      </tr>
      {open && (
        <tr style={S.detailRow}>
          <td colSpan={tanCols.length + (groupedRowExpansion ? 1 : 0)} style={S.detailCell}>
            {detailFields.map((f) => (
              <div key={f} style={{ marginBottom: 4 }}>
                <strong>{f}: </strong>{String(row[f] ?? '—')}
              </div>
            ))}
          </td>
        </tr>
      )}
    </>
  )
}
