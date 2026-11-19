import { useEffect, useState } from 'react'
import { Search, RefreshCw, FilterX, AlertCircle, LoaderCircle, CalendarDays, ChevronLeft, ChevronRight, Activity, LogIn, Building2, Users, ShieldCheck, Clock3, Globe, UserRound, Monitor, FileText } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import Loading from '../Loading/Loading'

const ACTION_OPTIONS = [
  { value: 'SUPERADMIN_SETUP', label: 'SuperAdmin Setup' },
  { value: 'LOGIN_SUCCESS', label: 'Login Success' },
  { value: 'LOGIN_FAILED', label: 'Login Failed' },
  { value: 'LOGOUT', label: 'Logout' },
  { value: 'COMPANY_REGISTERED', label: 'Company Registered' },
  { value: 'COMPANY_APPROVED', label: 'Company Approved' },
  { value: 'COMPANY_REJECTED', label: 'Company Rejected' },
  { value: 'USER_ACTIVATED', label: 'User Activated' },
  { value: 'USER_DEACTIVATED', label: 'User Deactivated' },
]

const actionStyles = {
  SUPERADMIN_SETUP: 'border-violet-200 bg-violet-50 text-violet-700',
  LOGIN_SUCCESS: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  LOGIN_FAILED: 'border-rose-200 bg-rose-50 text-rose-700',
  LOGOUT: 'border-slate-200 bg-slate-100 text-slate-700',
  COMPANY_REGISTERED: 'border-blue-200 bg-blue-50 text-blue-700',
  COMPANY_APPROVED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  COMPANY_REJECTED: 'border-rose-200 bg-rose-50 text-rose-700',
  USER_ACTIVATED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  USER_DEACTIVATED: 'border-amber-200 bg-amber-50 text-amber-700',
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

const formatTime = (value) => {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

const getInitials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase() || 'SY'

const getActionLabel = (action) => {
  const option = ACTION_OPTIONS.find((item) => item.value === action)

  return option?.label || action || 'Unknown Activity'
}

const getRoleLabel = (role) => {
  if (role === 'CompanyAdmin') return 'Company Admin'
  if (role === 'SuperAdmin') return 'SuperAdmin'
  if (role === 'Employee') return 'Employee'

  return role || '—'
}

const getActorName = (activity) => activity.actor?.name || activity.metadata?.attemptedEmail || 'Unknown User'

const getTargetName = (activity) => activity.target?.name || activity.target?.email || '—'

const getSummaryDefaults = () => ({
  totalActivities: 0,
  loginActivities: 0,
  companyActivities: 0,
  userStatusChanges: 0,
})

export default function SuperAdminActivity() {
  const [activities, setActivities] = useState([])

  const [loading, setLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [apiError, setApiError] = useState('')

  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('All')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [refreshKey, setRefreshKey] = useState(0)

  const [summary, setSummary] = useState(getSummaryDefaults)

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalActivities: 0,
    totalPages: 1,
  })

  const [toast, setToast] = useState(null)

  const breadcrumbItems = [
    {
      title: 'System Activity',
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
    document.title = 'System Activity | MineERP'
  }, [])

  // FETCH ACTIVITIES

  useEffect(() => {
    let cancelled = false

    async function fetchActivities() {
      const isInitialLoad = !hasLoaded

      if (isInitialLoad) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }

      setApiError('')

      try {
        const response = await axiosInstance.get('/superadmin/activity', {
          params: {
            page: currentPage,
            limit: pageSize,
            search: search.trim() || undefined,
            action: actionFilter,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
          },
        })

        const data = response.data

        if (data?.success === false) {
          throw new Error(data.message || 'Unable to load system activities.')
        }

        if (cancelled) return

        const list = Array.isArray(data?.activities) ? data.activities : []

        setActivities(list)

        const serverSummary = data?.summary || {}

        setSummary({
          totalActivities: Number(serverSummary.totalActivities) || 0,
          loginActivities: Number(serverSummary.loginActivities) || 0,
          companyActivities: Number(serverSummary.companyActivities) || 0,
          userStatusChanges: Number(serverSummary.userStatusChanges) || 0,
        })

        const serverPagination = data?.pagination

        if (serverPagination) {
          const nextPage = Number(serverPagination.page) || 1

          setPagination({
            page: nextPage,
            limit: Number(serverPagination.limit) || pageSize,
            totalActivities: Number(serverPagination.totalActivities) || 0,
            totalPages: Math.max(1, Number(serverPagination.totalPages) || 1),
          })

          if (nextPage !== currentPage) {
            setCurrentPage(nextPage)
          }
        } else {
          setPagination({
            page: currentPage,
            limit: pageSize,
            totalActivities: list.length,
            totalPages: 1,
          })
        }

        setHasLoaded(true)
      } catch (error) {
        if (cancelled) return

        setApiError(error.response?.data?.message || error.message || 'Unable to load system activities.')
      } finally {
        if (!cancelled) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    }

    fetchActivities()

    return () => {
      cancelled = true
    }
  }, [currentPage, pageSize, search, actionFilter, dateFrom, dateTo, refreshKey])

  // PAGE VALIDATION

  useEffect(() => {
    if (currentPage > pagination.totalPages) {
      setCurrentPage(Math.max(1, pagination.totalPages))
    }
  }, [currentPage, pagination.totalPages])

  const hasActiveFilters = Boolean(search.trim()) || actionFilter !== 'All' || Boolean(dateFrom) || Boolean(dateTo)

  const totalPages = Math.max(1, pagination.totalPages)
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * pageSize

  const resetFilters = () => {
    setSearch('')
    setActionFilter('All')
    setDateFrom('')
    setDateTo('')
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

  // SUMMARY CARDS

  const statCards = [
    {
      title: 'Total Activities',
      value: summary.totalActivities,
      icon: Activity,
      color: 'text-violet-700',
      border: 'border-violet-200',
    },
    {
      title: 'Login Activities',
      value: summary.loginActivities,
      icon: LogIn,
      color: 'text-blue-700',
      border: 'border-blue-200',
    },
    {
      title: 'Company Activities',
      value: summary.companyActivities,
      icon: Building2,
      color: 'text-indigo-700',
      border: 'border-indigo-200',
    },
    {
      title: 'User Status Changes',
      value: summary.userStatusChanges,
      icon: Users,
      color: 'text-emerald-700',
      border: 'border-emerald-200',
    },
  ]

  // ACTIVITY DETAILS

  const renderActionBadge = (activity) => (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-1 text-[10px] font-semibold ${actionStyles[activity.action] || 'border-slate-200 bg-slate-50 text-slate-600'}`}>{getActionLabel(activity.action)}</span>
  )

  const renderActor = (activity) => (
    <div className="flex min-w-0 items-center gap-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-erp-primary-light text-xs font-bold text-erp-primary">{getInitials(getActorName(activity))}</div>

      <div className="min-w-0">
        <p className="max-w-48 truncate text-xs font-semibold text-erp-text">{getActorName(activity)}</p>

        <p className="mt-0.5 max-w-48 truncate text-[10px] text-erp-muted">{activity.actor?.email || activity.metadata?.attemptedEmail || '—'}</p>

        <p className="mt-0.5 text-[10px] text-slate-500">{getRoleLabel(activity.actor?.role)}</p>
      </div>
    </div>
  )

  const renderTargetAndCompany = (activity) => (
    <div className="min-w-0 space-y-2">
      <div>
        <p className="text-[10px] text-slate-400">Target</p>

        <p className="max-w-48 truncate text-xs font-medium text-erp-text">{getTargetName(activity)}</p>
      </div>

      <div>
        <p className="text-[10px] text-slate-400">Company</p>

        <p className="max-w-48 truncate text-xs text-slate-600">{activity.company?.companyName || '—'}</p>
      </div>
    </div>
  )

  const renderDateTime = (activity) => (
    <div className="whitespace-nowrap">
      <div className="flex items-center gap-1.5 text-xs text-slate-600">
        <CalendarDays size={13} className="shrink-0 text-slate-400" />
        {formatDate(activity.createdAt)}
      </div>

      <div className="mt-1 flex items-center gap-1.5 text-[10px] text-erp-muted">
        <Clock3 size={12} className="shrink-0" />
        {formatTime(activity.createdAt)}
      </div>
    </div>
  )

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
            <Loading fullScreen={false} label="Loading system activity" description="Please wait while we load platform activity logs." className="!h-full min-h-[480px]" />
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-4 pb-8 text-sm">
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

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

      {/* ACTIVITY TABLE */}

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
                placeholder="Search actor, target, company or description..."
                aria-label="Search system activities"
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
              value={actionFilter}
              onChange={(event) => {
                setActionFilter(event.target.value)
                setCurrentPage(1)
              }}
              aria-label="Filter by activity action"
              className="h-9 min-w-40 max-w-full rounded-lg border border-erp-border bg-erp-surface px-3 text-xs text-erp-text outline-none transition focus:border-erp-primary sm:text-sm"
            >
              <option value="All">All Activities</option>

              {ACTION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(event) => {
                  setDateFrom(event.target.value)
                  setCurrentPage(1)
                }}
                aria-label="Activity start date"
                className="h-9 w-[135px] rounded-lg border border-erp-border bg-erp-surface px-2 text-xs text-erp-text outline-none focus:border-erp-primary"
              />

              <span className="text-xs text-erp-muted">to</span>

              <input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(event) => {
                  setDateTo(event.target.value)
                  setCurrentPage(1)
                }}
                aria-label="Activity end date"
                className="h-9 w-[135px] rounded-lg border border-erp-border bg-erp-surface px-2 text-xs text-erp-text outline-none focus:border-erp-primary"
              />
            </div>
          </div>
        </div>

        {/* REFRESH STATUS */}

        {refreshing && hasLoaded && (
          <div className="flex items-center justify-center gap-2 border-b border-erp-border px-4 py-3 text-xs text-erp-muted">
            <LoaderCircle size={15} className="animate-spin text-erp-primary" />
            Updating activity list...
          </div>
        )}

        {/* DESKTOP TABLE */}

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[1250px] text-left">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-100">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Actor</th>

                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Action</th>

                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Target / Company</th>

                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Description</th>

                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">IP Address</th>

                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Date & Time</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {activities.map((activity) => (
                <tr key={activity._id} className="transition hover:bg-slate-50/70">
                  <td className="px-4 py-3">{renderActor(activity)}</td>

                  <td className="px-4 py-3">{renderActionBadge(activity)}</td>

                  <td className="px-4 py-3">{renderTargetAndCompany(activity)}</td>

                  <td className="max-w-xs px-4 py-3">
                    <p className="line-clamp-3 text-xs leading-5 text-slate-600">{activity.description || '—'}</p>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 whitespace-nowrap text-xs text-slate-600">
                      <Globe size={13} className="shrink-0 text-slate-400" />
                      {activity.ipAddress || '—'}
                    </div>
                  </td>

                  <td className="px-4 py-3">{renderDateTime(activity)}</td>
                </tr>
              ))}

              {activities.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-14 text-center">
                    <Activity size={26} className="mx-auto text-slate-400" />

                    <h3 className="mt-3 text-sm font-bold text-erp-text">No activities found</h3>

                    <p className="mt-1 text-xs text-erp-muted">{hasActiveFilters ? 'Try changing your search or filters.' : 'System activities will appear here when recorded.'}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE ACTIVITY CARDS */}

        <div className="divide-y divide-slate-100 md:hidden">
          {activities.map((activity) => (
            <article key={activity._id} className="space-y-3 p-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-erp-primary-light text-xs font-bold text-erp-primary">{getInitials(getActorName(activity))}</div>

                <div className="min-w-0 flex-1">
                  <h3 className="break-words text-sm font-semibold text-erp-text">{getActorName(activity)}</h3>

                  <p className="mt-1 break-all text-xs text-erp-muted">{activity.actor?.email || activity.metadata?.attemptedEmail || '—'}</p>

                  <p className="mt-1 text-[10px] text-slate-500">{getRoleLabel(activity.actor?.role)}</p>
                </div>

                <div className="shrink-0">{renderActionBadge(activity)}</div>
              </div>

              <div className="rounded-lg bg-slate-50 p-3">
                <div>
                  <p className="text-[10px] text-slate-500">Description</p>

                  <p className="mt-1 break-words text-xs leading-5 text-slate-700">{activity.description || '—'}</p>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-200 pt-3">
                  <div>
                    <p className="text-[10px] text-slate-500">Target</p>

                    <p className="mt-1 break-words text-xs font-medium text-slate-700">{getTargetName(activity)}</p>
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-500">Company</p>

                    <p className="mt-1 break-words text-xs font-medium text-slate-700">{activity.company?.companyName || '—'}</p>
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-500">IP Address</p>

                    <p className="mt-1 break-all text-xs font-medium text-slate-700">{activity.ipAddress || '—'}</p>
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-500">Date & Time</p>

                    <p className="mt-1 text-xs font-medium text-slate-700">{formatDate(activity.createdAt)}</p>

                    <p className="mt-0.5 text-[10px] text-slate-500">{formatTime(activity.createdAt)}</p>
                  </div>
                </div>
              </div>

              {activity.userAgent && (
                <div className="flex items-start gap-2 break-all text-[10px] leading-4 text-slate-500">
                  <Monitor size={13} className="mt-0.5 shrink-0" />
                  {activity.userAgent}
                </div>
              )}
            </article>
          ))}

          {activities.length === 0 && (
            <div className="px-4 py-12 text-center">
              <Activity size={26} className="mx-auto text-slate-400" />

              <h3 className="mt-3 font-semibold text-erp-text">No activities found</h3>

              <p className="mt-1 text-xs text-erp-muted">{hasActiveFilters ? 'Try changing your search or filters.' : 'System activities will appear here when recorded.'}</p>
            </div>
          )}
        </div>

        {/* PAGINATION */}

        <div className="flex flex-col gap-3 border-t border-erp-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs text-erp-text-secondary">
              Showing <span className="font-semibold text-erp-text">{pagination.totalActivities === 0 ? '0' : `${startIndex + 1}–${Math.min(startIndex + activities.length, pagination.totalActivities)}`}</span> of{' '}
              <span className="font-semibold text-erp-text">{formatNumber(pagination.totalActivities)}</span> activities
            </p>

            <div className="flex items-center gap-2">
              <label htmlFor="activity-page-size" className="whitespace-nowrap text-xs text-erp-text-secondary">
                Rows:
              </label>

              <select
                id="activity-page-size"
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
