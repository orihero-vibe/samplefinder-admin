import { create } from 'zustand'
import { account } from '../lib/appwrite'
import { ID, type Models } from 'appwrite'
import { userProfilesService, type UserProfile } from '../lib/services'

interface User extends Omit<Models.User<Models.Preferences>, 'name' | 'email'> {
  name?: string
  email?: string
}

interface AuthState {
  user: User | null
  userProfile: UserProfile | null
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
  userProfile: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,

  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null, userProfile: null })
      
      // Step 0: Clear any existing session before creating a new one
      // This prevents "Creation of a session is prohibited when a session is active" error
      try {
        // Try to get current session - if it exists, delete it
        const currentUser = await account.get()
        if (currentUser) {
          // Session exists, delete it
          await account.deleteSession({ sessionId: 'current' })
        }
      } catch {
        // No active session or error getting user - that's fine, continue
      }
      
      // Clear Appwrite cookies and localStorage
      // Appwrite stores session in cookies with pattern: a_session_<projectId>
      const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID || ''
      if (projectId) {
        // Clear Appwrite session cookie
        document.cookie = `a_session_${projectId}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}; SameSite=Lax`
        document.cookie = `a_session_${projectId}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`
      }
      
      // Clear any localStorage items that might contain session data
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.includes('appwrite') || key.includes('session'))) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key))
      
      // Step 1: Authenticate with Appwrite
      try {
        await account.createEmailPasswordSession({ email, password })
      } catch (sessionError: unknown) {
        // If we get the "session already exists" error, try one more time after clearing
        const errorMessage = sessionError instanceof Error ? sessionError.message : String(sessionError)
        if (errorMessage.includes('session is active') || errorMessage.includes('session is prohibited')) {
          // Force clear all sessions by deleting all cookies for this domain
          const cookies = document.cookie.split(';')
          cookies.forEach(cookie => {
            const eqPos = cookie.indexOf('=')
            const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()
            if (name.includes('session') || name.includes('appwrite')) {
              document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}`
              document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`
            }
          })
          
          // Clear localStorage again
          localStorage.clear()
          
          // Retry creating the session
          await account.createEmailPasswordSession({ email, password })
        } else {
          // Re-throw if it's a different error
          throw sessionError
        }
      }
      
      const user = await account.get()
      
      // Step 2: Find user profile by authID
      const userProfile = await userProfilesService.findByAuthID(user.$id)
      
      if (!userProfile) {
        // User authenticated but no profile found
        await account.deleteSession({ sessionId: 'current' })
        const errorMessage = 'User profile not found. Please contact administrator.'
        set({
          error: errorMessage,
          isLoading: false,
          isAuthenticated: false,
          user: null,
          userProfile: null,
        })
        throw new Error(errorMessage)
      }
      
      // Step 3: Check if user has admin role
      if (userProfile.role !== 'admin') {
        // User has profile but is not admin
        await account.deleteSession({ sessionId: 'current' })
        const errorMessage = 'Authorization failed. Admin access required.'
        set({
          error: errorMessage,
          isLoading: false,
          isAuthenticated: false,
          user: null,
          userProfile: null,
        })
        throw new Error(errorMessage)
      }
      
      // Step 4: Success - user is authenticated and authorized
      set({ 
        user, 
        userProfile,
        isAuthenticated: true, 
        isLoading: false,
        error: null,
      })
    } catch (error: unknown) {
      // Extract user-friendly error message from Appwrite error
      let errorMessage = 'Failed to login. Please check your credentials.'
      
      // Handle Appwrite SDK error format first (it has a specific structure)
      if (error && typeof error === 'object') {
        const errorObj = error as Record<string, unknown>
        
        // Check for Appwrite error response format
        if ('response' in errorObj && errorObj.response && typeof errorObj.response === 'object') {
          const response = errorObj.response as Record<string, unknown>
          if ('message' in response && typeof response.message === 'string') {
            errorMessage = response.message
          } else if ('code' in response) {
            // Handle HTTP status codes
            const code = response.code
            if (code === 401 || code === '401') {
              errorMessage = 'Invalid email or password. Please try again.'
            } else if (code === 404 || code === '404') {
              errorMessage = 'Account not found. Please check your email address.'
            } else if (code === 429 || code === '429') {
              errorMessage = 'Too many login attempts. Please try again later.'
            }
          }
        }
        
        // Check for direct message property
        if ('message' in errorObj && typeof errorObj.message === 'string') {
          const errorMsg = errorObj.message
          // Check for specific error types in message
          if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
            errorMessage = 'Invalid email or password. Please try again.'
          } else if (errorMsg.includes('404') || errorMsg.includes('Not found')) {
            errorMessage = 'Account not found. Please check your email address.'
          } else if (errorMsg.includes('429') || errorMsg.includes('rate limit')) {
            errorMessage = 'Too many login attempts. Please try again later.'
          } else if (errorMsg.includes('session is active') || errorMsg.includes('session is prohibited')) {
            errorMessage = 'A session already exists. Please try logging in again.'
          } else if (errorMsg === 'User profile not found' || errorMsg === 'Admin access required') {
            // These errors are already set above, use them as-is
            errorMessage = errorMsg
          } else {
            // Use the error message from Appwrite if available
            errorMessage = errorMsg
          }
        }
      } else if (error instanceof Error) {
        const errorMsg = error.message
        // Check for specific error types
        if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
          errorMessage = 'Invalid email or password. Please try again.'
        } else if (errorMsg.includes('404') || errorMsg.includes('Not found')) {
          errorMessage = 'Account not found. Please check your email address.'
        } else if (errorMsg.includes('429') || errorMsg.includes('rate limit')) {
          errorMessage = 'Too many login attempts. Please try again later.'
        } else if (errorMsg.includes('session is active') || errorMsg.includes('session is prohibited')) {
          errorMessage = 'A session already exists. Please try logging in again.'
        } else if (errorMsg === 'User profile not found' || errorMsg === 'Admin access required') {
          // These errors are already set above, use them as-is
          errorMessage = errorMsg
        } else {
          // Use the error message from Appwrite if available
          errorMessage = errorMsg
        }
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      
      set({
        error: errorMessage,
        isLoading: false,
        isAuthenticated: false,
        user: null,
        userProfile: null,
      })
      throw new Error(errorMessage)
    }
  },

  logout: async () => {
    try {
      await account.deleteSession({ sessionId: 'current' })
      set({ 
        user: null, 
        userProfile: null,
        isAuthenticated: false, 
        error: null 
      })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to logout'
      set({ error: errorMessage })
      throw error
    }
  },

  register: async (email: string, password: string, name?: string) => {
    try {
      set({ isLoading: true, error: null })
      await account.create({ userId: ID.unique(), email, password, name })
      // Optionally create a session after registration
      await account.createEmailPasswordSession({ email, password })
      const user = await account.get()
      set({ user, isAuthenticated: true, isLoading: false })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to register. Please try again.'
      set({
        error: errorMessage,
        isLoading: false,
      })
      throw error
    }
  },

  getCurrentUser: async () => {
    try {
      set({ isLoading: true })
      const user = await account.get()
      
      // Find user profile by authID
      const userProfile = await userProfilesService.findByAuthID(user.$id)
      
      if (!userProfile) {
        // User authenticated but no profile found
        await account.deleteSession({ sessionId: 'current' })
        set({ 
          user: null, 
          userProfile: null,
          isAuthenticated: false, 
          isLoading: false 
        })
        return
      }
      
      // Check if user has admin role
      if (userProfile.role !== 'admin') {
        // User has profile but is not admin
        await account.deleteSession({ sessionId: 'current' })
        set({ 
          user: null, 
          userProfile: null,
          isAuthenticated: false, 
          isLoading: false 
        })
        return
      }
      
      // User is authenticated and authorized
      set({ 
        user, 
        userProfile,
        isAuthenticated: true, 
        isLoading: false 
      })
    } catch {
      // User is not authenticated
      set({ 
        user: null, 
        userProfile: null,
        isAuthenticated: false, 
        isLoading: false 
      })
    }
  },

  resetPassword: async (email: string) => {
    try {
      set({ error: null })
      await account.createRecovery({
        email,
        url: `${window.location.origin}/password-reset`
      })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send reset email'
      set({ error: errorMessage })
      throw error
    }
  },

  updatePassword: async (userId: string, secret: string, newPassword: string) => {
    try {
      set({ error: null })
      await account.updateRecovery({ userId, secret, password: newPassword })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update password'
      set({ error: errorMessage })
      throw error
    }
  },

  clearError: () => set({ error: null }),
}))

