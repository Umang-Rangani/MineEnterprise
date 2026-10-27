import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Package, Plus, Minus, LoaderCircle, FileText, AlertCircle, Boxes, Hash, History } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import Loading from '../Loading/Loading'
import { hasPermission, useAuth } from '../../context/AuthContext'

export default function InventoryStockForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const { permissions } = useAuth()

  const isStockIn = location.pathname.endsWith('/stock-in')
  const isStockOut = location.pathname.endsWith('/stock-out')

  const canAdjustStock = hasPermission(permissions, 'inventory:adjust-stock')

  const canViewStock = hasPermission(permissions, 'inventory:view-stock')

  const hasFormPermission = Boolean(id) && (isStockIn || isStockOut) && canAdjustStock && canViewStock

  const [product, setProduct] = useState(null)
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')
  const [reference, setReference] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')
  const [toast, setToast] = useState(null)

  const items = [
    {
      title: 'Inventory',
      link: '/company/inventory',
    },
    {
      title: isStockIn ? 'Stock In' : 'Stock Out',
      link: null,
    },
  ]

  useEffect(() => {
    document.title = `${isStockIn ? 'Stock In' : 'Stock Out'} | MineERP`
  }, [isStockIn])

  useEffect(() => {
    let active = true

    async function loadInventory() {
      if (!hasFormPermission) {
        setLoading(false)
        return
      }

      setLoading(true)
      setApiError('')

      try {
        const { data } = await axiosInstance.get(`/erp/inventory/${id}`)

        if (data.success === false) {
          throw new Error(data.message || 'Unable to load inventory details.')
        }

        const inventory = data.inventory || data.data?.inventory || data.data

        if (!inventory) {
          throw new Error('Inventory record not found.')
        }

        if (active) {
          setProduct(inventory)
        }
      } catch (error) {
        if (active) {
          setApiError(error.response?.data?.message || error.message || 'Unable to load inventory details.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadInventory()

    return () => {
      active = false
    }
  }, [id, hasFormPermission])

  function goBack() {
    navigate('/company/inventory')
  }

  function openStockHistory() {
    navigate(`/company/inventory/${id}/history`)
  }

  function updateField(field, value) {
    if (field === 'quantity' && value !== '') {
      const number = Number(value)

      if (!Number.isFinite(number) || number < 0) {
        return
      }
    }

    if (field === 'reason' && value.length > 250) {
      return
    }

    if (field === 'reference' && value.length > 100) {
      return
    }

    if (field === 'quantity') {
      setQuantity(value)
    }

    if (field === 'reason') {
      setReason(value)
    }

    if (field === 'reference') {
      setReference(value)
    }

    setErrors((current) => ({
      ...current,
      [field]: '',
    }))

    setApiError('')
  }

  function validateForm() {
    const nextErrors = {}

    const parsedQuantity = Number(quantity)
    const trimmedReason = reason.trim()
    const trimmedReference = reference.trim()

    if (quantity.trim() === '') {
      nextErrors.quantity = 'Quantity is required.'
    } else if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      nextErrors.quantity = 'Enter a quantity greater than zero.'
    }

    if (!trimmedReason) {
      nextErrors.reason = 'Reason is required.'
    } else if (trimmedReason.length > 250) {
      nextErrors.reason = 'Reason cannot exceed 250 characters.'
    }

    if (trimmedReference.length > 100) {
      nextErrors.reference = 'Reference cannot exceed 100 characters.'
    }

    setErrors(nextErrors)

    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (saving || !hasFormPermission) {
      return
    }

    if (!validateForm()) {
      return
    }

    setSaving(true)
    setApiError('')

    try {
      const payload = {
        productId: id,
        quantity: Number(quantity),
        reason: reason.trim(),
        reference: reference.trim(),
      }

      const endpoint = isStockIn ? '/erp/inventory/stock-in' : '/erp/inventory/stock-out'

      const { data } = await axiosInstance.post(endpoint, payload)

      if (data.success === false) {
        throw new Error(data.message || 'Unable to update stock.')
      }

      navigate(`/company/inventory/${id}/history`, {
        replace: true,
        state: {
          successMessage: data.message || (isStockIn ? 'Stock successfully added.' : 'Stock successfully removed.'),
        },
      })
    } catch (error) {
      setApiError(error.response?.data?.message || error.message || 'Unable to update stock.')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = (field) =>
    `h-10 w-full rounded-lg border bg-erp-surface px-3 text-xs text-erp-text outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10 disabled:cursor-not-allowed disabled:opacity-60 ${
      errors[field] ? 'border-red-400' : 'border-erp-border'
    }`

  const labelClass = 'block text-xs font-semibold text-erp-text-secondary'

  function errorText(field) {
    return errors[field] ? <p className="text-[11px] text-red-600">{errors[field]}</p> : null
  }

  if (!hasFormPermission) {
    return (
      <div className="min-w-0 rounded-xl border border-rose-200 bg-erp-surface p-6 text-center">
        <AlertCircle size={28} className="mx-auto text-rose-500" />

        <h2 className="mt-3 text-base font-semibold text-erp-text">Access Denied</h2>

        <p className="mt-2 text-sm text-erp-text-secondary">You do not have permission to perform this stock operation, or the inventory route is invalid.</p>

        <button type="button" onClick={goBack} className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-erp-primary px-4 text-xs font-semibold text-white transition hover:bg-erp-primary-hover">
          <ArrowLeft size={14} />
          Back to Inventory
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-w-0 space-y-3">
        <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="h-1 bg-erp-primary" />

          <div className="flex h-[calc(100%-4px)] items-center px-4 sm:px-5">
            <BreadCrumb items={items} />
          </div>
        </section>

        <Loading label="Loading inventory..." description="Preparing stock information..." />
      </div>
    )
  }

  const inventoryProduct = product?.productId && typeof product.productId === 'object' ? product.productId : product?.product && typeof product.product === 'object' ? product.product : product?.productId || product?.product || product

  const productName = inventoryProduct?.name || inventoryProduct?.productName || 'Product'

  const sku = inventoryProduct?.sku || '—'

  const categoryName = inventoryProduct?.categoryId?.name || inventoryProduct?.categoryName || inventoryProduct?.category?.name || 'Uncategorized'

  const currentStock = Number(product?.currentStock ?? product?.stock ?? product?.openingStock ?? inventoryProduct?.openingStock ?? 0)

  const reservedStock = Number(product?.reservedStock ?? 0)

  const availableStock = Number(product?.availableStock ?? currentStock - reservedStock)

  const unit = inventoryProduct?.unit || 'Piece'

  const stockStats = [
    {
      label: 'Current Stock',
      value: currentStock,
      color: 'text-erp-text',
      background: 'bg-erp-hover/40',
    },
    {
      label: 'Reserved Stock',
      value: reservedStock,
      color: 'text-amber-600',
      background: 'bg-amber-50',
    },
    {
      label: 'Available Stock',
      value: availableStock,
      color: 'text-emerald-700',
      background: 'bg-emerald-50',
    },
  ]

  return (
    <div className="min-w-0 space-y-4 text-sm">
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      {/* Header: Breadcrumb + Stock Information + History */}
      {/* Header — follows the Categories demo */}
      <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        <div className="h-1 bg-erp-primary" />

        <div className="flex h-[calc(100%-4px)] min-w-0 items-center justify-between gap-3 px-4 sm:px-5">
          {/* Left: Breadcrumb */}
          <div className="min-w-0 flex-1 overflow-hidden">
            <BreadCrumb items={items} />
          </div>

          {/* Right: Stock Stats + View History */}
          <div className="flex shrink-0 items-center gap-2">
            {stockStats.map((stat) => (
              <div key={stat.label} className={`flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-erp-border px-3 ${stat.background}`}>
                <span className="text-[10px] font-medium text-erp-text-secondary">{stat.label}</span>

                <span className={`text-xs font-bold ${stat.color}`}>
                  {stat.value.toLocaleString('en-IN')}
                  <span className="ml-1 text-[9px] font-medium text-erp-text-secondary">{unit}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Two-column layout: Left form, Right product information */}
      <form onSubmit={handleSubmit} className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-2">
        {/* LEFT: Stock Adjustment Form */}
        <section className="min-w-0 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex items-center gap-2 border-b border-erp-border px-3 py-3">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isStockIn ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>{isStockIn ? <Plus size={16} /> : <Minus size={16} />}</div>

            <div className="min-w-0">
              <h2 className="text-sm font-bold text-erp-text">{isStockIn ? 'Add Stock' : 'Remove Stock'}</h2>

              <p className="text-[11px] text-erp-text-secondary">Enter the quantity and reason for this adjustment.</p>
            </div>
          </div>

          <div className="space-y-4 p-3 sm:p-4">
            {/* Quantity */}
            <div className="min-w-0 space-y-1.5">
              <label htmlFor="stock-quantity" className={labelClass}>
                Quantity <span className="text-erp-danger">*</span>
              </label>

              <div className="relative">
                <input
                  id="stock-quantity"
                  type="number"
                  min="0.001"
                  step="any"
                  required
                  autoFocus
                  value={quantity}
                  onChange={(event) => updateField('quantity', event.target.value)}
                  placeholder="Enter quantity"
                  disabled={saving}
                  className={`${inputClass('quantity')} pr-16`}
                />

                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-erp-text-muted">{unit}</span>
              </div>

              {errorText('quantity')}

              {/* {isStockOut && <p className="text-[10px] text-erp-text-muted">The quantity must not exceed available stock. The server must validate this as well.</p>} */}
            </div>

            {/* Reason */}
            <div className="min-w-0 space-y-1.5">
              <label htmlFor="stock-reason" className={labelClass}>
                Reason <span className="text-erp-danger">*</span>
              </label>

              <input
                id="stock-reason"
                type="text"
                required
                maxLength={250}
                value={reason}
                onChange={(event) => updateField('reason', event.target.value)}
                placeholder={isStockIn ? 'e.g. Purchase received' : 'e.g. Damaged goods or sales issue'}
                disabled={saving}
                className={inputClass('reason')}
              />

              {errorText('reason')}

              {/* <p className="text-right text-[10px] text-erp-text-muted">{reason.length}/250</p> */}
            </div>

            {/* Reference */}
            <div className="min-w-0 space-y-1.5">
              <label htmlFor="stock-reference" className={labelClass}>
                Reference
              </label>

              <div className="relative">
                <FileText size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-erp-text-muted" />

                <input
                  id="stock-reference"
                  type="text"
                  maxLength={100}
                  value={reference}
                  onChange={(event) => updateField('reference', event.target.value)}
                  placeholder="Optional reference number"
                  disabled={saving}
                  className={`${inputClass('reference')} pl-9`}
                />
              </div>

              {errorText('reference')}
            </div>

            {/* API Error */}
            {apiError && (
              <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
                <AlertCircle size={15} className="mt-0.5 shrink-0" />

                <p>{apiError}</p>
              </div>
            )}
          </div>

          {/* Existing Cancel / Add Stock / Remove Stock actions */}
          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-erp-border bg-erp-hover/20 p-3">
            <button
              type="button"
              onClick={goBack}
              disabled={saving}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-erp-border bg-erp-surface px-3 text-xs font-semibold text-erp-text-secondary transition hover:bg-erp-hover disabled:opacity-50"
            >
              <ArrowLeft size={14} />
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-4 text-xs font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                isStockIn ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-orange-600 hover:bg-orange-700'
              }`}
            >
              {saving ? <LoaderCircle size={14} className="animate-spin" /> : isStockIn ? <Plus size={14} /> : <Minus size={14} />}

              {saving ? 'Processing...' : isStockIn ? 'Add Stock' : 'Remove Stock'}
            </button>
          </footer>
        </section>

        {/* RIGHT: Product Information */}
        <section className="min-w-0 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex items-center gap-2 border-b border-erp-border px-3 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
              <Package size={16} />
            </div>

            <div className="min-w-0">
              <h2 className="text-sm font-bold text-erp-text">Product Information</h2>

              <p className="text-[11px] text-erp-text-secondary">Verify the product before adjusting its stock.</p>
            </div>
          </div>

          <div className="space-y-4 p-3 sm:p-4">
            {/* Product name */}
            <div className="min-w-0 space-y-1.5">
              <label className={labelClass}>Product Name</label>

              <div className="flex min-h-10 items-center rounded-lg border border-erp-border bg-erp-hover/30 px-3 py-2 text-xs font-semibold text-erp-text">
                <span className="break-words">{productName}</span>
              </div>
            </div>

            {/* Category */}
            <div className="min-w-0 space-y-1.5">
              <label className={labelClass}>Category</label>

              <div className="flex min-h-10 items-center rounded-lg border border-erp-border bg-erp-hover/30 px-3 py-2 text-xs text-erp-text">
                <span className="break-words">{categoryName}</span>
              </div>
            </div>

            <div className="flex gap-5 min-w-0">
              {/* SKU */}
              <div className=" w-full space-y-1.5">
                <label className={labelClass}>SKU</label>

                <div className="flex h-10 items-center gap-2 rounded-lg border border-erp-border bg-erp-hover/30 px-3 text-xs text-erp-text">
                  <Hash size={14} className="shrink-0 text-erp-text-muted" />

                  <span className="truncate">{sku}</span>
                </div>
              </div>

              {/* Unit */}
              <div className="w-full space-y-1.5">
                <label className={labelClass}>Unit</label>

                <div className="flex h-10 items-center rounded-lg border border-erp-border bg-erp-hover/30 px-3 text-xs text-erp-text">{unit}</div>
              </div>
            </div>

            {/* Product Stock Summary */}

            <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-erp-border bg-erp-hover/20 pt-2">
              {/* History shortcut */}
              <button
                type="button"
                onClick={openStockHistory}
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-erp-border px-3 text-xs font-semibold text-erp-text transition hover:border-erp-primary hover:bg-erp-primary/5 hover:text-erp-primary"
              >
                <History size={14} />
                View Stock History
              </button>
            </footer>
          </div>
        </section>
      </form>
    </div>
  )
}
