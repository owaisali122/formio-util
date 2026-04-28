/**
 * Register the Form Review designer (builder-side) component.
 *
 * Reference pattern: registerProgressBar (register-progress-bar.ts)
 */

import { FormReviewComponent, FORM_REVIEW_TYPE } from '../components/FormReview'
import type { FormioComponents } from './types'

export async function registerFormReview(Components: FormioComponents): Promise<void> {
  const FieldComponent = (Components.components as any).field as any

  class FormReview extends FieldComponent {
    static schema(...extend: any[]) {
      return FieldComponent.schema(FormReviewComponent.schema(), ...extend)
    }

    static get builderInfo() {
      return FormReviewComponent.builderInfo
    }

    static editForm() {
      return FormReviewComponent.editForm()
    }

    get defaultSchema() {
      return FormReview.schema()
    }

    render() {
      const c = this.component
      const sections = c.sections || []
      const sectionCount = sections.length
      const totalFields = sections.reduce((sum: number, s: { itemsJson?: string; items?: unknown[] }) => {
        if (s.itemsJson) {
          try { return sum + (JSON.parse(s.itemsJson) as unknown[]).length } catch { return sum }
        }
        return sum + (s.items?.length || 0)
      }, 0)

      // Designer preview: show a lightweight summary placeholder
      let sectionsPreview = ''
      if (sectionCount === 0) {
        sectionsPreview = '<div class="text-muted fst-italic">No review sections configured. Open settings to add sections.</div>'
      } else {
        sectionsPreview = sections
          .map((s: { title?: string; sectionKey?: string; itemsJson?: string; items?: unknown[] }) => {
            let itemCount = s.items?.length || 0
            if (!itemCount && s.itemsJson) {
              try { itemCount = (JSON.parse(s.itemsJson) as unknown[]).length } catch { /* ok */ }
            }
            return `<div class="d-flex justify-content-between border-bottom py-1">
              <span>${s.title || 'Untitled Section'}</span>
              <span class="badge bg-secondary">${itemCount} field${itemCount !== 1 ? 's' : ''}</span>
            </div>`
          })
          .join('')
      }

      return super.render(`
        <div class="border border-2 border-primary rounded p-3" style="border-style:dashed !important;">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span class="fw-bold text-primary text-uppercase small">
              <i class="fa fa-list-alt me-1"></i> Form Review
            </span>
            <span class="badge bg-primary">${sectionCount} section${sectionCount !== 1 ? 's' : ''} &middot; ${totalFields} field${totalFields !== 1 ? 's' : ''}</span>
          </div>
          ${sectionsPreview}
        </div>
      `)
    }
  }

  Components.setComponent(FORM_REVIEW_TYPE, FormReview as never)
}
