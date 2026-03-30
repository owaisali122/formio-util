/**
 * Profile Fields Section — Renderer Runtime Component
 *
 * Extends the built-in fieldset component so Form.io's native
 * NestedComponent rendering handles all child fields automatically.
 * This component does not store its own value (input: false).
 */

import { ProfileFieldSectionComponent, PROFILE_FIELD_SECTION_TYPE } from '../../components/ProfileFieldSection'

export default function createProfileFieldSectionClass(FieldsetComponent: any) {
  return class ProfileFieldSectionFormIO extends FieldsetComponent {
    static schema(...extend: any[]) {
      return FieldsetComponent.schema(ProfileFieldSectionComponent.schema(), ...extend)
    }

    get defaultSchema() {
      return ProfileFieldSectionFormIO.schema()
    }

    get templateName() {
      return 'fieldset'
    }
  }
}

export { PROFILE_FIELD_SECTION_TYPE }
