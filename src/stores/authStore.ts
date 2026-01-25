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
    // Trim email and password to remove any whitespace (move outside try block for catch access)
    const trimmedEmail = email.trim()
    const trimmedPassword = password.trim()
    
    try {
      set({ isLoading: true, error: null, userProfile: null })
      
      // Validate inputs
      if (!trimmedEmail || !trimmedPassword) {
        throw new Error('Email and password are required.')
      }
      
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
      // Use trimmed values to avoid issues with whitespace
      let session
      try {
        session = await account.createEmailPasswordSession({ 
          email: trimmedEmail.toLowerCase(), // Convert to lowercase for consistency
          password: trimmedPassword 
        })
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
          
          // Retry creating the session with trimmed values
          session = await account.createEmailPasswordSession({ 
            email: trimmedEmail.toLowerCase(), 
            password: trimmedPassword 
          })
        } else {
          // Re-throw if it's a different error
          throw sessionError
        }
      }
      
      // Verify session was created
      if (!session) {
        throw new Error('Failed to create session. Please try again.')
      }
      
      // Step 1.5: Get user account - retry if needed to allow cookie to be set
      let user
      let retries = 3
      while (retries > 0) {
        try {
          user = await account.get()
          break
        } catch (getError: unknown) {
          retries--
          if (retries === 0) {
            // Check if it's the scope error
            const errorMessage = getError instanceof Error ? getError.message : String(getError)
            if (errorMessage.includes('missing scopes') || errorMessage.includes('guests')) {
              throw new Error('Authentication failed: Session cookie not set. Please check your Appwrite CORS settings and ensure your domain is allowed.')
            }
            throw getError
          }
          // Wait a bit before retrying (cookie might need time to be set)
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
      
      if (!user) {
        throw new Error('Failed to get user account. Please try again.')
      }
      
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
      
      // Step 3: Check if user is blacklisted
      if (userProfile.isBlocked) {
        // User is blacklisted - force logout
        await account.deleteSession({ sessionId: 'current' })
        const errorMessage = 'Your account has been blocked. Please contact administrator.'
        set({
          error: errorMessage,
          isLoading: false,
          isAuthenticated: false,
          user: null,
          userProfile: null,
        })
        throw new Error(errorMessage)
      }
      
      // Step 4: Check if user has admin role
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
      
      // Step 5: Success - user is authenticated and authorized
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
      let errorType = ''
      
      // Handle Appwrite SDK error format first (it has a specific structure)
      if (error && typeof error === 'object') {
        const errorObj = error as Record<string, unknown>
        
        // Check for Appwrite error response format
        if ('response' in errorObj && errorObj.response && typeof errorObj.response === 'object') {
          const response = errorObj.response as Record<string, unknown>
          if ('message' in response && typeof response.message === 'string') {
            errorMessage = response.message
          }
          if ('type' in response && typeof response.type === 'string') {
            errorType = response.type
          }
          if ('code' in response) {
            // Handle HTTP status codes
            const code = response.code
            if (code === 401 || code === '401') {
              // Check if it's specifically an email verification issue
              if (errorType === 'user_email_not_confirmed' || errorMessage.toLowerCase().includes('email') && errorMessage.toLowerCase().includes('confirm')) {
                errorMessage = 'Please verify your email address before logging in. Check your inbox for a verification email.'
              } else {
                errorMessage = 'Invalid email or password. Please check your credentials and ensure your email is verified.'
              }
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
            // Check for email verification hints
            if (errorMsg.toLowerCase().includes('email') && errorMsg.toLowerCase().includes('confirm')) {
              errorMessage = 'Please verify your email address before logging in. Check your inbox for a verification email.'
            } else {
              errorMessage = 'Invalid email or password. Please check your credentials and ensure your email is verified.'
            }
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
        
        // Check for type property directly
        if ('type' in errorObj && typeof errorObj.type === 'string') {
          errorType = errorObj.type
          if (errorType === 'user_email_not_confirmed' || errorType === 'user_invalid_credentials') {
            if (errorType === 'user_email_not_confirmed') {
              errorMessage = 'Please verify your email address before logging in. Check your inbox for a verification email.'
            }
          }
        }
      } else if (error instanceof Error) {
        const errorMsg = error.message
        // Check for specific error types
        if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
          if (errorMsg.toLowerCase().includes('email') && errorMsg.toLowerCase().includes('confirm')) {
            errorMessage = 'Please verify your email address before logging in. Check your inbox for a verification email.'
          } else {
            errorMessage = 'Invalid email or password. Please check your credentials and ensure your email is verified.'
          }
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
      
      // Log detailed error for debugging (only in development)
      if (import.meta.env.DEV) {
        console.error('Login error details:', {
          error,
          errorType,
          email: trimmedEmail,
          hasPassword: !!trimmedPassword,
        })
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
      
      // Check if user is blacklisted
      if (userProfile.isBlocked) {
        // User is blacklisted - force logout
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
    } catch (error: unknown) {
      // Check if it's the scope error
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('missing scopes') || errorMessage.includes('guests')) {
        // Session cookie not being sent - likely CORS or cookie configuration issue
        console.error('Authentication error: Session cookie not being sent. Check Appwrite CORS settings.')
      }
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

