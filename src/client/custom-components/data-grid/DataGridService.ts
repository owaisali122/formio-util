// ─── Data Service Abstraction ─────────────────────────────────────────
// UI layer uses this interface. Swap the implementation to connect to a
// real backend — the table component never needs to change.

export interface DataGridFetchParams {
  page: number
  pageSize: number
  sortField?: string
  sortDirection?: 'asc' | 'desc'
  search?: string
  group?: string
}

export interface DataGridGroupRow {
  _isGroup: true
  groupKey: string
  groupValue: string
  count: number
  children: Record<string, unknown>[]
}

export type DataGridRow = Record<string, unknown>

export interface DataGridFetchResult {
  /** Flat rows or grouped rows */
  rows: (DataGridRow | DataGridGroupRow)[]
  /** Total row count (for server-side pagination) */
  total: number
}

/**
 * Resolve a dot-path like "data.items" on an object.
 */
export function resolvePath(obj: unknown, path: string): unknown {
  if (!path) return obj
  return path.split('.').reduce<unknown>((o, key) => {
    if (o && typeof o === 'object' && key in (o as Record<string, unknown>)) {
      return (o as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
}

/** Configuration derived from the Form.io component schema */
export interface DataGridServiceConfig {
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
}

/**
 * Generic fetch function for server-side mode.
 * Builds query params from the component schema config and normalises the response.
 */
export async function fetchServerData(
  config: DataGridServiceConfig,
  params: DataGridFetchParams,
): Promise<DataGridFetchResult> {
  const url = new URL(config.apiEndpoint, window.location.origin)

  url.searchParams.set(config.pageParamName, String(params.page))
  url.searchParams.set(config.pageSizeParamName, String(params.pageSize))

  if (params.sortField) {
    url.searchParams.set(config.sortFieldParamName, params.sortField)
    url.searchParams.set(config.sortDirectionParamName, params.sortDirection || 'asc')
  }
  if (params.search) {
    url.searchParams.set(config.searchParamName, params.search)
  }
  if (params.group) {
    url.searchParams.set(config.groupParamName, params.group)
  }

  const res = await fetch(url.toString(), { method: config.apiMethod })
  if (!res.ok) throw new Error(`Data fetch failed: ${res.status}`)

  const json = await res.json()
  const rows = (resolvePath(json, config.dataPath) as DataGridRow[]) || []
  const total = (resolvePath(json, config.totalCountPath) as number) || rows.length

  return { rows, total }
}
