import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, UserRound, Mail, Phone, ShieldCheck, RefreshCw, CalendarDays, Building2, AlertCircle, Pencil, Save, X, CheckCircle2, Search, BriefcaseBusiness, UserCheck, UserX, LockKeyhole, Users } from 'lucide-react'
import axiosInstance from '../../api/axiosInstance'

export default function CompanyEmployeeDetails() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [employee, setEmployee] = useState(null)
  const [roleOptions, setRoleOptions] = useState([])
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    status: 'Active',
    roles: [],
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [roleError, setRoleError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchRole, setSearchRole] = useState('')

  const inputClass = 'mt-2 w-full rounded-xl border border-erp-border bg-erp-surface px-4 py-3 text-sm text-erp-text outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/15'

  const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50'

  function createForm(employeeData) {
    return {
      name: employeeData.name || '',
      email: employeeData.email || '',
      phone: employeeData.phone || '',
      status: employeeData.status || 'Active',
      roles: (employeeData.roles || []).map((role) => ({
        type: role.type,
        name: role.name,
        customRoleId: role.customRoleId || null,
      })),
    }
  }

  async function fetchEmployee(showLoader = true) {
    if (showLoader) setLoading(true)

    setError('')
    setSuccess('')

    try {
      const response = await axiosInstance.get(`/erp/employees/${id}`)
      const data = response.data

      if (!data.success || !data.employee) {
        throw new Error(data.message || 'Unable to load employee details.')
      }

      setEmployee(data.employee)
      setForm(createForm(data.employee))
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to load employee details.')
      setEmployee(null)
    } finally {
      if (showLoader) setLoading(false)
    }
  }

  async function fetchRoles() {
    setRoleError('')

    try {
      const { data } = await axiosInstance.get('/erp/roles')

      if (!data.success) {
        throw new Error(data.message || 'Unable to load available roles.')
      }

      setRoleOptions(data.roles || [])
    } catch (err) {
      setRoleError(err.response?.data?.message || err.message || 'Unable to load available roles.')
    }
  }

  useEffect(() => {
    async function loadPage() {
      setLoading(true)
      setError('')

      await Promise.all([fetchEmployee(), fetchRoles()])

      setLoading(false)
    }

    loadPage()
  }, [id])

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function hasRole(option) {
    return form.roles.some((role) => {
      if (option.type === 'Predefined') {
        return role.type === 'Predefined' && role.name === option.name
      }

      return role.type === 'Custom' && String(role.customRoleId) === String(option._id)
    })
  }

  function toggleRole(option) {
    setSuccess('')

    if (hasRole(option)) {
      setForm((current) => ({
        ...current,
        roles: current.roles.filter((role) => {
          if (option.type === 'Predefined') {
            return !(role.type === 'Predefined' && role.name === option.name)
          }

          return !(role.type === 'Custom' && String(role.customRoleId) === String(option._id))
        }),
      }))

      return
    }

    const newRole =
      option.type === 'Predefined'
        ? {
            type: 'Predefined',
            name: option.name,
            customRoleId: null,
          }
        : {
            type: 'Custom',
            name: option.name,
            customRoleId: option._id,
          }

    setForm((current) => ({
      ...current,
      roles: [...current.roles, newRole],
    }))
  }

  async function handleSave(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!form.name.trim() || !form.email.trim()) {
      setError('Employee name and email are required.')
      return
    }

    if (form.roles.length > 0 && roleOptions.length === 0) {
      setError('Available roles could not be verified. Please refresh and try again.')
      return
    }

    setSaving(true)

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        status: form.status,
        roles: form.roles,
      }

      const { data } = await axiosInstance.patch(`/erp/employees/${id}`, payload)

      if (!data.success || !data.employee) {
        throw new Error(data.message || 'Unable to update employee.')
      }

      setEmployee(data.employee)
      setForm(createForm(data.employee))
      setEditing(false)
      setSuccess(data.message || 'Employee updated successfully.')
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to update employee.')
    } finally {
      setSaving(false)
    }
  }

  function cancelEditing() {
    if (employee) {
      setForm(createForm(employee))
    }

    setEditing(false)
    setError('')
    setSuccess('')
    setSearchRole('')
  }

  const filteredRoles = roleOptions.filter((role) => (role.name || '').toLowerCase().includes(searchRole.toLowerCase()))

  return (
    <div className="min-h-screen bg-erp-bg text-erp-text">
      <div className="mx-auto max-w-7xl space-y-6 pb-10">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <button type="button" onClick={() => navigate('/company/employees')} className={`${buttonClass} border border-erp-border bg-erp-surface px-3`} aria-label="Back to employees">
              <ArrowLeft size={18} />
            </button>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-erp-primary">Workforce Management</p>
              <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Employee Profile</h1>
              <p className="mt-1 text-sm text-erp-text-secondary">Manage employee information, roles and account status.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              fetchEmployee()
              fetchRoles()
            }}
            disabled={loading || saving}
            className={`${buttonClass} border border-erp-border bg-erp-surface hover:bg-erp-hover`}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {error && (
          <div role="alert" className="flex items-start gap-3 rounded-2xl border border-erp-danger-border bg-erp-danger-light p-4">
            <AlertCircle size={20} className="mt-0.5 shrink-0 text-erp-danger" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-erp-danger">Something needs your attention</p>
              <p className="mt-1 break-words text-sm text-erp-danger">{error}</p>
            </div>
            <button type="button" onClick={() => setError('')} className="rounded-lg p-1 text-erp-danger hover:bg-erp-danger-light" aria-label="Dismiss error">
              <X size={17} />
            </button>
          </div>
        )}

        {success && (
          <div role="status" className="flex items-start gap-3 rounded-2xl border border-erp-success/20 bg-erp-success-light p-4">
            <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-erp-success" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-erp-success">{success}</p>
            </div>
            <button type="button" onClick={() => setSuccess('')} className="rounded-lg p-1 text-erp-success hover:opacity-70" aria-label="Dismiss success message">
              <X size={17} />
            </button>
          </div>
        )}

        {loading ? (
          <div className="space-y-5">
            <div className="h-52 animate-pulse rounded-2xl bg-erp-surface-secondary" />
            <div className="h-72 animate-pulse rounded-2xl bg-erp-surface-secondary" />
          </div>
        ) : error && !employee ? (
          <section className="rounded-2xl border border-erp-border bg-erp-surface p-10 text-center shadow-erp-card">
            <AlertCircle size={38} className="mx-auto text-erp-danger" />
            <h2 className="mt-4 text-lg font-bold">Unable to load employee</h2>
            <p className="mt-2 text-sm text-erp-text-secondary">Check your access or try loading the employee again.</p>
            <button type="button" onClick={() => fetchEmployee()} className={`${buttonClass} mt-5 bg-erp-primary text-white hover:bg-erp-primary-hover`}>
              <RefreshCw size={16} />
              Try Again
            </button>
          </section>
        ) : employee ? (
          <>
            <section className="overflow-hidden rounded-2xl border border-erp-border bg-erp-surface shadow-erp-card">
              <div className="h-1.5 bg-erp-primary" />

              <div className="p-5 sm:p-7">
                <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-erp-primary-light text-erp-primary sm:h-24 sm:w-24">
                      <UserRound size={44} strokeWidth={1.5} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="break-words text-xl font-bold sm:text-2xl">{employee.name || 'Unnamed Employee'}</h2>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${employee.status === 'Active' ? 'bg-erp-success-light text-erp-success' : 'bg-erp-warning-light text-erp-warning'}`}>{employee.status || 'Unknown'}</span>
                      </div>

                      <p className="mt-2 break-all text-sm text-erp-text-secondary">{employee.email}</p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-erp-primary-light px-3 py-1.5 text-xs font-semibold text-erp-primary-dark">
                          <ShieldCheck size={14} />
                          {employee.role || 'Employee'}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-erp-border bg-erp-surface-secondary px-3 py-1.5 text-xs font-medium text-erp-text-secondary">
                          <BriefcaseBusiness size={14} />
                          {(employee.roles || []).length} assigned roles
                        </span>
                      </div>
                    </div>
                  </div>

                  {!editing && (
                    <button
                      type="button"
                      onClick={() => {
                        setForm(createForm(employee))
                        setError('')
                        setSuccess('')
                        setEditing(true)
                        fetchRoles()
                      }}
                      className={`${buttonClass} bg-erp-primary text-white hover:bg-erp-primary-hover`}
                    >
                      <Pencil size={16} />
                      Edit Employee
                    </button>
                  )}
                </div>
              </div>
            </section>

            <form onSubmit={handleSave} className="space-y-6">
              <section className="rounded-2xl border border-erp-border bg-erp-surface p-5 shadow-erp-card sm:p-7">
                <div className="mb-6 flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">
                    <UserRound size={21} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Personal Information</h2>
                    <p className="mt-1 text-sm text-erp-text-secondary">Basic details associated with this employee account.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <label htmlFor="employee-name" className="text-sm font-semibold">
                      Full Name <span className="text-erp-danger">*</span>
                    </label>
                    {editing ? (
                      <input id="employee-name" className={inputClass} value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="Enter employee name" required maxLength={100} />
                    ) : (
                      <div className="mt-2 flex min-h-12 items-center gap-3 rounded-xl border border-erp-border bg-erp-surface-secondary/50 px-4 py-3">
                        <UserRound size={17} className="shrink-0 text-erp-text-muted" />
                        <span className="break-words text-sm font-medium">{employee.name || 'Not provided'}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label htmlFor="employee-email" className="text-sm font-semibold">
                      Email Address <span className="text-erp-danger">*</span>
                    </label>
                    {editing ? (
                      <input id="employee-email" type="email" className={inputClass} value={form.email} onChange={(event) => updateField('email', event.target.value)} placeholder="employee@example.com" required maxLength={254} />
                    ) : (
                      <div className="mt-2 flex min-h-12 items-center gap-3 rounded-xl border border-erp-border bg-erp-surface-secondary/50 px-4 py-3">
                        <Mail size={17} className="shrink-0 text-erp-text-muted" />
                        <span className="break-all text-sm font-medium">{employee.email || 'Not provided'}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label htmlFor="employee-phone" className="text-sm font-semibold">
                      Phone Number
                    </label>
                    {editing ? (
                      <input id="employee-phone" type="tel" className={inputClass} value={form.phone} onChange={(event) => updateField('phone', event.target.value)} placeholder="Enter phone number" maxLength={20} />
                    ) : (
                      <div className="mt-2 flex min-h-12 items-center gap-3 rounded-xl border border-erp-border bg-erp-surface-secondary/50 px-4 py-3">
                        <Phone size={17} className="shrink-0 text-erp-text-muted" />
                        <span className="text-sm font-medium">{employee.phone || 'Not provided'}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-semibold">Account Role</label>
                    <div className="mt-2 flex min-h-12 items-center gap-3 rounded-xl border border-erp-border bg-erp-surface-secondary/50 px-4 py-3">
                      <ShieldCheck size={17} className="shrink-0 text-erp-text-muted" />
                      <span className="text-sm font-medium">{employee.role || 'Employee'}</span>
                      <span className="ml-auto rounded-md bg-erp-surface-secondary px-2 py-1 text-xs text-erp-text-secondary">System</span>
                    </div>
                    <p className="mt-2 text-xs text-erp-text-muted">The account role is managed by the system.</p>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-erp-border bg-erp-surface p-5 shadow-erp-card sm:p-7">
                <div className="mb-6 flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">
                    <ShieldCheck size={21} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-bold">Role & Access</h2>
                    <p className="mt-1 text-sm text-erp-text-secondary">Assign the roles this employee needs to perform their work.</p>
                  </div>
                  <span className="shrink-0 rounded-lg bg-erp-primary-light px-3 py-1.5 text-xs font-semibold text-erp-primary-dark">{form.roles.length} selected</span>
                </div>

                {editing ? (
                  <>
                    {roleError && (
                      <div className="mb-4 rounded-xl border border-erp-warning/30 bg-erp-warning-light p-3 text-sm text-erp-warning">
                        {roleError}
                        <button type="button" onClick={fetchRoles} className="ml-2 font-bold underline">
                          Retry
                        </button>
                      </div>
                    )}

                    <div className="relative mb-4">
                      <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-erp-text-muted" />
                      <input value={searchRole} onChange={(event) => setSearchRole(event.target.value)} className={`${inputClass} mt-0 pl-10`} placeholder="Search available roles..." aria-label="Search available roles" />
                    </div>

                    {filteredRoles.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-erp-border p-7 text-center">
                        <ShieldCheck size={28} className="mx-auto text-erp-text-muted" />
                        <p className="mt-3 text-sm font-semibold">No roles found</p>
                        <p className="mt-1 text-xs text-erp-text-secondary">Try another search or check your role permissions.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {filteredRoles.map((option) => {
                          const selected = hasRole(option)

                          return (
                            <button
                              type="button"
                              key={option.type === 'Custom' ? `custom-${option._id}` : `predefined-${option.name}`}
                              onClick={() => toggleRole(option)}
                              className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${
                                selected ? 'border-erp-primary bg-erp-primary-light/50 ring-1 ring-erp-primary/20' : 'border-erp-border bg-erp-surface hover:bg-erp-hover'
                              }`}
                            >
                              <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${selected ? 'border-erp-primary bg-erp-primary text-white' : 'border-erp-border bg-erp-surface'}`}>
                                {selected && <CheckCircle2 size={14} />}
                              </span>

                              <span className="min-w-0 flex-1">
                                <span className="block break-words text-sm font-semibold">{option.name}</span>
                                <span className="mt-2 inline-block rounded-md bg-erp-surface-secondary px-2 py-1 text-xs text-erp-text-secondary">{option.type === 'Custom' ? 'Custom role' : 'Predefined role'}</span>
                                {option.description && <span className="mt-2 block text-xs text-erp-text-secondary">{option.description}</span>}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    )}

                    <p className="mt-4 text-xs leading-5 text-erp-text-secondary">Only assign roles you are authorized to grant. The server validates role permissions when changes are saved.</p>
                  </>
                ) : (employee.roles || []).length === 0 ? (
                  <div className="rounded-xl border border-dashed border-erp-border p-8 text-center">
                    <LockKeyhole size={30} className="mx-auto text-erp-text-muted" />
                    <h3 className="mt-3 font-semibold">No roles assigned</h3>
                    <p className="mt-1 text-sm text-erp-text-secondary">This employee does not currently have any assigned roles.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {employee.roles.map((role, index) => (
                      <div key={`${role.type}-${role.customRoleId || role.name}-${index}`} className="flex items-center gap-3 rounded-xl border border-erp-border p-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">
                          <ShieldCheck size={20} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-semibold">{role.name || 'Unnamed Role'}</p>
                          <p className="mt-1 text-xs text-erp-text-secondary">{role.type === 'Custom' ? 'Custom role' : 'Predefined role'}</p>
                        </div>
                        <CheckCircle2 size={18} className="shrink-0 text-erp-success" />
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-erp-border bg-erp-surface p-5 shadow-erp-card sm:p-7">
                <div className="mb-5 flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">
                    <Users size={21} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Account Status</h2>
                    <p className="mt-1 text-sm text-erp-text-secondary">Control whether this employee account remains active.</p>
                  </div>
                </div>

                {editing ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {[
                      {
                        value: 'Active',
                        title: 'Active',
                        description: 'Employee account is enabled.',
                        icon: UserCheck,
                      },
                      {
                        value: 'Inactive',
                        title: 'Inactive',
                        description: 'Employee account is disabled.',
                        icon: UserX,
                      },
                    ].map((item) => {
                      const StatusIcon = item.icon
                      const selected = form.status === item.value

                      return (
                        <button
                          type="button"
                          key={item.value}
                          onClick={() => updateField('status', item.value)}
                          className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${selected ? 'border-erp-primary bg-erp-primary-light/50 ring-1 ring-erp-primary/20' : 'border-erp-border hover:bg-erp-hover'}`}
                        >
                          <StatusIcon size={23} className={item.value === 'Active' ? 'text-erp-success' : 'text-erp-warning'} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold">{item.title}</span>
                            <span className="mt-1 block text-xs text-erp-text-secondary">{item.description}</span>
                          </span>
                          {selected && <CheckCircle2 size={18} className="text-erp-primary" />}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex items-center gap-3 rounded-xl border border-erp-border p-4">
                    {employee.status === 'Active' ? <UserCheck size={24} className="text-erp-success" /> : <UserX size={24} className="text-erp-warning" />}
                    <div>
                      <p className="text-sm font-semibold">{employee.status || 'Unknown'}</p>
                      <p className="mt-1 text-xs text-erp-text-secondary">Current employee account status</p>
                    </div>
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-erp-border bg-erp-surface p-5 shadow-erp-card sm:p-7">
                <h2 className="text-lg font-bold">Account Information</h2>
                <p className="mt-1 text-sm text-erp-text-secondary">Reference details for this employee record.</p>

                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-erp-border p-4">
                    <div className="flex items-center gap-2 text-sm text-erp-text-secondary">
                      <CalendarDays size={17} />
                      Created At
                    </div>
                    <p className="mt-2 text-sm font-semibold">{employee.createdAt ? new Date(employee.createdAt).toLocaleString() : 'Not available'}</p>
                  </div>

                  <div className="rounded-xl border border-erp-border p-4">
                    <div className="flex items-center gap-2 text-sm text-erp-text-secondary">
                      <Building2 size={17} />
                      Company
                    </div>
                    <p className="mt-2 text-sm font-semibold">{employee.companyId ? 'Assigned to your company' : 'Not assigned'}</p>
                  </div>
                </div>
              </section>

              {editing && (
                <div className="sticky bottom-3 z-10 flex flex-col justify-between gap-3 rounded-2xl border border-erp-border bg-erp-surface/95 p-4 shadow-erp-card backdrop-blur sm:flex-row sm:items-center">
                  <p className="text-xs text-erp-text-secondary">Review your changes before saving.</p>

                  <div className="flex flex-col-reverse gap-2 sm:flex-row">
                    <button type="button" onClick={cancelEditing} disabled={saving} className={`${buttonClass} border border-erp-border bg-erp-surface hover:bg-erp-hover`}>
                      <X size={16} />
                      Cancel
                    </button>

                    <button type="submit" disabled={saving} className={`${buttonClass} bg-erp-primary text-white hover:bg-erp-primary-hover`}>
                      {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                      {saving ? 'Saving Changes...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              )}
            </form>

            {!editing && (
              <div className="flex justify-start pb-4">
                <button type="button" onClick={() => navigate('/company/employees')} className={`${buttonClass} border border-erp-border bg-erp-surface hover:bg-erp-hover`}>
                  <ArrowLeft size={16} />
                  Back to Employees
                </button>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}
