// Import locally so the name is visible within this file, then re-export so
// consumers of ReactFileUploader don't need to reach into FileUploaderCore.
import type { SelectedFileEntry, UploadedFileValue } from '../FileUploaderCore/FileUploaderCore.helpers'
export type { SelectedFileEntry, UploadedFileValue }

/**
 * Imperative handle exposed via forwardRef on ReactFileUploader.
 *
 * Usage:
 *   const uploaderRef = useRef<ReactFileUploaderHandle>(null)
 *   // in your submit handler:
 *   const uploadedFiles = await uploaderRef.current.upload()
 */
export interface ReactFileUploaderHandle {
  /**
   * Upload all pending/scanned files to the server.
   *
   * - Files in 'scanned' status (when scan is enabled) are uploaded.
   * - Files in 'pending' status (when scan is disabled) are uploaded.
   * - Files already in 'success' status are skipped.
   * - Throws if a scan is still in progress.
   * - Throws on the first upload failure (the failed file is marked 'error'
   *   and onChange is called so the UI reflects it before the throw).
   *
   * Returns UploadedFileValue[] for all successfully uploaded files.
   */
  upload(): Promise<UploadedFileValue[]>

  /**
   * Returns the current internal file entry array with full status information.
   * Useful for checking statuses (scanning / scanned / pending / success / error)
   * before calling upload().
   */
  getFiles(): SelectedFileEntry[]
}

/**
 * Props for ReactFileUploader.
 *
 * All behavior props map directly to FileUploaderCore / FileUploaderCoreProps.
 * No masking, scan, or upload logic is reimplemented here.
 */
export interface ReactFileUploaderProps {
  // ── Value ────────────────────────────────────────────────────────────
  /** Bound file value. Pass an array when multiple is true. */
  value?: UploadedFileValue | UploadedFileValue[] | null
  /** Called when the file selection changes. */
  onChange?: (value: UploadedFileValue | UploadedFileValue[] | null) => void

  // ── Display ──────────────────────────────────────────────────────────
  label?: string
  description?: string
  className?: string
  uploadButtonLabel?: string
  uploadIcon?: string

  // ── Behavior ─────────────────────────────────────────────────────────
  required?: boolean
  disabled?: boolean
  readOnly?: boolean
  multiple?: boolean
  maxFiles?: number
  allowRemove?: boolean
  showFileList?: boolean
  showFileSize?: boolean

  // ── File constraints ─────────────────────────────────────────────────
  /** Comma-separated file extensions (e.g. ".pdf,.png"). */
  acceptedExtensions?: string
  /** Comma-separated MIME types (e.g. "image/*,application/pdf"). */
  allowedFileTypes?: string
  /** Maximum file size string as supported by the Form.io component (e.g. "10MB", "500KB"). */
  maxFileSize?: string

  // ── Server integration ───────────────────────────────────────────────
  uploadApiUrl?: string
  scanEnabled?: boolean
  scanApiUrl?: string

  // ── API auth (maps to FileUploaderSchema secure API fields) ──────────
  apiType?: 'custom' | 'secure'
  authType?: 'basic'
  authUsername?: string
  authPassword?: string
  partnerId?: string
}
