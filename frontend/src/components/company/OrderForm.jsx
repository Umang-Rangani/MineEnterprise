import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, ShoppingCart, UserRound, CalendarDays, FileText, IndianRupee, Package, X } from 'lucide-react'

const customers = [
  {
    id: 'CUS-001',
    name: 'Rahul Shah',
    company: 'Shah Enterprises',
    phone: '9876543210',
  },
  {
    id: 'CUS-002',
    name: 'Priya Patel',
    company: 'Patel Retail Store',
    phone: '9876501234',
  },
  {
    id: 'CUS-003',
    name: 'Aarav Mehta',
    company: 'Individual Customer',
    phone: '9876512345',
  },
  {
    id: 'CUS-004',
    name: 'Neha Desai',
    company: 'Desai Distributors',
    phone: '9876523456',
  },
  {
    id: 'CUS-005',
    name: 'Karan Joshi',
    company: 'Joshi Traders',
    phone: '9876534567',
  },
  {
    id: 'CUS-006',
    name: 'Ananya Shah',
    company: 'Individual Customer',
    phone: '9876543211',
  },
]

const products = [
  { id: 'PRD-001', name: 'Laptop', sku: 'LAP-001', price: 45000, tax: 18 },
  { id: 'PRD-002', name: 'Wireless Mouse', sku: 'MOU-001', price: 750, tax: 18 },
  { id: 'PRD-003', name: 'Keyboard', sku: 'KEY-001', price: 1200, tax: 18 },
  { id: 'PRD-004', name: 'Monitor', sku: 'MON-001', price: 12500, tax: 18 },
  { id: 'PRD-005', name: 'USB Cable', sku: 'USB-001', price: 250, tax: 5 },
]

const initialOrders = {
  'ORD-001': {
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
    customerId: 'CUS-002',
    orderDate: '2026-10-19',
    deliveryDate: '2026-10-26',
    reference: 'PO-1002',
    status: 'Processing',
    paymentStatus: 'Partial',
    discount: 0,
    notes: '',
    items: [{ productId: 'PRD-004', quantity: 1, price: 12500, tax: 18 }],
  },
}

const today = () => new Date().toISOString().slice(0, 10)

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount)

const emptyItem = () => ({
  productId: '',
  quantity: 1,
  price: 0,
  tax: 18,
})

const emptyForm = () => ({
  customerId: '',
  orderDate: today(),
  deliveryDate: '',
  reference: '',
  status: 'Pending',
  paymentStatus: 'Unpaid',
  discount: 0,
  notes: '',
  items: [emptyItem()],
})

const fieldClass = 'mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/20'

const labelClass = 'block text-sm font-medium text-slate-700'

export default function OrderForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const existingOrder = initialOrders[id]

  const [form, setForm] = useState(() => {
    if (existingOrder) {
      return {
        ...existingOrder,
        items: existingOrder.items.map((item) => ({ ...item })),
      }
    }

    return emptyForm()
  })

  const [errors, setErrors] = useState({})
  const [showConfirmation, setShowConfirmation] = useState(false)

  const selectedCustomer = customers.find((customer) => customer.id === form.customerId)

  const subtotal = useMemo(() => form.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0), 0), [form.items])

  const totalTax = useMemo(() => form.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0) * (Number(item.tax || 0) / 100), 0), [form.items])

  const discount = Math.max(0, Number(form.discount) || 0)
  const total = Math.max(0, subtotal + totalTax - discount)

  const updateField = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }))
    setErrors((previous) => ({ ...previous, [field]: '' }))
  }

  const updateItem = (index, field, value) => {
    setForm((previous) => ({
      ...previous,
      items: previous.items.map((item, itemIndex) => {
        if (itemIndex !== index) return item

        if (field === 'productId') {
          const product = products.find((entry) => entry.id === value)

          return {
            ...item,
            productId: value,
            price: product ? product.price : 0,
            tax: product ? product.tax : 18,
          }
        }

        return { ...item, [field]: value }
      }),
    }))

    setErrors((previous) => ({ ...previous, items: '' }))
  }

  const addItem = () => {
    setForm((previous) => ({
      ...previous,
      items: [...previous.items, emptyItem()],
    }))
  }

  const removeItem = (index) => {
    setForm((previous) => ({
      ...previous,
      items: previous.items.length === 1 ? [emptyItem()] : previous.items.filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  const validateForm = () => {
    const nextErrors = {}

    if (!form.customerId) {
      nextErrors.customerId = 'Please select a customer.'
    }

    if (!form.orderDate) {
      nextErrors.orderDate = 'Order date is required.'
    }

    if (form.deliveryDate && form.orderDate && form.deliveryDate < form.orderDate) {
      nextErrors.deliveryDate = 'Delivery date cannot be earlier than order date.'
    }

    if (!form.items.length || form.items.some((item) => !item.productId)) {
      nextErrors.items = 'Select a product for every order item.'
    }

    if (
      form.items.some(
        (item) => !Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0 || !Number.isFinite(Number(item.price)) || Number(item.price) < 0 || !Number.isFinite(Number(item.tax)) || Number(item.tax) < 0 || Number(item.tax) > 100,
      )
    ) {
      nextErrors.items = 'Quantity must be positive; price and tax must be valid.'
    }

    if (Number(form.discount) < 0 || discount > subtotal + totalTax) {
      nextErrors.discount = 'Discount must not exceed the order value.'
    }

    setErrors(nextErrors)

    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!validateForm()) return

    setShowConfirmation(true)
  }

  if (isEdit && !existingOrder) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <ShoppingCart size={26} />
        </div>
        <h2 className="mt-4 text-xl font-semibold text-slate-900">Order Not Found</h2>
        <p className="mt-2 text-sm text-slate-500">This sample order is not available for editing.</p>
        <button type="button" onClick={() => navigate('/company/orders')} className="mt-5 rounded-lg bg-erp-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-erp-primary-hover">
          Back to Orders
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button type="button" onClick={() => navigate('/company/orders')} className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
          <ArrowLeft size={17} />
          Back to Orders
        </button>

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{isEdit ? `Edit Order ${id}` : 'Create Sales Order'}</h1>
          <p className="mt-1 text-sm text-slate-500">{isEdit ? 'Update the order information and items.' : 'Create an order for one of your customers.'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
            <div className="rounded-lg bg-violet-100 p-2 text-erp-primary">
              <UserRound size={19} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Customer & Order Information</h2>
              <p className="mt-0.5 text-xs text-slate-500">Select the customer and enter order details.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <label className={labelClass}>
                Customer <span className="text-rose-500">*</span>
              </label>
              <select value={form.customerId} onChange={(event) => updateField('customerId', event.target.value)} className={fieldClass}>
                <option value="">Select customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} — {customer.company}
                  </option>
                ))}
              </select>
              {errors.customerId && <p className="mt-1 text-xs text-rose-600">{errors.customerId}</p>}
            </div>

            <div>
              <label className={labelClass}>Order Date *</label>
              <div className="relative">
                <CalendarDays size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="date" value={form.orderDate} onChange={(event) => updateField('orderDate', event.target.value)} className={`${fieldClass} pl-10`} />
              </div>
              {errors.orderDate && <p className="mt-1 text-xs text-rose-600">{errors.orderDate}</p>}
            </div>

            <div>
              <label className={labelClass}>Expected Delivery Date</label>
              <input type="date" value={form.deliveryDate} min={form.orderDate || undefined} onChange={(event) => updateField('deliveryDate', event.target.value)} className={fieldClass} />
              {errors.deliveryDate && <p className="mt-1 text-xs text-rose-600">{errors.deliveryDate}</p>}
            </div>

            <div>
              <label className={labelClass}>Reference / PO Number</label>
              <input type="text" value={form.reference} onChange={(event) => updateField('reference', event.target.value)} placeholder="e.g. PO-1001" maxLength={60} className={fieldClass} />
            </div>

            <div>
              <label className={labelClass}>Order Status</label>
              <select value={form.status} onChange={(event) => updateField('status', event.target.value)} className={fieldClass}>
                <option value="Pending">Pending</option>
                <option value="Processing">Processing</option>
                <option value="Shipped">Shipped</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Payment Status</label>
              <select value={form.paymentStatus} onChange={(event) => updateField('paymentStatus', event.target.value)} className={fieldClass}>
                <option value="Unpaid">Unpaid</option>
                <option value="Partial">Partial</option>
                <option value="Paid">Paid</option>
              </select>
            </div>

            {selectedCustomer && (
              <div className="rounded-lg border border-erp-primary/20 bg-erp-primary-light/40 p-3 md:col-span-2 xl:col-span-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-erp-primary">Selected Customer</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{selectedCustomer.name}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {selectedCustomer.company} · {selectedCustomer.phone}
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2 text-blue-700">
                <Package size={19} />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Order Items</h2>
                <p className="mt-0.5 text-xs text-slate-500">Add products and set quantities and prices.</p>
              </div>
            </div>

            <button type="button" onClick={addItem} className="inline-flex items-center justify-center gap-2 rounded-lg border border-erp-primary/30 px-3.5 py-2 text-sm font-semibold text-erp-primary transition hover:bg-erp-primary-light">
              <Plus size={17} />
              Add Product
            </button>
          </div>

          <div className="space-y-4 p-5">
            {form.items.map((item, index) => {
              const lineSubtotal = Number(item.quantity || 0) * Number(item.price || 0)

              const lineTax = lineSubtotal * (Number(item.tax || 0) / 100)

              return (
                <div key={index} className="rounded-xl border border-slate-200 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800">Product {index + 1}</p>
                    <button type="button" onClick={() => removeItem(index)} title="Remove product" className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600">
                      <Trash2 size={17} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    <div className="sm:col-span-2 xl:col-span-2">
                      <label className={labelClass}>Product *</label>
                      <select value={item.productId} onChange={(event) => updateItem(index, 'productId', event.target.value)} className={fieldClass}>
                        <option value="">Select product</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} ({product.sku})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={labelClass}>Quantity *</label>
                      <input type="number" min="1" step="1" value={item.quantity} onChange={(event) => updateItem(index, 'quantity', event.target.value)} className={fieldClass} />
                    </div>

                    <div>
                      <label className={labelClass}>Unit Price (₹) *</label>
                      <input type="number" min="0" step="0.01" value={item.price} onChange={(event) => updateItem(index, 'price', event.target.value)} className={fieldClass} />
                    </div>

                    <div>
                      <label className={labelClass}>Tax (%)</label>
                      <select value={item.tax} onChange={(event) => updateItem(index, 'tax', event.target.value)} className={fieldClass}>
                        <option value={0}>0%</option>
                        <option value={5}>5%</option>
                        <option value={12}>12%</option>
                        <option value={18}>18%</option>
                        <option value={28}>28%</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2.5">
                    <p className="text-xs text-slate-500">
                      Subtotal: {formatCurrency(lineSubtotal)}
                      {' · '}
                      Tax: {formatCurrency(lineTax)}
                    </p>
                    <p className="text-sm font-semibold text-slate-800">Line Total: {formatCurrency(lineSubtotal + lineTax)}</p>
                  </div>
                </div>
              )
            })}

            {errors.items && <p className="text-sm text-rose-600">{errors.items}</p>}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-slate-100 p-2 text-slate-700">
                <FileText size={19} />
              </div>
              <h2 className="font-semibold text-slate-900">Notes & Instructions</h2>
            </div>

            <label className={`${labelClass} mt-5`}>Order Notes</label>
            <textarea value={form.notes} onChange={(event) => updateField('notes', event.target.value)} rows={5} maxLength={1000} placeholder="Add delivery instructions or any special notes..." className={`${fieldClass} resize-y`} />
            <p className="mt-1 text-right text-xs text-slate-400">{form.notes.length}/1000</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
                <IndianRupee size={19} />
              </div>
              <h2 className="font-semibold text-slate-900">Order Summary</h2>
            </div>

            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium text-slate-800">{formatCurrency(subtotal)}</span>
              </div>

              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-slate-500">Total Tax</span>
                <span className="font-medium text-slate-800">{formatCurrency(totalTax)}</span>
              </div>

              <div>
                <label className={labelClass}>Discount (₹)</label>
                <input type="number" min="0" step="0.01" value={form.discount} onChange={(event) => updateField('discount', event.target.value)} className={fieldClass} />
                {errors.discount && <p className="mt-1 text-xs text-rose-600">{errors.discount}</p>}
              </div>

              <div className="border-t border-dashed border-slate-300 pt-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-base font-semibold text-slate-900">Grand Total</span>
                  <span className="text-xl font-bold text-erp-primary">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => navigate('/company/orders')} className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
            Cancel
          </button>

          <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-lg bg-erp-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-erp-primary-hover">
            <ShoppingCart size={17} />
            {isEdit ? 'Update Order' : 'Create Order'}
          </button>
        </div>
      </form>

      {showConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="order-confirmation-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-emerald-100 p-3 text-emerald-700">
                  <ShoppingCart size={22} />
                </div>
                <div>
                  <h3 id="order-confirmation-title" className="text-lg font-semibold text-slate-900">
                    {isEdit ? 'Order Validated' : 'Order Ready'}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">{selectedCustomer?.name}</p>
                </div>
              </div>

              <button type="button" aria-label="Close dialog" onClick={() => setShowConfirmation(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <X size={19} />
              </button>
            </div>

            <div className="mt-5 rounded-xl bg-slate-50 p-4">
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-slate-500">Products</span>
                <span className="font-medium text-slate-800">{form.items.length}</span>
              </div>
              <div className="mt-3 flex justify-between gap-4 text-sm">
                <span className="text-slate-500">Order Status</span>
                <span className="font-medium text-slate-800">{form.status}</span>
              </div>
              <div className="mt-3 flex justify-between gap-4 text-sm">
                <span className="text-slate-500">Payment</span>
                <span className="font-medium text-slate-800">{form.paymentStatus}</span>
              </div>
              <div className="mt-3 flex justify-between gap-4 border-t border-slate-200 pt-3">
                <span className="font-semibold text-slate-800">Total</span>
                <span className="font-bold text-erp-primary">{formatCurrency(total)}</span>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-600">Validation is complete. This is a UI-only form; the order has not been saved to a database.</p>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setShowConfirmation(false)} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Continue Editing
              </button>

              <button type="button" onClick={() => navigate('/company/orders')} className="rounded-lg bg-erp-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-erp-primary-hover">
                Back to Orders
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
