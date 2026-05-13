import type { SelectedFileEntry, UploadedFileValue } from './file-uploader-helpers'

export type { SelectedFileEntry, UploadedFileValue }

/**
 * Props for FileUploaderCore — the shared React UI for file uploading.
 *
 * Controlled component: caller owns the persisted value (UploadedFileValue[]).
 * The core manages in-flight state (pending/scanning/uploading) internally
 * and calls onChange after every state transition.
 *
 * uploadMode:
 *   'immediate' — upload fires right after scan passes (or on pick if no scan).
 *                 Used by the standalone ReactFileUploader.
 *   'deferred'  — core only scans; upload is done externally (Form.io beforeSubmit).
 *                 Used by FileUploadFormIO.
 */
export interface FileUploaderCoreProps {
  // ── Value (controlled hydration) ────────────────────────────────────
  /** Persisted file values — normalized to SelectedFileEntry[] with status='success'. */
  value?: UploadedFileValue | UploadedFileValue[] | null
  /**
   * Fires after every file state change with the current internal entry array.
   * Callers map this to UploadedFileValue[] for external state.
   */
  onChange?: (files: SelectedFileEntry[]) => void

  // ── Display ───────────────────────────────────────────────────────────
  uploadButtonLabel?: string
  uploadIcon?: string
  showFileList?: boolean
  showFileSize?: boolean

  // ── Behavior ──────────────────────────────────────────────────────────
  disabled?: boolean
  readOnly?: boolean
  multiple?: boolean
  maxFiles?: number
  allowRemove?: boolean
  autoFocus?: boolean
  tabIndex?: number

  // ── File constraints ──────────────────────────────────────────────────
  acceptedExtensions?: string
  allowedFileTypes?: string
  maxFileSize?: string

  // ── API configuration ─────────────────────────────────────────────────
  uploadApiUrl?: string
  scanEnabled?: boolean
  scanApiUrl?: string
  /**
   * 'immediate' — upload right after scan (standalone React default).
   * 'deferred'  — scan only; Form.io wrapper uploads in beforeSubmit.
   */
  uploadMode?: 'immediate' | 'deferred'

  // ── Auth ──────────────────────────────────────────────────────────────
  apiType?: 'custom' | 'secure'
  authType?: 'basic'
  authUsername?: string
  authPassword?: string
  partnerId?: string
}
