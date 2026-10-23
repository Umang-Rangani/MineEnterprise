import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Save, FileText, UserRound, CalendarDays, ShoppingCart, IndianRupee, CheckCircle2, AlertCircle } from 'lucide-react'

const customers = [
  { id: 'CUS-001', name: 'Rahul Shah', company: 'Shah Enterprises' },
  { id: 'CUS-002', name: 'Priya Patel', company: 'Patel Retail Store' },
  { id: 'CUS-003', name: 'Aarav Mehta', company: 'Individual Customer' },
  { id: 'CUS-004', name: 'Neha Desai', company: 'Desai Distributors' },
  { id: 'CUS-005', name: 'Karan Joshi', company: 'Joshi Traders' },
  { id: 'CUS-006', name: 'Ananya Shah', company: 'Individual Customer' },
]

const orders = [
  { id: 'ORD-001', customerId: 'CUS-001', amount: 2500 },
  { id: 'ORD-002', customerId: 'CUS-002', amount: 14750 },
  { id: 'ORD-003', customerId: 'CUS-003', amount: 54000 },
  { id: 'ORD-004', customerId: 'CUS-004', amount: 32000 },
  { id: 'ORD-005', customerId: 'CUS-005', amount: 9800 },
  { id: 'ORD-006', customerId: 'CUS-001', amount: 42500 },
  { id: 'ORD-007', customerId: 'CUS-002', amount: 16700 },
  { id: 'ORD-008', customerId: 'CUS-006', amount: 5500 },
]

const products = [
  { id: 'PRD-001', name: 'Premium Cement', price: 350 },
  { id: 'PRD-002', name: 'Steel Rod 10mm', price: 650 },
  { id: 'PRD-003', name: 'Wall Paint 20L', price: 2400 },
  { id: 'PRD-004', name: 'PVC Pipe', price: 180 },
  { id: 'PRD-005', name: 'Construction Sand', price: 1200 },
]

const existingInvoices = {
  'INV-001': {
    customerId: 'CUS-001',
    orderId: 'ORD-001',
    invoiceDate: '2026-10-20',
    dueDate: '2026-10-27',
    reference: 'REF-INV-001',
    status: 'Paid',
    paymentStatus: 'Paid',
    discount: 0,
    notes: 'Payment received in full.',
    items: [{ productId: 'PRD-001', quantity: 5, price: 500, tax: 0 }],
  },
  'INV-002': {
    customerId: 'CUS-002',
    orderId: 'ORD-002',
    invoiceDate: '2026-10-19',
    dueDate: '2026-10-26',
    reference: 'REF-INV-002',
    status: 'Sent',
    paymentStatus: 'Partial',
    discount: 250,
    notes: 'Partial payment received.',
    items: [
      { productId: 'PRD-002', quantity: 10, price: 650, tax: 18 },
      { productId: 'PRD-004', quantity: 5, price: 180, tax: 18 },
    ],
  },
}

const initialItem = {
  productId: '',
  quantity: 1,
  price: 0,
  tax: 18,
}

const currency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value || 0)

export default function InvoiceForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const existingInvoice = existingInvoices[id]

  const [form, setForm] = useState(() => {
    if (existingInvoice) {
      return {
        customerId: existingInvoice.customerId,
        orderId: existingInvoice.orderId,
        invoiceDate: existingInvoice.invoiceDate,
        dueDate: existingInvoice.dueDate,
        reference: existingInvoice.reference,
        status: existingInvoice.status,
        paymentStatus: existingInvoice.paymentStatus,
        discount: existingInvoice.discount,
        notes: existingInvoice.notes,
      }
    }

    return {
      customerId: '',
      orderId: '',
      invoiceDate: new Date().toISOString().slice(0, 10),
      dueDate: '',
      reference: '',
      status: 'Draft',
      paymentStatus: 'Unpaid',
      discount: 0,
      notes: '',
    }
  })

  const [items, setItems] = useState(() => (existingInvoice ? existingInvoice.items.map((item) => ({ ...item })) : [{ ...initialItem }]))

  const [errors, setErrors] = useState({})
  const [showConfirm, setShowConfirm] = useState(false)

  if (isEdit && !existingInvoice) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-erp-primary-light text-erp-primary">
          <FileText size={28} />
        </div>
        <h2 className="mt-4 text-xl font-bold text-slate-900">Invoice Not Found</h2>
        <p className="mt-2 text-sm text-slate-500">This sample invoice is not available for editing.</p>
        <Link to="/company/invoices" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-erp-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-erp-primary-hover">
          <ArrowLeft size={16} />
          Back to Invoices
        </Link>
      </div>
    )
  }

  const filteredOrders = orders.filter((order) => !form.customerId || order.customerId === form.customerId)

  const subtotal = items.reduce((total, item) => total + Number(item.quantity || 0) * Number(item.price || 0), 0)

  const taxTotal = items.reduce((total, item) => total + (Number(item.quantity || 0) * Number(item.price || 0) * Number(item.tax || 0)) / 100, 0)

  const discount = Math.max(0, Number(form.discount || 0))
  const totalAmount = Math.max(0, subtotal + taxTotal - discount)

  const updateForm = (field, value) => {
    setForm((previous) => {
      const updated = { ...previous, [field]: value }

      if (field === 'customerId') {
        updated.orderId = ''
      }

      return updated
    })

    setErrors((previous) => ({ ...previous, [field]: '' }))
  }

  const updateItem = (index, field, value) => {
    setItems((previous) =>
      previous.map((item, itemIndex) => {
        if (itemIndex !== index) return item

        if (field === 'productId') {
          const product = products.find((entry) => entry.id === value)

          return {
            ...item,
            productId: value,
            price: product ? product.price : 0,
          }
        }

        return { ...item, [field]: value }
      }),
    )

    setErrors((previous) => ({ ...previous, items: '' }))
  }

  const addItem = () => {
    setItems((previous) => [...previous, { ...initialItem }])
  }

  const removeItem = (index) => {
    setItems((previous) => previous.filter((_, i) => i !== index))
  }

  const validateForm = () => {
    const nextErrors = {}

    if (!form.customerId) {
      nextErrors.customerId = 'Please select a customer.'
    }

    if (!form.invoiceDate) {
      nextErrors.invoiceDate = 'Invoice date is required.'
    }

    if (!form.dueDate) {
      nextErrors.dueDate = 'Due date is required.'
    } else if (form.invoiceDate && form.dueDate < form.invoiceDate) {
      nextErrors.dueDate = 'Due date cannot be before invoice date.'
    }

    if (!items.length) {
      nextErrors.items = 'Add at least one product.'
    } else if (items.some((item) => !item.productId || Number(item.quantity) <= 0 || Number(item.price) < 0 || Number(item.tax) < 0 || Number(item.tax) > 100)) {
      nextErrors.items = 'Select a product and enter valid quantity, price and tax.'
    }

    if (discount > subtotal + taxTotal) {
      nextErrors.discount = 'Discount cannot exceed the invoice amount.'
    }

    setErrors(nextErrors)

    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!validateForm()) return

    setShowConfirm(true)
  }

  const confirmSave = () => {
    setShowConfirm(false)

    // UI-only: no API or database is connected yet.
    navigate('/company/invoices')
  }

  const inputClass = 'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10'

  const labelClass = 'text-sm font-medium text-slate-700'

  const errorText = (message) => (message ? <p className="mt-1 text-xs text-red-600">{message}</p> : null)

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Link to="/company/invoices" className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50" aria-label="Back to invoices">
            <ArrowLeft size={19} />
          </Link>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{isEdit ? 'Edit Invoice' : 'Create Invoice'}</h1>
            <p className="mt-1 text-sm text-slate-500">{isEdit ? `Update invoice ${id}` : 'Create a new customer invoice and calculate its total.'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-erp-primary-light px-3 py-2 text-xs font-semibold text-erp-primary">{isEdit ? id : 'New Invoice'}</span>
          <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">UI Preview</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Invoice Information</h2>
              <p className="text-xs text-slate-500">Enter invoice number reference, dates and status.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 lg:grid-cols-3 sm:p-6">
            <div>
              <label className={labelClass}>Invoice Number</label>
              <input value={isEdit ? id : 'Generated on save'} readOnly className={`${inputClass} bg-slate-50 text-slate-500`} />
            </div>

            <div>
              <label className={labelClass}>Reference Number</label>
              <input value={form.reference} onChange={(e) => updateForm('reference', e.target.value)} placeholder="e.g. REF-INV-009" className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Invoice Status</label>
              <select value={form.status} onChange={(e) => updateForm('status', e.target.value)} className={inputClass}>
                <option value="Draft">Draft</option>
                <option value="Sent">Sent</option>
                <option value="Paid">Paid</option>
                <option value="Overdue">Overdue</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Invoice Date *</label>
              <div className="relative">
                <CalendarDays size={17} className="absolute left-3 top-4 text-slate-400" />
                <input type="date" value={form.invoiceDate} onChange={(e) => updateForm('invoiceDate', e.target.value)} className={`${inputClass} pl-10`} />
              </div>
              {errorText(errors.invoiceDate)}
            </div>

            <div>
              <label className={labelClass}>Due Date *</label>
              <div className="relative">
                <CalendarDays size={17} className="absolute left-3 top-4 text-slate-400" />
                <input type="date" min={form.invoiceDate || undefined} value={form.dueDate} onChange={(e) => updateForm('dueDate', e.target.value)} className={`${inputClass} pl-10`} />
              </div>
              {errorText(errors.dueDate)}
            </div>

            <div>
              <label className={labelClass}>Payment Status</label>
              <select value={form.paymentStatus} onChange={(e) => updateForm('paymentStatus', e.target.value)} className={inputClass}>
                <option value="Unpaid">Unpaid</option>
                <option value="Partial">Partial</option>
                <option value="Paid">Paid</option>
              </select>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <UserRound size={20} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Customer & Order</h2>
              <p className="text-xs text-slate-500">Select the customer and related sales order.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6">
            <div>
              <label className={labelClass}>Customer *</label>
              <select value={form.customerId} onChange={(e) => updateForm('customerId', e.target.value)} className={inputClass}>
                <option value="">Select customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} — {customer.company}
                  </option>
                ))}
              </select>
              {errorText(errors.customerId)}
            </div>

            <div>
              <label className={labelClass}>Related Order</label>
              <select value={form.orderId} onChange={(e) => updateForm('orderId', e.target.value)} className={inputClass}>
                <option value="">No linked order</option>
                {filteredOrders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.id} — {currency(order.amount)}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-400">Only orders belonging to the selected customer are shown.</p>
            </div>

            {form.customerId && (
              <div className="rounded-xl border border-erp-primary/15 bg-erp-primary-light/40 p-4 sm:col-span-2">
                <p className="text-xs font-medium text-erp-primary">Selected Customer</p>
                <p className="mt-1 font-semibold text-slate-900">{customers.find((customer) => customer.id === form.customerId)?.name}</p>
                <p className="mt-1 text-sm text-slate-600">{customers.find((customer) => customer.id === form.customerId)?.company}</p>
              </div>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <ShoppingCart size={20} />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Invoice Items</h2>
                <p className="text-xs text-slate-500">Add products, quantities, prices and GST.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-erp-primary/20 bg-erp-primary-light px-4 py-2.5 text-sm font-semibold text-erp-primary transition hover:bg-erp-primary/10"
            >
              <Plus size={17} />
              Add Item
            </button>
          </div>

          {errorText(errors.items)}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Product</th>
                  <th className="px-4 py-3 font-semibold">Qty</th>
                  <th className="px-4 py-3 font-semibold">Unit Price (₹)</th>
                  <th className="px-4 py-3 font-semibold">GST (%)</th>
                  <th className="px-4 py-3 text-right font-semibold">Line Total</th>
                  <th className="px-4 py-3 text-center font-semibold">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {items.map((item, index) => {
                  const lineSubtotal = Number(item.quantity || 0) * Number(item.price || 0)
                  const lineTotal = lineSubtotal + (lineSubtotal * Number(item.tax || 0)) / 100

                  return (
                    <tr key={index} className="align-top">
                      <td className="px-5 py-4">
                        <select value={item.productId} onChange={(e) => updateItem(index, 'productId', e.target.value)} className="w-full min-w-48 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-erp-primary">
                          <option value="">Select product</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.id} — {product.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-4 py-4">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                          className="w-20 rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-erp-primary"
                        />
                      </td>

                      <td className="px-4 py-4">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.price}
                          onChange={(e) => updateItem(index, 'price', e.target.value)}
                          className="w-28 rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-erp-primary"
                        />
                      </td>

                      <td className="px-4 py-4">
                        <select value={item.tax} onChange={(e) => updateItem(index, 'tax', e.target.value)} className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-erp-primary">
                          <option value={0}>0%</option>
                          <option value={5}>5%</option>
                          <option value={12}>12%</option>
                          <option value={18}>18%</option>
                          <option value={28}>28%</option>
                        </select>
                      </td>

                      <td className="px-4 py-4 text-right">
                        <p className="pt-2 text-sm font-semibold text-slate-800">{currency(lineTotal)}</p>
                      </td>

                      <td className="px-4 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          disabled={items.length === 1}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                          title="Remove item"
                        >
                          <Trash2 size={17} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-100 bg-slate-50/60 p-5 sm:p-6">
            <div className="ml-auto w-full space-y-3 sm:max-w-sm">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Subtotal</span>
                <span className="font-medium text-slate-800">{currency(subtotal)}</span>
              </div>

              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Total GST</span>
                <span className="font-medium text-slate-800">{currency(taxTotal)}</span>
              </div>

              <div>
                <label className="text-sm text-slate-600">Discount (₹)</label>
                <input type="number" min="0" step="0.01" value={form.discount} onChange={(e) => updateForm('discount', e.target.value)} className={`${inputClass} mt-1`} />
                {errorText(errors.discount)}
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                <span className="font-semibold text-slate-900">Grand Total</span>
                <span className="text-xl font-bold text-erp-primary">{currency(totalAmount)}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <label className={labelClass}>Notes / Terms</label>
          <textarea rows={4} value={form.notes} onChange={(e) => updateForm('notes', e.target.value)} placeholder="Add payment terms, delivery details or other notes..." className={`${inputClass} resize-y`} />
        </section>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link to="/company/invoices" className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
            Cancel
          </Link>

          <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-erp-primary px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-erp-primary-hover">
            <Save size={17} />
            {isEdit ? 'Update Invoice' : 'Create Invoice'}
          </button>
        </div>
      </form>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={25} />
            </div>

            <h3 className="mt-4 text-lg font-bold text-slate-900">{isEdit ? 'Update Invoice?' : 'Create Invoice?'}</h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Total invoice amount is <strong className="text-slate-900">{currency(totalAmount)}</strong>. This is currently a UI preview; no data will be saved to the database.
            </p>

            <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">
              <AlertCircle size={17} className="mt-0.5 shrink-0" />
              <p>API integration and persistent invoice storage will be added in a later step.</p>
            </div>

            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => setShowConfirm(false)} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Go Back
              </button>

              <button type="button" onClick={confirmSave} className="flex-1 rounded-xl bg-erp-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-erp-primary-hover">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
