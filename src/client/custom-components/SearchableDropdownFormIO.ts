/**
 * FormIO: Searchable Dropdown Component
 *
 * Wraps a React-based async searchable dropdown (react-select) inside a
 * FormIO field. The React component is lazily loaded on first mount.
 *
 * Schema: type: 'searchableDropdown', key, label, data.url (API endpoint),
 *   multiple, placeholder, minSearchLength, debounceDelay
 */

import { createRoot, Root } from 'react-dom/client'
import React from 'react'

export interface ApiResponseItem {
  id: string
  value: string
  country: string
  city: string
}

let SearchableDropdownReact: React.ComponentType<any> | null = null

async function loadReactComponent() {
  if (!SearchableDropdownReact) {
    const module = await import('./SearchableDropdown')
    SearchableDropdownReact = module.SearchableDropdownReact
  }
  return SearchableDropdownReact
}

const ROOT_KEY = '__searchableDropdownRoot'

export function createSearchableDropdownClass(FieldComponent: any) {
  return class SearchableDropdownFormIO extends FieldComponent {
    reactRoot: Root | null = null
    reactContainer: any | null = null
    currentValue: ApiResponseItem | ApiResponseItem[] | string | string[] | null = null
    isMultiple: boolean = false
    apiUrl: string = ''
    _initialValueTimeout: ReturnType<typeof setTimeout> | null = null
    _onChangeBound: (v: ApiResponseItem | ApiResponseItem[] | null) => void

    static schema(...extend: any[]) {
      return FieldComponent.schema({
        type: 'searchableDropdown',
        label: 'Searchable Dropdown',
        key: 'searchableDropdown',
        dataSrc: 'custom',
        multiple: false,
      }, ...extend)
    }

    static get builderInfo() {
      return {
        title: 'Searchable Dropdown',
        group: 'basic',
        icon: 'search',
        weight: 30,
        schema: SearchableDropdownFormIO.schema(),
      }
    }

    get defaultSchema() {
      return SearchableDropdownFormIO.schema()
    }

    constructor(component: any, options: any, data: any) {
      super(component, options, data)
      let rawUrl = component.data?.url || ''
      if (rawUrl.includes('%7B') || rawUrl.includes('%7D') || rawUrl.includes('%24')) {
        try { rawUrl = decodeURIComponent(rawUrl) } catch {}
      }
      this.apiUrl = rawUrl
      this.isMultiple = component.multiple ?? false
      this.currentValue = null
      const key = component.key
      if (data && key && data[key]) this.currentValue = data[key]
      this._onChangeBound = (v) => this.handleReactChange(v)
    }

    render() {
      return super.render(`
        <div ref="searchableDropdownContainer" class="formio-searchable-dropdown" style="width: 100%; min-height: 38px;">
          <div class="searchable-dropdown-loading-placeholder" style="padding: 10px; color: #666;">
            Loading dropdown...
          </div>
        </div>
      `)
    }

    attach(element: HTMLElement) {
      const result = super.attach(element)
      this.loadRefs(element, { searchableDropdownContainer: 'single' })
      const container = (this.refs as any)?.searchableDropdownContainer
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
      if (this.currentValue && (
        (Array.isArray(this.currentValue) && this.currentValue.length > 0) ||
        (typeof this.currentValue === 'string' && this.currentValue.length > 0)
      )) return

      let value: ApiResponseItem | ApiResponseItem[] | string | string[] | null = null
      if (this.data?.[key]) value = this.data[key]
      if (!value && this.element) {
        const hiddenInput = this.element.querySelector('input.searchable-dropdown-hidden-value') as HTMLInputElement | null
        if (hiddenInput?.value) {
          try {
            const parsed = JSON.parse(hiddenInput.value)
            const isValid = parsed && (
              (Array.isArray(parsed) && parsed.length > 0) ||
              (typeof parsed === 'string' && parsed.length > 0) ||
              (typeof parsed === 'object' && parsed !== null && 'id' in parsed && 'value' in parsed)
            )
            if (isValid) value = parsed
          } catch {}
        }
      }
      if (value) {
        this.currentValue = value
        if (this.reactRoot && SearchableDropdownReact) this.renderReactComponent(SearchableDropdownReact)
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
        name: this.component.key || 'searchableDropdown',
        apiUrl: this.apiUrl,
        isMultiple: this.isMultiple,
        placeholder: this.component.placeholder || 'Type to search...',
        minSearchLength: this.component.minSearchLength ?? 2,
        debounceDelay: this.component.debounceDelay ?? 300,
        value: this.currentValue,
        onChange: this._onChangeBound,
      }))
    }

    handleReactChange(newValue: ApiResponseItem | ApiResponseItem[] | null) {
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
      const isEmpty = value === null || value === '' || (Array.isArray(value) && value.length === 0)
      if (isEmpty && this.currentValue) return
      if (value === this.currentValue) return super.setValue(value, flags)
      this.currentValue = value
      if (this.reactRoot && SearchableDropdownReact) this.renderReactComponent(SearchableDropdownReact)
      return super.setValue(value, flags)
    }

    get dataValue() {
      return this.currentValue
    }

    set dataValue(value: any) {
      if (value === undefined) return
      const isEmpty = value === null || value === '' || (Array.isArray(value) && value.length === 0)
      if (isEmpty && this.currentValue) return
      if (value === this.currentValue) return
      this.currentValue = value
      if (this.reactRoot && SearchableDropdownReact) this.renderReactComponent(SearchableDropdownReact)
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
