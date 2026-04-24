/**
 * Form.io Tab Index Manager — Designer (builder-side) component definition.
 *
 * Reference pattern: ProgressBarComponent (src/components/ProgressBar.tsx)
 *
 * This is a non-input utility component. It reads an ordered list of
 * component keys and at runtime assigns tabindex values sequentially to
 * the matching form inputs. Referenced form content is handled via a
 * MutationObserver in the renderer runtime class.
 */

export const TAB_INDEX_MANAGER_TYPE = 'tabIndexManager'

export interface TabIndexManagerRow {
  /** Component property-name (key) to receive a tabindex. */
  keyEntry: string
}

export interface TabIndexManagerSchema {
  type: string
  label: string
  key: string
  input: boolean
  tableView: boolean
  persistent: boolean
  /** Ordered list of component keys → row index + 1 = tabindex value. */
  targetKeys: TabIndexManagerRow[]
  hidden: boolean
  [k: string]: unknown
}

export class TabIndexManagerComponent {
  static schema(overrides?: Partial<TabIndexManagerSchema>): TabIndexManagerSchema {
    return {
      type: TAB_INDEX_MANAGER_TYPE,
      label: 'Tab Index Manager',
      key: 'tabIndexManager',
      input: false,
      tableView: false,
      persistent: false,
      targetKeys: [],
      hidden: true,
      ...overrides,
    }
  }

  static get builderInfo() {
    return {
      title: 'Tab Index Manager',
      group: 'basic',
      icon: 'list-ol',
      weight: 38,
      documentation: 'Assigns tabindex to form fields in a specified order at runtime. Supports referenced form content.',
      schema: TabIndexManagerComponent.schema(),
    }
  }

  static editForm() {
    return {
      components: [
        {
          type: 'tabs',
          key: 'tabs',
          components: [
            // ── Display tab ────────────────────────────────────────────────
            {
              label: 'Display',
              key: 'display',
              components: [
                {
                  type: 'textfield',
                  key: 'label',
                  label: 'Label',
                  input: true,
                  defaultValue: 'Tab Index Manager',
                  weight: 5,
                },
                {
                  type: 'textfield',
                  key: 'key',
                  label: 'Property Name',
                  input: true,
                  required: true,
                  validate: { required: true },
                  weight: 10,
                },
                {
                  type: 'checkbox',
                  key: 'hidden',
                  label: 'Hidden',
                  input: true,
                  defaultValue: true,
                  weight: 20,
                  tooltip: 'Hide this component. It renders no visible output — only runtime tabindex logic.',
                },
              ],
            },
            // ── Configure tab ──────────────────────────────────────────────
            {
              label: 'Configure',
              key: 'configure',
              components: [
                {
                  // Ordered list of target keys. Row index (0-based) + 1 = tabindex value.
                  // Options are injected by setupTabIndexManagerDropdown (called from
                  // FormBuilder.ready) which reads the live builder schema and populates
                  // data.values on every editComponent event for this component type.
                  // allowCustomInput lets the user type a key not yet in the list
                  // (useful when an appDetailRef's cache isn't loaded yet).
                  type: 'datagrid',
                  key: 'targetKeys',
                  label: 'Tab Order',
                  input: true,
                  weight: 10,
                  reorder: true,
                  addAnother: '+ Add Key',
                  description:
                    'Row 1 → tabindex="1", Row 2 → tabindex="2", … Drag rows to reorder. ' +
                    'Keys come from the current form/wizard schema. ' +
                    'For referenced form fields use the scoped format refKey.fieldKey (e.g. appDetailRef.firstName). ' +
                    'Tabindex is applied when the form renders; referenced content is handled when it mounts.',
                  components: [
                    {
                      type: 'select',
                      key: 'keyEntry',
                      label: 'Component Key',
                      input: true,
                      customClass: 'tab-index-manager-key-select',
                      // Current-form keys come from the Form.io edit dialog context.
                      // Referenced-form keys are optionally merged from the builder
                      // hook when that cache is available.
                      dataSrc: 'custom',
                      valueProperty: 'value',
                      labelProperty: 'label',
                      template: '<span class="tab-index-manager-key-option">{{ item.label }}</span>',
                      searchEnabled: true,
                      allowCustomInput: true,
                      placeholder: 'Select or type a key (e.g. firstName or appDetailRef.firstName)...',
                      data: {
                        custom:
                          'var excluded = ["button","content","htmlelement","tabIndexManager","progressBar","popupComponent","formReview","profileFieldSection","tanstackTable"];' +
                          'var seen = {};' +
                          'values = [];' +
                          'utils.eachComponent(instance.options.editForm.components, function(component, path) {' +
                          '  var include = component && component.key && component.key !== data.key && excluded.indexOf(component.type) === -1;' +
                          '  if (include && !seen[path]) {' +
                          '    seen[path] = true;' +
                          '    values.push({ label: (component.label || component.key) + " (" + path + ")", value: path });' +
                          '  }' +
                          '});' +
                          'if (typeof window !== "undefined" && Array.isArray(window.__tabIndexManagerReferencedKeys)) {' +
                          '  window.__tabIndexManagerReferencedKeys.forEach(function(item) {' +
                          '    if (item && item.value && !seen[item.value]) {' +
                          '      seen[item.value] = true;' +
                          '      values.push(item);' +
                          '    }' +
                          '  });' +
                          '}',
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }
  }
}
