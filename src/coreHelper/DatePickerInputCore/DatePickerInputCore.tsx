import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import DatePicker from 'react-datepicker'
import {
  DATE_PICKER_TIME_ZONE_OPTIONS,
  DEFAULT_DATE_PICKER_TIME_FORMAT,
  DEFAULT_DATE_PICKER_TIME_INTERVALS,
  extractDatePickerBaseFormat,
  formatDatePickerPlaceholder,
  getInitialDatePickerTimeZone,
  getEffectiveDatePickerDisplayFormat,
  getEffectiveDatePickerSingleFormat,
  normalizeDatePickerTimeFormat,
  normalizeDisplayFormat,
  resolveSupportedDatePickerTimeZone,
  type DatePickerMode,
} from './DatePickerInputCore.helpers'
import type {
  DatePickerInputProps,
  DatePickerSingleValue,
  DateRangeValue,
  DisabledDateRange,
  DateRestrictionValidationOptions,
} from './DatePickerInputCore.types'

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

/** Parse a local `yyyy-MM-ddTHH:mm[:ss]` string without timezone shifts. */
export function parseDateTimeString(value: string | null | undefined): Date | null {
  if (!value || typeof value !== 'string') return null

  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/,
  )
  if (!match) return null

  const year = parseInt(match[1], 10)
  const month = parseInt(match[2], 10) - 1
  const day = parseInt(match[3], 10)
  const hours = parseInt(match[4] || '0', 10)
  const minutes = parseInt(match[5] || '0', 10)
  const seconds = parseInt(match[6] || '0', 10)

  if (
    [year, month, day, hours, minutes, seconds].some((part) => isNaN(part))
    || hours < 0
    || hours > 23
    || minutes < 0
    || minutes > 59
    || seconds < 0
    || seconds > 59
  ) {
    return null
  }

  const parsed = new Date(year, month, day, hours, minutes, seconds, 0)
  if (
    parsed.getFullYear() !== year
    || parsed.getMonth() !== month
    || parsed.getDate() !== day
    || parsed.getHours() !== hours
    || parsed.getMinutes() !== minutes
    || parsed.getSeconds() !== seconds
  ) {
    return null
  }

  return parsed
}

export function formatDateTimeString(date: Date | null): string {
  if (!date || isNaN(date.getTime())) return ''

  const datePart = formatDateString(date)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${datePart}T${hours}:${minutes}:${seconds}`
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

export type { DisabledDateRange, DateRestrictionValidationOptions } from './DatePickerInputCore.types'

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

export type { DatePickerSingleValue, DateRangeValue } from './DatePickerInputCore.types'

interface ParsedSingleValue {
  payload: DatePickerSingleValue | null
  date: Date | null
  timeZone: string
}

interface ParsedRangeValue {
  payload: DateRangeValue | null
  start: Date | null
  end: Date | null
  timeZone: string
}

function parseSingleValuePayload(value: string | null | undefined): DatePickerSingleValue | null {
  if (!value || typeof value !== 'string') return null

  try {
    const parsed = JSON.parse(value) as DatePickerSingleValue
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed
    }
  } catch {
    // Keep supporting legacy plain-string storage.
  }

  if (value.includes('T')) {
    return {
      date: value.slice(0, 10),
      dateTime: value,
    }
  }

  return { date: value }
}

function parseRangeValuePayload(value: string | null | undefined): DateRangeValue | null {
  if (!value || typeof value !== 'string') return null

  try {
    const parsed = JSON.parse(value) as DateRangeValue
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed
    }
  } catch {
    return null
  }

  return null
}

function parseStoredSingleValue(
  value: string | null | undefined,
  enableTime: boolean,
  defaultTimeZone: string,
): ParsedSingleValue {
  const payload = parseSingleValuePayload(value)
  const selectedDate = enableTime
    ? parseDateTimeString(payload?.dateTime || payload?.date || value)
    : parseDateString(payload?.date || value)

  return {
    payload,
    date: selectedDate,
    timeZone: getInitialDatePickerTimeZone(payload?.timeZone || defaultTimeZone),
  }
}

function parseStoredRangeValue(
  value: string | null | undefined,
  enableTime: boolean,
  defaultTimeZone: string,
): ParsedRangeValue {
  const payload = parseRangeValuePayload(value)

  return {
    payload,
    start: enableTime
      ? parseDateTimeString(payload?.startDateTime || payload?.startDate)
      : parseDateString(payload?.startDate),
    end: enableTime
      ? parseDateTimeString(payload?.endDateTime || payload?.endDate)
      : parseDateString(payload?.endDate),
    timeZone: getInitialDatePickerTimeZone(payload?.timeZone || defaultTimeZone),
  }
}

function serializeSingleValue(
  date: Date | null,
  enableTime: boolean,
  enableTimeZone: boolean,
  timeZone: string,
): string {
  const datePart = formatDateString(date)
  if (!datePart) return ''
  if (!enableTime && !enableTimeZone) return datePart

  const payload: DatePickerSingleValue = { date: datePart }

  // Only include dateTime if time is not 00:00:00
  if (enableTime && date) {
    const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0 || date.getSeconds() !== 0
    if (hasTime) {
      payload.dateTime = formatDateTimeString(date)
    }
  }

  if (enableTimeZone) {
    payload.timeZone = timeZone || ''
  }

  return JSON.stringify(payload)
}

function serializeRangeValue(
  start: Date | null,
  end: Date | null,
  enableTime: boolean,
  enableTimeZone: boolean,
  timeZone: string,
): string {
  const payload: DateRangeValue = {
    startDate: formatDateString(start),
    endDate: formatDateString(end),
  }

  // Only include startDateTime/endDateTime if time is not 00:00:00
  if (enableTime) {
    if (start && (start.getHours() !== 0 || start.getMinutes() !== 0 || start.getSeconds() !== 0)) {
      payload.startDateTime = formatDateTimeString(start)
    }
    if (end && (end.getHours() !== 0 || end.getMinutes() !== 0 || end.getSeconds() !== 0)) {
      payload.endDateTime = formatDateTimeString(end)
    }
  }

  if (enableTimeZone) {
    payload.timeZone = timeZone || ''
  }

  return JSON.stringify(payload)
}

function getValidIntlTimeZone(timeZone?: string): string | undefined {
  const candidate = resolveSupportedDatePickerTimeZone(timeZone) || timeZone?.trim()
  if (!candidate) return undefined

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: candidate }).format(new Date())
    return candidate
  } catch {
    return undefined
  }
}

function getDateMaskDigitCount(displayFormat: string): number {
  const desc = getMaskDescriptor(displayFormat)
  if (!desc) return 0
  return desc.partLengths[0] + desc.partLengths[1] + desc.partLengths[2]
}

/**
 * Detect whether a typed string contains a recognisable time token.
 * Used so we can treat time as optional when `enableTime` is on.
 */
function inputHasTimeToken(typed: string): boolean {
  return /\b\d{1,2}:\d{2}\b/.test(typed)
}

/**
 * Build the single-side display format string while honouring whether the
 * underlying value actually has explicit time. When `hasExplicitTime` is
 * false the format omits time tokens even if `enableTime` is on — this is
 * what allows users to type/store date-only values when time is enabled.
 */
function buildEffectiveSingleDisplayFormat(
  displayFormat: unknown,
  enableTime: boolean,
  enableTimeZone: boolean,
  timeFormat: string,
  hasExplicitTime: boolean,
): string {
  return getEffectiveDatePickerSingleFormat({
    displayFormat: extractDatePickerBaseFormat(displayFormat),
    enableTime: enableTime && hasExplicitTime,
    enableTimeZone,
    timeFormat,
  })
}

function normalizeMeridiemToken(token?: string): string {
  const cleaned = token?.replace(/[^APM]/gi, '').toUpperCase() || ''
  if (!cleaned) return ''
  const prefix = cleaned[0]
  if (prefix !== 'A' && prefix !== 'P') return ''
  return cleaned.includes('M') ? `${prefix}M` : prefix
}

function applyTimeMask(timeDigits: string, timeFormat: string, meridiemToken?: string): string {
  if (!timeDigits) return ''

  const normalizedTimeFormat = normalizeDatePickerTimeFormat(timeFormat)
  const hour = timeDigits.slice(0, 2)
  const minute = timeDigits.slice(2, 4)

  let masked = hour
  if (timeDigits.length > 2) {
    masked += `:${minute}`
  }

  if (normalizedTimeFormat === 'h:mm aa') {
    const meridiem = normalizeMeridiemToken(meridiemToken)
    if (meridiem) {
      masked += ` ${meridiem}`
    }
  }

  return masked
}

export function applyDateTimeMask(raw: string, displayFormat: string, timeFormat: string): string {
  const dateDigitCount = getDateMaskDigitCount(displayFormat)
  if (!dateDigitCount) return raw

  const normalized = raw.toUpperCase()
  const digits = normalized.replace(/\D/g, '').slice(0, dateDigitCount + 4)
  const dateDigits = digits.slice(0, dateDigitCount)
  const timeDigits = digits.slice(dateDigitCount)
  const meridiemSource = normalized.match(/[AP](?:M)?/g)?.[0]

  const maskedDate = applyDateMask(dateDigits, displayFormat)
  const maskedTime = applyTimeMask(timeDigits, timeFormat, meridiemSource)
  return maskedTime ? `${maskedDate} ${maskedTime}` : maskedDate
}

export function applyDateTimeRangeMask(raw: string, displayFormat: string, timeFormat: string): string {
  const dateDigitCount = getDateMaskDigitCount(displayFormat)
  if (!dateDigitCount) return raw

  const normalized = raw.toUpperCase()
  const singleDateTimeDigitCount = dateDigitCount + 4
  const digits = normalized.replace(/\D/g, '').slice(0, singleDateTimeDigitCount * 2)
  const meridiemTokens = normalized.match(/[AP](?:M)?/g) ?? []

  const firstSegment = digits.slice(0, singleDateTimeDigitCount)
  const secondSegment = digits.slice(singleDateTimeDigitCount)

  const firstMasked = applyDateTimeMask(
    firstSegment + (meridiemTokens[0] || ''),
    displayFormat,
    timeFormat,
  )

  if (!secondSegment) {
    return firstMasked
  }

  const secondMasked = applyDateTimeMask(
    secondSegment + (meridiemTokens[1] || ''),
    displayFormat,
    timeFormat,
  )

  return `${firstMasked} - ${secondMasked}`
}

function readIntlPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((part) => part.type === type)?.value || ''
}

function getDateDisplayParts(date: Date, timeZone?: string) {
  const resolvedTimeZone = getValidIntlTimeZone(timeZone)
  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: resolvedTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const time12Formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: resolvedTimeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  const time24Formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: resolvedTimeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const zoneFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: resolvedTimeZone,
    timeZoneName: 'short',
  })

  const dateParts = dateFormatter.formatToParts(date)
  const time12Parts = time12Formatter.formatToParts(date)
  const time24Parts = time24Formatter.formatToParts(date)
  const zoneParts = zoneFormatter.formatToParts(date)

  return {
    year: readIntlPart(dateParts, 'year'),
    month: readIntlPart(dateParts, 'month'),
    day: readIntlPart(dateParts, 'day'),
    hour12: readIntlPart(time12Parts, 'hour') || '12',
    hour24: readIntlPart(time24Parts, 'hour') || '00',
    minute: readIntlPart(time12Parts, 'minute') || '00',
    dayPeriod: readIntlPart(time12Parts, 'dayPeriod').toUpperCase(),
    timeZoneName: readIntlPart(zoneParts, 'timeZoneName') || (resolvedTimeZone || ''),
  }
}

// ── Component props ────────────────────────────────────────────────────

export type { DatePickerInputProps } from './DatePickerInputCore.types'

// ── Auto-mask helpers ──────────────────────────────────────────────────

/**
 * Given a react-datepicker display format string (e.g. "MM/dd/yyyy"),
 * return the canonical placeholder string (e.g. "MM/DD/YYYY").
 */
export function formatToPlaceholder(displayFormat: string): string {
  return formatDatePickerPlaceholder(displayFormat)
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
  const safe = normalizeDisplayFormat(displayFormat, '')
  const f = (getEffectiveDatePickerSingleFormat({ displayFormat: safe }).split(' ')[0] || safe).toLowerCase()
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
function stripTypedTimeZoneSuffix(typed: string): string {
  return typed
    .replace(/\s+\([^)]+\)\s*$/u, '')
    .replace(/\s+(?![AaPp][Mm]\s*$)[A-Za-z]{2,6}\s*$/u, '')
    .trim()
}

function parseTypedDateString(
  typed: string,
  displayFormat: string,
  {
    enableTime = false,
    enableTimeZone = false,
    timeFormat = DEFAULT_DATE_PICKER_TIME_FORMAT,
  }: {
    enableTime?: boolean
    enableTimeZone?: boolean
    timeFormat?: string
  } = {},
): Date | null {
  if (!typed || !typed.trim()) return null
  const normalizedTyped = enableTimeZone ? stripTypedTimeZoneSuffix(typed) : typed.trim()
  const effectiveTimeFormat = normalizeDatePickerTimeFormat(timeFormat)

  // When time is enabled, time is supported but NOT required. If the user
  // types only a date, we still parse it as a date-only value (hours=0).
  if (enableTime && inputHasTimeToken(normalizedTyped)) {
    if (effectiveTimeFormat === 'HH:mm') {
      const match = normalizedTyped.match(/^(.*)\s+(\d{2}):(\d{2})$/)
      if (!match) return null

      const baseDate = parseTypedDateString(match[1], displayFormat)
      const hours = parseInt(match[2], 10)
      const minutes = parseInt(match[3], 10)
      if (!baseDate || isNaN(hours) || isNaN(minutes) || hours > 23 || minutes > 59) {
        return null
      }

      const nextDate = new Date(baseDate)
      nextDate.setHours(hours, minutes, 0, 0)
      return nextDate
    }

    const match = normalizedTyped.match(/^(.*)\s+(\d{1,2}):(\d{2})\s+([AaPp][Mm])$/)
    if (!match) return null

    const baseDate = parseTypedDateString(match[1], displayFormat)
    const rawHours = parseInt(match[2], 10)
    const minutes = parseInt(match[3], 10)
    const meridiem = match[4].toUpperCase()

    if (!baseDate || isNaN(rawHours) || isNaN(minutes) || rawHours < 1 || rawHours > 12 || minutes > 59) {
      return null
    }

    let hours = rawHours % 12
    if (meridiem === 'PM') {
      hours += 12
    }

    const nextDate = new Date(baseDate)
    nextDate.setHours(hours, minutes, 0, 0)
    return nextDate
  }

  const desc = getMaskDescriptor(displayFormat)
  if (!desc) return parseDateString(normalizedTyped) // fallback for unsupported formats

  const parts = normalizedTyped.split(desc.sep)
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
 * Parse a manually typed range string into start/end Date objects.
 * Used to sync the calendar's internal selected range with the typed text.
 * Returns nulls for missing sides; partial input is preserved.
 */
export function parseTypedRangeString(
  typed: string,
  displayFormat: string,
  parseOptions?: {
    enableTime?: boolean
    enableTimeZone?: boolean
    timeFormat?: string
  },
): { start: Date | null; end: Date | null; startHadTime: boolean; endHadTime: boolean } {
  const RANGE_SEP = ' - '
  const sepIdx = typed.indexOf(RANGE_SEP)
  const enableTime = !!parseOptions?.enableTime

  if (sepIdx === -1) {
    const startStr = typed.trim()
    const start = startStr ? parseTypedDateString(startStr, displayFormat, parseOptions) : null
    return {
      start,
      end: null,
      startHadTime: enableTime && inputHasTimeToken(startStr),
      endHadTime: false,
    }
  }

  const startStr = typed.slice(0, sepIdx).trim()
  const endStr = typed.slice(sepIdx + RANGE_SEP.length).trim()
  const start = startStr ? parseTypedDateString(startStr, displayFormat, parseOptions) : null
  const end = endStr ? parseTypedDateString(endStr, displayFormat, parseOptions) : null
  return {
    start,
    end,
    startHadTime: enableTime && inputHasTimeToken(startStr),
    endHadTime: enableTime && inputHasTimeToken(endStr),
  }
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
  parseOptions?: {
    enableTime?: boolean
    enableTimeZone?: boolean
    timeFormat?: string
  },
): string | null {
  const RANGE_SEP = ' - '
  const sepIdx = typed.indexOf(RANGE_SEP)
  const withRangePrefix = (label: 'Start date' | 'End date', message: string) => `${label}: ${message}`

  if (sepIdx === -1) {
    // Only start date typed — validate it if it looks complete, else treat as partial
    const parsed = parseTypedDateString(typed.trim(), displayFormat, parseOptions)
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
  const startParsed = startStr.trim() ? parseTypedDateString(startStr.trim(), displayFormat, parseOptions) : null
  const endParsed = endStr.trim() ? parseTypedDateString(endStr.trim(), displayFormat, parseOptions) : null

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

export function formatDateByDisplayFormat(
  date: Date | null,
  displayFormat: string,
  timeZone?: string,
): string {
  if (!date || isNaN(date.getTime())) return ''

  const parts = getDateDisplayParts(date, timeZone)

  return displayFormat
    .replace(/h:mm aa/g, `${parts.hour12}:${parts.minute} ${parts.dayPeriod}`)
    .replace(/HH:mm/g, `${parts.hour24}:${parts.minute}`)
    .replace(/\(zzz\)/g, parts.timeZoneName ? `(${parts.timeZoneName})` : '(TZ)')
    .replace(/\bzzz\b/g, parts.timeZoneName || 'TZ')
    .replace(/yyyy/g, parts.year)
    .replace(/MM/g, parts.month)
    .replace(/dd/g, parts.day)
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
  enableTime = false,
  enableTimeZone = false,
  timeFormat = DEFAULT_DATE_PICKER_TIME_FORMAT,
  timeIntervals = DEFAULT_DATE_PICKER_TIME_INTERVALS,
  timeZone,
  timeZoneLabel = 'Time Zone',
  rangeValue,
  onRangeChange,
  disabledDates: disabledDatesStr,
  disabledDateRanges: disabledDateRangesStr,
  onValidationChange,
  tabIndex,
}: DatePickerInputProps) {
  // ─────────────────────────────────────────────────────────────────
  // TIMEZONE INITIALIZATION — happens once at component mount
  // ─────────────────────────────────────────────────────────────────
  // Priority:
  //   1. timezone from the passed-in prop (from DatePickerFormIO)
  //   2. timezone embedded in the value (from saved/prefilled data)
  //   3. browser timezone
  //   4. UTC fallback
  
  const defaultTimeZoneValue = useMemo(
    () => getInitialDatePickerTimeZone(timeZone),
    [timeZone],
  )

  // Extract timezone from the initial value (if it has embedded timezone info)
  const initialTimeZoneFromValue = useMemo(() => {
    try {
      if (!value || typeof value !== 'string') return ''
      const parsed = JSON.parse(value) as any
      if (parsed && typeof parsed === 'object' && 'timeZone' in parsed) {
        return (parsed.timeZone as string) || ''
      }
    } catch {
      // Not JSON, so no embedded timezone
    }
    return ''
  }, [value])

  // Use initializer function so selectedTimeZone is only set once
  // (not reset in effects based on value changes)
  const initializeSelectedTimeZone = () => {
    return initialTimeZoneFromValue || defaultTimeZoneValue
  }
  const effectiveTimeFormat = useMemo(
    () => normalizeDatePickerTimeFormat(timeFormat),
    [timeFormat],
  )
  const effectiveTimeIntervals = useMemo(() => {
    const parsed = Number(timeIntervals)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return DEFAULT_DATE_PICKER_TIME_INTERVALS
    }
    return parsed
  }, [timeIntervals])
  const effectiveDisplayFormat = useMemo(
    () => getEffectiveDatePickerDisplayFormat({
      pickerMode,
      displayFormat,
      enableTime,
      enableTimeZone,
      timeFormat: effectiveTimeFormat,
    }),
    [pickerMode, displayFormat, enableTime, enableTimeZone, effectiveTimeFormat],
  )
  const effectiveSingleDisplayFormat = useMemo(
    () => getEffectiveDatePickerSingleFormat({
      displayFormat,
      enableTime,
      enableTimeZone,
      timeFormat: effectiveTimeFormat,
    }),
    [displayFormat, enableTime, enableTimeZone, effectiveTimeFormat],
  )
  const effectivePlaceholder = useMemo(() => {
    if (placeholder && placeholder.trim()) return placeholder
    return formatToPlaceholder(effectiveDisplayFormat)
  }, [placeholder, effectiveDisplayFormat])

  const parsedSingle = useMemo(
    () => parseStoredSingleValue(value, enableTime, defaultTimeZoneValue),
    [value, enableTime, defaultTimeZoneValue],
  )
  const selected = parsedSingle.date
  // Whether the saved value already carries an explicit time component.
  // Used so we can render date-only display when the value has no time,
  // even if `enableTime` is on. Time stays optional, never forced.
  const singleHasExplicitTime = !!parsedSingle.payload?.dateTime
  const parsedRange = useMemo(() => {
    if (pickerMode !== 'range') {
      return {
        payload: null,
        start: null,
        end: null,
        timeZone: defaultTimeZoneValue,
      }
    }

    return parseStoredRangeValue(rangeValue, enableTime, defaultTimeZoneValue)
  }, [pickerMode, rangeValue, enableTime, defaultTimeZoneValue])
  const startHasExplicitTime = !!parsedRange.payload?.startDateTime
  const endHasExplicitTime = !!parsedRange.payload?.endDateTime

  const [selectedTimeZone, setSelectedTimeZone] = useState<string>(initializeSelectedTimeZone)
  const [inputValue, setInputValue] = useState<string>('')
  const [manualInputError, setManualInputError] = useState<string | null>(null)
  const rawInputRef = useRef<string>('')
  const hasActiveErrorRef = useRef(false)

  // ─────────────────────────────────────────────────────────────────
  // TIMEZONE PERSISTENCE — do NOT reset selectedTimeZone when value changes
  // ─────────────────────────────────────────────────────────────────
  // selectedTimeZone should ONLY change when user explicitly changes the
  // timezone dropdown. It must NOT be reset when:
  //   - user types/edits a date
  //   - user selects a date from the calendar
  //   - user changes start/end in range mode
  //   - validation fails
  //   - value prop changes
  //
  // The old useEffect that reset selectedTimeZone based on parsedSingle.timeZone
  // or parsedRange.timeZone is removed. This was the root cause of the bug.

  const formatRangeDisplay = useCallback(
    (
      start: Date | null,
      end: Date | null,
      zone: string,
      startExplicitTime: boolean,
      endExplicitTime: boolean,
    ) => {
      const formatZone = enableTimeZone ? zone : undefined
      const startFormat = buildEffectiveSingleDisplayFormat(
        displayFormat,
        enableTime,
        enableTimeZone,
        effectiveTimeFormat,
        startExplicitTime,
      )
      const endFormat = buildEffectiveSingleDisplayFormat(
        displayFormat,
        enableTime,
        enableTimeZone,
        effectiveTimeFormat,
        endExplicitTime,
      )
      const startDisplay = formatDateByDisplayFormat(start, startFormat, formatZone)
      const endDisplay = formatDateByDisplayFormat(end, endFormat, formatZone)

      if (startDisplay && endDisplay) {
        return `${startDisplay} - ${endDisplay}`
      }

      return startDisplay || ''
    },
    [displayFormat, enableTime, enableTimeZone, effectiveTimeFormat],
  )

  useEffect(() => {
    if (pickerMode !== 'single') return
    if (hasActiveErrorRef.current) return

    const fmt = buildEffectiveSingleDisplayFormat(
      displayFormat,
      enableTime,
      enableTimeZone,
      effectiveTimeFormat,
      singleHasExplicitTime,
    )
    setInputValue(
      formatDateByDisplayFormat(
        selected,
        fmt,
        enableTimeZone ? selectedTimeZone : undefined,
      ),
    )
  }, [
    pickerMode,
    selected,
    displayFormat,
    enableTime,
    enableTimeZone,
    effectiveTimeFormat,
    singleHasExplicitTime,
    selectedTimeZone,
  ])

  useEffect(() => {
    if (pickerMode !== 'range') return
    if (hasActiveErrorRef.current) return

    setInputValue(
      formatRangeDisplay(
        parsedRange.start,
        parsedRange.end,
        selectedTimeZone,
        startHasExplicitTime,
        endHasExplicitTime,
      ),
    )
  }, [
    pickerMode,
    parsedRange.start,
    parsedRange.end,
    selectedTimeZone,
    formatRangeDisplay,
    startHasExplicitTime,
    endHasExplicitTime,
  ])

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

  const getTimeZoneError = useCallback(
    (zone: string, rawValue: string) => {
      if (!enableTimeZone) return null
      if (!rawValue.trim()) return null
      return zone.trim() ? null : 'Please select a time zone.'
    },
    [enableTimeZone],
  )

  const timeZoneError = getTimeZoneError(selectedTimeZone, inputValue)
  const pickerTimeZone = enableTimeZone ? getValidIntlTimeZone(selectedTimeZone) : undefined

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

      // Treat the new value as having explicit time only when the resulting
      // Date carries a non-midnight time. Calendar-only clicks (no time
      // input) keep 00:00 → date-only display. This prevents time being
      // forced onto values that the user did not enter.
      const nextHasExplicitTime = !!date && (
        date.getHours() !== 0 || date.getMinutes() !== 0 || date.getSeconds() !== 0
      )
      const fmt = buildEffectiveSingleDisplayFormat(
        displayFormat,
        enableTime,
        enableTimeZone,
        effectiveTimeFormat,
        nextHasExplicitTime,
      )
      const nextDisplay = formatDateByDisplayFormat(
        date,
        fmt,
        enableTimeZone ? selectedTimeZone : undefined,
      )
      const validationMessage = getTimeZoneError(selectedTimeZone, nextDisplay)

      setInputValue(nextDisplay)
      onValidationChange?.({
        isValid: !validationMessage,
        message: validationMessage,
        rawValue: nextDisplay,
      })

      onChange(serializeSingleValue(date, enableTime, enableTimeZone, selectedTimeZone))
    },
    [
      onChange,
      displayFormat,
      effectiveTimeFormat,
      onValidationChange,
      enableTime,
      enableTimeZone,
      selectedTimeZone,
      getTimeZoneError,
    ],
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

      const startExplicit = !!start && (
        start.getHours() !== 0 || start.getMinutes() !== 0 || start.getSeconds() !== 0
      )
      const endExplicit = !!end && (
        end.getHours() !== 0 || end.getMinutes() !== 0 || end.getSeconds() !== 0
      )
      const rangeDisplay = formatRangeDisplay(start, end, selectedTimeZone, startExplicit, endExplicit)
      const validationMessage = getTimeZoneError(selectedTimeZone, rangeDisplay)

      setInputValue(rangeDisplay)
      onValidationChange?.({
        isValid: !validationMessage,
        message: validationMessage,
        rawValue: rangeDisplay,
      })

      onRangeChange(
        serializeRangeValue(start, end, enableTime, enableTimeZone, selectedTimeZone),
      )
    },
    [
      onRangeChange,
      onValidationChange,
      formatRangeDisplay,
      enableTime,
      enableTimeZone,
      selectedTimeZone,
      getTimeZoneError,
    ],
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
        const maskedRange = enableTime
          ? applyDateTimeRangeMask(raw, effectiveSingleDisplayFormat, effectiveTimeFormat)
          : applyDateRangeMask(raw, effectiveSingleDisplayFormat)
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
        const masked = enableTime
          ? applyDateTimeMask(raw, effectiveSingleDisplayFormat, effectiveTimeFormat)
          : applyDateMask(raw, effectiveSingleDisplayFormat)
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
    [allowManualInput, enableTime, pickerMode, manualInputError, effectiveSingleDisplayFormat, effectiveTimeFormat],
  )

  const handleTimeZoneChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const nextTimeZone = event.target.value
      setSelectedTimeZone(nextTimeZone)

      if (pickerMode === 'range') {
        const rangeDisplay = formatRangeDisplay(
          parsedRange.start,
          parsedRange.end,
          nextTimeZone,
          startHasExplicitTime,
          endHasExplicitTime,
        )
        const validationMessage = getTimeZoneError(nextTimeZone, rangeDisplay)
        setInputValue(rangeDisplay)
        onValidationChange?.({
          isValid: !validationMessage,
          message: validationMessage,
          rawValue: rangeDisplay,
        })

        if (onRangeChange && (parsedRange.start || parsedRange.end)) {
          onRangeChange(
            serializeRangeValue(
              parsedRange.start,
              parsedRange.end,
              enableTime,
              enableTimeZone,
              nextTimeZone,
            ),
          )
        }
        return
      }

      const singleFormat = buildEffectiveSingleDisplayFormat(
        displayFormat,
        enableTime,
        enableTimeZone,
        effectiveTimeFormat,
        singleHasExplicitTime,
      )
      const nextDisplay = formatDateByDisplayFormat(
        selected,
        singleFormat,
        enableTimeZone ? nextTimeZone : undefined,
      )
      const validationMessage = getTimeZoneError(nextTimeZone, nextDisplay)

      setInputValue(nextDisplay)
      onValidationChange?.({
        isValid: !validationMessage,
        message: validationMessage,
        rawValue: nextDisplay,
      })

      if (selected) {
        onChange(serializeSingleValue(selected, enableTime, enableTimeZone, nextTimeZone))
      }
    },
    [
      pickerMode,
      formatRangeDisplay,
      parsedRange.start,
      parsedRange.end,
      onRangeChange,
      enableTime,
      enableTimeZone,
      onValidationChange,
      selected,
      onChange,
      displayFormat,
      effectiveTimeFormat,
      singleHasExplicitTime,
      startHasExplicitTime,
      endHasExplicitTime,
      getTimeZoneError,
    ],
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
        const errorMsg = validateRangeTypedInput(
          typedValue,
          effectiveSingleDisplayFormat,
          dateValidationRestrictions,
          {
            enableTime,
            enableTimeZone,
            timeFormat: effectiveTimeFormat,
          },
        )
        if (errorMsg) {
          hasActiveErrorRef.current = true
          setManualInputError(errorMsg)
          setInputValue(typedValue)
          onValidationChange?.({ isValid: false, message: errorMsg, rawValue: typedValue })
        } else {
          hasActiveErrorRef.current = false
          setManualInputError(null)
          const validationMessage = getTimeZoneError(selectedTimeZone, typedValue)
          onValidationChange?.({
            isValid: !validationMessage,
            message: validationMessage,
            rawValue: typedValue,
          })

          // Sync calendar's internal selected range with typed input by
          // emitting the parsed value to onRangeChange. Without this the
          // calendar still shows the previous range and time inputs read
          // "--:-- --" even though the input field reads the new value.
          const { start, end, startHadTime, endHadTime } = parseTypedRangeString(
            typedValue,
            effectiveSingleDisplayFormat,
            { enableTime, enableTimeZone, timeFormat: effectiveTimeFormat },
          )
          if (onRangeChange && (start || end)) {
            const startToEmit =
              enableTime && start && !startHadTime
                ? (() => { const d = new Date(start); d.setHours(0, 0, 0, 0); return d })()
                : start
            const endToEmit =
              enableTime && end && !endHadTime
                ? (() => { const d = new Date(end); d.setHours(0, 0, 0, 0); return d })()
                : end
            onRangeChange(
              serializeRangeValue(
                startToEmit,
                endToEmit,
                enableTime,
                enableTimeZone,
                selectedTimeZone,
              ),
            )
          }
        }
        return
      }

      // ── Single mode ──
      const parsed = parseTypedDateString(typedValue, effectiveSingleDisplayFormat, {
        enableTime,
        enableTimeZone,
        timeFormat: effectiveTimeFormat,
      })
      if (!parsed) {
        const msg = `Invalid date format. Expected: ${formatToPlaceholder(effectiveSingleDisplayFormat)}`
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

      const normalizedStoredValue = serializeSingleValue(
        parsed,
        enableTime,
        enableTimeZone,
        selectedTimeZone,
      )
      // Only render time tokens when the typed input actually contained
      // an explicit time. Date-only input keeps date-only display.
      const typedHadTime = enableTime && inputHasTimeToken(typedValue)
      const normalizedDisplayValue = formatDateByDisplayFormat(
        parsed,
        buildEffectiveSingleDisplayFormat(
          displayFormat,
          enableTime,
          enableTimeZone,
          effectiveTimeFormat,
          typedHadTime,
        ),
        enableTimeZone ? selectedTimeZone : undefined,
      )
      const validationMessage = getTimeZoneError(selectedTimeZone, normalizedDisplayValue)
      hasActiveErrorRef.current = false
      setManualInputError(null)
      rawInputRef.current = normalizedDisplayValue
      setInputValue(normalizedDisplayValue)
      onValidationChange?.({
        isValid: !validationMessage,
        message: validationMessage,
        rawValue: normalizedDisplayValue,
      })
      if (normalizedStoredValue !== value) {
        onChange(normalizedStoredValue)
      }
    },
    [
      allowManualInput,
      dateValidationRestrictions,
      effectiveSingleDisplayFormat,
      displayFormat,
      onChange,
      onRangeChange,
      onValidationChange,
      pickerMode,
      value,
      enableTime,
      enableTimeZone,
      effectiveTimeFormat,
      selectedTimeZone,
      getTimeZoneError,
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
      const errorMsg = validateRangeTypedInput(
        typedValue,
        effectiveSingleDisplayFormat,
        dateValidationRestrictions,
        {
          enableTime,
          enableTimeZone,
          timeFormat: effectiveTimeFormat,
        },
      )
      if (errorMsg) {
        hasActiveErrorRef.current = true
        setManualInputError(errorMsg)
        setInputValue(typedValue)
        onValidationChange?.({ isValid: false, message: errorMsg, rawValue: typedValue })
      } else {
        hasActiveErrorRef.current = false
        setManualInputError(null)
        const validationMessage = getTimeZoneError(selectedTimeZone, typedValue)
        onValidationChange?.({
          isValid: !validationMessage,
          message: validationMessage,
          rawValue: typedValue,
        })

        // Sync calendar's selected start/end with typed text on close.
        const { start, end, startHadTime, endHadTime } = parseTypedRangeString(
          typedValue,
          effectiveSingleDisplayFormat,
          { enableTime, enableTimeZone, timeFormat: effectiveTimeFormat },
        )
        if (onRangeChange && (start || end)) {
          const startToEmit =
            enableTime && start && !startHadTime
              ? (() => { const d = new Date(start); d.setHours(0, 0, 0, 0); return d })()
              : start
          const endToEmit =
            enableTime && end && !endHadTime
              ? (() => { const d = new Date(end); d.setHours(0, 0, 0, 0); return d })()
              : end
          onRangeChange(
            serializeRangeValue(
              startToEmit,
              endToEmit,
              enableTime,
              enableTimeZone,
              selectedTimeZone,
            ),
          )
        }
      }
      return
    }

    // ── Single mode ──
    const parsed = parseTypedDateString(typedValue, effectiveSingleDisplayFormat, {
      enableTime,
      enableTimeZone,
      timeFormat: effectiveTimeFormat,
    })
    if (!parsed) {
      const msg = `Invalid date format. Expected format: ${formatToPlaceholder(effectiveSingleDisplayFormat)}`
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

    const normalizedStoredValue = serializeSingleValue(
      parsed,
      enableTime,
      enableTimeZone,
      selectedTimeZone,
    )
    const typedHadTime = enableTime && inputHasTimeToken(typedValue)
    const normalizedDisplayValue = formatDateByDisplayFormat(
      parsed,
      buildEffectiveSingleDisplayFormat(
        displayFormat,
        enableTime,
        enableTimeZone,
        effectiveTimeFormat,
        typedHadTime,
      ),
      enableTimeZone ? selectedTimeZone : undefined,
    )
    const validationMessage = getTimeZoneError(selectedTimeZone, normalizedDisplayValue)
    hasActiveErrorRef.current = false
    setManualInputError(null)
    rawInputRef.current = normalizedDisplayValue
    setInputValue(normalizedDisplayValue)
    onValidationChange?.({
      isValid: !validationMessage,
      message: validationMessage,
      rawValue: normalizedDisplayValue,
    })
    if (normalizedStoredValue !== value) {
      onChange(normalizedStoredValue)
    }
  }, [
    allowManualInput,
    dateValidationRestrictions,
    effectiveSingleDisplayFormat,
    displayFormat,
    onChange,
    onRangeChange,
    onValidationChange,
    pickerMode,
    value,
    enableTime,
    enableTimeZone,
    effectiveTimeFormat,
    selectedTimeZone,
    getTimeZoneError,
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
  const inputClassName = manualInputError || timeZoneError ? 'form-control is-invalid' : 'form-control'

  // Build the time-zone option list. Always show the predefined U.S. zones,
  // and prepend the currently-selected zone if it isn't already in the list
  // (e.g. the renderer resolved a non-U.S. browser zone). This way the
  // dropdown always reflects the active time zone faithfully.
  const trimmedTimeZoneLabel = (timeZoneLabel || '').trim()
  const timeZoneOptions = useMemo(() => {
    const known = DATE_PICKER_TIME_ZONE_OPTIONS.map((option) => ({
      value: option.value,
      label: option.label,
    }))
    if (selectedTimeZone && !known.some((o) => o.value === selectedTimeZone)) {
      return [{ value: selectedTimeZone, label: selectedTimeZone }, ...known]
    }
    return known
  }, [selectedTimeZone])

  const timeZoneSelector = enableTimeZone ? (
    <div className="form-group">
      {trimmedTimeZoneLabel ? (
        <label className="control-label">{trimmedTimeZoneLabel}</label>
      ) : null}
      <select
        className={timeZoneError ? 'form-control is-invalid' : 'form-control'}
        value={selectedTimeZone}
        onChange={handleTimeZoneChange}
        disabled={isEffectivelyReadOnly}
      >
        {timeZoneOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  ) : null

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
          showTimeInput={enableTime}
          timeInputLabel="Time:"
          timeFormat={effectiveTimeFormat}
          timeIntervals={effectiveTimeIntervals}
          timeCaption="Time"
          timeZone={pickerTimeZone}
          onKeyDown={handleKeyDown}
          onChangeRaw={handleChangeRaw}
          onFocus={handleFocus}
          onBlur={handleBlur as any}
          onCalendarClose={handleCalendarClose}
          dateFormat={effectiveSingleDisplayFormat}
          strictParsing
          shouldCloseOnSelect={!enableTime}
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
          className={inputClassName}
          calendarClassName="datepicker-calendar"
          portalId="date-picker-portal"
          autoComplete="off"
          aria-label={effectivePlaceholder}
          aria-invalid={manualInputError || timeZoneError ? 'true' : 'false'}
          value={inputValue}
          tabIndex={tabIndex}
        />
        {timeZoneSelector}
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
        showTimeInput={enableTime}
        timeInputLabel="Time:"
        timeFormat={effectiveTimeFormat}
        timeIntervals={effectiveTimeIntervals}
        timeCaption="Time"
        timeZone={pickerTimeZone}
        onKeyDown={handleKeyDown}
        onChangeRaw={handleChangeRaw}
        onFocus={handleFocus}
        onBlur={handleBlur as any}
        onCalendarClose={handleCalendarClose}
        dateFormat={effectiveSingleDisplayFormat}
        strictParsing
        shouldCloseOnSelect={!enableTime}
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
        className={inputClassName}
        calendarClassName="datepicker-calendar"
          portalId="date-picker-portal"
        tabIndex={tabIndex}
      />
      {timeZoneSelector}
    </div>
  )
}
