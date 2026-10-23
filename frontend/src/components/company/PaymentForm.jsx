import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, CreditCard, FileText, IndianRupee, Save, Wallet, UserRound, Smartphone, Banknote, ReceiptText } from 'lucide-react'

import BreadCrumb from '../../BreadCrumb/BreadCrumb'

const sampleInvoices = [
  { id: 'INV-001', customer: 'Rahul Shah', total: 12000, paid: 9500 },
  { id: 'INV-002', customer: 'Priya Patel', total: 18000, paid: 13000 },
  { id: 'INV-003', customer: 'Aarav Mehta', total: 25000, paid: 0 },
  { id: 'INV-004', customer: 'Neha Desai', total: 15000, paid: 0 },
  { id: 'INV-005', customer: 'Karan Joshi', total: 15000, paid: 5200 },
  { id: 'INV-006', customer: 'Rahul Shah', total: 25000, paid: 5000 },
  { id: 'INV-007', customer: 'Priya Patel', total: 20000, paid: 3300 },
  { id: 'INV-008', customer: 'Ananya Shah', total: 10000, paid: 6500 },
]

const samplePayments = [
  {
    id: 'PAY-001',
    invoiceId: 'INV-001',
    date: '2026-10-18',
    amount: 4500,
    method: 'UPI',
    reference: 'UPI-928341',
    status: 'Completed',
    notes: 'Part payment received.',
  },
  {
    id: 'PAY-002',
    invoiceId: 'INV-002',
    date: '2026-10-17',
    amount: 8000,
    method: 'Bank Transfer',
    reference: 'NEFT-721904',
    status: 'Completed',
    notes: '',
  },
  {
    id: 'PAY-003',
    invoiceId: 'INV-003',
    date: '2026-10-16',
    amount: 12000,
    method: 'Card',
    reference: 'CARD-563219',
    status: 'Pending',
    notes: 'Awaiting confirmation.',
  },
  {
    id: 'PAY-004',
    invoiceId: 'INV-004',
    date: '2026-10-15',
    amount: 7500,
    method: 'Cash',
    reference: '',
    status: 'Completed',
    notes: '',
  },
  {
    id: 'PAY-005',
    invoiceId: 'INV-005',
    date: '2026-10-14',
    amount: 9800,
    method: 'UPI',
    reference: 'UPI-672891',
    status: 'Completed',
    notes: '',
  },
  {
    id: 'PAY-006',
    invoiceId: 'INV-006',
    date: '2026-10-13',
    amount: 5000,
    method: 'Cheque',
    reference: 'CHQ-108294',
    status: 'Pending',
    notes: 'Cheque clearance pending.',
  },
  {
    id: 'PAY-007',
    invoiceId: 'INV-007',
    date: '2026-10-12',
    amount: 3300,
    method: 'Bank Transfer',
    reference: 'NEFT-902137',
    status: 'Completed',
    notes: '',
  },
  {
    id: 'PAY-008',
    invoiceId: 'INV-008',
    date: '2026-10-11',
    amount: 6500,
    method: 'UPI',
    reference: 'UPI-731902',
    status: 'Failed',
    notes: 'Transaction failed.',
  },
]

const paymentMethods = [
  { label: 'Cash', value: 'Cash', icon: Banknote },
  { label: 'UPI', value: 'UPI', icon: Smartphone },
  { label: 'Card', value: 'Card', icon: CreditCard },
  { label: 'Bank Transfer', value: 'Bank Transfer', icon: Wallet },
  { label: 'Cheque', value: 'Cheque', icon: ReceiptText },
]

const currency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)

const today = new Date().toLocaleDateString('en-CA')

const inputClass = 'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10'

const labelClass = 'text-sm font-medium text-slate-700'

const emptyForm = {
  paymentId: 'PAY-009',
  date: today,
  invoiceId: '',
  amount: '',
  method: 'UPI',
  reference: '',
  status: 'Completed',
  notes: '',
}

export default function PaymentForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [saved, setSaved] = useState(false)
  const [notFound, setNotFound] = useState(false)

  const editingPayment = samplePayments.find((payment) => payment.id === id)

  const selectedInvoice = sampleInvoices.find((invoice) => invoice.id === form.invoiceId)

  const pendingBalance = selectedInvoice ? selectedInvoice.total - selectedInvoice.paid : 0

  // Edit mode: load the selected sample payment into the form.
  useEffect(() => {
    if (!isEdit) {
      setForm(emptyForm)
      setNotFound(false)
      return
    }

    if (!editingPayment) {
      setNotFound(true)
      return
    }

    setNotFound(false)
    setForm({
      paymentId: editingPayment.id,
      date: editingPayment.date,
      invoiceId: editingPayment.invoiceId,
      amount: String(editingPayment.amount),
      method: editingPayment.method,
      reference: editingPayment.reference,
      status: editingPayment.status,
      notes: editingPayment.notes,
    })
  }, [id, isEdit])

  useEffect(() => {
    document.title = isEdit ? 'Edit Payment | MineERP' : 'Record Payment | MineERP'
  }, [isEdit])

  const updateField = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }))

    setErrors((previous) => ({
      ...previous,
      [field]: '',
    }))

    setSaved(false)
  }

  const handleInvoiceChange = (invoiceId) => {
    const invoice = sampleInvoices.find((item) => item.id === invoiceId)

    setForm((previous) => ({
      ...previous,
      invoiceId,
      amount: invoice ? String(invoice.total - invoice.paid + (isEdit && editingPayment?.invoiceId === invoiceId ? editingPayment.amount : 0)) : '',
    }))

    setErrors((previous) => ({
      ...previous,
      invoiceId: '',
      amount: '',
    }))

    setSaved(false)
  }

  const validateForm = () => {
    const nextErrors = {}

    if (!form.date) {
      nextErrors.date = 'Please select a payment date.'
    }

    if (!form.invoiceId) {
      nextErrors.invoiceId = 'Please select an invoice.'
    }

    const amount = Number(form.amount)

    const maxAllowedAmount = selectedInvoice ? pendingBalance + (isEdit && editingPayment?.invoiceId === form.invoiceId ? editingPayment.amount : 0) : 0

    if (!form.amount || amount <= 0) {
      nextErrors.amount = 'Enter an amount greater than zero.'
    } else if (amount > maxAllowedAmount) {
      nextErrors.amount = `Amount cannot exceed ${currency(maxAllowedAmount)}.`
    }

    if (!form.method) {
      nextErrors.method = 'Please select a payment method.'
    }

    if (['UPI', 'Card', 'Bank Transfer', 'Cheque'].includes(form.method) && !form.reference.trim()) {
      nextErrors.reference = 'Enter the transaction/reference number.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!validateForm()) return

    // UI-only demo: does not save or update sample data.
    setSaved(true)
  }

  const pageTitle = isEdit ? 'Edit Payment' : 'Record Payment'

  const breadcrumbItems = [
    { title: 'Payments', link: '/company/payments' },
    { title: pageTitle, link: null },
  ]

  if (notFound) {
    return (
      <section className="space-y-5 pb-8 pt-2">
        <BreadCrumb
          items={[
            { title: 'Payments', link: '/company/payments' },
            { title: 'Payment Not Found', link: null },
          ]}
        />

        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <FileText size={24} />
          </div>

          <h1 className="mt-4 text-xl font-bold text-slate-900">Payment not found</h1>

          <p className="mt-2 text-sm text-slate-500">The payment ID does not match any available sample payment.</p>

          <button type="button" onClick={() => navigate('/company/payments')} className="mt-5 rounded-xl bg-erp-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-erp-primary-hover">
            Back to Payments
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-5 pb-8 pt-2">
      <BreadCrumb items={breadcrumbItems} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">
            <Wallet size={21} />
          </span>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{pageTitle}</h1>
            <p className="mt-1 text-sm text-slate-500">{isEdit ? 'Review and update the payment details.' : 'Record a customer payment against an invoice.'}</p>
          </div>
        </div>

        <Link to="/company/payments" className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
          <ArrowLeft size={17} />
          Back to Payments
        </Link>
      </div>

      {saved && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <span className="mt-0.5 text-emerald-600">
            <Save size={19} />
          </span>

          <div>
            <p className="text-sm font-semibold text-emerald-800">{isEdit ? 'Payment details validated successfully' : 'Payment validated successfully'}</p>
            <p className="mt-1 text-sm text-emerald-700">UI-only demo: changes have not been saved to a database and the invoice balance has not been updated.</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="space-y-5 xl:col-span-2">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-erp-primary-light text-erp-primary">
                  <FileText size={19} />
                </span>

                <div>
                  <h2 className="font-semibold text-slate-900">Payment Information</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Basic details for this transaction</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Payment ID</label>
                  <input value={form.paymentId} readOnly className={`${inputClass} bg-slate-50 font-semibold text-slate-500`} />
                  <p className="mt-1 text-xs text-slate-400">{isEdit ? 'Existing sample payment reference' : 'Demo-generated reference'}</p>
                </div>

                <div>
                  <label className={labelClass}>
                    Payment Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <CalendarDays size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="date" value={form.date} onChange={(event) => updateField('date', event.target.value)} className={`${inputClass} pl-10`} />
                  </div>
                  {errors.date && <p className="mt-1 text-xs text-red-600">{errors.date}</p>}
                </div>

                <div className="sm:col-span-2">
                  <label className={labelClass}>
                    Invoice <span className="text-red-500">*</span>
                  </label>
                  <select value={form.invoiceId} onChange={(event) => handleInvoiceChange(event.target.value)} className={inputClass}>
                    <option value="">Select an invoice</option>
                    {sampleInvoices.map((invoice) => (
                      <option key={invoice.id} value={invoice.id}>
                        {invoice.id} — {invoice.customer} — Balance: {currency(invoice.total - invoice.paid + (isEdit && editingPayment?.invoiceId === invoice.id ? editingPayment.amount : 0))}
                      </option>
                    ))}
                  </select>
                  {errors.invoiceId && <p className="mt-1 text-xs text-red-600">{errors.invoiceId}</p>}
                </div>

                {selectedInvoice && (
                  <div className="sm:col-span-2">
                    <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 sm:grid-cols-3">
                      <div>
                        <p className="text-xs text-slate-500">Customer</p>
                        <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                          <UserRound size={15} className="text-slate-400" />
                          {selectedInvoice.customer}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">Invoice Total</p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">{currency(selectedInvoice.total)}</p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">Pending Balance</p>
                        <p className="mt-1 text-sm font-bold text-amber-600">{currency(pendingBalance)}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className={labelClass}>
                    Payment Amount <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <IndianRupee size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => updateField('amount', event.target.value)} placeholder="Enter amount" className={`${inputClass} pl-9`} />
                  </div>
                  {errors.amount && <p className="mt-1 text-xs text-red-600">{errors.amount}</p>}
                </div>

                <div>
                  <label className={labelClass}>Payment Status</label>
                  <select value={form.status} onChange={(event) => updateField('status', event.target.value)} className={inputClass}>
                    <option value="Completed">Completed</option>
                    <option value="Pending">Pending</option>
                    <option value="Failed">Failed</option>
                  </select>
                  <p className="mt-1 text-xs text-slate-400">Sample status only; not gateway-verified</p>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <CreditCard size={19} />
                </span>

                <div>
                  <h2 className="font-semibold text-slate-900">Payment Method</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Select how the payment was received</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3">
                {paymentMethods.map((method) => {
                  const MethodIcon = method.icon
                  const isSelected = form.method === method.value

                  return (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => updateField('method', method.value)}
                      className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                        isSelected ? 'border-erp-primary bg-erp-primary-light/60 text-erp-primary ring-2 ring-erp-primary/10' : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isSelected ? 'bg-white text-erp-primary' : 'bg-slate-100 text-slate-500'}`}>
                        <MethodIcon size={18} />
                      </span>
                      <span className="text-sm font-semibold">{method.label}</span>
                    </button>
                  )
                })}
              </div>

              <div className="px-5 pb-5">
                <label className={labelClass}>
                  Transaction / Reference Number
                  {form.method !== 'Cash' && <span className="text-red-500"> *</span>}
                </label>

                <input value={form.reference} onChange={(event) => updateField('reference', event.target.value)} placeholder={form.method === 'Cash' ? 'Optional cash receipt number' : 'Enter transaction or reference number'} className={inputClass} />

                {errors.reference && <p className="mt-1 text-xs text-red-600">{errors.reference}</p>}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <FileText size={19} />
                </span>

                <div>
                  <h2 className="font-semibold text-slate-900">Additional Notes</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Optional transaction notes</p>
                </div>
              </div>

              <div className="p-5">
                <label className={labelClass}>Notes</label>
                <textarea rows={4} value={form.notes} onChange={(event) => updateField('notes', event.target.value)} placeholder="Add any relevant payment details..." className={`${inputClass} resize-y`} />
              </div>
            </div>
          </div>

          <aside className="h-fit overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:sticky xl:top-5">
            <div className="bg-erp-primary px-5 py-5 text-white">
              <div className="flex items-center gap-2 text-white/80">
                <Wallet size={19} />
                <span className="text-sm font-medium">Payment Summary</span>
              </div>

              <p className="mt-4 text-xs text-white/70">Amount being {isEdit ? 'updated' : 'recorded'}</p>
              <p className="mt-1 text-3xl font-bold">{currency(form.amount)}</p>
            </div>

            <div className="space-y-4 p-5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-500">Payment ID</span>
                <span className="font-semibold text-slate-800">{form.paymentId}</span>
              </div>

              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-500">Invoice</span>
                <span className="font-semibold text-slate-800">{form.invoiceId || 'Not selected'}</span>
              </div>

              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-500">Method</span>
                <span className="font-semibold text-slate-800">{form.method}</span>
              </div>

              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-500">Status</span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${form.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' : form.status === 'Pending' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                  {form.status}
                </span>
              </div>

              <div className="border-t border-dashed border-slate-200 pt-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-500">Invoice Balance</span>
                  <span className="text-sm font-bold text-amber-600">{currency(pendingBalance)}</span>
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs leading-relaxed text-amber-800">Demo mode: submitting validates this form only. No payment is saved and no invoice balance is changed.</p>
              </div>

              <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-erp-primary px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-erp-primary-hover">
                <Save size={17} />
                {isEdit ? 'Validate Changes' : 'Validate Payment'}
              </button>

              <button type="button" onClick={() => navigate('/company/payments')} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </aside>
        </div>
      </form>
    </section>
  )
}
