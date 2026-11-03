import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Package, Truck, CalendarDays, FileText, Hash, Save, LoaderCircle, RefreshCw, Info, CheckCircle2 } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import TrashBox from '../../TrashBox/TrashBox'
import Loading from '../Loading/Loading'
import { hasPermission, useAuth } from '../../context/AuthContext'

const getLocalDate = () => {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const getOrder = (response) => {
  const data = response?.data

  return data?.order || data?.salesOrder || data?.data?.order || data?.data || data
}

const getDispatchItems = (items = []) =>
  items.map((item) => {
    const orderedQuantity = Number(item.quantity || 0)
    const dispatchedQuantity = Number(item.dispatchedQuantity || 0)
    const remainingQuantity = Math.max(0, orderedQuantity - dispatchedQuantity)

    return {
      salesOrderItemId: item._id,
      productId: item.productId?._id || item.productId,
      productName: item.productName || item.productId?.name || 'Product',
      sku: item.sku || item.productId?.sku || '',
      unit: item.unit || item.productId?.unit || '',
      orderedQuantity,
      dispatchedQuantity,
      remainingQuantity,
      quantity: remainingQuantity > 0 ? String(remainingQuantity) : '0',
    }
  })

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0)

export default function SalesDispatchForm() {
  const navigate = useNavigate()
  const { id } = useParams()

  const { permissions } = useAuth()

  const canDispatch = hasPermission(permissions, 'sales:dispatch')

  const [order, setOrder] = useState(null)
  const [items, setItems] = useState([])

  const [form, setForm] = useState({
    dispatchDate: getLocalDate(),
    deliveryReference: '',
    transportName: '',
    vehicleNumber: '',
    notes: '',
  })

  const [loading, setLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)

  const [toast, setToast] = useState(null)
  const [retryKey, setRetryKey] = useState(0)
  const [fieldErrors, setFieldErrors] = useState({})

  const [confirmationOpen, setConfirmationOpen] = useState(false)

  const isValidStatus = ['Approved', 'Partially Dispatched'].includes(order?.status)

  const activeItems = items.filter((item) => Number(item.quantity) > 0)

  const totalDispatchQuantity = activeItems.reduce((total, item) => total + Number(item.quantity || 0), 0)

  const remainingTotal = items.reduce((total, item) => total + item.remainingQuantity, 0)

  const showToast = (type, message, duration = 3000) => {
    setToast({
      id: Date.now(),
      type,
      message,
      duration,
    })
  }

  const closeToast = () => setToast(null)

  useEffect(() => {
    document.title = 'Create Sales Dispatch | MineERP'
  }, [])

  useEffect(() => {
    let cancelled = false

    const fetchOrder = async () => {
      if (hasLoaded) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      setLoadError(false)

      try {
        const response = await axiosInstance.get(`/erp/sales/${id}`)

        if (cancelled) return

        const salesOrder = getOrder(response)

        if (!salesOrder?._id) {
          throw new Error('Sales order details were not found.')
        }

        setOrder(salesOrder)
        setItems(getDispatchItems(salesOrder.items || []))
        setHasLoaded(true)
      } catch (error) {
        if (!cancelled) {
          setLoadError(true)

          showToast('error', error.response?.data?.message || error.message || 'Unable to load sales order.', 5000)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    }

    if (id) {
      fetchOrder()
    } else {
      setLoading(false)
      setLoadError(true)
    }

    return () => {
      cancelled = true
    }
  }, [id, retryKey])

  const updateForm = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))

    setFieldErrors((current) => ({
      ...current,
      [field]: '',
    }))
  }

  const updateQuantity = (index, value) => {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              quantity: value,
            }
          : item,
      ),
    )

    setFieldErrors((current) => ({
      ...current,
      [`quantity_${index}`]: '',
      items: '',
    }))
  }

  const inputClass = (field) => `h-10 w-full rounded-lg border bg-white px-3 text-xs text-slate-700 outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10 ${fieldErrors[field] ? 'border-red-400' : 'border-slate-200'}`

  const labelClass = 'mb-1.5 block text-xs font-semibold text-slate-700'

  const renderError = (field) => (fieldErrors[field] ? <p className="mt-1 text-[11px] text-red-600">{fieldErrors[field]}</p> : null)

  const validateForm = () => {
    const errors = {}

    if (!form.dispatchDate) {
      errors.dispatchDate = 'Dispatch date is required.'
    }

    if (!activeItems.length) {
      errors.items = 'Enter a dispatch quantity for at least one product.'
    }

    items.forEach((item, index) => {
      const quantity = Number(item.quantity)

      if (!Number.isFinite(quantity) || quantity < 0) {
        errors[`quantity_${index}`] = 'Enter a valid quantity.'
      } else if (quantity > item.remainingQuantity) {
        errors[`quantity_${index}`] = `Maximum dispatch quantity is ${item.remainingQuantity}.`
      }
    })

    setFieldErrors(errors)

    if (Object.keys(errors).length) {
      showToast('warning', 'Please check the highlighted fields.')
      return false
    }

    return true
  }

  const openConfirmation = (event) => {
    event.preventDefault()

    if (!canDispatch) {
      showToast('error', 'You do not have permission to dispatch sales orders.')
      return
    }

    if (!isValidStatus) {
      showToast('error', 'Only approved or partially dispatched orders can be dispatched.')
      return
    }

    if (!validateForm()) return

    setConfirmationOpen(true)
  }

  const closeConfirmation = () => {
    if (saving) return
    setConfirmationOpen(false)
  }

  const handleDispatch = async () => {
    if (saving) return

    if (!canDispatch || !isValidStatus) {
      showToast('error', 'You cannot dispatch this sales order.')
      setConfirmationOpen(false)
      return
    }

    if (!validateForm()) {
      setConfirmationOpen(false)
      return
    }

    const payload = {
      dispatchDate: form.dispatchDate,
      deliveryReference: form.deliveryReference.trim(),
      transportName: form.transportName.trim(),
      vehicleNumber: form.vehicleNumber.trim(),
      notes: form.notes.trim(),
      items: activeItems.map((item) => ({
        salesOrderItemId: item.salesOrderItemId,
        quantity: Number(item.quantity),
      })),
    }

    setSaving(true)

    try {
      await axiosInstance.post(`/erp/sales/${id}/dispatch`, payload)

      navigate('/company/sales', {
        state: {
          message: 'Sales dispatch created successfully.',
        },
      })
    } catch (error) {
      showToast('error', error.response?.data?.message || 'Unable to create sales dispatch.', 5000)
      setConfirmationOpen(false)
    } finally {
      setSaving(false)
    }
  }

  const itemsBreadcrumb = [
    {
      title: 'Sales Orders',
      link: '/company/sales',
    },
    {
      title: 'Sales Order Details',
      link: `/company/sales/${id}`,
    },
    {
      title: 'Create Dispatch',
      link: null,
    },
  ]

  if (loading) {
    return (
      <div className="min-w-0 space-y-4 text-sm">
        <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="h-1 bg-erp-primary" />

          <div className="flex min-h-16 items-center px-4 sm:px-5">
            <BreadCrumb items={itemsBreadcrumb} />
          </div>
        </section>

        <section className="relative min-h-[400px] overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex min-h-[400px] items-center justify-center">
            <Loading fullScreen={false} label="Loading sales dispatch" description="Fetching sales order information..." className="!h-full min-h-[400px]" />
          </div>
        </section>
      </div>
    )
  }

  if (loadError || !order) {
    return (
      <div className="min-w-0 space-y-4 text-sm">
        {toast && <Toast toast={toast} onClose={closeToast} />}

        <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="h-1 bg-erp-primary" />

          <div className="flex min-h-16 items-center px-4 sm:px-5">
            <BreadCrumb items={itemsBreadcrumb} />
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white px-4 py-12 text-center">
          <Package size={28} className="mx-auto text-slate-300" />

          <h2 className="mt-3 text-sm font-bold text-slate-800">Unable to load sales order</h2>

          <p className="mt-1 text-xs text-slate-500">Required sales order information could not be loaded.</p>

          <div className="mt-4 flex justify-center gap-2">
            <button type="button" onClick={() => navigate('/company/sales')} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              <ArrowLeft size={14} />
              Back to Sales
            </button>

            <button type="button" onClick={() => setRetryKey((current) => current + 1)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-erp-primary px-3 text-xs font-semibold text-white hover:bg-erp-primary-hover">
              <RefreshCw size={14} />
              Retry
            </button>
          </div>
        </section>
      </div>
    )
  }

  if (!canDispatch) {
    return (
      <div className="min-w-0 space-y-4 text-sm">
        {toast && <Toast toast={toast} onClose={closeToast} />}

        <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="h-1 bg-erp-primary" />
          <div className="flex min-h-16 items-center px-4 sm:px-5">
            <BreadCrumb items={itemsBreadcrumb} />
          </div>
        </section>

        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-center">
          <Info size={24} className="mx-auto text-amber-700" />
          <h2 className="mt-2 text-sm font-bold text-amber-900">Permission Required</h2>
          <p className="mt-1 text-xs text-amber-800">You do not have permission to dispatch sales orders.</p>
          <button type="button" onClick={() => navigate(`/company/sales/${id}`)} className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 text-xs font-semibold text-amber-800 hover:bg-amber-100">
            <ArrowLeft size={14} />
            Back to Order
          </button>
        </section>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-4 text-sm">
      {toast && <Toast toast={toast} onClose={closeToast} />}

      <TrashBox
        isOpen={confirmationOpen}
        onClose={closeConfirmation}
        title="Confirm Sales Dispatch"
        message={`You are about to dispatch ${totalDispatchQuantity} unit(s) from this sales order. This will update inventory stock.`}
        actionButtonText="Confirm Dispatch"
        cancelButtonText="Go Back"
        onAction={handleDispatch}
        isProcessing={saving}
        variant="warning"
        warningText="This action will reduce current stock and reserved stock. Please verify the quantities before confirming."
      />

      {/* Header */}
      <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        <div className="h-1 bg-erp-primary" />

        <div className="flex h-[calc(100%-4px)] items-center justify-between gap-3 px-4 sm:px-5">
          <div className="min-w-0 flex-1 overflow-hidden">
            <BreadCrumb items={itemsBreadcrumb} />
          </div>

          <span className="shrink-0 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-bold text-blue-700">{order.status}</span>
        </div>
      </section>

      {!isValidStatus && (
        <section className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <Info size={16} className="mt-0.5 shrink-0 text-amber-700" />
          <div>
            <p className="text-xs font-bold text-amber-800">Dispatch is not available</p>
            <p className="mt-1 text-[11px] text-amber-700">Only Approved or Partially Dispatched orders can be dispatched. Current status: {order.status}.</p>
          </div>
        </section>
      )}

      {refreshing && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-[11px] text-blue-700">
          <LoaderCircle size={13} className="animate-spin" />
          Refreshing sales order...
        </div>
      )}

      {/* Order Information */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
            <FileText size={16} />
          </div>

          <div>
            <h2 className="text-sm font-bold text-slate-900">Sales Order Information</h2>
            <p className="text-[11px] text-slate-500">Review order details before dispatching</p>
          </div>
        </div>

        <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-[10px] font-medium text-slate-500">Order Number</p>
            <p className="mt-1 text-xs font-bold text-slate-800">{order.orderNumber || '—'}</p>
          </div>

          <div>
            <p className="text-[10px] font-medium text-slate-500">Customer</p>
            <p className="mt-1 text-xs font-bold text-slate-800">{order.customerId?.customerName || '—'}</p>
          </div>

          <div>
            <p className="text-[10px] font-medium text-slate-500">Warehouse</p>
            <p className="mt-1 text-xs font-bold text-slate-800">{order.warehouseId?.name || '—'}</p>
          </div>

          <div>
            <p className="text-[10px] font-medium text-slate-500">Order Date</p>
            <p className="mt-1 text-xs font-bold text-slate-800">{order.orderDate ? new Date(order.orderDate).toLocaleDateString('en-IN') : '—'}</p>
          </div>
        </div>
      </section>

      {/* Dispatch Summary */}
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[11px] font-medium text-slate-500">Total Products</p>
          <p className="mt-1 text-lg font-bold text-slate-800">{items.length}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[11px] font-medium text-slate-500">Remaining Quantity</p>
          <p className="mt-1 text-lg font-bold text-amber-700">{remainingTotal}</p>
        </div>

        <div className="rounded-xl border border-erp-primary/20 bg-erp-primary/5 p-3">
          <p className="text-[11px] font-semibold text-erp-primary">Dispatch Quantity</p>
          <p className="mt-1 text-lg font-extrabold text-erp-primary">{totalDispatchQuantity}</p>
        </div>
      </section>

      {/* Products */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <Package size={16} />
          </div>

          <div>
            <h2 className="text-sm font-bold text-slate-900">Products to Dispatch</h2>
            <p className="text-[11px] text-slate-500">Enter the quantity to dispatch for each product</p>
          </div>
        </div>

        <div className="space-y-3 p-3">
          {items.map((item, index) => {
            const quantity = Number(item.quantity) || 0
            const isFullyDispatched = item.remainingQuantity <= 0

            return (
              <div key={item.salesOrderItemId || index} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-erp-primary/10 text-[11px] font-bold text-erp-primary">{index + 1}</span>

                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800">{item.productName}</p>
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        SKU: {item.sku || '—'} | Unit: {item.unit || '—'}
                      </p>
                    </div>
                  </div>

                  {isFullyDispatched ? (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">Fully Dispatched</span>
                  ) : (
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700">Pending Dispatch</span>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-lg border border-slate-100 bg-white p-2.5">
                    <p className="text-[10px] text-slate-500">Ordered</p>
                    <p className="mt-1 text-xs font-bold text-slate-800">{item.orderedQuantity}</p>
                  </div>

                  <div className="rounded-lg border border-slate-100 bg-white p-2.5">
                    <p className="text-[10px] text-slate-500">Dispatched</p>
                    <p className="mt-1 text-xs font-bold text-emerald-700">{item.dispatchedQuantity}</p>
                  </div>

                  <div className="rounded-lg border border-slate-100 bg-white p-2.5">
                    <p className="text-[10px] text-slate-500">Remaining</p>
                    <p className="mt-1 text-xs font-bold text-amber-700">{item.remainingQuantity}</p>
                  </div>

                  <div className="rounded-lg border border-erp-primary/20 bg-erp-primary/5 p-2.5">
                    <label className="mb-1 block text-[10px] font-semibold text-erp-primary">Dispatch Qty</label>

                    <input
                      type="number"
                      min="0"
                      max={item.remainingQuantity}
                      step="0.01"
                      value={item.quantity}
                      disabled={isFullyDispatched || !isValidStatus}
                      onChange={(event) => updateQuantity(index, event.target.value)}
                      className={`h-8 w-full rounded-md border bg-white px-2 text-xs font-bold text-slate-800 outline-none focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10 ${
                        fieldErrors[`quantity_${index}`] ? 'border-red-400' : 'border-slate-200'
                      }`}
                    />

                    {renderError(`quantity_${index}`)}
                  </div>
                </div>

                {quantity > 0 && quantity < item.remainingQuantity && (
                  <p className="mt-2 flex items-center gap-1 text-[10px] text-blue-700">
                    <Info size={12} />
                    Partial dispatch: {quantity} of {item.remainingQuantity} remaining units.
                  </p>
                )}
              </div>
            )
          })}

          {renderError('items')}
        </div>
      </section>

      {/* Dispatch Details */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
            <Truck size={16} />
          </div>

          <div>
            <h2 className="text-sm font-bold text-slate-900">Dispatch Details</h2>
            <p className="text-[11px] text-slate-500">Enter delivery and transportation information</p>
          </div>
        </div>

        <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={labelClass}>
              Dispatch Date <span className="text-red-500">*</span>
            </label>

            <div className="relative">
              <CalendarDays size={14} className="absolute top-3 left-3 text-slate-400" />
              <input type="date" value={form.dispatchDate} onChange={(event) => updateForm('dispatchDate', event.target.value)} className={`${inputClass('dispatchDate')} pl-9`} />
            </div>

            {renderError('dispatchDate')}
          </div>

          <div>
            <label className={labelClass}>Delivery Reference</label>
            <div className="relative">
              <Hash size={14} className="absolute top-3 left-3 text-slate-400" />
              <input type="text" value={form.deliveryReference} onChange={(event) => updateForm('deliveryReference', event.target.value)} placeholder="Enter delivery reference" className={`${inputClass('deliveryReference')} pl-9`} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Transport Name</label>
            <div className="relative">
              <Truck size={14} className="absolute top-3 left-3 text-slate-400" />
              <input type="text" value={form.transportName} onChange={(event) => updateForm('transportName', event.target.value)} placeholder="Enter transport name" className={`${inputClass('transportName')} pl-9`} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Vehicle Number</label>
            <input type="text" value={form.vehicleNumber} onChange={(event) => updateForm('vehicleNumber', event.target.value.toUpperCase())} placeholder="e.g. GJ01AB1234" className={inputClass('vehicleNumber')} />
          </div>

          <div className="sm:col-span-2">
            <label className={labelClass}>Dispatch Notes</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(event) => updateForm('notes', event.target.value)}
              placeholder="Add dispatch notes..."
              className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10"
            />
          </div>
        </div>
      </section>

      {/* Summary */}
      <section className="overflow-hidden rounded-xl border border-erp-primary/20 bg-white">
        <div className="flex items-center gap-2 border-b border-erp-primary/10 px-3 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <CheckCircle2 size={16} />
          </div>

          <div>
            <h2 className="text-sm font-bold text-slate-900">Dispatch Summary</h2>
            <p className="text-[11px] text-slate-500">Review quantities before confirmation</p>
          </div>
        </div>

        <div className="grid gap-3 p-3 sm:grid-cols-3">
          <div>
            <p className="text-[10px] text-slate-500">Products Selected</p>
            <p className="mt-1 text-base font-bold text-slate-800">{activeItems.length}</p>
          </div>

          <div>
            <p className="text-[10px] text-slate-500">Dispatch Quantity</p>
            <p className="mt-1 text-base font-bold text-erp-primary">{totalDispatchQuantity}</p>
          </div>

          <div>
            <p className="text-[10px] text-slate-500">Remaining After This Dispatch</p>
            <p className="mt-1 text-base font-bold text-amber-700">{Math.max(0, remainingTotal - totalDispatchQuantity)}</p>
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white/95 p-2.5 shadow-sm backdrop-blur">
        <p className="hidden text-[11px] text-slate-500 sm:block">Verify dispatch quantities before confirming.</p>

        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <button type="button" onClick={() => navigate(`/company/sales/${id}`)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
            <ArrowLeft size={14} />
            Back
          </button>

          <button
            type="button"
            onClick={openConfirmation}
            disabled={saving || !isValidStatus || !canDispatch || totalDispatchQuantity <= 0}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-erp-primary px-4 text-xs font-bold text-white transition hover:bg-erp-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <LoaderCircle size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? 'Processing...' : 'Review & Dispatch'}
          </button>
        </div>
      </div>
    </div>
  )
}
