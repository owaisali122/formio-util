import { TanStackTableComponent, TANSTACK_TABLE_TYPE } from '../components/DataGrid'
import type { FormioComponents } from './types'

export async function registerTanStackTable(Components: FormioComponents): Promise<void> {
  const FieldComponent = (Components.components as any).field as any

  class TanStackTable extends FieldComponent {
    /** Snapshot of preview-relevant properties for change detection */
    _prevPreviewKey: string = ''

    static schema(...extend: any[]) {
      return FieldComponent.schema(TanStackTableComponent.schema(), ...extend)
    }

    static get builderInfo() {
      return TanStackTableComponent.builderInfo
    }

    static editForm() {
      return TanStackTableComponent.editForm()
    }

    get defaultSchema() {
      return TanStackTable.schema()
    }

    /**
     * Build a key from only the properties that affect the preview.
     * If this key hasn't changed, we skip rebuilding the HTML.
     */
    _buildPreviewKey(): string {
      const c = this.component
      const colSig = (c.columns || []).map((col: any) =>
        `${col.label || ''}|${col.key || ''}|${col.visible !== false ? '1' : '0'}|${col.minWidth || ''}`,
      ).join(';')
      return [
        c.dataMode || 'client',
        colSig,
        c.paginationEnabled ? '1' : '0',
        c.sortingEnabled ? '1' : '0',
        c.globalSearchEnabled ? '1' : '0',
        c.groupingEnabled ? '1' : '0',
        c.expansionEnabled ? '1' : '0',
        c.pageSize || 10,
      ].join('|')
    }

    render() {
      // ── Change detection: skip re-render if nothing preview-relevant changed ──
      const newKey = this._buildPreviewKey()
      if (this._prevPreviewKey === newKey && this.refs?.tanstackTablePreview) {
        // Nothing that matters changed — reuse existing DOM
        return super.render(this.refs.tanstackTablePreview.outerHTML)
      }
      this._prevPreviewKey = newKey

      const cols = this.component.columns || []
      const mode = this.component.dataMode || 'client'

      const headerCells = cols.length > 0
        ? cols
            .filter((c: any) => c.visible !== false)
            .map((c: any) => {
              const colW = c.minWidth ? parseInt(c.minWidth, 10) || 0 : 0
              const colWStyle = colW > 0 ? `;width:${colW}%` : ''
              return `<th style="padding:6px 10px;border:1px solid #ddd;background:#f5f5f5;font-size:12px${colWStyle};">${this.t(c.label || c.key || '—')}</th>`
            })
            .join('')
        : '<th style="padding:6px 10px;border:1px solid #ddd;background:#f5f5f5;font-size:12px;color:#999;">No columns configured</th>'

      const visibleCols = cols.filter((c: any) => c.visible !== false)
      const colCount = Math.max(visibleCols.length, 1)
      const placeholderCells = Array.from({ length: colCount }, () =>
        '<td style="padding:6px 10px;border:1px solid #eee;font-size:11px;color:#bbb;">—</td>',
      ).join('')
      const placeholderRows = Array.from({ length: 3 }, () => `<tr>${placeholderCells}</tr>`).join('')

      const features: string[] = []
      if (this.component.paginationEnabled) features.push('Pagination')
      if (this.component.sortingEnabled) features.push('Sorting')
      if (this.component.globalSearchEnabled) features.push('Search')
      if (this.component.groupingEnabled) features.push('Grouping')
      if (this.component.expansionEnabled) features.push('Expandable')
      const featureText = features.length > 0 ? features.join(' · ') : ''

      return super.render(`
        <div ref="tanstackTablePreview" class="formio-tanstack-table-preview" style="width:100%;border:1px solid #ccc;border-radius:4px;overflow:hidden;">
          <div style="padding:6px 10px;background:#e9ecef;border-bottom:1px solid #ccc;font-size:11px;color:#555;display:flex;justify-content:space-between;">
            <span><i class="fa fa-table"></i> TanStack Table — <strong>${mode}</strong> mode</span>
            ${featureText ? `<span>${featureText}</span>` : ''}
          </div>
          <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;">
              <thead><tr>${headerCells}</tr></thead>
              <tbody>${placeholderRows}</tbody>
            </table>
          </div>
          <div style="padding:4px 10px;background:#f9f9f9;border-top:1px solid #eee;font-size:10px;color:#999;text-align:right;">
            ${this.component.paginationEnabled ? `Page 1 · ${this.component.pageSize || 10} per page` : 'No pagination'}
          </div>
        </div>
      `)
    }
  }

  Components.setComponent(TANSTACK_TABLE_TYPE, TanStackTable as never)
}
