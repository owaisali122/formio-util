/**
 * FormIO: Overlay Popup Renderer Component
 *
 * Renders a popup overlay with configurable trigger modes:
 * - manual: click button to open
 * - conditional: open/close based on field value
 * - onLoadIfConditionMet: open on form load if condition is true
 *
 * Configuration (from designer):
 *   triggerMode, conditionField, conditionOperator, conditionValue,
 *   closeWhenConditionBecomesFalse, openButtonLabel, closeOnOutsideClick,
 *   showCloseIcon, size
 */

import { OverlayPopupComponent, OVERLAY_POPUP_TYPE } from '../../components/OverlayPopup'

export default function createOverlayPopupClass(FieldComponent: any) {
  return class OverlayPopupFormIO extends FieldComponent {
    isOpen: boolean = false
    overlayElement: HTMLElement | null = null
    openButton: HTMLButtonElement | null = null
    closeButton: HTMLButtonElement | null = null
    _conditionWatchTimeout: ReturnType<typeof setTimeout> | null = null
    _contentSlot: HTMLElement | null = null

    static schema(...extend: any[]) {
      return FieldComponent.schema(OverlayPopupComponent.schema(), ...extend)
    }

    static get builderInfo() {
      return OverlayPopupComponent.builderInfo
    }

    get defaultSchema() {
      return OverlayPopupFormIO.schema()
    }

    get triggerMode(): 'manual' | 'conditional' | 'onLoadIfConditionMet' {
      return this.component?.triggerMode || 'manual'
    }

    get openButtonLabel(): string {
      return this.component?.openButtonLabel || 'Open'
    }

    get closeOnOutsideClick(): boolean {
      return this.component?.closeOnOutsideClick !== false
    }

    get showCloseIcon(): boolean {
      return this.component?.showCloseIcon !== false
    }

    get popupSize(): string {
      return this.component?.size || 'md'
    }

    get conditionField(): string {
      return this.component?.conditionField || ''
    }

    get conditionOperator(): string {
      return this.component?.conditionOperator || 'eq'
    }

    get conditionValue(): string {
      return this.component?.conditionValue || ''
    }

    get closeWhenConditionBecomesFalse(): boolean {
      return this.component?.closeWhenConditionBecomesFalse !== false
    }

    render() {
      const isTriggerButton = this.triggerMode === 'manual'

      const triggerButtonHtml = isTriggerButton
        ? `<button ref="openButton" type="button" class="formio-overlay-open-btn" 
             style="padding:6px 12px;background:#0d6efd;color:white;border:none;border-radius:4px;cursor:pointer;font-size:14px;">
             ${this.t(this.openButtonLabel)}
           </button>`
        : ''

      return super.render(`
        <div ref="popupContainer" class="formio-overlay-popup-wrapper">
          ${triggerButtonHtml}
          <div ref="overlay" class="formio-overlay-backdrop" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:999;"></div>
          <div ref="popupDialog" class="formio-overlay-dialog" style="display:none;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.2);z-index:1000;">
            <div ref="popupHeader" class="formio-overlay-header" style="padding:16px;border-bottom:1px solid #e9ecef;display:flex;justify-content:space-between;align-items:center;">
              <div ref="popupTitle" style="font-weight:600;font-size:16px;"></div>
              ${this.showCloseIcon ? `<button ref="closeButton" type="button" class="formio-overlay-close-btn" style="background:none;border:none;font-size:20px;cursor:pointer;color:#666;">&times;</button>` : ''}
            </div>
            <div ref="popupContent" class="formio-overlay-content" style="padding:20px;overflow-y:auto;"></div>
          </div>
        </div>
      `)
    }

    attach(element: HTMLElement) {
      const result = super.attach(element)
      this.loadRefs(element, {
        popupContainer: 'single',
        overlay: 'single',
        popupDialog: 'single',
        popupHeader: 'single',
        popupTitle: 'single',
        popupContent: 'single',
        openButton: 'single',
        closeButton: 'single',
      })

      const openButton = (this.refs as any)?.openButton as HTMLButtonElement | undefined
      const closeButton = (this.refs as any)?.closeButton as HTMLButtonElement | undefined
      const overlay = (this.refs as any)?.overlay as HTMLElement | undefined
      const dialog = (this.refs as any)?.popupDialog as HTMLElement | undefined

      // Apply size styling
      if (dialog) {
        const sizeStyles = this.getSizeStyles()
        Object.assign(dialog.style, sizeStyles)
      }

      // Setup event listeners
      if (openButton) {
        openButton.addEventListener('click', () => this.open())
      }

      if (closeButton) {
        closeButton.addEventListener('click', () => this.close())
      }

      if (overlay && this.closeOnOutsideClick) {
        overlay.addEventListener('click', () => this.close())
      }

      // Setup conditional watching if needed
      if (this.triggerMode === 'conditional' || this.triggerMode === 'onLoadIfConditionMet') {
        this.startConditionWatching()
      }

      // Open on load if condition met
      if (this.triggerMode === 'onLoadIfConditionMet') {
        if (this.evaluateCondition()) {
          this.open()
        }
      }

      return result
    }

    getSizeStyles(): Record<string, string> {
      const baseStyles = {
        width: '90%',
        maxHeight: '90vh',
        maxWidth: 'calc(100% - 40px)',
      }

      switch (this.popupSize) {
        case 'sm':
          return { ...baseStyles, width: '400px', maxWidth: '90vw' }
        case 'md':
          return { ...baseStyles, width: '600px', maxWidth: '90vw' }
        case 'lg':
          return { ...baseStyles, width: '800px', maxWidth: '90vw' }
        case 'fullscreen':
          return {
            width: '100%',
            height: '100%',
            maxWidth: '100%',
            maxHeight: '100%',
            top: '0',
            left: '0',
            transform: 'translate(0, 0)',
            borderRadius: '0',
          }
        default:
          return { ...baseStyles, width: '600px', maxWidth: '90vw' }
      }
    }

    open() {
      this.isOpen = true
      const overlay = (this.refs as any)?.overlay as HTMLElement | undefined
      const dialog = (this.refs as any)?.popupDialog as HTMLElement | undefined
      if (overlay) overlay.style.display = 'block'
      if (dialog) dialog.style.display = 'flex'
      document.body.style.overflow = 'hidden'
    }

    close() {
      this.isOpen = false
      const overlay = (this.refs as any)?.overlay as HTMLElement | undefined
      const dialog = (this.refs as any)?.popupDialog as HTMLElement | undefined
      if (overlay) overlay.style.display = 'none'
      if (dialog) dialog.style.display = 'none'
      document.body.style.overflow = ''
    }

    evaluateCondition(): boolean {
      const field = this.conditionField
      const operator = this.conditionOperator
      const expected = this.conditionValue

      if (!field) return false

      const fieldValue = this.root?.data?.[field]

      switch (operator) {
        case 'eq':
          return fieldValue === expected
        case 'neq':
          return fieldValue !== expected
        case 'contains':
          return String(fieldValue).includes(expected)
        case 'isEmpty':
          return !fieldValue
        case 'isNotEmpty':
          return !!fieldValue
        default:
          return false
      }
    }

    startConditionWatching() {
      if (this._conditionWatchTimeout) clearTimeout(this._conditionWatchTimeout)

      const check = () => {
        const conditionMet = this.evaluateCondition()

        if (this.triggerMode === 'conditional') {
          if (conditionMet && !this.isOpen) {
            this.open()
          } else if (!conditionMet && this.isOpen && this.closeWhenConditionBecomesFalse) {
            this.close()
          }
        }

        this._conditionWatchTimeout = setTimeout(check, 300)
      }

      check()
    }

    destroy() {
      if (this._conditionWatchTimeout) clearTimeout(this._conditionWatchTimeout)
      if (this.isOpen) this.close()
      this.openButton = null
      this.closeButton = null
      this.overlayElement = null
      this._contentSlot = null
      super.destroy()
    }
  }
}
