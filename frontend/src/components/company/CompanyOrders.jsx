import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Eye, Pencil, Trash2, ShoppingBag, Clock, CheckCircle2, IndianRupee, ChevronLeft, ChevronRight, Filter, X, Truck } from 'lucide-react'

const initialOrders = [
  {
    id: 'ORD-001',
    customerId: 'CUS-001',
    customer: 'Rahul Shah',
    company: 'Shah Enterprises',
    orderDate: '2026-10-20',
    deliveryDate: '2026-10-25',
    items: 3,
    amount: 18500,
    paymentStatus: 'Paid',
    status: 'Delivered',
  },
  {
    id: 'ORD-002',
    customerId: 'CUS-002',
    customer: 'Priya Patel',
    company: 'Patel Retail Store',
    orderDate: '2026-10-19',
    deliveryDate: '2026-10-26',
    items: 2,
    amount: 12500,
    paymentStatus: 'Partial',
    status: 'Processing',
  },
  {
    id: 'ORD-003',
    customerId: 'CUS-003',
    customer: 'Aarav Mehta',
    company: 'Individual Customer',
    orderDate: '2026-10-18',
    deliveryDate: '2026-10-24',
    items: 4,
    amount: 24500,
    paymentStatus: 'Unpaid',
    status: 'Pending',
  },
  {
    id: 'ORD-004',
    customerId: 'CUS-004',
    customer: 'Neha Desai',
    company: 'Desai Distributors',
    orderDate: '2026-10-17',
    deliveryDate: '2026-10-23',
    items: 5,
    amount: 32000,
    paymentStatus: 'Paid',
    status: 'Shipped',
  },
  {
    id: 'ORD-005',
    customerId: 'CUS-005',
    customer: 'Karan Joshi',
    company: 'Joshi Traders',
    orderDate: '2026-10-16',
    deliveryDate: '2026-10-22',
    items: 2,
    amount: 9800,
    paymentStatus: 'Unpaid',
    status: 'Cancelled',
  },
  {
    id: 'ORD-006',
    customerId: 'CUS-001',
    customer: 'Rahul Shah',
    company: 'Shah Enterprises',
    orderDate: '2026-10-15',
    deliveryDate: '2026-10-21',
    items: 6,
    amount: 42500,
    paymentStatus: 'Partial',
    status: 'Processing',
  },
  {
    id: 'ORD-007',
    customerId: 'CUS-002',
    customer: 'Priya Patel',
    company: 'Patel Retail Store',
    orderDate: '2026-10-14',
    deliveryDate: '2026-10-20',
    items: 3,
    amount: 16700,
    paymentStatus: 'Paid',
    status: 'Delivered',
  },
  {
    id: 'ORD-008',
    customerId: 'CUS-006',
    customer: 'Ananya Shah',
    company: 'Individual Customer',
    orderDate: '2026-10-13',
    deliveryDate: '2026-10-19',
    items: 1,
    amount: 5500,
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

export default function CompanyOrders() {
  const navigate = useNavigate()

  const [orders, setOrders] = useState(initialOrders)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [paymentFilter, setPaymentFilter] = useState('All')
  const [currentPage, setCurrentPage] = useState(1)
  const [deleteId, setDeleteId] = useState(null)

  const pageSize = 5

  const stats = useMemo(() => {
    const activeOrders = orders.filter((order) => order.status !== 'Cancelled')

    return {
      total: orders.length,
      pending: orders.filter((order) => order.status === 'Pending' || order.status === 'Processing').length,
      delivered: orders.filter((order) => order.status === 'Delivered').length,
      revenue: activeOrders.reduce((sum, order) => sum + order.amount, 0),
    }
  }, [orders])

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase()

    return orders.filter((order) => {
      const matchesSearch = order.id.toLowerCase().includes(query) || order.customer.toLowerCase().includes(query) || order.company.toLowerCase().includes(query) || order.customerId.toLowerCase().includes(query)

      const matchesStatus = statusFilter === 'All' || order.status === statusFilter

      const matchesPayment = paymentFilter === 'All' || order.paymentStatus === paymentFilter

      return matchesSearch && matchesStatus && matchesPayment
    })
  }, [orders, search, statusFilter, paymentFilter])

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize))

  const safePage = Math.min(currentPage, totalPages)

  const paginatedOrders = filteredOrders.slice((safePage - 1) * pageSize, safePage * pageSize)

  const statusClasses = {
    Pending: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    Processing: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    Shipped: 'bg-violet-50 text-violet-700 ring-violet-600/20',
    Delivered: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    Cancelled: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  }

  const paymentClasses = {
    Paid: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    Partial: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    Unpaid: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  }

  const handleDelete = () => {
    setOrders((previous) => previous.filter((order) => order.id !== deleteId))
    setDeleteId(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sales & Orders</h1>
          <p className="mt-1 text-sm text-slate-500">Manage customer orders, deliveries and sales.</p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/company/orders/new')}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-erp-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-erp-primary-hover"
        >
          <Plus size={18} />
          Create Order
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Total Orders</p>
            <div className="rounded-lg bg-violet-100 p-2.5 text-violet-700">
              <ShoppingBag size={20} />
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold text-slate-900">{stats.total}</p>
          <p className="mt-1 text-xs text-slate-500">All order records</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Open Orders</p>
            <div className="rounded-lg bg-amber-100 p-2.5 text-amber-700">
              <Clock size={20} />
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold text-slate-900">{stats.pending}</p>
          <p className="mt-1 text-xs text-slate-500">Pending or processing</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Delivered</p>
            <div className="rounded-lg bg-emerald-100 p-2.5 text-emerald-700">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold text-slate-900">{stats.delivered}</p>
          <p className="mt-1 text-xs text-slate-500">Successfully delivered</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Sales Order Value</p>
            <div className="rounded-lg bg-blue-100 p-2.5 text-blue-700">
              <IndianRupee size={20} />
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold text-slate-900">{formatCurrency(stats.revenue)}</p>
          <p className="mt-1 text-xs text-slate-500">Excluding cancelled orders</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Order Records</h2>
              <p className="mt-1 text-sm text-slate-500">Search and manage customer sales orders.</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative sm:min-w-64">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value)
                    setCurrentPage(1)
                  }}
                  placeholder="Search order or customer..."
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/20"
                />
              </div>

              <div className="relative">
                <Filter size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value)
                    setCurrentPage(1)
                  }}
                  className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-8 text-sm outline-none focus:border-erp-primary sm:min-w-36"
                >
                  <option value="All">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Processing">Processing</option>
                  <option value="Shipped">Shipped</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <select
                value={paymentFilter}
                onChange={(event) => {
                  setPaymentFilter(event.target.value)
                  setCurrentPage(1)
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
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Order</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Customer</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Order Date</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Items</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Amount</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Payment</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {paginatedOrders.map((order) => (
                <tr key={order.id} className="transition hover:bg-slate-50/70">
                  <td className="px-5 py-4">
                    <p className="text-sm font-semibold text-erp-primary">{order.id}</p>
                    <p className="mt-1 text-xs text-slate-400">Delivery: {formatDate(order.deliveryDate)}</p>
                  </td>

                  <td className="px-5 py-4">
                    <p className="text-sm font-medium text-slate-800">{order.customer}</p>
                    <p className="mt-1 text-xs text-slate-500">{order.company}</p>
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">{formatDate(order.orderDate)}</td>

                  <td className="px-5 py-4 text-sm text-slate-600">{order.items}</td>

                  <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-slate-900">{formatCurrency(order.amount)}</td>

                  <td className="px-5 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${paymentClasses[order.paymentStatus]}`}>{order.paymentStatus}</span>
                  </td>

                  <td className="px-5 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusClasses[order.status]}`}>{order.status}</span>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button type="button" title="View order" onClick={() => navigate(`/company/orders/${order.id}`)} className="rounded-lg p-2 text-slate-500 transition hover:bg-violet-50 hover:text-erp-primary">
                        <Eye size={17} />
                      </button>

                      <button
                        type="button"
                        title="Edit order"
                        disabled={order.status === 'Cancelled'}
                        onClick={() => navigate(`/company/orders/${order.id}/edit`)}
                        className="rounded-lg p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <Pencil size={17} />
                      </button>

                      <button type="button" title="Delete order" onClick={() => setDeleteId(order.id)} className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600">
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {paginatedOrders.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center">
                      <div className="rounded-full bg-slate-100 p-4 text-slate-400">
                        <ShoppingBag size={26} />
                      </div>
                      <h3 className="mt-4 text-sm font-semibold text-slate-800">No orders found</h3>
                      <p className="mt-1 text-sm text-slate-500">Try changing your search or filters.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setSearch('')
                          setStatusFilter('All')
                          setPaymentFilter('All')
                          setCurrentPage(1)
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
            Showing <span className="font-medium text-slate-700">{filteredOrders.length === 0 ? 0 : (safePage - 1) * pageSize + 1}</span> to <span className="font-medium text-slate-700">{Math.min(safePage * pageSize, filteredOrders.length)}</span> of{' '}
            <span className="font-medium text-slate-700">{filteredOrders.length}</span> orders
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
          <div role="dialog" aria-modal="true" aria-labelledby="delete-order-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-rose-100 p-3 text-rose-600">
                  <Trash2 size={22} />
                </div>
                <div>
                  <h3 id="delete-order-title" className="text-lg font-semibold text-slate-900">
                    Delete Order?
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">Order ID: {deleteId}</p>
                </div>
              </div>

              <button type="button" aria-label="Close dialog" onClick={() => setDeleteId(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X size={19} />
              </button>
            </div>

            <p className="mt-5 text-sm leading-6 text-slate-600">Are you sure you want to delete this order? This only removes the record from the current page's sample data.</p>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setDeleteId(null)} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                Cancel
              </button>

              <button type="button" onClick={handleDelete} className="rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700">
                Delete Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
