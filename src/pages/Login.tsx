import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { FaEnvelope, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuth()

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

    // Call real API
    try {
      await login(email, password)
      // Redirect to home after successful login
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          {/* Logo & Title */}
          <div className="auth-header">
            <div className="auth-logo-wrapper">
              <div className="auth-logo-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="3" width="18" height="4" rx="1" fill="currentColor" opacity="0.9"/>
                  <rect x="3" y="10" width="18" height="4" rx="1" fill="currentColor" opacity="0.7" transform="translate(0, 0)"/>
                  <rect x="3" y="17" width="18" height="4" rx="1" fill="currentColor" opacity="0.5" transform="translate(0, 0)"/>
                </svg>
              </div>
            </div>
            <h1 className="auth-title">Welcome Back</h1>
            <p className="auth-subtitle">Sign in to continue your learning journey</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="auth-form">
            {/* Email Input */}
            <div className="form-field">
              <label htmlFor="email" className="form-label">Email Address</label>
              <div className="form-input-wrapper">
                <FaEnvelope className="form-input-icon" />
                <input
                  type="email"
                  id="email"
                  className="form-input"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="form-field">
              <label htmlFor="password" className="form-label">Password</label>
              <div className="form-input-wrapper">
                <FaLock className="form-input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  className="form-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="form-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="form-error">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="auth-submit-button"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            {/* Footer Links */}
            <div className="auth-footer">
              <a href="#" className="auth-link-secondary">
                Forgot password?
              </a>
              <p className="auth-footer-text">
                Don't have an account? <Link to="/register" className="auth-link-primary">Sign up</Link>
              </p>
            </div>
          </form>
        </div>

        {/* Background Decoration */}
        <div className="auth-background">
          <div className="auth-bg-circle auth-bg-circle-1"></div>
          <div className="auth-bg-circle auth-bg-circle-2"></div>
          <div className="auth-bg-circle auth-bg-circle-3"></div>
        </div>
      </div>
    </div>
  )
}
