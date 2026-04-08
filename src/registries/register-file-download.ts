import { FileDownloadComponent, FILE_DOWNLOAD_TYPE } from '../components/FileDownload'
import type { FormioComponents } from './types'

export async function registerFileDownload(Components: FormioComponents): Promise<void> {
  const FieldComponent = (Components.components as any).field as any

  class FileDownload extends FieldComponent {
    static schema(...extend: any[]) {
      return FieldComponent.schema(FileDownloadComponent.schema(), ...extend)
    }

    static get builderInfo() {
      return FileDownloadComponent.builderInfo
    }

    static editForm() {
      return FileDownloadComponent.editForm()
    }

    get defaultSchema() {
      return FileDownload.schema()
    }

    render() {
      const iconClass = this.component.downloadIcon || 'fa fa-download'
      const label = this.component.label || ''
      const labelHtml = label ? `<span style="margin-left:6px;font-size:14px;">${this.t(label)}</span>` : ''

      return super.render(`
        <div ref="fileDownloadContainer" class="formio-file-download" style="display:inline-block;">
          <span style="display:inline-flex;align-items:center;opacity:0.6;">
            <i class="${iconClass}" style="font-size:1.4em;"></i>${labelHtml}
          </span>
        </div>
      `)
    }
  }

  Components.setComponent(FILE_DOWNLOAD_TYPE, FileDownload as never)
}
