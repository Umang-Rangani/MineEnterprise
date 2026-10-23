import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Eye, Pencil, Trash2, ShoppingCart, Clock, CheckCircle2, IndianRupee, ChevronLeft, ChevronRight, Filter, X } from 'lucide-react'

const initialPurchases = [
  {
    id: 'PUR-001',
    supplier: 'Shreeji Suppliers',
    supplierId: 'SUP-001',
    purchaseDate: '2026-10-18',
    dueDate: '2026-11-02',
    items: 5,
    amount: 45000,
    paymentStatus: 'Paid',
    status: 'Received',
  },
  {
    id: 'PUR-002',
    supplier: 'Patel Trading Co.',
    supplierId: 'SUP-002',
    purchaseDate: '2026-10-16',
    dueDate: '2026-10-31',
    items: 3,
    amount: 28500,
    paymentStatus: 'Partial',
    status: 'Received',
  },
  {
    id: 'PUR-003',
    supplier: 'Arihant Industries',
    supplierId: 'SUP-003',
    purchaseDate: '2026-10-15',
    dueDate: '2026-10-30',
    items: 8,
    amount: 72000,
    paymentStatus: 'Unpaid',
    status: 'Pending',
  },
  {
    id: 'PUR-004',
    supplier: 'Shreeji Suppliers',
    supplierId: 'SUP-001',
    purchaseDate: '2026-10-12',
    dueDate: '2026-10-27',
    items: 4,
    amount: 36000,
    paymentStatus: 'Paid',
    status: 'Received',
  },
  {
    id: 'PUR-005',
    supplier: 'Mehta Enterprises',
    supplierId: 'SUP-004',
    purchaseDate: '2026-10-10',
    dueDate: '2026-10-25',
    items: 6,
    amount: 54000,
    paymentStatus: 'Unpaid',
    status: 'Cancelled',
  },
  {
    id: 'PUR-006',
    supplier: 'Patel Trading Co.',
    supplierId: 'SUP-002',
    purchaseDate: '2026-10-08',
    dueDate: '2026-10-23',
    items: 2,
    amount: 18000,
    paymentStatus: 'Partial',
    status: 'Pending',
  },
  {
    id: 'PUR-007',
    supplier: 'Arihant Industries',
    supplierId: 'SUP-003',
    purchaseDate: '2026-10-05',
    dueDate: '2026-10-20',
    items: 7,
    amount: 62500,
    paymentStatus: 'Paid',
    status: 'Received',
  },
  {
    id: 'PUR-008',
    supplier: 'Mehta Enterprises',
    supplierId: 'SUP-004',
    purchaseDate: '2026-10-02',
    dueDate: '2026-10-17',
    items: 3,
    amount: 22000,
    paymentStatus: 'Unpaid',
    status: 'Pending',
  },
]

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)

const formatDate = (date) =>
  new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

export default function CompanyPurchases() {
  const navigate = useNavigate()

  const [purchases, setPurchases] = useState(initialPurchases)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [paymentFilter, setPaymentFilter] = useState('All')
  const [currentPage, setCurrentPage] = useState(1)
  const [deleteId, setDeleteId] = useState(null)

  const pageSize = 5

  const stats = useMemo(() => {
    return {
      total: purchases.length,
      received: purchases.filter((purchase) => purchase.status === 'Received').length,
      pending: purchases.filter((purchase) => purchase.status === 'Pending').length,
      amount: purchases.filter((purchase) => purchase.status !== 'Cancelled').reduce((sum, purchase) => sum + purchase.amount, 0),
    }
  }, [purchases])

  const filteredPurchases = useMemo(() => {
    const query = search.trim().toLowerCase()

    return purchases.filter((purchase) => {
      const matchesSearch = purchase.id.toLowerCase().includes(query) || purchase.supplier.toLowerCase().includes(query) || purchase.supplierId.toLowerCase().includes(query)

      const matchesStatus = statusFilter === 'All' || purchase.status === statusFilter

      const matchesPayment = paymentFilter === 'All' || purchase.paymentStatus === paymentFilter

      return matchesSearch && matchesStatus && matchesPayment
    })
  }, [purchases, search, statusFilter, paymentFilter])

  const totalPages = Math.max(1, Math.ceil(filteredPurchases.length / pageSize))

  const safePage = Math.min(currentPage, totalPages)

  const paginatedPurchases = filteredPurchases.slice((safePage - 1) * pageSize, safePage * pageSize)

  const resetPage = () => setCurrentPage(1)

  const handleDelete = () => {
    setPurchases((previous) => previous.filter((purchase) => purchase.id !== deleteId))
    setDeleteId(null)
  }

  const statusClasses = {
    Received: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    Pending: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    Cancelled: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  }

  const paymentClasses = {
    Paid: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    Partial: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    Unpaid: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Purchase Management</h1>
          <p className="mt-1 text-sm text-slate-500">Manage supplier purchases, stock receipts and payments.</p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/company/purchases/new')}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-erp-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-erp-primary-hover"
        >
          <Plus size={18} />
          New Purchase
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Total Purchases</p>
            <div className="rounded-lg bg-violet-100 p-2.5 text-violet-700">
              <ShoppingCart size={20} />
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold text-slate-900">{stats.total}</p>
          <p className="mt-1 text-xs text-slate-500">All purchase records</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Received Purchases</p>
            <div className="rounded-lg bg-emerald-100 p-2.5 text-emerald-700">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold text-slate-900">{stats.received}</p>
          <p className="mt-1 text-xs text-slate-500">Successfully received</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Pending Purchases</p>
            <div className="rounded-lg bg-amber-100 p-2.5 text-amber-700">
              <Clock size={20} />
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold text-slate-900">{stats.pending}</p>
          <p className="mt-1 text-xs text-slate-500">Awaiting receipt</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Purchase Value</p>
            <div className="rounded-lg bg-blue-100 p-2.5 text-blue-700">
              <IndianRupee size={20} />
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold text-slate-900">{formatCurrency(stats.amount)}</p>
          <p className="mt-1 text-xs text-slate-500">Excluding cancelled purchases</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Purchase Records</h2>
              <p className="mt-1 text-sm text-slate-500">Search and manage your purchase orders.</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative sm:min-w-64">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value)
                    resetPage()
                  }}
                  placeholder="Search purchase or supplier..."
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/20"
                />
              </div>

              <div className="relative">
                <Filter size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value)
                    resetPage()
                  }}
                  className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-8 text-sm outline-none focus:border-erp-primary sm:min-w-36"
                >
                  <option value="All">All Statuses</option>
                  <option value="Received">Received</option>
                  <option value="Pending">Pending</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <select
                value={paymentFilter}
                onChange={(event) => {
                  setPaymentFilter(event.target.value)
                  resetPage()
                }}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-erp-primary sm:min-w-36"
              >
                <option value="All">All Payments</option>
                <option value="Paid">Paid</option>
                <option value="Partial">Partial</option>
                <option value="Unpaid">Unpaid</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Purchase</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Supplier</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Purchase Date</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Items</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Amount</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Payment</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {paginatedPurchases.map((purchase) => (
                <tr key={purchase.id} className="transition hover:bg-slate-50/70">
                  <td className="px-5 py-4">
                    <p className="text-sm font-semibold text-erp-primary">{purchase.id}</p>
                    <p className="mt-1 text-xs text-slate-400">Due: {formatDate(purchase.dueDate)}</p>
                  </td>

                  <td className="px-5 py-4">
                    <p className="text-sm font-medium text-slate-800">{purchase.supplier}</p>
                    <p className="mt-1 text-xs text-slate-500">{purchase.supplierId}</p>
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">{formatDate(purchase.purchaseDate)}</td>

                  <td className="px-5 py-4 text-sm text-slate-600">{purchase.items}</td>

                  <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-slate-900">{formatCurrency(purchase.amount)}</td>

                  <td className="px-5 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${paymentClasses[purchase.paymentStatus]}`}>{purchase.paymentStatus}</span>
                  </td>

                  <td className="px-5 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusClasses[purchase.status]}`}>{purchase.status}</span>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button type="button" title="View purchase" onClick={() => navigate(`/company/purchases/${purchase.id}`)} className="rounded-lg p-2 text-slate-500 transition hover:bg-violet-50 hover:text-erp-primary">
                        <Eye size={17} />
                      </button>

                      <button
                        type="button"
                        title="Edit purchase"
                        disabled={purchase.status === 'Cancelled'}
                        onClick={() => navigate(`/company/purchases/${purchase.id}/edit`)}
                        className="rounded-lg p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <Pencil size={17} />
                      </button>

                      <button type="button" title="Delete purchase" onClick={() => setDeleteId(purchase.id)} className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600">
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {paginatedPurchases.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center">
                      <div className="rounded-full bg-slate-100 p-4 text-slate-400">
                        <ShoppingCart size={26} />
                      </div>
                      <h3 className="mt-4 text-sm font-semibold text-slate-800">No purchases found</h3>
                      <p className="mt-1 text-sm text-slate-500">Try changing your search or filters.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setSearch('')
                          setStatusFilter('All')
                          setPaymentFilter('All')
                          resetPage()
                        }}
                        className="mt-3 text-sm font-semibold text-erp-primary hover:underline"
                      >
                        Clear filters
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-sm text-slate-500">
            Showing <span className="font-medium text-slate-700">{filteredPurchases.length === 0 ? 0 : (safePage - 1) * pageSize + 1}</span> to{' '}
            <span className="font-medium text-slate-700">{Math.min(safePage * pageSize, filteredPurchases.length)}</span> of <span className="font-medium text-slate-700">{filteredPurchases.length}</span> purchases
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage === 1}
              onClick={() => setCurrentPage(safePage - 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={16} />
              Previous
            </button>

            <span className="rounded-lg bg-erp-primary-light px-3.5 py-2 text-sm font-semibold text-erp-primary">
              {safePage} / {totalPages}
            </span>

            <button
              type="button"
              disabled={safePage === totalPages}
              onClick={() => setCurrentPage(safePage + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="delete-purchase-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-rose-100 p-3 text-rose-600">
                  <Trash2 size={22} />
                </div>
                <div>
                  <h3 id="delete-purchase-title" className="text-lg font-semibold text-slate-900">
                    Delete Purchase?
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">Purchase ID: {deleteId}</p>
                </div>
              </div>

              <button type="button" aria-label="Close dialog" onClick={() => setDeleteId(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X size={19} />
              </button>
            </div>

            <p className="mt-5 text-sm leading-6 text-slate-600">Are you sure you want to delete this purchase record? This action only affects the current sample data on this page.</p>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setDeleteId(null)} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                Cancel
              </button>

              <button type="button" onClick={handleDelete} className="rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700">
                Delete Purchase
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
