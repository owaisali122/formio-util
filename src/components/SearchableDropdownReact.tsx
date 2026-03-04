'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import AsyncSelect from 'react-select/async'
import type { MultiValue, SingleValue, StylesConfig } from 'react-select'
import type { SearchableDropdownItem } from './SearchableDropdown'

interface OptionType {
  value: string
  label: string
  data?: SearchableDropdownItem
}

export interface SearchableDropdownReactProps {
  name: string
  apiUrl: string
  isMultiple?: boolean
  placeholder?: string
  minSearchLength?: number
  debounceDelay?: number
  value?: SearchableDropdownItem | SearchableDropdownItem[] | string | string[] | null
  onChange?: (value: SearchableDropdownItem | SearchableDropdownItem[] | null) => void
}

const customStyles: StylesConfig<OptionType, boolean> = {
  control: (base, state) => ({
    ...base,
    borderColor: state.isFocused ? '#80bdff' : '#ced4da',
    boxShadow: state.isFocused ? '0 0 0 0.2rem rgba(0,123,255,.25)' : 'none',
    '&:hover': {
      borderColor: state.isFocused ? '#80bdff' : '#ced4da',
    },
    minHeight: '38px',
    minWidth: 0,
  }),
  valueContainer: (base) => ({
    ...base,
    flexWrap: 'wrap' as const,
    overflow: 'visible',
  }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: '#e7f1ff',
    borderRadius: '4px',
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: '#0056b3',
    fontWeight: 500,
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: '#0056b3',
    '&:hover': {
      backgroundColor: '#b8d4ff',
      color: '#003d82',
    },
  }),
  placeholder: (base) => ({
    ...base,
    color: '#6c757d',
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? '#007bff'
      : state.isFocused
        ? '#f8f9fa'
        : 'white',
    color: state.isSelected ? 'white' : '#212529',
    '&:hover': {
      backgroundColor: state.isSelected ? '#007bff' : '#e9ecef',
    },
  }),
}

function buildFetchUrl(baseUrl: string, query: string): string | null {
  if (!baseUrl || typeof baseUrl !== 'string') return null
  const trimmed = baseUrl.trim()
  if (!trimmed) return null

  if (trimmed.includes('${query}') || trimmed.includes('{query}')) {
    return trimmed
      .replace('${query}', encodeURIComponent(query))
      .replace('{query}', encodeURIComponent(query))
  }

  const separator = trimmed.includes('?') ? '&' : '?'
  return `${trimmed}${separator}query=${encodeURIComponent(query)}`
}

function toOption(item: SearchableDropdownItem): OptionType {
  return { value: item.id, label: item.value, data: item }
}

function toOptionFromValue(
  v: SearchableDropdownItem | string,
): OptionType {
  if (typeof v === 'object' && v !== null && 'id' in v && 'value' in v) {
    return toOption(v)
  }
  return { value: String(v), label: String(v) }
}

export function SearchableDropdownReact({
  name,
  apiUrl,
  isMultiple = false,
  placeholder = 'Type to search...',
  minSearchLength = 2,
  debounceDelay = 300,
  value,
  onChange,
}: SearchableDropdownReactProps) {
  const [selectedValue, setSelectedValue] = useState<OptionType | OptionType[] | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!value || (Array.isArray(value) && value.length === 0)) {
      setSelectedValue(isMultiple ? [] : null)
      return
    }

    if (isMultiple && Array.isArray(value)) {
      setSelectedValue(value.map(toOptionFromValue))
    } else if (!Array.isArray(value)) {
      setSelectedValue(toOptionFromValue(value as SearchableDropdownItem | string))
    }
  }, [value, isMultiple])

  const loadOptions = useCallback(
    (inputValue: string): Promise<OptionType[]> => {
      return new Promise((resolve) => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)

        if (inputValue.length < minSearchLength) {
          resolve([])
          return
        }

        debounceTimerRef.current = setTimeout(async () => {
          try {
            const url = buildFetchUrl(apiUrl, inputValue)
            if (!url) { resolve([]); return }

            const response = await fetch(url, {
              method: 'GET',
              headers: { Accept: 'application/json' },
            })

            if (!response.ok) {
              console.error('SearchableDropdown: API returned', response.status, response.statusText)
              resolve([])
              return
            }

            const data = await response.json()
            if (!data || typeof data !== 'object') { resolve([]); return }

            const items: SearchableDropdownItem[] = Array.isArray(data.results)
              ? data.results
              : Array.isArray(data)
                ? data
                : []

            resolve(
              items
                .filter((item) => item && item.id && item.value)
                .map(toOption),
            )
          } catch (err) {
            console.error('SearchableDropdown: fetch error', err)
            resolve([])
          }
        }, debounceDelay)
      })
    },
    [apiUrl, minSearchLength, debounceDelay],
  )

  const handleChange = useCallback(
    (newValue: MultiValue<OptionType> | SingleValue<OptionType>) => {
      if (isMultiple) {
        const multi = newValue as MultiValue<OptionType>
        if (multi && multi.length > 0) {
          const items = multi
            .map((v) => v.data as SearchableDropdownItem)
            .filter((obj): obj is SearchableDropdownItem => obj != null)
          setSelectedValue([...multi])
          onChange?.(items.length > 0 ? items : null)
        } else {
          setSelectedValue([])
          onChange?.(null)
        }
      } else {
        const single = newValue as SingleValue<OptionType>
        if (single?.data) {
          setSelectedValue(single)
          onChange?.(single.data)
        } else {
          setSelectedValue(null)
          onChange?.(null)
        }
      }
    },
    [isMultiple, onChange],
  )

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [])

  return (
    <div className="searchable-dropdown-react-wrapper" style={{ minWidth: 0, minHeight: 38, overflow: 'visible' }}>
      <AsyncSelect<OptionType, boolean>
        name={name}
        isMulti={isMultiple}
        cacheOptions
        defaultOptions={
          selectedValue
            ? (Array.isArray(selectedValue) ? selectedValue : [selectedValue])
            : false
        }
        loadOptions={loadOptions}
        onChange={handleChange}
        value={selectedValue}
        placeholder={placeholder}
        noOptionsMessage={({ inputValue }) =>
          inputValue.length < minSearchLength
            ? `Type at least ${minSearchLength} characters to search`
            : 'No options found'
        }
        loadingMessage={() => 'Searching...'}
        styles={customStyles}
        isClearable
        classNamePrefix="react-select"
      />
      <input
        type="hidden"
        name={name}
        className="searchable-dropdown-hidden-value"
        data-key={name}
        value={JSON.stringify(
          isMultiple
            ? (Array.isArray(selectedValue) ? selectedValue : [])
                .map((v) => v?.data as SearchableDropdownItem)
                .filter((obj): obj is SearchableDropdownItem => obj != null)
            : (selectedValue && !Array.isArray(selectedValue)
                ? (selectedValue as OptionType).data
                : null),
        )}
        readOnly
      />
    </div>
  )
}

export default SearchableDropdownReact
