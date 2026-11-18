import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Receipt, FileText, Calculator, Wallet, Upload, Save, LoaderCircle, RefreshCw, Info, X, Image, File } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import Loading from '../Loading/Loading'
import { hasPermission, useAuth } from '../../context/AuthContext'

const getLocalDate = () => {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const initialForm = {
  expenseCategory: '',
  title: '',
  description: '',
  expenseDate: getLocalDate(),
  amount: '',
  taxRate: '0',
  paymentMode: 'Cash',
  transactionReference: '',
  receiptNumber: '',
}

const getExpense = (response) => {
  const data = response?.data

  return data?.expense || data?.data?.expense || data?.data || data
}

const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100

const getReceiptUrl = (filePath) => {
  if (!filePath) return ''

  const baseURL = axiosInstance.defaults.baseURL || 'http://localhost:3000'

  return `${baseURL.replace(/\/$/, '')}/${filePath.replace(/^\//, '')}`
}

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0)

const PAYMENT_MODES = ['Cash', 'Bank Transfer', 'UPI', 'Cheque', 'Other']

const MAX_FILE_SIZE = 4 * 1024 * 1024

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf']

export default function ExpenseForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const { permissions } = useAuth()

  const canCreate = hasPermission(permissions, 'expense:create')
  const canUpdate = hasPermission(permissions, 'expense:update')
  const canSubmit = isEdit ? canUpdate : canCreate

  const [form, setForm] = useState(initialForm)
  const [receiptPreview, setReceiptPreview] = useState('')
  const [receiptFile, setReceiptFile] = useState(null)
  const [existingReceipt, setExistingReceipt] = useState(null)

  const [loading, setLoading] = useState(isEdit)
  const [loadError, setLoadError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  const [toast, setToast] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [originalStatus, setOriginalStatus] = useState('Draft')

  const isLocked = isEdit && originalStatus !== 'Draft'

  const showToast = (type, message, duration = 3000) => {
    setToast({
      id: Date.now(),
      type,
      message,
      duration,
    })
  }

  const closeToast = () => setToast(null)

  useEffect(() => {
    document.title = isEdit ? 'Edit Expense | MineERP' : 'Create Expense | MineERP'
  }, [isEdit])

  useEffect(() => {
    let cancelled = false

    const loadFormData = async () => {
      if (!isEdit) {
        setLoading(false)
        setLoadError(false)
        return
      }

      setLoading(true)
      setLoadError(false)

      try {
        const response = await axiosInstance.get(`/erp/expenses/${id}`)

        if (cancelled) return

        const expense = getExpense(response)

        if (!expense?._id) {
          throw new Error('Expense details were not found.')
        }

        setOriginalStatus(expense.status || 'Draft')

        setForm({
          expenseCategory: expense.expenseCategory || '',
          title: expense.title || '',
          description: expense.description || '',
          expenseDate: expense.expenseDate ? new Date(expense.expenseDate).toISOString().slice(0, 10) : getLocalDate(),
          amount: String(expense.amount ?? ''),
          taxRate: String(expense.taxRate ?? 0),
          paymentMode: expense.paymentMode || 'Cash',
          transactionReference: expense.transactionReference || '',
          receiptNumber: expense.receiptNumber || '',
        })

        setExistingReceipt(expense.receiptFile || null)
        setReceiptFile(null)
      } catch (error) {
        if (!cancelled) {
          setLoadError(true)

          showToast('error', error.response?.data?.message || error.message || 'Unable to load expense details.', 5000)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadFormData()

    return () => {
      cancelled = true
    }
  }, [id, isEdit, retryKey])

  const updateFormField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))

    setFieldErrors((current) => ({
      ...current,
      [field]: '',
    }))
  }

  const handleReceiptChange = (event) => {
    const file = event.target.files?.[0]

    if (!file) return

    if (!ALLOWED_TYPES.includes(file.type)) {
      showToast('warning', 'Only JPG, PNG and PDF files are allowed.')
      event.target.value = ''
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      showToast('warning', 'Receipt file size cannot exceed 4 MB.')
      event.target.value = ''
      return
    }

    setReceiptFile(file)
    setFieldErrors((current) => ({
      ...current,
      receipt: '',
    }))
  }

  const removeSelectedReceipt = () => {
    setReceiptFile(null)

    const input = document.getElementById('expenseReceiptInput')

    if (input) input.value = ''
  }

  const amount = Number(form.amount) || 0
  const taxRate = Number(form.taxRate) || 0

  const taxAmount = roundMoney(amount * (taxRate / 100))
  const totalAmount = roundMoney(amount + taxAmount)

  const validateForm = () => {
    const errors = {}

    if (!form.expenseCategory.trim()) {
      errors.expenseCategory = 'Expense category is required.'
    } else if (form.expenseCategory.trim().length > 100) {
      errors.expenseCategory = 'Category cannot exceed 100 characters.'
    }

    if (!form.title.trim()) {
      errors.title = 'Expense title is required.'
    } else if (form.title.trim().length > 150) {
      errors.title = 'Title cannot exceed 150 characters.'
    }

    if (form.description.length > 2000) {
      errors.description = 'Description cannot exceed 2000 characters.'
    }

    if (!form.expenseDate) {
      errors.expenseDate = 'Expense date is required.'
    } else if (form.expenseDate > getLocalDate()) {
      errors.expenseDate = 'Expense date cannot be in the future.'
    }

    const enteredAmount = Number(form.amount)

    if (form.amount === '' || !Number.isFinite(enteredAmount) || enteredAmount <= 0) {
      errors.amount = 'Amount must be greater than zero.'
    }

    const enteredTaxRate = Number(form.taxRate)

    if (!Number.isFinite(enteredTaxRate) || enteredTaxRate < 0 || enteredTaxRate > 100) {
      errors.taxRate = 'Tax rate must be between 0 and 100.'
    }

    if (!PAYMENT_MODES.includes(form.paymentMode)) {
      errors.paymentMode = 'Select a valid payment mode.'
    }

    if (form.transactionReference.trim().length > 100) {
      errors.transactionReference = 'Transaction reference cannot exceed 100 characters.'
    }

    if (form.receiptNumber.trim().length > 100) {
      errors.receiptNumber = 'Receipt number cannot exceed 100 characters.'
    }

    setFieldErrors(errors)

    if (Object.keys(errors).length) {
      showToast('warning', 'Please check the highlighted fields.')
      return false
    }

    return true
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!canSubmit) {
      showToast('error', `You do not have permission to ${isEdit ? 'update' : 'create'} expenses.`)
      return
    }

    if (isLocked) {
      showToast('error', 'Only Draft expenses can be edited.')
      return
    }

    if (saving) return
    if (!validateForm()) return

    setSaving(true)

    let uploadedFilePath = ''

    try {
      let uploadedReceipt = null

      // Step 1: Upload receipt using Multer
      if (receiptFile) {
        const uploadData = new FormData()

        uploadData.append('file', receiptFile)
        uploadData.append('uploadFolder', 'expenses')
        uploadData.append('filename', 'expense-receipt')

        const uploadResponse = await axiosInstance.post('/upload', uploadData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })

        if (!uploadResponse.data?.success || !uploadResponse.data?.filePath || !uploadResponse.data?.file) {
          throw new Error('Receipt upload failed. Please try again.')
        }

        uploadedFilePath = uploadResponse.data.filePath

        uploadedReceipt = {
          ...uploadResponse.data.file,
          path: uploadResponse.data.filePath,
        }
      }

      // Step 2: Prepare JSON expense payload
      const payload = {
        expenseCategory: form.expenseCategory.trim(),
        title: form.title.trim(),
        description: form.description.trim(),
        expenseDate: form.expenseDate,
        amount: Number(form.amount),
        taxRate: Number(form.taxRate),
        paymentMode: form.paymentMode,
        transactionReference: form.transactionReference.trim(),
        receiptNumber: form.receiptNumber.trim(),
      }

      // Include receipt only when a new file is uploaded.
      if (uploadedReceipt) {
        payload.receiptFile = uploadedReceipt
      }

      // Step 3: Create or update expense
      if (isEdit) {
        await axiosInstance.patch(`/erp/expenses/${id}`, payload)
      } else {
        await axiosInstance.post('/erp/expenses', payload)
      }

      navigate('/company/expenses', {
        state: {
          message: isEdit ? 'Expense updated successfully.' : 'Expense created successfully as Draft.',
        },
      })
    } catch (error) {
      // Remove newly uploaded file if expense saving fails.
      if (uploadedFilePath) {
        try {
          await axiosInstance.delete('/upload', {
            data: {
              filePath: uploadedFilePath,
            },
          })
        } catch (deleteError) {
          console.error('Failed to remove uploaded receipt:', deleteError)
        }
      }

      showToast('error', error.response?.data?.message || error.message || `Unable to ${isEdit ? 'update' : 'create'} expense.`, 5000)
    } finally {
      setSaving(false)
    }
  }

  const breadcrumbItems = isEdit
    ? [
        {
          title: 'Expenses',
          link: '/company/expenses',
        },
        {
          title: 'Edit Expense',
          link: null,
        },
      ]
    : [
        {
          title: 'Expenses',
          link: '/company/expenses',
        },
        {
          title: 'Create Expense',
          link: null,
        },
      ]

  useEffect(() => {
    if (!receiptFile) {
      setReceiptPreview('')
      return
    }

    const previewUrl = URL.createObjectURL(receiptFile)

    setReceiptPreview(previewUrl)

    return () => {
      URL.revokeObjectURL(previewUrl)
    }
  }, [receiptFile])

  const inputClass = (field) => `h-10 w-full rounded-lg border bg-white px-3 text-xs text-slate-700 outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10 ${fieldErrors[field] ? 'border-red-400' : 'border-slate-200'}`

  const labelClass = 'mb-1.5 block text-xs font-semibold text-slate-700'

  const renderError = (field) => (fieldErrors[field] ? <p className="mt-1 text-[11px] text-red-600">{fieldErrors[field]}</p> : null)

  if (loading) {
    return (
      <div className="min-w-0 space-y-4 text-sm">
        <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="h-1 bg-erp-primary" />

          <div className="flex min-h-16 items-center px-4 sm:px-5">
            <BreadCrumb items={breadcrumbItems} />
          </div>
        </section>

        <section className="relative min-h-[400px] overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex min-h-[400px] items-center justify-center">
            <Loading fullScreen={false} label="Loading expense" description="Fetching expense information..." className="!h-full min-h-[400px]" />
          </div>
        </section>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="min-w-0 space-y-4 text-sm">
        {toast && <Toast toast={toast} onClose={closeToast} />}

        <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="h-1 bg-erp-primary" />

          <div className="flex min-h-16 items-center px-4 sm:px-5">
            <BreadCrumb items={breadcrumbItems} />
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white px-4 py-12 text-center">
          <Receipt size={28} className="mx-auto text-slate-300" />

          <h2 className="mt-3 text-sm font-bold text-slate-800">Unable to load expense</h2>

          <p className="mt-1 text-xs text-slate-500">Required expense information could not be loaded.</p>

          <div className="mt-4 flex justify-center gap-2">
            <button type="button" onClick={() => navigate('/company/expenses')} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              <ArrowLeft size={14} />
              Back to Expenses
            </button>

            <button type="button" onClick={() => setRetryKey((current) => current + 1)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-erp-primary px-3 text-xs font-semibold text-white hover:bg-erp-primary-hover">
              <RefreshCw size={14} />
              Retry
            </button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-4 text-sm">
      {toast && <Toast toast={toast} onClose={closeToast} />}

      {/* Header */}
      <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        <div className="h-1 bg-erp-primary" />

        <div className="flex h-[calc(100%-4px)] items-center justify-between gap-3 px-4 sm:px-5">
          <div className="min-w-0 flex-1 overflow-hidden">
            <BreadCrumb items={breadcrumbItems} />
          </div>

          {isEdit && <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-bold text-slate-600">{originalStatus}</span>}
        </div>
      </section>

      {/* Locked notice */}
      {isLocked && (
        <section className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <Info size={16} className="mt-0.5 shrink-0 text-amber-700" />

          <div>
            <p className="text-xs font-bold text-amber-800">This expense cannot be edited</p>

            <p className="mt-1 text-[11px] text-amber-700">
              Only Draft expenses can be updated. This expense is currently
              {` ${originalStatus.toLowerCase()}`}.
            </p>
          </div>
        </section>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Expense Information */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
              <Receipt size={16} />
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900">Expense Information</h2>

              <p className="text-[11px] text-slate-500">Enter expense category, title and date</p>
            </div>
          </div>

          <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="min-w-0">
              <label className={labelClass}>
                Expense Category <span className="text-red-500">*</span>
              </label>

              <input
                type="text"
                maxLength={100}
                value={form.expenseCategory}
                onChange={(event) => updateFormField('expenseCategory', event.target.value)}
                disabled={isLocked}
                placeholder="e.g. Travel, Rent, Electricity"
                className={inputClass('expenseCategory')}
              />

              {renderError('expenseCategory')}
            </div>

            <div className="min-w-0">
              <label className={labelClass}>
                Expense Title <span className="text-red-500">*</span>
              </label>

              <input type="text" maxLength={150} value={form.title} onChange={(event) => updateFormField('title', event.target.value)} disabled={isLocked} placeholder="Enter expense title" className={inputClass('title')} />

              {renderError('title')}
            </div>

            <div className="min-w-0">
              <label className={labelClass}>
                Expense Date <span className="text-red-500">*</span>
              </label>

              <input type="date" max={getLocalDate()} value={form.expenseDate} onChange={(event) => updateFormField('expenseDate', event.target.value)} disabled={isLocked} className={inputClass('expenseDate')} />

              {renderError('expenseDate')}
            </div>

            <div className="min-w-0">
              <label className={labelClass}>
                Amount (₹) <span className="text-red-500">*</span>
              </label>

              <input type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => updateFormField('amount', event.target.value)} disabled={isLocked} placeholder="Enter amount" className={inputClass('amount')} />

              {renderError('amount')}
            </div>
          </div>
        </section>

        {/* Tax Calculation */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <Calculator size={16} />
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900">Amount & Tax Details</h2>

              <p className="text-[11px] text-slate-500">Enter tax percentage and review calculated total</p>
            </div>
          </div>

          <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="min-w-0">
              <label className={labelClass}>Tax Rate (%)</label>

              <input type="number" min="0" max="100" step="0.01" value={form.taxRate} onChange={(event) => updateFormField('taxRate', event.target.value)} disabled={isLocked} className={inputClass('taxRate')} />

              {renderError('taxRate')}
            </div>

            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <p className="text-[11px] font-medium text-slate-500">Base Amount</p>

              <p className="mt-1 text-base font-bold text-slate-800">{formatCurrency(amount)}</p>
            </div>

            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <p className="text-[11px] font-medium text-slate-500">Tax Amount</p>

              <p className="mt-1 text-base font-bold text-slate-800">{formatCurrency(taxAmount)}</p>
            </div>

            <div className="rounded-lg border border-erp-primary/20 bg-erp-primary/5 p-3">
              <p className="text-[11px] font-semibold text-erp-primary">Total Expense</p>

              <p className="mt-1 text-lg font-extrabold text-erp-primary">{formatCurrency(totalAmount)}</p>
            </div>
          </div>
        </section>

        {/* Payment Details */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <Wallet size={16} />
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900">Payment Details</h2>

              <p className="text-[11px] text-slate-500">Select payment method and enter transaction details</p>
            </div>
          </div>

          <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="min-w-0">
              <label className={labelClass}>
                Payment Mode <span className="text-red-500">*</span>
              </label>

              <select value={form.paymentMode} onChange={(event) => updateFormField('paymentMode', event.target.value)} disabled={isLocked} className={inputClass('paymentMode')}>
                {PAYMENT_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>

              {renderError('paymentMode')}
            </div>

            <div className="min-w-0">
              <label className={labelClass}>Transaction Reference</label>

              <input
                type="text"
                maxLength={100}
                value={form.transactionReference}
                onChange={(event) => updateFormField('transactionReference', event.target.value)}
                disabled={isLocked}
                placeholder="UTR / UPI transaction ID"
                className={inputClass('transactionReference')}
              />

              {renderError('transactionReference')}
            </div>

            <div className="min-w-0">
              <label className={labelClass}>Receipt Number</label>

              <input type="text" maxLength={100} value={form.receiptNumber} onChange={(event) => updateFormField('receiptNumber', event.target.value)} disabled={isLocked} placeholder="Enter receipt number" className={inputClass('receiptNumber')} />

              {renderError('receiptNumber')}
            </div>
          </div>
        </section>

        {/* Receipt Attachment */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
              <Upload size={16} />
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900">Receipt Attachment</h2>

              <p className="text-[11px] text-slate-500">Upload receipt and preview the attached document</p>
            </div>
          </div>

          <div className="grid gap-4 p-3 lg:grid-cols-2">
            {/* Left: Upload */}
            <div className="flex min-w-0 flex-col gap-3">
              <div className="mb-1 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700">upload Receipt </h3>
              </div>
              {!isLocked && (
                <label
                  htmlFor="expenseReceiptInput"
                  className="flex min-h-[290px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center transition hover:border-erp-primary/50 hover:bg-erp-primary/5"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-erp-primary/10 text-erp-primary">
                    <Upload size={22} />
                  </div>

                  <p className="mt-3 text-xs font-bold text-slate-700">Click to upload receipt</p>

                  <p className="mt-1 text-[11px] text-slate-500">JPG, PNG or PDF</p>

                  <p className="mt-1 text-[10px] text-slate-400">Maximum file size: 4 MB</p>

                  <input id="expenseReceiptInput" type="file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" onChange={handleReceiptChange} className="hidden" />
                </label>
              )}

              {receiptFile && (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-erp-primary/20 bg-erp-primary/5 p-3">
                  <div className="flex min-w-0 items-center gap-2">
                    {receiptFile.type === 'application/pdf' ? <File size={18} className="shrink-0 text-red-600" /> : <Image size={18} className="shrink-0 text-erp-primary" />}

                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-800">{receiptFile.name}</p>

                      <p className="text-[10px] text-slate-500">{(receiptFile.size / 1024).toFixed(1)} KB · New receipt</p>
                    </div>
                  </div>

                  <button type="button" onClick={removeSelectedReceipt} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-red-100 bg-white text-red-500 hover:bg-red-50" title="Remove selected receipt">
                    <X size={14} />
                  </button>
                </div>
              )}

              {!receiptFile && existingReceipt && (
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  {existingReceipt.mimeType === 'application/pdf' ? <File size={18} className="shrink-0 text-red-600" /> : <Image size={18} className="shrink-0 text-erp-primary" />}

                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-800">{existingReceipt.originalName || existingReceipt.filename}</p>

                    <p className="text-[10px] text-slate-500">Existing receipt attached</p>
                  </div>
                </div>
              )}

              {!receiptFile && !existingReceipt && <p className="text-center text-[11px] text-slate-400">No receipt attached yet.</p>}

              {renderError('receipt')}
            </div>

            {/* Right: Preview */}
            <div className="flex min-w-0 flex-col">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700">Receipt Preview</h3>

                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">{receiptFile ? 'New File' : existingReceipt ? 'Existing File' : 'No Preview'}</span>
              </div>

              <div className="flex min-h-[260px] flex-1 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2">
                {receiptFile && receiptPreview ? (
                  receiptFile.type === 'application/pdf' ? (
                    <iframe src={receiptPreview} title="New receipt preview" className="h-[320px] w-full rounded-lg bg-white" />
                  ) : (
                    <img src={receiptPreview} alt="Receipt preview" className="max-h-[320px] w-full rounded-lg object-contain" />
                  )
                ) : existingReceipt?.path ? (
                  existingReceipt.mimeType === 'application/pdf' ? (
                    <iframe src={getReceiptUrl(existingReceipt.path)} title="Existing receipt preview" className="h-[320px] w-full rounded-lg bg-white" />
                  ) : (
                    <img src={getReceiptUrl(existingReceipt.path)} alt={existingReceipt.originalName || 'Existing receipt'} className="max-h-[320px] w-full rounded-lg object-contain" />
                  )
                ) : (
                  <div className="flex flex-col items-center text-center">
                    <Image size={42} className="text-slate-300" />
                    <p className="mt-3 text-xs font-semibold text-slate-500">No receipt selected</p>
                    <p className="mt-1 text-[10px] text-slate-400">Your image or PDF preview will appear here.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Description */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
              <FileText size={16} />
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900">Description & Notes</h2>

              <p className="text-[11px] text-slate-500">Additional information about this expense</p>
            </div>
          </div>

          <div className="p-3">
            <textarea
              rows={3}
              maxLength={2000}
              value={form.description}
              onChange={(event) => updateFormField('description', event.target.value)}
              disabled={isLocked}
              placeholder="Enter expense details or additional notes..."
              className={`w-full resize-y rounded-lg border bg-white px-3 py-2.5 text-xs outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10 ${fieldErrors.description ? 'border-red-400' : 'border-slate-200'}`}
            />

            <div className="mt-1 flex items-center justify-between gap-2">
              {renderError('description')}

              <p className="ml-auto text-[10px] text-slate-400">{form.description.length}/2000</p>
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white/95 p-2.5 shadow-sm backdrop-blur">
          <p className="hidden text-[11px] text-slate-500 sm:block">{isEdit ? 'Review the expense details before saving changes.' : 'This expense will be created with Draft status.'}</p>

          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            <button type="button" onClick={() => navigate('/company/expenses')} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
              <ArrowLeft size={14} />
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving || !canSubmit || isLocked}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-erp-primary px-4 text-xs font-bold text-white transition hover:bg-erp-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <LoaderCircle size={15} className="animate-spin" /> : <Save size={15} />}

              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Draft Expense'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
