import { createContext, useContext, useEffect, useState } from 'react'
import axiosInstance from '../api/axiosInstance'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = async () => {
    try {
      const response = await axiosInstance.get('/superadmin/me')

      if (!response.data?.success || !response.data?.user) {
        setUser(null)
        return null
      }

      setUser(response.data.user)
      return response.data.user
    } catch (error) {
      setUser(null)
      return null
    }
  }

  const login = async (email, password) => {
    const response = await axiosInstance.post('/superadmin/login', {
      email: email.trim().toLowerCase(),
      password,
    })

    if (!response.data?.success || !response.data?.user) {
      throw new Error(response.data?.message || 'Login failed')
    }

    setUser(response.data.user)
    return response.data.user
  }

  const logout = () => {
    setUser(null)
  }

  useEffect(() => {
    const restoreSession = async () => {
      await refreshUser()
      setLoading(false)
    }

    restoreSession()
  }, [])

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
