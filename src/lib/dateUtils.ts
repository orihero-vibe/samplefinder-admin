/**
 * Utility functions for handling datetime operations with timezone preservation.
 * These functions ensure that datetime values are saved and displayed correctly
 * without unwanted timezone conversions.
 */

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
