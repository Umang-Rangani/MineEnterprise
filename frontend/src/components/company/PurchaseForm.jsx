import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ShoppingCart, LoaderCircle, Save, Truck, CalendarDays, Package, Trash2, Plus, AlertCircle, Eye, Hash, Receipt, FileText, Search, RotateCcw, Boxes } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Loading from '../Loading/Loading'
import { hasPermission, useAuth } from '../../context/AuthContext'

const initialForm = {
  supplierId: '',
  purchaseDate: new Date().toISOString().slice(0, 10),
  expectedDeliveryDate: '',
  discountAmount: '0',
  shippingCharges: '0',
  adjustmentAmount: '0',
  notes: '',
}

const createEmptyItem = () => ({
  productId: '',
  productName: '',
  sku: '',
  unit: 'Piece',
  quantity: '1',
  unitPrice: '0',
  taxRate: '0',
})

const inputBase = 'h-9 w-full rounded-lg border bg-erp-surface px-2.5 text-xs text-erp-text outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10 disabled:cursor-not-allowed disabled:opacity-60'

const phoneNumber = (value) => Number(value || 0)

const roundMoney = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100

const formatMoney = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0))

const formatDateForInput = (value) => {
  if (!value) return ''

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return ''

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getErrorMessage(error, fallback) {
  return error.response?.data?.message || error.message || fallback
}

export default function PurchaseForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const { permissions } = useAuth()

  const canCreate = hasPermission(permissions, 'purchase:create')
  const canView = hasPermission(permissions, 'purchase:view')
  const canUpdate = hasPermission(permissions, 'purchase:update')

  const hasFormPermission = isEdit ? canView && canUpdate : canCreate

  const [form, setForm] = useState(initialForm)
  const [items, setItems] = useState([createEmptyItem()])

  const [suppliers, setSuppliers] = useState([])
  const [products, setProducts] = useState([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadingSuppliers, setLoadingSuppliers] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState(true)

  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')
  const [originalStatus, setOriginalStatus] = useState('Draft')
  const [purchaseNumber, setPurchaseNumber] = useState('')
  const [productSearch, setProductSearch] = useState('')

  const itemsBreadcrumb = [
    { title: 'Purchases', link: '/company/purchases' },
    {
      title: isEdit ? 'Edit Purchase' : 'Create Purchase',
      link: null,
    },
  ]

  useEffect(() => {
    document.title = `${isEdit ? 'Edit Purchase' : 'Create Purchase'} | MineERP`
  }, [isEdit])

  async function fetchAllPages(endpoint, key) {
    const firstResponse = await axiosInstance.get(endpoint, {
      params: { page: 1, limit: 100, status: 'Active' },
    })

    const firstData = firstResponse.data

    if (firstData?.success === false) {
      throw new Error(firstData.message || `Unable to load ${key}.`)
    }

    const firstRows = Array.isArray(firstData?.[key]) ? firstData[key] : []

    const totalPages = Math.max(1, Number(firstData?.pagination?.totalPages || 1))

    if (totalPages <= 1) return firstRows

    const remainingRequests = []

    for (let page = 2; page <= totalPages; page += 1) {
      remainingRequests.push(
        axiosInstance.get(endpoint, {
          params: { page, limit: 100, status: 'Active' },
        }),
      )
    }

    const responses = await Promise.all(remainingRequests)

    const remainingRows = responses.flatMap((response) => {
      if (response.data?.success === false) {
        throw new Error(response.data.message || `Unable to load ${key}.`)
      }

      return Array.isArray(response.data?.[key]) ? response.data[key] : []
    })

    return [...firstRows, ...remainingRows]
  }

  useEffect(() => {
    let active = true

    async function loadDropdownData() {
      setLoadingSuppliers(true)
      setLoadingProducts(true)

      const [supplierResult, productResult] = await Promise.allSettled([fetchAllPages('/erp/suppliers', 'suppliers'), fetchAllPages('/erp/products', 'products')])

      if (!active) return

      if (supplierResult.status === 'fulfilled') {
        setSuppliers(supplierResult.value)
      } else {
        setApiError((current) => current || getErrorMessage(supplierResult.reason, 'Unable to load suppliers.'))
      }

      if (productResult.status === 'fulfilled') {
        setProducts(productResult.value)
      } else {
        setApiError((current) => current || getErrorMessage(productResult.reason, 'Unable to load products.'))
      }

      setLoadingSuppliers(false)
      setLoadingProducts(false)
    }

    loadDropdownData()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true

    async function loadPurchase() {
      if (!isEdit) {
        setForm({
          ...initialForm,
          purchaseDate: formatDateForInput(new Date()),
        })
        setItems([createEmptyItem()])
        setPurchaseNumber('')
        setOriginalStatus('Draft')
        setLoading(false)
        return
      }

      if (!id) {
        setApiError('Purchase ID is missing.')
        setLoading(false)
        return
      }

      setLoading(true)
      setApiError('')

      try {
        const response = await axiosInstance.get(`/erp/purchases/${encodeURIComponent(id)}`)

        const data = response.data

        if (data?.success === false) {
          throw new Error(data.message || 'Unable to load purchase.')
        }

        const purchase = data?.purchase || data?.data?.purchase || data?.data

        if (!purchase?._id) {
          throw new Error(data?.message || 'Purchase not found.')
        }

        if (!active) return

        if (purchase.status !== 'Draft') {
          setApiError(`Only Draft purchases can be edited. Current status: ${purchase.status}.`)
        }

        const savedItems = Array.isArray(purchase.items) ? purchase.items : []

        // Older records may contain item-level discounts.
        // This form now supports only purchase-level discount.
        const oldItemDiscountTotal = savedItems.reduce((sum, item) => sum + Number(item.discountAmount || 0), 0)

        const purchaseDiscount = Math.max(0, Number(purchase.discountAmount || 0) - oldItemDiscountTotal)

        setForm({
          supplierId: typeof purchase.supplierId === 'object' ? purchase.supplierId?._id || '' : purchase.supplierId || '',
          purchaseDate: formatDateForInput(purchase.purchaseDate),
          expectedDeliveryDate: formatDateForInput(purchase.expectedDeliveryDate),
          discountAmount: String(roundMoney(purchaseDiscount)),
          shippingCharges: String(Number(purchase.shippingCharges || 0)),
          adjustmentAmount: String(Number(purchase.adjustmentAmount || 0)),
          notes: purchase.notes || '',
        })

        setItems(
          savedItems.length
            ? savedItems.map((item) => {
                const product = typeof item.productId === 'object' ? item.productId : null

                return {
                  productId: product?._id || item.productId || '',
                  productName: item.productName || product?.name || '',
                  sku: item.sku || product?.sku || '',
                  unit: item.unit || product?.unit || 'Piece',
                  quantity: String(item.quantity ?? 1),
                  unitPrice: String(item.unitPrice ?? 0),
                  taxRate: String(item.taxRate ?? 0),
                }
              })
            : [createEmptyItem()],
        )

        setPurchaseNumber(purchase.purchaseNumber || '')
        setOriginalStatus(purchase.status || 'Draft')
      } catch (error) {
        if (active) {
          setApiError(getErrorMessage(error, 'Unable to load purchase.'))
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadPurchase()

    return () => {
      active = false
    }
  }, [id, isEdit])

  const calculations = useMemo(() => {
    let subtotal = 0
    let taxTotal = 0
    let itemsTotal = 0

    const calculatedItems = items.map((item) => {
      const quantity = phoneNumber(item.quantity)
      const unitPrice = phoneNumber(item.unitPrice)
      const taxRate = phoneNumber(item.taxRate)

      const grossAmount = roundMoney(quantity * unitPrice)
      const taxableAmount = grossAmount
      const taxAmount = roundMoney((taxableAmount * taxRate) / 100)
      const lineTotal = roundMoney(taxableAmount + taxAmount)

      subtotal = roundMoney(subtotal + grossAmount)
      taxTotal = roundMoney(taxTotal + taxAmount)
      itemsTotal = roundMoney(itemsTotal + lineTotal)

      return {
        ...item,
        grossAmount,
        taxableAmount,
        taxAmount,
        lineTotal,
      }
    })

    const purchaseDiscount = phoneNumber(form.discountAmount)
    const shippingCharges = phoneNumber(form.shippingCharges)
    const adjustmentAmount = phoneNumber(form.adjustmentAmount)

    const totalAmount = roundMoney(subtotal - purchaseDiscount + taxTotal + shippingCharges + adjustmentAmount)

    return {
      calculatedItems,
      subtotal,
      purchaseDiscount,
      taxTotal,
      shippingCharges,
      adjustmentAmount,
      itemsTotal,
      totalAmount,
    }
  }, [items, form.discountAmount, form.shippingCharges, form.adjustmentAmount])

  const filteredProducts = useMemo(() => {
    const search = productSearch.trim().toLowerCase()

    if (!search) return products

    return products.filter((product) =>
      [product.name, product.sku, product.barcode].some((value) =>
        String(value || '')
          .toLowerCase()
          .includes(search),
      ),
    )
  }, [products, productSearch])

  function goBack() {
    navigate('/company/purchases')
  }

  function openDetailsPage() {
    if (!id || !canView) return
    navigate(`/company/purchases/${id}`)
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))

    setErrors((current) => ({ ...current, [field]: '' }))
    setApiError('')
  }

  function updateItem(index, field, value) {
    setItems((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)))

    setErrors((current) => ({
      ...current,
      [`item-${index}-${field}`]: '',
      items: '',
    }))

    setApiError('')
  }

  function selectProduct(index, productId) {
    const product = products.find((item) => String(item._id) === String(productId))

    setItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item

        if (!product) {
          return {
            ...item,
            productId: '',
            productName: '',
            sku: '',
            unit: 'Piece',
            unitPrice: '0',
            taxRate: '0',
          }
        }

        return {
          ...item,
          productId: product._id,
          productName: product.name || '',
          sku: product.sku || '',
          unit: product.unit || 'Piece',
          unitPrice: String(product.costPrice ?? 0),
          taxRate: String(product.taxRate ?? 0),
        }
      }),
    )

    setErrors((current) => ({
      ...current,
      [`item-${index}-productId`]: '',
      items: '',
    }))

    setApiError('')
  }

  function addItem() {
    if (items.length >= 500) {
      setApiError('A purchase cannot contain more than 500 items.')
      return
    }

    setItems((current) => [...current, createEmptyItem()])
  }

  function removeItem(index) {
    setItems((current) => {
      if (current.length <= 1) return current
      return current.filter((_, itemIndex) => itemIndex !== index)
    })

    setErrors({})
    setApiError('')
  }

  function validateForm() {
    const nextErrors = {}

    if (!form.supplierId) {
      nextErrors.supplierId = 'Please select a supplier.'
    }

    if (!form.purchaseDate) {
      nextErrors.purchaseDate = 'Purchase date is required.'
    } else if (Number.isNaN(new Date(form.purchaseDate).getTime())) {
      nextErrors.purchaseDate = 'Enter a valid purchase date.'
    }

    if (form.expectedDeliveryDate && new Date(form.expectedDeliveryDate).getTime() < new Date(form.purchaseDate).getTime()) {
      nextErrors.expectedDeliveryDate = 'Expected delivery date cannot precede purchase date.'
    }

    if (!items.length) {
      nextErrors.items = 'Add at least one product.'
    }

    const seenProductIds = new Set()

    items.forEach((item, index) => {
      const prefix = `item-${index}-`

      if (!item.productId) {
        nextErrors[`${prefix}productId`] = 'Select a product.'
      } else if (seenProductIds.has(String(item.productId))) {
        nextErrors[`${prefix}productId`] = 'A product can only appear once. Combine its quantities.'
      } else {
        seenProductIds.add(String(item.productId))
      }

      const quantity = Number(item.quantity)
      const unitPrice = Number(item.unitPrice)
      const taxRate = Number(item.taxRate)

      if (item.quantity === '' || !Number.isFinite(quantity) || quantity <= 0) {
        nextErrors[`${prefix}quantity`] = 'Quantity must be greater than zero.'
      }

      if (item.unitPrice === '' || !Number.isFinite(unitPrice) || unitPrice < 0) {
        nextErrors[`${prefix}unitPrice`] = 'Unit price must be non-negative.'
      }

      if (item.taxRate === '' || !Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
        nextErrors[`${prefix}taxRate`] = 'Tax rate must be between 0 and 100.'
      }
    })

    const discount = Number(form.discountAmount)
    const shipping = Number(form.shippingCharges)
    const adjustment = Number(form.adjustmentAmount)

    if (form.discountAmount === '' || !Number.isFinite(discount) || discount < 0) {
      nextErrors.discountAmount = 'Purchase discount must be non-negative.'
    }

    if (form.shippingCharges === '' || !Number.isFinite(shipping) || shipping < 0) {
      nextErrors.shippingCharges = 'Shipping charges must be non-negative.'
    }

    if (form.adjustmentAmount === '' || !Number.isFinite(adjustment)) {
      nextErrors.adjustmentAmount = 'Adjustment must be a valid number.'
    }

    if (Number.isFinite(discount) && discount > calculations.subtotal) {
      nextErrors.discountAmount = 'Purchase discount cannot exceed the subtotal.'
    }

    if (calculations.totalAmount < 0) {
      nextErrors.adjustmentAmount = 'Purchase total cannot be negative.'
    }

    if (form.notes.length > 2000) {
      nextErrors.notes = 'Notes cannot exceed 2000 characters.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (saving) return

    if (!hasFormPermission) {
      setApiError('You do not have permission to perform this action.')
      return
    }

    if (isEdit && originalStatus !== 'Draft') {
      setApiError('Only Draft purchases can be edited.')
      return
    }

    if (loadingSuppliers || loadingProducts) {
      setApiError('Please wait until suppliers and products finish loading.')
      return
    }

    if (!validateForm()) return

    setSaving(true)
    setApiError('')

    try {
      const payload = {
        supplierId: form.supplierId,
        purchaseDate: new Date(`${form.purchaseDate}T00:00:00`).toISOString(),
        expectedDeliveryDate: form.expectedDeliveryDate ? new Date(`${form.expectedDeliveryDate}T00:00:00`).toISOString() : null,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          taxRate: Number(item.taxRate),
        })),
        discountAmount: Number(form.discountAmount),
        shippingCharges: Number(form.shippingCharges),
        adjustmentAmount: Number(form.adjustmentAmount),
        notes: form.notes.trim(),
      }

      const response = isEdit ? await axiosInstance.patch(`/erp/purchases/${encodeURIComponent(id)}`, payload) : await axiosInstance.post('/erp/purchases', payload)

      const data = response.data

      if (data?.success === false) {
        throw new Error(data.message || 'Unable to save purchase.')
      }

      navigate('/company/purchases', {
        replace: true,
        state: {
          successMessage: data?.message || (isEdit ? 'Purchase updated successfully.' : 'Purchase created successfully.'),
        },
      })
    } catch (error) {
      setApiError(getErrorMessage(error, 'Unable to save purchase.'))
    } finally {
      setSaving(false)
    }
  }

  const inputClass = (field) => `${inputBase} ${errors[field] ? 'border-red-400' : 'border-erp-border'}`

  const labelClass = 'block text-[11px] font-semibold text-erp-text-secondary'

  const errorText = (field) => (errors[field] ? <p className="text-[10px] text-red-600">{errors[field]}</p> : null)

  if (loading) {
    return (
      <div className="min-w-0 space-y-3">
        <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="h-1 bg-erp-primary" />
          <div className="flex h-[calc(100%-4px)] items-center px-3 sm:px-4">
            <BreadCrumb items={itemsBreadcrumb} />
          </div>
        </section>

        <Loading label="Loading purchase..." description="Preparing purchase information..." />
      </div>
    )
  }

  if (!hasFormPermission) {
    return (
      <div className="min-w-0 rounded-xl border border-erp-border bg-erp-surface p-5 text-center">
        <h2 className="text-base font-semibold text-erp-text">Access Denied</h2>

        <p className="mt-2 text-xs text-erp-text-secondary">{isEdit ? 'You do not have permission to view and update purchases.' : 'You do not have permission to create purchases.'}</p>

        <button type="button" onClick={goBack} className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-erp-primary px-4 text-xs font-semibold text-white hover:bg-erp-primary-hover">
          <ArrowLeft size={14} />
          Back to Purchases
        </button>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-3 text-sm">
      {/* Header */}
      <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card h-17">
        <div className="h-1 bg-erp-primary" />

        <div className="flex h-[calc(100%-4px)] min-w-0 items-center justify-between gap-3 px-4 sm:px-5">
          <div className="min-w-0 flex-1 overflow-hidden">
            <BreadCrumb items={itemsBreadcrumb} />
          </div>

          {isEdit && canView && (
            <button
              type="button"
              onClick={openDetailsPage}
              title="View purchase"
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-erp-border px-2.5 text-xs font-semibold text-erp-primary transition hover:bg-erp-primary/5"
            >
              <Eye size={14} />
              View
            </button>
          )}
        </div>
      </section>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Basic Information */}
        <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex min-w-0 flex-col gap-2 border-b border-erp-border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
                <ShoppingCart size={15} />
              </div>

              <div className="min-w-0">
                <h2 className="text-xs font-bold leading-4 text-erp-text">Basic Information</h2>
                <p className="text-[10px] leading-4 text-erp-text-secondary">Select the supplier and purchase dates.</p>
              </div>
            </div>

            {isEdit && (
              <div className="flex min-w-0 items-center gap-2 rounded-lg border border-erp-border bg-erp-hover/40 px-2.5 py-1.5 sm:ml-auto">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
                  <Hash size={15} />
                </div>

                <div className="min-w-0">
                  <p className="text-[10px] leading-4 text-erp-text-secondary">Purchase Number</p>
                  <p className="break-words text-xs font-bold leading-4 text-erp-text">{purchaseNumber || 'Purchase'}</p>
                </div>

                <span className="ml-1 shrink-0 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">{originalStatus}</span>
              </div>
            )}
          </div>

          <div className="grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="min-w-0 space-y-1">
              <label htmlFor="purchase-supplier" className={labelClass}>
                Supplier <span className="text-erp-danger">*</span>
              </label>

              <div className="relative">
                <Truck size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-erp-text-muted" />

                <select id="purchase-supplier" required value={form.supplierId} onChange={(event) => updateField('supplierId', event.target.value)} disabled={saving || loadingSuppliers} className={`${inputClass('supplierId')} pl-8`}>
                  <option value="">{loadingSuppliers ? 'Loading suppliers...' : 'Select supplier'}</option>

                  {suppliers.map((supplier) => (
                    <option key={supplier._id} value={supplier._id}>
                      {supplier.supplierName}
                      {supplier.supplierCode ? ` (${supplier.supplierCode})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {errorText('supplierId')}

              {!loadingSuppliers && suppliers.length === 0 && <p className="text-[10px] text-amber-700">No active suppliers found. Add an active supplier first.</p>}
            </div>

            <div className="min-w-0 space-y-1">
              <label htmlFor="purchase-date" className={labelClass}>
                Purchase Date <span className="text-erp-danger">*</span>
              </label>

              <div className="relative">
                <CalendarDays size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-erp-text-muted" />

                <input id="purchase-date" type="date" required value={form.purchaseDate} onChange={(event) => updateField('purchaseDate', event.target.value)} disabled={saving} className={`${inputClass('purchaseDate')} pl-8`} />
              </div>

              {errorText('purchaseDate')}
            </div>

            <div className="min-w-0 space-y-1">
              <label htmlFor="expected-delivery-date" className={labelClass}>
                Expected Delivery Date
              </label>

              <div className="relative">
                <CalendarDays size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-erp-text-muted" />

                <input
                  id="expected-delivery-date"
                  type="date"
                  min={form.purchaseDate || undefined}
                  value={form.expectedDeliveryDate}
                  onChange={(event) => updateField('expectedDeliveryDate', event.target.value)}
                  disabled={saving}
                  className={`${inputClass('expectedDeliveryDate')} pl-8`}
                />
              </div>

              {errorText('expectedDeliveryDate')}
            </div>

            <div className="min-w-0 space-y-1">
              <label className={labelClass}>Purchase Status</label>

              <div className="flex h-9 items-center gap-2 rounded-lg border border-erp-border bg-erp-hover/40 px-2.5">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-xs font-semibold text-erp-text">{isEdit ? originalStatus : 'Draft'}</span>
                <span className="text-[10px] text-erp-text-muted">Server status</span>
              </div>
            </div>
          </div>
        </section>

        {/* Purchase Items */}
        <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-erp-border px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
                <Package size={15} />
              </div>

              <div>
                <h2 className="text-xs font-bold text-erp-text">Purchase Items</h2>
                <p className="text-[10px] text-erp-text-secondary">Products, quantities, prices and taxes.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={addItem}
              disabled={saving || items.length >= 500}
              className="inline-flex h-8 items-center gap-1 rounded-lg bg-erp-primary px-2.5 text-[11px] font-semibold text-white transition hover:bg-erp-primary-hover disabled:opacity-50"
            >
              <Plus size={13} />
              Add Product
            </button>
          </div>

          <div className="space-y-2.5 p-3">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-erp-text-muted" />

              <input type="search" value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Search products by name, SKU or barcode..." disabled={saving} className={`${inputBase} border-erp-border pl-8`} />
            </div>

            {errorText('items')}

            {loadingProducts && (
              <div className="flex items-center gap-2 rounded-lg border border-erp-border px-3 py-3 text-xs text-erp-text-secondary">
                <LoaderCircle size={14} className="animate-spin" />
                Loading products...
              </div>
            )}

            {!loadingProducts && products.length === 0 && (
              <div className="rounded-lg border border-dashed border-erp-border px-3 py-5 text-center">
                <Package size={22} className="mx-auto text-erp-text-muted" />
                <p className="mt-1.5 text-xs font-semibold text-erp-text">No active products found</p>
                <p className="mt-1 text-[10px] text-erp-text-secondary">Create or activate a product before creating a purchase.</p>
              </div>
            )}

            {items.map((item, index) => {
              const calculatedItem = calculations.calculatedItems[index]
              const itemPrefix = `item-${index}-`

              return (
                <div key={`${index}-${item.productId || 'new'}`} className="overflow-hidden rounded-lg border border-erp-border">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-erp-border bg-erp-hover/40 px-2.5 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-erp-primary/10 text-[10px] font-bold text-erp-primary">{String(index + 1).padStart(2, '0')}</span>

                      <div className="min-w-0">
                        <p className="break-words text-xs font-bold text-erp-text">{item.productName || `Product ${index + 1}`}</p>
                        <p className="text-[10px] text-erp-text-secondary">{item.sku || 'Select a product below'}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      disabled={saving || items.length <= 1}
                      title="Remove item"
                      aria-label={`Remove item ${index + 1}`}
                      className="inline-flex h-7 items-center gap-1 rounded-md border border-erp-border px-2 text-[10px] font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Trash2 size={12} />
                      Remove
                    </button>
                  </div>

                  <div className="grid gap-3 p-2.5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,0.5fr)]">
                    {/* Product fields */}
                    <div className="grid content-start gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="min-w-0 space-y-1 sm:col-span-2 xl:col-span-4">
                        <label htmlFor={`purchase-product-${index}`} className={labelClass}>
                          Product <span className="text-erp-danger">*</span>
                        </label>

                        <select id={`purchase-product-${index}`} required value={item.productId} onChange={(event) => selectProduct(index, event.target.value)} disabled={saving || loadingProducts} className={inputClass(`${itemPrefix}productId`)}>
                          <option value="">Select product</option>

                          {filteredProducts.map((product) => (
                            <option key={product._id} value={product._id}>
                              {product.name}
                              {product.sku ? ` (${product.sku})` : ''}
                            </option>
                          ))}

                          {item.productId && !filteredProducts.some((product) => String(product._id) === String(item.productId)) && <option value={item.productId}>{item.productName || item.sku || 'Current product'}</option>}
                        </select>

                        {errorText(`${itemPrefix}productId`)}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <label htmlFor={`purchase-quantity-${index}`} className={labelClass}>
                          Quantity *
                        </label>

                        <input
                          id={`purchase-quantity-${index}`}
                          type="number"
                          min="0.001"
                          step="any"
                          required
                          value={item.quantity}
                          onChange={(event) => updateItem(index, 'quantity', event.target.value)}
                          disabled={saving}
                          className={inputClass(`${itemPrefix}quantity`)}
                        />

                        {errorText(`${itemPrefix}quantity`)}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <label htmlFor={`purchase-price-${index}`} className={labelClass}>
                          Unit Price (₹) *
                        </label>

                        <input
                          id={`purchase-price-${index}`}
                          type="number"
                          min="0"
                          step="any"
                          required
                          value={item.unitPrice}
                          onChange={(event) => updateItem(index, 'unitPrice', event.target.value)}
                          disabled={saving}
                          className={inputClass(`${itemPrefix}unitPrice`)}
                        />

                        {errorText(`${itemPrefix}unitPrice`)}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <label htmlFor={`purchase-tax-${index}`} className={labelClass}>
                          Tax Rate (%)
                        </label>

                        <input
                          id={`purchase-tax-${index}`}
                          type="number"
                          min="0"
                          max="100"
                          step="any"
                          value={item.taxRate}
                          onChange={(event) => updateItem(index, 'taxRate', event.target.value)}
                          disabled={saving}
                          className={inputClass(`${itemPrefix}taxRate`)}
                        />

                        {errorText(`${itemPrefix}taxRate`)}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <label className={labelClass}>Unit</label>

                        <div className="flex h-9 items-center rounded-lg border border-erp-border bg-erp-hover/40 px-2.5 text-xs text-erp-text">{item.unit || 'Piece'}</div>
                      </div>
                    </div>

                    {/* Compact live calculation */}
                    <div className="rounded-lg border border-erp-border bg-erp-bg p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <h3 className="text-xs font-bold text-erp-text">Item Calculation</h3>
                        <span className="text-[10px] text-erp-text-secondary">Live</span>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-erp-text-secondary">Quantity × Unit Price</span>
                          <span className="font-medium text-erp-text">{formatMoney(calculatedItem?.grossAmount)}</span>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <span className="text-erp-text-secondary">Taxable Amount</span>
                          <span className="font-medium text-erp-text">{formatMoney(calculatedItem?.taxableAmount)}</span>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <span className="text-erp-text-secondary">Tax ({Number(item.taxRate) || 0}%)</span>
                          <span className="font-medium text-erp-text">{formatMoney(calculatedItem?.taxAmount)}</span>
                        </div>

                        <div className="mt-2 flex items-center justify-between gap-2 border-t border-dashed border-erp-border pt-2">
                          <span className="font-bold text-erp-text">Line Total</span>
                          <span className="text-sm font-extrabold text-erp-primary">{formatMoney(calculatedItem?.lineTotal)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {!loadingProducts && products.length > 0 && <p className="text-[10px] text-erp-text-muted">{filteredProducts.length} active product(s) match the search.</p>}
          </div>
        </section>

        {/* Purchase Summary */}
        <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-erp-border px-4 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
              <Receipt size={16} />
            </div>

            <div className="min-w-0">
              <h2 className="text-sm font-bold text-erp-text">Purchase Summary</h2>
              <p className="text-xs text-erp-text-secondary">Discount, tax and final amount</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* LEFT SIDE — INPUTS */}
            <div className="grid grid-cols-1 content-start gap-3 p-4 ">
              {/* Discount */}
              <div className="min-w-0 space-y-1">
                <label htmlFor="purchase-discount" className={labelClass}>
                  Purchase Discount (₹)
                </label>

                <input id="purchase-discount" type="number" min="0" step="any" value={form.discountAmount} onChange={(event) => updateField('discountAmount', event.target.value)} disabled={saving} className={inputClass('discountAmount')} />

                {errorText('discountAmount')}
              </div>

              {/* Shipping */}
              <div className="min-w-0 space-y-1">
                <label htmlFor="purchase-shipping" className={labelClass}>
                  Shipping Charges (₹)
                </label>

                <input id="purchase-shipping" type="number" min="0" step="any" value={form.shippingCharges} onChange={(event) => updateField('shippingCharges', event.target.value)} disabled={saving} className={inputClass('shippingCharges')} />

                {errorText('shippingCharges')}
              </div>

              {/* Adjustment */}
              <div className="min-w-0 space-y-1">
                <label htmlFor="purchase-adjustment" className={labelClass}>
                  Adjustment (₹)
                </label>

                <input id="purchase-adjustment" type="number" step="any" value={form.adjustmentAmount} onChange={(event) => updateField('adjustmentAmount', event.target.value)} disabled={saving} className={inputClass('adjustmentAmount')} />

                {errorText('adjustmentAmount')}

                <p className="text-[11px] leading-4 text-erp-text-secondary">Negative value reduces the total.</p>
              </div>

              {/* Total Quantity */}
              <div className="min-w-0 space-y-1">
                <label className={labelClass}>Total Item Quantity</label>

                <div className="flex h-10 items-center justify-between gap-2 rounded-lg border border-erp-border bg-erp-hover/30 px-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Boxes size={16} className="shrink-0 text-erp-primary" />
                    <span className="truncate text-xs text-erp-text-secondary">Total quantity</span>
                  </div>

                  <span className="text-sm font-bold tabular-nums text-erp-text">{items.reduce((sum, item) => sum + phoneNumber(item.quantity), 0)}</span>
                </div>
              </div>
            </div>

            {/* RIGHT SIDE — CALCULATION */}
            <div className="border-t border-erp-border bg-erp-hover/20 p-4 lg:border-l lg:border-t-0 my-auto">
              <div className="space-y-3">
                {/* Subtotal */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-erp-text-secondary">Subtotal</span>
                  <span className="text-sm font-semibold tabular-nums text-erp-text">{formatMoney(calculations.subtotal)}</span>
                </div>

                {/* Discount */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-erp-text-secondary">Purchase Discount</span>
                  <span className="text-sm font-semibold tabular-nums text-rose-600">− {formatMoney(calculations.purchaseDiscount)}</span>
                </div>

                {/* Tax */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-erp-text-secondary">Tax</span>
                  <span className="text-sm font-semibold tabular-nums text-erp-text">{formatMoney(calculations.taxTotal)}</span>
                </div>

                {/* Shipping */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-erp-text-secondary">Shipping Charges</span>
                  <span className="text-sm font-semibold tabular-nums text-erp-text">{formatMoney(calculations.shippingCharges)}</span>
                </div>

                {/* Adjustment */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-erp-text-secondary">Adjustment</span>
                  <span className={`text-sm font-semibold tabular-nums ${phoneNumber(form.adjustmentAmount) < 0 ? 'text-rose-600' : 'text-erp-text'}`}>
                    {phoneNumber(form.adjustmentAmount) > 0 ? '+' : ''}
                    {formatMoney(calculations.adjustmentAmount)}
                  </span>
                </div>

                {/* Grand Total */}
                <div className="border-t border-erp-border pt-3">
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-erp-primary/20 bg-erp-primary/10 px-3 py-3 sm:px-4">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
                        <Receipt size={18} />
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-bold text-erp-text">Grand Total</p>
                        <p className="text-[11px] text-erp-text-secondary">Final purchase amount</p>
                      </div>
                    </div>

                    <p className="shrink-0 text-base font-extrabold tabular-nums text-erp-primary sm:text-lg">{formatMoney(calculations.totalAmount)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Additional Details */}
        <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex items-center gap-2 border-b border-erp-border px-3 py-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
              <FileText size={15} />
            </div>

            <div>
              <h2 className="text-xs font-bold text-erp-text">Additional Details</h2>
              <p className="text-[10px] text-erp-text-secondary">Internal notes for this purchase.</p>
            </div>
          </div>

          <div className="p-3">
            <div className="space-y-1">
              <label htmlFor="purchase-notes" className={labelClass}>
                Notes
              </label>

              <textarea
                id="purchase-notes"
                rows={3}
                maxLength={2000}
                value={form.notes}
                onChange={(event) => updateField('notes', event.target.value)}
                placeholder="Enter purchase notes, terms or other information..."
                disabled={saving}
                className={`w-full resize-y rounded-lg border bg-erp-surface px-3 py-2 text-xs text-erp-text outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10 ${
                  errors.notes ? 'border-red-400' : 'border-erp-border'
                }`}
              />

              {errorText('notes')}

              <p className="text-right text-[10px] text-erp-text-muted">{form.notes.length}/2000</p>
            </div>
          </div>
        </section>

        {/* Purchase Preview */}
        <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex items-center gap-2 border-b border-erp-border px-3 py-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
              <Eye size={15} />
            </div>

            <div>
              <h2 className="text-xs font-bold text-erp-text">Purchase Preview</h2>
              <p className="text-[10px] text-erp-text-secondary">Review the information before saving.</p>
            </div>
          </div>

          <div className="grid gap-3 p-3 sm:grid-cols-[auto_1fr] sm:items-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-erp-border bg-erp-primary/5 text-erp-primary">
              <ShoppingCart size={30} strokeWidth={1.5} />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="break-words text-sm font-bold text-erp-text">{purchaseNumber || 'New Purchase'}</h3>

                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">{isEdit ? originalStatus : 'Draft'}</span>
              </div>

              <p className="mt-1 break-words text-xs text-erp-text-secondary">Supplier: {suppliers.find((supplier) => String(supplier._id) === String(form.supplierId))?.supplierName || 'No supplier selected'}</p>

              <div className="mt-2 grid gap-2 text-[11px] text-erp-text-secondary sm:grid-cols-2">
                <p className="flex items-start gap-1.5">
                  <CalendarDays size={13} className="mt-0.5 shrink-0 text-erp-primary" />
                  <span>Purchase Date: {form.purchaseDate || 'Not selected'}</span>
                </p>

                <p className="flex items-start gap-1.5">
                  <CalendarDays size={13} className="mt-0.5 shrink-0 text-erp-primary" />
                  <span>Expected Delivery: {form.expectedDeliveryDate || 'Not specified'}</span>
                </p>

                <p className="flex items-start gap-1.5">
                  <Package size={13} className="mt-0.5 shrink-0 text-erp-primary" />
                  <span>Product Lines: {items.length}</span>
                </p>

                <p className="flex items-start gap-1.5">
                  <Receipt size={13} className="mt-0.5 shrink-0 text-erp-primary" />
                  <span className="font-semibold text-erp-text">Total: {formatMoney(calculations.totalAmount)}</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* API Error */}
        {apiError && (
          <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <p>{apiError}</p>
          </div>
        )}

        {/* Footer */}
        <footer className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-erp-border bg-erp-surface/95 p-2 shadow-sm backdrop-blur">
          <div className="hidden min-w-0 sm:block">
            <p className="text-xs font-semibold text-erp-text">{isEdit ? 'Update draft purchase' : 'Ready to create purchase'}</p>
            <p className="mt-0.5 text-[10px] text-erp-text-secondary">Inventory will not change when this purchase is saved.</p>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={goBack}
              disabled={saving}
              className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-erp-border bg-erp-surface px-2.5 text-[11px] font-semibold text-erp-text-secondary transition hover:bg-erp-hover disabled:opacity-50"
            >
              <ArrowLeft size={13} />
              Cancel
            </button>

            <button
              type="button"
              onClick={() => {
                if (saving || isEdit) return

                setApiError('')
                setErrors({})
                setForm({
                  ...initialForm,
                  purchaseDate: formatDateForInput(new Date()),
                })
                setItems([createEmptyItem()])
                setProductSearch('')
              }}
              disabled={saving || isEdit}
              title={isEdit ? 'Cancel to discard edits' : 'Reset form'}
              className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-erp-border bg-erp-surface px-2.5 text-[11px] font-semibold text-erp-text-secondary transition hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw size={13} />
              Reset
            </button>

            <button
              type="submit"
              disabled={saving || loadingSuppliers || loadingProducts || (isEdit && originalStatus !== 'Draft')}
              className="inline-flex h-8 items-center justify-center gap-1 rounded-lg bg-erp-primary px-3 text-[11px] font-bold text-white transition hover:bg-erp-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <LoaderCircle size={13} className="animate-spin" /> : <Save size={13} />}

              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Purchase'}
            </button>
          </div>
        </footer>
      </form>
    </div>
  )
}
