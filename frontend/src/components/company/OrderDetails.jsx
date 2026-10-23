import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, ShoppingCart, UserRound, CalendarDays, FileText, Package, IndianRupee, Truck, CheckCircle2, Clock, XCircle, CreditCard, Hash } from 'lucide-react'

const customers = {
  'CUS-001': {
    name: 'Rahul Shah',
    company: 'Shah Enterprises',
    phone: '9876543210',
    email: 'rahul@example.com',
    address: 'Ahmedabad, Gujarat',
  },
  'CUS-002': {
    name: 'Priya Patel',
    company: 'Patel Retail Store',
    phone: '9876501234',
    email: 'priya@example.com',
    address: 'Surat, Gujarat',
  },
  'CUS-003': {
    name: 'Aarav Mehta',
    company: 'Individual Customer',
    phone: '9876512345',
    email: 'aarav@example.com',
    address: 'Vadodara, Gujarat',
  },
  'CUS-004': {
    name: 'Neha Desai',
    company: 'Desai Distributors',
    phone: '9876523456',
    email: 'neha@example.com',
    address: 'Rajkot, Gujarat',
  },
}

const products = {
  'PRD-001': { name: 'Laptop', sku: 'LAP-001' },
  'PRD-002': { name: 'Wireless Mouse', sku: 'MOU-001' },
  'PRD-003': { name: 'Keyboard', sku: 'KEY-001' },
  'PRD-004': { name: 'Monitor', sku: 'MON-001' },
  'PRD-005': { name: 'USB Cable', sku: 'USB-001' },
}

const orders = {
  'ORD-001': {
    id: 'ORD-001',
    customerId: 'CUS-001',
    orderDate: '2026-10-20',
    deliveryDate: '2026-10-25',
    reference: 'PO-1001',
    status: 'Delivered',
    paymentStatus: 'Paid',
    discount: 500,
    notes: 'Deliver during business hours.',
    items: [
      { productId: 'PRD-002', quantity: 2, price: 750, tax: 18 },
      { productId: 'PRD-003', quantity: 1, price: 1200, tax: 18 },
    ],
  },
  'ORD-002': {
    id: 'ORD-002',
    customerId: 'CUS-002',
    orderDate: '2026-10-19',
    deliveryDate: '2026-10-26',
    reference: 'PO-1002',
    status: 'Processing',
    paymentStatus: 'Partial',
    discount: 0,
    notes: 'Please confirm stock before dispatch.',
    items: [{ productId: 'PRD-004', quantity: 1, price: 12500, tax: 18 }],
  },
  'ORD-003': {
    id: 'ORD-003',
    customerId: 'CUS-003',
    orderDate: '2026-10-18',
    deliveryDate: '2026-10-24',
    reference: 'PO-1003',
    status: 'Pending',
    paymentStatus: 'Unpaid',
    discount: 0,
    notes: 'Customer payment is pending.',
    items: [
      { productId: 'PRD-001', quantity: 1, price: 45000, tax: 18 },
      { productId: 'PRD-005', quantity: 2, price: 250, tax: 5 },
    ],
  },
  'ORD-004': {
    id: 'ORD-004',
    customerId: 'CUS-004',
    orderDate: '2026-10-17',
    deliveryDate: '2026-10-23',
    reference: 'PO-1004',
    status: 'Shipped',
    paymentStatus: 'Paid',
    discount: 1000,
    notes: 'Handle packages carefully.',
    items: [
      { productId: 'PRD-001', quantity: 1, price: 45000, tax: 18 },
      { productId: 'PRD-003', quantity: 2, price: 1200, tax: 18 },
    ],
  },
}

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount)

const formatDate = (date) => {
  if (!date) return 'Not scheduled'

  return new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

const statusStyles = {
  Pending: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  Processing: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  Shipped: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  Delivered: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  Cancelled: 'bg-rose-50 text-rose-700 ring-rose-600/20',
}

const paymentStyles = {
  Paid: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  Partial: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  Unpaid: 'bg-rose-50 text-rose-700 ring-rose-600/20',
}

function InfoItem({ label, value, icon: Icon }) {
  return (
    <div className="flex gap-3">
      {Icon && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
          <Icon size={17} />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-1 break-words text-sm font-medium text-slate-800">{value || '—'}</p>
      </div>
    </div>
  )
}

export default function OrderDetails() {
  const navigate = useNavigate()
  const { id } = useParams()

  const order = orders[id]
  const customer = order ? customers[order.customerId] : null

  if (!order) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <ShoppingCart size={26} />
        </div>
        <h2 className="mt-4 text-xl font-semibold text-slate-900">Order Not Found</h2>
        <p className="mt-2 text-sm text-slate-500">This order is not available in the current sample data.</p>
        <button type="button" onClick={() => navigate('/company/orders')} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-erp-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-erp-primary-hover">
          <ArrowLeft size={17} />
          Back to Orders
        </button>
      </div>
    )
  }

  const subtotal = order.items.reduce((sum, item) => sum + item.quantity * item.price, 0)

  const totalTax = order.items.reduce((sum, item) => sum + item.quantity * item.price * (item.tax / 100), 0)

  const total = Math.max(0, subtotal + totalTax - order.discount)

  const StatusIcon = order.status === 'Delivered' ? CheckCircle2 : order.status === 'Cancelled' ? XCircle : order.status === 'Shipped' ? Truck : Clock

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <button type="button" onClick={() => navigate('/company/orders')} aria-label="Back to orders" className="mt-1 rounded-lg border border-slate-300 bg-white p-2.5 text-slate-600 transition hover:bg-slate-50">
            <ArrowLeft size={18} />
          </button>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{order.id}</h1>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusStyles[order.status] || 'bg-slate-100 text-slate-700 ring-slate-500/20'}`}>
                <StatusIcon size={13} />
                {order.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">Order details and customer information</p>
          </div>
        </div>

        <button
          type="button"
          disabled={order.status === 'Cancelled'}
          onClick={() => navigate(`/company/orders/${order.id}/edit`)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-erp-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-erp-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Pencil size={17} />
          Edit Order
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Order Total</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatCurrency(total)}</p>
          <p className="mt-1 text-xs text-slate-500">{order.items.length} product line(s)</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Order Date</p>
          <p className="mt-2 text-lg font-bold text-slate-900">{formatDate(order.orderDate)}</p>
          <p className="mt-1 text-xs text-slate-500">Order created date</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Expected Delivery</p>
          <p className="mt-2 text-lg font-bold text-slate-900">{formatDate(order.deliveryDate)}</p>
          <p className="mt-1 text-xs text-slate-500">Scheduled delivery date</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Payment Status</p>
          <div className="mt-3">
            <span className={`inline-flex rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ring-inset ${paymentStyles[order.paymentStatus] || 'bg-slate-100 text-slate-700 ring-slate-500/20'}`}>{order.paymentStatus}</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">Payment record status</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
          <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
            <div className="rounded-lg bg-violet-100 p-2 text-erp-primary">
              <UserRound size={19} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Customer Information</h2>
              <p className="mt-0.5 text-xs text-slate-500">Customer associated with this order</p>
            </div>
          </div>

          {customer ? (
            <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2">
              <InfoItem label="Customer Name" value={customer.name} />
              <InfoItem label="Customer ID" value={order.customerId} icon={Hash} />
              <InfoItem label="Company" value={customer.company} icon={Package} />
              <InfoItem label="Phone Number" value={customer.phone} />
              <InfoItem label="Email Address" value={customer.email} />
              <InfoItem label="Address" value={customer.address} icon={Truck} />
            </div>
          ) : (
            <p className="p-5 text-sm text-slate-500">Customer information is unavailable.</p>
          )}
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
            <div className="rounded-lg bg-blue-100 p-2 text-blue-700">
              <FileText size={19} />
            </div>
            <h2 className="font-semibold text-slate-900">Order Information</h2>
          </div>

          <div className="space-y-5 p-5">
            <InfoItem label="Reference / PO Number" value={order.reference} icon={Hash} />
            <InfoItem label="Order Date" value={formatDate(order.orderDate)} icon={CalendarDays} />
            <InfoItem label="Delivery Date" value={formatDate(order.deliveryDate)} icon={Truck} />
            <InfoItem label="Payment Status" value={order.paymentStatus} icon={CreditCard} />
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
          <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
            <Package size={19} />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">Ordered Products</h2>
            <p className="mt-0.5 text-xs text-slate-500">Products, quantities, taxes and line totals</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Product</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">SKU</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Qty</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Unit Price</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Tax</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Line Total</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {order.items.map((item, index) => {
                const product = products[item.productId]
                const lineSubtotal = item.quantity * item.price
                const lineTax = lineSubtotal * (item.tax / 100)

                return (
                  <tr key={`${item.productId}-${index}`}>
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-slate-800">{product?.name || item.productId}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.productId}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">{product?.sku || '—'}</td>
                    <td className="px-5 py-4 text-right text-sm text-slate-600">{item.quantity}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-right text-sm text-slate-600">{formatCurrency(item.price)}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-right text-sm text-slate-600">
                      {item.tax}% ({formatCurrency(lineTax)})
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold text-slate-900">{formatCurrency(lineSubtotal + lineTax)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end border-t border-slate-200 bg-slate-50/60 p-5">
          <div className="w-full max-w-sm space-y-3">
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-medium text-slate-800">{formatCurrency(subtotal)}</span>
            </div>

            <div className="flex justify-between gap-4 text-sm">
              <span className="text-slate-500">Total Tax</span>
              <span className="font-medium text-slate-800">{formatCurrency(totalTax)}</span>
            </div>

            <div className="flex justify-between gap-4 text-sm">
              <span className="text-slate-500">Discount</span>
              <span className="font-medium text-rose-600">−{formatCurrency(order.discount)}</span>
            </div>

            <div className="flex justify-between gap-4 border-t border-slate-300 pt-4">
              <span className="font-semibold text-slate-900">Grand Total</span>
              <span className="text-xl font-bold text-erp-primary">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
          <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
            <FileText size={19} />
          </div>
          <h2 className="font-semibold text-slate-900">Notes & Instructions</h2>
        </div>

        <div className="p-5">
          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">{order.notes || 'No notes have been added to this order.'}</p>
        </div>
      </section>

      <div className="flex justify-end">
        <button type="button" onClick={() => navigate('/company/orders')} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
          <ArrowLeft size={17} />
          Back to Orders
        </button>
      </div>
    </div>
  )
}
