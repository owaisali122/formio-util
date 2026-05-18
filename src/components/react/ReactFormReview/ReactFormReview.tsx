'use client'

/**
 * ReactFormReview — standalone React wrapper for the Form Review display.
 *
 * Single source of truth: the same `resolveSections` helper used by the
 * Form.io runtime (FormReviewFormIO.ts). The DOM structure, class names,
 * and rendering rules here mirror that runtime 1:1 so visual + behavioral
 * parity is preserved.
 *
 * The wrapper also injects the shared `formio-overrides` stylesheet (the
 * same one `FormRenderer` / `FormBuilder` inject) so the `.form-review-*`
 * classes — including the collapse rule `.form-review-section-body--hidden`
 * — are guaranteed to be present even when the component is used outside
 * of a Form.io renderer host.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { BootstrapProvider } from '../../../providers/BootstrapProvider'
import { injectFormioOverrides } from '../../../utils/inject-formio-overrides'
import { resolveSections } from '../../../coreHelper/FormReviewCore/FormReviewCore.helpers'
import type {
  NestedReviewEntry,
  ResolvedReviewItem,
  ResolvedReviewSection,
  ReviewSensitiveValue,
} from '../../../coreHelper/FormReviewCore/FormReviewCore.types'
import type { ReactFormReviewProps } from './ReactFormReview.types'

const DEFAULT_EMPTY = '\u2014'

function getColClass(columns: number): string {
  switch (columns) {
    case 1: return 'col-12'
    case 3: return 'col-md-4'
    case 4: return 'col-md-3'
    default: return 'col-md-6'
  }
}

// ── Nested object rendering ────────────────────────────────────────

function NestedEntries({
  entries,
  depth = 0,
}: {
  entries: NestedReviewEntry[]
  depth?: number
}) {
  const indentClass = depth > 0 ? ' form-review-nested-indent' : ''
  return (
    <ul className={'form-review-nested-list' + indentClass}>
      {entries.map((entry, idx) => {
        if (entry.nestedItems) {
          return (
            <li
              key={idx}
              className="form-review-nested-entry form-review-nested-entry--group"
            >
              <span className="form-review-nested-key">{entry.label}</span>
              <NestedEntries entries={entry.nestedItems} depth={depth + 1} />
            </li>
          )
        }
        const emptyClass = entry.isEmpty ? ' form-review-item-value--empty' : ''
        let valueNode: React.ReactNode
        if (entry.isBoolean) {
          const isChecked = entry.booleanValue === true
          const iconClass = isChecked ? 'fa fa-check-square-o' : 'fa fa-square-o'
          const boolClass = isChecked
            ? 'form-review-bool-icon--checked'
            : 'form-review-bool-icon--unchecked'
          valueNode = (
            <>
              <i className={iconClass + ' ' + boolClass} /> {entry.value}
            </>
          )
        } else {
          valueNode = entry.value
        }
        return (
          <li key={idx} className="form-review-nested-entry">
            <span className="form-review-nested-key">{entry.label}</span>
            <span className={'form-review-nested-value' + emptyClass}>{valueNode}</span>
          </li>
        )
      })}
    </ul>
  )
}

// ── Sensitive value (SSN/ITIN) ─────────────────────────────────────

function SensitiveValueView({
  item,
  sensitiveValue,
  revealed,
  onToggle,
}: {
  item: ResolvedReviewItem
  sensitiveValue: ReviewSensitiveValue
  revealed: boolean
  onToggle: () => void
}) {
  const visibleText = revealed ? sensitiveValue.fullText : sensitiveValue.defaultText
  if (!item.reviewKey || !sensitiveValue.isToggleable) {
    return <>{visibleText}</>
  }
  const label = revealed ? 'Hide SSN / ITIN' : 'Show SSN / ITIN'
  const iconClass = revealed ? 'fa fa-eye-slash' : 'fa fa-eye'
  return (
    <span className="form-review-sensitive-value">
      <span>{visibleText}</span>
      <button
        type="button"
        className="form-review-sensitive-toggle"
        aria-label={label}
        aria-pressed={revealed}
        title={label}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onToggle()
        }}
      >
        <i className={iconClass} />
      </button>
    </span>
  )
}

// ── Single item ────────────────────────────────────────────────────

function Item({
  item,
  colClass,
  revealed,
  onToggleSensitive,
}: {
  item: ResolvedReviewItem
  colClass: string
  revealed: boolean
  onToggleSensitive: (reviewKey: string) => void
}) {
  if (item.isObject) {
    return (
      <div className="col-12 mb-3">
        <div className="form-review-item-label">{item.label}</div>
        <div className="form-review-nested-object">
          {item.nestedItems && item.nestedItems.length > 0 ? (
            <NestedEntries entries={item.nestedItems} />
          ) : (
            <span className="form-review-item-value--empty">{DEFAULT_EMPTY}</span>
          )}
        </div>
      </div>
    )
  }

  const emptyClass = item.isEmpty ? ' form-review-item-value--empty' : ''
  let valueNode: React.ReactNode
  if (item.sensitiveValue) {
    valueNode = (
      <SensitiveValueView
        item={item}
        sensitiveValue={item.sensitiveValue}
        revealed={revealed}
        onToggle={() => item.reviewKey && onToggleSensitive(item.reviewKey)}
      />
    )
  } else if (item.isBoolean) {
    // Mirror FormReviewFormIO heuristic for the boolean icon.
    const isChecked =
      item.value !== 'No' && item.value !== 'False' && item.value !== 'false'
    const iconClass = isChecked ? 'fa fa-check-square-o' : 'fa fa-square-o'
    const boolClass = isChecked
      ? 'form-review-bool-icon--checked'
      : 'form-review-bool-icon--unchecked'
    valueNode = (
      <>
        <i className={iconClass + ' ' + boolClass} />
        {item.value}
      </>
    )
  } else {
    valueNode = item.value
  }

  return (
    <div className={colClass + ' mb-3'}>
      <div className="form-review-item-label">{item.label}</div>
      <div className={'form-review-item-value' + emptyClass}>{valueNode}</div>
    </div>
  )
}

// ── Section card ───────────────────────────────────────────────────

function Section({
  section,
  expanded,
  onToggleSection,
  revealedKeys,
  onToggleSensitive,
}: {
  section: ResolvedReviewSection
  expanded: boolean
  onToggleSection: (sectionKey: string) => void
  revealedKeys: Set<string>
  onToggleSensitive: (reviewKey: string) => void
}) {
  const colClass = getColClass(section.columns)
  const itemsNode =
    section.items.length > 0 ? (
      <div className="row">
        {section.items.map((item, idx) => (
          <Item
            key={item.reviewKey ?? idx}
            item={item}
            colClass={colClass}
            revealed={!!(item.reviewKey && revealedKeys.has(item.reviewKey))}
            onToggleSensitive={onToggleSensitive}
          />
        ))}
      </div>
    ) : (
      <p className="form-review-empty-text">No fields configured for this section.</p>
    )

  if (!section.collapsible) {
    return (
      <div className="form-review-section">
        <div className="form-review-section-header--static">
          <h5 className="form-review-section-title">{section.title}</h5>
        </div>
        <div className="form-review-section-body">{itemsNode}</div>
      </div>
    )
  }

  const iconClass = expanded ? 'fa fa-minus-square-o' : 'fa fa-plus-square-o'
  const bodyClass =
    'form-review-section-body' + (expanded ? '' : ' form-review-section-body--hidden')

  return (
    <div className="form-review-section">
      <div
        className="form-review-section-header"
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={() => onToggleSection(section.sectionKey)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onToggleSection(section.sectionKey)
          }
        }}
      >
        <h5 className="form-review-section-title">
          <span>{section.title}</span>
          <i className={iconClass} />
        </h5>
      </div>
      <div className={bodyClass}>{itemsNode}</div>
    </div>
  )
}

// ── Root component ─────────────────────────────────────────────────

export function ReactFormReview(props: ReactFormReviewProps) {
  const {
    sections: sectionsProp,
    data,
    formComponents,
    description,
    showExpandAll = true,
    emptyValueText,
    defaultSectionExpanded,
    className,
  } = props

  // Inject the shared formio overrides stylesheet so the .form-review-*
  // rules — including the collapse rule that hides bodies — are present
  // even when this wrapper is used outside FormRenderer/FormBuilder.
  useEffect(() => {
    injectFormioOverrides()
  }, [])

  // Resolve sections via the shared helper. Depend only on the underlying
  // inputs so the helper is not re-run on unrelated prop identity changes.
  const sections = useMemo<ResolvedReviewSection[]>(
    () =>
      resolveSections(
        {
          sections: sectionsProp || [],
          showExpandAll,
          emptyValueText,
          defaultSectionExpanded,
        },
        formComponents,
        data ?? {},
      ),
    [sectionsProp, showExpandAll, emptyValueText, defaultSectionExpanded, formComponents, data],
  )

  // Per-section expanded state. Keyed by sectionKey; survives re-renders.
  // Newly-added sections inherit their own `defaultExpanded`.
  const [sectionStates, setSectionStates] = useState<Record<string, boolean>>({})

  const resolvedExpanded = useMemo(() => {
    const map: Record<string, boolean> = {}
    for (const s of sections) {
      map[s.sectionKey] =
        sectionStates[s.sectionKey] === undefined
          ? s.defaultExpanded
          : sectionStates[s.sectionKey]
    }
    return map
  }, [sections, sectionStates])

  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(() => new Set())

  // Drop sensitive-reveal entries for items no longer present or no longer toggleable.
  useEffect(() => {
    setRevealedKeys((prev) => {
      if (prev.size === 0) return prev
      const live = new Set<string>()
      for (const s of sections) {
        for (const it of s.items) {
          if (it.reviewKey && it.sensitiveValue?.isToggleable) {
            live.add(it.reviewKey)
          }
        }
      }
      let changed = false
      const next = new Set<string>()
      for (const key of prev) {
        if (live.has(key)) next.add(key)
        else changed = true
      }
      return changed ? next : prev
    })
  }, [sections])

  const onToggleSection = useCallback((sectionKey: string) => {
    setSectionStates((prev) => ({
      ...prev,
      // `undefined` means "not yet toggled" — treat as expanded by default.
      [sectionKey]: !(prev[sectionKey] !== false),
    }))
  }, [])

  const onToggleSensitive = useCallback((reviewKey: string) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(reviewKey)) next.delete(reviewKey)
      else next.add(reviewKey)
      return next
    })
  }, [])

  const collapsible = useMemo(
    () => sections.filter((s) => s.collapsible),
    [sections],
  )

  // Reactive: button label flips as section state changes.
  const allExpanded =
    collapsible.length > 0 &&
    collapsible.every((s) => resolvedExpanded[s.sectionKey] !== false)

  const showToolbar = showExpandAll && collapsible.length > 0

  // Always re-derive target from latest state inside the setter, so rapid
  // clicks / stale closures cannot flip the button incorrectly.
  const onExpandAll = useCallback(() => {
    setSectionStates((prev) => {
      const currentlyAllExpanded = collapsible.every((s) => {
        const v = prev[s.sectionKey]
        return v === undefined ? s.defaultExpanded !== false : v !== false
      })
      const target = !currentlyAllExpanded
      const next = { ...prev }
      for (const s of collapsible) next[s.sectionKey] = target
      return next
    })
  }, [collapsible])

  const wrapperClassName = ['form-review-component', className].filter(Boolean).join(' ')

  return (
    <BootstrapProvider>
      <div className={wrapperClassName}>
        {description ? <p className="form-review-description">{description}</p> : null}

        {showToolbar ? (
          <div className="form-review-toolbar">
            <button
              type="button"
              className="btn btn-link btn-sm p-0"
              onClick={onExpandAll}
            >
              {allExpanded ? 'Collapse All' : 'Expand All'}
            </button>
          </div>
        ) : null}

        {sections.length > 0 ? (
          sections.map((section) => (
            <Section
              key={section.sectionKey}
              section={section}
              expanded={resolvedExpanded[section.sectionKey] !== false}
              onToggleSection={onToggleSection}
              revealedKeys={revealedKeys}
              onToggleSensitive={onToggleSensitive}
            />
          ))
        ) : (
          <p className="form-review-empty-text">No review sections configured.</p>
        )}
      </div>
    </BootstrapProvider>
  )
}

export default ReactFormReview
