import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, UserRound, Mail, Phone, LockKeyhole, Eye, EyeOff, ShieldCheck, Users, Package, ShoppingCart, Warehouse, FileText, Settings, Check, Save, LoaderCircle, Search, Info, CircleCheck } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import { EmployeeFormShimmer } from './CompanyEmployeeShimmer'

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

function getActionName(permission) {
  const parts = String(permission).split(/[:._]/)
  return parts[parts.length - 1] || permission
}

function humanize(value) {
  return String(value || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_:-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function permissionLabel(permission) {
  const action = getActionName(permission).toUpperCase()
  return actionLabels[action] || humanize(action)
}

function permissionDescription(permission) {
  const action = getActionName(permission).toUpperCase()
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

  useEffect(() => {
    document.title = isEdit ? 'Edit Employee | MineERP' : 'Add Employee | MineERP'
  }, [isEdit])

  useEffect(() => {
    let cancelled = false

    async function loadFormData() {
      setLoading(true)

      try {
        const rolesResponse = await axiosInstance.get('/erp/roles')
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

          const employeeRoles = Array.isArray(employee.roles)
            ? employee.roles.map((role) => ({
                type: role.type,
                name: role.name,
                ...(role.customRoleId ? { customRoleId: role.customRoleId } : {}),
              }))
            : []

          setSelectedRoles(employeeRoles)

          const rolePermissions = getRolePermissions(employeeRoles, roles)

          setSelectedPermissions(Array.isArray(employee.permissionOverrides) ? employee.permissionOverrides : rolePermissions)
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
    setSelectedPermissions((current) => (current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission]))
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

    if (form.password && form.password.length < 8) {
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

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!validateForm()) return

    setSaving(true)

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      roles: selectedRoles,
      permissionOverrides: [...new Set(selectedPermissions)],
      status: form.status,
    }

    if (!isEdit || form.password) {
      payload.password = form.password
    }

    try {
      if (isEdit) {
        await axiosInstance.patch(`/erp/employees/${id}`, payload)
      } else {
        await axiosInstance.post('/erp/employees', payload)
      }

      navigate('/company/employees', {
        state: {
          message: isEdit ? 'Employee updated successfully.' : 'Employee created successfully.',
        },
      })
    } catch (requestError) {
      showToast('error', requestError.response?.data?.message || `Unable to ${isEdit ? 'update' : 'create'} employee. Please try again.`, 5000)
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

  const items = [
    { title: 'Employees', link: '/company/employees' },
    {
      title: isEdit ? 'Edit Employee' : 'Add Employee',
      link: null,
    },
  ]

  if (loading) {
    return (
      <>
        {toast && <Toast toast={toast} onClose={closeToast} />}
        <EmployeeFormShimmer />
      </>
    )
  }

  return (
    <div className="space-y-4">
      {toast && <Toast toast={toast} onClose={closeToast} />}

      <div className="flex h-10 min-w-0 items-center justify-between gap-2">
        <div className="flex h-10 min-w-0 flex-1 items-center overflow-hidden">
          <BreadCrumb items={items} />
        </div>

        <div className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-erp-primary/15 bg-erp-primary/5 px-2 text-[11px] font-semibold text-erp-primary">
          <ShieldCheck size={14} />
          <span>Access Control</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-slate-900">{isEdit ? 'Edit Employee' : 'Add Employee'}</h1>
          <p className="text-xs text-slate-500">{isEdit ? 'Update employee details, roles and access.' : 'Create an employee and configure their access.'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
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
            <div className="min-w-0 space-y-1">
              <label className="block text-xs font-semibold text-slate-700">Full Name *</label>
              <div className={`flex min-h-10 items-center gap-2 rounded-lg border bg-white px-2.5 ${fieldErrors.name ? 'border-red-400' : 'border-slate-200'}`}>
                <UserRound size={15} className="shrink-0 text-slate-400" />
                <input value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="Full name" autoComplete="name" className="w-full min-w-0 bg-transparent py-1.5 text-xs outline-none placeholder:text-slate-400" />
              </div>
              {fieldErrors.name && <p className="text-[11px] text-red-600">{fieldErrors.name}</p>}
            </div>

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

            <div className="min-w-0 space-y-1">
              <label className="block text-xs font-semibold text-slate-700">{isEdit ? 'New Password (optional)' : 'Password *'}</label>
              <div className={`flex min-h-10 items-center gap-2 rounded-lg border bg-white px-2.5 ${fieldErrors.password ? 'border-red-400' : 'border-slate-200'}`}>
                <LockKeyhole size={15} className="shrink-0 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(event) => updateField('password', event.target.value)}
                  placeholder={isEdit ? 'Leave blank to keep current' : 'Min. 8 characters'}
                  autoComplete="new-password"
                  className="w-full min-w-0 bg-transparent py-1.5 text-xs outline-none placeholder:text-slate-400"
                />
                <button type="button" onClick={() => setShowPassword((current) => !current)} className="shrink-0 text-slate-400 hover:text-slate-700" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {fieldErrors.password && <p className="text-[11px] text-red-600">{fieldErrors.password}</p>}
            </div>

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
                      onClick={() => toggleRole(role)}
                      aria-pressed={selected}
                      className={`rounded-lg border p-2.5 text-left transition ${selected ? 'border-erp-primary bg-erp-primary/[0.04] ring-1 ring-erp-primary/10' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}
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

              <button type="button" onClick={() => setSelectedPermissions(allPermissionKeys)} className="text-xs font-semibold text-erp-primary hover:underline">
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
                          onClick={() => {
                            setSelectedPermissions((current) => {
                              const next = new Set(current)

                              section.permissions.forEach((permission) => {
                                if (allEnabled) {
                                  next.delete(permission)
                                } else {
                                  next.add(permission)
                                }
                              })

                              return [...next]
                            })
                          }}
                          className="shrink-0 text-[10px] font-semibold text-erp-primary hover:underline"
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
                                onClick={() => togglePermission(permission)}
                                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-erp-primary/30 ${enabled ? 'bg-erp-primary' : 'bg-slate-300'}`}
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

        <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-end gap-2 rounded-xl border border-slate-200 bg-white/95 p-2.5 shadow-sm backdrop-blur">
          <button type="button" onClick={() => navigate('/company/employees')} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
            <ArrowLeft size={14} />
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
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
