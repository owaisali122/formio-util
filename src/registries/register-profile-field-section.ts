import { ProfileFieldSectionComponent, PROFILE_FIELD_SECTION_TYPE } from '../components/ProfileFieldSection'
import type { FormioComponents } from './types'

export async function registerProfileFieldSection(Components: FormioComponents): Promise<void> {
  // Use fieldset as the base — it extends NestedComponent and supports child components.
  const FieldsetComponent = (Components.components as any).fieldset as any

  class ProfileFieldSection extends FieldsetComponent {
    static schema(...extend: any[]) {
      return FieldsetComponent.schema(ProfileFieldSectionComponent.schema(), ...extend)
    }

    static get builderInfo() {
      return ProfileFieldSectionComponent.builderInfo
    }

    // No editForm override — inherits from FieldsetComponent so the builder
    // provides all standard tabs and allows normal child component editing.

    get defaultSchema() {
      return ProfileFieldSection.schema()
    }

    get templateName() {
      return 'fieldset'
    }
  }

  Components.setComponent(PROFILE_FIELD_SECTION_TYPE, ProfileFieldSection as never)
}
