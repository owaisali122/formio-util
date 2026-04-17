import React, { useCallback, useMemo } from 'react'
import DatePicker from 'react-datepicker'

// ── Date parsing / formatting helpers (timezone-safe) ──────────────────

/** Parse a `yyyy-MM-dd` string into a local Date without timezone shift. */
export function parseDateString(value: string | null | undefined): Date | null {
  if (!value || typeof value !== 'string') return null
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const year = parseInt(match[1], 10)
  const month = parseInt(match[2], 10) - 1
  const day = parseInt(match[3], 10)
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null
  const d = new Date(year, month, day)
  if (d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== day) return null
  return d
}

/** Format a Date to `yyyy-MM-dd` using local date parts (no timezone shift). */
export function formatDateString(date: Date | null): string {
  if (!date || isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// ── Component props ────────────────────────────────────────────────────

export interface DatePickerInputProps {
  value: string | null
  onChange: (value: string) => void
  displayFormat?: string
  placeholder?: string
  disabled?: boolean
  readOnly?: boolean
  allowManualInput?: boolean
  openOnInputClick?: boolean
  showCalendarIcon?: boolean
  clearable?: boolean
  autoFocus?: boolean
  minDate?: string
  maxDate?: string
  disablePastDates?: boolean
  disableFutureDates?: boolean
  disableWeekends?: boolean
}

// ── React component ────────────────────────────────────────────────────

export function DatePickerInput({
  value,
  onChange,
  displayFormat = 'MM/dd/yyyy',
  placeholder = 'MM/DD/YYYY',
  disabled = false,
  readOnly = false,
  allowManualInput = false,
  openOnInputClick = true,
  showCalendarIcon = true,
  clearable = true,
  autoFocus = false,
  minDate: minDateStr,
  maxDate: maxDateStr,
  disablePastDates = false,
  disableFutureDates = false,
  disableWeekends = false,
}: DatePickerInputProps) {
  const selected = useMemo(() => parseDateString(value), [value])

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const computedMinDate = useMemo(() => {
    const fromProp = parseDateString(minDateStr)
    if (disablePastDates) {
      if (!fromProp || fromProp < today) return today
    }
    return fromProp ?? undefined
  }, [minDateStr, disablePastDates, today])

  const computedMaxDate = useMemo(() => {
    const fromProp = parseDateString(maxDateStr)
    if (disableFutureDates) {
      if (!fromProp || fromProp > today) return today
    }
    return fromProp ?? undefined
  }, [maxDateStr, disableFutureDates, today])

  const filterDate = useCallback(
    (date: Date) => {
      if (disableWeekends) {
        const day = date.getDay()
        if (day === 0 || day === 6) return false
      }
      return true
    },
    [disableWeekends],
  )

  const handleChange = useCallback(
    (date: Date | null) => {
      onChange(formatDateString(date))
    },
    [onChange],
  )

  /** Block keyboard typing when manual input is not allowed. */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      if (!allowManualInput && e.key !== 'Tab' && e.key !== 'Escape') {
        e.preventDefault()
      }
    },
    [allowManualInput],
  )

  const isEffectivelyReadOnly = disabled || readOnly

  return (
    <DatePicker
      selected={selected}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      dateFormat={displayFormat}
      placeholderText={placeholder}
      isClearable={clearable && !isEffectivelyReadOnly}
      disabled={disabled}
      readOnly={readOnly}
      autoFocus={autoFocus}
      minDate={computedMinDate}
      maxDate={computedMaxDate}
      filterDate={disableWeekends ? filterDate : undefined}
      showMonthDropdown
      showYearDropdown
      dropdownMode="select"
      showIcon={showCalendarIcon}
      toggleCalendarOnIconClick={showCalendarIcon}
      preventOpenOnFocus={!openOnInputClick}
      showPopperArrow={false}
      className="form-control"
      calendarClassName="datepicker-calendar"
      autoComplete="off"
      aria-label={placeholder}
    />
  )
}
