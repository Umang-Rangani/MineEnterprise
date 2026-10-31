import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Plus, RefreshCw, Search, Pencil, Trash2, Eye, Package, ChevronLeft, ChevronRight, Filter, FilterX, LoaderCircle, Power, Download } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import TrashBox from '../../TrashBox/TrashBox'
import Loading from '../Loading/Loading'
import { hasPermission, useAuth } from '../../context/AuthContext'

function getProductKey(product) {
  return product?._id ? String(product._id) : product?.sku || product?.name
}

function getErrorMessage(error, fallback) {
  return error.response?.data?.message || error.message || fallback
}

function formatPrice(value) {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function getCategoryName(product, categories) {
  if (product?.categoryId && typeof product.categoryId === 'object') {
    return product.categoryId.name || 'Uncategorized'
  }

  return categories.find((category) => String(category._id) === String(product?.categoryId))?.name || 'Uncategorized'
}

export default function CompanyProducts() {
  const navigate = useNavigate()
  const location = useLocation()
  const { permissions } = useAuth()

  const canList = hasPermission(permissions, 'product:list')
  const canView = hasPermission(permissions, 'product:view')
  const canCreate = hasPermission(permissions, 'product:create')
  const canUpdate = hasPermission(permissions, 'product:update')
  const canUpdateStatus = hasPermission(permissions, 'product:update-status')
  const canDelete = hasPermission(permissions, 'product:delete')
  const canExport = hasPermission(permissions, 'product:export')

  const canShowActions = canView || canUpdate || canUpdateStatus || canDelete

  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [categoryFilter, setCategoryFilter] = useState('All')

  const [pageSize, setPageSize] = useState(5)
  const [currentPage, setCurrentPage] = useState(1)

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 5,
    total: 0,
    totalPages: 1,
  })

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
  })

  const [initialLoading, setInitialLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const [deletingProduct, setDeletingProduct] = useState(null)
  const [deletingId, setDeletingId] = useState('')
  const [statusTarget, setStatusTarget] = useState(null)
  const [updatingStatusId, setUpdatingStatusId] = useState('')

  const [toast, setToast] = useState(null)
  const [error, setError] = useState('')

  const items = [{ title: 'Products', link: null }]

  const hasActiveFilters = Boolean(search.trim()) || statusFilter !== 'All' || categoryFilter !== 'All'

  const showToast = (type, message, duration = 3000) => {
    setToast({ id: Date.now(), type, message, duration })
  }

  const closeToast = () => setToast(null)

  useEffect(() => {
    document.title = 'Products | MineERP'
  }, [])

  // Load categories for the category filter and product display.
  useEffect(() => {
    let cancelled = false

    async function fetchCategories() {
      try {
        const { data } = await axiosInstance.get('/erp/categories')

        if (cancelled) return

        const list = Array.isArray(data.categories) ? data.categories : Array.isArray(data.data?.categories) ? data.data.categories : Array.isArray(data.data) ? data.data : []

        setCategories(list)
      } catch {
        if (!cancelled) setCategories([])
      }
    }

    fetchCategories()

    return () => {
      cancelled = true
    }
  }, [])

  // Fetch products and summary statistics.
  useEffect(() => {
    let cancelled = false

    async function fetchProducts() {
      setIsFetching(true)
      setError('')

      try {
        const { data } = await axiosInstance.get('/erp/products', {
          params: {
            search: search.trim() || undefined,
            status: statusFilter === 'All' ? undefined : statusFilter,
            categoryId: categoryFilter === 'All' ? undefined : categoryFilter,
            page: currentPage,
            limit: pageSize,
          },
        })

        if (data.success === false) {
          throw new Error(data.message || 'Unable to load products.')
        }

        if (cancelled) return

        const list = Array.isArray(data.products) ? data.products : Array.isArray(data.data?.products) ? data.data.products : []

        setProducts(list)

        const serverPagination = data.pagination || data.data?.pagination || {}

        const total = Number(serverPagination.total ?? data.total ?? 0)
        const totalPages = Math.max(1, Number(serverPagination.totalPages ?? data.totalPages ?? 1))

        setPagination({
          page: Number(serverPagination.page) || currentPage,
          limit: Number(serverPagination.limit) || pageSize,
          total,
          totalPages,
        })

        // Prefer backend-wide counts when available.
        // Otherwise use the records returned by the current request.
        const serverStats = data.stats || data.data?.stats

        setStats({
          total: Number(serverStats?.total ?? total),
          active: Number(serverStats?.active ?? list.filter((product) => product.status === 'Active').length),
          inactive: Number(serverStats?.inactive ?? list.filter((product) => product.status === 'Inactive').length),
        })

        const serverPage = Number(serverPagination.page) || currentPage

        if (serverPage !== currentPage) {
          setCurrentPage(serverPage)
        }
      } catch (err) {
        if (!cancelled) {
          setError(getErrorMessage(err, 'Unable to load products.'))
        }
      } finally {
        if (!cancelled) {
          setInitialLoading(false)
          setIsFetching(false)
          setRefreshing(false)
        }
      }
    }

    if (canList) {
      fetchProducts()
    } else {
      setInitialLoading(false)
      setIsFetching(false)
    }

    return () => {
      cancelled = true
    }
  }, [canList, search, statusFilter, categoryFilter, currentPage, pageSize, refreshKey])

  // Display success messages passed back from create, edit or details pages.
  useEffect(() => {
    if (!location.state?.successMessage) return

    showToast('success', location.state.successMessage)

    navigate(location.pathname, {
      replace: true,
      state: null,
    })
  }, [location.state, location.pathname, navigate])

  const handleRefresh = () => {
    if (isFetching) return

    setRefreshing(true)
    setRefreshKey((key) => key + 1)
  }

  const resetFilters = () => {
    setSearch('')
    setStatusFilter('All')
    setCategoryFilter('All')
    setCurrentPage(1)
  }

  const openCreatePage = () => {
    navigate('/company/products/new')
  }

  const openDetailsPage = (product) => {
    if (!product?._id) return
    navigate(`/company/products/${product._id}`)
  }

  const openEditPage = (product) => {
    if (!product?._id) return
    navigate(`/company/products/${product._id}/edit`)
  }

  const handleExportProducts = async () => {
    if (!canExport || isExporting) return

    setIsExporting(true)

    try {
      const response = await axiosInstance.get('/erp/products/export', {
        params: {
          search: search.trim() || undefined,
          status: statusFilter === 'All' ? undefined : statusFilter,
          categoryId: categoryFilter === 'All' ? undefined : categoryFilter,
        },
        responseType: 'blob',
      })

      const blob = new Blob([response.data], {
        type: 'text/csv;charset=utf-8;',
      })

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = url
      link.download = `products-${new Date().toISOString().slice(0, 10)}.csv`

      document.body.appendChild(link)
      link.click()
      link.remove()

      window.setTimeout(() => URL.revokeObjectURL(url), 1000)

      showToast('success', 'Products exported successfully.')
    } catch (err) {
      let message = 'Unable to export products.'

      if (err.response?.data instanceof Blob) {
        try {
          const errorData = JSON.parse(await err.response.data.text())
          message = errorData.message || message
        } catch {
          // Use the fallback message.
        }
      } else {
        message = getErrorMessage(err, message)
      }

      showToast('error', message)
    } finally {
      setIsExporting(false)
    }
  }

  const handleToggleStatus = async () => {
    if (!canUpdateStatus || !statusTarget?._id || updatingStatusId) return

    const product = statusTarget
    const productId = String(product._id)
    const nextStatus = product.status === 'Active' ? 'Inactive' : 'Active'

    setUpdatingStatusId(productId)

    try {
      const { data } = await axiosInstance.patch(`/erp/products/${productId}/status`, { status: nextStatus })

      if (data.success === false) {
        throw new Error(data.message || 'Unable to update product status.')
      }

      setStatusTarget(null)
      showToast('success', data.message || `Product ${nextStatus.toLowerCase()} successfully.`)
      setRefreshKey((key) => key + 1)
    } catch (err) {
      showToast('error', getErrorMessage(err, 'Unable to update product status.'))
    } finally {
      setUpdatingStatusId('')
    }
  }

  const handleDeleteProduct = async () => {
    if (!deletingProduct?._id || deletingId) return

    const productId = String(deletingProduct._id)
    setDeletingId(productId)

    try {
      const { data } = await axiosInstance.delete(`/erp/products/${productId}`)

      if (data.success === false) {
        throw new Error(data.message || 'Unable to delete product.')
      }

      setDeletingProduct(null)
      showToast('success', data.message || 'Product deleted successfully.')

      if (products.length === 1 && currentPage > 1) {
        setCurrentPage((page) => page - 1)
      } else {
        setRefreshKey((key) => key + 1)
      }
    } catch (err) {
      showToast('error', getErrorMessage(err, 'Unable to delete product.'))
    } finally {
      setDeletingId('')
    }
  }

  const totalPages = Math.max(1, Number(pagination.totalPages) || 1)
  const safePage = Math.min(currentPage, totalPages)
  const totalProducts = Number(pagination.total) || 0
  const startItem = totalProducts === 0 ? 0 : (safePage - 1) * pageSize + 1
  const endItem = Math.min(safePage * pageSize, totalProducts)

  if (!canList) {
    return (
      <div className="rounded-xl border border-rose-200 bg-white p-6 text-center">
        <h2 className="text-base font-semibold text-slate-800">Access Denied</h2>
        <p className="mt-1 text-sm text-slate-500">You do not have permission to view products.</p>
      </div>
    )
  }

  // Full page loading — initial load and manual refresh
  if (initialLoading || refreshing) {
    return (
      <div className="min-w-0 space-y-4 text-sm">
        <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="h-1 bg-erp-primary" />

          <div className="flex min-h-16 items-center px-4 sm:px-5">
            <BreadCrumb items={items} />
          </div>
        </section>

        <section className="relative min-h-[480px] overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex min-h-[480px] items-center justify-center">
            <Loading
              fullScreen={false}
              label={refreshing ? 'Refreshing products' : 'Loading products'}
              description={refreshing ? 'Please wait while we refresh product records.' : 'Please wait while we load product records.'}
              className="!h-full min-h-[480px]"
            />
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-4 text-sm">
      <Toast toast={toast} onClose={closeToast} />

      {/* Header — follows the Categories demo */}
      <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        <div className="h-1 bg-erp-primary" />

        <div className="flex h-[calc(100%-4px)] min-w-0 items-center justify-between gap-3 px-4 sm:px-5">
          <div className="min-w-0 flex-1 overflow-hidden">
            <BreadCrumb items={items} />
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="flex h-9 items-center gap-2 whitespace-nowrap rounded-lg border border-erp-border px-3">
              <span className="text-xs text-slate-500">Total</span>
              <span className="text-sm font-bold text-slate-900">{stats.total}</span>
            </div>

            <div className="hidden h-9 items-center gap-2 whitespace-nowrap rounded-lg border border-emerald-200 px-3 sm:flex">
              <span className="text-xs text-emerald-700">Active</span>
              <span className="text-sm font-bold text-slate-900">{stats.active}</span>
            </div>

            <div className="hidden h-9 items-center gap-2 whitespace-nowrap rounded-lg border border-rose-200 px-3 md:flex">
              <span className="text-xs text-rose-700">Inactive</span>
              <span className="text-sm font-bold text-slate-900">{stats.inactive}</span>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={isFetching}
              title="Refresh products"
              aria-label="Refresh products"
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-erp-border bg-erp-surface px-3 text-xs font-semibold text-slate-600 transition hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {canExport && (
              <button
                type="button"
                onClick={handleExportProducts}
                disabled={isExporting}
                title="Export products to CSV"
                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-erp-border bg-erp-surface px-3 text-xs font-semibold text-slate-700 transition hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isExporting ? <LoaderCircle size={15} className="animate-spin" /> : <Download size={15} />}
                <span>{isExporting ? 'Exporting...' : 'Export'}</span>
              </button>
            )}

            {canCreate && (
              <button
                type="button"
                onClick={openCreatePage}
                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-erp-primary px-3.5 text-xs font-semibold text-white transition hover:bg-erp-primary-hover focus:outline-none focus:ring-2 focus:ring-erp-primary/30 focus:ring-offset-1"
              >
                <Plus size={15} />
                <span>Create Product</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Products list */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Search and filters */}
        <div className="flex flex-col gap-3 border-b border-slate-100 p-3 sm:px-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-1 lg:flex-wrap lg:justify-between">
            <div className="flex min-w-0 gap-3 sm:gap-5">
              <div className="relative min-w-0 flex-1 lg:w-100 lg:flex-none">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

                <input
                  type="search"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value)
                    setCurrentPage(1)
                  }}
                  placeholder="Search product name, SKU or barcode..."
                  aria-label="Search products"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none transition placeholder:text-slate-400 focus:border-erp-primary focus:bg-white focus:ring-2 focus:ring-erp-primary/10 sm:text-sm"
                />
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  title="Clear filters"
                  aria-label="Clear filters"
                  className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 sm:text-sm"
                >
                  <FilterX size={14} />
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-3 sm:gap-5">
              <select
                value={categoryFilter}
                onChange={(event) => {
                  setCategoryFilter(event.target.value)
                  setCurrentPage(1)
                }}
                aria-label="Filter products by category"
                className="h-9 min-w-0 max-w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10 sm:text-sm"
              >
                <option value="All">All Categories</option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value)
                  setCurrentPage(1)
                }}
                aria-label="Filter products by status"
                className="h-9 min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10 sm:text-sm"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table and loading */}
        <div className="relative min-h-[220px]">
          { products.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center px-4 py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                <Package size={24} />
              </div>

              <h3 className="mt-3 text-sm font-bold text-slate-800">{hasActiveFilters ? 'No matching products' : 'No products available'}</h3>

              <p className="mt-1 max-w-xs text-xs text-slate-500">{hasActiveFilters ? 'Try another search or change your filters.' : 'Create a product to start managing your catalogue and stock.'}</p>

              {hasActiveFilters ? (
                <button type="button" onClick={resetFilters} className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                  <Filter size={14} />
                  Clear filters
                </button>
              ) : (
                canCreate && (
                  <button type="button" onClick={openCreatePage} className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg bg-erp-primary px-3 text-xs font-semibold text-white hover:bg-erp-primary-hover">
                    <Plus size={15} />
                    Create Product
                  </button>
                )
              )}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[1050px] text-left">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-100">
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Product</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">SKU</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Category</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Cost Price</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Selling Price</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Stock</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</th>
                      {canShowActions && <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Actions</th>}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {products.map((product) => {
                      const isInactive = product.status === 'Inactive'
                      const productId = String(product._id || '')
                      const totalStock = Number(product.totalStock || 0)
                      const isLowStock = totalStock <= Number(product.minStockLevel || 0)
                      return (
                        <tr key={getProductKey(product)} className="transition hover:bg-slate-50/70">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              {product.imageUrl ? (
                                <img src={product.imageUrl} alt={product.name || 'Product'} className="h-9 w-9 shrink-0 rounded-lg border border-slate-200 object-cover" />
                              ) : (
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                                  <Package size={17} />
                                </div>
                              )}

                              <div className="min-w-0">
                                <p className="max-w-52 truncate text-xs font-semibold text-slate-800 sm:text-sm">{product.name || 'Unnamed product'}</p>
                                <p className="mt-0.5 max-w-52 truncate text-[10px] text-slate-400">{product.barcode || 'No barcode'}</p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <span className="inline-flex max-w-32 truncate rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600">{product.sku || '—'}</span>
                          </td>

                          <td className="px-4 py-3">
                            <span className="text-xs text-slate-600">{getCategoryName(product, categories)}</span>
                          </td>

                          <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-700">₹{formatPrice(product.costPrice)}</td>

                          <td className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-slate-800">₹{formatPrice(product.sellingPrice)}</td>

                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1">
                              <span className={`whitespace-nowrap text-xs font-medium ${isLowStock ? 'text-orange-700' : 'text-slate-700'}`}>
                                {totalStock} {product.unit || 'Piece'}
                              </span>
                              {isLowStock && <span className="text-[10px] font-medium text-orange-600">Low stock</span>}
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-1 text-[11px] font-semibold ${isInactive ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${isInactive ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                              {isInactive ? 'Inactive' : 'Active'}
                            </span>
                          </td>

                          {canShowActions && (
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1.5">
                                {canView && (
                                  <button
                                    type="button"
                                    onClick={() => openDetailsPage(product)}
                                    title="View product"
                                    aria-label={`View ${product.name || 'product'}`}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-erp-primary/30 hover:bg-erp-primary/5 hover:text-erp-primary"
                                  >
                                    <Eye size={15} />
                                  </button>
                                )}

                                {canUpdate && (
                                  <button
                                    type="button"
                                    onClick={() => openEditPage(product)}
                                    title="Edit product"
                                    aria-label={`Edit ${product.name || 'product'}`}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-erp-primary/30 hover:bg-erp-primary/5 hover:text-erp-primary"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                )}

                                {canUpdateStatus && (
                                  <button
                                    type="button"
                                    onClick={() => setStatusTarget(product)}
                                    disabled={Boolean(updatingStatusId)}
                                    title={isInactive ? 'Activate product' : 'Deactivate product'}
                                    aria-label={`${isInactive ? 'Activate' : 'Deactivate'} ${product.name || 'product'}`}
                                    className={`flex h-8 w-8 items-center justify-center rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                      isInactive ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100'
                                    }`}
                                  >
                                    {updatingStatusId === productId ? <LoaderCircle size={15} className="animate-spin" /> : <Power size={15} />}
                                  </button>
                                )}

                                {/* {canDelete && (
                                  <button
                                    type="button"
                                    onClick={() => setDeletingProduct(product)}
                                    disabled={Boolean(deletingId)}
                                    title="Delete product"
                                    aria-label={`Delete ${product.name || 'product'}`}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 transition hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
                                  >
                                    {deletingId === productId ? <LoaderCircle size={15} className="animate-spin" /> : <Trash2 size={15} />}
                                  </button>
                                )} */}
                              </div>
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="divide-y divide-slate-100 md:hidden">
                {products.map((product) => {
                  const isInactive = product.status === 'Inactive'
                  const productId = String(product._id || '')
                  const totalStock = Number(product.totalStock || 0)
                  const isLowStock = totalStock <= Number(product.minStockLevel || 0)

                  return (
                    <div key={getProductKey(product)} className="space-y-3 p-3">
                      <div className="flex items-start gap-2.5">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name || 'Product'} className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 object-cover" />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                            <Package size={18} />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-semibold text-slate-900">{product.name || 'Unnamed product'}</p>
                          <p className="mt-1 break-words text-xs text-slate-500">SKU: {product.sku || '—'}</p>
                          <p className="mt-1 break-words text-xs text-slate-500">Category: {getCategoryName(product, categories)}</p>
                          <p className="mt-1 text-xs text-slate-500">Barcode: {product.barcode || '—'}</p>
                        </div>

                        <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-semibold ${isInactive ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${isInactive ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                          {isInactive ? 'Inactive' : 'Active'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3">
                        <div>
                          <p className="text-[10px] text-slate-500">Cost Price</p>
                          <p className="mt-1 text-xs font-semibold text-slate-800">₹{formatPrice(product.costPrice)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500">Selling Price</p>
                          <p className="mt-1 text-xs font-semibold text-slate-800">₹{formatPrice(product.sellingPrice)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500">Stock</p>
                          <p className={`mt-1 text-xs font-semibold ${isLowStock ? 'text-orange-700' : 'text-slate-800'}`}>
                            {totalStock} {product.unit || 'Piece'}
                            {isLowStock ? ' · Low stock' : ''}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500">Tax Rate</p>
                          <p className="mt-1 text-xs font-semibold text-slate-800">{Number(product.taxRate || 0)}%</p>
                        </div>
                      </div>

                      {canShowActions && (
                        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-2.5">
                          {canView && (
                            <button
                              type="button"
                              onClick={() => openDetailsPage(product)}
                              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              <Eye size={14} />
                              View
                            </button>
                          )}

                          {canUpdate && (
                            <button
                              type="button"
                              onClick={() => openEditPage(product)}
                              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-erp-primary/10 text-xs font-semibold text-erp-primary hover:bg-erp-primary/15"
                            >
                              <Pencil size={14} />
                              Edit
                            </button>
                          )}

                          {canUpdateStatus && (
                            <button
                              type="button"
                              onClick={() => setStatusTarget(product)}
                              disabled={Boolean(updatingStatusId)}
                              className={`inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border text-xs font-semibold disabled:opacity-50 ${
                                isInactive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-orange-200 bg-orange-50 text-orange-600'
                              }`}
                            >
                              <Power size={14} />
                              {updatingStatusId === productId ? 'Updating...' : isInactive ? 'Activate' : 'Deactivate'}
                            </button>
                          )}

                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => setDeletingProduct(product)}
                              disabled={Boolean(deletingId)}
                              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-600 hover:bg-rose-100 disabled:opacity-50"
                            >
                              {deletingId === productId ? <LoaderCircle size={14} className="animate-spin" /> : <Trash2 size={14} />}
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* Loading overlay */}
          {!initialLoading && isFetching && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 backdrop-blur-[2px]">
              <Loading fullScreen={false} label="Updating products" description="Refreshing product records..." className="!h-full min-h-[220px]" />
            </div>
          )}

          
        </div>

        {/* Pagination */}
        {!initialLoading && (
          <div className="flex flex-col gap-3 border-t border-slate-100 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs text-slate-500 sm:text-sm">
                Showing{' '}
                <span className="font-semibold text-slate-700">
                  {startItem}–{endItem}
                </span>{' '}
                of <span className="font-semibold text-slate-700">{totalProducts}</span> products
              </p>

              <div className="flex items-center gap-2">
                <label htmlFor="product-page-size" className="whitespace-nowrap text-xs text-slate-500">
                  Rows:
                </label>

                <select
                  id="product-page-size"
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value))
                    setCurrentPage(1)
                  }}
                  disabled={isFetching}
                  className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage <= 1 || isFetching}
                onClick={() => setCurrentPage(1)}
                aria-label="First page"
                className="flex h-8 items-center justify-center rounded-lg border border-slate-200 px-2 text-xs text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                1
              </button>

              <button
                type="button"
                disabled={safePage <= 1 || isFetching}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                aria-label="Previous page"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>

              <span className="min-w-20 px-1 text-center text-xs text-slate-600 sm:text-sm">
                Page {safePage} of {totalPages}
              </span>

              <button
                type="button"
                disabled={safePage >= totalPages || isFetching}
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                aria-label="Next page"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>

              <button
                type="button"
                disabled={safePage >= totalPages || isFetching}
                onClick={() => setCurrentPage(totalPages)}
                aria-label="Last page"
                className="flex h-8 items-center justify-center rounded-lg border border-slate-200 px-2 text-xs text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {totalPages}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Delete confirmation */}
      <TrashBox
        isOpen={Boolean(deletingProduct)}
        onClose={() => {
          if (!deletingId) setDeletingProduct(null)
        }}
        title="Delete Product"
        message={`Are you sure you want to delete "${deletingProduct?.name || 'this product'}"? This action cannot be undone.`}
        actionButtonText="Delete Product"
        cancelButtonText="Cancel"
        onAction={handleDeleteProduct}
        isProcessing={Boolean(deletingId)}
      />

      {/* Activate / Deactivate confirmation */}
      <TrashBox
        isOpen={Boolean(statusTarget)}
        onClose={() => {
          if (!updatingStatusId) setStatusTarget(null)
        }}
        title={statusTarget?.status === 'Inactive' ? 'Activate Product' : 'Deactivate Product'}
        message={statusTarget?.status === 'Inactive' ? `Are you sure you want to activate "${statusTarget?.name}"?` : `Are you sure you want to deactivate "${statusTarget?.name}"?`}
        actionButtonText={statusTarget?.status === 'Inactive' ? 'Activate Product' : 'Deactivate Product'}
        cancelButtonText="Cancel"
        onAction={handleToggleStatus}
        isProcessing={Boolean(updatingStatusId)}
        variant={statusTarget?.status === 'Inactive' ? 'activate' : 'deactivate'}
      />
    </div>
  )
}
