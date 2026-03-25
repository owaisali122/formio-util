/**
 * FormIO: File Upload Renderer Component
 *
 * Renders a drag-and-drop file upload area inside a Form.io field.
 * Uploads files to a configurable endpoint and stores file metadata
 * in the submission data.
 *
 * Schema properties (from designer):
 *   type: 'fileUpload', allowedFileTypes, maxFileSize, multiple,
 *   enableScan, scanProvider, uploadCategory, uploadEndpoint, description
 */

import { FileUploadComponent, FILE_UPLOAD_TYPE } from '../../components/FileUpload'

interface UploadedFile {
  name: string
  size: number
  type: string
  url?: string
  status: 'uploading' | 'success' | 'error' | 'scanning'
  error?: string
  scanStatus?: string
}

export default function createFileUploadClass(FieldComponent: any) {
  return class FileUploadFormIO extends FieldComponent {
    fileInput: HTMLInputElement | null = null
    uploadedFiles: UploadedFile[] = []
    _dragCounter: number = 0
    _syncing: boolean = false
    _lastValueJSON: string = ''
    _attached: boolean = false
    _cachedDropZone: HTMLElement | null = null
    _cachedFileList: HTMLElement | null = null

    static schema(...extend: any[]) {
      return FieldComponent.schema(FileUploadComponent.schema(), ...extend)
    }

    static get builderInfo() {
      return FileUploadComponent.builderInfo
    }

    get defaultSchema() {
      return FileUploadFormIO.schema()
    }

    get isMultiple(): boolean {
      return this.component?.multiple ?? false
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

    get uploadEndpoint(): string {
      return this.component?.uploadEndpoint || ''
    }

    get enableScan(): boolean {
      return this.component?.enableScan ?? false
    }

    constructor(component: any, options: any, data: any) {
      super(component, options, data)
      const key = component.key
      if (data && key && Array.isArray(data[key])) {
        // Normalize stored data: DB objects may lack `status`, so ensure it's set
        this.uploadedFiles = data[key]
          .filter((v: any) => v)
          .map((v: any) => {
            if (typeof v === 'object' && v.url) {
              const fallbackName = decodeURIComponent((v.url || '').split('/').pop() || 'file')
              return {
                name: v.name || fallbackName,
                size: v.size || 0,
                type: v.type || '',
                url: v.url,
                status: v.status || ('success' as const),
                scanStatus: v.scanStatus,
              }
            }
            return v
          })
      }
    }

    getValue() {
      return this.uploadedFiles
        .filter((f) => f.status === 'success' && f.url)
        .map((f) => ({
          url: f.url as string,
          name: f.name,
          size: f.size,
        }))
    }

    setValue(value: any, flags?: any) {
      if (this._syncing) return super.setValue(value, flags)
      if (value != null && value !== '') {
        // Skip if value hasn't changed (prevents re-render on unrelated form state changes)
        const valueJSON = JSON.stringify(value)
        if (valueJSON === this._lastValueJSON) return super.setValue(value, flags)
        this._lastValueJSON = valueJSON

        const arr = Array.isArray(value) ? value : [value]
        this.uploadedFiles = arr
          .filter((v: any) => v)
          .map((v: any) => {
            if (typeof v === 'string') {
              const decoded = decodeURIComponent(v.split('/').pop() || v)
              return { name: decoded, size: 0, type: '', url: v, status: 'success' as const }
            }
            if (typeof v === 'object' && v.url) {
              const fallbackName = decodeURIComponent((v.url || '').split('/').pop() || 'file')
              return {
                name: v.name || fallbackName,
                size: v.size || 0,
                type: v.type || '',
                url: v.url,
                status: 'success' as const,
              }
            }
            return { name: 'file', size: 0, type: '', status: 'success' as const, ...v }
          })
        this.updateFileListUI()
      }
      return super.setValue(value, flags)
    }

    isEmpty(value?: any) {
      const val = value ?? this.dataValue
      if (Array.isArray(val)) return val.length === 0
      return !val
    }

    // Take full control of validation — Form.io's internal required
    // validator cannot reliably see our uploadedFiles state.
    checkComponentValidity(data?: any, dirty?: boolean, rowData?: any, options?: any) {
      if (this.component?.validate?.required) {
        const hasFiles = this.uploadedFiles.some((f: any) => f.status === 'success' && f.url)
        if (!hasFiles) {
          this.setCustomValidity('File is required')
          return false
        }
      }
      this.setCustomValidity('')
      return true
    }

    // Push file data into Form.io's submission data.
    syncFormValue() {
      const key = this.component?.key
      const urls = this.getValue()
      if (key && this.data) this.data[key] = urls
      if (key && this.root?.data && this.data === this.root.data) this.root.data[key] = urls
      this._syncing = true
      super.dataValue = urls
      this.triggerChange()
      this._syncing = false
    }

    render() {
      const label = this.component.label || 'File Upload'
      const desc = this.component.description || ''
      const types = this.allowedFileTypes
      const maxSize = this.component.maxFileSize || '10MB'
      const multi = this.isMultiple ? 'multiple files' : 'single file'

      return super.render(`
        <div ref="fileUploadContainer" class="formio-file-upload">
          <div ref="dropZone" class="formio-file-upload-dropzone"
               style="border:2px dashed #ccc;border-radius:6px;padding:24px;text-align:center;color:#888;cursor:pointer;transition:border-color 0.2s,background-color 0.2s;">
            <div style="font-size:24px;margin-bottom:8px;"><i class="fa fa-cloud-upload"></i></div>
            <div style="font-weight:600;margin-bottom:4px;">${this.t(label)}</div>
            <div style="font-size:13px;margin-bottom:8px;">Drag & drop files here or click to browse</div>
            <div style="font-size:12px;color:#aaa;">
              ${types ? `Allowed: ${types}` : ''}${types && maxSize ? ' &bull; ' : ''}${maxSize ? `Max: ${maxSize}` : ''}
              &bull; ${multi}
            </div>
            ${desc ? `<div style="font-size:12px;color:#666;margin-top:6px;">${this.t(desc)}</div>` : ''}
            <input ref="fileInput" type="file"
                   ${this.isMultiple ? 'multiple' : ''}
                   ${types ? `accept="${types}"` : ''}
                   style="display:none;" />
          </div>
          <div ref="fileList" class="formio-file-upload-list" style="margin-top:8px;"></div>
        </div>
      `)
    }

    attach(element: HTMLElement) {
      const result = super.attach(element)
      this.loadRefs(element, {
        fileUploadContainer: 'single',
        dropZone: 'single',
        fileInput: 'single',
        fileList: 'single',
      })

      const dropZone = (this.refs as any)?.dropZone as HTMLElement | undefined
      const fileInput = (this.refs as any)?.fileInput as HTMLInputElement | undefined
      const fileList = (this.refs as any)?.fileList as HTMLElement | undefined

      // If we already attached listeners and the DOM nodes are the same
      // cached nodes, just re-insert the file list — skip full re-wire.
      if (this._attached && dropZone === this._cachedDropZone) {
        if (fileList && this.uploadedFiles.length > 0) {
          this.renderFileList(fileList)
        }
        return result
      }

      this._cachedDropZone = dropZone || null
      this._cachedFileList = fileList || null

      if (dropZone && fileInput) {
        this.fileInput = fileInput

        dropZone.addEventListener('click', () => fileInput.click())

        dropZone.addEventListener('dragenter', (e: DragEvent) => {
          e.preventDefault()
          this._dragCounter++
          dropZone.style.borderColor = '#0d6efd'
          dropZone.style.backgroundColor = '#f0f7ff'
        })

        dropZone.addEventListener('dragleave', (e: DragEvent) => {
          e.preventDefault()
          this._dragCounter--
          if (this._dragCounter <= 0) {
            this._dragCounter = 0
            dropZone.style.borderColor = '#ccc'
            dropZone.style.backgroundColor = ''
          }
        })

        dropZone.addEventListener('dragover', (e: DragEvent) => {
          e.preventDefault()
        })

        dropZone.addEventListener('drop', (e: DragEvent) => {
          e.preventDefault()
          this._dragCounter = 0
          dropZone.style.borderColor = '#ccc'
          dropZone.style.backgroundColor = ''
          const files = e.dataTransfer?.files
          if (files && files.length > 0) {
            this.handleFiles(files)
          }
        })

        fileInput.addEventListener('change', () => {
          const files = fileInput.files
          if (files && files.length > 0) {
            this.handleFiles(files)
            fileInput.value = ''
          }
        })

        this._attached = true
      }

      // Render any previously uploaded files
      if (fileList && this.uploadedFiles.length > 0) {
        this.renderFileList(fileList)
      }

      return result
    }

    async handleFiles(fileList: FileList) {
      const files = Array.from(fileList)
      const toProcess = this.isMultiple ? files : [files[0]]

      if (!this.isMultiple) {
        // Single mode: replace existing
        this.uploadedFiles = []
      }

      const uploadPromises: Promise<void>[] = []

      for (const file of toProcess) {
        const error = this.validateFile(file)
        if (error) {
          this.uploadedFiles.push({
            name: file.name,
            size: file.size,
            type: file.type,
            status: 'error',
            error,
          })
          continue
        }

        const entry: UploadedFile = {
          name: file.name,
          size: file.size,
          type: file.type,
          status: 'uploading',
        }
        this.uploadedFiles.push(entry)
        uploadPromises.push(this.uploadFile(file, entry))
      }

      this.updateFileListUI()

      // Wait for all uploads to finish, then sync value with Form.io
      await Promise.all(uploadPromises)
      this.syncFormValue()
    }

    validateFile(file: File): string | null {
      // Check size
      if (file.size > this.maxFileSizeBytes) {
        const maxDisplay = this.component?.maxFileSize || '10MB'
        return `File exceeds maximum size of ${maxDisplay}.`
      }

      // Check type
      const allowed = this.allowedFileTypes
      if (allowed) {
        const extensions = allowed.split(',').map((ext: string) => ext.trim().toLowerCase())
        const fileName = file.name.toLowerCase()
        const hasValid = extensions.some((ext: string) => {
          if (ext.startsWith('.')) return fileName.endsWith(ext)
          // Handle MIME types
          return file.type === ext
        })
        if (!hasValid) {
          return `File type not allowed. Accepted: ${allowed}`
        }
      }

      return null
    }

    async uploadFile(file: File, entry: UploadedFile) {
      const endpoint = this.uploadEndpoint
      if (!endpoint) {
        // No endpoint configured — store file reference locally as a data URL
        entry.url = URL.createObjectURL(file)
        entry.status = 'success'
        this.updateFileListUI()
        return
      }

      const formData = new FormData()
      formData.append('file', file)

      const category = this.component?.uploadCategory
      if (category) {
        formData.append('category', category)
      }

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          body: formData,
        })

        if (!res.ok) {
          entry.status = 'error'
          entry.error = `Upload failed (${res.status}).`
          this.updateFileListUI()
          return
        }

        const data = await res.json()
        entry.url = data?.url || data?.fileUrl || data?.path || ''
        if (data?.name) entry.name = data.name
        if (data?.size) entry.size = data.size
        if (data?.type) entry.type = data.type

        // Determine status from server response first, then enableScan flag
        if (data?.status === 'success' || data?.scanStatus === 'clean') {
          entry.status = 'success'
        } else if (data?.scanStatus === 'infected') {
          entry.status = 'error'
          entry.error = 'File failed security scan.'
        } else if (this.enableScan) {
          entry.status = 'scanning'
          if (data?.scanStatus) entry.scanStatus = data.scanStatus
        } else {
          entry.status = 'success'
        }
      } catch {
        entry.status = 'error'
        entry.error = 'Upload failed. Please try again.'
      }

      this.updateFileListUI()
    }

    updateFileListUI() {
      const listEl = (this.refs as any)?.fileList as HTMLElement | undefined
      if (listEl) {
        this.renderFileList(listEl)
      }
    }

    renderFileList(container: HTMLElement) {
      container.innerHTML = ''

      if (this.uploadedFiles.length === 0) return

      for (let i = 0; i < this.uploadedFiles.length; i++) {
        const file = this.uploadedFiles[i]
        const row = document.createElement('div')
        row.style.cssText =
          'display:flex;align-items:center;justify-content:space-between;padding:6px 10px;margin-bottom:4px;border:1px solid #e9ecef;border-radius:4px;font-size:13px;'

        const statusIcon = this.getStatusIcon(file.status)
        const sizeDisplay = this.formatFileSize(file.size)

        const info = document.createElement('div')
        info.style.cssText = 'display:flex;align-items:center;gap:8px;overflow:hidden;'
        info.innerHTML = `
          <span>${statusIcon}</span>
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${file.name}">${file.name}</span>
          <span style="color:#aaa;flex-shrink:0;">(${sizeDisplay})</span>
        `

        const actions = document.createElement('div')
        actions.style.cssText = 'display:flex;align-items:center;gap:6px;flex-shrink:0;'

        if (file.error) {
          const errSpan = document.createElement('span')
          errSpan.style.cssText = 'color:#dc3545;font-size:12px;'
          errSpan.textContent = file.error
          actions.appendChild(errSpan)
        }

        const removeBtn = document.createElement('button')
        removeBtn.type = 'button'
        removeBtn.style.cssText =
          'background:none;border:none;color:#dc3545;cursor:pointer;font-size:14px;padding:2px 4px;'
        removeBtn.innerHTML = '<i class="fa fa-times"></i>'
        removeBtn.title = 'Remove file'
        removeBtn.setAttribute('aria-label', `Remove ${file.name}`)
        const idx = i
        removeBtn.addEventListener('click', (e) => {
          e.preventDefault()
          e.stopPropagation()
          this.removeFile(idx)
        })
        actions.appendChild(removeBtn)

        row.appendChild(info)
        row.appendChild(actions)
        container.appendChild(row)
      }
    }

    getStatusIcon(status: string): string {
      switch (status) {
        case 'uploading': return '<i class="fa fa-spinner fa-spin" style="color:#0d6efd;"></i>'
        case 'scanning':  return '<i class="fa fa-shield" style="color:#ffc107;"></i>'
        case 'success':   return '<i class="fa fa-check-circle" style="color:#198754;"></i>'
        case 'error':     return '<i class="fa fa-exclamation-circle" style="color:#dc3545;"></i>'
        default:          return '<i class="fa fa-file-o"></i>'
      }
    }

    formatFileSize(bytes: number): string {
      if (bytes < 1024) return `${bytes} B`
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    removeFile(index: number) {
      this.uploadedFiles.splice(index, 1)
      this.updateFileListUI()
      this.syncFormValue()
    }

    destroy() {
      this.fileInput = null
      this.uploadedFiles = []
      this._dragCounter = 0
      this._attached = false
      this._cachedDropZone = null
      this._cachedFileList = null
      super.destroy()
    }
  }
}
