import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout, Logo, AuthHeader, Input, Checkbox, Button } from '../components'

const Login = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle login logic here
    console.log('Login attempt:', { email, password, rememberMe })
    // Navigate to dashboard after successful login
    navigate('/dashboard')
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

        <Button type="submit">
          Sign in
        </Button>
      </form>
    </AuthLayout>
  )
}

export default Login
