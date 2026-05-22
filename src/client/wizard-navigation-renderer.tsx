'use client'

import React from 'react'
import type {
  NavigationButton,
  CustomWizardNavigation,
  PanelCustomNavigation,
  NavigationButtonVariant,
  NavigationButtonAlign,
} from '../types/wizard-navigation'
import { evaluateConditions } from '../utils/navigation-condition-evaluator'

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface WizardNavigationRendererProps {
  /** Form-level custom wizard navigation config from schema */
  config: CustomWizardNavigation
  /** Current panel's customNavigation (step-specific override) */
  panelNavigation: PanelCustomNavigation | undefined
  /** Current form submission data for condition evaluation */
  data: Record<string, unknown>
  /** Handler called when a navigation button is clicked */
  onAction: (button: NavigationButton) => void
  /** Whether a save/submit operation is in progress */
  isSaving: boolean
  /** Optional className for the navigation container */
  className?: string
  /** True when this wizard is rendered inside a parent wizard via a Referenced Form component */
  isNested?: boolean
}

/**
 * Parses conditionsJson from the panel navigation config and merges
 * visibleWhen/disabledWhen into buttons that match by key.
 */
function mergeConditionsJson(
  buttons: NavigationButton[],
  conditionsJson: string | undefined
): NavigationButton[] {
  if (!conditionsJson) return buttons
  try {
    const parsed = JSON.parse(conditionsJson) as Record<
      string,
      { visibleWhen?: NavigationButton['visibleWhen']; disabledWhen?: NavigationButton['disabledWhen'] }
    >
    return buttons.map((btn) => {
      const overrides = parsed[btn.key]
      if (!overrides) return btn
      return {
        ...btn,
        visibleWhen: overrides.visibleWhen ?? btn.visibleWhen,
        disabledWhen: overrides.disabledWhen ?? btn.disabledWhen,
      }
    })
  } catch (e) {
    console.warn('[WizardNavigation] Failed to parse conditionsJson — buttons will show without conditions applied:', e)
    return buttons
  }
}

/**
 * Resolves which buttons to render for the current wizard step.
 *
 * Priority:
 * 1. Panel-level customNavigation.buttons (step-specific)
 * 2. Form-level customWizardNavigation.defaultButtons (global fallback)
 * 3. Empty array (caller should fall back to existing hardcoded buttons)
 *
 * Also merges conditionsJson from the panel navigation into matched buttons.
 */
export function resolveNavigationButtons(
  config: CustomWizardNavigation | undefined,
  panelNavigation: PanelCustomNavigation | undefined
): NavigationButton[] {
  if (!config?.enabled) return []
  let buttons: NavigationButton[] = []
  if (panelNavigation?.buttons && panelNavigation.buttons.length > 0) {
    buttons = panelNavigation.buttons
  } else if (config.defaultButtons && config.defaultButtons.length > 0) {
    buttons = config.defaultButtons
  }
  if (buttons.length === 0) return []
  return mergeConditionsJson(buttons, panelNavigation?.conditionsJson)
}

/**
 * Determines whether default navigation should be hidden for the current step.
 */
export function shouldHideDefaultNavigation(
  config: CustomWizardNavigation | undefined,
  panelNavigation: PanelCustomNavigation | undefined
): boolean {
  if (!config?.enabled) return false
  if (panelNavigation?.hideDefaultNavigation !== undefined) {
    return panelNavigation.hideDefaultNavigation
  }
  return config.hideDefaultNavigation
}

// ---------------------------------------------------------------------------
// Variant → CSS classes mapping (Bootstrap)
// ---------------------------------------------------------------------------

const VARIANT_CLASSES: Record<NavigationButtonVariant, string> = {
  primary: 'btn btn-primary',
  secondary: 'btn btn-secondary',
  outline: 'btn btn-outline-secondary',
  danger: 'btn btn-danger',
  link: 'btn btn-link',
}

const ALIGN_STYLES: Record<NavigationButtonAlign, React.CSSProperties> = {
  left: { marginRight: 'auto' },
  center: {},
  right: { marginLeft: 'auto' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Renders custom wizard navigation buttons based on Designer-saved config.
 * Evaluates visibility/disabled conditions against current form data.
 */
export function WizardNavigationRenderer({
  config,
  panelNavigation,
  data,
  onAction,
  isSaving,
  className,
  isNested = false,
}: WizardNavigationRendererProps) {
  const buttons = resolveNavigationButtons(config, panelNavigation)
  if (buttons.length === 0) return null

  const visibleButtons = buttons.filter((btn) => {
    if (btn.renderOnlyWhenNested && !isNested) return false
    if (!btn.visible) return false
    return evaluateConditions(btn.visibleWhen, data)
  })

  if (visibleButtons.length === 0) return null

  return (
    <div
      className={className ?? 'wizard-custom-navigation d-flex flex-wrap gap-2 mt-3'}
      style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}
    >
      {visibleButtons.map((btn) => {
        // disabledWhen: if all conditions pass → button is disabled
        const conditionDisabled = btn.disabledWhen && btn.disabledWhen.length > 0
          ? evaluateConditions(btn.disabledWhen, data)
          : false
        const computedDisabled = isSaving || btn.disabled || conditionDisabled

        return (
          <button
            key={btn.key}
            type="button"
            className={VARIANT_CLASSES[btn.variant] || 'btn btn-secondary'}
            style={{
              ...ALIGN_STYLES[btn.align],
              ...(computedDisabled ? { opacity: 0.6, cursor: 'not-allowed' } : {}),
            }}
            disabled={computedDisabled}
            onClick={() => onAction(btn)}
          >
            {isSaving ? 'Saving...' : btn.label}
          </button>
        )
      })}
    </div>
  )
}
