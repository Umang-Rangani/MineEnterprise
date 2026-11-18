import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, ClipboardList, LoaderCircle, Save, AlertCircle, CheckCircle2, Search, Check, CreditCard, ReceiptText, IndianRupee, UserRound, Wallet } from 'lucide-react'

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

const PAYMENT_MODES = ['Cash', 'Bank Transfer', 'UPI', 'Cheque']

const initialForm = {
  invoiceId: '',
  amount: '',
  paymentDate: today,
  paymentMode: 'Cash',
  transactionReference: '',
  notes: '',
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
  if (Array.isArray(data?.data?.invoices)) return data.data.invoices

  return []
}

const unwrapData = (response) => response?.data?.data?.payment || response?.data?.payment || response?.data?.data || null

const getCustomerName = (invoice) => invoice?.customerId?.customerName || invoice?.customerName || 'Customer'

const getInvoiceStatusStyle = (status) => {
  if (status === 'Approved') {
    return 'border-blue-200 bg-blue-50 text-blue-700'
  }

  if (status === 'Partially Paid') {
    return 'border-amber-200 bg-amber-50 text-amber-700'
  }

  if (status === 'Overdue') {
    return 'border-red-200 bg-red-50 text-red-700'
  }

  return 'border-slate-200 bg-slate-50 text-slate-600'
}

export default function PaymentForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const auth = useAuth()
  const permissions = auth?.permissions

  const canRecord = hasPermission(permissions, 'payment:record')
  const canUpdate = hasPermission(permissions, 'payment:update')
  const canView = hasPermission(permissions, 'payment:view')

  const [form, setForm] = useState(initialForm)

  const [invoices, setInvoices] = useState([])
  const [selectedInvoice, setSelectedInvoice] = useState(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [paymentNumber, setPaymentNumber] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  const filteredInvoices = useMemo(() => {
    const searchText = search.trim().toLowerCase()

    return [...invoices]
      .filter((invoice) => {
        const matchesStatus = statusFilter === 'All' || invoice.status === statusFilter

        const customerName = getCustomerName(invoice)

        const matchesSearch =
          !searchText ||
          String(invoice.invoiceNumber || '')
            .toLowerCase()
            .includes(searchText) ||
          customerName.toLowerCase().includes(searchText) ||
          String(invoice.customerId?.customerCode || '')
            .toLowerCase()
            .includes(searchText) ||
          String(invoice.salesOrderId?.orderNumber || '')
            .toLowerCase()
            .includes(searchText)

        return matchesStatus && matchesSearch
      })
      .sort((a, b) => {
        const aDate = new Date(a.invoiceDate || a.createdAt || 0).getTime()
        const bDate = new Date(b.invoiceDate || b.createdAt || 0).getTime()

        return bDate - aDate
      })
  }, [invoices, search, statusFilter])

  const outstandingBalance = Number(selectedInvoice?.balanceAmount) || 0
  const paidAmount = Number(selectedInvoice?.paidAmount) || 0
  const grandTotal = Number(selectedInvoice?.grandTotal) || 0
  const enteredAmount = Number(form.amount) || 0

  const remainingAfterPayment = Math.max(0, outstandingBalance - enteredAmount)

  useEffect(() => {
    let active = true

    async function loadFormData() {
      setLoading(true)
      setError('')
      setNotice('')

      try {
        if (isEdit) {
          if (!canView) {
            throw new Error('You do not have permission to view Payments.')
          }

          if (!canUpdate) {
            throw new Error('You do not have permission to update Payments.')
          }

          const response = await axiosInstance.get(`/erp/payments/${id}`)

          if (!active) return

          const payment = unwrapData(response)

          if (!payment?._id) {
            throw new Error('Payment details could not be loaded.')
          }

          setPaymentNumber(payment.paymentNumber || '')
          setPaymentStatus(payment.status || '')

          const invoice = payment.invoiceId && typeof payment.invoiceId === 'object' ? payment.invoiceId : null

          setSelectedInvoice(invoice)

          setForm({
            invoiceId: String(invoice?._id || payment.invoiceId || ''),
            amount: String(payment.amount ?? ''),
            paymentDate: payment.paymentDate ? getLocalDate(new Date(payment.paymentDate)) : today,
            paymentMode: payment.paymentMode || 'Cash',
            transactionReference: payment.transactionReference || '',
            notes: payment.notes || '',
          })
        } else {
          if (!canRecord) {
            throw new Error('You do not have permission to record Payments.')
          }

          const [approvedResponse, partialResponse, overdueResponse] = await Promise.all([
            axiosInstance.get('/erp/invoices', {
              params: {
                page: 1,
                limit: 100,
                status: 'Approved',
              },
            }),
            axiosInstance.get('/erp/invoices', {
              params: {
                page: 1,
                limit: 100,
                status: 'Partially Paid',
              },
            }),
            axiosInstance.get('/erp/invoices', {
              params: {
                page: 1,
                limit: 100,
                status: 'Overdue',
              },
            }),
          ])

          if (!active) return

          const loadedInvoices = [...getList(approvedResponse), ...getList(partialResponse), ...getList(overdueResponse)]

          const uniqueInvoices = Array.from(new Map(loadedInvoices.map((invoice) => [String(invoice._id), invoice])).values()).filter((invoice) => Number(invoice.balanceAmount) > 0)

          setInvoices(uniqueInvoices)
        }
      } catch (loadError) {
        if (active) {
          setError(getErrorMessage(loadError, 'Unable to load Payment form.'))
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

  function handleInvoiceChange(invoiceId) {
    const invoice = invoices.find((entry) => String(entry._id) === String(invoiceId))

    setSelectedInvoice(invoice || null)

    setForm((current) => ({
      ...current,
      invoiceId,
      amount: '',
    }))

    setError('')
    setNotice('')
  }

  function validateForm() {
    if (!isEdit && !form.invoiceId) {
      return 'Please select an Invoice.'
    }

    if (!isEdit && !selectedInvoice) {
      return 'Selected Invoice details could not be found.'
    }

    if (!isEdit && !['Approved', 'Partially Paid', 'Overdue'].includes(selectedInvoice?.status)) {
      return 'Payment can only be recorded against an approved Invoice.'
    }

    if (!isEdit && outstandingBalance <= 0) {
      return 'This Invoice has no outstanding balance.'
    }

    if (form.amount === '' || !Number.isFinite(Number(form.amount))) {
      return 'Please enter a valid payment amount.'
    }

    const amount = Number(form.amount)

    if (amount <= 0) {
      return 'Payment amount must be greater than zero.'
    }

    if (!isEdit && amount > outstandingBalance) {
      return `Payment amount cannot exceed the outstanding balance of ${money(outstandingBalance)}.`
    }

    if (Math.round(amount * 100) !== amount * 100) {
      return 'Payment amount cannot have more than 2 decimal places.'
    }

    if (!form.paymentDate) {
      return 'Payment date is required.'
    }

    if (form.paymentDate > today) {
      return 'Payment date cannot be in the future.'
    }

    if (!PAYMENT_MODES.includes(form.paymentMode)) {
      return 'Please select a valid Payment Mode.'
    }

    if (form.transactionReference.trim().length > 100) {
      return 'Transaction reference cannot exceed 100 characters.'
    }

    if (form.notes.length > 1000) {
      return 'Notes cannot exceed 1000 characters.'
    }

    return ''
  }

  async function handleSubmit(event) {
    event.preventDefault()

    setError('')
    setNotice('')

    if (isEdit && !canUpdate) {
      setError('You do not have permission to update Payments.')
      return
    }

    if (!isEdit && !canRecord) {
      setError('You do not have permission to record Payments.')
      return
    }

    if (isEdit && paymentStatus === 'Refunded') {
      setError('A fully refunded Payment cannot be updated.')
      return
    }

    const validationMessage = validateForm()

    if (validationMessage) {
      setError(validationMessage)
      return
    }

    setSaving(true)

    const payload = {
      paymentDate: form.paymentDate,
      paymentMode: form.paymentMode,
      transactionReference: form.transactionReference.trim(),
      notes: form.notes.trim(),
    }

    if (!isEdit) {
      payload.invoiceId = form.invoiceId
      payload.amount = Number(form.amount)
    }

    try {
      if (isEdit) {
        await axiosInstance.patch(`/erp/payments/${id}`, payload)
      } else {
        await axiosInstance.post('/erp/payments', payload)
      }

      navigate('/company/payments', {
        state: {
          message: isEdit ? 'Payment details updated successfully.' : 'Payment recorded successfully.',
        },
      })
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Unable to save Payment details.'))
    } finally {
      setSaving(false)
    }
  }

  const readOnly = isEdit && paymentStatus === 'Refunded'

  if (loading) {
    return (
      <div className="min-w-0 space-y-4 text-sm">
        <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="h-1 bg-erp-primary" />

          <div className="flex min-h-16 items-center px-4 sm:px-5">
            <BreadCrumb
              items={[
                {
                  title: 'Payments',
                  link: '/company/payments',
                },
                {
                  title: isEdit ? 'Edit Payment' : 'Record Payment',
                  link: null,
                },
              ]}
            />
          </div>
        </section>

        <section className="relative min-h-[480px] overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex min-h-[480px] items-center justify-center">
            <Loading fullScreen={false} label={isEdit ? 'Loading Payment...' : 'Preparing Payment Form...'} description="Fetching invoice and payment information..." className="!h-full min-h-[480px]" />
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
                title: 'Payments',
                link: '/company/payments',
              },
              {
                title: isEdit ? 'Edit Payment' : 'Record Payment',
                link: null,
              },
            ]}
          />

          {isEdit && paymentNumber && <span className="shrink-0 rounded-lg bg-erp-light px-2.5 py-1.5 text-[11px] font-bold text-erp-primary">{paymentNumber}</span>}
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
          <span>A fully refunded Payment cannot be updated.</span>
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
          {/* Invoice Selection */}
          {!isEdit && (
            <section className={`${cardBase} xl:sticky xl:top-3`}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-erp-light text-erp-primary">
                    <ReceiptText size={16} />
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-slate-800">Outstanding Invoices</h2>

                    <p className="text-[10px] text-slate-500">Select an invoice to record a payment.</p>
                  </div>
                </div>

                <span className="shrink-0 rounded-lg bg-erp-light px-2 py-1.5 text-[10px] font-bold text-erp-primary">{filteredInvoices.length} Invoices</span>
              </div>

              <div className="mb-3 space-y-2">
                <div className="relative">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

                  <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search invoice, customer..." className={`${inputBase} pl-9`} />
                </div>

                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={inputBase}>
                  <option value="All">All Outstanding Invoices</option>
                  <option value="Approved">Approved</option>
                  <option value="Partially Paid">Partially Paid</option>
                  <option value="Overdue">Overdue</option>
                </select>
              </div>

              {filteredInvoices.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 px-3 py-8 text-center">
                  <ReceiptText size={24} className="mx-auto text-slate-300" />

                  <p className="mt-2 text-xs font-semibold text-slate-700">No Outstanding Invoices Found</p>

                  <p className="mt-1 text-[10px] text-slate-500">Only approved invoices with an outstanding balance can receive payments.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredInvoices.map((invoice) => {
                    const isSelected = String(form.invoiceId) === String(invoice._id)

                    return (
                      <article key={invoice._id} className={`overflow-hidden rounded-lg border transition ${isSelected ? 'border-erp-primary bg-erp-light/40 ring-1 ring-erp-primary/20' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                        <div className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[9px] text-slate-400">{formatDate(invoice.invoiceDate)}</p>

                              <h3 className="mt-0.5 truncate text-xs font-bold text-slate-800">{invoice.invoiceNumber || 'Invoice'}</h3>

                              <p className="mt-1 truncate text-xs font-semibold text-slate-600">{getCustomerName(invoice)}</p>
                            </div>

                            <span className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-bold ${getInvoiceStatusStyle(invoice.status)}`}>{invoice.status}</span>
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-1.5">
                            <div className="rounded-md bg-slate-50 px-2 py-1.5">
                              <p className="text-[9px] text-slate-500">Invoice Total</p>

                              <p className="text-[11px] font-bold text-slate-800">{money(invoice.grandTotal)}</p>
                            </div>

                            <div className="rounded-md bg-amber-50 px-2 py-1.5">
                              <p className="text-[9px] text-amber-700">Outstanding</p>

                              <p className="text-[11px] font-bold text-amber-700">{money(invoice.balanceAmount)}</p>
                            </div>
                          </div>

                          <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
                            <div className="min-w-0">
                              <p className="text-[9px] text-slate-500">Paid Amount</p>

                              <p className="text-xs font-bold text-emerald-700">{money(invoice.paidAmount)}</p>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleInvoiceChange(String(invoice._id))}
                              className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[10px] font-bold transition ${
                                isSelected ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-erp-primary text-white hover:bg-erp-hover'
                              }`}
                            >
                              {isSelected ? <Check size={13} /> : <CreditCard size={13} />}

                              {isSelected ? 'Selected' : 'Select Invoice'}
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

          {/* Payment Form */}
          <div className="min-w-0 space-y-3">
            {!isEdit && !selectedInvoice ? (
              <section className={`${cardBase} flex min-h-[300px] items-center justify-center`}>
                <div className="max-w-xs text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-erp-light text-erp-primary">
                    <CreditCard size={22} />
                  </div>

                  <h2 className="mt-3 text-sm font-bold text-slate-800">Select an Invoice</h2>

                  <p className="mt-1 text-xs leading-relaxed text-slate-500">Select an invoice from the Outstanding Invoices panel. Payment Information will appear here.</p>
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

                      <p className="text-[11px] text-slate-500">Payment will be recorded against this invoice.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                      <p className="text-[9px] font-medium uppercase tracking-wide text-slate-500">Invoice Number</p>

                      <p className="mt-1 truncate text-[11px] font-bold text-slate-800">{selectedInvoice?.invoiceNumber || '—'}</p>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                      <p className="text-[9px] font-medium uppercase tracking-wide text-slate-500">Customer</p>

                      <p className="mt-1 truncate text-[11px] font-bold text-slate-800">{getCustomerName(selectedInvoice)}</p>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                      <p className="text-[9px] font-medium uppercase tracking-wide text-slate-500">Invoice Total</p>

                      <p className="mt-1 text-[11px] font-bold text-slate-800">{money(grandTotal)}</p>
                    </div>

                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5">
                      <p className="text-[9px] font-medium uppercase tracking-wide text-amber-700">Outstanding</p>

                      <p className="mt-1 text-[11px] font-bold text-amber-700">{money(outstandingBalance)}</p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <div className="rounded-lg bg-slate-50 p-2.5">
                      <p className="text-[9px] text-slate-500">Invoice Date</p>

                      <p className="mt-1 text-[11px] font-bold text-slate-800">{formatDate(selectedInvoice?.invoiceDate)}</p>
                    </div>

                    <div className="rounded-lg bg-slate-50 p-2.5">
                      <p className="text-[9px] text-slate-500">Due Date</p>

                      <p className="mt-1 text-[11px] font-bold text-slate-800">{formatDate(selectedInvoice?.dueDate)}</p>
                    </div>

                    <div className="rounded-lg bg-emerald-50 p-2.5">
                      <p className="text-[9px] text-emerald-700">Already Paid</p>

                      <p className="mt-1 text-[11px] font-bold text-emerald-700">{money(paidAmount)}</p>
                    </div>
                  </div>
                </section>

                {/* Payment Information */}
                <section className={cardBase}>
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-erp-light text-erp-primary">
                      <Wallet size={16} />
                    </div>

                    <div>
                      <h2 className="text-sm font-bold text-slate-800">Payment Information</h2>

                      <p className="text-[11px] text-slate-500">{isEdit ? 'Update payment date and payment details.' : 'Enter the amount and method used by the customer.'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className={labelBase}>
                        Payment Amount <span className="text-red-500">*</span>
                      </label>

                      <div className="relative">
                        <IndianRupee size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />

                        <input
                          type="number"
                          min="0.01"
                          max={isEdit ? undefined : outstandingBalance}
                          step="0.01"
                          className={`${inputBase} pl-8`}
                          value={form.amount}
                          onChange={(event) => updateField('amount', event.target.value)}
                          disabled={isEdit || readOnly}
                          required
                        />
                      </div>

                      {!isEdit && <p className="mt-1 text-[9px] text-slate-500">Maximum payment: {money(outstandingBalance)}</p>}
                    </div>

                    <div>
                      <label className={labelBase}>
                        Payment Date <span className="text-red-500">*</span>
                      </label>

                      <div className="relative">
                        <CalendarDays size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />

                        <input type="date" className={`${inputBase} pl-8`} value={form.paymentDate} max={today} onChange={(event) => updateField('paymentDate', event.target.value)} disabled={readOnly} required />
                      </div>
                    </div>

                    <div>
                      <label className={labelBase}>
                        Payment Mode <span className="text-red-500">*</span>
                      </label>

                      <select className={inputBase} value={form.paymentMode} onChange={(event) => updateField('paymentMode', event.target.value)} disabled={readOnly} required>
                        {PAYMENT_MODES.map((mode) => (
                          <option key={mode} value={mode}>
                            {mode}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={labelBase}>Transaction Reference</label>

                      <input
                        type="text"
                        maxLength={100}
                        className={inputBase}
                        value={form.transactionReference}
                        onChange={(event) => updateField('transactionReference', event.target.value)}
                        placeholder="Enter transaction / cheque reference"
                        disabled={readOnly}
                      />

                      <p className="mt-1 text-right text-[9px] text-slate-400">{form.transactionReference.length}/100 characters</p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className={labelBase}>Payment Notes</label>

                    <textarea
                      rows={3}
                      maxLength={1000}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-light"
                      value={form.notes}
                      placeholder="Add payment details or other notes..."
                      onChange={(event) => updateField('notes', event.target.value)}
                      disabled={readOnly}
                    />

                    <p className="mt-1 text-right text-[9px] text-slate-400">{form.notes.length}/1000 characters</p>
                  </div>
                </section>

                {/* Payment Summary */}
                <section className={cardBase}>
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-erp-light text-erp-primary">
                      <IndianRupee size={16} />
                    </div>

                    <div>
                      <h2 className="text-sm font-bold text-slate-800">Payment Summary</h2>

                      <p className="text-[11px] text-slate-500">Outstanding balance after this payment.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                      <p className="text-[9px] font-medium uppercase tracking-wide text-slate-500">Outstanding</p>

                      <p className="mt-1 text-sm font-bold text-slate-800">{money(outstandingBalance)}</p>
                    </div>

                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-2.5">
                      <p className="text-[9px] font-medium uppercase tracking-wide text-blue-700">This Payment</p>

                      <p className="mt-1 text-sm font-bold text-blue-700">{money(enteredAmount)}</p>
                    </div>

                    <div className="col-span-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 sm:col-span-1">
                      <p className="text-[9px] font-medium uppercase tracking-wide text-emerald-700">Remaining Balance</p>

                      <p className="mt-1 text-sm font-bold text-emerald-700">{money(isEdit ? outstandingBalance : remainingAfterPayment)}</p>
                    </div>
                  </div>

                  {!isEdit && enteredAmount > outstandingBalance && (
                    <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[10px] text-red-700">
                      <AlertCircle size={14} className="mt-0.5 shrink-0" />
                      <span>Payment amount cannot exceed the outstanding balance.</span>
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-3 py-2.5 backdrop-blur sm:left-[var(--sidebar-width,0px)] sm:px-5">
          <div className="flex items-center justify-between gap-2">
            <Link to="/company/payments" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50">
              <ArrowLeft size={14} />
              Cancel
            </Link>

            <div className="flex items-center gap-2">
              <span className="hidden text-[10px] text-slate-500 md:inline">{isEdit ? 'Only payment details can be updated.' : 'Payment cannot exceed the outstanding invoice balance.'}</span>

              <button
                type="submit"
                disabled={saving || readOnly || (isEdit ? !canUpdate : !canRecord) || (!isEdit && !form.invoiceId)}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-erp-primary px-4 text-xs font-semibold text-white transition hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}

                {saving ? 'Saving...' : isEdit ? 'Update Payment' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
