import { createRoot, Root } from 'react-dom/client'
import React from 'react'
import {
  SearchableDropdownComponent,
  SEARCHABLE_DROPDOWN_TYPE,
} from '../components/SearchableDropdown'
import type { AddressResult, SmartStreetValue } from '../components/SearchableDropdownReact'
import type { FormioComponents } from './types'

type ReactComponent = React.ComponentType<any>
let SmartStreetComponent: ReactComponent | null = null

async function loadReactComponent(): Promise<ReactComponent | null> {
  if (!SmartStreetComponent) {
    const mod = await import('../components/SearchableDropdownReact')
    SmartStreetComponent = mod.SmartStreet
  }
  return SmartStreetComponent
}

const ROOT_KEY = '__smartStreetRoot'

export async function registerSearchableDropdown(Components: FormioComponents): Promise<void> {
  const FieldComponent = (Components.components as any).field as any

  class SmartStreet extends FieldComponent {
    private reactRoot: Root | null = null
    private reactContainer: HTMLDivElement | null = null
    private currentValue: SmartStreetValue | null = null
    private _initialValueTimeout: ReturnType<typeof setTimeout> | null = null
    private _onChangeBound: (v: SmartStreetValue | null) => void
    private _onAddressSelectedBound: (address: AddressResult) => void

    static schema(...extend: any[]) {
      return FieldComponent.schema(
        SearchableDropdownComponent.schema(),
        ...extend,
      )
    }

    static get builderInfo() {
      return SearchableDropdownComponent.builderInfo
    }

    static editForm() {
      return SearchableDropdownComponent.editForm()
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

    attach(element: HTMLElement) {
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

        if (this.reactRoot && this.reactContainer && !document.contains(this.reactContainer)) {
          try { this.reactRoot.unmount() } catch { /* already unmounted */ }
          this.reactRoot = null
          this.reactContainer = null
          delete (container as any)[ROOT_KEY]
        }

        if (this.reactRoot && this.reactContainer && document.contains(this.reactContainer)) {
          const Component = await loadReactComponent()
          if (Component) this.renderReactComponent(Component)
          return
        }

        const existingRoot = (container as any)[ROOT_KEY] as Root | undefined
        if (existingRoot) {
          this.reactRoot = existingRoot
          this.reactContainer = container as unknown as HTMLDivElement
          const Component = await loadReactComponent()
          if (Component) this.renderReactComponent(Component)
          return
        }

        container.innerHTML = ''
        this.reactContainer = document.createElement('div')
        this.reactContainer.className = 'searchable-dropdown-react-mount'
        container.appendChild(this.reactContainer)
        const Component = await loadReactComponent()
        if (!Component) return
        this.tryLoadInitialValue()
        if (!this.reactContainer) return

        const existingOnNode = (this.reactContainer as any)[ROOT_KEY] as Root | undefined
        if (existingOnNode) {
          this.reactRoot = existingOnNode
        } else {
          this.reactRoot = createRoot(this.reactContainer)
          ;(this.reactContainer as any)[ROOT_KEY] = this.reactRoot
        }
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
      if (value === this.currentValue) return super.setValue(value, flags)
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
      if (value === this.currentValue) return
      this.currentValue = value
      if (this.reactRoot && SmartStreetComponent) this.renderReactComponent(SmartStreetComponent)
    }

    checkValidity(data: any, dirty: boolean, rowData: any) {
      const valid = super.checkValidity(data, dirty, rowData)
      if (!valid) return false

      const value = this.currentValue
      const isEmpty = value === null || value === undefined || value === ''

      if (isEmpty && this.component.validate?.required) {
        const msg = this.component.validate.customMessage || 'This field is required'
        this.setCustomValidity(msg, dirty)
        return false
      }

      return true
    }

    destroy() {
      if (this._initialValueTimeout) {
        clearTimeout(this._initialValueTimeout)
        this._initialValueTimeout = null
      }
      const root = this.reactRoot
      this.reactRoot = null
      this.reactContainer = null
      if (root) {
        queueMicrotask(() => { try { root.unmount() } catch { /* already unmounted */ } })
      }
      super.destroy()
    }

    loadItems() { return Promise.resolve() }
    updateItems() { return }
    setItems() { return }
  }

  Components.setComponent(SEARCHABLE_DROPDOWN_TYPE, SmartStreet)
}
