import { useCallback, useEffect, useState } from 'react'
import { Search, Plus, Package, Pencil, Trash2, X, RefreshCw, ChevronLeft, ChevronRight, AlertCircle, Boxes, IndianRupee, Filter, Eye } from 'lucide-react'
import axiosInstance from '../../api/axiosInstance'

const initialForm = {
  name: '',
  sku: '',
  description: '',
  categoryId: '',
  barcode: '',
  unit: 'Piece',
  costPrice: '0',
  sellingPrice: '0',
  taxRate: '0',
  openingStock: '0',
  minStockLevel: '0',
  imageUrl: '',
  status: 'Active',
}

export default function CompanyProducts() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  })
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [form, setForm] = useState(initialForm)
  const [deleteProduct, setDeleteProduct] = useState(null)
  const [viewProduct, setViewProduct] = useState(null)

  const loadProducts = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await axiosInstance.get('/erp/products', {
        params: {
          page,
          limit: 10,
          search: search.trim() || undefined,
          status: statusFilter || undefined,
          categoryId: categoryFilter || undefined,
        },
      })

      const data = response.data
      setProducts(data.products || data.data?.products || [])

      console.log('PRODUCT DATA:', data.products || data.data?.products || [])
      setPagination(
        data.pagination || {
          page,
          limit: 10,
          total: data.total || 0,
          totalPages: data.totalPages || 1,
        },
      )
    } catch (err) {
      setError(err.response?.data?.message || 'Products load કરવામાં સમસ્યા આવી. Backend API અને permissions તપાસો.')
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter, categoryFilter])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await axiosInstance.get('/erp/categories')
        setCategories(response.data.categories || response.data.data?.categories || response.data.data || [])
      } catch {
        setCategories([])
      }
    }

    loadCategories()
  }, [])

  useEffect(() => {
    if (success) {
      const timeout = setTimeout(() => setSuccess(''), 3000)
      return () => clearTimeout(timeout)
    }
  }, [success])

  const openCreateModal = () => {
    setEditingProduct(null)
    setForm(initialForm)
    setError('')
    setModalOpen(true)
  }

  const openEditModal = (product) => {
    setEditingProduct(product)
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
    setError('')
    setModalOpen(true)
  }

  const handleFormChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    const payload = {
      ...form,
      categoryId: form.categoryId || null,
      costPrice: Number(form.costPrice),
      sellingPrice: Number(form.sellingPrice),
      taxRate: Number(form.taxRate),
      openingStock: Number(form.openingStock),
      minStockLevel: Number(form.minStockLevel),
    }

    try {
      if (editingProduct) {
        await axiosInstance.patch(`/erp/products/${editingProduct._id}`, payload)
        setSuccess('Product successfully updated.')
      } else {
        await axiosInstance.post('/erp/products', payload)
        setSuccess('Product successfully created.')
      }

      setModalOpen(false)
      setEditingProduct(null)
      setForm(initialForm)
      await loadProducts()
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Product save કરવામાં સમસ્યા આવી.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteProduct) return

    setSaving(true)
    setError('')

    try {
      await axiosInstance.delete(`/erp/products/${deleteProduct._id}`)
      setDeleteProduct(null)
      setSuccess('Product successfully deleted.')

      if (products.length === 1 && page > 1) {
        setPage((current) => current - 1)
      } else {
        await loadProducts()
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Product delete કરવામાં સમસ્યા આવી.')
    } finally {
      setSaving(false)
    }
  }

  const formatPrice = (value) =>
    Number(value || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  const getCategoryName = (product) => {
    if (product.categoryId && typeof product.categoryId === 'object') {
      return product.categoryId.name || 'Uncategorized'
    }

    return categories.find((category) => category._id === product.categoryId)?.name || 'Uncategorized'
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-erp-muted">
            <Package size={16} />
            <span>Inventory Management</span>
            <span>/</span>
            <span className="text-erp-text">Products</span>
          </div>

          <h1 className="mt-2 text-2xl font-bold text-erp-text">Products</h1>
          <p className="mt-1 text-sm text-erp-muted">Manage your product catalogue, pricing and stock details.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadProducts}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-erp-border bg-erp-surface px-4 py-2.5 text-sm font-medium text-erp-text transition hover:bg-erp-hover disabled:opacity-60"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button type="button" onClick={openCreateModal} className="inline-flex items-center justify-center gap-2 rounded-xl bg-erp-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-erp-primary-hover">
            <Plus size={17} />
            Add Product
          </button>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <Package size={17} />
          {success}
        </div>
      )}

      {error && !modalOpen && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-erp-border bg-erp-surface p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-erp-muted">Total Products</p>
              <p className="mt-2 text-2xl font-bold text-erp-text">{pagination.total ?? products.length}</p>
            </div>
            <div className="rounded-xl bg-erp-primary-light p-3 text-erp-primary">
              <Package size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-erp-border bg-erp-surface p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-erp-muted">Active on This Page</p>
              <p className="mt-2 text-2xl font-bold text-erp-text">{products.filter((product) => product.status === 'Active').length}</p>
            </div>
            <div className="rounded-xl bg-green-50 p-3 text-green-700">
              <Boxes size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-erp-border bg-erp-surface p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-erp-muted">Selling Value on This Page</p>
              <p className="mt-2 flex items-center gap-1 text-2xl font-bold text-erp-text">
                <IndianRupee size={21} />
                {formatPrice(products.reduce((total, product) => total + Number(product.sellingPrice || 0) * Number(product.openingStock || 0), 0))}
              </p>
            </div>
            <div className="rounded-xl bg-erp-primary-light p-3 text-erp-primary">
              <IndianRupee size={22} />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-erp-border bg-erp-surface p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-erp-muted" />
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Search product name, SKU or barcode..."
              className="w-full rounded-xl border border-erp-border bg-erp-bg py-2.5 pl-10 pr-4 text-sm text-erp-text outline-none transition placeholder:text-erp-muted focus:border-erp-primary"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex items-center gap-2">
              <Filter size={17} className="shrink-0 text-erp-muted" />
              <select
                value={categoryFilter}
                onChange={(event) => {
                  setCategoryFilter(event.target.value)
                  setPage(1)
                }}
                className="min-w-40 rounded-xl border border-erp-border bg-erp-surface px-3 py-2.5 text-sm text-erp-text outline-none focus:border-erp-primary"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value)
                setPage(1)
              }}
              className="rounded-xl border border-erp-border bg-erp-surface px-3 py-2.5 text-sm text-erp-text outline-none focus:border-erp-primary"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-erp-border bg-erp-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-erp-border px-5 py-4">
          <div>
            <h2 className="font-semibold text-erp-text">Product Catalogue</h2>
            <p className="mt-1 text-xs text-erp-muted">{pagination.total ?? products.length} product(s) found</p>
          </div>
          <span className="rounded-lg bg-erp-bg px-3 py-1.5 text-xs font-medium text-erp-muted">
            Page {pagination.page || page} of {pagination.totalPages || 1}
          </span>
        </div>

        {loading ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-erp-muted">
            <RefreshCw size={26} className="animate-spin text-erp-primary" />
            <p className="text-sm">Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
            <div className="rounded-2xl bg-erp-bg p-4 text-erp-muted">
              <Package size={30} />
            </div>
            <h3 className="mt-4 font-semibold text-erp-text">No products found</h3>
            <p className="mt-1 max-w-sm text-sm text-erp-muted">Add your first product or change your search and filters.</p>
            <button type="button" onClick={openCreateModal} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-erp-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-erp-primary-hover">
              <Plus size={16} />
              Add Product
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead className="bg-erp-bg text-xs uppercase tracking-wide text-erp-muted">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Product</th>
                    <th className="px-4 py-4 font-semibold">SKU</th>
                    <th className="px-4 py-4 font-semibold">Category</th>
                    <th className="px-4 py-4 font-semibold">Cost Price</th>
                    <th className="px-4 py-4 font-semibold">Selling Price</th>
                    <th className="px-4 py-4 font-semibold">Opening Stock</th>
                    <th className="px-4 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-erp-border">
                  {products.map((product) => (
                    <tr key={product._id} className="transition hover:bg-erp-hover">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="h-11 w-11 rounded-xl border border-erp-border object-cover" />
                          ) : (
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">
                              <Package size={20} />
                            </div>
                          )}
                          <div className="max-w-56">
                            <p className="truncate text-sm font-semibold text-erp-text">{product.name}</p>
                            <p className="mt-1 truncate text-xs text-erp-muted">{product.barcode || 'No barcode'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-erp-text">{product.sku}</td>
                      <td className="px-4 py-4 text-sm text-erp-muted">{getCategoryName(product)}</td>
                      <td className="px-4 py-4 text-sm text-erp-text">₹{formatPrice(product.costPrice)}</td>
                      <td className="px-4 py-4 text-sm font-semibold text-erp-text">₹{formatPrice(product.sellingPrice)}</td>
                      <td className="px-4 py-4 text-sm text-erp-text">
                        {Number(product.openingStock || 0)} <span className="text-erp-muted">{product.unit || 'Piece'}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${product.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{product.status}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setViewProduct(product)}
                            title="View product"
                            className="rounded-lg border border-erp-border p-2 text-erp-muted transition hover:border-erp-primary hover:bg-erp-primary-light hover:text-erp-primary"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(product)}
                            title="Edit product"
                            className="rounded-lg border border-erp-border p-2 text-erp-muted transition hover:border-erp-primary hover:bg-erp-primary-light hover:text-erp-primary"
                          >
                            <Pencil size={16} />
                          </button>
                          <button type="button" onClick={() => setDeleteProduct(product)} title="Delete product" className="rounded-lg border border-erp-border p-2 text-erp-muted transition hover:border-red-200 hover:bg-red-50 hover:text-red-600">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-erp-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-erp-muted">
                Showing {products.length} of {pagination.total ?? products.length} products
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-erp-border px-3 py-2 text-sm text-erp-text hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= (pagination.totalPages || 1)}
                  onClick={() => setPage((current) => Math.min(pagination.totalPages || 1, current + 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-erp-border px-3 py-2 text-sm text-erp-text hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-erp-border bg-erp-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-erp-border px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-lg font-bold text-erp-text">{editingProduct ? 'Edit Product' : 'Add Product'}</h2>
                <p className="mt-1 text-sm text-erp-muted">Enter the product details below.</p>
              </div>
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg p-2 text-erp-muted hover:bg-erp-hover hover:text-erp-text">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid max-h-[65vh] grid-cols-1 gap-4 overflow-y-auto p-5 sm:grid-cols-2 sm:p-6">
                {error && (
                  <div className="col-span-full flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle size={17} className="mt-0.5 shrink-0" />
                    {error}
                  </div>
                )}

                <label className="space-y-1.5 text-sm font-medium text-erp-text">
                  Product Name *
                  <input
                    required
                    maxLength={150}
                    name="name"
                    value={form.name}
                    onChange={handleFormChange}
                    placeholder="e.g. Wireless Keyboard"
                    className="w-full rounded-xl border border-erp-border bg-erp-surface px-3 py-2.5 font-normal outline-none focus:border-erp-primary"
                  />
                </label>

                <label className="space-y-1.5 text-sm font-medium text-erp-text">
                  SKU *
                  <input
                    required
                    maxLength={80}
                    name="sku"
                    value={form.sku}
                    onChange={handleFormChange}
                    placeholder="e.g. KEY-001"
                    className="w-full rounded-xl border border-erp-border bg-erp-surface px-3 py-2.5 font-normal uppercase outline-none focus:border-erp-primary"
                  />
                </label>

                <label className="space-y-1.5 text-sm font-medium text-erp-text">
                  Category
                  <select name="categoryId" value={form.categoryId} onChange={handleFormChange} className="w-full rounded-xl border border-erp-border bg-erp-surface px-3 py-2.5 font-normal outline-none focus:border-erp-primary">
                    <option value="">Uncategorized</option>
                    {categories.map((category) => (
                      <option key={category._id} value={category._id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5 text-sm font-medium text-erp-text">
                  Barcode
                  <input
                    name="barcode"
                    value={form.barcode}
                    onChange={handleFormChange}
                    placeholder="Enter barcode"
                    className="w-full rounded-xl border border-erp-border bg-erp-surface px-3 py-2.5 font-normal outline-none focus:border-erp-primary"
                  />
                </label>

                <label className="space-y-1.5 text-sm font-medium text-erp-text">
                  Cost Price (₹) *
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    name="costPrice"
                    value={form.costPrice}
                    onChange={handleFormChange}
                    className="w-full rounded-xl border border-erp-border bg-erp-surface px-3 py-2.5 font-normal outline-none focus:border-erp-primary"
                  />
                </label>

                <label className="space-y-1.5 text-sm font-medium text-erp-text">
                  Selling Price (₹) *
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    name="sellingPrice"
                    value={form.sellingPrice}
                    onChange={handleFormChange}
                    className="w-full rounded-xl border border-erp-border bg-erp-surface px-3 py-2.5 font-normal outline-none focus:border-erp-primary"
                  />
                </label>

                <label className="space-y-1.5 text-sm font-medium text-erp-text">
                  Tax Rate (%)
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    name="taxRate"
                    value={form.taxRate}
                    onChange={handleFormChange}
                    className="w-full rounded-xl border border-erp-border bg-erp-surface px-3 py-2.5 font-normal outline-none focus:border-erp-primary"
                  />
                </label>

                <label className="space-y-1.5 text-sm font-medium text-erp-text">
                  Unit
                  <input
                    name="unit"
                    maxLength={30}
                    value={form.unit}
                    onChange={handleFormChange}
                    placeholder="Piece, Kg, Box..."
                    className="w-full rounded-xl border border-erp-border bg-erp-surface px-3 py-2.5 font-normal outline-none focus:border-erp-primary"
                  />
                </label>

                <label className="space-y-1.5 text-sm font-medium text-erp-text">
                  Opening Stock
                  <input
                    type="number"
                    min="0"
                    step="1"
                    name="openingStock"
                    value={form.openingStock}
                    onChange={handleFormChange}
                    className="w-full rounded-xl border border-erp-border bg-erp-surface px-3 py-2.5 font-normal outline-none focus:border-erp-primary"
                  />
                </label>

                <label className="space-y-1.5 text-sm font-medium text-erp-text">
                  Minimum Stock Level
                  <input
                    type="number"
                    min="0"
                    step="1"
                    name="minStockLevel"
                    value={form.minStockLevel}
                    onChange={handleFormChange}
                    className="w-full rounded-xl border border-erp-border bg-erp-surface px-3 py-2.5 font-normal outline-none focus:border-erp-primary"
                  />
                </label>

                <label className="space-y-1.5 text-sm font-medium text-erp-text">
                  Status
                  <select name="status" value={form.status} onChange={handleFormChange} className="w-full rounded-xl border border-erp-border bg-erp-surface px-3 py-2.5 font-normal outline-none focus:border-erp-primary">
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </label>

                <label className="space-y-1.5 text-sm font-medium text-erp-text">
                  Image URL
                  <input
                    type="url"
                    name="imageUrl"
                    value={form.imageUrl}
                    onChange={handleFormChange}
                    placeholder="https://..."
                    className="w-full rounded-xl border border-erp-border bg-erp-surface px-3 py-2.5 font-normal outline-none focus:border-erp-primary"
                  />
                </label>

                <label className="space-y-1.5 text-sm font-medium text-erp-text sm:col-span-2">
                  Description
                  <textarea
                    rows={3}
                    maxLength={2000}
                    name="description"
                    value={form.description}
                    onChange={handleFormChange}
                    placeholder="Product description..."
                    className="w-full resize-y rounded-xl border border-erp-border bg-erp-surface px-3 py-2.5 font-normal outline-none focus:border-erp-primary"
                  />
                </label>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-erp-border px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                <button type="button" onClick={() => setModalOpen(false)} disabled={saving} className="rounded-xl border border-erp-border px-5 py-2.5 text-sm font-semibold text-erp-text hover:bg-erp-hover disabled:opacity-60">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="rounded-xl bg-erp-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-erp-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
                  {saving ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-erp-border bg-erp-surface p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <Trash2 size={22} />
            </div>
            <h2 className="mt-4 text-lg font-bold text-erp-text">Delete Product?</h2>
            <p className="mt-2 text-sm leading-6 text-erp-muted">
              Are you sure you want to delete <span className="font-semibold text-erp-text">{deleteProduct.name}</span>? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteProduct(null)} disabled={saving} className="rounded-xl border border-erp-border px-4 py-2.5 text-sm font-semibold text-erp-text hover:bg-erp-hover">
                Cancel
              </button>
              <button type="button" onClick={handleDelete} disabled={saving} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                {saving ? 'Deleting...' : 'Delete Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-erp-border bg-erp-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-erp-border px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-erp-text">Product Details</h2>
                <p className="mt-1 text-sm text-erp-muted">Complete product information.</p>
              </div>
              <button type="button" onClick={() => setViewProduct(null)} className="rounded-lg p-2 text-erp-muted hover:bg-erp-hover hover:text-erp-text">
                <X size={20} />
              </button>
            </div>

            <div className="max-h-[70vh] space-y-5 overflow-y-auto p-5">
              {viewProduct.imageUrl && (
                <div className="flex justify-center">
                  <img src={viewProduct.imageUrl} alt={viewProduct.name} className="h-36 w-36 rounded-2xl border border-erp-border object-cover" />
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  ['Product Name', viewProduct.name],
                  ['SKU', viewProduct.sku],
                  ['Category', getCategoryName(viewProduct)],
                  ['Barcode', viewProduct.barcode || '—'],
                  ['Cost Price', `₹${formatPrice(viewProduct.costPrice)}`],
                  ['Selling Price', `₹${formatPrice(viewProduct.sellingPrice)}`],
                  ['Tax Rate', `${Number(viewProduct.taxRate || 0)}%`],
                  ['Opening Stock', `${Number(viewProduct.openingStock || 0)} ${viewProduct.unit || 'Piece'}`],
                  ['Minimum Stock Level', `${Number(viewProduct.minStockLevel || 0)} ${viewProduct.unit || 'Piece'}`],
                  ['Status', viewProduct.status || '—'],
                  ['Created At', viewProduct.createdAt ? new Date(viewProduct.createdAt).toLocaleString('en-IN') : '—'],
                  ['Updated At', viewProduct.updatedAt ? new Date(viewProduct.updatedAt).toLocaleString('en-IN') : '—'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-erp-border bg-erp-bg p-3">
                    <p className="text-xs font-medium text-erp-muted">{label}</p>
                    <p className="mt-1 break-words text-sm font-semibold text-erp-text">{value}</p>
                  </div>
                ))}

                <div className="rounded-xl border border-erp-border bg-erp-bg p-3 sm:col-span-2">
                  <p className="text-xs font-medium text-erp-muted">Description</p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm text-erp-text">{viewProduct.description || 'No description available.'}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-erp-border px-5 py-4">
              <button type="button" onClick={() => setViewProduct(null)} className="rounded-xl border border-erp-border px-5 py-2.5 text-sm font-semibold text-erp-text hover:bg-erp-hover">
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const product = viewProduct
                  setViewProduct(null)
                  openEditModal(product)
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-erp-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-erp-primary-hover"
              >
                <Pencil size={15} />
                Edit Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
