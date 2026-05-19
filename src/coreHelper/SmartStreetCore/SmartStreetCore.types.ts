export interface AddressApiConfig {
  url?: string
  partnerId?: string
  username?: string
  password?: string
}

export interface AddressResult {
  streetLine: string
  secondary: string
  city: string
  state: string
  zipcode: string
}

export interface AddressMapping {
  streetLine?: string
  secondary?: string
  city?: string
  state?: string
  zipcode?: string
}

/** The shape stored in Form.io submission data for this component */
export interface SmartStreetValue {
  selectedLabel: string
  address: AddressResult
}

export interface SmartStreetProps {
  name: string
  placeholder?: string
  minSearchLength?: number
  debounceDelay?: number
  value?: SmartStreetValue | null
  onChange?: (value: SmartStreetValue | null) => void
  addressApiConfig?: AddressApiConfig
  addressMapping?: AddressMapping
  onAddressSelected?: (address: AddressResult) => void
  disabled?: boolean
  tabIndex?: number
  enableCache?: boolean
}
