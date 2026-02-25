/**
 * Utility functions for event-related operations
 */

import { Query } from './appwrite'
import { eventsService } from './services'

/**
 * Generates a 6-character check-in code in the format: number-letter-number-letter-number-letter
 * Example: "1A2B3C"
 * 
 * @returns A 6-character check-in code
 */
export function generateCheckInCode(): string {
  const numbers = '0123456789'
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  
  // Generate random number (0-9)
  const num1 = numbers[Math.floor(Math.random() * numbers.length)]
  // Generate random letter (A-Z)
  const letter1 = letters[Math.floor(Math.random() * letters.length)]
  // Generate random number (0-9)
  const num2 = numbers[Math.floor(Math.random() * numbers.length)]
  // Generate random letter (A-Z)
  const letter2 = letters[Math.floor(Math.random() * letters.length)]
  // Generate random number (0-9)
  const num3 = numbers[Math.floor(Math.random() * numbers.length)]
  // Generate random letter (A-Z)
  const letter3 = letters[Math.floor(Math.random() * letters.length)]
  
  return `${num1}${letter1}${num2}${letter2}${num3}${letter3}`
}

/**
 * Generates a unique 6-character check-in code by checking against existing events
 * Retries up to 10 times if a duplicate is found
 * 
 * @param excludeEventId - Optional event ID to exclude from uniqueness check (for edit mode)
 * @returns A unique 6-character check-in code
 */
export async function generateUniqueCheckInCode(excludeEventId?: string): Promise<string> {
  const maxRetries = 10
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const code = generateCheckInCode()
    
    try {
      // Check if code already exists
      const existingEvents = await eventsService.list([
        Query.equal('checkInCode', code),
        Query.limit(1)
      ])
      
      // If no existing events found, or if the only existing event is the one we're editing, code is unique
      if (existingEvents.documents.length === 0) {
        return code
      }
      
      // If editing and the only match is the current event, code is unique
      if (excludeEventId && existingEvents.documents.length === 1 && existingEvents.documents[0].$id === excludeEventId) {
        return code
      }
      
      // Code exists, try again
    } catch (error) {
      // If there's an error checking, return the generated code anyway
      // This prevents blocking the user if there's a network issue
      console.warn('Error checking check-in code uniqueness:', error)
      return code
    }
  }
  
  // If we've exhausted retries, return a code with timestamp to ensure uniqueness
  // Still follows the pattern: number-letter-number-letter-number-letter
  const timestamp = Date.now().toString().slice(-3)
  const numbers = '0123456789'
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const letter1 = letters[Math.floor(Math.random() * letters.length)]
  const letter2 = letters[Math.floor(Math.random() * letters.length)]
  const letter3 = letters[Math.floor(Math.random() * letters.length)]
  // Use last 3 digits of timestamp, pad if needed
  const num1 = timestamp[0] || numbers[Math.floor(Math.random() * numbers.length)]
  const num2 = timestamp[1] || numbers[Math.floor(Math.random() * numbers.length)]
  const num3 = timestamp[2] || numbers[Math.floor(Math.random() * numbers.length)]
  return `${num1}${letter1}${num2}${letter2}${num3}${letter3}`
}

/**
 * Validates that a check-in code is exactly 6 characters
 * and matches the pattern: number-letter-number-letter-number-letter
 * 
 * @param code - The check-in code to validate
 * @returns true if valid, false otherwise
 */
export function validateCheckInCode(code: string): boolean {
  if (!code || code.length !== 6) {
    return false
  }
  
  // Pattern: number-letter-number-letter-number-letter
  const pattern = /^[0-9][A-Z][0-9][A-Z][0-9][A-Z]$/
  return pattern.test(code)
}

/** Display status for an event (Archived/Hidden from DB; Active/In Active derived from date/time) */
export type EventDisplayStatus = 'Archived' | 'Hidden' | 'Active' | 'In Active'

/**
 * Derives display status from event document.
 * - Archived / Hidden come from DB flags.
 * - "Active" = current time is within event start and end (live).
 * - "In Active" = scheduled (not started) or completed (ended).
 */
export function getEventStatus(doc: {
  startTime?: string
  endTime?: string
  isArchived?: boolean
  isHidden?: boolean
}): EventDisplayStatus {
  if (doc.isArchived) return 'Archived'
  if (doc.isHidden) return 'Hidden'
  const now = new Date()
  const eventStart = doc.startTime ? new Date(doc.startTime) : null
  const eventEnd = doc.endTime ? new Date(doc.endTime) : null
  if (!eventStart || !eventEnd || isNaN(eventStart.getTime()) || isNaN(eventEnd.getTime())) {
    return 'In Active'
  }
  if (now < eventStart) return 'In Active' // scheduled
  if (now > eventEnd) return 'In Active' // completed
  return 'Active' // live
}

/**
 * Returns Tailwind badge class for an event display status.
 */
export function getEventStatusColor(status: EventDisplayStatus | string): string {
  const s = status.toLowerCase().replace(/\s+/g, '')
  if (s === 'active') return 'bg-green-100 text-green-800'
  if (s === 'inactive') return 'bg-blue-100 text-blue-800'
  if (s === 'hidden') return 'bg-red-100 text-red-800'
  if (s === 'archived') return 'bg-gray-100 text-gray-800'
  return 'bg-gray-100 text-gray-800'
}
