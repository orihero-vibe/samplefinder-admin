import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { AuthLayout, AuthHeader, Input, Button } from '../components'
import { useAuthStore } from '../stores/authStore'
import { useNotificationStore } from '../stores/notificationStore'

const ForgotPassword = () => {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()
  const { resetPassword } = useAuthStore()
  const { addNotification } = useNotificationStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await resetPassword(email)
      addNotification({
        type: 'success',
        title: 'Reset email sent',
        message: 'Please check your email for password reset instructions.',
      })
      navigate('/email-confirmation')
    } catch (err: unknown) {
      addNotification({
        type: 'error',
        title: 'Failed to send reset email',
        message: (err as Error).message || 'Please try again later.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <div className="flex justify-center mb-8">
        <Icon icon="mdi:key" className="w-6 h-6 text-gray-400" />
      </div>
      
      <AuthHeader
        title="Forgot password?"
        subtitle="No worries, we'll send you reset instructions."
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

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Sending...' : 'Reset password'}
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

export default ForgotPassword
