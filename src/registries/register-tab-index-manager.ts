/**
 * Register the Tab Index Manager designer (builder-side) component.
 *
 * Reference pattern: registerProgressBar (register-progress-bar.ts)
 *
 * Also exports setupTabIndexManagerDropdown — call it from the FormBuilder ready
 * handler (alongside setupReferencedFormDropdown) so the keyEntry dropdown is
 * populated from the live builder schema when the edit dialog opens.
 */

import { TabIndexManagerComponent, TAB_INDEX_MANAGER_TYPE } from '../components/TabIndexManager'
import type { FormioComponents } from './types'

// ── Types that are layout/container wrappers ──────────────────────────────────
const CONTAINER_TYPES = new Set([
  'panel', 'well', 'columns', 'fieldset', 'tabs', 'table',
  'datagrid', 'tree', 'editgrid',
])

// ── Types that produce no focusable input — skip entirely ────────────────────
const SKIP_TYPES = new Set([
  'button', 'content', 'htmlelement',
  'tabIndexManager', 'progressBar', 'popupComponent',
  'formReview', 'profileFieldSection', 'tanstackTable',
])

function getNestedComponentGroups(component: any): any[][] {
  const groups: any[][] = []

  if (Array.isArray(component?.components)) {
    groups.push(component.components)
  }

  if (Array.isArray(component?.tabs)) {
    for (const tab of component.tabs) {
      if (Array.isArray(tab?.components)) {
        groups.push(tab.components)
      }
    }
  }

  if (Array.isArray(component?.columns)) {
    for (const column of component.columns) {
      if (Array.isArray(column?.components)) {
        groups.push(column.components)
      }
    }
  }

  if (Array.isArray(component?.rows)) {
    for (const row of component.rows) {
      if (!Array.isArray(row)) continue
      for (const cell of row) {
        if (Array.isArray(cell?.components)) {
          groups.push(cell.components)
        }
      }
    }
  }

  return groups
}

function pushOption(
  result: Array<{ label: string; value: string }>,
  seen: Set<string>,
  value: string,
  label: string,
): void {
  if (!value || seen.has(value)) return
  seen.add(value)
  result.push({ label: `${label} (${value})`, value })
}

function collectReferencedKeys(
  components: any[],
  refKey: string,
  result: Array<{ label: string; value: string }>,
  seen: Set<string>,
): void {
  for (const component of components ?? []) {
    const nestedGroups = getNestedComponentGroups(component)
    const type: string = component?.type ?? ''
    const key: string = typeof component?.key === 'string' ? component.key : ''

    if (key && !SKIP_TYPES.has(type) && !CONTAINER_TYPES.has(type) && type !== 'appDetailRef') {
      const label = component.label || component.title || key
      pushOption(result, seen, `${refKey}.${key}`, label)
    }

    for (const nested of nestedGroups) {
      collectReferencedKeys(nested, refKey, result, seen)
    }
  }
}

/**
 * Walk a schema component array and collect selectable key options.
 *
 * - Normal field → { label: "Field Label (key)", value: "key" }
 * - appDetailRef → recurse into cached referenced-form schema and produce
 *                  scoped entries: { label: "...", value: "refKey.innerKey" }
 *                  Falls back to an empty list when the cache is not yet set.
 *
 * @param components  Top-level (or nested) components from the builder schema.
 * @param selfKey     Key of the Tab Index Manager itself — excluded from results.
 */
export function collectBuilderKeys(
  components: any[],
  selfKey?: string,
): Array<{ label: string; value: string }> {
  const result: Array<{ label: string; value: string }> = []
  const seen = new Set<string>()

  const visit = (items: any[]) => {
    for (const component of items ?? []) {
      const nestedGroups = getNestedComponentGroups(component)
      const type: string = component?.type ?? ''
      const key: string = typeof component?.key === 'string' ? component.key : ''

      if (type === 'appDetailRef' && key && key !== selfKey) {
        // Attempt to resolve inner fields from the forms-list cache that
        // setupReferencedFormDropdown populates on window after a fetch.
        const win = typeof window !== 'undefined' ? (window as any) : undefined
        const cache = win?.__referencedFormFormsCache ?? win?.top?.__referencedFormFormsCache ?? null
        const docs: any[] = cache?.docs ?? []
        const selectedId = component.selectedFormId

        let innerComps: any[] = []
        if (selectedId) {
          const doc = docs.find((d: any) => String(d.id) === String(selectedId))
          const refSchema = doc?.schema
          if (refSchema && Array.isArray(refSchema.components)) {
            innerComps = refSchema.components
          }
        }

        collectReferencedKeys(innerComps, key, result, seen)
        continue
      }

      if (key && !SKIP_TYPES.has(type) && key !== selfKey && !CONTAINER_TYPES.has(type)) {
        const label = component.label || component.title || key
        pushOption(result, seen, key, label)
      }

      for (const nested of nestedGroups) {
        visit(nested)
      }
    }
  }

  visit(components)

  return result
}

function getCurrentBuilderComponents(inst: Record<string, any>): any[] {
  const editFormComponents = inst.editForm?.options?.editForm?.components
  if (Array.isArray(editFormComponents)) return editFormComponents

  const rawFormComponents = inst._form?.components
  if (Array.isArray(rawFormComponents)) return rawFormComponents

  const publicFormComponents = inst.form?.components
  if (Array.isArray(publicFormComponents)) return publicFormComponents

  const schemaComponents = inst.schema?.components
  if (Array.isArray(schemaComponents)) return schemaComponents

  return []
}

/**
 * Attach a builder lifecycle hook so the keyEntry dropdown inside the
 * Tab Index Manager edit form is populated from the current builder schema.
 *
 * Call this from the FormBuilder ready handler alongside
 * setupReferencedFormDropdown:
 *
 *   formBuilder.ready.then((instance) => {
 *     setupReferencedFormDropdown(instance)
 *     setupTabIndexManagerDropdown(instance)
 *   })
 *
 * When the user opens the Tab Index Manager edit dialog this function:
 *  1. Collects all regular field keys from the builder's current schema.
 *  2. For appDetailRef components with a cached schema, collects scoped keys.
 *  3. Updates the datagrid's row-template component definition.
 *  4. Updates any already-rendered rows so their selects show the new values.
 */
export function setupTabIndexManagerDropdown(instance: Record<string, unknown>): void {
  const inst = instance as {
    on?: (event: string, fn: (c: Record<string, unknown>) => void) => void
    editForm?: {
      getComponent?: (key: string) => any
      options?: {
        editForm?: {
          components?: any[]
        }
      }
    }
    _form?: { components?: any[] }
    form?: { components?: any[] }
    schema?: { components?: any[] }
  }

  inst.on?.('editComponent', (component: Record<string, unknown>) => {
    if (component?.type !== TAB_INDEX_MANAGER_TYPE) return

    // Defer so the edit dialog has finished constructing its component tree
    // before we query it. editComponent fires synchronously during openEdit,
    // before the dialog is attached to the DOM.
    setTimeout(() => {
      // ── 1. Collect referenced-field keys from the current builder schema ──
      const topComps = getCurrentBuilderComponents(inst as Record<string, any>)

      const values = collectBuilderKeys(topComps, component.key as string)
        .filter((item) => item.value.includes('.'))

      // ── 2. Store referenced keys in a window global for the edit-form select ──
      if (typeof window !== 'undefined') {
        ;(window as any).__tabIndexManagerReferencedKeys = values
      }

      // ── 3. Refresh rendered rows so the custom script re-evaluates ────────
      const datagrid = inst.editForm?.getComponent?.('targetKeys')
      if (!datagrid) return

      const rows = (datagrid as any).rows as Array<Record<string, any>> | undefined
      if (Array.isArray(rows)) {
        for (const rowComps of rows) {
          if (!rowComps) continue
          const keyEntryComp = rowComps.keyEntry
          if (keyEntryComp) {
            ;(keyEntryComp as any)._customItemsLoaded = false
            keyEntryComp.updateItems?.()
            keyEntryComp.redraw?.()
          }
        }
      }
    }, 0)
  })
}

export async function registerTabIndexManager(Components: FormioComponents): Promise<void> {
  const FieldComponent = (Components.components as any).field as any

  class TabIndexManager extends FieldComponent {
    static schema(...extend: any[]) {
      return FieldComponent.schema(TabIndexManagerComponent.schema(), ...extend)
    }

    static get builderInfo() {
      return TabIndexManagerComponent.builderInfo
    }

    static editForm() {
      return TabIndexManagerComponent.editForm()
    }

    get defaultSchema() {
      return TabIndexManager.schema()
    }

    render() {
      const c = this.component
      const count = Array.isArray(c.targetKeys) ? c.targetKeys.length : 0

      // Designer preview: utility badge showing configured key count
      return super.render(`
        <div class="border border-secondary rounded p-2 bg-light d-flex align-items-center gap-2">
          <i class="fa fa-list-ol text-secondary"></i>
          <span class="small fw-semibold text-secondary text-uppercase">Tab Index Manager</span>
          <span class="badge bg-secondary ms-1">${count} key${count !== 1 ? 's' : ''}</span>
        </div>
      `)
    }
  }

  Components.setComponent(TAB_INDEX_MANAGER_TYPE, TabIndexManager as never)
}
