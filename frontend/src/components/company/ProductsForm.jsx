import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Package, LoaderCircle, Save, Tag, FileText, CheckCircle2, AlertCircle, Eye, Barcode, IndianRupee, Boxes, Image, Percent } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import Loading from '../Loading/Loading'
import { hasPermission, useAuth } from '../../context/AuthContext'

const initialForm = {
  name: '',
  sku: '',
  description: '',
  categoryId: '',
  barcode: '',
  unit: 'Piece',
  costPrice: '',
  sellingPrice: '',
  taxRate: '',
  openingStock: '',
  minStockLevel: '',
  imageUrl: '',
  status: 'Active',
}

const units = ['Piece', 'Kg', 'Gram', 'Litre', 'ML', 'Meter', 'Box', 'Pack', 'Dozen', 'Pair', 'Set', 'Carton']

export default function ProductsForm() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams()

  const isEdit = Boolean(id)

  const { permissions } = useAuth()

  const canCreate = hasPermission(permissions, 'product:create')
  const canUpdate = hasPermission(permissions, 'product:update')
  const canUpdateStatus = hasPermission(permissions, 'product:update-status')
  const canView = hasPermission(permissions, 'product:view')

  const hasFormPermission = isEdit ? canView && (canUpdate || canUpdateStatus) : canCreate

  const [form, setForm] = useState(initialForm)
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')
  const [toast, setToast] = useState(null)

  const items = [
    { title: 'Products', link: '/company/products' },
    {
      title: isEdit ? 'Edit Product' : 'Create Product',
      link: null,
    },
  ]

  useEffect(() => {
    document.title = `${isEdit ? 'Edit Product' : 'Create Product'} | MineERP`
  }, [isEdit])

  useEffect(() => {
    let active = true

    async function loadCategories() {
      try {
        const { data } = await axiosInstance.get('/erp/categories')

        if (!active) return

        if (data.success === false) {
          throw new Error(data.message || 'Unable to load categories.')
        }

        const list = data.categories || data.data?.categories || (Array.isArray(data.data) ? data.data : [])

        setCategories(Array.isArray(list) ? list : [])
      } catch (error) {
        if (active) {
          setApiError(error.response?.data?.message || error.message || 'Unable to load categories.')
        }
      }
    }

    loadCategories()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true

    async function loadProduct() {
      if (!isEdit) {
        setForm(initialForm)
        setLoading(false)
        return
      }

      setLoading(true)
      setApiError('')

      try {
        const { data } = await axiosInstance.get(`/erp/products/${id}`)

        if (data.success === false) {
          throw new Error(data.message || 'Unable to load product.')
        }

        if (!active) return

        const product = data.product || data.data?.product || data.data

        if (!product || !product._id) {
          throw new Error('Product not found.')
        }

        setForm({
          name: product.name || '',
          sku: product.sku || '',
          description: product.description || '',
          categoryId: product.categoryId?._id || product.categoryId || '',
          barcode: product.barcode || '',
          unit: product.unit || 'Piece',
          costPrice: String(product.costPrice ?? 0),
          sellingPrice: String(product.sellingPrice ?? 0),
          taxRate: String(product.taxRate ?? 0),
          openingStock: String(product.openingStock ?? 0),
          minStockLevel: String(product.minStockLevel ?? 0),
          imageUrl: product.imageUrl || '',
          status: product.status || 'Active',
        })
      } catch (error) {
        if (active) {
          setApiError(error.response?.data?.message || error.message || 'Unable to load product.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadProduct()

    return () => {
      active = false
    }
  }, [id, isEdit])

  function goBack() {
    navigate('/company/products')
  }

  function openDetailsPage() {
    if (!id || !canView) return
    navigate(`/company/products/${id}`)
  }

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))

    setErrors((current) => ({
      ...current,
      [field]: '',
    }))

    setApiError('')
  }

  function validateForm() {
    const nextErrors = {}

    const name = form.name.trim()
    const sku = form.sku.trim().toUpperCase()
    const barcode = form.barcode.trim()
    const description = form.description.trim()
    const imageUrl = form.imageUrl.trim()

    const costPrice = Number(form.costPrice)
    const sellingPrice = Number(form.sellingPrice)
    const taxRate = Number(form.taxRate)
    const openingStock = Number(form.openingStock)
    const minStockLevel = Number(form.minStockLevel)

    if (!name) {
      nextErrors.name = 'Product name is required.'
    } else if (name.length > 150) {
      nextErrors.name = 'Product name cannot exceed 150 characters.'
    }

    if (!sku) {
      nextErrors.sku = 'SKU is required.'
    } else if (sku.length > 50) {
      nextErrors.sku = 'SKU cannot exceed 50 characters.'
    }

    if (barcode.length > 100) {
      nextErrors.barcode = 'Barcode cannot exceed 100 characters.'
    }

    if (description.length > 2000) {
      nextErrors.description = 'Description cannot exceed 2000 characters.'
    }

    if (!Number.isFinite(costPrice) || costPrice < 0) {
      nextErrors.costPrice = 'Enter a valid cost price.'
    }

    if (!Number.isFinite(sellingPrice) || sellingPrice < 0) {
      nextErrors.sellingPrice = 'Enter a valid selling price.'
    }

    if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
      nextErrors.taxRate = 'Tax rate must be between 0 and 100.'
    }

    if (!Number.isFinite(openingStock) || openingStock < 0) {
      nextErrors.openingStock = 'Opening stock cannot be negative.'
    }

    if (!Number.isFinite(minStockLevel) || minStockLevel < 0) {
      nextErrors.minStockLevel = 'Minimum stock cannot be negative.'
    }

    if (imageUrl) {
      try {
        const parsedUrl = new URL(imageUrl)

        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
          nextErrors.imageUrl = 'Enter a valid HTTP or HTTPS image URL.'
        }
      } catch {
        nextErrors.imageUrl = 'Enter a valid image URL.'
      }
    }

    if (!form.unit) {
      nextErrors.unit = 'Please select a unit.'
    }

    if (!['Active', 'Inactive'].includes(form.status)) {
      nextErrors.status = 'Please select a valid status.'
    }

    setErrors(nextErrors)

    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (saving) return

    if (!validateForm()) return

    setSaving(true)
    setApiError('')

    try {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim().toUpperCase(),
        description: form.description.trim(),
        categoryId: form.categoryId || null,
        barcode: form.barcode.trim(),
        unit: form.unit,
        costPrice: Number(form.costPrice),
        sellingPrice: Number(form.sellingPrice),
        taxRate: Number(form.taxRate),
        openingStock: Number(form.openingStock),
        minStockLevel: Number(form.minStockLevel),
        imageUrl: form.imageUrl.trim(),
        status: form.status,
      }

      const response = isEdit ? await axiosInstance.patch(`/erp/products/${id}`, payload) : await axiosInstance.post('/erp/products', payload)

      if (response.data.success === false) {
        throw new Error(response.data.message || 'Unable to save product.')
      }

      navigate('/company/products', {
        replace: true,
        state: {
          successMessage: response.data.message || (isEdit ? 'Product updated successfully.' : 'Product created successfully.'),
        },
      })
    } catch (error) {
      setApiError(error.response?.data?.message || error.message || 'Something went wrong while saving the product.')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = (field) =>
    `h-10 w-full rounded-lg border bg-erp-surface px-3 text-xs text-erp-text outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10 disabled:cursor-not-allowed disabled:opacity-60 ${
      errors[field] ? 'border-red-400' : 'border-erp-border'
    }`

  const labelClass = 'block text-xs font-semibold text-erp-text-secondary'

  const errorText = (field) => (errors[field] ? <p className="text-[11px] text-red-600">{errors[field]}</p> : null)

  if (!hasFormPermission) {
    return (
      <div className="min-w-0 rounded-xl border border-rose-200 bg-white p-6 text-center">
        <h2 className="text-base font-semibold text-slate-800">Access Denied</h2>

        <p className="mt-2 text-sm text-slate-500">{isEdit ? 'You do not have permission to edit products.' : 'You do not have permission to create products.'}</p>

        <button type="button" onClick={() => navigate('/company/products', { replace: true })} className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-erp-primary px-4 text-xs font-semibold text-white hover:bg-erp-primary-hover">
          <ArrowLeft size={14} />
          Back to Products
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

        <Loading label="Loading product..." description="Preparing product information..." />
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-4 text-sm">
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        <div className="h-1 bg-erp-primary" />

        <div className="flex h-16 min-w-0 items-center justify-between gap-3 px-4 sm:px-5">
          {/* Left: Breadcrumb */}
          <div className="min-w-0 flex-1 overflow-hidden">
            <BreadCrumb items={items} />
          </div>

          {/* Right: Stock Information */}
          <div className="flex shrink-0 items-center gap-2">
            {stockStats.map((stat) => (
              <div key={stat.label} className={`flex h-9 items-center gap-2 rounded-lg border border-erp-border px-2.5 ${stat.background}`}>
                <span className="whitespace-nowrap text-[10px] font-medium text-erp-text-secondary">{stat.label}</span>

                <span className={`whitespace-nowrap text-xs font-bold ${stat.color}`}>
                  {stat.value.toLocaleString('en-IN')}
                  <span className="ml-1 text-[9px] font-medium text-erp-text-secondary">{unit}</span>
                </span>
              </div>
            ))}

            <button
              type="button"
              onClick={openStockHistory}
              title="View stock history"
              aria-label="View stock history"
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-erp-border bg-erp-surface px-3 text-xs font-semibold text-erp-primary transition hover:bg-erp-primary/5"
            >
              <History size={15} />
              <span>View History</span>
            </button>
          </div>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Basic Information */}
        <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex items-center gap-2 border-b border-erp-border px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
              <Package size={16} />
            </div>

            <div>
              <h2 className="text-sm font-bold text-erp-text">Basic Information</h2>
              <p className="text-[11px] text-erp-text-secondary">Enter the product name and identification details.</p>
            </div>
          </div>

          <div className="grid gap-3 p-3 sm:grid-cols-2">
            {/* Product Name */}
            <div className="min-w-0 space-y-1">
              <label htmlFor="product-name" className={labelClass}>
                Product Name <span className="text-erp-danger">*</span>
              </label>

              <input id="product-name" autoFocus required maxLength={150} value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="e.g. Wireless Mouse" disabled={saving} className={inputClass('name')} />

              {errorText('name')}

              <p className="text-right text-[10px] text-erp-text-muted">{form.name.length}/150</p>
            </div>

            {/* SKU */}
            <div className="min-w-0 space-y-1">
              <label htmlFor="product-sku" className={labelClass}>
                SKU <span className="text-erp-danger">*</span>
              </label>

              <input
                id="product-sku"
                required
                maxLength={50}
                value={form.sku}
                onChange={(event) => updateField('sku', event.target.value.toUpperCase())}
                placeholder="e.g. ELEC-MOUSE-001"
                disabled={saving}
                className={`${inputClass('sku')} uppercase`}
              />

              {errorText('sku')}

              <p className="text-[10px] text-erp-text-muted">Unique product identification code.</p>
            </div>

            {/* Barcode */}
            <div className="min-w-0 space-y-1">
              <label htmlFor="product-barcode" className={labelClass}>
                Barcode
              </label>

              <div className="relative">
                <Barcode size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-erp-text-muted" />

                <input id="product-barcode" maxLength={100} value={form.barcode} onChange={(event) => updateField('barcode', event.target.value)} placeholder="Enter barcode" disabled={saving} className={`${inputClass('barcode')} pl-9`} />
              </div>

              {errorText('barcode')}
            </div>

            {/* Category */}
            <div className="min-w-0 space-y-1">
              <label htmlFor="product-category" className={labelClass}>
                Category
              </label>

              <select id="product-category" value={form.categoryId} onChange={(event) => updateField('categoryId', event.target.value)} disabled={saving} className={inputClass('categoryId')}>
                <option value="">Select category</option>

                {categories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>

              {errorText('categoryId')}

              {categories.length === 0 && <p className="text-[10px] text-erp-text-muted">No categories found. You can create one from Categories.</p>}
            </div>

            {/* Description */}
            <div className="min-w-0 space-y-1 sm:col-span-2">
              <label htmlFor="product-description" className={labelClass}>
                Description
              </label>

              <textarea
                id="product-description"
                rows={3}
                maxLength={2000}
                value={form.description}
                onChange={(event) => updateField('description', event.target.value)}
                placeholder="Describe the product..."
                disabled={saving}
                className={`w-full resize-y rounded-lg border bg-erp-surface px-3 py-2.5 text-xs text-erp-text outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10 ${
                  errors.description ? 'border-red-400' : 'border-erp-border'
                }`}
              />

              {errorText('description')}

              <p className="text-right text-[10px] text-erp-text-muted">{form.description.length}/2000</p>
            </div>
          </div>
        </section>

        {/* Pricing and Tax */}
        <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex items-center gap-2 border-b border-erp-border px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
              <IndianRupee size={16} />
            </div>

            <div>
              <h2 className="text-sm font-bold text-erp-text">Pricing & Tax</h2>
              <p className="text-[11px] text-erp-text-secondary">Configure the purchase price, selling price and applicable tax.</p>
            </div>
          </div>

          <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* Cost Price */}
            <div className="min-w-0 space-y-1">
              <label htmlFor="cost-price" className={labelClass}>
                Cost Price (₹) <span className="text-erp-danger">*</span>
              </label>

              <input id="cost-price" type="number" min="0" step="0.01" required value={form.costPrice} onChange={(event) => updateField('costPrice', event.target.value)} disabled={saving} className={inputClass('costPrice')} />

              {errorText('costPrice')}
            </div>

            {/* Selling Price */}
            <div className="min-w-0 space-y-1">
              <label htmlFor="selling-price" className={labelClass}>
                Selling Price (₹) <span className="text-erp-danger">*</span>
              </label>

              <input id="selling-price" type="number" min="0" step="0.01" required value={form.sellingPrice} onChange={(event) => updateField('sellingPrice', event.target.value)} disabled={saving} className={inputClass('sellingPrice')} />

              {errorText('sellingPrice')}
            </div>

            {/* Tax Rate */}
            <div className="min-w-0 space-y-1">
              <label htmlFor="tax-rate" className={labelClass}>
                Tax Rate (%)
              </label>

              <div className="relative">
                <input id="tax-rate" type="number" min="0" max="100" step="0.01" value={form.taxRate} onChange={(event) => updateField('taxRate', event.target.value)} disabled={saving} className={`${inputClass('taxRate')} pr-9`} />

                <Percent size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-erp-text-muted" />
              </div>

              {errorText('taxRate')}
            </div>
          </div>
        </section>

        {/* Inventory */}
        <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex items-center gap-2 border-b border-erp-border px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
              <Boxes size={16} />
            </div>

            <div>
              <h2 className="text-sm font-bold text-erp-text">Inventory Information</h2>
              <p className="text-[11px] text-erp-text-secondary">Set the stock quantity, measurement unit and low-stock level.</p>
            </div>
          </div>

          <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* Unit */}
            <div className="min-w-0 space-y-1">
              <label htmlFor="product-unit" className={labelClass}>
                Unit <span className="text-erp-danger">*</span>
              </label>

              <select id="product-unit" value={form.unit} onChange={(event) => updateField('unit', event.target.value)} disabled={saving} className={inputClass('unit')}>
                {units.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>

              {errorText('unit')}
            </div>

            {/* Opening Stock */}
            <div className="min-w-0 space-y-1">
              <label htmlFor="opening-stock" className={labelClass}>
                Opening Stock <span className="text-erp-danger">*</span>
              </label>

              <input id="opening-stock" type="number" min="0" step="any" required value={form.openingStock} onChange={(event) => updateField('openingStock', event.target.value)} disabled={saving} className={inputClass('openingStock')} />

              {errorText('openingStock')}
            </div>

            {/* Minimum Stock */}
            <div className="min-w-0 space-y-1">
              <label htmlFor="min-stock" className={labelClass}>
                Minimum Stock Level
              </label>

              <input id="min-stock" type="number" min="0" step="any" value={form.minStockLevel} onChange={(event) => updateField('minStockLevel', event.target.value)} disabled={saving} className={inputClass('minStockLevel')} />

              {errorText('minStockLevel')}

              <p className="text-[10px] text-erp-text-muted">Used to identify low-stock products.</p>
            </div>
          </div>
        </section>

        {/* Product Image & Status */}
        <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex items-center gap-2 border-b border-erp-border px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
              <Image size={16} />
            </div>

            <div>
              <h2 className="text-sm font-bold text-erp-text">Product Image & Status</h2>
              <p className="text-[11px] text-erp-text-secondary">Set the product image and control its availability.</p>
            </div>
          </div>

          <div className="grid gap-4 p-4 lg:grid-cols-2">
            {/* Product Image */}
            <div className="min-w-0 space-y-3">
              {/* Large Image Preview */}
              <p className="break-all text-xs text-erp-text-secondary">{form.imageUrl.trim() || 'Enter an image URL to preview the product.'}</p>

              <div className="flex min-h-64 items-center justify-center overflow-hidden rounded-xl border border-erp-border bg-erp-hover/30 p-3 sm:min-h-80">
                {form.imageUrl.trim() ? (
                  <img
                    src={form.imageUrl}
                    alt="Product preview"
                    className="h-64 w-full rounded-lg object-contain sm:h-80"
                    onError={(event) => {
                      event.currentTarget.style.visibility = 'hidden'
                    }}
                    onLoad={(event) => {
                      event.currentTarget.style.visibility = 'visible'
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 text-erp-text-secondary">
                    <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-erp-primary/10 text-erp-primary">
                      <Package size={48} />
                    </div>
                    <p className="text-sm">No product image available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Product Status */}

            <div>
              <div className="flex min-w-0 flex-col gap-3">
                <label htmlFor="product-image" className={labelClass}>
                  Image URL
                </label>

                <input
                  id="product-image"
                  type="url"
                  maxLength={2048}
                  value={form.imageUrl}
                  onChange={(event) => updateField('imageUrl', event.target.value)}
                  placeholder="https://example.com/product.jpg"
                  disabled={saving}
                  className={inputClass('imageUrl')}
                />

                {errorText('imageUrl')}
              </div>

              <div className="flex min-w-0 flex-col gap-3">
                <label htmlFor="product-status" className={labelClass}>
                  Product Status
                </label>

                <select id="product-status" value={form.status} onChange={(event) => updateField('status', event.target.value)} disabled={saving || (isEdit ? !canUpdateStatus : !canCreate)} className={inputClass('status')}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>

                {errorText('status')}

                <div className={`flex items-start gap-3 rounded-xl border p-4 ${form.status === 'Active' ? 'border-emerald-200 bg-emerald-50/70 text-emerald-800' : 'border-amber-200 bg-amber-50/70 text-amber-800'}`}>
                  <CheckCircle2 size={20} className="mt-0.5 shrink-0" />

                  <div>
                    <p className="text-sm font-semibold">{form.status === 'Active' ? 'Active Product' : 'Inactive Product'}</p>
                    <p className="mt-1 text-xs leading-5">
                      {form.status === 'Active' ? 'This product is active and available for normal product selection and operations.' : 'This product is retained in the system but marked as unavailable for normal use.'}
                    </p>
                  </div>
                </div>

                <div className="mt-auto rounded-xl border border-erp-border bg-erp-hover/30 p-4">
                  <p className="text-sm font-semibold text-erp-text">Product Image Guidelines</p>
                  <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-5 text-erp-text-secondary">
                    <li>Use a publicly accessible image URL. & Prefer a clear, high-quality product image.</li>
                    {/* <li>Prefer a clear, high-quality product image.</li> */}
                    <li>Supported formats depend on the image URL and browser.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* API Error */}
        {apiError && (
          <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <p>{apiError}</p>
          </div>
        )}

        {/* Sticky Footer */}
        <footer className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-erp-border bg-erp-surface/95 p-2.5 shadow-sm backdrop-blur">
          <div className="hidden min-w-0 sm:block">
            <p className="text-xs font-semibold text-erp-text">{isEdit ? 'Update product details' : 'Ready to create product'}</p>

            <p className="mt-0.5 text-[10px] text-erp-text-secondary">Review the information before saving.</p>
          </div>

          <div className="ml-auto flex items-center gap-2">
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
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-erp-primary px-4 text-xs font-bold text-white transition hover:bg-erp-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}

              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </footer>
      </form>
    </div>
  )
}
