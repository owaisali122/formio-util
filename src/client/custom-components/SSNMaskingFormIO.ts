/**
 * Tax ID Masking FormIO Component (Renderer)
 *
 * Runtime renderer for the Tax ID (SSN / ITIN) component. Extends
 * TextFieldComponent for label/error template + Form.io lifecycle, but the
 * actual input UI (masking, eye toggle, copy prevention, paste handling) is
 * rendered by the shared `SSNInputCore` React component via createRoot.
 *
 * This file owns ONLY the Form.io adapter concerns:
 *   - schema / inputMask suppression
 *   - dataValue / getValue / setValue / validationValue
 *   - checkValidity (delegates to validateTaxId from shared helpers)
 *   - triggerChange wiring
 *   - mounting / unmounting the React core inside the Form.io DOM
 *
 * Designer properties read from this.component:
 *   masked, allowToggleMask, maskedDisplayMode, maskCharacter, preventCopy,
 *   validationMode ('any' | 'ssn' | 'itin')
 */

import React from 'react'
import { createRoot, type Root } from 'react-dom/client'

import { SSNInputCore } from '../../components/react/SSNInputCore/SSNInputCore'
import {
  digitsOnly,
  validateTaxId,
  formatTaxId,
} from '../../components/react/SSNInputCore/ssn-helpers'

export function createSSNMaskingClass(TextFieldComponent: any) {
  return class SSNMaskingFormIO extends TextFieldComponent {
    _rawValue = ''
    /** React root mounted into the Form.io DOM. Unmounted on detach. */
    _reactRoot: Root | null = null
    /** Container element React renders into. */
    _reactContainer: HTMLElement | null = null

    static schema(...extend: any[]) {
      return TextFieldComponent.schema({ type: 'ssn' }, ...extend)
    }

    // ── Prevent Form.io from initializing its Inputmask library ──

    constructor(component: any, options: any, data: any) {
      if (component) {
        component.inputMask = ''
        component.displayMask = ''
      }
      super(component, options, data)
      this.skipMaskValidation = true
      if (data && component?.key && data[component.key]) {
        this._rawValue = digitsOnly(data[component.key])
      }
    }

    setInputMask() { /* no-op */ }

    get inputInfo() {
      const info = super.inputInfo
      if (info?.attr) {
        delete info.attr.mask
        delete info.attr.inputMask
      }
      return info
    }

    // ── Lifecycle ──

    attach(element: HTMLElement) {
      const result = super.attach(element)
      // Defer one tick so super.attach() has fully populated this.element.
      setTimeout(() => this._mountReact(), 0)
      return result
    }

    detach() {
      this._unmountReact()
      return super.detach()
    }

    destroy() {
      this._unmountReact()
      super.destroy()
    }

    // ── Value binding ──

    getValue() {
      return this._rawValue
    }

    setValue(value: any, flags?: any) {
      if (value === undefined) return
      this._rawValue = value ? digitsOnly(value) : ''
      const result = super.setValue(this._rawValue, flags)
      // Push the new value into the mounted React tree so external value
      // changes (defaultValue, logic actions, conditional resets, etc.)
      // are reflected in the UI.
      this._renderReact()
      return result
    }

    get dataValue() {
      return this._rawValue || super.dataValue || ''
    }

    set dataValue(value: any) {
      this._rawValue = value ? digitsOnly(value) : ''
      super.dataValue = this._rawValue
    }

    get validationValue() {
      const raw = this._rawValue
      if (raw.length !== 9) return raw
      // Return formatted if the validation pattern expects dashes.
      const pattern = this.component?.validate?.pattern || ''
      if (pattern.includes('-') || pattern.includes('{3}')) {
        return formatTaxId(raw)
      }
      return raw
    }

    // ── SSN / ITIN validation (delegates to shared helpers) ──

    checkValidity(data: any, dirty: boolean, row: any) {
      // Clear any previous custom validity from this component before re-checking.
      this.setCustomValidity('', dirty)
      const baseResult = super.checkValidity(data, dirty, row)
      if (!baseResult) return baseResult

      const raw = this._rawValue
      // Empty field is handled by Form.io's required validator above.
      if (!raw || raw.length === 0) return baseResult

      const mode = this.component?.validationMode || 'any'
      const result = validateTaxId(raw, mode)
      if (!result.valid) {
        const msg = this.component?.validate?.customMessage || result.message || 'Invalid tax ID.'
        this.setCustomValidity(msg, dirty)
        return false
      }
      return baseResult
    }

    // ── React mount / render ──

    _mountReact() {
      if (!this.element) return
      // Replace Form.io's auto-rendered <input> with a container that React
      // owns. We keep the surrounding label / description / error template
      // rendered by TextFieldComponent intact.
      const existingInput = this.element.querySelector('input[type="text"]') as
        | HTMLInputElement
        | null
      if (!existingInput || !existingInput.parentNode) return

      // Remove any Inputmask instance the parent may have attached.
      if ((existingInput as any).inputmask) {
        try { (existingInput as any).inputmask.remove() } catch { /* ignore */ }
      }

      const container = document.createElement('div')
      container.className = 'ssn-react-mount'
      existingInput.parentNode.replaceChild(container, existingInput)

      this._reactContainer = container
      this._reactRoot = createRoot(container)
      this._renderReact()
    }

    _unmountReact() {
      if (this._reactRoot) {
        try { this._reactRoot.unmount() } catch { /* ignore */ }
        this._reactRoot = null
      }
      this._reactContainer = null
    }

    /**
     * Bridge a value change from SSNInputCore into Form.io's data layer.
     * Kept as a method (not an inline arrow) so `super.dataValue = ...`
     * compiles cleanly without the arrow-super edge case.
     */
    _commitFromReact(raw: string) {
      this._rawValue = raw
      super.dataValue = raw
      const key = this.component?.key
      if (key && this.data) this.data[key] = raw
      this.triggerChange()
    }

    _renderReact() {
      if (!this._reactRoot) return
      const c = this.component || {}

      const tabindex =
        c.tabindex !== '' && c.tabindex != null && Number.isFinite(Number(c.tabindex))
          ? Number(c.tabindex)
          : undefined

      const self = this

      this._reactRoot.render(
        React.createElement(SSNInputCore, {
          value: this._rawValue,
          placeholder: c.placeholder || 'XXX-XX-XXXX',
          id: c.id || (this as any).id,
          name: c.key,
          disabled: c.disabled === true || (this as any).disabled === true,
          readOnly: (this as any).options?.readOnly === true,
          required: c.validate?.required === true,
          autoFocus: c.autofocus === true,
          tabIndex: tabindex,
          masked: c.masked !== false,
          maskedDisplayMode: c.maskedDisplayMode || 'last4',
          maskCharacter: c.maskCharacter || '*',
          allowToggleMask: c.allowToggleMask !== false,
          preventCopy: c.preventCopy !== false,
          onChange: (raw: string) => self._commitFromReact(raw),
        }),
      )
    }
  }
}

export default createSSNMaskingClass
