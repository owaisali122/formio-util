/**
 * ReactFormReview — public types for the standalone React wrapper.
 *
 * The shapes here mirror the configuration used by the Form.io
 * FormReview runtime (FormReviewFormIO) and the shared resolver in
 * `./form-review-helpers`. Re-exported under React-friendly names so
 * consumers can import them directly from `kolea-shared-package`.
 */

import type {
  ReviewItemConfig,
  ReviewSectionConfig,
  ReviewSSNFormat,
} from '../../../coreHelper/FormReviewCore/FormReviewCore.types'

/** Submission data the review reads values from (typically the wizard's flat data store). */
export type ReactFormReviewData = Record<string, unknown>

/** Section configuration accepted by `<ReactFormReview />`. */
export type ReactFormReviewSection = ReviewSectionConfig

/** Item configuration nested under a section. */
export type ReactFormReviewItem = ReviewItemConfig

/** SSN/ITIN display mode for sensitive review values. */
export type ReactFormReviewSSNFormat = ReviewSSNFormat

export interface ReactFormReviewProps {
  /** Sections to render. Each section may use either `items` or `itemsJson`. */
  sections: ReactFormReviewSection[]
  /** Submission data the review reads values from. */
  data?: ReactFormReviewData
  /**
   * Optional Form.io form schema components used to resolve labels and
   * select-option display text. Pass `form.components` from the loaded
   * form schema. When omitted, item `customLabel` and the component key
   * fallback are used.
   */
  formComponents?: Record<string, unknown>[]
  /** Show the Expand All / Collapse All toolbar when at least one section is collapsible. */
  showExpandAll?: boolean
  /** Placeholder text shown for empty values. Defaults to an em dash. */
  emptyValueText?: string
  /** Default expand state applied to sections that do not specify their own. */
  defaultSectionExpanded?: boolean
  /** Optional description rendered above the sections. */
  description?: string
  /** Additional className applied to the wrapper. */
  className?: string
}
