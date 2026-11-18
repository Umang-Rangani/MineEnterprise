import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Eye, Pencil, ReceiptText, CheckCircle2, XCircle, Clock, ChevronLeft, ChevronRight, RefreshCw, FilterX, AlertCircle, LoaderCircle, CalendarDays, Ban, X, IndianRupee } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import Loading from '../Loading/Loading'
import TrashBox from '../../TrashBox/TrashBox'
import { hasPermission, useAuth } from '../../context/AuthContext'

const statusStyles = {
  Draft: 'border-amber-200 bg-amber-50 text-amber-700',
  Approved: 'border-blue-200 bg-blue-50 text-blue-700',
  'Partially Paid': 'border-orange-200 bg-orange-50 text-orange-700',
  Paid: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Overdue: 'border-rose-200 bg-rose-50 text-rose-700',
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

function getInvoiceArray(response) {
  const data = response?.data

  if (Array.isArray(data?.invoices)) return data.invoices
  if (Array.isArray(data?.data?.invoices)) return data.data.invoices
  if (Array.isArray(data?.data)) return data.data

  return []
}

function getInvoiceStatusColor(status) {
  return statusStyles[status] || statusStyles.Draft
}

function getCustomerName(invoice) {
  return invoice.customerId?.customerName || invoice.customerName || '—'
}

function getSalesOrderNumber(invoice) {
  return invoice.salesOrderId?.orderNumber || '—'
}

export default function CompanyInvoices() {
  const { permissions } = useAuth()

  const canCreate = hasPermission(permissions, 'invoice:create')
  const canView = hasPermission(permissions, 'invoice:view')
  const canUpdate = hasPermission(permissions, 'invoice:update')
  const canApprove = hasPermission(permissions, 'invoice:approve')
  const canCancel = hasPermission(permissions, 'invoice:cancel')

  const [invoices, setInvoices] = useState([])
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

  const breadcrumbItems = [{ title: 'Invoices', link: null }]

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
    document.title = 'Invoices | MineERP'
  }, [])

  // ---------------- FETCH INVOICES ----------------

  useEffect(() => {
    let cancelled = false

    async function fetchInvoices() {
      const isInitialLoad = !hasLoaded

      if (isInitialLoad) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }

      setApiError('')

      try {
        const response = await axiosInstance.get('/erp/invoices', {
          params: {
            page: currentPage,
            limit: pageSize,
            status: statusFilter === 'All' ? undefined : statusFilter,
          },
        })

        const data = response.data

        if (data?.success === false) {
          throw new Error(data.message || 'Unable to load invoices.')
        }

        if (cancelled) return

        const list = getInvoiceArray(response)

        setInvoices(list)

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

        setApiError(error.response?.data?.message || error.message || 'Unable to load invoices.')
      } finally {
        if (!cancelled) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    }

    fetchInvoices()

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

  const filteredInvoices = invoices.filter((invoice) => {
    const query = search.trim().toLowerCase()

    if (!query) return true

    const searchableValues = [invoice.invoiceNumber, invoice.customerId?.customerName, invoice.customerId?.customerCode, invoice.salesOrderId?.orderNumber, invoice.notes]

    return searchableValues.some((value) =>
      String(value || '')
        .toLowerCase()
        .includes(query),
    )
  })

  // ---------------- PAGE STATISTICS ----------------

  const draftOnPage = invoices.filter((invoice) => invoice.status === 'Draft').length

  const approvedOnPage = invoices.filter((invoice) => invoice.status === 'Approved').length

  const paidOnPage = invoices.filter((invoice) => invoice.status === 'Paid').length

  const outstandingOnPage = invoices.reduce((total, invoice) => total + Number(invoice.balanceAmount || 0), 0)

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

  // ---------------- APPROVE INVOICE ----------------

  const openActionConfirmation = (invoice) => {
    if (!canApprove || invoice.status !== 'Draft' || processingId || cancelProcessing) {
      return
    }

    setActionTarget(invoice)
  }

  const confirmInvoice = async () => {
    if (!actionTarget || processingId || cancelProcessing) return

    const invoiceId = String(actionTarget._id)

    setProcessingId(invoiceId)

    try {
      const response = await axiosInstance.patch(`/erp/invoices/${encodeURIComponent(invoiceId)}/approve`)

      const data = response.data

      if (data?.success === false) {
        throw new Error(data.message || 'Unable to approve invoice.')
      }

      showToast('success', data?.message || 'Invoice approved successfully.')

      setActionTarget(null)
      setRefreshKey((previous) => previous + 1)
    } catch (error) {
      showToast('error', error.response?.data?.message || error.message || 'Unable to approve invoice.')
    } finally {
      setProcessingId('')
    }
  }

  // ---------------- CANCEL INVOICE ----------------

  const openCancelConfirmation = (invoice) => {
    if (!canCancel || !['Draft', 'Approved'].includes(invoice.status) || Number(invoice.paidAmount || 0) > 0 || processingId || cancelProcessing) {
      return
    }

    setCancelReason('')
    setCancelTarget(invoice)
  }

  const closeCancelConfirmation = () => {
    if (cancelProcessing || processingId) return

    setCancelTarget(null)
    setCancelReason('')
  }

  const cancelInvoice = async () => {
    if (!cancelTarget || cancelProcessing || processingId) return

    if (cancelReason.trim().length < 3) {
      showToast('error', 'Please enter a cancellation reason of at least 3 characters.')
      return
    }

    const invoiceId = String(cancelTarget._id)

    setCancelProcessing(true)

    try {
      const response = await axiosInstance.patch(`/erp/invoices/${encodeURIComponent(invoiceId)}/cancel`, {
        reason: cancelReason.trim(),
      })

      const data = response.data

      if (data?.success === false) {
        throw new Error(data.message || 'Unable to cancel invoice.')
      }

      showToast('success', data?.message || 'Invoice cancelled successfully.')

      setCancelTarget(null)
      setCancelReason('')
      setRefreshKey((previous) => previous + 1)
    } catch (error) {
      showToast('error', error.response?.data?.message || error.message || 'Unable to cancel invoice.')
    } finally {
      setCancelProcessing(false)
    }
  }

  // ---------------- STATISTICS ----------------

  const statCards = [
    {
      title: 'Total Invoices',
      value: pagination.total,
      icon: ReceiptText,
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
      title: 'Approved on Page',
      value: approvedOnPage,
      icon: CheckCircle2,
      color: 'text-blue-700',
      border: 'border-blue-200',
    },
    {
      title: 'Outstanding on Page',
      value: formatCurrency(outstandingOnPage),
      icon: IndianRupee,
      color: 'text-rose-700',
      border: 'border-rose-200',
    },
  ]

  // ---------------- DESKTOP ACTIONS ----------------

  const renderInvoiceActions = (invoice) => {
    const invoiceId = String(invoice._id)
    const isProcessing = processingId === invoiceId

    return (
      <div className="flex items-center justify-end gap-1">
        {canView && (
          <Link to={`/company/invoices/${invoiceId}`} title="View invoice" aria-label={`View ${invoice.invoiceNumber || 'invoice'}`} className="rounded-lg p-2 text-slate-500 hover:bg-erp-primary-light hover:text-erp-primary">
            <Eye size={15} />
          </Link>
        )}

        {canUpdate && invoice.status === 'Draft' && (
          <Link to={`/company/invoices/${invoiceId}/edit`} title="Edit draft invoice" aria-label={`Edit ${invoice.invoiceNumber || 'invoice'}`} className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-600">
            <Pencil size={15} />
          </Link>
        )}

        {canApprove && invoice.status === 'Draft' && (
          <button
            type="button"
            title="Approve invoice"
            aria-label={`Approve ${invoice.invoiceNumber || 'invoice'}`}
            disabled={Boolean(processingId) || cancelProcessing}
            onClick={() => openActionConfirmation(invoice)}
            className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
          >
            {isProcessing ? <LoaderCircle size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
          </button>
        )}

        {canCancel && ['Draft', 'Approved'].includes(invoice.status) && Number(invoice.paidAmount || 0) <= 0 && (
          <button
            type="button"
            title="Cancel invoice"
            aria-label={`Cancel ${invoice.invoiceNumber || 'invoice'}`}
            disabled={Boolean(processingId) || cancelProcessing}
            onClick={() => openCancelConfirmation(invoice)}
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
            <Loading fullScreen={false} label="Loading invoices" description="Please wait while we load your company's invoices." className="!h-full min-h-[480px]" />
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

          <div className="flex  items-center gap-2">
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
                to="/company/invoices/new"
                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-erp-primary px-3.5 text-xs font-semibold text-white transition hover:bg-erp-primary-hover focus:outline-none focus:ring-2 focus:ring-erp-primary/30 focus:ring-offset-1"
              >
                <Plus size={15} />
                New Invoice
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

      {/* INVOICES TABLE */}

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
                placeholder="Search invoice, customer or order..."
                aria-label="Search invoices"
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
              aria-label="Filter invoice status"
              className="h-9 min-w-40 rounded-lg border border-erp-border bg-erp-surface px-3 text-xs text-erp-text outline-none focus:border-erp-primary sm:text-sm"
            >
              <option value="All">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Approved">Approved</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Paid">Paid</option>
              <option value="Overdue">Overdue</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* REFRESH STATUS */}

        {refreshing && hasLoaded && (
          <div className="flex items-center justify-center gap-2 border-b border-erp-border px-4 py-3 text-xs text-erp-muted">
            <LoaderCircle size={15} className="animate-spin text-erp-primary" />
            Updating invoice list...
          </div>
        )}

        {/* SEARCH SCOPE NOTE */}

        {search.trim() && <div className="border-b border-erp-border bg-slate-50/70 px-4 py-2 text-xs text-erp-text-secondary">Showing matches from the currently loaded page only.</div>}

        {/* DESKTOP TABLE */}

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[1100px] text-left">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-100">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Invoice</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Customer</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Sales Order</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Invoice Date</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Due Date</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Grand Total</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Paid</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Balance</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.map((invoice) => (
                <tr key={invoice._id} className="transition hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-erp-primary-light text-erp-primary">
                        <ReceiptText size={17} />
                      </div>

                      <div className="min-w-0">
                        <p className="max-w-44 truncate text-xs font-semibold text-erp-text sm:text-sm">{invoice.invoiceNumber || '—'}</p>

                        <p className="mt-0.5 text-[10px] text-erp-muted">{formatNumber(invoice.items?.length)} items</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <p className="max-w-48 truncate text-xs font-medium text-erp-text">{getCustomerName(invoice)}</p>

                    <p className="mt-0.5 text-[10px] text-erp-muted">{invoice.customerId?.customerCode || ''}</p>
                  </td>

                  <td className="px-4 py-3">
                    <p className="text-xs font-medium text-erp-text">{getSalesOrderNumber(invoice)}</p>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 whitespace-nowrap text-xs text-slate-600">
                      <CalendarDays size={13} className="shrink-0 text-slate-400" />
                      {formatDate(invoice.invoiceDate)}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <p className="whitespace-nowrap text-xs text-slate-600">{formatDate(invoice.dueDate)}</p>
                  </td>

                  <td className="px-4 py-3 text-right">
                    <p className="whitespace-nowrap text-xs font-semibold text-erp-text">{formatCurrency(invoice.grandTotal)}</p>
                  </td>

                  <td className="px-4 py-3 text-right">
                    <p className="whitespace-nowrap text-xs font-medium text-emerald-700">{formatCurrency(invoice.paidAmount)}</p>
                  </td>

                  <td className="px-4 py-3 text-right">
                    <p className="whitespace-nowrap text-xs font-semibold text-rose-700">{formatCurrency(invoice.balanceAmount)}</p>
                  </td>

                  <td className="px-4 py-3">
                    <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-1 text-[10px] font-semibold ${getInvoiceStatusColor(invoice.status)}`}>{invoice.status || 'Draft'}</span>
                  </td>

                  <td className="px-4 py-3">{renderInvoiceActions(invoice)}</td>
                </tr>
              ))}

              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-14 text-center">
                    <ReceiptText size={26} className="mx-auto text-slate-400" />

                    <h3 className="mt-3 text-sm font-bold text-erp-text">No invoices found</h3>

                    <p className="mt-1 text-xs text-erp-muted">{hasActiveFilters ? 'Try changing your search or status filter.' : 'No invoices have been created yet.'}</p>

                    {!hasActiveFilters && canCreate && (
                      <Link to="/company/invoices/new" className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-erp-primary px-3.5 text-xs font-semibold text-white hover:bg-erp-primary-hover">
                        <Plus size={14} />
                        Create First Invoice
                      </Link>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE INVOICES */}

        <div className="divide-y divide-slate-100 md:hidden">
          {filteredInvoices.map((invoice) => {
            const invoiceId = String(invoice._id)
            const isProcessing = processingId === invoiceId

            return (
              <article key={invoice._id} className="space-y-3 p-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">
                    <ReceiptText size={19} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="break-words text-sm font-semibold text-erp-text">{invoice.invoiceNumber || 'Invoice'}</h3>

                    <p className="mt-1 break-words text-xs text-erp-muted">{getSalesOrderNumber(invoice)}</p>

                    <p className="mt-1 break-words text-xs text-slate-600">{getCustomerName(invoice)}</p>
                  </div>

                  <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold ${getInvoiceStatusColor(invoice.status)}`}>{invoice.status || 'Draft'}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3">
                  <div>
                    <p className="text-[10px] text-slate-500">Invoice Date</p>
                    <p className="mt-1 text-xs font-medium text-slate-700">{formatDate(invoice.invoiceDate)}</p>
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-500">Due Date</p>
                    <p className="mt-1 text-xs font-medium text-slate-700">{formatDate(invoice.dueDate)}</p>
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-500">Grand Total</p>
                    <p className="mt-1 text-xs font-semibold text-erp-text">{formatCurrency(invoice.grandTotal)}</p>
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-500">Paid Amount</p>
                    <p className="mt-1 text-xs font-semibold text-emerald-700">{formatCurrency(invoice.paidAmount)}</p>
                  </div>

                  <div className="col-span-2">
                    <p className="text-[10px] text-slate-500">Outstanding Balance</p>
                    <p className="mt-1 text-sm font-bold text-rose-700">{formatCurrency(invoice.balanceAmount)}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
                  {canView && (
                    <Link to={`/company/invoices/${invoiceId}`} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-erp-border text-xs font-semibold text-slate-700 hover:bg-erp-hover">
                      <Eye size={14} />
                      View
                    </Link>
                  )}

                  {canUpdate && invoice.status === 'Draft' && (
                    <Link to={`/company/invoices/${invoiceId}/edit`} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-erp-border text-xs font-semibold text-slate-700 hover:bg-erp-hover">
                      <Pencil size={14} />
                      Edit
                    </Link>
                  )}

                  {canApprove && invoice.status === 'Draft' && (
                    <button
                      type="button"
                      onClick={() => openActionConfirmation(invoice)}
                      disabled={Boolean(processingId) || cancelProcessing}
                      className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                    >
                      {isProcessing ? <LoaderCircle size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                      Approve
                    </button>
                  )}

                  {canCancel && ['Draft', 'Approved'].includes(invoice.status) && Number(invoice.paidAmount || 0) <= 0 && (
                    <button
                      type="button"
                      onClick={() => openCancelConfirmation(invoice)}
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

          {filteredInvoices.length === 0 && (
            <div className="px-4 py-12 text-center">
              <ReceiptText size={26} className="mx-auto text-slate-400" />

              <h3 className="mt-3 font-semibold text-erp-text">No invoices found</h3>

              <p className="mt-1 text-xs text-erp-muted">{hasActiveFilters ? 'Try changing your search or status filter.' : 'No invoices have been created yet.'}</p>

              {!hasActiveFilters && canCreate && (
                <Link to="/company/invoices/new" className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-erp-primary px-3.5 text-xs font-semibold text-white hover:bg-erp-primary-hover">
                  <Plus size={14} />
                  Create First Invoice
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
                  <span className="font-semibold text-erp-text">{formatNumber(filteredInvoices.length)}</span> matching on this page
                  <span className="ml-1 text-erp-muted">
                    (page {safePage} of {totalPages})
                  </span>
                </>
              ) : (
                <>
                  Showing <span className="font-semibold text-erp-text">{pagination.total === 0 ? '0' : `${startIndex + 1}–${Math.min(startIndex + invoices.length, pagination.total)}`}</span> of{' '}
                  <span className="font-semibold text-erp-text">{formatNumber(pagination.total)}</span> invoices
                </>
              )}
            </p>

            <div className="flex items-center gap-2">
              <label htmlFor="invoice-page-size" className="whitespace-nowrap text-xs text-erp-text-secondary">
                Rows:
              </label>

              <select
                id="invoice-page-size"
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

      {/* APPROVE CONFIRMATION */}

      {actionTarget && (
        <TrashBox
          isOpen={Boolean(actionTarget)}
          onClose={closeActionConfirmation}
          onAction={confirmInvoice}
          isProcessing={processingId === String(actionTarget._id)}
          variant="activate"
          title="Approve Invoice?"
          message={`Approve ${actionTarget.invoiceNumber || 'this invoice'}? Once approved, this invoice will be finalized.`}
          actionButtonText="Approve Invoice"
          cancelButtonText="Keep Draft"
        />
      )}

      {/* CANCEL REASON MODAL */}

      {cancelTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeCancelConfirmation()
            }
          }}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="cancel-invoice-title" className="w-full max-w-md overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-2xl">
            <div className="flex items-start justify-between border-b border-erp-border px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                  <Ban size={19} />
                </div>

                <div>
                  <h2 id="cancel-invoice-title" className="text-sm font-bold text-erp-text">
                    Cancel Invoice?
                  </h2>

                  <p className="mt-1 text-xs text-erp-muted">{cancelTarget.invoiceNumber || 'Invoice'}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeCancelConfirmation}
                disabled={cancelProcessing || Boolean(processingId)}
                aria-label="Close cancellation dialog"
                className="rounded-lg p-1.5 text-erp-muted hover:bg-erp-hover hover:text-erp-text disabled:opacity-50"
              >
                <X size={17} />
              </button>
            </div>

            <div className="space-y-3 px-5 py-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                <p className="text-xs leading-5 text-amber-800">This invoice will be marked as Cancelled. Its dispatch quantities will become available for invoicing again. Invoices with received payments cannot be cancelled.</p>
              </div>

              <div>
                <label htmlFor="invoice-cancel-reason" className="mb-1.5 block text-xs font-semibold text-erp-text">
                  Cancellation Reason <span className="text-rose-600">*</span>
                </label>

                <textarea
                  id="invoice-cancel-reason"
                  rows={3}
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                  placeholder="Enter reason for cancelling this invoice..."
                  disabled={cancelProcessing}
                  maxLength={500}
                  className="w-full resize-none rounded-lg border border-erp-border bg-erp-surface px-3 py-2.5 text-xs text-erp-text outline-none placeholder:text-erp-muted focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10 disabled:opacity-60"
                />

                <div className="mt-1 flex items-center justify-between">
                  <p className="text-[10px] text-erp-muted">Minimum 3 characters required.</p>

                  <p className="text-[10px] text-erp-muted">{cancelReason.length}/500</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-erp-border px-5 py-3">
              <button
                type="button"
                onClick={closeCancelConfirmation}
                disabled={cancelProcessing || Boolean(processingId)}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-erp-border px-3.5 text-xs font-semibold text-erp-text-secondary hover:bg-erp-hover disabled:opacity-50"
              >
                Keep Invoice
              </button>

              <button
                type="button"
                onClick={cancelInvoice}
                disabled={cancelProcessing || Boolean(processingId) || cancelReason.trim().length < 3}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-3.5 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cancelProcessing ? <LoaderCircle size={14} className="animate-spin" /> : <Ban size={14} />}

                {cancelProcessing ? 'Cancelling...' : 'Cancel Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
