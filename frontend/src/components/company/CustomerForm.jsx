import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, UserRound, MapPin, Wallet, FileText, Save, LoaderCircle, Eye, Info } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import Loading from '../Loading/Loading'
import { hasPermission, useAuth } from '../../context/AuthContext'

const initialForm = {
  customerName: '',
  customerCode: '',
  contactPerson: '',
  email: '',
  phone: '',
  alternatePhone: '',
  gstNumber: '',
  panNumber: '',
  billingAddress: '',
  shippingAddress: '',
  city: '',
  state: '',
  pincode: '',
  country: 'India',
  paymentTerms: '',
  creditLimit: '0',
  openingBalance: '0',
  notes: '',
}

export default function CustomerForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const { permissions } = useAuth()

  const canCreate = hasPermission(permissions, 'customer:create')
  const canUpdate = hasPermission(permissions, 'customer:update')
  const canSubmit = isEdit ? canUpdate : canCreate

  const [form, setForm] = useState(initialForm)
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(isEdit)
  const [loadError, setLoadError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [retryKey, setRetryKey] = useState(0)

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
    document.title = isEdit ? 'Edit Customer | MineERP' : 'Add Customer | MineERP'
  }, [isEdit])

  useEffect(() => {
    let cancelled = false

    const loadCustomer = async () => {
      if (!isEdit) {
        setLoading(false)
        return
      }

      setLoading(true)
      setLoadError(false)

      try {
        const response = await axiosInstance.get(`/erp/customers/${id}`)

        if (cancelled) return

        const customer = response.data.customer || response.data

        setForm({
          ...initialForm,
          ...Object.fromEntries(Object.keys(initialForm).map((key) => [key, customer[key] ?? initialForm[key]])),
          creditLimit: String(customer.creditLimit ?? 0),
          openingBalance: String(customer.openingBalance ?? 0),
        })
      } catch (error) {
        if (!cancelled) {
          setLoadError(true)
          showToast('error', error.response?.data?.message || 'Unable to load customer details.', 5000)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadCustomer()

    return () => {
      cancelled = true
    }
  }, [id, isEdit, retryKey])

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))

    setFieldErrors((current) => ({
      ...current,
      [field]: '',
    }))
  }

  const validateForm = () => {
    const errors = {}

    if (!form.customerName.trim()) {
      errors.customerName = 'Customer name is required.'
    }

    if (!form.customerCode.trim()) {
      errors.customerCode = 'Customer code is required.'
    }

    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = 'Enter a valid email address.'
    }

    if (form.creditLimit === '' || Number(form.creditLimit) < 0 || !Number.isFinite(Number(form.creditLimit))) {
      errors.creditLimit = 'Enter a valid credit limit.'
    }

    if (!isEdit && (form.openingBalance === '' || Number(form.openingBalance) < 0 || !Number.isFinite(Number(form.openingBalance)))) {
      errors.openingBalance = 'Enter a valid opening balance.'
    }

    if (form.pincode && !/^\d{6}$/.test(form.pincode.trim())) {
      errors.pincode = 'Enter a valid 6-digit pincode.'
    }

    setFieldErrors(errors)

    if (Object.keys(errors).length) {
      showToast('warning', 'Please check the required fields.')
      return false
    }

    return true
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!canSubmit) {
      showToast('error', `You do not have permission to ${isEdit ? 'edit' : 'create'} customers.`)
      return
    }

    if (!validateForm()) return

    const payload = {
      customerName: form.customerName.trim(),
      customerCode: form.customerCode.trim().toUpperCase(),
      contactPerson: form.contactPerson.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      alternatePhone: form.alternatePhone.trim(),
      gstNumber: form.gstNumber.trim().toUpperCase(),
      panNumber: form.panNumber.trim().toUpperCase(),
      billingAddress: form.billingAddress.trim(),
      shippingAddress: form.shippingAddress.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      pincode: form.pincode.trim(),
      country: form.country.trim(),
      paymentTerms: form.paymentTerms,
      creditLimit: Number(form.creditLimit),
      notes: form.notes.trim(),
    }

    if (!isEdit) {
      payload.openingBalance = Number(form.openingBalance)
    }

    setSaving(true)

    try {
      if (isEdit) {
        await axiosInstance.patch(`/erp/customers/${id}`, payload)
      } else {
        await axiosInstance.post('/erp/customers', payload)
      }

      navigate('/company/customers', {
        state: {
          message: isEdit ? 'Customer updated successfully.' : 'Customer created successfully.',
        },
      })
    } catch (error) {
      showToast('error', error.response?.data?.message || `Unable to ${isEdit ? 'update' : 'create'} customer.`, 5000)
    } finally {
      setSaving(false)
    }
  }

  const items = isEdit
    ? [
        { title: 'Customers', link: '/company/customers' },
        { title: 'Edit Customer', link: null },
      ]
    : [
        { title: 'Customers', link: '/company/customers' },
        { title: 'Add Customer', link: null },
      ]

  const inputClass = (field) => `h-10 w-full rounded-lg border bg-white px-3 text-xs text-slate-700 outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10 ${fieldErrors[field] ? 'border-red-400' : 'border-slate-200'}`

  const labelClass = 'mb-1.5 block text-xs font-semibold text-slate-700'

  const renderInput = (field, label, placeholder = '', type = 'text', required = false) => (
    <div className="min-w-0">
      <label className={labelClass}>
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      <input
        type={type}
        value={form[field]}
        onChange={(event) => updateField(field, event.target.value)}
        placeholder={placeholder}
        required={required}
        min={type === 'number' ? 0 : undefined}
        step={type === 'number' ? '0.01' : undefined}
        className={inputClass(field)}
      />

      {fieldErrors[field] && <p className="mt-1 text-[11px] text-red-600">{fieldErrors[field]}</p>}
    </div>
  )

  const renderTextarea = (field, label, placeholder = '') => (
    <div className="min-w-0">
      <label className={labelClass}>{label}</label>

      <textarea
        rows={3}
        value={form[field]}
        onChange={(event) => updateField(field, event.target.value)}
        placeholder={placeholder}
        className={`w-full resize-y rounded-lg border bg-white px-3 py-2.5 text-xs outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10 ${fieldErrors[field] ? 'border-red-400' : 'border-slate-200'}`}
      />

      {fieldErrors[field] && <p className="mt-1 text-[11px] text-red-600">{fieldErrors[field]}</p>}
    </div>
  )

  if (loading) {
    return (
      <div className="min-w-0 space-y-4 text-sm">
        <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="h-1 bg-erp-primary" />
          <div className="flex min-h-16 items-center px-4 sm:px-5">
            <BreadCrumb items={items} />
          </div>
        </section>

        <section className="relative min-h-[400px] overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex min-h-[400px] items-center justify-center">
            <Loading fullScreen={false} label="Loading customer" description="Fetching customer information..." className="!h-full min-h-[400px]" />
          </div>
        </section>
      </div>
    )
  }

  if (loadError && isEdit) {
    return (
      <div className="min-w-0 space-y-4 text-sm">
        {toast && <Toast toast={toast} onClose={closeToast} />}

        <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="h-1 bg-erp-primary" />
          <div className="flex min-h-16 items-center px-4 sm:px-5">
            <BreadCrumb items={items} />
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white px-4 py-12 text-center">
          <UserRound size={28} className="mx-auto text-slate-300" />
          <h2 className="mt-3 text-sm font-bold text-slate-800">Unable to load customer</h2>
          <p className="mt-1 text-xs text-slate-500">Customer information could not be loaded.</p>

          <div className="mt-4 flex justify-center gap-2">
            <button type="button" onClick={() => navigate('/company/customers')} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              <ArrowLeft size={14} />
              Back to Customers
            </button>

            <button type="button" onClick={() => setRetryKey((current) => current + 1)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-erp-primary px-3 text-xs font-semibold text-white hover:bg-erp-primary-hover">
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
            <BreadCrumb items={items} />
          </div>

          {isEdit && (
            <button
              type="button"
              onClick={() => navigate(`/company/customers/${id}`)}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-erp-border px-3 text-xs font-semibold text-erp-primary transition hover:bg-erp-primary/5"
            >
              <Eye size={14} />
              View
            </button>
          )}
        </div>
      </section>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Basic Information */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
              <UserRound size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Customer Information</h2>
              <p className="text-[11px] text-slate-500">Basic customer and contact details</p>
            </div>
          </div>

          <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
            {renderInput('customerName', 'Customer Name', 'Enter customer name', 'text', true)}
            {renderInput('customerCode', 'Customer Code', 'e.g. CUS-001', 'text', true)}
            {renderInput('contactPerson', 'Contact Person', 'Contact person name')}
            {renderInput('email', 'Email Address', 'customer@example.com', 'email')}
            {renderInput('phone', 'Phone Number', 'Primary phone', 'tel')}
            {renderInput('alternatePhone', 'Alternate Phone', 'Alternate phone', 'tel')}
            {renderInput('gstNumber', 'GST Number', 'GSTIN')}
            {renderInput('panNumber', 'PAN Number', 'PAN')}
          </div>
        </section>

        {/* Address */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <MapPin size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Address Information</h2>
              <p className="text-[11px] text-slate-500">Billing and shipping address</p>
            </div>
          </div>

          <div className="grid gap-3 p-3 sm:grid-cols-2">
            {renderTextarea('billingAddress', 'Billing Address', 'Enter billing address')}
            {renderTextarea('shippingAddress', 'Shipping Address', 'Enter shipping address')}

            {renderInput('city', 'City', 'Enter city')}
            {renderInput('state', 'State', 'Enter state')}
            {renderInput('pincode', 'Pincode', '6-digit pincode')}
            {renderInput('country', 'Country', 'Enter country')}
          </div>
        </section>

        {/* Financial Information */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <Wallet size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Financial Information</h2>
              <p className="text-[11px] text-slate-500">Credit and opening balance details</p>
            </div>
          </div>

          <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="min-w-0">
              <label className={labelClass}>Payment Terms</label>
              <select value={form.paymentTerms} onChange={(event) => updateField('paymentTerms', event.target.value)} className={inputClass('paymentTerms')}>
                <option value="">Select payment terms</option>
                <option value="Immediate">Immediate</option>
                <option value="7 Days">7 Days</option>
                <option value="15 Days">15 Days</option>
                <option value="30 Days">30 Days</option>
                <option value="45 Days">45 Days</option>
                <option value="60 Days">60 Days</option>
                <option value="90 Days">90 Days</option>
              </select>
            </div>

            {renderInput('creditLimit', 'Credit Limit (₹)', '0', 'number', true)}

            {!isEdit ? (
              renderInput('openingBalance', 'Opening Balance (₹)', '0', 'number', true)
            ) : (
              <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50/70 p-3 sm:col-span-2">
                <Info size={15} className="mt-0.5 shrink-0 text-blue-700" />
                <p className="text-[11px] leading-5 text-blue-800">Opening balance cannot be changed from the edit form.</p>
              </div>
            )}
          </div>
        </section>

        {/* Notes */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <FileText size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Additional Notes</h2>
              <p className="text-[11px] text-slate-500">Optional customer information</p>
            </div>
          </div>

          <div className="p-3">{renderTextarea('notes', 'Notes', 'Add any additional information...')}</div>
        </section>

        {/* Actions */}
        <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-end gap-2 rounded-xl border border-slate-200 bg-white/95 p-2.5 shadow-sm backdrop-blur">
          <button type="button" onClick={() => navigate('/company/customers')} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
            <ArrowLeft size={14} />
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving || !canSubmit}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-erp-primary px-4 text-xs font-bold text-white transition hover:bg-erp-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <LoaderCircle size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Customer'}
          </button>
        </div>
      </form>
    </div>
  )
}
