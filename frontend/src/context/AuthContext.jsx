import { createContext, useContext, useEffect, useState } from 'react'
import axiosInstance from '../api/axiosInstance'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [permissions, setPermissions] = useState({})
  const [loading, setLoading] = useState(true)

  const loadPermissions = async (currentUser = user) => {
    if (!currentUser) {
      setPermissions({})
      return {}
    }

    if (currentUser.role === 'SuperAdmin') {
      setPermissions(null)
      return null
    }

    try {
      const response = await axiosInstance.get('/erp/my-permissions')

      if (!response.data?.success) {
        setPermissions({})
        return {}
      }

      const effectivePermissions = response.data.permissions ?? {}
      setPermissions(effectivePermissions)
      return effectivePermissions
    } catch (error) {
      setPermissions({})
      return {}
    }
  }

  const refreshUser = async () => {
    try {
      const response = await axiosInstance.get('/superadmin/me')

      if (!response.data?.success || !response.data?.user) {
        setUser(null)
        setPermissions({})
        return null
      }

      const currentUser = response.data.user
      setUser(currentUser)
      await loadPermissions(currentUser)

      return currentUser
    } catch (error) {
      setUser(null)
      setPermissions({})
      return null
    }
  }

  const login = async (email, password) => {
    const credentials = {
      email: email.trim().toLowerCase(),
      password,
    }

    let loggedInUser

    try {
      const response = await axiosInstance.post('/superadmin/login', credentials)

      if (!response.data?.success || !response.data?.user) {
        throw new Error(response.data?.message || 'Login failed.')
      }

      loggedInUser = response.data.user
    } catch (adminError) {
      const status = adminError.response?.status

      if (status && ![401, 403].includes(status)) {
        throw new Error(adminError.response?.data?.message || 'Unable to sign in.')
      }

      try {
        const response = await axiosInstance.post('/erp/auth/login', credentials)

        if (!response.data?.success || !response.data?.user) {
          throw new Error(response.data?.message || 'Invalid email or password.')
        }

        loggedInUser = response.data.user
      } catch (employeeError) {
        throw new Error(employeeError.response?.data?.message || employeeError.message || 'Invalid email or password.')
      }
    }

    setUser(loggedInUser)
    await loadPermissions(loggedInUser)

    return loggedInUser
  }

  const logout = async () => {
    try {
      await axiosInstance.post('/superadmin/logout')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
      setPermissions({})
    }
  }

  useEffect(() => {
    const restoreSession = async () => {
      try {
        await refreshUser()
      } finally {
        setLoading(false)
      }
    }

    restoreSession()
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        loading,
        login,
        logout,
        refreshUser,
        loadPermissions,
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
