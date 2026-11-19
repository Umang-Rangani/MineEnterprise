import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Eye, RefreshCw, FilterX, AlertCircle, LoaderCircle, CalendarDays, ChevronLeft, ChevronRight, Building2, CheckCircle2, Clock3, XCircle, Ban, MapPin } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import Loading from '../Loading/Loading'

const statusStyles = {
  Approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Pending: 'border-amber-200 bg-amber-50 text-amber-700',
  Rejected: 'border-rose-200 bg-rose-50 text-rose-700',
  Inactive: 'border-slate-200 bg-slate-100 text-slate-600',
}

const statusIcons = {
  Approved: CheckCircle2,
  Pending: Clock3,
  Rejected: XCircle,
  Inactive: Ban,
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
    .toUpperCase() || 'CO'

const getCompanyLocation = (company) => [company.city, company.state].filter(Boolean).join(', ') || '—'

function getCompanyStatusColor(status) {
  return statusStyles[status] || statusStyles.Inactive
}

export default function SuperAdminAllCompanies() {
  const navigate = useNavigate()

  const [companies, setCompanies] = useState([])

  const [loading, setLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [apiError, setApiError] = useState('')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [refreshKey, setRefreshKey] = useState(0)

  const [pagination, setPagination] = useState({
    currentPage: 1,
    limit: 10,
    totalCompanies: 0,
    totalPages: 1,
  })

  const [toast, setToast] = useState(null)

  const breadcrumbItems = [
    {
      title: 'All Companies',
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
    document.title = 'All Companies | MineERP'
  }, [])

  // FETCH COMPANIES

  useEffect(() => {
    let cancelled = false

    async function fetchCompanies() {
      const isInitialLoad = !hasLoaded

      if (isInitialLoad) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }

      setApiError('')

      try {
        const response = await axiosInstance.get('/companies/all', {
          params: {
            page: currentPage,
            limit: pageSize,
            search: search.trim() || undefined,
            status: statusFilter === 'All' ? undefined : statusFilter,
          },
        })

        const data = response.data

        if (data?.success === false) {
          throw new Error(data.message || 'Unable to load companies.')
        }

        if (cancelled) return

        const list = Array.isArray(data?.companies) ? data.companies : []

        setCompanies(list)

        const serverPagination = data?.pagination

        if (serverPagination) {
          setPagination({
            currentPage: Number(serverPagination.currentPage) || currentPage,
            limit: Number(serverPagination.limit) || pageSize,
            totalCompanies: Number(serverPagination.totalCompanies) || 0,
            totalPages: Math.max(1, Number(serverPagination.totalPages) || 1),
          })
        } else {
          setPagination({
            currentPage,
            limit: pageSize,
            totalCompanies: list.length,
            totalPages: 1,
          })
        }

        setHasLoaded(true)
      } catch (error) {
        if (cancelled) return

        setApiError(error.response?.data?.message || error.message || 'Unable to load companies.')
      } finally {
        if (!cancelled) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    }

    fetchCompanies()

    return () => {
      cancelled = true
    }
  }, [currentPage, pageSize, statusFilter, refreshKey])

  // PAGE VALIDATION

  useEffect(() => {
    if (currentPage > pagination.totalPages) {
      setCurrentPage(Math.max(1, pagination.totalPages))
    }
  }, [currentPage, pagination.totalPages])

  // SEARCH

  const filteredCompanies = companies.filter((company) => {
    const query = search.trim().toLowerCase()

    if (!query) return true

    const searchableValues = [
      company.companyName,
      company.companyEmail,
      company.companyPhone,
      company.businessType,
      company.businessCategory,
      company.owner?.name,
      company.owner?.email,
      company.owner?.phone,
      company.city,
      company.state,
      company.country,
      company.gstNumber,
      company.panNumber,
    ]

    return searchableValues.some((value) =>
      String(value || '')
        .toLowerCase()
        .includes(query),
    )
  })

  // PAGE STATISTICS

  const approvedOnPage = companies.filter((company) => company.status === 'Approved').length

  const pendingOnPage = companies.filter((company) => company.status === 'Pending').length

  const rejectedOnPage = companies.filter((company) => company.status === 'Rejected').length

  const hasActiveFilters = Boolean(search.trim()) || statusFilter !== 'All'

  const totalPages = Math.max(1, pagination.totalPages)
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * pageSize

  const resetFilters = () => {
    setSearch('')
    setStatusFilter('All')
    setCurrentPage(1)
  }

  // REFRESH

  const handleRefresh = () => {
    if (refreshing || loading) return

    setRefreshing(true)
    setRefreshKey((previous) => previous + 1)
  }

  // RETRY

  const handleRetry = () => {
    if (refreshing || loading) return

    setRefreshKey((previous) => previous + 1)
  }

  // SUMMARY CARDS

  const statCards = [
    {
      title: 'Total Companies',
      value: pagination.totalCompanies,
      icon: Building2,
      color: 'text-violet-700',
      border: 'border-violet-200',
    },
    {
      title: 'Approved on Page',
      value: approvedOnPage,
      icon: CheckCircle2,
      color: 'text-emerald-700',
      border: 'border-emerald-200',
    },
    {
      title: 'Pending on Page',
      value: pendingOnPage,
      icon: Clock3,
      color: 'text-amber-700',
      border: 'border-amber-200',
    },
    {
      title: 'Rejected on Page',
      value: rejectedOnPage,
      icon: XCircle,
      color: 'text-rose-700',
      border: 'border-rose-200',
    },
  ]

  // COMPANY ACTIONS

  const renderCompanyActions = (company) => (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        title="View company details"
        aria-label={`View ${company.companyName || 'company'}`}
        onClick={() => navigate(`/superadmin/companies/${company._id}`)}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-erp-border px-2.5 text-xs font-semibold text-erp-primary transition hover:bg-erp-primary-light"
      >
        <Eye size={14} />
        View
      </button>
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
            <Loading fullScreen={false} label="Loading companies" description="Please wait while we load registered companies." className="!h-full min-h-[480px]" />
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

        <div className="flex flex-col justify-between gap-3 px-4 py-3 sm:px-5 lg:flex-row lg:items-center">
          <BreadCrumb items={breadcrumbItems} />

          <div className="flex items-center gap-2">
            {statCards.map((card) => {
              const Icon = card.icon

              return (
                <div key={card.title} title={card.title} className={`flex h-9 items-center gap-2 whitespace-nowrap rounded-lg border ${card.border} px-3`}>
                  <Icon size={15} className={card.color} />

                  <span className={`hidden text-xs font-medium lg:inline ${card.color}`}>{card.title}</span>

                  <span className="text-sm font-bold text-erp-text">{card.value}</span>
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

      {/* COMPANIES TABLE */}

      <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        {/* FILTERS */}

        <div className="flex flex-col gap-3 border-b border-erp-border p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 gap-2">
            <div className="relative min-w-0 flex-1 lg:w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setCurrentPage(1)
                }}
                placeholder="Search company, owner or GST..."
                aria-label="Search companies"
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
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value)
                setCurrentPage(1)
              }}
              aria-label="Filter company status"
              className="h-9 min-w-36 rounded-lg border border-erp-border bg-erp-surface px-3 text-xs text-erp-text outline-none transition focus:border-erp-primary sm:text-sm"
            >
              <option value="All">All Statuses</option>
              <option value="Approved">Approved</option>
              <option value="Pending">Pending</option>
              <option value="Rejected">Rejected</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* REFRESH STATUS */}

        {refreshing && hasLoaded && (
          <div className="flex items-center justify-center gap-2 border-b border-erp-border px-4 py-3 text-xs text-erp-muted">
            <LoaderCircle size={15} className="animate-spin text-erp-primary" />
            Updating company list...
          </div>
        )}

        {/* SEARCH SCOPE */}

        {search.trim() && <div className="border-b border-erp-border bg-slate-50/70 px-4 py-2 text-xs text-erp-text-secondary">Showing matches from the currently loaded page only.</div>}

        {/* DESKTOP TABLE */}

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[1050px] text-left">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-100">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Company</th>

                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Owner</th>

                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Business Type</th>

                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Location</th>

                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Created Date</th>

                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</th>

                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredCompanies.map((company) => {
                const StatusIcon = statusIcons[company.status] || Clock3

                return (
                  <tr key={company._id} className="transition hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {company.logo ? (
                          <img src={company.logo} alt={company.companyName} className="h-9 w-9 shrink-0 rounded-lg border border-slate-200 object-cover" />
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-erp-primary-light text-xs font-bold text-erp-primary">{getInitials(company.companyName)}</div>
                        )}

                        <div className="min-w-0">
                          <p className="max-w-44 truncate text-xs font-semibold text-erp-text sm:text-sm">{company.companyName || '—'}</p>

                          <p className="mt-0.5 max-w-44 truncate text-[10px] text-erp-muted">{company.companyEmail || '—'}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <p className="max-w-44 truncate text-xs font-medium text-erp-text">{company.owner?.name || '—'}</p>

                      <p className="mt-0.5 max-w-44 truncate text-[10px] text-erp-muted">{company.owner?.email || '—'}</p>
                    </td>

                    <td className="px-4 py-3">
                      <span className="whitespace-nowrap text-xs text-slate-600">{company.businessType || '—'}</span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex max-w-40 items-center gap-1.5 text-xs text-slate-600">
                        <MapPin size={13} className="shrink-0 text-slate-400" />

                        <span className="truncate">{getCompanyLocation(company)}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 whitespace-nowrap text-xs text-slate-600">
                        <CalendarDays size={13} className="shrink-0 text-slate-400" />

                        {formatDate(company.createdAt)}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-1 text-[10px] font-semibold ${getCompanyStatusColor(company.status)}`}>
                        <StatusIcon size={11} />
                        {company.status || 'Unknown'}
                      </span>
                    </td>

                    <td className="px-4 py-3">{renderCompanyActions(company)}</td>
                  </tr>
                )
              })}

              {filteredCompanies.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center">
                    <Building2 size={26} className="mx-auto text-slate-400" />

                    <h3 className="mt-3 text-sm font-bold text-erp-text">No companies found</h3>

                    <p className="mt-1 text-xs text-erp-muted">{hasActiveFilters ? 'Try changing your search or status filter.' : 'No companies have been registered yet.'}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE COMPANY CARDS */}

        <div className="divide-y divide-slate-100 md:hidden">
          {filteredCompanies.map((company) => {
            const StatusIcon = statusIcons[company.status] || Clock3

            return (
              <article key={company._id} className="space-y-3 p-3">
                <div className="flex items-start gap-3">
                  {company.logo ? (
                    <img src={company.logo} alt={company.companyName} className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-erp-primary-light text-xs font-bold text-erp-primary">{getInitials(company.companyName)}</div>
                  )}

                  <div className="min-w-0 flex-1">
                    <h3 className="break-words text-sm font-semibold text-erp-text">{company.companyName || '—'}</h3>

                    <p className="mt-1 break-all text-xs text-erp-muted">{company.companyEmail || '—'}</p>

                    <p className="mt-1 text-xs text-slate-600">{company.owner?.name || '—'}</p>
                  </div>

                  <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold ${getCompanyStatusColor(company.status)}`}>
                    <StatusIcon size={11} />
                    {company.status || 'Unknown'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3">
                  <div>
                    <p className="text-[10px] text-slate-500">Business Type</p>

                    <p className="mt-1 text-xs font-medium text-slate-700">{company.businessType || '—'}</p>
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-500">Created Date</p>

                    <p className="mt-1 text-xs font-medium text-slate-700">{formatDate(company.createdAt)}</p>
                  </div>

                  <div className="col-span-2 border-t border-slate-200 pt-2">
                    <p className="text-[10px] text-slate-500">Location</p>

                    <p className="mt-1 text-xs font-medium text-slate-700">{getCompanyLocation(company)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 border-t border-slate-100 pt-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/superadmin/companies/${company._id}`)}
                    className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-erp-border text-xs font-semibold text-erp-primary transition hover:bg-erp-primary-light"
                  >
                    <Eye size={14} />
                    View Details
                  </button>
                </div>
              </article>
            )
          })}

          {filteredCompanies.length === 0 && (
            <div className="px-4 py-12 text-center">
              <Building2 size={26} className="mx-auto text-slate-400" />

              <h3 className="mt-3 font-semibold text-erp-text">No companies found</h3>

              <p className="mt-1 text-xs text-erp-muted">{hasActiveFilters ? 'Try changing your search or status filter.' : 'No companies have been registered yet.'}</p>
            </div>
          )}
        </div>

        {/* PAGINATION */}

        <div className="flex flex-col gap-3 border-t border-erp-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs text-erp-text-secondary">
              {search.trim() ? (
                <>
                  <span className="font-semibold text-erp-text">{formatNumber(filteredCompanies.length)}</span> matching on this page
                  <span className="ml-1 text-erp-muted">
                    (page {safePage} of {totalPages})
                  </span>
                </>
              ) : (
                <>
                  Showing <span className="font-semibold text-erp-text">{pagination.totalCompanies === 0 ? '0' : `${startIndex + 1}–${Math.min(startIndex + companies.length, pagination.totalCompanies)}`}</span> of{' '}
                  <span className="font-semibold text-erp-text">{formatNumber(pagination.totalCompanies)}</span> companies
                </>
              )}
            </p>

            <div className="flex items-center gap-2">
              <label htmlFor="company-page-size" className="whitespace-nowrap text-xs text-erp-text-secondary">
                Rows:
              </label>

              <select
                id="company-page-size"
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
