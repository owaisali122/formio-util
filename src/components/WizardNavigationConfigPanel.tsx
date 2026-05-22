'use client'

import React, { useCallback, useState } from 'react'
import type {
  CustomWizardNavigation,
  NavigationButton,
  NavigationActionType,
  NavigationButtonVariant,
  NavigationButtonAlign,
} from '../types/wizard-navigation'

export interface WizardNavigationConfigPanelProps {
  value: CustomWizardNavigation | undefined
  onChange: (config: CustomWizardNavigation) => void
}

const DEFAULT_CONFIG: CustomWizardNavigation = {
  enabled: false,
  hideDefaultNavigation: true,
  defaultButtons: [],
}

const EMPTY_BUTTON: NavigationButton = {
  key: '',
  label: '',
  action: 'next',
  variant: 'primary',
  align: 'right',
  visible: true,
  disabled: false,
}

const ACTION_OPTIONS: { label: string; value: NavigationActionType }[] = [
  { label: 'Back', value: 'back' },
  { label: 'Next / Continue', value: 'next' },
  { label: 'Skip', value: 'skip' },
  { label: 'Submit', value: 'submit' },
  { label: 'Save & Exit', value: 'saveExit' },
  { label: 'Exit', value: 'exit' },
  { label: 'Finish', value: 'finish' },
  { label: 'Custom', value: 'custom' },
]

const VARIANT_OPTIONS: { label: string; value: NavigationButtonVariant }[] = [
  { label: 'Primary', value: 'primary' },
  { label: 'Secondary', value: 'secondary' },
  { label: 'Outline', value: 'outline' },
  { label: 'Danger', value: 'danger' },
  { label: 'Link', value: 'link' },
]

const ALIGN_OPTIONS: { label: string; value: NavigationButtonAlign }[] = [
  { label: 'Left', value: 'left' },
  { label: 'Center', value: 'center' },
  { label: 'Right', value: 'right' },
]

const panelStyles: Record<string, React.CSSProperties> = {
  container: {
    border: '1px solid #e5e7eb',
    borderRadius: 6,
    padding: '12px 16px',
    marginBottom: 12,
    background: '#f9fafb',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    userSelect: 'none',
  },
  title: { fontWeight: 600, fontSize: 14 },
  body: { marginTop: 12 },
  row: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    marginBottom: 6,
  },
  label: { fontSize: 12, fontWeight: 500, marginBottom: 2 },
  input: { padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, width: '100%' },
  select: { padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13 },
  buttonRow: {
    border: '1px solid #e5e7eb',
    borderRadius: 4,
    padding: '8px 10px',
    marginBottom: 8,
    background: '#fff',
  },
  addBtn: {
    padding: '4px 12px',
    fontSize: 12,
    border: '1px solid #2563eb',
    background: '#eff6ff',
    color: '#2563eb',
    borderRadius: 4,
    cursor: 'pointer',
  },
  removeBtn: {
    padding: '2px 8px',
    fontSize: 11,
    border: '1px solid #dc2626',
    background: '#fef2f2',
    color: '#dc2626',
    borderRadius: 4,
    cursor: 'pointer',
  },
  moveBtn: {
    padding: '1px 6px',
    fontSize: 10,
    lineHeight: '14px',
    border: '1px solid #d1d5db',
    background: '#f9fafb',
    color: '#374151',
    borderRadius: 3,
    cursor: 'pointer',
  },
}

export function WizardNavigationConfigPanel({ value, onChange }: WizardNavigationConfigPanelProps) {
  const [expanded, setExpanded] = useState(false)
  const config = value ?? DEFAULT_CONFIG

  const update = useCallback(
    (partial: Partial<CustomWizardNavigation>) => {
      onChange({ ...config, ...partial })
    },
    [config, onChange]
  )

  const updateButton = useCallback(
    (index: number, partial: Partial<NavigationButton>) => {
      const buttons = [...(config.defaultButtons || [])]
      buttons[index] = { ...buttons[index], ...partial }
      update({ defaultButtons: buttons })
    },
    [config.defaultButtons, update]
  )

  const addButton = useCallback(() => {
    const buttons = [...(config.defaultButtons || [])]
    const key = `btn_${Date.now()}`
    buttons.push({ ...EMPTY_BUTTON, key })
    update({ defaultButtons: buttons })
  }, [config.defaultButtons, update])

  const removeButton = useCallback(
    (index: number) => {
      const buttons = [...(config.defaultButtons || [])]
      buttons.splice(index, 1)
      update({ defaultButtons: buttons })
    },
    [config.defaultButtons, update]
  )

  const moveButton = useCallback(
    (index: number, direction: -1 | 1) => {
      const buttons = [...(config.defaultButtons || [])]
      const target = index + direction
      if (target < 0 || target >= buttons.length) return
      ;[buttons[index], buttons[target]] = [buttons[target], buttons[index]]
      update({ defaultButtons: buttons })
    },
    [config.defaultButtons, update]
  )

  return (
    <div style={panelStyles.container}>
      <div style={panelStyles.header} onClick={() => setExpanded(!expanded)}>
        <span style={panelStyles.title}>
          {expanded ? '▼' : '▶'} Custom Wizard Navigation
        </span>
        <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }} onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => update({ enabled: e.target.checked })}
          />
          Enabled
        </label>
      </div>

      {expanded && config.enabled && (
        <div style={panelStyles.body}>
          <div style={panelStyles.row}>
            <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
              <input
                type="checkbox"
                checked={config.hideDefaultNavigation}
                onChange={(e) => update({ hideDefaultNavigation: e.target.checked })}
              />
              Hide default navigation (global)
            </label>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ ...panelStyles.label, marginBottom: 8 }}>
              Default Buttons (fallback for all wizard pages):
            </div>

            {(config.defaultButtons || []).map((btn, idx) => (
              <div key={btn.key || idx} style={panelStyles.buttonRow}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, justifyContent: 'center' }}>
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveButton(idx, -1)}
                      style={{ ...panelStyles.moveBtn, ...(idx === 0 ? { opacity: 0.3, cursor: 'default' } : {}) }}
                      title="Move up"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      disabled={idx === (config.defaultButtons || []).length - 1}
                      onClick={() => moveButton(idx, 1)}
                      style={{ ...panelStyles.moveBtn, ...(idx === (config.defaultButtons || []).length - 1 ? { opacity: 0.3, cursor: 'default' } : {}) }}
                      title="Move down"
                    >
                      ▼
                    </button>
                  </div>
                  <div>
                    <div style={panelStyles.label}>Key</div>
                    <input
                      style={{ ...panelStyles.input, width: 100 }}
                      value={btn.key}
                      onChange={(e) => updateButton(idx, { key: e.target.value })}
                    />
                  </div>
                  <div>
                    <div style={panelStyles.label}>Label</div>
                    <input
                      style={{ ...panelStyles.input, width: 120 }}
                      value={btn.label}
                      onChange={(e) => updateButton(idx, { label: e.target.value })}
                    />
                  </div>
                  <div>
                    <div style={panelStyles.label}>Action</div>
                    <select
                      style={panelStyles.select}
                      value={btn.action}
                      onChange={(e) => updateButton(idx, { action: e.target.value as NavigationActionType })}
                    >
                      {ACTION_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div style={panelStyles.label}>Style</div>
                    <select
                      style={panelStyles.select}
                      value={btn.variant}
                      onChange={(e) => updateButton(idx, { variant: e.target.value as NavigationButtonVariant })}
                    >
                      {VARIANT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div style={panelStyles.label}>Align</div>
                    <select
                      style={panelStyles.select}
                      value={btn.align}
                      onChange={(e) => updateButton(idx, { align: e.target.value as NavigationButtonAlign })}
                    >
                      {ALIGN_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
                      <input
                        type="checkbox"
                        checked={btn.validateBeforeAction ?? false}
                        onChange={(e) => updateButton(idx, { validateBeforeAction: e.target.checked })}
                      />
                      Validate
                    </label>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
                      <input
                        type="checkbox"
                        checked={btn.saveBeforeAction ?? false}
                        onChange={(e) => updateButton(idx, { saveBeforeAction: e.target.checked })}
                      />
                      Save
                    </label>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
                      <input
                        type="checkbox"
                        checked={btn.renderOnlyWhenNested ?? false}
                        onChange={(e) => updateButton(idx, { renderOnlyWhenNested: e.target.checked })}
                      />
                      Nested only
                    </label>
                  </div>
                  <button
                    type="button"
                    style={panelStyles.removeBtn}
                    onClick={() => removeButton(idx)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}

            <button type="button" style={panelStyles.addBtn} onClick={addButton}>
              + Add Default Button
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
