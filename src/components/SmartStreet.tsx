'use client'

import React, { useState, useCallback, useRef, useMemo } from 'react'
import Select from 'react-select'
import type { SingleValue, StylesConfig, InputActionMeta } from 'react-select'
import type { SmartStreetDropdownItem } from './SmartStreetDropdown'

interface OptionType {
  value: string
  label: string
  data?: SmartStreetDropdownItem
}

// â”€â”€ Address Autocomplete types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface AddressSuggestion {
  street_line: string
  secondary?: string
  city: string
  state: string
  zipcode: string
  entries: number | string
}

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

function buildSelectedParam(s: AddressSuggestion): string {
  const parts: string[] = [s.street_line.trim()]
  const sec = s.secondary?.trim()
  if (sec) parts.push(sec)
  parts.push(`(${s.entries})`)
  parts.push(s.city)
  parts.push(s.state)
  parts.push(s.zipcode)
  return parts.join(' ')
}

function buildAddressDisplayLabel(s: AddressSuggestion): string {
  const streetParts = [s.street_line?.trim(), s.secondary?.trim()].filter(Boolean)
  const streetLine = streetParts.join(' ')
  const cityStateZip = [s.city, `${s.state} ${s.zipcode}`.trim()].filter(Boolean).join(', ')
  return [streetLine, cityStateZip].filter(Boolean).join(', ')
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
}

const selectStyles: StylesConfig<OptionType, false> = {
  control: (base, state) => ({
    ...base,
    borderColor: state.isFocused ? '#80bdff' : '#ced4da',
    boxShadow: state.isFocused ? '0 0 0 0.2rem rgba(0,123,255,.25)' : 'none',
    '&:hover': { borderColor: state.isFocused ? '#80bdff' : '#ced4da' },
    minHeight: '38px',
    minWidth: 0,
  }),
  valueContainer: (base) => ({ ...base, flexWrap: 'wrap' as const, overflow: 'visible' }),
  placeholder: (base) => ({ ...base, color: '#6c757d' }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? '#007bff' : state.isFocused ? '#f8f9fa' : 'white',
    color: state.isSelected ? 'white' : '#212529',
    '&:hover': { backgroundColor: state.isSelected ? '#007bff' : '#e9ecef' },
  }),
}

const EMPTY_ADDRESS: AddressResult = { streetLine: '', secondary: '', city: '', state: '', zipcode: '' }

function SmartStreetInner({
  name,
  placeholder = 'Type to search address...',
  minSearchLength = 2,
  debounceDelay = 300,
  value,
  onChange,
  addressApiConfig,
  addressMapping,
  onAddressSelected,
}: SmartStreetProps) {
  const [options, setOptions] = useState<OptionType[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [menuIsOpen, setMenuIsOpen] = useState(false)
  const [selectedValue, setSelectedValue] = useState<OptionType | null>(() => {
    // Restore from saved value on mount (edit mode)
    if (value?.selectedLabel && value?.address) {
      return { value: value.selectedLabel, label: value.selectedLabel }
    }
    return null
  })
  const [lastResult, setLastResult] = useState<AddressResult | null>(() => {
    // Restore from saved value on mount (edit mode)
    return value?.address ?? null
  })

  const inputRef = useRef('')
  const requestIdRef = useRef(0)
  const finalizedRef = useRef(!!value?.address)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Resolve display labels from mapping config (fallback to defaults)
  const labels = useMemo(() => ({
    streetLine: addressMapping?.streetLine || 'Street Address',
    secondary: addressMapping?.secondary || 'Unit / Secondary',
    city: addressMapping?.city || 'City',
    state: addressMapping?.state || 'State',
    zipcode: addressMapping?.zipcode || 'Zipcode',
  }), [
    addressMapping?.streetLine,
    addressMapping?.secondary,
    addressMapping?.city,
    addressMapping?.state,
    addressMapping?.zipcode,
  ])

  const fetchSuggestions = useCallback(
    async (query: string, selected: string | null): Promise<AddressSuggestion[]> => {
      const baseUrl =
        addressApiConfig?.url ||
        'https://gtw-oci.statehub.hawaii.gov/oci-psd91/API/address/autocomplete'
      let url = `${baseUrl}?getaddress=${encodeURIComponent(query)}`
      if (selected) url += `&selected=${encodeURIComponent(selected)}`

      const headers: Record<string, string> = { Accept: 'application/json' }
      if (addressApiConfig?.username && addressApiConfig?.password) {
        headers['Authorization'] =
          `Basic ${btoa(`${addressApiConfig.username}:${addressApiConfig.password}`)}`
      }
      if (addressApiConfig?.partnerId) {
        headers['partner-id'] = addressApiConfig.partnerId
      }

      const resp = await fetch(url, { method: 'GET', headers })
      if (!resp.ok) return []
      const data = await resp.json()
      return Array.isArray(data) ? data : (Array.isArray(data?.suggestions) ? data.suggestions : [])
    },
    [addressApiConfig?.url, addressApiConfig?.username, addressApiConfig?.password, addressApiConfig?.partnerId],
  )

  const doSearch = useCallback(
    (query: string, selected: string | null) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)

      const delay = selected ? 0 : debounceDelay
      const reqId = ++requestIdRef.current
      setIsLoading(true)

      debounceRef.current = setTimeout(async () => {
        try {
          const results = await fetchSuggestions(query, selected)
          if (requestIdRef.current !== reqId) return

          const opts = results.map((s) => ({
            value: buildSelectedParam(s),
            label: buildAddressDisplayLabel(s),
            data: s as unknown as SmartStreetDropdownItem,
          }))
          setOptions(opts)
          if (opts.length > 0) setMenuIsOpen(true)
        } catch (err) {
          if (requestIdRef.current === reqId) {
            console.error('SmartStreet: fetch error', err)
            setOptions([])
          }
        } finally {
          if (requestIdRef.current === reqId) setIsLoading(false)
        }
      }, delay)
    },
    [fetchSuggestions, debounceDelay],
  )

  const handleInputChange = useCallback(
    (newInput: string, { action }: InputActionMeta) => {
      if (action !== 'input-change') return
      inputRef.current = newInput

      if (finalizedRef.current) {
        finalizedRef.current = false
        setSelectedValue(null)
        setLastResult(null)
        onAddressSelected?.(EMPTY_ADDRESS)
      }

      if (newInput.length < minSearchLength) {
        setOptions([])
        return
      }
      doSearch(newInput, null)
    },
    [minSearchLength, doSearch, onAddressSelected],
  )

  // Handles manual edits to individual address input fields after selection
  const handleFieldChange = useCallback(
    (field: keyof AddressResult, fieldValue: string) => {
      setLastResult((prev) => {
        const updated: AddressResult = { ...(prev ?? EMPTY_ADDRESS), [field]: fieldValue }
        const label = [
          updated.streetLine,
          updated.secondary,
          updated.city,
          `${updated.state} ${updated.zipcode}`.trim(),
        ]
          .filter(Boolean)
          .join(', ')
        onChange?.({ selectedLabel: label, address: updated })
        return updated
      })
    },
    [onChange],
  )

  const finalizeAddress = useCallback(
    (newVal: OptionType, addr: AddressSuggestion, suggestion: AddressSuggestion) => {
      finalizedRef.current = true
      setSelectedValue(newVal)
      setOptions([])
      setMenuIsOpen(false)
      const result: AddressResult = {
        streetLine: addr.street_line || suggestion.street_line || '',
        secondary: addr.secondary ?? suggestion.secondary ?? '',
        city: addr.city || suggestion.city || '',
        state: addr.state || suggestion.state || '',
        zipcode: addr.zipcode || suggestion.zipcode || '',
      }
      setLastResult(result)
      // Store structured data for persistence
      const storedValue: SmartStreetValue = { selectedLabel: newVal.label, address: result }
      onChange?.(storedValue)
      onAddressSelected?.(result)
    },
    [onChange, onAddressSelected],
  )

  const handleChange = useCallback(
    async (newVal: SingleValue<OptionType>) => {
      if (!newVal?.data) {
        finalizedRef.current = false
        setSelectedValue(null)
        setLastResult(null)
        setOptions([])
        setMenuIsOpen(false)
        onChange?.(null)
        onAddressSelected?.(EMPTY_ADDRESS)
        return
      }

      const suggestion = newVal.data as unknown as AddressSuggestion
      const selected = buildSelectedParam(suggestion)

      setIsLoading(true)
      try {
        const results = await fetchSuggestions(inputRef.current, selected)

        if (results.length === 1 && Number(results[0]?.entries || 0) <= 1) {
          finalizeAddress(newVal, results[0], suggestion)
        } else if (results.length > 0) {
          const subOpts = results.map((s) => ({
            value: buildSelectedParam(s),
            label: buildAddressDisplayLabel(s),
            data: s as unknown as SmartStreetDropdownItem,
          }))
          setOptions(subOpts)
          setMenuIsOpen(true)
        } else {
          finalizeAddress(newVal, suggestion, suggestion)
        }
      } catch (err) {
        console.error('SmartStreet: final lookup error', err)
        finalizeAddress(newVal, suggestion, suggestion)
      } finally {
        setIsLoading(false)
      }
    },
    [fetchSuggestions, finalizeAddress, onChange, onAddressSelected],
  )

  return (
    <div className="smart-street-wrapper" style={{ minWidth: 0, minHeight: 38, overflow: 'visible' }}>
      <Select<OptionType>
        name={name}
        options={options}
        isLoading={isLoading}
        value={selectedValue}
        onChange={handleChange as any}
        onInputChange={handleInputChange}
        menuIsOpen={menuIsOpen}
        onMenuOpen={() => setMenuIsOpen(true)}
        onMenuClose={() => { if (!isLoading) setMenuIsOpen(false) }}
        closeMenuOnSelect={false}
        filterOption={() => true}
        placeholder={placeholder}
        noOptionsMessage={({ inputValue }) =>
          isLoading
            ? 'Searching...'
            : inputValue.length < minSearchLength
              ? `Type at least ${minSearchLength} characters`
              : 'No addresses found'
        }
        loadingMessage={() => 'Searching addresses...'}
        styles={selectStyles}
        isClearable
        classNamePrefix="react-select"
        blurInputOnSelect={false}
      />

      {/* Editable address input fields — always visible, populated after selection */}
      <div className="address-editable-fields mt-2">
        <div className="mb-2">
          <label className="form-label mb-1">{labels.streetLine}</label>
          <input
            type="text"
            className="form-control"
            value={lastResult?.streetLine ?? ''}
            onChange={(e) => handleFieldChange('streetLine', e.target.value)}
            aria-label={labels.streetLine}
          />
        </div>
        <div className="mb-2">
          <label className="form-label mb-1">{labels.secondary}</label>
          <input
            type="text"
            className="form-control"
            value={lastResult?.secondary ?? ''}
            onChange={(e) => handleFieldChange('secondary', e.target.value)}
            aria-label={labels.secondary}
          />
        </div>
          <div className="mb-2">
          <label className="form-label mb-1">{labels.city}</label>
          <input
            type="text"
            className="form-control"
            value={lastResult?.city ?? ''}
            onChange={(e) => handleFieldChange('city', e.target.value)}
            aria-label={labels.city}
          />
        </div>
         
          <div className="mb-2">
            <label className="form-label mb-1">{labels.state}</label>
            <input
              type="text"
              className="form-control"
              value={lastResult?.state ?? ''}
              onChange={(e) => handleFieldChange('state', e.target.value)}
              aria-label={labels.state}
            />
          </div>
          <div className="mb-2">
            <label className="form-label mb-1">{labels.zipcode}</label>
            <input
              type="text"
              className="form-control"
              value={lastResult?.zipcode ?? ''}
              onChange={(e) => handleFieldChange('zipcode', e.target.value)}
              aria-label={labels.zipcode}
            />
          </div>
      </div>

      <input
        type="hidden"
        name={name}
        className="searchable-dropdown-hidden-value"
        data-key={name}
        value={JSON.stringify(selectedValue?.data ?? null)}
        readOnly
      />
    </div>
  )
}

export const SmartStreet = React.memo(SmartStreetInner)

export default SmartStreet

