import type { DataGridFetchParams, DataGridFetchResult, DataGridRow } from './DataGridService'

/**
 * Action handlers that the renderer app registers to handle table actions.
 * This keeps the table component generic — the consuming app decides
 * how edit, delete, navigation, and data-fetching work.
 */
export interface TanStackTableActionHandlers {
  /** Called when an 'edit' action is triggered on a row */
  onEdit?: (row: DataGridRow) => void
  /** Called when a 'delete' action is triggered on a row */
  onDelete?: (row: DataGridRow) => void
  /** Called when row click navigation is triggered (if enableRowClickNavigation is true) */
  onRowClick?: (row: DataGridRow) => void
  /** Custom data fetcher. If provided, overrides the built-in apiEndpoint-based fetch. */
  fetchData?: (params: DataGridFetchParams) => Promise<DataGridFetchResult>
}

let _handlers: TanStackTableActionHandlers = {}

/** Register action handlers for the TanStack Table component. Call from the renderer app. */
export function registerTanStackTableHandlers(handlers: TanStackTableActionHandlers): void {
  _handlers = { ..._handlers, ...handlers }
}

/** Get the currently registered action handlers. Used internally by the table component. */
export function getTanStackTableHandlers(): TanStackTableActionHandlers {
  return _handlers
}
