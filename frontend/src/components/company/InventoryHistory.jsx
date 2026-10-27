import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Boxes, Package, History, Search, RefreshCw, LoaderCircle, ArrowDownToLine, ArrowUpFromLine, CalendarDays, FileText, UserRound, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Loading from '../Loading/Loading'
import { hasPermission, useAuth } from '../../context/AuthContext'

const PAGE_LIMIT = 20

export default function InventoryHistory() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const { permissions } = useAuth()

  const canViewHistory = hasPermission(permissions, 'inventory:view-history')

  const canViewStock = hasPermission(permissions, 'inventory:view-stock')

  const hasPermissionToView = canViewHistory && canViewStock

  const [product, setProduct] = useState(null)
  const [movements, setMovements] = useState([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_LIMIT,
    total: 0,
    totalPages: 0,
  })

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [apiError, setApiError] = useState('')

  const [page, setPage] = useState(1)

  const items = [
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

  useEffect(() => {
    let active = true

    async function loadProduct() {
      if (!hasPermissionToView || !id) {
        setLoading(false)
        return
      }

      try {
        const { data } = await axiosInstance.get(`/erp/inventory/${id}`)

        if (data.success === false) {
          throw new Error(data.message || 'Unable to load product details.')
        }

        if (active) {
          setProduct(data.inventory || data.data?.inventory || data.data)
        }
      } catch (error) {
        if (active) {
          setApiError(error.response?.data?.message || error.message || 'Unable to load product details.')
        }
      }
    }

    loadProduct()

    return () => {
      active = false
    }
  }, [id, hasPermissionToView])

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
        const { data } = await axiosInstance.get(`/erp/inventory/${id}/history`, {
          params: {
            page,
            limit: PAGE_LIMIT,
          },
        })

        if (data.success === false) {
          throw new Error(data.message || 'Unable to load stock history.')
        }

        if (active) {
          setMovements(data.movements || [])
          setPagination(
            data.pagination || {
              page,
              limit: PAGE_LIMIT,
              total: 0,
              totalPages: 0,
            },
          )
        }
      } catch (error) {
        if (active) {
          setApiError(error.response?.data?.message || error.message || 'Unable to load stock history.')
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
  }, [id, page, hasPermissionToView, location.key])

  function goBack() {
    navigate('/company/inventory')
  }

  function refreshHistory() {
    setRefreshing(true)
    setApiError('')

    axiosInstance
      .get(`/erp/inventory/${id}`)
      .then(({ data }) => {
        if (data.success === false) {
          throw new Error(data.message || 'Unable to refresh product.')
        }

        setProduct(data.inventory || data.data?.inventory || data.data)
      })
      .catch((error) => {
        setApiError(error.response?.data?.message || error.message || 'Unable to refresh product.')
      })
      .finally(() => {
        setRefreshing(false)
      })

    setPage((current) => current)
  }

  const productName = product?.name || product?.productName || 'Product'
  const sku = product?.sku || '—'
  const unit = product?.unit || 'Piece'

  const categoryName = product?.categoryId?.name || product?.categoryName || product?.category?.name || 'Uncategorized'

  const currentStock = Number(product?.currentStock ?? product?.openingStock ?? 0)

  const reservedStock = Number(product?.reservedStock ?? 0)

  const availableStock = Number(product?.availableStock ?? currentStock - reservedStock)

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

  const filteredMovements = movements.filter((movement) => {
    const matchesType = typeFilter === 'ALL' || movement.type === typeFilter

    const searchText = search.trim().toLowerCase()

    const matchesSearch =
      !searchText ||
      [movement.reason, movement.reference, movement.type, movement.createdBy?.name, movement.createdBy?.email].some((value) =>
        String(value || '')
          .toLowerCase()
          .includes(searchText),
      )

    return matchesType && matchesSearch
  })

  const stockInCount = movements.filter((movement) => movement.type === 'STOCK_IN').length

  const stockOutCount = movements.filter((movement) => movement.type === 'STOCK_OUT').length

  if (!hasPermissionToView) {
    return (
      <div className="min-w-0 rounded-xl border border-erp-border bg-erp-surface p-6 text-center">
        <AlertCircle size={28} className="mx-auto text-rose-500" />

        <h2 className="mt-3 text-base font-semibold text-erp-text">Access Denied</h2>

        <p className="mt-2 text-sm text-erp-text-secondary">You do not have permission to view stock history.</p>

        <button type="button" onClick={goBack} className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-erp-primary px-4 text-xs font-semibold text-white hover:bg-erp-primary-hover">
          <ArrowLeft size={14} />
          Back to Inventory
        </button>
      </div>
    )
  }

  if (loading && !product) {
    return (
      <div className="min-w-0 space-y-3">
        <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="h-1 bg-erp-primary" />

          <div className="flex h-[calc(100%-4px)] items-center px-4 sm:px-5">
            <BreadCrumb items={items} />
          </div>
        </section>

        <Loading label="Loading stock history..." description="Fetching product and stock movements." />
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-4 text-sm">
      {/* Header */}
      <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        <div className="h-1 bg-erp-primary" />

        <div className="flex h-[calc(100%-4px)] min-w-0 items-center justify-between gap-3 px-4 sm:px-5">
          <div className="min-w-0 flex-1 overflow-hidden">
            <BreadCrumb items={items} />
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {stockStats.map((stat) => (
              <div key={stat.label} className={`flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-erp-border px-3 ${stat.background}`}>
                <span className="text-[10px] font-medium text-erp-text-secondary">{stat.label}</span>

                <span className={`text-xs font-bold ${stat.color}`}>
                  {stat.value.toLocaleString('en-IN')}
                  <span className="ml-1 text-[9px] font-medium text-erp-text-secondary">{unit}</span>
                </span>
              </div>
            ))}

            <button
              type="button"
              onClick={refreshHistory}
              disabled={refreshing}
              title="Refresh stock history"
              aria-label="Refresh stock history"
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-erp-border bg-erp-surface px-3 text-xs font-semibold text-slate-600 transition hover:bg-erp-hover disabled:opacity-60"
            >
              {refreshing ? <LoaderCircle size={14} className="animate-spin" /> : <RefreshCw size={14} />}

              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => navigate(`/company/inventory/${id}/stock-in`)}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white transition hover:bg-emerald-700"
            >
              <ArrowDownToLine size={14} />
              <span>Stock In</span>
            </button>

            <button
              type="button"
              onClick={() => navigate(`/company/inventory/${id}/stock-out`)}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-orange-600 px-3 text-xs font-semibold text-white transition hover:bg-orange-700"
            >
              <ArrowUpFromLine size={14} />
              <span>Stock Out</span>
            </button>
          </div>
        </div>
      </section>

      {/* History Table */}
      <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        <div className="flex flex-col gap-3 border-b border-erp-border p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
              <History size={17} />
            </div>

            <div>
              <h2 className="text-sm font-bold text-erp-text">{productName}</h2>
              <p className="text-[11px] text-erp-text-secondary">
                SKU: {sku} · Category: {categoryName || 'Uncategorized'} · Unit: {unit}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-erp-text-muted" />

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search reason, reference..."
                className="h-9 w-full rounded-lg border border-erp-border bg-erp-surface pl-9 pr-3 text-xs text-erp-text outline-none focus:border-erp-primary sm:w-56"
              />
            </div>

            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="h-9 rounded-lg border border-erp-border bg-erp-surface px-3 text-xs text-erp-text outline-none focus:border-erp-primary">
              <option value="ALL">All Movements</option>
              <option value="STOCK_IN">Stock In</option>
              <option value="STOCK_OUT">Stock Out</option>
              <option value="ADJUSTMENT">Adjustment</option>
              <option value="TRANSFER">Transfer</option>
            </select>
          </div>
        </div>

        {apiError && (
          <div role="alert" className="m-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <p>{apiError}</p>
          </div>
        )}

        {loading ? (
          <div className="p-5">
            <Loading label="Loading movements..." description="Please wait." />
          </div>
        ) : filteredMovements.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <History size={30} className="mx-auto text-erp-text-muted" />

            <h3 className="mt-3 text-sm font-semibold text-erp-text">No stock movements found</h3>

            <p className="mt-1 text-xs text-erp-text-secondary">{search || typeFilter !== 'ALL' ? 'Try changing the search or movement filter.' : 'Stock In and Stock Out transactions will appear here.'}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-left">
                <thead className="bg-erp-hover/40">
                  <tr className="border-b border-erp-border">
                    <th className="px-3 py-3 text-[11px] font-semibold text-erp-text-secondary">Date & Time</th>

                    <th className="px-3 py-3 text-[11px] font-semibold text-erp-text-secondary">Movement</th>

                    <th className="px-3 py-3 text-right text-[11px] font-semibold text-erp-text-secondary">Quantity</th>

                    <th className="px-3 py-3 text-right text-[11px] font-semibold text-erp-text-secondary">Previous Stock</th>

                    <th className="px-3 py-3 text-right text-[11px] font-semibold text-erp-text-secondary">New Stock</th>

                    <th className="px-3 py-3 text-[11px] font-semibold text-erp-text-secondary">Reason / Reference</th>

                    <th className="px-3 py-3 text-[11px] font-semibold text-erp-text-secondary">Created By</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredMovements.map((movement) => {
                    const isIn = movement.type === 'STOCK_IN'

                    const movementColor = isIn ? 'bg-emerald-50 text-emerald-700' : movement.type === 'STOCK_OUT' ? 'bg-orange-50 text-orange-700' : 'bg-slate-100 text-slate-700'

                    return (
                      <tr key={movement._id} className="border-b border-erp-border last:border-b-0 hover:bg-erp-hover/20">
                        <td className="whitespace-nowrap px-3 py-3">
                          <div className="flex items-center gap-2">
                            <CalendarDays size={14} className="shrink-0 text-erp-text-muted" />

                            <div>
                              <p className="text-xs font-medium text-erp-text">{new Date(movement.createdAt).toLocaleDateString('en-IN')}</p>

                              <p className="mt-0.5 text-[10px] text-erp-text-secondary">
                                {new Date(movement.createdAt).toLocaleTimeString('en-IN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-3 py-3">
                          <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 text-[10px] font-bold ${movementColor}`}>
                            {isIn ? <ArrowDownToLine size={12} /> : movement.type === 'STOCK_OUT' ? <ArrowUpFromLine size={12} /> : <Boxes size={12} />}

                            {movement.type.replaceAll('_', ' ')}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-3 py-3 text-right">
                          <span className={`text-xs font-bold ${isIn ? 'text-emerald-700' : movement.type === 'STOCK_OUT' ? 'text-orange-700' : 'text-erp-text'}`}>
                            {isIn ? '+' : movement.type === 'STOCK_OUT' ? '−' : ''}
                            {Number(movement.quantity).toLocaleString('en-IN')}
                          </span>

                          <span className="ml-1 text-[10px] text-erp-text-secondary">{unit}</span>
                        </td>

                        <td className="whitespace-nowrap px-3 py-3 text-right text-xs text-erp-text">{Number(movement.previousStock).toLocaleString('en-IN')}</td>

                        <td className="whitespace-nowrap px-3 py-3 text-right text-xs font-semibold text-erp-text">{Number(movement.newStock).toLocaleString('en-IN')}</td>

                        <td className="max-w-[240px] px-3 py-3">
                          <div className="flex items-start gap-2">
                            <FileText size={13} className="mt-0.5 shrink-0 text-erp-text-muted" />

                            <div className="min-w-0">
                              <p className="break-words text-xs text-erp-text">{movement.reason || '—'}</p>

                              {movement.reference && <p className="mt-1 break-words text-[10px] text-erp-text-secondary">Ref: {movement.reference}</p>}
                            </div>
                          </div>
                        </td>

                        <td className="px-3 py-3">
                          <div className="flex items-start gap-2">
                            <UserRound size={14} className="mt-0.5 shrink-0 text-erp-text-muted" />

                            <div className="min-w-0">
                              <p className="text-xs font-medium text-erp-text">{movement.createdBy?.name || 'Unknown'}</p>

                              {movement.createdBy?.email && <p className="mt-0.5 break-all text-[10px] text-erp-text-secondary">{movement.createdBy.email}</p>}
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
            <div className="flex flex-col gap-3 border-t border-erp-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] text-erp-text-secondary">
                Page {pagination.page} of {Math.max(1, pagination.totalPages)} · {pagination.total.toLocaleString('en-IN')} records
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1 || loading}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-erp-border px-3 text-xs font-semibold text-erp-text-secondary hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={14} />
                  Previous
                </button>

                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(Math.max(1, pagination.totalPages), current + 1))}
                  disabled={page >= pagination.totalPages || loading}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-erp-border px-3 text-xs font-semibold text-erp-text-secondary hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
