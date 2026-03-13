/**
 * App Detail Ref – form schema helpers for preview, referencable fields, and
 * renderer-time schema injection.
 */

import { APP_DETAIL_REF_EXCLUDE_TYPES } from '../components/AppDetailRef'

/** Is type excluded from reference field dropdown? */
function isExcluded(type: string): boolean {
  return APP_DETAIL_REF_EXCLUDE_TYPES.includes(type)
}

/** Referencable items (key + label). Recurses components, tabs, columns, rows. */
export function getReferencableComponents(
  components: unknown[]
): Array<{ key: string; label: string }> {
  const out: Array<{ key: string; label: string }> = []
  if (!Array.isArray(components)) return out
  for (const c of components) {
    const comp = c as Record<string, unknown>
    const type = comp?.type as string | undefined
    const key = comp?.key as string | undefined
    if (key && type && !isExcluded(type)) {
      const label = (comp.label as string) || (comp.title as string) || key
      out.push({ key, label })
    }
    if (Array.isArray(comp?.components)) {
      out.push(...getReferencableComponents(comp.components))
    }
    const tabs = comp?.tabs as Array<{ components?: unknown[] }> | undefined
    if (Array.isArray(tabs)) {
      for (const tab of tabs) {
        if (tab?.components) out.push(...getReferencableComponents(tab.components))
      }
    }
    const columns = comp?.columns as Array<{ components?: unknown[] }> | undefined
    if (Array.isArray(columns)) {
      for (const col of columns) {
        if (col?.components) out.push(...getReferencableComponents(col.components))
      }
    }
    const rows = comp?.rows as unknown[] | undefined
    if (Array.isArray(rows)) {
      for (const row of rows) {
        if (!Array.isArray(row)) continue
        for (const cell of row) {
          const cellObj = cell as { components?: unknown[] }
          if (cellObj?.components) out.push(...getReferencableComponents(cellObj.components))
        }
      }
    }
  }
  return out
}

/** Get components array from a form doc. Payload Forms use doc.schema.components. */
export function getDocComponents(doc: Record<string, unknown> | null): unknown[] {
  if (!doc || typeof doc !== 'object') return []
  const schema = doc.schema as Record<string, unknown> | undefined
  if (schema && Array.isArray(schema.components)) return schema.components as unknown[]
  if (Array.isArray(doc.components)) return doc.components as unknown[]
  const form = doc.form as Record<string, unknown> | undefined
  if (form && Array.isArray(form.components)) return form.components as unknown[]
  return []
}

/**
 * Return form schema for Formio.createForm. Payload Forms use doc.schema (display + components).
 */
export function getFormSchemaForPreview(
  doc: Record<string, unknown> | null
): { display: string; components: unknown[] } {
  if (!doc || typeof doc !== 'object') return { display: 'form', components: [] }
  const schema = doc.schema as Record<string, unknown> | undefined
  if (schema && Array.isArray(schema.components)) {
    return {
      display: String(schema.display || 'form'),
      components: schema.components as unknown[],
    }
  }
  if (doc.display && Array.isArray(doc.components)) {
    return { display: String(doc.display), components: doc.components as unknown[] }
  }
  const form = doc.form as Record<string, unknown> | undefined
  if (form?.display && Array.isArray(form.components)) {
    return { display: String(form.display), components: form.components as unknown[] }
  }
  const comps = getDocComponents(doc)
  return { display: 'form', components: comps }
}

/**
 * Deeply walk a schema and rewrite App Detail Ref components from the designer
 * type (`appDetailRef`) to the runtime renderer type (`appDetailRefRuntime`).
 * This keeps the builder schema unchanged while allowing the renderer to use
 * a dedicated runtime component implementation.
 */

const DESIGNER_TYPE = 'appDetailRef'
const RUNTIME_TYPE = 'appDetailRefRuntime'

type AnyRecord = Record<string, unknown>

function transformComponentsArray(arr: unknown[] | undefined): unknown[] | undefined {
  if (!Array.isArray(arr) || arr.length === 0) return arr
  let changed = false
  const next = arr.map((item) => {
    const updated = transformComponent(item)
    if (updated !== item) changed = true
    return updated
  })
  return changed ? next : arr
}

function transformComponent(node: unknown): unknown {
  if (!node || typeof node !== 'object') return node
  const comp = node as AnyRecord
  let changed = false
  const clone: AnyRecord = { ...comp }

  if (clone.type === DESIGNER_TYPE) {
    clone.type = RUNTIME_TYPE
    changed = true
  }

  const components = transformComponentsArray(clone.components as unknown[] | undefined)
  if (components && components !== clone.components) {
    clone.components = components
    changed = true
  }

  const tabs = clone.tabs as Array<{ components?: unknown[] }> | undefined
  if (Array.isArray(tabs) && tabs.length > 0) {
    let tabsChanged = false
    const nextTabs = tabs.map((tab) => {
      if (!tab?.components) return tab
      const nextComponents = transformComponentsArray(tab.components)
      if (nextComponents && nextComponents !== tab.components) {
        tabsChanged = true
        return { ...tab, components: nextComponents }
      }
      return tab
    })
    if (tabsChanged) {
      clone.tabs = nextTabs
      changed = true
    }
  }

  const columns = clone.columns as Array<{ components?: unknown[] }> | undefined
  if (Array.isArray(columns) && columns.length > 0) {
    let colsChanged = false
    const nextCols = columns.map((col) => {
      if (!col?.components) return col
      const nextComponents = transformComponentsArray(col.components)
      if (nextComponents && nextComponents !== col.components) {
        colsChanged = true
        return { ...col, components: nextComponents }
      }
      return col
    })
    if (colsChanged) {
      clone.columns = nextCols
      changed = true
    }
  }

  const rows = clone.rows as unknown[] | undefined
  if (Array.isArray(rows) && rows.length > 0) {
    let rowsChanged = false
    const nextRows = rows.map((row) => {
      if (!Array.isArray(row)) return row
      let rowChanged = false
      const nextRow = row.map((cell) => {
        const cellObj = cell as { components?: unknown[] }
        if (!cellObj?.components) return cell
        const nextComponents = transformComponentsArray(cellObj.components)
        if (nextComponents && nextComponents !== cellObj.components) {
          rowChanged = true
          return { ...cellObj, components: nextComponents }
        }
        return cell
      })
      if (rowChanged) {
        rowsChanged = true
        return nextRow
      }
      return row
    })
    if (rowsChanged) {
      clone.rows = nextRows
      changed = true
    }
  }

  return changed ? clone : node
}

export async function runAppDetailRefInjection(
  schema: Record<string, unknown>
): Promise<Record<string, unknown>> {
  if (!schema || typeof schema !== 'object') return schema
  const maybeUpdated = transformComponent(schema) as AnyRecord
  return maybeUpdated
}

