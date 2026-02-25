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
