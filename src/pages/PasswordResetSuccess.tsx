import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { AuthLayout, Button } from '../components'

const PasswordResetSuccess = () => {
  const navigate = useNavigate()

  const handleContinue = () => {
    navigate('/login')
  }

  return (
    <AuthLayout>
      <div className="text-center">
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 rounded-full border-2 border-gray-300 flex items-center justify-center bg-white">
            <Icon icon="mdi:check" className="w-8 h-8 text-gray-800" />
          </div>
        </div>
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 m-0">Password reset</h1>
          <p className="text-[0.95rem] text-gray-500 m-0">
            Your password has been successfully reset. Click below to log in magically.
          </p>
        </div>

        <div className="mb-8">
          <Button type="button" onClick={handleContinue}>
            Continue
          </Button>
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

export default PasswordResetSuccess

