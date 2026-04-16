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
  type ColumnSizingState,
} from '@tanstack/react-table'
import type { DataGridFetchParams, DataGridFetchResult, DataGridGroupRow, DataGridRow } from './DataGridService'
import type { DataGridColumn } from '../../../components/DataGrid'
import { openPopup } from '../../popup/popupStore'
import type { PopupButton, PopupConfig } from '../../popup/PopupTypes'
import { createRoot } from 'react-dom/client'
import { DocumentViewerContent, resolveFileType } from '../DocumentViewerContent'

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
  th: { padding: '8px 10px', background: '#f5f5f5', borderBottom: '2px solid #ddd', textAlign: 'left' as const, fontWeight: 600, fontSize: 12, cursor: 'default', userSelect: 'none' as const, whiteSpace: 'nowrap' as const, position: 'relative' as const, overflow: 'hidden' as const } as React.CSSProperties,
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
  /** Resize handle — 5px hit-target absolutely positioned at the right edge of each header cell.
   *  Inline styles are required: Bootstrap CSS is not guaranteed in the renderer context. */
  resizeHandle: { position: 'absolute' as const, top: 0, right: 0, height: '100%', width: 5, cursor: 'col-resize', userSelect: 'none' as const, touchAction: 'none' as const, zIndex: 1, display: 'flex' as const, alignItems: 'stretch', justifyContent: 'center' } as React.CSSProperties,
  /** Inner separator line — background is driven by hover/active state at render time */
  resizeHandleInner: { width: 2, borderRadius: 1, flexShrink: 0, transition: 'background 0.15s' } as React.CSSProperties,
} as const

// ─── Helpers ─────────────────────────────────────────────────────────

/** Interpolate {{fieldKey}} tokens in a URL template using row data */
function interpolateUrl(template: string, row: DataGridRow): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    encodeURIComponent(String(row[key] ?? '')),
  )
}

// ─── File viewer helpers (used by 'fileViewer' action type) ─────

const _FILE_EXT_MAP: Record<string, 'image' | 'pdf' | 'video' | 'audio'> = {
  jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image', svg: 'image', bmp: 'image',
  pdf: 'pdf',
  mp4: 'video', webm: 'video', ogg: 'video', ogv: 'video', mov: 'video',
  mp3: 'audio', wav: 'audio', oga: 'audio', m4a: 'audio', flac: 'audio',
}

function _getFileExt(url: string): string {
  try {
    const p = new URL(url, 'https://x').pathname
    const d = p.lastIndexOf('.')
    return d === -1 ? '' : p.slice(d + 1).toLowerCase()
  } catch {
    const d = url.lastIndexOf('.')
    return d === -1 ? '' : url.slice(d + 1).toLowerCase().split(/[?#]/)[0]
  }
}

function _escAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
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

  // Column resize state — session-only, not persisted
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({})
  const [hoveredResizeColId, setHoveredResizeColId] = useState<string | null>(null)

  // ── Debounced search ──
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchValue)
      // Return the same reference when already at page 0 so buildParams identity
      // is stable and the fetch effect does not fire a second time on mount.
      setPagination((p) => (p.pageIndex === 0 ? p : { ...p, pageIndex: 0 }))
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
  //
  // fetchData is stored in a ref so that a new function reference from the
  // parent (e.g. from FormIO re-rendering props) does NOT trigger a
  // duplicate API call.  Only genuine state changes (pagination, sorting,
  // search) should cause a re-fetch.
  const fetchDataRef = useRef(fetchData)
  fetchDataRef.current = fetchData

  useEffect(() => {
    if (dataMode === 'client' && clientDataLoaded) return

    let cancelled = false
    setLoading(true)
    setError(null)

    fetchDataRef.current(buildParams())
      .then((result) => {
        if (cancelled || !mountedRef.current) return
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
        if (cancelled || !mountedRef.current) return
        setError(err?.message || errorText)
      })
      .finally(() => {
        if (!cancelled && mountedRef.current) setLoading(false)
      })

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataMode, clientDataLoaded, dataMode === 'server' ? buildParams : null])

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
      const parsedWidth = col.width ? parseInt(col.width, 10) || undefined : undefined
      // colWidth is percentage-based — stored as a CSS string, applied as CSS width on <th> directly
      const cssColWidth = col.minWidth ? `${parseInt(col.minWidth, 10)}%` : undefined
      const colDef: ColumnDef<DataGridRow> = {
        id: col.key,
        accessorKey: col.key,
        header: col.label || col.key,
        enableSorting: sortingEnabled && col.sortable !== false,
        enableGrouping: col.groupable === true,
        // Only set TanStack pixel size when no CSS percentage width is configured
        size: cssColWidth ? undefined : parsedWidth,
        meta: { colWidth: cssColWidth },
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
        type?: 'url' | 'popup' | 'edit' | 'delete' | 'fileViewer' | 'fileDownload' | 'documentView'
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
        /**
         * File viewer configuration for type='fileViewer' actions.
         * Opens the resolved file URL inside the popup modal.
         * Supports images, PDFs, video, and audio.
         */
        fileViewer?: {
          /**
           * File URL source. Supports two modes:
           *
           * 1. **Template** (contains `{{fieldKey}}`):
           *    Values are URL-encoded and interpolated into the template.
           *    e.g. `"/api/file-preview{{link}}"` or `"https://cdn.example.com/{{id}}/file"`
           *
           * 2. **Raw field name** (no `{{}}`):
           *    Reads the field value directly from the row data.
           *    e.g. `"link"` → uses `row["link"]` as-is.
           */
          fileUrlField?: string
          /**
           * @deprecated Use `fileUrlField` with `{{fieldKey}}` template syntax instead.
           * Kept for backward compatibility.
           */
          fileUrl?: string
          /**
           * Modal title. Supports {{fieldKey}} interpolation (values are NOT encoded).
           * e.g. `"{{formName}}"`
           */
          title?: string
          /** Force file type. If omitted, auto-detected from Content-Type header. */
          fileType?: 'pdf' | 'image' | 'video' | 'audio'
        }
        /**
         * File download configuration for type='fileDownload' actions.
         * Fetches the file and initiates a browser download.
         */
        fileDownload?: {
          /**
           * File URL source. Same as fileViewer:
           * Template (`{{fieldKey}}`) → interpolated, else raw field read.
           */
          fileUrlField?: string
          /** @deprecated Use `fileUrlField`. */
          fileUrl?: string
          /**
           * Optional file name. Supports two modes:
           * - Template: `"{{formName}}"` → interpolated from row data (no encoding)
           * - Raw field name: `"formName"` → reads `row["formName"]` directly
           */
          fileNameField?: string
        }
        /**
         * Document viewer configuration for type='documentView' actions.
         * Opens the full DocumentViewerContent React component inside the popup modal.
         * Supports PDF (with toolbar, find, zoom, rotate, scroll/page mode) and images.
         * The {{fieldKey}} tokens in fileUrlField, title, and fileNameField are replaced
         * with the corresponding value from the row data.
         */
        documentView?: {
          /**
           * File URL. Template (`{{fieldKey}}`) → interpolated from row data (URL-encoded);
           * plain field name → reads `row[fieldKey]` directly.
           */
          fileUrlField?: string
          /** Modal title. Supports {{fieldKey}} interpolation (not URL-encoded). */
          title?: string
          /** File name used by the viewer's download button. Supports {{fieldKey}} interpolation. */
          fileNameField?: string
          /**
           * Force file type. When omitted, auto-detected from URL extension.
           * If the extension is unrecognised, defaults to 'pdf' (the primary use case).
           * Set explicitly to 'image' or 'other' if needed.
           */
          fileType?: 'pdf' | 'image' | 'other'
          /** Render mode: 'page' (default, one page at a time) or 'scroll' (all pages stacked). */
          viewMode?: 'page' | 'scroll'
          /** Viewer height CSS value. Defaults to '70vh'. */
          viewerHeight?: string
          /**
           * Toolbar configuration. Each key defaults to true — omit the key to keep
           * the button visible, or set it to false to hide it.
           * Omitting toolbar entirely shows all buttons.
           */
          toolbar?: {
            /** Toggle page thumbnails sidebar. Default: true */
            thumbnail?: boolean
            /** Find/search bar toggle button. Default: true */
            search?: boolean
            /** Page navigation (prev/next/page input). Default: true */
            navigation?: boolean
            /** Zoom controls (in/out/select). Default: true */
            zoomControls?: boolean
            /** Rotate CW/CCW buttons. Default: true */
            rotateButtons?: boolean
            /** Print button. Default: true */
            printButton?: boolean
            /** Download button. Default: true */
            download?: boolean
          }
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
                  } else if (action.type === 'fileViewer' && action.fileViewer) {
                    const fv = action.fileViewer
                    // Resolve file URL: template (has {{}}) → interpolate (no encoding), else raw field read
                    let resolvedUrl = ''
                    if (fv.fileUrlField) {
                      resolvedUrl = fv.fileUrlField.includes('{{')
                        ? fv.fileUrlField.replace(/\{\{(\w+)\}\}/g, (_, k) => String(row.original[k] ?? ''))
                        : String(row.original[fv.fileUrlField] ?? '')
                    } else if (fv.fileUrl) {
                      resolvedUrl = interpolateUrl(fv.fileUrl, row.original)
                    }
                    if (!resolvedUrl) return

                    // Interpolate title without URL encoding
                    const resolvedTitle = fv.title
                      ? fv.title.replace(/\{\{(\w+)\}\}/g, (_, k) => String(row.original[k] ?? ''))
                      : (action.text || 'Document Preview')

                    const extCat = _FILE_EXT_MAP[_getFileExt(resolvedUrl)]
                    const detectedCat = (fv.fileType as 'image' | 'pdf' | 'video' | 'audio' | undefined) || extCat || 'unknown'

                    let bodyHtml: string
                    if (detectedCat === 'pdf') {
                      bodyHtml = `<iframe src="${_escAttr(resolvedUrl)}" style="width:100%;height:70vh;border:none;" title="PDF Preview"></iframe>`
                    } else if (detectedCat === 'image') {
                      bodyHtml = `<div class="text-center"><img src="${_escAttr(resolvedUrl)}" alt="Preview" class="d-block mx-auto" style="max-width:100%;height:auto;" /></div>`
                    } else if (detectedCat === 'video') {
                      bodyHtml = `<video controls class="d-block mx-auto" style="max-width:100%;height:auto;" preload="metadata"><source src="${_escAttr(resolvedUrl)}" />Your browser does not support video playback.</video>`
                    } else if (detectedCat === 'audio') {
                      bodyHtml = `<div class="p-3"><audio controls style="width:100%;" preload="metadata"><source src="${_escAttr(resolvedUrl)}" /></audio></div>`
                    } else {
                      bodyHtml = `<div class="p-4 text-center text-muted"><i class="fa fa-file-o" style="font-size:36px;"></i><p class="mt-2">Preview not available for this file type.</p><a href="${_escAttr(resolvedUrl)}" target="_blank" rel="noopener noreferrer" class="small"><i class="fa fa-external-link"></i> Open in new tab</a></div>`
                    }

                    openPopup({
                      title: resolvedTitle,
                      icon: action.icon || 'fa fa-file-text-o',
                      variant: 'custom',
                      size: 'lg',
                      htmlContent: bodyHtml,
                      buttons: [{ label: 'Close', actionKey: 'close', variant: 'secondary', closeOnClick: true }],
                      showCloseIcon: true,
                      closeOnBackdrop: true,
                      closeOnEscape: true,
                    } as PopupConfig, { ...row.original })
                  } else if (action.type === 'fileDownload' && action.fileDownload) {
                    const fd = action.fileDownload
                    let dlUrl = ''
                    if (fd.fileUrlField) {
                      dlUrl = fd.fileUrlField.includes('{{')
                        ? fd.fileUrlField.replace(/\{\{(\w+)\}\}/g, (_, k) => String(row.original[k] ?? ''))
                        : String(row.original[fd.fileUrlField] ?? '')
                    } else if (fd.fileUrl) {
                      dlUrl = interpolateUrl(fd.fileUrl, row.original)
                    }
                    if (!dlUrl) return

                    const dlFileName = fd.fileNameField
                      ? fd.fileNameField.includes('{{')
                        ? fd.fileNameField.replace(/\{\{(\w+)\}\}/g, (_, k) => String(row.original[k] ?? ''))
                        : String(row.original[fd.fileNameField] ?? '')
                      : ''
                    const fallbackName = (() => {
                      try { const p = new URL(dlUrl, window.location.origin).pathname.split('/'); return p[p.length - 1] || 'download' } catch { return 'download' }
                    })()

                    // Visual feedback on the button
                    const btnEl = e.currentTarget as HTMLElement
                    btnEl.style.opacity = '0.4'

                    fetch(dlUrl, { credentials: 'include' })
                      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.blob() })
                      .then(blob => {
                        const blobUrl = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = blobUrl
                        a.download = dlFileName || fallbackName
                        a.style.display = 'none'
                        document.body.appendChild(a)
                        a.click()
                        setTimeout(() => { URL.revokeObjectURL(blobUrl); a.remove() }, 200)
                      })
                      .catch(() => { window.open(dlUrl, '_blank', 'noopener,noreferrer') })
                      .finally(() => { btnEl.style.opacity = '1' })
                  } else if (action.type === 'documentView' && action.documentView) {
                    const dv = action.documentView
                    // Resolve file URL — no encoding: link field is often a full path like
                    // "/api/download/abc123" where encodeURIComponent would break the slashes.
                    let dvUrl = ''
                    if (dv.fileUrlField) {
                      dvUrl = dv.fileUrlField.includes('{{')
                        ? dv.fileUrlField.replace(/\{\{(\w+)\}\}/g, (_, k) => String(row.original[k] ?? ''))
                        : String(row.original[dv.fileUrlField] ?? '')
                    }
                    if (!dvUrl) return

                    // Resolve title and fileName (no encoding)
                    const dvTitle = dv.title
                      ? dv.title.replace(/\{\{(\w+)\}\}/g, (_, k) => String(row.original[k] ?? ''))
                      : (action.text || 'Document Preview')
                    const dvFileName = dv.fileNameField
                      ? dv.fileNameField.includes('{{')
                        ? dv.fileNameField.replace(/\{\{(\w+)\}\}/g, (_, k) => String(row.original[k] ?? ''))
                        : String(row.original[dv.fileNameField] ?? '')
                      : undefined

                    const dvHeight = dv.viewerHeight || '70vh'

                    // Resolve toolbar visibility — each key defaults to true when omitted.
                    const tb = dv.toolbar ?? {}
                    const tbSidebar  = tb.thumbnail !== false
                    const tbFind     = tb.search !== false
                    const tbNav      = tb.navigation !== false
                    const tbZoom     = tb.zoomControls !== false
                    const tbRotate   = tb.rotateButtons !== false
                    const tbPrint    = tb.printButton !== false
                    const tbDownload = tb.download !== false

                    let dvRoot: ReturnType<typeof createRoot> | null = null

                    // Open popup IMMEDIATELY — no HEAD request; avoids double network fetch.
                    // File type: explicit config > URL extension > default 'pdf' (primary use case).
                    const dvFileType: 'pdf' | 'image' | 'text' | 'other' = dv.fileType
                      ?? (() => { const t = resolveFileType('auto', dvFileName, dvUrl); return t === 'other' ? 'pdf' : t })()

                    openPopup({
                      title: dvTitle,
                      icon: action.icon || 'fa fa-file-text-o',
                      variant: 'custom',
                      size: 'lg',
                      htmlContent: '<div></div>',
                      buttons: [],
                      showCloseIcon: true,
                      closeOnBackdrop: false,
                      closeOnEscape: true,
                      onMount: (bodyEl: HTMLElement) => {
                        const container = document.createElement('div')
                        bodyEl.appendChild(container)
                        dvRoot = createRoot(container)
                        dvRoot.render(
                          React.createElement(DocumentViewerContent, {
                            url: dvUrl,
                            fileType: dvFileType,
                            fileName: dvFileName,
                            viewerHeight: dvHeight,
                            maxWidth: '100%',
                            fallbackText: 'Preview not available for this file type.',
                            viewMode: dv.viewMode ?? 'page',
                            showToolbarSidebar: tbSidebar,
                            showToolbarFind: tbFind,
                            showToolbarNavigation: tbNav,
                            showToolbarZoom: tbZoom,
                            showToolbarRotate: tbRotate,
                            showToolbarPrint: tbPrint,
                            showToolbarDownload: tbDownload,
                          })
                        )
                      },
                      onClose: () => {
                        setTimeout(() => { try { dvRoot?.unmount() } catch (_) {} }, 0)
                      },
                    } as PopupConfig, { ...row.original })
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
    // Column resizing — real-time width update while dragging
    columnResizeMode: 'onChange',
    defaultColumn: { minSize: 50 },
    state: {
      pagination,
      sorting,
      expanded,
      columnOrder,
      columnSizing,
      grouping: !isGroupedResponse ? grouping : [],
      // Client-side global filter — ignored in server mode
      ...(globalSearchEnabled && dataMode === 'client' ? { globalFilter: debouncedSearch } : {}),
    },
    onColumnOrderChange: setColumnOrder,
    onColumnSizingChange: setColumnSizing,
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
        <table style={{ ...S.table, tableLayout: 'fixed', width: '100%' }}>
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
                        // Column width: use configured CSS % width when set, otherwise TanStack's computed px size
                        width: (header.column.columnDef.meta as { colWidth?: string } | undefined)?.colWidth
                          ?? header.getSize(),
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
                          {sortDir === 'asc' ? ' ▲' : sortDir === 'desc' ? ' ▼' :  '▼▲'}
                        </span>
                      )}
                      {/* Column resize handle — drag left/right to adjust column width */}
                      <div
                        style={S.resizeHandle}
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        onClick={(e) => e.stopPropagation()}
                        onMouseEnter={() => setHoveredResizeColId(colId)}
                        onMouseLeave={() => setHoveredResizeColId(null)}
                        draggable={false}
                      >
                        {/* Separator line — background is a dynamic runtime value (hover/active state) */}
                        <div
                          style={{
                            ...S.resizeHandleInner,
                            background: header.column.getIsResizing()
                              ? '#4a90d9'
                              : hoveredResizeColId === colId
                                ? '#aab4c8'
                                : 'transparent',
                          }}
                        />
                      </div>
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
