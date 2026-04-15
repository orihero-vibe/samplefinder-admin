/**
 * Form utilities for consistent handling of form data (e.g. trimming strings).
 */

/**
 * Returns true if value is a plain object (not null, not Array, not Date, not File).
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.prototype.toString.call(value) === '[object Object]'
  )
}

/**
 * Deep-clones data and trims all string values. Used at submit time so
 * whitespace-only input is treated as blank and never saved as valid content.
 * - Strings: replaced by .trim()
 * - Arrays: cloned; each string element trimmed, non-strings unchanged
 * - Plain objects: recursed into
 * - Primitives (number, boolean), null, undefined, File, Date, etc.: unchanged
 */
export function trimFormStrings<T>(data: T): T {
  if (data === null || data === undefined) {
    return data
  }

  if (typeof data === 'string') {
    return data.trim() as T
  }

  if (Array.isArray(data)) {
    return data.map((item) => trimFormStrings(item)) as T
  }

  if (isPlainObject(data)) {
    const result: Record<string, unknown> = {}
    for (const key of Object.keys(data)) {
      result[key] = trimFormStrings(data[key])
    }
    return result as T
  }

  return data
}

/**
 * YYYY-MM-DD for `<input type="date">` from a stored DOB (ISO datetime or date).
 * Prefer the calendar date from an ISO date prefix so we match list view / app semantics.
 * Avoids `new Date(s).toISOString().split('T')[0]`, which uses UTC midnight and can show
 * the previous calendar day when the backend stores local datetimes without a `Z` suffix.
 */
export function storedDobToDateInputValue(stored: string | undefined): string {
  if (!stored?.trim()) return ''
  const m = stored.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) {
    const y = m[1]!.padStart(4, '0')
    const mo = m[2]!.padStart(2, '0')
    const d = m[3]!.padStart(2, '0')
    return `${y}-${mo}-${d}`
  }
  const dt = new Date(stored)
  if (Number.isNaN(dt.getTime())) return ''
  const y = dt.getUTCFullYear()
  const mo = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const day = String(dt.getUTCDate()).padStart(2, '0')
  return `${y}-${mo}-${day}`
}
