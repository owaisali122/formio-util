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
      const labelHtml = label ? `<span class="ms-1 small">${this.t(label)}</span>` : ''

      return super.render(`
        <div ref="fileDownloadContainer" class="formio-file-download d-inline-block">
          <span class="d-inline-flex align-items-center opacity-50">
            <i class="${iconClass} fs-5"></i>${labelHtml}
          </span>
        </div>
      `)
    }
  }

  Components.setComponent(FILE_DOWNLOAD_TYPE, FileDownload as never)
}
