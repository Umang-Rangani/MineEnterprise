import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Eye, Pencil, Trash2, FileText, Clock, CheckCircle2, IndianRupee, ChevronLeft, ChevronRight, Filter, X, Download } from 'lucide-react'

const initialInvoices = [
  {
    id: 'INV-001',
    orderId: 'ORD-001',
    customerId: 'CUS-001',
    customer: 'Rahul Shah',
    company: 'Shah Enterprises',
    invoiceDate: '2026-10-20',
    dueDate: '2026-10-27',
    amount: 2500,
    paymentStatus: 'Paid',
    status: 'Paid',
  },
  {
    id: 'INV-002',
    orderId: 'ORD-002',
    customerId: 'CUS-002',
    customer: 'Priya Patel',
    company: 'Patel Retail Store',
    invoiceDate: '2026-10-19',
    dueDate: '2026-10-26',
    amount: 14750,
    paymentStatus: 'Partial',
    status: 'Sent',
  },
  {
    id: 'INV-003',
    orderId: 'ORD-003',
    customerId: 'CUS-003',
    customer: 'Aarav Mehta',
    company: 'Individual Customer',
    invoiceDate: '2026-10-18',
    dueDate: '2026-10-22',
    amount: 54000,
    paymentStatus: 'Unpaid',
    status: 'Overdue',
  },
  {
    id: 'INV-004',
    orderId: 'ORD-004',
    customerId: 'CUS-004',
    customer: 'Neha Desai',
    company: 'Desai Distributors',
    invoiceDate: '2026-10-17',
    dueDate: '2026-10-24',
    amount: 32000,
    paymentStatus: 'Paid',
    status: 'Paid',
  },
  {
    id: 'INV-005',
    orderId: 'ORD-005',
    customerId: 'CUS-005',
    customer: 'Karan Joshi',
    company: 'Joshi Traders',
    invoiceDate: '2026-10-16',
    dueDate: '2026-10-23',
    amount: 9800,
    paymentStatus: 'Unpaid',
    status: 'Draft',
  },
  {
    id: 'INV-006',
    orderId: 'ORD-006',
    customerId: 'CUS-001',
    customer: 'Rahul Shah',
    company: 'Shah Enterprises',
    invoiceDate: '2026-10-15',
    dueDate: '2026-10-22',
    amount: 42500,
    paymentStatus: 'Partial',
    status: 'Sent',
  },
  {
    id: 'INV-007',
    orderId: 'ORD-007',
    customerId: 'CUS-002',
    customer: 'Priya Patel',
    company: 'Patel Retail Store',
    invoiceDate: '2026-10-14',
    dueDate: '2026-10-21',
    amount: 16700,
    paymentStatus: 'Paid',
    status: 'Paid',
  },
  {
    id: 'INV-008',
    orderId: 'ORD-008',
    customerId: 'CUS-006',
    customer: 'Ananya Shah',
    company: 'Individual Customer',
    invoiceDate: '2026-10-13',
    dueDate: '2026-10-20',
    amount: 5500,
    paymentStatus: 'Unpaid',
    status: 'Overdue',
  },
]

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount)

const formatDate = (date) =>
  new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

const statusClasses = {
  Draft: 'bg-slate-100 text-slate-700 ring-slate-500/20',
  Sent: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  Paid: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  Overdue: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  Cancelled: 'bg-slate-100 text-slate-500 ring-slate-500/20',
}

const paymentClasses = {
  Paid: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  Partial: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  Unpaid: 'bg-rose-50 text-rose-700 ring-rose-600/20',
}

export default function CompanyInvoices() {
  const navigate = useNavigate()

  const [invoices, setInvoices] = useState(initialInvoices)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [paymentFilter, setPaymentFilter] = useState('All')
  const [currentPage, setCurrentPage] = useState(1)
  const [deleteId, setDeleteId] = useState(null)

  const pageSize = 5

  const stats = useMemo(() => {
    const activeInvoices = invoices.filter((invoice) => invoice.status !== 'Cancelled')

    return {
      total: invoices.length,
      unpaid: invoices.filter((invoice) => invoice.paymentStatus === 'Unpaid' || invoice.paymentStatus === 'Partial').length,
      paid: invoices.filter((invoice) => invoice.paymentStatus === 'Paid').length,
      outstanding: activeInvoices.reduce((sum, invoice) => {
        if (invoice.paymentStatus === 'Paid') return sum
        if (invoice.paymentStatus === 'Partial') return sum + invoice.amount * 0.5
        return sum + invoice.amount
      }, 0),
    }
  }, [invoices])

  const filteredInvoices = useMemo(() => {
    const query = search.trim().toLowerCase()

    return invoices.filter((invoice) => {
      const matchesSearch =
        invoice.id.toLowerCase().includes(query) || invoice.orderId.toLowerCase().includes(query) || invoice.customerId.toLowerCase().includes(query) || invoice.customer.toLowerCase().includes(query) || invoice.company.toLowerCase().includes(query)

      const matchesStatus = statusFilter === 'All' || invoice.status === statusFilter

      const matchesPayment = paymentFilter === 'All' || invoice.paymentStatus === paymentFilter

      return matchesSearch && matchesStatus && matchesPayment
    })
  }, [invoices, search, statusFilter, paymentFilter])

  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / pageSize))

  const safePage = Math.min(currentPage, totalPages)

  const paginatedInvoices = filteredInvoices.slice((safePage - 1) * pageSize, safePage * pageSize)

  const handleDelete = () => {
    setInvoices((previous) => previous.filter((invoice) => invoice.id !== deleteId))
    setDeleteId(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Invoice Management</h1>
          <p className="mt-1 text-sm text-slate-500">Create, manage and track customer invoices.</p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/company/invoices/new')}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-erp-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-erp-primary-hover"
        >
          <Plus size={18} />
          Create Invoice
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Total Invoices</p>
            <div className="rounded-lg bg-violet-100 p-2.5 text-violet-700">
              <FileText size={20} />
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold text-slate-900">{stats.total}</p>
          <p className="mt-1 text-xs text-slate-500">All invoice records</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Awaiting Payment</p>
            <div className="rounded-lg bg-amber-100 p-2.5 text-amber-700">
              <Clock size={20} />
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold text-slate-900">{stats.unpaid}</p>
          <p className="mt-1 text-xs text-slate-500">Unpaid or partially paid</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Fully Paid</p>
            <div className="rounded-lg bg-emerald-100 p-2.5 text-emerald-700">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold text-slate-900">{stats.paid}</p>
          <p className="mt-1 text-xs text-slate-500">Fully settled invoices</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Outstanding Amount</p>
            <div className="rounded-lg bg-blue-100 p-2.5 text-blue-700">
              <IndianRupee size={20} />
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold text-slate-900">{formatCurrency(stats.outstanding)}</p>
          <p className="mt-1 text-xs text-slate-500">Estimated from sample payment statuses</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Invoice Records</h2>
              <p className="mt-1 text-sm text-slate-500">Search and filter invoices by status and payment.</p>
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
                  placeholder="Search invoice or customer..."
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
                  className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-8 text-sm outline-none focus:border-erp-primary sm:min-w-32"
                >
                  <option value="All">All Statuses</option>
                  <option value="Draft">Draft</option>
                  <option value="Sent">Sent</option>
                  <option value="Paid">Paid</option>
                  <option value="Overdue">Overdue</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <select
                value={paymentFilter}
                onChange={(event) => {
                  setPaymentFilter(event.target.value)
                  setCurrentPage(1)
                }}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-erp-primary sm:min-w-32"
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
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Invoice</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Customer</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Invoice Date</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Due Date</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Amount</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Payment</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {paginatedInvoices.map((invoice) => (
                <tr key={invoice.id} className="transition hover:bg-slate-50/70">
                  <td className="px-5 py-4">
                    <p className="text-sm font-semibold text-erp-primary">{invoice.id}</p>
                    <p className="mt-1 text-xs text-slate-400">Order: {invoice.orderId}</p>
                  </td>

                  <td className="px-5 py-4">
                    <p className="text-sm font-medium text-slate-800">{invoice.customer}</p>
                    <p className="mt-1 text-xs text-slate-500">{invoice.company}</p>
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">{formatDate(invoice.invoiceDate)}</td>

                  <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">{formatDate(invoice.dueDate)}</td>

                  <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-slate-900">{formatCurrency(invoice.amount)}</td>

                  <td className="px-5 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${paymentClasses[invoice.paymentStatus]}`}>{invoice.paymentStatus}</span>
                  </td>

                  <td className="px-5 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusClasses[invoice.status]}`}>{invoice.status}</span>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button type="button" title="View invoice" onClick={() => navigate(`/company/invoices/${invoice.id}`)} className="rounded-lg p-2 text-slate-500 transition hover:bg-violet-50 hover:text-erp-primary">
                        <Eye size={17} />
                      </button>

                      <button
                        type="button"
                        title="Edit invoice"
                        disabled={invoice.status === 'Paid' || invoice.status === 'Cancelled'}
                        onClick={() => navigate(`/company/invoices/${invoice.id}/edit`)}
                        className="rounded-lg p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <Pencil size={17} />
                      </button>

                      <button type="button" title="Delete invoice" onClick={() => setDeleteId(invoice.id)} className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600">
                        <Trash2 size={17} />
                      </button>

                      <button
                        type="button"
                        title="Download invoice (coming later)"
                        onClick={() => window.alert('PDF download will be added during invoice integration.')}
                        className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Download size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {paginatedInvoices.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center">
                      <div className="rounded-full bg-slate-100 p-4 text-slate-400">
                        <FileText size={26} />
                      </div>
                      <h3 className="mt-4 text-sm font-semibold text-slate-800">No invoices found</h3>
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
            Showing <span className="font-medium text-slate-700">{filteredInvoices.length === 0 ? 0 : (safePage - 1) * pageSize + 1}</span> to{' '}
            <span className="font-medium text-slate-700">{Math.min(safePage * pageSize, filteredInvoices.length)}</span> of <span className="font-medium text-slate-700">{filteredInvoices.length}</span> invoices
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
          <div role="dialog" aria-modal="true" aria-labelledby="delete-invoice-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-rose-100 p-3 text-rose-600">
                  <Trash2 size={22} />
                </div>
                <div>
                  <h3 id="delete-invoice-title" className="text-lg font-semibold text-slate-900">
                    Delete Invoice?
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">Invoice ID: {deleteId}</p>
                </div>
              </div>

              <button type="button" aria-label="Close dialog" onClick={() => setDeleteId(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X size={19} />
              </button>
            </div>

            <p className="mt-5 text-sm leading-6 text-slate-600">Are you sure you want to delete this invoice? This only removes it from the current page's sample data.</p>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setDeleteId(null)} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                Cancel
              </button>

              <button type="button" onClick={handleDelete} className="rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700">
                Delete Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
