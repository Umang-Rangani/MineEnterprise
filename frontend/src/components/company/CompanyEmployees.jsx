import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { UserRoundPlus, Search, RefreshCw, Eye, Pencil, Trash2, ShieldCheck, Mail, Phone, LoaderCircle, PackageOpen, ChevronLeft, ChevronRight, Filter, FilterX } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import TrashBox from '../../TrashBox/TrashBox'
import Loading from '../Loading/Loading'

const STORAGE_KEY = 'mineerp_employees_preferences'
const SEARCH_STORAGE_KEY = 'mineerp_employee_search'
const DEBOUNCE_DELAY = 400

function humanize(value) {
  return String(value || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function getStoredPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')

    return {
      statusFilter: ['All', 'Active', 'Inactive'].includes(saved.statusFilter) ? saved.statusFilter : 'All',
      roleFilter: typeof saved.roleFilter === 'string' ? saved.roleFilter : 'All',
      pageSize: [5, 10, 20].includes(Number(saved.pageSize)) ? Number(saved.pageSize) : 5,
    }
  } catch {
    return {
      statusFilter: 'All',
      roleFilter: 'All',
      pageSize: 5,
    }
  }
}

function getStoredSearch() {
  try {
    return localStorage.getItem(SEARCH_STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

function getEmployeeRoles(employee) {
  if (Array.isArray(employee.roleNames) && employee.roleNames.length) {
    return employee.roleNames.filter(Boolean)
  }

  return (employee.roles || []).map((role) => (typeof role === 'string' ? role : role?.name)).filter(Boolean)
}

function getEmployeeRoleKey(role) {
  if (typeof role === 'string') return role

  if (role?.type === 'Custom' && role.customRoleId) {
    return `Custom:${role.customRoleId}`
  }

  return role?.name || ''
}

function getEmployeeRoleOptions(roles) {
  return roles
    .map((role) => {
      if (typeof role === 'string') {
        return { name: role, value: role }
      }

      return {
        name: role.name,
        value: role.value || (role.type === 'Custom' && role.customRoleId ? `Custom:${role.customRoleId}` : role.name),
      }
    })
    .filter((role) => role.name && role.value)
}

export default function CompanyEmployees() {
  const navigate = useNavigate()
  const location = useLocation()

  const [employees, setEmployees] = useState([])
  const [availableRoles, setAvailableRoles] = useState([])

  const [search, setSearch] = useState(getStoredSearch)
  const [debouncedSearch, setDebouncedSearch] = useState(getStoredSearch)

  const [initialPreferences] = useState(getStoredPreferences)
  const [statusFilter, setStatusFilter] = useState(initialPreferences.statusFilter)
  const [roleFilter, setRoleFilter] = useState(initialPreferences.roleFilter)
  const [pageSize, setPageSize] = useState(initialPreferences.pageSize)
  const [currentPage, setCurrentPage] = useState(1)

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
  })

  const [pagination, setPagination] = useState({
    page: 1,
    limit: initialPreferences.pageSize,
    total: 0,
    totalPages: 1,
  })

  const [initialLoading, setInitialLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [confirmEmployee, setConfirmEmployee] = useState(null)
  const [toast, setToast] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const hasActiveFilters = Boolean(search.trim()) || statusFilter !== 'All' || roleFilter !== 'All'

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
    document.title = 'Employees | MineERP'
  }, [])

  // Save the search immediately. This does not make an API request.
  useEffect(() => {
    try {
      localStorage.setItem(SEARCH_STORAGE_KEY, search)
    } catch {
      // Search continues to work without localStorage.
    }
  }, [search])

  // Keep preferences in localStorage.
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          statusFilter,
          roleFilter,
          pageSize,
        }),
      )
    } catch {
      // The page remains usable if storage is unavailable.
    }
  }, [statusFilter, roleFilter, pageSize])

  // Debounce search. Only the settled search value triggers the API.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim())
      setCurrentPage(1)
    }, DEBOUNCE_DELAY)

    return () => clearTimeout(timer)
  }, [search])

  // Server-side search, filters, pagination and page size.
  useEffect(() => {
    let cancelled = false

    async function fetchEmployees() {
      setIsFetching(true)

      try {
        const response = await axiosInstance.get('/erp/employees', {
          params: {
            page: currentPage,
            limit: pageSize,
            search: debouncedSearch,
            status: statusFilter,
            role: roleFilter,
          },
        })

        if (cancelled) return

        const data = response.data || {}
        const paginationData = data.pagination || {}
        const statsData = data.stats || {}

        const responseEmployees = Array.isArray(data.employees) ? data.employees : []

        setEmployees(responseEmployees)

        setStats({
          total: statsData.totalEmployees ?? 0,
          active: statsData.activeEmployees ?? 0,
          inactive: statsData.inactiveEmployees ?? 0,
        })

        const serverPage = paginationData.page ?? currentPage

        setPagination({
          page: serverPage,
          limit: paginationData.limit ?? pageSize,
          total: paginationData.totalEmployees ?? 0,
          totalPages: Math.max(1, paginationData.totalPages ?? 1),
        })

        // Sync with the valid page returned by the backend.
        if (serverPage !== currentPage) {
          setCurrentPage(serverPage)
        }

        if (Array.isArray(data.availableRoles)) {
          setAvailableRoles(getEmployeeRoleOptions(data.availableRoles))
        }
      } catch (error) {
        if (!cancelled) {
          showToast('error', error.response?.data?.message || 'Unable to load employees. Please try again.')
        }
      } finally {
        if (!cancelled) {
          setIsFetching(false)
          setInitialLoading(false)
          setRefreshing(false)
        }
      }
    }

    fetchEmployees()

    return () => {
      cancelled = true
    }
  }, [currentPage, pageSize, debouncedSearch, statusFilter, roleFilter, refreshKey])

  // Show a success message passed from another page.
  useEffect(() => {
    if (!location.state?.message) return

    showToast('success', location.state.message)

    navigate(location.pathname, {
      replace: true,
      state: null,
    })
  }, [location.state, location.pathname, navigate])

  const handleRefresh = () => {
    if (isFetching) return

    setRefreshing(true)
    setRefreshKey((key) => key + 1)
  }

  const handleDelete = async () => {
    if (!confirmEmployee?._id || deletingId) return

    const employeeId = confirmEmployee._id
    setDeletingId(employeeId)

    try {
      const response = await axiosInstance.delete(`/erp/employees/${employeeId}`)

      if (response.data?.success === false) {
        throw new Error(response.data.message || 'Unable to delete employee.')
      }

      setConfirmEmployee(null)

      showToast('success', response.data?.message || 'Employee deleted successfully.')

      // Refresh the list; the backend will correct the page if needed.
      setRefreshKey((key) => key + 1)
    } catch (error) {
      showToast('error', error.response?.data?.message || error.message || 'Unable to delete employee. Please try again.')
    } finally {
      setDeletingId('')
    }
  }

  const resetFilters = () => {
    setSearch('')

    try {
      localStorage.removeItem(SEARCH_STORAGE_KEY)
    } catch {
      // Ignore storage errors.
    }

    setStatusFilter('All')
    setRoleFilter('All')
    setCurrentPage(1)
  }

  const openCreate = () => {
    navigate('/company/employees/new')
  }

  const openEdit = (employee) => {
    navigate(`/company/employees/${employee._id}/edit`)
  }

  const openDetails = (employee) => {
    navigate(`/company/employees/${employee._id}`)
  }

  const totalPages = Math.max(1, pagination.totalPages)
  const safePage = Math.min(pagination.page, totalPages)

  const startItem = pagination.total === 0 ? 0 : (safePage - 1) * pagination.limit + 1

  const endItem = Math.min(safePage * pagination.limit, pagination.total)

  const items = [{ title: 'Employees', link: null }]

  return (
    <div className="min-w-0 space-y-4 text-sm">
      <Toast toast={toast} onClose={closeToast} />

      {/* Header */}
      <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        <div className="h-1 bg-erp-primary" />

        <div className="flex h-[calc(100%-4px)] min-w-0 items-center justify-between gap-3 px-4 sm:px-5">
          {/* Breadcrumb */}
          <div className="min-w-0 flex-1 overflow-hidden">
            <BreadCrumb items={items} />
          </div>

          {/* Employee Stats & Actions */}
          <div className="flex shrink-0 items-center gap-2">
            {/* Total Employees */}
            <div className="flex h-9 items-center gap-2 whitespace-nowrap rounded-lg border border-erp-border px-3">
              <span className="text-xs text-slate-500">Total</span>
              <span className="text-sm font-bold text-slate-900">{stats.total}</span>
            </div>

            {/* Inactive */}
            <div className="flex h-9 items-center gap-2 whitespace-nowrap rounded-lg border border-amber-200 px-3">
              <span className="text-xs text-amber-700">Inactive</span>
              <span className="text-sm font-bold text-slate-900">{stats.inactive}</span>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isFetching}
              title="Refresh employees"
              aria-label="Refresh employees"
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-erp-border bg-erp-surface px-3 text-xs font-semibold text-slate-600 transition hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>

            {/* Add Employee Button */}
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-erp-primary px-3.5 text-xs font-semibold text-white transition hover:bg-erp-primary-hover focus:outline-none focus:ring-2 focus:ring-erp-primary/30 focus:ring-offset-1"
            >
              <UserRoundPlus size={15} />
              <span>Add Employee</span>
            </button>
          </div>
        </div>
      </section>
      
      {/* Employee list */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Search and filters */}
        <div className="flex flex-col gap-3 border-b border-slate-100 p-3 sm:px-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-1 lg:flex-wrap lg:justify-between">
            <div className="flex gap-5">
              <div className="relative min-w-0 lg:w-100">
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

              {hasActiveFilters && (
                <button type="button" onClick={resetFilters} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 sm:text-sm">
                  <FilterX size={14} />
                  {/* Clear filters */}
                </button>
              )}
            </div>
            <div className="flex gap-5">
              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value)
                  setCurrentPage(1)
                }}
                aria-label="Filter employees by status"
                className="h-9 min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10 sm:text-sm"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>

              <select
                value={roleFilter}
                onChange={(event) => {
                  setRoleFilter(event.target.value)
                  setCurrentPage(1)
                }}
                aria-label="Filter employees by role"
                className="h-9 min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10 sm:text-sm"
              >
                <option value="All">All Roles</option>

                {availableRoles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {humanize(role.name)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table content and in-table loading overlay */}
        <div className="relative min-h-[220px]">
          {initialLoading ? (
            <div className="flex min-h-[280px] items-center justify-center">
              <Loading fullScreen={false} label="Loading employees" description="Fetching employee records..." className="!h-full min-h-[220px]" />
            </div>
          ) : employees.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center px-4 py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                <PackageOpen size={24} />
              </div>

              <h3 className="mt-3 text-sm font-bold text-slate-800">{hasActiveFilters ? 'No matching employees' : 'No employees yet'}</h3>

              <p className="mt-1 max-w-xs text-xs text-slate-500">{hasActiveFilters ? 'Try another search or change your filters.' : 'Add your first employee to start managing your team.'}</p>

              {hasActiveFilters ? (
                <button type="button" onClick={resetFilters} className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                  <Filter size={14} />
                  Clear filters
                </button>
              ) : (
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
                    {employees.map((employee) => {
                      const roles = getEmployeeRoles(employee)

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
                              {roles.map((role, index) => (
                                <span key={`${role}-${index}`} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600">
                                  <ShieldCheck size={12} />
                                  {humanize(role)}
                                </span>
                              ))}
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-1 text-[11px] font-semibold ${employee.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${employee.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
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
                                onClick={() => setConfirmEmployee(employee)}
                                disabled={Boolean(deletingId)}
                                title="Delete employee"
                                aria-label={`Delete ${employee.name}`}
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

              {/* Mobile cards */}
              <div className="divide-y divide-slate-100 md:hidden">
                {employees.map((employee) => {
                  const roles = getEmployeeRoles(employee)

                  return (
                    <div key={employee._id} className="space-y-3 p-3">
                      <div className="flex items-start gap-2.5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-erp-primary/10 text-sm font-bold text-erp-primary">{employee.name?.trim()?.charAt(0)?.toUpperCase() || 'E'}</div>

                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-semibold text-slate-900">{employee.name || 'Unnamed employee'}</p>
                          <p className="mt-0.5 break-all text-xs text-slate-500">{employee.email}</p>
                          {employee.phone && <p className="mt-1 text-[11px] text-slate-500">{employee.phone}</p>}
                        </div>

                        <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-1 text-[11px] font-semibold ${employee.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${employee.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {humanize(employee.status || 'Inactive')}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {roles.map((role, index) => (
                          <span key={`${role}-${index}`} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600">
                            <ShieldCheck size={12} />
                            {humanize(role)}
                          </span>
                        ))}
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
                          onClick={() => setConfirmEmployee(employee)}
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

          {/* Loading overlay: only the table/list area is covered. */}
          {!initialLoading && isFetching && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 backdrop-blur-[2px]">
              <Loading fullScreen={false} label="Updating employees" description="Applying search, filters and pagination..." className="!h-full min-h-[220px]" />
            </div>
          )}
        </div>

        {/* Pagination */}
        {!initialLoading && (
          <div className="flex flex-col gap-3 border-t border-slate-100 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs text-slate-500 sm:text-sm">
                Showing{' '}
                <span className="font-semibold text-slate-700">
                  {startItem}–{endItem}
                </span>{' '}
                of <span className="font-semibold text-slate-700">{pagination.total}</span> employees
              </p>

              <div className="flex items-center gap-2">
                <label htmlFor="employee-page-size" className="whitespace-nowrap text-xs text-slate-500">
                  Rows:
                </label>

                <select
                  id="employee-page-size"
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value))
                    setCurrentPage(1)
                  }}
                  className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage <= 1 || isFetching}
                onClick={() => setCurrentPage(1)}
                className="flex h-8 items-center justify-center rounded-lg border border-slate-200 px-2 text-xs text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                1
              </button>

              <button
                type="button"
                disabled={safePage <= 1 || isFetching}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                aria-label="Previous page"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>

              <span className="min-w-20 px-1 text-center text-xs text-slate-600 sm:text-sm">
                Page {safePage} of {totalPages}
              </span>

              <button
                type="button"
                disabled={safePage >= totalPages || isFetching}
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                aria-label="Next page"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>

              <button
                type="button"
                disabled={safePage >= totalPages || isFetching}
                onClick={() => setCurrentPage(totalPages)}
                className="flex h-8 items-center justify-center rounded-lg border border-slate-200 px-2 text-xs text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {totalPages}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Delete confirmation */}
      <TrashBox
        isOpen={Boolean(confirmEmployee)}
        onClose={() => {
          if (!deletingId) setConfirmEmployee(null)
        }}
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
