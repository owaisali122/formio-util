'use client'

/**
 * FileUploaderCore — shared React core for the file uploader.
 *
 * Single source of truth for:
 *   - upload button rendering
 *   - hidden file input
 *   - per-file validation (extension / MIME / size)
 *   - immediate scan API call on file pick (when scanEnabled)
 *   - immediate upload API call after scan (when uploadMode='immediate')
 *   - file list rendering (status icons, name, size, remove)
 *   - remove file behavior
 *   - disabled / readOnly / multiple / maxFiles behavior
 *
 * Consumers:
 *   - ReactFileUploader (standalone, uploadMode='immediate')
 *   - FileUploadFormIO (Form.io runtime, uploadMode='deferred', mounted via
 *     createRoot in attach(); upload happens in beforeSubmit using shared helpers)
 *
 * Upload + scan helpers (runScan, uploadFileEntry, buildApiHeaders) are exported
 * separately from `./file-uploader-helpers` so the Form.io class can call them
 * in beforeSubmit without requiring React.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'

import {
  buildApiHeaders,
  formatFileSize,
  nextFileId,
  normalizeValueToEntries,
  parseMaxFileSizeBytes,
  runScan,
  selectedFilesToValue,
  uploadFileEntry,
  validateFileEntry,
} from './file-uploader-helpers'
import type { FileUploaderCoreProps, SelectedFileEntry } from './FileUploaderCore.types'

const STYLE_ID = 'file-uploader-core-css'
const STYLE_TEXT = `
.file-uploader-list{margin-top:6px}
.file-uploader-row{display:flex;align-items:center;gap:6px;font-size:12px;margin-top:4px}
.file-uploader-row a,.file-uploader-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px;display:inline-block}
.file-uploader-size{color:#aaa}
.file-uploader-remove{background:none;border:none;color:#dc3545;cursor:pointer;font-size:12px;padding:0 2px;line-height:1}
.file-uploader-remove:hover{opacity:.7}
.file-uploader-remove:focus{outline:2px solid #dc3545;outline-offset:2px;border-radius:2px}`

function injectStylesOnce(): void {
  if (typeof document === 'undefined') return
  if (document.getElementById(STYLE_ID)) return
  const s = document.createElement('style')
  s.id = STYLE_ID
  s.textContent = STYLE_TEXT
  document.head.appendChild(s)
}

export function FileUploaderCore({
  value,
  onChange,
  uploadButtonLabel = 'Upload',
  uploadIcon = 'fa fa-upload',
  showFileList = true,
  showFileSize = true,
  disabled = false,
  readOnly = false,
  multiple = false,
  maxFiles = 1,
  allowRemove = true,
  autoFocus = false,
  tabIndex,
  acceptedExtensions = '',
  allowedFileTypes = '',
  maxFileSize = '10MB',
  uploadApiUrl = '',
  scanEnabled = false,
  scanApiUrl = '',
  uploadMode = 'immediate',
  apiType = 'custom',
  authType,
  authUsername,
  authPassword,
  partnerId,
}: FileUploaderCoreProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [files, setFiles] = useState<SelectedFileEntry[]>(() =>
    normalizeValueToEntries(value),
  )

  // Ref mirror for safe access inside async scan/upload callbacks.
  const filesRef = useRef<SelectedFileEntry[]>(files)
  useEffect(() => { filesRef.current = files }, [files])

  // ── Styles ──────────────────────────────────────────────────────────────

  useEffect(() => { injectStylesOnce() }, [])

  // ── External value sync ─────────────────────────────────────────────────
  //
  // Only applied when the value prop changes to something genuinely different
  // from what we last emitted (breaks the onChange → value → setFiles loop).

  const lastEmittedJSON = useRef<string>(
    JSON.stringify(selectedFilesToValue(normalizeValueToEntries(value))),
  )

  useEffect(() => {
    const nextJSON = JSON.stringify(
      Array.isArray(value) ? value : value != null ? [value] : [],
    )
    // If this value change was produced by our own onChange, skip.
    if (nextJSON === lastEmittedJSON.current) return
    lastEmittedJSON.current = nextJSON
    setFiles(normalizeValueToEntries(value))
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Notify parent after every files change ──────────────────────────────
  //
  // IMPORTANT: use a status-aware summary for change detection.
  //
  // selectedFilesToValue() strips the `status` field, so transitions like
  // pending → scanning → scanned all produce the same UploadedFileValue[] JSON.
  // In deferred-upload mode (Form.io), the wrapper tracks _selectedFiles via
  // onChange callbacks. If onChange is not called when status changes from
  // 'scanning' → 'scanned', the wrapper's mirror stays stuck at 'scanning',
  // causing checkComponentValidity and beforeSubmit to permanently block.
  //
  // Note: React 18 batches the initial setFiles(pending) in handleFiles with
  // the first updateById(scanning) in processSingleEntry (synchronous before
  // the first await), so the first notification arrives with status='scanning'.
  // The 'scanned' transition must also fire onChange — hence the status-aware
  // comparison here.
  //
  // lastEmittedJSON still tracks UploadedFileValue[] JSON so the value-sync
  // loop prevention (comparing incoming value prop) continues to work.

  const prevNotifyJSON = useRef<string>('')
  useEffect(() => {
    const summaryJSON = JSON.stringify(
      files.map((f) => ({ _id: f._id, status: f.status, name: f.name, size: f.size, error: f.error })),
    )
    if (summaryJSON === prevNotifyJSON.current) return
    prevNotifyJSON.current = summaryJSON
    // Keep lastEmittedJSON aligned with UploadedFileValue[] JSON — this is what
    // the value-sync effect compares against the incoming value prop to break
    // the onChange → value → setFiles echo loop.
    lastEmittedJSON.current = JSON.stringify(selectedFilesToValue(files))
    onChange?.(files)
  }, [files]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Internal file update helpers ─────────────────────────────────────────

  const updateById = useCallback((id: string, updates: Partial<SelectedFileEntry>) => {
    setFiles((prev) => prev.map((f) => (f._id === id ? { ...f, ...updates } : f)))
  }, [])

  // ── Scan + optional upload pipeline ─────────────────────────────────────

  const processSingleEntry = useCallback(
    async (entry: SelectedFileEntry) => {
      const headers = buildApiHeaders(apiType, authType, authUsername, authPassword, partnerId)

      // ── Scan phase ──────────────────────────────────────────────────────
      if (scanEnabled && scanApiUrl && entry.file) {
        updateById(entry._id, { status: 'scanning' })
        const scanResult = await runScan(entry.file, scanApiUrl, headers)
        if (!scanResult.passed) {
          updateById(entry._id, { status: 'error', error: scanResult.message })
          return
        }
        updateById(entry._id, { status: 'scanned', error: undefined })
      }

      // ── Upload phase (immediate mode only) ──────────────────────────────
      if (uploadMode === 'immediate' && uploadApiUrl && entry.file) {
        const result = await uploadFileEntry(entry.file, uploadApiUrl, headers)
        if (!result.success) {
          updateById(entry._id, { status: 'error', error: result.message })
          return
        }
        const resp = result.response
        updateById(entry._id, {
          status: 'success',
          file: undefined,
          serverResponse: resp,
          url: resp
            ? String(resp.url ?? resp.path ?? resp.location ?? resp.fileUrl ?? resp.filePath ?? entry.url ?? '')
            : entry.url,
          path: resp ? (typeof resp.path === 'string' ? resp.path : undefined) : undefined,
          name: resp && typeof resp.name === 'string' ? resp.name : entry.name,
          size: resp && typeof resp.size === 'number' ? resp.size : entry.size,
          type: resp && typeof resp.type === 'string' ? resp.type : entry.type,
        })
      }
    },
    [apiType, authType, authUsername, authPassword, partnerId, scanEnabled, scanApiUrl, uploadMode, uploadApiUrl, updateById],
  )

  // ── File pick handler ────────────────────────────────────────────────────

  const handleFiles = useCallback(
    (fileList: FileList) => {
      const incoming = Array.from(fileList)
      const maxSizeBytes = parseMaxFileSizeBytes(maxFileSize)
      const newEntries: SelectedFileEntry[] = []

      for (const file of incoming) {
        const currentCount = (multiple ? filesRef.current.length : 0) + newEntries.length
        if (maxFiles > 0 && currentCount >= maxFiles) break

        const err = validateFileEntry(file, acceptedExtensions, allowedFileTypes, maxSizeBytes)
        if (err) {
          newEntries.push({
            _id: nextFileId(),
            name: file.name,
            size: file.size,
            type: file.type,
            status: 'error',
            error: err,
          })
          continue
        }

        newEntries.push({
          _id: nextFileId(),
          name: file.name,
          size: file.size,
          type: file.type,
          file,
          url: URL.createObjectURL(file),
          status: 'pending',
        })
      }

      setFiles((prev) => {
        const base = multiple ? prev : []
        const next = [...base, ...newEntries]
        filesRef.current = next
        return next
      })

      // Kick off scan/upload pipeline for valid new entries.
      for (const entry of newEntries) {
        if (entry.status === 'pending') {
          processSingleEntry(entry)
        }
      }
    },
    [multiple, maxFiles, maxFileSize, acceptedExtensions, allowedFileTypes, processSingleEntry],
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const fl = e.currentTarget.files
      if (fl && fl.length > 0) {
        handleFiles(fl)
        e.currentTarget.value = '' // reset so same file can be re-picked
      }
    },
    [handleFiles],
  )

  // ── Remove ───────────────────────────────────────────────────────────────

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const next = prev.filter((f) => f._id !== id)
      filesRef.current = next
      return next
    })
  }, [])

  // ── Render ───────────────────────────────────────────────────────────────

  const accept = acceptedExtensions || allowedFileTypes || ''
  const isDisabled = disabled || readOnly

  return (
    <div className="formio-file-uploader">
      <button
        type="button"
        className={`btn btn-outline-secondary btn-sm${isDisabled ? ' disabled' : ''}`}
        title={uploadButtonLabel || 'Upload file'}
        disabled={isDisabled}
        tabIndex={tabIndex}
        autoFocus={autoFocus}
        onClick={() => {
          if (!isDisabled) fileInputRef.current?.click()
        }}
      >
        <i className={uploadIcon} aria-hidden="true" />
        {uploadButtonLabel && <span className="ms-1">{uploadButtonLabel}</span>}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        accept={accept || undefined}
        disabled={isDisabled}
        style={{ display: 'none' }}
        onChange={handleInputChange}
      />

      {showFileList && files.length > 0 && (
        <div className="file-uploader-list">
          {files.map((f) => {
            const isServerUrl = !!f.url && !f.url.startsWith('blob:')
            return (
              <div key={f._id} className="file-uploader-row">
                {/* Status icon */}
                {f.status === 'scanning' && (
                  <span title="Scanning…">
                    <i className="fa fa-spinner fa-spin text-primary" aria-hidden="true" />
                  </span>
                )}
                {f.status === 'scanned' && (
                  <span title="Scan passed">
                    <i className="fa fa-shield text-success" aria-hidden="true" />
                  </span>
                )}
                {f.status === 'success' && (
                  <span title="Uploaded">
                    <i className="fa fa-check-circle text-success" aria-hidden="true" />
                  </span>
                )}
                {f.status === 'error' && (
                  <span title="Error">
                    <i className="fa fa-exclamation-circle text-danger" aria-hidden="true" />
                  </span>
                )}

                {/* File name */}
                {f.status === 'success' && isServerUrl ? (
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="file-uploader-name"
                    title={f.name}
                  >
                    {f.name}
                  </a>
                ) : (
                  <span className="file-uploader-name" title={f.name}>
                    {f.name}
                  </span>
                )}

                {showFileSize && f.size > 0 && (
                  <span className="file-uploader-size">({formatFileSize(f.size)})</span>
                )}

                {f.status === 'scanning' && (
                  <span className="text-primary">Scanning…</span>
                )}

                {f.error && <span className="text-danger">{f.error}</span>}

                {allowRemove && !readOnly && f.status !== 'scanning' && (
                  <button
                    type="button"
                    className="file-uploader-remove"
                    title="Remove"
                    aria-label={`Remove ${f.name}`}
                    onClick={() => removeFile(f._id)}
                  >
                    <i className="fa fa-times" aria-hidden="true" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default FileUploaderCore
