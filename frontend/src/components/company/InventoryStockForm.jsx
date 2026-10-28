import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Package, Plus, Minus, LoaderCircle, FileText, AlertCircle, Boxes, Hash, History, CheckCircle2 } from 'lucide-react'

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
  const [warehouses, setWarehouses] = useState([])
  const [warehouseId, setWarehouseId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')
  const [reference, setReference] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')
  const [toast, setToast] = useState(null)

  const pageTitle = isStockIn ? 'Stock In' : 'Stock Out'

  const breadcrumbItems = [
    { title: 'Inventory', link: '/company/inventory' },
    { title: pageTitle, link: null },
  ]

  useEffect(() => {
    document.title = `${pageTitle} | MineERP`
  }, [pageTitle])

  useEffect(() => {
    let active = true

    async function loadInitialData() {
      if (!hasFormPermission) {
        setLoading(false)
        return
      }

      setLoading(true)
      setApiError('')

      try {
        const [warehouseResponse, inventoryResponse] = await Promise.all([
          axiosInstance.get('/erp/warehouses', {
            params: { status: 'Active' },
          }),
          axiosInstance.get(`/erp/inventory/${id}`),
        ])

        const warehouseBody = warehouseResponse.data
        const inventoryBody = inventoryResponse.data

        if (warehouseBody.success === false) {
          throw new Error(warehouseBody.message || 'Unable to load warehouses.')
        }

        if (inventoryBody.success === false) {
          throw new Error(inventoryBody.message || 'Unable to load product information.')
        }

        const warehousePayload = warehouseBody.warehouses ?? warehouseBody.data?.warehouses ?? warehouseBody.data

        const warehouseList = Array.isArray(warehousePayload) ? warehousePayload : []

        const inventory = inventoryBody.inventory ?? inventoryBody.data?.inventory ?? inventoryBody.data

        if (!inventory || !inventory._id) {
          throw new Error('Product not found.')
        }

        if (active) {
          setWarehouses(warehouseList)
          setProduct(inventory)

          if (warehouseList.length > 0) {
            setWarehouseId(String(warehouseList[0]._id))
          }
        }
      } catch (error) {
        if (active) {
          setApiError(error.response?.data?.message || error.message || 'Unable to load inventory information.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadInitialData()

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
      if (!/^\d*\.?\d*$/.test(value)) return
    }

    if (field === 'reason' && value.length > 250) return
    if (field === 'reference' && value.length > 100) return

    if (field === 'quantity') setQuantity(value)
    if (field === 'reason') setReason(value)
    if (field === 'reference') setReference(value)

    setErrors((current) => ({
      ...current,
      [field]: '',
    }))

    setApiError('')
  }

  const inventoryProduct = product?.productId && typeof product.productId === 'object' ? product.productId : product?.product && typeof product.product === 'object' ? product.product : product

  const productName = inventoryProduct?.name || inventoryProduct?.productName || 'Product'

  const sku = inventoryProduct?.sku || '—'

  const categoryName = inventoryProduct?.categoryId?.name || inventoryProduct?.categoryName || inventoryProduct?.category?.name || 'Uncategorized'

  const unit = inventoryProduct?.unit || 'Piece'

  const warehouseStock = Array.isArray(product?.warehouseStock) ? product.warehouseStock : []

  const selectedWarehouse = warehouses.find((warehouse) => String(warehouse._id) === String(warehouseId))

  const selectedStock = warehouseStock.find((stock) => String(stock.warehouseId?._id || stock.warehouseId || '') === String(warehouseId))

  const currentStock = Number(selectedStock?.currentStock ?? 0)
  const reservedStock = Number(selectedStock?.reservedStock ?? 0)
  const availableStock = Number(selectedStock?.availableStock ?? Math.max(0, currentStock - reservedStock))

  const totalCurrentStock = Number(product?.currentStock ?? 0)
  const totalReservedStock = Number(product?.reservedStock ?? 0)
  const totalAvailableStock = Number(product?.availableStock ?? Math.max(0, totalCurrentStock - totalReservedStock))

  function validateForm() {
    const nextErrors = {}
    const amount = Number(quantity)

    if (!quantity.trim()) {
      nextErrors.quantity = 'Quantity is required.'
    } else if (!Number.isFinite(amount) || amount <= 0) {
      nextErrors.quantity = 'Enter a quantity greater than zero.'
    } else if (isStockOut && amount > availableStock) {
      nextErrors.quantity = `Only ${availableStock.toLocaleString('en-IN')} ${unit} ` + 'is available in this warehouse.'
    }

    if (!reason.trim()) {
      nextErrors.reason = 'Reason is required.'
    }

    if (reason.trim().length > 500) {
      nextErrors.reason = 'Reason cannot exceed 500 characters.'
    }

    if (reference.trim().length > 100) {
      nextErrors.reference = 'Reference cannot exceed 100 characters.'
    }

    if (!warehouseId) {
      nextErrors.warehouseId = 'Please select a warehouse.'
    } else if (!selectedWarehouse) {
      nextErrors.warehouseId = 'Please select a valid active warehouse.'
    }

    setErrors(nextErrors)

    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (saving || !hasFormPermission) return
    if (!validateForm()) return

    setSaving(true)
    setApiError('')

    try {
      const payload = {
        productId: id,
        warehouseId,
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
          successMessage: data.message || (isStockIn ? 'Stock added successfully.' : 'Stock removed successfully.'),
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
      <div className="min-w-0 rounded-xl border border-erp-border bg-erp-surface p-6 text-center">
        <AlertCircle size={28} className="mx-auto text-red-500" />
        <h2 className="mt-3 text-base font-semibold text-erp-text">Access Denied</h2>
        <p className="mt-2 text-sm text-erp-text-secondary">You do not have permission to perform this stock operation, or the route is invalid.</p>
        <button type="button" onClick={goBack} className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-erp-primary px-4 text-xs font-semibold text-white hover:bg-erp-primary-hover">
          <ArrowLeft size={14} />
          Back to Inventory
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-w-0 space-y-3">
        <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface">
          <div className="h-1 bg-erp-primary" />
          <div className="p-4">
            <BreadCrumb items={breadcrumbItems} />
          </div>
        </section>
        <Loading label="Loading inventory..." description="Preparing product and warehouse information..." />
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-4 text-sm">
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        <div className="h-1 bg-erp-primary" />

        <div className="flex h-[calc(100%-4px)] min-w-0 items-center justify-between gap-3 px-4 sm:px-5">
          <div className="min-w-0 flex-1 overflow-hidden">
            <BreadCrumb items={breadcrumbItems} />
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {/* Total Stock */}
            <div className="flex h-9 items-center gap-2 whitespace-nowrap rounded-lg border border-erp-border px-3">
              <span className="text-xs text-erp-text-secondary">Total Stock</span>
              <span className="text-sm font-bold text-erp-text">
                {totalCurrentStock.toLocaleString('en-IN')} {unit}
              </span>
            </div>

            {/* Reserved */}
            <div className="hidden h-9 items-center gap-2 whitespace-nowrap rounded-lg border border-amber-200 px-3 sm:flex">
              <span className="text-xs text-amber-600">Reserved</span>
              <span className="text-sm font-bold text-erp-text">
                {totalReservedStock.toLocaleString('en-IN')} {unit}
              </span>
            </div>

            {/* Available */}
            <div className="hidden h-9 items-center gap-2 whitespace-nowrap rounded-lg border border-emerald-200 px-3 md:flex">
              <span className="text-xs text-emerald-700">Available</span>
              <span className="text-sm font-bold text-erp-text">
                {totalAvailableStock.toLocaleString('en-IN')} {unit}
              </span>
            </div>
          </div>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <section className="min-w-0 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex items-center gap-2 border-b border-erp-border p-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${isStockIn ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>{isStockIn ? <Plus size={17} /> : <Minus size={17} />}</div>
            <div>
              <h2 className="text-sm font-bold text-erp-text">{isStockIn ? 'Add Stock' : 'Remove Stock'}</h2>
              <p className="text-[11px] text-erp-text-secondary">{isStockIn ? 'Record incoming stock.' : 'Issue stock from the selected warehouse.'}</p>
            </div>
          </div>

          <div className="space-y-4 p-3 sm:p-4">
            <div className="space-y-1.5">
              <label htmlFor="stock-warehouse" className={labelClass}>
                Warehouse <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Boxes size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-erp-text-muted" />
                <select
                  id="stock-warehouse"
                  value={warehouseId}
                  onChange={(event) => {
                    setWarehouseId(event.target.value)
                    setErrors((current) => ({
                      ...current,
                      warehouseId: '',
                      quantity: '',
                    }))
                    setApiError('')
                  }}
                  disabled={saving}
                  className={`${inputClass('warehouseId')} pl-9`}
                >
                  <option value="">Select warehouse</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse._id} value={warehouse._id}>
                      {warehouse.name || warehouse.warehouseName}
                      {warehouse.code ? ` (${warehouse.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              {errorText('warehouseId')}

              {warehouseId && (
                <p className="text-[11px] text-erp-text-secondary">
                  Warehouse stock: {currentStock.toLocaleString('en-IN')} {unit}
                  {' · '}Available: {availableStock.toLocaleString('en-IN')} {unit}
                </p>
              )}

              {isStockOut && warehouseId && availableStock <= 0 && <p className="text-[11px] text-red-600">No available stock in this warehouse.</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="stock-quantity" className={labelClass}>
                Quantity <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="stock-quantity"
                  type="number"
                  min="0.001"
                  step="any"
                  value={quantity}
                  onChange={(event) => updateField('quantity', event.target.value)}
                  placeholder="Enter quantity"
                  disabled={saving}
                  className={`${inputClass('quantity')} pr-16`}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-erp-text-muted">{unit}</span>
              </div>
              {errorText('quantity')}
              {isStockOut && (
                <p className="text-[11px] text-erp-text-secondary">
                  Maximum available: {availableStock.toLocaleString('en-IN')} {unit}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="stock-reason" className={labelClass}>
                Reason <span className="text-red-500">*</span>
              </label>
              <input
                id="stock-reason"
                value={reason}
                onChange={(event) => updateField('reason', event.target.value)}
                maxLength={250}
                placeholder={isStockIn ? 'e.g. Purchase received' : 'e.g. Damaged goods or sales issue'}
                disabled={saving}
                className={inputClass('reason')}
              />
              {errorText('reason')}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="stock-reference" className={labelClass}>
                Reference
              </label>
              <div className="relative">
                <FileText size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-erp-text-muted" />
                <input
                  id="stock-reference"
                  value={reference}
                  onChange={(event) => updateField('reference', event.target.value)}
                  maxLength={100}
                  placeholder="Optional reference number"
                  disabled={saving}
                  className={`${inputClass('reference')} pl-9`}
                />
              </div>
              {errorText('reference')}
            </div>

            {apiError && (
              <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                <p>{apiError}</p>
              </div>
            )}
          </div>

          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-erp-border bg-erp-hover/20 p-3">
            <button
              type="button"
              onClick={goBack}
              disabled={saving}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-erp-border bg-erp-surface px-3 text-xs font-semibold text-erp-text-secondary hover:bg-erp-hover disabled:opacity-50"
            >
              <ArrowLeft size={14} />
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || warehouses.length === 0}
              className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-60 ${isStockIn ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-orange-600 hover:bg-orange-700'}`}
            >
              {saving ? <LoaderCircle size={14} className="animate-spin" /> : isStockIn ? <Plus size={14} /> : <Minus size={14} />}
              {saving ? 'Processing...' : isStockIn ? 'Add Stock' : 'Remove Stock'}
            </button>
          </footer>
        </section>

        <section className="min-w-0 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex items-center gap-2 border-b border-erp-border p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
              <Package size={17} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-erp-text">Product Information</h2>
              <p className="text-[11px] text-erp-text-secondary">Verify the product before adjusting stock.</p>
            </div>
          </div>

          <div className="space-y-4 p-3 sm:p-4">
            <div className="space-y-1.5">
              <label className={labelClass}>Product Name</label>
              <div className="flex min-h-10 items-center rounded-lg border border-erp-border bg-erp-hover/30 px-3 py-2 text-xs font-semibold text-erp-text">{productName}</div>
            </div>

            <div className="space-y-1.5">
              <label className={labelClass}>Category</label>
              <div className="flex min-h-10 items-center rounded-lg border border-erp-border bg-erp-hover/30 px-3 py-2 text-xs text-erp-text">{categoryName}</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0 space-y-1.5">
                <label className={labelClass}>SKU</label>
                <div className="flex h-10 min-w-0 items-center gap-2 rounded-lg border border-erp-border bg-erp-hover/30 px-3 text-xs text-erp-text">
                  <Hash size={14} className="shrink-0 text-erp-text-muted" />
                  <span className="truncate">{sku}</span>
                </div>
              </div>
              <div className="min-w-0 space-y-1.5">
                <label className={labelClass}>Unit</label>
                <div className="flex h-10 items-center rounded-lg border border-erp-border bg-erp-hover/30 px-3 text-xs text-erp-text">{unit}</div>
              </div>
            </div>

            <div className="rounded-lg border border-erp-border p-3">
              <h3 className="mb-3 text-xs font-bold text-erp-text">Selected Warehouse Stock</h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Current', value: currentStock },
                  { label: 'Reserved', value: reservedStock },
                  { label: 'Available', value: availableStock },
                ].map((stat) => (
                  <div key={stat.label} className="min-w-0">
                    <p className="text-[10px] text-erp-text-secondary">{stat.label}</p>
                    <p className="mt-1 break-words text-sm font-bold text-erp-text">{stat.value.toLocaleString('en-IN')}</p>
                    <p className="text-[10px] text-erp-text-muted">{unit}</p>
                  </div>
                ))}
              </div>
              {!selectedStock && warehouseId && <p className="mt-3 text-[11px] text-erp-text-secondary">No existing stock record for this warehouse. Stock In can create one.</p>}
            </div>

            <button
              type="button"
              onClick={openStockHistory}
              className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-erp-border px-3 text-xs font-semibold text-erp-text hover:border-erp-primary hover:bg-erp-primary/5 hover:text-erp-primary"
            >
              <History size={14} />
              View Stock History
            </button>
          </div>
        </section>
      </form>
    </div>
  )
}
