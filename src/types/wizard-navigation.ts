/**
 * Custom Wizard Navigation — TypeScript interfaces
 *
 * These types define the schema shape for Designer-configured custom navigation
 * buttons on wizard forms. The Designer saves this config into the form schema;
 * the Renderer reads it at runtime.
 */

// ---------------------------------------------------------------------------
// Button action types
// ---------------------------------------------------------------------------

export type NavigationActionType =
  | 'back'
  | 'next'
  | 'skip'
  | 'submit'
  | 'saveExit'
  | 'exit'
  | 'finish'
  | 'custom'

export type NavigationButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'danger'
  | 'link'

export type NavigationButtonAlign = 'left' | 'center' | 'right'

// ---------------------------------------------------------------------------
// Condition evaluation (safe, no raw JS)
// ---------------------------------------------------------------------------

export type NavigationConditionOperator =
  | 'equals'
  | 'notEquals'
  | 'exists'
  | 'notExists'
  | 'truthy'
  | 'falsy'

export interface NavigationCondition {
  field: string
  operator: NavigationConditionOperator
  value?: unknown
}

// ---------------------------------------------------------------------------
// Button definition
// ---------------------------------------------------------------------------

export interface NavigationButton {
  key: string
  label: string
  action: NavigationActionType
  variant: NavigationButtonVariant
  align: NavigationButtonAlign
  visible: boolean
  disabled: boolean
  targetStepKey?: string
  targetStepIndex?: number
  customActionKey?: string
  validateBeforeAction?: boolean
  saveBeforeAction?: boolean
  renderOnlyWhenNested?: boolean
  visibleWhen?: NavigationCondition[]
  disabledWhen?: NavigationCondition[]
  /** Key-value pairs to set on form submission data when this button is clicked */
  setFieldValues?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Panel-level (per wizard page) config
// ---------------------------------------------------------------------------

export interface PanelCustomNavigation {
  hideDefaultNavigation?: boolean
  buttons: NavigationButton[]
  conditionsJson?: string
}

// ---------------------------------------------------------------------------
// Form-level config (top-level schema property)
// ---------------------------------------------------------------------------

export interface CustomWizardNavigation {
  enabled: boolean
  hideDefaultNavigation: boolean
  defaultButtons: NavigationButton[]
}
