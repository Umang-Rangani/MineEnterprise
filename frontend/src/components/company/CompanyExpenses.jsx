import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Eye, Pencil, Trash2, Wallet, IndianRupee, Clock3, CheckCircle2, XCircle, CalendarDays, ChevronLeft, ChevronRight, Receipt, Fuel, Building2, Package, MoreHorizontal } from 'lucide-react'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import TrashBox from '../../TrashBox/TrashBox'

const initialExpenses = [
  {
    id: 'EXP-001',
    title: 'Office Rent',
    category: 'Rent',
    amount: 25000,
    date: '2026-10-02',
    paymentMethod: 'Bank Transfer',
    status: 'Paid',
    vendor: 'ABC Properties',
    notes: 'Monthly office rent',
  },
  {
    id: 'EXP-002',
    title: 'Office Electricity',
    category: 'Utilities',
    amount: 3200,
    date: '2026-10-04',
    paymentMethod: 'UPI',
    status: 'Paid',
    vendor: 'Electricity Board',
    notes: 'Monthly electricity bill',
  },
  {
    id: 'EXP-003',
    title: 'Employee Travel',
    category: 'Travel',
    amount: 1800,
    date: '2026-10-06',
    paymentMethod: 'Cash',
    status: 'Pending',
    vendor: 'Local Transport',
    notes: 'Business travel expenses',
  },
  {
    id: 'EXP-004',
    title: 'Office Stationery',
    category: 'Office Supplies',
    amount: 2450,
    date: '2026-10-08',
    paymentMethod: 'UPI',
    status: 'Paid',
    vendor: 'City Stationers',
    notes: 'Pens, files and notebooks',
  },
  {
    id: 'EXP-005',
    title: 'Internet Bill',
    category: 'Utilities',
    amount: 1499,
    date: '2026-10-10',
    paymentMethod: 'UPI',
    status: 'Pending',
    vendor: 'Internet Provider',
    notes: 'Monthly internet bill',
  },
  {
    id: 'EXP-006',
    title: 'Vehicle Fuel',
    category: 'Transport',
    amount: 3500,
    date: '2026-10-12',
    paymentMethod: 'Card',
    status: 'Paid',
    vendor: 'Fuel Station',
    notes: 'Fuel for company vehicle',
  },
  {
    id: 'EXP-007',
    title: 'Product Packaging',
    category: 'Inventory',
    amount: 6800,
    date: '2026-10-15',
    paymentMethod: 'Bank Transfer',
    status: 'Cancelled',
    vendor: 'Packaging Supplier',
    notes: 'Packaging material purchase',
  },
  {
    id: 'EXP-008',
    title: 'Software Subscription',
    category: 'Software',
    amount: 2200,
    date: '2026-10-18',
    paymentMethod: 'Card',
    status: 'Paid',
    vendor: 'Software Provider',
    notes: 'Business software subscription',
  },
]

const statusStyles = {
  Paid: 'bg-emerald-50 text-emerald-700',
  Pending: 'bg-amber-50 text-amber-700',
  Cancelled: 'bg-red-50 text-red-700',
}

const categoryStyles = {
  Rent: 'bg-violet-50 text-violet-700',
  Utilities: 'bg-blue-50 text-blue-700',
  Travel: 'bg-orange-50 text-orange-700',
  'Office Supplies': 'bg-pink-50 text-pink-700',
  Transport: 'bg-cyan-50 text-cyan-700',
  Inventory: 'bg-indigo-50 text-indigo-700',
  Software: 'bg-teal-50 text-teal-700',
}

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

export default function CompanyExpenses() {
  const [expenses, setExpenses] = useState(initialExpenses)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [currentPage, setCurrentPage] = useState(1)
  const [deleteId, setDeleteId] = useState(null)
  const [deleteExpense, setDeleteExpense] = useState(null)
  const [showDeleteBox, setShowDeleteBox] = useState(false)

  const itemsPerPage = 5

  const filteredExpenses = expenses.filter((expense) => {
    const searchText = search.toLowerCase()

    const matchesSearch = [expense.id, expense.title, expense.vendor, expense.category].some((value) => value.toLowerCase().includes(searchText))

    const matchesCategory = categoryFilter === 'All' || expense.category === categoryFilter

    const matchesStatus = statusFilter === 'All' || expense.status === statusFilter

    return matchesSearch && matchesCategory && matchesStatus
  })

  const totalExpenses = expenses.reduce((total, expense) => (expense.status !== 'Cancelled' ? total + expense.amount : total), 0)

  const paidExpenses = expenses.filter((expense) => expense.status === 'Paid').reduce((total, expense) => total + expense.amount, 0)

  const pendingExpenses = expenses.filter((expense) => expense.status === 'Pending').reduce((total, expense) => total + expense.amount, 0)

  const cancelledCount = expenses.filter((expense) => expense.status === 'Cancelled').length

  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / itemsPerPage))

  const safePage = Math.min(currentPage, totalPages)

  const paginatedExpenses = filteredExpenses.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage)

  const changeSearch = (value) => {
    setSearch(value)
    setCurrentPage(1)
  }

  const changeCategory = (value) => {
    setCategoryFilter(value)
    setCurrentPage(1)
  }

  const changeStatus = (value) => {
    setStatusFilter(value)
    setCurrentPage(1)
  }

  const confirmDelete = () => {
    if (!deleteExpense) return

    setExpenses((previous) => previous.filter((expense) => expense.id !== deleteExpense.id))

    setDeleteExpense(null)
  }
  const openDeleteBox = (id) => {
    setDeleteId(id)
    setShowDeleteBox(true)
  }

  const updateExpenseStatus = (id, status) => {
    setExpenses((previous) => previous.map((expense) => (expense.id === id ? { ...expense, status } : expense)))
  }

  const statCards = [
    {
      title: 'Total Expenses',
      value: formatCurrency(totalExpenses),
      subtitle: 'Excluding cancelled expenses',
      icon: Wallet,
      iconStyle: 'bg-violet-50 text-violet-600',
    },
    {
      title: 'Paid Expenses',
      value: formatCurrency(paidExpenses),
      subtitle: 'Successfully paid',
      icon: CheckCircle2,
      iconStyle: 'bg-emerald-50 text-emerald-600',
    },
    {
      title: 'Pending Expenses',
      value: formatCurrency(pendingExpenses),
      subtitle: 'Awaiting payment',
      icon: Clock3,
      iconStyle: 'bg-amber-50 text-amber-600',
    },
    {
      title: 'Cancelled',
      value: String(cancelledCount),
      subtitle: 'Cancelled records',
      icon: XCircle,
      iconStyle: 'bg-red-50 text-red-500',
    },
  ]

  const items = [
    {
      title: 'Payments',
      link: null,
    },
  ]

  return (
    <div className="space-y-6 pb-10">
      <BreadCrumb items={items} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Expenses</h1>
          <p className="mt-1 text-sm text-slate-500">Track and manage your company expenses.</p>
        </div>

        <Link to="/company/expenses/new" className="inline-flex items-center justify-center gap-2 rounded-xl bg-erp-primary px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-erp-primary-hover">
          <Plus size={18} />
          Add Expense
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon

          return (
            <div key={card.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">{card.title}</p>
                  <h2 className="mt-2 text-xl font-bold text-slate-800">{card.value}</h2>
                </div>

                <div className={`rounded-xl p-3 ${card.iconStyle}`}>
                  <Icon size={21} />
                </div>
              </div>

              <p className="mt-3 text-xs text-slate-500">{card.subtitle}</p>
            </div>
          )
        })}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => changeSearch(event.target.value)}
              placeholder="Search expense, vendor or expense ID..."
              className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-erp-primary focus:ring-4 focus:ring-erp-primary/10"
            />
          </div>

          <select value={categoryFilter} onChange={(event) => changeCategory(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-erp-primary">
            <option value="All">All Categories</option>
            <option value="Rent">Rent</option>
            <option value="Utilities">Utilities</option>
            <option value="Travel">Travel</option>
            <option value="Office Supplies">Office Supplies</option>
            <option value="Transport">Transport</option>
            <option value="Inventory">Inventory</option>
            <option value="Software">Software</option>
          </select>

          <select value={statusFilter} onChange={(event) => changeStatus(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-erp-primary">
            <option value="All">All Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-1 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-semibold text-slate-800">Expense Records</h2>
          <p className="text-sm text-slate-500">{filteredExpenses.length} records found</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left">
            <thead className="bg-slate-50">
              <tr className="text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-4 font-semibold">Expense</th>
                <th className="px-5 py-4 font-semibold">Category</th>
                <th className="px-5 py-4 font-semibold">Vendor</th>
                <th className="px-5 py-4 font-semibold">Date</th>
                <th className="px-5 py-4 font-semibold">Payment Method</th>
                <th className="px-5 py-4 font-semibold">Amount</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {paginatedExpenses.map((expense) => (
                <tr key={expense.id} className="transition hover:bg-slate-50/70">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-erp-primary-light p-2.5 text-erp-primary">
                        <Receipt size={19} />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{expense.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{expense.id}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${categoryStyles[expense.category] || 'bg-slate-100 text-slate-600'}`}>{expense.category}</span>
                  </td>

                  <td className="px-5 py-4 text-sm text-slate-600">{expense.vendor}</td>

                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <CalendarDays size={15} className="text-slate-400" />
                      {formatDate(expense.date)}
                    </div>
                  </td>

                  <td className="px-5 py-4 text-sm text-slate-600">{expense.paymentMethod}</td>

                  <td className="px-5 py-4 font-semibold text-slate-800">{formatCurrency(expense.amount)}</td>

                  <td className="px-5 py-4">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[expense.status] || 'bg-slate-100 text-slate-600'}`}>{expense.status}</span>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <Link to={`/company/expenses/${expense.id}`} title="View expense" className="rounded-lg p-2 text-slate-500 transition hover:bg-erp-primary-light hover:text-erp-primary">
                        <Eye size={17} />
                      </Link>

                      <Link to={`/company/expenses/${expense.id}/edit`} title="Edit expense" className="rounded-lg p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600">
                        <Pencil size={17} />
                      </Link>

                      {/* {expense.status === 'Pending' && (
                        <button type="button" onClick={() => updateExpenseStatus(expense.id, 'Paid')} title="Mark as paid" className="rounded-lg p-2 text-emerald-600 transition hover:bg-emerald-50">
                          <CheckCircle2 size={17} />
                        </button>
                      )}

                      {expense.status !== 'Cancelled' && (
                        <button type="button" onClick={() => updateExpenseStatus(expense.id, 'Cancelled')} title="Cancel expense" className="rounded-lg p-2 text-amber-600 transition hover:bg-amber-50">
                          <XCircle size={17} />
                        </button>
                      )} */}
                      <button type="button" onClick={() => setDeleteExpense(expense)} title="Delete expense" className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600">
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {paginatedExpenses.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-14 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center">
                      <div className="rounded-2xl bg-slate-100 p-4 text-slate-400">
                        <Search size={26} />
                      </div>
                      <h3 className="mt-4 font-semibold text-slate-800">No expenses found</h3>
                      <p className="mt-1 text-sm text-slate-500">Try changing your search or filter selection.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Showing {filteredExpenses.length === 0 ? 0 : (safePage - 1) * itemsPerPage + 1} to {Math.min(safePage * itemsPerPage, filteredExpenses.length)} of {filteredExpenses.length} expenses
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage === 1}
              onClick={() => setCurrentPage(safePage - 1)}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft size={18} />
            </button>

            {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                className={`h-9 min-w-9 rounded-lg px-3 text-sm font-medium transition ${safePage === page ? 'bg-erp-primary text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                {page}
              </button>
            ))}

            <button
              type="button"
              disabled={safePage === totalPages}
              onClick={() => setCurrentPage(safePage + 1)}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      <TrashBox
        isOpen={Boolean(deleteExpense)}
        onClose={() => setDeleteExpense(null)}
        title="Delete Expense?"
        message={deleteExpense ? `Are you sure you want to delete ${deleteExpense.title} (${deleteExpense.id}) for ${formatCurrency(deleteExpense.amount)}? This only removes the expense from the current sample UI.` : ''}
        actionButtonText="Delete Expense"
        cancelButtonText="Cancel"
        onAction={confirmDelete}
        isProcessing={false}
      />
    </div>
  )
}
