import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaUser, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validate inputs
    if (!email || !password) {
      setError('Please enter both email and password')
      setLoading(false)
      return
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    // Simulate API call
    try {
      // For demo purposes, accept any email/password combination
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Store user session (demo only - in production, use proper auth)
      localStorage.setItem('isAuthenticated', 'true')
      localStorage.setItem('userEmail', email)
      
      // Redirect to home
      navigate('/')
    } catch {
      setError('Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          {/* Logo & Title */}
          <div className="login-header">
            <div className="login-logo-container">
              <div className="login-logo-circle">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2L2 7L12 12L22 7L12 2Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M2 17L12 22L22 17"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M2 12L12 17L22 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
            <h1>Welcome Back</h1>
            <p>Sign in to continue your learning journey</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="login-form">
            {/* Email Input */}
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-wrapper">
                <FaUser className="input-icon" />
                <input
                  type="email"
                  id="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <FaLock className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn-primary login-button"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            {/* Forgot Password Link */}
            <div className="login-footer">
              <a href="#" className="forgot-password">
                Forgot password?
              </a>
              <p className="signup-link">
                Don't have an account? <a href="#" className="accent-link">Sign up</a>
              </p>
            </div>
          </form>

          {/* Demo Credentials Info */}
          <div className="demo-info">
            <p style={{ fontSize: '14px', color: 'var(--muted)', textAlign: 'center', marginTop: '20px' }}>
              <strong>Demo:</strong> Enter any email and password (6+ characters) to continue
            </p>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="login-decoration">
          <div className="decoration-circle decoration-circle-1"></div>
          <div className="decoration-circle decoration-circle-2"></div>
          <div className="decoration-circle decoration-circle-3"></div>
        </div>
      </div>
    </div>
  )
}
