import { createRoot, Root } from 'react-dom/client'
import React from 'react'

import type { DataGridReactProps } from './DataGridReact'
import type { DataGridFetchParams, DataGridFetchResult, DataGridServiceConfig } from './DataGridService'
import { fetchServerData } from './DataGridService'
import { getTanStackTableHandlers } from './DataGridActionHandlers'
import type { DataGridColumn } from '../../../components/DataGrid'
import { TANSTACK_TABLE_TYPE } from '../../../components/DataGrid'

type ReactComponent = React.ComponentType<DataGridReactProps>
let DataGridReactCmp: ReactComponent | null = null

async function loadReactComponent(): Promise<ReactComponent | null> {
  if (!DataGridReactCmp) {
    const mod = await import('./DataGridReact')
    DataGridReactCmp = mod.DataGridReact
  }
  return DataGridReactCmp
}

const ROOT_KEY = '__tanstackTableRoot'

/**
 * Factory — called from registry.ts with the base FieldComponent class.
 */
export default function createTanStackTableClass(FieldComponent: any) {
  class TanStackTableFormIO extends FieldComponent {
    reactRoot: Root | null = null
    reactContainer: HTMLDivElement | null = null
    _mountedVersion: number = 0

    static schema(...extend: any[]) {
      return FieldComponent.schema(
        { type: TANSTACK_TABLE_TYPE, label: 'TanStack Table', key: 'tanstackTable', input: false, tableView: false },
        ...extend,
      )
    }

    get defaultSchema() {
      return TanStackTableFormIO.schema()
    }

    /** True when running inside the Form.io builder / designer context */
    get isBuilderMode(): boolean {
      return !!(this.builderMode || this.options?.builder || this.root?.options?.builder)
    }

    // ── render ──────────────────────────────────────────────────

    render() {
      // In builder mode the designer preview (register-data-grid.ts) handles
      // rendering.  The runtime class should never mount React there.
      if (this.isBuilderMode) {
        return super.render(`
          <div ref="tanstackTableContainer" class="formio-tanstack-table-runtime" style="width:100%;min-height:40px;">
            <div style="padding:10px;text-align:center;color:#888;font-size:12px;">
              TanStack Table (runtime – configure via edit panel)
            </div>
          </div>
        `)
      }

      return super.render(`
        <div ref="tanstackTableContainer" class="formio-tanstack-table-runtime" style="width:100%;min-height:80px;">
          <div style="padding:18px;text-align:center;color:#888;font-size:13px;">
            Loading TanStack Table…
          </div>
        </div>
      `)
    }

    // ── attach ──────────────────────────────────────────────────

    attach(element: HTMLElement) {
      const result = super.attach(element)

      // Never mount React in builder mode — designer preview is sufficient
      if (this.isBuilderMode) return result

      this.loadRefs(element, { tanstackTableContainer: 'single' })
      const container = (this.refs as any)?.tanstackTableContainer
      if (container) this.mountReactComponent(container as HTMLElement)
      return result
    }

    // ── React lifecycle ─────────────────────────────────────────

    async mountReactComponent(container: HTMLElement) {
      const mountVersion = ++this._mountedVersion

      try {
        if (!container) return

        // Handle stale root (DOM removed)
        if (this.reactRoot && this.reactContainer && !document.contains(this.reactContainer)) {
          try { this.reactRoot.unmount() } catch { /* already gone */ }
          this.reactRoot = null
          this.reactContainer = null
          delete (container as any)[ROOT_KEY]
        }

        // Bail if a newer mount was requested while we were working
        if (mountVersion !== this._mountedVersion) return

        // Reuse existing root if still mounted — just re-render with latest props
        if (this.reactRoot && this.reactContainer && document.contains(this.reactContainer)) {
          const Cmp = await loadReactComponent()
          if (Cmp && mountVersion === this._mountedVersion) this.renderReactComponent(Cmp)
          return
        }

        // Check for root cached on DOM node
        const existingRoot = (container as any)[ROOT_KEY] as Root | undefined
        if (existingRoot) {
          this.reactRoot = existingRoot
          this.reactContainer = container as unknown as HTMLDivElement
          const Cmp = await loadReactComponent()
          if (Cmp && mountVersion === this._mountedVersion) this.renderReactComponent(Cmp)
          return
        }

        // Fresh mount
        container.innerHTML = ''
        this.reactContainer = document.createElement('div')
        this.reactContainer.className = 'tanstack-table-react-mount'
        container.appendChild(this.reactContainer)

        const Cmp = await loadReactComponent()
        if (!Cmp || !this.reactContainer || mountVersion !== this._mountedVersion) return

        const existingOnNode = (this.reactContainer as any)[ROOT_KEY] as Root | undefined
        if (existingOnNode) {
          this.reactRoot = existingOnNode
        } else {
          this.reactRoot = createRoot(this.reactContainer)
          ;(this.reactContainer as any)[ROOT_KEY] = this.reactRoot
        }

        this.renderReactComponent(Cmp)
      } catch {
        container.innerHTML = '<div style="color:red;padding:10px;">Error loading TanStack Table</div>'
      }
    }

    renderReactComponent(Cmp: ReactComponent) {
      if (!this.reactRoot) return
      const c = this.component
      const pageSizeOptions = (c.pageSizeOptions || '5,10,25,50')
        .split(',')
        .map((s: string) => parseInt(s.trim(), 10))
        .filter((n: number) => !isNaN(n))
      const detailFields = (c.detailFields || '')
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean)
      const handlers = getTanStackTableHandlers()

      this.reactRoot.render(
        React.createElement(Cmp, {
          dataMode: c.dataMode || 'client',
          columns: (c.columns || []) as DataGridColumn[],
          paginationEnabled: c.paginationEnabled !== false,
          pageSize: c.pageSize || 10,
          pageSizeOptions,
          pageSizeSelectorEnabled: c.pageSizeSelectorEnabled !== false,
          sortingEnabled: c.sortingEnabled !== false,
          defaultSortField: c.defaultSortField || '',
          defaultSortDirection: c.defaultSortDirection || 'asc',
          globalSearchEnabled: c.globalSearchEnabled === true,
          searchPlaceholder: c.searchPlaceholder || 'Search…',
          searchDebounce: c.searchDebounce || 300,
          groupingEnabled: c.groupingEnabled === true,
          groupingField: c.groupingField || '',
          expansionEnabled: c.expansionEnabled === true,
          groupedRowExpansion: c.groupedRowExpansion === true,
          detailFields,
          rowClickUrl: c.rowClickUrl || '',
          enableRowClickNavigation: c.enableRowClickNavigation === true,
          onEdit: handlers.onEdit,
          onDelete: handlers.onDelete,
          onRowClick: handlers.onRowClick,
          actionColumnEnabled: c.actionColumnEnabled === true,
          actionColumnLabel: c.actionColumnLabel || '',
          actionColumnActions: c.actionColumnActions || '',
          toolbarEnabled: c.toolbarEnabled !== false,
          emptyStateText: c.emptyStateText || 'No data available',
          loadingText: c.loadingText || 'Loading…',
          errorText: c.errorText || 'Failed to load data',
          fetchData: this.buildFetcher(),
        } as DataGridReactProps),
      )
    }

    /**
     * Build the fetch function from schema config.
     * Requires apiEndpoint to be configured in the component schema.
     */
    buildFetcher(): (params: DataGridFetchParams) => Promise<DataGridFetchResult> {
      const handlers = getTanStackTableHandlers()
      if (handlers.fetchData) {
        return handlers.fetchData
      }

      const c = this.component

      if (!c.apiEndpoint) {
        return async () => ({ rows: [], total: 0 })
      }

      const config: DataGridServiceConfig = {
        apiEndpoint: c.apiEndpoint,
        apiMethod: c.apiMethod || 'GET',
        dataPath: c.dataPath || 'data',
        totalCountPath: c.totalCountPath || 'total',
        pageParamName: c.pageParamName || 'page',
        pageSizeParamName: c.pageSizeParamName || 'pageSize',
        sortFieldParamName: c.sortFieldParamName || 'sortField',
        sortDirectionParamName: c.sortDirectionParamName || 'sortDirection',
        groupParamName: c.groupParamName || 'group',
        searchParamName: c.searchParamName || 'search',
        // Secure API configuration — passed through from component schema
        apiType: c.apiType || 'custom',
        authType: c.authType || 'basic',
        authUsername: c.authUsername || '',
        authPassword: c.authPassword || '',
        partnerId: c.partnerId || '',
      }
      return (params) => fetchServerData(config, params)
    }

    // ── cleanup ─────────────────────────────────────────────────

    destroy() {
      const root = this.reactRoot
      this.reactRoot = null
      this.reactContainer = null
      if (root) {
        queueMicrotask(() => { try { root.unmount() } catch { /* already gone */ } })
      }
      super.destroy()
    }
  }

  return TanStackTableFormIO
}
