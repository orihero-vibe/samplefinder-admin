import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { AuthLayout, AuthHeader, Input, Button } from '../components'
import { useAuthStore } from '../stores/authStore'
import { useNotificationStore } from '../stores/notificationStore'

const PasswordReset = () => {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { updatePassword } = useAuthStore()
  const { addNotification } = useNotificationStore()

  const userId = searchParams.get('userId')
  const secret = searchParams.get('secret')

  useEffect(() => {
    if (!userId || !secret) {
      addNotification({
        type: 'error',
        title: 'Invalid reset link',
        message: 'Please use the link from your email.',
      })
      navigate('/forgot-password')
    }
  }, [userId, secret, navigate, addNotification])

  const hasMinLength = password.length >= 8
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters')
      return
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      setPasswordError('Password must contain one special character')
      return
    }

    if (!userId || !secret) {
      setPasswordError('Invalid reset link')
      return
    }

    setPasswordError('')
    setIsSubmitting(true)

    try {
      await updatePassword(userId, secret, password)
      addNotification({
        type: 'success',
        title: 'Password updated',
        message: 'Your password has been successfully reset.',
      })
      navigate('/password-reset-success')
    } catch (err: unknown) {
      const errorMessage = (err as Error).message || 'Failed to update password. Please try again.'
      setPasswordError(errorMessage)
      addNotification({
        type: 'error',
        title: 'Failed to update password',
        message: errorMessage,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <div className="flex justify-center mb-8">
        <Icon icon="mdi:lock" className="w-6 h-6 text-gray-800" />
      </div>
      
      <AuthHeader
        title="Set new password"
        subtitle="Your new password must be different to previously used passwords."
      />

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Input
          id="password"
          type="password"
          label="Password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            setPasswordError('')
          }}
          required
        />

        <Input
          id="confirmPassword"
          type="password"
          label="Confirm password"
          placeholder="Confirm your password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value)
            setPasswordError('')
          }}
          required
          error={passwordError}
        />

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Icon 
              icon={hasMinLength ? "mdi:check-circle" : "mdi:circle-outline"} 
              className={`w-4 h-4 ${hasMinLength ? 'text-green-500' : 'text-gray-400'}`} 
            />
            <span>Must be at least 8 characters</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Icon 
              icon={hasSpecialChar ? "mdi:check-circle" : "mdi:circle-outline"} 
              className={`w-4 h-4 ${hasSpecialChar ? 'text-green-500' : 'text-gray-400'}`} 
            />
            <span>Must contain one special character</span>
          </div>
        </div>

        <Button type="submit" disabled={isSubmitting || !userId || !secret}>
          {isSubmitting ? 'Resetting password...' : 'Reset password'}
        </Button>
      </form>

      <div className="mt-8 text-center">
        <Link to="/login" className="inline-flex items-center gap-2 text-brand-blue no-underline font-medium text-[0.9rem] transition-colors hover:text-blue-700">
          <span className="text-base">←</span>
          Back to log in
        </Link>
      </div>
    </AuthLayout>
  )
}

export default PasswordReset
