'use client'

/**
 * ReactFileUploader — standalone React file uploader (deferred-upload mode).
 *
 * Behavior mirrors the Form.io renderer FileUpload component:
 *   1. File selection → validate → scan (if enabled) → store internally.
 *      The upload API is NOT called on file pick.
 *   2. Upload only runs when the consumer calls `ref.current.upload()`,
 *      typically from a form submit handler.
 *
 * No Formio.createForm. No Form.io schema. No registration required.
 *
 * Consumer pattern:
 *   const uploaderRef = useRef<ReactFileUploaderHandle>(null)
 *   <ReactFileUploader ref={uploaderRef} ... />
 *
 *   // in submit handler:
 *   const uploadedFiles = await uploaderRef.current.upload()
 */

import React, { forwardRef, useCallback, useImperativeHandle, useRef } from 'react'

import { BootstrapProvider } from '../../BootstrapProvider'
import { FileUploaderCore } from '../FileUploaderCore/FileUploaderCore'
import {
  buildApiHeaders,
  selectedFilesToValue,
  uploadFileEntry,
} from '../FileUploaderCore/file-uploader-helpers'
import type { SelectedFileEntry } from '../FileUploaderCore/file-uploader-helpers'
import type { ReactFileUploaderHandle, ReactFileUploaderProps } from './ReactFileUploader.types'

export const ReactFileUploader = forwardRef<ReactFileUploaderHandle, ReactFileUploaderProps>(
  function ReactFileUploader(
    {
      value,
      onChange,
      label,
      description,
      className,
      required = false,
      multiple = false,
      scanEnabled = false,
      uploadApiUrl = '',
      apiType = 'custom',
      authType,
      authUsername,
      authPassword,
      partnerId,
      ...rest
    },
    ref,
  ) {
    // Latest file entry state — updated via FileUploaderCore.onChange.
    // Used by upload() without needing a React state re-render on every access.
    const internalFilesRef = useRef<SelectedFileEntry[]>([])

    const handleCoreChange = useCallback(
      (files: SelectedFileEntry[]) => {
        internalFilesRef.current = files
        const values = selectedFilesToValue(files)
        onChange?.(multiple ? values : (values[0] ?? null))
      },
      [onChange, multiple],
    )

    useImperativeHandle(
      ref,
      () => ({
        upload: async () => {
          if (!uploadApiUrl) return []

          const files = internalFilesRef.current

          // Block if scan is still in progress.
          if (files.some((f) => f.status === 'scanning')) {
            throw new Error('File scan is in progress. Please wait before uploading.')
          }

          // Select files that still need uploading based on scan configuration.
          const pending = files.filter((f) => {
            if (f.status === 'error' || f.status === 'success') return false
            if (scanEnabled) return f.status === 'scanned' && !!f.file
            return f.status === 'pending' && !!f.file
          })

          if (pending.length === 0) {
            // Nothing new to upload — return already-uploaded values.
            return selectedFilesToValue(files.filter((f) => f.status === 'success'))
          }

          const headers = buildApiHeaders(apiType, authType, authUsername, authPassword, partnerId)

          // Work on a mutable copy so statuses can be patched before notifying.
          const updatedFiles = [...files]

          for (const fileEntry of pending) {
            const result = await uploadFileEntry(fileEntry.file!, uploadApiUrl, headers)
            const idx = updatedFiles.findIndex((f) => f._id === fileEntry._id)

            if (!result.success) {
              if (idx !== -1) {
                updatedFiles[idx] = { ...updatedFiles[idx], status: 'error', error: result.message }
              }
              // Notify before throwing so the UI reflects the error state.
              internalFilesRef.current = updatedFiles
              const values = selectedFilesToValue(updatedFiles)
              onChange?.(multiple ? values : (values[0] ?? null))
              throw new Error(result.message ?? 'File upload failed.')
            }

            const resp = result.response
            if (idx !== -1) {
              updatedFiles[idx] = {
                ...updatedFiles[idx],
                status: 'success',
                file: undefined,
                serverResponse: resp,
                url: resp
                  ? String(
                      resp.url ??
                        resp.path ??
                        resp.location ??
                        resp.fileUrl ??
                        resp.filePath ??
                        updatedFiles[idx].url ??
                        '',
                    )
                  : updatedFiles[idx].url,
                path: resp && typeof resp.path === 'string' ? resp.path : updatedFiles[idx].path,
                name: resp && typeof resp.name === 'string' ? resp.name : updatedFiles[idx].name,
                size: resp && typeof resp.size === 'number' ? resp.size : updatedFiles[idx].size,
                type: resp && typeof resp.type === 'string' ? resp.type : updatedFiles[idx].type,
              }
            }
          }

          internalFilesRef.current = updatedFiles
          const finalValues = selectedFilesToValue(updatedFiles)
          onChange?.(multiple ? finalValues : (finalValues[0] ?? null))
          return finalValues
        },

        getFiles: () => internalFilesRef.current,
      }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [uploadApiUrl, scanEnabled, apiType, authType, authUsername, authPassword, partnerId, onChange, multiple],
    )

    const wrapperClassName = ['formio-file-uploader-standalone', className].filter(Boolean).join(' ')

    return (
      <BootstrapProvider>
        <div className={wrapperClassName}>
          {label && (
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
              {label}
              {required && <span className="text-danger ms-1">*</span>}
            </label>
          )}
          <FileUploaderCore
            value={value}
            onChange={handleCoreChange}
            uploadMode="deferred"
            multiple={multiple}
            scanEnabled={scanEnabled}
            uploadApiUrl={uploadApiUrl}
            apiType={apiType}
            authType={authType}
            authUsername={authUsername}
            authPassword={authPassword}
            partnerId={partnerId}
            {...rest}
          />
          {description && <div className="help-block mt-1">{description}</div>}
        </div>
      </BootstrapProvider>
    )
  },
)

export default ReactFileUploader
