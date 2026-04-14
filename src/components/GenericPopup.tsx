// ─── Types ───────────────────────────────────────────────────────────────────

export interface GenericPopupButtonSchema {
  label: string
  actionKey: string
  variant: string
  icon: string
  closeOnClick: boolean
  disabled: boolean
}

export interface GenericPopupSchema {
  type: string
  label: string
  key: string
  input: boolean
  /** Visual purpose */
  popupVariant: string
  /** Popup title */
  popupTitle: string
  /** Popup body message */
  popupMessage: string
  /** Font Awesome icon class */
  popupIcon: string
  /** Modal size: sm | md | lg */
  popupSize: string
  /** JSON array of button definitions */
  popupButtons: string
  /** Label on the trigger button rendered inside the form */
  triggerLabel: string
  /** Font Awesome icon on the trigger button */
  triggerIcon: string
  showCloseIcon: boolean
  closeOnBackdrop: boolean
  closeOnEscape: boolean
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const GENERIC_POPUP_TYPE = 'genericPopup'

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Form.io Designer (builder-side) component definition for Generic Popup.
 *
 * Reference pattern: SmartStreetDropdownComponent (src/components/SmartStreetDropdown.ts)
 */
export class GenericPopupComponent {
  static schema(overrides?: Partial<GenericPopupSchema>): GenericPopupSchema {
    return {
      type: GENERIC_POPUP_TYPE,
      label: 'Generic Popup',
      key: 'genericPopup',
      input: false,
      popupVariant: 'confirm',
      popupTitle: 'Are you sure?',
      popupMessage: '',
      popupIcon: '',
      popupSize: 'md',
      popupButtons: '',
      triggerLabel: 'Open Popup',
      triggerIcon: '',
      showCloseIcon: true,
      closeOnBackdrop: false,
      closeOnEscape: true,
      ...overrides,
    }
  }

  static get builderInfo() {
    return {
      title: 'Generic Popup',
      group: 'basic',
      icon: 'window-restore',
      weight: 35,
      documentation: 'A configurable popup/modal that renders at page-root level',
      schema: GenericPopupComponent.schema(),
    }
  }

  static editForm() {
    return {
      components: [
        {
          type: 'tabs',
          key: 'tabs',
          components: [
            // ── Display tab ─────────────────────────────────────────────────
            {
              label: 'Display',
              key: 'display',
              components: [
                {
                  type: 'textfield',
                  key: 'label',
                  label: 'Component Label',
                  input: true,
                  defaultValue: 'Generic Popup',
                  weight: 5,
                  tooltip: 'Label shown in the Form.io designer sidebar and builder',
                },
                {
                  type: 'textfield',
                  key: 'key',
                  label: 'Property Name',
                  input: true,
                  defaultValue: 'genericPopup',
                  weight: 10,
                },
                {
                  type: 'textfield',
                  key: 'triggerLabel',
                  label: 'Trigger Button Label',
                  input: true,
                  defaultValue: 'Open Popup',
                  weight: 15,
                  tooltip: 'Text on the button that opens the popup when inside a rendered form',
                },
                {
                  type: 'textfield',
                  key: 'triggerIcon',
                  label: 'Trigger Button Icon (Font Awesome class)',
                  input: true,
                  placeholder: 'e.g. fa fa-bell',
                  weight: 20,
                },
              ],
            },
            // ── Popup Content tab ───────────────────────────────────────────
            {
              label: 'Popup Content',
              key: 'popupContent',
              components: [
                {
                  type: 'select',
                  key: 'popupVariant',
                  label: 'Variant',
                  input: true,
                  dataSrc: 'values',
                  defaultValue: 'confirm',
                  weight: 5,
                  data: {
                    values: [
                      { label: 'Confirm', value: 'confirm' },
                      { label: 'Alert', value: 'alert' },
                      { label: 'Warning', value: 'warning' },
                      { label: 'Delete', value: 'delete' },
                      { label: 'Custom', value: 'custom' },
                    ],
                  },
                  tooltip: 'Controls default icon and button set when no custom buttons are defined',
                },
                {
                  type: 'textfield',
                  key: 'popupTitle',
                  label: 'Title',
                  input: true,
                  defaultValue: 'Are you sure?',
                  weight: 10,
                },
                {
                  type: 'textarea',
                  key: 'popupMessage',
                  label: 'Message / Body Text',
                  input: true,
                  weight: 15,
                  rows: 3,
                },
                {
                  type: 'textfield',
                  key: 'popupIcon',
                  label: 'Header Icon (Font Awesome class)',
                  input: true,
                  placeholder: 'e.g. fa fa-exclamation-triangle',
                  weight: 20,
                  tooltip: 'Overrides the default variant icon',
                },
                {
                  type: 'select',
                  key: 'popupSize',
                  label: 'Size',
                  input: true,
                  dataSrc: 'values',
                  defaultValue: 'md',
                  weight: 25,
                  data: {
                    values: [
                      { label: 'Small (380px)', value: 'sm' },
                      { label: 'Medium (520px)', value: 'md' },
                      { label: 'Large (720px)', value: 'lg' },
                    ],
                  },
                },
              ],
            },
            // ── Buttons tab ─────────────────────────────────────────────────
            {
              label: 'Buttons',
              key: 'buttons',
              components: [
                {
                  type: 'textarea',
                  key: 'popupButtons',
                  label: 'Custom Buttons (JSON)',
                  input: true,
                  rows: 8,
                  weight: 5,
                  placeholder: `[
  {"label":"Confirm","actionKey":"confirm","variant":"primary","closeOnClick":true},
  {"label":"Cancel","actionKey":"cancel","variant":"secondary","closeOnClick":true}
]`,
                  tooltip: 'Optional. Leave blank to use the default buttons for the selected variant. Each item: label, actionKey, variant (primary|secondary|danger|warning|success), icon (FA class), closeOnClick, disabled',
                },
              ],
            },
            // ── Behavior tab ────────────────────────────────────────────────
            {
              label: 'Behavior',
              key: 'behavior',
              components: [
                {
                  type: 'checkbox',
                  key: 'showCloseIcon',
                  label: 'Show close (×) icon',
                  input: true,
                  defaultValue: true,
                  weight: 5,
                },
                {
                  type: 'checkbox',
                  key: 'closeOnBackdrop',
                  label: 'Close when clicking backdrop',
                  input: true,
                  defaultValue: false,
                  weight: 10,
                },
                {
                  type: 'checkbox',
                  key: 'closeOnEscape',
                  label: 'Close on Escape key',
                  input: true,
                  defaultValue: true,
                  weight: 15,
                },
              ],
            },
          ],
        },
      ],
    }
  }
}
