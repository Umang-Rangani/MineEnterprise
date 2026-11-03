import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ShoppingCart, UserRound, Package, Plus, Trash2, Save, LoaderCircle, Info, FileText, Calculator, RefreshCw } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import Loading from '../Loading/Loading'
import { hasPermission, useAuth } from '../../context/AuthContext'

const getLocalDate = () => {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const initialForm = {
  customerId: '',
  warehouseId: '',
  orderDate: getLocalDate(),
  expectedDeliveryDate: '',
  notes: '',
  amendmentReason: '',
}

const emptyItem = () => ({
  productId: '',
  quantity: '1',
  rate: '0',
  discount: '0',
  taxRate: '0',
})

const getArray = (response) => {
  const data = response?.data

  if (Array.isArray(data)) return data
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.customers)) return data.customers
  if (Array.isArray(data?.products)) return data.products
  if (Array.isArray(data?.warehouses)) return data.warehouses

  return []
}

const getOrder = (response) => {
  const data = response?.data

  return data?.order || data?.salesOrder || data?.data?.order || data?.data || data
}

const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100

export default function SalesOrderForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const { permissions } = useAuth()

  const canCreate = hasPermission(permissions, 'sales:create')
  const canUpdate = hasPermission(permissions, 'sales:update')
  const canSubmit = isEdit ? canUpdate : canCreate

  const [form, setForm] = useState(initialForm)
  const [items, setItems] = useState([emptyItem()])

  const [customers, setCustomers] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [products, setProducts] = useState([])

  const [loading, setLoading] = useState(isEdit)
  const [hasLoaded, setHasLoaded] = useState(!isEdit)
  const [loadError, setLoadError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [retryKey, setRetryKey] = useState(0)
  const [fieldErrors, setFieldErrors] = useState({})

  const [originalStatus, setOriginalStatus] = useState('Draft')
  const [dispatchExists, setDispatchExists] = useState(false)

  // Order status logic
  const isCancelledOrder = isEdit && originalStatus === 'Cancelled'

  const isAmendment = isEdit && ['Approved', 'Partially Dispatched'].includes(originalStatus)

  // Cancelled orders can be edited and saved as Draft.
  // Fully dispatched orders remain locked.
  const isLocked = isEdit && originalStatus === 'Dispatched'

  // Protect dispatched product quantities for both amendments
  // and previously cancelled orders.
  const hasDispatchedItems = isAmendment || isCancelledOrder

  const showAmendmentSection = isAmendment

  const showCancelledNotice = isCancelledOrder

  const showDispatchWarning = hasDispatchedItems && dispatchExists

  const showSaveAsDraftMessage = isCancelledOrder

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
    document.title = isEdit ? 'Edit Sales Order | MineERP' : 'Create Sales Order | MineERP'
  }, [isEdit])

  useEffect(() => {
    let cancelled = false

    const loadFormData = async () => {
      setLoading(true)
      setLoadError(false)

      try {
        const requests = await Promise.all([axiosInstance.get('/erp/customers'), axiosInstance.get('/erp/warehouses'), axiosInstance.get('/erp/products')])

        if (cancelled) return

        setCustomers(getArray(requests[0]))
        setWarehouses(getArray(requests[1]))
        setProducts(getArray(requests[2]))

        if (isEdit) {
          const response = await axiosInstance.get(`/erp/sales/${id}`)

          if (cancelled) return

          const order = getOrder(response)

          if (!order?._id) {
            throw new Error('Sales order details were not found.')
          }

          const orderItems = Array.isArray(order.items) ? order.items : []

          setOriginalStatus(order.status || 'Draft')

          setDispatchExists(orderItems.some((item) => Number(item.dispatchedQuantity || 0) > 0))

          setForm({
            customerId: order.customerId?._id || order.customerId || '',
            warehouseId: order.warehouseId?._id || order.warehouseId || '',
            orderDate: order.orderDate ? new Date(order.orderDate).toISOString().slice(0, 10) : initialForm.orderDate,
            expectedDeliveryDate: order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toISOString().slice(0, 10) : '',
            notes: order.notes || '',
            amendmentReason: '',
          })

          setItems(
            orderItems.length
              ? orderItems.map((item) => ({
                  _id: item._id,
                  productId: item.productId?._id || item.productId || '',
                  quantity: String(item.quantity ?? 1),
                  rate: String(item.rate ?? 0),
                  discount: String(item.discount ?? 0),
                  taxRate: String(item.taxRate ?? 0),
                  productName: item.productName || '',
                  sku: item.sku || '',
                  unit: item.unit || '',
                  dispatchedQuantity: Number(item.dispatchedQuantity || 0),
                }))
              : [emptyItem()],
          )
        }

        setHasLoaded(true)
      } catch (error) {
        if (!cancelled) {
          setLoadError(true)

          showToast('error', error.response?.data?.message || error.message || 'Unable to load sales order form data.', 5000)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadFormData()

    return () => {
      cancelled = true
    }
  }, [id, isEdit, retryKey])

  const updateFormField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))

    setFieldErrors((current) => ({
      ...current,
      [field]: '',
    }))
  }

  const updateItem = (index, field, value) => {
    setItems((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)))

    setFieldErrors((current) => ({
      ...current,
      [`item_${index}_${field}`]: '',
    }))
  }

  const selectProduct = (index, productId) => {
    const product = products.find((item) => String(item._id) === String(productId))

    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              productId,
              rate: String(product?.sellingPrice ?? 0),
              taxRate: String(product?.taxRate ?? 0),
            }
          : item,
      ),
    )

    setFieldErrors((current) => ({
      ...current,
      [`item_${index}_productId`]: '',
    }))
  }

  const addItem = () => {
    setItems((current) => [...current, emptyItem()])
  }

  const removeItem = (index) => {
    const item = items[index]

    const dispatched = Number(item.dispatchedQuantity || 0)

    if (hasDispatchedItems && dispatched > 0) {
      showToast('warning', 'An item with dispatched quantity cannot be removed.')
      return
    }

    if (items.length === 1) {
      showToast('warning', 'At least one product is required.')
      return
    }

    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))

    setFieldErrors({})
  }

  const getItemCalculation = (item) => {
    const quantity = Number(item.quantity) || 0
    const rate = Number(item.rate) || 0
    const discount = Number(item.discount) || 0
    const taxRate = Number(item.taxRate) || 0

    const grossAmount = quantity * rate
    const taxableAmount = Math.max(0, grossAmount - discount)
    const taxAmount = taxableAmount * (taxRate / 100)
    const lineTotal = taxableAmount + taxAmount

    return {
      grossAmount: roundMoney(grossAmount),
      taxableAmount: roundMoney(taxableAmount),
      taxAmount: roundMoney(taxAmount),
      lineTotal: roundMoney(lineTotal),
    }
  }

  const totals = items.reduce(
    (result, item) => {
      const calculation = getItemCalculation(item)

      result.subtotal += calculation.grossAmount
      result.discount += Number(item.discount) || 0
      result.taxAmount += calculation.taxAmount
      result.grandTotal += calculation.lineTotal

      return result
    },
    {
      subtotal: 0,
      discount: 0,
      taxAmount: 0,
      grandTotal: 0,
    },
  )

  const finalTotals = {
    subtotal: roundMoney(totals.subtotal),
    discount: roundMoney(totals.discount),
    taxAmount: roundMoney(totals.taxAmount),
    grandTotal: roundMoney(totals.grandTotal),
  }

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(Number(amount) || 0)

  const validateForm = () => {
    const errors = {}

    if (!form.customerId) {
      errors.customerId = 'Please select a customer.'
    }

    if (!form.warehouseId) {
      errors.warehouseId = 'Please select a warehouse.'
    }

    if (!form.orderDate) {
      errors.orderDate = 'Order date is required.'
    }

    if (form.expectedDeliveryDate && form.expectedDeliveryDate < form.orderDate) {
      errors.expectedDeliveryDate = 'Expected delivery date cannot be before order date.'
    }

    if (isAmendment && !form.amendmentReason.trim()) {
      errors.amendmentReason = 'Amendment reason is required.'
    }

    const selectedProducts = new Set()

    items.forEach((item, index) => {
      if (!item.productId) {
        errors[`item_${index}_productId`] = 'Select a product.'
      } else if (selectedProducts.has(item.productId)) {
        errors[`item_${index}_productId`] = 'Duplicate products are not allowed.'
      } else {
        selectedProducts.add(item.productId)
      }

      const quantity = Number(item.quantity)
      const rate = Number(item.rate)
      const discount = Number(item.discount)
      const taxRate = Number(item.taxRate)
      const dispatched = Number(item.dispatchedQuantity || 0)

      if (!Number.isFinite(quantity) || quantity <= 0) {
        errors[`item_${index}_quantity`] = 'Quantity must be greater than zero.'
      } else if (hasDispatchedItems && quantity < dispatched) {
        errors[`item_${index}_quantity`] = `Quantity cannot be less than dispatched quantity (${dispatched}).`
      }

      if (!Number.isFinite(rate) || rate < 0) {
        errors[`item_${index}_rate`] = 'Enter a valid rate.'
      }

      if (!Number.isFinite(discount) || discount < 0 || discount > quantity * rate) {
        errors[`item_${index}_discount`] = 'Discount cannot exceed the gross amount.'
      }

      if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
        errors[`item_${index}_taxRate`] = 'Enter a valid tax percentage.'
      }
    })

    if (!items.length) {
      errors.items = 'At least one product is required.'
    }

    setFieldErrors(errors)

    if (Object.keys(errors).length) {
      showToast('warning', 'Please check the highlighted fields.')
      return false
    }

    return true
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!canSubmit) {
      showToast('error', `You do not have permission to ${isEdit ? 'update' : 'create'} sales orders.`)
      return
    }

    if (isLocked) {
      showToast('error', 'This sales order can no longer be edited.')
      return
    }

    if (saving) return

    if (!validateForm()) return

    const payload = {
      customerId: form.customerId,
      warehouseId: form.warehouseId,
      orderDate: form.orderDate,
      expectedDeliveryDate: form.expectedDeliveryDate || null,
      notes: form.notes.trim(),
      items: items.map((item) => ({
        ...(item._id
          ? {
              _id: item._id,
              itemId: item._id,
            }
          : {}),
        productId: item.productId,
        quantity: Number(item.quantity),
        rate: Number(item.rate),
        discount: Number(item.discount),
        taxRate: Number(item.taxRate),
      })),
    }

    // Only Approved / Partially Dispatched orders
    // require an amendment reason.
    if (isAmendment) {
      payload.amendmentReason = form.amendmentReason.trim()
    }

    setSaving(true)

    try {
      if (isEdit) {
        await axiosInstance.patch(`/erp/sales/${id}`, payload)
      } else {
        await axiosInstance.post('/erp/sales', payload)
      }

      let successMessage = 'Sales order created successfully.'

      if (isEdit) {
        if (isCancelledOrder) {
          successMessage = 'Cancelled sales order updated and moved to Draft.'
        } else if (isAmendment) {
          successMessage = 'Sales order amended successfully.'
        } else {
          successMessage = 'Sales order updated successfully.'
        }
      }

      navigate('/company/sales', {
        state: {
          message: successMessage,
        },
      })
    } catch (error) {
      showToast('error', error.response?.data?.message || `Unable to ${isEdit ? 'update' : 'create'} sales order.`, 5000)
    } finally {
      setSaving(false)
    }
  }

  const itemsBreadcrumb = isEdit
    ? [
        {
          title: 'Sales Orders',
          link: '/company/sales',
        },
        {
          title: 'Edit Sales Order',
          link: null,
        },
      ]
    : [
        {
          title: 'Sales Orders',
          link: '/company/sales',
        },
        {
          title: 'Create Sales Order',
          link: null,
        },
      ]

  const inputClass = (field) => `h-10 w-full rounded-lg border bg-white px-3 text-xs text-slate-700 outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10 ${fieldErrors[field] ? 'border-red-400' : 'border-slate-200'}`

  const labelClass = 'mb-1.5 block text-xs font-semibold text-slate-700'

  const renderError = (field) => (fieldErrors[field] ? <p className="mt-1 text-[11px] text-red-600">{fieldErrors[field]}</p> : null)

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
            <Loading fullScreen={false} label="Loading sales order" description="Fetching sales order information..." className="!h-full min-h-[400px]" />
          </div>
        </section>
      </div>
    )
  }

  if (loadError) {
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
          <ShoppingCart size={28} className="mx-auto text-slate-300" />

          <h2 className="mt-3 text-sm font-bold text-slate-800">Unable to load sales order</h2>

          <p className="mt-1 text-xs text-slate-500">Required form information could not be loaded.</p>

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

  return (
    <div className="min-w-0 space-y-4 text-sm">
      {toast && <Toast toast={toast} onClose={closeToast} />}

      {/* Header */}
      <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        <div className="h-1 bg-erp-primary" />

        <div className="flex h-[calc(100%-4px)] items-center justify-between gap-3 px-4 sm:px-5">
          <div className="min-w-0 flex-1 overflow-hidden">
            <BreadCrumb items={itemsBreadcrumb} />
          </div>

          {isEdit && <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-bold text-slate-600">{originalStatus}</span>}
        </div>
      </section>

      {/* Fully dispatched notice */}
      {isLocked && (
        <section className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <Info size={16} className="mt-0.5 shrink-0 text-amber-700" />

          <div>
            <p className="text-xs font-bold text-amber-800">This order cannot be edited</p>

            <p className="mt-1 text-[11px] text-amber-700">This sales order has been fully dispatched.</p>
          </div>
        </section>
      )}

      {/* Cancelled order notice */}
      {showCancelledNotice && (
        <section className="flex items-start gap-2 rounded-xl border border-orange-200 bg-orange-50 p-3">
          <Info size={16} className="mt-0.5 shrink-0 text-orange-700" />

          <div>
            <p className="text-xs font-bold text-orange-800">Cancelled order — Edit and move back to Draft</p>

            <p className="mt-1 text-[11px] text-orange-700">You can update this cancelled order. After saving, its status will become Draft. It will not be automatically approved or reserve stock.</p>
          </div>
        </section>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Customer and Warehouse */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
              <UserRound size={16} />
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900">Order Information</h2>

              <p className="text-[11px] text-slate-500">Select customer, warehouse and order dates</p>
            </div>
          </div>

          <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="min-w-0">
              <label className={labelClass}>
                Customer <span className="text-red-500">*</span>
              </label>

              <select value={form.customerId} onChange={(event) => updateFormField('customerId', event.target.value)} disabled={isLocked} className={inputClass('customerId')}>
                <option value="">Select customer</option>

                {customers.map((customer) => (
                  <option key={customer._id} value={customer._id}>
                    {customer.customerName} ({customer.customerCode})
                  </option>
                ))}
              </select>

              {renderError('customerId')}
            </div>

            <div className="min-w-0">
              <label className={labelClass}>
                Warehouse <span className="text-red-500">*</span>
              </label>

              <select value={form.warehouseId} onChange={(event) => updateFormField('warehouseId', event.target.value)} disabled={isLocked} className={inputClass('warehouseId')}>
                <option value="">Select warehouse</option>

                {warehouses.map((warehouse) => (
                  <option key={warehouse._id} value={warehouse._id}>
                    {warehouse.name} {warehouse.code ? `(${warehouse.code})` : ''}
                  </option>
                ))}
              </select>

              {renderError('warehouseId')}
            </div>

            <div className="min-w-0">
              <label className={labelClass}>
                Order Date <span className="text-red-500">*</span>
              </label>

              <input type="date" value={form.orderDate} onChange={(event) => updateFormField('orderDate', event.target.value)} disabled={isLocked} className={inputClass('orderDate')} />

              {renderError('orderDate')}
            </div>

            <div className="min-w-0">
              <label className={labelClass}>Expected Delivery Date</label>

              <input type="date" value={form.expectedDeliveryDate} min={form.orderDate} onChange={(event) => updateFormField('expectedDeliveryDate', event.target.value)} disabled={isLocked} className={inputClass('expectedDeliveryDate')} />

              {renderError('expectedDeliveryDate')}
            </div>
          </div>
        </section>

        {/* Products */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <Package size={16} />
              </div>

              <div>
                <h2 className="text-sm font-bold text-slate-900">Order Products</h2>

                <p className="text-[11px] text-slate-500">Add products and enter quantity and pricing</p>
              </div>
            </div>

            {!isLocked && (
              <button type="button" onClick={addItem} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-erp-primary/30 bg-erp-primary/5 px-3 text-xs font-bold text-erp-primary transition hover:bg-erp-primary/10">
                <Plus size={14} />
                Add Product
              </button>
            )}
          </div>

          <div className="space-y-3 p-3">
            {items.map((item, index) => {
              const calculation = getItemCalculation(item)

              const selectedProduct = products.find((product) => String(product._id) === String(item.productId))

              const dispatched = Number(item.dispatchedQuantity || 0)

              const isProductLocked = isLocked || (hasDispatchedItems && dispatched > 0)

              const isQuantityProtected = hasDispatchedItems && dispatched > 0

              return (
                <div key={item._id || `new-${index}`} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-erp-primary/10 text-[11px] font-bold text-erp-primary">{index + 1}</span>

                      <span className="text-xs font-bold text-slate-700">Product {index + 1}</span>
                    </div>

                    {!isLocked && (
                      <button type="button" onClick={() => removeItem(index)} title="Remove product" className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-100 bg-white text-red-500 transition hover:bg-red-50">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <div className="min-w-0 lg:col-span-2">
                      <label className={labelClass}>
                        Product <span className="text-red-500">*</span>
                      </label>

                      <select value={item.productId} onChange={(event) => selectProduct(index, event.target.value)} disabled={isProductLocked} className={inputClass(`item_${index}_productId`)}>
                        <option value="">Select product</option>

                        {products.map((product) => (
                          <option key={product._id} value={product._id}>
                            {product.name} {product.sku ? `(${product.sku})` : ''}
                          </option>
                        ))}
                      </select>

                      {renderError(`item_${index}_productId`)}

                      {selectedProduct && (
                        <p className="mt-1 text-[10px] text-slate-500">
                          SKU: {selectedProduct.sku || '—'} | Unit: {selectedProduct.unit || '—'}
                        </p>
                      )}
                    </div>

                    <div className="min-w-0">
                      <label className={labelClass}>
                        Quantity <span className="text-red-500">*</span>
                      </label>

                      <input
                        type="number"
                        min={isQuantityProtected ? dispatched : 0.01}
                        step="0.01"
                        value={item.quantity}
                        onChange={(event) => updateItem(index, 'quantity', event.target.value)}
                        disabled={isLocked}
                        className={inputClass(`item_${index}_quantity`)}
                      />

                      {renderError(`item_${index}_quantity`)}

                      {dispatched > 0 && <p className="mt-1 text-[10px] text-amber-700">Dispatched: {dispatched}</p>}
                    </div>

                    <div className="min-w-0">
                      <label className={labelClass}>
                        Rate (₹) <span className="text-red-500">*</span>
                      </label>

                      <input type="number" min="0" step="0.01" value={item.rate} onChange={(event) => updateItem(index, 'rate', event.target.value)} disabled={isLocked} className={inputClass(`item_${index}_rate`)} />

                      {renderError(`item_${index}_rate`)}
                    </div>

                    <div className="min-w-0">
                      <label className={labelClass}>Discount (₹)</label>

                      <input type="number" min="0" step="0.01" value={item.discount} onChange={(event) => updateItem(index, 'discount', event.target.value)} disabled={isLocked} className={inputClass(`item_${index}_discount`)} />

                      {renderError(`item_${index}_discount`)}
                    </div>

                    <div className="min-w-0">
                      <label className={labelClass}>Tax (%)</label>

                      <input type="number" min="0" max="100" step="0.01" value={item.taxRate} onChange={(event) => updateItem(index, 'taxRate', event.target.value)} disabled={isLocked} className={inputClass(`item_${index}_taxRate`)} />

                      {renderError(`item_${index}_taxRate`)}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-200 pt-3 sm:grid-cols-4">
                    <div>
                      <p className="text-[10px] text-slate-500">Gross Amount</p>

                      <p className="mt-0.5 text-xs font-semibold text-slate-700">{formatCurrency(calculation.grossAmount)}</p>
                    </div>

                    <div>
                      <p className="text-[10px] text-slate-500">Taxable Amount</p>

                      <p className="mt-0.5 text-xs font-semibold text-slate-700">{formatCurrency(calculation.taxableAmount)}</p>
                    </div>

                    <div>
                      <p className="text-[10px] text-slate-500">Tax Amount</p>

                      <p className="mt-0.5 text-xs font-semibold text-slate-700">{formatCurrency(calculation.taxAmount)}</p>
                    </div>

                    <div>
                      <p className="text-[10px] text-slate-500">Line Total</p>

                      <p className="mt-0.5 text-xs font-bold text-erp-primary">{formatCurrency(calculation.lineTotal)}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Amendment */}
        {showAmendmentSection && (
          <section className="overflow-hidden rounded-xl border border-amber-200 bg-white">
            <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50 px-3 py-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                <RefreshCw size={16} />
              </div>

              <div>
                <h2 className="text-sm font-bold text-amber-900">Order Amendment</h2>

                <p className="text-[11px] text-amber-700">Explain why this approved order is being changed</p>
              </div>
            </div>

            <div className="p-3">
              <label className={labelClass}>
                Amendment Reason <span className="text-red-500">*</span>
              </label>

              <textarea
                rows={3}
                value={form.amendmentReason}
                onChange={(event) => updateFormField('amendmentReason', event.target.value)}
                placeholder="Enter the reason for changing this sales order..."
                className={`w-full resize-y rounded-lg border bg-white px-3 py-2.5 text-xs outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10 ${
                  fieldErrors.amendmentReason ? 'border-red-400' : 'border-slate-200'
                }`}
              />

              {renderError('amendmentReason')}

              {showDispatchWarning && <p className="mt-2 text-[11px] text-amber-700">This order has dispatched items. Dispatched quantities cannot be reduced or removed.</p>}
            </div>
          </section>
        )}

        {/* Cancelled order dispatch information */}
        {showCancelledNotice && showDispatchWarning && (
          <section className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <Info size={16} className="mt-0.5 shrink-0 text-amber-700" />

            <div>
              <p className="text-xs font-bold text-amber-800">Previously dispatched products</p>

              <p className="mt-1 text-[11px] text-amber-700">This cancelled order contains dispatched products. Their product and dispatched quantities must be preserved when editing.</p>
            </div>
          </section>
        )}

        {/* Notes */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
              <FileText size={16} />
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900">Additional Notes</h2>

              <p className="text-[11px] text-slate-500">Optional order information</p>
            </div>
          </div>

          <div className="p-3">
            <textarea
              rows={3}
              value={form.notes}
              onChange={(event) => updateFormField('notes', event.target.value)}
              disabled={isLocked}
              placeholder="Add notes about this sales order..."
              className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10"
            />
          </div>
        </section>

        {/* Totals */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <Calculator size={16} />
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900">Order Summary</h2>

              <p className="text-[11px] text-slate-500">Calculated order totals</p>
            </div>
          </div>

          <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <p className="text-[11px] font-medium text-slate-500">Subtotal</p>

              <p className="mt-1 text-base font-bold text-slate-800">{formatCurrency(finalTotals.subtotal)}</p>
            </div>

            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <p className="text-[11px] font-medium text-slate-500">Total Discount</p>

              <p className="mt-1 text-base font-bold text-slate-800">{formatCurrency(finalTotals.discount)}</p>
            </div>

            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <p className="text-[11px] font-medium text-slate-500">Total Tax</p>

              <p className="mt-1 text-base font-bold text-slate-800">{formatCurrency(finalTotals.taxAmount)}</p>
            </div>

            <div className="rounded-lg border border-erp-primary/20 bg-erp-primary/5 p-3">
              <p className="text-[11px] font-semibold text-erp-primary">Grand Total</p>

              <p className="mt-1 text-lg font-extrabold text-erp-primary">{formatCurrency(finalTotals.grandTotal)}</p>
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white/95 p-2.5 shadow-sm backdrop-blur">
          <p className="hidden text-[11px] text-slate-500 sm:block">
            {isAmendment ? 'Changes will be recorded in order amendment history.' : showSaveAsDraftMessage ? 'Saving will move this cancelled order back to Draft.' : 'Review all order details before saving.'}
          </p>

          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            <button type="button" onClick={() => navigate('/company/sales')} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
              <ArrowLeft size={14} />
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving || !canSubmit || isLocked}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-erp-primary px-4 text-xs font-bold text-white transition hover:bg-erp-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <LoaderCircle size={15} className="animate-spin" /> : <Save size={15} />}

              {saving ? 'Saving...' : isAmendment ? 'Save Amendment' : isCancelledOrder ? 'Save as Draft' : isEdit ? 'Save Changes' : 'Create Draft Order'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
