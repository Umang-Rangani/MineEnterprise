import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, ShoppingCart, UserRound, CalendarDays, Warehouse, Package, FileText, Hash, LoaderCircle, RefreshCw, CheckCircle2, XCircle, Truck, Clock, History, AlertCircle, IndianRupee, ClipboardList, Ban } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import Loading from '../Loading/Loading'
import TrashBox from '../../TrashBox/TrashBox'
import { hasPermission, useAuth } from '../../context/AuthContext'

export default function SalesOrderDetails() {
  const navigate = useNavigate()
  const { id } = useParams()

  const { permissions } = useAuth()

  const canUpdate = hasPermission(permissions, 'sales:update')
  const canApprove = hasPermission(permissions, 'sales:approve')
  const canCancel = hasPermission(permissions, 'sales:cancel')
  const canDispatch = hasPermission(permissions, 'sales:dispatch')

  const [order, setOrder] = useState(null)
  const [dispatches, setDispatches] = useState([])

  const [loading, setLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState(null)

  const [confirmation, setConfirmation] = useState({
    isOpen: false,
    type: null,
  })

  const [cancellationReason, setCancellationReason] = useState('')

  const showToast = (type, message, duration = 3000) => {
    setToast({ id: Date.now(), type, message, duration })
  }

  const closeToast = () => setToast(null)

  useEffect(() => {
    document.title = 'Sales Order Details | MineERP'
  }, [])

  useEffect(() => {
    let cancelled = false

    const fetchOrder = async () => {
      if (hasLoaded) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      try {
        const response = await axiosInstance.get(`/erp/sales/${id}`)

        if (cancelled) return

        const data = response.data

        const orderData = data?.order || data?.salesOrder || data?.data?.order || data?.data?.salesOrder || data?.data || null

        if (!orderData) {
          setOrder(null)
          setDispatches([])
          setHasLoaded(true)
          return
        }

        setOrder(orderData)

        const dispatchData = data?.dispatches || data?.data?.dispatches || orderData?.dispatches || []

        setDispatches(Array.isArray(dispatchData) ? dispatchData : [])
        setHasLoaded(true)
      } catch (error) {
        if (!cancelled) {
          showToast('error', error.response?.data?.message || 'Unable to load sales order details.', 5000)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    }

    fetchOrder()

    return () => {
      cancelled = true
    }
  }, [id, refreshKey])

  const status = order?.status || 'Unknown'

  const isDraft = status === 'Draft'
  const isApproved = status === 'Approved'
  const isPartiallyDispatched = status === 'Partially Dispatched'
  const isDispatched = status === 'Dispatched'
  const isCancelled = status === 'Cancelled'

  // Customer Status Validation
  const customer = order?.customerId

  const customerStatus = customer && typeof customer === 'object' ? customer.status : null

  const isCustomerActive = customerStatus === 'Active'
  const isCustomerInactive = customerStatus === 'Inactive'

  // Edit: Draft, Partially Dispatched, Cancelled
  const canEditOrder = canUpdate && (isDraft || isPartiallyDispatched || isCancelled)

  // Approve: Draft only
  const canApproveOrder = canApprove && isDraft

  // Cancel: Draft, Approved, Partially Dispatched
  const canCancelOrder = canCancel && (isDraft || isApproved || isPartiallyDispatched)

  // Dispatch: Approved, Partially Dispatched
  const canCreateDispatch = canDispatch && (isApproved || isPartiallyDispatched)

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(Number(amount) || 0)

  const formatDate = (date) => {
    if (!date) return '—'

    const parsedDate = new Date(date)

    if (Number.isNaN(parsedDate.getTime())) return '—'

    return parsedDate.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const formatDateTime = (date) => {
    if (!date) return '—'

    const parsedDate = new Date(date)

    if (Number.isNaN(parsedDate.getTime())) return '—'

    return parsedDate.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusStyle = (value) => {
    const styles = {
      Draft: 'border-slate-200 bg-slate-100 text-slate-700',
      Approved: 'border-erp-success-border bg-erp-success-light text-erp-success',
      'Partially Dispatched': 'border-amber-200 bg-amber-50 text-amber-700',
      Dispatched: 'border-blue-200 bg-blue-50 text-blue-700',
      Cancelled: 'border-erp-disabled-border bg-erp-disabled-light text-erp-disabled-text',
      Confirmed: 'border-erp-success-border bg-erp-success-light text-erp-success',
    }

    return styles[value] || 'border-slate-200 bg-slate-100 text-slate-600'
  }

  const handleRefresh = () => {
    setRefreshKey((current) => current + 1)
  }

  // Open Approve Confirmation
  const openApproveConfirmation = () => {
    if (!isCustomerActive) {
      showToast('error', 'Cannot approve sales order. Customer must be Active.', 5000)
      return
    }

    setConfirmation({
      isOpen: true,
      type: 'approve',
    })
  }

  // Open Cancel Confirmation
  const openCancelConfirmation = () => {
    setCancellationReason('')

    setConfirmation({
      isOpen: true,
      type: 'cancel',
    })
  }

  const closeConfirmation = () => {
    if (actionLoading) return

    setConfirmation({
      isOpen: false,
      type: null,
    })

    setCancellationReason('')
  }

  // Approve / Cancel Action
  const handleConfirmationAction = async () => {
    if (actionLoading) return

    if (confirmation.type === 'approve') {
      if (!isCustomerActive) {
        showToast('error', 'Cannot approve sales order. Customer must be Active.', 5000)
        return
      }
    }

    if (confirmation.type === 'cancel' && !cancellationReason.trim()) {
      showToast('error', 'Cancellation reason is required.')
      return
    }

    setActionLoading(true)

    try {
      if (confirmation.type === 'approve') {
        await axiosInstance.patch(`/erp/sales/${id}/approve`)

        showToast('success', 'Sales order approved successfully.')
      } else if (confirmation.type === 'cancel') {
        await axiosInstance.patch(`/erp/sales/${id}/cancel`, {
          reason: cancellationReason.trim(),
        })

        showToast('success', 'Sales order cancelled successfully.')
      }

      setConfirmation({
        isOpen: false,
        type: null,
      })

      setCancellationReason('')

      setRefreshKey((current) => current + 1)
    } catch (error) {
      showToast('error', error.response?.data?.message || `Unable to ${confirmation.type} sales order.`, 5000)
    } finally {
      setActionLoading(false)
    }
  }

  const confirmationConfig =
    confirmation.type === 'approve'
      ? {
          title: 'Approve Sales Order',
          message: 'Are you sure you want to approve this sales order? Stock will be reserved from the selected warehouse.',
          actionButtonText: 'Approve Order',
          warningText: 'Stock will be reserved after approval.',
          variant: 'activate',
        }
      : {
          title: 'Cancel Sales Order',
          message: 'Are you sure you want to cancel this sales order? Remaining reserved stock will be released.',
          actionButtonText: 'Cancel Order',
          warningText: 'The cancellation reason will be saved in this sales order.',
          variant: 'deactivate',
        }

  const items = [
    { title: 'Sales', link: '/company/sales' },
    {
      title: order?.orderNumber || 'Sales Order Details',
      link: null,
    },
  ]

  const DetailItem = ({ label, value, icon: Icon }) => (
    <div className="min-w-0">
      <p className="text-[11px] font-medium text-slate-500">{label}</p>

      <div className="mt-1 flex min-w-0 items-center gap-2">
        {Icon && <Icon size={14} className="shrink-0 text-slate-400" />}

        <p className="break-words text-xs font-semibold text-slate-800">{value || '—'}</p>
      </div>
    </div>
  )

  const SectionHeader = ({ icon: Icon, title, description }) => (
    <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
        <Icon size={16} />
      </div>

      <div>
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>

        <p className="text-[11px] text-slate-500">{description}</p>
      </div>
    </div>
  )

  const orderItems = Array.isArray(order?.items) ? order.items : []

  const subtotal = Number(order?.subtotal) || 0
  const discount = Number(order?.discount) || 0
  const taxAmount = Number(order?.taxAmount) || 0
  const grandTotal = Number(order?.grandTotal) || 0

  if (loading && !hasLoaded) {
    return (
      <div className="min-w-0 space-y-4 text-sm">
        <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="h-1 bg-erp-primary" />

          <div className="flex min-h-16 items-center px-4 sm:px-5">
            <BreadCrumb items={items} />
          </div>
        </section>

        <section className="relative min-h-[400px] overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex min-h-[400px] items-center justify-center">
            <Loading fullScreen={false} label="Loading sales order" description="Fetching sales order information..." className="!h-full min-h-[400px]" />
          </div>
        </section>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-w-0 space-y-4 text-sm">
        {toast && <Toast toast={toast} onClose={closeToast} />}

        <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="h-1 bg-erp-primary" />

          <div className="flex min-h-16 items-center px-4 sm:px-5">
            <BreadCrumb items={items} />
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white px-4 py-12 text-center">
          <ShoppingCart size={28} className="mx-auto text-slate-300" />

          <h2 className="mt-3 text-sm font-bold text-slate-800">Sales Order not found</h2>

          <p className="mt-1 text-xs text-slate-500">Unable to find this sales order or you may not have access.</p>

          <div className="mt-4 flex justify-center gap-2">
            <button type="button" onClick={() => navigate('/company/sales')} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              <ArrowLeft size={14} />
              Back to Sales
            </button>

            <button type="button" onClick={handleRefresh} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-erp-primary px-3 text-xs font-semibold text-white hover:bg-erp-primary-hover">
              <RefreshCw size={14} />
              Retry
            </button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-4 text-sm">
      {toast && <Toast toast={toast} onClose={closeToast} />}

      {/* Confirmation Modal */}
      <TrashBox
        isOpen={confirmation.isOpen}
        onClose={closeConfirmation}
        title={confirmationConfig.title}
        message={confirmationConfig.message}
        actionButtonText={confirmationConfig.actionButtonText}
        cancelButtonText="Go Back"
        onAction={handleConfirmationAction}
        isProcessing={actionLoading}
        variant={confirmationConfig.variant}
        warningText={confirmationConfig.warningText}
        showReasonInput={confirmation.type === 'cancel'}
        reason={cancellationReason}
        onReasonChange={setCancellationReason}
        reasonPlaceholder="Enter cancellation reason..."
      />

      {/* Header */}
      <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        <div className="h-1 bg-erp-primary" />

        <div className="flex h-[calc(100%-4px)] min-w-0 items-center justify-between gap-3 px-4 sm:px-5">
          <div className="min-w-0 flex-1 overflow-hidden">
            <BreadCrumb items={items} />
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {/* Approve Button */}
            {canApproveOrder && (
              <button
                type="button"
                onClick={openApproveConfirmation}
                disabled={actionLoading || !isCustomerActive}
                title={!isCustomerActive ? 'Customer must be Active before approval.' : 'Approve Sales Order'}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-erp-success px-3 text-xs font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCircle2 size={14} />
                Approve Order
              </button>
            )}

            {/* Dispatch Button */}
            {canCreateDispatch && (
              <button
                type="button"
                onClick={() => navigate(`/company/sales/${id}/dispatch`)}
                disabled={actionLoading}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Truck size={14} />
                Create Dispatch
              </button>
            )}

            {/* Cancel Button */}
            {canCancelOrder && (
              <button
                type="button"
                onClick={openCancelConfirmation}
                disabled={actionLoading}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Ban size={14} />
                Cancel Order
              </button>
            )}

            {/* Refresh */}
            {refreshing && <LoaderCircle size={15} className="animate-spin text-erp-disabled" />}

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing || actionLoading}
              title="Refresh sales order"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={14} />
              Refresh
            </button>

            {/* Edit Button */}
            {canEditOrder && (
              <button
                type="button"
                onClick={() => navigate(`/company/sales/${id}/edit`)}
                disabled={actionLoading}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-erp-primary px-3 text-xs font-bold text-white transition hover:bg-erp-primary-hover disabled:opacity-50"
              >
                <Pencil size={14} />
                {isCancelled ? 'Edit Cancelled Order' : isPartiallyDispatched ? 'Amend Order' : 'Edit Order'}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Order Overview */}
      <section className="overflow-hidden rounded-xl border border-erp-border bg-white shadow-erp-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-erp-primary/10 text-erp-primary">
              <ShoppingCart size={23} />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-base font-bold text-slate-900">{order.orderNumber || 'Sales Order'}</h1>

              <p className="mt-1 text-xs text-slate-500">Sales Order Details</p>
            </div>
          </div>

          <span className={`rounded-full border px-3 py-1 text-[11px] font-bold ${getStatusStyle(status)}`}>{status}</span>
        </div>

        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <DetailItem label="Customer" value={order.customerId?.customerName || order.customerName} icon={UserRound} />

          <DetailItem label="Customer Code" value={order.customerId?.customerCode} icon={Hash} />

          <DetailItem label="Customer Status" value={customerStatus || 'Unknown'} icon={CheckCircle2} />

          <DetailItem label="Warehouse" value={order.warehouseId?.name || order.warehouseName} icon={Warehouse} />

          <DetailItem label="Order Date" value={formatDate(order.orderDate)} icon={CalendarDays} />

          <DetailItem label="Expected Delivery" value={formatDate(order.expectedDeliveryDate)} icon={Truck} />

          <DetailItem label="Created At" value={formatDateTime(order.createdAt)} icon={Clock} />

          <DetailItem label="Created By" value={order.createdBy?.name} icon={UserRound} />

          <DetailItem label="Last Updated" value={formatDateTime(order.updatedAt)} icon={RefreshCw} />
        </div>
      </section>

      {/* Inactive Customer Warning */}
      {isDraft && !isCustomerActive && (
        <section className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <AlertCircle size={19} className="mt-0.5 shrink-0 text-amber-600" />

          <div className="min-w-0">
            <p className="text-xs font-bold text-amber-800">Customer Inactive</p>

            <p className="mt-1 text-xs leading-5 text-amber-700">
              {isCustomerInactive
                ? `Customer "${customer?.customerName || 'Selected customer'}" is currently Inactive. Please activate this customer before approving the sales order.`
                : 'Customer status could not be verified. Please check the customer details before approving this sales order.'}
            </p>

            <p className="mt-1 text-[11px] font-semibold text-amber-800">Current Status: {customerStatus || 'Unknown'}</p>
          </div>
        </section>
      )}

      {/* Partially Dispatched Notice */}
      {isPartiallyDispatched && (
        <section className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <AlertCircle size={17} className="mt-0.5 shrink-0 text-amber-600" />

          <div>
            <p className="text-xs font-bold text-amber-800">Partially Dispatched</p>

            <p className="mt-1 text-xs leading-5 text-amber-700">This order has been partially dispatched. You can dispatch the remaining reserved quantities or amend eligible order items.</p>
          </div>
        </section>
      )}

      {/* Cancelled Notice */}
      {isCancelled && (
        <section className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
          <XCircle size={17} className="mt-0.5 shrink-0 text-red-600" />

          <div>
            <p className="text-xs font-bold text-red-800">Order Cancelled</p>

            <p className="mt-1 text-xs leading-5 text-red-700">This sales order has been cancelled. Any remaining reserved stock has been released.</p>
          </div>
        </section>
      )}

      {/* Fully Dispatched Notice */}
      {isDispatched && (
        <section className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3">
          <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-blue-600" />

          <div>
            <p className="text-xs font-bold text-blue-800">Fully Dispatched</p>

            <p className="mt-1 text-xs leading-5 text-blue-700">All order quantities have been dispatched successfully.</p>
          </div>
        </section>
      )}

      {/* Products */}
      <section className="overflow-hidden rounded-xl border border-erp-border bg-white">
        <SectionHeader icon={Package} title="Order Items" description={`${orderItems.length} product(s) in this sales order`} />

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-100">
                <th className="px-3 py-3 text-[11px] font-bold text-slate-500">Product</th>
                <th className="px-3 py-3 text-right text-[11px] font-bold text-slate-500">Quantity</th>
                <th className="px-3 py-3 text-right text-[11px] font-bold text-slate-500">Rate</th>
                <th className="px-3 py-3 text-right text-[11px] font-bold text-slate-500">Discount</th>
                <th className="px-3 py-3 text-right text-[11px] font-bold text-slate-500">Tax</th>
                <th className="px-3 py-3 text-right text-[11px] font-bold text-slate-500">Line Total</th>
                <th className="px-3 py-3 text-right text-[11px] font-bold text-slate-500">Dispatched</th>
                <th className="px-3 py-3 text-right text-[11px] font-bold text-slate-500">Reserved</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {orderItems.length > 0 ? (
                orderItems.map((item, index) => (
                  <tr key={item._id || index} className="hover:bg-slate-50/70">
                    <td className="px-3 py-3">
                      <p className="text-xs font-bold text-slate-800">{item.productName || item.productId?.name || '—'}</p>

                      <p className="mt-1 text-[10px] text-slate-500">SKU: {item.sku || item.productId?.sku || '—'}</p>
                    </td>

                    <td className="px-3 py-3 text-right text-xs font-semibold tabular-nums text-slate-700">
                      {Number(item.quantity) || 0} {item.unit || ''}
                    </td>

                    <td className="px-3 py-3 text-right text-xs tabular-nums text-slate-700">{formatCurrency(item.rate)}</td>

                    <td className="px-3 py-3 text-right text-xs tabular-nums text-slate-700">{formatCurrency(item.discount)}</td>

                    <td className="px-3 py-3 text-right text-xs tabular-nums text-slate-700">
                      <p>{Number(item.taxRate) || 0}%</p>
                      <p className="mt-1 text-[10px] text-slate-400">{formatCurrency(item.taxAmount)}</p>
                    </td>

                    <td className="px-3 py-3 text-right text-xs font-bold tabular-nums text-slate-900">{formatCurrency(item.lineTotal)}</td>

                    <td className="px-3 py-3 text-right text-xs font-semibold tabular-nums text-blue-700">{Number(item.dispatchedQuantity) || 0}</td>

                    <td className="px-3 py-3 text-right text-xs font-semibold tabular-nums text-erp-success">{Number(item.reservedQuantity) || 0}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center">
                    <Package size={24} className="mx-auto text-slate-300" />
                    <p className="mt-2 text-xs text-slate-500">No order items found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Amount Summary */}
      <section className="flex justify-end">
        <div className="w-full rounded-xl border border-erp-border bg-white p-4 shadow-erp-card sm:max-w-sm">
          <div className="mb-3 flex items-center gap-2">
            <IndianRupee size={16} className="text-erp-primary" />
            <h2 className="text-sm font-bold text-slate-900">Amount Summary</h2>
          </div>

          <div className="space-y-2.5">
            <div className="flex justify-between gap-3 text-xs">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-semibold tabular-nums text-slate-800">{formatCurrency(subtotal)}</span>
            </div>

            <div className="flex justify-between gap-3 text-xs">
              <span className="text-slate-500">Discount</span>
              <span className="font-semibold tabular-nums text-red-600">- {formatCurrency(discount)}</span>
            </div>

            <div className="flex justify-between gap-3 text-xs">
              <span className="text-slate-500">Tax Amount</span>
              <span className="font-semibold tabular-nums text-slate-800">{formatCurrency(taxAmount)}</span>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <div className="flex justify-between gap-3">
                <span className="text-xs font-bold text-slate-800">Grand Total</span>

                <span className="text-lg font-bold tabular-nums text-erp-primary">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Approval Information */}
      {(order.approvedBy || order.approvedAt || isApproved || isPartiallyDispatched || isDispatched) && (
        <section className="overflow-hidden rounded-xl border border-erp-border bg-white">
          <SectionHeader icon={CheckCircle2} title="Approval Information" description="Sales order approval details" />

          <div className="grid gap-4 p-3 sm:grid-cols-2 lg:grid-cols-3">
            <DetailItem label="Approved By" value={order.approvedBy?.name} icon={UserRound} />

            <DetailItem label="Approved At" value={formatDateTime(order.approvedAt)} icon={CalendarDays} />

            <DetailItem label="Approval Status" value={order.approvedAt ? 'Approved' : 'Not Approved'} icon={CheckCircle2} />
          </div>
        </section>
      )}

      {/* Amendment History */}
      <section className="overflow-hidden rounded-xl border border-erp-border bg-white">
        <SectionHeader icon={History} title="Amendment History" description="Changes made to this sales order" />

        <div className="divide-y divide-slate-100">
          {Array.isArray(order.amendments) && order.amendments.length > 0 ? (
            order.amendments.map((amendment, index) => (
              <div key={amendment._id || index} className="p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-bold text-slate-800">Amendment #{amendment.amendmentNumber || index + 1}</p>

                  <span className="text-[10px] text-slate-500">{formatDateTime(amendment.amendedAt)}</span>
                </div>

                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <DetailItem label="Amended By" value={amendment.amendedBy?.name} icon={UserRound} />

                  <DetailItem label="Reason" value={amendment.reason} icon={FileText} />
                </div>
              </div>
            ))
          ) : (
            <p className="px-3 py-8 text-center text-xs text-slate-500">No amendments have been made to this order.</p>
          )}
        </div>
      </section>

      {/* Dispatch History */}
      <section className="overflow-hidden rounded-xl border border-erp-border bg-white">
        <SectionHeader icon={Truck} title="Dispatch History" description="Goods dispatched against this sales order" />

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-100">
                <th className="px-3 py-3 text-[11px] font-bold text-slate-500">Dispatch No.</th>
                <th className="px-3 py-3 text-[11px] font-bold text-slate-500">Dispatch Date</th>
                <th className="px-3 py-3 text-[11px] font-bold text-slate-500">Transport</th>
                <th className="px-3 py-3 text-[11px] font-bold text-slate-500">Vehicle No.</th>
                <th className="px-3 py-3 text-[11px] font-bold text-slate-500">Status</th>
                <th className="px-3 py-3 text-[11px] font-bold text-slate-500">Dispatched By</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {dispatches.length > 0 ? (
                dispatches.map((dispatch, index) => (
                  <tr key={dispatch._id || index}>
                    <td className="px-3 py-3 text-xs font-bold text-slate-800">{dispatch.dispatchNumber || '—'}</td>

                    <td className="px-3 py-3 text-xs text-slate-600">{formatDate(dispatch.dispatchDate)}</td>

                    <td className="px-3 py-3 text-xs text-slate-600">{dispatch.transportName || '—'}</td>

                    <td className="px-3 py-3 text-xs text-slate-600">{dispatch.vehicleNumber || '—'}</td>

                    <td className="px-3 py-3">
                      <span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${getStatusStyle(dispatch.status)}`}>{dispatch.status || 'Unknown'}</span>
                    </td>

                    <td className="px-3 py-3 text-xs text-slate-600">{dispatch.dispatchedBy?.name || '—'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center">
                    <Truck size={24} className="mx-auto text-slate-300" />
                    <p className="mt-2 text-xs text-slate-500">No dispatch records found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Notes */}
      <section className="overflow-hidden rounded-xl border border-erp-border bg-white">
        <SectionHeader icon={FileText} title="Order Notes" description="Additional sales order information" />

        <div className="p-3">
          <p className="whitespace-pre-wrap text-xs leading-5 text-slate-600">{order.notes || 'No additional notes.'}</p>
        </div>
      </section>

      {/* Cancellation Information */}
      {isCancelled && (
        <section className="overflow-hidden rounded-xl border border-red-200 bg-red-50">
          <SectionHeader icon={XCircle} title="Cancellation Information" description="Sales order cancellation details" />

          <div className="grid gap-4 p-3 sm:grid-cols-2">
            <DetailItem label="Cancelled By" value={order.cancelledBy?.name} icon={UserRound} />

            <DetailItem label="Cancelled At" value={formatDateTime(order.cancelledAt)} icon={CalendarDays} />

            <div className="sm:col-span-2">
              <DetailItem label="Cancellation Reason" value={order.cancellationReason} icon={FileText} />
            </div>
          </div>
        </section>
      )}

      {/* Record Information */}
      <section className="overflow-hidden rounded-xl border border-erp-border bg-white">
        <SectionHeader icon={ClipboardList} title="Record Information" description="Sales order record details" />

        <div className="grid gap-4 p-3 sm:grid-cols-2 lg:grid-cols-3">
          <DetailItem label="Order Number" value={order.orderNumber} icon={Hash} />

          <DetailItem label="Created At" value={formatDateTime(order.createdAt)} icon={CalendarDays} />

          <DetailItem label="Last Updated" value={formatDateTime(order.updatedAt)} icon={RefreshCw} />
        </div>
      </section>

      {/* Footer */}
      <div className="flex justify-end">
        <button type="button" onClick={() => navigate('/company/sales')} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
          <ArrowLeft size={14} />
          Back to Sales
        </button>
      </div>
    </div>
  )
}
