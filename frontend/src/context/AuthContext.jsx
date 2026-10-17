import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import axiosInstance from '../api/axiosInstance'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const response = await axiosInstance.get('/users/me')

      if (response.data?.success && response.data?.data) {
        setUser(response.data.data)
        return response.data.data
      }

      setUser(null)
      return null
    } catch {
      setUser(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  const login = async (email, password) => {
    const response = await axiosInstance.post('/users/login', {
      email: email.trim().toLowerCase(),
      password,
    })

    if (!response.data?.success || !response.data?.data) {
      throw new Error(response.data?.message || 'Login failed')
    }

    const currentUser = response.data.data
    setUser(currentUser)

    return currentUser
  }

  const logout = async () => {
    try {
      await axiosInstance.post('/users/logout')
    } finally {
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}
