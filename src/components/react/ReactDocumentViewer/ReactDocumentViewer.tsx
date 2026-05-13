'use client'

/**
 * ReactDocumentViewer — clean React wrapper around the shared
 * DocumentViewerTrigger component.
 *
 * Mirrors the ReactSmartStreet pattern:
 *   1. Render an optional label above the trigger.
 *   2. Resolve fileUrl / fileName from props (static or submission-driven).
 *   3. Spread the remaining trigger props into <DocumentViewerTrigger />,
 *      so any new prop added to DocumentViewerTriggerProps flows through
 *      automatically without touching this wrapper.
 *
 * No Formio.createForm. The shared trigger is the single source of truth and
 * is also rendered by the Form.io documentViewer runtime via createRoot.
 *
 * NOTE: Consumers must mount the popup container at the app level, since the
 * documentViewer opens its preview through the shared popup store.
 */

import React, { useMemo } from 'react'

import { BootstrapProvider } from '../../BootstrapProvider'
import { DocumentViewerCore } from '../DocumentViewerCore'

import type { ReactDocumentViewerProps } from './ReactDocumentViewer.types'

function resolveFileUrl(
  sourceType: ReactDocumentViewerProps['sourceType'],
  fileUrl: string | undefined,
  fileUrlDataKey: string | undefined,
  data: Record<string, unknown>,
): string {
  if (sourceType === 'submission') {
    const key = (fileUrlDataKey ?? '').trim()
    if (!key) return ''
    return String(data[key] ?? '').trim()
  }
  const url = (fileUrl ?? '').trim()
  if (!url) return ''
  // Simple {{fieldKey}} interpolation against submissionData.
  return url.replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(data[k] ?? ''))
}

function resolveFileName(
  fileNameDataKey: string | undefined,
  data: Record<string, unknown>,
): string {
  const key = (fileNameDataKey ?? '').trim()
  if (!key) return ''
  return String(data[key] ?? '').trim()
}

export function ReactDocumentViewer({
  // ── Wrapper-only props (consumed here, NOT forwarded) ──
  label,
  className,
  readOnly = false,
  tabindex,
  hidden: _hidden,
  autofocus: _autofocus,
  sourceType = 'static',
  fileUrl,
  fileUrlDataKey,
  fileNameDataKey,
  submissionData,

  // ── Wrapper-aware override (also forwarded after combining with readOnly) ──
  disabled = false,

  // ── Remaining props are forwarded to DocumentViewerTrigger via spread,
  //    so any new prop added to DocumentViewerTriggerProps is automatically
  //    picked up here. ──
  ...triggerProps
}: ReactDocumentViewerProps) {
  const data = submissionData ?? {}

  const resolvedUrl = useMemo(
    () => resolveFileUrl(sourceType, fileUrl, fileUrlDataKey, data),
    [sourceType, fileUrl, fileUrlDataKey, data],
  )

  const resolvedFileName = useMemo(
    () => resolveFileName(fileNameDataKey, data),
    [fileNameDataKey, data],
  )

  const tabIndexNum = useMemo(() => {
    if (tabindex === undefined || tabindex === '' || tabindex === null) return undefined
    const n = Number(tabindex)
    return Number.isFinite(n) ? n : undefined
  }, [tabindex])

  const wrapperClassName = ['formio-document-viewer-standalone', className]
    .filter(Boolean)
    .join(' ')

  return (
    <BootstrapProvider>
      <div className={wrapperClassName}>
        {label && (
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
            {label}
          </label>
        )}

        <DocumentViewerCore
          {...triggerProps}
          disabled={disabled || readOnly}
          tabIndex={tabIndexNum}
          fileUrl={resolvedUrl}
          fileName={resolvedFileName}
        />
      </div>
    </BootstrapProvider>
  )
}
