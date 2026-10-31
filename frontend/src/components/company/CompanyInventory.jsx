import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Search, Package, RefreshCw, ArrowDownToLine, ArrowUpFromLine, History, AlertCircle, ChevronLeft, ChevronRight, Filter, FilterX, Warehouse, Power } from 'lucide-react'

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

  return String(product?._id || item?.productId || item?._id || product?.sku || product?.name || 'unknown')
}

function isProductInactive(item) {
  return getProduct(item)?.status === 'Inactive'
}

function getStock(item) {
  return Number(item?.totalCurrentStock ?? item?.totalStock ?? item?.currentStock ?? item?.stock ?? item?.openingStock ?? getProduct(item)?.openingStock ?? 0)
}

function getReservedStock(item) {
  return Number(item?.totalReservedStock ?? item?.reservedStock ?? 0)
}

function getAvailableStock(item) {
  return Number(item?.totalAvailableStock ?? item?.availableStock ?? Math.max(0, getStock(item) - getReservedStock(item)))
}

function getMinimumStock(item) {
  const product = getProduct(item)

  return Number(product?.minStockLevel ?? product?.lowStockAlert ?? item?.minStockLevel ?? item?.lowStockAlert ?? 0)
}

function getStockStatus(item) {
  const available = getAvailableStock(item)
  const minimum = getMinimumStock(item)

  if (available <= 0) {
    return {
      label: 'Out of Stock',
      className: 'bg-erp-danger-light text-erp-danger',
      dotClass: 'bg-erp-danger',
    }
  }

  if (minimum > 0 && available <= minimum) {
    return {
      label: 'Low Stock',
      className: 'bg-erp-warning-light text-erp-warning',
      dotClass: 'bg-erp-warning',
    }
  }

  return {
    label: 'In Stock',
    className: 'bg-erp-success-light text-erp-success',
    dotClass: 'bg-erp-success',
  }
}

function formatQuantity(value) {
  return Number(value || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 3,
  })
}

function getInventoryList(data) {
  const result = data?.inventory ?? data?.items ?? data?.data?.inventory ?? data?.data?.items ?? data?.data

  return Array.isArray(result) ? result : []
}

function getWarehouseStocks(item) {
  const result = item?.warehouseStocks ?? item?.warehouses ?? item?.warehouseBreakdown ?? item?.warehouseStock ?? []

  return Array.isArray(result) ? result : []
}

function getWarehouseName(stock) {
  if (typeof stock?.warehouseId === 'object') {
    return stock.warehouseId?.name || stock.warehouseId?.warehouseName || 'Warehouse'
  }

  return stock?.warehouseName || stock?.name || 'Warehouse'
}

function getWarehouseQuantity(stock) {
  return Number(stock?.currentStock ?? stock?.stock ?? stock?.quantity ?? 0)
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
  const hasActiveFilters = Boolean(search.trim()) || statusFilter !== 'All'

  const showToast = (type, message, duration = 3000) => {
    setToast({ id: Date.now(), type, message, duration })
  }

  useEffect(() => {
    document.title = 'Inventory | MineERP'
  }, [])

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

        if (data?.success === false) {
          throw new Error(data.message || 'Unable to load inventory.')
        }

        if (cancelled) return

        const list = getInventoryList(data)
        setItems(list)

        const serverPagination = data?.pagination ?? data?.data?.pagination ?? {}

        const total = Number(serverPagination.total ?? data?.total ?? list.length)

        const totalPages = Math.max(1, Number(serverPagination.totalPages ?? data?.totalPages ?? 1))

        const serverPage = Number(serverPagination.page) || currentPage

        setPagination({
          page: serverPage,
          limit: Number(serverPagination.limit) || pageSize,
          total,
          totalPages,
        })

        if (serverPage !== currentPage) {
          setCurrentPage(serverPage)
        }

        const serverStats = data?.stats ?? data?.data?.stats

        const lowStockCount = list.filter((item) => getStockStatus(item).label === 'Low Stock').length

        const outOfStockCount = list.filter((item) => getStockStatus(item).label === 'Out of Stock').length

        setStats({
          total: Number(serverStats?.total ?? total),
          lowStock: Number(serverStats?.lowStock ?? serverStats?.lowStockCount ?? lowStockCount),
          outOfStock: Number(serverStats?.outOfStock ?? serverStats?.outOfStockCount ?? outOfStockCount),
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
      setRefreshing(false)
    }

    return () => {
      cancelled = true
    }
  }, [canView, search, statusFilter, currentPage, pageSize, refreshKey])

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

  const getProductId = (item) => {
    const product = getProduct(item)

    return product?._id || (typeof item?.productId === 'string' ? item.productId : null)
  }

  // Inactive product actions show a Toast instead of navigating.
  const checkProductForStockAction = (item, action) => {
    if (isProductInactive(item)) {
      showToast('error', `Cannot perform ${action}. This product is inactive. Activate it first.`)
      return false
    }

    return true
  }

  const openStockIn = (item) => {
    if (!canAdjustStock) return

    if (!checkProductForStockAction(item, 'stock-in')) return

    const productId = getProductId(item)

    if (!productId) {
      showToast('error', 'Product ID મળ્યો નથી.')
      return
    }

    navigate(`/company/inventory/${productId}/stock-in`)
  }

  const openStockOut = (item) => {
    if (!canAdjustStock) return

    if (!checkProductForStockAction(item, 'stock-out')) return

    const productId = getProductId(item)

    if (!productId) {
      showToast('error', 'Product ID મળ્યો નથી.')
      return
    }

    navigate(`/company/inventory/${productId}/stock-out`)
  }

  const openHistory = (item) => {
    if (!canViewHistory) return

    const productId = getProductId(item)

    if (!productId) {
      showToast('error', 'Product ID મળ્યો નથી.')
      return
    }

    navigate(`/company/inventory/${productId}/history`)
  }

  const openTransfer = (item) => {
    if (!canTransferStock) return

    if (!checkProductForStockAction(item, 'stock transfer')) return

    const product = getProduct(item)
    const productId = getProductId(item)

    if (!productId) {
      showToast('error', 'Product ID મળ્યો નથી.')
      return
    }

    navigate('/company/inventory/stock-transfer', {
      state: {
        productId,
        productName: product.name || product.productName || '',
        sku: product.sku || '',
      },
    })
  }

  // Visually disabled, but still clickable so an inactive-product Toast can appear.
  const actionButtonClass = (inactive, colorClass = '') => `flex h-8 w-8 items-center justify-center rounded-lg border transition ${inactive ? 'cursor-not-allowed border-erp-disabled-border bg-erp-disabled-light text-erp-disabled-text' : colorClass}`

  const mobileActionButtonClass = (inactive, colorClass = '') =>
    `inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border text-xs font-semibold transition ${inactive ? 'cursor-not-allowed border-erp-disabled-border bg-erp-disabled-light text-erp-disabled-text' : colorClass}`

  const totalPages = Math.max(1, Number(pagination.totalPages) || 1)
  const safePage = Math.min(currentPage, totalPages)
  const totalItems = Number(pagination.total) || 0
  const startItem = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1
  const endItem = Math.min(safePage * pageSize, totalItems)

  if (!canView) {
    return (
      <div className="rounded-xl border border-erp-border bg-erp-surface p-6 text-center">
        <h2 className="text-base font-semibold text-erp-text">Access Denied</h2>
        <p className="mt-1 text-sm text-erp-text-secondary">You do not have permission to view inventory.</p>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-4 text-sm">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card h-17">
        <div className="h-1 bg-erp-primary" />

        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <div className="min-w-0 flex-1">
            <BreadCrumb items={breadcrumbItems} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-9 items-center gap-2 rounded-lg border border-erp-border px-3">
              <span className="text-xs text-erp-text-secondary">Total</span>
              <span className="font-bold text-erp-text">{stats.total}</span>
            </div>

            <div className="flex h-9 items-center gap-2 rounded-lg border border-erp-warning-border px-3">
              <span className="text-xs text-erp-warning">Low Stock</span>
              <span className="font-bold text-erp-text">{stats.lowStock}</span>
            </div>

            <div className="hidden h-9 items-center gap-2 rounded-lg border border-erp-danger-border px-3 sm:flex">
              <span className="text-xs text-erp-danger">Out of Stock</span>
              <span className="font-bold text-erp-text">{stats.outOfStock}</span>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={isFetching}
              title="Refresh inventory"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-erp-border px-3 text-xs font-semibold text-erp-text-secondary transition hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        <div className="flex flex-col gap-3 border-b border-erp-border p-3 sm:px-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-erp-text-muted" />

              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setCurrentPage(1)
                }}
                placeholder="Search product name or SKU..."
                aria-label="Search inventory"
                className="h-9 w-full rounded-lg border border-erp-border bg-erp-bg pl-9 pr-3 text-xs text-erp-text outline-none transition placeholder:text-erp-text-muted focus:border-erp-primary focus:bg-erp-surface focus:ring-2 focus:ring-erp-ring sm:text-sm"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value)
                  setCurrentPage(1)
                }}
                aria-label="Filter inventory by stock status"
                className="h-9 max-w-full rounded-lg border border-erp-border bg-erp-surface px-2.5 text-xs text-erp-text-secondary outline-none focus:border-erp-primary focus:ring-2 focus:ring-erp-ring sm:text-sm"
              >
                <option value="All">All Stock Statuses</option>
                <option value="In Stock">In Stock</option>
                <option value="Low Stock">Low Stock</option>
                <option value="Out of Stock">Out of Stock</option>
              </select>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  title="Clear filters"
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-erp-border px-3 text-xs font-semibold text-erp-text-secondary hover:bg-erp-hover"
                >
                  <FilterX size={14} />
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="relative min-h-[420px]">
          {initialLoading ? (
            <div className="flex min-h-[480] items-center justify-center">
              <Loading fullScreen={false} label="Loading inventory" description="Fetching stock records..." className="!h-full min-h-[500px]" />
            </div>
          ) : error && items.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center px-4 py-8 text-center">
              <AlertCircle size={28} className="text-erp-danger" />
              <p className="mt-3 text-sm font-semibold text-erp-danger">Unable to load inventory</p>
              <p className="mt-1 max-w-lg text-xs text-erp-text-secondary">{error}</p>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isFetching}
                className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg border border-erp-danger-border px-3 text-xs font-semibold text-erp-danger hover:bg-erp-danger-light disabled:opacity-50"
              >
                <RefreshCw size={13} />
                Try again
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center px-4 py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-erp-surface-secondary text-erp-text-muted">
                <Package size={24} />
              </div>
              <h3 className="mt-3 font-bold text-erp-text">{hasActiveFilters ? 'No matching inventory' : 'No inventory found'}</h3>
              <p className="mt-1 max-w-xs text-xs text-erp-text-secondary">{hasActiveFilters ? 'Try another search term or change the stock status filter.' : 'Create a product first to start managing stock.'}</p>
              {hasActiveFilters && (
                <button type="button" onClick={resetFilters} className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg border border-erp-border px-3 text-xs font-semibold text-erp-text-secondary hover:bg-erp-hover">
                  <Filter size={14} />
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              {error && (
                <div className="flex items-start gap-2 border-b border-erp-warning-border bg-erp-warning-light px-4 py-2 text-xs text-erp-warning">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <span>{error}. Showing the last successfully loaded records.</span>
                </div>
              )}

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[1100px] text-left">
                  <thead className="bg-erp-surface-secondary">
                    <tr className="border-b border-erp-border">
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-erp-text-secondary">Product</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-erp-text-secondary">SKU</th>

                      {canViewStock && (
                        <>
                          <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-erp-text-secondary">Current Stock</th>
                          <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-erp-text-secondary">Reserved</th>
                          <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-erp-text-secondary">Available</th>
                          <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-erp-text-secondary">Stock Status</th>
                        </>
                      )}

                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-erp-text-secondary">Warehouse Stock</th>

                      {(canAdjustStock || canViewHistory || canTransferStock) && <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-erp-text-secondary">Actions</th>}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-erp-border">
                    {items.map((item) => {
                      const product = getProduct(item)
                      const stock = getStock(item)
                      const reserved = getReservedStock(item)
                      const available = getAvailableStock(item)
                      const status = getStockStatus(item)
                      const warehouses = getWarehouseStocks(item)
                      const inactive = isProductInactive(item)

                      return (
                        <tr key={getProductKey(item)} className="align-top transition hover:bg-erp-surface-hover">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              {product.imageUrl ? (
                                <img src={product.imageUrl} alt={product.name || 'Product'} className={`h-9 w-9 shrink-0 rounded-lg border border-erp-border object-cover ${inactive ? 'opacity-60 grayscale' : ''}`} />
                              ) : (
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-erp-primary-light text-erp-primary">
                                  <Package size={17} />
                                </div>
                              )}

                              <div className="min-w-0">
                                <p className={`max-w-52 truncate text-xs font-semibold sm:text-sm ${inactive ? 'text-erp-disabled-text' : 'text-erp-text'}`}>{product.name || product.productName || 'Unnamed product'}</p>

                                <div className="mt-1 flex items-center gap-2">
                                  <span className="text-[10px] text-erp-text-muted">Unit: {product.unit || 'Piece'}</span>

                                  <span className={`size-2 rounded-full ${inactive ? 'bg-erp-disabled' : 'bg-erp-success'}`} />
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <span className="inline-flex max-w-32 truncate rounded-md border border-erp-border bg-erp-surface-secondary px-2 py-1 text-xs font-medium text-erp-text-secondary">{product.sku || '—'}</span>
                          </td>

                          {canViewStock && (
                            <>
                              <td className="whitespace-nowrap px-4 py-3 text-xs font-medium text-erp-text-secondary">
                                {formatQuantity(stock)} {product.unit || 'Piece'}
                              </td>
                              <td className="px-4 py-3 text-xs text-erp-text-secondary">{formatQuantity(reserved)}</td>
                              <td className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-erp-text">
                                {formatQuantity(available)} {product.unit || 'Piece'}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-1 text-[11px] font-semibold ${status.className}`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${status.dotClass}`} />
                                  {status.label}
                                </span>
                              </td>
                            </>
                          )}

                          <td className="max-w-64 px-4 py-3">
                            {warehouses.length > 0 ? (
                              <div className="space-y-1.5">
                                {warehouses.map((warehouse, index) => (
                                  <div key={String(warehouse?.warehouseId?._id || warehouse?.warehouseId || warehouse?._id || index)} className="flex items-start justify-between gap-3 text-xs">
                                    <span className={`min-w-0 break-words ${inactive ? 'text-erp-disabled-text' : 'text-erp-text-secondary'}`}>{getWarehouseName(warehouse)}</span>
                                    <span className="shrink-0 font-semibold text-erp-text">{formatQuantity(getWarehouseQuantity(warehouse))}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-erp-text-muted">Not provided by API</span>
                            )}
                          </td>

                          {(canAdjustStock || canViewHistory || canTransferStock) && (
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1.5">
                                {canAdjustStock && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => openStockIn(item)}
                                      aria-disabled={inactive}
                                      title={inactive ? 'Inactive product: stock-in unavailable' : 'Stock In'}
                                      aria-label={`Stock in ${product.name || 'product'}`}
                                      className={actionButtonClass(inactive, 'border-erp-success-border bg-erp-success-light text-erp-success hover:brightness-95')}
                                    >
                                      <ArrowDownToLine size={15} />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => openStockOut(item)}
                                      disabled={!inactive && canViewStock && available <= 0}
                                      aria-disabled={inactive || (canViewStock && available <= 0)}
                                      title={inactive ? 'Inactive product: stock-out unavailable' : available <= 0 ? 'No available stock' : 'Stock Out'}
                                      aria-label={`Stock out ${product.name || 'product'}`}
                                      className={actionButtonClass(inactive || (canViewStock && available <= 0), 'border-erp-danger-border bg-erp-danger-light text-erp-danger hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40')}
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
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-erp-border text-erp-text-secondary transition hover:border-erp-primary hover:bg-erp-primary-light hover:text-erp-primary"
                                  >
                                    <History size={15} />
                                  </button>
                                )}

                                {canTransferStock && (
                                  <button
                                    type="button"
                                    onClick={() => openTransfer(item)}
                                    aria-disabled={inactive}
                                    title={inactive ? 'Inactive product: transfer unavailable' : 'Transfer Stock'}
                                    aria-label={`Transfer stock for ${product.name || 'product'}`}
                                    className={actionButtonClass(inactive, 'border-erp-border text-erp-text-secondary hover:border-erp-primary hover:bg-erp-primary-light hover:text-erp-primary')}
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

              {/* Mobile inventory cards */}
              <div className="divide-y divide-erp-border md:hidden">
                {items.map((item) => {
                  const product = getProduct(item)
                  const stock = getStock(item)
                  const reserved = getReservedStock(item)
                  const available = getAvailableStock(item)
                  const status = getStockStatus(item)
                  const warehouses = getWarehouseStocks(item)
                  const inactive = isProductInactive(item)

                  return (
                    <div key={getProductKey(item)} className="space-y-3 p-3">
                      <div className="flex items-start gap-2.5">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name || 'Product'} className={`h-10 w-10 shrink-0 rounded-lg border border-erp-border object-cover ${inactive ? 'opacity-60 grayscale' : ''}`} />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-erp-primary-light text-erp-primary">
                            <Package size={18} />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <p className={`break-words text-sm font-semibold ${inactive ? 'text-erp-disabled-text' : 'text-erp-text'}`}>{product.name || product.productName || 'Unnamed product'}</p>
                          <p className="mt-1 break-words text-xs text-erp-text-secondary">SKU: {product.sku || '—'}</p>
                          <p className="mt-1 text-xs text-erp-text-secondary">Unit: {product.unit || 'Piece'}</p>
                          <span
                            className={`mt-2 inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold ${
                              inactive ? 'border-erp-disabled-border bg-erp-disabled-light text-erp-disabled-text' : 'border-erp-success-border bg-erp-success-light text-erp-success'
                            }`}
                          >
                            {inactive ? <Power size={11} /> : null}
                            {inactive ? 'Inactive Product' : 'Active Product'}
                          </span>
                        </div>

                        {canViewStock && (
                          <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-semibold ${status.className}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${status.dotClass}`} />
                            {status.label}
                          </span>
                        )}
                      </div>

                      {canViewStock && (
                        <div className={`grid grid-cols-2 gap-2 rounded-lg p-3 ${inactive ? 'border border-erp-disabled-border bg-erp-disabled-surface' : 'bg-erp-surface-secondary'}`}>
                          <div>
                            <p className="text-[10px] text-erp-text-secondary">Current Stock</p>
                            <p className="mt-1 text-xs font-semibold text-erp-text">
                              {formatQuantity(stock)} {product.unit || 'Piece'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-erp-text-secondary">Reserved</p>
                            <p className="mt-1 text-xs font-semibold text-erp-text">{formatQuantity(reserved)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-erp-text-secondary">Available</p>
                            <p className="mt-1 text-xs font-semibold text-erp-text">
                              {formatQuantity(available)} {product.unit || 'Piece'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-erp-text-secondary">Minimum Stock</p>
                            <p className="mt-1 text-xs font-semibold text-erp-text">{formatQuantity(getMinimumStock(item))}</p>
                          </div>
                        </div>
                      )}

                      <div className="rounded-lg border border-erp-border p-3">
                        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-erp-text">
                          <Warehouse size={14} />
                          Warehouse Stock
                        </p>

                        {warehouses.length > 0 ? (
                          <div className="space-y-2">
                            {warehouses.map((warehouse, index) => (
                              <div key={String(warehouse?.warehouseId?._id || warehouse?.warehouseId || warehouse?._id || index)} className="flex items-center justify-between gap-3 text-xs">
                                <span className="break-words text-erp-text-secondary">{getWarehouseName(warehouse)}</span>
                                <span className="shrink-0 font-semibold text-erp-text">{formatQuantity(getWarehouseQuantity(warehouse))}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-erp-text-muted">Warehouse breakdown API responseમાં ઉપલબ્ધ નથી.</p>
                        )}
                      </div>

                      {(canAdjustStock || canViewHistory || canTransferStock) && (
                        <div className="flex flex-wrap gap-2 border-t border-erp-border pt-2.5">
                          {canAdjustStock && (
                            <>
                              <button type="button" onClick={() => openStockIn(item)} aria-disabled={inactive} className={mobileActionButtonClass(inactive, 'border-erp-success-border bg-erp-success-light text-erp-success hover:brightness-95')}>
                                <ArrowDownToLine size={14} />
                                Stock In
                              </button>

                              <button
                                type="button"
                                onClick={() => openStockOut(item)}
                                disabled={!inactive && canViewStock && available <= 0}
                                aria-disabled={inactive || (canViewStock && available <= 0)}
                                className={mobileActionButtonClass(inactive || (canViewStock && available <= 0), 'border-erp-danger-border bg-erp-danger-light text-erp-danger hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40')}
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
                              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-erp-border text-xs font-semibold text-erp-text-secondary transition hover:bg-erp-hover"
                            >
                              <History size={14} />
                              History
                            </button>
                          )}

                          {canTransferStock && (
                            <button
                              type="button"
                              onClick={() => openTransfer(item)}
                              aria-disabled={inactive}
                              className={mobileActionButtonClass(inactive, 'border-erp-border text-erp-text-secondary hover:border-erp-primary hover:bg-erp-primary-light hover:text-erp-primary')}
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

          {!initialLoading && isFetching && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-erp-surface/80 backdrop-blur-[2px]">
              <Loading fullScreen={false} label="Updating inventory" description="Refreshing stock records..." className="!h-full min-h-[220px]" />
            </div>
          )}
        </div>

        {!initialLoading && (
          <div className="flex flex-col gap-3 border-t border-erp-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs text-erp-text-secondary sm:text-sm">
                Showing{' '}
                <span className="font-semibold text-erp-text">
                  {startItem}–{endItem}
                </span>{' '}
                of <span className="font-semibold text-erp-text">{totalItems}</span> inventory items
              </p>

              <div className="flex items-center gap-2">
                <label htmlFor="inventory-page-size" className="whitespace-nowrap text-xs text-erp-text-secondary">
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
                  className="h-8 rounded-lg border border-erp-border bg-erp-surface px-2 text-xs text-erp-text-secondary outline-none focus:border-erp-primary focus:ring-2 focus:ring-erp-ring"
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
                className="flex h-8 items-center justify-center rounded-lg border border-erp-border px-2 text-xs text-erp-text-secondary hover:bg-erp-hover disabled:opacity-40"
              >
                1
              </button>

              <button
                type="button"
                disabled={safePage <= 1 || isFetching}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                aria-label="Previous page"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-erp-border text-erp-text-secondary hover:bg-erp-hover disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>

              <span className="min-w-20 px-1 text-center text-xs text-erp-text-secondary sm:text-sm">
                Page {safePage} of {totalPages}
              </span>

              <button
                type="button"
                disabled={safePage >= totalPages || isFetching}
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                aria-label="Next page"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-erp-border text-erp-text-secondary hover:bg-erp-hover disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>

              <button
                type="button"
                disabled={safePage >= totalPages || isFetching}
                onClick={() => setCurrentPage(totalPages)}
                aria-label="Last page"
                className="flex h-8 items-center justify-center rounded-lg border border-erp-border px-2 text-xs text-erp-text-secondary hover:bg-erp-hover disabled:opacity-40"
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
