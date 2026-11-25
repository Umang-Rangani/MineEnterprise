import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  UserRound,
  Mail,
  Phone,
  LockKeyhole,
  Eye,
  EyeOff,
  ShieldCheck,
  Users,
  Package,
  ShoppingCart,
  Warehouse,
  FileText,
  Settings,
  Check,
  Save,
  LoaderCircle,
  Search,
  Info,
  CircleCheck,
  Camera,
  X,
  KeyRound,
  Send,
  ShieldCheck as ShieldCheckIcon,
} from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import Loading from '../Loading/Loading'
import { hasPermission, useAuth } from '../../context/AuthContext'

const sectionIcons = {
  Employee: Users,
  Employees: Users,
  Role: ShieldCheck,
  Roles: ShieldCheck,
  Product: Package,
  Products: Package,
  Inventory: Warehouse,
  Warehouse,
  Sales: ShoppingCart,
  Order: ShoppingCart,
  Orders: ShoppingCart,
  Purchase: ShoppingCart,
  Supplier: Users,
  Customer: Users,
  Report: FileText,
  Reports: FileText,
  Setting: Settings,
  Settings,
}

const actionLabels = {
  LIST: 'View list',
  VIEW: 'View details',
  CREATE: 'Create',
  UPDATE: 'Edit',
  EDIT: 'Edit',
  DELETE: 'Delete',
  READ: 'View',
  MANAGE: 'Manage',
  APPROVE: 'Approve',
  EXPORT: 'Export',
  IMPORT: 'Import',
}

const actionDescriptions = {
  LIST: 'View records and lists',
  VIEW: 'Open and view record details',
  CREATE: 'Create new records',
  UPDATE: 'Edit existing records',
  EDIT: 'Edit existing records',
  DELETE: 'Delete records',
  READ: 'View information',
  MANAGE: 'Manage this section',
  APPROVE: 'Approve pending requests',
  EXPORT: 'Export data',
  IMPORT: 'Import data',
}

const MAX_PHOTO_SIZE = 4 * 1024 * 1024
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']

function getActionName(permission) {
  const parts = String(permission).split(/[:.]/)
  return parts[parts.length - 1] || permission
}

function humanize(value) {
  return String(value || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_:-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function permissionLabel(permission) {
  const action = getActionName(permission).replace(/[_-]+/g, ' ').trim().toUpperCase()

  return actionLabels[action] || humanize(action)
}

function permissionDescription(permission) {
  const action = getActionName(permission).replace(/[_-]+/g, ' ').trim().toUpperCase()

  return actionDescriptions[action] || `Allow ${permissionLabel(permission).toLowerCase()} access`
}

function getRoleKey(role) {
  return `${role.type}:${role.customRoleId || role._id || role.name}`
}

function getRolePermissions(selectedRoles, availableRoles) {
  const permissions = new Set()

  selectedRoles.forEach((selectedRole) => {
    const matchedRole = availableRoles.find((role) => role.type === selectedRole.type && (role.type === 'Custom' ? String(role._id) === String(selectedRole.customRoleId) : role.name === selectedRole.name))

    if (!matchedRole) return

    if (Array.isArray(matchedRole.permissions)) {
      matchedRole.permissions.forEach((permission) => permissions.add(permission))
    } else if (matchedRole.permissions) {
      Object.values(matchedRole.permissions).forEach((sectionPermissions) => {
        if (Array.isArray(sectionPermissions)) {
          sectionPermissions.forEach((permission) => permissions.add(permission))
        }
      })
    }
  })

  return [...permissions]
}

function toAssignableRole(role) {
  return {
    type: role.type,
    name: role.name,
    ...(role.type === 'Custom' ? { customRoleId: role._id } : {}),
  }
}

export default function EmployeeForm() {
  const navigate = useNavigate()
  const { id } = useParams()

  const isEdit = Boolean(id)

  const auth = useAuth()
  const { permissions } = auth

  const currentUser = auth.user || auth.currentUser || auth.employee
  const currentUserId = currentUser?._id || currentUser?.id || currentUser?.userId

  const isSelfEmployee = Boolean(isEdit && currentUserId && String(currentUserId) === String(id))

  const canViewEmployee = hasPermission(permissions, 'employee:view')
  const canCreateEmployee = hasPermission(permissions, 'employee:create')
  const canUpdateEmployee = hasPermission(permissions, 'employee:update')
  const canAssignRoles = hasPermission(permissions, 'employee:assign-role')
  const canManagePermissions = hasPermission(permissions, 'employee:manage-permissions')

  const canResetEmployeePassword = isEdit && !isSelfEmployee && hasPermission(permissions, 'employee:reset-password')

  const EMPLOYEE_UPDATE = 'employee:update'
  const EMPLOYEE_ASSIGN_ROLE = 'employee:assign-role'
  const EMPLOYEE_MANAGE_PERMISSIONS = 'employee:manage-permissions'

  const dependentPermissions = [EMPLOYEE_ASSIGN_ROLE, EMPLOYEE_MANAGE_PERMISSIONS]

  const canSubmitForm = isEdit ? canUpdateEmployee : canCreateEmployee

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    status: 'Active',
  })

  const [availableRoles, setAvailableRoles] = useState([])
  const [availablePermissions, setAvailablePermissions] = useState([])
  const [selectedRoles, setSelectedRoles] = useState([])
  const [selectedPermissions, setSelectedPermissions] = useState([])
  const [permissionSearch, setPermissionSearch] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})

  // Profile photo states
  const [currentPhoto, setCurrentPhoto] = useState('')
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [photoError, setPhotoError] = useState('')
  const [photoLoadError, setPhotoLoadError] = useState(false)

  // Employee password reset states
  const [otpSent, setOtpSent] = useState(false)
  const [otpVerified, setOtpVerified] = useState(false)
  const [resetOtp, setResetOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [showConfirmResetPassword, setShowConfirmResetPassword] = useState(false)

  const showToast = (type, message, duration = 3000) => {
    setToast({
      id: Date.now(),
      type,
      message,
      duration,
    })
  }

  const closeToast = () => {
    setToast(null)
  }

  // Convert stored upload path into a full backend image URL.
  const getPhotoUrl = (photoPath) => {
    if (!photoPath || typeof photoPath !== 'string') return ''

    const path = photoPath.trim()

    if (!path) return ''

    if (/^https?:\/\//i.test(path)) {
      return path
    }

    try {
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
      const backendOrigin = new URL(apiBaseUrl).origin
      const normalizedPath = path.startsWith('/') ? path : `/${path}`

      return `${backendOrigin}${normalizedPath}`
    } catch {
      return ''
    }
  }

  // Handle profile photo selection.
  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0]

    if (!file) return

    setPhotoError('')
    setPhotoLoadError(false)

    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      setPhotoError('Only JPG, PNG and WEBP images are allowed.')
      event.target.value = ''
      return
    }

    if (file.size > MAX_PHOTO_SIZE) {
      setPhotoError('Profile photo must be smaller than 4 MB.')
      event.target.value = ''
      return
    }

    setSelectedPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  // Remove newly selected photo and restore the existing photo preview.
  const clearSelectedPhoto = () => {
    setSelectedPhoto(null)
    setPhotoPreview('')
    setPhotoError('')
    setPhotoLoadError(false)

    const fileInput = document.getElementById('employee-profile-photo')

    if (fileInput) {
      fileInput.value = ''
    }
  }

  // Upload selected photo and return its saved path.
  const uploadEmployeePhoto = async (employeeId) => {
    if (!selectedPhoto) return null

    const formData = new FormData()
    formData.append('file', selectedPhoto)

    const response = await axiosInstance.post(`/erp/employees/${employeeId}/upload-photo`, formData)

    const filePath = response.data.filePath

    if (!filePath) {
      throw new Error('Photo upload succeeded but the server did not return a file path.')
    }

    return filePath
  }

  // Revoke temporary preview URLs when they are replaced or component unmounts.
  useEffect(() => {
    if (!photoPreview || !photoPreview.startsWith('blob:')) return

    return () => {
      URL.revokeObjectURL(photoPreview)
    }
  }, [photoPreview])

  useEffect(() => {
    document.title = isEdit ? 'Edit Employee | MineERP' : 'Add Employee | MineERP'
  }, [isEdit])

  useEffect(() => {
    let cancelled = false

    async function loadFormData() {
      setLoading(true)

      try {
        const rolesResponse = await axiosInstance.get('/erp/roles', {
          params: {
            type: 'All',
            page: 1,
            limit: 100,
          },
        })

        const roleData = rolesResponse.data

        const roles = Array.isArray(roleData.roles) ? roleData.roles : []
        const permissions = Array.isArray(roleData.availablePermissions) ? roleData.availablePermissions : []

        if (cancelled) return

        setAvailableRoles(roles)
        setAvailablePermissions(permissions)

        if (isEdit) {
          if (!id || id === 'new') {
            throw new Error('A valid employee ID is required to edit an employee.')
          }

          const employeeResponse = await axiosInstance.get(`/erp/employees/${id}`)

          if (cancelled) return

          const responseData = employeeResponse.data
          const employee = responseData.employee || responseData

          setForm({
            name: employee.name || '',
            email: employee.email || '',
            phone: employee.phone || '',
            password: '',
            status: employee.status || 'Active',
          })

          setCurrentPhoto(employee.profilePhoto || '')
          setSelectedPhoto(null)
          setPhotoPreview('')
          setPhotoError('')
          setPhotoLoadError(false)

          const employeeRoles = Array.isArray(employee.roles)
            ? employee.roles.map((role) => ({
                type: role.type,
                name: role.name,
                ...(role.customRoleId ? { customRoleId: role.customRoleId } : {}),
              }))
            : []

          setSelectedRoles(employeeRoles)

          const rolePermissions = getRolePermissions(employeeRoles, roles)

          const initialPermissions = Array.isArray(employee.permissionOverrides) ? employee.permissionOverrides : rolePermissions

          const normalizedPermissions = new Set(initialPermissions)

          if (dependentPermissions.some((permission) => normalizedPermissions.has(permission))) {
            normalizedPermissions.add(EMPLOYEE_UPDATE)
          }

          setSelectedPermissions([...normalizedPermissions])
        }
      } catch (requestError) {
        if (!cancelled) {
          showToast('error', requestError.response?.data?.message || requestError.message || 'Unable to load employee form data.', 5000)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadFormData()

    return () => {
      cancelled = true
    }
  }, [id, isEdit])

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))

    setFieldErrors((current) => ({
      ...current,
      [field]: '',
    }))
  }

  const toggleRole = (role) => {
    const roleKey = getRoleKey(role)

    const exists = selectedRoles.some((selectedRole) => getRoleKey(selectedRole) === roleKey)

    const nextRoles = exists ? selectedRoles.filter((selectedRole) => getRoleKey(selectedRole) !== roleKey) : [...selectedRoles, toAssignableRole(role)]

    setSelectedRoles(nextRoles)
    setSelectedPermissions(getRolePermissions(nextRoles, availableRoles))

    setFieldErrors((current) => ({
      ...current,
      roles: '',
    }))
  }

  const togglePermission = (permission) => {
    setSelectedPermissions((current) => {
      const next = new Set(current)

      if (next.has(permission)) {
        next.delete(permission)

        if (permission === EMPLOYEE_UPDATE) {
          dependentPermissions.forEach((item) => next.delete(item))
        }
      } else {
        next.add(permission)

        if (dependentPermissions.includes(permission)) {
          next.add(EMPLOYEE_UPDATE)
        }
      }

      return [...next]
    })
  }

  const validateForm = () => {
    const errors = {}

    if (!form.name.trim()) {
      errors.name = 'Employee name is required.'
    }

    if (!form.email.trim()) {
      errors.email = 'Email is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = 'Enter a valid email address.'
    }

    if (!isEdit && form.password.length < 8) {
      errors.password = 'Password must contain at least 8 characters.'
    }

    if (!isEdit && form.password && form.password.length < 8) {
      errors.password = 'Password must contain at least 8 characters.'
    }

    if (selectedRoles.length === 0) {
      errors.roles = 'Select at least one role.'
    }

    setFieldErrors(errors)

    if (Object.keys(errors).length > 0) {
      showToast('warning', 'Please check the required fields.', 3500)
      return false
    }

    return true
  }

  // Request OTP for the selected employee.
  const handleRequestResetOtp = async () => {
    if (!id || resetLoading || !canResetEmployeePassword) return

    setResetLoading(true)

    try {
      await axiosInstance.post(`/erp/employees/${id}/password-reset/request-otp`)

      setOtpSent(true)
      setOtpVerified(false)
      setResetOtp('')
      setNewPassword('')
      setConfirmPassword('')

      showToast('success', 'Password reset OTP sent to employee email.')
    } catch (error) {
      showToast('error', error.response?.data?.message || 'Unable to send password reset OTP.', 5000)
    } finally {
      setResetLoading(false)
    }
  }

  // Verify the received OTP.
  const handleVerifyResetOtp = async () => {
    if (!id || resetLoading || !canResetEmployeePassword) return

    if (!/^\d{6}$/.test(resetOtp)) {
      showToast('warning', 'Enter a valid 6-digit OTP.')
      return
    }

    setResetLoading(true)

    try {
      await axiosInstance.post(`/erp/employees/${id}/password-reset/verify-otp`, {
        otp: resetOtp,
      })

      setOtpVerified(true)
      showToast('success', 'OTP verified successfully.')
    } catch (error) {
      showToast('error', error.response?.data?.message || 'Invalid or expired OTP.', 5000)
    } finally {
      setResetLoading(false)
    }
  }

  // Update the employee password after OTP verification.
  const handleUpdateEmployeePassword = async () => {
    if (!id || resetLoading || !otpVerified || !canResetEmployeePassword) return

    if (newPassword.length < 8) {
      showToast('warning', 'Password must contain at least 8 characters.')
      return
    }

    if (newPassword !== confirmPassword) {
      showToast('warning', 'New password and confirm password do not match.')
      return
    }

    setResetLoading(true)

    try {
      await axiosInstance.post(`/erp/employees/${id}/password-reset/update-password`, {
        newPassword,
        confirmPassword,
      })

      setOtpSent(false)
      setOtpVerified(false)
      setResetOtp('')
      setNewPassword('')
      setConfirmPassword('')
      setShowResetPassword(false)
      setShowConfirmResetPassword(false)

      showToast('success', 'Employee password reset successfully.')
    } catch (error) {
      showToast('error', error.response?.data?.message || 'Unable to reset employee password.', 5000)
    } finally {
      setResetLoading(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!canSubmitForm) {
      showToast('error', `You do not have permission to ${isEdit ? 'update' : 'create'} employees.`)
      return
    }

    if (saving) return
    if (!validateForm()) return

    if (photoError) {
      showToast('warning', 'Please select a valid profile photo.')
      return
    }

    setSaving(true)

    let uploadedPhotoPath = ''
    let photoEmployeeId = id || ''

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
      }

      if (canAssignRoles) {
        payload.roles = selectedRoles
      }

      if (canManagePermissions) {
        payload.permissionOverrides = selectedPermissions
      }

      if (isEdit) {
        payload.status = form.status

        // Upload a new photo only when the user selected one.
        if (selectedPhoto) {
          uploadedPhotoPath = await uploadEmployeePhoto(id)
          payload.profilePhoto = uploadedPhotoPath
        }

        await axiosInstance.patch(`/erp/employees/${id}`, payload)

        // Delete the old photo only after the new photo is saved.
        if (uploadedPhotoPath && currentPhoto && currentPhoto !== uploadedPhotoPath) {
          try {
            await axiosInstance.delete(`/erp/employees/${id}/delete-photo`, {
              data: {
                filePath: currentPhoto,
              },
            })
          } catch (deleteError) {
            console.error('Old employee photo cleanup failed:', deleteError)

            showToast('warning', 'Employee updated, but the old photo could not be deleted.', 5000)
          }
        }
      } else {
        payload.password = form.password
        payload.roles = selectedRoles
        payload.permissionOverrides = selectedPermissions

        const createResponse = await axiosInstance.post('/erp/employees', payload)

        const createdEmployee = createResponse.data.employee || createResponse.data.data?.employee || createResponse.data

        photoEmployeeId = createdEmployee._id || createdEmployee.id

        if (!photoEmployeeId) {
          throw new Error('Employee was created, but the server did not return an employee ID.')
        }

        // Upload photo after employee creation.
        if (selectedPhoto) {
          try {
            uploadedPhotoPath = await uploadEmployeePhoto(photoEmployeeId)

            await axiosInstance.patch(`/erp/employees/${photoEmployeeId}`, {
              profilePhoto: uploadedPhotoPath,
            })
          } catch (photoUploadError) {
            console.error('Employee photo upload/save failed:', photoUploadError)

            showToast('warning', 'Employee created successfully, but the profile photo could not be saved. You can try again from Edit Employee.', 6000)

            navigate('/company/employees', {
              state: {
                message: 'Employee created successfully. Profile photo upload/save failed.',
              },
            })

            return
          }
        }
      }

      navigate('/company/employees', {
        state: {
          message: isEdit ? 'Employee updated successfully.' : 'Employee created successfully.',
        },
      })
    } catch (error) {
      // If a newly uploaded photo was not saved, try to remove the unused file.
      if (uploadedPhotoPath && photoEmployeeId) {
        try {
          await axiosInstance.delete(`/erp/employees/${photoEmployeeId}/delete-photo`, {
            data: {
              filePath: uploadedPhotoPath,
            },
          })
        } catch (cleanupError) {
          console.error('Unused employee photo cleanup failed:', cleanupError)
        }
      }

      showToast('error', error.response?.data?.message || error.message || `Unable to ${isEdit ? 'update' : 'create'} employee.`, 5000)
    } finally {
      setSaving(false)
    }
  }

  const permissionSections = availablePermissions
    .map((section) => {
      const sectionName = humanize(section.section)
      const query = permissionSearch.trim().toLowerCase()

      const permissions = (section.permissions || []).filter((permission) => !query || permissionLabel(permission).toLowerCase().includes(query) || sectionName.toLowerCase().includes(query) || permission.toLowerCase().includes(query))

      return {
        name: sectionName,
        permissions,
      }
    })
    .filter((section) => section.permissions.length > 0)

  const allPermissionKeys = availablePermissions.flatMap((section) => section.permissions || [])

  const selectedCount = selectedPermissions.filter((permission) => allPermissionKeys.includes(permission)).length

  let items

  if (isEdit) {
    items = [
      { title: 'Employees', link: '/company/employees' },
      {
        title: form.name,
        link: `/company/employees/${id}`,
      },
      {
        title: 'Edit Employee',
        link: null,
      },
    ]
  } else {
    items = [
      { title: 'Employees', link: '/company/employees' },
      { title: 'Add Employee', link: null },
    ]
  }

  if (loading) {
    return (
      <div className="min-w-0 space-y-4 text-sm">
        <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="h-1 bg-erp-primary" />

          <div className="flex min-h-16 items-center px-4 sm:px-5">
            <BreadCrumb items={items} />
          </div>
        </section>

        <section className="relative min-h-[480px] overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex min-h-[480px] items-center justify-center">
            <Loading fullScreen={false} label={isEdit ? 'Loading employee details' : 'Preparing employee form'} description="Fetching employee information, roles and permissions..." className="!h-full min-h-[480px]" />
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {toast && <Toast toast={toast} onClose={closeToast} />}

      {/* Header */}
      <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        <div className="h-1 bg-erp-primary" />

        <div className="flex h-[calc(100%-4px)] min-w-0 items-center justify-between gap-3 px-4 sm:px-5">
          <div className="min-w-0 flex-1 overflow-hidden">
            <BreadCrumb items={items} />
          </div>

          {isEdit && canViewEmployee && (
            <button
              type="button"
              onClick={() => navigate(`/company/employees/${id}`)}
              title="View employee details"
              aria-label="View employee details"
              className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-erp-border bg-erp-surface px-3 text-xs font-semibold text-erp-primary transition hover:bg-erp-primary/5"
            >
              <Eye size={14} />
              <span>View</span>
            </button>
          )}
        </div>
      </section>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Personal Information */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
              <UserRound size={16} />
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900">Personal Information</h2>
              <p className="text-[11px] text-slate-500">Basic employee details</p>
            </div>
          </div>

          <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Full Name */}
            <div className="min-w-0 space-y-1">
              <label className="block text-xs font-semibold text-slate-700">Full Name *</label>

              <div className={`flex min-h-10 items-center gap-2 rounded-lg border bg-white px-2.5 ${fieldErrors.name ? 'border-red-400' : 'border-slate-200'}`}>
                <UserRound size={15} className="shrink-0 text-slate-400" />
                <input value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="Full name" autoComplete="name" className="w-full min-w-0 bg-transparent py-1.5 text-xs outline-none placeholder:text-slate-400" />
              </div>

              {fieldErrors.name && <p className="text-[11px] text-red-600">{fieldErrors.name}</p>}
            </div>

            {/* Email */}
            <div className="min-w-0 space-y-1">
              <label className="block text-xs font-semibold text-slate-700">Email Address *</label>

              <div className={`flex min-h-10 items-center gap-2 rounded-lg border bg-white px-2.5 ${fieldErrors.email ? 'border-red-400' : 'border-slate-200'}`}>
                <Mail size={15} className="shrink-0 text-slate-400" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField('email', event.target.value)}
                  placeholder="employee@company.com"
                  autoComplete="email"
                  className="w-full min-w-0 bg-transparent py-1.5 text-xs outline-none placeholder:text-slate-400"
                />
              </div>

              {fieldErrors.email && <p className="text-[11px] text-red-600">{fieldErrors.email}</p>}
            </div>

            {/* Phone */}
            <div className="min-w-0 space-y-1">
              <label className="block text-xs font-semibold text-slate-700">Phone Number</label>

              <div className="flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5">
                <Phone size={15} className="shrink-0 text-slate-400" />
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(event) => updateField('phone', event.target.value)}
                  placeholder="Phone number"
                  autoComplete="tel"
                  className="w-full min-w-0 bg-transparent py-1.5 text-xs outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Initial Password - Add Employee only */}
            {!isEdit && (
              <div className="min-w-0 space-y-1">
                <label className="block text-xs font-semibold text-slate-700">Password *</label>

                <div className={`flex min-h-10 items-center gap-2 rounded-lg border bg-white px-2.5 ${fieldErrors.password ? 'border-red-400' : 'border-slate-200'}`}>
                  <LockKeyhole size={15} className="shrink-0 text-slate-400" />

                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(event) => updateField('password', event.target.value)}
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                    className="w-full min-w-0 bg-transparent py-1.5 text-xs outline-none placeholder:text-slate-400"
                  />

                  <button type="button" onClick={() => setShowPassword((current) => !current)} className="shrink-0 text-slate-400 hover:text-slate-700" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>

                {fieldErrors.password && <p className="text-[11px] text-red-600">{fieldErrors.password}</p>}
              </div>
            )}

            {/* Profile Photo */}
            <div className="space-y-2 sm:col-span-2 lg:col-span-4">
              <label className="block text-xs font-semibold text-slate-700">
                Profile Photo
                <span className="ml-1 font-normal text-slate-400">(Optional)</span>
              </label>

              <div className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Selected employee profile" className="h-full w-full object-cover" />
                  ) : currentPhoto && !photoLoadError ? (
                    <img src={getPhotoUrl(currentPhoto)} alt="Employee profile" className="h-full w-full object-cover" onError={() => setPhotoLoadError(true)} />
                  ) : (
                    <UserRound size={30} className="text-slate-300" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-erp-primary bg-white px-3 text-xs font-semibold text-erp-primary transition hover:bg-erp-primary/5">
                      <Camera size={15} />
                      {selectedPhoto ? 'Change Selected Photo' : currentPhoto ? 'Change Photo' : 'Upload Photo'}

                      <input id="employee-profile-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} className="hidden" />
                    </label>

                    {selectedPhoto && (
                      <button type="button" onClick={clearSelectedPhoto} className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-100">
                        <X size={14} />
                        Remove Selection
                      </button>
                    )}
                  </div>

                  <p className="mt-2 text-[11px] text-slate-500">JPG, PNG or WEBP. Maximum file size 4 MB.</p>

                  {selectedPhoto && <p className="mt-1 truncate text-[11px] font-medium text-emerald-700">Selected: {selectedPhoto.name}</p>}

                  {photoError && <p className="mt-1 text-[11px] text-red-600">{photoError}</p>}

                  {photoLoadError && currentPhoto && !selectedPhoto && <p className="mt-1 text-[11px] text-amber-700">Existing profile photo could not be loaded. You can upload a new one.</p>}
                </div>
              </div>
            </div>

            {/* Account Status */}
            {isEdit && (
              <div className="space-y-1 sm:col-span-2 lg:col-span-4">
                <label className="block text-xs font-semibold text-slate-700">Account Status</label>

                <div className="flex gap-2">
                  {['Active', 'Inactive'].map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => updateField('status', status)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                        form.status === status ? (status === 'Active' ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-amber-300 bg-amber-50 text-amber-700') : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Employee Password Reset */}
        {canResetEmployeePassword && (
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                <KeyRound size={16} />
              </div>

              <div>
                <h2 className="text-sm font-bold text-slate-900">Employee Password Reset</h2>
                <p className="text-[11px] text-slate-500">Reset this employee's password using email OTP verification</p>
              </div>
            </div>

            <div className="space-y-3 p-3">
              <div className="rounded-lg border border-blue-100 bg-blue-50/70 p-3">
                <div className="flex items-start gap-2">
                  <Info size={15} className="mt-0.5 shrink-0 text-blue-700" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-blue-900">OTP will be sent to the employee's registered email.</p>
                    <p className="mt-1 break-all text-xs text-blue-800">{form.email || 'Employee email not available'}</p>
                  </div>
                </div>
              </div>

              {!otpSent ? (
                <button
                  type="button"
                  onClick={handleRequestResetOtp}
                  disabled={resetLoading || !form.email}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-erp-primary px-4 text-xs font-semibold text-white transition hover:bg-erp-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {resetLoading ? <LoaderCircle size={15} className="animate-spin" /> : <Send size={14} />}
                  {resetLoading ? 'Sending OTP...' : 'Send Password Reset OTP'}
                </button>
              ) : (
                <div className="space-y-3">
                  {!otpVerified ? (
                    <>
                      <div className="max-w-sm space-y-1">
                        <label className="block text-xs font-semibold text-slate-700">Enter 6-digit OTP</label>

                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={6}
                          value={resetOtp}
                          onChange={(event) => setResetOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="Enter OTP"
                          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm tracking-[0.3em] outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10"
                        />
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={handleVerifyResetOtp}
                          disabled={resetLoading || resetOtp.length !== 6}
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-erp-primary px-4 text-xs font-semibold text-white transition hover:bg-erp-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {resetLoading ? <LoaderCircle size={15} className="animate-spin" /> : <ShieldCheckIcon size={15} />}
                          Verify OTP
                        </button>

                        <button
                          type="button"
                          onClick={handleRequestResetOtp}
                          disabled={resetLoading}
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {resetLoading && <LoaderCircle size={14} className="animate-spin" />}
                          Resend OTP
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                        <CircleCheck size={16} className="shrink-0 text-emerald-700" />
                        <p className="text-xs font-semibold text-emerald-800">OTP verified. You can now set a new password.</p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        {/* New Password */}
                        <div className="min-w-0 space-y-1">
                          <label className="block text-xs font-semibold text-slate-700">New Password *</label>

                          <div className="flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5">
                            <LockKeyhole size={15} className="shrink-0 text-slate-400" />

                            <input
                              type={showResetPassword ? 'text' : 'password'}
                              value={newPassword}
                              onChange={(event) => setNewPassword(event.target.value)}
                              placeholder="Minimum 8 characters"
                              autoComplete="new-password"
                              className="w-full min-w-0 bg-transparent py-1.5 text-xs outline-none placeholder:text-slate-400"
                            />

                            <button type="button" onClick={() => setShowResetPassword((current) => !current)} className="shrink-0 text-slate-400 hover:text-slate-700" aria-label={showResetPassword ? 'Hide password' : 'Show password'}>
                              {showResetPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                          </div>
                        </div>

                        {/* Confirm Password */}
                        <div className="min-w-0 space-y-1">
                          <label className="block text-xs font-semibold text-slate-700">Confirm New Password *</label>

                          <div className="flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5">
                            <LockKeyhole size={15} className="shrink-0 text-slate-400" />

                            <input
                              type={showConfirmResetPassword ? 'text' : 'password'}
                              value={confirmPassword}
                              onChange={(event) => setConfirmPassword(event.target.value)}
                              placeholder="Re-enter new password"
                              autoComplete="new-password"
                              className="w-full min-w-0 bg-transparent py-1.5 text-xs outline-none placeholder:text-slate-400"
                            />

                            <button type="button" onClick={() => setShowConfirmResetPassword((current) => !current)} className="shrink-0 text-slate-400 hover:text-slate-700" aria-label={showConfirmResetPassword ? 'Hide password' : 'Show password'}>
                              {showConfirmResetPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {newPassword && confirmPassword && newPassword !== confirmPassword && <p className="text-[11px] text-red-600">Passwords do not match.</p>}

                      <button
                        type="button"
                        onClick={handleUpdateEmployeePassword}
                        disabled={resetLoading || newPassword.length < 8 || !confirmPassword || newPassword !== confirmPassword}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-erp-primary px-4 text-xs font-semibold text-white transition hover:bg-erp-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {resetLoading ? <LoaderCircle size={15} className="animate-spin" /> : <Save size={15} />}
                        {resetLoading ? 'Updating Password...' : 'Update Employee Password'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Assign Roles */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
              <ShieldCheck size={16} />
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900">Assign Roles</h2>
              <p className="text-[11px] text-slate-500">Select one or more roles</p>
            </div>
          </div>

          <div className="p-3">
            {fieldErrors.roles && <p className="mb-2 text-xs text-red-600">{fieldErrors.roles}</p>}

            {!canAssignRoles && <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">You can view assigned roles, but you do not have permission to change them.</p>}

            {availableRoles.length === 0 ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">No assignable roles were returned by the server.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {availableRoles.map((role) => {
                  const key = getRoleKey(role)
                  const selected = selectedRoles.some((item) => getRoleKey(item) === key)

                  const rolePermissionCount = Array.isArray(role.permissions) ? role.permissions.length : role.permissions ? Object.values(role.permissions).reduce((total, items) => total + (Array.isArray(items) ? items.length : 0), 0) : 0

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        if (canAssignRoles) toggleRole(role)
                      }}
                      disabled={!canAssignRoles}
                      aria-pressed={selected}
                      title={!canAssignRoles ? 'You do not have permission to assign roles.' : ''}
                      className={`rounded-lg border p-2.5 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        selected ? 'border-erp-primary bg-erp-primary/[0.04] ring-1 ring-erp-primary/10' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                            <Users size={14} />
                          </div>

                          <span className="truncate text-xs font-bold text-slate-800">{role.name}</span>
                        </div>

                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${selected ? 'border-erp-primary bg-erp-primary text-white' : 'border-slate-300 text-transparent'}`}>
                          <Check size={12} />
                        </span>
                      </div>

                      <p className="mt-2 line-clamp-1 text-[11px] text-slate-500">{role.type === 'Custom' ? role.description || 'Custom company role' : 'Predefined role'}</p>

                      <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
                        <span className="text-[10px] text-slate-500">{rolePermissionCount} permissions</span>

                        <span className={`text-[10px] font-semibold ${selected ? 'text-erp-primary' : 'text-slate-400'}`}>{selected ? 'Selected' : 'Select'}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {/* Permissions */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <ShieldCheck size={16} />
              </div>

              <div>
                <h2 className="text-sm font-bold text-slate-900">Permissions</h2>
                <p className="text-[11px] text-slate-500">Customize employee access</p>
              </div>
            </div>

            <div className="flex items-center gap-1 rounded-lg bg-erp-primary/10 px-2 py-1.5 text-[11px] font-bold text-erp-primary">
              <CircleCheck size={13} />
              {selectedCount} enabled
            </div>
          </div>

          <div className="space-y-3 p-3">
            {!canManagePermissions && <p className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">You can view assigned permissions, but you do not have permission to change them.</p>}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="relative w-full sm:max-w-xs">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />

                <input
                  value={permissionSearch}
                  onChange={(event) => setPermissionSearch(event.target.value)}
                  placeholder="Search permissions..."
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-2.5 text-xs outline-none focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10"
                />
              </div>

              <button
                type="button"
                disabled={!canManagePermissions}
                onClick={() => {
                  if (!canManagePermissions) return

                  const next = new Set(allPermissionKeys)

                  if (dependentPermissions.some((permission) => next.has(permission))) {
                    next.add(EMPLOYEE_UPDATE)
                  }

                  setSelectedPermissions([...next])
                }}
                className="text-xs font-semibold text-erp-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline"
              >
                Enable all
              </button>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50/70 px-2.5 py-2 text-xs text-blue-800">
              <Info size={14} className="mt-0.5 shrink-0" />
              <p>Selected roles load default permissions. Customize individual permissions below if needed.</p>
            </div>

            {permissionSections.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 px-3 py-7 text-center">
                <ShieldCheck size={24} className="mx-auto text-slate-300" />
                <p className="mt-2 text-xs font-semibold text-slate-700">No permissions found</p>
                <p className="mt-1 text-[11px] text-slate-500">Check the permissions returned by the roles API.</p>
              </div>
            ) : (
              <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                {permissionSections.map((section) => {
                  const Icon = sectionIcons[section.name] || ShieldCheck

                  const enabledInSection = section.permissions.filter((permission) => selectedPermissions.includes(permission)).length

                  const allEnabled = enabledInSection === section.permissions.length

                  return (
                    <div key={section.name} className="overflow-hidden rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between gap-2 bg-slate-50 px-2.5 py-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-erp-primary">
                            <Icon size={14} />
                          </div>

                          <div className="min-w-0">
                            <h3 className="truncate text-xs font-bold text-slate-800">{section.name}</h3>
                            <p className="text-[10px] text-slate-500">
                              {enabledInSection}/{section.permissions.length} enabled
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={!canManagePermissions}
                          onClick={() => {
                            if (!canManagePermissions) return

                            setSelectedPermissions((current) => {
                              const next = new Set(current)

                              if (allEnabled) {
                                section.permissions.forEach((permission) => next.delete(permission))
                              } else {
                                section.permissions.forEach((permission) => next.add(permission))
                              }

                              if (dependentPermissions.some((permission) => next.has(permission))) {
                                next.add(EMPLOYEE_UPDATE)
                              }

                              if (!next.has(EMPLOYEE_UPDATE)) {
                                dependentPermissions.forEach((permission) => next.delete(permission))
                              }

                              return [...next]
                            })
                          }}
                          className="shrink-0 text-[10px] font-semibold text-erp-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline"
                        >
                          {allEnabled ? 'Disable all' : 'Enable all'}
                        </button>
                      </div>

                      <div className="divide-y divide-slate-100 px-2.5">
                        {section.permissions.map((permission) => {
                          const enabled = selectedPermissions.includes(permission)

                          return (
                            <div key={permission} className="flex items-center gap-2 py-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-slate-700">{permissionLabel(permission)}</p>
                                <p className="mt-0.5 text-[10px] leading-4 text-slate-500">{permissionDescription(permission)}</p>
                              </div>

                              <button
                                type="button"
                                role="switch"
                                aria-checked={enabled}
                                disabled={!canManagePermissions}
                                onClick={() => {
                                  if (canManagePermissions) {
                                    togglePermission(permission)
                                  }
                                }}
                                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-erp-primary/30 disabled:cursor-not-allowed disabled:opacity-50 ${
                                  enabled ? 'bg-erp-primary' : 'bg-slate-300'
                                }`}
                              >
                                <span className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {/* Form Actions */}
        <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-end gap-2 rounded-xl border border-slate-200 bg-white/95 p-2.5 shadow-sm backdrop-blur">
          <button type="button" onClick={() => navigate('/company/employees')} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
            <ArrowLeft size={14} />
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving || !canSubmitForm}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-erp-primary px-4 text-xs font-bold text-white transition hover:bg-erp-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <LoaderCircle size={15} className="animate-spin" /> : <Save size={15} />}

            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Employee'}
          </button>
        </div>
      </form>
    </div>
  )
}
