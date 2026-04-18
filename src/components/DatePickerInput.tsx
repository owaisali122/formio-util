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

// ── Disabled dates helpers ─────────────────────────────────────────────

/** Parse comma-separated date strings: "2026-04-20, 2026-04-25" */
export function parseDisabledDates(raw: string | undefined): Date[] {
  if (!raw || typeof raw !== 'string') return []
  return raw
    .split(',')
    .map((s) => parseDateString(s.trim()))
    .filter((d): d is Date => d !== null)
}

export interface DisabledDateRange {
  start: Date
  end: Date
}

/** Parse disabled range entries. Each line: "2026-04-10 to 2026-04-15" */
export function parseDisabledRanges(raw: string | undefined): DisabledDateRange[] {
  if (!raw || typeof raw !== 'string') return []
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\s+to\s+/i)
      if (parts.length !== 2) return null
      const start = parseDateString(parts[0].trim())
      const end = parseDateString(parts[1].trim())
      if (!start || !end || start > end) return null
      return { start, end }
    })
    .filter((r): r is DisabledDateRange => r !== null)
}

/** Check whether a given date falls on any disabled single date or range. */
function isDateDisabled(
  date: Date,
  disabledDates: Date[],
  disabledRanges: DisabledDateRange[],
): boolean {
  const time = date.getTime()
  for (const d of disabledDates) {
    if (d.getTime() === time) return true
  }
  for (const r of disabledRanges) {
    if (time >= r.start.getTime() && time <= r.end.getTime()) return true
  }
  return false
}

// ── Date range value type ──────────────────────────────────────────────

export interface DateRangeValue {
  startDate: string
  endDate: string
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
  /** 'single' (default) or 'range' */
  pickerMode?: 'single' | 'range'
  /** For range mode: JSON-stringified DateRangeValue or null */
  rangeValue?: string | null
  /** For range mode: callback with JSON-stringified DateRangeValue */
  onRangeChange?: (value: string) => void
  /** Comma-separated disabled dates, e.g. "2026-04-20, 2026-04-25" */
  disabledDates?: string
  /** Newline-separated disabled ranges, e.g. "2026-04-10 to 2026-04-15" */
  disabledDateRanges?: string
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
  pickerMode = 'single',
  rangeValue,
  onRangeChange,
  disabledDates: disabledDatesStr,
  disabledDateRanges: disabledDateRangesStr,
}: DatePickerInputProps) {
  // ── Single-date state ──
  const selected = useMemo(() => parseDateString(value), [value])

  // ── Range state ──
  const parsedRange = useMemo(() => {
    if (pickerMode !== 'range' || !rangeValue) return { start: null, end: null }
    try {
      const obj: DateRangeValue = JSON.parse(rangeValue)
      return {
        start: parseDateString(obj.startDate),
        end: parseDateString(obj.endDate),
      }
    } catch {
      return { start: null, end: null }
    }
  }, [pickerMode, rangeValue])

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

  // ── Disabled dates / ranges ──
  const parsedDisabledDates = useMemo(
    () => parseDisabledDates(disabledDatesStr),
    [disabledDatesStr],
  )
  const parsedDisabledRanges = useMemo(
    () => parseDisabledRanges(disabledDateRangesStr),
    [disabledDateRangesStr],
  )

  const filterDate = useCallback(
    (date: Date) => {
      if (disableWeekends) {
        const day = date.getDay()
        if (day === 0 || day === 6) return false
      }
      if (isDateDisabled(date, parsedDisabledDates, parsedDisabledRanges)) return false
      return true
    },
    [disableWeekends, parsedDisabledDates, parsedDisabledRanges],
  )

  // ── Single-date handler ──
  const handleChange = useCallback(
    (date: Date | null) => {
      onChange(formatDateString(date))
    },
    [onChange],
  )

  // ── Range handler ──
  const handleRangeChange = useCallback(
    (dates: [Date | null, Date | null]) => {
      if (!onRangeChange) return
      const [start, end] = dates
      const val: DateRangeValue = {
        startDate: formatDateString(start),
        endDate: formatDateString(end),
      }
      onRangeChange(JSON.stringify(val))
    },
    [onRangeChange],
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
  const hasDisabledFilters =
    disableWeekends || parsedDisabledDates.length > 0 || parsedDisabledRanges.length > 0

  // ── Range mode ──
  if (pickerMode === 'range') {
    return (
      <DatePicker
        selected={parsedRange.start}
        onChange={handleRangeChange as any}
        startDate={parsedRange.start}
        endDate={parsedRange.end}
        selectsRange
        onKeyDown={handleKeyDown}
        dateFormat={displayFormat}
        placeholderText={placeholder}
        isClearable={clearable && !isEffectivelyReadOnly}
        disabled={disabled}
        readOnly={readOnly}
        autoFocus={autoFocus}
        minDate={computedMinDate}
        maxDate={computedMaxDate}
        filterDate={hasDisabledFilters ? filterDate : undefined}
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

  // ── Single-date mode (default) ──
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
      filterDate={hasDisabledFilters ? filterDate : undefined}
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
