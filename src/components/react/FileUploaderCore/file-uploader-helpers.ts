/**
 * File Uploader pure helpers — shared by:
 *   - FileUploaderCore (React UI)
 *   - FileUploadFormIO (Form.io runtime — beforeSubmit upload)
 *
 * No DOM, no Form.io, no React dependencies. Pure functions only.
 */

// ── Shared runtime types ──────────────────────────────────────────────────────

/**
 * Value shape stored per uploaded file — mirrors the server response structure
 * returned by the upload API, with mandatory display fields at the top level.
 */
export interface UploadedFileValue {
  name: string
  size: number
  type: string
  url?: string
  path?: string
  [key: string]: unknown
}

/**
 * Internal per-file state managed by FileUploaderCore and mirrored by
 * FileUploadFormIO. The `_id` field is an internal stable key and is never
 * included in the submission value.
 */
export interface SelectedFileEntry {
  /** Stable internal ID — not included in submission output. */
  readonly _id: string
  name: string
  size: number
  type: string
  /** Raw File object — present only for locally-picked, not-yet-uploaded files. */
  file?: File
  /** Object URL (blob:) for local preview, or server URL after upload. */
  url?: string
  path?: string
  /** Full server response object — used as the submission value when present. */
  serverResponse?: Record<string, unknown>
  status: 'pending' | 'scanning' | 'scanned' | 'success' | 'error'
  error?: string
}

export interface ScanResult {
  passed: boolean
  message?: string
}

export interface UploadResult {
  success: boolean
  response?: Record<string, unknown>
  message?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

let _idCounter = 0
export function nextFileId(): string {
  return `fu-${++_idCounter}`
}

export function parseMaxFileSizeBytes(raw: string): number {
  const match = (raw || '10MB').match(/^(\d+(?:\.\d+)?)\s*(KB|MB|GB)?$/i)
  if (!match) return 10 * 1024 * 1024
  const num = parseFloat(match[1])
  const unit = (match[2] || 'MB').toUpperCase()
  if (unit === 'KB') return num * 1024
  if (unit === 'GB') return num * 1024 * 1024 * 1024
  return num * 1024 * 1024
}

export function validateFileEntry(
  file: File,
  acceptedExtensions: string,
  allowedFileTypes: string,
  maxFileSizeBytes: number,
): string | null {
  if (file.size > maxFileSizeBytes) {
    return `File exceeds maximum allowed size.`
  }

  if (acceptedExtensions) {
    const exts = acceptedExtensions.split(',').map((e) => e.trim().toLowerCase())
    const name = file.name.toLowerCase()
    const valid = exts.some((ext) =>
      ext.startsWith('.') ? name.endsWith(ext) : file.type === ext,
    )
    if (!valid) return `File type not allowed. Accepted: ${acceptedExtensions}`
  }

  if (allowedFileTypes) {
    const types = allowedFileTypes.split(',').map((t) => t.trim().toLowerCase())
    const valid = types.some((t) =>
      t.endsWith('/*') ? file.type.startsWith(t.replace('/*', '/')) : file.type === t,
    )
    if (!valid) return `File type not allowed. Accepted: ${allowedFileTypes}`
  }

  return null
}

export function buildApiHeaders(
  apiType: string = 'custom',
  authType?: string,
  authUsername?: string,
  authPassword?: string,
  partnerId?: string,
): Record<string, string> {
  if (apiType !== 'secure') return {}
  const headers: Record<string, string> = {}
  if ((authType ?? 'basic') === 'basic') {
    const u = authUsername ?? ''
    const p = authPassword ?? ''
    if (u || p) headers['Authorization'] = `Basic ${btoa(`${u}:${p}`)}`
  }
  const pid = partnerId?.trim()
  if (pid) headers['partner-id'] = pid
  return headers
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export async function runScan(
  file: File,
  scanApiUrl: string,
  headers: Record<string, string>,
): Promise<ScanResult> {
  try {
    const form = new FormData()
    form.append('file', file)
    let response: Response
    try {
      response = await fetch(scanApiUrl, { method: 'POST', body: form, headers })
    } catch {
      return { passed: false, message: 'File scan failed: service unavailable.' }
    }

    if (!response.ok) {
      let msg = 'File did not pass security scan.'
      try {
        const body = JSON.parse(await response.text())
        if (body?.message) msg = body.message
        else if (body?.error) msg = body.error
      } catch { /* ignore */ }
      return { passed: false, message: msg }
    }

    try {
      const body = JSON.parse(await response.text())
      if (body?.status === 'infected') {
        return { passed: false, message: body.message || 'File did not pass security scan.' }
      }
    } catch { /* OK response, treat as passed */ }
    return { passed: true }
  } catch {
    return { passed: false, message: 'File scan failed: unexpected error.' }
  }
}

export async function uploadFileEntry(
  file: File,
  uploadApiUrl: string,
  headers: Record<string, string>,
): Promise<UploadResult> {
  try {
    const form = new FormData()
    form.append('file', file)
    let response: Response
    try {
      response = await fetch(uploadApiUrl, { method: 'POST', body: form, headers })
    } catch {
      return { success: false, message: 'File upload failed: service unavailable.' }
    }

    if (!response.ok) {
      let msg = 'File upload failed.'
      try {
        const text = await response.text()
        try {
          const body = JSON.parse(text)
          if (typeof body === 'string') msg = body
          else if (body?.message) msg = String(body.message)
          else if (body?.error) msg = String(body.error)
        } catch { msg = text.trim() || msg }
      } catch { /* ignore */ }
      return { success: false, message: msg }
    }

    try {
      const body = JSON.parse(await response.text()) as unknown
      if (body && typeof body === 'object' && !Array.isArray(body)) {
        return { success: true, response: body as Record<string, unknown> }
      }
      if (typeof body === 'string') {
        return { success: true, response: { url: body } }
      }
    } catch { /* unparseable body but OK response */ }
    return { success: true }
  } catch {
    return { success: false, message: 'File upload failed: unexpected error.' }
  }
}

/** Map internal SelectedFileEntry[] → UploadedFileValue[] for submission. */
export function selectedFilesToValue(files: SelectedFileEntry[]): UploadedFileValue[] {
  return files
    .filter((f) => f.status !== 'error')
    .map((f): UploadedFileValue => {
      if (f.serverResponse) {
        // Return the full server response (minus the internal _id) as the value.
        const { _id: _discard, file: _file, ...rest } = f as any
        return { ...f.serverResponse, name: f.name, size: f.size, type: f.type, ...rest } as UploadedFileValue
      }
      return {
        name: f.name,
        size: f.size,
        type: f.type,
        ...(f.url && !f.url.startsWith('blob:') ? { url: f.url } : {}),
        ...(f.path ? { path: f.path } : {}),
      }
    })
}

/** Normalize an external UploadedFileValue[] into SelectedFileEntry[] (status='success'). */
export function normalizeValueToEntries(
  value: UploadedFileValue | UploadedFileValue[] | null | undefined,
): SelectedFileEntry[] {
  if (value == null) return []
  const arr = Array.isArray(value) ? value : [value]
  return arr
    .filter(Boolean)
    .map((v): SelectedFileEntry => ({
      _id: nextFileId(),
      name: v.name || 'file',
      size: typeof v.size === 'number' ? v.size : 0,
      type: typeof v.type === 'string' ? v.type : '',
      url: typeof v.url === 'string' ? v.url : undefined,
      path: typeof v.path === 'string' ? v.path : undefined,
      serverResponse: v as Record<string, unknown>,
      status: 'success',
    }))
}
