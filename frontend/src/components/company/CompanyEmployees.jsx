import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Users, UserRoundPlus, Search, RefreshCw, Eye, Pencil, Trash2, UserCheck, UserX, ShieldCheck, Mail, Phone, LoaderCircle, PackageOpen, X } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import TrashBox from '../../TrashBox/TrashBox'
import { CompanyEmployeesShimmer } from './CompanyEmployeeShimmer'

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

export default function CompanyEmployees() {
  const navigate = useNavigate()
  const location = useLocation()

  const [employees, setEmployees] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [confirmEmployee, setConfirmEmployee] = useState(null)
  const [toast, setToast] = useState(null)

  function showToast(type, message, duration = 3000) {
    setToast({
      id: Date.now(),
      type,
      message,
      duration,
    })
  }

  function closeToast() {
    setToast(null)
  }

  useEffect(() => {
    document.title = 'Employees | MineERP'
  }, [])

  async function loadEmployees(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const response = await axiosInstance.get('/erp/employees')

      setEmployees(response.data.employees || [])

      if (isRefresh) {
        showToast('success', 'Employees refreshed successfully.')
      }
    } catch (requestError) {
      showToast('error', requestError.response?.data?.message || 'Unable to load employees. Please try again.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadEmployees()
  }, [])

  useEffect(() => {
    if (!location.state?.message) return

    showToast('success', location.state.message)

    navigate(location.pathname, {
      replace: true,
      state: null,
    })
  }, [location.state, location.pathname, navigate])

  async function handleDelete() {
    if (!confirmEmployee?._id || deletingId) return

    const employeeId = confirmEmployee._id

    setDeletingId(employeeId)

    try {
      const response = await axiosInstance.delete(`/erp/employees/${employeeId}`)

      if (response.data?.success === false) {
        throw new Error(response.data.message || 'Unable to delete employee.')
      }

      setEmployees((currentEmployees) => currentEmployees.filter((employee) => employee._id !== employeeId))

      setConfirmEmployee(null)

      showToast('success', response.data?.message || 'Employee deleted successfully.')
    } catch (requestError) {
      showToast('error', requestError.response?.data?.message || requestError.message || 'Unable to delete employee. Please try again.')

      // Keep the confirmation open so the user can retry or cancel.
    } finally {
      setDeletingId('')
    }
  }

  const normalizedSearch = search.trim().toLowerCase()

  const filteredEmployees = employees.filter((employee) => {
    const roleNames = getRoleNames(employee).join(' ')

    return [employee.name, employee.email, employee.phone, roleNames, employee.status].filter(Boolean).some((value) => String(value).toLowerCase().includes(normalizedSearch))
  })

  const activeCount = employees.filter((employee) => employee.status === 'Active').length

  const inactiveCount = employees.length - activeCount

  function openCreate() {
    navigate('/company/employees/new')
  }

  function openEdit(employee) {
    navigate(`/company/employees/${employee._id}/edit`)
  }

  function openDetails(employee) {
    navigate(`/company/employees/${employee._id}`)
  }

  function requestDelete(employee) {
    if (deletingId) return
    setConfirmEmployee(employee)
  }

  function closeDeleteConfirmation() {
    if (deletingId) return
    setConfirmEmployee(null)
  }

  const items = [{ title: 'Employees', link: null }]

  if (loading || refreshing) {
    return (
      <>
        <Toast toast={toast} onClose={closeToast} />
        <CompanyEmployeesShimmer />
      </>
    )
  }
  return (
    <div className="min-w-0 space-y-4 text-sm">
      <Toast toast={toast} onClose={closeToast} />

      {/* Header */}
      <div className="flex min-h-10 min-w-0 items-center justify-between gap-2">
        <div className="flex h-10 min-w-0 flex-1 items-center overflow-hidden">
          <BreadCrumb items={items} />
        </div>

        <div className="flex h-10 shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => loadEmployees(true)}
            disabled={refreshing || loading}
            title="Refresh employees"
            aria-label="Refresh employees"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-60 sm:w-auto sm:px-3"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:ml-1.5 sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-erp-primary px-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-erp-primary-hover sm:px-3.5 sm:text-sm"
          >
            <UserRoundPlus size={15} />
            <span className="hidden xs:inline">Add Employee</span>
            <span className="xs:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 h-22">
        <div className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-slate-500 sm:text-sm">Total Employees</p>
            <p className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{loading ? '—' : employees.length}</p>
          </div>

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
            <Users size={19} />
          </div>
        </div>

        <div className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-slate-500 sm:text-sm">Active Employees</p>
            <p className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{loading ? '—' : activeCount}</p>
          </div>

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <UserCheck size={19} />
          </div>
        </div>

        <div className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-slate-500 sm:text-sm">Inactive Employees</p>
            <p className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{loading ? '—' : inactiveCount}</p>
          </div>

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
            <UserX size={19} />
          </div>
        </div>
      </div>

      {/* Employee list */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">All Employees</h2>
            <p className="mt-0.5 text-xs text-slate-500">{loading ? 'Loading employee records...' : `${filteredEmployees.length} of ${employees.length} employees`}</p>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search employees..."
              aria-label="Search employees"
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none transition placeholder:text-slate-400 focus:border-erp-primary focus:bg-white focus:ring-2 focus:ring-erp-primary/10 sm:text-sm"
            />
          </div>
        </div>

        {filteredEmployees.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center px-4 py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
              <PackageOpen size={24} />
            </div>

            <h3 className="mt-3 text-sm font-bold text-slate-800">{search ? 'No employees found' : 'No employees yet'}</h3>

            <p className="mt-1 max-w-xs text-xs text-slate-500">{search ? 'Try another name, email, phone number or role.' : 'Add your first employee to start managing your team.'}</p>

            {!search && (
              <button type="button" onClick={openCreate} className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg bg-erp-primary px-3 text-xs font-semibold text-white hover:bg-erp-primary-hover">
                <UserRoundPlus size={15} />
                Add Employee
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[800px] text-left">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-100">
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Employee</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Contact</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Roles</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredEmployees.map((employee) => {
                    const roles = getRoleNames(employee)
                    const isActive = employee.status === 'Active'

                    return (
                      <tr key={employee._id} className="transition hover:bg-slate-50/70">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-erp-primary/10 text-sm font-bold text-erp-primary">{employee.name?.trim()?.charAt(0)?.toUpperCase() || 'E'}</div>

                            <div className="min-w-0">
                              <p className="max-w-48 truncate text-xs font-semibold text-slate-800 sm:text-sm">{employee.name || 'Unnamed employee'}</p>
                              <p className="mt-0.5 text-[10px] text-slate-400">ID: {String(employee._id).slice(-8)}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex max-w-56 items-center gap-1.5 text-xs text-slate-700">
                            <Mail size={13} className="shrink-0 text-slate-400" />
                            <span className="truncate">{employee.email}</span>
                          </div>

                          {employee.phone && (
                            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
                              <Phone size={12} className="shrink-0 text-slate-400" />
                              <span>{employee.phone}</span>
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex max-w-64 flex-wrap gap-1">
                            {roles.length > 0 ? (
                              roles.map((role, index) => (
                                <span key={`${role}-${index}`} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600">
                                  <ShieldCheck size={12} />
                                  {humanize(role)}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-slate-400">No role assigned</span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-1 text-[11px] font-semibold ${isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            {humanize(employee.status || 'Inactive')}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openDetails(employee)}
                              title="View employee"
                              aria-label={`View ${employee.name}`}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-erp-primary/30 hover:bg-erp-primary/5 hover:text-erp-primary"
                            >
                              <Eye size={15} />
                            </button>

                            <button
                              type="button"
                              onClick={() => openEdit(employee)}
                              title="Edit employee"
                              aria-label={`Edit ${employee.name}`}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-erp-primary/30 hover:bg-erp-primary/5 hover:text-erp-primary"
                            >
                              <Pencil size={14} />
                            </button>

                            <button
                              type="button"
                              onClick={() => requestDelete(employee)}
                              title="Delete employee"
                              aria-label={`Delete ${employee.name}`}
                              disabled={Boolean(deletingId)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {deletingId === employee._id ? <LoaderCircle size={15} className="animate-spin" /> : <Trash2 size={15} />}
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
                const isActive = employee.status === 'Active'

                return (
                  <div key={employee._id} className="space-y-3 p-3">
                    <div className="flex items-start gap-2.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-erp-primary/10 text-sm font-bold text-erp-primary">{employee.name?.trim()?.charAt(0)?.toUpperCase() || 'E'}</div>

                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm font-semibold text-slate-900">{employee.name || 'Unnamed employee'}</p>
                        <p className="mt-0.5 break-all text-xs text-slate-500">{employee.email}</p>

                        {employee.phone && <p className="mt-1 text-[11px] text-slate-500">{employee.phone}</p>}
                      </div>

                      <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-1 text-[11px] font-semibold ${isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {humanize(employee.status || 'Inactive')}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {roles.length > 0 ? (
                        roles.map((role, index) => (
                          <span key={`${role}-${index}`} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600">
                            <ShieldCheck size={12} />
                            {humanize(role)}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400">No role assigned</span>
                      )}
                    </div>

                    <div className="flex gap-2 border-t border-slate-100 pt-2.5">
                      <button type="button" onClick={() => openDetails(employee)} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                        <Eye size={14} />
                        View
                      </button>

                      <button type="button" onClick={() => openEdit(employee)} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-erp-primary/10 text-xs font-semibold text-erp-primary hover:bg-erp-primary/15">
                        <Pencil size={14} />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => requestDelete(employee)}
                        disabled={Boolean(deletingId)}
                        className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deletingId === employee._id ? <LoaderCircle size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        Delete
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </section>

      {/* Delete confirmation using the shared TrashBox */}
      <TrashBox
        isOpen={Boolean(confirmEmployee)}
        onClose={closeDeleteConfirmation}
        title="Delete Employee"
        message={`Are you sure you want to delete "${confirmEmployee?.name || 'this employee'}"? This action may be permanent.`}
        actionButtonText="Delete Employee"
        cancelButtonText="Cancel"
        onAction={handleDelete}
        isProcessing={Boolean(deletingId)}
      />
    </div>
  )
}
