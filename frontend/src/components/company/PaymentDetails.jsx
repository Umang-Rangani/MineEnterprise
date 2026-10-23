import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Wallet, CalendarDays, CreditCard, FileText, UserRound, Hash, CheckCircle2, Clock3, XCircle, IndianRupee } from 'lucide-react'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'

const samplePayments = [
  {
    id: 'PAY-001',
    invoiceId: 'INV-001',
    customer: 'Rahul Shah',
    date: '2026-10-20',
    method: 'Bank Transfer',
    reference: 'TXN-982341',
    amount: 2500,
    status: 'Completed',
    notes: 'Payment received through bank transfer.',
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
    notes: 'Payment received successfully through UPI.',
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
    notes: 'Payment confirmation is pending.',
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
    notes: 'Cheque payment recorded.',
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
    notes: 'Transaction failed. Please verify the reference.',
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
    notes: 'Payment received through bank transfer.',
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
    notes: 'Card payment recorded.',
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
    notes: 'Awaiting payment confirmation.',
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
  Completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  Failed: 'bg-red-50 text-red-700 ring-red-200',
  Refunded: 'bg-slate-100 text-slate-600 ring-slate-200',
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

export default function PaymentDetails() {
  const { id } = useParams()

  const payment = samplePayments.find((item) => item.id === id)

  useEffect(() => {
    document.title = payment ? `${payment.id} | MineERP` : 'Payment Not Found | MineERP'
  }, [payment])

  const items = [
    { title: 'Payments', link: '/company/payments' },
    { title: payment ? payment.id : 'Payment Details', link: null },
  ]

  if (!payment) {
    return (
      <section className="space-y-5 pt-2">
        <BreadCrumb items={items} />

        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
          <Wallet size={36} className="mx-auto text-slate-400" />

          <h1 className="mt-4 text-xl font-bold text-slate-900">Payment Not Found</h1>

          <p className="mt-2 text-sm text-slate-500">The payment ID does not match any available sample payment.</p>

          <Link to="/company/payments" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-erp-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-erp-primary-hover">
            <ArrowLeft size={16} />
            Back to Payments
          </Link>
        </div>
      </section>
    )
  }

  const StatusIcon = payment.status === 'Completed' ? CheckCircle2 : payment.status === 'Failed' ? XCircle : Clock3

  return (
    <section className="space-y-5 pt-2 pb-8">
      <BreadCrumb items={items} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link to="/company/payments" className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-erp-primary">
            <ArrowLeft size={16} />
            Back to Payments
          </Link>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Payment Details</h1>

          <p className="mt-1 text-sm text-slate-500">View transaction information and payment status.</p>
        </div>

        <Link to={`/company/payments/${payment.id}/edit`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-erp-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-erp-primary-hover">
          <Pencil size={17} />
          Edit Payment
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-erp-primary-light text-erp-primary">
              <Wallet size={26} />
            </div>

            <div>
              <p className="text-sm text-slate-500">Payment ID</p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">{payment.id}</h2>
              <p className="mt-1 text-xs text-slate-500">Reference: {payment.reference}</p>
            </div>
          </div>

          <div className="sm:text-right">
            <p className="text-sm text-slate-500">Payment Amount</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{currency(payment.amount)}</p>

            <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${statusStyles[payment.status] || statusStyles.Pending}`}>
              <StatusIcon size={14} />
              {payment.status}
            </span>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <h3 className="text-base font-semibold text-slate-900">Transaction Information</h3>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <DetailItem icon={Hash} label="Payment ID" value={payment.id} />

            <DetailItem icon={FileText} label="Invoice ID" value={payment.invoiceId} />

            <DetailItem icon={UserRound} label="Customer" value={payment.customer} />

            <DetailItem icon={CalendarDays} label="Payment Date" value={formatDate(payment.date)} />

            <DetailItem icon={CreditCard} label="Payment Method" value={payment.method} />

            <DetailItem icon={IndianRupee} label="Transaction Reference" value={payment.reference} />
          </div>

          <div className="mt-6">
            <h3 className="text-base font-semibold text-slate-900">Notes</h3>

            <div className="mt-3 rounded-xl border border-slate-200 p-4">
              <p className="text-sm leading-6 text-slate-600">{payment.notes}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-100 pt-5">
            <Link to={`/company/invoices/${payment.invoiceId}`} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              <FileText size={16} />
              View Invoice
            </Link>

            <Link to="/company/payments" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              <ArrowLeft size={16} />
              Back to Payments
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
