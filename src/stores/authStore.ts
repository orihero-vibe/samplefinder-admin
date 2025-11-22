import { create } from 'zustand'
import { account } from '../lib/appwrite'
import { ID, type Models } from 'appwrite'

interface User extends Models.User<Models.Preferences> {
  name?: string
  email?: string
}

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  register: (email: string, password: string, name?: string) => Promise<void>
  getCurrentUser: () => Promise<void>
  clearError: () => void
  resetPassword: (email: string) => Promise<void>
  updatePassword: (userId: string, secret: string, newPassword: string) => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,

  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null })
      await account.createEmailPasswordSession(email, password)
      const user = await account.get()
      set({ user, isAuthenticated: true, isLoading: false })
    } catch (error: any) {
      set({
        error: error.message || 'Failed to login. Please check your credentials.',
        isLoading: false,
        isAuthenticated: false,
      })
      throw error
    }
  },

  logout: async () => {
    try {
      await account.deleteSession('current')
      set({ user: null, isAuthenticated: false, error: null })
    } catch (error: any) {
      set({ error: error.message || 'Failed to logout' })
      throw error
    }
  },

  register: async (email: string, password: string, name?: string) => {
    try {
      set({ isLoading: true, error: null })
      await account.create(ID.unique(), email, password, name)
      // Optionally create a session after registration
      await account.createEmailPasswordSession(email, password)
      const user = await account.get()
      set({ user, isAuthenticated: true, isLoading: false })
    } catch (error: any) {
      set({
        error: error.message || 'Failed to register. Please try again.',
        isLoading: false,
      })
      throw error
    }
  },

  getCurrentUser: async () => {
    try {
      set({ isLoading: true })
      const user = await account.get()
      set({ user, isAuthenticated: true, isLoading: false })
    } catch (error: any) {
      // User is not authenticated
      set({ user: null, isAuthenticated: false, isLoading: false })
    }
  },

  resetPassword: async (email: string) => {
    try {
      set({ error: null })
      await account.createRecovery(
        email,
        `${window.location.origin}/password-reset`
      )
    } catch (error: any) {
      set({ error: error.message || 'Failed to send reset email' })
      throw error
    }
  },

  updatePassword: async (userId: string, secret: string, newPassword: string) => {
    try {
      set({ error: null })
      await account.updateRecovery(userId, secret, newPassword)
    } catch (error: any) {
      set({ error: error.message || 'Failed to update password' })
      throw error
    }
  },

  clearError: () => set({ error: null }),
}))

