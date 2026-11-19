import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Eye, RefreshCw, FilterX, AlertCircle, LoaderCircle, CalendarDays, ChevronLeft, ChevronRight, Users, UserRound, ShieldCheck, CheckCircle2, XCircle, Building2, UserCheck, UserX, Power } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import TrashBox from '../../TrashBox/TrashBox'
import Loading from '../Loading/Loading'

const statusStyles = {
  Active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Inactive: 'border-slate-200 bg-slate-100 text-slate-600',
}

const roleStyles = {
  CompanyAdmin: 'border-violet-200 bg-violet-50 text-violet-700',
  Employee: 'border-blue-200 bg-blue-50 text-blue-700',
}

const formatNumber = (value) =>
  new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)

const formatDate = (value) => {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const getInitials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase() || 'US'

const getRoleLabel = (role) => {
  if (role === 'CompanyAdmin') return 'Company Admin'
  if (role === 'Employee') return 'Employee'
  return role || '—'
}

export default function SuperAdminUsers() {
  const navigate = useNavigate()

  const [users, setUsers] = useState([])
  const [companies, setCompanies] = useState([])

  const [loading, setLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [apiError, setApiError] = useState('')

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [companyFilter, setCompanyFilter] = useState('All')

  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [refreshKey, setRefreshKey] = useState(0)

  const [updatingUserId, setUpdatingUserId] = useState(null)
  const [statusTarget, setStatusTarget] = useState(null)

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalUsers: 0,
    totalPages: 1,
  })

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCompanyAdmins: 0,
    totalEmployees: 0,
    activeUsers: 0,
    inactiveUsers: 0,
  })

  const [toast, setToast] = useState(null)

  const breadcrumbItems = [
    {
      title: 'Users & Access',
      link: null,
    },
  ]

  const showToast = (type, message) => {
    setToast({
      id: Date.now(),
      type,
      message,
      duration: 3000,
    })
  }

  useEffect(() => {
    document.title = 'Users & Access | MineERP'
  }, [])

  // FETCH COMPANIES FOR FILTER

  useEffect(() => {
    let cancelled = false

    async function fetchCompanies() {
      try {
        const response = await axiosInstance.get('/companies/all', {
          params: {
            page: 1,
            limit: 100,
          },
        })

        if (cancelled) return

        const list = Array.isArray(response.data?.companies) ? response.data.companies : []

        setCompanies(list)
      } catch (error) {
        if (!cancelled) {
          console.error('Unable to load companies for user filter:', error)
        }
      }
    }

    fetchCompanies()

    return () => {
      cancelled = true
    }
  }, [])

  // FETCH USERS

  useEffect(() => {
    let cancelled = false

    async function fetchUsers() {
      const isInitialLoad = !hasLoaded

      if (isInitialLoad) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }

      setApiError('')

      try {
        const response = await axiosInstance.get('/superadmin/users', {
          params: {
            page: currentPage,
            limit: pageSize,
            search: search.trim() || undefined,
            role: roleFilter,
            status: statusFilter,
            companyId: companyFilter === 'All' ? undefined : companyFilter,
          },
        })

        const data = response.data

        if (data?.success === false) {
          throw new Error(data.message || 'Unable to load users.')
        }

        if (cancelled) return

        const list = Array.isArray(data?.users) ? data.users : []

        setUsers(list)

        const serverPagination = data?.pagination

        if (serverPagination) {
          setPagination({
            page: Number(serverPagination.page) || currentPage,
            limit: Number(serverPagination.limit) || pageSize,
            totalUsers: Number(serverPagination.totalUsers) || 0,
            totalPages: Math.max(1, Number(serverPagination.totalPages) || 1),
          })
        } else {
          setPagination({
            page: currentPage,
            limit: pageSize,
            totalUsers: list.length,
            totalPages: 1,
          })
        }

        if (data?.stats) {
          setStats({
            totalUsers: Number(data.stats.totalUsers) || 0,
            totalCompanyAdmins: Number(data.stats.totalCompanyAdmins) || 0,
            totalEmployees: Number(data.stats.totalEmployees) || 0,
            activeUsers: Number(data.stats.activeUsers) || 0,
            inactiveUsers: Number(data.stats.inactiveUsers) || 0,
          })
        }

        setHasLoaded(true)
      } catch (error) {
        if (cancelled) return

        setApiError(error.response?.data?.message || error.message || 'Unable to load users.')
      } finally {
        if (!cancelled) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    }

    fetchUsers()

    return () => {
      cancelled = true
    }
  }, [currentPage, pageSize, search, roleFilter, statusFilter, companyFilter, refreshKey])

  // PAGE VALIDATION

  useEffect(() => {
    if (currentPage > pagination.totalPages) {
      setCurrentPage(Math.max(1, pagination.totalPages))
    }
  }, [currentPage, pagination.totalPages])

  const hasActiveFilters = Boolean(search.trim()) || roleFilter !== 'All' || statusFilter !== 'All' || companyFilter !== 'All'

  const totalPages = Math.max(1, pagination.totalPages)
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * pageSize

  const resetFilters = () => {
    setSearch('')
    setRoleFilter('All')
    setStatusFilter('All')
    setCompanyFilter('All')
    setCurrentPage(1)
  }

  // REFRESH

  const handleRefresh = () => {
    if (refreshing || loading) return

    setRefreshKey((previous) => previous + 1)
  }

  const handleRetry = () => {
    if (refreshing || loading) return

    setRefreshKey((previous) => previous + 1)
  }

  // OPEN ACTIVATE / DEACTIVATE CONFIRMATION

  const openStatusConfirmation = (user) => {
    if (updatingUserId || loading || refreshing) return

    setStatusTarget({
      ...user,
      nextStatus: user.status === 'Active' ? 'Inactive' : 'Active',
    })
  }

  // ACTIVATE / DEACTIVATE USER

  const handleStatusChange = async () => {
    if (!statusTarget || updatingUserId || loading || refreshing) return

    const { _id, nextStatus } = statusTarget

    setUpdatingUserId(_id)

    try {
      const response = await axiosInstance.patch(`/superadmin/users/${_id}/status`, {
        status: nextStatus,
      })

      if (response.data?.success === false) {
        throw new Error(response.data.message || 'Unable to update user status.')
      }

      showToast('success', response.data?.message || `User ${nextStatus.toLowerCase()} successfully.`)

      setStatusTarget(null)
      setRefreshKey((previous) => previous + 1)
    } catch (error) {
      showToast('error', error.response?.data?.message || error.message || 'Unable to update user status.')
    } finally {
      setUpdatingUserId(null)
    }
  }

  // SUMMARY CARDS

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'text-violet-700',
      border: 'border-violet-200',
    },
    {
      title: 'Company Admins',
      value: stats.totalCompanyAdmins,
      icon: ShieldCheck,
      color: 'text-blue-700',
      border: 'border-blue-200',
    },
    {
      title: 'Employees',
      value: stats.totalEmployees,
      icon: UserRound,
      color: 'text-indigo-700',
      border: 'border-indigo-200',
    },
    {
      title: 'Active Users',
      value: stats.activeUsers,
      icon: UserCheck,
      color: 'text-emerald-700',
      border: 'border-emerald-200',
    },
    {
      title: 'Inactive Users',
      value: stats.inactiveUsers,
      icon: UserX,
      color: 'text-slate-600',
      border: 'border-slate-200',
    },
  ]

  // USER ACTIONS

  // USER ACTIONS

  const renderUserActions = (user) => {
    const isUpdating = updatingUserId === user._id
    const canChangeStatus = user.company?.status === 'Approved'

    return (
      <div className="flex items-center justify-end gap-1.5">
        <button
          type="button"
          title="View user details"
          aria-label={`View ${user.name || 'user'}`}
          onClick={() => navigate(`/superadmin/users/${user._id}`)}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-erp-border px-2.5 text-xs font-semibold text-erp-primary transition hover:bg-erp-primary-light"
        >
          <Eye size={14} />
        </button>

        {canChangeStatus && (
          <button
            type="button"
            title={user.status === 'Active' ? 'Deactivate user' : 'Activate user'}
            aria-label={`${user.status === 'Active' ? 'Deactivate' : 'Activate'} ${user.name || 'user'}`}
            disabled={Boolean(updatingUserId) || refreshing || loading}
            onClick={() => openStatusConfirmation(user)}
            className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
              user.status === 'Active' ? 'border-rose-200 text-rose-700 hover:bg-rose-50' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            {isUpdating ? <LoaderCircle size={14} className="animate-spin" /> : <Power size={14} />}

            {/* <span>{user.status === 'Active' ? 'Deactivate' : 'Activate'}</span> */}
          </button>
        )}
      </div>
    )
  }

  // INITIAL LOADING

  if (loading && !hasLoaded) {
    return (
      <div className="min-w-0 space-y-4 text-sm">
        <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="h-1 bg-erp-primary" />

          <div className="flex min-h-16 items-center px-4 sm:px-5">
            <BreadCrumb items={breadcrumbItems} />
          </div>
        </section>

        <section className="relative min-h-[480px] overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex min-h-[480px] items-center justify-center">
            <Loading fullScreen={false} label="Loading users" description="Please wait while we load company users." className="!h-full min-h-[480px]" />
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-4 pb-8 text-sm">
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      {/* ACTIVATE / DEACTIVATE CONFIRMATION */}

      <TrashBox
        isOpen={Boolean(statusTarget)}
        onClose={() => {
          if (!updatingUserId) setStatusTarget(null)
        }}
        title={statusTarget?.nextStatus === 'Active' ? 'Activate User' : 'Deactivate User'}
        message={statusTarget ? `Are you sure you want to ${statusTarget.nextStatus === 'Active' ? 'activate' : 'deactivate'} ${statusTarget.name}?` : ''}
        warningText={statusTarget?.nextStatus === 'Active' ? 'This user will be able to access MineERP again.' : 'This user will no longer be able to access MineERP.'}
        actionButtonText={statusTarget?.nextStatus === 'Active' ? 'Activate User' : 'Deactivate User'}
        cancelButtonText="Cancel"
        onAction={handleStatusChange}
        isProcessing={Boolean(updatingUserId)}
        variant={statusTarget?.nextStatus === 'Active' ? 'activate' : 'deactivate'}
      />

      {/* HEADER */}

      <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        <div className="h-1 bg-erp-primary" />

        <div className="flex flex-col justify-between gap-3 px-4 py-3 sm:px-5 xl:flex-row xl:items-center">
          <BreadCrumb items={breadcrumbItems} />

          <div className="flex items-center gap-2">
            {statCards.map((card) => {
              const Icon = card.icon

              return (
                <div key={card.title} title={card.title} className={`flex h-9 items-center gap-2 whitespace-nowrap rounded-lg border ${card.border} px-3`}>
                  <Icon size={15} className={card.color} />

                  <span className={`hidden text-xs font-medium 2xl:inline ${card.color}`}>{card.title}</span>

                  <span className="text-sm font-bold text-erp-text">{formatNumber(card.value)}</span>
                </div>
              )
            })}

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-erp-border px-3 text-xs font-semibold text-erp-text-secondary transition hover:bg-erp-hover disabled:opacity-60"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />

              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </section>

      {/* API ERROR */}

      {apiError && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />

          <p>{apiError}</p>

          <button type="button" onClick={handleRetry} disabled={refreshing} className="ml-auto shrink-0 font-semibold underline disabled:opacity-50">
            Retry
          </button>
        </div>
      )}

      {/* USERS TABLE */}

      <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        {/* FILTERS */}

        <div className="flex flex-col gap-3 border-b border-erp-border p-3 sm:p-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 gap-2">
            <div className="relative min-w-0 flex-1 xl:w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setCurrentPage(1)
                }}
                placeholder="Search name, email, phone or company..."
                aria-label="Search users"
                className="h-9 w-full rounded-lg border border-erp-border bg-erp-surface pl-9 pr-3 text-xs text-erp-text outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10 sm:text-sm"
              />
            </div>

            {hasActiveFilters && (
              <button type="button" onClick={resetFilters} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-erp-border px-3 text-xs font-semibold text-erp-text-secondary transition hover:bg-erp-hover">
                <FilterX size={14} />
                Clear
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={companyFilter}
              onChange={(event) => {
                setCompanyFilter(event.target.value)
                setCurrentPage(1)
              }}
              aria-label="Filter by company"
              className="h-9 min-w-40 max-w-full rounded-lg border border-erp-border bg-erp-surface px-3 text-xs text-erp-text outline-none transition focus:border-erp-primary sm:text-sm"
            >
              <option value="All">All Companies</option>

              {companies.map((company) => (
                <option key={company._id} value={company._id}>
                  {company.companyName}
                </option>
              ))}
            </select>

            <select
              value={roleFilter}
              onChange={(event) => {
                setRoleFilter(event.target.value)
                setCurrentPage(1)
              }}
              aria-label="Filter user role"
              className="h-9 min-w-36 rounded-lg border border-erp-border bg-erp-surface px-3 text-xs text-erp-text outline-none transition focus:border-erp-primary sm:text-sm"
            >
              <option value="All">All Roles</option>
              <option value="CompanyAdmin">Company Admin</option>
              <option value="Employee">Employee</option>
            </select>

            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value)
                setCurrentPage(1)
              }}
              aria-label="Filter user status"
              className="h-9 min-w-36 rounded-lg border border-erp-border bg-erp-surface px-3 text-xs text-erp-text outline-none transition focus:border-erp-primary sm:text-sm"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* REFRESH STATUS */}

        {refreshing && hasLoaded && (
          <div className="flex items-center justify-center gap-2 border-b border-erp-border px-4 py-3 text-xs text-erp-muted">
            <LoaderCircle size={15} className="animate-spin text-erp-primary" />
            Updating user list...
          </div>
        )}

        {/* DESKTOP TABLE */}

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[1100px] text-left">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-100">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">User</th>

                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Company</th>

                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Role</th>

                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Phone</th>

                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Created Date</th>

                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</th>

                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user._id} className="transition hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-erp-primary-light text-xs font-bold text-erp-primary">{getInitials(user.name)}</div>

                      <div className="min-w-0">
                        <p className="max-w-48 truncate text-xs font-semibold text-erp-text sm:text-sm">{user.name || '—'}</p>

                        <p className="mt-0.5 max-w-48 truncate text-[10px] text-erp-muted">{user.email || '—'}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <Building2 size={14} className="shrink-0 text-slate-400" />

                      <div className="min-w-0">
                        <p className="max-w-48 truncate text-xs font-medium text-erp-text">{user.company?.companyName || '—'}</p>

                        <p className="mt-0.5 text-[10px] text-erp-muted">{user.company?.status || 'No company status'}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-1 text-[10px] font-semibold ${roleStyles[user.role] || 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                      {user.role === 'CompanyAdmin' ? <ShieldCheck size={11} /> : <UserRound size={11} />}

                      {getRoleLabel(user.role)}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <span className="whitespace-nowrap text-xs text-slate-600">{user.phone || '—'}</span>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 whitespace-nowrap text-xs text-slate-600">
                      <CalendarDays size={13} className="shrink-0 text-slate-400" />

                      {formatDate(user.createdAt)}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-1 text-[10px] font-semibold ${statusStyles[user.status] || statusStyles.Inactive}`}>
                      {user.status === 'Active' ? <CheckCircle2 size={11} /> : <XCircle size={11} />}

                      {user.status || 'Unknown'}
                    </span>
                  </td>

                  <td className="px-4 py-3">{renderUserActions(user)}</td>
                </tr>
              ))}

              {users.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center">
                    <Users size={26} className="mx-auto text-slate-400" />

                    <h3 className="mt-3 text-sm font-bold text-erp-text">No users found</h3>

                    <p className="mt-1 text-xs text-erp-muted">{hasActiveFilters ? 'Try changing your search or filters.' : 'No company users are available yet.'}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE USER CARDS */}
        <div className="divide-y divide-slate-100 md:hidden">
          {users.map((user) => (
            <article key={user._id} className="space-y-3 p-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-erp-primary-light text-xs font-bold text-erp-primary">{getInitials(user.name)}</div>

                <div className="min-w-0 flex-1">
                  <h3 className="break-words text-sm font-semibold text-erp-text">{user.name || '—'}</h3>

                  <p className="mt-1 break-all text-xs text-erp-muted">{user.email || '—'}</p>

                  <p className="mt-1 text-xs text-slate-600">{user.phone || 'No phone number'}</p>
                </div>

                <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold ${statusStyles[user.status] || statusStyles.Inactive}`}>{user.status || 'Unknown'}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3">
                <div className="col-span-2">
                  <p className="text-[10px] text-slate-500">Company</p>

                  <p className="mt-1 text-xs font-medium text-slate-700">{user.company?.companyName || '—'}</p>
                </div>

                <div>
                  <p className="text-[10px] text-slate-500">Role</p>

                  <p className="mt-1 text-xs font-medium text-slate-700">{getRoleLabel(user.role)}</p>
                </div>

                <div>
                  <p className="text-[10px] text-slate-500">Created Date</p>

                  <p className="mt-1 text-xs font-medium text-slate-700">{formatDate(user.createdAt)}</p>
                </div>
              </div>

              <div className="flex flex-col gap-2 border-t border-slate-100 pt-2">
                <button
                  type="button"
                  onClick={() => navigate(`/superadmin/users/${user._id}`)}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-erp-border text-xs font-semibold text-erp-primary transition hover:bg-erp-primary-light"
                >
                  <Eye size={14} />
                  View Details
                </button>

                {user.company?.status === 'Approved' && (
                  <button
                    type="button"
                    disabled={Boolean(updatingUserId) || refreshing || loading}
                    onClick={() => openStatusConfirmation(user)}
                    className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border text-xs font-semibold transition disabled:opacity-50 ${
                      user.status === 'Active' ? 'border-rose-200 text-rose-700 hover:bg-rose-50' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    {updatingUserId === user._id ? <LoaderCircle size={14} className="animate-spin" /> : <Power size={14} />}

                    {user.status === 'Active' ? 'Deactivate User' : 'Activate User'}
                  </button>
                )}
              </div>
            </article>
          ))}

          {users.length === 0 && (
            <div className="px-4 py-12 text-center">
              <Users size={26} className="mx-auto text-slate-400" />

              <h3 className="mt-3 font-semibold text-erp-text">No users found</h3>

              <p className="mt-1 text-xs text-erp-muted">{hasActiveFilters ? 'Try changing your search or filters.' : 'No company users are available yet.'}</p>
            </div>
          )}
        </div>

        {/* PAGINATION */}
        <div className="flex flex-col gap-3 border-t border-erp-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs text-erp-text-secondary">
              Showing <span className="font-semibold text-erp-text">{pagination.totalUsers === 0 ? '0' : `${startIndex + 1}–${Math.min(startIndex + users.length, pagination.totalUsers)}`}</span> of{' '}
              <span className="font-semibold text-erp-text">{formatNumber(pagination.totalUsers)}</span> users
            </p>

            <div className="flex items-center gap-2">
              <label htmlFor="user-page-size" className="whitespace-nowrap text-xs text-erp-text-secondary">
                Rows:
              </label>

              <select
                id="user-page-size"
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value))
                  setCurrentPage(1)
                }}
                disabled={loading || refreshing}
                className="h-8 rounded-lg border border-erp-border bg-erp-surface px-2 text-xs text-erp-text-secondary outline-none focus:border-erp-primary disabled:opacity-50"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              disabled={safePage <= 1 || loading || refreshing}
              onClick={() => setCurrentPage(1)}
              className="flex h-8 items-center justify-center rounded-lg border border-erp-border px-2 text-xs text-erp-text-secondary transition hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              First
            </button>

            <button
              type="button"
              disabled={safePage <= 1 || loading || refreshing}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              aria-label="Previous page"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-erp-border text-erp-text-secondary transition hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>

            <span className="min-w-20 px-1 text-center text-xs text-erp-text-secondary">
              Page {safePage} of {totalPages}
            </span>

            <button
              type="button"
              disabled={safePage >= totalPages || loading || refreshing}
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              aria-label="Next page"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-erp-border text-erp-text-secondary transition hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>

            <button
              type="button"
              disabled={safePage >= totalPages || loading || refreshing}
              onClick={() => setCurrentPage(totalPages)}
              className="flex h-8 items-center justify-center rounded-lg border border-erp-border px-2 text-xs text-erp-text-secondary transition hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              Last
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
