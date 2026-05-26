/**
 * Register the Content Management designer (builder-side) component.
 *
 * Reference pattern: registerDocumentViewer (register-document-viewer.ts)
 *
 * Provides a lightweight builder preview showing the configured Payload CMS
 * collection and render mode — no actual API fetch in the designer.
 */

import {
  ContentManagementComponent,
  CONTENT_MANAGEMENT_TYPE,
} from '../components/ContentManagement'
import type { FormioComponents } from './types'

export async function registerContentManagement(
  Components: FormioComponents,
): Promise<void> {
  const FieldComponent = (Components.components as any).field as any

  class ContentManagement extends FieldComponent {
    static schema(...extend: any[]) {
      return FieldComponent.schema(
        ContentManagementComponent.schema(),
        ...extend,
      )
    }

    static get builderInfo() {
      return ContentManagementComponent.builderInfo
    }

    static editForm() {
      return ContentManagementComponent.editForm()
    }

    get defaultSchema() {
      return ContentManagement.schema()
    }

    // Lightweight designer preview — no API fetch, just config summary.
    render() {
      const c = this.component
      const label: string = c.label || 'Content Management'
      const collection: string = c.collectionSlug || '(not configured)'
      const contentId: string = c.contentId || ''
      const contentSlug: string = c.contentSlug || ''
      const mode: string = c.renderMode || 'richText'
      const cacheEnabled: boolean = c.enableCache !== false
      const contentField: string = c.contentFieldPath || (mode === 'html' ? 'htmlContent' : 'content')

      let target = collection
      if (contentId) target += ` / ${contentId}`
      else if (contentSlug) target += ` / slug: ${contentSlug}`

      return super.render(`
        <div class="panel panel-info">
          <div class="panel-heading" style="padding:8px 12px;">
            <small class="text-uppercase" style="letter-spacing:.04em;font-weight:600;">
              <i class="fa fa-file-text-o"></i> Content Management
            </small>
          </div>
          <div class="panel-body" style="padding:12px;">
            <p class="help-block small" style="margin-bottom:4px;">
              <strong>Label:</strong> ${label}
            </p>
            <p class="help-block small" style="margin-bottom:4px;">
              <strong>Collection:</strong> ${target}
            </p>
            <p class="help-block small" style="margin-bottom:0;">
              <strong>Render:</strong> ${mode}
              &nbsp;|&nbsp;
              <strong>Field:</strong> ${contentField}
              &nbsp;|&nbsp;
              <strong>Cache:</strong> ${cacheEnabled ? 'On' : 'Off'}
            </p>
          </div>
        </div>
      `)
    }
  }

  Components.setComponent(CONTENT_MANAGEMENT_TYPE, ContentManagement as never)
}
