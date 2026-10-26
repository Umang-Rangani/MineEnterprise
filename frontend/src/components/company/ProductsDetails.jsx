import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Package, Tag, RefreshCw, Pencil, Trash2, CheckCircle2, FileText, CalendarDays, Clock, AlertCircle, X, Ban, Barcode, IndianRupee, Boxes, Image as ImageIcon, Percent, Warehouse } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import Loading from '../Loading/Loading'
import { hasPermission, useAuth } from '../../context/AuthContext'
import TrashBox from '../../TrashBox/TrashBox'

const buttonBase = 'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50'

function formatDate(date) {
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

function formatCurrency(value) {
  const amount = Number(value)

  if (!Number.isFinite(amount)) return 'Not provided'

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatQuantity(value, unit = '') {
  const quantity = Number(value)

  if (!Number.isFinite(quantity)) return 'Not provided'

  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 3,
  }).format(quantity)

  return unit ? `${formatted} ${unit}` : formatted
}

function DetailItem({ label, value, icon: Icon, inactive }) {
  return (
    <div className={`min-w-0 rounded-lg border p-3 ${inactive ? 'border-erp-disabled-border bg-erp-disabled-light/50' : 'border-erp-border bg-erp-surface'}`}>
      <p className={`mb-2 flex items-center gap-2 text-xs ${inactive ? 'text-erp-disabled-text' : 'text-erp-text-secondary'}`}>
        {Icon && <Icon size={14} className="shrink-0" />}
        {label}
      </p>

      <p className={`break-words text-sm font-semibold ${inactive ? 'text-erp-disabled-text' : 'text-erp-text'}`}>{value === null || value === undefined || value === '' ? 'Not provided' : value}</p>
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

export default function ProductsDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { permissions } = useAuth()

  const canView = hasPermission(permissions, 'product:view')
  const canUpdate = hasPermission(permissions, 'product:update')
  const canUpdateStatus = hasPermission(permissions, 'product:update-status')
  const canDelete = hasPermission(permissions, 'product:delete')

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const isInactive =
    String(product?.status ?? '')
      .trim()
      .toLowerCase() === 'inactive'

  const canEdit = canUpdate && (!isInactive || canUpdateStatus)

  const panelClass = isInactive ? 'border-erp-disabled-border bg-erp-disabled-surface' : 'border-erp-border bg-erp-surface'

  const iconBoxClass = isInactive ? 'bg-erp-disabled-light text-erp-disabled' : 'bg-erp-primary-light text-erp-primary'

  const headingTextClass = isInactive ? 'text-erp-disabled-text' : 'text-erp-text'

  const secondaryTextClass = isInactive ? 'text-erp-disabled-text' : 'text-erp-text-secondary'

  function showToast(type, message) {
    setToast({ type, message })
  }

  function closeToast() {
    setToast(null)
  }

  async function fetchProduct(showRefreshMessage = false) {
    setLoading(true)
    setRefreshing(showRefreshMessage)
    setError('')

    try {
      if (!id) {
        throw new Error('Product ID is missing.')
      }

      const { data } = await axiosInstance.get(`/erp/products/${encodeURIComponent(id)}`)

      if (data?.success === false) {
        throw new Error(data.message || 'Unable to load product details.')
      }

      const fetchedProduct = data?.product || data?.data?.product || data?.data

      if (!fetchedProduct || !fetchedProduct._id) {
        throw new Error(data?.message || 'Product not found.')
      }

      setProduct(fetchedProduct)

      if (showRefreshMessage) {
        showToast('success', 'Product details refreshed successfully.')
      }
    } catch (err) {
      setProduct(null)

      setError(err.response?.data?.message || err.message || 'Unable to load product details.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    document.title = 'Product Details | MineERP'

    let active = true

    async function loadProduct() {
      setLoading(true)
      setError('')

      try {
        if (!id) {
          throw new Error('Product ID is missing.')
        }

        const { data } = await axiosInstance.get(`/erp/products/${encodeURIComponent(id)}`)

        if (data?.success === false) {
          throw new Error(data.message || 'Unable to load product details.')
        }

        const fetchedProduct = data?.product || data?.data?.product || data?.data

        if (!fetchedProduct || !fetchedProduct._id) {
          throw new Error(data?.message || 'Product not found.')
        }

        if (active) setProduct(fetchedProduct)
      } catch (err) {
        if (active) {
          setProduct(null)
          setError(err.response?.data?.message || err.message || 'Unable to load product details.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadProduct()

    return () => {
      active = false
    }
  }, [id])

  function handleEdit() {
    if (!product || !canEdit) return

    navigate(`/company/products/${encodeURIComponent(product._id || id)}/edit`)
  }

  async function handleDelete() {
    if (!product || deleting || !canDelete) return

    setDeleting(true)

    try {
      const { data } = await axiosInstance.delete(`/erp/products/${encodeURIComponent(product._id || id)}`)

      if (data?.success === false) {
        throw new Error(data.message || 'Unable to delete product.')
      }

      navigate('/company/products', {
        replace: true,
        state: {
          successMessage: data?.message || 'Product deleted successfully.',
        },
      })
    } catch (err) {
      setShowDeleteModal(false)

      showToast('error', err.response?.data?.message || err.message || 'Unable to delete product.')
    } finally {
      setDeleting(false)
    }
  }

  const categoryName = typeof product?.categoryId === 'object' ? product.categoryId?.name : product?.categoryName

  const breadcrumbItems = [
    { title: 'Products', link: '/company/products' },
    { title: product?.name || 'Product Details', link: null },
  ]

  if (!canView) {
    return (
      <div className="min-w-0 rounded-xl border border-erp-border bg-erp-surface p-6 text-center">
        <h2 className="text-base font-semibold text-erp-text">Access Denied</h2>

        <p className="mt-2 text-sm text-erp-text-secondary">You do not have permission to view product details.</p>

        <button type="button" onClick={() => navigate('/company/products', { replace: true })} className={`${buttonBase} mt-4 bg-erp-primary text-white hover:bg-erp-primary-hover`}>
          Back to Products
        </button>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-4 text-erp-text">
      {toast && <Toast toast={toast} onClose={closeToast} />}

      {/* Header */}
      <section className={`h-17 overflow-hidden rounded-xl border shadow-erp-card ${panelClass}`}>
        <div className={`h-1 ${isInactive ? 'bg-erp-disabled' : 'bg-erp-primary'}`} />

        <div className="flex min-w-0 flex-col gap-3 px-4 py-3 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1 overflow-hidden">
            <BreadCrumb items={breadcrumbItems} />
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold ${isInactive ? 'bg-erp-disabled-light text-erp-disabled-text' : 'bg-erp-primary-light text-erp-primary-dark'}`}>
              {isInactive ? <Ban size={13} /> : <Package size={13} />}
              Product Details
            </span>

            <button
              type="button"
              onClick={() => fetchProduct(true)}
              disabled={loading || refreshing || deleting}
              className={`${buttonBase} border ${isInactive ? 'border-erp-disabled-border bg-erp-disabled-light text-erp-disabled-text hover:bg-erp-disabled-border/40' : 'border-erp-border bg-erp-surface hover:bg-erp-hover'}`}
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>

            {canEdit && (
              <button
                type="button"
                onClick={handleEdit}
                disabled={loading || refreshing || deleting || !product}
                title={isInactive ? 'Activate the product before editing.' : 'Edit product'}
                className={`${buttonBase} bg-erp-primary text-white hover:bg-erp-primary-hover`}
              >
                <Pencil size={14} />
                Edit
              </button>
            )}

            {canDelete && (
              <button type="button" onClick={() => setShowDeleteModal(true)} disabled={loading || refreshing || deleting || !product} className={`${buttonBase} border border-red-200 bg-red-50 text-red-600 hover:bg-red-100`}>
                <Trash2 size={14} />
                Delete
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Loading */}
      {loading && <Loading label="Loading product details..." description="Preparing product information..." />}

      {/* Error */}
      {!loading && error && (
        <section className="rounded-xl border border-erp-danger-border bg-erp-danger-light p-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-erp-danger" />

            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-erp-danger">Unable to load product</h2>

              <p className="mt-1 break-words text-sm text-erp-text">{error}</p>

              <button type="button" onClick={() => fetchProduct()} className={`${buttonBase} mt-3 border border-erp-danger-border bg-white text-erp-danger hover:bg-erp-danger-light`}>
                <RefreshCw size={14} />
                Try Again
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Product Details */}
      {!loading && !error && product && (
        <>
          {/* Inactive Notice */}
          {isInactive && (
            <div className="flex items-start gap-3 rounded-xl border border-erp-disabled-border bg-erp-disabled-light p-4">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-erp-disabled-border/50 text-erp-disabled-text">
                <Ban size={18} />
              </div>

              <div className="min-w-0">
                <h2 className="text-sm font-bold text-erp-disabled-text">This product is inactive</h2>

                <p className="mt-1 text-xs leading-5 text-erp-disabled-text">This product is currently disabled for normal operations. Activate it before editing its details.</p>
              </div>
            </div>
          )}

          <div className="grid min-w-0 grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
            {/* Product Information */}
            <section className={`min-w-0 rounded-xl border p-4 shadow-erp-card sm:p-5 ${panelClass}`}>
              <SectionHeader icon={Package} title="Product Information" description="Basic product details and identification" inactive={isInactive} />

              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                <DetailItem label="Product Name" value={product.name} icon={Tag} inactive={isInactive} />

                <DetailItem label="SKU" value={product.sku} icon={FileText} inactive={isInactive} />

                <DetailItem label="Barcode" value={product.barcode} icon={Barcode} inactive={isInactive} />

                <DetailItem label="Category" value={categoryName || 'Uncategorized'} icon={Boxes} inactive={isInactive} />

                <div className="sm:col-span-2">
                  <DetailItem label="Description" value={product.description || 'No description provided.'} icon={FileText} inactive={isInactive} />
                </div>
              </div>

              <div className={`mt-4 flex items-start gap-2 rounded-lg p-3 ${isInactive ? 'bg-erp-disabled-light' : 'bg-erp-surface-secondary/60'}`}>
                {isInactive ? <Ban size={15} className="mt-0.5 shrink-0 text-erp-disabled" /> : <Package size={15} className="mt-0.5 shrink-0 text-erp-text-muted" />}

                <p className={`text-xs leading-5 ${secondaryTextClass}`}>
                  Product information is scoped to your company.
                  {isInactive ? ' This product is inactive.' : ' Keep its SKU and category information accurate.'}
                </p>
              </div>
            </section>

            {/* Pricing and Tax */}
            <section className={`min-w-0 rounded-xl border p-4 shadow-erp-card sm:p-5 ${panelClass}`}>
              <SectionHeader icon={IndianRupee} title="Pricing & Tax" description="Product purchase and selling prices" inactive={isInactive} />

              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                <DetailItem label="Cost Price" value={formatCurrency(product.costPrice)} icon={IndianRupee} inactive={isInactive} />

                <DetailItem label="Selling Price" value={formatCurrency(product.sellingPrice)} icon={IndianRupee} inactive={isInactive} />

                <DetailItem label="Tax Rate" value={`${Number(product.taxRate ?? 0)}%`} icon={Percent} inactive={isInactive} />

                <DetailItem label="Potential Margin" value={formatCurrency(Number(product.sellingPrice ?? 0) - Number(product.costPrice ?? 0))} icon={IndianRupee} inactive={isInactive} />
              </div>

              <div className={`mt-4 flex items-start gap-2 rounded-lg p-3 ${isInactive ? 'bg-erp-disabled-light' : 'bg-erp-surface-secondary/60'}`}>
                <AlertCircle size={15} className={`mt-0.5 shrink-0 ${isInactive ? 'text-erp-disabled' : 'text-erp-text-muted'}`} />

                <p className={`text-xs leading-5 ${secondaryTextClass}`}>Potential margin is the difference between the selling price and cost price, before tax and other expenses.</p>
              </div>
            </section>

            {/* Inventory Information */}
            <section className={`min-w-0 rounded-xl border p-4 shadow-erp-card sm:p-5 ${panelClass}`}>
              <SectionHeader icon={Warehouse} title="Inventory Information" description="Stock quantity and low-stock threshold" inactive={isInactive} />

              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                <DetailItem label="Unit" value={product.unit} icon={Boxes} inactive={isInactive} />

                <DetailItem label="Opening Stock" value={formatQuantity(product.openingStock, product.unit)} icon={Package} inactive={isInactive} />

                <DetailItem label="Minimum Stock Level" value={formatQuantity(product.minStockLevel, product.unit)} icon={AlertCircle} inactive={isInactive} />

                <DetailItem label="Stock Status" value={Number(product.openingStock ?? 0) <= Number(product.minStockLevel ?? 0) ? 'Low Stock' : 'Stock Available'} icon={Boxes} inactive={isInactive} />
              </div>

              <div className={`mt-4 flex items-start gap-2 rounded-lg p-3 ${isInactive ? 'bg-erp-disabled-light' : 'bg-erp-surface-secondary/60'}`}>
                <AlertCircle size={15} className={`mt-0.5 shrink-0 ${isInactive ? 'text-erp-disabled' : 'text-erp-text-muted'}`} />

                <p className={`text-xs leading-5 ${secondaryTextClass}`}>The stock status shown here is based on the product's opening stock. It does not represent live stock movements unless your backend updates this field.</p>
              </div>
            </section>

            {/* Product Image */}
            <section className={`min-w-0 rounded-xl border p-4 shadow-erp-card sm:p-5 ${panelClass}`}>
              <SectionHeader icon={ImageIcon} title="Product Image" description="Product image preview" inactive={isInactive} />

              {product.imageUrl ? (
                <div className={`flex min-h-56 items-center justify-center rounded-lg border p-4 ${isInactive ? 'border-erp-disabled-border bg-erp-disabled-light/50' : 'border-erp-border bg-white'}`}>
                  <img
                    src={product.imageUrl}
                    alt={product.name || 'Product image'}
                    className="max-h-64 max-w-full rounded-lg object-contain"
                    onError={(event) => {
                      event.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
              ) : (
                <div className={`flex min-h-56 flex-col items-center justify-center gap-3 rounded-lg border border-dashed ${isInactive ? 'border-erp-disabled-border bg-erp-disabled-light/50' : 'border-erp-border bg-erp-surface-secondary/40'}`}>
                  <div className={`flex size-14 items-center justify-center rounded-xl ${iconBoxClass}`}>
                    <ImageIcon size={25} />
                  </div>

                  <p className={`text-sm font-semibold ${headingTextClass}`}>No product image</p>

                  <p className={`text-xs ${secondaryTextClass}`}>No image URL has been provided for this product.</p>
                </div>
              )}

              <div className="mt-3">
                <DetailItem label="Image URL" value={product.imageUrl || 'No image URL provided.'} icon={ImageIcon} inactive={isInactive} />
              </div>
            </section>

            {/* Product Activity */}
            <section className={`min-w-0 rounded-xl border p-4 shadow-erp-card sm:p-5 lg:col-span-2 ${panelClass}`}>
              <SectionHeader icon={CalendarDays} title="Product Activity" description="Creation, modification and current status" inactive={isInactive} />

              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {/* Created On */}
                <div className={`flex min-w-0 items-start gap-3 rounded-lg border p-3 ${isInactive ? 'border-erp-disabled-border bg-erp-disabled-light/50' : 'border-erp-border'}`}>
                  <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${iconBoxClass}`}>
                    <CalendarDays size={16} />
                  </div>

                  <div className="min-w-0">
                    <p className={`text-xs font-medium ${secondaryTextClass}`}>Created On</p>

                    <p className={`mt-1 break-words text-sm font-semibold ${headingTextClass}`}>{formatDate(product.createdAt)}</p>
                  </div>
                </div>

                {/* Last Updated */}
                <div className={`flex min-w-0 items-start gap-3 rounded-lg border p-3 ${isInactive ? 'border-erp-disabled-border bg-erp-disabled-light/50' : 'border-erp-border'}`}>
                  <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${iconBoxClass}`}>
                    <Clock size={16} />
                  </div>

                  <div className="min-w-0">
                    <p className={`text-xs font-medium ${secondaryTextClass}`}>Last Updated</p>

                    <p className={`mt-1 break-words text-sm font-semibold ${headingTextClass}`}>{formatDate(product.updatedAt)}</p>
                  </div>
                </div>

                {/* Status */}
                <div className={`flex min-w-0 items-center justify-between gap-3 rounded-lg border p-3 ${isInactive ? 'border-erp-disabled-border bg-erp-disabled-light/50' : 'border-erp-border bg-erp-surface'}`}>
                  <p className={`flex items-center gap-2 text-xs ${secondaryTextClass}`}>
                    <CheckCircle2 size={14} />
                    Current Status
                  </p>

                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${isInactive ? 'border border-erp-disabled-border bg-erp-disabled-light text-erp-disabled-text' : 'bg-emerald-50 text-emerald-700'}`}>
                    {isInactive ? <Ban size={12} /> : <span className="size-1.5 rounded-full bg-emerald-500" />}

                    {product.status || 'Not specified'}
                  </span>
                </div>
              </div>

              <div className={`mt-3 flex items-start gap-2 rounded-lg px-3 py-2.5 ${isInactive ? 'bg-erp-disabled-light' : 'bg-erp-surface-secondary/60'}`}>
                <AlertCircle size={15} className={`mt-0.5 shrink-0 ${isInactive ? 'text-erp-disabled' : 'text-erp-text-muted'}`} />

                <p className={`text-xs leading-5 ${secondaryTextClass}`}>Product details and activity are limited to the company associated with the logged-in account.</p>
              </div>
            </section>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}

      {/* Delete Confirmation */}
      <TrashBox
        isOpen={showDeleteModal}
        onClose={() => {
          if (!deleting) setShowDeleteModal(false)
        }}
        title="Delete Product?"
        message={
          <>
            Are you sure you want to delete <strong className="font-bold text-slate-900">{product?.name || 'this product'}</strong>?
          </>
        }
        actionButtonText="Delete Product"
        cancelButtonText="Cancel"
        onAction={handleDelete}
        isProcessing={deleting}
        variant="delete"
      />
    </div>
  )
}
