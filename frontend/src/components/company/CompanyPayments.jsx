import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Eye, Pencil, CreditCard, CheckCircle2, RefreshCw, FilterX, AlertCircle, LoaderCircle, CalendarDays, ChevronLeft, ChevronRight, IndianRupee, Download, ReceiptText, Wallet } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import Loading from '../Loading/Loading'
import { hasPermission, useAuth } from '../../context/AuthContext'

const statusStyles = {
  Completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  'Partially Refunded': 'border-orange-200 bg-orange-50 text-orange-700',
  Refunded: 'border-rose-200 bg-rose-50 text-rose-700',
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

function getPaymentArray(response) {
  const data = response?.data

  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.payments)) return data.payments
  if (Array.isArray(data?.data?.payments)) return data.data.payments

  return []
}

function getPaymentStatusColor(status) {
  return statusStyles[status] || statusStyles.Completed
}

function getCustomerName(payment) {
  return payment.customerId?.customerName || payment.customerName || '—'
}

function getInvoiceNumber(payment) {
  return payment.invoiceId?.invoiceNumber || payment.invoiceNumber || '—'
}

function getNetAmount(payment) {
  return Math.max(0, Number(payment.amount || 0) - Number(payment.refundedAmount || 0))
}

export default function CompanyPayments() {
  const { permissions } = useAuth()

  const canCreate = hasPermission(permissions, 'payment:record')
  const canView = hasPermission(permissions, 'payment:view')
  const canUpdate = hasPermission(permissions, 'payment:update')

  const [payments, setPayments] = useState([])
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
  const [downloadingId, setDownloadingId] = useState('')

  const breadcrumbItems = [{ title: 'Payments', link: null }]

  const showToast = (type, message) => {
    setToast({
      id: Date.now(),
      type,
      message,
      duration: 3000,
    })
  }

  useEffect(() => {
    document.title = 'Payments | MineERP'
  }, [])

  // FETCH PAYMENTS

  useEffect(() => {
    let cancelled = false

    async function fetchPayments() {
      const isInitialLoad = !hasLoaded

      if (isInitialLoad) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }

      setApiError('')

      try {
        const response = await axiosInstance.get('/erp/payments', {
          params: {
            page: currentPage,
            limit: pageSize,
            status: statusFilter === 'All' ? undefined : statusFilter,
          },
        })

        const data = response.data

        if (data?.success === false) {
          throw new Error(data.message || 'Unable to load payments.')
        }

        if (cancelled) return

        const list = getPaymentArray(response)

        setPayments(list)

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

        setApiError(error.response?.data?.message || error.message || 'Unable to load payments.')
      } finally {
        if (!cancelled) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    }

    fetchPayments()

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

  const filteredPayments = payments.filter((payment) => {
    const query = search.trim().toLowerCase()

    if (!query) return true

    const searchableValues = [payment.paymentNumber, payment.transactionReference, payment.paymentMode, payment.status, payment.customerId?.customerName, payment.customerId?.customerCode, payment.invoiceId?.invoiceNumber]

    return searchableValues.some((value) =>
      String(value || '')
        .toLowerCase()
        .includes(query),
    )
  })

  // PAGE STATISTICS

  const completedOnPage = payments.filter((payment) => payment.status === 'Completed').length

  const refundedOnPage = payments.filter((payment) => payment.status === 'Refunded' || payment.status === 'Partially Refunded').length

  const totalAmountOnPage = payments.reduce((total, payment) => total + Number(payment.amount || 0), 0)

  const netAmountOnPage = payments.reduce((total, payment) => total + getNetAmount(payment), 0)

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
    if (refreshing || loading || downloadingId) return

    setRefreshing(true)
    setRefreshKey((previous) => previous + 1)
  }

  // DOWNLOAD RECEIPT

  const handleDownloadReceipt = async (payment) => {
    const paymentId = String(payment._id)

    if (!paymentId || downloadingId) return

    setDownloadingId(paymentId)

    try {
      const response = await axiosInstance.get(`/erp/payments/${encodeURIComponent(paymentId)}/receipt`, {
        responseType: 'blob',
      })

      const blob = new Blob([response.data], {
        type: 'application/pdf',
      })

      const url = window.URL.createObjectURL(blob)

      const link = document.createElement('a')

      link.href = url
      link.download = `${payment.paymentNumber || 'Payment-Receipt'}.pdf`

      document.body.appendChild(link)
      link.click()
      link.remove()

      window.URL.revokeObjectURL(url)

      showToast('success', 'Payment receipt downloaded successfully.')
    } catch (error) {
      let message = 'Unable to download payment receipt.'

      if (error.response?.data instanceof Blob) {
        try {
          const errorData = JSON.parse(await error.response.data.text())

          message = errorData.message || message
        } catch {
          message = 'Unable to download payment receipt.'
        }
      } else {
        message = error.response?.data?.message || error.message || message
      }

      showToast('error', message)
    } finally {
      setDownloadingId('')
    }
  }

  // STATISTICS

  const statCards = [
    {
      title: 'Total Payments',
      value: pagination.total,
      icon: CreditCard,
      color: 'text-violet-700',
      border: 'border-violet-200',
    },
    {
      title: 'Completed on Page',
      value: completedOnPage,
      icon: CheckCircle2,
      color: 'text-emerald-700',
      border: 'border-emerald-200',
    },
    {
      title: 'Refunded on Page',
      value: refundedOnPage,
      icon: Wallet,
      color: 'text-orange-700',
      border: 'border-orange-200',
    },
    {
      title: 'Net Received on Page',
      value: formatCurrency(netAmountOnPage),
      icon: IndianRupee,
      color: 'text-blue-700',
      border: 'border-blue-200',
    },
  ]

  // DESKTOP ACTIONS

  const renderPaymentActions = (payment) => {
    const paymentId = String(payment._id)
    const isDownloading = downloadingId === paymentId

    return (
      <div className="flex items-center justify-end gap-1">
        {canView && (
          <Link to={`/company/payments/${paymentId}`} title="View payment" aria-label={`View ${payment.paymentNumber || 'payment'}`} className="rounded-lg p-2 text-slate-500 hover:bg-erp-primary-light hover:text-erp-primary">
            <Eye size={15} />
          </Link>
        )}

        {canUpdate && payment.status !== 'Refunded' && (
          <Link to={`/company/payments/${paymentId}/edit`} title="Edit payment details" aria-label={`Edit ${payment.paymentNumber || 'payment'}`} className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-600">
            <Pencil size={15} />
          </Link>
        )}

        {canView && (
          <button
            type="button"
            title="Download receipt"
            aria-label={`Download receipt for ${payment.paymentNumber || 'payment'}`}
            disabled={Boolean(downloadingId)}
            onClick={() => handleDownloadReceipt(payment)}
            className="rounded-lg p-2 text-violet-600 hover:bg-violet-50 disabled:opacity-50"
          >
            {isDownloading ? <LoaderCircle size={15} className="animate-spin" /> : <Download size={15} />}
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
            <Loading fullScreen={false} label="Loading payments" description="Please wait while we load your company's payments." className="!h-full min-h-[480px]" />
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
              disabled={refreshing || loading || Boolean(downloadingId)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-erp-border px-3 text-xs font-semibold text-erp-text-secondary hover:bg-erp-hover disabled:opacity-60"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>

            {canCreate && (
              <Link
                to="/company/payments/new"
                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-erp-primary px-3.5 text-xs font-semibold text-white transition hover:bg-erp-primary-hover focus:outline-none focus:ring-2 focus:ring-erp-primary/30 focus:ring-offset-1"
              >
                <Plus size={15} />
                Record Payment
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

      {/* PAYMENTS TABLE */}

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
                placeholder="Search payment, invoice or customer..."
                aria-label="Search payments"
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
              aria-label="Filter payment status"
              className="h-9 min-w-40 rounded-lg border border-erp-border bg-erp-surface px-3 text-xs text-erp-text outline-none focus:border-erp-primary sm:text-sm"
            >
              <option value="All">All Statuses</option>
              <option value="Completed">Completed</option>
              <option value="Partially Refunded">Partially Refunded</option>
              <option value="Refunded">Refunded</option>
            </select>
          </div>
        </div>

        {/* REFRESH STATUS */}

        {refreshing && hasLoaded && (
          <div className="flex items-center justify-center gap-2 border-b border-erp-border px-4 py-3 text-xs text-erp-muted">
            <LoaderCircle size={15} className="animate-spin text-erp-primary" />
            Updating payment list...
          </div>
        )}

        {/* SEARCH SCOPE NOTE */}

        {search.trim() && <div className="border-b border-erp-border bg-slate-50/70 px-4 py-2 text-xs text-erp-text-secondary">Showing matches from the currently loaded page only.</div>}

        {/* DESKTOP TABLE */}

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[1050px] text-left">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-100">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Payment</th>

                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Customer</th>

                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Invoice</th>

                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Payment Date</th>

                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Mode</th>

                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Amount</th>

                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Net Received</th>

                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</th>

                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredPayments.map((payment) => (
                <tr key={payment._id} className="transition hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-erp-primary-light text-erp-primary">
                        <CreditCard size={17} />
                      </div>

                      <div className="min-w-0">
                        <p className="max-w-44 truncate text-xs font-semibold text-erp-text sm:text-sm">{payment.paymentNumber || '—'}</p>

                        <p className="mt-0.5 max-w-44 truncate text-[10px] text-erp-muted">{payment.transactionReference || 'No reference'}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <p className="max-w-48 truncate text-xs font-medium text-erp-text">{getCustomerName(payment)}</p>

                    <p className="mt-0.5 text-[10px] text-erp-muted">{payment.customerId?.customerCode || ''}</p>
                  </td>

                  <td className="px-4 py-3">
                    <p className="text-xs font-medium text-erp-text">{getInvoiceNumber(payment)}</p>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 whitespace-nowrap text-xs text-slate-600">
                      <CalendarDays size={13} className="shrink-0 text-slate-400" />
                      {formatDate(payment.paymentDate)}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <p className="whitespace-nowrap text-xs text-slate-600">{payment.paymentMode || '—'}</p>
                  </td>

                  <td className="px-4 py-3 text-right">
                    <p className="whitespace-nowrap text-xs font-semibold text-erp-text">{formatCurrency(payment.amount)}</p>

                    {Number(payment.refundedAmount || 0) > 0 && <p className="mt-0.5 whitespace-nowrap text-[10px] text-rose-600">Refunded: {formatCurrency(payment.refundedAmount)}</p>}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <p className="whitespace-nowrap text-xs font-semibold text-emerald-700">{formatCurrency(getNetAmount(payment))}</p>
                  </td>

                  <td className="px-4 py-3">
                    <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-1 text-[10px] font-semibold ${getPaymentStatusColor(payment.status)}`}>{payment.status || 'Completed'}</span>
                  </td>

                  <td className="px-4 py-3">{renderPaymentActions(payment)}</td>
                </tr>
              ))}

              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-14 text-center">
                    <CreditCard size={26} className="mx-auto text-slate-400" />

                    <h3 className="mt-3 text-sm font-bold text-erp-text">No payments found</h3>

                    <p className="mt-1 text-xs text-erp-muted">{hasActiveFilters ? 'Try changing your search or status filter.' : 'No payments have been recorded yet.'}</p>

                    {!hasActiveFilters && canCreate && (
                      <Link to="/company/payments/new" className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-erp-primary px-3.5 text-xs font-semibold text-white hover:bg-erp-primary-hover">
                        <Plus size={14} />
                        Record First Payment
                      </Link>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE PAYMENTS */}

        <div className="divide-y divide-slate-100 md:hidden">
          {filteredPayments.map((payment) => {
            const paymentId = String(payment._id)
            const isDownloading = downloadingId === paymentId

            return (
              <article key={payment._id} className="space-y-3 p-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">
                    <CreditCard size={19} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="break-words text-sm font-semibold text-erp-text">{payment.paymentNumber || 'Payment'}</h3>

                    <p className="mt-1 break-words text-xs text-erp-muted">{getInvoiceNumber(payment)}</p>

                    <p className="mt-1 break-words text-xs text-slate-600">{getCustomerName(payment)}</p>
                  </div>

                  <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold ${getPaymentStatusColor(payment.status)}`}>{payment.status || 'Completed'}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3">
                  <div>
                    <p className="text-[10px] text-slate-500">Payment Date</p>

                    <p className="mt-1 text-xs font-medium text-slate-700">{formatDate(payment.paymentDate)}</p>
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-500">Payment Mode</p>

                    <p className="mt-1 text-xs font-medium text-slate-700">{payment.paymentMode || '—'}</p>
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-500">Payment Amount</p>

                    <p className="mt-1 text-xs font-semibold text-erp-text">{formatCurrency(payment.amount)}</p>
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-500">Refunded Amount</p>

                    <p className="mt-1 text-xs font-semibold text-rose-700">{formatCurrency(payment.refundedAmount)}</p>
                  </div>

                  <div className="col-span-2 border-t border-slate-200 pt-2">
                    <p className="text-[10px] text-slate-500">Net Received</p>

                    <p className="mt-1 text-sm font-bold text-emerald-700">{formatCurrency(getNetAmount(payment))}</p>
                  </div>
                </div>

                {payment.transactionReference && <p className="break-all text-[10px] text-erp-muted">Reference: {payment.transactionReference}</p>}

                <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
                  {canView && (
                    <Link to={`/company/payments/${paymentId}`} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-erp-border text-xs font-semibold text-slate-700 hover:bg-erp-hover">
                      <Eye size={14} />
                      View
                    </Link>
                  )}

                  {canUpdate && payment.status !== 'Refunded' && (
                    <Link to={`/company/payments/${paymentId}/edit`} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-erp-border text-xs font-semibold text-slate-700 hover:bg-erp-hover">
                      <Pencil size={14} />
                      Edit
                    </Link>
                  )}

                  {canView && (
                    <button
                      type="button"
                      onClick={() => handleDownloadReceipt(payment)}
                      disabled={Boolean(downloadingId)}
                      className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-violet-200 text-xs font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-50"
                    >
                      {isDownloading ? <LoaderCircle size={14} className="animate-spin" /> : <Download size={14} />}
                      Receipt
                    </button>
                  )}
                </div>
              </article>
            )
          })}

          {filteredPayments.length === 0 && (
            <div className="px-4 py-12 text-center">
              <CreditCard size={26} className="mx-auto text-slate-400" />

              <h3 className="mt-3 font-semibold text-erp-text">No payments found</h3>

              <p className="mt-1 text-xs text-erp-muted">{hasActiveFilters ? 'Try changing your search or status filter.' : 'No payments have been recorded yet.'}</p>

              {!hasActiveFilters && canCreate && (
                <Link to="/company/payments/new" className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-erp-primary px-3.5 text-xs font-semibold text-white hover:bg-erp-primary-hover">
                  <Plus size={14} />
                  Record First Payment
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
                  <span className="font-semibold text-erp-text">{formatNumber(filteredPayments.length)}</span> matching on this page
                  <span className="ml-1 text-erp-muted">
                    (page {safePage} of {totalPages})
                  </span>
                </>
              ) : (
                <>
                  Showing <span className="font-semibold text-erp-text">{pagination.total === 0 ? '0' : `${startIndex + 1}–${Math.min(startIndex + payments.length, pagination.total)}`}</span> of{' '}
                  <span className="font-semibold text-erp-text">{formatNumber(pagination.total)}</span> payments
                </>
              )}
            </p>

            <div className="flex items-center gap-2">
              <label htmlFor="payment-page-size" className="whitespace-nowrap text-xs text-erp-text-secondary">
                Rows:
              </label>

              <select
                id="payment-page-size"
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
    </div>
  )
}
