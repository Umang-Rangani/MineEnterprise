
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Search,
  Package,
  RefreshCw,
  ArrowDownToLine,
  ArrowUpFromLine,
  History,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  FilterX,
  Warehouse,
} from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import Loading from '../Loading/Loading'
import { hasPermission, useAuth } from '../../context/AuthContext'

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback
}

function getProduct(item) {
  if (item?.productId && typeof item.productId === 'object') {
    return item.productId
  }

  if (item?.product && typeof item.product === 'object') {
    return item.product
  }

  return item || {}
}

function getProductKey(item) {
  const product = getProduct(item)

  return String(
    product?._id ||
      item?._id ||
      product?.sku ||
      product?.name ||
      'unknown',
  )
}

function getStock(item) {
  return Number(
    item?.currentStock ??
      item?.stock ??
      item?.openingStock ??
      getProduct(item)?.openingStock ??
      0,
  )
}

function getReservedStock(item) {
  return Number(item?.reservedStock ?? 0)
}

function getAvailableStock(item) {
  return Number(
    item?.availableStock ?? getStock(item) - getReservedStock(item),
  )
}

function getMinimumStock(item) {
  const product = getProduct(item)

  return Number(product?.minStockLevel ?? item?.minStockLevel ?? 0)
}

function getStockStatus(item) {
  const available = getAvailableStock(item)
  const minimum = getMinimumStock(item)

  if (available <= 0) {
    return {
      label: 'Out of Stock',
      className: 'bg-rose-50 text-rose-700',
      dotClass: 'bg-rose-500',
    }
  }

  if (available <= minimum) {
    return {
      label: 'Low Stock',
      className: 'bg-amber-50 text-amber-700',
      dotClass: 'bg-amber-500',
    }
  }

  return {
    label: 'In Stock',
    className: 'bg-emerald-50 text-emerald-700',
    dotClass: 'bg-emerald-500',
  }
}

function formatQuantity(value) {
  return Number(value || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 3,
  })
}

function getInventoryList(data) {
  const result =
    data.inventory ??
    data.items ??
    data.data?.inventory ??
    data.data?.items ??
    data.data ??
    []

  return Array.isArray(result) ? result : []
}

export default function CompanyInventory() {
  const { permissions } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const canView = hasPermission(permissions, 'inventory:view')
  const canViewStock = hasPermission(permissions, 'inventory:view-stock')
  const canAdjustStock = hasPermission(permissions, 'inventory:adjust-stock')
  const canViewHistory = hasPermission(permissions, 'inventory:view-history')
  const canTransferStock = hasPermission(permissions, 'inventory:transfer-stock')

  const [items, setItems] = useState([])

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

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
    lowStock: 0,
    outOfStock: 0,
  })

  const [initialLoading, setInitialLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)

  const breadcrumbItems = [{ title: 'Inventory', link: null }]

  const hasActiveFilters =
    Boolean(search.trim()) || statusFilter !== 'All'

  const showToast = (type, message, duration = 3000) => {
    setToast({
      id: Date.now(),
      type,
      message,
      duration,
    })
  }

  useEffect(() => {
    document.title = 'Inventory | MineERP'
  }, [])

  // Display success message after returning from Stock In / Stock Out.
  useEffect(() => {
    const message = location.state?.successMessage

    if (!message) return

    showToast('success', message)

    navigate(location.pathname, {
      replace: true,
      state: null,
    })

    setRefreshKey((key) => key + 1)
  }, [location.state, location.pathname, navigate])

  // Fetch inventory and summary statistics.
  useEffect(() => {
    let cancelled = false

    async function fetchInventory() {
      setIsFetching(true)
      setError('')

      try {
        const { data } = await axiosInstance.get('/erp/inventory', {
          params: {
            search: search.trim() || undefined,
            status: statusFilter === 'All' ? undefined : statusFilter,
            page: currentPage,
            limit: pageSize,
          },
        })

        if (data.success === false) {
          throw new Error(data.message || 'Unable to load inventory.')
        }

        if (cancelled) return

        const list = getInventoryList(data)

        setItems(list)

        const serverPagination =
          data.pagination || data.data?.pagination || {}

        const total = Number(
          serverPagination.total ?? data.total ?? list.length,
        )

        const totalPages = Math.max(
          1,
          Number(serverPagination.totalPages ?? data.totalPages ?? 1),
        )

        setPagination({
          page: Number(serverPagination.page) || currentPage,
          limit: Number(serverPagination.limit) || pageSize,
          total,
          totalPages,
        })

        const serverPage = Number(serverPagination.page) || currentPage

        if (serverPage !== currentPage) {
          setCurrentPage(serverPage)
        }

        // Use backend-wide statistics if available.
        // Otherwise calculate from the returned records.
        const serverStats = data.stats || data.data?.stats

        const lowStockCount = list.filter((item) => {
          const status = getStockStatus(item)
          return status.label === 'Low Stock'
        }).length

        const outOfStockCount = list.filter((item) => {
          const status = getStockStatus(item)
          return status.label === 'Out of Stock'
        }).length

        setStats({
          total: Number(serverStats?.total ?? total),
          lowStock: Number(
            serverStats?.lowStock ?? serverStats?.lowStockCount ?? lowStockCount,
          ),
          outOfStock: Number(
            serverStats?.outOfStock ??
              serverStats?.outOfStockCount ??
              outOfStockCount,
          ),
        })
      } catch (err) {
        if (!cancelled) {
          setError(getErrorMessage(err, 'Unable to load inventory.'))
        }
      } finally {
        if (!cancelled) {
          setInitialLoading(false)
          setIsFetching(false)
          setRefreshing(false)
        }
      }
    }

    if (canView) {
      fetchInventory()
    } else {
      setInitialLoading(false)
      setIsFetching(false)
    }

    return () => {
      cancelled = true
    }
  }, [
    canView,
    search,
    statusFilter,
    currentPage,
    pageSize,
    refreshKey,
  ])

  const handleRefresh = () => {
    if (isFetching) return

    setRefreshing(true)
    setRefreshKey((key) => key + 1)
  }

  const resetFilters = () => {
    setSearch('')
    setStatusFilter('All')
    setCurrentPage(1)
  }

  const openStockIn = (item) => {
    if (!canAdjustStock) return

    const product = getProduct(item)

    if (!product?._id) {
      showToast('error', 'Product ID મળ્યો નથી.')
      return
    }

    navigate(`/company/inventory/${product._id}/stock-in`)
  }

  const openStockOut = (item) => {
    if (!canAdjustStock) return

    const product = getProduct(item)

    if (!product?._id) {
      showToast('error', 'Product ID મળ્યો નથી.')
      return
    }

    navigate(`/company/inventory/${product._id}/stock-out`)
  }

  const openHistory = (item) => {
    if (!canViewHistory) return

    const product = getProduct(item)

    if (!product?._id) {
      showToast('error', 'Product ID મળ્યો નથી.')
      return
    }

    navigate(`/company/inventory/${product._id}/history`)
  }

  const openTransfer = () => {
    showToast('info', 'Stock transfer route હજુ connect કરેલ નથી.')
  }

  const totalPages = Math.max(
    1,
    Number(pagination.totalPages) || 1,
  )

  const safePage = Math.min(currentPage, totalPages)
  const totalItems = Number(pagination.total) || 0

  const startItem =
    totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1

  const endItem = Math.min(safePage * pageSize, totalItems)

  if (!canView) {
    return (
      <div className="rounded-xl border border-erp-border bg-erp-surface p-6 text-center">
        <h2 className="text-base font-semibold text-erp-text">
          Access Denied
        </h2>

        <p className="mt-1 text-sm text-erp-muted">
          You do not have permission to view inventory.
        </p>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-4 text-sm">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Compact header — same pattern as CompanyProducts */}
      <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        <div className="h-1 bg-erp-primary" />

        <div className="flex h-[calc(100%-4px)] min-w-0 items-center justify-between gap-3 px-4 sm:px-5">
          <div className="min-w-0 flex-1 overflow-hidden">
            <BreadCrumb items={breadcrumbItems} />
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="flex h-9 items-center gap-2 whitespace-nowrap rounded-lg border border-erp-border px-3">
              <span className="text-xs text-slate-500">Total</span>
              <span className="text-sm font-bold text-slate-900">
                {stats.total}
              </span>
            </div>

            <div className="hidden h-9 items-center gap-2 whitespace-nowrap rounded-lg border border-amber-200 px-3 sm:flex">
              <span className="text-xs text-amber-700">Low Stock</span>
              <span className="text-sm font-bold text-slate-900">
                {stats.lowStock}
              </span>
            </div>

            <div className="hidden h-9 items-center gap-2 whitespace-nowrap rounded-lg border border-rose-200 px-3 md:flex">
              <span className="text-xs text-rose-700">Out of Stock</span>
              <span className="text-sm font-bold text-slate-900">
                {stats.outOfStock}
              </span>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={isFetching}
              title="Refresh inventory"
              aria-label="Refresh inventory"
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-erp-border bg-erp-surface px-3 text-xs font-semibold text-slate-600 transition hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={14}
                className={refreshing ? 'animate-spin' : ''}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </section>

      {/* Inventory list */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Search and filters — same layout as CompanyProducts */}
        <div className="flex flex-col gap-3 border-b border-slate-100 p-3 sm:px-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-1 lg:flex-wrap lg:justify-between">
            <div className="flex min-w-0 gap-3 sm:gap-5">
              <div className="relative min-w-0 flex-1 lg:w-100 lg:flex-none">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="search"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value)
                    setCurrentPage(1)
                  }}
                  placeholder="Search product name or SKU..."
                  aria-label="Search inventory"
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
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value)
                  setCurrentPage(1)
                }}
                aria-label="Filter inventory by stock status"
                className="h-9 min-w-0 max-w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10 sm:text-sm"
              >
                <option value="All">All Stock Statuses</option>
                <option value="In Stock">In Stock</option>
                <option value="Low Stock">Low Stock</option>
                <option value="Out of Stock">Out of Stock</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table, loading and empty states */}
        <div className="relative min-h-[220px]">
          {initialLoading ? (
            <div className="flex min-h-[280px] items-center justify-center">
              <Loading
                fullScreen={false}
                label="Loading inventory"
                description="Fetching stock records..."
                className="!h-full min-h-[220px]"
              />
            </div>
          ) : items.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center px-4 py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                <Package size={24} />
              </div>

              <h3 className="mt-3 text-sm font-bold text-slate-800">
                {hasActiveFilters
                  ? 'No matching inventory'
                  : 'No inventory found'}
              </h3>

              <p className="mt-1 max-w-xs text-xs text-slate-500">
                {hasActiveFilters
                  ? 'Try another search term or change your stock status filter.'
                  : 'Create a product first to start managing stock.'}
              </p>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Filter size={14} />
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[1050px] text-left">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-100">
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Product
                      </th>

                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        SKU
                      </th>

                      {canViewStock && (
                        <>
                          <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Current Stock
                          </th>

                          <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Reserved
                          </th>

                          <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Available
                          </th>

                          <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Status
                          </th>
                        </>
                      )}

                      {(canAdjustStock || canViewHistory || canTransferStock) && (
                        <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {items.map((item) => {
                      const product = getProduct(item)
                      const stock = getStock(item)
                      const reserved = getReservedStock(item)
                      const available = getAvailableStock(item)
                      const status = getStockStatus(item)

                      return (
                        <tr
                          key={getProductKey(item)}
                          className="transition hover:bg-slate-50/70"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              {product.imageUrl ? (
                                <img
                                  src={product.imageUrl}
                                  alt={product.name || 'Product'}
                                  className="h-9 w-9 shrink-0 rounded-lg border border-slate-200 object-cover"
                                />
                              ) : (
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                                  <Package size={17} />
                                </div>
                              )}

                              <div className="min-w-0">
                                <p className="max-w-52 truncate text-xs font-semibold text-slate-800 sm:text-sm">
                                  {product.name || 'Unnamed product'}
                                </p>

                                <p className="mt-0.5 max-w-52 truncate text-[10px] text-slate-400">
                                  Unit: {product.unit || 'Piece'}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <span className="inline-flex max-w-32 truncate rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600">
                              {product.sku || '—'}
                            </span>
                          </td>

                          {canViewStock && (
                            <>
                              <td className="whitespace-nowrap px-4 py-3 text-xs font-medium text-slate-700">
                                {formatQuantity(stock)} {product.unit || 'Piece'}
                              </td>

                              <td className="px-4 py-3 text-xs text-slate-600">
                                {formatQuantity(reserved)}
                              </td>

                              <td className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-slate-800">
                                {formatQuantity(available)} {product.unit || 'Piece'}
                              </td>

                              <td className="px-4 py-3">
                                <span
                                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-1 text-[11px] font-semibold ${status.className}`}
                                >
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full ${status.dotClass}`}
                                  />
                                  {status.label}
                                </span>
                              </td>
                            </>
                          )}

                          {(canAdjustStock || canViewHistory || canTransferStock) && (
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1.5">
                                {canAdjustStock && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => openStockIn(item)}
                                      title="Stock In"
                                      aria-label={`Stock in ${product.name || 'product'}`}
                                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100"
                                    >
                                      <ArrowDownToLine size={15} />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => openStockOut(item)}
                                      disabled={canViewStock && available <= 0}
                                      title="Stock Out"
                                      aria-label={`Stock out ${product.name || 'product'}`}
                                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                      <ArrowUpFromLine size={15} />
                                    </button>
                                  </>
                                )}

                                {canViewHistory && (
                                  <button
                                    type="button"
                                    onClick={() => openHistory(item)}
                                    title="Stock History"
                                    aria-label={`View history for ${product.name || 'product'}`}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-erp-primary/30 hover:bg-erp-primary/5 hover:text-erp-primary"
                                  >
                                    <History size={15} />
                                  </button>
                                )}

                                {canTransferStock && (
                                  <button
                                    type="button"
                                    onClick={openTransfer}
                                    title="Transfer Stock"
                                    aria-label={`Transfer stock for ${product.name || 'product'}`}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-erp-primary/30 hover:bg-erp-primary/5 hover:text-erp-primary"
                                  >
                                    <Warehouse size={15} />
                                  </button>
                                )}
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
                {items.map((item) => {
                  const product = getProduct(item)
                  const stock = getStock(item)
                  const reserved = getReservedStock(item)
                  const available = getAvailableStock(item)
                  const status = getStockStatus(item)

                  return (
                    <div
                      key={getProductKey(item)}
                      className="space-y-3 p-3"
                    >
                      <div className="flex items-start gap-2.5">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name || 'Product'}
                            className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                            <Package size={18} />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-semibold text-slate-900">
                            {product.name || 'Unnamed product'}
                          </p>

                          <p className="mt-1 break-words text-xs text-slate-500">
                            SKU: {product.sku || '—'}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Unit: {product.unit || 'Piece'}
                          </p>
                        </div>

                        {canViewStock && (
                          <span
                            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-semibold ${status.className}`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${status.dotClass}`}
                            />
                            {status.label}
                          </span>
                        )}
                      </div>

                      {canViewStock && (
                        <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3">
                          <div>
                            <p className="text-[10px] text-slate-500">
                              Current Stock
                            </p>

                            <p className="mt-1 text-xs font-semibold text-slate-800">
                              {formatQuantity(stock)} {product.unit || 'Piece'}
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] text-slate-500">
                              Reserved
                            </p>

                            <p className="mt-1 text-xs font-semibold text-slate-800">
                              {formatQuantity(reserved)}
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] text-slate-500">
                              Available
                            </p>

                            <p className="mt-1 text-xs font-semibold text-slate-800">
                              {formatQuantity(available)} {product.unit || 'Piece'}
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] text-slate-500">
                              Minimum Stock
                            </p>

                            <p className="mt-1 text-xs font-semibold text-slate-800">
                              {formatQuantity(getMinimumStock(item))}
                            </p>
                          </div>
                        </div>
                      )}

                      {(canAdjustStock || canViewHistory || canTransferStock) && (
                        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-2.5">
                          {canAdjustStock && (
                            <>
                              <button
                                type="button"
                                onClick={() => openStockIn(item)}
                                className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                              >
                                <ArrowDownToLine size={14} />
                                Stock In
                              </button>

                              <button
                                type="button"
                                onClick={() => openStockOut(item)}
                                disabled={canViewStock && available <= 0}
                                className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-600 hover:bg-rose-100 disabled:opacity-40"
                              >
                                <ArrowUpFromLine size={14} />
                                Stock Out
                              </button>
                            </>
                          )}

                          {canViewHistory && (
                            <button
                              type="button"
                              onClick={() => openHistory(item)}
                              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              <History size={14} />
                              History
                            </button>
                          )}

                          {canTransferStock && (
                            <button
                              type="button"
                              onClick={openTransfer}
                              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              <Warehouse size={14} />
                              Transfer
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

          {/* Updating overlay */}
          {!initialLoading && isFetching && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 backdrop-blur-[2px]">
              <Loading
                fullScreen={false}
                label="Updating inventory"
                description="Refreshing stock records..."
                className="!h-full min-h-[220px]"
              />
            </div>
          )}

          {/* Fetch error */}
          {!initialLoading && error && items.length === 0 && (
            <div className="border-t border-rose-100 bg-rose-50 px-4 py-3 text-center">
              <div className="inline-flex items-center gap-2 text-xs text-rose-700">
                <AlertCircle size={14} />
                {error}
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={isFetching}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                >
                  <RefreshCw size={13} />
                  Try again
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Pagination — same style as CompanyProducts */}
        {!initialLoading && (
          <div className="flex flex-col gap-3 border-t border-slate-100 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs text-slate-500 sm:text-sm">
                Showing{' '}
                <span className="font-semibold text-slate-700">
                  {startItem}–{endItem}
                </span>{' '}
                of{' '}
                <span className="font-semibold text-slate-700">
                  {totalItems}
                </span>{' '}
                inventory items
              </p>

              <div className="flex items-center gap-2">
                <label
                  htmlFor="inventory-page-size"
                  className="whitespace-nowrap text-xs text-slate-500"
                >
                  Rows:
                </label>

                <select
                  id="inventory-page-size"
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
                onClick={() =>
                  setCurrentPage((page) => Math.max(1, page - 1))
                }
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
                onClick={() =>
                  setCurrentPage((page) =>
                    Math.min(totalPages, page + 1),
                  )
                }
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
    </div>
  )
}
