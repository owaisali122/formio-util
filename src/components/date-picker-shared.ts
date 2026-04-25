// Safely normalize displayFormat to a string
export function normalizeDisplayFormat(value: unknown, fallback: string): string {
  if (typeof value === 'string') return value.trim() || fallback
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (typeof obj.value === 'string') return obj.value.trim() || fallback
    if (typeof obj.label === 'string') return obj.label.trim() || fallback
  }
  return fallback
}
export type DatePickerMode = 'single' | 'range'

export interface DatePickerFormatSettings {
  pickerMode?: DatePickerMode
  displayFormat?: string
  enableTime?: boolean
  enableTimeZone?: boolean
  timeFormat?: string
  timeZone?: string
}

export const DEFAULT_DATE_PICKER_DISPLAY_FORMAT = 'MM/dd/yyyy'
export const DEFAULT_DATE_PICKER_TIME_FORMAT = 'h:mm aa'
export const DEFAULT_DATE_PICKER_TIME_INTERVALS = 15
export const FALLBACK_DATE_PICKER_TIME_ZONE = 'UTC'

export const DATE_PICKER_TIME_FORMAT_OPTIONS = [
  { label: '12-hour (h:mm aa)', value: 'h:mm aa' },
  { label: '24-hour (HH:mm)', value: 'HH:mm' },
] as const

export interface DatePickerTimeZoneOption {
  label: string
  abbreviation: string
  value: string
  standardOffset: string
  dstOffset: string | null
  areaCovered: string
}

export const DATE_PICKER_TIME_ZONE_OPTIONS: readonly DatePickerTimeZoneOption[] = [
  {
    label: 'Atlantic Time',
    abbreviation: 'AST',
    value: 'America/Puerto_Rico',
    standardOffset: 'UTC-04:00',
    dstOffset: null,
    areaCovered: 'Puerto Rico, U.S. Virgin Islands',
  },
  {
    label: 'Eastern Time',
    abbreviation: 'EST / EDT',
    value: 'America/New_York',
    standardOffset: 'UTC-05:00',
    dstOffset: 'UTC-04:00',
    areaCovered: 'East Coast states such as NY, FL, DC',
  },
  {
    label: 'Central Time',
    abbreviation: 'CST / CDT',
    value: 'America/Chicago',
    standardOffset: 'UTC-06:00',
    dstOffset: 'UTC-05:00',
    areaCovered: 'Gulf Coast, Tennessee Valley, Great Plains',
  },
  {
    label: 'Mountain Time',
    abbreviation: 'MST / MDT',
    value: 'America/Denver',
    standardOffset: 'UTC-07:00',
    dstOffset: 'UTC-06:00',
    areaCovered: 'Rocky Mountain states such as NM and CO',
  },
  {
    label: 'Arizona Time',
    abbreviation: 'MST',
    value: 'America/Phoenix',
    standardOffset: 'UTC-07:00',
    dstOffset: null,
    areaCovered: 'Most of Arizona',
  },
  {
    label: 'Pacific Time',
    abbreviation: 'PST / PDT',
    value: 'America/Los_Angeles',
    standardOffset: 'UTC-08:00',
    dstOffset: 'UTC-07:00',
    areaCovered: 'West Coast states such as CA and WA',
  },
  {
    label: 'Alaska Time',
    abbreviation: 'AKST / AKDT',
    value: 'America/Anchorage',
    standardOffset: 'UTC-09:00',
    dstOffset: 'UTC-08:00',
    areaCovered: 'Most of Alaska',
  },
  {
    label: 'Hawaii-Aleutian Time',
    abbreviation: 'HST / HDT',
    value: 'Pacific/Honolulu',
    standardOffset: 'UTC-10:00',
    dstOffset: null,
    areaCovered: 'Hawaii',
  },
  {
    label: 'Samoa Time',
    abbreviation: 'SST',
    value: 'Pacific/Pago_Pago',
    standardOffset: 'UTC-11:00',
    dstOffset: null,
    areaCovered: 'American Samoa',
  },
  {
    label: 'Chamorro Time',
    abbreviation: 'ChST',
    value: 'Pacific/Guam',
    standardOffset: 'UTC+10:00',
    dstOffset: null,
    areaCovered: 'Guam and Northern Mariana Islands',
  },
] as const

const DATE_PICKER_TIME_ZONE_ALIAS_MAP: Record<string, string> = {
  'America/St_Thomas': 'America/Puerto_Rico',
  'America/Virgin': 'America/Puerto_Rico',
  'America/Detroit': 'America/New_York',
  'America/Indiana/Indianapolis': 'America/New_York',
  'America/Indiana/Marengo': 'America/New_York',
  'America/Indiana/Petersburg': 'America/New_York',
  'America/Indiana/Vevay': 'America/New_York',
  'America/Indiana/Vincennes': 'America/New_York',
  'America/Indiana/Winamac': 'America/New_York',
  'America/Kentucky/Louisville': 'America/New_York',
  'America/Kentucky/Monticello': 'America/New_York',
  'America/Chicago': 'America/Chicago',
  'America/Indiana/Knox': 'America/Chicago',
  'America/Indiana/Tell_City': 'America/Chicago',
  'America/Menominee': 'America/Chicago',
  'America/North_Dakota/Beulah': 'America/Chicago',
  'America/North_Dakota/Center': 'America/Chicago',
  'America/North_Dakota/New_Salem': 'America/Chicago',
  'America/Boise': 'America/Denver',
  'America/Phoenix': 'America/Phoenix',
  'America/Los_Angeles': 'America/Los_Angeles',
  'America/Anchorage': 'America/Anchorage',
  'America/Juneau': 'America/Anchorage',
  'America/Metlakatla': 'America/Anchorage',
  'America/Nome': 'America/Anchorage',
  'America/Sitka': 'America/Anchorage',
  'America/Yakutat': 'America/Anchorage',
  'America/Adak': 'Pacific/Honolulu',
  'Pacific/Honolulu': 'Pacific/Honolulu',
  'Pacific/Pago_Pago': 'Pacific/Pago_Pago',
  'Pacific/Midway': 'Pacific/Pago_Pago',
  'Pacific/Guam': 'Pacific/Guam',
  'Pacific/Saipan': 'Pacific/Guam',
}

/**
 * Map a value to one of the explicit U.S. time zone options when possible.
 * Returns empty string if the value is not in the predefined list and not
 * a recognised alias. Used only for matching the dropdown selection — the
 * renderer is allowed to use any IANA zone the browser reports.
 */
export function resolveSupportedDatePickerTimeZone(value?: string | null): string {
  const trimmed = value?.trim()
  if (!trimmed) return ''
  if (DATE_PICKER_TIME_ZONE_OPTIONS.some((option) => option.value === trimmed)) {
    return trimmed
  }
  return DATE_PICKER_TIME_ZONE_ALIAS_MAP[trimmed] || ''
}

/**
 * Resolve the browser's IANA time zone using Intl.
 * Returns the raw zone string (no U.S. restriction). Falls back to UTC.
 */
export function getBrowserDatePickerTimeZone(): string {
  try {
    const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (browserTimeZone && typeof browserTimeZone === 'string') return browserTimeZone
  } catch {
    // ignore
  }
  return FALLBACK_DATE_PICKER_TIME_ZONE
}

/**
 * Resolve the initial time zone for the renderer.
 * Priority: provided value (e.g. saved submission tz) → browser tz → UTC.
 * Never hardcodes Central Time or any other fixed zone.
 */
export function getInitialDatePickerTimeZone(value?: string | null): string {
  const trimmed = value?.trim()
  if (trimmed) return trimmed
  return getBrowserDatePickerTimeZone()
}

export function normalizeDatePickerTimeFormat(timeFormat?: string): string {
  const trimmed = timeFormat?.trim()
  if (trimmed === 'HH:mm' || trimmed === 'h:mm aa') {
    return trimmed
  }
  return DEFAULT_DATE_PICKER_TIME_FORMAT
}

export function extractDatePickerBaseFormat(displayFormat?: unknown): string {
  const safeFormat = normalizeDisplayFormat(displayFormat, DEFAULT_DATE_PICKER_DISPLAY_FORMAT)
  const singleSide = safeFormat.split(' - ')[0]?.trim() || safeFormat
  return singleSide
    .replace(/\s+\(zzz\)$/i, '')
    .replace(/\s+zzz$/i, '')
    .replace(/\s+h:mm aa$/i, '')
    .replace(/\s+HH:mm$/i, '')
    .trim() || DEFAULT_DATE_PICKER_DISPLAY_FORMAT
}

export function getEffectiveDatePickerSingleFormat({
  displayFormat = DEFAULT_DATE_PICKER_DISPLAY_FORMAT,
  enableTime = false,
  enableTimeZone = false,
  timeFormat = DEFAULT_DATE_PICKER_TIME_FORMAT,
}: Omit<DatePickerFormatSettings, 'pickerMode'>): string {
  const safeFormat = normalizeDisplayFormat(displayFormat, DEFAULT_DATE_PICKER_DISPLAY_FORMAT)
  const segments = [extractDatePickerBaseFormat(safeFormat)]
  if (enableTime) {
    segments.push(normalizeDatePickerTimeFormat(timeFormat))
  }
  if (enableTimeZone) {
    segments.push('(zzz)')
  }
  return segments.join(' ')
}

export function getEffectiveDatePickerDisplayFormat({
  pickerMode = 'single',
  displayFormat = DEFAULT_DATE_PICKER_DISPLAY_FORMAT,
  ...rest
}: DatePickerFormatSettings): string {
  const safeFormat = normalizeDisplayFormat(displayFormat, DEFAULT_DATE_PICKER_DISPLAY_FORMAT)
  const singleFormat = getEffectiveDatePickerSingleFormat({ ...rest, displayFormat: safeFormat })
  return pickerMode === 'range' ? `${singleFormat} - ${singleFormat}` : singleFormat
}

export function formatDatePickerPlaceholder(displayFormat: string): string {
  return displayFormat
    .replace(/\(zzz\)/gi, '(TZ)')
    .replace(/\bzzz\b/gi, 'TZ')
    .replace(/h:mm aa/gi, 'HH:mm')
    .replace(/HH:mm/g, 'HH:mm')
    .replace(/yyyy/g, 'YYYY')
    .replace(/yy/g, 'YY')
    .replace(/dd/g, 'DD')
}

export function getEffectiveDatePickerPlaceholder(settings: DatePickerFormatSettings): string {
  return formatDatePickerPlaceholder(getEffectiveDatePickerDisplayFormat(settings))
}

// ── Display format option list ──────────────────────────────────────────

const BASE_DATE_FORMATS: readonly string[] = [
  'MM/dd/yyyy',
  'dd/MM/yyyy',
  'yyyy-MM-dd',
  'MM-dd-yyyy',
  'dd-MM-yyyy',
] as const

export interface DatePickerDisplayFormatContext {
  pickerMode?: DatePickerMode
  enableTime?: boolean
  enableTimeZone?: boolean
}

/**
 * Build the dropdown option list for the Display Format setting based on
 * the picker mode + enableTime + enableTimeZone combination.
 * Returns a list of strings (the dropdown stores string values, never
 * `{ label, value }` objects).
 */
export function getDatePickerDisplayFormatOptions(
  context: DatePickerDisplayFormatContext = {},
): string[] {
  const { pickerMode = 'single', enableTime = false, enableTimeZone = false } = context

  const buildSingle = (): string[] => {
    if (!enableTime && !enableTimeZone) return [...BASE_DATE_FORMATS]
    if (enableTime && !enableTimeZone) {
      return BASE_DATE_FORMATS.flatMap((df) => [`${df} h:mm aa`, `${df} HH:mm`])
    }
    if (!enableTime && enableTimeZone) {
      return BASE_DATE_FORMATS.map((df) => `${df} (zzz)`)
    }
    return BASE_DATE_FORMATS.flatMap((df) => [
      `${df} h:mm aa (zzz)`,
      `${df} HH:mm (zzz)`,
    ])
  }

  const singles = buildSingle()
  if (pickerMode !== 'range') return singles
  return singles.map((s) => `${s} - ${s}`)
}