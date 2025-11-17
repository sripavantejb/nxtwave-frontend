import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
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

  // Clear all user-specific localStorage data
  const clearUserData = () => {
    // Clear flashcard progress
    localStorage.removeItem('nxtquiz_flashcardProgress')
    // Clear flashcard session accuracy
    localStorage.removeItem('flashcardSessionAccuracy')
    // Clear quiz results
    localStorage.removeItem('nxtquiz_lastResults')
    // Clear flashcard attempt flags
    localStorage.removeItem('hasAttemptedFlashcard')
    localStorage.removeItem('batchCompletionTime')
    localStorage.removeItem('dayShiftCompleted')
    localStorage.removeItem('dayShiftCompletedTime')
    // Clear all quiz storage (using pattern matching for all quiz-related keys)
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.startsWith('nxtquiz_') || key.startsWith('guidelines_accepted_'))) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
  }

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
      // Token is invalid, clear it and all user data
      clearUserData()
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
      // Clear previous user's data before logging in
      clearUserData()
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
      // Clear previous user's data before registering
      clearUserData()
      const response = await apiRegister(name, email, password)
      localStorage.setItem('authToken', response.token)
      setToken(response.token)
      setUser(response.user)
    } catch (error) {
      throw error
    }
  }

  const logout = () => {
    // Clear user data on logout
    clearUserData()
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

// Helper function to get JWT token from localStorage
export function getAuthToken(): string | null {
  return localStorage.getItem('authToken') || localStorage.getItem('token') || null
}

