import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { User } from '@/lib/api'
import { signin, signup, getCurrentUser } from '@/lib/api'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, firstName?: string, lastName?: string, phone?: string) => Promise<void>
  logout: () => void
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

const TOKEN_KEY = 'akwaluzto_token'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadUser = useCallback(async (token: string) => {
    try {
      const { user } = await getCurrentUser(token)
      setUser(user)
      return true
    } catch {
      localStorage.removeItem(TOKEN_KEY)
      setUser(null)
      return false
    }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) {
      loadUser(token).finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [loadUser])

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const { token, user } = await signin(email, password)
      localStorage.setItem(TOKEN_KEY, token)
      setUser(user)
    } catch (err: any) {
      setError(err?.message || 'Login failed')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const register = useCallback(async (email: string, password: string, firstName?: string, lastName?: string, phone?: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const { token, user } = await signup(email, password, firstName, lastName, phone)
      // token is null in production when email already exists (prevents enumeration)
      if (!token || !user) {
        throw new Error('Email already registered')
      }
      localStorage.setItem(TOKEN_KEY, token)
      setUser(user)
    } catch (err: any) {
      setError(err?.message || 'Registration failed')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
    setError(null)
  }, [])

  const clearError = useCallback(() => setError(null), [])

  const isAuthenticated = !!user

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        error,
        login,
        register,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}
