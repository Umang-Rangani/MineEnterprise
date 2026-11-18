import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, ClipboardList, LoaderCircle, Package, Save, AlertCircle, CheckCircle2, Search, Check, ShoppingCart, ReceiptText, Truck, IndianRupee, Warehouse } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Loading from '../Loading/Loading'
import { hasPermission, useAuth } from '../../context/AuthContext'

const getLocalDate = (date = new Date()) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return getLocalDate(new Date())
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const today = getLocalDate()

const initialForm = {
  salesOrderId: '',
  invoiceDate: today,
  dueDate: '',
  notes: '',
  items: [],
}

const inputBase = 'h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-light'

const labelBase = 'mb-1.5 block text-xs font-semibold text-slate-600'

const cardBase = 'rounded-xl border border-slate-200 bg-white p-3 sm:p-4'

const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)

const quantity = (value) =>
  new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 3,
  }).format(Number(value) || 0)

const formatDate = (value) => {
  if (!value) return '—'

  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
}

const getErrorMessage = (error, fallback) => error?.response?.data?.message || error?.message || fallback

const getList = (response) => {
  const data = response?.data

  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.invoices)) return data.invoices
  if (Array.isArray(data?.purchases)) return data.purchases
  if (Array.isArray(data?.data?.data)) return data.data.data

  return []
}

const unwrapData = (response) => response?.data?.data?.invoice || response?.data?.invoice || response?.data?.data || null

const getCustomerName = (order) => order?.customerId?.customerName || order?.customerName || 'Customer'

const getWarehouseName = (order) => order?.warehouseId?.name || order?.warehouseName || 'Warehouse'

const getOrderDate = (order) => order?.orderDate || order?.createdAt

const getStatusStyle = (status) => {
  if (status === 'Dispatched') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }

  if (status === 'Partially Dispatched') {
    return 'border-amber-200 bg-amber-50 text-amber-700'
  }

  return 'border-blue-200 bg-blue-50 text-blue-700'
}

const getInvoiceStatusStyle = (status) => {
  if (status === 'Draft') {
    return 'border-amber-200 bg-amber-50 text-amber-700'
  }

  return 'border-slate-200 bg-slate-50 text-slate-600'
}

function getAlreadyInvoicedQuantities(invoices, currentInvoiceId = '') {
  const quantityMap = {}

  for (const invoice of invoices || []) {
    if (String(invoice._id) === String(currentInvoiceId)) continue
    if (invoice.status === 'Cancelled') continue

    for (const item of invoice.items || []) {
      const dispatchId = String(item.dispatchId?._id || item.dispatchId || '')
      const dispatchItemId = String(item.dispatchItemId?._id || item.dispatchItemId || '')

      if (!dispatchId || !dispatchItemId) continue

      const key = `${dispatchId}:${dispatchItemId}`

      quantityMap[key] = (quantityMap[key] || 0) + (Number(item.quantity) || 0)
    }
  }

  return quantityMap
}

function normalizeDispatchItems({ dispatches, order, invoices, currentInvoiceId = '', existingItems = [] }) {
  const invoicedMap = getAlreadyInvoicedQuantities(invoices, currentInvoiceId)

  const existingMap = new Map((existingItems || []).map((item) => [`${String(item.dispatchId?._id || item.dispatchId)}:${String(item.dispatchItemId?._id || item.dispatchItemId)}`, item]))

  const orderItems = order?.items || []
  const result = []

  for (const dispatch of dispatches || []) {
    if (dispatch.status !== 'Confirmed') continue

    for (const dispatchItem of dispatch.items || []) {
      const dispatchId = String(dispatch._id)
      const dispatchItemId = String(dispatchItem._id)

      const orderItem = orderItems.find((item) => String(item._id) === String(dispatchItem.salesOrderItemId?._id || dispatchItem.salesOrderItemId))

      if (!orderItem) continue

      const key = `${dispatchId}:${dispatchItemId}`

      const alreadyInvoicedQuantity = Number(invoicedMap[key]) || 0

      const existing = existingMap.get(key)

      const dispatchedQuantity = Number(dispatchItem.quantity) || 0

      const availableQuantity = Math.max(0, dispatchedQuantity - alreadyInvoicedQuantity)

      const rate = Number(orderItem.rate) || 0
      const orderQuantity = Number(orderItem.quantity) || 0
      const orderDiscount = Number(orderItem.discount) || 0
      const taxRate = Number(orderItem.taxRate) || 0

      result.push({
        dispatchId,
        dispatchItemId,
        dispatchNumber: dispatch.dispatchNumber || 'Dispatch',
        dispatchDate: dispatch.dispatchDate,
        salesOrderItemId: String(orderItem._id),
        productId: String(dispatchItem.productId?._id || dispatchItem.productId),
        productName: dispatchItem.productName || orderItem.productName || 'Product',
        sku: dispatchItem.sku || orderItem.sku || '',
        unit: dispatchItem.unit || orderItem.unit || 'Piece',
        dispatchedQuantity,
        alreadyInvoicedQuantity,
        availableQuantity,
        quantity: Number(existing?.quantity) || 0,
        rate: Number(existing?.rate ?? rate) || 0,
        discount: orderQuantity > 0 ? orderDiscount / orderQuantity : 0,
        taxRate: Number(existing?.taxRate ?? taxRate) || 0,
      })
    }
  }

  return result
}

export default function InvoiceForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const auth = useAuth()
  const permissions = auth?.permissions

  const canCreate = hasPermission(permissions, 'invoice:create')
  const canUpdate = hasPermission(permissions, 'invoice:update')
  const canView = hasPermission(permissions, 'invoice:view')
  const canSalesList = hasPermission(permissions, 'sales:list')
  const canSalesView = hasPermission(permissions, 'sales:view')

  const [form, setForm] = useState(initialForm)

  const [salesOrders, setSalesOrders] = useState([])
  const [dispatchItems, setDispatchItems] = useState([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceStatus, setInvoiceStatus] = useState('')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  const [dispatchLoading, setDispatchLoading] = useState(false)

  const selectedOrder = useMemo(() => salesOrders.find((order) => String(order._id) === String(form.salesOrderId)), [salesOrders, form.salesOrderId])

  const filteredOrders = useMemo(() => {
    const searchText = search.trim().toLowerCase()

    return [...salesOrders]
      .filter((order) => {
        const matchesStatus = statusFilter === 'All' || order.status === statusFilter

        const customerName = getCustomerName(order)

        const matchesSearch =
          !searchText ||
          String(order.orderNumber || '')
            .toLowerCase()
            .includes(searchText) ||
          customerName.toLowerCase().includes(searchText) ||
          String(order.customerId?.customerCode || '')
            .toLowerCase()
            .includes(searchText) ||
          (order.items || []).some((item) =>
            String(item.productName || item.productId?.name || '')
              .toLowerCase()
              .includes(searchText),
          )

        return matchesStatus && matchesSearch
      })
      .sort((a, b) => {
        const aDate = new Date(getOrderDate(a) || 0).getTime()
        const bDate = new Date(getOrderDate(b) || 0).getTime()

        return bDate - aDate
      })
  }, [salesOrders, search, statusFilter])

  const totals = useMemo(() => {
    return form.items.reduce(
      (result, item) => {
        const selectedQuantity = Number(item.quantity) || 0
        const rate = Number(item.rate) || 0
        const discountPerUnit = Number(item.discount) || 0
        const taxRate = Number(item.taxRate) || 0

        const gross = selectedQuantity * rate
        const discount = Math.min(gross, selectedQuantity * discountPerUnit)

        const taxable = Math.max(0, gross - discount)
        const tax = (taxable * taxRate) / 100

        result.subtotal += gross
        result.discount += discount
        result.tax += tax
        result.total += taxable + tax

        return result
      },
      {
        subtotal: 0,
        discount: 0,
        tax: 0,
        total: 0,
      },
    )
  }, [form.items])

  useEffect(() => {
    let active = true

    async function loadFormData() {
      setLoading(true)
      setError('')
      setInvoiceStatus('')

      try {
        if (!canSalesView) {
          throw new Error('You do not have permission to view Sales Order dispatch details.')
        }

        let loadedOrders = []

        if (!isEdit) {
          if (!canSalesList) {
            throw new Error('You need Sales List permission to select a Sales Order.')
          }

          const [approvedResponse, partialResponse, dispatchedResponse] = await Promise.all([
            axiosInstance.get('/erp/sales', {
              params: {
                page: 1,
                limit: 100,
                status: 'Approved',
              },
            }),
            axiosInstance.get('/erp/sales', {
              params: {
                page: 1,
                limit: 100,
                status: 'Partially Dispatched',
              },
            }),
            axiosInstance.get('/erp/sales', {
              params: {
                page: 1,
                limit: 100,
                status: 'Dispatched',
              },
            }),
          ])

          if (!active) return

          loadedOrders = [...getList(approvedResponse), ...getList(partialResponse), ...getList(dispatchedResponse)]

          loadedOrders = Array.from(new Map(loadedOrders.map((order) => [String(order._id), order])).values())

          setSalesOrders(loadedOrders)
        } else {
          if (!canUpdate) {
            throw new Error('You do not have permission to update Invoices.')
          }

          const invoiceResponse = await axiosInstance.get(`/erp/invoices/${id}`)

          if (!active) return

          const invoice = unwrapData(invoiceResponse)

          if (!invoice?._id) {
            throw new Error('Invoice details could not be loaded.')
          }

          setInvoiceNumber(invoice.invoiceNumber || '')
          setInvoiceStatus(invoice.status || '')

          if (invoice.status !== 'Draft') {
            setError('Only Draft Invoices can be edited.')
          }

          const salesOrderId = String(invoice.salesOrderId?._id || invoice.salesOrderId || '')

          if (!salesOrderId) {
            throw new Error('Related Sales Order was not found.')
          }

          const [orderResponse, dispatchResponse, invoicesResponse] = await Promise.all([
            axiosInstance.get(`/erp/sales/${salesOrderId}`),
            axiosInstance.get(`/erp/sales/${salesOrderId}/dispatches`),
            axiosInstance.get('/erp/invoices', {
              params: {
                salesOrderId,
                page: 1,
                limit: 100,
              },
            }),
          ])

          if (!active) return

          const order = orderResponse?.data?.data?.salesOrder || orderResponse?.data?.data

          if (!order?._id) {
            throw new Error('Related Sales Order could not be loaded.')
          }

          loadedOrders = [order]
          setSalesOrders(loadedOrders)

          const dispatches = getList(dispatchResponse)
          const otherInvoices = getList(invoicesResponse)

          const normalizedItems = normalizeDispatchItems({
            dispatches,
            order,
            invoices: otherInvoices,
            currentInvoiceId: invoice._id,
            existingItems: invoice.items || [],
          })

          setDispatchItems(normalizedItems)

          setForm({
            salesOrderId,
            invoiceDate: invoice.invoiceDate ? getLocalDate(new Date(invoice.invoiceDate)) : today,
            dueDate: invoice.dueDate ? getLocalDate(new Date(invoice.dueDate)) : '',
            notes: invoice.notes || '',
            items: normalizedItems.map((item) => {
              const existing = (invoice.items || []).find(
                (invoiceItem) => String(invoiceItem.dispatchId?._id || invoiceItem.dispatchId) === item.dispatchId && String(invoiceItem.dispatchItemId?._id || invoiceItem.dispatchItemId) === item.dispatchItemId,
              )

              return {
                ...item,
                quantity: Number(existing?.quantity) || 0,
                rate: Number(existing?.rate ?? item.rate) || 0,
                taxRate: Number(existing?.taxRate ?? item.taxRate) || 0,
              }
            }),
          })
        }
      } catch (loadError) {
        if (active) {
          setError(getErrorMessage(loadError, 'Unable to load Invoice form.'))
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadFormData()

    return () => {
      active = false
    }
  }, [id, isEdit])

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))

    setError('')
    setNotice('')
  }

  async function handleSalesOrderChange(salesOrderId) {
    const order = salesOrders.find((entry) => String(entry._id) === String(salesOrderId))

    setForm((current) => ({
      ...current,
      salesOrderId,
      items: [],
    }))

    setDispatchItems([])
    setError('')
    setNotice('')

    if (!order) return

    setDispatchLoading(true)

    try {
      const [dispatchResponse, invoicesResponse] = await Promise.all([
        axiosInstance.get(`/erp/sales/${salesOrderId}/dispatches`),
        axiosInstance.get('/erp/invoices', {
          params: {
            salesOrderId,
            page: 1,
            limit: 100,
          },
        }),
      ])

      const dispatches = getList(dispatchResponse)
      const invoices = getList(invoicesResponse)

      const normalizedItems = normalizeDispatchItems({
        dispatches,
        order,
        invoices,
      })

      setDispatchItems(normalizedItems)

      setForm((current) => ({
        ...current,
        items: normalizedItems,
      }))

      if (!normalizedItems.some((item) => item.availableQuantity > 0)) {
        setNotice('No uninvoiced confirmed dispatch quantity is available for this Sales Order.')
      }
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Unable to load confirmed dispatches.'))
    } finally {
      setDispatchLoading(false)
    }
  }

  function updateItem(index, value) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              quantity: value,
            }
          : item,
      ),
    }))

    setError('')
    setNotice('')
  }

  function validateForm() {
    if (!form.salesOrderId) {
      return 'Please select a Sales Order.'
    }

    if (!form.invoiceDate) {
      return 'Invoice date is required.'
    }

    if (form.invoiceDate > today) {
      return 'Invoice date cannot be in the future.'
    }

    if (form.dueDate && form.dueDate < form.invoiceDate) {
      return 'Due date cannot be before invoice date.'
    }

    if (!form.items.length) {
      return 'No confirmed dispatch items are available.'
    }

    let hasQuantity = false

    for (const item of form.items) {
      const selectedQuantity = Number(item.quantity)

      if (!Number.isFinite(selectedQuantity) || selectedQuantity < 0) {
        return `Enter a valid invoice quantity for ${item.productName}.`
      }

      if (selectedQuantity > item.availableQuantity) {
        return `Invoice quantity exceeds available dispatched quantity for ${item.productName}.`
      }

      if (selectedQuantity > 0) {
        hasQuantity = true
      }
    }

    if (!hasQuantity) {
      return 'Enter an invoice quantity for at least one product.'
    }

    if (form.notes.length > 2000) {
      return 'Notes cannot exceed 2000 characters.'
    }

    return ''
  }

  async function handleSubmit(event) {
    event.preventDefault()

    setError('')
    setNotice('')

    if (isEdit && !canUpdate) {
      setError('You do not have permission to update Invoices.')
      return
    }

    if (!isEdit && !canCreate) {
      setError('You do not have permission to create Invoices.')
      return
    }

    if (isEdit && invoiceStatus !== 'Draft') {
      setError('Only Draft Invoices can be edited.')
      return
    }

    const validationMessage = validateForm()

    if (validationMessage) {
      setError(validationMessage)
      return
    }

    setSaving(true)

    const payload = {
      salesOrderId: form.salesOrderId,
      invoiceDate: form.invoiceDate,
      dueDate: form.dueDate || null,
      notes: form.notes.trim(),
      items: form.items
        .filter((item) => Number(item.quantity) > 0)
        .map((item) => ({
          dispatchId: item.dispatchId,
          dispatchItemId: item.dispatchItemId,
          quantity: Number(item.quantity),
        })),
    }

    try {
      if (isEdit) {
        await axiosInstance.patch(`/erp/invoices/${id}`, payload)
      } else {
        await axiosInstance.post('/erp/invoices', payload)
      }

      navigate('/company/invoices', {
        state: {
          message: isEdit ? 'Invoice draft updated successfully.' : 'Invoice draft created successfully.',
        },
      })
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Unable to save Invoice draft.'))
    } finally {
      setSaving(false)
    }
  }

  const readOnly = isEdit && invoiceStatus !== 'Draft'

  const hasAvailableItems = dispatchItems.some((item) => item.availableQuantity > 0)

  if (loading) {
    return (
      <div className="min-w-0 space-y-4 text-sm">
        <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="h-1 bg-erp-primary" />

          <div className="flex min-h-16 items-center px-4 sm:px-5">
            <BreadCrumb
              items={[
                {
                  title: 'Invoices',
                  link: '/company/invoices',
                },
                {
                  title: isEdit ? 'Edit Invoice' : 'New Invoice',
                  link: null,
                },
              ]}
            />
          </div>
        </section>

        <section className="relative min-h-[480px] overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex min-h-[480px] items-center justify-center">
            <Loading fullScreen={false} label={isEdit ? 'Loading Invoice...' : 'Preparing Invoice Form...'} description="Fetching Sales Orders, dispatch details and invoice information..." className="!h-full min-h-[480px]" />
          </div>
        </section>
      </div>
    )
  }

 
  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        <div className="h-1 bg-erp-primary" />

        <div className="flex min-h-16 items-center justify-between gap-3 px-3 sm:px-4">
          <BreadCrumb
            items={[
              {
                title: 'Invoices',
                link: '/company/invoices',
              },
              {
                title: isEdit ? 'Edit Invoice' : 'New Invoice',
                link: null,
              },
            ]}
          />

          {isEdit && invoiceNumber && <span className="shrink-0 rounded-lg bg-erp-light px-2.5 py-1.5 text-[11px] font-bold text-erp-primary">{invoiceNumber}</span>}
        </div>
      </section>

      {error && !readOnly && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {readOnly && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error || 'Only Draft Invoices can be edited.'}</span>
        </div>
      )}

      {notice && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-700">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className={!isEdit ? 'grid grid-cols-1 items-start gap-3 xl:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.1fr)]' : 'space-y-3'}>
          {/* Sales Orders */}
          {!isEdit && (
            <section className={`${cardBase} xl:sticky xl:top-3`}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-erp-light text-erp-primary">
                    <ShoppingCart size={16} />
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-slate-800">Sales Orders</h2>

                    <p className="text-[10px] text-slate-500">Select an order to create an invoice.</p>
                  </div>
                </div>

                <span className="shrink-0 rounded-lg bg-erp-light px-2 py-1.5 text-[10px] font-bold text-erp-primary">{filteredOrders.length} Orders</span>
              </div>

              <div className="mb-3 space-y-2">
                <div className="relative">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

                  <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search order, customer or product..." className={`${inputBase} pl-9`} />
                </div>

                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={inputBase}>
                  <option value="All">All Eligible Orders</option>
                  <option value="Approved">Approved</option>
                  <option value="Partially Dispatched">Partially Dispatched</option>
                  <option value="Dispatched">Dispatched</option>
                </select>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 px-3 py-8 text-center">
                  <Package size={24} className="mx-auto text-slate-300" />

                  <p className="mt-2 text-xs font-semibold text-slate-700">No Sales Orders Found</p>

                  <p className="mt-1 text-[10px] text-slate-500">Only approved orders with confirmed dispatches can be invoiced.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredOrders.map((order) => {
                    const isSelected = String(form.salesOrderId) === String(order._id)

                    return (
                      <article key={order._id} className={`overflow-hidden rounded-lg border transition ${isSelected ? 'border-erp-primary bg-erp-light/40 ring-1 ring-erp-primary/20' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                        <div className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[9px] text-slate-400">{formatDate(getOrderDate(order))}</p>

                              <h3 className="mt-0.5 truncate text-xs font-bold text-slate-800">{order.orderNumber || 'Sales Order'}</h3>

                              <p className="mt-1 truncate text-xs font-semibold text-slate-600">{getCustomerName(order)}</p>

                              {isSelected && (
                                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
                                  <Check size={10} />
                                  Selected
                                </span>
                              )}
                            </div>

                            <span className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-bold ${getStatusStyle(order.status)}`}>{order.status}</span>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {(order.items || []).map((item, index) => (
                              <span key={item._id || index} className="max-w-full truncate rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-700">
                                {item.productName || 'Product'}
                              </span>
                            ))}
                          </div>

                          <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
                            <div className="min-w-0">
                              <p className="text-[9px] text-slate-500">Order Total</p>

                              <p className="text-xs font-bold text-slate-800">{money(order.grandTotal)}</p>

                              <p className="mt-0.5 truncate text-[9px] text-slate-500">{getWarehouseName(order)}</p>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleSalesOrderChange(String(order._id))}
                              disabled={dispatchLoading || !canCreate}
                              className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[10px] font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                isSelected ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-erp-primary text-white hover:bg-erp-hover'
                              }`}
                            >
                              {isSelected ? <Check size={13} /> : <ReceiptText size={13} />}

                              {isSelected ? 'Selected' : 'Create Invoice'}
                            </button>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </section>
          )}

          {/* Invoice Form */}
          <div className="min-w-0 space-y-3">
            {!isEdit && !selectedOrder ? (
              <section className={`${cardBase} flex min-h-[300px] items-center justify-center`}>
                <div className="max-w-xs text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-erp-light text-erp-primary">
                    <ReceiptText size={22} />
                  </div>

                  <h2 className="mt-3 text-sm font-bold text-slate-800">Select a Sales Order</h2>

                  <p className="mt-1 text-xs leading-relaxed text-slate-500">Select Create Invoice from the Sales Orders panel. Invoice Information and Dispatch Items will appear here.</p>
                </div>
              </section>
            ) : (
              <>
                {/* Invoice Information */}
                <section className={cardBase}>
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-erp-light text-erp-primary">
                      <ClipboardList size={16} />
                    </div>

                    <div>
                      <h2 className="text-sm font-bold text-slate-800">Invoice Information</h2>

                      <p className="text-[11px] text-slate-500">Enter invoice date and payment due date.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className={labelBase}>
                        Invoice Date <span className="text-red-500">*</span>
                      </label>

                      <div className="relative">
                        <CalendarDays size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />

                        <input type="date" className={`${inputBase} pl-8`} value={form.invoiceDate} max={today} onChange={(event) => updateField('invoiceDate', event.target.value)} disabled={readOnly} required />
                      </div>
                    </div>

                    <div>
                      <label className={labelBase}>Due Date</label>

                      <div className="relative">
                        <CalendarDays size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />

                        <input type="date" className={`${inputBase} pl-8`} value={form.dueDate} min={form.invoiceDate} onChange={(event) => updateField('dueDate', event.target.value)} disabled={readOnly} />
                      </div>
                    </div>
                  </div>

                  {selectedOrder && (
                    <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-3">
                      <div>
                        <p className="text-[9px] font-medium uppercase tracking-wide text-slate-500">Sales Order</p>

                        <p className="mt-1 text-[11px] font-bold text-slate-800">{selectedOrder.orderNumber}</p>
                      </div>

                      <div>
                        <p className="text-[9px] font-medium uppercase tracking-wide text-slate-500">Customer</p>

                        <p className="mt-1 truncate text-[11px] font-bold text-slate-800">{getCustomerName(selectedOrder)}</p>
                      </div>

                      <div>
                        <p className="text-[9px] font-medium uppercase tracking-wide text-slate-500">Warehouse</p>

                        <p className="mt-1 truncate text-[11px] font-bold text-slate-800">{getWarehouseName(selectedOrder)}</p>
                      </div>
                    </div>
                  )}
                </section>

                {/* Dispatch Items */}
                <section className={cardBase}>
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-erp-light text-erp-primary">
                        <Truck size={16} />
                      </div>

                      <div>
                        <h2 className="text-sm font-bold text-slate-800">Confirmed Dispatch Items</h2>

                        <p className="text-[11px] text-slate-500">Invoice only the quantity already dispatched.</p>
                      </div>
                    </div>

                    <span className="w-fit rounded-lg bg-slate-50 px-3 py-1.5 text-[10px] font-semibold text-slate-600">{dispatchItems.length} Items</span>
                  </div>

                  {dispatchLoading ? (
                    <div className="flex min-h-36 items-center justify-center gap-2 text-xs text-slate-500">
                      <LoaderCircle size={16} className="animate-spin" />
                      Loading confirmed dispatches...
                    </div>
                  ) : form.items.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center">
                      <Package size={24} className="mx-auto text-slate-300" />

                      <p className="mt-2 text-xs font-semibold text-slate-700">No Confirmed Dispatch Items</p>

                      <p className="mt-1 text-[10px] text-slate-500">This Sales Order does not have any confirmed dispatch quantity available for invoicing.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {form.items.map((item, index) => {
                        const selectedQuantity = Number(item.quantity) || 0

                        const gross = selectedQuantity * Number(item.rate || 0)

                        const discount = Math.min(gross, selectedQuantity * Number(item.discount || 0))

                        const taxable = Math.max(0, gross - discount)

                        const tax = (taxable * Number(item.taxRate || 0)) / 100

                        const lineTotal = taxable + tax

                        const overAvailable = selectedQuantity > item.availableQuantity

                        return (
                          <div key={`${item.dispatchId}-${item.dispatchItemId}`} className="rounded-lg border border-slate-200 p-3">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex min-w-0 items-center gap-2.5">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                                  <Package size={16} />
                                </div>

                                <div className="min-w-0">
                                  <p className="truncate text-xs font-bold text-slate-800">{item.productName}</p>

                                  <p className="mt-0.5 text-[10px] text-slate-500">
                                    SKU: {item.sku || '—'} · Unit: {item.unit}
                                  </p>

                                  <p className="mt-0.5 text-[9px] text-slate-500">
                                    Dispatch: {item.dispatchNumber} · {formatDate(item.dispatchDate)}
                                  </p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-1.5 sm:min-w-[360px] sm:grid-cols-3">
                                <div className="rounded-md bg-slate-50 px-2 py-1.5 text-center">
                                  <p className="text-[9px] text-slate-500">Dispatched</p>

                                  <p className="text-[11px] font-bold text-slate-800">{quantity(item.dispatchedQuantity)}</p>
                                </div>

                                <div className="rounded-md bg-amber-50 px-2 py-1.5 text-center">
                                  <p className="text-[9px] text-amber-700">Already Invoiced</p>

                                  <p className="text-[11px] font-bold text-amber-700">{quantity(item.alreadyInvoicedQuantity)}</p>
                                </div>

                                <div className="rounded-md bg-erp-light px-2 py-1.5 text-center">
                                  <p className="text-[9px] text-erp-primary">Available</p>

                                  <p className="text-[11px] font-bold text-erp-primary">{quantity(item.availableQuantity)}</p>
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                              <div>
                                <label className={labelBase}>Invoice Quantity</label>

                                <input type="number" min="0" max={item.availableQuantity} step="0.001" className={inputBase} value={item.quantity} onChange={(event) => updateItem(index, event.target.value)} disabled={readOnly} />
                              </div>

                              <div>
                                <label className={labelBase}>Rate</label>

                                <div className="flex h-9 items-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-700">{money(item.rate)}</div>
                              </div>

                              <div>
                                <label className={labelBase}>GST Rate</label>

                                <div className="flex h-9 items-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-700">{quantity(item.taxRate)}%</div>
                              </div>

                              <div>
                                <label className={labelBase}>Line Total</label>

                                <div className="flex h-9 items-center rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-bold text-emerald-700">{money(lineTotal)}</div>
                              </div>
                            </div>

                            {overAvailable && (
                              <p className="mt-2 flex items-center gap-1.5 text-[10px] text-red-600">
                                <AlertCircle size={13} />
                                Invoice quantity cannot exceed available dispatched quantity.
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {dispatchItems.length > 0 && !hasAvailableItems && (
                    <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[10px] text-amber-800">
                      <AlertCircle size={14} className="mt-0.5 shrink-0" />
                      <span>All confirmed dispatch quantities have already been invoiced.</span>
                    </div>
                  )}
                </section>

                {/* Invoice Summary */}
                <section className={cardBase}>
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-erp-light text-erp-primary">
                      <IndianRupee size={16} />
                    </div>

                    <div>
                      <h2 className="text-sm font-bold text-slate-800">Invoice Summary</h2>

                      <p className="text-[11px] text-slate-500">Calculated from selected dispatch quantities.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      {
                        label: 'Subtotal',
                        value: money(totals.subtotal),
                        color: 'text-slate-800',
                      },
                      {
                        label: 'Discount',
                        value: money(totals.discount),
                        color: 'text-amber-700',
                      },
                      {
                        label: 'GST',
                        value: money(totals.tax),
                        color: 'text-blue-700',
                      },
                      {
                        label: 'Grand Total',
                        value: money(totals.total),
                        color: 'text-erp-primary',
                      },
                    ].map((stat) => (
                      <div key={stat.label} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                        <p className="text-[9px] font-medium uppercase tracking-wide text-slate-500">{stat.label}</p>

                        <p className={`mt-1 text-sm font-bold ${stat.color}`}>{stat.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3">
                    <label className={labelBase}>Invoice Notes</label>

                    <textarea
                      rows={2}
                      maxLength={2000}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-light"
                      value={form.notes}
                      placeholder="Add payment terms, delivery or other invoice notes..."
                      onChange={(event) => updateField('notes', event.target.value)}
                      disabled={readOnly}
                    />

                    <p className="mt-1 text-right text-[9px] text-slate-400">{form.notes.length}/2000 characters</p>
                  </div>
                </section>
              </>
            )}
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-3 py-2.5 backdrop-blur sm:left-[var(--sidebar-width,0px)] sm:px-5">
          <div className="flex items-center justify-between gap-2">
            <Link to="/company/invoices" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50">
              <ArrowLeft size={14} />
              Cancel
            </Link>

            <div className="flex items-center gap-2">
              <span className="hidden text-[10px] text-slate-500 md:inline">Only confirmed dispatch quantities can be invoiced.</span>

              <button
                type="submit"
                disabled={saving || readOnly || (isEdit ? !canUpdate : !canCreate) || (!isEdit && !form.salesOrderId) || dispatchLoading}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-erp-primary px-4 text-xs font-semibold text-white transition hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}

                {saving ? 'Saving...' : isEdit ? 'Update Draft' : 'Create Draft'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
