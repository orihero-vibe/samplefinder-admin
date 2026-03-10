/**
 * Utility functions for handling datetime operations with timezone preservation.
 * These functions ensure that datetime values are saved and displayed correctly
 * without unwanted timezone conversions.
 */

/** Supported app timezones: label (ET/CT/MT/PT) → IANA timezone (handles DST) */
export const APP_TIMEZONES = {
  ET: 'America/New_York',
  CT: 'America/Chicago',
  MT: 'America/Denver',
  PT: 'America/Los_Angeles',
} as const

export type AppTimezoneCode = keyof typeof APP_TIMEZONES

/** IANA timezone strings we support */
export const APP_TIMEZONE_VALUES = Object.values(APP_TIMEZONES) as readonly string[]

/** Default app timezone (Eastern) */
export const DEFAULT_APP_TIMEZONE = APP_TIMEZONES.ET

/**
 * Get short label (ET, CT, MT, PT) for an IANA timezone string.
 */
export function getAppTimezoneShortLabel(ianaTimezone: string): AppTimezoneCode | string {
  const entry = Object.entries(APP_TIMEZONES).find(([, v]) => v === ianaTimezone)
  return entry ? (entry[0] as AppTimezoneCode) : ianaTimezone
}

/**
 * Get local date/time components when a UTC date is displayed in an IANA timezone.
 */
function getLocalComponentsInZone(
  utcDate: Date,
  ianaTimezone: string
): { year: number; month: number; day: number; hour: number; minute: number } {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: ianaTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(utcDate)
  const get = (type: string) => {
    const p = parts.find((x) => x.type === type)
    return p ? parseInt(p.value, 10) : 0
  }
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
  }
}

/**
 * Convert a local date + time in the app timezone to a UTC Date (for storage).
 * @param dateStr - Date only YYYY-MM-DD
 * @param timeStr - Time only HH:mm
 * @param appTimezoneIana - IANA timezone e.g. America/New_York
 * @returns Date in UTC (use .toISOString() for storage)
 */
export function appTimeToUTC(
  dateStr: string,
  timeStr: string,
  appTimezoneIana: string
): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  const [hour, min] = timeStr.split(':').map(Number)
  const minute = min ?? 0
  let guess = Date.UTC(y, m - 1, d, hour, minute, 0, 0)
  for (let i = 0; i < 5; i++) {
    const comp = getLocalComponentsInZone(new Date(guess), appTimezoneIana)
    if (
      comp.year === y &&
      comp.month === m &&
      comp.day === d &&
      comp.hour === hour &&
      comp.minute === minute
    ) {
      return new Date(guess)
    }
    const diffMs =
      (hour - comp.hour) * 36e5 +
      (minute - comp.minute) * 6e4 +
      (d - comp.day) * 864e5
    guess += diffMs
  }
  return new Date(guess)
}

/**
 * Convert a UTC ISO string (from DB) to date and time in the app timezone for form inputs.
 * @param utcIsoString - ISO string (e.g. from scheduledAt)
 * @param appTimezoneIana - IANA timezone
 * @returns { dateStr: 'YYYY-MM-DD', timeStr: 'HH:mm' }
 */
export function utcToAppTimeFormInputs(
  utcIsoString: string,
  appTimezoneIana: string
): { dateStr: string; timeStr: string } {
  const d = new Date(utcIsoString)
  if (isNaN(d.getTime())) {
    return { dateStr: '', timeStr: '' }
  }
  const comp = getLocalComponentsInZone(d, appTimezoneIana)
  const dateStr = `${comp.year}-${String(comp.month).padStart(2, '0')}-${String(comp.day).padStart(2, '0')}`
  const timeStr = `${String(comp.hour).padStart(2, '0')}:${String(comp.minute).padStart(2, '0')}`
  return { dateStr, timeStr }
}

/**
 * Format a UTC ISO string for display in the app timezone (e.g. "Feb 26, 2025 2:00 PM ET").
 */
export function formatUTCInAppTimezone(
  utcIsoString: string,
  appTimezoneIana: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = new Date(utcIsoString)
  if (isNaN(d.getTime())) return ''
  const short = getAppTimezoneShortLabel(appTimezoneIana)
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: appTimezoneIana,
    dateStyle: 'medium',
    timeStyle: 'short',
    ...options,
  })
  return `${formatter.format(d)} ${short}`
}

/**
 * Format an ISO/date string as date only in the app timezone (e.g. "02/26/2025" or "Feb 26, 2025").
 */
export function formatDateInAppTimezone(
  dateStr: string,
  appTimezoneIana: string,
  style: 'short' | 'medium' = 'short'
): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  const opts: Intl.DateTimeFormatOptions =
    style === 'short'
      ? { timeZone: appTimezoneIana, month: '2-digit', day: '2-digit', year: 'numeric' }
      : { timeZone: appTimezoneIana, dateStyle: 'medium' }
  return new Intl.DateTimeFormat('en-US', opts).format(d)
}

/**
 * Format an ISO/datetime string as time only in the app timezone (e.g. "2:00 PM").
 */
export function formatTimeInAppTimezone(
  dateStr: string,
  appTimezoneIana: string
): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) {
    if (dateStr.includes(':')) {
      const parts = dateStr.split(':')
      if (parts.length >= 2) {
        const hour = parseInt(parts[0], 10)
        const minute = parseInt(parts[1], 10)
        if (!isNaN(hour) && !isNaN(minute)) {
          const ampm = hour >= 12 ? 'PM' : 'AM'
          const hour12 = hour % 12 || 12
          return `${hour12}:${String(minute).padStart(2, '0')} ${ampm}`
        }
      }
    }
    return dateStr
  }
  return new Intl.DateTimeFormat('en-US', {
    timeZone: appTimezoneIana,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d)
}

/**
 * Format an ISO string as date + time in the app timezone (e.g. "Feb 26, 2025 2:00 PM").
 */
export function formatDateTimeInAppTimezone(
  dateStr: string,
  appTimezoneIana: string
): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('en-US', {
    timeZone: appTimezoneIana,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d)
}

/**
 * Formats a Date object as ISO 8601 string with timezone offset.
 * This preserves the local timezone instead of converting to UTC.
 * 
 * @param date - The Date object to format
 * @returns ISO 8601 formatted string with timezone offset (e.g., "2024-01-15T14:00:00-05:00")
 * 
 * @example
 * const date = new Date(2024, 0, 15, 14, 0, 0); // Jan 15, 2024 2:00 PM local time
 * formatDateWithTimezone(date); // "2024-01-15T14:00:00-05:00" (if EST)
 */
export function formatDateWithTimezone(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  // Get timezone offset in minutes (negative means behind UTC)
  const offset = -date.getTimezoneOffset()
  const offsetHours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0')
  const offsetMinutes = String(Math.abs(offset) % 60).padStart(2, '0')
  const offsetSign = offset >= 0 ? '+' : '-'

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetSign}${offsetHours}:${offsetMinutes}`
}

/**
 * Converts a Date object or ISO date string to datetime-local input format.
 * This is used for populating HTML datetime-local input fields.
 * 
 * @param date - Date object or ISO date string
 * @returns Formatted string in YYYY-MM-DDTHH:mm format
 * 
 * @example
 * formatDateForInput(new Date(2024, 0, 15, 14, 30)); // "2024-01-15T14:30"
 * formatDateForInput("2024-01-15T14:30:00-05:00"); // "2024-01-15T14:30"
 */
export function formatDateForInput(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  
  // Check if date is valid
  if (isNaN(d.getTime())) {
    return ''
  }
  
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

/**
 * Parses a datetime-local input value to a Date object.
 * This handles the YYYY-MM-DDTHH:mm format from HTML datetime-local inputs.
 * 
 * @param inputValue - The value from a datetime-local input (format: YYYY-MM-DDTHH:mm)
 * @returns Date object representing the local date/time
 * 
 * @example
 * parseDateFromInput("2024-01-15T14:30"); // Date object for Jan 15, 2024 2:30 PM local time
 */
export function parseDateFromInput(inputValue: string): Date {
  if (!inputValue) {
    throw new Error('Input value cannot be empty')
  }
  
  // datetime-local format is YYYY-MM-DDTHH:mm
  // Create a date in local timezone
  const [datePart, timePart] = inputValue.split('T')
  if (!datePart || !timePart) {
    throw new Error(`Invalid datetime-local format: ${inputValue}`)
  }
  
  const [year, month, day] = datePart.split('-').map(Number)
  const [hours, minutes] = timePart.split(':').map(Number)
  
  return new Date(year, month - 1, day, hours, minutes, 0, 0)
}
