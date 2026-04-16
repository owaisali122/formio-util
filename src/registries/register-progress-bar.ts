/**
 * Register the Progress Bar designer (builder-side) component.
 *
 * Reference pattern: registerPopupComponent (register-popup-component.ts)
 */

import { ProgressBarComponent, PROGRESS_BAR_TYPE } from '../components/ProgressBar'
import type { FormioComponents } from './types'

export async function registerProgressBar(Components: FormioComponents): Promise<void> {
  const FieldComponent = (Components.components as any).field as any

  class ProgressBar extends FieldComponent {
    static schema(...extend: any[]) {
      return FieldComponent.schema(ProgressBarComponent.schema(), ...extend)
    }

    static get builderInfo() {
      return ProgressBarComponent.builderInfo
    }

    static editForm() {
      return ProgressBarComponent.editForm()
    }

    get defaultSchema() {
      return ProgressBar.schema()
    }

    render() {
      const c = this.component
      const pct = Math.min(100, Math.max(0, Number(c.manualValue) || 50))
      const color: string = c.barColor || 'primary'
      const height: string = c.barHeight || '20px'
      const showLabel: boolean = !!c.showPercentLabel
      const animated: boolean = !!c.animated

      const barClasses = ['progress-bar', `bg-${color}`].filter(Boolean).join(' ')
      const transition = animated ? 'transition:width .4s ease-in-out;' : ''

      const mode: string = c.progressMode || 'manual'
      let modeLabel: string
      if (mode === 'values') {
        modeLabel = `Values: "${c.currentValueKey || '?'}" ÷ "${c.totalValueKey || '?'}"`
      } else if (mode === 'auto') {
        modeLabel = 'Auto (wizard pages)'
      } else {
        modeLabel = `Manual: ${pct}%`
      }

      // Designer preview: non-interactive static bar + metadata strip
      return super.render(`
        <div style="border:2px dashed #a5b4fc;border-radius:6px;padding:12px 14px;background:#eef2ff;">
          <div style="margin-bottom:8px;font-size:11px;color:#6366f1;font-weight:600;text-transform:uppercase;letter-spacing:.04em;">
            Progress Bar — ${modeLabel}
          </div>
          <div class="progress" style="height:${height};border-radius:4px;overflow:hidden;">
            <div
              class="${barClasses}"
              role="progressbar"
              style="width:${pct}%;${transition}"
              aria-valuenow="${pct}"
              aria-valuemin="0"
              aria-valuemax="100"
            >${showLabel ? `${pct}%` : ''}</div>
          </div>
        </div>
      `)
    }
  }

  Components.setComponent(PROGRESS_BAR_TYPE, ProgressBar as never)
}
