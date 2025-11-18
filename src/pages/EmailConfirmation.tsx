import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { AuthLayout, Button } from '../components'

const EmailConfirmation = () => {
  const navigate = useNavigate()

  const handleOpenEmailApp = () => {
    navigate('/password-reset')
  }

  return (
    <AuthLayout>
      <div className="text-center">
        <div className="flex justify-center mb-8">
          <Icon icon="mdi:email-outline" className="w-20 h-20 text-gray-300" />
        </div>
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 m-0">Check your email</h1>
          <p className="text-[0.95rem] text-gray-500 m-0">
            We sent a password reset link to <strong className="text-gray-800 font-semibold">olivia@untitledui.com</strong>
          </p>
        </div>

        <div className="mb-8">
          <Button type="button" onClick={handleOpenEmailApp}>
            Open email app
          </Button>
        </div>

        <div className="mt-8">
          <p className="text-[0.9rem] text-gray-500 m-0">
            Didn't receive the email?{' '}
            <Link to="/forgot-password" className="text-brand-blue no-underline font-medium transition-colors hover:text-blue-700 hover:underline">
              Click to resend
            </Link>
          </p>
        </div>
      </div>

      <div className="mt-8 text-center">
        <Link to="/login" className="inline-flex items-center gap-2 text-brand-blue no-underline font-medium text-[0.9rem] transition-colors hover:text-blue-700">
          <span className="text-base">←</span>
          Back to log in
        </Link>
      </div>
    </AuthLayout>
  )
}

export default EmailConfirmation
