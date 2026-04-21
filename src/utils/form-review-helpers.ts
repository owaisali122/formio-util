/**
 * Form Review — Helper Utilities
 *
 * Provides label resolution, value resolution, and formatting for the
 * Form Review component. Works with the Form.io form schema and submission data.
 */

// ── Types ────────────────────────────────────────────────────────────

export interface ReviewItemConfig {
  componentKey: string
  customLabel?: string
  emptyValueText?: string
  excludeIfEmpty?: boolean
  booleanTrueLabel?: string
  booleanFalseLabel?: string
  dateFormat?: string
}

export interface ReviewSectionConfig {
  title: string
  sectionKey?: string
  collapsible?: boolean
  defaultExpanded?: boolean
  columns?: number
  items?: ReviewItemConfig[]
  /** JSON string alternative to items array — avoids nested grid in editForm */
  itemsJson?: string
}

export interface FormReviewSettings {
  sections: ReviewSectionConfig[]
  showExpandAll?: boolean
  emptyValueText?: string
  defaultSectionExpanded?: boolean
}

/** A single entry inside a referenced form / nested object value. */
export interface NestedReviewEntry {
  label: string
  value: string
  isEmpty: boolean
  isBoolean?: boolean
  booleanValue?: boolean
  /** Sub-entries when the value itself is a nested object. */
  nestedItems?: NestedReviewEntry[]
}

export interface ResolvedReviewItem {
  label: string
  value: string
  isEmpty: boolean
  isBoolean?: boolean
  /** True when the field value is a referenced form / plain nested object. */
  isObject?: boolean
  /** Structured entries for referenced form objects — populated when isObject is true. */
  nestedItems?: NestedReviewEntry[]
}

export interface ResolvedReviewSection {
  title: string
  sectionKey: string
  collapsible: boolean
  defaultExpanded: boolean
  columns: number
  items: ResolvedReviewItem[]
}

// ── Component Lookup ─────────────────────────────────────────────────

/**
 * Build a flat map of component key → component definition from a Form.io
 * schema. Recursively walks nested components, columns, rows, etc.
 */
export function buildComponentMap(
  components: Record<string, unknown>[] | undefined,
): Map<string, Record<string, unknown>> {
  const map = new Map<string, Record<string, unknown>>()
  if (!Array.isArray(components)) return map

  function walk(comps: Record<string, unknown>[]) {
    for (const comp of comps) {
      if (comp.key && typeof comp.key === 'string') {
        map.set(comp.key, comp)
      }
      // Nested components (panels, fieldsets, containers, wells, etc.)
      if (Array.isArray(comp.components)) {
        walk(comp.components as Record<string, unknown>[])
      }
      // Columns layout
      if (Array.isArray(comp.columns)) {
        for (const col of comp.columns as Record<string, unknown>[]) {
          if (Array.isArray(col.components)) {
            walk(col.components as Record<string, unknown>[])
          }
        }
      }
      // Rows layout (table)
      if (Array.isArray(comp.rows)) {
        for (const row of comp.rows as Record<string, unknown>[][]) {
          if (Array.isArray(row)) {
            for (const cell of row) {
              if (Array.isArray(cell.components)) {
                walk(cell.components as Record<string, unknown>[])
              }
            }
          }
        }
      }
    }
  }

  walk(components)
  return map
}

// ── Label Resolution ─────────────────────────────────────────────────

/**
 * Resolve the display label for a referenced field.
 *
 * Priority:
 * 1. Custom label override from config
 * 2. Component's `label` from the form schema
 * 3. Component key as fallback
 */
export function resolveLabel(
  itemConfig: ReviewItemConfig,
  componentDef: Record<string, unknown> | undefined,
): string {
  if (itemConfig.customLabel) return itemConfig.customLabel
  if (componentDef && typeof componentDef.label === 'string' && componentDef.label) {
    return componentDef.label
  }
  // For dot-notation paths (e.g. "appDetailRef1.davidFileJointly"), derive a
  // readable label from the last path segment rather than returning the raw key.
  const key = itemConfig.componentKey
  const lastSegment = key.includes('.') ? key.split('.').pop()! : key
  return lastSegment
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim()
}

// ── Value Resolution ─────────────────────────────────────────────────

/**
 * Get a value from submission data by key. Supports dot-notation for
 * nested data (e.g. "address.city").
 */
export function getSubmissionValue(data: Record<string, unknown>, key: string): unknown {
  if (!data || !key) return undefined
  // Try direct key first
  if (key in data) return data[key]
  // Dot-notation traversal
  const parts = key.split('.')
  let current: unknown = data
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

/**
 * Format a raw value into a readable string for display in the review.
 */
export function formatValue(
  rawValue: unknown,
  itemConfig: ReviewItemConfig,
  componentDef: Record<string, unknown> | undefined,
  globalEmptyText: string,
): { text: string; isEmpty: boolean; isBoolean?: boolean; booleanValue?: boolean } {
  const emptyText = itemConfig.emptyValueText || globalEmptyText || '\u2014'

  // Null / undefined / empty string
  if (rawValue == null || rawValue === '') {
    return { text: emptyText, isEmpty: true }
  }

  // Boolean values
  if (typeof rawValue === 'boolean') {
    const trueLabel = itemConfig.booleanTrueLabel || 'Yes'
    const falseLabel = itemConfig.booleanFalseLabel || 'No'
    return { text: rawValue ? trueLabel : falseLabel, isEmpty: false, isBoolean: true, booleanValue: rawValue }
  }

  // Arrays (multi-select, etc.)
  if (Array.isArray(rawValue)) {
    if (rawValue.length === 0) return { text: emptyText, isEmpty: true }
    const formatted = rawValue
      .map((item) => {
        if (item && typeof item === 'object' && 'label' in item) return String(item.label)
        return String(item)
      })
      .join(', ')
    return { text: formatted, isEmpty: false }
  }

  // Objects (address, select value objects, etc.)
  if (typeof rawValue === 'object') {
    // Select component value object with label
    const obj = rawValue as Record<string, unknown>
    if ('label' in obj && typeof obj.label === 'string') {
      return { text: obj.label, isEmpty: false }
    }
    // Try to flatten key-value pairs for display
    const parts: string[] = []
    for (const [k, v] of Object.entries(obj)) {
      if (v != null && v !== '') {
        parts.push(String(v))
      }
    }
    if (parts.length === 0) return { text: emptyText, isEmpty: true }
    return { text: parts.join(', '), isEmpty: false }
  }

  // Number
  if (typeof rawValue === 'number') {
    return { text: String(rawValue), isEmpty: false }
  }

  // String — check for select/radio display labels
  const strValue = String(rawValue)
  if (!strValue.trim()) return { text: emptyText, isEmpty: true }

  // Try to resolve select/radio display label from component definition
  if (componentDef) {
    const resolved = resolveSelectLabel(strValue, componentDef)
    if (resolved) return { text: resolved, isEmpty: false }
  }

  // Date formatting
  if (itemConfig.dateFormat && isDateLike(strValue)) {
    const formatted = formatDate(strValue, itemConfig.dateFormat)
    if (formatted) return { text: formatted, isEmpty: false }
  }

  return { text: strValue, isEmpty: false }
}

/**
 * Try to find the display label for a select/radio value from the component
 * definition's data.values array.
 */
function resolveSelectLabel(
  value: string,
  componentDef: Record<string, unknown>,
): string | null {
  const data = componentDef.data as Record<string, unknown> | undefined
  if (!data) return null
  const values = data.values as { label: string; value: string }[] | undefined
  if (!Array.isArray(values)) return null
  const match = values.find((v) => String(v.value) === value)
  return match ? match.label : null
}

/**
 * Basic check if a string looks like an ISO date or common date pattern.
 */
function isDateLike(str: string): boolean {
  return /^\d{4}-\d{2}-\d{2}/.test(str) || /^\d{2}\/\d{2}\/\d{4}/.test(str)
}

/**
 * Format a date string. Supports predefined formats:
 * - 'short': MM/DD/YYYY
 * - 'long': Month DD, YYYY
 * - 'iso': YYYY-MM-DD
 * Falls back to locale default.
 */
function formatDate(dateStr: string, format: string): string | null {
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return null

    switch (format) {
      case 'short':
        return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
      case 'long':
        return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      case 'iso':
        return date.toISOString().slice(0, 10)
      default:
        return date.toLocaleDateString()
    }
  } catch {
    return null
  }
}

// ── Referenced Form / Nested Object Helpers ──────────────────────────

/**
 * Convert a camelCase key to a human-readable label.
 * e.g. "roseFileJointly" → "Rose File Jointly"
 */
function camelToLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim()
}

/**
 * Return true when the object should be treated as a referenced-form /
 * nested object rather than a select-value object.
 *
 * A select value object has a string `label` key and at most 2 keys
 * total (e.g. `{ label: "Hawaii", value: "HI" }`). Anything beyond
 * that is assumed to be a nested/referenced form data object.
 */
function isPlainNestedObject(obj: Record<string, unknown>): boolean {
  if ('label' in obj && typeof obj.label === 'string' && Object.keys(obj).length <= 2) {
    return false
  }
  return true
}

/**
 * Recursively build structured review entries from a plain nested object.
 * Used for referenced form values so they render in a readable key/value tree.
 */
function buildNestedEntries(
  obj: Record<string, unknown>,
  boolTrueLabel: string,
  boolFalseLabel: string,
  emptyText: string,
): NestedReviewEntry[] {
  const entries: NestedReviewEntry[] = []
  for (const [key, value] of Object.entries(obj)) {
    const label = camelToLabel(key)
    if (value === null || value === undefined || value === '') {
      entries.push({ label, value: emptyText, isEmpty: true })
    } else if (typeof value === 'boolean') {
      entries.push({
        label,
        value: value ? boolTrueLabel : boolFalseLabel,
        isEmpty: false,
        isBoolean: true,
        booleanValue: value,
      })
    } else if (Array.isArray(value)) {
      const text =
        value.length === 0
          ? emptyText
          : value
              .map((v) => {
                if (v && typeof v === 'object' && 'label' in v) return String((v as Record<string, unknown>).label)
                return String(v)
              })
              .join(', ')
      entries.push({ label, value: text, isEmpty: value.length === 0 })
    } else if (typeof value === 'object') {
      const nestedObj = value as Record<string, unknown>
      if (isPlainNestedObject(nestedObj)) {
        // Recurse into deeper nested objects
        entries.push({
          label,
          value: '',
          isEmpty: false,
          nestedItems: buildNestedEntries(nestedObj, boolTrueLabel, boolFalseLabel, emptyText),
        })
      } else {
        // Select-value object — use its label
        const labelText = (nestedObj as Record<string, unknown>).label ?? emptyText
        entries.push({ label, value: String(labelText), isEmpty: false })
      }
    } else {
      entries.push({ label, value: String(value), isEmpty: false })
    }
  }
  return entries
}

// ── Section Resolution ───────────────────────────────────────────────

/**
 * Resolve all configured sections against the current form schema and
 * submission data. Returns ready-to-render section data.
 */
export function resolveSections(
  settings: FormReviewSettings,
  formComponents: Record<string, unknown>[] | undefined,
  submissionData: Record<string, unknown>,
): ResolvedReviewSection[] {
  const componentMap = buildComponentMap(formComponents)
  const globalEmptyText = settings.emptyValueText || '\u2014'
  const globalExpanded = settings.defaultSectionExpanded !== false

  return (settings.sections || []).map((section, idx) => {
    const resolvedItems: ResolvedReviewItem[] = []

    // Support both an items array and itemsJson textarea string
    let items: ReviewItemConfig[] = section.items || []
    if ((!items.length) && section.itemsJson) {
      try {
        const parsed = JSON.parse(section.itemsJson)
        if (Array.isArray(parsed)) items = parsed as ReviewItemConfig[]
      } catch {
        // invalid JSON — treat as empty
      }
    }

    for (const item of items) {
      const componentDef = componentMap.get(item.componentKey)
      const rawValue = getSubmissionValue(submissionData, item.componentKey)

      // Detect referenced form / plain nested object values and build structured entries.
      // This handles cases like referencedForm components where the saved value is an object
      // containing child field values (e.g. { roseFileJointly: "no", davidSpouseSelection: {...} }).
      if (
        rawValue !== null &&
        rawValue !== undefined &&
        typeof rawValue === 'object' &&
        !Array.isArray(rawValue) &&
        isPlainNestedObject(rawValue as Record<string, unknown>)
      ) {
        const obj = rawValue as Record<string, unknown>
        const isEmpty = Object.keys(obj).length === 0
        if (item.excludeIfEmpty && isEmpty) continue
        const boolTrueLabel = item.booleanTrueLabel || 'Yes'
        const boolFalseLabel = item.booleanFalseLabel || 'No'
        resolvedItems.push({
          label: resolveLabel(item, componentDef),
          value: '',
          isEmpty,
          isObject: true,
          nestedItems: buildNestedEntries(obj, boolTrueLabel, boolFalseLabel, globalEmptyText),
        })
        continue
      }

      const formatted = formatValue(rawValue, item, componentDef, globalEmptyText)

      if (item.excludeIfEmpty && formatted.isEmpty) continue

      resolvedItems.push({
        label: resolveLabel(item, componentDef),
        value: formatted.text,
        isEmpty: formatted.isEmpty,
        isBoolean: formatted.isBoolean,
      })
    }

    return {
      title: section.title || `Section ${idx + 1}`,
      sectionKey: section.sectionKey || `section-${idx}`,
      collapsible: section.collapsible !== false,
      defaultExpanded: section.defaultExpanded ?? globalExpanded,
      columns: section.columns || 2,
      items: resolvedItems,
    }
  })
}
