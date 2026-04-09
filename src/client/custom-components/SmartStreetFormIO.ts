/**
 * FormIO: Smart Street Component
 *
 * Wraps a React-based address autocomplete (react-select) inside a
 * FormIO field. The React component is lazily loaded on first mount.
 */

import { createRoot, Root } from 'react-dom/client'
import React from 'react'
import type { AddressResult, SmartStreetValue } from '../../components/SmartStreet'

export interface ApiResponseItem {
  id: string
  value: string
  country: string
  city: string
}

let SmartStreetComponent: React.ComponentType<any> | null = null

async function loadReactComponent() {
  if (!SmartStreetComponent) {
    const module = await import('../../components/SmartStreet')
    SmartStreetComponent = module.SmartStreet
  }
  return SmartStreetComponent
}

const ROOT_KEY = '__smartStreetRoot'

export function createSearchableDropdownClass(FieldComponent: any) {
  return class SmartStreetFormIO extends FieldComponent {
    reactRoot: Root | null = null
    reactContainer: any | null = null
    currentValue: SmartStreetValue | null = null
    _initialValueTimeout: ReturnType<typeof setTimeout> | null = null
    _onChangeBound: (v: SmartStreetValue | null) => void
    _onAddressSelectedBound: (address: AddressResult) => void

    static schema(...extend: any[]) {
      return FieldComponent.schema({
        type: 'searchableDropdown',
        label: 'Smart Street',
        key: 'smartStreet',
      }, ...extend)
    }

    static get builderInfo() {
      return {
        title: 'Smart Street',
        group: 'basic',
        icon: 'map-marker',
        weight: 30,
        schema: SmartStreetFormIO.schema(),
      }
    }

    get defaultSchema() {
      return SmartStreetFormIO.schema()
    }

    constructor(component: any, options: any, data: any) {
      super(component, options, data)
      this.currentValue = null
      const key = component.key
      if (data && key && data[key]) this.currentValue = data[key]
      this._onChangeBound = (v) => this.handleReactChange(v)
      this._onAddressSelectedBound = (address) => this.handleAddressSelected(address)
    }

    render() {
      return super.render(`
        <div ref="smartStreetContainer" class="formio-smart-street" style="width: 100%; min-height: 38px;">
          <div class="smart-street-loading-placeholder" style="padding: 10px; color: #666;">
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
          try { this.reactRoot.unmount() } catch {}
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
          this.reactContainer = container
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
        container.innerHTML = '<div style="color: red;">Error loading dropdown</div>'
      }
    }

    renderReactComponent(Component: React.ComponentType<any>) {
      if (!this.reactRoot) return
      this.reactRoot.render(React.createElement(Component, {
        name: this.component.key || 'smartStreet',
        placeholder: this.component.placeholder || 'Type to search address...',
        minSearchLength: this.component.minSearchLength ?? 2,
        debounceDelay: this.component.debounceDelay ?? 300,
        value: this.currentValue,
        onChange: this._onChangeBound,
        addressApiConfig: this.component.addressApi || undefined,
        addressMapping: this.component.addressMapping || undefined,
        onAddressSelected: this._onAddressSelectedBound,
      }))
    }

    /**
     * Populates related address fields after the user selects a final suggestion.
     * Uses Form.io's getComponent / setValue APIs where available.
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
        const comp = root?.getComponent ? root.getComponent(targetKey) : null
        if (comp) {
          comp.setValue(value)
          comp.triggerChange?.()
        } else if (root?.data) {
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

    destroy() {
      if (this._initialValueTimeout) {
        clearTimeout(this._initialValueTimeout)
        this._initialValueTimeout = null
      }
      const root = this.reactRoot
      this.reactRoot = null
      this.reactContainer = null
      if (root) {
        queueMicrotask(() => { try { root.unmount() } catch {} })
      }
      super.destroy()
    }

    loadItems() { return Promise.resolve() }
    updateItems() { return }
    setItems() { return }
  }
}

export default createSearchableDropdownClass
