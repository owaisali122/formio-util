import { ProfileFieldSectionComponent, PROFILE_FIELD_SECTION_TYPE } from '../components/ProfileFieldSection'
import type { FormioComponents } from './types'

export async function registerProfileFieldSection(Components: FormioComponents): Promise<void> {
  const ContainerComponent = (Components.components as any).container as any

  class ProfileFieldSection extends ContainerComponent {
    static schema(...extend: any[]) {
      return ContainerComponent.schema(ProfileFieldSectionComponent.schema(), ...extend)
    }

    static get builderInfo() {
      return ProfileFieldSectionComponent.builderInfo
    }
  }

  Components.setComponent(PROFILE_FIELD_SECTION_TYPE, ProfileFieldSection as never)
}
