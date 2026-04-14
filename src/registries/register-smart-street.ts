import { createRoot, Root } from 'react-dom/client'
import React from 'react'
import {
  SmartStreetDropdownComponent,
  SEARCHABLE_DROPDOWN_TYPE,
} from '../components/SmartStreetDropdown'
import type { AddressResult, SmartStreetValue } from '../components/SmartStreet'
import type { FormioComponents } from './types'

type ReactComponent = React.ComponentType<any>
let SmartStreetComponent: ReactComponent | null = null

async function loadReactComponent(): Promise<ReactComponent | null> {
  if (!SmartStreetComponent) {
    const mod = await import('../components/SmartStreet')
    SmartStreetComponent = mod.SmartStreet
  }
  return SmartStreetComponent
}

/**
 * Module-level cache: survives component destroy/recreate cycles in the
 * designer preview. Keyed by component property name.
 */
const _mountCache = new Map<string, { mount: HTMLDivElement; root: Root }>()

function isSmartStreetValueEqual(
  a: SmartStreetValue | null | undefined,
  b: SmartStreetValue | null | undefined,
): boolean {
  if (a === b) return true
  if (!a || !b) return false
  if (a.selectedLabel !== b.selectedLabel) return false
  const aa = a.address, ba = b.address
  if (!aa && !ba) return true
  if (!aa || !ba) return false
  return aa.streetLine === ba.streetLine
    && aa.secondary === ba.secondary
    && aa.city === ba.city
    && aa.state === ba.state
    && aa.zipcode === ba.zipcode
}

export async function registerSmartStreet(Components: FormioComponents): Promise<void> {
  const FieldComponent = (Components.components as any).field as any

  class SmartStreet extends FieldComponent {
    private reactRoot: Root | null = null
    private _persistentMount: HTMLDivElement | null = null
    private currentValue: SmartStreetValue | null = null
    private _initialValueTimeout: ReturnType<typeof setTimeout> | null = null
    private _onChangeBound: (v: SmartStreetValue | null) => void
    private _onAddressSelectedBound: (address: AddressResult) => void
    private _mounted: boolean = false

    static schema(...extend: any[]) {
      return FieldComponent.schema(
        SmartStreetDropdownComponent.schema(),
        ...extend,
      )
    }

    static get builderInfo() {
      return SmartStreetDropdownComponent.builderInfo
    }

    static editForm() {
      return SmartStreetDropdownComponent.editForm()
    }

    get defaultSchema() {
      return SmartStreet.schema()
    }

    constructor(component: any, options: any, data: any) {
      super(component, options, data)
      this.currentValue = null
      const key = component.key
      if (data && key && data[key]) this.currentValue = data[key]
      this._onChangeBound = (v: SmartStreetValue | null) =>
        this.handleReactChange(v)
      this._onAddressSelectedBound = (address: AddressResult) =>
        this.handleAddressSelected(address)
    }

    render() {
      return super.render(`
        <div ref="smartStreetContainer" class="formio-smart-street" style="width:100%;min-height:38px;">
          <div class="smart-street-loading-placeholder" style="padding:10px;color:#666;">
            Loading Smart Street...
          </div>
        </div>
      `)
    }

    /**
     * Override redraw to prevent full DOM replacement when React is already
     * mounted. Form.io calls redraw() on every property change and tab switch
     * in the designer, which destroys and recreates the DOM — causing the
     * React component to unmount/remount (visible as jerking).
     *
     * When the React root is live, we skip the DOM rebuild and just
     * re-render the React tree with the latest props.
     */
    redraw() {
      if (this._mounted && this.reactRoot && this._persistentMount) {
        if (SmartStreetComponent) {
          this.renderReactComponent(SmartStreetComponent)
        }
        return Promise.resolve()
      }
      return super.redraw()
    }

    attach(element: HTMLElement) {
      if (this._initialValueTimeout) {
        clearTimeout(this._initialValueTimeout)
        this._initialValueTimeout = null
      }
      const result = super.attach(element)
      this.loadRefs(element, { smartStreetContainer: 'single' })
      const container = (this.refs as any)?.smartStreetContainer
      if (container) this.mountReactComponent(container as HTMLElement)
      if (!this.currentValue) {
        this._initialValueTimeout = setTimeout(() => {
          this._initialValueTimeout = null
          this.tryLoadInitialValue()
        }, 150)
      }
      return result
    }

    tryLoadInitialValue() {
      const key = this.component?.key
      if (!key) return
      if (this.currentValue) return

      let value: SmartStreetValue | null = null
      if (this.data?.[key] && typeof this.data[key] === 'object' && this.data[key]?.selectedLabel) {
        value = this.data[key]
      }
      if (value) {
        this.currentValue = value
        if (this.reactRoot && SmartStreetComponent) this.renderReactComponent(SmartStreetComponent)
      }
    }

    async mountReactComponent(container: HTMLElement) {
      try {
        if (!container) return
        const Component = await loadReactComponent()
        if (!Component) return

        const cacheKey = this.component?.key || ''

        // Check module-level cache for a root from a previous instance
        if (!this._persistentMount && cacheKey) {
          const cached = _mountCache.get(cacheKey)
          if (cached) {
            this._persistentMount = cached.mount
            this.reactRoot = cached.root
            _mountCache.delete(cacheKey)
          }
        }

        // Lazy-create on first ever mount
        if (!this._persistentMount) {
          this._persistentMount = document.createElement('div')
          this._persistentMount.className = 'searchable-dropdown-react-mount'
        }

        // Move (or append) the persistent div into the new container.
        // appendChild on an already-in-DOM node just moves it — React
        // tree stays intact, no unmount/remount, no state reset.
        container.innerHTML = ''
        container.appendChild(this._persistentMount)

        if (!this.reactRoot) {
          this.reactRoot = createRoot(this._persistentMount)
        }

        this._mounted = true
        this.tryLoadInitialValue()
        this.renderReactComponent(Component)
      } catch {
        container.innerHTML = '<div style="color:red;">Error loading dropdown</div>'
      }
    }

    renderReactComponent(Component: ReactComponent) {
      if (!this.reactRoot) return
      this.reactRoot.render(
        React.createElement(Component, {
          name: this.component.key || 'smartStreet',
          placeholder: this.component.placeholder || 'Type to search address...',
          minSearchLength: this.component.minSearchLength ?? 2,
          debounceDelay: this.component.debounceDelay ?? 300,
          value: this.currentValue,
          onChange: this._onChangeBound,
          addressApiConfig: this.component.addressApi || undefined,
          addressMapping: this.component.addressMapping || undefined,
          onAddressSelected: this._onAddressSelectedBound,
          disabled: this.component.disabled || this.options?.readOnly || false,
        }),
      )
    }

    /**
     * Called when the user selects a final address suggestion.
     * Uses the component's addressMapping config to find and populate
     * the related form fields via Form.io's getComponent / setValue APIs.
     */
    handleAddressSelected(address: AddressResult) {
      const mapping = (this.component.addressMapping || {}) as Record<string, string>
      const root = this.root

      const fieldValues: Record<string, string> = {
        streetLine: address.streetLine,
        secondary: address.secondary,
        city: address.city,
        state: address.state,
        zipcode: address.zipcode,
      }

      Object.entries(mapping).forEach(([field, targetKey]) => {
        if (!targetKey) return
        const value = fieldValues[field] ?? ''
        // Prefer Form.io's component API so that validation + events fire
        const comp = root?.getComponent ? root.getComponent(targetKey) : null
        if (comp) {
          comp.setValue(value)
          comp.triggerChange?.()
        } else if (root?.data) {
          // Fallback: set directly on submission data
          root.data[targetKey] = value
        }
      })
    }

    handleReactChange(newValue: SmartStreetValue | null) {
      if (isSmartStreetValueEqual(newValue, this.currentValue)) return
      this.currentValue = newValue
      const key = this.component.key
      if (this.data && key) this.data[key] = newValue
      if (this.root?.data && key && this.data === this.root.data) this.root.data[key] = newValue
      this.triggerChange()
    }

    getValue() {
      return this.currentValue
    }

    setValue(value: any, flags?: any) {
      if (value === undefined) return
      const isEmpty = value === null || value === ''
      if (isEmpty && this.currentValue) return
      if (isSmartStreetValueEqual(value, this.currentValue)) return super.setValue(value, flags)
      this.currentValue = value
      if (this.reactRoot && SmartStreetComponent) this.renderReactComponent(SmartStreetComponent)
      return super.setValue(value, flags)
    }

    get dataValue() {
      return this.currentValue
    }

    set dataValue(value: any) {
      if (value === undefined) return
      const isEmpty = value === null || value === ''
      if (isEmpty && this.currentValue) return
      if (isSmartStreetValueEqual(value, this.currentValue)) return
      this.currentValue = value
      if (this.reactRoot && SmartStreetComponent) this.renderReactComponent(SmartStreetComponent)
    }

    checkValidity(data: any, dirty: boolean, rowData: any) {
      const baseValid = super.checkValidity(data, dirty, rowData)
      if (!baseValid) return false

      const value = this.currentValue
      const isEmpty = value === null || value === undefined

      if (isEmpty && this.component.validate?.required) {
        const msg = this.component.validate.customMessage || 'This field is required'
        this.setCustomValidity(msg, dirty)
        return false
      }

      // Run custom JavaScript validation if configured
      const customValidation = this.component.validate?.custom
      if (customValidation && !isEmpty) {
        try {
          const input = value
          const { data: formData, row } = this
          const component = this.component
          const instance = this
          // Use new Function instead of eval to avoid bundler warnings.
          // Exposes the same local variables the script expects.
          const fn = new Function('input', 'formData', 'row', 'component', 'instance', `let valid = true;\n${customValidation}\nreturn valid;`)
          const valid: boolean | string = fn(input, formData, row, component, instance)
          if (valid !== true) {
            const msg = typeof valid === 'string' ? valid : (this.component.validate.customMessage || 'Custom validation failed')
            this.setCustomValidity(msg, dirty)
            return false
          }
        } catch (err) {
          console.error('SmartStreet: custom validation error', err)
        }
      }

      return true
    }

    destroy() {
      if (this._initialValueTimeout) {
        clearTimeout(this._initialValueTimeout)
        this._initialValueTimeout = null
      }
      this._mounted = false

      const cacheKey = this.component?.key || ''

      // Cache the React root + mount div so the next preview instance
      // can reuse them instead of rebuilding from scratch.
      if (cacheKey && this._persistentMount && this.reactRoot) {
        _mountCache.set(cacheKey, { mount: this._persistentMount, root: this.reactRoot })
        this.reactRoot = null
        this._persistentMount = null
      } else {
        const root = this.reactRoot
        this.reactRoot = null
        this._persistentMount = null
        if (root) {
          queueMicrotask(() => { try { root.unmount() } catch { /* already unmounted */ } })
        }
      }
      super.destroy()
    }

    loadItems() { return Promise.resolve() }
    updateItems() { return }
    setItems() { return }
  }

  Components.setComponent(SEARCHABLE_DROPDOWN_TYPE, SmartStreet)
}
