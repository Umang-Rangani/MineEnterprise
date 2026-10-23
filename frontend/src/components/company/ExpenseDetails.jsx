import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Receipt, CalendarDays, CreditCard, FileText, UserRound, Hash, CheckCircle2, Clock3, XCircle, IndianRupee, Tag, Building2, Wallet } from 'lucide-react'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'

const sampleExpenses = [
  {
    id: 'EXP-001',
    title: 'Office Rent',
    category: 'Rent',
    amount: 25000,
    date: '2026-10-20',
    paymentMethod: 'Bank Transfer',
    vendor: 'Shree Property',
    reference: 'RENT-OCT-001',
    status: 'Paid',
    createdBy: 'Rahul Shah',
    notes: 'Monthly office rent payment for October.',
  },
  {
    id: 'EXP-002',
    title: 'Internet Bill',
    category: 'Utilities',
    amount: 1500,
    date: '2026-10-19',
    paymentMethod: 'UPI',
    vendor: 'Internet Service Provider',
    reference: 'NET-10202',
    status: 'Pending',
    createdBy: 'Priya Patel',
    notes: 'Monthly office internet bill.',
  },
  {
    id: 'EXP-003',
    title: 'Office Supplies',
    category: 'Office Supplies',
    amount: 3200,
    date: '2026-10-18',
    paymentMethod: 'Cash',
    vendor: 'Shree Stationery',
    reference: 'SUP-003',
    status: 'Paid',
    createdBy: 'Aarav Mehta',
    notes: 'Stationery and office supplies purchase.',
  },
  {
    id: 'EXP-004',
    title: 'Employee Travel',
    category: 'Travel',
    amount: 4800,
    date: '2026-10-17',
    paymentMethod: 'Card',
    vendor: 'Travel Agency',
    reference: 'TRV-004',
    status: 'Pending',
    createdBy: 'Neha Desai',
    notes: 'Business travel expenses.',
  },
  {
    id: 'EXP-005',
    title: 'Electricity Bill',
    category: 'Utilities',
    amount: 6200,
    date: '2026-10-16',
    paymentMethod: 'Bank Transfer',
    vendor: 'Electricity Provider',
    reference: 'ELE-005',
    status: 'Paid',
    createdBy: 'Karan Joshi',
    notes: 'Office electricity bill.',
  },
  {
    id: 'EXP-006',
    title: 'Marketing Campaign',
    category: 'Marketing',
    amount: 8500,
    date: '2026-10-15',
    paymentMethod: 'UPI',
    vendor: 'Digital Marketing Agency',
    reference: 'MKT-006',
    status: 'Pending',
    createdBy: 'Rahul Shah',
    notes: 'Online advertising campaign expenses.',
  },
  {
    id: 'EXP-007',
    title: 'Equipment Repair',
    category: 'Maintenance',
    amount: 2750,
    date: '2026-10-14',
    paymentMethod: 'Cash',
    vendor: 'City Repair Services',
    reference: 'REP-007',
    status: 'Paid',
    createdBy: 'Priya Patel',
    notes: 'Repair and maintenance of office equipment.',
  },
  {
    id: 'EXP-008',
    title: 'Business Lunch',
    category: 'Meals',
    amount: 1800,
    date: '2026-10-13',
    paymentMethod: 'Card',
    vendor: 'The Business Cafe',
    reference: 'MEAL-008',
    status: 'Rejected',
    createdBy: 'Aarav Mehta',
    notes: 'Client meeting lunch expense.',
  },
]

const currency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)

const formatDate = (date) => {
  if (!date) return '—'

  const parsedDate = new Date(`${date}T00:00:00`)

  if (Number.isNaN(parsedDate.getTime())) return date

  return parsedDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const statusStyles = {
  Paid: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  Rejected: 'bg-red-50 text-red-700 ring-red-200',
  Cancelled: 'bg-slate-100 text-slate-600 ring-slate-200',
}

const DetailItem = ({ icon: Icon, label, value }) => (
  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
    <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
      <Icon size={15} />
      {label}
    </div>

    <p className="mt-2 break-words text-sm font-semibold text-slate-800">{value || '—'}</p>
  </div>
)

export default function ExpenseDetails() {
  const { id } = useParams()

  const expense = sampleExpenses.find((item) => item.id === id)

  useEffect(() => {
    document.title = expense ? `${expense.id} | MineERP` : 'Expense Not Found | MineERP'
  }, [expense])

  const breadcrumbItems = [
    { title: 'Expenses', link: '/company/expenses' },
    { title: expense ? expense.id : 'Expense Details', link: null },
  ]

  if (!expense) {
    return (
      <section className="space-y-5 pt-2">
        <BreadCrumb items={breadcrumbItems} />

        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
          <Receipt size={36} className="mx-auto text-slate-400" />

          <h1 className="mt-4 text-xl font-bold text-slate-900">Expense Not Found</h1>

          <p className="mt-2 text-sm text-slate-500">The expense ID does not match any available sample expense.</p>

          <Link to="/company/expenses" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-erp-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-erp-primary-hover">
            <ArrowLeft size={16} />
            Back to Expenses
          </Link>
        </div>
      </section>
    )
  }

  const StatusIcon = expense.status === 'Paid' || expense.status === 'Approved' ? CheckCircle2 : expense.status === 'Rejected' || expense.status === 'Cancelled' ? XCircle : Clock3

  return (
    <section className="space-y-5 pb-10">
      <BreadCrumb items={breadcrumbItems} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Expense Details</h1>

          <p className="mt-1 text-sm text-slate-500">View expense information and payment status.</p>
        </div>

        <Link to={`/company/expenses/${expense.id}/edit`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-erp-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-erp-primary-hover">
          <Pencil size={17} />
          Edit Expense
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-erp-primary-light text-erp-primary">
              <Receipt size={26} />
            </div>

            <div>
              <p className="text-sm text-slate-500">Expense ID</p>

              <h2 className="mt-1 text-xl font-bold text-slate-900">{expense.id}</h2>

              <p className="mt-1 text-xs text-slate-500">Reference: {expense.reference}</p>
            </div>
          </div>

          <div className="sm:text-right">
            <p className="text-sm text-slate-500">Expense Amount</p>

            <p className="mt-1 text-2xl font-bold text-slate-900">{currency(expense.amount)}</p>

            <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${statusStyles[expense.status] || statusStyles.Pending}`}>
              <StatusIcon size={14} />
              {expense.status}
            </span>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-base font-semibold text-slate-900">Expense Information</h3>

            <span className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-erp-primary-light px-3 py-1.5 text-xs font-semibold text-erp-primary">
              <Tag size={14} />
              {expense.category}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <DetailItem icon={Hash} label="Expense ID" value={expense.id} />

            <DetailItem icon={FileText} label="Expense Title" value={expense.title} />

            <DetailItem icon={Tag} label="Category" value={expense.category} />

            <DetailItem icon={CalendarDays} label="Expense Date" value={formatDate(expense.date)} />

            <DetailItem icon={CreditCard} label="Payment Method" value={expense.paymentMethod} />

            <DetailItem icon={Building2} label="Vendor / Payee" value={expense.vendor} />

            <DetailItem icon={UserRound} label="Created By" value={expense.createdBy} />

            <DetailItem icon={IndianRupee} label="Reference Number" value={expense.reference} />

            <DetailItem icon={Wallet} label="Payment Status" value={expense.status} />
          </div>

          <div className="mt-6">
            <h3 className="text-base font-semibold text-slate-900">Notes</h3>

            <div className="mt-3 min-h-20 rounded-xl border border-slate-200 p-4">
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">{expense.notes || 'No notes added for this expense.'}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-100 pt-5">
            <Link to={`/company/expenses/${expense.id}/edit`} className="inline-flex items-center gap-2 rounded-xl border border-erp-primary px-4 py-2.5 text-sm font-semibold text-erp-primary transition hover:bg-erp-primary-light">
              <Pencil size={16} />
              Edit Expense
            </Link>

            <Link to="/company/expenses" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              <ArrowLeft size={16} />
              Back to Expenses
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
