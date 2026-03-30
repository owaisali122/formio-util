import { ProfileFieldSectionComponent, PROFILE_FIELD_SECTION_TYPE } from '../components/ProfileFieldSection'
import type { FormioComponents } from './types'

export async function registerProfileFieldSection(Components: FormioComponents): Promise<void> {
  const FieldsetComponent = (Components.components as any).fieldset as any

  class ProfileFieldSection extends FieldsetComponent {
    static schema(...extend: any[]) {
      return FieldsetComponent.schema(ProfileFieldSectionComponent.schema(), ...extend)
    }

    static get builderInfo() {
      return ProfileFieldSectionComponent.builderInfo
    }

  static editForm(...extend: any[]) {
  const baseEditForm = FieldsetComponent.editForm
    ? FieldsetComponent.editForm(...extend)
    : { components: [] }

  return {
    ...baseEditForm,
    components: (baseEditForm.components || []).map((item: any) => {
      if (item.key === 'tabs' && Array.isArray(item.components)) {
        return {
          ...item,
          components: item.components
            .filter((tab: any) => tab.key !== 'layout')
            .map((tab: any) => {
              if (tab.key === 'api' && Array.isArray(tab.components)) {
                return {
                  ...tab,
                  components: tab.components.map((field: any) => {
                    if (field.key === 'key') {
                      return {
                        ...field,
                        label: 'Property Name (Optional)',
                        required: false,
                        validate: {
                          ...(field.validate || {}),
                          required: false,
                        },
                      }
                    }

                    return field
                  }),
                }
              }

              return tab
            }),
        }
      }

      return item
    }),
  }
}

    get defaultSchema() {
      return ProfileFieldSection.schema()
    }

    get templateName() {
      return 'fieldset'
    }
  }

  Components.setComponent(PROFILE_FIELD_SECTION_TYPE, ProfileFieldSection as never)
}
