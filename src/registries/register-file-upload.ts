import { FileUploadComponent, FILE_UPLOAD_TYPE } from '../components/FileUpload'
import type { FormioComponents } from './types'

export async function registerFileUpload(Components: FormioComponents): Promise<void> {
  const FieldComponent = (Components.components as any).field as any

  class FileUpload extends FieldComponent {
    static schema(...extend: any[]) {
      return FieldComponent.schema(FileUploadComponent.schema(), ...extend)
    }

    static get builderInfo() {
      return FileUploadComponent.builderInfo
    }

    static editForm() {
      return FileUploadComponent.editForm()
    }

    get defaultSchema() {
      return FileUpload.schema()
    }

    render() {
      const label = this.component.label || 'File Upload'
      const types = this.component.allowedFileTypes || ''
      const maxSize = this.component.maxFileSize || ''
      const multi = this.component.multiple ? 'multiple' : 'single'
      return super.render(`
        <div ref="fileUploadContainer" class="formio-file-upload">
          <div style="border:2px dashed #ccc;border-radius:6px;padding:24px;text-align:center;color:#888;">
            <div style="font-size:24px;margin-bottom:8px;"><i class="fa fa-upload"></i></div>
            <div style="font-weight:600;margin-bottom:4px;">${this.t(label)}</div>
            <div style="font-size:12px;">
              ${types ? `Allowed: ${types}` : ''}${types && maxSize ? ' &bull; ' : ''}${maxSize ? `Max: ${maxSize}` : ''}
              &bull; ${multi} file
            </div>
          </div>
        </div>
      `)
    }
  }

  Components.setComponent(FILE_UPLOAD_TYPE, FileUpload as never)
}
