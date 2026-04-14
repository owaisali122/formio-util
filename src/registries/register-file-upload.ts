import { FileUploaderComponent, FILE_UPLOADER_TYPE } from '../components/FileUpload'
import type { FormioComponents } from './types'

export async function registerFileUploader(Components: FormioComponents): Promise<void> {
  const FieldComponent = (Components.components as any).field as any

  class FileUploader extends FieldComponent {
    static schema(...extend: any[]) {
      return FieldComponent.schema(FileUploaderComponent.schema(), ...extend)
    }

    static get builderInfo() {
      return FileUploaderComponent.builderInfo
    }

    static editForm() {
      return FileUploaderComponent.editForm()
    }

    get defaultSchema() {
      return FileUploader.schema()
    }

    render() {
      const iconClass = this.component.uploadIcon || 'fa fa-upload'
      const label = this.component.uploadButtonLabel || ''

      return super.render(`
        <div ref="fileUploaderContainer" class="formio-file-uploader" style="display:inline-block;">
          <button type="button" class="btn btn-outline-secondary btn-sm" style="pointer-events:none;" disabled>
            <i class="${iconClass}"></i>${label ? ' ' + this.t(label) : ''}
          </button>
        </div>
      `)
    }
  }

  Components.setComponent(FILE_UPLOADER_TYPE, FileUploader as never)
}
