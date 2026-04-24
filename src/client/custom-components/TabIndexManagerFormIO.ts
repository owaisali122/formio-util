/**
 * FormIO: Tab Index Manager Renderer Runtime Component
 *
 * Reference pattern: createProgressBarClass (ProgressBarFormIO.ts)
 *
 * This is a non-visual utility component. After the form renders it:
 *   1. Reads the ordered key list from component.targetKeys.
 *   2. Finds the matching focusable input for each key.
 *   3. Assigns tabindex="1", "2", "3", … in sequence.
 *
 * Delayed / referenced form content:
 *   Re-applies when the root form changes, wizard pages change, or a
 *   referenced form reports that it has finished ready(). A MutationObserver
 *   remains as a DOM-level fallback for late-rendered content.
 */

export function createTabIndexManagerClass(FieldComponent: any) {
  return class TabIndexManagerFormIO extends FieldComponent {
    /** requestAnimationFrame handle used to coalesce repeated apply calls. */
    _applyFrame: number | null = null
    /** DOM observer watching for late-rendering content (e.g. referenced forms). */
    _observer: MutationObserver | null = null
    /** Shared root-event listener that queues a re-apply. */
    _onReapplyBound: (() => void) | null = null

    static schema(...extend: any[]) {
      return FieldComponent.schema(
        {
          type: 'tabIndexManager',
          label: 'Tab Index Manager',
          key: 'tabIndexManager',
          input: false,
          tableView: false,
          persistent: false,
          targetKeys: [],
          hidden: true,
        },
        ...extend,
      )
    }

    static get builderInfo() {
      return {
        title: 'Tab Index Manager',
        group: 'basic',
        icon: 'list-ol',
        weight: 38,
        schema: TabIndexManagerFormIO.schema(),
      }
    }

    get defaultSchema() {
      return TabIndexManagerFormIO.schema()
    }

    // ── Render ────────────────────────────────────────────────────────────

    render() {
      // Non-visual utility — render a semantically hidden placeholder.
      return super.render(
        '<span hidden aria-hidden="true" data-tab-index-manager="true"></span>',
      )
    }

    // ── Attach ────────────────────────────────────────────────────────────

    attach(element: HTMLElement) {
      const result = super.attach(element)

      // Queue an initial pass after attach so the parent form DOM settles first.
      this._queueApply()

      // Re-apply whenever the parent form structure or current wizard page changes.
      this._setupRootListeners()

      // Keep a DOM fallback for content that still arrives outside Form.io events.
      this._setupObserver()

      return result
    }

    // ── Core logic ────────────────────────────────────────────────────────

    /** Returns the ordered array of non-empty, complete component keys from schema. */
    _getOrderedKeys(): string[] {
      const rows: Array<{ keyEntry?: string }> = this.component.targetKeys ?? []
      return rows
        .map((r) => (r.keyEntry ?? '').trim())
        // Filter out empty strings and incomplete scoped keys (trailing dot)
        .filter((k) => k.length > 0 && !k.endsWith('.'))
    }

    _queueApply() {
      if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
        if (this._applyFrame != null) {
          window.cancelAnimationFrame(this._applyFrame)
        }
        this._applyFrame = window.requestAnimationFrame(() => {
          this._applyFrame = null
          this._applyTabIndexes()
        })
        return
      }

      this._applyTabIndexes()
    }

    /** Assign tabindex="1..n" to each resolved input in key order. */
    _applyTabIndexes() {
      const keys = this._getOrderedKeys()
      if (keys.length === 0) return

      let tabIndex = 1
      for (const key of keys) {
        const el = this._findInputByKey(key)
        if (el) {
          el.setAttribute('tabindex', String(tabIndex))
          tabIndex++
        }
      }
    }

    /**
     * Locate the first focusable input element for the given component key.
     *
     * Supports two key formats:
     *   - Plain key   : "firstName"          → top-level form field
     *   - Scoped key  : "appDetailRef.firstName" → field inside a referenced form
     *
     * Resolution order for plain keys:
     *  1. Walk Form.io’s component tree via root.getAllComponents().
     *  2. DOM scan inside the root form element using name / data-key attributes.
     *  3. CSS class selector (.formio-component-<key>) as a last resort.
     *
     * For scoped keys the referenced form container element is found first,
     * then the same DOM scan runs inside that container.
     */
    _findInputByKey(key: string): HTMLElement | null {
      // Scoped key for referenced-form fields: refContainerKey.fieldKey
      if (key.includes('.')) {
        return this._findScopedInput(key)
      }
      const allComponents: any[] = (this.root as any)?.getAllComponents?.() ?? []
      for (const comp of allComponents) {
        if (comp?.component?.key === key && comp.element) {
          const input = this._getFocusableInput(comp.element as HTMLElement)
          if (input) return input
        }
      }

      // 2 & 3 — DOM fallback (covers referenced-form content whose components
      // may not appear in root.getAllComponents())
      const rootEl = this._getRootElement()
      if (!rootEl) return null

      const escaped = CSS.escape(key)

      // name="data[key]" is how Form.io renders standard field inputs
      const byName = rootEl.querySelector<HTMLElement>(
        `[name="data[${escaped}]"], [data-component-key="${escaped}"]`,
      )
      if (byName) {
        return this._getFocusableInput(byName) ?? byName
      }

      // .formio-component-<key> wraps each component in the rendered output
      const byClass = rootEl.querySelector<HTMLElement>(`.formio-component-${escaped}`)
      if (byClass) {
        return this._getFocusableInput(byClass) ?? null
      }

      return null
    }

    /**
     * Resolve a scoped key in the form "refContainerKey.fieldKey".
     *
     * Finds the referenced form container by its CSS class
     * (.formio-component-refContainerKey), then searches inside it for the
     * field using the same DOM strategies used for plain keys.
     * This covers appDetailRef and any other referenced-form container type.
     */
    _findScopedInput(scopedKey: string): HTMLElement | null {
      const dotIdx = scopedKey.indexOf('.')
      const refKey = scopedKey.slice(0, dotIdx)
      const fieldKey = scopedKey.slice(dotIdx + 1)
      if (!refKey || !fieldKey) return null

      const rootEl = this._getRootElement()
      if (!rootEl) return null

      // The referenced form container has the class .formio-component-<refKey>
      const refContainer = rootEl.querySelector<HTMLElement>(
        `.formio-component-${CSS.escape(refKey)}`,
      )
      if (!refContainer) return null

      const escapedField = CSS.escape(fieldKey)

      const byName = refContainer.querySelector<HTMLElement>(
        `[name="data[${escapedField}]"], [data-component-key="${escapedField}"]`,
      )
      if (byName) {
        return this._getFocusableInput(byName) ?? byName
      }

      const byClass = refContainer.querySelector<HTMLElement>(`.formio-component-${escapedField}`)
      if (byClass) {
        return this._getFocusableInput(byClass) ?? null
      }

      return null
    }

    /** Returns the first keyboard-focusable descendant of a container element. */
    _getFocusableInput(container: HTMLElement): HTMLElement | null {
      if (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(container.tagName)) {
        return container
      }
      return container.querySelector<HTMLElement>(
        'input:not([type="hidden"]):not([disabled]),' +
          'select:not([disabled]),' +
          'textarea:not([disabled]),' +
          '[role="combobox"],' +
          '[contenteditable="true"]',
      )
    }

    /** Resolve the root DOM element of the parent form. */
    _getRootElement(): HTMLElement | null {
      const rootEl = (this.root as any)?.element as HTMLElement | undefined
      if (rootEl) return rootEl
      // Traverse up from this component's element to the nearest .formio-form
      return (
        (this.element?.closest?.('.formio-form') as HTMLElement | null) ??
        (this.element?.parentElement ?? null)
      )
    }

    _setupRootListeners() {
      const root = this.root as {
        on?: (event: string, listener: () => void) => void
      } | null
      if (!root?.on) return

      this._onReapplyBound = () => this._queueApply()
      root.on('change', this._onReapplyBound)
      root.on('nextPage', this._onReapplyBound)
      root.on('prevPage', this._onReapplyBound)
      root.on('wizardPageSelected', this._onReapplyBound)
      root.on('referencedFormReady', this._onReapplyBound)
    }

    // ── MutationObserver for referenced / async content ───────────────────

    /**
     * Observe the root form element for new DOM nodes.
     *
     * When a referenced form (e.g. appDetailRef) finishes rendering after the
     * initial attach, the observer detects the new nodes and queues a re-apply
     * so those late-rendered inputs also receive tabindex.
     */
    _setupObserver() {
      if (typeof MutationObserver === 'undefined') return

      const rootEl = this._getRootElement()
      if (!rootEl) return

      this._teardownObserver()

      this._observer = new MutationObserver(() => {
        this._queueApply()
      })

      this._observer.observe(rootEl, { childList: true, subtree: true, attributes: false })
    }

    _teardownObserver() {
      if (this._observer) {
        this._observer.disconnect()
        this._observer = null
      }
    }

    _teardownRootListeners() {
      const root = this.root as {
        off?: (event: string, listener: () => void) => void
      } | null
      if (!root?.off || !this._onReapplyBound) return

      root.off('change', this._onReapplyBound)
      root.off('nextPage', this._onReapplyBound)
      root.off('prevPage', this._onReapplyBound)
      root.off('wizardPageSelected', this._onReapplyBound)
      root.off('referencedFormReady', this._onReapplyBound)
      this._onReapplyBound = null
    }

    // ── Cleanup ───────────────────────────────────────────────────────────

    destroy() {
      if (this._applyFrame != null && typeof window !== 'undefined') {
        window.cancelAnimationFrame(this._applyFrame)
        this._applyFrame = null
      }
      this._teardownRootListeners()
      this._teardownObserver()
      super.destroy()
    }
  }
}

export default createTabIndexManagerClass
