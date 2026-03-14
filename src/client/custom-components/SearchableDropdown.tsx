'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import AsyncSelect from 'react-select/async'
import { MultiValue, SingleValue, StylesConfig } from 'react-select'

interface OptionType {
  value: string
  label: string
  data?: any
}

export interface SearchableDropdownProps {
  name: string
  apiUrl: string
  isMultiple?: boolean
  placeholder?: string
  minSearchLength?: number
  debounceDelay?: number
  value?: ApiResponseItem | ApiResponseItem[] | string | string[]
  onChange?: (value: ApiResponseItem | ApiResponseItem[] | null) => void
}

// Custom styles for react-select to match FormIO styling
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
    flexWrap: 'wrap',
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

// API response item schema
interface ApiResponseItem {
  id: string
  value: string
  country: string
  city: string
}

// Build fetch URL with query
function buildFetchUrl(baseUrl: string, query: string): string | null {
  if (!baseUrl || typeof baseUrl !== 'string') {
    console.error('SearchableDropdown: Invalid baseUrl:', baseUrl)
    return null
  }
  
  const trimmedUrl = baseUrl.trim()
  if (!trimmedUrl) {
    console.error('SearchableDropdown: Empty baseUrl')
    return null
  }
  
  // Handle ${query} or {query} placeholder in URL
  if (trimmedUrl.includes('${query}') || trimmedUrl.includes('{query}')) {
    const url = trimmedUrl
      .replace('${query}', encodeURIComponent(query))
      .replace('{query}', encodeURIComponent(query))
    
    // Validate URL format
    try {
      new URL(url)
      return url
    } catch {
      // If relative URL, return as-is (Next.js will handle it)
      return url
    }
  }
  
  // Append query as parameter
  const separator = trimmedUrl.includes('?') ? '&' : '?'
  const url = `${trimmedUrl}${separator}query=${encodeURIComponent(query)}`
  
  // Validate URL format
  try {
    new URL(url)
    return url
  } catch {
    // If relative URL, return as-is (Next.js will handle it)
    return url
  }
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
}: SearchableDropdownProps) {
  const [selectedValue, setSelectedValue] = useState<OptionType | OptionType[] | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialValueSetRef = useRef(false)

  // Validate apiUrl on mount
  useEffect(() => {
    if (!apiUrl || typeof apiUrl !== 'string' || !apiUrl.trim()) {
      console.error('SearchableDropdown: apiUrl is required and must be a non-empty string', {
        name,
        apiUrl,
      })
    }
  }, [apiUrl, name])

  // Convert value(s) to OptionType format on mount and when value changes
  useEffect(() => {
    // Handle null/undefined/empty
    if (!value || (Array.isArray(value) && value.length === 0)) {
      initialValueSetRef.current = false
      setSelectedValue(isMultiple ? [] : null)
      return
    }

    initialValueSetRef.current = true

    if (isMultiple && Array.isArray(value)) {
      // Handle array of objects or strings
      const newValue = value.map(v => {
        if (typeof v === 'object' && v !== null && 'id' in v && 'value' in v) {
          // It's an ApiResponseItem object
          return {
            value: (v as ApiResponseItem).id,
            label: (v as ApiResponseItem).value,
            data: v as ApiResponseItem,
          }
        } else {
          // It's a string (legacy support)
          return { value: String(v), label: String(v), data: null }
        }
      })
      
      setSelectedValue(newValue)
    } else if (typeof value === 'object' && value !== null && 'id' in value && 'value' in value) {
      // Single ApiResponseItem object
      const item = value as ApiResponseItem
      const newValue = {
        value: item.id,
        label: item.value,
        data: item,
      }
      
      setSelectedValue(newValue)
    } else if (typeof value === 'string') {
      // Legacy string support
      const newValue = { value: value, label: value, data: null }
      
      setSelectedValue(newValue)
    }
  }, [value, isMultiple])

  // Load options from API
  const loadOptions = useCallback(
    (inputValue: string): Promise<OptionType[]> => {
      return new Promise((resolve) => {
        // Clear existing timer
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current)
        }

        // Check minimum length
        if (inputValue.length < minSearchLength) {
          resolve([])
          return
        }

        // Debounce the API call
        debounceTimerRef.current = setTimeout(async () => {
          try {
            const url = buildFetchUrl(apiUrl, inputValue)
            
            if (!url) {
              resolve([])
              return
            }
            
            const response = await fetch(url, {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
              },
            })
            
            if (!response.ok) {
              console.error('SearchableDropdown: API error:', {
                status: response.status,
                statusText: response.statusText,
                url: url
              })
              resolve([])
              return
            }

            const data = await response.json()

            // Validate response structure
            if (!data || typeof data !== 'object') {
              console.error('SearchableDropdown: Invalid response format:', data)
              resolve([])
              return
            }

            // Handle results array from API response
            const items: ApiResponseItem[] = Array.isArray(data.results) ? data.results : []

            const options: OptionType[] = items
              .filter((item: ApiResponseItem) => {
                // Validate item structure
                if (!item || !item.id || !item.value) {
                  console.warn('SearchableDropdown: Invalid item structure:', item)
                  return false
                }
                return true
              })
              .map((item: ApiResponseItem) => {
                return {
                  value: item.id, // Use id as the value
                  label: item.value, // Use value as the display label
                  data: item,
                }
              })

            resolve(options)
          } catch (error: any) {
            console.error('SearchableDropdown: Fetch error:', {
              error: error,
              message: error?.message,
              stack: error?.stack,
              apiUrl: apiUrl,
            })
            resolve([])
          }
        }, debounceDelay)
      })
    },
    [apiUrl, minSearchLength, debounceDelay]
  )

  // Handle selection change
  const handleChange = useCallback(
    (newValue: MultiValue<OptionType> | SingleValue<OptionType>) => {
      if (isMultiple) {
        const multiValue = newValue as MultiValue<OptionType>
        if (multiValue && multiValue.length > 0) {
          // Extract full objects from data property
          const objects = multiValue
            .map(v => v.data as ApiResponseItem)
            .filter((obj): obj is ApiResponseItem => obj !== null && obj !== undefined)
          setSelectedValue([...multiValue])
          onChange?.(objects.length > 0 ? objects : null)
        } else {
          setSelectedValue([])
          onChange?.(null)
        }
      } else {
        const singleValue = newValue as SingleValue<OptionType>
        if (singleValue && singleValue.data) {
          // Extract full object from data property
          const object = singleValue.data as ApiResponseItem
          setSelectedValue(singleValue)
          onChange?.(object)
        } else {
          setSelectedValue(null)
          onChange?.(null)
        }
      }
    },
    [isMultiple, onChange]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  return (
    <div className="searchable-dropdown-react-wrapper" style={{ minWidth: 0, minHeight: 38, overflow: 'visible' }}>
      <AsyncSelect<OptionType, boolean>
        name={name}
        isMulti={isMultiple}
        cacheOptions
        defaultOptions={selectedValue ? (Array.isArray(selectedValue) ? selectedValue : [selectedValue]) : false}
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
      {/* Hidden input to store the value for form extraction */}
      <input
        type="hidden"
        name={name}
        className="searchable-dropdown-hidden-value"
        data-key={name}
        value={JSON.stringify(
          isMultiple
            ? (Array.isArray(selectedValue) ? selectedValue : [])
                .map(v => v?.data as ApiResponseItem)
                .filter((obj): obj is ApiResponseItem => obj != null)
            : (selectedValue && !Array.isArray(selectedValue) ? (selectedValue as OptionType).data : null) as ApiResponseItem | null
        )}
        readOnly
      />
    </div>
  )
}

export default SearchableDropdownReact
