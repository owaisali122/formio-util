import type { DocumentViewerCoreProps } from '../../../coreHelper/DocumentViewerCore/DocumentViewerCore.types'
import type {
  DocumentViewerFileType,
  DocumentViewerSourceType,
} from '../../DocumentViewer'

// Re-export underlying types so consumers of ReactDocumentViewer never need
// to import them from the Form.io DocumentViewer module directly.
export type { DocumentViewerFileType, DocumentViewerSourceType }

/**
 * Wrapper-only props consumed by ReactDocumentViewer itself.
 * These are NOT forwarded to the underlying DocumentViewerCore component.
 *
 * Everything else is forwarded via spread, so any new prop added to
 * DocumentViewerCoreProps is automatically picked up here.
 */
export interface ReactDocumentViewerWrapperProps {
  /** Text label rendered above the field. Omit to render without a label. */
  label?: string

  /** CSS class(es) appended to the outermost wrapper div. */
  className?: string

  /** When true, the trigger is disabled regardless of `disabled`. */
  readOnly?: boolean

  /** Schema-compatible tab index (number or stringified number). */
  tabindex?: number | string

  /** Reserved for schema parity. Not used by the standalone wrapper. */
  hidden?: boolean
  /** Reserved for schema parity. Not used by the standalone wrapper. */
  autofocus?: boolean

  // ── File Source resolution (handled by this wrapper) ─────────────────
  /** 'static' uses fileUrl directly. 'submission' reads from submission data. */
  sourceType?: DocumentViewerSourceType
  /** Direct URL to the file. Supports {{fieldKey}} interpolation when sourceType='static'. */
  fileUrl?: string
  /** Submission data key to read the file URL from when sourceType='submission'. */
  fileUrlDataKey?: string
  /** Optional submission data key for the original file name. */
  fileNameDataKey?: string
  /** Submission data used to resolve fileUrlDataKey/fileNameDataKey and {{fieldKey}}. */
  submissionData?: Record<string, unknown>
}

/**
 * Props accepted by ReactDocumentViewer.
 *
 * Extends DocumentViewerCoreProps (forwarded to the shared Core) with
 * ReactDocumentViewerWrapperProps (handled by this wrapper only).
 *
 * The wrapper consumes its own props and spreads the rest into the shared
 * `DocumentViewerCore`. The wrapper-resolved `fileUrl`, `fileName`,
 * `disabled`, `tabIndex`, and `className` always win over any forwarded
 * values via explicit overrides at the call site.
 */
export type ReactDocumentViewerProps =
  // Omit the trigger-side fields the wrapper resolves and overrides itself,
  // so the public surface keeps the original `tabindex` (string | number)
  // shape and the wrapper's own `fileUrl` / file-source props.
  Omit<
    DocumentViewerCoreProps,
    'fileUrl' | 'fileName' | 'tabIndex' | 'className' | 'onPopupClose' | 'onPopupAction'
  > &
    ReactDocumentViewerWrapperProps
