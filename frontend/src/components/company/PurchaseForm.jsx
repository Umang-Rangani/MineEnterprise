import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Plus, Trash2, ShoppingCart, CalendarDays, Building2, FileText } from 'lucide-react'

const samplePurchases = [
  {
    id: 'PUR-001',
    supplierId: 'SUP-001',
    purchaseDate: '2026-10-18',
    dueDate: '2026-11-02',
    reference: 'INV-SUP-101',
    paymentStatus: 'Paid',
    status: 'Received',
    notes: 'Regular stock purchase',
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
    purchaseDate: '2026-10-16',
    dueDate: '2026-10-31',
    reference: 'INV-SUP-102',
    paymentStatus: 'Partial',
    status: 'Received',
    notes: '',
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
]

const suppliers = [
  { id: 'SUP-001', name: 'Shreeji Suppliers' },
  { id: 'SUP-002', name: 'Patel Trading Co.' },
  { id: 'SUP-003', name: 'Arihant Industries' },
  { id: 'SUP-004', name: 'Mehta Enterprises' },
]

const products = [
  {
    id: 'PRD-001',
    name: 'Office Chair',
    price: 3500,
    tax: 18,
  },
  {
    id: 'PRD-002',
    name: 'Office Table',
    price: 6500,
    tax: 18,
  },
  {
    id: 'PRD-003',
    name: 'Printer Paper',
    price: 450,
    tax: 12,
  },
  {
    id: 'PRD-004',
    name: 'Keyboard',
    price: 850,
    tax: 18,
  },
  {
    id: 'PRD-005',
    name: 'Mouse',
    price: 500,
    tax: 18,
  },
]

const currency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount)

const today = new Date().toISOString().slice(0, 10)

const createEmptyItem = () => ({
  productId: '',
  name: '',
  quantity: 1,
  price: 0,
  tax: 18,
})

export default function PurchaseForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const existingPurchase = samplePurchases.find((purchase) => purchase.id === id)

  const [supplierId, setSupplierId] = useState(existingPurchase?.supplierId || '')
  const [purchaseDate, setPurchaseDate] = useState(existingPurchase?.purchaseDate || today)
  const [dueDate, setDueDate] = useState(existingPurchase?.dueDate || '')
  const [reference, setReference] = useState(existingPurchase?.reference || '')
  const [status, setStatus] = useState(existingPurchase?.status || 'Pending')
  const [paymentStatus, setPaymentStatus] = useState(existingPurchase?.paymentStatus || 'Unpaid')
  const [notes, setNotes] = useState(existingPurchase?.notes || '')
  const [items, setItems] = useState(existingPurchase?.items?.map((item) => ({ ...item })) || [createEmptyItem()])
  const [errors, setErrors] = useState({})
  const [showConfirmation, setShowConfirmation] = useState(false)

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + Math.max(0, Number(item.quantity) || 0) * Math.max(0, Number(item.price) || 0), 0)

    const taxAmount = items.reduce((sum, item) => {
      const lineSubtotal = Math.max(0, Number(item.quantity) || 0) * Math.max(0, Number(item.price) || 0)

      return sum + lineSubtotal * (Math.max(0, Number(item.tax) || 0) / 100)
    }, 0)

    return {
      subtotal,
      taxAmount,
      grandTotal: subtotal + taxAmount,
    }
  }, [items])

  const updateItem = (index, field, value) => {
    setItems((previous) =>
      previous.map((item, itemIndex) => {
        if (itemIndex !== index) return item

        if (field === 'productId') {
          const selectedProduct = products.find((product) => product.id === value)

          return selectedProduct
            ? {
                ...item,
                productId: selectedProduct.id,
                name: selectedProduct.name,
                price: selectedProduct.price,
                tax: selectedProduct.tax,
              }
            : {
                ...item,
                productId: '',
                name: '',
                price: 0,
                tax: 18,
              }
        }

        return { ...item, [field]: value }
      }),
    )
  }

  const validateForm = () => {
    const nextErrors = {}

    if (!supplierId) {
      nextErrors.supplierId = 'Please select a supplier.'
    }

    if (!purchaseDate) {
      nextErrors.purchaseDate = 'Purchase date is required.'
    }

    if (dueDate && purchaseDate && dueDate < purchaseDate) {
      nextErrors.dueDate = 'Due date cannot be before purchase date.'
    }

    if (!items.length) {
      nextErrors.items = 'Add at least one product.'
    } else {
      const hasInvalidItem = items.some((item) => !item.productId || Number(item.quantity) <= 0 || Number(item.price) < 0 || item.quantity === '' || item.price === '')

      if (hasInvalidItem) {
        nextErrors.items = 'Select a product and enter a valid quantity and unit price for every row.'
      }
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!validateForm()) return

    setShowConfirmation(true)
  }

  if (isEdit && !existingPurchase) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <h1 className="text-xl font-bold text-slate-900">Purchase Not Found</h1>
        <p className="mt-2 text-sm text-slate-500">This purchase ID is not available in the current sample data.</p>
        <button type="button" onClick={() => navigate('/company/purchases')} className="mt-5 rounded-lg bg-erp-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-erp-primary-hover">
          Back to Purchases
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <button type="button" onClick={() => navigate('/company/purchases')} className="mt-1 rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100" aria-label="Back to purchases">
            <ArrowLeft size={19} />
          </button>

          <div>
            <h1 className="text-2xl font-bold text-slate-900">{isEdit ? 'Edit Purchase' : 'Create Purchase'}</h1>
            <p className="mt-1 text-sm text-slate-500">{isEdit ? `Update purchase ${id}` : 'Record a new purchase from your supplier.'}</p>
          </div>
        </div>

        {isEdit && <span className="w-fit rounded-lg bg-violet-50 px-3 py-2 text-sm font-semibold text-erp-primary">{id}</span>}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
            <div className="rounded-lg bg-violet-100 p-2 text-violet-700">
              <Building2 size={19} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Supplier & Purchase Information</h2>
              <p className="mt-0.5 text-sm text-slate-500">Enter supplier and purchase reference details.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Supplier <span className="text-rose-500">*</span>
              </label>
              <select
                value={supplierId}
                onChange={(event) => setSupplierId(event.target.value)}
                className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/20 ${errors.supplierId ? 'border-rose-400' : 'border-slate-300'}`}
              >
                <option value="">Select supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name} ({supplier.id})
                  </option>
                ))}
              </select>
              {errors.supplierId && <p className="mt-1 text-xs text-rose-600">{errors.supplierId}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Purchase Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <CalendarDays size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(event) => setPurchaseDate(event.target.value)}
                  className={`w-full rounded-lg border py-2.5 pl-10 pr-3 text-sm outline-none focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/20 ${errors.purchaseDate ? 'border-rose-400' : 'border-slate-300'}`}
                />
              </div>
              {errors.purchaseDate && <p className="mt-1 text-xs text-rose-600">{errors.purchaseDate}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Due Date</label>
              <input
                type="date"
                min={purchaseDate || undefined}
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/20 ${errors.dueDate ? 'border-rose-400' : 'border-slate-300'}`}
              />
              {errors.dueDate && <p className="mt-1 text-xs text-rose-600">{errors.dueDate}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Supplier Invoice / Reference</label>
              <input
                type="text"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder="e.g. INV-SUP-101"
                maxLength={100}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/20"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Purchase Status</label>
              <select value={status} onChange={(event) => setStatus(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-erp-primary">
                <option value="Pending">Pending</option>
                <option value="Received">Received</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Payment Status</label>
              <select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-erp-primary">
                <option value="Unpaid">Unpaid</option>
                <option value="Partial">Partial</option>
                <option value="Paid">Paid</option>
              </select>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2 text-blue-700">
                <ShoppingCart size={19} />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Purchase Items</h2>
                <p className="mt-0.5 text-sm text-slate-500">Add products, quantities, unit prices and tax rates.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setItems((previous) => [...previous, createEmptyItem()])}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-erp-primary px-3.5 py-2 text-sm font-semibold text-erp-primary transition hover:bg-erp-primary-light"
            >
              <Plus size={17} />
              Add Item
            </button>
          </div>

          {errors.items && <p className="border-b border-rose-100 bg-rose-50 px-5 py-3 text-sm text-rose-600">{errors.items}</p>}

          <div className="space-y-4 p-5">
            {items.map((item, index) => {
              const lineSubtotal = (Number(item.quantity) || 0) * (Number(item.price) || 0)

              const lineTax = lineSubtotal * ((Number(item.tax) || 0) / 100)

              return (
                <div key={index} className="rounded-xl border border-slate-200 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-800">Item {index + 1}</h3>

                    <button
                      type="button"
                      disabled={items.length === 1}
                      onClick={() => setItems((previous) => previous.filter((_, itemIndex) => itemIndex !== index))}
                      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <Trash2 size={15} />
                      Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    <div className="sm:col-span-2 xl:col-span-1">
                      <label className="mb-1.5 block text-xs font-medium text-slate-600">
                        Product <span className="text-rose-500">*</span>
                      </label>
                      <select value={item.productId} onChange={(event) => updateItem(index, 'productId', event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-erp-primary">
                        <option value="">Select product</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-600">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(event) => updateItem(index, 'quantity', event.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-erp-primary"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-600">Unit Price (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.price}
                        onChange={(event) => updateItem(index, 'price', event.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-erp-primary"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-600">Tax (%)</label>
                      <select value={item.tax} onChange={(event) => updateItem(index, 'tax', event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-erp-primary">
                        <option value={0}>0%</option>
                        <option value={5}>5%</option>
                        <option value={12}>12%</option>
                        <option value={18}>18%</option>
                        <option value={28}>28%</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-600">Line Total</label>
                      <div className="rounded-lg bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-900">{currency(lineSubtotal + lineTax)}</div>
                    </div>
                  </div>

                  <p className="mt-3 text-right text-xs text-slate-500">
                    Subtotal: {currency(lineSubtotal)} · Tax: {currency(lineTax)}
                  </p>
                </div>
              )
            })}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-slate-100 p-2 text-slate-700">
                <FileText size={19} />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Additional Notes</h2>
                <p className="mt-0.5 text-sm text-slate-500">Add optional purchase information.</p>
              </div>
            </div>

            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={5}
              maxLength={1000}
              placeholder="Enter notes about this purchase..."
              className="mt-5 w-full resize-y rounded-lg border border-slate-300 px-3 py-3 text-sm outline-none focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/20"
            />

            <p className="mt-1 text-right text-xs text-slate-400">{notes.length}/1000</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">Purchase Summary</h2>

            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium text-slate-800">{currency(totals.subtotal)}</span>
              </div>

              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-slate-500">Total Tax</span>
                <span className="font-medium text-slate-800">{currency(totals.taxAmount)}</span>
              </div>

              <div className="border-t border-dashed border-slate-300 pt-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-semibold text-slate-900">Grand Total</span>
                  <span className="text-2xl font-bold text-erp-primary">{currency(totals.grandTotal)}</span>
                </div>
              </div>

              <p className="text-xs leading-5 text-slate-500">Tax is calculated per item. The total updates automatically when you change quantities, prices or tax rates.</p>
            </div>
          </div>
        </section>

        <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
          <button type="button" onClick={() => navigate('/company/purchases')} className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
            Cancel
          </button>

          <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-lg bg-erp-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-erp-primary-hover">
            <Save size={17} />
            {isEdit ? 'Update Purchase' : 'Save Purchase'}
          </button>
        </div>
      </form>

      {showConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="purchase-confirmation-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <ShoppingCart size={23} />
            </div>

            <h2 id="purchase-confirmation-title" className="mt-4 text-lg font-bold text-slate-900">
              Form Validated
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">Your purchase form is valid. This is currently a UI-only demonstration; the purchase has not been saved to the database.</p>

            <div className="mt-4 rounded-lg bg-slate-50 p-4">
              <div className="flex justify-between gap-3 text-sm">
                <span className="text-slate-500">Supplier</span>
                <span className="text-right font-medium text-slate-800">{suppliers.find((supplier) => supplier.id === supplierId)?.name || '—'}</span>
              </div>
              <div className="mt-3 flex justify-between gap-3 text-sm">
                <span className="text-slate-500">Items</span>
                <span className="font-medium text-slate-800">{items.length}</span>
              </div>
              <div className="mt-3 flex justify-between gap-3 text-sm">
                <span className="text-slate-500">Grand Total</span>
                <span className="font-bold text-erp-primary">{currency(totals.grandTotal)}</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setShowConfirmation(false)} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Continue Editing
              </button>
              <button type="button" onClick={() => navigate('/company/purchases')} className="rounded-lg bg-erp-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-erp-primary-hover">
                Back to Purchases
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
