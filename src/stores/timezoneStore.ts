import { create } from 'zustand'
import { settingsService } from '../lib/services'
import {
  APP_TIMEZONES,
  APP_TIMEZONE_VALUES,
  DEFAULT_APP_TIMEZONE,
  type AppTimezoneCode,
} from '../lib/dateUtils'

const LS_KEY = 'samplefinder_appTimezone'

function getTimezoneFromLS(): string {
  if (typeof window === 'undefined') return DEFAULT_APP_TIMEZONE
  try {
    const v = localStorage.getItem(LS_KEY)
    return v && APP_TIMEZONE_VALUES.includes(v) ? v : DEFAULT_APP_TIMEZONE
  } catch {
    return DEFAULT_APP_TIMEZONE
  }
}

function setTimezoneToLS(iana: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LS_KEY, iana)
  } catch {
    // ignore
  }
}

const TIMEZONE_OPTIONS: { value: string; label: string }[] = [
  { value: APP_TIMEZONES.ET, label: 'Eastern (ET)' },
  { value: APP_TIMEZONES.CT, label: 'Central (CT)' },
  { value: APP_TIMEZONES.MT, label: 'Mountain (MT)' },
  { value: APP_TIMEZONES.PT, label: 'Pacific (PT)' },
]

interface TimezoneState {
  /** IANA timezone (e.g. America/New_York) */
  appTimezone: string
  /** Whether we've loaded from Appwrite (so we don't overwrite before load) */
  loaded: boolean
  setAppTimezone: (iana: string) => void
  fetchAppTimezone: () => Promise<void>
  setAppTimezoneAndPersist: (iana: string) => Promise<void>
  getTimezoneOptions: () => { value: string; label: string }[]
}

export const useTimezoneStore = create<TimezoneState>((set) => ({
  appTimezone: getTimezoneFromLS(),
  loaded: false,

  setAppTimezone: (iana: string) => {
    set({ appTimezone: iana })
    setTimezoneToLS(iana)
  },

  fetchAppTimezone: async () => {
    set({ appTimezone: getTimezoneFromLS() })
    try {
      const iana = await settingsService.getAppTimezone()
      set({ appTimezone: iana, loaded: true })
      setTimezoneToLS(iana)
    } catch (error) {
      console.error('Failed to fetch app timezone:', error)
      set({ appTimezone: getTimezoneFromLS(), loaded: true })
    }
  },

  setAppTimezoneAndPersist: async (iana: string) => {
    try {
      await settingsService.setAppTimezone(iana)
      set({ appTimezone: iana })
      setTimezoneToLS(iana)
    } catch (error) {
      console.error('Failed to save app timezone:', error)
      throw error
    }
  },

  getTimezoneOptions: () => TIMEZONE_OPTIONS,
}))

export type { AppTimezoneCode }
