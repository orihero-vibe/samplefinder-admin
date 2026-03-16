import { create } from 'zustand'
import {
  APP_TIMEZONES,
  DEFAULT_APP_TIMEZONE,
  type AppTimezoneCode,
} from '../lib/dateUtils'

export const TIMEZONE_OPTIONS: { value: string; label: string }[] = [
  { value: APP_TIMEZONES.NT, label: 'Newfoundland (NT)' },
  { value: APP_TIMEZONES.ET, label: 'Eastern (ET)' },
  { value: APP_TIMEZONES.CT, label: 'Central (CT)' },
  { value: APP_TIMEZONES.MT, label: 'Mountain (MT)' },
  { value: APP_TIMEZONES.PT, label: 'Pacific (PT)' },
  { value: APP_TIMEZONES.AKT, label: 'Alaska (AKT)' },
  { value: APP_TIMEZONES.HAT, label: 'Hawaii-Aleutian (HAT)' },
]

interface TimezoneState {
  /** IANA timezone (e.g. America/New_York) */
  appTimezone: string
  getTimezoneOptions: () => { value: string; label: string }[]
}

export const useTimezoneStore = create<TimezoneState>(() => ({
  appTimezone:
    typeof window !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_APP_TIMEZONE
      : DEFAULT_APP_TIMEZONE,
  getTimezoneOptions: () => TIMEZONE_OPTIONS,
}))

export type { AppTimezoneCode }
