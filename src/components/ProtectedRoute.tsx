import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, getCurrentUser, userProfile, logout } = useAuthStore()
  const location = useLocation()
  const [authCheckStarted, setAuthCheckStarted] = useState(false)

  useEffect(() => {
    // Check if user is authenticated on mount
    getCurrentUser()
    setAuthCheckStarted(true)
  }, [getCurrentUser])

  // Defense-in-depth: if a non-admin session somehow leaked through the
  // store-level checks, terminate the Appwrite session immediately.
  useEffect(() => {
    if (isAuthenticated && userProfile && userProfile.role !== 'admin') {
      logout().catch(() => {})
    }
  }, [isAuthenticated, userProfile, logout])

  if (!authCheckStarted || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    // Redirect to login with return url
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Explicit role gate — the admin panel is admin-only. Any authenticated
  // session without an admin profile is rejected at the route level.
  if (!userProfile || userProfile.role !== 'admin') {
    return (
      <Navigate
        to="/login"
        state={{ from: location, error: 'Admin access required.' }}
        replace
      />
    )
  }

  return <>{children}</>
}

