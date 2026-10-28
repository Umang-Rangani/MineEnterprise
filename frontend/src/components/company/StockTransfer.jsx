import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowLeftRight, ArrowRight, Package, Warehouse, FileText, Hash, Boxes, LoaderCircle, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import Loading from '../Loading/Loading'

function getResponseList(responseData, keys) {
  for (const key of keys) {
    if (Array.isArray(responseData?.[key])) return responseData[key]
    if (Array.isArray(responseData?.data?.[key])) return responseData.data[key]
  }

  if (Array.isArray(responseData?.data)) return responseData.data
  if (Array.isArray(responseData)) return responseData

  return []
}

function getId(value) {
  if (value && typeof value === 'object') return String(value._id || value.id || '')
  return String(value || '')
}

function getProductIdFromState(state) {
  const value = state?.productId ?? state?._id ?? state?.product?._id ?? ''
  return getId(value)
}

function getStockWarehouseId(stock) {
  return getId(stock?.warehouseId ?? stock?.warehouse?._id ?? stock?.warehouse)
}

function normalizeStock(stock) {
  if (!stock) {
    return {
      currentStock: 0,
      reservedStock: 0,
      availableStock: 0,
      exists: false,
    }
  }

  const currentStock = Number(stock.currentStock ?? stock.stock ?? 0)
  const reservedStock = Number(stock.reservedStock ?? 0)
  const availableStock = Number(stock.availableStock ?? Math.max(0, currentStock - reservedStock))

  return {
    ...stock,
    currentStock,
    reservedStock,
    availableStock,
    exists: true,
  }
}

export default function StockTransfer() {
  const navigate = useNavigate()
  const location = useLocation()
  const selectedProduct = location.state || {}

  const [warehouses, setWarehouses] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [stockLoading, setStockLoading] = useState(false)
  const [apiError, setApiError] = useState('')
  const [toast, setToast] = useState(null)
  const [transferResult, setTransferResult] = useState(null)
  const [productInventory, setProductInventory] = useState(null)
  const [stockError, setStockError] = useState('')
  const [errors, setErrors] = useState({})

  const [form, setForm] = useState({
    productId: getProductIdFromState(selectedProduct),
    sourceWarehouseId: '',
    destinationWarehouseId: '',
    quantity: '',
    reason: '',
    reference: '',
  })

  const breadcrumbItems = [
    { title: 'Inventory', link: '/company/inventory' },
    { title: 'Stock Transfer', link: null },
  ]

  const activeWarehouses = useMemo(() => warehouses.filter((warehouse) => !warehouse.status || String(warehouse.status).toLowerCase() === 'active'), [warehouses])

  const selectedProductData = useMemo(() => {
    const selectedId = getId(form.productId)
    return (
      products.find((product) => getId(product._id) === selectedId) ||
      (getId(selectedProduct?._id ?? selectedProduct?.productId) ? (selectedProduct?.productId && typeof selectedProduct.productId === 'object' ? selectedProduct.productId : selectedProduct) : null)
    )
  }, [products, form.productId, selectedProduct])

  const productName = selectedProductData?.name || selectedProductData?.productName || selectedProductData?.product?.name || 'No product available'
  const sku = selectedProductData?.sku || '—'
  const unit = selectedProductData?.unit || 'Piece'
  const categoryName = selectedProductData?.categoryId?.name || selectedProductData?.category?.name || selectedProductData?.categoryName || 'Uncategorized'

  const sourceWarehouse = activeWarehouses.find((warehouse) => getId(warehouse._id) === getId(form.sourceWarehouseId))
  const destinationWarehouse = activeWarehouses.find((warehouse) => getId(warehouse._id) === getId(form.destinationWarehouseId))

  const warehouseStockRows = Array.isArray(productInventory?.warehouseStock)
    ? productInventory.warehouseStock
    : Array.isArray(productInventory?.warehouseStocks)
      ? productInventory.warehouseStocks
      : Array.isArray(productInventory?.warehouses)
        ? productInventory.warehouses
        : []

  function findStockForWarehouse(warehouseId) {
    const stock = warehouseStockRows.find((item) => getStockWarehouseId(item) === getId(warehouseId))
    return normalizeStock(stock)
  }

  const sourceInventory = findStockForWarehouse(form.sourceWarehouseId)
  const destinationInventory = findStockForWarehouse(form.destinationWarehouseId)

  const sourceCurrentStock = sourceInventory.currentStock
  const sourceReservedStock = sourceInventory.reservedStock
  const sourceAvailableStock = sourceInventory.availableStock
  const destinationCurrentStock = destinationInventory.currentStock
  const destinationReservedStock = destinationInventory.reservedStock
  const destinationAvailableStock = destinationInventory.availableStock

  const parsedQuantity = Number(form.quantity)
  const validQuantity = form.quantity.trim() !== '' && Number.isFinite(parsedQuantity) && parsedQuantity > 0
  const canUseStock = Boolean(form.productId) && Boolean(form.sourceWarehouseId) && Boolean(form.destinationWarehouseId) && !stockLoading && !stockError && Boolean(productInventory)

  const inputClass = (field) =>
    `h-10 w-full rounded-lg border bg-erp-surface px-3 text-xs text-erp-text outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10 disabled:cursor-not-allowed disabled:opacity-60 ${
      errors[field] ? 'border-red-400' : 'border-erp-border'
    }`

  const labelClass = 'block text-xs font-semibold text-erp-text-secondary'

  function errorText(field) {
    return errors[field] ? <p className="text-[11px] text-red-600">{errors[field]}</p> : null
  }

  useEffect(() => {
    document.title = 'Stock Transfer | MineERP'
    loadData()
    // Load initial product and warehouse defaults once when this page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!form.productId) {
      setProductInventory(null)
      setStockError('')
      setStockLoading(false)
      return
    }

    loadProductInventory(form.productId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.productId])

  async function loadData() {
    setLoading(true)
    setApiError('')

    try {
      const [warehouseResponse, productResponse] = await Promise.all([axiosInstance.get('/erp/warehouses', { params: { status: 'Active' } }), axiosInstance.get('/erp/products')])

      const warehouseList = getResponseList(warehouseResponse.data, ['warehouses', 'items'])
      const productList = getResponseList(productResponse.data, ['products', 'items'])

      const activeList = warehouseList.filter((warehouse) => !warehouse.status || String(warehouse.status).toLowerCase() === 'active')

      setWarehouses(activeList)
      setProducts(productList)

      const preferredProductId = getProductIdFromState(selectedProduct)
      const chosenProduct = productList.find((product) => getId(product._id) === preferredProductId) || productList[0]

      const sourceId = activeList[0]?._id || ''
      const destinationId = activeList.find((warehouse) => getId(warehouse._id) !== getId(sourceId))?._id || ''

      setForm((current) => ({
        ...current,
        productId: chosenProduct?._id || '',
        sourceWarehouseId: sourceId,
        destinationWarehouseId: destinationId,
      }))

      if (!productList.length) {
        setApiError('No products found. Create a product before transferring stock.')
      } else if (activeList.length < 2) {
        setApiError('Stock transfer requires at least two active warehouses.')
      }
    } catch (error) {
      setApiError(error.response?.data?.message || error.message || 'Unable to load warehouse and product information.')
    } finally {
      setLoading(false)
    }
  }

  async function loadProductInventory(productId) {
    setStockLoading(true)
    setStockError('')
    setProductInventory(null)

    try {
      const response = await axiosInstance.get(`/erp/inventory/${productId}`)
      const body = response.data
      const product = body?.inventory ?? body?.data?.inventory ?? body?.data?.product ?? body?.data ?? body

      if (!product || typeof product !== 'object') {
        throw new Error('Inventory details were not returned by the server.')
      }

      setProductInventory(product)
    } catch (error) {
      setProductInventory(null)
      setStockError(error.response?.data?.message || error.message || 'Unable to load product warehouse stock.')
    } finally {
      setStockLoading(false)
    }
  }

  async function refreshStock() {
    if (form.productId) await loadProductInventory(form.productId)
  }

  function updateField(field, value) {
    if (field === 'quantity' && value !== '') {
      const number = Number(value)
      if (!Number.isFinite(number) || number < 0) return
    }

    if (field === 'reason' && value.length > 250) return
    if (field === 'reference' && value.length > 100) return

    setForm((current) => {
      const updated = { ...current, [field]: value }

      if (field === 'sourceWarehouseId' && value === current.destinationWarehouseId) {
        updated.destinationWarehouseId = activeWarehouses.find((warehouse) => getId(warehouse._id) !== getId(value))?._id || ''
      }

      return updated
    })

    setErrors((current) => ({ ...current, [field]: '' }))
    setApiError('')
    setTransferResult(null)
    setToast(null)
  }

  function validateForm() {
    const nextErrors = {}
    const quantity = Number(form.quantity)
    const reason = form.reason.trim()

    if (!form.productId) nextErrors.productId = 'No product is available.'
    if (!form.sourceWarehouseId) {
      nextErrors.sourceWarehouseId = 'Please select a source warehouse.'
    }
    if (!form.destinationWarehouseId) {
      nextErrors.destinationWarehouseId = 'Please select a destination warehouse.'
    }
    if (form.sourceWarehouseId && form.destinationWarehouseId && getId(form.sourceWarehouseId) === getId(form.destinationWarehouseId)) {
      nextErrors.destinationWarehouseId = 'Source and destination warehouses must be different.'
    }

    if (stockLoading) {
      nextErrors.quantity = 'Wait until warehouse stock finishes loading.'
    } else if (stockError || !productInventory) {
      nextErrors.quantity = 'Warehouse stock could not be verified. Refresh and try again.'
    } else if (!sourceInventory.exists) {
      nextErrors.quantity = 'This product has no stock record in the source warehouse.'
    }

    if (form.quantity.trim() === '') {
      nextErrors.quantity = 'Quantity is required.'
    } else if (!Number.isFinite(quantity) || quantity <= 0) {
      nextErrors.quantity = 'Enter a quantity greater than zero.'
    } else if (quantity > sourceAvailableStock) {
      nextErrors.quantity = 'Quantity cannot exceed available source stock.'
    }

    if (!reason) nextErrors.reason = 'Transfer reason is required.'
    if (form.reference.trim().length > 100) {
      nextErrors.reference = 'Reference cannot exceed 100 characters.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (saving || !validateForm()) return

    setSaving(true)
    setApiError('')
    setToast(null)
    setTransferResult(null)

    try {
      const response = await axiosInstance.post('/erp/inventory/stock-transfer', {
        productId: form.productId,
        sourceWarehouseId: form.sourceWarehouseId,
        destinationWarehouseId: form.destinationWarehouseId,
        quantity: Number(form.quantity),
        reason: form.reason.trim(),
        reference: form.reference.trim(),
      })

      const body = response.data

      if (body?.success === false) {
        throw new Error(body.message || 'Unable to transfer stock.')
      }

      const result = body?.data ?? body

      navigate(`/company/inventory/${form.productId}/history`, {
        replace: true,
        state: {
          productId: form.productId,
          transferResult: result,
        },
      })
    } catch (error) {
      setApiError(error.response?.data?.message || error.message || 'Unable to transfer stock.')
    } finally {
      setSaving(false)
    }
  }

  function goBack() {
    navigate('/company/inventory')
  }

  function openHistory() {
    if (!form.productId) return
    navigate(`/company/inventory/${form.productId}/history`, {
      state: { warehouseId: form.sourceWarehouseId },
    })
  }

  const stockStats = [
    {
      label: 'Source Available',
      value: sourceAvailableStock,
      color: 'text-emerald-700',
      background: 'bg-emerald-50',
    },
    {
      label: 'Destination Stock',
      value: destinationCurrentStock,
      color: 'text-erp-text',
      background: 'bg-erp-hover/40',
    },
  ]

  if (loading) {
    return (
      <div className="min-w-0 space-y-3">
        <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card h-17">
          <div className="h-1 bg-erp-primary" />
          <div className="flex items-center px-4 py-3 sm:px-5">
            <BreadCrumb items={breadcrumbItems} />
          </div>
        </section>
        <Loading label="Loading stock transfer..." description="Preparing product and warehouse information..." />
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-4 text-sm">
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        <div className="h-1 bg-erp-primary" />
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <div className="min-w-0 flex-1">
            <BreadCrumb items={breadcrumbItems} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {stockStats.map((stat) => (
              <div key={stat.label} className={`flex h-9 items-center gap-2 whitespace-nowrap rounded-lg border border-erp-border px-3 ${stat.background}`}>
                <span className="text-[10px] font-medium text-erp-text-secondary">{stat.label}</span>
                <span className={`text-xs font-bold ${stat.color}`}>
                  {Number(stat.value).toLocaleString('en-IN')}
                  <span className="ml-1 text-[9px] font-medium text-erp-text-secondary">{unit}</span>
                </span>
              </div>
            ))}
            <button
              type="button"
              onClick={refreshStock}
              disabled={stockLoading || !form.productId}
              title="Refresh stock"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-erp-border text-erp-text-secondary transition hover:bg-erp-hover disabled:opacity-50"
            >
              <RefreshCw size={14} className={stockLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </section>

      {apiError && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <p>{apiError}</p>
        </div>
      )}

      {stockError && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <p>{stockError}</p>
        </div>
      )}

      {transferResult && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <div className="flex items-start gap-2">
            <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-600" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-emerald-800">Stock transfer completed successfully.</p>
              <p className="mt-1 text-[11px] text-emerald-700">
                {Number(transferResult.quantity || 0).toLocaleString('en-IN')} {unit} transferred from {transferResult.source?.warehouseName || sourceWarehouse?.name || sourceWarehouse?.warehouseName || 'source warehouse'} to{' '}
                {transferResult.destination?.warehouseName || destinationWarehouse?.name || destinationWarehouse?.warehouseName || 'destination warehouse'}.
              </p>
              {transferResult.reference && <p className="mt-1 text-[11px] text-emerald-700">Reference: {transferResult.reference}</p>}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <section className="min-w-0 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex items-center gap-2 border-b border-erp-border px-3 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
              <ArrowLeftRight size={16} />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-erp-text">Transfer Stock</h2>
              <p className="text-[11px] text-erp-text-secondary">Move stock between two warehouses.</p>
            </div>
          </div>

          <div className="space-y-4 p-3 sm:p-4">
            <div className="min-w-0 space-y-1.5">
              <label className={labelClass}>Product</label>
              <div className="flex min-h-10 items-center justify-between gap-3 rounded-lg border border-erp-border bg-erp-hover/30 px-3 py-2">
                <div className="min-w-0">
                  <p className="break-words text-xs font-semibold text-erp-text">{productName}</p>
                  <p className="mt-1 text-[10px] text-erp-text-secondary">SKU: {sku}</p>
                </div>
                <Package size={16} className="shrink-0 text-erp-primary" />
              </div>
              {errorText('productId')}
              {products.length === 0 && <p className="text-[11px] text-amber-600">No products found. Create a product before transferring stock.</p>}
            </div>

            <div className="min-w-0 space-y-1.5">
              <label htmlFor="source-warehouse" className={labelClass}>
                Source Warehouse <span className="text-erp-danger">*</span>
              </label>
              <div className="relative">
                <Warehouse size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-erp-text-muted" />
                <select id="source-warehouse" required value={form.sourceWarehouseId} onChange={(event) => updateField('sourceWarehouseId', event.target.value)} disabled={saving} className={`${inputClass('sourceWarehouseId')} pl-9`}>
                  <option value="">Select source warehouse</option>
                  {activeWarehouses.map((warehouse) => (
                    <option key={warehouse._id} value={warehouse._id}>
                      {warehouse.name || warehouse.warehouseName || 'Unnamed warehouse'}
                    </option>
                  ))}
                </select>
              </div>
              {errorText('sourceWarehouseId')}
            </div>

            <div className="min-w-0 space-y-1.5">
              <label htmlFor="destination-warehouse" className={labelClass}>
                Destination Warehouse <span className="text-erp-danger">*</span>
              </label>
              <div className="relative">
                <Warehouse size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-erp-text-muted" />
                <select
                  id="destination-warehouse"
                  required
                  value={form.destinationWarehouseId}
                  onChange={(event) => updateField('destinationWarehouseId', event.target.value)}
                  disabled={saving}
                  className={`${inputClass('destinationWarehouseId')} pl-9`}
                >
                  <option value="">Select destination warehouse</option>
                  {activeWarehouses
                    .filter((warehouse) => getId(warehouse._id) !== getId(form.sourceWarehouseId))
                    .map((warehouse) => (
                      <option key={warehouse._id} value={warehouse._id}>
                        {warehouse.name || warehouse.warehouseName || 'Unnamed warehouse'}
                      </option>
                    ))}
                </select>
              </div>
              {errorText('destinationWarehouseId')}
            </div>

            <div className="min-w-0 space-y-1.5">
              <label htmlFor="transfer-quantity" className={labelClass}>
                Transfer Quantity <span className="text-erp-danger">*</span>
              </label>
              <div className="relative">
                <input
                  id="transfer-quantity"
                  type="number"
                  min="0.001"
                  step="any"
                  required
                  value={form.quantity}
                  onChange={(event) => updateField('quantity', event.target.value)}
                  placeholder="Enter transfer quantity"
                  disabled={saving || stockLoading || Boolean(stockError)}
                  className={`${inputClass('quantity')} pr-16`}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-erp-text-muted">{unit}</span>
              </div>
              {errorText('quantity')}
              <p className="text-[10px] text-erp-text-muted">
                Available in source warehouse: {stockLoading ? 'Loading...' : Number(sourceAvailableStock).toLocaleString('en-IN')} {unit}
              </p>
            </div>

            <div className="min-w-0 space-y-1.5">
              <label htmlFor="transfer-reason" className={labelClass}>
                Reason <span className="text-erp-danger">*</span>
              </label>
              <input
                id="transfer-reason"
                type="text"
                required
                maxLength={250}
                value={form.reason}
                onChange={(event) => updateField('reason', event.target.value)}
                placeholder="e.g. Rebalancing warehouse stock"
                disabled={saving}
                className={inputClass('reason')}
              />
              {errorText('reason')}
            </div>

            <div className="min-w-0 space-y-1.5">
              <label htmlFor="transfer-reference" className={labelClass}>
                Reference <span className="text-[10px] font-normal">(optional)</span>
              </label>
              <div className="relative">
                <FileText size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-erp-text-muted" />
                <input
                  id="transfer-reference"
                  type="text"
                  maxLength={100}
                  value={form.reference}
                  onChange={(event) => updateField('reference', event.target.value)}
                  placeholder="Optional transfer reference"
                  disabled={saving}
                  className={`${inputClass('reference')} pl-9`}
                />
              </div>
              {errorText('reference')}
            </div>
          </div>

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
              disabled={saving || stockLoading || Boolean(stockError) || !productInventory || !form.productId || activeWarehouses.length < 2 || !sourceInventory.exists}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-erp-primary px-4 text-xs font-bold text-white transition hover:bg-erp-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <LoaderCircle size={14} className="animate-spin" /> : <ArrowLeftRight size={14} />}
              {saving ? 'Transferring...' : 'Transfer Stock'}
            </button>
          </footer>
        </section>

        <div className="min-w-0 space-y-4">
          <section className="min-w-0 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
            <div className="flex items-center gap-2 border-b border-erp-border px-3 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
                <Package size={16} />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-erp-text">Product Information</h2>
                <p className="text-[11px] text-erp-text-secondary">Product is selected automatically and cannot be changed here.</p>
              </div>
            </div>
            <div className="space-y-4 p-3 sm:p-4">
              <div className="min-w-0 space-y-1.5">
                <label className={labelClass}>Product Name</label>
                <div className="flex min-h-10 items-center rounded-lg border border-erp-border bg-erp-hover/30 px-3 py-2 text-xs font-semibold text-erp-text">
                  <span className="break-words">{productName}</span>
                </div>
              </div>
              <div className="min-w-0 space-y-1.5">
                <label className={labelClass}>Category</label>
                <div className="flex min-h-10 items-center rounded-lg border border-erp-border bg-erp-hover/30 px-3 py-2 text-xs text-erp-text">
                  <span className="break-words">{categoryName}</span>
                </div>
              </div>
              <div className="flex min-w-0 gap-5">
                <div className="w-full min-w-0 space-y-1.5">
                  <label className={labelClass}>SKU</label>
                  <div className="flex h-10 items-center gap-2 rounded-lg border border-erp-border bg-erp-hover/30 px-3 text-xs text-erp-text">
                    <Hash size={14} className="shrink-0 text-erp-text-muted" />
                    <span className="truncate">{sku}</span>
                  </div>
                </div>
                <div className="w-full min-w-0 space-y-1.5">
                  <label className={labelClass}>Unit</label>
                  <div className="flex h-10 items-center rounded-lg border border-erp-border bg-erp-hover/30 px-3 text-xs text-erp-text">{unit}</div>
                </div>
              </div>
            </div>
          </section>

          <section className="min-w-0 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
            <div className="flex items-center gap-2 border-b border-erp-border px-3 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Boxes size={16} />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-erp-text">Warehouse Stock Information</h2>
                <p className="text-[11px] text-erp-text-secondary">Stock values refresh after a successful transfer.</p>
              </div>
            </div>

            <div className="space-y-3 p-3 sm:p-4">
              <div className="rounded-lg border border-erp-border p-3">
                <div className="flex items-start gap-2">
                  <Warehouse size={15} className="mt-0.5 shrink-0 text-erp-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold text-erp-text-secondary">SOURCE WAREHOUSE</p>
                    <p className="mt-1 break-words text-xs font-bold text-erp-text">{sourceWarehouse?.name || sourceWarehouse?.warehouseName || 'Not selected'}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-erp-hover/40 p-2">
                    <p className="text-[10px] text-erp-text-secondary">Current Stock</p>
                    <p className="mt-1 text-sm font-bold text-erp-text">{stockLoading ? '…' : sourceCurrentStock.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-2">
                    <p className="text-[10px] text-emerald-700">Available Stock</p>
                    <p className="mt-1 text-sm font-bold text-emerald-700">{stockLoading ? '…' : sourceAvailableStock.toLocaleString('en-IN')}</p>
                  </div>
                </div>
                {sourceInventory.exists && (
                  <p className="mt-2 text-[10px] text-erp-text-muted">
                    Reserved: {sourceReservedStock.toLocaleString('en-IN')} {unit}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-center gap-3 py-1 text-erp-primary">
                <div className="h-px flex-1 bg-erp-border" />
                <ArrowRight size={18} />
                <span className="text-[10px] font-bold uppercase tracking-wide">Transfer Direction</span>
                <ArrowRight size={18} />
                <div className="h-px flex-1 bg-erp-border" />
              </div>

              <div className="rounded-lg border border-erp-border p-3">
                <div className="flex items-start gap-2">
                  <Warehouse size={15} className="mt-0.5 shrink-0 text-emerald-600" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold text-erp-text-secondary">DESTINATION WAREHOUSE</p>
                    <p className="mt-1 break-words text-xs font-bold text-erp-text">{destinationWarehouse?.name || destinationWarehouse?.warehouseName || 'Not selected'}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-erp-hover/40 p-2">
                    <p className="text-[10px] text-erp-text-secondary">Current Stock</p>
                    <p className="mt-1 text-sm font-bold text-erp-text">{stockLoading ? '…' : destinationCurrentStock.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-2">
                    <p className="text-[10px] text-emerald-700">After Transfer</p>
                    <p className="mt-1 text-sm font-bold text-emerald-700">{stockLoading ? '…' : (destinationCurrentStock + (validQuantity ? parsedQuantity : 0)).toLocaleString('en-IN')}</p>
                  </div>
                </div>
                {destinationInventory.exists && (
                  <p className="mt-2 text-[10px] text-erp-text-muted">
                    Reserved: {destinationReservedStock.toLocaleString('en-IN')} {unit}
                  </p>
                )}
              </div>

              {validQuantity && (
                <div className="rounded-lg border border-erp-primary/20 bg-erp-primary/5 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-erp-primary">Transfer Preview</p>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] text-erp-text-secondary">Source after transfer</p>
                      <p className="mt-1 text-sm font-bold text-erp-text">
                        {Math.max(0, sourceCurrentStock - parsedQuantity).toLocaleString('en-IN')} {unit}
                      </p>
                      <p className="mt-1 text-[10px] text-erp-text-secondary">
                        Available after: {Math.max(0, sourceAvailableStock - parsedQuantity).toLocaleString('en-IN')} {unit}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-erp-text-secondary">Destination after transfer</p>
                      <p className="mt-1 text-sm font-bold text-emerald-700">
                        {(destinationCurrentStock + parsedQuantity).toLocaleString('en-IN')} {unit}
                      </p>
                    </div>
                  </div>
                  {parsedQuantity > sourceAvailableStock && <p className="mt-2 text-[10px] font-medium text-red-600">Transfer quantity exceeds available source stock.</p>}
                </div>
              )}

              <button
                type="button"
                onClick={openHistory}
                disabled={!form.productId}
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-erp-border px-3 text-xs font-semibold text-erp-text transition hover:border-erp-primary hover:bg-erp-primary/5 hover:text-erp-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FileText size={14} />
                View Product Stock History
              </button>
            </div>
          </section>
        </div>
      </form>

      {activeWarehouses.length < 2 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <p>Stock transfer requires at least two active warehouses in your company.</p>
        </div>
      )}
    </div>
  )
}
