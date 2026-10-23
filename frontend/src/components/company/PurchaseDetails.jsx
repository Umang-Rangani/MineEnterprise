import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, ShoppingCart, Building2, CalendarDays, FileText, Package, IndianRupee, CheckCircle2, Clock, CreditCard, Receipt } from 'lucide-react'

const samplePurchases = [
  {
    id: 'PUR-001',
    supplierId: 'SUP-001',
    supplier: 'Shreeji Suppliers',
    supplierEmail: 'sales@shreejisuppliers.example',
    supplierPhone: '+91 98765 43210',
    supplierAddress: 'CG Road, Ahmedabad, Gujarat',
    purchaseDate: '2026-10-18',
    dueDate: '2026-11-02',
    reference: 'INV-SUP-101',
    paymentStatus: 'Paid',
    status: 'Received',
    notes: 'Regular stock purchase.',
    items: [
      {
        productId: 'PRD-001',
        name: 'Office Chair',
        quantity: 5,
        price: 3500,
        tax: 18,
      },
      {
        productId: 'PRD-002',
        name: 'Office Table',
        quantity: 2,
        price: 6500,
        tax: 18,
      },
    ],
  },
  {
    id: 'PUR-002',
    supplierId: 'SUP-002',
    supplier: 'Patel Trading Co.',
    supplierEmail: 'orders@pateltrading.example',
    supplierPhone: '+91 98765 12345',
    supplierAddress: 'Ring Road, Surat, Gujarat',
    purchaseDate: '2026-10-16',
    dueDate: '2026-10-31',
    reference: 'INV-SUP-102',
    paymentStatus: 'Partial',
    status: 'Received',
    notes: 'Partial payment recorded.',
    items: [
      {
        productId: 'PRD-003',
        name: 'Printer Paper',
        quantity: 10,
        price: 450,
        tax: 12,
      },
    ],
  },
  {
    id: 'PUR-003',
    supplierId: 'SUP-003',
    supplier: 'Arihant Industries',
    supplierEmail: 'sales@arihantindustries.example',
    supplierPhone: '+91 98765 67890',
    supplierAddress: 'GIDC, Vadodara, Gujarat',
    purchaseDate: '2026-10-15',
    dueDate: '2026-10-30',
    reference: 'INV-SUP-103',
    paymentStatus: 'Unpaid',
    status: 'Pending',
    notes: 'Awaiting stock delivery.',
    items: [
      {
        productId: 'PRD-004',
        name: 'Keyboard',
        quantity: 20,
        price: 850,
        tax: 18,
      },
      {
        productId: 'PRD-005',
        name: 'Mouse',
        quantity: 20,
        price: 500,
        tax: 18,
      },
    ],
  },
]

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount)

const formatDate = (date) => {
  if (!date) return '—'

  return new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function PurchaseDetails() {
  const navigate = useNavigate()
  const { id } = useParams()

  const purchase = samplePurchases.find((item) => item.id === id)

  if (!purchase) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <ShoppingCart size={26} />
        </div>

        <h1 className="mt-4 text-xl font-bold text-slate-900">Purchase Not Found</h1>

        <p className="mt-2 text-sm text-slate-500">The purchase ID is not available in the current sample data.</p>

        <button type="button" onClick={() => navigate('/company/purchases')} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-erp-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-erp-primary-hover">
          <ArrowLeft size={17} />
          Back to Purchases
        </button>
      </div>
    )
  }

  const subtotal = purchase.items.reduce((sum, item) => sum + item.quantity * item.price, 0)

  const totalTax = purchase.items.reduce((sum, item) => sum + item.quantity * item.price * (item.tax / 100), 0)

  const grandTotal = subtotal + totalTax

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
        <div className="flex items-start gap-3">
          <button type="button" onClick={() => navigate('/company/purchases')} aria-label="Back to purchases" className="mt-1 rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100">
            <ArrowLeft size={19} />
          </button>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Purchase Details</h1>

              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusClasses[purchase.status]}`}>{purchase.status}</span>
            </div>

            <p className="mt-1 text-sm text-slate-500">Purchase ID: {purchase.id}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => navigate('/company/purchases')} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
            Back to List
          </button>

          {purchase.status !== 'Cancelled' && (
            <button
              type="button"
              onClick={() => navigate(`/company/purchases/${purchase.id}/edit`)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-erp-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-erp-primary-hover"
            >
              <Pencil size={17} />
              Edit Purchase
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Purchase Total</p>
            <div className="rounded-lg bg-violet-100 p-2.5 text-violet-700">
              <IndianRupee size={20} />
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold text-slate-900">{formatCurrency(grandTotal)}</p>
          <p className="mt-1 text-xs text-slate-500">Including item taxes</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Total Items</p>
            <div className="rounded-lg bg-blue-100 p-2.5 text-blue-700">
              <Package size={20} />
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold text-slate-900">{purchase.items.length}</p>
          <p className="mt-1 text-xs text-slate-500">Different product lines</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Payment Status</p>
            <div className="rounded-lg bg-emerald-100 p-2.5 text-emerald-700">
              <CreditCard size={20} />
            </div>
          </div>
          <p className="mt-4">
            <span className={`inline-flex rounded-full px-2.5 py-1 text-sm font-semibold ring-1 ring-inset ${paymentClasses[purchase.paymentStatus]}`}>{purchase.paymentStatus}</span>
          </p>
          <p className="mt-2 text-xs text-slate-500">Payment record status</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Purchase Date</p>
            <div className="rounded-lg bg-amber-100 p-2.5 text-amber-700">
              <CalendarDays size={20} />
            </div>
          </div>
          <p className="mt-4 text-lg font-bold text-slate-900">{formatDate(purchase.purchaseDate)}</p>
          <p className="mt-1 text-xs text-slate-500">Due: {formatDate(purchase.dueDate)}</p>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
          <div className="rounded-lg bg-violet-100 p-2 text-violet-700">
            <Building2 size={19} />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">Supplier Information</h2>
            <p className="mt-0.5 text-sm text-slate-500">Supplier details associated with this purchase.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 xl:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Supplier Name</p>
            <p className="mt-1.5 text-sm font-semibold text-slate-900">{purchase.supplier}</p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Supplier ID</p>
            <p className="mt-1.5 text-sm font-medium text-slate-800">{purchase.supplierId}</p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Supplier Invoice / Reference</p>
            <p className="mt-1.5 text-sm font-medium text-slate-800">{purchase.reference || '—'}</p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Email</p>
            <p className="mt-1.5 break-words text-sm text-slate-700">{purchase.supplierEmail}</p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Phone</p>
            <p className="mt-1.5 text-sm text-slate-700">{purchase.supplierPhone}</p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Address</p>
            <p className="mt-1.5 text-sm leading-6 text-slate-700">{purchase.supplierAddress}</p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
          <div className="rounded-lg bg-blue-100 p-2 text-blue-700">
            <ShoppingCart size={19} />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">Purchased Products</h2>
            <p className="mt-0.5 text-sm text-slate-500">Product quantities, unit prices and applicable tax.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Product</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Qty</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Unit Price</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Subtotal</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Tax</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Total</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {purchase.items.map((item, index) => {
                const lineSubtotal = item.quantity * item.price
                const lineTax = lineSubtotal * (item.tax / 100)

                return (
                  <tr key={`${item.productId}-${index}`}>
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.productId}</p>
                    </td>

                    <td className="px-5 py-4 text-right text-sm text-slate-700">{item.quantity}</td>

                    <td className="whitespace-nowrap px-5 py-4 text-right text-sm text-slate-700">{formatCurrency(item.price)}</td>

                    <td className="whitespace-nowrap px-5 py-4 text-right text-sm text-slate-700">{formatCurrency(lineSubtotal)}</td>

                    <td className="whitespace-nowrap px-5 py-4 text-right text-sm text-slate-700">
                      {item.tax}% ({formatCurrency(lineTax)})
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold text-slate-900">{formatCurrency(lineSubtotal + lineTax)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end border-t border-slate-200 bg-slate-50/70 p-5">
          <div className="w-full space-y-3 sm:max-w-sm">
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-medium text-slate-800">{formatCurrency(subtotal)}</span>
            </div>

            <div className="flex justify-between gap-4 text-sm">
              <span className="text-slate-500">Total Tax</span>
              <span className="font-medium text-slate-800">{formatCurrency(totalTax)}</span>
            </div>

            <div className="flex justify-between gap-4 border-t border-slate-200 pt-3">
              <span className="font-semibold text-slate-900">Grand Total</span>
              <span className="text-xl font-bold text-erp-primary">{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">{purchase.status === 'Received' ? <CheckCircle2 size={19} /> : <Clock size={19} />}</div>
            <div>
              <h2 className="font-semibold text-slate-900">Purchase Status</h2>
              <p className="mt-0.5 text-sm text-slate-500">Current purchase processing status.</p>
            </div>
          </div>

          <div className="mt-5">
            <span className={`inline-flex rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ring-inset ${statusClasses[purchase.status]}`}>{purchase.status}</span>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {purchase.status === 'Received'
                ? 'The purchase is marked as received in the sample data.'
                : purchase.status === 'Pending'
                  ? 'This purchase is waiting for its next processing step or stock receipt.'
                  : 'This purchase has been cancelled in the sample data.'}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
              <Receipt size={19} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Notes & Payment</h2>
              <p className="mt-0.5 text-sm text-slate-500">Additional purchase information.</p>
            </div>
          </div>

          <div className="mt-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Payment Status</p>
            <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${paymentClasses[purchase.paymentStatus]}`}>{purchase.paymentStatus}</span>

            <p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-500">Purchase Notes</p>
            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-slate-700">{purchase.notes || 'No additional notes.'}</p>
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button type="button" onClick={() => navigate('/company/purchases')} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
          <ArrowLeft size={17} />
          Back to Purchases
        </button>
      </div>
    </div>
  )
}
