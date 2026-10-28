import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ShoppingCart, Package, RefreshCw, Pencil, CheckCircle2, FileText, CalendarDays, Clock, AlertCircle, Ban, Phone, Mail, Building2, Hash, Truck, Wallet, Calculator, Receipt, ArrowLeft } from 'lucide-react'

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

function DetailItem({ label, value, icon: Icon, inactive }) {
  const displayValue = value === null || value === undefined || value === '' ? 'Not provided' : value

  return (
    <div className={`min-w-0 rounded-lg border p-3 ${inactive ? 'border-erp-disabled-border bg-erp-disabled-light/50' : 'border-erp-border bg-erp-surface'}`}>
      <p className={`mb-2 flex items-center gap-2 text-xs ${inactive ? 'text-erp-disabled-text' : 'text-erp-text-secondary'}`}>
        {Icon && <Icon size={14} className="shrink-0" />}
        {label}
      </p>

      <div className={`break-words text-sm font-semibold ${inactive ? 'text-erp-disabled-text' : 'text-erp-text'}`}>{displayValue}</div>
    </div>
  )
}

function SectionHeader({ icon: Icon, title, description, inactive }) {
  return (
    <div className="mb-4 flex min-w-0 items-center gap-3">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${inactive ? 'bg-erp-disabled-light text-erp-disabled' : 'bg-erp-primary-light text-erp-primary'}`}>
        <Icon size={19} />
      </div>

      <div className="min-w-0">
        <h2 className={`text-sm font-bold ${inactive ? 'text-erp-disabled-text' : 'text-erp-text'}`}>{title}</h2>

        <p className={`mt-0.5 text-xs ${inactive ? 'text-erp-disabled-text' : 'text-erp-text-secondary'}`}>{description}</p>
      </div>
    </div>
  )
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

  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${style}`}>{status || 'Not specified'}</span>
}

function SummaryRow({ label, value, negative = false, emphasized = false }) {
  return (
    <div className={`flex items-start justify-between gap-4 py-2.5 ${emphasized ? 'border-t border-erp-border pt-4' : ''}`}>
      <span className={`text-sm ${emphasized ? 'font-bold text-erp-text' : 'text-erp-text-secondary'}`}>{label}</span>

      <span className={`shrink-0 text-right tabular-nums ${emphasized ? 'text-base font-bold text-erp-primary' : negative ? 'font-medium text-red-600' : 'font-semibold text-erp-text'}`}>
        {negative && Number(value) > 0 ? '− ' : ''}
        {formatMoney(value)}
      </span>
    </div>
  )
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
  const [showCancelModal, setShowCancelModal] = useState(false)

  const isCancelled = purchase?.status === 'Cancelled'

  const panelClass = 'border-erp-border bg-erp-surface'

  const headingTextClass = 'text-erp-text'
  const secondaryTextClass = 'text-erp-text-secondary'

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

  async function handleApprove() {
    if (!purchase || actionLoading || !canApprovePurchase) return

    setActionLoading(true)

    try {
      const response = await axiosInstance.patch(`/erp/purchases/${encodeURIComponent(purchase._id || purchase.id)}/approve`)

      const updated = getPurchaseFromResponse(response)

      if (updated) {
        setPurchase(updated)
      } else {
        await fetchPurchase()
      }

      showToast('success', response.data?.message || 'Purchase approved successfully.')
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Unable to approve purchase.')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleCancel() {
    if (!purchase || actionLoading || !canCancelPurchase) return

    setActionLoading(true)

    try {
      const response = await axiosInstance.patch(`/erp/purchases/${encodeURIComponent(purchase._id || purchase.id)}/cancel`)

      const updated = getPurchaseFromResponse(response)

      if (updated) {
        setPurchase(updated)
      } else {
        await fetchPurchase()
      }

      setShowCancelModal(false)

      showToast('success', response.data?.message || 'Purchase cancelled successfully.')
    } catch (err) {
      setShowCancelModal(false)

      showToast('error', err.response?.data?.message || 'Unable to cancel purchase.')
    } finally {
      setActionLoading(false)
    }
  }

  const breadcrumbItems = [
    { title: 'Purchases', link: '/company/purchases' },
    {
      title: purchase?.purchaseNumber || 'Purchase Details',
      link: null,
    },
  ]

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

  const items = Array.isArray(purchase?.items) ? purchase.items : []

  const subtotal = Number(purchase?.subtotal) || 0
  const combinedDiscount = Number(purchase?.discountAmount) || 0

  const itemDiscountTotal = items.reduce((total, item) => total + (Number(item.discountAmount) || 0), 0)

  // Backend stores item discount + purchase-level discount together.
  const purchaseDiscount = Math.max(0, combinedDiscount - itemDiscountTotal)

  const taxAmount = Number(purchase?.taxAmount) || 0
  const shippingCharges = Number(purchase?.shippingCharges) || 0
  const adjustmentAmount = Number(purchase?.adjustmentAmount) || 0
  const totalAmount = Number(purchase?.totalAmount) || 0
  const paidAmount = Number(purchase?.paidAmount) || 0
  const balanceDue = Math.max(0, totalAmount - paidAmount)

  const supplier = purchase?.supplierId && typeof purchase.supplierId === 'object' ? purchase.supplierId : null

  if (loading) {
    return (
      <div className="min-w-0 space-y-4">
        <div className="rounded-xl border border-erp-border bg-erp-surface p-4">
          <BreadCrumb items={breadcrumbItems} />
        </div>

        <Loading label="Loading purchase details..." description="Fetching purchase information from MineERP..." />
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-4 text-erp-text">
      {toast && <Toast toast={toast} onClose={closeToast} />}

      {/* Cancel Confirmation */}
      <TrashBox
        isOpen={showCancelModal}
        onClose={() => {
          if (!actionLoading) setShowCancelModal(false)
        }}
        title="Cancel Purchase?"
        message={
          <>
            Are you sure you want to cancel <strong className="font-bold text-slate-900">{purchase?.purchaseNumber || 'this purchase'}</strong>? This action will change the purchase status to Cancelled.
          </>
        }
        actionButtonText="Cancel Purchase"
        cancelButtonText="Keep Purchase"
        onAction={handleCancel}
        isProcessing={actionLoading}
        variant="delete"
      />

      {/* Header */}
      <section className={`overflow-hidden rounded-xl border shadow-erp-card ${panelClass}`}>
        <div className={`h-1 ${isCancelled ? 'bg-erp-disabled' : 'bg-erp-primary'}`} />

        <div className="flex min-w-0 flex-col gap-3 px-4 py-3 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1 overflow-hidden">
            <BreadCrumb items={breadcrumbItems} />

            <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2">
              <h1 className="break-words text-lg font-bold text-erp-text">{purchase?.purchaseNumber || 'Purchase Details'}</h1>

              <StatusBadge status={purchase?.status} />
            </div>

            <p className="mt-1 text-xs text-erp-text-secondary">Purchase information, product lines and payment summary.</p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button type="button" onClick={() => fetchPurchase(true)} disabled={loading || refreshing || actionLoading} className={`${buttonBase} border border-erp-border bg-erp-surface hover:bg-erp-hover`}>
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
              <button type="button" onClick={handleApprove} disabled={actionLoading || refreshing} className={`${buttonBase} bg-emerald-600 text-white hover:bg-emerald-700`}>
                <CheckCircle2 size={14} />
                {actionLoading ? 'Processing...' : 'Approve'}
              </button>
            )}

            {canCancelPurchase && (
              <button type="button" onClick={() => setShowCancelModal(true)} disabled={actionLoading || refreshing} className={`${buttonBase} border border-red-200 bg-red-50 text-red-600 hover:bg-red-100`}>
                <Ban size={14} />
                Cancel
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Error */}
      {error && (
        <section className="rounded-xl border border-erp-danger-border bg-erp-danger-light p-4">
          <div className="flex items-start gap-3">
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
        <>
          {isCancelled && (
            <div className="flex items-start gap-3 rounded-xl border border-erp-disabled-border bg-erp-disabled-light p-4">
              <Ban size={19} className="mt-0.5 shrink-0 text-erp-disabled" />

              <div>
                <h2 className="text-sm font-bold text-erp-disabled-text">This purchase is cancelled</h2>

                <p className="mt-1 text-xs leading-5 text-erp-disabled-text">This purchase cannot be edited or cancelled again through the current API.</p>
              </div>
            </div>
          )}

          {/* Overview Cards */}
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <section className="min-w-0 rounded-xl border border-erp-border bg-erp-surface p-4 shadow-erp-card">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-erp-text-secondary">Grand Total</p>

                <div className="rounded-lg bg-erp-primary-light p-2 text-erp-primary">
                  <Wallet size={17} />
                </div>
              </div>

              <p className="mt-3 break-words text-xl font-bold text-erp-text">{formatMoney(totalAmount)}</p>

              <p className="mt-1 text-xs text-erp-text-secondary">Final purchase amount</p>
            </section>

            <section className="min-w-0 rounded-xl border border-erp-border bg-erp-surface p-4 shadow-erp-card">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-erp-text-secondary">Paid Amount</p>

                <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                  <CheckCircle2 size={17} />
                </div>
              </div>

              <p className="mt-3 break-words text-xl font-bold text-erp-text">{formatMoney(paidAmount)}</p>

              <div className="mt-2">
                <StatusBadge status={purchase.paymentStatus} />
              </div>
            </section>

            <section className="min-w-0 rounded-xl border border-erp-border bg-erp-surface p-4 shadow-erp-card">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-erp-text-secondary">Balance Due</p>

                <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
                  <Clock size={17} />
                </div>
              </div>

              <p className="mt-3 break-words text-xl font-bold text-erp-text">{formatMoney(balanceDue)}</p>

              <p className="mt-1 text-xs text-erp-text-secondary">Remaining payment</p>
            </section>

            <section className="min-w-0 rounded-xl border border-erp-border bg-erp-surface p-4 shadow-erp-card">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-erp-text-secondary">Product Lines</p>

                <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                  <Package size={17} />
                </div>
              </div>

              <p className="mt-3 text-xl font-bold text-erp-text">{items.length}</p>

              <p className="mt-1 text-xs text-erp-text-secondary">{formatQuantity(items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0))} total units</p>
            </section>
          </div>

          <div className="grid min-w-0 grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
            {/* Purchase Information */}
            <section className={`min-w-0 rounded-xl border p-4 shadow-erp-card sm:p-5 ${panelClass}`}>
              <SectionHeader icon={ShoppingCart} title="Purchase Information" description="Basic purchase details and identification" inactive={isCancelled} />

              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                <DetailItem label="Purchase Number" value={purchase.purchaseNumber} icon={Hash} inactive={isCancelled} />

                <DetailItem label="Purchase Date" value={formatDate(purchase.purchaseDate)} icon={CalendarDays} inactive={isCancelled} />

                <DetailItem label="Expected Delivery" value={formatDate(purchase.expectedDeliveryDate)} icon={Truck} inactive={isCancelled} />

                <DetailItem label="Purchase Status" value={<StatusBadge status={purchase.status} />} icon={CheckCircle2} inactive={isCancelled} />
              </div>

              <div className={`mt-4 rounded-lg p-3 ${isCancelled ? 'bg-erp-disabled-light' : 'bg-erp-surface-secondary/60'}`}>
                <p className={`text-xs leading-5 ${secondaryTextClass}`}>Purchase status is controlled by the backend. Approving a Draft purchase changes its status to Ordered; it does not update inventory.</p>
              </div>
            </section>

            {/* Supplier Details */}
            <section className={`min-w-0 rounded-xl border p-4 shadow-erp-card sm:p-5 ${panelClass}`}>
              <SectionHeader icon={Building2} title="Supplier Details" description="Supplier connected to this purchase" inactive={isCancelled} />

              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                <DetailItem label="Supplier Name" value={supplier?.supplierName || purchase.supplierName} icon={Building2} inactive={isCancelled} />

                <DetailItem label="Supplier Code" value={supplier?.supplierCode} icon={Hash} inactive={isCancelled} />

                <DetailItem label="Email" value={supplier?.email} icon={Mail} inactive={isCancelled} />

                <DetailItem label="Phone" value={supplier?.phone} icon={Phone} inactive={isCancelled} />
              </div>
            </section>

            {/* Purchase Items */}
            <section className={`min-w-0 overflow-hidden rounded-xl border shadow-erp-card lg:col-span-2 ${panelClass}`}>
              <div className="p-4 pb-0 sm:p-5 sm:pb-0">
                <SectionHeader icon={Package} title="Purchase Items" description="Product quantities, prices, discounts and taxes" inactive={isCancelled} />
              </div>

              {items.length === 0 ? (
                <div className="p-5 text-sm text-erp-text-secondary">No purchase items found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1000px] text-left text-sm">
                    <thead className="border-y border-erp-border bg-erp-surface-secondary/60">
                      <tr className="text-xs font-semibold text-erp-text-secondary">
                        <th className="px-4 py-3">Product</th>
                        <th className="px-4 py-3">SKU</th>
                        <th className="px-4 py-3 text-right">Quantity</th>
                        <th className="px-4 py-3 text-right">Unit Price</th>
                        <th className="px-4 py-3 text-right">Gross Amount</th>
                        <th className="px-4 py-3 text-right">Discount</th>
                        <th className="px-4 py-3 text-right">Tax</th>
                        <th className="px-4 py-3 text-right">Line Total</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-erp-border">
                      {items.map((item, index) => {
                        const product = item.productId && typeof item.productId === 'object' ? item.productId : null

                        const quantity = Number(item.quantity) || 0
                        const unitPrice = Number(item.unitPrice) || 0
                        const discount = Number(item.discountAmount) || 0

                        const grossAmount = Math.round((quantity * unitPrice + Number.EPSILON) * 100) / 100

                        const taxableAmount = item.taxableAmount !== undefined ? Number(item.taxableAmount) : Math.max(0, grossAmount - discount)

                        const taxAmount = item.taxAmount !== undefined ? Number(item.taxAmount) : (taxableAmount * (Number(item.taxRate) || 0)) / 100

                        const lineTotal = item.lineTotal !== undefined ? Number(item.lineTotal) : taxableAmount + taxAmount

                        return (
                          <tr key={item._id || product?._id || item.productId || index} className="transition-colors hover:bg-erp-hover">
                            <td className="px-4 py-4">
                              <p className="font-semibold text-erp-text">{item.productName || product?.name || '—'}</p>

                              <p className="mt-1 text-xs text-erp-text-secondary">{item.unit || product?.unit || 'Piece'}</p>
                            </td>

                            <td className="px-4 py-4 text-erp-text-secondary">{item.sku || product?.sku || '—'}</td>

                            <td className="px-4 py-4 text-right tabular-nums">{formatQuantity(quantity)}</td>

                            <td className="px-4 py-4 text-right tabular-nums">{formatMoney(unitPrice)}</td>

                            <td className="px-4 py-4 text-right tabular-nums">{formatMoney(grossAmount)}</td>

                            <td className="px-4 py-4 text-right tabular-nums text-red-600">{formatMoney(discount)}</td>

                            <td className="px-4 py-4 text-right tabular-nums">
                              <p>{formatMoney(taxAmount)}</p>
                              <p className="mt-1 text-xs text-erp-text-secondary">{(Number(item.taxRate) || 0).toFixed(2)}%</p>
                            </td>

                            <td className="px-4 py-4 text-right font-bold tabular-nums text-erp-text">{formatMoney(lineTotal)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-erp-border bg-erp-surface-secondary/40 px-4 py-3 sm:px-5">
                <span className="text-xs text-erp-text-secondary">
                  {items.length} product line{items.length === 1 ? '' : 's'}
                </span>

                <span className="text-sm font-bold text-erp-text">Subtotal: {formatMoney(subtotal)}</span>
              </div>
            </section>

            {/* Item Calculations */}
            <section className={`min-w-0 rounded-xl border p-4 shadow-erp-card sm:p-5 ${panelClass}`}>
              <SectionHeader icon={Calculator} title="Purchase Calculation" description="Item-wise price calculation" inactive={isCancelled} />

              <div className="space-y-3">
                {items.length === 0 && <p className="text-sm text-erp-text-secondary">No item calculations available.</p>}

                {items.map((item, index) => {
                  const quantity = Number(item.quantity) || 0
                  const unitPrice = Number(item.unitPrice) || 0
                  const discount = Number(item.discountAmount) || 0

                  const grossAmount = Math.round((quantity * unitPrice + Number.EPSILON) * 100) / 100

                  const taxableAmount = item.taxableAmount !== undefined ? Number(item.taxableAmount) : Math.max(0, grossAmount - discount)

                  const taxAmount = item.taxAmount !== undefined ? Number(item.taxAmount) : (taxableAmount * (Number(item.taxRate) || 0)) / 100

                  const lineTotal = item.lineTotal !== undefined ? Number(item.lineTotal) : taxableAmount + taxAmount

                  return (
                    <div key={item._id || item.productId?._id || item.productId || index} className="rounded-lg border border-erp-border p-3">
                      <p className="mb-3 break-words text-sm font-semibold text-erp-text">{item.productName || 'Product'}</p>

                      <div className="space-y-2">
                        <div className="flex justify-between gap-3 text-xs">
                          <span className="text-erp-text-secondary">
                            {formatQuantity(quantity)} × {formatMoney(unitPrice)}
                          </span>
                          <span className="font-medium text-erp-text">{formatMoney(grossAmount)}</span>
                        </div>

                        <div className="flex justify-between gap-3 text-xs">
                          <span className="text-erp-text-secondary">Item Discount</span>
                          <span className="text-red-600">− {formatMoney(discount)}</span>
                        </div>

                        <div className="flex justify-between gap-3 border-t border-dashed border-erp-border pt-2 text-xs">
                          <span className="text-erp-text-secondary">Taxable Amount</span>
                          <span className="font-semibold text-erp-text">{formatMoney(taxableAmount)}</span>
                        </div>

                        <div className="flex justify-between gap-3 text-xs">
                          <span className="text-erp-text-secondary">Tax ({(Number(item.taxRate) || 0).toFixed(2)}%)</span>
                          <span className="font-medium text-erp-text">{formatMoney(taxAmount)}</span>
                        </div>

                        <div className="flex justify-between gap-3 border-t border-erp-border pt-2 text-sm">
                          <span className="font-bold text-erp-text">Line Total</span>
                          <span className="font-bold text-erp-primary">{formatMoney(lineTotal)}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Purchase Summary */}
            <section className={`min-w-0 rounded-xl border p-4 shadow-erp-card sm:p-5 ${panelClass}`}>
              <SectionHeader icon={Receipt} title="Purchase Summary" description="Final amount with discounts, taxes and adjustments" inactive={isCancelled} />

              <div className="rounded-lg border border-erp-border p-4">
                <SummaryRow label="Subtotal" value={subtotal} />

                <SummaryRow label="Item Discount" value={itemDiscountTotal} negative />

                <SummaryRow label="Purchase Discount" value={purchaseDiscount} negative />

                <SummaryRow label="Tax Amount" value={taxAmount} />

                <SummaryRow label="Shipping Charges" value={shippingCharges} />

                <SummaryRow label="Adjustment" value={adjustmentAmount} negative={adjustmentAmount < 0} />

                <SummaryRow label="Grand Total" value={totalAmount} emphasized />
              </div>

              <div className="mt-4 rounded-lg bg-erp-primary-light p-4">
                <p className="text-xs font-medium text-erp-primary">Outstanding Balance</p>

                <p className="mt-1 break-words text-xl font-bold text-erp-primary">{formatMoney(balanceDue)}</p>

                <p className="mt-1 text-xs text-erp-primary">Grand Total − Paid Amount</p>
              </div>
            </section>

            {/* Payment Information */}
            <section className={`min-w-0 rounded-xl border p-4 shadow-erp-card sm:p-5 ${panelClass}`}>
              <SectionHeader icon={Wallet} title="Payment Information" description="Saved payment amounts and outstanding balance" inactive={isCancelled} />

              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                <DetailItem label="Grand Total" value={formatMoney(totalAmount)} icon={Receipt} inactive={isCancelled} />

                <DetailItem label="Paid Amount" value={formatMoney(paidAmount)} icon={CheckCircle2} inactive={isCancelled} />

                <DetailItem label="Balance Due" value={formatMoney(balanceDue)} icon={Wallet} inactive={isCancelled} />

                <DetailItem label="Payment Status" value={<StatusBadge status={purchase.paymentStatus} />} icon={Clock} inactive={isCancelled} />
              </div>

              <div className="mt-4 rounded-lg bg-erp-surface-secondary/60 p-3">
                <p className="text-xs leading-5 text-erp-text-secondary">These values come from the saved purchase record. Payment recording is not available through the purchase detail endpoints currently implemented.</p>
              </div>
            </section>

            {/* Additional Details */}
            <section className={`min-w-0 rounded-xl border p-4 shadow-erp-card sm:p-5 ${panelClass}`}>
              <SectionHeader icon={FileText} title="Additional Details" description="Purchase notes and record activity" inactive={isCancelled} />

              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                <DetailItem label="Created On" value={formatDateTime(purchase.createdAt)} icon={CalendarDays} inactive={isCancelled} />

                <DetailItem label="Last Updated" value={formatDateTime(purchase.updatedAt)} icon={Clock} inactive={isCancelled} />
              </div>

              <div className="mt-4">
                <p className="mb-2 text-xs font-medium text-erp-text-secondary">Purchase Notes</p>

                <div className="min-h-20 whitespace-pre-wrap break-words rounded-lg border border-erp-border bg-erp-surface-secondary/40 p-3 text-sm leading-6 text-erp-text">{purchase.notes || 'No additional notes provided.'}</div>
              </div>
            </section>
          </div>
        </>
      )}

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-erp-text-secondary">Purchase details are retrieved from your company purchase records.</p>

        <button type="button" onClick={() => navigate('/company/purchases')} className={`${buttonBase} border border-erp-border bg-erp-surface hover:bg-erp-hover`}>
          <ArrowLeft size={14} />
          Back to Purchases
        </button>
      </div>
    </div>
  )
}
