/**
 * FormReviewCore — shared types for the Form Review component.
 *
 * Used by both the Form.io runtime adapter (FormReviewFormIO) and the
 * standalone React wrapper (ReactFormReview).
 */

// ── Item & Section Configuration ─────────────────────────────────────

export interface ReviewItemConfig {
  componentKey: string
  customLabel?: string
  emptyValueText?: string
  excludeIfEmpty?: boolean
  booleanTrueLabel?: string
  booleanFalseLabel?: string
  dateFormat?: string
  ssnFormat?: ReviewSSNFormat
}

export type ReviewSSNFormat = 'last4' | 'hidden' | 'full'

export interface ReviewSectionConfig {
  title: string
  sectionKey?: string
  collapsible?: boolean
  defaultExpanded?: boolean
  columns?: number
  items?: ReviewItemConfig[]
  /** JSON string alternative to items array — avoids nested grid in editForm */
  itemsJson?: string
}

export interface FormReviewSettings {
  sections: ReviewSectionConfig[]
  showExpandAll?: boolean
  emptyValueText?: string
  defaultSectionExpanded?: boolean
}

// ── Resolved / Render-Ready Types ────────────────────────────────────

/** A single entry inside a referenced form / nested object value. */
export interface NestedReviewEntry {
  label: string
  value: string
  isEmpty: boolean
  isBoolean?: boolean
  booleanValue?: boolean
  /** Sub-entries when the value itself is a nested object. */
  nestedItems?: NestedReviewEntry[]
}

export interface ReviewSensitiveValue {
  kind: 'ssn'
  defaultText: string
  fullText: string
  isToggleable: boolean
}

export interface ResolvedReviewItem {
  reviewKey?: string
  label: string
  value: string
  isEmpty: boolean
  isBoolean?: boolean
  /** True when the field value is a referenced form / plain nested object. */
  isObject?: boolean
  /** Structured entries for referenced form objects — populated when isObject is true. */
  nestedItems?: NestedReviewEntry[]
  sensitiveValue?: ReviewSensitiveValue
}

export interface ResolvedReviewSection {
  title: string
  sectionKey: string
  collapsible: boolean
  defaultExpanded: boolean
  columns: number
  items: ResolvedReviewItem[]
}
