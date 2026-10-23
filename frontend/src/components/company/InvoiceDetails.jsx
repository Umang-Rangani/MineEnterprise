import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, FileText, UserRound, CalendarDays, ShoppingCart, IndianRupee, Pencil, Printer, CheckCircle2, Clock3, AlertCircle, Building2, Hash } from 'lucide-react'

const invoices = {
  'INV-001': {
    id: 'INV-001',
    reference: 'REF-INV-001',
    orderId: 'ORD-001',
    customerId: 'CUS-001',
    customerName: 'Rahul Shah',
    company: 'Shah Enterprises',
    email: 'rahul@example.com',
    phone: '+91 98765 43210',
    address: 'Ahmedabad, Gujarat, India',
    invoiceDate: '2026-10-20',
    dueDate: '2026-10-27',
    status: 'Paid',
    paymentStatus: 'Paid',
    discount: 0,
    notes: 'Payment received in full.',
    items: [
      {
        id: 'PRD-001',
        name: 'Premium Cement',
        quantity: 5,
        price: 500,
        tax: 0,
      },
    ],
  },
  'INV-002': {
    id: 'INV-002',
    reference: 'REF-INV-002',
    orderId: 'ORD-002',
    customerId: 'CUS-002',
    customerName: 'Priya Patel',
    company: 'Patel Retail Store',
    email: 'priya@example.com',
    phone: '+91 98765 12345',
    address: 'Surat, Gujarat, India',
    invoiceDate: '2026-10-19',
    dueDate: '2026-10-26',
    status: 'Sent',
    paymentStatus: 'Partial',
    discount: 250,
    notes: 'Partial payment received. Remaining balance is pending.',
    items: [
      {
        id: 'PRD-002',
        name: 'Steel Rod 10mm',
        quantity: 10,
        price: 650,
        tax: 18,
      },
      {
        id: 'PRD-004',
        name: 'PVC Pipe',
        quantity: 5,
        price: 180,
        tax: 18,
      },
    ],
  },
  'INV-003': {
    id: 'INV-003',
    reference: 'REF-INV-003',
    orderId: 'ORD-003',
    customerId: 'CUS-003',
    customerName: 'Aarav Mehta',
    company: 'Individual Customer',
    email: 'aarav@example.com',
    phone: '+91 98765 11111',
    address: 'Vadodara, Gujarat, India',
    invoiceDate: '2026-10-18',
    dueDate: '2026-10-22',
    status: 'Overdue',
    paymentStatus: 'Unpaid',
    discount: 500,
    notes: 'Payment is overdue. Please contact the customer.',
    items: [
      {
        id: 'PRD-003',
        name: 'Wall Paint 20L',
        quantity: 10,
        price: 2400,
        tax: 18,
      },
      {
        id: 'PRD-001',
        name: 'Premium Cement',
        quantity: 5,
        price: 350,
        tax: 5,
      },
    ],
  },
  'INV-004': {
    id: 'INV-004',
    reference: 'REF-INV-004',
    orderId: 'ORD-004',
    customerId: 'CUS-004',
    customerName: 'Neha Desai',
    company: 'Desai Distributors',
    email: 'neha@example.com',
    phone: '+91 98765 22222',
    address: 'Rajkot, Gujarat, India',
    invoiceDate: '2026-10-17',
    dueDate: '2026-10-24',
    status: 'Paid',
    paymentStatus: 'Paid',
    discount: 1000,
    notes: 'Paid via bank transfer.',
    items: [
      {
        id: 'PRD-005',
        name: 'Construction Sand',
        quantity: 20,
        price: 1200,
        tax: 5,
      },
      {
        id: 'PRD-004',
        name: 'PVC Pipe',
        quantity: 10,
        price: 180,
        tax: 18,
      },
    ],
  },
}

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
  Draft: 'bg-slate-100 text-slate-700',
  Sent: 'bg-blue-50 text-blue-700',
  Paid: 'bg-emerald-50 text-emerald-700',
  Partial: 'bg-amber-50 text-amber-700',
  Unpaid: 'bg-red-50 text-red-700',
  Overdue: 'bg-red-50 text-red-700',
  Cancelled: 'bg-slate-100 text-slate-600',
}

export default function InvoiceDetails() {
  const { id } = useParams()
  const invoice = invoices[id]

  if (!invoice) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-erp-primary-light text-erp-primary">
          <FileText size={28} />
        </div>

        <h2 className="mt-4 text-xl font-bold text-slate-900">Invoice Not Found</h2>

        <p className="mt-2 text-sm text-slate-500">This invoice is not available in the current sample data.</p>

        <Link to="/company/invoices" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-erp-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-erp-primary-hover">
          <ArrowLeft size={16} />
          Back to Invoices
        </Link>
      </div>
    )
  }

  const subtotal = invoice.items.reduce((total, item) => total + item.quantity * item.price, 0)

  const taxTotal = invoice.items.reduce((total, item) => total + (item.quantity * item.price * item.tax) / 100, 0)

  const grandTotal = Math.max(0, subtotal + taxTotal - invoice.discount)

  const paidAmount = invoice.paymentStatus === 'Paid' ? grandTotal : invoice.paymentStatus === 'Partial' ? Math.round(grandTotal * 0.4 * 100) / 100 : 0

  const balanceDue = Math.max(0, grandTotal - paidAmount)

  const statusIcon = invoice.status === 'Paid' ? <CheckCircle2 size={16} /> : invoice.status === 'Overdue' ? <AlertCircle size={16} /> : <Clock3 size={16} />

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Link to="/company/invoices" className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50" aria-label="Back to invoices">
            <ArrowLeft size={19} />
          </Link>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Invoice Details</h1>

              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[invoice.status] || statusStyles.Draft}`}>
                {statusIcon}
                {invoice.status}
              </span>
            </div>

            <p className="mt-1 text-sm text-slate-500">Review invoice information, items and payment summary.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => window.print()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
            <Printer size={16} />
            Print
          </button>

          <Link to={`/company/invoices/${invoice.id}/edit`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-erp-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-erp-primary-hover">
            <Pencil size={16} />
            Edit Invoice
          </Link>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">
              <FileText size={25} />
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Invoice Number</p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">{invoice.id}</h2>
              <p className="mt-1 text-sm text-slate-500">Reference: {invoice.reference || '—'}</p>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 px-4 py-3 sm:min-w-48">
            <p className="text-xs text-slate-500">Grand Total</p>
            <p className="mt-1 text-2xl font-bold text-erp-primary">{currency(grandTotal)}</p>
            <p className="mt-1 text-xs text-slate-500">Payment: {invoice.paymentStatus}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4 sm:p-6">
          <div className="rounded-xl border border-slate-100 p-4">
            <div className="flex items-center gap-2 text-slate-500">
              <CalendarDays size={17} />
              <span className="text-xs font-medium">Invoice Date</span>
            </div>
            <p className="mt-2 font-semibold text-slate-900">{formatDate(invoice.invoiceDate)}</p>
          </div>

          <div className="rounded-xl border border-slate-100 p-4">
            <div className="flex items-center gap-2 text-slate-500">
              <Clock3 size={17} />
              <span className="text-xs font-medium">Due Date</span>
            </div>
            <p className="mt-2 font-semibold text-slate-900">{formatDate(invoice.dueDate)}</p>
          </div>

          <div className="rounded-xl border border-slate-100 p-4">
            <div className="flex items-center gap-2 text-slate-500">
              <ShoppingCart size={17} />
              <span className="text-xs font-medium">Related Order</span>
            </div>
            <p className="mt-2 font-semibold text-slate-900">{invoice.orderId || 'No linked order'}</p>
          </div>

          <div className="rounded-xl border border-slate-100 p-4">
            <div className="flex items-center gap-2 text-slate-500">
              <Hash size={17} />
              <span className="text-xs font-medium">Customer ID</span>
            </div>
            <p className="mt-2 font-semibold text-slate-900">{invoice.customerId}</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <UserRound size={20} />
            </div>
            <h2 className="font-semibold text-slate-900">Bill To</h2>
          </div>

          <div className="mt-5 space-y-3">
            <div>
              <p className="text-lg font-bold text-slate-900">{invoice.customerName}</p>
              <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                <Building2 size={15} className="shrink-0" />
                {invoice.company}
              </p>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Email</p>
              <p className="mt-1 break-all text-sm text-slate-700">{invoice.email}</p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Phone</p>
              <p className="mt-1 text-sm text-slate-700">{invoice.phone}</p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Billing Address</p>
              <p className="mt-1 text-sm text-slate-700">{invoice.address}</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <IndianRupee size={20} />
            </div>
            <h2 className="font-semibold text-slate-900">Payment Summary</h2>
          </div>

          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-500">Invoice Total</span>
              <span className="text-sm font-semibold text-slate-900">{currency(grandTotal)}</span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-500">Paid Amount</span>
              <span className="text-sm font-semibold text-emerald-600">{currency(paidAmount)}</span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-500">Balance Due</span>
              <span className="text-sm font-semibold text-red-600">{currency(balanceDue)}</span>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs text-slate-500">Payment Progress</span>
                <span className="text-xs font-semibold text-slate-700">{grandTotal > 0 ? Math.round((paidAmount / grandTotal) * 100) : 0}%</span>
              </div>

              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{
                    width: `${grandTotal > 0 ? Math.min(100, (paidAmount / grandTotal) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-3">
              {invoice.paymentStatus === 'Paid' ? (
                <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-600" />
              ) : invoice.status === 'Overdue' ? (
                <AlertCircle size={17} className="mt-0.5 shrink-0 text-red-600" />
              ) : (
                <Clock3 size={17} className="mt-0.5 shrink-0 text-amber-600" />
              )}

              <p className="text-xs leading-5 text-slate-600">
                {invoice.paymentStatus === 'Paid' ? 'This invoice is marked as fully paid.' : invoice.status === 'Overdue' ? 'This invoice is overdue. Follow up with the customer for payment.' : 'This invoice has an outstanding balance.'}
              </p>
            </div>
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <ShoppingCart size={20} />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">Invoice Items</h2>
            <p className="text-xs text-slate-500">Products, quantities, tax and line totals.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Product</th>
                <th className="px-4 py-3 font-semibold">Quantity</th>
                <th className="px-4 py-3 font-semibold">Unit Price</th>
                <th className="px-4 py-3 font-semibold">GST</th>
                <th className="px-5 py-3 text-right font-semibold">Total</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {invoice.items.map((item, index) => {
                const lineSubtotal = item.quantity * item.price
                const lineTax = (lineSubtotal * item.tax) / 100

                return (
                  <tr key={`${item.id}-${index}`}>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-800">{item.name}</p>
                      <p className="mt-1 text-xs text-slate-400">{item.id}</p>
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-600">{item.quantity}</td>

                    <td className="px-4 py-4 text-sm text-slate-600">{currency(item.price)}</td>

                    <td className="px-4 py-4 text-sm text-slate-600">
                      {item.tax}% ({currency(lineTax)})
                    </td>

                    <td className="px-5 py-4 text-right text-sm font-semibold text-slate-900">{currency(lineSubtotal + lineTax)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-100 bg-slate-50/60 p-5 sm:p-6">
          <div className="ml-auto w-full space-y-3 sm:max-w-sm">
            <div className="flex justify-between gap-4 text-sm text-slate-600">
              <span>Subtotal</span>
              <span>{currency(subtotal)}</span>
            </div>

            <div className="flex justify-between gap-4 text-sm text-slate-600">
              <span>Total GST</span>
              <span>{currency(taxTotal)}</span>
            </div>

            <div className="flex justify-between gap-4 text-sm text-slate-600">
              <span>Discount</span>
              <span className="text-red-600">− {currency(invoice.discount)}</span>
            </div>

            <div className="flex justify-between gap-4 border-t border-slate-200 pt-4">
              <span className="font-semibold text-slate-900">Grand Total</span>
              <span className="text-xl font-bold text-erp-primary">{currency(grandTotal)}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="font-semibold text-slate-900">Notes & Terms</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{invoice.notes || 'No additional notes.'}</p>
      </section>

      <div className="flex justify-start">
        <Link to="/company/invoices" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
          <ArrowLeft size={16} />
          Back to Invoices
        </Link>
      </div>
    </div>
  )
}
