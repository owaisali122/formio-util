import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
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

export interface DateRestrictionValidationOptions {
  minDate?: string | Date | null
  maxDate?: string | Date | null
  disablePastDates?: boolean
  disableFutureDates?: boolean
  disableWeekends?: boolean
  disabledDates?: Date[]
  disabledRanges?: DisabledDateRange[]
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

function resolveDateBoundary(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null
    const normalized = new Date(value)
    normalized.setHours(0, 0, 0, 0)
    return normalized
  }
  return parseDateString(value)
}

export function getDateRestrictionError(
  date: Date,
  {
    minDate,
    maxDate,
    disablePastDates = false,
    disableFutureDates = false,
    disableWeekends = false,
    disabledDates = [],
    disabledRanges = [],
  }: DateRestrictionValidationOptions,
): string | null {
  const normalizedDate = resolveDateBoundary(date)
  if (!normalizedDate) return 'Please enter a valid date.'

  const resolvedMinDate = resolveDateBoundary(minDate)
  if (resolvedMinDate && normalizedDate < resolvedMinDate) {
    return `Date must be on or after ${formatDateString(resolvedMinDate)}.`
  }

  const resolvedMaxDate = resolveDateBoundary(maxDate)
  if (resolvedMaxDate && normalizedDate > resolvedMaxDate) {
    return `Date must be on or before ${formatDateString(resolvedMaxDate)}.`
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (disablePastDates && normalizedDate < today) {
    return 'Past dates are not allowed.'
  }

  if (disableFutureDates && normalizedDate > today) {
    return 'Future dates are not allowed.'
  }

  if (disableWeekends) {
    const day = normalizedDate.getDay()
    if (day === 0 || day === 6) {
      return 'Weekends are not allowed.'
    }
  }

  for (const disabledDate of disabledDates) {
    if (resolveDateBoundary(disabledDate)?.getTime() === normalizedDate.getTime()) {
      return 'This date is not available.'
    }
  }

  for (const disabledRange of disabledRanges) {
    const start = resolveDateBoundary(disabledRange.start)
    const end = resolveDateBoundary(disabledRange.end)
    if (start && end && normalizedDate >= start && normalizedDate <= end) {
      return 'This date falls within a disabled range.'
    }
  }

  return null
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
  onValidationChange?: (payload: {
  isValid: boolean
  message: string | null
  rawValue: string
}) => void
}

// ── Auto-mask helpers ──────────────────────────────────────────────────

/**
 * Given a react-datepicker display format string (e.g. "MM/dd/yyyy"),
 * return the canonical placeholder string (e.g. "MM/DD/YYYY").
 */
export function formatToPlaceholder(displayFormat: string): string {
  return displayFormat
    .replace(/MM/g, 'MM')
    .replace(/dd/g, 'DD')
    .replace(/yyyy/g, 'YYYY')
    .replace(/yy/g, 'YY')
}

/**
 * Given the react-datepicker format string, return a mask descriptor:
 * - pattern: separator positions and characters
 * - positions: [p1, p2] where separators are inserted
 * - maxLen: total masked length (digits + separators)
 *
 * Supports the five formats defined in the schema:
 *   MM/dd/yyyy  DD/MM/yyyy  yyyy-MM-dd  MM-dd-yyyy  dd-MM-yyyy
 */
function getMaskDescriptor(displayFormat: string): {
  sep: string
  order: 'MDY' | 'DMY' | 'YMD'
  partLengths: [number, number, number]
} | null {
  // Normalise for matching
  const f = displayFormat.toLowerCase()
  if (f === 'mm/dd/yyyy' || f === 'mm-dd-yyyy') {
    return { sep: f.includes('/') ? '/' : '-', order: 'MDY', partLengths: [2, 2, 4] }
  }
  if (f === 'dd/mm/yyyy' || f === 'dd-mm-yyyy') {
    return { sep: f.includes('/') ? '/' : '-', order: 'DMY', partLengths: [2, 2, 4] }
  }
  if (f === 'yyyy-mm-dd') {
    return { sep: '-', order: 'YMD', partLengths: [4, 2, 2] }
  }
  return null
}

/**
 * Validate a typed, already-masked date string against the display format.
 * Uses the mask descriptor's part lengths and order to extract Y/M/D values
 * and checks that the resulting date is a real calendar date.
 * Returns the parsed Date when valid, null otherwise.
 */
function parseTypedDateString(typed: string, displayFormat: string): Date | null {
  if (!typed || !typed.trim()) return null
  const desc = getMaskDescriptor(displayFormat)
  if (!desc) return parseDateString(typed) // fallback for unsupported formats

  const parts = typed.split(desc.sep)
  if (parts.length !== 3) return null

  const [s1, s2, s3] = parts
  // Each part must have exactly the expected number of digits
  if (s1.length !== desc.partLengths[0]) return null
  if (s2.length !== desc.partLengths[1]) return null
  if (s3.length !== desc.partLengths[2]) return null

  const n1 = parseInt(s1, 10)
  const n2 = parseInt(s2, 10)
  const n3 = parseInt(s3, 10)
  if (isNaN(n1) || isNaN(n2) || isNaN(n3)) return null

  let year: number, month: number, day: number
  if (desc.order === 'MDY') { month = n1; day = n2; year = n3 }
  else if (desc.order === 'DMY') { day = n1; month = n2; year = n3 }
  else { year = n1; month = n2; day = n3 }   // YMD

  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const d = new Date(year, month - 1, day)
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null
  return d
}

/**
 * Apply auto-masking to raw typed input.
 * Returns the masked string with separators inserted automatically.
 * Only digits are retained from the raw input.
 */
export function applyDateMask(raw: string, displayFormat: string): string {
  const desc = getMaskDescriptor(displayFormat)
  if (!desc) return raw

  // Strip non-digits
  const digits = raw.replace(/\D/g, '')
  const [len1, len2, len3] = desc.partLengths
  const maxDigits = len1 + len2 + len3

  const clamped = digits.slice(0, maxDigits)

  const p1 = clamped.slice(0, len1)
  const p2 = clamped.slice(len1, len1 + len2)
  const p3 = clamped.slice(len1 + len2)

  let result = p1
  if (clamped.length > len1) result += desc.sep + p2
  if (clamped.length > len1 + len2) result += desc.sep + p3
  return result
}

export function applyDateRangeMask(raw: string, displayFormat: string): string {
  const desc = getMaskDescriptor(displayFormat)
  if (!desc) return raw

  // Keep only digits so typing can be continuous and predictable.
  const digits = raw.replace(/\D/g, '')

  const singleDateDigits =
    desc.partLengths[0] + desc.partLengths[1] + desc.partLengths[2]

  const maxDigits = singleDateDigits * 2
  const clamped = digits.slice(0, maxDigits)

  const firstDigits = clamped.slice(0, singleDateDigits)
  const secondDigits = clamped.slice(singleDateDigits)

  const firstMasked = applyDateMask(firstDigits, displayFormat)
  const secondMasked = applyDateMask(secondDigits, displayFormat)

  if (!secondDigits) {
    return firstMasked
  }

  return `${firstMasked} - ${secondMasked}`
}
/**
 * Validate a typed range string (e.g. "04/21/2026 - 04/25/2026").
 * Returns an error message string when invalid, or null when valid.
 * Accepts partial input (only a start date, no separator) without erroring.
 */
function validateRangeTypedInput(
  typed: string,
  displayFormat: string,
  restrictions: DateRestrictionValidationOptions,
): string | null {
  const RANGE_SEP = ' - '
  const sepIdx = typed.indexOf(RANGE_SEP)
  const withRangePrefix = (label: 'Start date' | 'End date', message: string) => `${label}: ${message}`

  if (sepIdx === -1) {
    // Only start date typed — validate it if it looks complete, else treat as partial
    const parsed = parseTypedDateString(typed.trim(), displayFormat)
    if (!parsed) {
      const hint = formatToPlaceholder(displayFormat)
      return `Invalid date format. Expected: ${hint} - ${hint}`
    }

    const restrictionError = getDateRestrictionError(parsed, restrictions)
    if (restrictionError) {
      return withRangePrefix('Start date', restrictionError)
    }

    return null
  }

  const startStr = typed.slice(0, sepIdx)
  const endStr = typed.slice(sepIdx + RANGE_SEP.length)
  const hint = formatToPlaceholder(displayFormat)
  const startParsed = startStr.trim() ? parseTypedDateString(startStr.trim(), displayFormat) : null
  const endParsed = endStr.trim() ? parseTypedDateString(endStr.trim(), displayFormat) : null

  if (startStr.trim() && !startParsed) {
    return `Invalid start date. Expected format: ${hint}`
  }
  if (endStr.trim() && !endParsed) {
    return `Invalid end date. Expected format: ${hint}`
  }

  if (startParsed) {
    const restrictionError = getDateRestrictionError(startParsed, restrictions)
    if (restrictionError) {
      return withRangePrefix('Start date', restrictionError)
    }
  }

  if (endParsed) {
    const restrictionError = getDateRestrictionError(endParsed, restrictions)
    if (restrictionError) {
      return withRangePrefix('End date', restrictionError)
    }
  }

  if (startParsed && endParsed && endParsed < startParsed) {
    return 'End date must be on or after start date.'
  }

  return null
}

export function formatDateByDisplayFormat(date: Date | null, displayFormat: string): string {
  if (!date || isNaN(date.getTime())) return ''

  const yyyy = String(date.getFullYear())
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')

  switch (displayFormat) {
    case 'MM/dd/yyyy':
      return `${mm}/${dd}/${yyyy}`
    case 'dd/MM/yyyy':
      return `${dd}/${mm}/${yyyy}`
    case 'yyyy-MM-dd':
      return `${yyyy}-${mm}-${dd}`
    case 'MM-dd-yyyy':
      return `${mm}-${dd}-${yyyy}`
    case 'dd-MM-yyyy':
      return `${dd}-${mm}-${yyyy}`
    default:
      return `${mm}/${dd}/${yyyy}`
  }
}
// ── React component ────────────────────────────────────────────────────

export function DatePickerInput({
  value,
  onChange,
  displayFormat = 'MM/dd/yyyy',
  placeholder = '',  // empty string lets effectivePlaceholder derive from displayFormat
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
  onValidationChange,
}: DatePickerInputProps) {
  // ── Effective placeholder ──
  // If the caller passes an empty placeholder, fall back to a format-derived hint.
  // For range mode the hint mirrors the displayed value format: "MM/DD/YYYY - MM/DD/YYYY".
  const effectivePlaceholder = useMemo(() => {
    if (placeholder && placeholder.trim()) return placeholder
    const single = formatToPlaceholder(displayFormat)
    return pickerMode === 'range' ? `${single} - ${single}` : single
  }, [placeholder, displayFormat, pickerMode])

  // ── Single-date state ──
  const selected = useMemo(() => parseDateString(value), [value])

    const [inputValue, setInputValue] = useState<string>('')
 const [manualInputError, setManualInputError] = useState<string | null>(null)
  const rawInputRef = useRef<string>('')
  // Ref (synchronous) that mirrors whether an invalid-input error is active.
  // Using a ref avoids stale-closure issues in callbacks — the ref is always
  // current even if the React state hasn't committed yet.
  const hasActiveErrorRef = useRef(false)

    useEffect(() => {
      if (pickerMode !== 'single') return
      if (hasActiveErrorRef.current) return

      const parsed = parseDateString(value)
      setInputValue(formatDateByDisplayFormat(parsed, displayFormat))
    }, [value, displayFormat, pickerMode])

 
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


     useEffect(() => {
  if (pickerMode !== 'range') return
  if (hasActiveErrorRef.current) return

  const startDisplay = formatDateByDisplayFormat(parsedRange.start, displayFormat)
  const endDisplay = formatDateByDisplayFormat(parsedRange.end, displayFormat)

  let rangeDisplay = ''
  if (startDisplay && endDisplay) {
    rangeDisplay = `${startDisplay} - ${endDisplay}`
  } else if (startDisplay) {
    rangeDisplay = startDisplay
  }

  setInputValue(rangeDisplay)
}, [pickerMode, parsedRange.start, parsedRange.end, displayFormat])

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

  const dateValidationRestrictions = useMemo(
    () => ({
      minDate: minDateStr,
      maxDate: maxDateStr,
      disablePastDates,
      disableFutureDates,
      disableWeekends,
      disabledDates: parsedDisabledDates,
      disabledRanges: parsedDisabledRanges,
    }),
    [
      minDateStr,
      maxDateStr,
      disablePastDates,
      disableFutureDates,
      disableWeekends,
      parsedDisabledDates,
      parsedDisabledRanges,
    ],
  )

  // ── Manual input error state ──
 

  // Ref to the wrapper div so we can locate the underlying <input> for DOM pinning.
  const wrapperRef = useRef<HTMLDivElement>(null)

  /**
   * After every render, if an invalid-input error is active, forcibly write the
   * raw typed value back into the visible DOM input. This runs synchronously
   * (useLayoutEffect) after React has committed the VDOM diff to the DOM but
   * BEFORE the browser paints, so it always wins over react-datepicker's
   * internal state resets.
   */
  useLayoutEffect(() => {
    if (!hasActiveErrorRef.current || !rawInputRef.current) return
    const wrapper = wrapperRef.current
    if (!wrapper) return
    const inp = wrapper.querySelector<HTMLInputElement>(
      'input.react-datepicker-ignore-onclickoutside, input[type="text"], input:not([type="hidden"])',
    )
    if (inp && inp.value !== rawInputRef.current) {
      inp.value = rawInputRef.current
    }
  })

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
  // react-datepicker v9 does NOT fire onChange(null) for invalid non-empty typed
  // input (it only calls setSelected when date is truthy or value is empty).
  // Therefore onChange only fires for genuine user actions:
  //   • selecting a valid date from the calendar → date is a Date object
  //   • clearing the field (backspace to empty or clear button) → date is null
  // In both cases we clear the error state unconditionally and save the value.
const handleChange = useCallback(
  (date: Date | null) => {
    hasActiveErrorRef.current = false
    setManualInputError(null)
    rawInputRef.current = ''

    const nextDisplay = formatDateByDisplayFormat(date, displayFormat)
    setInputValue(nextDisplay)

    onValidationChange?.({
      isValid: true,
      message: null,
      rawValue: nextDisplay,
    })

    onChange(formatDateString(date))
  },
  [onChange, displayFormat, onValidationChange],
)
  // ── Range handler ──
  // Same reasoning as handleChange: react-datepicker v9 only fires onChange for
  // genuine user actions (selecting a start/end date or clearing the field).
  // Validation of invalid typed text is handled by handleCalendarClose.
const handleRangeChange = useCallback(
  (dates: [Date | null, Date | null]) => {
    if (!onRangeChange) return

    const [start, end] = dates
    hasActiveErrorRef.current = false
    setManualInputError(null)
    rawInputRef.current = ''

    const val: DateRangeValue = {
      startDate: formatDateString(start),
      endDate: formatDateString(end),
    }

    const startDisplay = formatDateByDisplayFormat(start, displayFormat)
    const endDisplay = formatDateByDisplayFormat(end, displayFormat)

    let rangeDisplay = ''
    if (startDisplay && endDisplay) {
      rangeDisplay = `${startDisplay} - ${endDisplay}`
    } else if (startDisplay) {
      rangeDisplay = startDisplay
    }

    setInputValue(rangeDisplay)

    onValidationChange?.({
      isValid: true,
      message: null,
      rawValue: rangeDisplay,
    })

    onRangeChange(JSON.stringify(val))
  },
  [onRangeChange, displayFormat, onValidationChange],
)
  /**
   * Capture raw text as the user types so we can distinguish "invalid manual
   * input" from an intentional clear when onChange fires with null.
   * When manual input is allowed, also apply auto-masking (insert separators).
   */
  const handleChangeRaw = useCallback(
  (event: any) => {
    const inputEl: HTMLInputElement | undefined = event?.target
    if (!inputEl) return
    const raw: string = inputEl.value ?? ''

    if (pickerMode === 'range') {
      const maskedRange = applyDateRangeMask(raw, displayFormat)
      if (maskedRange !== raw) {
        const cursorPos = maskedRange.length
        inputEl.value = maskedRange
        try { inputEl.setSelectionRange(cursorPos, cursorPos) } catch {}
      }

      const newValue = inputEl.value

      if (hasActiveErrorRef.current && newValue !== rawInputRef.current) {
        hasActiveErrorRef.current = false
      }

      rawInputRef.current = newValue
      setInputValue(newValue)

      if (manualInputError) {
        setManualInputError(null)
      }

      return
    }

    if (allowManualInput) {
      const masked = applyDateMask(raw, displayFormat)

      if (masked !== raw) {
        const cursorPos = masked.length
        inputEl.value = masked
        try { inputEl.setSelectionRange(cursorPos, cursorPos) } catch {}
      }

      const newValue = inputEl.value

      if (hasActiveErrorRef.current && newValue !== rawInputRef.current) {
        hasActiveErrorRef.current = false
      }

      rawInputRef.current = newValue
      setInputValue(newValue)

      if (manualInputError) {
        setManualInputError(null)
      }
    } else {
      if (hasActiveErrorRef.current && raw !== rawInputRef.current) {
        hasActiveErrorRef.current = false
      }
      rawInputRef.current = raw
      setInputValue(raw)
      if (manualInputError) {
        setManualInputError(null)
      }
    }
  },
  [allowManualInput, displayFormat, pickerMode, manualInputError],
)

  /**
   * Fires when the DatePicker input receives focus.
   *
   * IMPORTANT: Do NOT clear the error here. react-datepicker v9 may call this
   * after `setOpen(false)` in some code paths, which would wipe the error that
   * `handleBlur`/`handleCalendarClose` just set. Instead, the error is cleared
   * only when the user types a valid date (handleChange) or clears the field
   * (handleBlur with empty). The raw invalid text continues to be pinned in the
   * DOM by useLayoutEffect as long as hasActiveErrorRef is true.
   */
  const handleFocus = useCallback(() => {
    // Only clear rawInputRef when there is no active error. When an error IS
    // active we leave everything intact so useLayoutEffect keeps the invalid
    // value visible and the error message stays as a format hint.
    if (!hasActiveErrorRef.current) {
      rawInputRef.current = ''
    }
  }, [])

  /**
   * Validate the typed value on blur.
   *
   * react-datepicker v9 only calls our onBlur prop when the calendar is NOT open
   * at the time of the DOM blur event (`!this.state.open`). When the calendar IS
   * open the blur is silently ignored by react-datepicker, and the calendar-close
   * path is handled separately by handleCalendarClose.
   *
   * Additionally, react-datepicker's setOpen(false) → deferBlur() sequence calls
   * input.blur() via requestAnimationFrame AFTER it has already committed
   * inputValue=null to the DOM. In that rAF path e.target.value is already empty,
   * so we fall back to rawInputRef.current (the last text the user typed).
   */
  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      if (!allowManualInput) return

      const domValue = (e.target as HTMLInputElement).value ?? ''
      const typedValue = domValue.trim() ? domValue : rawInputRef.current

      if (!typedValue.trim()) {
        hasActiveErrorRef.current = false
        setManualInputError(null)
        rawInputRef.current = ''
        if (pickerMode === 'single') setInputValue('')
        onValidationChange?.({ isValid: true, message: null, rawValue: '' })
        return
      }

      rawInputRef.current = typedValue

      // ── Range mode ──
      if (pickerMode === 'range') {
        const errorMsg = validateRangeTypedInput(typedValue, displayFormat, dateValidationRestrictions)
        if (errorMsg) {
          hasActiveErrorRef.current = true
          setManualInputError(errorMsg)
          setInputValue(typedValue)
          onValidationChange?.({ isValid: false, message: errorMsg, rawValue: typedValue })
        } else {
          hasActiveErrorRef.current = false
          setManualInputError(null)
          onValidationChange?.({ isValid: true, message: null, rawValue: typedValue })
        }
        return
      }

      // ── Single mode ──
      const parsed = parseTypedDateString(typedValue, displayFormat)
      if (!parsed) {
        const msg = `Invalid date format. Expected: ${formatToPlaceholder(displayFormat)}`
        hasActiveErrorRef.current = true
        setManualInputError(msg)
        setInputValue(typedValue)
        onValidationChange?.({ isValid: false, message: msg, rawValue: typedValue })
        return
      }

      const restrictionError = getDateRestrictionError(parsed, dateValidationRestrictions)
      if (restrictionError) {
        hasActiveErrorRef.current = true
        setManualInputError(restrictionError)
        setInputValue(typedValue)
        onValidationChange?.({ isValid: false, message: restrictionError, rawValue: typedValue })
        return
      }

      const normalizedStoredValue = formatDateString(parsed)
      const normalizedDisplayValue = formatDateByDisplayFormat(parsed, displayFormat)
      hasActiveErrorRef.current = false
      setManualInputError(null)
      rawInputRef.current = normalizedDisplayValue
      setInputValue(normalizedDisplayValue)
      onValidationChange?.({ isValid: true, message: null, rawValue: normalizedDisplayValue })
      if (normalizedStoredValue !== value) {
        onChange(normalizedStoredValue)
      }
    },
    [
      allowManualInput,
      dateValidationRestrictions,
      displayFormat,
      onChange,
      onValidationChange,
      pickerMode,
      value,
    ],
  )

  /**
   * Validate typed text when the calendar closes.
   *
   * This is the primary validation path when the calendar WAS open while the
   * user typed. react-datepicker v9 skips calling onBlur when state.open=true,
   * and its setOpen(false) → deferBlur path fires input.blur() via rAF AFTER
   * inputValue has already been reset to null — so e.target.value would be empty
   * by the time our onBlur fires (if it fires at all). onCalendarClose is called
   * from react-datepicker's componentDidUpdate when open transitions true→false,
   * which is the reliable signal that the user finished interacting with the
   * calendar and we should validate whatever is in rawInputRef.
   */
  const handleCalendarClose = useCallback(() => {
    if (!allowManualInput) return

    const typedValue = rawInputRef.current
    if (!typedValue.trim()) return

    // ── Range mode ──
    if (pickerMode === 'range') {
      const errorMsg = validateRangeTypedInput(typedValue, displayFormat, dateValidationRestrictions)
      if (errorMsg) {
        hasActiveErrorRef.current = true
        setManualInputError(errorMsg)
        setInputValue(typedValue)
        onValidationChange?.({ isValid: false, message: errorMsg, rawValue: typedValue })
      } else {
        hasActiveErrorRef.current = false
        setManualInputError(null)
        onValidationChange?.({ isValid: true, message: null, rawValue: typedValue })
      }
      return
    }

    // ── Single mode ──
    const parsed = parseTypedDateString(typedValue, displayFormat)
    if (!parsed) {
      const msg = `Invalid date format. Expected format: ${formatToPlaceholder(displayFormat)}`
      hasActiveErrorRef.current = true
      setManualInputError(msg)
      setInputValue(typedValue)
      onValidationChange?.({ isValid: false, message: msg, rawValue: typedValue })
      return
    }

    const restrictionError = getDateRestrictionError(parsed, dateValidationRestrictions)
    if (restrictionError) {
      hasActiveErrorRef.current = true
      setManualInputError(restrictionError)
      setInputValue(typedValue)
      onValidationChange?.({ isValid: false, message: restrictionError, rawValue: typedValue })
      return
    }

    const normalizedStoredValue = formatDateString(parsed)
    const normalizedDisplayValue = formatDateByDisplayFormat(parsed, displayFormat)
    hasActiveErrorRef.current = false
    setManualInputError(null)
    rawInputRef.current = normalizedDisplayValue
    setInputValue(normalizedDisplayValue)
    onValidationChange?.({ isValid: true, message: null, rawValue: normalizedDisplayValue })
    if (normalizedStoredValue !== value) {
      onChange(normalizedStoredValue)
    }
  }, [
    allowManualInput,
    dateValidationRestrictions,
    displayFormat,
    onChange,
    onValidationChange,
    pickerMode,
    value,
  ])

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
      <div ref={wrapperRef}>
        <DatePicker
          selected={parsedRange.start}
          onChange={handleRangeChange as any}
          startDate={parsedRange.start}
          endDate={parsedRange.end}
          selectsRange
          onKeyDown={handleKeyDown}
          onChangeRaw={handleChangeRaw}
          onFocus={handleFocus}
          onBlur={handleBlur as any}
          onCalendarClose={handleCalendarClose}
          dateFormat={displayFormat}
          placeholderText={effectivePlaceholder}
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
          className={manualInputError ? 'form-control is-invalid' : 'form-control'}
          calendarClassName="datepicker-calendar"
          autoComplete="off"
          aria-label={effectivePlaceholder}
          aria-invalid={manualInputError ? 'true' : 'false'}
          value={inputValue}
        />
      </div>
    )
  }

  // ── Single-date mode (default) ──
  return (
    <div ref={wrapperRef}>
      <DatePicker
      selected={selected}
      value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onChangeRaw={handleChangeRaw}
        onFocus={handleFocus}
        onBlur={handleBlur as any}
        onCalendarClose={handleCalendarClose}
        dateFormat={displayFormat}
        placeholderText={effectivePlaceholder}
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
        className={manualInputError ? 'form-control is-invalid' : 'form-control'}
        calendarClassName="datepicker-calendar"
        autoComplete="off"
        aria-label={effectivePlaceholder}
        aria-invalid={manualInputError ? 'true' : 'false'}
      />
    </div>
  )
}
