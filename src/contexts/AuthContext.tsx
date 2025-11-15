import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { login as apiLogin, register as apiRegister, getProfile, logout as apiLogout, type User } from '../api/client'

interface AuthContextType {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Load token from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('authToken') || localStorage.getItem('token')
    if (storedToken) {
      setToken(storedToken)
      // Verify token by fetching profile
      checkAuthWithToken(storedToken)
    } else {
      setLoading(false)
    }
  }, [])

  const checkAuthWithToken = async (authToken: string) => {
    try {
      const profile = await getProfile(authToken)
      setUser({
        userId: profile.userId,
        name: profile.name,
        email: profile.email
      })
      setToken(authToken)
    } catch (error) {
      // Token is invalid, clear it
      localStorage.removeItem('authToken')
      localStorage.removeItem('token')
      setToken(null)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const response = await apiLogin(email, password)
      localStorage.setItem('authToken', response.token)
      setToken(response.token)
      setUser(response.user)
    } catch (error) {
      throw error
    }
  }

  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await apiRegister(name, email, password)
      localStorage.setItem('authToken', response.token)
      setToken(response.token)
      setUser(response.user)
    } catch (error) {
      throw error
    }
  }

  const logout = () => {
    apiLogout()
    setToken(null)
    setUser(null)
  }

  const checkAuth = async () => {
    const storedToken = localStorage.getItem('authToken') || localStorage.getItem('token')
    if (storedToken) {
      await checkAuthWithToken(storedToken)
    } else {
      setLoading(false)
    }
  }

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    loading,
    login,
    register,
    logout,
    checkAuth
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

