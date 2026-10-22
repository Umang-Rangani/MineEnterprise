import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, UserRound, Mail, Phone, LockKeyhole, Eye, EyeOff, ShieldCheck, Users, Package, ShoppingCart, Warehouse, FileText, Settings, Check, Save, LoaderCircle, Search, Info, CircleCheck, X } from 'lucide-react'
import axiosInstance from '../../api/axiosInstance'

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

function getSectionName(permission) {
  const parts = String(permission).split(/[:._]/)
  return parts.length > 1 ? parts.slice(0, -1).join(' ') : 'Other'
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

function ToggleSwitch({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-erp-primary/30 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? 'bg-erp-primary' : 'bg-slate-200'
      }`}
    >
      <span className={`pointer-events-none block h-5 w-5 shrink-0 rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  )
}

function FormField({ label, icon: Icon, error, children }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-slate-700">{label}</label>

      <div className={`flex min-h-12 items-center gap-3 rounded-xl border bg-white px-3 transition focus-within:border-erp-primary focus-within:ring-4 focus-within:ring-erp-primary/10 ${error ? 'border-red-400' : 'border-slate-200'}`}>
        {Icon && <Icon size={18} className="shrink-0 text-slate-400" />}
        {children}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
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
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    let cancelled = false

    async function loadFormData() {
      setLoading(true)
      setError('')

      try {
        const rolesResponse = await axiosInstance.get('/erp/roles')
        const roleData = rolesResponse.data

        const roles = Array.isArray(roleData.roles) ? roleData.roles : []
        const permissions = Array.isArray(roleData.availablePermissions) ? roleData.availablePermissions : []

        if (cancelled) return

        setAvailableRoles(roles)
        setAvailablePermissions(permissions)

        if (isEdit) {
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

          // Explicit permission overrides take precedence over role defaults.
          setSelectedPermissions(Array.isArray(employee.permissionOverrides) ? employee.permissionOverrides : rolePermissions)
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.response?.data?.message || 'Unable to load employee form data. Please try again.')
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

    // Recalculate defaults when the selected roles change.
    // The user can further customize individual permissions.
    setSelectedPermissions(getRolePermissions(nextRoles, availableRoles))
  }

  const togglePermission = (permission) => {
    setSelectedPermissions((current) => (current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission]))
  }

  const validateForm = () => {
    const errors = {}

    if (!form.name.trim()) errors.name = 'Employee name is required.'

    if (!form.email.trim()) {
      errors.email = 'Email is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
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
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

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
      setError(requestError.response?.data?.message || `Unable to ${isEdit ? 'update' : 'create'} employee. Please try again.`)
    } finally {
      setSaving(false)
    }
  }

  const permissionSections = availablePermissions
    .map((section) => {
      const sectionName = humanize(section.section)
      const permissions = (section.permissions || []).filter((permission) => {
        const query = permissionSearch.trim().toLowerCase()

        return !query || permissionLabel(permission).toLowerCase().includes(query) || sectionName.toLowerCase().includes(query)
      })

      return {
        name: sectionName,
        permissions,
      }
    })
    .filter((section) => section.permissions.length > 0)

  const allPermissionKeys = availablePermissions.flatMap((section) => section.permissions || [])

  const selectedCount = selectedPermissions.filter((permission) => allPermissionKeys.includes(permission)).length

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
          <LoaderCircle className="animate-spin" size={22} />
          Loading employee form...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50/80 ">
      <div className="mx-auto space-y-6">
        {/* Page heading */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => navigate('/company/employees')}
              className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100"
              aria-label="Back to employees"
            >
              <ArrowLeft size={19} />
            </button>

            <div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span>Employees</span>
                <span>/</span>
                <span className="text-erp-primary">{isEdit ? 'Edit Employee' : 'New Employee'}</span>
              </div>

              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{isEdit ? 'Edit Employee' : 'Add New Employee'}</h1>

              <p className="mt-1 text-sm text-slate-500">{isEdit ? 'Update employee information, roles and access.' : 'Create an employee profile and configure their access.'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start rounded-full border border-erp-primary/15 bg-erp-primary/5 px-3 py-2 text-xs font-semibold text-erp-primary">
            <ShieldCheck size={15} />
            Employee Access Control
          </div>
        </div>

        {error && (
          <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <Info size={18} className="mt-0.5 shrink-0" />
            <span className="flex-1">{error}</span>
            <button type="button" onClick={() => setError('')} aria-label="Dismiss error">
              <X size={17} />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal information */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5 sm:px-7">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-erp-primary/10 text-erp-primary">
                <UserRound size={21} />
              </div>

              <div>
                <h2 className="font-bold text-slate-900">Personal Information</h2>
                <p className="mt-0.5 text-sm text-slate-500">Basic details for this employee</p>
              </div>
            </div>

            <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-7">
              <FormField label="Full Name *" icon={UserRound} error={fieldErrors.name}>
                <input value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="Enter full name" className="w-full min-w-0 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400" />
              </FormField>

              <FormField label="Email Address *" icon={Mail} error={fieldErrors.email}>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField('email', event.target.value)}
                  placeholder="employee@company.com"
                  className="w-full min-w-0 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                />
              </FormField>

              <FormField label="Phone Number" icon={Phone}>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(event) => updateField('phone', event.target.value)}
                  placeholder="Enter phone number"
                  className="w-full min-w-0 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                />
              </FormField>

              <FormField label={isEdit ? 'New Password (optional)' : 'Password *'} icon={LockKeyhole} error={fieldErrors.password}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(event) => updateField('password', event.target.value)}
                  placeholder={isEdit ? 'Leave blank to keep current' : 'Minimum 8 characters'}
                  className="w-full min-w-0 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                />

                <button type="button" onClick={() => setShowPassword(!showPassword)} className="shrink-0 text-slate-400 hover:text-slate-700" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </FormField>

              {isEdit && (
                <div className="space-y-2 sm:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700">Account Status</label>

                  <div className="flex flex-wrap gap-3">
                    {['Active', 'Inactive'].map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => updateField('status', status)}
                        className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
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

          {/* Role selection */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5 sm:px-7">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                <ShieldCheck size={21} />
              </div>

              <div>
                <h2 className="font-bold text-slate-900">Assign Roles</h2>
                <p className="mt-0.5 text-sm text-slate-500">Choose the roles this employee needs</p>
              </div>
            </div>

            <div className="p-5 sm:p-7">
              {fieldErrors.roles && <p className="mb-3 text-sm text-red-600">{fieldErrors.roles}</p>}

              {availableRoles.length === 0 ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">No assignable roles were returned by the server.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {availableRoles.map((role) => {
                    const key = getRoleKey(role)
                    const selected = selectedRoles.some((item) => getRoleKey(item) === key)

                    const rolePermissionCount = (() => {
                      if (Array.isArray(role.permissions)) {
                        return role.permissions.length
                      }

                      if (role.permissions) {
                        return Object.values(role.permissions).reduce((total, items) => total + (Array.isArray(items) ? items.length : 0), 0)
                      }

                      return 0
                    })()

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleRole(role)}
                        className={`rounded-xl border p-4 text-left transition ${selected ? 'border-erp-primary bg-erp-primary/[0.04] ring-2 ring-erp-primary/10' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                            <Users size={19} />
                          </div>

                          <span className={`flex h-6 w-6 items-center justify-center rounded-full border ${selected ? 'border-erp-primary bg-erp-primary text-white' : 'border-slate-300 bg-white text-transparent'}`}>
                            <Check size={14} />
                          </span>
                        </div>

                        <h3 className="mt-3 font-bold text-slate-900">{role.name}</h3>

                        <p className="mt-1 text-xs text-slate-500">{role.type === 'Custom' ? role.description || 'Custom company role' : 'Predefined role'}</p>

                        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                          <span className="text-xs text-slate-500">{rolePermissionCount} default permissions</span>
                          <span className={`text-xs font-semibold ${selected ? 'text-erp-primary' : 'text-slate-400'}`}>{selected ? 'Selected' : 'Select role'}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Permissions */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <ShieldCheck size={21} />
                </div>

                <div>
                  <h2 className="font-bold text-slate-900">Permissions</h2>
                  <p className="mt-0.5 text-sm text-slate-500">Customize what this employee can access</p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start rounded-full bg-erp-primary/10 px-3 py-2 text-xs font-bold text-erp-primary">
                <CircleCheck size={15} />
                {selectedCount} permissions enabled
              </div>
            </div>

            <div className="space-y-5 p-5 sm:p-7">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:max-w-sm">
                  <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={permissionSearch}
                    onChange={(event) => setPermissionSearch(event.target.value)}
                    placeholder="Search permissions..."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-erp-primary focus:ring-4 focus:ring-erp-primary/10"
                  />
                </div>

                <button type="button" onClick={() => setSelectedPermissions(allPermissionKeys)} className="text-left text-sm font-semibold text-erp-primary hover:underline">
                  Enable all listed permissions
                </button>
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-sm text-blue-800">
                <div className="flex items-start gap-2">
                  <Info size={17} className="mt-0.5 shrink-0" />
                  <p>Selected roles load their default permissions. You can customize the switches below for this employee.</p>
                </div>
              </div>

              {permissionSections.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center">
                  <ShieldCheck size={30} className="mx-auto text-slate-300" />
                  <p className="mt-3 font-semibold text-slate-700">No permissions found</p>
                  <p className="mt-1 text-sm text-slate-500">Check the permissions returned by the roles API.</p>
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {permissionSections.map((section) => {
                    const Icon = sectionIcons[section.name] || ShieldCheck

                    const enabledInSection = section.permissions.filter((permission) => selectedPermissions.includes(permission)).length

                    return (
                      <div key={section.name} className="overflow-hidden rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between gap-3 bg-slate-50 px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-erp-primary shadow-sm">
                              <Icon size={18} />
                            </div>

                            <div>
                              <h3 className="text-sm font-bold text-slate-800">{section.name}</h3>
                              <p className="text-xs text-slate-500">
                                {enabledInSection} of {section.permissions.length} enabled
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const allEnabled = enabledInSection === section.permissions.length

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
                            className="text-xs font-semibold text-erp-primary hover:underline"
                          >
                            {enabledInSection === section.permissions.length ? 'Disable all' : 'Enable all'}
                          </button>
                        </div>

                        <div className="divide-y divide-slate-100 px-4">
                          {section.permissions.map((permission) => {
                            const enabled = selectedPermissions.includes(permission)

                            return (
                              <div key={permission} className="flex items-center gap-3 py-3">
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold text-slate-700">{permissionLabel(permission)}</p>
                                  <p className="mt-0.5 text-xs text-slate-500">{permissionDescription(permission)}</p>
                                </div>

                                <ToggleSwitch checked={enabled} onChange={() => togglePermission(permission)} />
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

          {/* Form actions */}
          <div className="flex flex-col-reverse gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <button
              type="button"
              onClick={() => navigate('/company/employees')}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft size={17} />
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-erp-primary px-6 text-sm font-bold text-white shadow-sm transition hover:bg-erp-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <LoaderCircle size={18} className="animate-spin" /> : <Save size={18} />}
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
