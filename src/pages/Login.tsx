import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { AuthLayout, Logo, AuthHeader, Input, Checkbox, Button } from '../components'
import { useAuthStore } from '../stores/authStore'
import { useNotificationStore } from '../stores/notificationStore'

const Login = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isAuthenticated, isLoading, error, clearError } = useAuthStore()
  const { addNotification } = useNotificationStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

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
    setIsSubmitting(true)

    try {
      await login(email, password)
      addNotification({
        type: 'success',
        title: 'Welcome back!',
        message: 'You have successfully logged in.',
      })
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard'
      navigate(from, { replace: true })
    } catch {
      // Error is handled by the store and shown via notification
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <Logo />
      
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

        <Input
          id="password"
          type="password"
          label="Password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

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

        <Button type="submit" disabled={isSubmitting || isLoading}>
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>
    </AuthLayout>
  )
}

export default Login
