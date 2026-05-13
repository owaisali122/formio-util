import type { DatePickerMode } from './DatePickerInputCore.helpers'

export interface DatePickerSingleValue {
  date: string
  dateTime?: string
  timeZone?: string
}

export interface DateRangeValue {
  startDate: string
  endDate: string
  startDateTime?: string
  endDateTime?: string
  timeZone?: string
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
  pickerMode?: DatePickerMode
  enableTime?: boolean
  enableTimeZone?: boolean
  timeFormat?: string
  timeIntervals?: number
  timeZone?: string
  /** Label rendered above the time-zone selector. Hidden if empty. */
  timeZoneLabel?: string
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
  tabIndex?: number
}
