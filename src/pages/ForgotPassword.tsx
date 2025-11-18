import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { AuthLayout, AuthHeader, Input, Button } from '../components'

const ForgotPassword = () => {
  const [email, setEmail] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle forgot password logic here
    console.log('Forgot password request for:', email)
    navigate('/email-confirmation')
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

        <Button type="submit">
          Reset password
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
