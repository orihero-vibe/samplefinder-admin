import { useState, useEffect } from 'react'
import { Icon } from '@iconify/react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { AuthLayout, AppLogo, AuthHeader, Input, Checkbox, Button } from '../components'
import { useAuthStore } from '../stores/authStore'
import { useNotificationStore } from '../stores/notificationStore'

const Login = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isAuthenticated, isLoading, error, clearError } = useAuthStore()
  const { addNotification } = useNotificationStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Combined: local state for immediate feedback + store state for async operations
  const isLoggingIn = isSubmitting || isLoading

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard'
      navigate(from, { replace: true })
    }
  }, [isAuthenticated, navigate, location])

  // Show error notification
  useEffect(() => {
    if (error) {
      addNotification({
        type: 'error',
        title: 'Login Failed',
        message: error,
      })
      clearError()
    }
  }, [error, addNotification, clearError])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Prevent double submission
    if (isSubmitting || isLoading) {
      return
    }

    // Set local state immediately for instant UI feedback
    setIsSubmitting(true)

    try {
      // login() will set isLoading: true in the store
      await login(email, password)
      // Success - isLoading will be set to false by the store
      // Keep isSubmitting true until navigation (component will unmount)
      addNotification({
        type: 'success',
        title: 'Welcome back!',
        message: 'You have successfully logged in.',
      })
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard'
      navigate(from, { replace: true })
    } catch {
      // Error - isLoading will be set to false by the store
      // Reset local state on error
      setIsSubmitting(false)
      // Error is handled by the store and shown via notification
    }
  }

  return (
    <AuthLayout>
      <div className="flex flex-col items-center gap-4 mb-12 w-full">
        <AppLogo variant="icon" iconClassName="h-10 sm:h-12 w-auto" />
        <AppLogo
          variant="text"
          className="max-w-full"
          textClassName="h-9 w-auto max-w-full"
        />
      </div>
      
      <AuthHeader
        title="Log In"
        subtitle="Welcome back! Please enter your details."
      />

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Input
          id="email"
          type="email"
          label="Email"
          placeholder="Enter your email."
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="text-[0.9rem] font-medium text-gray-700">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="px-4 py-3 pr-10 border rounded-lg text-base text-gray-800 bg-white transition-all focus:outline-none focus:ring-4 placeholder:text-gray-400 w-full border-gray-200 focus:border-[#1D0A74] focus:ring-[#1D0A74]/10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              <Icon
                icon={showPassword ? 'mdi:eye-off' : 'mdi:eye'}
                className="w-5 h-5"
              />
            </button>
          </div>
        </div>

        <div className="flex justify-between items-center text-[0.9rem]">
          <Checkbox
            id="rememberMe"
            label="Remember for 30 days"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          <Link to="/forgot-password" className="text-brand-blue font-medium transition-colors hover:text-blue-700 no-underline">
            Forgot password
          </Link>
        </div>

        <Button type="submit" disabled={isLoggingIn}>
          {isLoggingIn ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>
    </AuthLayout>
  )
}

export default Login
