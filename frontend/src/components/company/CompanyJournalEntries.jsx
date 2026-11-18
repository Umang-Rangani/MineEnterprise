import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Eye, Pencil, BookOpen, CheckCircle2, Clock, ChevronLeft, ChevronRight, RefreshCw, FilterX, AlertCircle, LoaderCircle, CalendarDays, Ban, X, IndianRupee, FileText, Layers3 } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import Loading from '../Loading/Loading'
import TrashBox from '../../TrashBox/TrashBox'
import { hasPermission, useAuth } from '../../context/AuthContext'

const statusStyles = {
  Draft: 'border-amber-200 bg-amber-50 text-amber-700',
  Posted: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Cancelled: 'border-slate-200 bg-slate-100 text-slate-600',
}

const formatNumber = (value) =>
  new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)

const formatCurrency = (value) => `₹${formatNumber(value)}`

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

function getJournalArray(response) {
  const data = response?.data

  if (Array.isArray(data?.journalEntries)) return data.journalEntries
  if (Array.isArray(data?.entries)) return data.entries
  if (Array.isArray(data?.data?.journalEntries)) return data.data.journalEntries
  if (Array.isArray(data?.data?.entries)) return data.data.entries
  if (Array.isArray(data?.data)) return data.data

  return []
}

function getJournalStatusColor(status) {
  return statusStyles[status] || statusStyles.Draft
}

function getSourceLabel(sourceType) {
  const labels = {
    Manual: 'Manual',
    Purchase: 'Purchase',
    GoodsReceipt: 'Goods Receipt',
    Sales: 'Sales',
    Invoice: 'Invoice',
    Payment: 'Payment',
    Expense: 'Expense',
    Reversal: 'Reversal',
  }

  return labels[sourceType] || sourceType || 'Manual'
}

export default function CompanyJournalEntries() {
  const { permissions } = useAuth()

  const canCreate = hasPermission(permissions, 'accounting:journal-entry')
  const canView = hasPermission(permissions, 'accounting:view')
  const canPost = hasPermission(permissions, 'accounting:journal-entry')

  const [journalEntries, setJournalEntries] = useState([])
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
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  })

  const [toast, setToast] = useState(null)

  const [actionTarget, setActionTarget] = useState(null)
  const [processingId, setProcessingId] = useState('')

  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelProcessing, setCancelProcessing] = useState(false)

  const breadcrumbItems = [{ title: 'Journal Entries', link: null }]

  const showToast = (type, message) => {
    setToast({
      id: Date.now(),
      type,
      message,
      duration: 3000,
    })
  }

  const closeActionConfirmation = () => {
    if (processingId || cancelProcessing) return

    setActionTarget(null)
  }

  useEffect(() => {
    document.title = 'Journal Entries | MineERP'
  }, [])

  // ---------------- FETCH JOURNAL ENTRIES ----------------

  useEffect(() => {
    let cancelled = false

    async function fetchJournalEntries() {
      const isInitialLoad = !hasLoaded

      if (isInitialLoad) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }

      setApiError('')

      try {
        const response = await axiosInstance.get('/erp/journal-entries', {
          params: {
            page: currentPage,
            limit: pageSize,
            status: statusFilter === 'All' ? undefined : statusFilter,
          },
        })

        const data = response.data

        if (data?.success === false) {
          throw new Error(data.message || 'Unable to load journal entries.')
        }

        if (cancelled) return

        const list = getJournalArray(response)

        setJournalEntries(list)

        const serverPagination = data?.pagination || data?.data?.pagination

        if (serverPagination) {
          setPagination({
            page: Number(serverPagination.page) || currentPage,
            limit: Number(serverPagination.limit) || pageSize,
            total: Number(serverPagination.total) || 0,
            totalPages: Math.max(1, Number(serverPagination.totalPages) || 1),
          })
        } else {
          setPagination({
            page: currentPage,
            limit: pageSize,
            total: list.length,
            totalPages: 1,
          })
        }

        setHasLoaded(true)
      } catch (error) {
        if (cancelled) return

        setApiError(error.response?.data?.message || error.message || 'Unable to load journal entries.')
      } finally {
        if (!cancelled) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    }

    fetchJournalEntries()

    return () => {
      cancelled = true
    }
  }, [currentPage, pageSize, statusFilter, refreshKey])

  // ---------------- PAGE VALIDATION ----------------

  useEffect(() => {
    if (currentPage > pagination.totalPages) {
      setCurrentPage(Math.max(1, pagination.totalPages))
    }
  }, [currentPage, pagination.totalPages])

  // ---------------- SEARCH ----------------

  const filteredEntries = journalEntries.filter((entry) => {
    const query = search.trim().toLowerCase()

    if (!query) return true

    const searchableValues = [entry.journalNumber, entry.referenceNumber, entry.narration, entry.sourceType, entry.status]

    return searchableValues.some((value) =>
      String(value || '')
        .toLowerCase()
        .includes(query),
    )
  })

  // ---------------- PAGE STATISTICS ----------------

  const draftOnPage = journalEntries.filter((entry) => entry.status === 'Draft').length

  const postedOnPage = journalEntries.filter((entry) => entry.status === 'Posted').length

  const cancelledOnPage = journalEntries.filter((entry) => entry.status === 'Cancelled').length

  const totalDebitOnPage = journalEntries.reduce((total, entry) => total + Number(entry.totalDebit || 0), 0)

  const hasActiveFilters = Boolean(search.trim()) || statusFilter !== 'All'

  const totalPages = Math.max(1, pagination.totalPages)
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * pageSize

  const resetFilters = () => {
    setSearch('')
    setStatusFilter('All')
    setCurrentPage(1)
  }

  // ---------------- REFRESH ----------------

  const handleRefresh = () => {
    if (refreshing || loading || processingId || cancelProcessing) return

    setRefreshing(true)
    setRefreshKey((previous) => previous + 1)
  }

  // ---------------- POST JOURNAL ENTRY ----------------

  const openActionConfirmation = (entry) => {
    if (!canPost || entry.status !== 'Draft' || processingId || cancelProcessing) {
      return
    }

    setActionTarget(entry)
  }

  const postJournalEntry = async () => {
    if (!actionTarget || processingId || cancelProcessing) return

    const entryId = String(actionTarget._id)

    setProcessingId(entryId)

    try {
      const response = await axiosInstance.patch(`/erp/journal-entries/${encodeURIComponent(entryId)}/post`)

      const data = response.data

      if (data?.success === false) {
        throw new Error(data.message || 'Unable to post journal entry.')
      }

      showToast('success', data?.message || 'Journal entry posted successfully.')

      setActionTarget(null)
      setRefreshKey((previous) => previous + 1)
    } catch (error) {
      showToast('error', error.response?.data?.message || error.message || 'Unable to post journal entry.')
    } finally {
      setProcessingId('')
    }
  }

  // ---------------- CANCEL JOURNAL ENTRY ----------------

  const openCancelConfirmation = (entry) => {
    if (!canPost || entry.status !== 'Draft' || processingId || cancelProcessing) {
      return
    }

    setCancelReason('')
    setCancelTarget(entry)
  }

  const closeCancelConfirmation = () => {
    if (cancelProcessing || processingId) return

    setCancelTarget(null)
    setCancelReason('')
  }

  const cancelJournalEntry = async () => {
    if (!cancelTarget || cancelProcessing || processingId) return

    if (cancelReason.trim().length < 3) {
      showToast('error', 'Please enter a cancellation reason of at least 3 characters.')
      return
    }

    const entryId = String(cancelTarget._id)

    setCancelProcessing(true)

    try {
      const response = await axiosInstance.patch(`/erp/journal-entries/${encodeURIComponent(entryId)}/cancel`, {
        reason: cancelReason.trim(),
      })

      const data = response.data

      if (data?.success === false) {
        throw new Error(data.message || 'Unable to cancel journal entry.')
      }

      showToast('success', data?.message || 'Journal entry cancelled successfully.')

      setCancelTarget(null)
      setCancelReason('')
      setRefreshKey((previous) => previous + 1)
    } catch (error) {
      showToast('error', error.response?.data?.message || error.message || 'Unable to cancel journal entry.')
    } finally {
      setCancelProcessing(false)
    }
  }

  // ---------------- STATISTICS ----------------

  const statCards = [
    {
      title: 'Total Entries',
      value: pagination.total,
      icon: BookOpen,
      color: 'text-violet-700',
      border: 'border-violet-200',
    },
    {
      title: 'Draft on Page',
      value: draftOnPage,
      icon: Clock,
      color: 'text-amber-700',
      border: 'border-amber-200',
    },
    {
      title: 'Posted on Page',
      value: postedOnPage,
      icon: CheckCircle2,
      color: 'text-emerald-700',
      border: 'border-emerald-200',
    },
    {
      title: 'Debit on Page',
      value: formatCurrency(totalDebitOnPage),
      icon: IndianRupee,
      color: 'text-blue-700',
      border: 'border-blue-200',
    },
  ]

  // ---------------- DESKTOP ACTIONS ----------------

  const renderJournalActions = (entry) => {
    const entryId = String(entry._id)
    const isProcessing = processingId === entryId

    return (
      <div className="flex items-center justify-end gap-1">
        {canView && (
          <Link to={`/company/journal-entries/${entryId}`} title="View journal entry" aria-label={`View ${entry.journalNumber || 'journal entry'}`} className="rounded-lg p-2 text-slate-500 hover:bg-erp-primary-light hover:text-erp-primary">
            <Eye size={15} />
          </Link>
        )}

        {canCreate && entry.status === 'Draft' && (entry.sourceType || 'Manual') === 'Manual' && (
          <Link to={`/company/journal-entries/${entryId}/edit`} title="Edit draft journal entry" aria-label={`Edit ${entry.journalNumber || 'journal entry'}`} className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-600">
            <Pencil size={15} />
          </Link>
        )}

        {canPost && entry.status === 'Draft' && (
          <button
            type="button"
            title="Post journal entry"
            aria-label={`Post ${entry.journalNumber || 'journal entry'}`}
            disabled={Boolean(processingId) || cancelProcessing}
            onClick={() => openActionConfirmation(entry)}
            className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
          >
            {isProcessing ? <LoaderCircle size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
          </button>
        )}

        {canPost && entry.status === 'Draft' && (
          <button
            type="button"
            title="Cancel journal entry"
            aria-label={`Cancel ${entry.journalNumber || 'journal entry'}`}
            disabled={Boolean(processingId) || cancelProcessing}
            onClick={() => openCancelConfirmation(entry)}
            className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
          >
            <Ban size={15} />
          </button>
        )}
      </div>
    )
  }

  // ---------------- INITIAL LOADING ----------------

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
            <Loading fullScreen={false} label="Loading journal entries" description="Please wait while we load your company's journal entries." className="!h-full min-h-[480px]" />
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-4 pb-8 text-sm">
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      {/* HEADER */}

      <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        <div className="h-1 bg-erp-primary" />

        <div className="flex flex-col justify-between gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-5">
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
              disabled={refreshing || loading || Boolean(processingId) || cancelProcessing}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-erp-border px-3 text-xs font-semibold text-erp-text-secondary hover:bg-erp-hover disabled:opacity-60"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>

            {canCreate && (
              <Link
                to="/company/journal-entries/new"
                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-erp-primary px-3.5 text-xs font-semibold text-white transition hover:bg-erp-primary-hover focus:outline-none focus:ring-2 focus:ring-erp-primary/30 focus:ring-offset-1"
              >
                <Plus size={15} />
                New Journal Entry
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* API ERROR */}

      {apiError && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />

          <p>{apiError}</p>

          <button type="button" onClick={handleRefresh} disabled={refreshing} className="ml-auto shrink-0 font-semibold underline disabled:opacity-50">
            Retry
          </button>
        </div>
      )}

      {/* JOURNAL ENTRIES TABLE */}

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
                placeholder="Search journal number, narration or reference..."
                aria-label="Search journal entries"
                className="h-9 w-full rounded-lg border border-erp-border bg-erp-surface pl-9 pr-3 text-xs text-erp-text outline-none focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10 sm:text-sm"
              />
            </div>

            {hasActiveFilters && (
              <button type="button" onClick={resetFilters} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-erp-border px-3 text-xs font-semibold text-erp-text-secondary hover:bg-erp-hover">
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
              aria-label="Filter journal entry status"
              className="h-9 min-w-40 rounded-lg border border-erp-border bg-erp-surface px-3 text-xs text-erp-text outline-none focus:border-erp-primary sm:text-sm"
            >
              <option value="All">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Posted">Posted</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* REFRESH STATUS */}

        {refreshing && hasLoaded && (
          <div className="flex items-center justify-center gap-2 border-b border-erp-border px-4 py-3 text-xs text-erp-muted">
            <LoaderCircle size={15} className="animate-spin text-erp-primary" />
            Updating journal entry list...
          </div>
        )}

        {/* SEARCH SCOPE NOTE */}

        {search.trim() && <div className="border-b border-erp-border bg-slate-50/70 px-4 py-2 text-xs text-erp-text-secondary">Showing matches from the currently loaded page only.</div>}

        {/* DESKTOP TABLE */}

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[1050px] text-left">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-100">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Journal Entry</th>

                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Entry Date</th>

                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Source</th>

                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Reference</th>

                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Debit</th>

                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Credit</th>

                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">Lines</th>

                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</th>

                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredEntries.map((entry) => (
                <tr key={entry._id} className="transition hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-erp-primary-light text-erp-primary">
                        <BookOpen size={17} />
                      </div>

                      <div className="min-w-0">
                        <p className="max-w-48 truncate text-xs font-semibold text-erp-text sm:text-sm">{entry.journalNumber || '—'}</p>

                        <p className="mt-0.5 max-w-56 truncate text-[10px] text-erp-muted">{entry.narration || 'No narration'}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 whitespace-nowrap text-xs text-slate-600">
                      <CalendarDays size={13} className="shrink-0 text-slate-400" />
                      {formatDate(entry.entryDate)}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-600">
                      <Layers3 size={12} />
                      {getSourceLabel(entry.sourceType)}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <p className="max-w-36 truncate text-xs text-slate-600">{entry.referenceNumber || '—'}</p>
                  </td>

                  <td className="px-4 py-3 text-right">
                    <p className="whitespace-nowrap text-xs font-semibold text-erp-text">{formatCurrency(entry.totalDebit)}</p>
                  </td>

                  <td className="px-4 py-3 text-right">
                    <p className="whitespace-nowrap text-xs font-semibold text-emerald-700">{formatCurrency(entry.totalCredit)}</p>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-md bg-slate-100 px-2 text-xs font-semibold text-slate-600">{formatNumber(entry.lines?.length)}</span>
                  </td>

                  <td className="px-4 py-3">
                    <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-1 text-[10px] font-semibold ${getJournalStatusColor(entry.status)}`}>{entry.status || 'Draft'}</span>
                  </td>

                  <td className="px-4 py-3">{renderJournalActions(entry)}</td>
                </tr>
              ))}

              {filteredEntries.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-14 text-center">
                    <BookOpen size={26} className="mx-auto text-slate-400" />

                    <h3 className="mt-3 text-sm font-bold text-erp-text">No journal entries found</h3>

                    <p className="mt-1 text-xs text-erp-muted">{hasActiveFilters ? 'Try changing your search or status filter.' : 'No journal entries have been created yet.'}</p>

                    {!hasActiveFilters && canCreate && (
                      <Link to="/company/journal-entries/new" className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-erp-primary px-3.5 text-xs font-semibold text-white hover:bg-erp-primary-hover">
                        <Plus size={14} />
                        Create First Journal Entry
                      </Link>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE JOURNAL ENTRIES */}

        <div className="divide-y divide-slate-100 md:hidden">
          {filteredEntries.map((entry) => {
            const entryId = String(entry._id)
            const isProcessing = processingId === entryId

            return (
              <article key={entry._id} className="space-y-3 p-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">
                    <BookOpen size={19} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="break-words text-sm font-semibold text-erp-text">{entry.journalNumber || 'Journal Entry'}</h3>

                    <p className="mt-1 break-words text-xs text-erp-muted">{entry.narration || 'No narration'}</p>

                    <p className="mt-1 text-xs text-slate-600">{getSourceLabel(entry.sourceType)}</p>
                  </div>

                  <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold ${getJournalStatusColor(entry.status)}`}>{entry.status || 'Draft'}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3">
                  <div>
                    <p className="text-[10px] text-slate-500">Entry Date</p>
                    <p className="mt-1 text-xs font-medium text-slate-700">{formatDate(entry.entryDate)}</p>
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-500">Reference</p>
                    <p className="mt-1 break-words text-xs font-medium text-slate-700">{entry.referenceNumber || '—'}</p>
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-500">Total Debit</p>
                    <p className="mt-1 text-xs font-semibold text-erp-text">{formatCurrency(entry.totalDebit)}</p>
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-500">Total Credit</p>
                    <p className="mt-1 text-xs font-semibold text-emerald-700">{formatCurrency(entry.totalCredit)}</p>
                  </div>

                  <div className="col-span-2">
                    <p className="text-[10px] text-slate-500">Journal Lines</p>
                    <p className="mt-1 text-xs font-semibold text-slate-700">{formatNumber(entry.lines?.length)} lines</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
                  {canView && (
                    <Link to={`/company/journal-entries/${entryId}`} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-erp-border text-xs font-semibold text-slate-700 hover:bg-erp-hover">
                      <Eye size={14} />
                      View
                    </Link>
                  )}

                  {canCreate && entry.status === 'Draft' && (entry.sourceType || 'Manual') === 'Manual' && (
                    <Link to={`/company/journal-entries/${entryId}/edit`} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-erp-border text-xs font-semibold text-slate-700 hover:bg-erp-hover">
                      <Pencil size={14} />
                      Edit
                    </Link>
                  )}

                  {canPost && entry.status === 'Draft' && (
                    <button
                      type="button"
                      onClick={() => openActionConfirmation(entry)}
                      disabled={Boolean(processingId) || cancelProcessing}
                      className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                    >
                      {isProcessing ? <LoaderCircle size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                      Post
                    </button>
                  )}

                  {canPost && entry.status === 'Draft' && (
                    <button
                      type="button"
                      onClick={() => openCancelConfirmation(entry)}
                      disabled={Boolean(processingId) || cancelProcessing}
                      className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-rose-200 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                    >
                      <Ban size={14} />
                      Cancel
                    </button>
                  )}
                </div>
              </article>
            )
          })}

          {filteredEntries.length === 0 && (
            <div className="px-4 py-12 text-center">
              <BookOpen size={26} className="mx-auto text-slate-400" />

              <h3 className="mt-3 font-semibold text-erp-text">No journal entries found</h3>

              <p className="mt-1 text-xs text-erp-muted">{hasActiveFilters ? 'Try changing your search or status filter.' : 'No journal entries have been created yet.'}</p>

              {!hasActiveFilters && canCreate && (
                <Link to="/company/journal-entries/new" className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-erp-primary px-3.5 text-xs font-semibold text-white hover:bg-erp-primary-hover">
                  <Plus size={14} />
                  Create First Journal Entry
                </Link>
              )}
            </div>
          )}
        </div>

        {/* PAGINATION */}

        <div className="flex flex-col gap-3 border-t border-erp-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs text-erp-text-secondary sm:text-sm">
              {search.trim() ? (
                <>
                  <span className="font-semibold text-erp-text">{formatNumber(filteredEntries.length)}</span> matching on this page
                  <span className="ml-1 text-erp-muted">
                    (page {safePage} of {totalPages})
                  </span>
                </>
              ) : (
                <>
                  Showing <span className="font-semibold text-erp-text">{pagination.total === 0 ? '0' : `${startIndex + 1}–${Math.min(startIndex + journalEntries.length, pagination.total)}`}</span> of{' '}
                  <span className="font-semibold text-erp-text">{formatNumber(pagination.total)}</span> journal entries
                </>
              )}
            </p>

            <div className="flex items-center gap-2">
              <label htmlFor="journal-page-size" className="whitespace-nowrap text-xs text-erp-text-secondary">
                Rows:
              </label>

              <select
                id="journal-page-size"
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

            <span className="min-w-20 px-1 text-center text-xs text-erp-text-secondary sm:text-sm">
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

      {/* POST CONFIRMATION */}

      {actionTarget && (
        <TrashBox
          isOpen={Boolean(actionTarget)}
          onClose={closeActionConfirmation}
          onAction={postJournalEntry}
          isProcessing={processingId === String(actionTarget._id)}
          variant="activate"
          title="Post Journal Entry?"
          message={`Post ${actionTarget.journalNumber || 'this journal entry'}? Once posted, this entry will be locked and cannot be edited or cancelled.`}
          actionButtonText="Post Entry"
          cancelButtonText="Keep Draft"
        />
      )}

      {/* CANCEL REASON CONFIRMATION */}
      <TrashBox
        isOpen={Boolean(cancelTarget)}
        onClose={closeCancelConfirmation}
        onAction={cancelJournalEntry}
        isProcessing={cancelProcessing}
        variant="delete"
        title="Cancel Journal Entry?"
        message={`Are you sure you want to cancel ${cancelTarget?.journalNumber || 'this journal entry'}?`}
        warningText="This draft journal entry will be marked as Cancelled. Posted entries cannot be cancelled."
        actionButtonText="Cancel Entry"
        cancelButtonText="Keep Draft"
        showReasonInput
        reason={cancelReason}
        onReasonChange={setCancelReason}
        reasonPlaceholder="Enter reason for cancelling this journal entry..."
      />
    </div>
  )
}
