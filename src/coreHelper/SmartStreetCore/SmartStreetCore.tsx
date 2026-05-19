'use client'

import React, { useState, useCallback, useRef, useMemo } from 'react'
import Select from 'react-select'
import type { SingleValue, StylesConfig, InputActionMeta } from 'react-select'
import type { SmartStreetDropdownItem } from '../../components/SmartStreetDropdown'
import type {
  AddressApiConfig,
  AddressMapping,
  AddressResult,
  SmartStreetProps,
  SmartStreetValue,
} from './SmartStreetCore.types'
import { ComponentCache } from '../CacheHelper'

export type {
  AddressApiConfig,
  AddressMapping,
  AddressResult,
  SmartStreetProps,
  SmartStreetValue,
} from './SmartStreetCore.types'

/**
 * Module-level cache for address suggestions.
 * Survives component remounts (wizard navigation).
 */
const _addressCache = new ComponentCache({ staleTime: 60_000, cacheTime: 300_000 })

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

// (AddressApiConfig, AddressResult, AddressMapping re-exported from types above)

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

// ── Client-side filter helpers ───────────────────────────────────────────

function normalize(value: string | undefined | null): string {
  return (value ?? '').trim().toLowerCase()
}

function getAddressKey(s: AddressSuggestion): string {
  return `${normalize(s.street_line)}|${normalize(s.city)}|${normalize(s.state)}|${normalize(s.zipcode)}`
}

/**
 * Removes confusing blank base-address rows from autocomplete results when
 * more specific secondary variants already exist in the same group.
 *
 * Rule: if multiple suggestions share the same street_line/city/state/zipcode
 * and at least one has a non-empty secondary, drop the row whose secondary is
 * blank AND entries is 0 or empty.
 *
 * Applied only on initial top-level search results — never on secondary expansion.
 */
function filterIrrelevantSuggestions(suggestions: AddressSuggestion[]): AddressSuggestion[] {
  // Single pass: collect keys that have at least one specific secondary
  const keysWithSecondary = new Set<string>()
  for (const s of suggestions) {
    if ((s.secondary ?? '').trim() !== '') {
      keysWithSecondary.add(getAddressKey(s))
    }
  }
  if (keysWithSecondary.size === 0) return suggestions
  return suggestions.filter((s) => {
    const blankSecondary = (s.secondary ?? '').trim() === ''
    const noEntries = Number(s.entries || 0) === 0
    return !(blankSecondary && noEntries && keysWithSecondary.has(getAddressKey(s)))
  })
}

// ──────────────────────────────────────────────────────────────────────────────

// (Types re-exported from SmartStreetCore.types above)

// ── Option renderer — shows right-side entries badge only in dropdown menu ──
function formatOptionLabel(opt: OptionType, { context }: { context: 'menu' | 'value' }) {
  const entries = Number((opt.data as unknown as AddressSuggestion)?.entries ?? 0)
  if (context === 'value' || entries <= 1) {
    return <span>{opt.label}</span>
  }
  const noun = entries === 1 ? 'address' : 'addresses'
  return (
    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
      <span>{opt.label}</span>
      <span
        style={{
          flexShrink: 0,
          fontSize: '11px',
          fontWeight: 600,
          color: '#007bff',
          whiteSpace: 'nowrap',
          marginLeft: '8px',
        }}
      >
        +{entries} {noun}
      </span>
    </span>
  )
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
  disabled = false,
  tabIndex,
  enableCache = true,
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
  // Tracks the last confirmed street_line so the search field can be re-seeded
  // when the user reopens the dropdown after a selection.
  const lastStreetLineRef = useRef(value?.address?.streetLine ?? '')
  const [inputValue, setInputValue] = useState('')

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

      const doFetch = async (): Promise<AddressSuggestion[]> => {
        const resp = await fetch(url, { method: 'GET', headers })
        if (!resp.ok) return []
        const data = await resp.json()
        return Array.isArray(data) ? data : (Array.isArray(data?.suggestions) ? data.suggestions : [])
      }

      if (!enableCache) return doFetch()

      // Cache key uses the URL (which includes query + selected) and safe config parts.
      // Sensitive values (credentials) are NOT included in the key.
      const cacheKey = `smartstreet|${name}|${url}`
      return _addressCache.fetch(cacheKey, doFetch)
    },
    [addressApiConfig?.url, addressApiConfig?.username, addressApiConfig?.password, addressApiConfig?.partnerId, enableCache, name],
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

          // Apply client-side filter only for top-level (non-selected) searches
          const filtered = selected === null ? filterIrrelevantSuggestions(results) : results
          const opts = filtered.map((s) => ({
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
      if (action === 'input-blur' || action === 'menu-close') {
        if (action === 'input-blur') {
          if (debounceRef.current) clearTimeout(debounceRef.current)
          setOptions([])
          setMenuIsOpen(false)
          // If a selection is finalized, clear the input so React Select
          // displays the selected value label. Otherwise keep the typed text.
          if (finalizedRef.current) {
            setInputValue('')
          } else {
            setInputValue(inputRef.current)
          }
        }
        return
      }
      if (action !== 'input-change') return
      setInputValue(newInput)
      inputRef.current = newInput

      // finalizedRef is already cleared in handleMenuOpen before the user types;
      // this fallback handles the edge case where input-change fires without a prior menu open.
      if (finalizedRef.current) {
        finalizedRef.current = false
        setSelectedValue(null)
        // lastResult is kept intact so address fields stay populated.
      }

      if (newInput.length < minSearchLength) {
        setOptions([])
        return
      }
      doSearch(newInput, null)
    },
    [minSearchLength, doSearch],
  )

  // Handles manual edits to individual address input fields after selection
  const handleFieldChange = useCallback(
    (field: keyof AddressResult, fieldValue: string) => {
      if (field === 'streetLine') lastStreetLineRef.current = fieldValue
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
      const result: AddressResult = {
        streetLine: addr.street_line || suggestion.street_line || '',
        secondary: addr.secondary ?? suggestion.secondary ?? '',
        city: addr.city || suggestion.city || '',
        state: addr.state || suggestion.state || '',
        zipcode: addr.zipcode || suggestion.zipcode || '',
      }
      lastStreetLineRef.current = result.streetLine
      // Fix 2: the React Select control should display only the street_line,
      // not the full formatted address label.
      const controlLabel = result.streetLine || newVal.label
      const displayOption: OptionType = { ...newVal, value: controlLabel, label: controlLabel }
      setSelectedValue(displayOption)
      setInputValue('')
      setOptions([])
      setMenuIsOpen(false)
      setLastResult(result)
      // Store structured data for persistence
      const storedValue: SmartStreetValue = { selectedLabel: controlLabel, address: result }
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

  // When user reopens the dropdown after a finalized selection, seed the input
  // with the current street_line so they can refine from where they left off.
  const handleMenuOpen = useCallback(() => {
    setMenuIsOpen(true)
    if (finalizedRef.current) {
      finalizedRef.current = false
      setSelectedValue(null)
      const street = lastStreetLineRef.current
      if (street) {
        setInputValue(street)
        inputRef.current = street
        if (street.length >= minSearchLength) {
          doSearch(street, null)
        }
      }
    }
  }, [minSearchLength, doSearch])

  // Stable, deterministic IDs for react-select to prevent SSR/CSR hydration
  // mismatches in Next.js. Without these, react-select auto-generates instance
  // IDs (e.g. "react-select-2-..."), which can differ between server and client.
  const stableSelectId = useMemo(() => name || 'smart-street', [name])

  return (
    <div className="smart-street-wrapper" style={{ minWidth: 0, minHeight: 38, overflow: 'visible' }}>
      <Select<OptionType>
        instanceId={stableSelectId}
        inputId={`${stableSelectId}-input`}
        name={name}
        options={options}
        isLoading={isLoading}
        value={selectedValue}
        inputValue={inputValue}
        onChange={handleChange as any}
        onInputChange={handleInputChange}
        menuIsOpen={menuIsOpen}
        onMenuOpen={handleMenuOpen}
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
        formatOptionLabel={formatOptionLabel}
        isClearable
        isDisabled={disabled}
        classNamePrefix="react-select"
        blurInputOnSelect={false}
        tabIndex={tabIndex}
      />

      {/* Editable address input fields — search field covers Address; show remaining fields */}
      <div className="address-editable-fields mt-2">
        <div className="mb-2">
          <label className="form-label mb-1">{labels.secondary}</label>
          <input
            type="text"
            className="form-control"
            value={lastResult?.secondary ?? ''}
            onChange={(e) => handleFieldChange('secondary', e.target.value)}
            aria-label={labels.secondary}
            disabled={disabled}
            tabIndex={tabIndex}
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
            disabled={disabled}
            tabIndex={tabIndex}
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
              disabled={disabled}
              tabIndex={tabIndex}
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
              disabled={disabled}
              tabIndex={tabIndex}
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

