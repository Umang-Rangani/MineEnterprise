import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Plus, Search, RefreshCw, Eye, Pencil, ShoppingCart, ClipboardList, ChevronLeft, ChevronRight, CircleAlert, Truck, CheckCircle2, Ban } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import Loading from '../Loading/Loading'
import TrashBox from '../../TrashBox/TrashBox'
import { hasPermission, useAuth } from '../../context/AuthContext'

export default function CompanySales() {
  const navigate = useNavigate()
  const location = useLocation()

  const { permissions } = useAuth()

  const canCreate = hasPermission(permissions, 'sales:create')
  const canView = hasPermission(permissions, 'sales:view')
  const canUpdate = hasPermission(permissions, 'sales:update')
  const canApprove = hasPermission(permissions, 'sales:approve')
  const canDispatch = hasPermission(permissions, 'sales:dispatch')
  const canCancel = hasPermission(permissions, 'sales:cancel')

  const [orders, setOrders] = useState([])

  const [loading, setLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All')
  const [page, setPage] = useState(1)

  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 1,
    page: 1,
    limit: 10,
  })

  const [refreshKey, setRefreshKey] = useState(0)
  const [toast, setToast] = useState(null)

  const [cancellationReason, setCancellationReason] = useState('')

  const [confirmation, setConfirmation] = useState({
    isOpen: false,
    type: null,
    order: null,
  })

  const [actionLoading, setActionLoading] = useState(false)

  const showToast = (type, message, duration = 3000) => {
    setToast({
      id: Date.now(),
      type,
      message,
      duration,
    })
  }

  const closeToast = () => setToast(null)

  const closeConfirmation = () => {
    if (actionLoading) return

    setConfirmation({
      isOpen: false,
      type: null,
      order: null,
    })
  }

  useEffect(() => {
    document.title = 'Sales Orders | MineERP'
  }, [])

  useEffect(() => {
    if (location.state?.message) {
      showToast('success', location.state.message)

      navigate(location.pathname, {
        replace: true,
        state: {},
      })
    }
  }, [location.state, location.pathname, navigate])

  useEffect(() => {
    let cancelled = false

    const fetchSalesOrders = async () => {
      if (hasLoaded) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      try {
        const response = await axiosInstance.get('/erp/sales', {
          params: {
            search: search.trim(),
            status: status === 'All' ? undefined : status,
            page,
            limit: 10,
          },
        })

        if (cancelled) return

        const data = response.data

        setOrders(Array.isArray(data.data) ? data.data : [])

        setPagination({
          total: data.pagination?.total ?? 0,
          totalPages: data.pagination?.totalPages ?? 1,
          page: data.pagination?.page ?? page,
          limit: data.pagination?.limit ?? 10,
        })

        setHasLoaded(true)
      } catch (error) {
        if (!cancelled) {
          showToast('error', error.response?.data?.message || 'Unable to load sales orders.', 5000)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    }

    fetchSalesOrders()

    return () => {
      cancelled = true
    }
  }, [search, status, page, refreshKey])

  const handleRefresh = () => {
    setPage(1)
    setRefreshKey((previous) => previous + 1)
  }

  const openConfirmation = (type, order) => {
    setCancellationReason('')

    setConfirmation({
      isOpen: true,
      type,
      order,
    })
  }

  const closeConfirmationAfterAction = () => {
    setConfirmation({
      isOpen: false,
      type: null,
      order: null,
    })
  }

  const handleConfirmationAction = async () => {
    const selectedOrder = confirmation.order
    const actionType = confirmation.type

    if (!selectedOrder?._id || !actionType || actionLoading) return

    if (actionType === 'cancel' && !cancellationReason.trim()) {
      showToast('error', 'Cancellation reason is required.')
      return
    }

    setActionLoading(true)

    try {
      if (actionType === 'approve') {
        await axiosInstance.patch(`/erp/sales/${selectedOrder._id}/approve`)

        showToast('success', 'Sales order approved successfully.')
      }

      if (actionType === 'cancel') {
        await axiosInstance.patch(`/erp/sales/${selectedOrder._id}/cancel`, {
          reason: cancellationReason.trim(),
        })

        showToast('success', 'Sales order cancelled successfully.')
      }

      closeConfirmationAfterAction()
      setCancellationReason('')
      setRefreshKey((previous) => previous + 1)
    } catch (error) {
      showToast('error', error.response?.data?.message || `Unable to ${actionType} sales order.`, 5000)
    } finally {
      setActionLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(Number(amount) || 0)
  }

  const formatDate = (date) => {
    if (!date) return '—'

    const parsedDate = new Date(date)

    if (Number.isNaN(parsedDate.getTime())) return '—'

    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(parsedDate)
  }

  const formatNumber = (value) => {
    return new Intl.NumberFormat('en-IN').format(Number(value) || 0)
  }

  const getStatusStyle = (orderStatus) => {
    const styles = {
      Draft: 'border-slate-200 bg-slate-100 text-slate-600',
      Approved: 'border-blue-200 bg-blue-50 text-blue-700',
      'Partially Dispatched': 'border-amber-200 bg-amber-50 text-amber-700',
      Dispatched: 'border-erp-success-border bg-erp-success-light text-erp-success',
      Cancelled: 'border-erp-disabled-border bg-erp-disabled-light text-erp-disabled-text',
    }

    return styles[orderStatus] || 'border-slate-200 bg-slate-100 text-slate-600'
  }

  const statCards = [
    {
      title: 'Total Orders',
      value: pagination.total,
      icon: ShoppingCart,
      color: 'text-erp-primary',
      border: 'border-erp-primary/20',
    },
    {
      title: 'Showing Records',
      value: orders.length,
      icon: ClipboardList,
      color: 'text-blue-600',
      border: 'border-blue-200',
    },
  ]

  const startRecord = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1

  const endRecord = Math.min(pagination.page * pagination.limit, pagination.total)

  const breadcrumbItems = [
    {
      title: 'Sales Orders',
      link: null,
    },
  ]

  const confirmationConfig = {
    approve: {
      title: 'Approve Sales Order',
      message: `Are you sure you want to approve ${confirmation.order?.orderNumber || 'this sales order'}? Stock will be reserved from the selected warehouse.`,
      actionButtonText: 'Approve Order',
      variant: 'activate',
      warningText: 'Stock will be reserved after approval.',
    },
    cancel: {
      title: 'Cancel Sales Order',
      message: `Are you sure you want to cancel ${confirmation.order?.orderNumber || 'this sales order'}? Any remaining reserved stock will be released.`,
      actionButtonText: 'Cancel Order',
      variant: 'deactivate',
      warningText: 'You will need to provide a cancellation reason.',
    },
  }

  const activeConfirmation = confirmationConfig[confirmation.type]

  if (loading && !hasLoaded) {
    return (
      <div className="min-w-0 space-y-4 text-sm">
        <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="h-1 bg-erp-primary" />

          <div className="flex min-h-16 items-center px-4 sm:px-5">
            <BreadCrumb items={breadcrumbItems} />
          </div>
        </section>

        <section className="relative min-h-[400px] overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex min-h-[400px] items-center justify-center">
            <Loading fullScreen={false} label="Loading sales orders" description="Fetching sales order information..." className="!h-full min-h-[400px]" />
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-4 text-sm">
      {toast && <Toast toast={toast} onClose={closeToast} />}

      <TrashBox
        isOpen={confirmation.isOpen}
        onClose={closeConfirmation}
        title={activeConfirmation?.title}
        message={activeConfirmation?.message}
        actionButtonText={activeConfirmation?.actionButtonText}
        cancelButtonText="Go Back"
        onAction={handleConfirmationAction}
        isProcessing={actionLoading}
        variant={activeConfirmation?.variant}
        warningText={activeConfirmation?.warningText}
        showReasonInput={confirmation.type === 'cancel'}
        reason={cancellationReason}
        onReasonChange={setCancellationReason}
        reasonPlaceholder="Enter cancellation reason..."
      />

      {/* Header */}
      <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        <div className="h-1 bg-erp-primary" />

        <div className="flex flex-col justify-between gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-5">
          <div className="min-w-0">
            <BreadCrumb items={breadcrumbItems} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
              disabled={refreshing || loading || actionLoading}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-erp-border px-3 text-xs font-semibold text-erp-text-secondary transition hover:bg-erp-hover disabled:opacity-60"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>

            {canCreate && (
              <button
                type="button"
                onClick={() => navigate('/company/sales/new')}
                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-erp-primary px-3.5 text-xs font-semibold text-white transition hover:bg-erp-primary-hover focus:outline-none focus:ring-2 focus:ring-erp-primary/30 focus:ring-offset-1"
              >
                <Plus size={15} />
                Create Sales Order
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Sales Orders Table */}
      <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        {/* Filters */}
        <div className="flex flex-col gap-3 border-b border-erp-border px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <div className="relative min-w-0 flex-1 sm:max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Search order number or notes..."
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10"
            />
          </div>

          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              setPage(1)
            }}
            className="h-10 min-w-40 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10"
          >
            <option value="All">All Status</option>
            <option value="Draft">Draft</option>
            <option value="Approved">Approved</option>
            <option value="Partially Dispatched">Partially Dispatched</option>
            <option value="Dispatched">Dispatched</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-left">
            <thead>
              <tr className="border-b border-erp-border bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Order Number</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Warehouse</th>
                <th className="px-4 py-3 text-center">Order Date</th>
                <th className="px-4 py-3 text-center">Delivery Date</th>
                <th className="px-4 py-3 text-right">Total Amount</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                      <CircleAlert size={20} />
                    </div>

                    <p className="mt-3 text-xs font-bold text-slate-700">No sales orders found</p>

                    <p className="mt-1 text-[11px] text-slate-500">Try changing your search or status filter.</p>

                    {canCreate && (
                      <button type="button" onClick={() => navigate('/company/sales/new')} className="mt-3 text-xs font-bold text-erp-primary hover:underline">
                        Create your first sales order
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const canEditOrder = canUpdate && ['Draft', 'Partially Dispatched', 'Cancelled'].includes(order.status)

                  const canApproveOrder = canApprove && order.status === 'Draft'

                  const canDispatchOrder = canDispatch && ['Approved', 'Partially Dispatched'].includes(order.status)

                  const canCancelOrder = canCancel && ['Draft', 'Approved', 'Partially Dispatched'].includes(order.status)

                  return (
                    <tr key={order._id} className="transition hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
                            <ShoppingCart size={16} />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-slate-800">{order.orderNumber || '—'}</p>

                            <p className="mt-0.5 text-[10px] font-medium text-slate-500">{order.items?.length || 0} products</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <p className="text-xs font-semibold text-slate-700">{order.customerId?.customerName || '—'}</p>

                        <p className="mt-0.5 text-[10px] text-slate-500">{order.customerId?.customerCode || ''}</p>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <Truck size={12} className="shrink-0 text-slate-400" />
                          {order.warehouseId?.name || '—'}
                        </div>

                        {order.warehouseId?.code && <p className="mt-0.5 pl-5 text-[10px] text-slate-500">{order.warehouseId.code}</p>}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span className="text-xs font-medium text-slate-600">{formatDate(order.orderDate)}</span>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span className="text-xs text-slate-600">{formatDate(order.expectedDeliveryDate)}</span>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <span className="text-xs font-bold tabular-nums text-slate-700">{formatCurrency(order.grandTotal)}</span>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-bold ${getStatusStyle(order.status)}`}>{order.status || 'Unknown'}</span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          {canView && (
                            <button
                              type="button"
                              onClick={() => navigate(`/company/sales/${order._id}`)}
                              title="View sales order"
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-erp-primary/30 hover:bg-erp-primary/5 hover:text-erp-primary"
                            >
                              <Eye size={14} />
                            </button>
                          )}

                          {canEditOrder && (
                            <button
                              type="button"
                              onClick={() => navigate(`/company/sales/${order._id}/edit`)}
                              title={order.status === 'Partially Dispatched' ? 'Amend sales order' : 'Edit sales order'}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                            >
                              <Pencil size={14} />
                            </button>
                          )}

                          {canDispatchOrder && (
                            <button
                              type="button"
                              onClick={() => navigate(`/company/sales/${order._id}/dispatch`)}
                              title="Dispatch order"
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                            >
                              <Truck size={14} />
                            </button>
                          )}

                          {canApproveOrder && (
                            <button
                              type="button"
                              onClick={() => openConfirmation('approve', order)}
                              disabled={actionLoading}
                              title="Approve sales order"
                              className="flex h-8 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                            >
                              <CheckCircle2 size={13} />
                              Approve
                            </button>
                          )}

                          {canCancelOrder && (
                            <button
                              type="button"
                              onClick={() => openConfirmation('cancel', order)}
                              disabled={actionLoading}
                              title="Cancel sales order"
                              className="flex h-8 items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 text-[11px] font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                            >
                              <Ban size={13} />
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-erp-border px-3 py-3 sm:px-4">
          <p className="text-[11px] text-slate-500">
            Showing{' '}
            <span className="font-bold text-slate-700">
              {startRecord}-{endRecord}
            </span>{' '}
            of <span className="font-bold text-slate-700">{pagination.total}</span> sales orders
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || refreshing}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={14} />
              Previous
            </button>

            <span className="min-w-14 text-center text-[11px] font-bold text-slate-700">
              {pagination.page} / {pagination.totalPages}
            </span>

            <button
              type="button"
              disabled={page >= pagination.totalPages || refreshing}
              onClick={() => setPage((current) => current + 1)}
              className="flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
