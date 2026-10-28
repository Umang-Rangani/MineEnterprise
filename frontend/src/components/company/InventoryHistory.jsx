import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Boxes,
  History,
  Search,
  RefreshCw,
  LoaderCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  CalendarDays,
  FileText,
  UserRound,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  FilterX,
  Power,
} from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Loading from '../Loading/Loading'
import { hasPermission, useAuth } from '../../context/AuthContext'
import Toast from '../../Toast/Toast'

const DEFAULT_PAGE_SIZE = 5

const MOVEMENT_TYPES = [
  { value: 'ALL', label: 'All Movements' },
  { value: 'STOCK_IN', label: 'Stock In' },
  { value: 'STOCK_OUT', label: 'Stock Out' },
  { value: 'ADJUSTMENT', label: 'Adjustment' },
  { value: 'TRANSFER', label: 'Transfer' },
]

function getProductFromResponse(data) {
  return data?.inventory ?? data?.data?.inventory ?? data?.data ?? null
}

function getErrorMessage(error, fallback) {
  return error.response?.data?.message || error.message || fallback
}

function getHistoryFromResponse(data) {
  const movements = Array.isArray(data?.movements)
    ? data.movements
    : Array.isArray(data?.data?.movements)
      ? data.data.movements
      : []

  const pagination = data?.pagination ?? data?.data?.pagination ?? {}

  return { movements, pagination }
}

export default function InventoryHistory() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const { permissions } = useAuth()

  const canViewHistory = hasPermission(
    permissions,
    'inventory:view-history'
  )

  const canViewStock = hasPermission(
    permissions,
    'inventory:view-stock'
  )

  const hasPermissionToView = canViewHistory && canViewStock

  const [product, setProduct] = useState(null)
  const [movements, setMovements] = useState([])

  const [pagination, setPagination] = useState({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  })

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  const [productLoading, setProductLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [apiError, setApiError] = useState('')

  // Shared reusable toast notification.
  const [toast, setToast] = useState(null)

  const breadcrumbItems = [
    {
      title: 'Inventory',
      link: '/company/inventory',
    },
    {
      title: 'Stock History',
      link: null,
    },
  ]

  useEffect(() => {
    document.title = 'Stock History | MineERP'
  }, [])

  // Show notifications through the shared Toast component.
  function showToast(message, type = 'error', duration = 3000) {
    setToast({
      id: Date.now(),
      message,
      type,
      duration,
    })
  }

  function closeToast() {
    setToast(null)
  }

  // Debounce search input.
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const nextSearch = searchInput.trim()

      setSearch((current) =>
        current === nextSearch ? current : nextSearch
      )

      setPage(1)
    }, 400)

    return () => clearTimeout(timeoutId)
  }, [searchInput])

  // Load product information and its current Active/Inactive status.
  useEffect(() => {
    let active = true

    async function loadProduct() {
      if (!hasPermissionToView || !id) {
        setProductLoading(false)
        return
      }

      setProductLoading(true)

      try {
        const { data } = await axiosInstance.get(`/erp/inventory/${id}`)

        if (data?.success === false) {
          throw new Error(
            data.message || 'Unable to load product details.'
          )
        }

        if (active) {
          setProduct(getProductFromResponse(data))
          setApiError('')
        }
      } catch (error) {
        if (active) {
          setApiError(
            getErrorMessage(error, 'Unable to load product details.')
          )
        }
      } finally {
        if (active) {
          setProductLoading(false)
        }
      }
    }

    loadProduct()

    return () => {
      active = false
    }
  }, [id, hasPermissionToView, refreshKey])

  // Load history with server-side filters and pagination.
  useEffect(() => {
    let active = true

    async function loadHistory() {
      if (!hasPermissionToView || !id) {
        setLoading(false)
        return
      }

      setLoading(true)
      setApiError('')

      try {
        const params = {
          page,
          limit: pageSize,
          search,
        }

        if (typeFilter !== 'ALL') {
          params.type = typeFilter
        }

        const { data } = await axiosInstance.get(
          `/erp/inventory/${id}/history`,
          { params }
        )

        if (data?.success === false) {
          throw new Error(
            data.message || 'Unable to load stock history.'
          )
        }

        if (!active) return

        const result = getHistoryFromResponse(data)
        const info = result.pagination

        const total = Number(
          info.total ?? result.movements.length
        )

        const totalPages = Math.max(
          1,
          Number(info.totalPages ?? Math.ceil(total / pageSize))
        )

        setMovements(result.movements)

        setPagination({
          page: Number(info.page ?? page),
          limit: Number(info.limit ?? pageSize),
          total,
          totalPages,
        })

        if (page > totalPages) {
          setPage(totalPages)
        }
      } catch (error) {
        if (active) {
          setMovements([])

          setPagination({
            page,
            limit: pageSize,
            total: 0,
            totalPages: 1,
          })

          setApiError(
            getErrorMessage(error, 'Unable to load stock history.')
          )
        }
      } finally {
        if (active) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    }

    loadHistory()

    return () => {
      active = false
    }
  }, [
    id,
    page,
    pageSize,
    search,
    typeFilter,
    hasPermissionToView,
    location.key,
    refreshKey,
  ])

  function goBack() {
    navigate('/company/inventory')
  }

  function handleTypeChange(event) {
    setTypeFilter(event.target.value)
    setPage(1)
  }

  function handlePageSizeChange(event) {
    setPageSize(Number(event.target.value))
    setPage(1)
  }

  function handlePageChange(nextPage) {
    const lastPage = Math.max(1, pagination.totalPages)

    setPage(Math.min(lastPage, Math.max(1, nextPage)))
  }

  function clearFilters() {
    setSearchInput('')
    setSearch('')
    setTypeFilter('ALL')
    setPage(1)
  }

  function refreshHistory() {
    if (refreshing) return

    setRefreshing(true)
    setApiError('')
    setRefreshKey((current) => current + 1)
  }

  // Support direct and nested product response structures.
  const productStatus =
    product?.status ??
    product?.product?.status ??
    product?.productId?.status

  const isInactive =
    String(productStatus || '').toLowerCase() === 'inactive'

  const productName =
    product?.name ||
    product?.productName ||
    product?.product?.name ||
    'Product'

  const sku = product?.sku || product?.product?.sku || '—'

  const unit = product?.unit || product?.product?.unit || 'Piece'

  const categoryName =
    product?.categoryId?.name ||
    product?.categoryName ||
    product?.category?.name ||
    'Uncategorized'

  const currentStock = Number(
    product?.currentStock ?? product?.openingStock ?? 0
  )

  const reservedStock = Number(product?.reservedStock ?? 0)

  const availableStock = Number(
    product?.availableStock ?? currentStock - reservedStock
  )

  const stockStats = [
    {
      label: 'Current Stock',
      value: currentStock,
      color: 'text-erp-text',
      background: 'bg-erp-hover/30',
    },
    {
      label: 'Reserved Stock',
      value: reservedStock,
      color: 'text-amber-600',
      background: 'bg-amber-50',
    },
    {
      label: 'Available Stock',
      value: availableStock,
      color: 'text-emerald-700',
      background: 'bg-emerald-50',
    },
  ]

  const safePage = Math.min(
    Math.max(1, page),
    Math.max(1, pagination.totalPages)
  )

  const totalMovements = pagination.total
  const totalPages = Math.max(1, pagination.totalPages)

  const startItem =
    totalMovements === 0 ? 0 : (safePage - 1) * pageSize + 1

  const endItem = Math.min(
    safePage * pageSize,
    totalMovements
  )

  const isFetching = loading || refreshing

  // Inactive products cannot enter stock-changing screens.
  // Keep these buttons clickable so the user sees an error toast.
  function handleStockIn() {
    if (productLoading) return

    if (isInactive) {
      showToast(
        'Product is inactive. Activate it before performing stock-in.',
        'error'
      )
      return
    }

    navigate(`/company/inventory/${id}/stock-in`)
  }

  function handleStockOut() {
    if (productLoading) return

    if (isInactive) {
      showToast(
        'Product is inactive. Activate it before performing stock-out.',
        'error'
      )
      return
    }

    if (availableStock <= 0) {
      showToast('No available stock for stock-out.', 'warning')
      return
    }

    navigate(`/company/inventory/${id}/stock-out`)
  }

  const stockActionClass = (disabled) =>
    disabled
      ? 'border border-erp-disabled-border bg-erp-disabled-light text-erp-disabled-text cursor-not-allowed'
      : ''

  if (!hasPermissionToView) {
    return (
      <div className="min-w-0 rounded-xl border border-erp-border bg-erp-surface p-6 text-center">
        <AlertCircle
          size={28}
          className="mx-auto text-rose-500"
        />

        <h2 className="mt-3 text-base font-semibold text-erp-text">
          Access Denied
        </h2>

        <p className="mt-2 text-sm text-erp-text-secondary">
          You do not have permission to view stock history.
        </p>

        <button
          type="button"
          onClick={goBack}
          className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-erp-primary px-4 text-xs font-semibold text-white hover:bg-erp-primary-hover"
        >
          <ArrowLeft size={14} />
          Back to Inventory
        </button>
      </div>
    )
  }

  if (productLoading && !product) {
    return (
      <div className="min-w-0 space-y-3">
        <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="h-1 bg-erp-primary" />

          <div className="flex items-center px-4 py-4 sm:px-5">
            <BreadCrumb items={breadcrumbItems} />
          </div>
        </section>

        <Loading
          label="Loading stock history..."
          description="Fetching product and stock movements."
        />
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-4 text-sm">
      {/* Shared Toast component */}
      <Toast toast={toast} onClose={closeToast} />

      {/* Header */}
      <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        <div className="h-1 bg-erp-primary" />

        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <div className="min-w-0 flex-1">
            <BreadCrumb items={breadcrumbItems} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {stockStats.map((stat) => (
              <div
                key={stat.label}
                className={`flex h-9 items-center gap-2 whitespace-nowrap rounded-lg border border-erp-border px-3 ${stat.background}`}
              >
                <span className="text-[10px] font-medium text-erp-text-secondary">
                  {stat.label}
                </span>

                <span className={`text-xs font-bold ${stat.color}`}>
                  {stat.value.toLocaleString('en-IN')}

                  <span className="ml-1 text-[9px] font-medium text-erp-text-secondary">
                    {unit}
                  </span>
                </span>
              </div>
            ))}

            <button
              type="button"
              onClick={refreshHistory}
              disabled={refreshing}
              title="Refresh stock history"
              aria-label="Refresh stock history"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-erp-border bg-erp-surface px-3 text-xs font-semibold text-erp-text-secondary transition hover:bg-erp-hover disabled:opacity-60"
            >
              {refreshing ? (
                <LoaderCircle size={14} className="animate-spin" />
              ) : (
                <RefreshCw size={14} />
              )}

              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* Stock In */}
            <button
              type="button"
              onClick={handleStockIn}
              aria-disabled={isInactive || productLoading}
              title={
                isInactive
                  ? 'Product is inactive. Activate it before performing stock-in.'
                  : 'Stock In'
              }
              className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition ${
                isInactive || productLoading
                  ? stockActionClass(true)
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              {isInactive ? (
                <Power size={14} />
              ) : (
                <ArrowDownToLine size={14} />
              )}
              Stock In
            </button>

            {/* Stock Out */}
            <button
              type="button"
              onClick={handleStockOut}
              aria-disabled={
                isInactive || productLoading || availableStock <= 0
              }
              title={
                isInactive
                  ? 'Product is inactive. Activate it before performing stock-out.'
                  : availableStock <= 0
                    ? 'No available stock'
                    : 'Stock Out'
              }
              className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition ${
                isInactive || productLoading || availableStock <= 0
                  ? stockActionClass(true)
                  : 'bg-orange-600 text-white hover:bg-orange-700'
              }`}
            >
              {isInactive ? (
                <Power size={14} />
              ) : (
                <ArrowUpFromLine size={14} />
              )}
              Stock Out
            </button>
          </div>
        </div>
      </section>

      {apiError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700"
        >
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <p>{apiError}</p>
        </div>
      )}

      {/* History */}
      <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        <div className="flex flex-col gap-3 border-b border-erp-border p-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
              <History size={17} />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="break-words text-sm font-bold text-erp-text">
                  {productName}
                </h2>

                <span
                  title={isInactive ? 'Inactive product' : 'Active product'}
                  aria-label={
                    isInactive ? 'Inactive product' : 'Active product'
                  }
                  className={`size-2 shrink-0 rounded-full ${
                    isInactive ? 'bg-erp-disabled' : 'bg-erp-success'
                  }`}
                />
              </div>

              <p className="text-[11px] text-erp-text-secondary">
                SKU: {sku} · Category: {categoryName} · Unit: {unit}
              </p>
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-erp-text-muted"
              />

              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search reason, reference, user..."
                aria-label="Search stock history"
                className="h-9 w-full rounded-lg border border-erp-border bg-erp-surface pl-9 pr-3 text-xs text-erp-text outline-none focus:border-erp-primary sm:w-64"
              />
            </div>

            <select
              value={typeFilter}
              onChange={handleTypeChange}
              aria-label="Filter movement type"
              className="h-9 rounded-lg border border-erp-border bg-erp-surface px-3 text-xs text-erp-text outline-none focus:border-erp-primary"
            >
              {MOVEMENT_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            {(searchInput || search || typeFilter !== 'ALL') && (
              <button
                type="button"
                onClick={clearFilters}
                title="Clear filters"
                aria-label="Clear filters"
                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-erp-border px-3 text-xs font-semibold text-erp-text-secondary transition hover:bg-erp-hover sm:text-sm"
              >
                <FilterX size={14} />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="p-5">
            <Loading
              label="Loading movements..."
              description="Fetching filtered stock history."
            />
          </div>
        ) : movements.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <History
              size={30}
              className="mx-auto text-erp-text-muted"
            />

            <h3 className="mt-3 text-sm font-semibold text-erp-text">
              No stock movements found
            </h3>

            <p className="mt-1 text-xs text-erp-text-secondary">
              {search || typeFilter !== 'ALL'
                ? 'Try another search term or movement type.'
                : 'Stock In, Stock Out, Adjustment and Transfer transactions will appear here.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-left">
                <thead className="bg-erp-hover/40">
                  <tr className="border-b border-erp-border">
                    <th className="px-3 py-3 text-[11px] font-semibold text-erp-text-secondary">
                      Date &amp; Time
                    </th>
                    <th className="px-3 py-3 text-[11px] font-semibold text-erp-text-secondary">
                      Movement
                    </th>
                    <th className="px-3 py-3 text-right text-[11px] font-semibold text-erp-text-secondary">
                      Quantity
                    </th>
                    <th className="px-3 py-3 text-right text-[11px] font-semibold text-erp-text-secondary">
                      Previous Stock
                    </th>
                    <th className="px-3 py-3 text-right text-[11px] font-semibold text-erp-text-secondary">
                      New Stock
                    </th>
                    <th className="px-3 py-3 text-[11px] font-semibold text-erp-text-secondary">
                      Reason / Reference
                    </th>
                    <th className="px-3 py-3 text-[11px] font-semibold text-erp-text-secondary">
                      Created By
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {movements.map((movement) => {
                    const isIn = movement.type === 'STOCK_IN'
                    const isOut = movement.type === 'STOCK_OUT'

                    const movementColor = isIn
                      ? 'bg-emerald-50 text-emerald-700'
                      : isOut
                        ? 'bg-orange-50 text-orange-700'
                        : 'bg-slate-100 text-slate-700'

                    return (
                      <tr
                        key={movement._id}
                        className="border-b border-erp-border last:border-b-0 hover:bg-erp-hover/20"
                      >
                        <td className="whitespace-nowrap px-3 py-3">
                          <div className="flex items-center gap-2">
                            <CalendarDays
                              size={14}
                              className="shrink-0 text-erp-text-muted"
                            />

                            <div>
                              <p className="text-xs font-medium text-erp-text">
                                {movement.createdAt
                                  ? new Date(
                                      movement.createdAt
                                    ).toLocaleDateString('en-IN')
                                  : '—'}
                              </p>

                              <p className="mt-0.5 text-[10px] text-erp-text-secondary">
                                {movement.createdAt
                                  ? new Date(
                                      movement.createdAt
                                    ).toLocaleTimeString('en-IN', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : '—'}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 text-[10px] font-bold ${movementColor}`}
                          >
                            {isIn ? (
                              <ArrowDownToLine size={12} />
                            ) : isOut ? (
                              <ArrowUpFromLine size={12} />
                            ) : (
                              <Boxes size={12} />
                            )}

                            {String(
                              movement.type || 'UNKNOWN'
                            ).replaceAll('_', ' ')}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-3 py-3 text-right">
                          <span
                            className={`text-xs font-bold ${
                              isIn
                                ? 'text-emerald-700'
                                : isOut
                                  ? 'text-orange-700'
                                  : 'text-erp-text'
                            }`}
                          >
                            {isIn ? '+' : isOut ? '−' : ''}
                            {Number(
                              movement.quantity ?? 0
                            ).toLocaleString('en-IN')}
                          </span>

                          <span className="ml-1 text-[10px] text-erp-text-secondary">
                            {unit}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-3 py-3 text-right text-xs text-erp-text">
                          {Number(
                            movement.previousStock ?? 0
                          ).toLocaleString('en-IN')}
                        </td>

                        <td className="whitespace-nowrap px-3 py-3 text-right text-xs font-semibold text-erp-text">
                          {Number(
                            movement.newStock ?? 0
                          ).toLocaleString('en-IN')}
                        </td>

                        <td className="max-w-[240px] px-3 py-3">
                          <div className="flex items-start gap-2">
                            <FileText
                              size={13}
                              className="mt-0.5 shrink-0 text-erp-text-muted"
                            />

                            <div className="min-w-0">
                              <p className="break-words text-xs text-erp-text">
                                {movement.reason || '—'}
                              </p>

                              {movement.reference && (
                                <p className="mt-1 break-words text-[10px] text-erp-text-secondary">
                                  Ref: {movement.reference}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-3 py-3">
                          <div className="flex items-start gap-2">
                            <UserRound
                              size={14}
                              className="mt-0.5 shrink-0 text-erp-text-muted"
                            />

                            <div className="min-w-0">
                              <p className="text-xs font-medium text-erp-text">
                                {movement.createdBy?.name || 'Unknown'}
                              </p>

                              {movement.createdBy?.email && (
                                <p className="mt-0.5 break-all text-[10px] text-erp-text-secondary">
                                  {movement.createdBy.email}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col gap-3 border-t border-erp-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-xs text-erp-text-secondary sm:text-sm">
                  Showing{' '}
                  <span className="font-semibold text-erp-text">
                    {startItem}–{endItem}
                  </span>{' '}
                  of{' '}
                  <span className="font-semibold text-erp-text">
                    {totalMovements.toLocaleString('en-IN')}
                  </span>{' '}
                  movements
                </p>

                <div className="flex items-center gap-2">
                  <label
                    htmlFor="history-page-size"
                    className="whitespace-nowrap text-xs text-erp-text-secondary"
                  >
                    Rows:
                  </label>

                  <select
                    id="history-page-size"
                    value={pageSize}
                    onChange={handlePageSizeChange}
                    disabled={isFetching}
                    className="h-8 rounded-lg border border-erp-border bg-erp-surface px-2 text-xs text-erp-text outline-none focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
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
                  onClick={() => handlePageChange(1)}
                  aria-label="First page"
                  className="flex h-8 items-center justify-center rounded-lg border border-erp-border px-2 text-xs text-erp-text-secondary transition hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-40"
                >
                  1
                </button>

                <button
                  type="button"
                  disabled={safePage <= 1 || isFetching}
                  onClick={() => handlePageChange(safePage - 1)}
                  aria-label="Previous page"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-erp-border text-erp-text-secondary transition hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                </button>

                <span className="min-w-20 px-1 text-center text-xs text-erp-text-secondary sm:text-sm">
                  Page {safePage} of {totalPages}
                </span>

                <button
                  type="button"
                  disabled={safePage >= totalPages || isFetching}
                  onClick={() => handlePageChange(safePage + 1)}
                  aria-label="Next page"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-erp-border text-erp-text-secondary transition hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight size={16} />
                </button>

                <button
                  type="button"
                  disabled={safePage >= totalPages || isFetching}
                  onClick={() => handlePageChange(totalPages)}
                  aria-label="Last page"
                  className="flex h-8 items-center justify-center rounded-lg border border-erp-border px-2 text-xs text-erp-text-secondary transition hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {totalPages}
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  )
}