import { FileViewerComponent, FILE_VIEWER_TYPE } from '../components/FileViewer'
import type { FormioComponents } from './types'

export async function registerFileViewer(Components: FormioComponents): Promise<void> {
  const FieldComponent = (Components.components as any).field as any

  class FileViewer extends FieldComponent {
    static schema(...extend: any[]) {
      return FieldComponent.schema(FileViewerComponent.schema(), ...extend)
    }

    static get builderInfo() {
      return FileViewerComponent.builderInfo
    }

    static editForm() {
      return FileViewerComponent.editForm()
    }

    get defaultSchema() {
      return FileViewer.schema()
    }

    render() {
      const iconClass = this.component.viewerIcon || 'fa fa-eye'
      const label = this.component.label || ''
      const labelHtml = label ? `<span style="margin-left:6px;font-size:14px;">${this.t(label)}</span>` : ''

      return super.render(`
        <div ref="fileViewerContainer" class="formio-file-viewer" style="display:inline-block;">
          <span style="display:inline-flex;align-items:center;opacity:0.6;">
            <i class="${iconClass}" style="font-size:1.4em;"></i>${labelHtml}
          </span>
        </div>
      `)
    }
  }

  Components.setComponent(FILE_VIEWER_TYPE, FileViewer as never)
}
