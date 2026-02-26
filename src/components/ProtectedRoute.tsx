import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, getCurrentUser } = useAuthStore()
  const location = useLocation()
  const [authCheckStarted, setAuthCheckStarted] = useState(false)

  useEffect(() => {
    // Check if user is authenticated on mount
    getCurrentUser()
    setAuthCheckStarted(true)
  }, [getCurrentUser])

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

  return <>{children}</>
}

