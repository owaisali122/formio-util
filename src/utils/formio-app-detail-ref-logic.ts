/**
 * App Detail Ref – form schema helpers for preview and referencable fields.
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

/** No-op for API compatibility (injection can be implemented by consuming app if needed). */
export async function runAppDetailRefInjection(
  schema: Record<string, unknown>
): Promise<Record<string, unknown>> {
  return schema
}
