import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Eye, Pencil, ClipboardCheck, CheckCircle2, XCircle, Clock, ChevronLeft, ChevronRight, RefreshCw, FilterX, AlertCircle, LoaderCircle, CalendarDays, Warehouse, Ban, X } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import Loading from '../Loading/Loading'
import TrashBox from '../../TrashBox/TrashBox'
import { hasPermission, useAuth } from '../../context/AuthContext'

const statusStyles = {
  Draft: 'border-amber-200 bg-amber-50 text-amber-700',
  Confirmed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Cancelled: 'border-rose-200 bg-rose-50 text-rose-700',
}

const formatNumber = (value) =>
  new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
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

function getReceiptArray(response) {
  const data = response?.data

  if (Array.isArray(data?.receipts)) return data.receipts
  if (Array.isArray(data?.goodsReceipts)) return data.goodsReceipts
  if (Array.isArray(data?.data?.receipts)) return data.data.receipts
  if (Array.isArray(data?.data?.goodsReceipts)) return data.data.goodsReceipts
  if (Array.isArray(data?.data)) return data.data

  return []
}

function getReceiptStatusColor(status) {
  return statusStyles[status] || statusStyles.Draft
}

export default function CompanyGoodsReceipts() {
  const { permissions } = useAuth()

  const canCreate = hasPermission(permissions, 'purchase:create')
  const canView = hasPermission(permissions, 'purchase:view')
  const canUpdate = hasPermission(permissions, 'purchase:create')
  const canConfirm = hasPermission(permissions, 'purchase:approve')
  const canCancel = hasPermission(permissions, 'purchase:create')

  const [receipts, setReceipts] = useState([])
  const [loading, setLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [apiError, setApiError] = useState('')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [refreshKey, setRefreshKey] = useState(0)

  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelProcessing, setCancelProcessing] = useState(false)

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  })

  const [toast, setToast] = useState(null)
  const [actionTarget, setActionTarget] = useState(null)
  const [processingId, setProcessingId] = useState('')

  const breadcrumbItems = [{ title: 'Goods Receipts', link: null }]

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
    document.title = 'Goods Receipts | MineERP'
  }, [])

  useEffect(() => {
    let cancelled = false

    async function fetchReceipts() {
      if (!hasLoaded) {
        setLoading(true)
      }

      setApiError('')

      try {
        const response = await axiosInstance.get('/erp/goods-receipts', {
          params: {
            page: currentPage,
            limit: pageSize,
            status: statusFilter === 'All' ? undefined : statusFilter,
          },
        })

        const data = response.data

        if (data?.success === false) {
          throw new Error(data.message || 'Unable to load goods receipts.')
        }

        if (cancelled) return

        const list = getReceiptArray(response)

        setReceipts(list)

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

        setApiError(error.response?.data?.message || error.message || 'Unable to load goods receipts.')
      } finally {
        if (!cancelled) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    }

    fetchReceipts()

    return () => {
      cancelled = true
    }
  }, [currentPage, pageSize, statusFilter, refreshKey])

  useEffect(() => {
    if (currentPage > pagination.totalPages) {
      setCurrentPage(Math.max(1, pagination.totalPages))
    }
  }, [currentPage, pagination.totalPages])

  const filteredReceipts = receipts.filter((receipt) => {
    const query = search.trim().toLowerCase()

    if (!query) return true

    const searchableValues = [receipt.receiptNumber, receipt.purchaseNumber, receipt.purchaseId?.purchaseNumber, receipt.supplierName, receipt.supplierId?.supplierName, receipt.warehouseId?.name, receipt.warehouseId?.code]

    return searchableValues.some((value) =>
      String(value || '')
        .toLowerCase()
        .includes(query),
    )
  })

  const draftOnPage = receipts.filter((receipt) => receipt.status === 'Draft').length

  const confirmedOnPage = receipts.filter((receipt) => receipt.status === 'Confirmed').length

  const cancelledOnPage = receipts.filter((receipt) => receipt.status === 'Cancelled').length

  const hasActiveFilters = Boolean(search.trim()) || statusFilter !== 'All'

  const totalPages = Math.max(1, pagination.totalPages)
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * pageSize

  const resetFilters = () => {
    setSearch('')
    setStatusFilter('All')
    setCurrentPage(1)
  }

  const handleRefresh = () => {
    if (refreshing || loading || processingId || cancelProcessing) return

    setRefreshing(true)
    setRefreshKey((previous) => previous + 1)
  }

  // ---------------- CONFIRM GOODS RECEIPT ----------------

  const openActionConfirmation = (receipt) => {
    if (!canConfirm || receipt.status !== 'Draft' || processingId || cancelProcessing) {
      return
    }

    setActionTarget(receipt)
  }

  const confirmGoodsReceipt = async () => {
    if (!actionTarget || processingId || cancelProcessing) return

    const receiptId = String(actionTarget._id)

    setProcessingId(receiptId)

    try {
      const response = await axiosInstance.post(`/erp/goods-receipts/${encodeURIComponent(receiptId)}/confirm`)

      const data = response.data

      if (data?.success === false) {
        throw new Error(data.message || 'Unable to confirm goods receipt.')
      }

      showToast('success', data?.message || 'Goods receipt confirmed successfully.')

      setActionTarget(null)
      setRefreshKey((previous) => previous + 1)
    } catch (error) {
      showToast('error', error.response?.data?.message || error.message || 'Unable to confirm goods receipt.')
    } finally {
      setProcessingId('')
    }
  }

  // ---------------- CANCEL GOODS RECEIPT ----------------

  const openCancelConfirmation = (receipt) => {
    if (!canCancel || receipt.status !== 'Draft' || processingId || cancelProcessing) {
      return
    }

    setCancelReason('')
    setCancelTarget(receipt)
  }

  const closeCancelConfirmation = () => {
    if (cancelProcessing || processingId) return

    setCancelTarget(null)
    setCancelReason('')
  }

  const cancelGoodsReceipt = async () => {
    if (!cancelTarget || cancelProcessing || processingId) return

    if (cancelReason.trim().length < 3) {
      showToast('error', 'Please enter a cancellation reason of at least 3 characters.')
      return
    }

    const receiptId = String(cancelTarget._id)

    setCancelProcessing(true)

    try {
      const response = await axiosInstance.patch(`/erp/goods-receipts/${encodeURIComponent(receiptId)}/cancel`, {
        reason: cancelReason.trim(),
      })

      const data = response.data

      if (data?.success === false) {
        throw new Error(data.message || 'Unable to cancel goods receipt.')
      }

      showToast('success', data?.message || 'Goods receipt cancelled successfully.')

      setCancelTarget(null)
      setCancelReason('')
      setRefreshKey((previous) => previous + 1)
    } catch (error) {
      showToast('error', error.response?.data?.message || error.message || 'Unable to cancel goods receipt.')
    } finally {
      setCancelProcessing(false)
    }
  }

  // ---------------- STATISTICS ----------------

  const statCards = [
    {
      title: 'Total Receipts',
      value: pagination.total,
      icon: ClipboardCheck,
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
      title: 'Confirmed on Page',
      value: confirmedOnPage,
      icon: CheckCircle2,
      color: 'text-emerald-700',
      border: 'border-emerald-200',
    },
    {
      title: 'Cancelled on Page',
      value: cancelledOnPage,
      icon: XCircle,
      color: 'text-rose-700',
      border: 'border-rose-200',
    },
  ]

  // ---------------- DESKTOP ACTIONS ----------------

  const renderReceiptActions = (receipt) => {
    const receiptId = String(receipt._id)
    const isProcessing = processingId === receiptId

    return (
      <div className="flex items-center justify-end gap-1">
        {canView && (
          <Link to={`/company/goods-receipts/${receiptId}`} title="View goods receipt" aria-label={`View ${receipt.receiptNumber || 'goods receipt'}`} className="rounded-lg p-2 text-slate-500 hover:bg-erp-primary-light hover:text-erp-primary">
            <Eye size={15} />
          </Link>
        )}

        {canUpdate && receipt.status === 'Draft' && (
          <Link to={`/company/goods-receipts/${receiptId}/edit`} title="Edit draft receipt" aria-label={`Edit ${receipt.receiptNumber || 'goods receipt'}`} className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-600">
            <Pencil size={15} />
          </Link>
        )}

        {canConfirm && receipt.status === 'Draft' && (
          <button
            type="button"
            title="Confirm goods receipt"
            aria-label={`Confirm ${receipt.receiptNumber || 'goods receipt'}`}
            disabled={Boolean(processingId) || cancelProcessing}
            onClick={() => openActionConfirmation(receipt)}
            className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
          >
            {isProcessing ? <LoaderCircle size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
          </button>
        )}

        {canCancel && receipt.status === 'Draft' && (
          <button
            type="button"
            title="Cancel goods receipt"
            aria-label={`Cancel ${receipt.receiptNumber || 'goods receipt'}`}
            disabled={Boolean(processingId) || cancelProcessing}
            onClick={() => openCancelConfirmation(receipt)}
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
            <Loading fullScreen={false} label="Loading goods receipts" description="Please wait while we load your company's goods receipts." className="!h-full min-h-[480px]" />
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

                  <span className="text-sm font-bold text-erp-text">{formatNumber(card.value)}</span>
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
              Refresh
            </button>

            {canCreate && (
              <Link
                to="/company/goods-receipts/new"
                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-erp-primary px-3.5 text-xs font-semibold text-white transition hover:bg-erp-primary-hover focus:outline-none focus:ring-2 focus:ring-erp-primary/30 focus:ring-offset-1"
              >
                <Plus size={15} />
                New Goods Receipt
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

          <button type="button" onClick={handleRefresh} className="ml-auto shrink-0 font-semibold underline">
            Retry
          </button>
        </div>
      )}

      {/* RECEIPTS TABLE */}

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
                placeholder="Search GRN, purchase number or supplier..."
                aria-label="Search goods receipts"
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
              aria-label="Filter goods receipt status"
              className="h-9 min-w-36 rounded-lg border border-erp-border bg-erp-surface px-3 text-xs text-erp-text outline-none focus:border-erp-primary sm:text-sm"
            >
              <option value="All">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {loading && hasLoaded && (
          <div className="flex items-center justify-center gap-2 border-b border-erp-border px-4 py-3 text-xs text-erp-muted">
            <LoaderCircle size={15} className="animate-spin text-erp-primary" />
            Updating goods receipt list...
          </div>
        )}

        {/* DESKTOP TABLE */}

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[1000px] text-left">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-100">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Goods Receipt</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Purchase Order</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Supplier</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Warehouse</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Receipt Date</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Items</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredReceipts.map((receipt) => (
                <tr key={receipt._id} className="transition hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-erp-primary-light text-erp-primary">
                        <ClipboardCheck size={17} />
                      </div>

                      <div className="min-w-0">
                        <p className="max-w-44 truncate text-xs font-semibold text-erp-text sm:text-sm">{receipt.receiptNumber || '—'}</p>

                        <p className="mt-0.5 text-[10px] text-erp-muted">{formatNumber(receipt.items?.length)} items</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <p className="text-xs font-medium text-erp-text">{receipt.purchaseNumber || receipt.purchaseId?.purchaseNumber || '—'}</p>
                  </td>

                  <td className="px-4 py-3">
                    <p className="max-w-48 truncate text-xs font-medium text-erp-text">{receipt.supplierName || receipt.supplierId?.supplierName || '—'}</p>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <Warehouse size={13} className="shrink-0 text-slate-400" />
                      <span className="max-w-40 truncate">{receipt.warehouseId?.name || '—'}</span>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 whitespace-nowrap text-xs text-slate-600">
                      <CalendarDays size={13} className="shrink-0 text-slate-400" />
                      {formatDate(receipt.receiptDate)}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <p className="text-xs font-semibold text-erp-text">{formatNumber(receipt.items?.length)}</p>

                    <p className="mt-0.5 text-[10px] text-erp-muted">{formatNumber(receipt.items?.reduce((total, item) => total + (Number(item.acceptedQuantity) || 0), 0))} accepted</p>
                  </td>

                  <td className="px-4 py-3">
                    <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-1 text-[10px] font-semibold ${getReceiptStatusColor(receipt.status)}`}>{receipt.status || 'Draft'}</span>
                  </td>

                  <td className="px-4 py-3">{renderReceiptActions(receipt)}</td>
                </tr>
              ))}

              {filteredReceipts.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center">
                    <ClipboardCheck size={26} className="mx-auto text-slate-400" />

                    <h3 className="mt-3 text-sm font-bold text-erp-text">No goods receipts found</h3>

                    <p className="mt-1 text-xs text-erp-muted">{hasActiveFilters ? 'Try changing your search or status filter.' : 'No goods receipts have been created yet.'}</p>

                    {!hasActiveFilters && canCreate && (
                      <Link to="/company/goods-receipts/new" className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-erp-primary px-3.5 text-xs font-semibold text-white hover:bg-erp-primary-hover">
                        <Plus size={14} />
                        Create First Goods Receipt
                      </Link>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE RECEIPTS */}

        <div className="divide-y divide-slate-100 md:hidden">
          {filteredReceipts.map((receipt) => {
            const receiptId = String(receipt._id)
            const isProcessing = processingId === receiptId

            return (
              <article key={receipt._id} className="space-y-3 p-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">
                    <ClipboardCheck size={19} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="break-words text-sm font-semibold text-erp-text">{receipt.receiptNumber || 'Goods Receipt'}</h3>

                    <p className="mt-1 break-words text-xs text-erp-muted">{receipt.purchaseNumber || receipt.purchaseId?.purchaseNumber || 'No purchase number'}</p>

                    <p className="mt-1 break-words text-xs text-slate-600">{receipt.supplierName || receipt.supplierId?.supplierName || 'Unknown supplier'}</p>
                  </div>

                  <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold ${getReceiptStatusColor(receipt.status)}`}>{receipt.status || 'Draft'}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3">
                  <div>
                    <p className="text-[10px] text-slate-500">Receipt Date</p>
                    <p className="mt-1 text-xs font-medium text-slate-700">{formatDate(receipt.receiptDate)}</p>
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-500">Items</p>
                    <p className="mt-1 text-xs font-medium text-slate-700">{formatNumber(receipt.items?.length)} items</p>
                  </div>

                  <div className="col-span-2">
                    <p className="text-[10px] text-slate-500">Warehouse</p>

                    <p className="mt-1 flex items-center gap-1.5 break-words text-xs font-medium text-slate-700">
                      <Warehouse size={13} className="shrink-0 text-slate-400" />
                      {receipt.warehouseId?.name || '—'}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-500">Accepted Quantity</p>
                    <p className="mt-1 text-xs font-semibold text-erp-text">{formatNumber(receipt.items?.reduce((total, item) => total + (Number(item.acceptedQuantity) || 0), 0))}</p>
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-500">Damaged Quantity</p>
                    <p className="mt-1 text-xs font-semibold text-rose-700">{formatNumber(receipt.items?.reduce((total, item) => total + (Number(item.damagedQuantity) || 0), 0))}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
                  {canView && (
                    <Link to={`/company/goods-receipts/${receiptId}`} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-erp-border text-xs font-semibold text-slate-700 hover:bg-erp-hover">
                      <Eye size={14} />
                      View
                    </Link>
                  )}

                  {canUpdate && receipt.status === 'Draft' && (
                    <Link to={`/company/goods-receipts/${receiptId}/edit`} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-erp-border text-xs font-semibold text-slate-700 hover:bg-erp-hover">
                      <Pencil size={14} />
                      Edit
                    </Link>
                  )}

                  {canConfirm && receipt.status === 'Draft' && (
                    <button
                      type="button"
                      onClick={() => openActionConfirmation(receipt)}
                      disabled={Boolean(processingId) || cancelProcessing}
                      className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                    >
                      {isProcessing ? <LoaderCircle size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                      Confirm
                    </button>
                  )}

                  {canCancel && receipt.status === 'Draft' && (
                    <button
                      type="button"
                      onClick={() => openCancelConfirmation(receipt)}
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

          {filteredReceipts.length === 0 && (
            <div className="px-4 py-12 text-center">
              <ClipboardCheck size={26} className="mx-auto text-slate-400" />

              <h3 className="mt-3 font-semibold text-erp-text">No goods receipts found</h3>

              <p className="mt-1 text-xs text-erp-muted">{hasActiveFilters ? 'Try changing your search or status filter.' : 'No goods receipts have been created yet.'}</p>

              {!hasActiveFilters && canCreate && (
                <Link to="/company/goods-receipts/new" className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-erp-primary px-3.5 text-xs font-semibold text-white hover:bg-erp-primary-hover">
                  <Plus size={14} />
                  Create First Goods Receipt
                </Link>
              )}
            </div>
          )}
        </div>

        {/* PAGINATION */}

        <div className="flex flex-col gap-3 border-t border-erp-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs text-erp-text-secondary sm:text-sm">
              Showing{' '}
              <span className="font-semibold text-erp-text">
                {filteredReceipts.length === 0 ? 0 : startIndex + 1}–{Math.min(startIndex + filteredReceipts.length, pagination.total)}
              </span>{' '}
              of <span className="font-semibold text-erp-text">{formatNumber(pagination.total)}</span> receipts
            </p>

            <div className="flex items-center gap-2">
              <label htmlFor="goods-receipt-page-size" className="whitespace-nowrap text-xs text-erp-text-secondary">
                Rows:
              </label>

              <select
                id="goods-receipt-page-size"
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value))
                  setCurrentPage(1)
                }}
                disabled={loading}
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
              disabled={safePage <= 1 || loading}
              onClick={() => setCurrentPage(1)}
              className="flex h-8 items-center justify-center rounded-lg border border-erp-border px-2 text-xs text-erp-text-secondary transition hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              First
            </button>

            <button
              type="button"
              disabled={safePage <= 1 || loading}
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
              disabled={safePage >= totalPages || loading}
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              aria-label="Next page"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-erp-border text-erp-text-secondary transition hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>

            <button
              type="button"
              disabled={safePage >= totalPages || loading}
              onClick={() => setCurrentPage(totalPages)}
              className="flex h-8 items-center justify-center rounded-lg border border-erp-border px-2 text-xs text-erp-text-secondary transition hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              Last
            </button>
          </div>
        </div>
      </section>

      {/* CONFIRMATION BOX */}

      {actionTarget && (
        <TrashBox
          isOpen={Boolean(actionTarget)}
          onClose={closeActionConfirmation}
          onAction={confirmGoodsReceipt}
          isProcessing={processingId === String(actionTarget._id)}
          variant="activate"
          title="Confirm Goods Receipt?"
          message={`Confirm ${actionTarget.receiptNumber || 'this goods receipt'}? Accepted quantities will be added to inventory. This action cannot be reversed.`}
          actionButtonText="Confirm Receipt"
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
          <div role="dialog" aria-modal="true" aria-labelledby="cancel-receipt-title" className="w-full max-w-md overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-2xl">
            <div className="flex items-start justify-between border-b border-erp-border px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                  <Ban size={19} />
                </div>

                <div>
                  <h2 id="cancel-receipt-title" className="text-sm font-bold text-erp-text">
                    Cancel Goods Receipt?
                  </h2>

                  <p className="mt-1 text-xs text-erp-muted">{cancelTarget.receiptNumber || 'Goods Receipt'}</p>
                </div>
              </div>

              <button type="button" onClick={closeCancelConfirmation} disabled={cancelProcessing} aria-label="Close cancellation dialog" className="rounded-lg p-1.5 text-erp-muted hover:bg-erp-hover hover:text-erp-text disabled:opacity-50">
                <X size={17} />
              </button>
            </div>

            <div className="space-y-3 px-5 py-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                <p className="text-xs leading-5 text-amber-800">This will mark the goods receipt as Cancelled. Inventory will not be updated because this receipt is still in Draft status.</p>
              </div>

              <div>
                <label htmlFor="goods-receipt-cancel-reason" className="mb-1.5 block text-xs font-semibold text-erp-text">
                  Cancellation Reason <span className="text-rose-600">*</span>
                </label>

                <textarea
                  id="goods-receipt-cancel-reason"
                  rows={3}
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                  placeholder="Enter reason for cancelling this goods receipt..."
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
                disabled={cancelProcessing}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-erp-border px-3.5 text-xs font-semibold text-erp-text-secondary hover:bg-erp-hover disabled:opacity-50"
              >
                Keep Draft
              </button>

              <button
                type="button"
                onClick={cancelGoodsReceipt}
                disabled={cancelProcessing || cancelReason.trim().length < 3}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-3.5 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cancelProcessing ? <LoaderCircle size={14} className="animate-spin" /> : <Ban size={14} />}

                {cancelProcessing ? 'Cancelling...' : 'Cancel Receipt'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
