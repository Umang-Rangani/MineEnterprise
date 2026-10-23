import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Eye, Pencil, Trash2, Wallet, CheckCircle2, Clock3, XCircle, IndianRupee, CalendarDays, CreditCard, Banknote, Smartphone, ChevronLeft, ChevronRight } from 'lucide-react'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import TrashBox from '../../TrashBox/TrashBox'

const initialPayments = [
  {
    id: 'PAY-001',
    invoiceId: 'INV-001',
    customer: 'Rahul Shah',
    date: '2026-10-20',
    method: 'Bank Transfer',
    reference: 'TXN-982341',
    amount: 2500,
    status: 'Completed',
  },
  {
    id: 'PAY-002',
    invoiceId: 'INV-002',
    customer: 'Priya Patel',
    date: '2026-10-20',
    method: 'UPI',
    reference: 'UPI-772198',
    amount: 5000,
    status: 'Completed',
  },
  {
    id: 'PAY-003',
    invoiceId: 'INV-003',
    customer: 'Aarav Mehta',
    date: '2026-10-19',
    method: 'Cash',
    reference: 'CASH-003',
    amount: 12000,
    status: 'Pending',
  },
  {
    id: 'PAY-004',
    invoiceId: 'INV-004',
    customer: 'Neha Desai',
    date: '2026-10-18',
    method: 'Cheque',
    reference: 'CHQ-44102',
    amount: 15000,
    status: 'Completed',
  },
  {
    id: 'PAY-005',
    invoiceId: 'INV-005',
    customer: 'Karan Joshi',
    date: '2026-10-17',
    method: 'UPI',
    reference: 'UPI-663221',
    amount: 9800,
    status: 'Failed',
  },
  {
    id: 'PAY-006',
    invoiceId: 'INV-006',
    customer: 'Rahul Shah',
    date: '2026-10-16',
    method: 'Bank Transfer',
    reference: 'TXN-871124',
    amount: 20000,
    status: 'Completed',
  },
  {
    id: 'PAY-007',
    invoiceId: 'INV-007',
    customer: 'Priya Patel',
    date: '2026-10-15',
    method: 'Card',
    reference: 'CARD-11722',
    amount: 16700,
    status: 'Completed',
  },
  {
    id: 'PAY-008',
    invoiceId: 'INV-008',
    customer: 'Ananya Shah',
    date: '2026-10-14',
    method: 'UPI',
    reference: 'UPI-883192',
    amount: 3500,
    status: 'Pending',
  },
]

const currency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value || 0)

const formatDate = (date) =>
  new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

const statusStyles = {
  Completed: 'bg-emerald-50 text-emerald-700',
  Pending: 'bg-amber-50 text-amber-700',
  Failed: 'bg-red-50 text-red-700',
  Refunded: 'bg-slate-100 text-slate-600',
}

const methodIcons = {
  Cash: Banknote,
  UPI: Smartphone,
  Card: CreditCard,
  'Bank Transfer': Wallet,
  Cheque: Banknote,
}

export default function CompanyPayments() {
  const [payments, setPayments] = useState(initialPayments)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [methodFilter, setMethodFilter] = useState('All')
  const [currentPage, setCurrentPage] = useState(1)
  const [deletePayment, setDeletePayment] = useState(null)

  const pageSize = 6

  const filteredPayments = payments.filter((payment) => {
    const query = search.toLowerCase()

    const matchesSearch = [payment.id, payment.invoiceId, payment.customer, payment.reference, payment.method].some((value) => value.toLowerCase().includes(query))

    const matchesStatus = statusFilter === 'All' || payment.status === statusFilter

    const matchesMethod = methodFilter === 'All' || payment.method === methodFilter

    return matchesSearch && matchesStatus && matchesMethod
  })

  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / pageSize))

  const safePage = Math.min(currentPage, totalPages)

  const paginatedPayments = filteredPayments.slice((safePage - 1) * pageSize, safePage * pageSize)

  const completedPayments = payments.filter((payment) => payment.status === 'Completed')

  const completedAmount = completedPayments.reduce((total, payment) => total + payment.amount, 0)

  const pendingAmount = payments.filter((payment) => payment.status === 'Pending').reduce((total, payment) => total + payment.amount, 0)

  const failedCount = payments.filter((payment) => payment.status === 'Failed').length

  const updateSearch = (value) => {
    setSearch(value)
    setCurrentPage(1)
  }

  const confirmDelete = () => {
    if (!deletePayment) return

    setPayments((previous) => previous.filter((payment) => payment.id !== deletePayment.id))

    setDeletePayment(null)
  }

  const items = [
    {
      title: 'Payments',
      link: null,
    },
  ]

  useEffect(() => {
    document.title = 'Payments | MineERP'
  }, [])

  return (
    <section className='space-y-2 pt-2'>
        <BreadCrumb items={items} />
      <div className="space-y-6 pb-8">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Payments</h1>

            <p className="mt-1 text-sm text-slate-500">Track received payments, transaction references and payment status.</p>
          </div>

          <Link to="/company/payments/new" className="inline-flex items-center justify-center gap-2 rounded-xl bg-erp-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-erp-primary-hover">
            <Plus size={18} />
            Record Payment
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Total Payments</span>

              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">
                <Wallet size={20} />
              </span>
            </div>

            <p className="mt-4 text-2xl font-bold text-slate-900">{payments.length}</p>

            <p className="mt-1 text-xs text-slate-400">All recorded transactions</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Collected Amount</span>

              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <IndianRupee size={20} />
              </span>
            </div>

            <p className="mt-4 text-2xl font-bold text-slate-900">{currency(completedAmount)}</p>

            <p className="mt-1 text-xs text-emerald-600">Completed payments only</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Pending Amount</span>

              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Clock3 size={20} />
              </span>
            </div>

            <p className="mt-4 text-2xl font-bold text-slate-900">{currency(pendingAmount)}</p>

            <p className="mt-1 text-xs text-amber-600">Awaiting confirmation</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Failed Payments</span>

              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <XCircle size={20} />
              </span>
            </div>

            <p className="mt-4 text-2xl font-bold text-slate-900">{failedCount}</p>

            <p className="mt-1 text-xs text-red-600">Need review</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                value={search}
                onChange={(e) => updateSearch(e.target.value)}
                placeholder="Search payment, invoice, customer or reference..."
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-erp-primary"
              >
                <option value="All">All Statuses</option>
                <option value="Completed">Completed</option>
                <option value="Pending">Pending</option>
                <option value="Failed">Failed</option>
                <option value="Refunded">Refunded</option>
              </select>

              <select
                value={methodFilter}
                onChange={(e) => {
                  setMethodFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-erp-primary"
              >
                <option value="All">All Methods</option>
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Card">Card</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Payment</th>
                  <th className="px-4 py-4 font-semibold">Customer / Invoice</th>
                  <th className="px-4 py-4 font-semibold">Date</th>
                  <th className="px-4 py-4 font-semibold">Method</th>
                  <th className="px-4 py-4 font-semibold">Amount</th>
                  <th className="px-4 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {paginatedPayments.map((payment) => {
                  const MethodIcon = methodIcons[payment.method] || Wallet

                  return (
                    <tr key={payment.id} className="transition hover:bg-slate-50/70">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                            <MethodIcon size={19} />
                          </div>

                          <div>
                            <p className="font-semibold text-slate-900">{payment.id}</p>

                            <p className="mt-1 text-xs text-slate-400">{payment.reference}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <p className="text-sm font-medium text-slate-800">{payment.customer}</p>

                        <Link to={`/company/invoices/${payment.invoiceId}`} className="mt-1 inline-block text-xs font-medium text-erp-primary hover:underline">
                          {payment.invoiceId}
                        </Link>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <CalendarDays size={15} className="text-slate-400" />
                          {formatDate(payment.date)}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <span className="text-sm text-slate-700">{payment.method}</span>
                      </td>

                      <td className="px-4 py-4">
                        <p className="text-sm font-semibold text-slate-900">{currency(payment.amount)}</p>
                      </td>

                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[payment.status] || statusStyles.Pending}`}>
                          {payment.status === 'Completed' ? <CheckCircle2 size={13} /> : payment.status === 'Failed' ? <XCircle size={13} /> : <Clock3 size={13} />}

                          {payment.status}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <Link to={`/company/payments/${payment.id}`} title="View payment" className="rounded-lg p-2 text-slate-500 transition hover:bg-erp-primary-light hover:text-erp-primary">
                            <Eye size={17} />
                          </Link>

                          <Link to={`/company/payments/${payment.id}/edit`} title="Edit payment" className="rounded-lg p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600">
                            <Pencil size={17} />
                          </Link>

                          <button type="button" onClick={() => setDeletePayment(payment)} title="Delete payment" className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600">
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}

                {paginatedPayments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-14 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                        <Wallet size={24} />
                      </div>

                      <p className="mt-3 font-semibold text-slate-800">No payments found</p>

                      <p className="mt-1 text-sm text-slate-500">Try another search or change the filters.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Showing{' '}
              <span className="font-semibold text-slate-700">
                {filteredPayments.length === 0 ? 0 : (safePage - 1) * pageSize + 1}
                {'–'}
                {Math.min(safePage * pageSize, filteredPayments.length)}
              </span>{' '}
              of <span className="font-semibold text-slate-700">{filteredPayments.length}</span> payments
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage(safePage - 1)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft size={17} />
              </button>

              <span className="px-2 text-sm text-slate-600">
                Page {safePage} of {totalPages}
              </span>

              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage(safePage + 1)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
        </div>

        <TrashBox
          isOpen={Boolean(deletePayment)}
          onClose={() => setDeletePayment(null)}
          title="Delete Payment?"
          message={deletePayment ? `Are you sure you want to delete ${deletePayment.id} for ${currency(deletePayment.amount)}? This only removes the payment from the current sample UI.` : ''}
          actionButtonText="Delete Payment"
          cancelButtonText="Cancel"
          onAction={confirmDelete}
          isProcessing={false}
        />
      </div>
    </section>
  )
}
