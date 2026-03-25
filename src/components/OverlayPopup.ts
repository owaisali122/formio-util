export const OVERLAY_POPUP_TYPE = 'overlayPopup'

export interface OverlayPopupSchema {
  type: string
  label: string
  key: string
  input: boolean
  tableView: boolean
  triggerMode: 'manual' | 'conditional' | 'onLoadIfConditionMet'
  conditionField: string
  conditionOperator: string
  conditionValue: string
  closeWhenConditionBecomesFalse: boolean
  openButtonLabel: string
  closeOnOutsideClick: boolean
  showCloseIcon: boolean
  size: 'sm' | 'md' | 'lg' | 'fullscreen'
  [k: string]: unknown
}

export class OverlayPopupComponent {
  static schema(overrides?: Record<string, unknown>): OverlayPopupSchema {
    return {
      type: OVERLAY_POPUP_TYPE,
      label: 'Overlay Popup',
      key: 'overlayPopup',
      input: false,
      tableView: false,
      triggerMode: 'manual',
      conditionField: '',
      conditionOperator: 'eq',
      conditionValue: '',
      closeWhenConditionBecomesFalse: false,
      openButtonLabel: 'Open',
      closeOnOutsideClick: true,
      showCloseIcon: true,
      size: 'md',
      ...overrides,
    }
  }

  static get builderInfo() {
    return {
      title: 'Overlay Popup',
      group: 'basic',
      icon: 'window-maximize',
      weight: 32,
      documentation: 'Popup overlay with configurable trigger mode and display settings.',
      schema: OverlayPopupComponent.schema(),
    }
  }

  static editForm() {
    return {
      components: [
        {
          type: 'tabs',
          key: 'tabs',
          components: [
            {
              label: 'Display',
              key: 'display',
              components: [
                {
                  type: 'textfield',
                  key: 'label',
                  label: 'Label',
                  input: true,
                  defaultValue: 'Overlay Popup',
                  weight: 10,
                },
                {
                  type: 'textfield',
                  key: 'key',
                  label: 'Property Name',
                  input: true,
                  defaultValue: 'overlayPopup',
                  weight: 20,
                },
                {
                  type: 'select',
                  key: 'size',
                  label: 'Popup Size',
                  input: true,
                  defaultValue: 'md',
                  data: {
                    values: [
                      { label: 'Small', value: 'sm' },
                      { label: 'Medium', value: 'md' },
                      { label: 'Large', value: 'lg' },
                      { label: 'Fullscreen', value: 'fullscreen' },
                    ],
                  },
                  weight: 30,
                },
                {
                  type: 'textfield',
                  key: 'openButtonLabel',
                  label: 'Open Button Label',
                  input: true,
                  defaultValue: 'Open',
                  description: 'Label for the manual trigger button (used when trigger mode is "manual").',
                  weight: 40,
                },
                {
                  type: 'checkbox',
                  key: 'showCloseIcon',
                  label: 'Show Close Icon',
                  input: true,
                  defaultValue: true,
                  description: 'Show an X icon in the popup header to close it.',
                  weight: 50,
                },
                {
                  type: 'checkbox',
                  key: 'closeOnOutsideClick',
                  label: 'Close on Outside Click',
                  input: true,
                  defaultValue: true,
                  description: 'Close the popup when the user clicks outside of it.',
                  weight: 60,
                },
              ],
            },
            {
              label: 'Trigger',
              key: 'trigger',
              components: [
                {
                  type: 'select',
                  key: 'triggerMode',
                  label: 'Trigger Mode',
                  input: true,
                  defaultValue: 'manual',
                  data: {
                    values: [
                      { label: 'Manual (button click)', value: 'manual' },
                      { label: 'Conditional (field-based)', value: 'conditional' },
                      { label: 'On Load If Condition Met', value: 'onLoadIfConditionMet' },
                    ],
                  },
                  description: 'How the popup is triggered.',
                  weight: 10,
                },
                {
                  type: 'textfield',
                  key: 'conditionField',
                  label: 'Condition Field',
                  input: true,
                  placeholder: 'e.g., status',
                  description: 'The form field key to evaluate against.',
                  weight: 20,
                },
                {
                  type: 'select',
                  key: 'conditionOperator',
                  label: 'Condition Operator',
                  input: true,
                  defaultValue: 'eq',
                  data: {
                    values: [
                      { label: 'Equals', value: 'eq' },
                      { label: 'Not Equals', value: 'neq' },
                      { label: 'Contains', value: 'contains' },
                      { label: 'Is Empty', value: 'isEmpty' },
                      { label: 'Is Not Empty', value: 'isNotEmpty' },
                    ],
                  },
                  weight: 30,
                },
                {
                  type: 'textfield',
                  key: 'conditionValue',
                  label: 'Condition Value',
                  input: true,
                  placeholder: 'e.g., approved',
                  description: 'The value to compare against (not needed for isEmpty/isNotEmpty).',
                  weight: 40,
                },
                {
                  type: 'checkbox',
                  key: 'closeWhenConditionBecomesFalse',
                  label: 'Close When Condition Becomes False',
                  input: true,
                  defaultValue: false,
                  description: 'Automatically close the popup if the condition stops being true.',
                  weight: 50,
                },
              ],
            },
          ],
        },
      ],
    }
  }
}
