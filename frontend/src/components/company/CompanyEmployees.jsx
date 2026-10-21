import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, UserPlus, RefreshCw, X, Check, ShieldCheck, Eye, EyeOff, Search, Mail, Phone, BriefcaseBusiness } from 'lucide-react'
import axiosInstance from '../../api/axiosInstance'

const assignablePredefinedRoles = ['Employee', 'Manager', 'Accountant', 'InventoryManager', 'SalesManager']

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  password: '',
  roles: [],
}

const inputClass = 'w-full rounded-xl border border-erp-border bg-erp-surface px-3.5 py-3 text-sm text-erp-text outline-none transition placeholder:text-erp-text-muted focus:border-erp-focus focus:ring-2 focus:ring-erp-ring'

export default function CompanyEmployees() {
  const navigate = useNavigate()

  const [employees, setEmployees] = useState([])
  const [availableRoles, setAvailableRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState(emptyForm)

  async function fetchEmployees() {
    setLoading(true)
    setError('')

    try {
      const { data } = await axiosInstance.get('/erp/employees')

      if (!data.success) {
        throw new Error(data.message || 'Unable to load employees.')
      }

      setEmployees(data.employees || [])
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to load employees.')
    } finally {
      setLoading(false)
    }
  }

  async function fetchRoles() {
    try {
      const { data } = await axiosInstance.get('/erp/roles')

      if (!data.success) {
        throw new Error(data.message || 'Unable to load roles.')
      }

      setAvailableRoles((data.roles || []).filter((role) => (role.type === 'Predefined' && assignablePredefinedRoles.includes(role.name)) || (role.type === 'Custom' && role._id)))
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to load assignable roles.')
    }
  }

  useEffect(() => {
    fetchEmployees()
    fetchRoles()
  }, [])

  function openCreateModal() {
    setForm(emptyForm)
    setError('')
    setSuccess('')
    setShowPassword(false)
    setModalOpen(true)
  }

  function closeModal() {
    if (saving) return
    setModalOpen(false)
  }

  function toggleRole(role) {
    setForm((current) => {
      const exists = current.roles.some((item) => item.type === role.type && (role.type === 'Custom' ? item.customRoleId === role._id : item.name === role.name))

      if (exists) {
        return {
          ...current,
          roles: current.roles.filter((item) => !(item.type === role.type && (role.type === 'Custom' ? item.customRoleId === role._id : item.name === role.name))),
        }
      }

      return {
        ...current,
        roles: [
          ...current.roles,
          role.type === 'Custom'
            ? {
                type: 'Custom',
                name: role.name,
                customRoleId: role._id,
              }
            : {
                type: 'Predefined',
                name: role.name,
              },
        ],
      }
    })
  }

  function isRoleSelected(role) {
    return form.roles.some((item) => item.type === role.type && (role.type === 'Custom' ? item.customRoleId === role._id : item.name === role.name))
  }

  function getPermissionCount(role) {
    if (Array.isArray(role.permissions)) {
      return role.permissions.length
    }

    return Object.values(role.permissions || {}).reduce((total, permissions) => total + (Array.isArray(permissions) ? permissions.length : 0), 0)
  }

  async function handleCreateEmployee(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!form.name.trim() || !form.email.trim() || form.password.length < 8) {
      setError('Name, email and a password of at least 8 characters are required.')
      return
    }

    setSaving(true)

    try {
      const { data } = await axiosInstance.post('/erp/employees', {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
        roles: form.roles,
      })

      if (!data.success) {
        throw new Error(data.message || 'Unable to create employee.')
      }

      setEmployees((current) => [data.employee, ...current.filter((employee) => employee._id !== data.employee?._id)])

      setModalOpen(false)
      setForm(emptyForm)
      setSuccess(data.message || 'Employee created successfully.')
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to create employee.')
    } finally {
      setSaving(false)
    }
  }

  const filteredEmployees = employees.filter((employee) => `${employee.name} ${employee.email} ${employee.phone || ''} ${employee.role} ${(employee.roles || []).map((role) => role.name).join(' ')}`.toLowerCase().includes(search.toLowerCase().trim()))

  const activeCount = employees.filter((employee) => employee.status === 'Active').length

  const inactiveCount = employees.length - activeCount

  return (
    <div className="min-h-screen bg-erp-bg text-erp-text">
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-erp-primary">
              <Users size={17} />
              <span>Team Management</span>
            </div>

            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Employees</h1>

            <p className="mt-1 text-sm text-erp-text-secondary">Manage employee accounts, account status and assigned roles.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={fetchEmployees}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-erp-border bg-erp-surface px-4 py-2.5 text-sm font-semibold transition hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>

            <button type="button" onClick={openCreateModal} className="inline-flex items-center justify-center gap-2 rounded-xl bg-erp-primary px-4 py-2.5 text-sm font-semibold text-white shadow-erp-card transition hover:bg-erp-primary-hover">
              <UserPlus size={17} />
              Create Employee
            </button>
          </div>
        </div>

        {error && !modalOpen && (
          <div className="flex items-start justify-between gap-3 rounded-xl border border-erp-danger-border bg-erp-danger-light p-4 text-sm text-erp-danger">
            <p>{error}</p>
            <button type="button" onClick={() => setError('')} aria-label="Dismiss error" className="shrink-0 rounded-lg p-1 hover:bg-erp-danger-light">
              <X size={17} />
            </button>
          </div>
        )}

        {success && (
          <div className="flex items-start justify-between gap-3 rounded-xl border border-erp-success-border bg-erp-success-light p-4 text-sm text-erp-success">
            <p>{success}</p>
            <button type="button" onClick={() => setSuccess('')} aria-label="Dismiss success" className="shrink-0 rounded-lg p-1">
              <X size={17} />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-erp-border bg-erp-surface p-5 shadow-erp-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-erp-text-secondary">Total Employees</p>
                <p className="mt-3 text-3xl font-bold tabular-nums">{loading ? '—' : employees.length}</p>
                <p className="mt-2 text-xs text-erp-text-muted">Employee accounts in your company</p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">
                <Users size={21} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-erp-border bg-erp-surface p-5 shadow-erp-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-erp-text-secondary">Active Employees</p>
                <p className="mt-3 text-3xl font-bold tabular-nums">{loading ? '—' : activeCount}</p>
                <p className="mt-2 text-xs text-erp-text-muted">Currently active accounts</p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-erp-success-light text-erp-success">
                <Check size={21} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-erp-border bg-erp-surface p-5 shadow-erp-card sm:col-span-2 xl:col-span-1">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-erp-text-secondary">Inactive Employees</p>
                <p className="mt-3 text-3xl font-bold tabular-nums">{loading ? '—' : inactiveCount}</p>
                <p className="mt-2 text-xs text-erp-text-muted">Inactive or disabled accounts</p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-erp-warning-light text-erp-warning">
                <ShieldCheck size={21} />
              </div>
            </div>
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex flex-col justify-between gap-4 border-b border-erp-border p-5 sm:flex-row sm:items-center sm:p-6">
            <div>
              <h2 className="text-lg font-bold">Employee Directory</h2>
              <p className="mt-1 text-sm text-erp-text-secondary">{filteredEmployees.length} employee(s) shown</p>
            </div>

            <div className="relative w-full sm:max-w-sm">
              <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-erp-text-muted" />

              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, email or role..." aria-label="Search employees" className={`${inputClass} pl-10`} />

              {search && (
                <button type="button" onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-erp-text-muted hover:bg-erp-hover">
                  <X size={15} />
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="space-y-3 p-5">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="h-16 animate-pulse rounded-xl bg-erp-surface-secondary" />
              ))}
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="px-5 py-14 text-center sm:px-8">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-erp-primary-light text-erp-primary">{search ? <Search size={24} /> : <Users size={24} />}</div>

              <h3 className="mt-4 font-semibold">{search ? 'No matching employees' : 'No employees yet'}</h3>

              <p className="mx-auto mt-1 max-w-md text-sm text-erp-text-secondary">{search ? 'Try another search term or clear the search to see all employees.' : 'Create an employee account to get started managing your team.'}</p>

              {search ? (
                <button type="button" onClick={() => setSearch('')} className="mt-4 rounded-xl border border-erp-border px-4 py-2.5 text-sm font-semibold hover:bg-erp-hover">
                  Clear Search
                </button>
              ) : (
                <button type="button" onClick={openCreateModal} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-erp-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-erp-primary-hover">
                  <UserPlus size={16} />
                  Create Employee
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="bg-erp-surface-secondary text-xs uppercase tracking-wide text-erp-text-secondary">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Employee</th>
                    <th className="px-5 py-4 font-semibold">Phone</th>
                    <th className="px-5 py-4 font-semibold">Account Role</th>
                    <th className="px-5 py-4 font-semibold">Assigned Roles</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 text-right font-semibold">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-erp-border">
                  {filteredEmployees.map((employee) => (
                    <tr key={employee._id} className="transition-colors hover:bg-erp-surface-hover">
                      <td className="px-5 py-4">
                        <div className="flex min-w-[210px] items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-erp-primary-light text-sm font-bold text-erp-primary">{(employee.name || 'E').trim().charAt(0).toUpperCase()}</div>

                          <div className="min-w-0">
                            <p className="font-semibold">{employee.name || 'Unnamed Employee'}</p>
                            <p className="mt-1 break-all text-xs text-erp-text-secondary">{employee.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-erp-text-secondary">
                        <span className="inline-flex items-center gap-2">
                          <Phone size={14} className="shrink-0 text-erp-text-muted" />
                          {employee.phone || '—'}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-erp-primary-light px-2.5 py-1 text-xs font-semibold text-erp-primary-dark">
                          <BriefcaseBusiness size={13} />
                          {employee.role || 'Employee'}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        {(employee.roles || []).length === 0 ? (
                          <span className="text-xs text-erp-text-muted">No roles assigned</span>
                        ) : (
                          <div className="flex max-w-xs flex-wrap gap-1.5">
                            {employee.roles.map((role, index) => (
                              <span key={`${role.type}-${role.customRoleId || role.name}-${index}`} className="rounded-full border border-erp-border bg-erp-surface-secondary px-2.5 py-1 text-xs font-medium">
                                {role.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${employee.status === 'Active' ? 'bg-erp-success-light text-erp-success' : 'bg-erp-warning-light text-erp-warning'}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${employee.status === 'Active' ? 'bg-erp-success' : 'bg-erp-warning'}`} />
                          {employee.status || 'Unknown'}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => navigate(`/company/employees/${employee._id}`)}
                          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-erp-border bg-erp-surface px-3 py-2 text-xs font-semibold text-erp-primary transition hover:border-erp-primary hover:bg-erp-primary-light"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-erp-overlay/50 p-3 py-6 sm:items-center sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal()
          }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby="create-employee-title" className="my-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-erp-border bg-erp-surface shadow-erp-modal">
            <div className="flex items-center justify-between gap-4 border-b border-erp-border px-5 py-4 sm:px-6 sm:py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">
                  <UserPlus size={21} />
                </div>

                <div>
                  <h2 id="create-employee-title" className="text-lg font-bold sm:text-xl">
                    Create Employee
                  </h2>
                  <p className="mt-1 text-sm text-erp-text-secondary">Enter employee details and assign roles.</p>
                </div>
              </div>

              <button type="button" onClick={closeModal} disabled={saving} aria-label="Close dialog" className="shrink-0 rounded-xl p-2 text-erp-text-secondary transition hover:bg-erp-hover disabled:opacity-50">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee}>
              <div className="max-h-[70vh] space-y-6 overflow-y-auto p-5 sm:p-6">
                {error && (
                  <div className="flex items-start justify-between gap-3 rounded-xl border border-erp-danger-border bg-erp-danger-light p-3.5 text-sm text-erp-danger">
                    <p>{error}</p>
                    <button type="button" onClick={() => setError('')} aria-label="Dismiss error" className="shrink-0">
                      <X size={16} />
                    </button>
                  </div>
                )}

                <div>
                  <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-erp-text-secondary">Personal Information</h3>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="employee-name" className="mb-2 block text-sm font-semibold">
                        Full Name <span className="text-erp-danger">*</span>
                      </label>

                      <input
                        id="employee-name"
                        required
                        maxLength={100}
                        value={form.name}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        placeholder="Enter full name"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label htmlFor="employee-email" className="mb-2 block text-sm font-semibold">
                        Email Address <span className="text-erp-danger">*</span>
                      </label>

                      <div className="relative">
                        <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-erp-text-muted" />
                        <input
                          id="employee-email"
                          required
                          type="email"
                          maxLength={254}
                          value={form.email}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              email: event.target.value,
                            }))
                          }
                          placeholder="employee@company.com"
                          className={`${inputClass} pl-10`}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="employee-phone" className="mb-2 block text-sm font-semibold">
                        Phone Number
                      </label>

                      <div className="relative">
                        <Phone size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-erp-text-muted" />
                        <input
                          id="employee-phone"
                          type="tel"
                          maxLength={20}
                          value={form.phone}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              phone: event.target.value,
                            }))
                          }
                          placeholder="Enter phone number"
                          className={`${inputClass} pl-10`}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="employee-password" className="mb-2 block text-sm font-semibold">
                        Temporary Password <span className="text-erp-danger">*</span>
                      </label>

                      <div className="relative">
                        <input
                          id="employee-password"
                          required
                          minLength={8}
                          type={showPassword ? 'text' : 'password'}
                          value={form.password}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              password: event.target.value,
                            }))
                          }
                          placeholder="At least 8 characters"
                          className={`${inputClass} pr-11`}
                        />

                        <button
                          type="button"
                          onClick={() => setShowPassword((current) => !current)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-erp-text-secondary hover:bg-erp-hover"
                        >
                          {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                      </div>

                      <p className="mt-1.5 text-xs text-erp-text-muted">Use at least 8 characters.</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-erp-border pt-5">
                  <div className="mb-4">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-erp-text-secondary">Assign Roles</h3>
                    <p className="mt-1.5 text-sm text-erp-text-secondary">Select the roles this employee needs. The server will validate your permission authority.</p>
                  </div>

                  {availableRoles.length === 0 ? (
                    <div className="rounded-xl border border-erp-warning-border bg-erp-warning-light p-4 text-sm text-erp-warning">
                      No assignable roles were returned. Check that your account has access to the roles API and that roles are available.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {availableRoles.map((role) => {
                        const selected = isRoleSelected(role)

                        return (
                          <label
                            key={`${role.type}-${role._id || role.name}`}
                            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${selected ? 'border-erp-primary bg-erp-primary-light' : 'border-erp-border hover:bg-erp-surface-hover'}`}
                          >
                            <input type="checkbox" checked={selected} onChange={() => toggleRole(role)} className="mt-1 h-4 w-4 shrink-0 accent-erp-primary" />

                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center gap-2">
                                <span className="break-words text-sm font-semibold">{role.name}</span>

                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${role.type === 'Custom' ? 'bg-erp-success-light text-erp-success' : 'bg-erp-surface-secondary text-erp-text-secondary'}`}>{role.type}</span>
                              </span>

                              <span className="mt-1.5 block text-xs text-erp-text-secondary">{getPermissionCount(role)} permission(s)</span>

                              {role.description && <span className="mt-1.5 block text-xs leading-5 text-erp-text-muted">{role.description}</span>}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between rounded-xl bg-erp-surface-secondary px-4 py-3">
                    <span className="text-sm text-erp-text-secondary">Selected roles</span>
                    <span className="rounded-full bg-erp-primary-light px-3 py-1 text-sm font-bold text-erp-primary-dark">{form.roles.length}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-erp-border bg-erp-surface px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                <button type="button" onClick={closeModal} disabled={saving} className="rounded-xl border border-erp-border px-5 py-2.5 text-sm font-semibold transition hover:bg-erp-hover disabled:opacity-50">
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-erp-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-erp-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Creating Employee...
                    </>
                  ) : (
                    <>
                      <UserPlus size={17} />
                      Create Employee
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}
