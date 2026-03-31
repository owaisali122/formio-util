/**
 * FormIO: File Uploader Renderer Component
 *
 * Renders a compact icon-button file uploader inside a Form.io field.
 * Works standalone and inside table/grid/list rows.
 *
 * Schema properties (from designer):
 *   type: 'fileUploader', uploadButtonLabel, uploadIcon, multiple,
 *   allowedFileTypes, acceptedExtensions, maxFileSize, maxFiles,
 *   deferredUpload, allowRemove, showFileList, showFileSize, scanEnabled
 */

import { FileUploaderComponent, FILE_UPLOADER_TYPE } from '../../components/FileUploader'

interface SelectedFile {
  name: string
  size: number
  type: string
  file?: File
  url?: string
  status: 'pending' | 'success' | 'error'
  error?: string
}

export default function createFileUploaderClass(FieldComponent: any) {
  return class FileUploaderFormIO extends FieldComponent {
    fileInput: HTMLInputElement | null = null
    selectedFiles: SelectedFile[] = []
    _syncing: boolean = false
    _lastValueJSON: string = ''

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
      return FileUploaderFormIO.schema()
    }

    get isMultiple(): boolean {
      return this.component?.multiple ?? false
    }

    get maxFiles(): number {
      return this.component?.maxFiles ?? 1
    }

    get acceptedExtensions(): string {
      return this.component?.acceptedExtensions || ''
    }

    get allowedFileTypes(): string {
      return this.component?.allowedFileTypes || ''
    }

    get maxFileSizeBytes(): number {
      const raw = this.component?.maxFileSize || '10MB'
      const match = raw.match(/^(\d+(?:\.\d+)?)\s*(KB|MB|GB)?$/i)
      if (!match) return 10 * 1024 * 1024
      const num = parseFloat(match[1])
      const unit = (match[2] || 'MB').toUpperCase()
      if (unit === 'KB') return num * 1024
      if (unit === 'GB') return num * 1024 * 1024 * 1024
      return num * 1024 * 1024
    }

    constructor(component: any, options: any, data: any) {
      super(component, options, data)
      const key = component.key
      if (data && key && Array.isArray(data[key])) {
        this.selectedFiles = data[key]
          .filter((v: any) => v)
          .map((v: any) => ({
            name: v.name || 'file',
            size: v.size || 0,
            type: v.type || '',
            url: v.url,
            status: 'success' as const,
          }))
      }
    }

    getValue() {
      return this.selectedFiles
        .filter((f) => f.status !== 'error')
        .map((f) => ({
          name: f.name,
          size: f.size,
          type: f.type,
          ...(f.url ? { url: f.url } : {}),
        }))
    }

    setValue(value: any, flags?: any) {
      if (this._syncing) return super.setValue(value, flags)
      if (value != null && value !== '') {
        const valueJSON = JSON.stringify(value)
        if (valueJSON === this._lastValueJSON) return super.setValue(value, flags)
        this._lastValueJSON = valueJSON

        const arr = Array.isArray(value) ? value : [value]
        this.selectedFiles = arr
          .filter((v: any) => v)
          .map((v: any) => ({
            name: v.name || 'file',
            size: v.size || 0,
            type: v.type || '',
            url: v.url,
            status: 'success' as const,
          }))
        this.updateFileListUI()
      }
      return super.setValue(value, flags)
    }

    isEmpty(value?: any) {
      const val = value ?? this.dataValue
      if (Array.isArray(val)) return val.length === 0
      return !val
    }

    checkComponentValidity(data?: any, dirty?: boolean, rowData?: any, options?: any) {
      if (this.component?.validate?.required) {
        if (this.selectedFiles.length === 0 || !this.selectedFiles.some((f) => f.status !== 'error')) {
          const msg = this.component.validate.customMessage || 'File is required'
          this.setCustomValidity(msg)
          return false
        }
      }
      this.setCustomValidity('')
      return true
    }

    syncFormValue() {
      const key = this.component?.key
      const val = this.getValue()
      if (key && this.data) this.data[key] = val
      if (key && this.root?.data && this.data === this.root.data) this.root.data[key] = val
      this._syncing = true
      super.dataValue = val
      this.triggerChange()
      this._syncing = false
    }

    render() {
      const iconClass = this.component.uploadIcon || 'fa fa-upload'
      const label = this.component.uploadButtonLabel || ''
      const accept = this.acceptedExtensions || this.allowedFileTypes || ''

      return super.render(`
        <div ref="fileUploaderContainer" class="formio-file-uploader" style="display:inline-block;">
          <button type="button" ref="uploadBtn" class="btn btn-outline-secondary btn-sm" title="${label || 'Upload file'}">
            <i class="${iconClass}"></i>${label ? ' ' + this.t(label) : ''}
          </button>
          <input ref="fileInput" type="file"
                 ${this.isMultiple ? 'multiple' : ''}
                 ${accept ? 'accept="' + accept + '"' : ''}
                 style="display:none;" />
          <div ref="fileList" class="formio-file-uploader-list"></div>
        </div>
      `)
    }

    attach(element: HTMLElement) {
      const result = super.attach(element)
      this.loadRefs(element, {
        fileUploaderContainer: 'single',
        uploadBtn: 'single',
        fileInput: 'single',
        fileList: 'single',
      })

      const btn = (this.refs as any)?.uploadBtn as HTMLElement | undefined
      const fileInput = (this.refs as any)?.fileInput as HTMLInputElement | undefined

      if (btn && fileInput) {
        this.fileInput = fileInput

        this.addEventListener(btn, 'click', (e: Event) => {
          e.preventDefault()
          fileInput.click()
        })

        this.addEventListener(fileInput, 'change', () => {
          const files = fileInput.files
          if (files && files.length > 0) {
            this.handleFiles(files)
            fileInput.value = ''
          }
        })
      }

      if (this.selectedFiles.length > 0) {
        this.updateFileListUI()
      }

      return result
    }

    handleFiles(fileList: FileList) {
      const files = Array.from(fileList)

      if (!this.isMultiple) {
        this.selectedFiles = []
      }

      const maxFiles = this.maxFiles
      for (const file of files) {
        if (maxFiles > 0 && this.selectedFiles.length >= maxFiles) break

        const error = this.validateFile(file)
        if (error) {
          this.selectedFiles.push({
            name: file.name,
            size: file.size,
            type: file.type,
            status: 'error',
            error,
          })
          continue
        }

        this.selectedFiles.push({
          name: file.name,
          size: file.size,
          type: file.type,
          file,
          url: URL.createObjectURL(file),
          status: 'pending',
        })
      }

      this.updateFileListUI()
      this.syncFormValue()
    }

    validateFile(file: File): string | null {
      if (file.size > this.maxFileSizeBytes) {
        return `File exceeds maximum size of ${this.component?.maxFileSize || '10MB'}.`
      }

      const accepted = this.acceptedExtensions
      if (accepted) {
        const exts = accepted.split(',').map((e: string) => e.trim().toLowerCase())
        const name = file.name.toLowerCase()
        const valid = exts.some((ext: string) => {
          if (ext.startsWith('.')) return name.endsWith(ext)
          return file.type === ext
        })
        if (!valid) return `File type not allowed. Accepted: ${accepted}`
      }

      const mimeTypes = this.allowedFileTypes
      if (mimeTypes) {
        const types = mimeTypes.split(',').map((t: string) => t.trim().toLowerCase())
        const valid = types.some((t: string) => {
          if (t.endsWith('/*')) return file.type.startsWith(t.replace('/*', '/'))
          return file.type === t
        })
        if (!valid) return `File type not allowed. Accepted: ${mimeTypes}`
      }

      return null
    }

    updateFileListUI() {
      const listEl = (this.refs as any)?.fileList as HTMLElement | undefined
      if (!listEl) return

      const showList = this.component?.showFileList ?? true
      if (!showList || this.selectedFiles.length === 0) {
        listEl.innerHTML = ''
        return
      }

      const showSize = this.component?.showFileSize ?? true
      const allowRemove = this.component?.allowRemove ?? true
      listEl.innerHTML = ''

      for (let i = 0; i < this.selectedFiles.length; i++) {
        const f = this.selectedFiles[i]
        const row = document.createElement('div')
        row.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:12px;margin-top:4px;'

        const nameSpan = document.createElement('span')
        nameSpan.style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:160px;'
        nameSpan.title = f.name
        nameSpan.textContent = f.name
        row.appendChild(nameSpan)

        if (showSize && f.size > 0) {
          const sizeSpan = document.createElement('span')
          sizeSpan.style.color = '#aaa'
          sizeSpan.textContent = '(' + this.formatFileSize(f.size) + ')'
          row.appendChild(sizeSpan)
        }

        if (f.error) {
          const errSpan = document.createElement('span')
          errSpan.style.color = '#dc3545'
          errSpan.textContent = f.error
          row.appendChild(errSpan)
        }

        if (allowRemove) {
          const removeBtn = document.createElement('button')
          removeBtn.type = 'button'
          removeBtn.style.cssText = 'background:none;border:none;color:#dc3545;cursor:pointer;font-size:12px;padding:0 2px;'
          removeBtn.innerHTML = '<i class="fa fa-times"></i>'
          removeBtn.title = 'Remove'
          removeBtn.setAttribute('aria-label', `Remove ${f.name}`)
          const idx = i
          removeBtn.addEventListener('click', (e) => {
            e.preventDefault()
            e.stopPropagation()
            this.removeFile(idx)
          })
          row.appendChild(removeBtn)
        }

        listEl.appendChild(row)
      }
    }

    formatFileSize(bytes: number): string {
      if (bytes < 1024) return `${bytes} B`
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    removeFile(index: number) {
      this.selectedFiles.splice(index, 1)
      this.updateFileListUI()
      this.syncFormValue()
    }

    destroy() {
      this.fileInput = null
      this.selectedFiles = []
      super.destroy()
    }
  }
}
