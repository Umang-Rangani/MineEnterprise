import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, ClipboardList, LoaderCircle, Package, Save, Warehouse as WarehouseIcon, AlertCircle, CheckCircle2, Truck, Search, Check, ShoppingCart } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Loading from '../Loading/Loading'
import { hasPermission, useAuth } from '../../context/AuthContext'

const today = new Date().toISOString().slice(0, 10)

const initialForm = {
  purchaseId: '',
  warehouseId: '',
  receiptDate: today,
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

const unwrapPurchase = (response) => response?.data?.purchase || response?.data?.data?.purchase || response?.data?.data || null

const getPurchaseOptions = (response) => response?.data?.purchases || response?.data?.data?.purchases || []

const getWarehouseOptions = (response) => response?.data?.data || response?.data?.warehouses || response?.data?.data?.warehouses || []

function normalizePurchaseItem(item) {
  const product = item.productId && typeof item.productId === 'object' ? item.productId : null

  return {
    purchaseItemId: item._id || item.purchaseItemId || '',
    productId: product?._id || item.productId || '',
    productName: item.productName || product?.name || 'Product',
    sku: item.sku || product?.sku || '',
    unit: item.unit || product?.unit || 'Piece',
    orderedQuantity: Number(item.quantity) || 0,
    previouslyReceivedQuantity: Number(item.receivedQuantity) || 0,
    receivedQuantity: 0,
    damagedQuantity: 0,
    unitPrice: Number(item.unitPrice) || 0,
    notes: '',
  }
}

function normalizeReceiptItem(item) {
  return {
    purchaseItemId: String(item.purchaseItemId?._id || item.purchaseItemId || ''),
    productId: String(item.productId?._id || item.productId || ''),
    productName: item.productName || '',
    sku: item.sku || '',
    unit: item.unit || 'Piece',
    orderedQuantity: Number(item.orderedQuantity) || 0,
    previouslyReceivedQuantity: Number(item.previouslyReceivedQuantity) || 0,
    receivedQuantity: Number(item.receivedQuantity) || 0,
    damagedQuantity: Number(item.damagedQuantity) || 0,
    unitPrice: Number(item.unitPrice) || 0,
    notes: item.notes || '',
  }
}

function getSupplierName(purchase) {
  return purchase?.supplierName || purchase?.supplierId?.supplierName || purchase?.supplier?.supplierName || 'Supplier'
}

function getPurchaseDate(purchase) {
  return purchase?.purchaseDate || purchase?.createdAt
}

function getRemainingProducts(purchase) {
  return (purchase?.items || []).filter((item) => Number(item.quantity || 0) - Number(item.receivedQuantity || 0) > 0)
}

function getRemainingQuantity(purchase) {
  return getRemainingProducts(purchase).reduce((total, item) => total + Math.max(0, Number(item.quantity || 0) - Number(item.receivedQuantity || 0)), 0)
}

function getStatusStyle(status) {
  if (status === 'Ordered') {
    return 'border-blue-200 bg-blue-50 text-blue-700'
  }

  if (status === 'Partially Received') {
    return 'border-amber-200 bg-amber-50 text-amber-700'
  }

  return 'border-slate-200 bg-slate-50 text-slate-600'
}

export default function GoodsReceiptForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const auth = useAuth()
  const permissions = auth?.permissions

  const canCreate = hasPermission(permissions, 'purchase:create')
  const canView = hasPermission(permissions, 'purchase:view')

  const [form, setForm] = useState(initialForm)
  const [purchases, setPurchases] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [receiptNumber, setReceiptNumber] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  const selectedPurchase = useMemo(() => purchases.find((purchase) => String(purchase._id) === String(form.purchaseId)), [purchases, form.purchaseId])

  const filteredPurchases = useMemo(() => {
    const searchText = search.trim().toLowerCase()

    return [...purchases]
      .filter((purchase) => {
        const matchesStatus = statusFilter === 'All' || purchase.status === statusFilter

        const supplierName = getSupplierName(purchase)

        const matchesSearch =
          !searchText ||
          String(purchase.purchaseNumber || '')
            .toLowerCase()
            .includes(searchText) ||
          supplierName.toLowerCase().includes(searchText) ||
          (purchase.items || []).some((item) =>
            String(item.productName || item.productId?.name || '')
              .toLowerCase()
              .includes(searchText),
          )

        return matchesStatus && matchesSearch
      })
      .sort((a, b) => {
        const aDate = new Date(getPurchaseDate(a) || 0).getTime()
        const bDate = new Date(getPurchaseDate(b) || 0).getTime()
        return bDate - aDate
      })
  }, [purchases, search, statusFilter])

  const totals = useMemo(
    () =>
      form.items.reduce(
        (result, item) => {
          const received = Number(item.receivedQuantity) || 0
          const damaged = Number(item.damagedQuantity) || 0

          result.received += received
          result.damaged += damaged
          result.accepted += Math.max(0, received - damaged)
          result.value += Math.max(0, received - damaged) * (Number(item.unitPrice) || 0)

          return result
        },
        { received: 0, damaged: 0, accepted: 0, value: 0 },
      ),
    [form.items],
  )

  useEffect(() => {
    let active = true

    async function loadFormData() {
      setLoading(true)
      setError('')

      try {
        const [orderedResponse, partialResponse, warehouseResponse] = await Promise.all([
          axiosInstance.get('/erp/purchases', {
            params: { page: 1, limit: 100, status: 'Ordered' },
          }),
          axiosInstance.get('/erp/purchases', {
            params: { page: 1, limit: 100, status: 'Partially Received' },
          }),
          axiosInstance.get('/erp/warehouses', {
            params: { page: 1, limit: 100, status: 'Active' },
          }),
        ])

        if (!active) return

        const allPurchases = [...getPurchaseOptions(orderedResponse), ...getPurchaseOptions(partialResponse)]

        const uniquePurchases = Array.from(new Map(allPurchases.map((purchase) => [String(purchase._id), purchase])).values())

        setPurchases(uniquePurchases)
        setWarehouses(getWarehouseOptions(warehouseResponse))

        if (isEdit) {
          const response = await axiosInstance.get(`/erp/goods-receipts/${id}`)

          if (!active) return

          const receipt = response?.data?.receipt || response?.data?.data?.receipt || response?.data?.data

          if (!receipt?._id) {
            throw new Error('Goods Receipt details could not be loaded.')
          }

          const purchaseResponse = await axiosInstance.get(`/erp/purchases/${receipt.purchaseId?._id || receipt.purchaseId}`)

          if (!active) return

          const purchase = unwrapPurchase(purchaseResponse)

          setReceiptNumber(receipt.receiptNumber || '')

          if (purchase?._id) {
            setPurchases((current) => (current.some((entry) => String(entry._id) === String(purchase._id)) ? current : [purchase, ...current]))
          }

          setForm({
            purchaseId: String(receipt.purchaseId?._id || receipt.purchaseId || ''),
            warehouseId: String(receipt.warehouseId?._id || receipt.warehouseId || ''),
            receiptDate: receipt.receiptDate ? new Date(receipt.receiptDate).toISOString().slice(0, 10) : today,
            notes: receipt.notes || '',
            items: (receipt.items || []).map(normalizeReceiptItem),
          })

          if (receipt.status !== 'Draft') {
            setError('Only Draft Goods Receipts can be edited.')
          }
        }
      } catch (loadError) {
        if (active) {
          setError(getErrorMessage(loadError, 'Unable to load Goods Receipt form.'))
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
    setForm((current) => ({ ...current, [field]: value }))
    setError('')
    setNotice('')
  }

  function handlePurchaseChange(purchaseId) {
    const purchase = purchases.find((entry) => String(entry._id) === String(purchaseId))

    setForm((current) => ({
      ...current,
      purchaseId,
      items: purchase ? (purchase.items || []).map(normalizePurchaseItem) : [],
    }))

    setError('')
    setNotice('')
  }

  function updateItem(index, field, value) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    }))

    setError('')
    setNotice('')
  }

  function validateForm() {
    if (!form.purchaseId) return 'Please select a Purchase Order.'
    if (!form.warehouseId) return 'Please select a warehouse.'
    if (!form.receiptDate) return 'Receipt date is required.'
    if (!form.items.length) return 'The selected Purchase Order has no items.'

    for (const item of form.items) {
      const received = Number(item.receivedQuantity)
      const damaged = Number(item.damagedQuantity)
      const remaining = Number(item.orderedQuantity) - Number(item.previouslyReceivedQuantity)

      if (!Number.isFinite(received) || received < 0) {
        return `Enter a valid received quantity for ${item.productName}.`
      }

      if (!Number.isFinite(damaged) || damaged < 0) {
        return `Enter a valid damaged quantity for ${item.productName}.`
      }

      if (damaged > received) {
        return `Damaged quantity cannot exceed received quantity for ${item.productName}.`
      }

      if (received > remaining) {
        return `Received quantity exceeds the remaining quantity for ${item.productName}.`
      }

      if (received > 0 && !item.purchaseItemId) {
        return `Purchase item reference is missing for ${item.productName}.`
      }
    }

    if (!form.items.some((item) => Number(item.receivedQuantity) > 0)) {
      return 'Enter a received quantity for at least one product.'
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

    if (!canCreate) {
      setError('You do not have permission to create or edit Goods Receipts.')
      return
    }

    const validationMessage = validateForm()

    if (validationMessage) {
      setError(validationMessage)
      return
    }

    setSaving(true)

    const payload = {
      purchaseId: form.purchaseId,
      warehouseId: form.warehouseId,
      receiptDate: form.receiptDate,
      notes: form.notes.trim(),
      items: form.items
        .filter((item) => Number(item.receivedQuantity) > 0)
        .map((item) => ({
          purchaseItemId: item.purchaseItemId,
          receivedQuantity: Number(item.receivedQuantity),
          damagedQuantity: Number(item.damagedQuantity) || 0,
          notes: item.notes || '',
        })),
    }

    try {
      if (isEdit) {
        await axiosInstance.patch(`/erp/goods-receipts/${id}`, payload)
      } else {
        await axiosInstance.post('/erp/goods-receipts', payload)
      }

      navigate('/company/goods-receipts', {
        state: {
          message: isEdit ? 'Goods Receipt draft updated successfully.' : 'Goods Receipt draft created successfully.',
        },
      })
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Unable to save Goods Receipt.'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-w-0 space-y-4 text-sm">
        <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="h-1 bg-erp-primary" />

          <div className="flex min-h-16 items-center px-4 sm:px-5">
            <BreadCrumb
              items={[
                { title: 'Goods Receipts', link: '/company/goods-receipts' },
                {
                  title: isEdit ? 'Edit Goods Receipt' : 'New Goods Receipt',
                  link: null,
                },
              ]}
            />
          </div>
        </section>

        <section className="relative min-h-[480px] overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex min-h-[480px] items-center justify-center">
            <Loading fullScreen={false} label={isEdit ? 'Loading Goods Receipt...' : 'Preparing Goods Receipt Form...'} description="Fetching purchase orders, active warehouses and receipt information..." className="!h-full min-h-[480px]" />
          </div>
        </section>
      </div>
    )
  }


  const readOnly = isEdit && Boolean(error?.includes('Only Draft'))

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card h-17">
        <div className="h-1 bg-erp-primary" />
        <div className="flex min-h-16 items-center justify-between gap-3 px-3 sm:px-4">
          <BreadCrumb
            items={[
              { title: 'Goods Receipts', link: '/company/goods-receipts' },
              {
                title: isEdit ? 'Edit Goods Receipt' : 'New Goods Receipt',
                link: null,
              },
            ]}
          />

          {isEdit && receiptNumber && <span className="shrink-0 rounded-lg bg-erp-light px-2.5 py-1.5 text-[11px] font-bold text-erp-primary">{receiptNumber}</span>}
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
          <span>{error}</span>
        </div>
      )}

      {notice && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-700">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {!canView && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">You do not have permission to view purchase details.</div>}

      <form onSubmit={handleSubmit}>
        <div className={!isEdit ? 'grid grid-cols-1 items-start gap-3 xl:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.1fr)]' : 'space-y-3'}>
          {/* LEFT SIDE: PURCHASE REQUESTS */}
          {!isEdit && (
            <section className={`${cardBase} xl:sticky xl:top-3`}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-erp-light text-erp-primary">
                    <ShoppingCart size={16} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-slate-800">Purchase Requests</h2>
                    <p className="text-[10px] text-slate-500">Select an order to receive.</p>
                  </div>
                </div>

                <span className="shrink-0 rounded-lg bg-erp-light px-2 py-1.5 text-[10px] font-bold text-erp-primary">{filteredPurchases.length} Orders</span>
              </div>

              <div className="mb-3 space-y-2">
                <div className="relative">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search PO, supplier or product..." className={`${inputBase} pl-9`} />
                </div>

                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={inputBase}>
                  <option value="All">All Requests</option>
                  <option value="Ordered">New Orders</option>
                  <option value="Partially Received">Partially Received</option>
                </select>
              </div>

              {filteredPurchases.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 px-3 py-8 text-center">
                  <Package size={24} className="mx-auto text-slate-300" />
                  <p className="mt-2 text-xs font-semibold text-slate-700">No Purchase Orders Found</p>
                  <p className="mt-1 text-[10px] text-slate-500">No matching orders are available for receiving.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredPurchases.map((purchase) => {
                    const isSelected = String(form.purchaseId) === String(purchase._id)

                    const productNames = [...new Set((purchase.items || []).map((item) => item.productName || item.productId?.name || 'Product').filter(Boolean))]

                    return (
                      <article key={purchase._id} className={`overflow-hidden rounded-lg border transition ${isSelected ? 'border-erp-primary bg-erp-light/40 ring-1 ring-erp-primary/20' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                        <div className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <p className="mt-0.5 text-[9px] text-slate-400">{formatDate(getPurchaseDate(purchase))}</p> -<h3 className="text-xs font-bold text-slate-800">{purchase.purchaseNumber || 'Purchase Order'}</h3> -
                                <p className=" truncate text-[15px] font-semibold text-slate-600">{getSupplierName(purchase)}</p>
                                {isSelected && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
                                    <Check size={10} />
                                    Selected
                                  </span>
                                )}
                              </div>
                            </div>

                            <span className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-bold ${getStatusStyle(purchase.status)}`}>{purchase.status === 'Ordered' ? 'New Order' : purchase.status}</span>
                          </div>

                          <div className="mt-3">
                            <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wide text-slate-400">Products</p>

                            <div className="flex flex-wrap gap-1.5">
                              {productNames.length ? (
                                productNames.map((name, index) => (
                                  <span key={`${name}-${index}`} className="max-w-full truncate rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-700">
                                    {name}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[10px] text-slate-400">No products</span>
                              )}
                            </div>
                          </div>

                          <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
                            <div className="min-w-0">
                              <p className="text-[9px] text-slate-500">Order Total</p>
                              <p className="text-xs font-bold text-slate-800">{money(purchase.totalAmount)}</p>
                            </div>

                            <button
                              type="button"
                              onClick={() => handlePurchaseChange(String(purchase._id))}
                              disabled={getRemainingQuantity(purchase) <= 0 || readOnly}
                              className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[10px] font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                isSelected ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-erp-primary text-white hover:bg-erp-hover'
                              }`}
                            >
                              {isSelected ? <Check size={13} /> : <Package size={13} />}
                              {isSelected ? 'Selected' : 'Receive This Order'}
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

          {/* RIGHT SIDE: RECEIPT FORM */}
          <div className="min-w-0 space-y-3">
            {!isEdit && !selectedPurchase ? (
              <section className={`${cardBase} flex min-h-[300px] items-center justify-center`}>
                <div className="max-w-xs text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-erp-light text-erp-primary">
                    <ClipboardList size={22} />
                  </div>
                  <h2 className="mt-3 text-sm font-bold text-slate-800">Select a Purchase Request</h2>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">Select Receive This Order from the Purchase Requests panel. Receipt Information and Received Items will appear here.</p>
                </div>
              </section>
            ) : (
              <>
                {/* Receipt Information */}
                <section className={cardBase}>
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-erp-light text-erp-primary">
                      <ClipboardList size={16} />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-800">Receipt Information</h2>
                      <p className="text-[11px] text-slate-500">Select the receiving warehouse and receipt date.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className={labelBase}>
                        Warehouse <span className="text-red-500">*</span>
                      </label>
                      <select className={inputBase} value={form.warehouseId} onChange={(event) => updateField('warehouseId', event.target.value)} disabled={readOnly} required>
                        <option value="">Select Active Warehouse</option>
                        {warehouses.map((warehouse) => (
                          <option key={warehouse._id} value={warehouse._id}>
                            {warehouse.name} ({warehouse.code})
                          </option>
                        ))}
                      </select>

                      {warehouses.length === 0 && <p className="mt-1 text-[10px] text-amber-700">No active warehouses found. Create or activate a warehouse first.</p>}
                    </div>

                    <div>
                      <label className={labelBase}>
                        Receipt Date <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <CalendarDays size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="date" className={`${inputBase} pl-8`} value={form.receiptDate} max={today} onChange={(event) => updateField('receiptDate', event.target.value)} disabled={readOnly} required />
                      </div>
                    </div>
                  </div>

                  {selectedPurchase && (
                    <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-3">
                      <div>
                        <p className="text-[9px] font-medium uppercase tracking-wide text-slate-500">Purchase Order</p>
                        <p className="mt-1 text-[11px] font-bold text-slate-800">{selectedPurchase.purchaseNumber}</p>
                      </div>

                      <div>
                        <p className="text-[9px] font-medium uppercase tracking-wide text-slate-500">Supplier</p>
                        <p className="mt-1 truncate text-[11px] font-bold text-slate-800">{getSupplierName(selectedPurchase)}</p>
                      </div>

                      <div>
                        <p className="text-[9px] font-medium uppercase tracking-wide text-slate-500">Order Total</p>
                        <p className="mt-1 text-[11px] font-bold text-slate-800">{money(selectedPurchase.totalAmount)}</p>
                      </div>
                    </div>
                  )}
                </section>

                {/* Received Items */}
                <section className={cardBase}>
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-erp-light text-erp-primary">
                        <Truck size={16} />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-slate-800">Received Items</h2>
                        <p className="text-[11px] text-slate-500">Enter physical received and damaged quantities.</p>
                      </div>
                    </div>

                    <span className="w-fit rounded-lg bg-slate-50 px-3 py-1.5 text-[10px] font-semibold text-slate-600">{form.items.length} Products</span>
                  </div>

                  {form.items.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center">
                      <Package size={24} className="mx-auto text-slate-300" />
                      <p className="mt-2 text-xs font-semibold text-slate-700">No Purchase Order Items</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {form.items.map((item, index) => {
                        const remaining = Math.max(0, Number(item.orderedQuantity) - Number(item.previouslyReceivedQuantity))

                        const received = Number(item.receivedQuantity) || 0
                        const damaged = Number(item.damagedQuantity) || 0
                        const accepted = Math.max(0, received - damaged)
                        const overRemaining = received > remaining
                        const damagedInvalid = damaged > received

                        return (
                          <div key={`${item.purchaseItemId || item.productId}-${index}`} className="rounded-lg border border-slate-200 p-3">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex min-w-0 items-center gap-2.5">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                                  <Package size={16} />
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-bold text-slate-800">{item.productName}</p>
                                  <p className="mt-0.5 text-[10px] text-slate-500">
                                    SKU: {item.sku || '—'} · Unit: {item.unit} · Cost: {money(item.unitPrice)}
                                  </p>
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-1.5 sm:min-w-[280px]">
                                <div className="rounded-md bg-slate-50 px-2 py-1.5 text-center">
                                  <p className="text-[9px] text-slate-500">Ordered</p>
                                  <p className="text-[11px] font-bold text-slate-800">{quantity(item.orderedQuantity)}</p>
                                </div>

                                <div className="rounded-md bg-slate-50 px-2 py-1.5 text-center">
                                  <p className="text-[9px] text-slate-500">Received</p>
                                  <p className="text-[11px] font-bold text-slate-800">{quantity(item.previouslyReceivedQuantity)}</p>
                                </div>

                                <div className="rounded-md bg-erp-light px-2 py-1.5 text-center">
                                  <p className="text-[9px] text-erp-primary">Remaining</p>
                                  <p className="text-[11px] font-bold text-erp-primary">{quantity(remaining)}</p>
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                              <div>
                                <label className={labelBase}>Received Quantity</label>
                                <input type="number" min="0" max={remaining} step="0.001" className={inputBase} value={item.receivedQuantity} onChange={(event) => updateItem(index, 'receivedQuantity', event.target.value)} disabled={readOnly} />
                              </div>

                              <div>
                                <label className={labelBase}>Damaged Quantity</label>
                                <input type="number" min="0" max={received} step="0.001" className={inputBase} value={item.damagedQuantity} onChange={(event) => updateItem(index, 'damagedQuantity', event.target.value)} disabled={readOnly} />
                              </div>

                              <div>
                                <label className={labelBase}>Accepted Quantity</label>
                                <div className="flex h-9 items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3">
                                  <span className="text-[10px] text-emerald-700">Stock on confirmation</span>
                                  <span className="text-xs font-bold text-emerald-700">{quantity(accepted)}</span>
                                </div>
                              </div>
                            </div>

                            {(overRemaining || damagedInvalid) && (
                              <p className="mt-2 flex items-center gap-1.5 text-[10px] text-red-600">
                                <AlertCircle size={13} />
                                {overRemaining ? 'Received quantity cannot exceed remaining quantity.' : 'Damaged quantity cannot exceed received quantity.'}
                              </p>
                            )}

                            <div className="mt-2">
                              <label className={labelBase}>Item Notes</label>
                              <input type="text" maxLength={500} className={inputBase} value={item.notes} placeholder="Optional product notes..." onChange={(event) => updateItem(index, 'notes', event.target.value)} disabled={readOnly} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </section>

                {/* Receipt Summary */}
                <section className={cardBase}>
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-erp-light text-erp-primary">
                      <WarehouseIcon size={16} />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-800">Receipt Summary</h2>
                      <p className="text-[11px] text-slate-500">Only accepted quantities increase warehouse stock after confirmation.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      {
                        label: 'Total Received',
                        value: quantity(totals.received),
                        color: 'text-slate-800',
                      },
                      {
                        label: 'Total Damaged',
                        value: quantity(totals.damaged),
                        color: 'text-red-600',
                      },
                      {
                        label: 'Accepted Stock',
                        value: quantity(totals.accepted),
                        color: 'text-emerald-700',
                      },
                      {
                        label: 'Accepted Value',
                        value: money(totals.value),
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
                    <label className={labelBase}>Receipt Notes</label>
                    <textarea
                      rows={2}
                      maxLength={2000}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-light"
                      value={form.notes}
                      placeholder="Add delivery, packaging or inspection notes..."
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
            <Link to="/company/goods-receipts" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50">
              <ArrowLeft size={14} />
              Cancel
            </Link>

            <div className="flex items-center gap-2">
              <span className="hidden text-[10px] text-slate-500 md:inline">Stock remains unchanged until confirmation.</span>

              <button
                type="submit"
                disabled={saving || readOnly || !canCreate || (!isEdit && !form.purchaseId)}
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
