import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ShoppingCart, Package, RefreshCw, Pencil, CheckCircle2, FileText, CalendarDays, Clock, AlertCircle, Ban, Phone, Mail, Building2, Hash, Truck, Wallet, Calculator, ArrowLeft } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import Loading from '../Loading/Loading'
import TrashBox from '../../TrashBox/TrashBox'
import { hasPermission, useAuth } from '../../context/AuthContext'

const buttonBase = 'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50'

function formatMoney(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)
}

function formatQuantity(value) {
  if (value === null || value === undefined || value === '') {
    return 'Not provided'
  }

  const quantity = Number(value)

  if (!Number.isFinite(quantity)) return 'Not provided'

  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 3,
  }).format(quantity)
}

function formatDate(date) {
  if (!date) return 'Not available'

  const parsedDate = new Date(date)

  if (Number.isNaN(parsedDate.getTime())) return 'Not available'

  return parsedDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(date) {
  if (!date) return 'Not available'

  const parsedDate = new Date(date)

  if (Number.isNaN(parsedDate.getTime())) return 'Not available'

  return parsedDate.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function StatusBadge({ status }) {
  const normalizedStatus = String(status || '').toLowerCase()

  let style = 'border border-erp-border bg-erp-surface-secondary text-erp-text-secondary'

  if (['received', 'paid', 'active'].includes(normalizedStatus)) {
    style = 'bg-emerald-50 text-emerald-700'
  } else if (['ordered', 'partial', 'partially received'].includes(normalizedStatus)) {
    style = 'bg-blue-50 text-blue-700'
  } else if (['draft', 'unpaid'].includes(normalizedStatus)) {
    style = 'bg-amber-50 text-amber-700'
  } else if (normalizedStatus === 'cancelled') {
    style = 'bg-red-50 text-red-600'
  }

  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${style}`}>{status || 'Not specified'}</span>
}

function getPurchaseFromResponse(response) {
  const body = response?.data

  const candidates = [body?.data?.purchase, body?.purchase, body?.data, body]

  return candidates.find((item) => item && typeof item === 'object' && !Array.isArray(item) && (item._id || item.id))
}

export default function PurchaseDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { permissions } = useAuth()

  const canView = hasPermission(permissions, 'purchase:view')
  const canUpdate = hasPermission(permissions, 'purchase:update')
  const canApprove = hasPermission(permissions, 'purchase:approve')
  const canCancel = hasPermission(permissions, 'purchase:cancel')

  const [purchase, setPurchase] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)

  const [actionTarget, setActionTarget] = useState(null)
  const [actionType, setActionType] = useState('')

  const isCancelled = String(purchase?.status || '').toLowerCase() === 'cancelled'

  const panelClass = 'border-erp-border bg-erp-surface'

  const canEdit = canUpdate && purchase?.status === 'Draft'

  const canApprovePurchase = canApprove && purchase?.status === 'Draft'

  const canCancelPurchase = canCancel && ['Draft', 'Ordered'].includes(purchase?.status)

  function showToast(type, message) {
    setToast({ type, message })
  }

  function closeToast() {
    setToast(null)
  }

  async function fetchPurchase(showRefreshMessage = false) {
    if (!id) {
      setPurchase(null)
      setError('Purchase ID is missing.')
      setLoading(false)
      setRefreshing(false)
      return
    }

    if (showRefreshMessage) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setError('')

    try {
      const response = await axiosInstance.get(`/erp/purchases/${encodeURIComponent(id)}`)

      const data = getPurchaseFromResponse(response)

      if (!data) {
        throw new Error('Purchase data was not found in the API response.')
      }

      setPurchase(data)

      if (showRefreshMessage) {
        showToast('success', 'Purchase details refreshed successfully.')
      }
    } catch (err) {
      setPurchase(null)
      setError(err.response?.data?.message || err.message || 'Unable to load purchase details.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    document.title = 'Purchase Details | MineERP'
    fetchPurchase()
  }, [id])

  function handleEdit() {
    if (!purchase || !canEdit) return

    navigate(`/company/purchases/${encodeURIComponent(purchase._id || purchase.id)}/edit`)
  }

  function openActionConfirmation(type) {
    if (!purchase || actionLoading || refreshing) return

    if (type === 'approve' && !canApprovePurchase) return
    if (type === 'cancel' && !canCancelPurchase) return

    setActionTarget(purchase)
    setActionType(type)
  }

  function closeActionConfirmation() {
    if (actionLoading) return

    setActionTarget(null)
    setActionType('')
  }

  async function confirmPurchaseAction() {
    if (!actionTarget || !actionType || actionLoading) return

    const purchaseId = String(actionTarget._id || actionTarget.id)
    const currentAction = actionType

    setActionLoading(true)

    try {
      const response = await axiosInstance.patch(`/erp/purchases/${encodeURIComponent(purchaseId)}/${currentAction}`)

      const data = response.data

      if (data?.success === false) {
        throw new Error(data.message || 'Unable to update purchase.')
      }

      const updated = getPurchaseFromResponse(response)

      if (updated) {
        setPurchase(updated)
      } else {
        await fetchPurchase()
      }

      const emailStatus = String(data?.email?.status || '').toLowerCase()

      if (emailStatus === 'failed' || emailStatus === 'skipped') {
        showToast('error', data.message || 'The purchase action completed, but the email could not be delivered.')
      } else {
        showToast('success', data?.message || (currentAction === 'approve' ? 'Purchase approved successfully.' : 'Purchase cancelled successfully.'))
      }

      setActionTarget(null)
      setActionType('')
    } catch (err) {
      showToast('error', err.response?.data?.message || err.message || 'Unable to update purchase.')
    } finally {
      setActionLoading(false)
    }
  }

  function getActionDialogProps() {
    if (!actionTarget) return {}

    if (actionType === 'approve') {
      return {
        variant: 'activate',
        title: 'Approve Purchase?',
        message: (
          <>
            Are you sure you want to approve <strong className="font-bold text-slate-900">{actionTarget.purchaseNumber || 'this purchase'}</strong>? Its status will change from Draft to Ordered. The supplier purchase order email will be attempted.
            Inventory will not be updated by this action.
          </>
        ),
        actionButtonText: 'Approve Purchase',
        cancelButtonText: 'Keep Purchase',
      }
    }

    return {
      variant: 'deactivate',
      title: 'Cancel Purchase?',
      message: (
        <>
          Are you sure you want to cancel <strong className="font-bold text-slate-900">{actionTarget.purchaseNumber || 'this purchase'}</strong>?{' '}
          {actionTarget.status === 'Ordered' ? 'Its status will return from Ordered to Draft and a cancellation email will be attempted.' : 'This Draft purchase has not been sent to the supplier, so no cancellation email will be sent.'} Inventory
          will not be updated by this action.
        </>
      ),
      actionButtonText: 'Cancel Purchase',
      cancelButtonText: 'Keep Purchase',
    }
  }

  const breadcrumbItems = [
    { title: 'Purchases', link: '/company/purchases' },
    {
      title: purchase?.purchaseNumber || 'Purchase Details',
      link: null,
    },
  ]

  const items = Array.isArray(purchase?.items) ? purchase.items : []

  const subtotal = Number(purchase?.subtotal) || 0
  const combinedDiscount = Number(purchase?.discountAmount) || 0

  const itemDiscountTotal = items.reduce((total, item) => total + (Number(item.discountAmount) || 0), 0)

  const purchaseDiscount = Math.max(0, combinedDiscount - itemDiscountTotal)

  const taxAmount = Number(purchase?.taxAmount) || 0
  const shippingCharges = Number(purchase?.shippingCharges) || 0
  const adjustmentAmount = Number(purchase?.adjustmentAmount) || 0
  const totalAmount = Number(purchase?.totalAmount) || 0
  const paidAmount = Number(purchase?.paidAmount) || 0
  const balanceDue = Math.max(0, totalAmount - paidAmount)

  const totalQuantity = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)

  const supplier = purchase?.supplierId && typeof purchase.supplierId === 'object' ? purchase.supplierId : null

  if (!canView) {
    return (
      <div className="min-w-0 rounded-xl border border-erp-border bg-erp-surface p-6 text-center">
        <AlertCircle size={28} className="mx-auto mb-3 text-erp-danger" />

        <h2 className="text-base font-semibold text-erp-text">Access Denied</h2>

        <p className="mt-2 text-sm text-erp-text-secondary">You do not have permission to view purchase details.</p>

        <button type="button" onClick={() => navigate('/company/purchases', { replace: true })} className={`${buttonBase} mt-4 bg-erp-primary text-white hover:bg-erp-primary-hover`}>
          <ArrowLeft size={14} />
          Back to Purchases
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-w-0 space-y-4 text-sm">
        <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="h-1 bg-erp-primary" />
          <div className="flex min-h-16 items-center px-4 sm:px-5">
            <BreadCrumb items={breadcrumbItems} />
          </div>
        </section>

        <section className="min-h-[480px] overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex min-h-[480px] items-center justify-center">
            <Loading label="Loading purchase details..." description="Fetching purchase information from MineERP..." />
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-3 text-erp-text">
      {toast && <Toast toast={toast} onClose={closeToast} />}

      <section className={`h-17 overflow-hidden rounded-xl border shadow-erp-card ${panelClass} ${isCancelled ? 'border-erp-disabled-border' : ''}`}>
        <div className={`h-1 ${isCancelled ? 'bg-erp-disabled' : 'bg-erp-primary'}`} />

        <div className="flex min-w-0 flex-col gap-3 px-4 py-3 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1 overflow-hidden">
            <BreadCrumb items={breadcrumbItems} />
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button type="button" onClick={() => fetchPurchase(true)} disabled={refreshing || actionLoading} className={`${buttonBase} border border-erp-border bg-erp-surface hover:bg-erp-hover`}>
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>

            {canEdit && (
              <button type="button" onClick={handleEdit} disabled={refreshing || actionLoading} className={`${buttonBase} bg-erp-primary text-white hover:bg-erp-primary-hover`}>
                <Pencil size={14} />
                Edit
              </button>
            )}

            {canApprovePurchase && (
              <button type="button" onClick={() => openActionConfirmation('approve')} disabled={actionLoading || refreshing} className={`${buttonBase} bg-emerald-600 text-white hover:bg-emerald-700`}>
                <CheckCircle2 size={14} />
                Approve
              </button>
            )}

            {canCancelPurchase && (
              <button type="button" onClick={() => openActionConfirmation('cancel')} disabled={actionLoading || refreshing} className={`${buttonBase} border border-red-200 bg-red-50 text-red-600 hover:bg-red-100`}>
                <Ban size={14} />
                Cancel
              </button>
            )}
          </div>
        </div>
      </section>

      {error && (
        <section className="rounded-lg border border-erp-danger-border bg-erp-danger-light p-3">
          <div className="flex items-start gap-2">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-erp-danger" />

            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-erp-danger">Unable to load purchase</h2>

              <p className="mt-1 break-words text-sm text-erp-text">{error}</p>

              <button type="button" onClick={() => fetchPurchase()} className={`${buttonBase} mt-3 border border-erp-danger-border bg-white text-erp-danger hover:bg-erp-danger-light`}>
                <RefreshCw size={14} />
                Try Again
              </button>
            </div>
          </div>
        </section>
      )}

      {!error && purchase && (
        <div className="min-w-0 space-y-3">
          {isCancelled && (
            <div className="flex items-center gap-2 rounded-lg border border-erp-disabled-border bg-erp-disabled-light px-3 py-2">
              <Ban size={16} className="shrink-0 text-erp-disabled" />

              <div className="min-w-0">
                <p className="text-sm font-semibold text-erp-disabled-text">This purchase is cancelled</p>
                <p className="text-xs text-erp-disabled-text">This purchase cannot be edited or cancelled again through the current API.</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-erp-border bg-erp-border sm:grid-cols-4">
            {[
              {
                label: 'Grand Total',
                value: formatMoney(totalAmount),
                icon: Wallet,
              },
              {
                label: 'Paid Amount',
                value: formatMoney(paidAmount),
                icon: CheckCircle2,
              },
              {
                label: 'Balance Due',
                value: formatMoney(balanceDue),
                icon: Clock,
              },
              {
                label: 'Product Lines',
                value: String(items.length),
                icon: Package,
              },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="min-w-0 bg-erp-surface px-3 py-2.5">
                <div className="flex items-center gap-1.5 text-erp-text-secondary">
                  <Icon size={14} className="shrink-0" />
                  <p className="truncate text-xs">{label}</p>
                </div>

                <p className="mt-1 break-words text-base font-bold text-erp-text">{value}</p>

                {label === 'Balance Due' && <p className="mt-0.5 text-xs text-erp-text-secondary">Remaining payment</p>}

                {label === 'Product Lines' && <p className="mt-0.5 text-xs text-erp-text-secondary">{formatQuantity(totalQuantity)} units</p>}
              </div>
            ))}
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2">
            <section className="min-w-0 overflow-hidden rounded-lg border border-erp-border bg-erp-surface">
              <div className="flex min-w-0 items-center gap-2.5 border-b border-erp-border px-3 py-2.5">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${isCancelled ? 'bg-erp-disabled-light text-erp-disabled' : 'bg-erp-primary-light text-erp-primary'}`}>
                  <ShoppingCart size={16} />
                </div>

                <div className="min-w-0">
                  <h2 className={`text-sm font-semibold ${isCancelled ? 'text-erp-disabled-text' : 'text-erp-text'}`}>Purchase Information</h2>
                  <p className={`text-xs ${isCancelled ? 'text-erp-disabled-text' : 'text-erp-text-secondary'}`}>Purchase identification and dates</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-x-4 px-3 sm:grid-cols-2">
                {[
                  {
                    label: 'Purchase Number',
                    value: purchase.purchaseNumber,
                    icon: Hash,
                  },
                  {
                    label: 'Purchase Date',
                    value: formatDate(purchase.purchaseDate),
                    icon: CalendarDays,
                  },
                  {
                    label: 'Expected Delivery',
                    value: formatDate(purchase.expectedDeliveryDate),
                    icon: Truck,
                  },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="flex min-w-0 items-start gap-2 border-b border-erp-border/70 py-2">
                    <Icon size={14} className={`mt-0.5 shrink-0 ${isCancelled ? 'text-erp-disabled' : 'text-erp-text-secondary'}`} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs ${isCancelled ? 'text-erp-disabled-text' : 'text-erp-text-secondary'}`}>{label}</p>
                      <div className={`mt-0.5 break-words text-sm font-medium ${isCancelled ? 'text-erp-disabled-text' : 'text-erp-text'}`}>{value || 'Not provided'}</div>
                    </div>
                  </div>
                ))}

                <div className="flex min-w-0 items-start gap-2 border-b border-erp-border/70 py-2">
                  <CheckCircle2 size={14} className={`mt-0.5 shrink-0 ${isCancelled ? 'text-erp-disabled' : 'text-erp-text-secondary'}`} />
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs ${isCancelled ? 'text-erp-disabled-text' : 'text-erp-text-secondary'}`}>Purchase Status</p>
                    <div className="mt-0.5">
                      <StatusBadge status={purchase.status} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-3 pb-3 pt-2">
                <div className={`flex items-start gap-2 rounded-md px-2.5 py-2 ${isCancelled ? 'bg-erp-disabled-light' : 'bg-erp-surface-secondary/60'}`}>
                  <AlertCircle size={14} className={`mt-0.5 shrink-0 ${isCancelled ? 'text-erp-disabled' : 'text-erp-text-muted'}`} />
                  <p className={`text-xs leading-4 ${isCancelled ? 'text-erp-disabled-text' : 'text-erp-text-secondary'}`}>Approving a Draft purchase changes its status to Ordered. It does not update inventory.</p>
                </div>
              </div>
            </section>

            <section className="min-w-0 overflow-hidden rounded-lg border border-erp-border bg-erp-surface">
              <div className="flex min-w-0 items-center gap-2.5 border-b border-erp-border px-3 py-2.5">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${isCancelled ? 'bg-erp-disabled-light text-erp-disabled' : 'bg-erp-primary-light text-erp-primary'}`}>
                  <Building2 size={16} />
                </div>

                <div className="min-w-0">
                  <h2 className={`text-sm font-semibold ${isCancelled ? 'text-erp-disabled-text' : 'text-erp-text'}`}>Supplier Details</h2>
                  <p className={`text-xs ${isCancelled ? 'text-erp-disabled-text' : 'text-erp-text-secondary'}`}>Supplier connected to this purchase</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-x-4 px-3 pb-2 sm:grid-cols-2">
                {[
                  {
                    label: 'Supplier Name',
                    value: supplier?.supplierName || purchase.supplierName,
                    icon: Building2,
                  },
                  {
                    label: 'Supplier Code',
                    value: supplier?.supplierCode,
                    icon: Hash,
                  },
                  {
                    label: 'Email',
                    value: supplier?.email,
                    icon: Mail,
                  },
                  {
                    label: 'Phone',
                    value: supplier?.phone,
                    icon: Phone,
                  },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="flex min-w-0 items-start gap-2 border-b border-erp-border/70 py-2 last:border-b-0">
                    <Icon size={14} className={`mt-0.5 shrink-0 ${isCancelled ? 'text-erp-disabled' : 'text-erp-text-secondary'}`} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs ${isCancelled ? 'text-erp-disabled-text' : 'text-erp-text-secondary'}`}>{label}</p>
                      <div className={`mt-0.5 break-words text-sm font-medium ${isCancelled ? 'text-erp-disabled-text' : 'text-erp-text'}`}>{value || 'Not provided'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2">
            <section className="min-w-0 overflow-hidden rounded-lg border border-erp-border bg-erp-surface">
              <div className="flex min-w-0 items-center gap-2.5 border-b border-erp-border px-3 py-2.5">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${isCancelled ? 'bg-erp-disabled-light text-erp-disabled' : 'bg-erp-primary-light text-erp-primary'}`}>
                  <Calculator size={16} />
                </div>

                <div className="min-w-0">
                  <h2 className={`text-sm font-semibold ${isCancelled ? 'text-erp-disabled-text' : 'text-erp-text'}`}>Purchase Summary</h2>
                  <p className={`text-xs ${isCancelled ? 'text-erp-disabled-text' : 'text-erp-text-secondary'}`}>Discounts, taxes and adjustments</p>
                </div>
              </div>

              <div className="px-3">
                {[
                  { label: 'Subtotal', value: subtotal, negative: false },
                  {
                    label: 'Item Discount',
                    value: itemDiscountTotal,
                    negative: true,
                  },
                  {
                    label: 'Purchase Discount',
                    value: purchaseDiscount,
                    negative: true,
                  },
                  {
                    label: 'Tax Amount',
                    value: taxAmount,
                    negative: false,
                  },
                  {
                    label: 'Shipping Charges',
                    value: shippingCharges,
                    negative: false,
                  },
                  {
                    label: 'Adjustment',
                    value: adjustmentAmount,
                    negative: adjustmentAmount < 0,
                  },
                ].map(({ label, value, negative }) => {
                  const amount = Number(value) || 0

                  return (
                    <div key={label} className="flex items-center justify-between gap-3 border-b border-erp-border/70 py-2 last:border-b-0">
                      <span className="text-xs text-erp-text-secondary">{label}</span>
                      <span className={`shrink-0 text-right text-sm font-medium tabular-nums ${negative && amount > 0 ? 'text-red-600' : 'text-erp-text'}`}>
                        {negative && amount > 0 ? '− ' : ''}
                        {formatMoney(Math.abs(amount))}
                      </span>
                    </div>
                  )
                })}
              </div>
            </section>

            <section className="min-w-0 overflow-hidden rounded-lg border border-erp-border bg-erp-surface">
              <div className="flex min-w-0 items-center gap-2.5 border-b border-erp-border px-3 py-2.5">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${isCancelled ? 'bg-erp-disabled-light text-erp-disabled' : 'bg-erp-primary-light text-erp-primary'}`}>
                  <Wallet size={16} />
                </div>

                <div className="min-w-0">
                  <h2 className={`text-sm font-semibold ${isCancelled ? 'text-erp-disabled-text' : 'text-erp-text'}`}>Payment Information</h2>
                  <p className={`text-xs ${isCancelled ? 'text-erp-disabled-text' : 'text-erp-text-secondary'}`}>Payment status and record activity</p>
                </div>
              </div>

              <div className="px-3 pb-2">
                {[
                  {
                    label: 'Created On',
                    value: formatDateTime(purchase.createdAt),
                    icon: CalendarDays,
                  },
                  {
                    label: 'Last Updated',
                    value: formatDateTime(purchase.updatedAt),
                    icon: Clock,
                  },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="flex min-w-0 items-start gap-2 border-b border-erp-border/70 py-2 last:border-b-0">
                    <Icon size={14} className={`mt-0.5 shrink-0 ${isCancelled ? 'text-erp-disabled' : 'text-erp-text-secondary'}`} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs ${isCancelled ? 'text-erp-disabled-text' : 'text-erp-text-secondary'}`}>{label}</p>
                      <div className={`mt-0.5 break-words text-sm font-medium ${isCancelled ? 'text-erp-disabled-text' : 'text-erp-text'}`}>{value}</div>
                    </div>
                  </div>
                ))}

                <div className="flex min-w-0 items-start gap-2 border-b border-erp-border/70 py-2">
                  <CheckCircle2 size={14} className={`mt-0.5 shrink-0 ${isCancelled ? 'text-erp-disabled' : 'text-erp-text-secondary'}`} />
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs ${isCancelled ? 'text-erp-disabled-text' : 'text-erp-text-secondary'}`}>Payment Status</p>
                    <div className="mt-0.5">
                      <StatusBadge status={purchase.paymentStatus} />
                    </div>
                  </div>
                </div>

                {purchase.paymentMethod && (
                  <div className="flex min-w-0 items-start gap-2 border-b border-erp-border/70 py-2 last:border-b-0">
                    <Wallet size={14} className={`mt-0.5 shrink-0 ${isCancelled ? 'text-erp-disabled' : 'text-erp-text-secondary'}`} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs ${isCancelled ? 'text-erp-disabled-text' : 'text-erp-text-secondary'}`}>Payment Method</p>
                      <div className={`mt-0.5 break-words text-sm font-medium ${isCancelled ? 'text-erp-disabled-text' : 'text-erp-text'}`}>{purchase.paymentMethod}</div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>

          <section className="min-w-0 overflow-hidden rounded-lg border border-erp-border bg-erp-surface">
            <div className="flex min-w-0 items-center gap-2.5 border-b border-erp-border px-3 py-2.5">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${isCancelled ? 'bg-erp-disabled-light text-erp-disabled' : 'bg-erp-primary-light text-erp-primary'}`}>
                <Package size={16} />
              </div>

              <div className="min-w-0">
                <h2 className={`text-sm font-semibold ${isCancelled ? 'text-erp-disabled-text' : 'text-erp-text'}`}>Purchase Items</h2>
                <p className={`text-xs ${isCancelled ? 'text-erp-disabled-text' : 'text-erp-text-secondary'}`}>Quantity, unit price, discount, tax and line total</p>
              </div>
            </div>

            {items.length === 0 ? (
              <p className="px-3 py-3 text-sm text-erp-text-secondary">No purchase items found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="border-b border-erp-border bg-erp-surface-secondary/60">
                    <tr className="text-xs font-semibold text-erp-text-secondary">
                      <th className="px-3 py-2">Product</th>
                      <th className="px-3 py-2">SKU</th>
                      <th className="px-3 py-2 text-right">Quantity</th>
                      <th className="px-3 py-2 text-right">Unit Price</th>
                      <th className="px-3 py-2 text-right">Gross Amount</th>
                      <th className="px-3 py-2 text-right">Discount</th>
                      <th className="px-3 py-2 text-right">Tax</th>
                      <th className="px-3 py-2 text-right">Line Total</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-erp-border">
                    {items.map((item, index) => {
                      const product = item.productId && typeof item.productId === 'object' ? item.productId : null

                      const quantity = Number(item.quantity) || 0
                      const unitPrice = Number(item.unitPrice) || 0
                      const discount = Number(item.discountAmount) || 0

                      const grossAmount = Math.round((quantity * unitPrice + Number.EPSILON) * 100) / 100

                      const taxableAmount = item.taxableAmount !== undefined ? Number(item.taxableAmount) || 0 : Math.max(0, grossAmount - discount)

                      const lineTax = item.taxAmount !== undefined ? Number(item.taxAmount) || 0 : (taxableAmount * (Number(item.taxRate) || 0)) / 100

                      const lineTotal = item.lineTotal !== undefined ? Number(item.lineTotal) || 0 : taxableAmount + lineTax

                      return (
                        <tr key={item._id || product?._id || item.productId || index} className="transition-colors hover:bg-erp-hover">
                          <td className="px-3 py-2">
                            <p className="font-medium text-erp-text">{item.productName || product?.name || '—'}</p>
                            <p className="text-xs text-erp-text-secondary">{item.unit || product?.unit || 'Piece'}</p>
                          </td>

                          <td className="px-3 py-2 text-erp-text-secondary">{item.sku || product?.sku || '—'}</td>

                          <td className="px-3 py-2 text-right tabular-nums">{formatQuantity(quantity)}</td>

                          <td className="px-3 py-2 text-right tabular-nums">{formatMoney(unitPrice)}</td>

                          <td className="px-3 py-2 text-right tabular-nums">{formatMoney(grossAmount)}</td>

                          <td className="px-3 py-2 text-right tabular-nums text-red-600">{formatMoney(discount)}</td>

                          <td className="px-3 py-2 text-right tabular-nums">
                            <p>{formatMoney(lineTax)}</p>
                            <p className="text-xs text-erp-text-secondary">{(Number(item.taxRate) || 0).toFixed(2)}%</p>
                          </td>

                          <td className="px-3 py-2 text-right font-semibold tabular-nums text-erp-text">{formatMoney(lineTotal)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 border-t border-erp-border px-3 py-2">
              <span className="text-xs text-erp-text-secondary">
                {items.length} product line{items.length === 1 ? '' : 's'}
              </span>
              <span className="text-xs text-erp-text-secondary">{formatQuantity(totalQuantity)} total units</span>
            </div>
          </section>

          <section className="min-w-0 overflow-hidden rounded-lg border border-erp-border bg-erp-surface">
            <div className="flex min-w-0 items-center gap-2.5 border-b border-erp-border px-3 py-2.5">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${isCancelled ? 'bg-erp-disabled-light text-erp-disabled' : 'bg-erp-primary-light text-erp-primary'}`}>
                <FileText size={16} />
              </div>

              <div className="min-w-0">
                <h2 className={`text-sm font-semibold ${isCancelled ? 'text-erp-disabled-text' : 'text-erp-text'}`}>Purchase Notes</h2>
                <p className={`text-xs ${isCancelled ? 'text-erp-disabled-text' : 'text-erp-text-secondary'}`}>Additional information saved with this purchase</p>
              </div>
            </div>

            <div className="px-3 py-2.5">
              <p className="whitespace-pre-wrap break-words text-sm leading-5 text-erp-text">{purchase.notes || 'No additional notes provided.'}</p>
            </div>
          </section>
        </div>
      )}

      {actionTarget && actionType && <TrashBox isOpen={Boolean(actionTarget && actionType)} onClose={closeActionConfirmation} onAction={confirmPurchaseAction} isProcessing={actionLoading} {...getActionDialogProps()} />}
    </div>
  )
}
