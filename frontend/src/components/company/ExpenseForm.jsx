import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Receipt, Save, CalendarDays, Wallet, Building2, FileText, IndianRupee } from 'lucide-react'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'

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
]

const emptyForm = {
  title: '',
  category: 'Other',
  amount: '',
  date: new Date().toLocaleDateString('en-CA'),
  paymentMethod: 'UPI',
  status: 'Pending',
  vendor: '',
  notes: '',
}

const categories = ['Rent', 'Utilities', 'Travel', 'Office Supplies', 'Transport', 'Inventory', 'Software', 'Marketing', 'Maintenance', 'Other']

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-erp-primary focus:ring-4 focus:ring-erp-primary/10'

export default function ExpenseForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    document.title = isEdit ? 'Edit Expense | MineERP' : 'Add Expense | MineERP'

    if (!isEdit) return

    const storedExpenses = JSON.parse(localStorage.getItem('mineerp_expenses') || 'null')

    const expenses = storedExpenses || initialExpenses
    const expense = expenses.find((item) => item.id === id)

    if (expense) {
      setForm({
        ...emptyForm,
        ...expense,
        amount: String(expense.amount),
      })
    }
  }, [id, isEdit])

  const handleChange = (event) => {
    const { name, value } = event.target

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }))

    setErrors((previous) => ({
      ...previous,
      [name]: '',
    }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    const nextErrors = {}

    if (!form.title.trim()) {
      nextErrors.title = 'Expense title is required.'
    }

    if (!form.amount || Number(form.amount) <= 0) {
      nextErrors.amount = 'Enter an amount greater than zero.'
    }

    if (!form.date) {
      nextErrors.date = 'Expense date is required.'
    }

    if (!form.vendor.trim()) {
      nextErrors.vendor = 'Vendor or payee is required.'
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    const storedExpenses = JSON.parse(localStorage.getItem('mineerp_expenses') || 'null')

    const expenses = storedExpenses || initialExpenses

    if (isEdit) {
      const updatedExpenses = expenses.map((expense) =>
        expense.id === id
          ? {
              ...expense,
              ...form,
              amount: Number(form.amount),
            }
          : expense,
      )

      localStorage.setItem('mineerp_expenses', JSON.stringify(updatedExpenses))
    } else {
      const newExpense = {
        ...form,
        id: `EXP-${Date.now()}`,
        amount: Number(form.amount),
      }

      localStorage.setItem('mineerp_expenses', JSON.stringify([newExpense, ...expenses]))
    }

    setSaved(true)

    setTimeout(() => {
      navigate('/company/expenses')
    }, 500)
  }

  const items = [
    { title: 'Expenses', link: '/company/expenses' },
    { title: isEdit ? 'Edit Expense' : 'Add Expense', link: null },
  ]

  return (
    <section className="space-y-6  pb-10" >
      <BreadCrumb items={items} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{isEdit ? 'Edit Expense' : 'Add Expense'}</h1>

          <p className="mt-1 text-sm text-slate-500">{isEdit ? 'Update the expense details below.' : 'Record and manage your company expenses.'}</p>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-erp-primary-light text-erp-primary">
          <Receipt size={24} />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
            <div className="rounded-xl bg-erp-primary-light p-2.5 text-erp-primary">
              <Receipt size={20} />
            </div>

            <div>
              <h2 className="font-semibold text-slate-800">Expense Information</h2>
              <p className="mt-1 text-xs text-slate-500">Enter the basic expense details.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Expense Title <span className="text-red-500">*</span>
              </label>

              <input name="title" value={form.title} onChange={handleChange} placeholder="e.g. Office Rent" className={inputClass} />

              {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Category <span className="text-red-500">*</span>
              </label>

              <select name="category" value={form.category} onChange={handleChange} className={inputClass}>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Amount (₹) <span className="text-red-500">*</span>
              </label>

              <div className="relative">
                <IndianRupee size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

                <input type="number" name="amount" value={form.amount} onChange={handleChange} min="0.01" step="0.01" placeholder="Enter amount" className={`${inputClass} pl-9`} />
              </div>

              {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Expense Date <span className="text-red-500">*</span>
              </label>

              <div className="relative">
                <CalendarDays size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

                <input type="date" name="date" value={form.date} onChange={handleChange} className={`${inputClass} pl-10`} />
              </div>

              {errors.date && <p className="mt-1 text-xs text-red-500">{errors.date}</p>}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
            <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
              <Wallet size={20} />
            </div>

            <div>
              <h2 className="font-semibold text-slate-800">Payment Information</h2>
              <p className="mt-1 text-xs text-slate-500">Specify the payee and payment details.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Vendor / Payee <span className="text-red-500">*</span>
              </label>

              <div className="relative">
                <Building2 size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

                <input name="vendor" value={form.vendor} onChange={handleChange} placeholder="Enter vendor or payee name" className={`${inputClass} pl-10`} />
              </div>

              {errors.vendor && <p className="mt-1 text-xs text-red-500">{errors.vendor}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Payment Method</label>

              <select name="paymentMethod" value={form.paymentMethod} onChange={handleChange} className={inputClass}>
                <option value="UPI">UPI</option>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Payment Status</label>

              <select name="status" value={form.status} onChange={handleChange} className={inputClass}>
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">Notes</label>

              <div className="relative">
                <FileText size={17} className="absolute left-3 top-3.5 text-slate-400" />

                <textarea name="notes" value={form.notes} onChange={handleChange} rows={4} placeholder="Add expense details or notes..." className={`${inputClass} resize-y pl-10`} />
              </div>
            </div>
          </div>
        </div>

        {saved && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">Expense saved successfully. Redirecting to expenses...</div>}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link to="/company/expenses" className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
            Cancel
          </Link>

          <button
            type="submit"
            disabled={saved}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-erp-primary px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-erp-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={17} />
            {isEdit ? 'Update Expense' : 'Save Expense'}
          </button>
        </div>
      </form>
    </section>
  )
}
