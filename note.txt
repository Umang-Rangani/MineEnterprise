import { useEffect, useState } from 'react'
import { Search, Package, Boxes, AlertTriangle, RefreshCw, ArrowDownToLine, ArrowUpFromLine, History, X, AlertCircle, CheckCircle2, Warehouse } from 'lucide-react'
import axiosInstance from '../../api/axiosInstance'

export default function CompanyInventory() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  })

  const [stockModal, setStockModal] = useState(null)
  const [quantity, setQuantity] = useState('1')
  const [reason, setReason] = useState('')
  const [reference, setReference] = useState('')
  const [saving, setSaving] = useState(false)

  const [historyModal, setHistoryModal] = useState(null)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const loadInventory = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await axiosInstance.get('/erp/inventory', {
        params: {
          page,
          limit: 10,
          search: search.trim() || undefined,
        },
      })

      const data = response.data
      const result = data.inventory || data.items || data.data?.inventory || data.data?.items || data.data || []

      setItems(Array.isArray(result) ? result : [])
      setPagination(
        data.pagination ||
          data.data?.pagination || {
            page,
            limit: 10,
            total: Array.isArray(result) ? result.length : 0,
            totalPages: 1,
          },
      )
    } catch (err) {
      setError(err.response?.data?.message )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInventory()
  }, [page, search])

  useEffect(() => {
    if (!success) return

    const timeout = setTimeout(() => setSuccess(''), 3000)
    return () => clearTimeout(timeout)
  }, [success])

  const getProduct = (item) => {
    if (item.productId && typeof item.productId === 'object') {
      return item.productId
    }

    return item.product || item
  }

  const getStock = (item) => Number(item.currentStock ?? item.stock ?? item.openingStock ?? 0)

  const getAvailableStock = (item) => Number(item.availableStock ?? getStock(item) - Number(item.reservedStock || 0))

  const getMinimumStock = (item) => Number(getProduct(item).minStockLevel ?? item.minStockLevel ?? 0)

  const getStockStatus = (item) => {
    const stock = getAvailableStock(item)
    const minimum = getMinimumStock(item)

    if (stock <= 0) {
      return {
        label: 'Out of Stock',
        className: 'bg-red-50 text-red-700',
      }
    }

    if (stock <= minimum) {
      return {
        label: 'Low Stock',
        className: 'bg-amber-50 text-amber-700',
      }
    }

    return {
      label: 'In Stock',
      className: 'bg-green-50 text-green-700',
    }
  }

  const openStockModal = (item, type) => {
    setStockModal({ item, type })
    setQuantity('1')
    setReason('')
    setReference('')
    setError('')
  }

  const handleStockSubmit = async (event) => {
    event.preventDefault()

    const qty = Number(quantity)

    if (!Number.isFinite(qty) || qty <= 0) {
      setError('Quantity શૂન્ય કરતાં વધારે હોવી જોઈએ.')
      return
    }

    const product = getProduct(stockModal.item)

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      await axiosInstance.post(`/erp/inventory/${stockModal.type === 'in' ? 'stock-in' : 'stock-out'}`, {
        productId: product._id,
        quantity: qty,
        reason: reason.trim(),
        reference: reference.trim(),
      })

      setStockModal(null)
      setSuccess(stockModal.type === 'in' ? 'Stock successfully added.' : 'Stock successfully removed.')

      await loadInventory()
    } catch (err) {
      setError(err.response?.data?.message )
    } finally {
      setSaving(false)
    }
  }

  const openHistory = async (item) => {
    const product = getProduct(item)

    setHistoryModal({ item, product })
    setHistory([])
    setHistoryLoading(true)
    setError('')

    try {
      const response = await axiosInstance.get(`/erp/inventory/${product._id}/history`, { params: { page: 1, limit: 10 } })

      const data = response.data
      const result = data.movements || data.history || data.data?.movements || data.data?.history || data.data || []

      setHistory(Array.isArray(result) ? result : [])
    } catch (err) {
      setError(err.response?.data?.message )
    } finally {
      setHistoryLoading(false)
    }
  }

  const totalProducts = pagination.total || items.length
  const lowStockCount = items.filter((item) => {
    const stock = getAvailableStock(item)
    return stock > 0 && stock <= getMinimumStock(item)
  }).length
  const outOfStockCount = items.filter((item) => getAvailableStock(item) <= 0).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-erp-muted">
            <Warehouse size={16} />
            <span>Inventory Management</span>
            <span>/</span>
            <span className="text-erp-text">Inventory</span>
          </div>

          <h1 className="mt-2 text-2xl font-bold text-erp-text">Inventory</h1>
          <p className="mt-1 text-sm text-erp-muted">Monitor available stock and record stock movements.</p>
        </div>

        <button
          type="button"
          onClick={loadInventory}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-erp-border bg-erp-surface px-4 py-2.5 text-sm font-medium text-erp-text transition hover:bg-erp-hover disabled:opacity-60"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <CheckCircle2 size={17} />
          {success}
        </div>
      )}

      {error && !stockModal && (
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
              <p className="mt-2 text-2xl font-bold text-erp-text">{totalProducts}</p>
            </div>
            <div className="rounded-xl bg-erp-primary-light p-3 text-erp-primary">
              <Package size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-erp-border bg-erp-surface p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-erp-muted">Low Stock</p>
              <p className="mt-2 text-2xl font-bold text-erp-text">{lowStockCount}</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-3 text-amber-700">
              <AlertTriangle size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-erp-border bg-erp-surface p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-erp-muted">Out of Stock</p>
              <p className="mt-2 text-2xl font-bold text-erp-text">{outOfStockCount}</p>
            </div>
            <div className="rounded-xl bg-red-50 p-3 text-red-700">
              <Boxes size={22} />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-erp-border bg-erp-surface p-4 shadow-sm">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-erp-muted" />
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            placeholder="Search product name or SKU..."
            className="w-full rounded-xl border border-erp-border bg-erp-bg py-2.5 pl-10 pr-4 text-sm text-erp-text outline-none transition placeholder:text-erp-muted focus:border-erp-primary"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-erp-border bg-erp-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-erp-border px-5 py-4">
          <div>
            <h2 className="font-semibold text-erp-text">Stock Overview</h2>
            <p className="mt-1 text-xs text-erp-muted">{pagination.total ?? items.length} product(s) found</p>
          </div>
          <span className="rounded-lg bg-erp-bg px-3 py-1.5 text-xs font-medium text-erp-muted">
            Page {pagination.page || page} of {pagination.totalPages || 1}
          </span>
        </div>

        {loading ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-erp-muted">
            <RefreshCw size={26} className="animate-spin text-erp-primary" />
            <p className="text-sm">Loading inventory...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
            <div className="rounded-2xl bg-erp-bg p-4 text-erp-muted">
              <Package size={30} />
            </div>
            <h3 className="mt-4 font-semibold text-erp-text">No inventory found</h3>
            <p className="mt-1 max-w-sm text-sm text-erp-muted">Create a product first or change your search.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left">
                <thead className="bg-erp-bg text-xs uppercase tracking-wide text-erp-muted">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Product</th>
                    <th className="px-4 py-4 font-semibold">SKU</th>
                    <th className="px-4 py-4 font-semibold">Current Stock</th>
                    <th className="px-4 py-4 font-semibold">Reserved</th>
                    <th className="px-4 py-4 font-semibold">Available</th>
                    <th className="px-4 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-erp-border">
                  {items.map((item) => {
                    const product = getProduct(item)
                    const stock = getStock(item)
                    const available = getAvailableStock(item)
                    const status = getStockStatus(item)

                    return (
                      <tr key={product._id || item._id} className="transition hover:bg-erp-hover">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">
                              <Package size={20} />
                            </div>
                            <div className="max-w-56">
                              <p className="truncate text-sm font-semibold text-erp-text">{product.name || 'Unnamed Product'}</p>
                              <p className="mt-1 truncate text-xs text-erp-muted">{product.unit || 'Piece'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm font-medium text-erp-text">{product.sku || '—'}</td>
                        <td className="px-4 py-4 text-sm text-erp-text">
                          {stock} {product.unit || 'Piece'}
                        </td>
                        <td className="px-4 py-4 text-sm text-erp-muted">{Number(item.reservedStock || 0)}</td>
                        <td className="px-4 py-4 text-sm font-semibold text-erp-text">
                          {available} {product.unit || 'Piece'}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => openStockModal(item, 'in')} title="Stock In" className="rounded-lg border border-erp-border p-2 text-green-700 transition hover:border-green-200 hover:bg-green-50">
                              <ArrowDownToLine size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => openStockModal(item, 'out')}
                              title="Stock Out"
                              disabled={available <= 0}
                              className="rounded-lg border border-erp-border p-2 text-red-600 transition hover:border-red-200 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <ArrowUpFromLine size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => openHistory(item)}
                              title="Stock History"
                              className="rounded-lg border border-erp-border p-2 text-erp-muted transition hover:border-erp-primary hover:bg-erp-primary-light hover:text-erp-primary"
                            >
                              <History size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-erp-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-erp-muted">
                Showing {items.length} of {pagination.total ?? items.length} products
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="rounded-lg border border-erp-border px-3 py-2 text-sm text-erp-text hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= (pagination.totalPages || 1)}
                  onClick={() => setPage((current) => Math.min(pagination.totalPages || 1, current + 1))}
                  className="rounded-lg border border-erp-border px-3 py-2 text-sm text-erp-text hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {stockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-auto w-full max-w-lg overflow-hidden rounded-2xl border border-erp-border bg-erp-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-erp-border px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-erp-text">{stockModal.type === 'in' ? 'Stock In' : 'Stock Out'}</h2>
                <p className="mt-1 text-sm text-erp-muted">{getProduct(stockModal.item).name}</p>
              </div>
              <button type="button" onClick={() => setStockModal(null)} className="rounded-lg p-2 text-erp-muted hover:bg-erp-hover">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleStockSubmit}>
              <div className="space-y-4 p-5">
                {error && (
                  <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle size={17} className="mt-0.5 shrink-0" />
                    {error}
                  </div>
                )}

                <div className="rounded-xl border border-erp-border bg-erp-bg p-3 text-sm text-erp-muted">
                  Current stock: <strong className="text-erp-text">{getStock(stockModal.item)}</strong>
                  {' · '}
                  Available: <strong className="text-erp-text">{getAvailableStock(stockModal.item)}</strong>
                </div>

                <label className="block space-y-1.5 text-sm font-medium text-erp-text">
                  Quantity *
                  <input
                    required
                    type="number"
                    min="0.001"
                    step="any"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    className="w-full rounded-xl border border-erp-border bg-erp-surface px-3 py-2.5 outline-none focus:border-erp-primary"
                  />
                </label>

                <label className="block space-y-1.5 text-sm font-medium text-erp-text">
                  Reason *
                  <input
                    required
                    maxLength={250}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder={stockModal.type === 'in' ? 'Purchase / opening stock' : 'Damaged / internal use'}
                    className="w-full rounded-xl border border-erp-border bg-erp-surface px-3 py-2.5 outline-none focus:border-erp-primary"
                  />
                </label>

                <label className="block space-y-1.5 text-sm font-medium text-erp-text">
                  Reference (optional)
                  <input
                    maxLength={100}
                    value={reference}
                    onChange={(event) => setReference(event.target.value)}
                    placeholder="e.g. GRN-001"
                    className="w-full rounded-xl border border-erp-border bg-erp-surface px-3 py-2.5 outline-none focus:border-erp-primary"
                  />
                </label>
              </div>

              <div className="flex justify-end gap-2 border-t border-erp-border px-5 py-4">
                <button type="button" onClick={() => setStockModal(null)} disabled={saving} className="rounded-xl border border-erp-border px-4 py-2.5 text-sm font-semibold text-erp-text hover:bg-erp-hover">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="rounded-xl bg-erp-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-erp-primary-hover disabled:opacity-60">
                  {saving ? 'Saving...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {historyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-erp-border bg-erp-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-erp-border px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-erp-text">Stock History</h2>
                <p className="mt-1 text-sm text-erp-muted">{historyModal.product.name}</p>
              </div>
              <button type="button" onClick={() => setHistoryModal(null)} className="rounded-lg p-2 text-erp-muted hover:bg-erp-hover">
                <X size={20} />
              </button>
            </div>

            <div className="max-h-[65vh] overflow-auto p-5">
              {historyLoading ? (
                <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-erp-muted">
                  <RefreshCw size={20} className="animate-spin" />
                  Loading history...
                </div>
              ) : history.length === 0 ? (
                <p className="py-10 text-center text-sm text-erp-muted">No stock movements found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[650px] text-left">
                    <thead className="bg-erp-bg text-xs uppercase text-erp-muted">
                      <tr>
                        <th className="px-3 py-3">Date</th>
                        <th className="px-3 py-3">Type</th>
                        <th className="px-3 py-3">Quantity</th>
                        <th className="px-3 py-3">Previous</th>
                        <th className="px-3 py-3">New Stock</th>
                        <th className="px-3 py-3">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-erp-border">
                      {history.map((movement) => (
                        <tr key={movement._id}>
                          <td className="whitespace-nowrap px-3 py-3 text-sm text-erp-muted">{movement.createdAt ? new Date(movement.createdAt).toLocaleString('en-IN') : '—'}</td>
                          <td className="px-3 py-3 text-sm font-medium text-erp-text">{movement.type || '—'}</td>
                          <td className="px-3 py-3 text-sm text-erp-text">{movement.quantity ?? 0}</td>
                          <td className="px-3 py-3 text-sm text-erp-text">{movement.previousStock ?? 0}</td>
                          <td className="px-3 py-3 text-sm text-erp-text">{movement.newStock ?? 0}</td>
                          <td className="px-3 py-3 text-sm text-erp-muted">{movement.reason || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-erp-border px-5 py-4">
              <button type="button" onClick={() => setHistoryModal(null)} className="rounded-xl border border-erp-border px-5 py-2.5 text-sm font-semibold text-erp-text hover:bg-erp-hover">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
