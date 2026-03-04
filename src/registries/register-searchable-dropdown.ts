import { createRoot, Root } from 'react-dom/client'
import React from 'react'
import {
  SearchableDropdownComponent,
  SEARCHABLE_DROPDOWN_TYPE,
} from '../components/SearchableDropdown'
import type { SearchableDropdownItem } from '../components/SearchableDropdown'
import type { FormioComponents } from './types'

type ReactComponent = React.ComponentType<any>
let SearchableDropdownReact: ReactComponent | null = null

async function loadReactComponent(): Promise<ReactComponent | null> {
  if (!SearchableDropdownReact) {
    const mod = await import('../components/SearchableDropdownReact')
    SearchableDropdownReact = mod.SearchableDropdownReact
  }
  return SearchableDropdownReact
}

const ROOT_KEY = '__searchableDropdownRoot'

export async function registerSearchableDropdown(Components: FormioComponents): Promise<void> {
  const FieldComponent = (Components.components as any).field as any

  class SearchableDropdown extends FieldComponent {
    private reactRoot: Root | null = null
    private reactContainer: HTMLDivElement | null = null
    private currentValue: SearchableDropdownItem | SearchableDropdownItem[] | string | string[] | null = null
    private isMultiple: boolean = false
    private apiUrl: string = ''
    private _initialValueTimeout: ReturnType<typeof setTimeout> | null = null
    private _onChangeBound: (v: SearchableDropdownItem | SearchableDropdownItem[] | null) => void

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
      return SearchableDropdown.schema()
    }

    constructor(component: any, options: any, data: any) {
      super(component, options, data)
      let rawUrl = component.data?.url || ''
      if (rawUrl.includes('%7B') || rawUrl.includes('%7D') || rawUrl.includes('%24')) {
        try { rawUrl = decodeURIComponent(rawUrl) } catch { /* keep encoded */ }
      }
      this.apiUrl = rawUrl
      this.isMultiple = component.multiple ?? false
      this.currentValue = null
      const key = component.key
      if (data && key && data[key]) this.currentValue = data[key]
      this._onChangeBound = (v: SearchableDropdownItem | SearchableDropdownItem[] | null) =>
        this.handleReactChange(v)
    }

    render() {
      return super.render(`
        <div ref="searchableDropdownContainer" class="formio-searchable-dropdown" style="width:100%;min-height:38px;">
          <div class="searchable-dropdown-loading-placeholder" style="padding:10px;color:#666;">
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
      if (
        this.currentValue &&
        ((Array.isArray(this.currentValue) && this.currentValue.length > 0) ||
          (typeof this.currentValue === 'string' && this.currentValue.length > 0) ||
          (typeof this.currentValue === 'object' && !Array.isArray(this.currentValue)))
      ) return

      let value: SearchableDropdownItem | SearchableDropdownItem[] | string | string[] | null = null
      if (this.data?.[key]) value = this.data[key]
      if (!value && this.element) {
        const hidden = this.element.querySelector(
          'input.searchable-dropdown-hidden-value',
        ) as HTMLInputElement | null
        if (hidden?.value) {
          try {
            const parsed = JSON.parse(hidden.value)
            const isValid =
              parsed &&
              ((Array.isArray(parsed) && parsed.length > 0) ||
                (typeof parsed === 'string' && parsed.length > 0) ||
                (typeof parsed === 'object' && parsed !== null && 'id' in parsed && 'value' in parsed))
            if (isValid) value = parsed
          } catch { /* ignore parse errors */ }
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
          name: this.component.key || 'searchableDropdown',
          apiUrl: this.apiUrl,
          isMultiple: this.isMultiple,
          placeholder: this.component.placeholder || 'Type to search...',
          minSearchLength: this.component.minSearchLength ?? 2,
          debounceDelay: this.component.debounceDelay ?? 300,
          value: this.currentValue,
          onChange: this._onChangeBound,
        }),
      )
    }

    handleReactChange(newValue: SearchableDropdownItem | SearchableDropdownItem[] | null) {
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

    checkValidity(data: any, dirty: boolean, rowData: any) {
      const valid = super.checkValidity(data, dirty, rowData)
      if (!valid) return false

      const value = this.currentValue
      const isEmpty =
        value === null ||
        value === undefined ||
        value === '' ||
        (Array.isArray(value) && value.length === 0)

      if (isEmpty && this.component.validate?.required) {
        const msg = this.component.validate.customMessage || 'This field is required'
        this.setCustomValidity(msg, dirty)
        return false
      }

      if (this.isMultiple && Array.isArray(value)) {
        const min = Number(this.component.validate?.minSelectedCount) || 0
        const max = Number(this.component.validate?.maxSelectedCount) || 0
        if (min > 0 && value.length < min) {
          this.setCustomValidity(
            this.component.validate?.customMessage || `Please select at least ${min} item${min !== 1 ? 's' : ''}`,
            dirty,
          )
          return false
        }
        if (max > 0 && value.length > max) {
          this.setCustomValidity(
            this.component.validate?.customMessage || `Please select no more than ${max} item${max !== 1 ? 's' : ''}`,
            dirty,
          )
          return false
        }
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

  Components.setComponent(SEARCHABLE_DROPDOWN_TYPE, SearchableDropdown)
}
