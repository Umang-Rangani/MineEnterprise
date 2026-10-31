import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, RefreshCw, Pencil, CheckCircle2, Package, CalendarDays, Clock, AlertCircle, Ban, Building2, Hash, Truck, Warehouse, FileText, ShieldCheck, XCircle } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import Loading from '../Loading/Loading'
import TrashBox from '../../TrashBox/TrashBox'
import { hasPermission, useAuth } from '../../context/AuthContext'

const buttonBase = 'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50'

const inputBase =
  'w-full rounded-lg border border-erp-border bg-erp-surface px-3 py-2 text-sm text-erp-text placeholder:text-erp-text-secondary focus:border-erp-primary focus:outline-none focus:ring-2 focus:ring-erp-primary/20 disabled:cursor-not-allowed disabled:opacity-50'

function formatQuantity(value) {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 3,
  }).format(Number(value) || 0)
}

function formatMoney(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)
}

function formatDate(value) {
  if (!value) return 'Not available'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return 'Not available'

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(value) {
  if (!value) return 'Not available'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return 'Not available'

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getReceiptFromResponse(response) {
  const body = response?.data

  const candidates = [body?.receipt, body?.data?.receipt, body?.data, body]

  return candidates.find((item) => item && typeof item === 'object' && !Array.isArray(item) && (item._id || item.id) && (item.receiptNumber || Array.isArray(item.items)))
}

function getPurchaseFromResponse(response) {
  const body = response?.data

  const candidates = [body?.purchase, body?.data?.purchase, body?.data, body]

  return candidates.find((item) => item && typeof item === 'object' && !Array.isArray(item) && (item._id || item.id) && (item.purchaseNumber || item.supplierId))
}

function getWarehouseFromResponse(response) {
  const body = response?.data

  const candidates = [body?.warehouse, body?.data?.warehouse, body?.data, body]

  return candidates.find((item) => item && typeof item === 'object' && !Array.isArray(item) && (item._id || item.id) && (item.name || item.warehouseName || item.code))
}

function StatusBadge({ status }) {
  const styles = {
    Draft: 'bg-amber-50 text-amber-700',
    Confirmed: 'bg-emerald-50 text-emerald-700',
    Cancelled: 'bg-red-50 text-red-600',
  }

  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${styles[status] || 'bg-slate-100 text-slate-600'}`}>{status || 'Unknown'}</span>
}

export default function GoodsReceiptDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { permissions } = useAuth()

  const canView = hasPermission(permissions, 'purchase:view')
  const canCreate = hasPermission(permissions, 'purchase:create')
  const canConfirm = hasPermission(permissions, 'purchase:approve')

  const [receipt, setReceipt] = useState(null)
  const [purchase, setPurchase] = useState(null)
  const [warehouse, setWarehouse] = useState(null)

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)

  const [actionTarget, setActionTarget] = useState(null)
  const [actionType, setActionType] = useState('')
  const [cancelReason, setCancelReason] = useState('')

  const panelClass = 'border-erp-border bg-erp-surface'

  const status = receipt?.status
  const isCancelled = status === 'Cancelled'
  const isConfirmed = status === 'Confirmed'
  const isDraft = status === 'Draft'

  const canEdit = canCreate && isDraft
  const canCancel = canCreate && isDraft
  const canConfirmReceipt = canConfirm && isDraft

  function showToast(type, message) {
    setToast({ type, message })
  }

  function closeToast() {
    setToast(null)
  }

  async function fetchReceipt(showRefreshMessage = false) {
    if (!id) {
      setReceipt(null)
      setPurchase(null)
      setWarehouse(null)
      setError('Goods Receipt ID is missing.')
      setLoading(false)
      setRefreshing(false)
      return false
    }

    if (showRefreshMessage) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setError('')

    try {
      const response = await axiosInstance.get(`/erp/goods-receipts/${encodeURIComponent(id)}`)

      const data = getReceiptFromResponse(response)

      if (!data) {
        throw new Error('Goods Receipt data was not found in the API response.')
      }

      setReceipt(data)

      const purchaseId = data.purchaseId?._id || data.purchaseId
      const warehouseId = data.warehouseId?._id || data.warehouseId

      const [purchaseResult, warehouseResult] = await Promise.allSettled([
        purchaseId ? axiosInstance.get(`/erp/purchases/${encodeURIComponent(purchaseId)}`) : Promise.reject(new Error('Purchase reference is missing.')),

        warehouseId ? axiosInstance.get(`/erp/warehouses/${encodeURIComponent(warehouseId)}`) : Promise.reject(new Error('Warehouse reference is missing.')),
      ])

      if (purchaseResult.status === 'fulfilled') {
        setPurchase(getPurchaseFromResponse(purchaseResult.value) || null)
      } else {
        setPurchase(null)
      }

      if (warehouseResult.status === 'fulfilled') {
        setWarehouse(getWarehouseFromResponse(warehouseResult.value) || null)
      } else {
        setWarehouse(null)
      }

      if (showRefreshMessage) {
        showToast('success', 'Goods Receipt details refreshed.')
      }

      return true
    } catch (err) {
      setReceipt(null)
      setPurchase(null)
      setWarehouse(null)

      setError(err.response?.data?.message || err.message || 'Unable to load Goods Receipt details.')

      return false
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    document.title = 'Goods Receipt Details | MineERP'
    fetchReceipt()
  }, [id])

  function handleEdit() {
    if (!receipt || !canEdit) return

    navigate(`/company/goods-receipts/${encodeURIComponent(receipt._id || receipt.id)}/edit`)
  }

  function openActionConfirmation(type) {
    if (!receipt || actionLoading || refreshing || !isDraft) return

    if (type === 'confirm' && !canConfirmReceipt) return
    if (type === 'cancel' && !canCancel) return

    setCancelReason('')
    setActionTarget(receipt)
    setActionType(type)
  }

  function closeActionConfirmation() {
    if (actionLoading) return

    setActionTarget(null)
    setActionType('')
    setCancelReason('')
  }

  async function confirmReceiptAction() {
    if (!actionTarget || !actionType || actionLoading) return

    if (actionType === 'confirm' && !canConfirmReceipt) return
    if (actionType === 'cancel' && !canCancel) return

    if (actionType === 'cancel' && cancelReason.trim().length < 3) {
      showToast('error', 'Please enter a cancellation reason of at least 3 characters.')
      return
    }

    const receiptId = String(actionTarget._id || actionTarget.id)
    const currentAction = actionType

    setActionLoading(true)

    try {
      let response

      if (currentAction === 'confirm') {
        response = await axiosInstance.post(`/erp/goods-receipts/${encodeURIComponent(receiptId)}/confirm`)
      } else {
        response = await axiosInstance.patch(`/erp/goods-receipts/${encodeURIComponent(receiptId)}/cancel`, {
          reason: cancelReason.trim(),
        })
      }

      if (response?.data?.success === false) {
        throw new Error(response.data.message || 'Unable to update Goods Receipt.')
      }

      const updatedReceipt = getReceiptFromResponse(response)

      if (updatedReceipt) {
        setReceipt(updatedReceipt)
      }

      setActionTarget(null)
      setActionType('')
      setCancelReason('')

      showToast('success', response?.data?.message || (currentAction === 'confirm' ? 'Goods Receipt confirmed.' : 'Goods Receipt cancelled.'))

      // Refresh separately so a refresh failure cannot undo the action result.
      const refreshed = await fetchReceipt()

      if (!refreshed) {
        showToast('error', 'The action completed, but the latest receipt details could not be refreshed. Please refresh the page.')
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || err.message || 'Unable to update Goods Receipt.')
    } finally {
      setActionLoading(false)
    }
  }

  const breadcrumbItems = [
    {
      title: 'Goods Receipts',
      link: '/company/goods-receipts',
    },
    {
      title: receipt?.receiptNumber || 'Receipt Details',
      link: null,
    },
  ]

  const items = Array.isArray(receipt?.items) ? receipt.items : []

  const totalReceived = items.reduce((sum, item) => sum + (Number(item.receivedQuantity) || 0), 0)

  const totalDamaged = items.reduce((sum, item) => sum + (Number(item.damagedQuantity) || 0), 0)

  const totalAccepted = items.reduce((sum, item) => sum + (item.acceptedQuantity != null ? Number(item.acceptedQuantity) || 0 : Math.max(0, (Number(item.receivedQuantity) || 0) - (Number(item.damagedQuantity) || 0))), 0)

  const acceptedValue = items.reduce((sum, item) => {
    const accepted = item.acceptedQuantity != null ? Number(item.acceptedQuantity) || 0 : Math.max(0, (Number(item.receivedQuantity) || 0) - (Number(item.damagedQuantity) || 0))

    return sum + accepted * (Number(item.unitPrice) || 0)
  }, 0)

  if (!canView) {
    return (
      <div className="min-w-0 rounded-xl border border-erp-border bg-erp-surface p-6 text-center">
        <AlertCircle size={28} className="mx-auto mb-3 text-erp-danger" />

        <h2 className="text-base font-semibold text-erp-text">Access Denied</h2>

        <p className="mt-2 text-sm text-erp-text-secondary">You do not have permission to view Goods Receipt details.</p>

        <button type="button" onClick={() => navigate('/company/goods-receipts', { replace: true })} className={`${buttonBase} mt-4 bg-erp-primary text-white hover:bg-erp-primary-hover`}>
          <ArrowLeft size={14} />
          Back to Goods Receipts
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

        <section className="flex min-h-[420px] items-center justify-center rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <Loading label="Loading Goods Receipt..." description="Fetching receipt and warehouse information." />
        </section>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-3 text-erp-text">
      {toast && <Toast toast={toast} onClose={closeToast} />}

      <section className={`h-17 overflow-hidden rounded-xl border shadow-erp-card ${panelClass}`}>
        <div className={`h-1 ${isCancelled ? 'bg-red-500' : isConfirmed ? 'bg-emerald-500' : 'bg-erp-primary'}`} />

        <div className="flex min-w-0 flex-col gap-3 px-4 py-3 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="min-w-0 flex-1">
              <BreadCrumb items={breadcrumbItems} />
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button type="button" onClick={() => fetchReceipt(true)} disabled={refreshing || actionLoading} className={`${buttonBase} border border-erp-border bg-erp-surface hover:bg-erp-hover`}>
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>

            {canEdit && (
              <button type="button" onClick={handleEdit} disabled={refreshing || actionLoading} className={`${buttonBase} bg-erp-primary text-white hover:bg-erp-primary-hover`}>
                <Pencil size={14} />
                Edit Draft
              </button>
            )}

            {canConfirmReceipt && (
              <button type="button" onClick={() => openActionConfirmation('confirm')} disabled={refreshing || actionLoading} className={`${buttonBase} bg-emerald-600 text-white hover:bg-emerald-700`}>
                <CheckCircle2 size={14} />
                Confirm Receipt
              </button>
            )}

            {canCancel && (
              <button type="button" onClick={() => openActionConfirmation('cancel')} disabled={refreshing || actionLoading} className={`${buttonBase} border border-red-200 bg-red-50 text-red-600 hover:bg-red-100`}>
                <Ban size={14} />
                Cancel Draft
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
              <h2 className="text-sm font-bold text-erp-danger">Unable to load Goods Receipt</h2>

              <p className="mt-1 break-words text-sm text-erp-text">{error}</p>

              <button type="button" onClick={() => fetchReceipt()} className={`${buttonBase} mt-3 border border-erp-danger-border bg-white text-erp-danger hover:bg-erp-danger-light`}>
                <RefreshCw size={14} />
                Try Again
              </button>
            </div>
          </div>
        </section>
      )}

      {!error && receipt && (
        <div className="min-w-0 space-y-3">
          {isConfirmed && (
            <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
              <ShieldCheck size={17} className="mt-0.5 shrink-0 text-emerald-700" />

              <div>
                <p className="text-sm font-semibold text-emerald-800">Receipt confirmed</p>

                <p className="mt-1 text-xs text-emerald-700">Inventory was updated with accepted, undamaged quantities.</p>
              </div>
            </div>
          )}

          {isCancelled && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
              <Ban size={17} className="mt-0.5 shrink-0 text-red-600" />

              <div className="min-w-0">
                <p className="text-sm font-semibold text-red-700">This receipt is cancelled</p>

                <p className="mt-1 break-words text-xs text-red-600">{receipt.cancellationReason || 'No cancellation reason recorded.'}</p>

                <p className="mt-1 text-xs text-red-600">Cancelled on: {formatDateTime(receipt.cancelledAt)}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-erp-border bg-erp-border sm:grid-cols-4">
            {[
              {
                label: 'Total Received',
                value: formatQuantity(totalReceived),
                icon: Truck,
              },
              {
                label: 'Total Damaged',
                value: formatQuantity(totalDamaged),
                icon: Ban,
              },
              {
                label: 'Accepted Quantity',
                value: formatQuantity(totalAccepted),
                icon: CheckCircle2,
              },
              {
                label: 'Accepted Value',
                value: formatMoney(acceptedValue),
                icon: Package,
              },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="min-w-0 bg-erp-surface px-3 py-3">
                <div className="flex items-center gap-1.5 text-erp-text-secondary">
                  <Icon size={14} className="shrink-0" />
                  <p className="truncate text-xs">{label}</p>
                </div>

                <p className="mt-1 break-words text-base font-bold text-erp-text">{value}</p>
              </div>
            ))}
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2">
            <section className="min-w-0 overflow-hidden rounded-lg border border-erp-border bg-erp-surface">
              <div className="flex items-center gap-2.5 border-b border-erp-border px-3 py-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-erp-primary-light text-erp-primary">
                  <FileText size={16} />
                </div>

                <div>
                  <h2 className="text-sm font-semibold text-erp-text">Receipt Information</h2>

                  <p className="text-xs text-erp-text-secondary">Document and receiving dates</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-x-4 px-3 sm:grid-cols-2">
                {[
                  {
                    label: 'Receipt Number',
                    value: receipt.receiptNumber,
                    icon: Hash,
                  },
                  {
                    label: 'Receipt Date',
                    value: formatDate(receipt.receiptDate),
                    icon: CalendarDays,
                  },
                  {
                    label: 'Created On',
                    value: formatDateTime(receipt.createdAt),
                    icon: Clock,
                  },
                  {
                    label: 'Last Updated',
                    value: formatDateTime(receipt.updatedAt),
                    icon: RefreshCw,
                  },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="flex min-w-0 items-start gap-2 border-b border-erp-border/70 py-2">
                    <Icon size={14} className="mt-0.5 shrink-0 text-erp-text-secondary" />

                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-erp-text-secondary">{label}</p>

                      <p className="mt-0.5 break-words text-sm font-medium text-erp-text">{value || 'Not provided'}</p>
                    </div>
                  </div>
                ))}
              </div>

              {isConfirmed && (
                <div className="m-3 rounded-md bg-emerald-50 px-3 py-2">
                  <p className="text-xs text-emerald-800">Confirmed on: {formatDateTime(receipt.confirmedAt)}</p>

                  <p className="mt-1 break-words text-xs text-emerald-800">Stock update reference: {receipt.stockUpdateReference || receipt.receiptNumber}</p>
                </div>
              )}
            </section>

            <section className="min-w-0 overflow-hidden rounded-lg border border-erp-border bg-erp-surface">
              <div className="flex items-center gap-2.5 border-b border-erp-border px-3 py-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-erp-primary-light text-erp-primary">
                  <Building2 size={16} />
                </div>

                <div>
                  <h2 className="text-sm font-semibold text-erp-text">Supplier & Warehouse</h2>

                  <p className="text-xs text-erp-text-secondary">Purchase and destination details</p>
                </div>
              </div>

              <div className="px-3">
                {[
                  {
                    label: 'Supplier',
                    value: receipt.supplierName || purchase?.supplierId?.supplierName || '—',
                    icon: Building2,
                  },
                  {
                    label: 'Purchase Order',
                    value: receipt.purchaseNumber || purchase?.purchaseNumber || '—',
                    icon: Package,
                  },
                  {
                    label: 'Warehouse',
                    value: warehouse?.name || warehouse?.warehouseName || 'Warehouse details unavailable',
                    icon: Warehouse,
                  },
                  {
                    label: 'Warehouse Code',
                    value: warehouse?.code || '—',
                    icon: Hash,
                  },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="flex min-w-0 items-start gap-2 border-b border-erp-border/70 py-2">
                    <Icon size={14} className="mt-0.5 shrink-0 text-erp-text-secondary" />

                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-erp-text-secondary">{label}</p>

                      <p className="mt-0.5 break-words text-sm font-medium text-erp-text">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="min-w-0 overflow-hidden rounded-lg border border-erp-border bg-erp-surface">
            <div className="flex items-center gap-2.5 border-b border-erp-border px-3 py-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-erp-primary-light text-erp-primary">
                <Package size={16} />
              </div>

              <div>
                <h2 className="text-sm font-semibold text-erp-text">Received Items</h2>

                <p className="text-xs text-erp-text-secondary">Ordered, previously received, damaged and accepted quantities</p>
              </div>
            </div>

            {items.length === 0 ? (
              <p className="px-3 py-4 text-sm text-erp-text-secondary">No receipt items found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="border-b border-erp-border bg-erp-surface-secondary/60">
                    <tr className="text-xs font-semibold text-erp-text-secondary">
                      <th className="px-3 py-2">Product</th>
                      <th className="px-3 py-2 text-right">Ordered</th>
                      <th className="px-3 py-2 text-right">Previously Received</th>
                      <th className="px-3 py-2 text-right">Received Now</th>
                      <th className="px-3 py-2 text-right">Damaged</th>
                      <th className="px-3 py-2 text-right">Accepted</th>
                      <th className="px-3 py-2 text-right">Unit Cost</th>
                      <th className="px-3 py-2 text-right">Accepted Value</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-erp-border">
                    {items.map((item, index) => {
                      const received = Number(item.receivedQuantity) || 0

                      const damaged = Number(item.damagedQuantity) || 0

                      const accepted = item.acceptedQuantity != null ? Number(item.acceptedQuantity) || 0 : Math.max(0, received - damaged)

                      const unitPrice = Number(item.unitPrice) || 0

                      return (
                        <tr key={item._id || item.purchaseItemId || index} className="transition-colors hover:bg-erp-hover">
                          <td className="px-3 py-2">
                            <p className="font-medium text-erp-text">{item.productName || '—'}</p>

                            <p className="text-xs text-erp-text-secondary">
                              {item.sku || 'No SKU'} · {item.unit || 'Piece'}
                            </p>

                            {item.notes && <p className="mt-1 max-w-xs whitespace-pre-wrap break-words text-xs text-erp-text-secondary">{item.notes}</p>}
                          </td>

                          <td className="px-3 py-2 text-right tabular-nums">{formatQuantity(item.orderedQuantity)}</td>

                          <td className="px-3 py-2 text-right tabular-nums">{formatQuantity(item.previouslyReceivedQuantity)}</td>

                          <td className="px-3 py-2 text-right font-medium tabular-nums">{formatQuantity(received)}</td>

                          <td className="px-3 py-2 text-right tabular-nums text-red-600">{formatQuantity(damaged)}</td>

                          <td className="px-3 py-2 text-right font-semibold tabular-nums text-emerald-700">{formatQuantity(accepted)}</td>

                          <td className="px-3 py-2 text-right tabular-nums">{formatMoney(unitPrice)}</td>

                          <td className="px-3 py-2 text-right font-semibold tabular-nums">{formatMoney(accepted * unitPrice)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-erp-border px-3 py-2">
              <span className="text-xs text-erp-text-secondary">
                {items.length} product line{items.length === 1 ? '' : 's'}
              </span>

              <span className="text-xs font-semibold text-erp-text">Accepted value: {formatMoney(acceptedValue)}</span>
            </div>
          </section>

          <section className="min-w-0 overflow-hidden rounded-lg border border-erp-border bg-erp-surface">
            <div className="flex items-center gap-2.5 border-b border-erp-border px-3 py-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-erp-primary-light text-erp-primary">
                <FileText size={16} />
              </div>

              <div>
                <h2 className="text-sm font-semibold text-erp-text">Receipt Notes</h2>

                <p className="text-xs text-erp-text-secondary">Additional delivery and inspection information</p>
              </div>
            </div>

            <div className="px-3 py-3">
              <p className="whitespace-pre-wrap break-words text-sm leading-5 text-erp-text">{receipt.notes || 'No additional notes provided.'}</p>
            </div>
          </section>

          {isConfirmed && (
            <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <div className="flex items-start gap-2">
                <ShieldCheck size={17} className="mt-0.5 shrink-0 text-emerald-700" />

                <div>
                  <h2 className="text-sm font-semibold text-emerald-800">Inventory Update</h2>

                  <p className="mt-1 text-xs leading-5 text-emerald-700">Only accepted quantities were added to the selected warehouse. Damaged quantities were recorded in the receipt but excluded from stock.</p>

                  <p className="mt-1 text-xs text-emerald-700">Updated on: {formatDateTime(receipt.stockUpdatedAt)}</p>
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {/* Confirm Receipt - Existing TrashBox */}
      {actionTarget && actionType === 'confirm' && (
        <TrashBox
          isOpen={Boolean(actionTarget)}
          onClose={closeActionConfirmation}
          title="Confirm Goods Receipt?"
          message={`Are you sure you want to confirm ${actionTarget.receiptNumber}? This action updates warehouse stock with accepted quantities and cannot be repeated.`}
          actionButtonText="Confirm Receipt"
          cancelButtonText="Keep Draft"
          onAction={confirmReceiptAction}
          isProcessing={actionLoading}
        />
      )}

      {/* Cancel Receipt - Reason Required */}
      {actionTarget && actionType === 'cancel' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-erp-border bg-erp-surface p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
                <XCircle size={19} />
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="text-base font-bold text-erp-text">Cancel Goods Receipt?</h2>

                <p className="mt-1 text-xs leading-5 text-erp-text-secondary">Cancel {actionTarget.receiptNumber}? This Draft will be permanently cancelled and no inventory will be changed.</p>
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-semibold text-erp-text">
                Cancellation Reason <span className="text-red-500">*</span>
              </label>

              <textarea rows={3} maxLength={1000} className={inputBase} value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} placeholder="Explain why this receipt is being cancelled..." disabled={actionLoading} />

              <p className="mt-1 text-right text-[10px] text-erp-text-secondary">{cancelReason.length}/1000</p>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={closeActionConfirmation} disabled={actionLoading} className={`${buttonBase} border border-erp-border bg-erp-surface text-erp-text hover:bg-erp-hover`}>
                Keep Draft
              </button>

              <button type="button" onClick={confirmReceiptAction} disabled={actionLoading || cancelReason.trim().length < 3} className={`${buttonBase} bg-red-600 text-white hover:bg-red-700`}>
                {actionLoading ? <RefreshCw size={14} className="animate-spin" /> : <Ban size={14} />}

                {actionLoading ? 'Processing...' : 'Cancel Receipt'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
