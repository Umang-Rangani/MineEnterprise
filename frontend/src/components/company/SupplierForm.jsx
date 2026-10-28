import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Truck, LoaderCircle, Save, UserRound, Phone, Mail, MapPin, Building2, Hash, FileText, Eye, AlertCircle, IndianRupee, CreditCard } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Loading from '../Loading/Loading'
import { hasPermission, useAuth } from '../../context/AuthContext'

const initialForm = {
  supplierName: '',
  supplierCode: '',
  contactPerson: '',
  email: '',
  phone: '',
  alternatePhone: '',
  gstNumber: '',
  panNumber: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  country: 'India',
  paymentTerms: '',
  openingBalance: '0',
  notes: '',
  status: 'Active',
}

const phonePattern = /^[0-9+\-\s()]{7,20}$/
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const gstPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/
const panPattern = /^[A-Z]{5}[0-9]{4}[A-Z]$/

export default function SupplierForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const { permissions } = useAuth()

  const canCreate = hasPermission(permissions, 'supplier:create')
  const canView = hasPermission(permissions, 'supplier:view')
  const canUpdate = hasPermission(permissions, 'supplier:update')
  const canUpdateStatus = hasPermission(permissions, 'supplier:update-status')

  const hasFormPermission = isEdit ? canView && canUpdate : canCreate

  const [form, setForm] = useState(initialForm)
  const [originalStatus, setOriginalStatus] = useState('Active')
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')

  const items = [
    { title: 'Suppliers', link: '/company/suppliers' },
    {
      title: isEdit ? 'Edit Supplier' : 'Create Supplier',
      link: null,
    },
  ]

  useEffect(() => {
    document.title = `${isEdit ? 'Edit Supplier' : 'Create Supplier'} | MineERP`
  }, [isEdit])

  useEffect(() => {
    let active = true

    async function loadSupplier() {
      if (!isEdit) {
        setForm(initialForm)
        setOriginalStatus('Active')
        setLoading(false)
        setApiError('')
        setErrors({})
        return
      }

      setLoading(true)
      setApiError('')

      try {
        const response = await axiosInstance.get(`/erp/suppliers/${encodeURIComponent(id)}`)

        const data = response.data
        const supplier = data?.supplier || data?.data?.supplier || data?.data

        if (data?.success === false) {
          throw new Error(data.message || 'Unable to load supplier.')
        }

        if (!supplier?._id) {
          throw new Error(data?.message || 'Supplier not found.')
        }

        if (!active) return

        const status = supplier.status || 'Active'

        setForm({
          ...initialForm,
          supplierName: supplier.supplierName || '',
          supplierCode: supplier.supplierCode || '',
          contactPerson: supplier.contactPerson || '',
          email: supplier.email || '',
          phone: supplier.phone || '',
          alternatePhone: supplier.alternatePhone || '',
          gstNumber: supplier.gstNumber || '',
          panNumber: supplier.panNumber || '',
          address: supplier.address || '',
          city: supplier.city || '',
          state: supplier.state || '',
          pincode: supplier.pincode || '',
          country: supplier.country || 'India',
          paymentTerms: supplier.paymentTerms || '',
          openingBalance: supplier.openingBalance === undefined || supplier.openingBalance === null ? '0' : String(supplier.openingBalance),
          notes: supplier.notes || '',
          status,
        })

        setOriginalStatus(status)
      } catch (error) {
        if (active) {
          setApiError(error.response?.data?.message || error.message || 'Unable to load supplier.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadSupplier()

    return () => {
      active = false
    }
  }, [id, isEdit])

  function goBack() {
    navigate('/company/suppliers')
  }

  function openDetailsPage() {
    if (!id || !canView) return
    navigate(`/company/suppliers/${id}`)
  }

  function updateField(field, value) {
    let nextValue = value

    if (['supplierCode', 'gstNumber', 'panNumber'].includes(field)) {
      nextValue = value.toUpperCase()
    }

    if (field === 'pincode') {
      nextValue = value.replace(/\D/g, '').slice(0, 6)
    }

    setForm((current) => ({
      ...current,
      [field]: nextValue,
    }))

    setErrors((current) => ({
      ...current,
      [field]: '',
    }))

    setApiError('')
  }

  function validateForm() {
    const nextErrors = {}

    const supplierName = form.supplierName.trim()
    const supplierCode = form.supplierCode.trim().toUpperCase()
    const email = form.email.trim()
    const phone = form.phone.trim()
    const alternatePhone = form.alternatePhone.trim()
    const gstNumber = form.gstNumber.trim().toUpperCase()
    const panNumber = form.panNumber.trim().toUpperCase()
    const pincode = form.pincode.trim()
    const country = form.country.trim()
    const paymentTerms = form.paymentTerms.trim()
    const notes = form.notes.trim()
    const openingBalance = form.openingBalance === '' ? 0 : Number(form.openingBalance)

    if (!supplierName) {
      nextErrors.supplierName = 'Supplier name is required.'
    } else if (supplierName.length > 150) {
      nextErrors.supplierName = 'Supplier name cannot exceed 150 characters.'
    }

    if (!supplierCode) {
      nextErrors.supplierCode = 'Supplier code is required.'
    } else if (supplierCode.length > 50) {
      nextErrors.supplierCode = 'Supplier code cannot exceed 50 characters.'
    }

    if (email && (!emailPattern.test(email) || email.length > 254)) {
      nextErrors.email = 'Enter a valid email address.'
    }

    if (phone && !phonePattern.test(phone)) {
      nextErrors.phone = 'Enter a valid phone number.'
    }

    if (alternatePhone && !phonePattern.test(alternatePhone)) {
      nextErrors.alternatePhone = 'Enter a valid alternate phone number.'
    }

    if (gstNumber && !gstPattern.test(gstNumber)) {
      nextErrors.gstNumber = 'Enter a valid 15-character GST number.'
    }

    if (panNumber && !panPattern.test(panNumber)) {
      nextErrors.panNumber = 'Enter a valid 10-character PAN number.'
    }

    if (pincode && !/^[0-9]{6}$/.test(pincode)) {
      nextErrors.pincode = 'Pincode must contain exactly 6 digits.'
    }

    if (country.length > 100) {
      nextErrors.country = 'Country cannot exceed 100 characters.'
    }

    if (paymentTerms.length > 100) {
      nextErrors.paymentTerms = 'Payment terms cannot exceed 100 characters.'
    }

    if (form.openingBalance !== '') {
      if (!Number.isFinite(openingBalance) || openingBalance < 0) {
        nextErrors.openingBalance = 'Opening balance must be zero or greater.'
      }
    }

    if (notes.length > 2000) {
      nextErrors.notes = 'Notes cannot exceed 2000 characters.'
    }

    if (!['Active', 'Inactive'].includes(form.status)) {
      nextErrors.status = 'Please select a valid status.'
    }

    if (isEdit && form.status !== originalStatus && !canUpdateStatus) {
      nextErrors.status = 'You do not have permission to change supplier status.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (saving) return

    if (!hasFormPermission) {
      setApiError('You do not have permission to perform this action.')
      return
    }

    if (!validateForm()) return

    setSaving(true)
    setApiError('')

    try {
      const payload = {
        supplierName: form.supplierName.trim(),
        supplierCode: form.supplierCode.trim().toUpperCase(),
        contactPerson: form.contactPerson.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        alternatePhone: form.alternatePhone.trim(),
        gstNumber: form.gstNumber.trim().toUpperCase(),
        panNumber: form.panNumber.trim().toUpperCase(),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
        country: form.country.trim() || 'India',
        paymentTerms: form.paymentTerms.trim(),
        notes: form.notes.trim(),
      }

      if (!isEdit) {
        payload.openingBalance = form.openingBalance === '' ? 0 : Number(form.openingBalance)

        payload.status = form.status
      } else if (canUpdateStatus) {
        payload.status = form.status
      }

      const response = isEdit ? await axiosInstance.patch(`/erp/suppliers/${encodeURIComponent(id)}`, payload) : await axiosInstance.post('/erp/suppliers', payload)

      const data = response.data

      if (data?.success === false) {
        throw new Error(data.message || 'Unable to save supplier.')
      }

      const supplierId = response.data?.supplier?._id || response.data?.data?.supplier?._id || response.data?.data?._id

      if (supplierId) {
        navigate(`/company/suppliers/${supplierId}`, {
          replace: true,
          state: {
            successMessage: isEdit ? 'Supplier updated successfully.' : 'Supplier created successfully.',
          },
        })
      } else {
        throw new Error('Supplier saved, but supplier ID was not returned.')
      }
    } catch (error) {
      setApiError(error.response?.data?.message || error.message || 'Unable to save supplier.')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = (field) =>
    `h-10 w-full rounded-lg border bg-erp-surface px-3 text-xs text-erp-text outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10 disabled:cursor-not-allowed disabled:opacity-60 ${
      errors[field] ? 'border-red-400' : 'border-erp-border'
    }`

  const labelClass = 'block text-xs font-semibold text-erp-text-secondary'

  function errorText(field) {
    return errors[field] ? <p className="text-[11px] text-red-600">{errors[field]}</p> : null
  }

  if (loading) {
    return (
      <div className="min-w-0 space-y-3">
        <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="h-1 bg-erp-primary" />
          <div className="flex h-[calc(100%-4px)] items-center px-4 sm:px-5">
            <BreadCrumb items={items} />
          </div>
        </section>

        <Loading label="Loading supplier..." description="Preparing supplier information..." />
      </div>
    )
  }

  if (!hasFormPermission) {
    return (
      <div className="min-w-0 rounded-xl border border-erp-border bg-erp-surface p-6 text-center">
        <h2 className="text-base font-semibold text-erp-text">Access Denied</h2>

        <p className="mt-2 text-sm text-erp-text-secondary">{isEdit ? 'You need view and update permissions to edit suppliers.' : 'You do not have permission to create suppliers.'}</p>

        <button type="button" onClick={goBack} className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-erp-primary px-4 text-xs font-semibold text-white hover:bg-erp-primary-hover">
          <ArrowLeft size={14} />
          Back to Suppliers
        </button>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-4 text-sm">
      <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        <div className="h-1 bg-erp-primary" />

        <div className="flex h-[calc(100%-4px)] min-w-0 items-center justify-between gap-3 px-4 sm:px-5">
          <div className="min-w-0 flex-1 overflow-hidden">
            <BreadCrumb items={items} />
          </div>

          {isEdit && canView && (
            <button
              type="button"
              onClick={openDetailsPage}
              title="View supplier"
              aria-label="View supplier"
              className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-erp-border bg-erp-surface px-3 text-xs font-semibold text-erp-primary transition hover:bg-erp-primary/5"
            >
              <Eye size={16} />
              <span>View</span>
            </button>
          )}
        </div>
      </section>

      <form onSubmit={handleSubmit} className="space-y-3">
        <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex items-center gap-2 border-b border-erp-border px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
              <Truck size={16} />
            </div>

            <div>
              <h2 className="text-sm font-bold text-erp-text">Basic Information</h2>
              <p className="text-[11px] text-erp-text-secondary">Enter the supplier name and identification details.</p>
            </div>
          </div>

          <div className="grid gap-3 p-3 sm:grid-cols-2">
            <div className="min-w-0 space-y-1">
              <label htmlFor="supplier-name" className={labelClass}>
                Supplier Name <span className="text-erp-danger">*</span>
              </label>

              <input
                id="supplier-name"
                autoFocus
                required
                maxLength={150}
                value={form.supplierName}
                onChange={(event) => updateField('supplierName', event.target.value)}
                placeholder="e.g. ABC Trading Company"
                disabled={saving}
                className={inputClass('supplierName')}
              />

              {errorText('supplierName')}

              <p className="text-right text-[10px] text-erp-text-muted">{form.supplierName.length}/150</p>
            </div>

            <div className="min-w-0 space-y-1">
              <label htmlFor="supplier-code" className={labelClass}>
                Supplier Code <span className="text-erp-danger">*</span>
              </label>

              <div className="relative">
                <Hash size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-erp-text-muted" />

                <input
                  id="supplier-code"
                  required
                  maxLength={50}
                  value={form.supplierCode}
                  onChange={(event) => updateField('supplierCode', event.target.value)}
                  placeholder="e.g. SUP-001"
                  disabled={saving}
                  className={`${inputClass('supplierCode')} pl-9 uppercase`}
                />
              </div>

              {errorText('supplierCode')}

              <p className="text-[10px] text-erp-text-muted">Must be unique within this company.</p>
            </div>

            <div className="min-w-0 space-y-1">
              <label htmlFor="supplier-status" className={labelClass}>
                Supplier Status
              </label>

              <select id="supplier-status" value={form.status} onChange={(event) => updateField('status', event.target.value)} disabled={saving || (isEdit && !canUpdateStatus)} className={inputClass('status')}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>

              {errorText('status')}
            </div>

            <div className="min-w-0 space-y-1">
              <label htmlFor="supplier-payment-terms" className={labelClass}>
                Payment Terms
              </label>

              <div className="relative">
                <CreditCard size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-erp-text-muted" />

                <input
                  id="supplier-payment-terms"
                  maxLength={100}
                  value={form.paymentTerms}
                  onChange={(event) => updateField('paymentTerms', event.target.value)}
                  placeholder="e.g. Net 30 days"
                  disabled={saving}
                  className={`${inputClass('paymentTerms')} pl-9`}
                />
              </div>

              {errorText('paymentTerms')}
            </div>

            <div className="min-w-0 space-y-1 sm:col-span-2">
              <label htmlFor="supplier-opening-balance" className={labelClass}>
                Opening Balance (₹)
                {!isEdit && <span className="ml-1 text-erp-danger">*</span>}
              </label>

              <div className="relative">
                <IndianRupee size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-erp-text-muted" />

                <input
                  id="supplier-opening-balance"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.openingBalance}
                  onChange={(event) => updateField('openingBalance', event.target.value)}
                  disabled={saving || isEdit}
                  className={`${inputClass('openingBalance')} pl-9`}
                />
              </div>

              {errorText('openingBalance')}

              {isEdit && <p className="text-[11px] text-erp-text-muted">Opening balance cannot be changed through the supplier edit form.</p>}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex items-center gap-2 border-b border-erp-border px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
              <UserRound size={16} />
            </div>

            <div>
              <h2 className="text-sm font-bold text-erp-text">Contact Details</h2>
              <p className="text-[11px] text-erp-text-secondary">Add the supplier's contact person and communication details.</p>
            </div>
          </div>

          <div className="grid gap-3 p-3 sm:grid-cols-2">
            <div className="min-w-0 space-y-1">
              <label htmlFor="supplier-contact-person" className={labelClass}>
                Contact Person
              </label>

              <input
                id="supplier-contact-person"
                maxLength={100}
                value={form.contactPerson}
                onChange={(event) => updateField('contactPerson', event.target.value)}
                placeholder="Contact person name"
                disabled={saving}
                className={inputClass('contactPerson')}
              />
            </div>

            <div className="min-w-0 space-y-1">
              <label htmlFor="supplier-email" className={labelClass}>
                Email Address
              </label>

              <div className="relative">
                <Mail size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-erp-text-muted" />

                <input
                  id="supplier-email"
                  type="email"
                  maxLength={254}
                  value={form.email}
                  onChange={(event) => updateField('email', event.target.value)}
                  placeholder="supplier@example.com"
                  disabled={saving}
                  className={`${inputClass('email')} pl-9`}
                />
              </div>

              {errorText('email')}
            </div>

            <div className="min-w-0 space-y-1">
              <label htmlFor="supplier-phone" className={labelClass}>
                Phone Number
              </label>

              <div className="relative">
                <Phone size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-erp-text-muted" />

                <input id="supplier-phone" maxLength={20} value={form.phone} onChange={(event) => updateField('phone', event.target.value)} placeholder="Supplier phone number" disabled={saving} className={`${inputClass('phone')} pl-9`} />
              </div>

              {errorText('phone')}
            </div>

            <div className="min-w-0 space-y-1">
              <label htmlFor="supplier-alternate-phone" className={labelClass}>
                Alternate Phone
              </label>

              <div className="relative">
                <Phone size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-erp-text-muted" />

                <input
                  id="supplier-alternate-phone"
                  maxLength={20}
                  value={form.alternatePhone}
                  onChange={(event) => updateField('alternatePhone', event.target.value)}
                  placeholder="Alternate phone number"
                  disabled={saving}
                  className={`${inputClass('alternatePhone')} pl-9`}
                />
              </div>

              {errorText('alternatePhone')}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex items-center gap-2 border-b border-erp-border px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
              <FileText size={16} />
            </div>

            <div>
              <h2 className="text-sm font-bold text-erp-text">Tax Information</h2>
              <p className="text-[11px] text-erp-text-secondary">Add GST and PAN details when applicable.</p>
            </div>
          </div>

          <div className="grid gap-3 p-3 sm:grid-cols-2">
            <div className="min-w-0 space-y-1">
              <label htmlFor="supplier-gst" className={labelClass}>
                GST Number
              </label>

              <input id="supplier-gst" maxLength={15} value={form.gstNumber} onChange={(event) => updateField('gstNumber', event.target.value)} placeholder="15-character GSTIN" disabled={saving} className={`${inputClass('gstNumber')} uppercase`} />

              {errorText('gstNumber')}
            </div>

            <div className="min-w-0 space-y-1">
              <label htmlFor="supplier-pan" className={labelClass}>
                PAN Number
              </label>

              <input id="supplier-pan" maxLength={10} value={form.panNumber} onChange={(event) => updateField('panNumber', event.target.value)} placeholder="10-character PAN" disabled={saving} className={`${inputClass('panNumber')} uppercase`} />

              {errorText('panNumber')}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex items-center gap-2 border-b border-erp-border px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
              <MapPin size={16} />
            </div>

            <div>
              <h2 className="text-sm font-bold text-erp-text">Address Details</h2>
              <p className="text-[11px] text-erp-text-secondary">Enter the supplier's business address.</p>
            </div>
          </div>

          <div className="grid gap-3 p-3 sm:grid-cols-2">
            <div className="min-w-0 space-y-1 sm:col-span-2">
              <label htmlFor="supplier-address" className={labelClass}>
                Address
              </label>

              <textarea
                id="supplier-address"
                rows={3}
                maxLength={500}
                value={form.address}
                onChange={(event) => updateField('address', event.target.value)}
                placeholder="Street, building, area"
                disabled={saving}
                className={`w-full resize-y rounded-lg border bg-erp-surface px-3 py-2.5 text-xs text-erp-text outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10 ${
                  errors.address ? 'border-red-400' : 'border-erp-border'
                }`}
              />

              {errorText('address')}
            </div>

            <div className="min-w-0 space-y-1">
              <label htmlFor="supplier-city" className={labelClass}>
                City
              </label>

              <input id="supplier-city" maxLength={100} value={form.city} onChange={(event) => updateField('city', event.target.value)} placeholder="e.g. Ahmedabad" disabled={saving} className={inputClass('city')} />
            </div>

            <div className="min-w-0 space-y-1">
              <label htmlFor="supplier-state" className={labelClass}>
                State
              </label>

              <input id="supplier-state" maxLength={100} value={form.state} onChange={(event) => updateField('state', event.target.value)} placeholder="e.g. Gujarat" disabled={saving} className={inputClass('state')} />
            </div>

            <div className="min-w-0 space-y-1">
              <label htmlFor="supplier-pincode" className={labelClass}>
                Pincode
              </label>

              <input id="supplier-pincode" inputMode="numeric" maxLength={6} value={form.pincode} onChange={(event) => updateField('pincode', event.target.value)} placeholder="6-digit pincode" disabled={saving} className={inputClass('pincode')} />

              {errorText('pincode')}
            </div>

            <div className="min-w-0 space-y-1">
              <label htmlFor="supplier-country" className={labelClass}>
                Country
              </label>

              <input id="supplier-country" maxLength={100} value={form.country} onChange={(event) => updateField('country', event.target.value)} placeholder="Country" disabled={saving} className={inputClass('country')} />

              {errorText('country')}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex items-center gap-2 border-b border-erp-border px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
              <Building2 size={16} />
            </div>

            <div>
              <h2 className="text-sm font-bold text-erp-text">Additional Details</h2>
              <p className="text-[11px] text-erp-text-secondary">Add any additional notes about this supplier.</p>
            </div>
          </div>

          <div className="grid gap-3 p-3">
            <div className="min-w-0 space-y-1">
              <label htmlFor="supplier-notes" className={labelClass}>
                Notes
              </label>

              <textarea
                id="supplier-notes"
                rows={4}
                maxLength={2000}
                value={form.notes}
                onChange={(event) => updateField('notes', event.target.value)}
                placeholder="Additional supplier information..."
                disabled={saving}
                className={`w-full resize-y rounded-lg border bg-erp-surface px-3 py-2.5 text-xs text-erp-text outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10 ${
                  errors.notes ? 'border-red-400' : 'border-erp-border'
                }`}
              />

              {errorText('notes')}

              <p className="text-right text-[10px] text-erp-text-muted">{form.notes.length}/2000</p>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex items-center gap-2 border-b border-erp-border px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
              <Eye size={16} />
            </div>

            <div>
              <h2 className="text-sm font-bold text-erp-text">Supplier Preview</h2>
              <p className="text-[11px] text-erp-text-secondary">Preview supplier details while completing the form.</p>
            </div>
          </div>

          <div className="grid gap-4 p-4 sm:grid-cols-[auto_1fr] sm:items-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-erp-border bg-erp-primary/5 text-erp-primary">
              <Truck size={42} strokeWidth={1.5} />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="break-words text-base font-bold text-erp-text">{form.supplierName.trim() || 'Supplier Name'}</h3>

                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${form.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{form.status}</span>
              </div>

              <p className="mt-1 text-xs text-erp-text-secondary">Code: {form.supplierCode.trim().toUpperCase() || 'SUP-XXX'}</p>

              <div className="mt-3 grid gap-2 text-xs text-erp-text-secondary sm:grid-cols-2">
                <p className="flex min-w-0 items-start gap-2">
                  <UserRound size={14} className="mt-0.5 shrink-0 text-erp-primary" />
                  <span className="break-words">{form.contactPerson.trim() || 'No contact person'}</span>
                </p>

                <p className="flex min-w-0 items-start gap-2">
                  <Phone size={14} className="mt-0.5 shrink-0 text-erp-primary" />
                  <span className="break-words">{form.phone.trim() || 'No phone number'}</span>
                </p>

                <p className="flex min-w-0 items-start gap-2">
                  <Mail size={14} className="mt-0.5 shrink-0 text-erp-primary" />
                  <span className="break-words">{form.email.trim() || 'No email address'}</span>
                </p>

                <p className="flex min-w-0 items-start gap-2">
                  <MapPin size={14} className="mt-0.5 shrink-0 text-erp-primary" />
                  <span className="break-words">{[form.city, form.state, form.pincode].filter(Boolean).join(', ') || 'Location not entered'}</span>
                </p>

                <p className="flex min-w-0 items-start gap-2">
                  <IndianRupee size={14} className="mt-0.5 shrink-0 text-erp-primary" />
                  <span className="break-words">Opening Balance: ₹{form.openingBalance === '' ? '0' : form.openingBalance}</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        {apiError && (
          <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <p>{apiError}</p>
          </div>
        )}

        <footer className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-erp-border bg-erp-surface/95 p-2.5 shadow-sm backdrop-blur">
          <div className="hidden min-w-0 sm:block">
            <p className="text-xs font-semibold text-erp-text">{isEdit ? 'Update supplier details' : 'Ready to create supplier'}</p>
            <p className="mt-0.5 text-[10px] text-erp-text-secondary">Review the information before saving.</p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={goBack}
              disabled={saving}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-erp-border bg-erp-surface px-3 text-xs font-semibold text-erp-text-secondary transition hover:bg-erp-hover disabled:opacity-50"
            >
              <ArrowLeft size={14} />
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-erp-primary px-4 text-xs font-bold text-white transition hover:bg-erp-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Supplier'}
            </button>
          </div>
        </footer>
      </form>
    </div>
  )
}
