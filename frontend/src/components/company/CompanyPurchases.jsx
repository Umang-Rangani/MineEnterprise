import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus,
  Search,
  Eye,
  Pencil,
  ShoppingCart,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  FilterX,
  AlertCircle,
  LoaderCircle,
  Download,
  CalendarDays,
  Trash2,
  Mail,
  RotateCcw,
  History,
  Ban,
  Landmark,
} from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import Loading from '../Loading/Loading'
import TrashBox from '../../TrashBox/TrashBox'
import { hasPermission, useAuth } from '../../context/AuthContext'

const statusStyles = {
  Draft: 'border-slate-200 bg-slate-50 text-slate-700',
  Ordered: 'border-blue-200 bg-blue-50 text-blue-700',
  'Partially Received': 'border-amber-200 bg-amber-50 text-amber-700',
  Received: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Cancelled: 'border-rose-200 bg-rose-50 text-rose-700',
}

const paymentStyles = {
  Unpaid: 'border-rose-200 bg-rose-50 text-rose-700',
  'Partially Paid': 'border-amber-200 bg-amber-50 text-amber-700',
  Paid: 'border-emerald-200 bg-emerald-50 text-emerald-700',
}

const emailStyles = {
  Sent: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Failed: 'border-rose-200 bg-rose-50 text-rose-700',
  Pending: 'border-amber-200 bg-amber-50 text-amber-700',
  'Not Sent': 'border-slate-200 bg-slate-50 text-slate-600',
  'Not Required': 'border-slate-200 bg-slate-50 text-slate-500',
}

const formatNumber = (value) =>
  new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
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

function getPurchaseArray(response) {
  const data = response?.data

  if (Array.isArray(data?.purchases)) return data.purchases
  if (Array.isArray(data?.data?.purchases)) return data.data.purchases
  if (Array.isArray(data?.data)) return data.data

  return []
}

function getPurchaseStatusColor(status) {
  return statusStyles[status] || statusStyles.Draft
}

function getEmailStatus(status) {
  return status || 'Not Sent'
}

function getEmailStatusColor(status) {
  return emailStyles[status] || emailStyles['Not Sent']
}

function wasPreviouslyApproved(purchase) {
  return purchase?.everApproved === true
}

function canEditPurchase(purchase) {
  return purchase?.status === 'Draft' && (!wasPreviouslyApproved(purchase) || purchase?.cancellationEmailStatus !== undefined)
}

function canDeletePurchase(purchase) {
  return purchase?.status === 'Draft' && !wasPreviouslyApproved(purchase)
}

function canRetryOrderEmail(purchase) {
  return purchase?.status === 'Ordered' && getEmailStatus(purchase?.orderEmailStatus) !== 'Sent'
}

function canRetryCancellationEmail(purchase) {
  const status = getEmailStatus(purchase?.cancellationEmailStatus)

  return purchase?.status === 'Draft' && wasPreviouslyApproved(purchase) && !['Not Required', 'Sent'].includes(status)
}

export default function CompanyPurchases() {
  const { permissions } = useAuth()

  const canCreate = hasPermission(permissions, 'purchase:create')
  const canView = hasPermission(permissions, 'purchase:view')
  const canViewHistory = hasPermission(permissions, 'purchase:history')
  const canUpdate = hasPermission(permissions, 'purchase:update')
  const canApprove = hasPermission(permissions, 'purchase:approve')
  const canCancel = hasPermission(permissions, 'purchase:cancel')
  const canDelete = hasPermission(permissions, 'purchase:delete')
  const canExport = hasPermission(permissions, 'purchase:export')

  const [purchases, setPurchases] = useState([])
  const [loading, setLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [apiError, setApiError] = useState('')

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
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
  const [processingId, setProcessingId] = useState('')
  const [isExporting, setIsExporting] = useState(false)

  const [actionTarget, setActionTarget] = useState(null)
  const [actionType, setActionType] = useState('')

  const breadcrumbItems = [{ title: 'Purchases', link: null }]

  const showToast = (type, message) => {
    setToast({
      id: Date.now(),
      type,
      message,
      duration: 3000,
    })
  }

  const closeActionConfirmation = () => {
    if (processingId) return

    setActionTarget(null)
    setActionType('')
  }

  useEffect(() => {
    document.title = 'Purchases | MineERP'
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, 350)

    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    let cancelled = false

    async function fetchPurchases() {
      if (!hasLoaded) {
        setLoading(true)
      }

      setApiError('')

      try {
        const response = await axiosInstance.get('/erp/purchases', {
          params: {
            page: currentPage,
            limit: pageSize,
            search: debouncedSearch || undefined,
            status: statusFilter === 'All' ? undefined : statusFilter,
          },
        })

        const data = response.data

        if (data?.success === false) {
          throw new Error(data.message || 'Unable to load purchases.')
        }

        if (cancelled) return

        const list = getPurchaseArray(response)

        setPurchases(list)

        const serverPagination = data?.pagination

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

        setApiError(error.response?.data?.message || error.message || 'Unable to load purchases.')
      } finally {
        if (!cancelled) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    }

    fetchPurchases()

    return () => {
      cancelled = true
    }
  }, [currentPage, pageSize, debouncedSearch, statusFilter, refreshKey])

  useEffect(() => {
    if (currentPage > pagination.totalPages) {
      setCurrentPage(Math.max(1, pagination.totalPages))
    }
  }, [currentPage, pagination.totalPages])

  const totalPages = Math.max(1, pagination.totalPages)
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * pageSize

  const draftOnPage = purchases.filter((purchase) => purchase.status === 'Draft').length

  const orderedOnPage = purchases.filter((purchase) => purchase.status === 'Ordered').length

  const receivedOnPage = purchases.filter((purchase) => purchase.status === 'Received').length

  const hasActiveFilters = Boolean(search.trim()) || statusFilter !== 'All'

  const resetFilters = () => {
    setSearch('')
    setDebouncedSearch('')
    setStatusFilter('All')
    setCurrentPage(1)
  }

  const handleRefresh = () => {
    if (refreshing || loading) return

    setRefreshing(true)
    setRefreshKey((previous) => previous + 1)
  }

  const handleExport = async () => {
    if (!canExport || isExporting) return

    setIsExporting(true)

    try {
      const response = await axiosInstance.get('/erp/purchases/export', {
        params: {
          search: debouncedSearch || undefined,
          status: statusFilter === 'All' ? undefined : statusFilter,
        },
        responseType: 'blob',
      })

      const blob = new Blob([response.data], {
        type: 'text/csv;charset=utf-8;',
      })

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = url
      link.download = `purchases-${new Date().toISOString().slice(0, 10)}.csv`

      document.body.appendChild(link)
      link.click()
      link.remove()

      window.setTimeout(() => URL.revokeObjectURL(url), 1000)

      showToast('success', 'Purchases exported successfully.')
    } catch (error) {
      let message = 'Unable to export purchases.'

      if (error.response?.data instanceof Blob) {
        try {
          const errorData = JSON.parse(await error.response.data.text())
          message = errorData.message || message
        } catch {
          // Use fallback message.
        }
      } else {
        message = error.response?.data?.message || error.message || message
      }

      showToast('error', message)
    } finally {
      setIsExporting(false)
    }
  }

  const openActionConfirmation = (purchase, type) => {
    if (processingId) return

    if (type === 'approve' && (!canApprove || purchase.status !== 'Draft')) {
      return
    }

    if (type === 'cancel' && (!canCancel || purchase.status !== 'Ordered')) {
      return
    }

    if (type === 'delete' && (!canDelete || !canDeletePurchase(purchase))) {
      return
    }

    if (type === 'retry-order-email' && (!canApprove || !canRetryOrderEmail(purchase))) {
      return
    }

    if (type === 'retry-cancellation-email' && (!canCancel || !canRetryCancellationEmail(purchase))) {
      return
    }

    setActionTarget(purchase)
    setActionType(type)
  }

  const confirmPurchaseAction = async () => {
    if (!actionTarget || !actionType || processingId) return

    const purchase = actionTarget
    const purchaseId = String(purchase._id)

    setProcessingId(purchaseId)

    try {
      let response

      if (actionType === 'delete') {
        response = await axiosInstance.delete(`/erp/purchases/${encodeURIComponent(purchaseId)}`)
      } else {
        const actionRoutes = {
          approve: 'approve',
          cancel: 'cancel',
          'retry-order-email': 'retry-order-email',
          'retry-cancellation-email': 'retry-cancellation-email',
        }

        const action = actionRoutes[actionType]

        response = await axiosInstance.patch(`/erp/purchases/${encodeURIComponent(purchaseId)}/${action}`)
      }

      const data = response.data

      if (data?.success === false) {
        throw new Error(data.message || 'Unable to update purchase.')
      }

      const emailStatus = String(data?.email?.status || '').toLowerCase()

      if (emailStatus === 'failed' || emailStatus === 'skipped') {
        showToast('error', data.message || 'The purchase action completed, but the email could not be delivered.')
      } else {
        const successMessages = {
          approve: 'Purchase approved successfully.',
          cancel: 'Purchase cancelled successfully.',
          delete: 'Draft purchase deleted successfully.',
          'retry-order-email': 'Order email retry completed.',
          'retry-cancellation-email': 'Cancellation email retry completed.',
        }

        showToast('success', data?.message || successMessages[actionType])
      }

      setActionTarget(null)
      setActionType('')
      setRefreshKey((previous) => previous + 1)
    } catch (error) {
      showToast('error', error.response?.data?.message || error.message || 'Unable to update purchase.')
    } finally {
      setProcessingId('')
    }
  }

  const getActionDialogProps = () => {
    if (!actionTarget) return {}

    if (actionType === 'approve') {
      const previouslyApproved = wasPreviouslyApproved(actionTarget)

      return {
        variant: 'activate',
        title: previouslyApproved ? 'Re-approve Purchase?' : 'Approve Purchase?',
        message: previouslyApproved
          ? `Re-approve ${actionTarget.purchaseNumber || 'this purchase'}? Its status will change from Draft to Ordered and the order email will be attempted again.`
          : `Approve ${actionTarget.purchaseNumber || 'this purchase'}? Its status will change from Draft to Ordered. The supplier purchase order email will be attempted. Inventory will not be updated by this action.`,
        actionButtonText: previouslyApproved ? 'Re-approve Purchase' : 'Approve Purchase',
        cancelButtonText: 'Keep Purchase',
      }
    }

    if (actionType === 'cancel') {
      return {
        variant: 'deactivate',
        title: 'Cancel Purchase?',
        message: `Cancel ${actionTarget.purchaseNumber || 'this purchase'}? Its status will return from Ordered to Draft and a cancellation email will be attempted. This purchase will not be marked as Cancelled by this action.`,
        actionButtonText: 'Cancel Purchase',
        cancelButtonText: 'Keep Purchase',
      }
    }

    if (actionType === 'retry-order-email') {
      return {
        variant: 'activate',
        title: 'Retry Order Email?',
        message: `Retry sending the purchase order email for ${actionTarget.purchaseNumber || 'this purchase'}? The purchase must remain Ordered.`,
        actionButtonText: 'Retry Email',
        cancelButtonText: 'Go Back',
      }
    }

    if (actionType === 'retry-cancellation-email') {
      return {
        variant: 'deactivate',
        title: 'Retry Cancellation Email?',
        message: `Retry sending the cancellation email for ${actionTarget.purchaseNumber || 'this purchase'}? The purchase will remain in Draft status.`,
        actionButtonText: 'Retry Email',
        cancelButtonText: 'Go Back',
      }
    }

    return {
      variant: 'delete',
      title: 'Delete Purchase?',
      message: `Permanently delete Draft purchase ${actionTarget.purchaseNumber || ''}? Only Draft purchases that have never been approved can be deleted.`,
      actionButtonText: 'Delete Purchase',
      cancelButtonText: 'Keep Purchase',
    }
  }

  const statCards = [
    {
      title: 'Total Purchases',
      value: pagination.total,
      icon: ShoppingCart,
      color: 'text-violet-700',
      border: 'border-violet-200',
    },
    {
      title: 'Draft on Page',
      value: draftOnPage,
      icon: Clock,
      color: 'text-slate-700',
      border: 'border-slate-200',
    },
    {
      title: 'Ordered on Page',
      value: orderedOnPage,
      icon: Truck,
      color: 'text-blue-700',
      border: 'border-blue-200',
    },
    {
      title: 'Received on Page',
      value: receivedOnPage,
      icon: CheckCircle2,
      color: 'text-emerald-700',
      border: 'border-emerald-200',
    },
  ]

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
            <Loading fullScreen={false} label="Loading purchases" description="Please wait while we load your company's purchase records." className="!h-full min-h-[480px]" />
          </div>
        </section>
      </div>
    )
  }

  const renderPurchaseActions = (purchase, isProcessing) => {
    const purchaseId = String(purchase._id)
    const editable = canEditPurchase(purchase)
    const deletable = canDeletePurchase(purchase)
    const previouslyApproved = wasPreviouslyApproved(purchase)

    return (
      <>
        {canView && (
          <Link to={`/company/purchases/${purchaseId}`} title="View purchase" aria-label={`View ${purchase.purchaseNumber}`} className="rounded-lg p-2 text-slate-500 hover:bg-erp-primary-light hover:text-erp-primary">
            <Eye size={15} />
          </Link>
        )}

        {canViewHistory && (
          <Link to={`/company/purchases/${purchaseId}/history`} title="View purchase history" aria-label={`View history for ${purchase.purchaseNumber}`} className="rounded-lg p-2 text-violet-600 hover:bg-violet-50">
            <Landmark size={15} />
          </Link>
        )}

        {canUpdate && editable && (
          <Link to={`/company/purchases/${purchaseId}/edit`} title="Edit draft purchase" aria-label={`Edit ${purchase.purchaseNumber}`} className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-600">
            <Pencil size={15} />
          </Link>
        )}

        {canApprove && purchase.status === 'Draft' && (
          <button
            type="button"
            title={previouslyApproved ? 'Re-approve purchase' : 'Approve purchase'}
            aria-label={`${previouslyApproved ? 'Re-approve' : 'Approve'} ${purchase.purchaseNumber}`}
            disabled={Boolean(processingId)}
            onClick={() => openActionConfirmation(purchase, 'approve')}
            className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
          >
            {isProcessing ? <LoaderCircle size={15} className="animate-spin" /> : previouslyApproved ? <RotateCcw size={15} /> : <CheckCircle2 size={15} />}
          </button>
        )}

        {canCancel && purchase.status === 'Ordered' && (
          <button
            type="button"
            title="Cancel ordered purchase"
            aria-label={`Cancel ${purchase.purchaseNumber}`}
            disabled={Boolean(processingId)}
            onClick={() => openActionConfirmation(purchase, 'cancel')}
            className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
          >
            <Ban size={15} />
          </button>
        )}

        {canApprove && canRetryOrderEmail(purchase) && (
          <button
            type="button"
            title={`Retry order email (${getEmailStatus(purchase.orderEmailStatus)})`}
            aria-label={`Retry order email for ${purchase.purchaseNumber}`}
            disabled={Boolean(processingId)}
            onClick={() => openActionConfirmation(purchase, 'retry-order-email')}
            className="rounded-lg p-2 text-amber-600 hover:bg-amber-50 disabled:opacity-50"
          >
            {isProcessing ? <LoaderCircle size={15} className="animate-spin" /> : <Mail size={15} />}
          </button>
        )}

        {canCancel && canRetryCancellationEmail(purchase) && (
          <button
            type="button"
            title={`Retry cancellation email (${getEmailStatus(purchase.cancellationEmailStatus)})`}
            aria-label={`Retry cancellation email for ${purchase.purchaseNumber}`}
            disabled={Boolean(processingId)}
            onClick={() => openActionConfirmation(purchase, 'retry-cancellation-email')}
            className="rounded-lg p-2 text-amber-600 hover:bg-amber-50 disabled:opacity-50"
          >
            {isProcessing ? <LoaderCircle size={15} className="animate-spin" /> : <Mail size={15} />}
          </button>
        )}

        {canDelete && deletable && (
          <button
            type="button"
            title="Delete draft purchase"
            aria-label={`Delete ${purchase.purchaseNumber}`}
            disabled={Boolean(processingId)}
            onClick={() => openActionConfirmation(purchase, 'delete')}
            className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {isProcessing ? <LoaderCircle size={15} className="animate-spin" /> : <Trash2 size={15} />}
          </button>
        )}
      </>
    )
  }

  return (
    <div className="min-w-0 space-y-4 pb-8 text-sm">
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

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
              disabled={refreshing || loading}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-erp-border px-3 text-xs font-semibold text-erp-text-secondary hover:bg-erp-hover disabled:opacity-60"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>

            {canExport && (
              <button
                type="button"
                onClick={handleExport}
                disabled={isExporting}
                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-erp-border bg-erp-surface px-3 text-xs font-semibold text-erp-text-secondary transition hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isExporting ? <LoaderCircle size={15} className="animate-spin" /> : <Download size={15} />}
                {isExporting ? 'Exporting...' : 'Export'}
              </button>
            )}

            {canCreate && (
              <Link
                to="/company/purchases/new"
                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-erp-primary px-3.5 text-xs font-semibold text-white transition hover:bg-erp-primary-hover focus:outline-none focus:ring-2 focus:ring-erp-primary/30 focus:ring-offset-1"
              >
                <Plus size={15} />
                Add Purchase
              </Link>
            )}
          </div>
        </div>
      </section>

      {apiError && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <p>{apiError}</p>

          <button type="button" onClick={handleRefresh} className="ml-auto shrink-0 font-semibold underline">
            Retry
          </button>
        </div>
      )}

      <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
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
                placeholder="Search purchase number or supplier..."
                aria-label="Search purchases"
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
              aria-label="Filter purchase status"
              className="h-9 min-w-36 rounded-lg border border-erp-border bg-erp-surface px-3 text-xs text-erp-text outline-none focus:border-erp-primary sm:text-sm"
            >
              <option value="All">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Ordered">Ordered</option>
              <option value="Partially Received">Partially Received</option>
              <option value="Received">Received</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {loading && hasLoaded && (
          <div className="flex items-center justify-center gap-2 border-b border-erp-border px-4 py-3 text-xs text-erp-muted">
            <LoaderCircle size={15} className="animate-spin text-erp-primary" />
            Updating purchase list...
          </div>
        )}

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[1100px] text-left">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-100">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Purchase</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Supplier</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Purchase Date</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Expected Delivery</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Amount</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Payment</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Order Email</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {purchases.map((purchase) => {
                const purchaseId = String(purchase._id)
                const isProcessing = processingId === purchaseId

                return (
                  <tr key={purchase._id} className="transition hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-erp-primary-light text-erp-primary">
                          <ShoppingCart size={17} />
                        </div>

                        <div className="min-w-0">
                          <p className="max-w-44 truncate text-xs font-semibold text-erp-text sm:text-sm">{purchase.purchaseNumber || '—'}</p>
                          <p className="mt-0.5 text-[10px] text-erp-muted">{formatNumber(purchase.items?.length)} items</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="max-w-48">
                        <p className="truncate text-xs font-medium text-erp-text">{purchase.supplierName || purchase.supplierId?.supplierName || '—'}</p>

                        {purchase.supplierId?.supplierCode && <p className="mt-0.5 text-[10px] text-erp-muted">{purchase.supplierId.supplierCode}</p>}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 whitespace-nowrap text-xs text-slate-600">
                        <CalendarDays size={13} className="shrink-0 text-slate-400" />
                        {formatDate(purchase.purchaseDate)}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="whitespace-nowrap text-xs text-slate-600">{formatDate(purchase.expectedDeliveryDate)}</span>
                    </td>

                    <td className="px-4 py-3">
                      <p className="whitespace-nowrap text-xs font-bold text-erp-text">{formatCurrency(purchase.totalAmount)}</p>
                      <p className="mt-0.5 text-[10px] text-erp-muted">Paid: {formatCurrency(purchase.paidAmount)}</p>
                    </td>

                    <td className="px-4 py-3">
                      <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-1 text-[10px] font-semibold ${paymentStyles[purchase.paymentStatus] || paymentStyles.Unpaid}`}>{purchase.paymentStatus || 'Unpaid'}</span>
                    </td>

                    <td className="px-4 py-3">
                      <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-1 text-[10px] font-semibold ${getPurchaseStatusColor(purchase.status)}`}>{purchase.status || 'Draft'}</span>

                      {wasPreviouslyApproved(purchase) && purchase.status === 'Draft' && <p className="mt-1 whitespace-nowrap text-[10px] text-amber-700">Previously approved</p>}
                    </td>

                    <td className="px-4 py-3">
                      <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-1 text-[10px] font-semibold ${getEmailStatusColor(getEmailStatus(purchase.orderEmailStatus))}`}>{getEmailStatus(purchase.orderEmailStatus)}</span>

                      {purchase.orderEmailError && (
                        <p className="mt-1 max-w-36 truncate text-[10px] text-rose-600" title={purchase.orderEmailError}>
                          {purchase.orderEmailError}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">{renderPurchaseActions(purchase, isProcessing)}</div>
                    </td>
                  </tr>
                )
              })}

              {purchases.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-14 text-center">
                    <ShoppingCart size={26} className="mx-auto text-slate-400" />
                    <h3 className="mt-3 text-sm font-bold text-erp-text">No purchases found</h3>
                    <p className="mt-1 text-xs text-erp-muted">{hasActiveFilters ? 'Try changing your search or status filter.' : 'No purchases have been created yet.'}</p>

                    {!hasActiveFilters && canCreate && (
                      <Link to="/company/purchases/new" className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-erp-primary px-3.5 text-xs font-semibold text-white hover:bg-erp-primary-hover">
                        <Plus size={14} />
                        Create First Purchase
                      </Link>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-slate-100 md:hidden">
          {purchases.map((purchase) => {
            const isProcessing = processingId === String(purchase._id)

            return (
              <article key={purchase._id} className="space-y-3 p-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">
                    <ShoppingCart size={19} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="break-words text-sm font-semibold text-erp-text">{purchase.purchaseNumber || 'Purchase'}</h3>
                    <p className="mt-1 break-words text-xs text-erp-muted">{purchase.supplierName || purchase.supplierId?.supplierName || 'Unknown supplier'}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatDate(purchase.purchaseDate)}</p>
                  </div>

                  <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold ${getPurchaseStatusColor(purchase.status)}`}>{purchase.status || 'Draft'}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3">
                  <div>
                    <p className="text-[10px] text-slate-500">Total Amount</p>
                    <p className="mt-1 text-sm font-bold text-erp-text">{formatCurrency(purchase.totalAmount)}</p>
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-500">Paid Amount</p>
                    <p className="mt-1 text-xs font-semibold text-slate-700">{formatCurrency(purchase.paidAmount)}</p>
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-500">Expected Delivery</p>
                    <p className="mt-1 text-xs font-medium text-slate-700">{formatDate(purchase.expectedDeliveryDate)}</p>
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-500">Payment Status</p>
                    <span className={`mt-1 inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${paymentStyles[purchase.paymentStatus] || paymentStyles.Unpaid}`}>{purchase.paymentStatus || 'Unpaid'}</span>
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-500">Order Email</p>
                    <span className={`mt-1 inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${getEmailStatusColor(getEmailStatus(purchase.orderEmailStatus))}`}>{getEmailStatus(purchase.orderEmailStatus)}</span>
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-500">Items</p>
                    <p className="mt-1 text-xs font-medium text-slate-700">{formatNumber(purchase.items?.length)} items</p>
                  </div>

                  {wasPreviouslyApproved(purchase) && purchase.status === 'Draft' && (
                    <div className="col-span-2 border-t border-slate-200 pt-2">
                      <p className="text-xs font-medium text-amber-700">Previously approved — editing and deleting are disabled.</p>
                    </div>
                  )}

                  {purchase.cancellationEmailStatus && (
                    <div className="col-span-2 border-t border-slate-200 pt-2">
                      <p className="text-[10px] text-slate-500">Cancellation Email</p>
                      <span className={`mt-1 inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${getEmailStatusColor(getEmailStatus(purchase.cancellationEmailStatus))}`}>{getEmailStatus(purchase.cancellationEmailStatus)}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
                  {canView && (
                    <Link to={`/company/purchases/${purchase._id}`} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-erp-border text-xs font-semibold text-slate-700 hover:bg-erp-hover">
                      <Eye size={14} />
                      View
                    </Link>
                  )}

                  {canViewHistory && (
                    <Link to={`/company/purchases/${purchase._id}/history`} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-violet-200 text-xs font-semibold text-violet-700 hover:bg-violet-50">
                      <History size={14} />
                      History
                    </Link>
                  )}

                  {canUpdate && canEditPurchase(purchase) && (
                    <Link to={`/company/purchases/${purchase._id}/edit`} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-erp-border text-xs font-semibold text-slate-700 hover:bg-erp-hover">
                      <Pencil size={14} />
                      Edit
                    </Link>
                  )}

                  {canApprove && purchase.status === 'Draft' && (
                    <button
                      type="button"
                      onClick={() => openActionConfirmation(purchase, 'approve')}
                      disabled={Boolean(processingId)}
                      className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                    >
                      {isProcessing ? <LoaderCircle size={14} className="animate-spin" /> : wasPreviouslyApproved(purchase) ? <RotateCcw size={14} /> : <CheckCircle2 size={14} />}
                      {wasPreviouslyApproved(purchase) ? 'Re-approve' : 'Approve'}
                    </button>
                  )}

                  {canCancel && purchase.status === 'Ordered' && (
                    <button
                      type="button"
                      onClick={() => openActionConfirmation(purchase, 'cancel')}
                      disabled={Boolean(processingId)}
                      className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-rose-200 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                    >
                      <Ban size={14} />
                      Cancel
                    </button>
                  )}

                  {canApprove && canRetryOrderEmail(purchase) && (
                    <button
                      type="button"
                      onClick={() => openActionConfirmation(purchase, 'retry-order-email')}
                      disabled={Boolean(processingId)}
                      className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-amber-200 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                    >
                      <Mail size={14} />
                      Retry Order Email
                    </button>
                  )}

                  {canCancel && canRetryCancellationEmail(purchase) && (
                    <button
                      type="button"
                      onClick={() => openActionConfirmation(purchase, 'retry-cancellation-email')}
                      disabled={Boolean(processingId)}
                      className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-amber-200 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                    >
                      <Mail size={14} />
                      Retry Cancellation Email
                    </button>
                  )}

                  {canDelete && canDeletePurchase(purchase) && (
                    <button
                      type="button"
                      onClick={() => openActionConfirmation(purchase, 'delete')}
                      disabled={Boolean(processingId)}
                      className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-200 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      {isProcessing ? <LoaderCircle size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      Delete
                    </button>
                  )}
                </div>
              </article>
            )
          })}

          {purchases.length === 0 && (
            <div className="px-4 py-12 text-center">
              <ShoppingCart size={26} className="mx-auto text-slate-400" />
              <h3 className="mt-3 font-semibold text-erp-text">No purchases found</h3>
              <p className="mt-1 text-xs text-erp-muted">{hasActiveFilters ? 'Try changing your search or status filter.' : 'No purchases have been created yet.'}</p>

              {!hasActiveFilters && canCreate && (
                <Link to="/company/purchases/new" className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-erp-primary px-3.5 text-xs font-semibold text-white hover:bg-erp-primary-hover">
                  <Plus size={14} />
                  Create First Purchase
                </Link>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-erp-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs text-erp-text-secondary sm:text-sm">
              Showing{' '}
              <span className="font-semibold text-erp-text">
                {pagination.total === 0 ? 0 : startIndex + 1}–{Math.min(startIndex + purchases.length, pagination.total)}
              </span>{' '}
              of <span className="font-semibold text-erp-text">{formatNumber(pagination.total)}</span> purchases
            </p>

            <div className="flex items-center gap-2">
              <label htmlFor="purchase-page-size" className="whitespace-nowrap text-xs text-erp-text-secondary">
                Rows:
              </label>

              <select
                id="purchase-page-size"
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

      {actionTarget && <TrashBox isOpen={Boolean(actionTarget)} onClose={closeActionConfirmation} onAction={confirmPurchaseAction} isProcessing={processingId === String(actionTarget._id)} {...getActionDialogProps()} />}
    </div>
  )
}
