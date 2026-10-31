import { createContext, useContext, useEffect, useRef, useState } from 'react'
import axiosInstance from '../api/axiosInstance'

const AuthContext = createContext(null)

export function hasPermission(permissions, requiredPermission) {
  // SuperAdmin has full access
  if (permissions === null) return true

  if (!permissions || !requiredPermission) return false

  return Object.values(permissions).some((sectionPermissions) => {
    return Array.isArray(sectionPermissions) && sectionPermissions.includes(requiredPermission)
  })
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [permissions, setPermissions] = useState({})
  const [loading, setLoading] = useState(true)

  const [permissionsLoading, setPermissionsLoading] = useState(true)
  const [permissionsError, setPermissionsError] = useState('')

  const loadPermissions = async (currentUser = user) => {
    if (!currentUser) {
      setPermissions({})
      setPermissionsError('')
      setPermissionsLoading(false)
      return {}
    }

    if (currentUser.role === 'SuperAdmin') {
      setPermissions(null)
      setPermissionsError('')
      setPermissionsLoading(false)
      return null
    }

    setPermissionsLoading(true)
    setPermissionsError('')

    try {
      const response = await axiosInstance.get('/erp/my-permissions')

      if (!response.data?.success || !response.data?.permissions) {
        throw new Error(response.data?.message || 'Unable to load permissions.')
      }

      const effectivePermissions = response.data.permissions

      setPermissions(effectivePermissions)

      return effectivePermissions
    } catch (error) {
      console.error('Permission loading failed:', error)

      setPermissions({})
      setPermissionsError(error.response?.data?.message || error.message || 'Unable to load permissions.')

      return {}
    } finally {
      setPermissionsLoading(false)
    }
  }

  const refreshUser = async () => {
    const endpoints = ['/superadmin/me']

    for (const endpoint of endpoints) {
      try {
        const response = await axiosInstance.get(endpoint)

        if (response.data?.success && response.data?.user) {
          const currentUser = response.data.user

          setUser(currentUser)
          await loadPermissions(currentUser)

          return currentUser
        }
      } catch (error) {
        const status = error.response?.status

        // Try the next endpoint if this session type is not supported.
        if (status && ![401, 403, 404].includes(status)) {
          console.error(`Session restore failed at ${endpoint}:`, error)
        }
      }
    }

    setUser(null)
    setPermissions({})
    return null
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
      setPermissionsError('')
      setPermissionsLoading(false)
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

  const permissionsIntervalRef = useRef(null)

  useEffect(() => {
    if (loading || !user || user.role === 'SuperAdmin') {
      return
    }

    const refreshPermissions = async () => {
      try {
        const response = await axiosInstance.get('/erp/my-permissions')

        if (response.data?.success) {
          setPermissions(response.data.permissions ?? {})
        }
      } catch (error) {
        console.error('Unable to refresh permissions:', error)
      }
    }

    permissionsIntervalRef.current = setInterval(refreshPermissions, 10000)

    return () => {
      if (permissionsIntervalRef.current) {
        clearInterval(permissionsIntervalRef.current)
        permissionsIntervalRef.current = null
      }
    }
  }, [loading, user?._id, user?.role])

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        permissionsLoading,
        permissionsError,
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
