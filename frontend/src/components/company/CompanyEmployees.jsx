import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Users, UserRoundPlus, Search, RefreshCw, Eye, Pencil, UserCheck, UserX, ShieldCheck, Mail, Phone, ChevronRight, CircleCheck, AlertCircle, LoaderCircle, PackageOpen } from 'lucide-react'
import axiosInstance from '../../api/axiosInstance'

function humanize(value) {
  return String(value || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function getRoleNames(employee) {
  if (Array.isArray(employee.roles) && employee.roles.length > 0) {
    return employee.roles.map((role) => role.name).filter(Boolean)
  }

  return employee.role ? [humanize(employee.role)] : []
}

function StatCard({ title, value, icon: Icon, tone }) {
  const tones = {
    violet: 'bg-violet-50 text-violet-700',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
        </div>

        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${tones[tone] || tones.violet}`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const active = status === 'Active'

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
      {humanize(status || 'Inactive')}
    </span>
  )
}

export default function CompanyEmployees() {
  const navigate = useNavigate()
  const location = useLocation()

  const [employees, setEmployees] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(location.state?.message || '')

  const loadEmployees = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setError('')

    try {
      const response = await axiosInstance.get('/erp/employees')
      setEmployees(response.data.employees || [])
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load employees. Please try again.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadEmployees()
  }, [])

  useEffect(() => {
    if (location.state?.message) {
      setSuccess(location.state.message)

      // Clear navigation state so the message does not reappear
      // when this page is revisited.
      navigate(location.pathname, {
        replace: true,
        state: null,
      })
    }
  }, [location.state, location.pathname, navigate])

  const normalizedSearch = search.trim().toLowerCase()

  const filteredEmployees = employees.filter((employee) => {
    const roleNames = getRoleNames(employee).join(' ')

    return [employee.name, employee.email, employee.phone, roleNames, employee.status].filter(Boolean).some((value) => String(value).toLowerCase().includes(normalizedSearch))
  })

  const activeCount = employees.filter((employee) => employee.status === 'Active').length

  const inactiveCount = employees.filter((employee) => employee.status !== 'Active').length

  const openCreate = () => {
    navigate('/company/employees/new')
  }

  const openEdit = (employee) => {
    navigate(`/company/employees/${employee._id}/edit`)
  }

  const openDetails = (employee) => {
    navigate(`/company/employees/${employee._id}`)
  }

  return (
    <div className="min-h-screen bg-slate-50/80 ">
      <div className="mx-auto  space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>Company</span>
              <ChevronRight size={15} />
              <span className="font-medium text-erp-primary">Employees</span>
            </div>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Employees</h1>

            <p className="mt-1 text-sm text-slate-500">Manage your team, roles and employee access.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => loadEmployees(true)}
              disabled={refreshing || loading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
            >
              <RefreshCw size={17} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>

            <button type="button" onClick={openCreate} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-erp-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-erp-primary-hover">
              <UserRoundPlus size={18} />
              Add Employee
            </button>
          </div>
        </div>

        {/* Notifications */}
        {success && (
          <div role="status" className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <CircleCheck size={19} className="mt-0.5 shrink-0" />
            <span className="flex-1">{success}</span>
            <button type="button" onClick={() => setSuccess('')} aria-label="Dismiss success message" className="font-semibold">
              ×
            </button>
          </div>
        )}

        {error && (
          <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={19} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard title="Total Employees" value={employees.length} icon={Users} tone="violet" />

          <StatCard title="Active Employees" value={activeCount} icon={UserCheck} tone="green" />

          <StatCard title="Inactive Employees" value={inactiveCount} icon={UserX} tone="amber" />
        </div>

        {/* Employee table */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="font-bold text-slate-900">All Employees</h2>
              <p className="mt-1 text-sm text-slate-500">
                {filteredEmployees.length} employee
                {filteredEmployees.length === 1 ? '' : 's'} found
              </p>
            </div>

            <div className="relative w-full sm:max-w-sm">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, email or role..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none transition focus:border-erp-primary focus:bg-white focus:ring-4 focus:ring-erp-primary/10"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center">
              <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
                <LoaderCircle size={22} className="animate-spin" />
                Loading employees...
              </div>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center px-5 py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <PackageOpen size={30} />
              </div>

              <h3 className="mt-4 font-bold text-slate-800">{search ? 'No employees found' : 'No employees yet'}</h3>

              <p className="mt-1 max-w-sm text-sm text-slate-500">{search ? 'Try another search term.' : 'Add your first employee to start managing your team.'}</p>

              {!search && (
                <button type="button" onClick={openCreate} className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-erp-primary px-4 text-sm font-semibold text-white hover:bg-erp-primary-hover">
                  <UserRoundPlus size={17} />
                  Add Employee
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[850px] text-left">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-100">
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Employee</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Contact</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Roles</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredEmployees.map((employee) => {
                      const roles = getRoleNames(employee)

                      return (
                        <tr key={employee._id} className="transition hover:bg-slate-50/70">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-erp-primary/10 text-sm font-bold text-erp-primary">{employee.name?.trim()?.charAt(0)?.toUpperCase() || 'E'}</div>

                              <div className="min-w-0">
                                <p className="font-semibold text-slate-800">{employee.name}</p>
                                <p className="mt-0.5 text-xs text-slate-400">ID: {String(employee._id).slice(-8)}</p>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 text-sm text-slate-700">
                                <Mail size={14} className="shrink-0 text-slate-400" />
                                <span>{employee.email}</span>
                              </div>

                              {employee.phone && (
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                  <Phone size={13} className="shrink-0 text-slate-400" />
                                  <span>{employee.phone}</span>
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex max-w-xs flex-wrap gap-1.5">
                              {roles.length > 0 ? (
                                roles.map((role) => (
                                  <span key={role} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600">
                                    <ShieldCheck size={12} />
                                    {humanize(role)}
                                  </span>
                                ))
                              ) : (
                                <span className="text-sm text-slate-400">No role assigned</span>
                              )}
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <StatusBadge status={employee.status} />
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openDetails(employee)}
                                title="View employee details"
                                aria-label={`View ${employee.name}`}
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-erp-primary/30 hover:bg-erp-primary/5 hover:text-erp-primary"
                              >
                                <Eye size={17} />
                              </button>

                              <button
                                type="button"
                                onClick={() => openEdit(employee)}
                                title="Edit employee"
                                aria-label={`Edit ${employee.name}`}
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-erp-primary/30 hover:bg-erp-primary/5 hover:text-erp-primary"
                              >
                                <Pencil size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile employee cards */}
              <div className="divide-y divide-slate-100 md:hidden">
                {filteredEmployees.map((employee) => {
                  const roles = getRoleNames(employee)

                  return (
                    <div key={employee._id} className="space-y-4 p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-erp-primary/10 font-bold text-erp-primary">{employee.name?.trim()?.charAt(0)?.toUpperCase() || 'E'}</div>

                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900">{employee.name}</p>
                          <p className="mt-1 break-all text-sm text-slate-500">{employee.email}</p>
                          {employee.phone && <p className="mt-1 text-xs text-slate-500">{employee.phone}</p>}
                        </div>

                        <StatusBadge status={employee.status} />
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {roles.map((role) => (
                          <span key={role} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600">
                            {humanize(role)}
                          </span>
                        ))}
                      </div>

                      <div className="flex gap-2 border-t border-slate-100 pt-3">
                        <button type="button" onClick={() => openDetails(employee)} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                          <Eye size={16} />
                          View Details
                        </button>

                        <button type="button" onClick={() => openEdit(employee)} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-erp-primary/10 text-sm font-semibold text-erp-primary hover:bg-erp-primary/15">
                          <Pencil size={16} />
                          Edit Employee
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
