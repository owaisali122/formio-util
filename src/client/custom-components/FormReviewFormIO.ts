/**
 * FormIO: Form Review Renderer Runtime Component
 *
 * Rendering strategy:
 *  - render()  → returns a minimal skeleton div only (NO data access).
 *                Form.io calls render() during the template-generation phase
 *                where wizard accumulated data may not be flushed yet.
 *  - attach()  → builds the full section HTML with live data and injects it
 *                into the skeleton via element.querySelector (not loadRefs).
 *                By the time attach() runs, root.submission.data is guaranteed
 *                to contain all wizard pages' data.
 *
 * Collapse: controlled via inline display style — avoids Bootstrap 3 vs 4
 * class name differences (`.in` vs `.show`).
 *
 * Reference pattern: createProgressBarClass (ProgressBarFormIO.ts)
 */

import {
  buildComponentMap,
  resolveSections,
} from '../../coreHelper/FormReviewCore/FormReviewCore.helpers'
import type {
  ResolvedReviewSection,
  ResolvedReviewItem,
  NestedReviewEntry,
  ReviewSensitiveValue,
} from '../../coreHelper/FormReviewCore/FormReviewCore.types'

export function createFormReviewClass(FieldComponent: any) {
  return class FormReviewFormIO extends FieldComponent {
    /** Per-section expanded state — survives re-attach within the same page visit. */
    _sectionStates: Map<string, boolean> = new Map()

    /** Per-item reveal state for sensitive review values such as SSN / ITIN. */
    _sensitiveItemStates: Map<string, boolean> = new Map()

    /** Sensitive review values keyed by stable review item key. */
    _sensitiveItems: Map<string, ReviewSensitiveValue> = new Map()

    /** Bound wizard page-navigation listener — stored for cleanup on destroy. */
    _onPageBound: (() => void) | null = null

    /** Bound change listener — re-injects content when submission data changes. */
    _onChangeBound: (() => void) | null = null

    /** Debounce timer for change events. */
    _changeTimer: ReturnType<typeof setTimeout> | null = null

    /**
     * init() is the correct place to register wizard page-navigation listeners.
     *
     * Form.io Wizard lifecycle for "click Next to review page":
     *   1. New FormReview component instance created → init() called  ← register here
     *   2. render() called
     *   3. attach() called  ← synchronous inject (may be empty on first load)
     *   4. nextPage event fires  ← our listener fires, data is NOW available
     *
     * Registering in attach() with a captured `element` breaks on subsequent
     * navigations because the captured element is a destroyed DOM node.
     * Using `this.element` (updated by super.attach each time) always targets
     * the live, currently-mounted element.
     */
    init() {
      super.init()
      const root = this.root
      if (root && typeof root.on === 'function') {
        this._onPageBound = () => {
          // this.element is set/updated by super.attach() — always the live DOM node
          const liveEl = (this as any).element as HTMLElement | undefined
          if (liveEl) this._injectContent(liveEl)
        }
        root.on('nextPage', this._onPageBound)
        root.on('prevPage', this._onPageBound)
        root.on('wizardPageSelected', this._onPageBound)

        // Listen for any data change — handles initial submission load,
        // edit mode hydration, and non-wizard (regular form) scenarios
        // where nextPage/prevPage never fire.
        this._onChangeBound = () => {
          if (this._changeTimer) clearTimeout(this._changeTimer)
          this._changeTimer = setTimeout(() => {
            const liveEl = (this as any).element as HTMLElement | undefined
            if (liveEl && liveEl.isConnected) this._injectContent(liveEl)
          }, 150)
        }
        root.on('change', this._onChangeBound)
      }
    }

    static schema(...extend: any[]) {
      return FieldComponent.schema(
        {
          type: 'formReview',
          label: 'Form Review',
          key: 'formReview',
          input: false,
          persistent: false,
          tableView: false,
          sections: [],
          showExpandAll: true,
          emptyValueText: '\u2014',
          defaultSectionExpanded: true,
        },
        ...extend,
      )
    }

    static get builderInfo() {
      return {
        title: 'Form Review',
        group: 'layout',
        icon: 'list-alt',
        weight: 30,
        schema: FormReviewFormIO.schema(),
      }
    }

    get defaultSchema() {
      return FormReviewFormIO.schema()
    }

    // ── Data Access ───────────────────────────────────────────────────

    _getFormComponents(): Record<string, unknown>[] | undefined {
      const root = this.root
      if (!root) return undefined
      if (root._form?.components) return root._form.components as Record<string, unknown>[]
      if (root.form?.components) return root.form.components as Record<string, unknown>[]
      return undefined
    }

    /**
     * Read the wizard's accumulated submission data.
     *
     * Tries all known Form.io data stores in order:
     * 1. root._data  — the Wizard's internal flat data object (most reliable;
     *                  updated synchronously as the user fills fields)
     * 2. root.submission.data / root._submission.data — pre-populated / existing
     * 3. root.data getter — aggregates page data, works for non-wizard forms
     * 4. Walk root.pages[] — direct per-page component data as last resort
     */
    _getSubmissionData(): Record<string, unknown> {
      const root = this.root

      const isValid = (v: unknown): v is Record<string, unknown> =>
        v != null &&
        typeof v === 'object' &&
        !Array.isArray(v) &&
        Object.keys(v as object).length > 0

      // 1. root._data — internal flat store updated on every field change
      if (isValid((root as any)?._data)) return (root as any)._data

      // 2. root.submission.data — set when wizard receives an existing submission
      const subData = root?.submission?.data ?? (root as any)?._submission?.data
      if (isValid(subData)) return subData as Record<string, unknown>

      // 3. root.data getter
      if (isValid(root?.data)) return root.data as Record<string, unknown>

      // 4. Walk wizard pages and merge
      const pages: any[] = (root as any)?.pages ?? []
      if (pages.length > 0) {
        const merged: Record<string, unknown> = {}
        for (const page of pages) {
          const pd = (page as any)?._data ?? (page as any)?.data
          if (pd && typeof pd === 'object' && !Array.isArray(pd)) {
            Object.assign(merged, pd)
          }
        }
        if (Object.keys(merged).length > 0) return merged
      }

      return {}
    }

    _resolveSections(): ResolvedReviewSection[] {
      const c = this.component
      return resolveSections(
        {
          sections: c.sections || [],
          showExpandAll: c.showExpandAll,
          emptyValueText: c.emptyValueText,
          defaultSectionExpanded: c.defaultSectionExpanded,
        },
        this._getFormComponents(),
        this._getSubmissionData(),
      )
    }

    _isSectionExpanded(sectionKey: string, defaultExpanded: boolean): boolean {
      if (!this._sectionStates.has(sectionKey)) {
        this._sectionStates.set(sectionKey, defaultExpanded)
      }
      return this._sectionStates.get(sectionKey)!
    }

    _syncSensitiveItems(sections: ResolvedReviewSection[]) {
      const nextSensitiveItems = new Map<string, ReviewSensitiveValue>()

      for (const section of sections) {
        for (const item of section.items) {
          if (item.reviewKey && item.sensitiveValue) {
            nextSensitiveItems.set(item.reviewKey, item.sensitiveValue)
          }
        }
      }

      this._sensitiveItems = nextSensitiveItems

      for (const reviewKey of Array.from(this._sensitiveItemStates.keys())) {
        const sensitiveValue = nextSensitiveItems.get(reviewKey)
        if (!sensitiveValue || !sensitiveValue.isToggleable) {
          this._sensitiveItemStates.delete(reviewKey)
        }
      }
    }

    _isSensitiveItemRevealed(reviewKey: string): boolean {
      return this._sensitiveItemStates.get(reviewKey) === true
    }

    // ── HTML Builders ─────────────────────────────────────────────────

    _escapeHtml(str: string): string {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
    }

    _getColClass(columns: number): string {
      switch (columns) {
        case 1:  return 'col-12'
        case 3:  return 'col-md-4'
        case 4:  return 'col-md-3'
        default: return 'col-md-6'
      }
    }

    /**
     * Recursively render structured nested entries for referenced form objects.
     * Produces a nested list of key/value pairs supporting arbitrary depth.
     */
    _renderNestedEntries(entries: NestedReviewEntry[], depth: number = 0): string {
      const indentClass = depth > 0 ? ' form-review-nested-indent' : ''
      return (
        '<ul class="form-review-nested-list' + indentClass + '">' +
        entries
          .map((entry) => {
            if (entry.nestedItems) {
              // This entry is itself a nested object — recurse
              return (
                '<li class="form-review-nested-entry form-review-nested-entry--group">' +
                '<span class="form-review-nested-key">' + this._escapeHtml(entry.label) + '</span>' +
                this._renderNestedEntries(entry.nestedItems, depth + 1) +
                '</li>'
              )
            }
            let valueHtml: string
            if (entry.isBoolean) {
              const isChecked = entry.booleanValue === true
              const iconClass = isChecked ? 'fa fa-check-square-o' : 'fa fa-square-o'
              const boolClass = isChecked ? 'form-review-bool-icon--checked' : 'form-review-bool-icon--unchecked'
              valueHtml = '<i class="' + iconClass + ' ' + boolClass + '"></i> ' + this._escapeHtml(entry.value)
            } else {
              valueHtml = this._escapeHtml(entry.value)
            }
            const emptyClass = entry.isEmpty ? ' form-review-item-value--empty' : ''
            return (
              '<li class="form-review-nested-entry">' +
              '<span class="form-review-nested-key">' + this._escapeHtml(entry.label) + '</span>' +
              '<span class="form-review-nested-value' + emptyClass + '">' + valueHtml + '</span>' +
              '</li>'
            )
          })
          .join('') +
        '</ul>'
      )
    }

    _renderSensitiveValue(item: ResolvedReviewItem, sensitiveValue: ReviewSensitiveValue): string {
      const reviewKey = item.reviewKey
      const revealed = !!(reviewKey && sensitiveValue.isToggleable && this._isSensitiveItemRevealed(reviewKey))
      const visibleText = revealed ? sensitiveValue.fullText : sensitiveValue.defaultText

      if (!reviewKey || !sensitiveValue.isToggleable) {
        return this._escapeHtml(visibleText)
      }

      const safeKey = this._escapeHtml(reviewKey)
      const toggleLabel = revealed ? 'Hide SSN / ITIN' : 'Show SSN / ITIN'
      const safeToggleLabel = this._escapeHtml(toggleLabel)
      const iconClass = revealed ? 'fa fa-eye-slash' : 'fa fa-eye'

      return (
        '<span class="form-review-sensitive-value">' +
        '<span data-review-sensitive-value="' + safeKey + '">' + this._escapeHtml(visibleText) + '</span>' +
        '<button type="button" class="form-review-sensitive-toggle" data-review-sensitive-toggle="' + safeKey + '"' +
        ' aria-label="' + safeToggleLabel + '" aria-pressed="' + revealed + '" title="' + safeToggleLabel + '">' +
        '<i class="' + iconClass + '" data-review-sensitive-icon="' + safeKey + '"></i>' +
        '</button>' +
        '</span>'
      )
    }

    _renderItem(item: ResolvedReviewItem, colClass: string): string {
      // Referenced form / nested object — always full width, rendered as a structured list
      if (item.isObject) {
        const nestedHtml =
          item.nestedItems && item.nestedItems.length > 0
            ? this._renderNestedEntries(item.nestedItems)
            : '<span class="form-review-item-value--empty">' + this._escapeHtml('\u2014') + '</span>'
        return (
          '<div class="col-12 mb-3">' +
          '<div class="form-review-item-label">' + this._escapeHtml(item.label) + '</div>' +
          '<div class="form-review-nested-object">' + nestedHtml + '</div>' +
          '</div>'
        )
      }

      const emptyClass = item.isEmpty ? ' form-review-item-value--empty' : ''
      const sensitiveValue = item.reviewKey
        ? this._sensitiveItems.get(item.reviewKey) ?? item.sensitiveValue
        : item.sensitiveValue
      let valueHtml: string
      if (sensitiveValue) {
        valueHtml = this._renderSensitiveValue(item, sensitiveValue)
      } else if (item.isBoolean) {
        const isChecked = item.value !== 'No' && item.value !== 'False' && item.value !== 'false'
        const iconClass = isChecked ? 'fa fa-check-square-o' : 'fa fa-square-o'
        const boolClass = isChecked ? 'form-review-bool-icon--checked' : 'form-review-bool-icon--unchecked'
        valueHtml = '<i class="' + iconClass + ' ' + boolClass + '"></i>' + this._escapeHtml(item.value)
      } else {
        valueHtml = this._escapeHtml(item.value)
      }
      return (
        '<div class="' + colClass + ' mb-3">' +
        '<div class="form-review-item-label">' +
        this._escapeHtml(item.label) +
        '</div>' +
        '<div class="form-review-item-value' + emptyClass + '">' + valueHtml + '</div>' +
        '</div>'
      )
    }

    _renderSection(section: ResolvedReviewSection): string {
      const expanded = this._isSectionExpanded(section.sectionKey, section.defaultExpanded)
      const colClass = this._getColClass(section.columns)
      const safeKey = this._escapeHtml(section.sectionKey)
      const safeTitle = this._escapeHtml(section.title)

      const itemsHtml =
        section.items.length > 0
          ? '<div class="row">' +
            section.items.map((item) => this._renderItem(item, colClass)).join('') +
            '</div>'
          : '<p class="form-review-empty-text">No fields configured for this section.</p>'

      if (!section.collapsible) {
        return (
          '<div class="form-review-section">' +
          '<div class="form-review-section-header--static">' +
          '<h5 class="form-review-section-title">' + safeTitle + '</h5>' +
          '</div>' +
          '<div class="form-review-section-body">' + itemsHtml + '</div>' +
          '</div>'
        )
      }

      const hiddenClass = expanded ? '' : ' form-review-section-body--hidden'
      const iconClass = expanded ? 'fa fa-minus-square-o' : 'fa fa-plus-square-o'

      return (
        '<div class="form-review-section">' +
        '<div class="form-review-section-header" role="button" tabindex="0"' +
        ' aria-expanded="' + expanded + '" data-review-toggle="' + safeKey + '">' +
        '<h5 class="form-review-section-title">' +
        '<span>' + safeTitle + '</span>' +
        '<i class="' + iconClass + '" data-review-icon="' + safeKey + '"></i>' +
        '</h5></div>' +
        '<div class="form-review-section-body' + hiddenClass + '" data-review-body="' + safeKey + '">' +
        itemsHtml +
        '</div>' +
        '</div>'
      )
    }

    _buildContent(sections: ResolvedReviewSection[]): string {
      const c = this.component
      const showExpandAll = c.showExpandAll !== false && sections.some((s) => s.collapsible)

      const description = c.description
        ? '<p class="form-review-description">' + this._escapeHtml(c.description) + '</p>'
        : ''

      const expandAllBtn = showExpandAll
        ? '<div class="form-review-toolbar">' +
          '<button type="button" class="btn btn-link btn-sm p-0" data-review-expand-all>' +
          'Expand All</button></div>'
        : ''

      const sectionsHtml =
        sections.length > 0
          ? sections.map((s) => this._renderSection(s)).join('')
          : '<p class="form-review-empty-text">No review sections configured.</p>'

      return description + expandAllBtn + sectionsHtml
    }

    // ── Render ────────────────────────────────────────────────────────

    /**
     * Returns a minimal skeleton only — no data access.
     * All data resolution and HTML generation happens in attach().
     */
    render() {
      return super.render('<div class="form-review-component"></div>')
    }

    // ── Attach ────────────────────────────────────────────────────────

    /**
     * attach() — synchronous content inject only.
     *
     * Listeners are registered in init() (not here) so they are always in place
     * before nextPage fires, regardless of render/attach ordering.
     *
     * The synchronous inject here covers:
     *  - Editing an existing submission (data pre-populated before first render)
     *  - Back-navigation (data already in root._data from previous visit)
     *
     * The nextPage listener registered in init() covers:
     *  - First forward navigation to this page (nextPage fires after attach,
     *    at which point root._data is fully populated)
     */
    attach(element: HTMLElement) {
      const result = super.attach(element)
      this._injectContent(element)
      return result
    }

    /**
     * Resolves live wizard data, builds full section HTML, injects into
     * the skeleton container, and wires all interaction handlers.
     */
    _injectContent(element: HTMLElement) {
      const container = element.querySelector('.form-review-component') as HTMLElement | null
      if (!container) return

      const sections = this._resolveSections()
      this._syncSensitiveItems(sections)
      container.innerHTML = this._buildContent(sections)

      // Wire collapse toggles
      for (const section of sections) {
        if (!section.collapsible) continue
        const header = container.querySelector(
          '[data-review-toggle="' + section.sectionKey + '"]',
        ) as HTMLElement | null
        if (!header) continue

        const onToggle = () => this._toggleSection(container, section.sectionKey)
        header.addEventListener('click', onToggle)
        header.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle() }
        })
      }

      // Wire Expand All / Collapse All button
      const expandBtn = container.querySelector('[data-review-expand-all]') as HTMLElement | null
      if (expandBtn) {
        expandBtn.addEventListener('click', () => {
          const collapsible = sections.filter((s) => s.collapsible)
          const allExpanded = collapsible.every((s) => this._sectionStates.get(s.sectionKey) !== false)
          const target = !allExpanded
          for (const s of collapsible) this._setSectionExpanded(container, s.sectionKey, target)
          expandBtn.textContent = target ? 'Collapse All' : 'Expand All'
        })
      }

      for (const toggleEl of Array.from(container.querySelectorAll('[data-review-sensitive-toggle]'))) {
        toggleEl.addEventListener('click', (event) => {
          event.preventDefault()
          event.stopPropagation()

          const reviewKey = (toggleEl as HTMLElement).getAttribute('data-review-sensitive-toggle')
          if (reviewKey) this._toggleSensitiveItem(container, reviewKey)
        })
      }
    }

    _toggleSection(container: HTMLElement, sectionKey: string) {
      const current = this._sectionStates.get(sectionKey) !== false
      this._setSectionExpanded(container, sectionKey, !current)
    }

    _setSectionExpanded(container: HTMLElement, sectionKey: string, expanded: boolean) {
      const body   = container.querySelector('[data-review-body="'   + sectionKey + '"]') as HTMLElement | null
      const icon   = container.querySelector('[data-review-icon="'   + sectionKey + '"]') as HTMLElement | null
      const header = container.querySelector('[data-review-toggle="' + sectionKey + '"]') as HTMLElement | null

      if (body)   body.classList.toggle('form-review-section-body--hidden', !expanded)
      if (icon)   { icon.classList.toggle('fa-minus-square-o', expanded); icon.classList.toggle('fa-plus-square-o', !expanded) }
      if (header) header.setAttribute('aria-expanded', String(expanded))

      this._sectionStates.set(sectionKey, expanded)
    }

    _toggleSensitiveItem(container: HTMLElement, reviewKey: string) {
      const sensitiveValue = this._sensitiveItems.get(reviewKey)
      if (!sensitiveValue || !sensitiveValue.isToggleable) return

      this._setSensitiveItemRevealed(container, reviewKey, !this._isSensitiveItemRevealed(reviewKey))
    }

    _setSensitiveItemRevealed(container: HTMLElement, reviewKey: string, revealed: boolean) {
      const sensitiveValue = this._sensitiveItems.get(reviewKey)
      if (!sensitiveValue) return

      const valueEl = container.querySelector('[data-review-sensitive-value="' + reviewKey + '"]') as HTMLElement | null
      const iconEl = container.querySelector('[data-review-sensitive-icon="' + reviewKey + '"]') as HTMLElement | null
      const buttonEl = container.querySelector('[data-review-sensitive-toggle="' + reviewKey + '"]') as HTMLButtonElement | null
      const toggleLabel = revealed ? 'Hide SSN / ITIN' : 'Show SSN / ITIN'

      if (valueEl) {
        valueEl.textContent = revealed ? sensitiveValue.fullText : sensitiveValue.defaultText
      }

      if (iconEl) {
        iconEl.className = revealed ? 'fa fa-eye-slash' : 'fa fa-eye'
      }

      if (buttonEl) {
        buttonEl.setAttribute('aria-label', toggleLabel)
        buttonEl.setAttribute('aria-pressed', String(revealed))
        buttonEl.setAttribute('title', toggleLabel)
      }

      this._sensitiveItemStates.set(reviewKey, revealed)
    }

    // ── Cleanup ───────────────────────────────────────────────────────

    destroy() {
      if (this._changeTimer) {
        clearTimeout(this._changeTimer)
        this._changeTimer = null
      }
      const root = this.root
      if (root && typeof root.off === 'function') {
        if (this._onPageBound) {
          root.off('nextPage', this._onPageBound)
          root.off('prevPage', this._onPageBound)
          root.off('wizardPageSelected', this._onPageBound)
        }
        if (this._onChangeBound) {
          root.off('change', this._onChangeBound)
        }
      }
      this._onPageBound = null
      this._onChangeBound = null
      this._sectionStates.clear()
      this._sensitiveItemStates.clear()
      this._sensitiveItems.clear()
      super.destroy()
    }
  }
}

export default createFormReviewClass
