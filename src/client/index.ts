/**
 * Client-side components and wrappers
 * 
 * Exports:
 * - FormIORenderWithSlug - Unified entry point (decides wizard vs form internally)
 * - Custom components (SearchableDropdown)
 * - Popup system (PopupContainer, usePopup, openPopup, closePopup, types)
 */

export { default as FormIORenderWithSlug } from './FormIORenderWithSlug'
export type { FormIORenderWithSlugProps, WizardState, LoadRecordResult } from './FormIORenderWithSlug'

// Custom components
export * from './custom-components'

// Popup system
export * from './popup'

// Standalone React wrappers — must live in the client bundle so their
// internal openPopup calls share the same popupStore singleton as PopupContainer.
export { ReactDocumentViewer } from '../components/react/ReactDocumentViewer'
export type { ReactDocumentViewerProps } from '../components/react/ReactDocumentViewer/ReactDocumentViewer.types'
