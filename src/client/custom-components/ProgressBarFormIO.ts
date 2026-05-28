/**
 * FormIO: Progress Bar Renderer Runtime Component
 *
 * Extends FieldComponent to render an animated progress bar inside the form.
 * Supports three modes:
 *
 *  - manual : a fixed percentage configured in the builder
 *  - values : reads two data keys (current + total) and calculates
 *             (current / total) × 100 live on form change events
 *  - auto   : reads the parent wizard's page index and page count,
 *             calculates ((page + 1) / totalPages) × 100 on page-change events
 *
 * Reference pattern: createPopupComponentClass (PopupComponentFormIO.ts)
 */

export function createProgressBarClass(FieldComponent: any) {
  return class ProgressBarFormIO extends FieldComponent {
    // Bound listeners stored so they can be removed on destroy
    _onChangeBound: (() => void) | null = null
    _onPageBound: (() => void) | null = null

    static schema(...extend: any[]) {
      return FieldComponent.schema(
        {
          type: 'progressBar',
          label: 'Progress Bar',
          key: 'progressBar',
          input: false,
          progressMode: 'manual',
          manualValue: 50,
          currentValueKey: '',
          totalValueKey: '',
          barColor: 'primary',
          barHeight: '20px',
          showPercentLabel: true,
          animated: true,
          showStepText: false,
          stepTextPosition: 'top-left',
        },
        ...extend,
      )
    }

    static get builderInfo() {
      return {
        title: 'Progress Bar',
        group: 'basic',
        icon: 'tasks',
        weight: 36,
        schema: ProgressBarFormIO.schema(),
      }
    }

    get defaultSchema() {
      return ProgressBarFormIO.schema()
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    /** Clamp a value to [0, 100]. */
    _clamp(v: number): number {
      return Math.min(100, Math.max(0, isNaN(v) ? 0 : v))
    }

    /** Read the current progress percentage based on the configured mode. */
    _getCurrentPct(): number {
      const c = this.component

      // values mode: (currentKey / totalKey) × 100
      if (c.progressMode === 'values') {
        const data = this.root?.data ?? this.data ?? {}
        const current = Number(c.currentValueKey ? data[c.currentValueKey] : 0) || 0
        const total = Number(c.totalValueKey ? data[c.totalValueKey] : 0)
        if (total <= 0) return 0
        return this._clamp((current / total) * 100)
      }

      // auto mode: ((page + 1) / totalPages) × 100
      if (c.progressMode === 'auto') {
        const wizard = this.root
        const page: number = wizard?.page ?? 0
        const total: number = Array.isArray(wizard?.pages) ? wizard.pages.length : 1
        return this._clamp(((page + 1) / Math.max(total, 1)) * 100)
      }

      // manual (default)
      return this._clamp(Number(c.manualValue) || 0)
    }

    /** Build the inner bar CSS class string (no striped; animation is via inline transition). */
    _barClasses(): string {
      const color: string = this.component.barColor || 'primary'
      return `progress-bar bg-${color}`
    }

    /** Get the current step and total steps for step text display. */
    _getStepInfo(): { current: number; total: number } {
      const c = this.component

      // If custom values provided, use them
      const customCurrent = Number(c.currentStep)
      const customTotal = Number(c.totalSteps)

      if (customCurrent > 0 && customTotal > 0) {
        const clamped = Math.min(customCurrent, customTotal)
        return { current: clamped, total: customTotal }
      }

      // Fallback to wizard page info
      const wizard = this.root
      const page: number = (wizard?.page ?? 0) + 1
      const total: number = Array.isArray(wizard?.pages) ? wizard.pages.length : 1
      return { current: Math.min(page, total), total: Math.max(total, 1) }
    }

    /** Get alignment class for step text position. */
    _stepTextAlignClass(): string {
      const pos: string = this.component.stepTextPosition || 'top-left'
      if (pos === 'top-right' || pos === 'bottom-right') return 'text-end'
      return 'text-start'
    }

    // ── Render ──────────────────────────────────────────────────────────────

    render() {
      const c = this.component
      const pct = this._getCurrentPct()
      const height: string = c.barHeight || '20px'
      const showLabel: boolean = !!c.showPercentLabel
      const animated: boolean = !!c.animated
      const transition = animated ? 'transition:width .4s ease-in-out;' : ''

      const showStepText: boolean = !!c.showStepText
      const pos: string = c.stepTextPosition || 'top-left'
      const isTop = pos === 'top-left' || pos === 'top-right'

      let stepTextHtml = ''
      if (showStepText) {
        const { current, total } = this._getStepInfo()
        const alignClass = this._stepTextAlignClass()
        stepTextHtml = `<div ref="progressBarStepText" class="mb-1 mt-1 small fw-semibold ${alignClass}">Step ${current} of ${total}</div>`
      }

      const barHtml = `
        <div ref="progressBarOuter" class="progress" style="height:${height};border-radius:4px;overflow:hidden;">
          <div
            ref="progressBarInner"
            class="${this._barClasses()}"
            role="progressbar"
            style="width:${pct}%;${transition}"
            aria-valuenow="${pct}"
            aria-valuemin="0"
            aria-valuemax="100"
          >${showLabel ? `${pct}%` : ''}</div>
        </div>
      `

      const content = isTop
        ? `${stepTextHtml}${barHtml}`
        : `${barHtml}${stepTextHtml}`

      return super.render(content)
    }

    // ── Attach ──────────────────────────────────────────────────────────────

    attach(element: HTMLElement) {
      const result = super.attach(element)

      this.loadRefs(element, {
        progressBarOuter: 'single',
        progressBarInner: 'single',
        progressBarStepText: 'single',
      })

      // Set the correct initial value immediately after attach
      this._updateBar()

      const root = this.root
      const mode: string = this.component.progressMode || 'manual'

      // values mode: re-compute whenever any form field changes
      if (mode === 'values') {
        this._onChangeBound = () => this._updateBar()
        if (root && typeof root.on === 'function') {
          root.on('change', this._onChangeBound)
        }
      }

      // auto mode: re-compute whenever the wizard navigates to a new page
      if (mode === 'auto') {
        this._onPageBound = () => this._updateBar()
        if (root && typeof root.on === 'function') {
          root.on('nextPage', this._onPageBound)
          root.on('prevPage', this._onPageBound)
          root.on('wizardPageSelected', this._onPageBound)
        }
      }

      return result
    }

    // ── Update bar live ─────────────────────────────────────────────────────

    /** Write the current percentage into the already-attached DOM. */
    _updateBar() {
      const inner = (this.refs as any)?.progressBarInner as HTMLElement | undefined
      if (!inner) return
      const pct = this._getCurrentPct()
      const showLabel: boolean = !!this.component.showPercentLabel
      const animated: boolean = !!this.component.animated
      inner.style.width = `${pct}%`
      inner.style.transition = animated ? 'width .4s ease-in-out' : ''
      inner.setAttribute('aria-valuenow', String(pct))
      inner.textContent = showLabel ? `${pct}%` : ''
      inner.className = this._barClasses()

      // Update step text if enabled
      const stepTextEl = (this.refs as any)?.progressBarStepText as HTMLElement | undefined
      if (stepTextEl && this.component.showStepText) {
        const { current, total } = this._getStepInfo()
        stepTextEl.textContent = `Step ${current} of ${total}`
        stepTextEl.className = `mb-1 mt-1 small fw-semibold ${this._stepTextAlignClass()}`
      }
    }

    // ── Cleanup ──────────────────────────────────────────────────────────────

    destroy() {
      const root = this.root
      if (this._onChangeBound && root && typeof root.off === 'function') {
        root.off('change', this._onChangeBound)
        this._onChangeBound = null
      }
      if (this._onPageBound && root && typeof root.off === 'function') {
        root.off('nextPage', this._onPageBound)
        root.off('prevPage', this._onPageBound)
        root.off('wizardPageSelected', this._onPageBound)
        this._onPageBound = null
      }
      super.destroy()
    }
  }
}

export default createProgressBarClass
