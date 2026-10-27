import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Warehouse, LoaderCircle, Save, MapPin, Phone, UserRound, Boxes, AlertCircle, Eye, Building2, Hash, MapPinned } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Loading from '../Loading/Loading'
import { hasPermission, useAuth } from '../../context/AuthContext'

const initialForm = {
  name: '',
  code: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  manager: '',
  managerPhone: '',
  contactPerson: '',
  phone: '',
  capacity: '',
  description: '',
  status: 'Active',
}

const phonePattern = /^[0-9+\-\s()]{7,20}$/

export default function WarehousesForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const { permissions } = useAuth()

  const canCreate = hasPermission(permissions, 'warehouse:create')
  const canView = hasPermission(permissions, 'warehouse:view')
  const canUpdate = hasPermission(permissions, 'warehouse:update')
  const canUpdateStatus = hasPermission(permissions, 'warehouse:update-status')

  const hasFormPermission = isEdit ? canView && (canUpdate || canUpdateStatus) : canCreate

  const [form, setForm] = useState(initialForm)
  const [originalStatus, setOriginalStatus] = useState('Active')
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')

  const items = [
    { title: 'Warehouses', link: '/company/warehouses' },
    {
      title: isEdit ? 'Edit Warehouse' : 'Create Warehouse',
      link: null,
    },
  ]

  useEffect(() => {
    document.title = `${isEdit ? 'Edit Warehouse' : 'Create Warehouse'} | MineERP`
  }, [isEdit])

  useEffect(() => {
    let active = true

    async function loadWarehouse() {
      if (!isEdit) {
        setForm(initialForm)
        setOriginalStatus('Active')
        setLoading(false)
        setApiError('')
        return
      }

      if (!id) {
        setApiError('Warehouse ID is missing.')
        setLoading(false)
        return
      }

      setLoading(true)
      setApiError('')

      try {
        const response = await axiosInstance.get(`/erp/warehouses/${encodeURIComponent(id)}`)

        const data = response.data

        if (data?.success === false) {
          throw new Error(data.message || 'Unable to load warehouse.')
        }

        const warehouse = data?.data?.warehouse || data?.data || data?.warehouse

        if (!warehouse?._id) {
          throw new Error(data?.message || 'Warehouse not found.')
        }

        if (!active) return

        const status = warehouse.status || 'Active'

        setForm({
          ...initialForm,
          name: warehouse.name || '',
          code: warehouse.code || '',
          address: warehouse.address || '',
          city: warehouse.city || '',
          state: warehouse.state || '',
          pincode: warehouse.pincode || '',
          manager: warehouse.manager || '',
          managerPhone: warehouse.managerPhone || '',
          contactPerson: warehouse.contactPerson || '',
          phone: warehouse.phone || '',
          capacity: warehouse.capacity === undefined || warehouse.capacity === null ? '' : String(warehouse.capacity),
          description: warehouse.description || '',
          status,
        })

        setOriginalStatus(status)
      } catch (error) {
        if (active) {
          setApiError(error.response?.data?.message || error.message || 'Unable to load warehouse.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadWarehouse()

    return () => {
      active = false
    }
  }, [id, isEdit])

  function goBack() {
    navigate('/company/warehouses')
  }

  function openDetailsPage() {
    if (!id || !canView) return
    navigate(`/company/warehouses/${id}`)
  }

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: field === 'code' ? value.toUpperCase() : value,
    }))

    setErrors((current) => ({
      ...current,
      [field]: '',
    }))

    setApiError('')
  }

  function validateForm() {
    const nextErrors = {}

    const name = form.name.trim()
    const code = form.code.trim().toUpperCase()
    const pincode = form.pincode.trim()
    const managerPhone = form.managerPhone.trim()
    const phone = form.phone.trim()
    const description = form.description.trim()

    const capacity = form.capacity === '' ? 0 : Number(form.capacity)

    if (!name) {
      nextErrors.name = 'Warehouse name is required.'
    } else if (name.length > 100) {
      nextErrors.name = 'Warehouse name cannot exceed 100 characters.'
    }

    if (!code) {
      nextErrors.code = 'Warehouse code is required.'
    } else if (code.length > 30) {
      nextErrors.code = 'Warehouse code cannot exceed 30 characters.'
    }

    if (pincode && !/^[0-9]{6}$/.test(pincode)) {
      nextErrors.pincode = 'Pincode must contain exactly 6 digits.'
    }

    if (managerPhone && !phonePattern.test(managerPhone)) {
      nextErrors.managerPhone = 'Enter a valid manager phone number.'
    }

    if (phone && !phonePattern.test(phone)) {
      nextErrors.phone = 'Enter a valid contact phone number.'
    }

    if (form.capacity !== '' && (!Number.isFinite(capacity) || capacity < 0)) {
      nextErrors.capacity = 'Capacity must be zero or greater.'
    }

    if (description.length > 1000) {
      nextErrors.description = 'Description cannot exceed 1000 characters.'
    }

    if (!['Active', 'Inactive'].includes(form.status)) {
      nextErrors.status = 'Please select a valid status.'
    }

    if (isEdit && form.status !== originalStatus && !canUpdateStatus) {
      nextErrors.status = 'You do not have permission to change warehouse status.'
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
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
        manager: form.manager.trim(),
        managerPhone: form.managerPhone.trim(),
        contactPerson: form.contactPerson.trim(),
        phone: form.phone.trim(),
        capacity: form.capacity === '' ? 0 : Number(form.capacity),
        description: form.description.trim(),
      }

      if (!isEdit || canUpdateStatus) {
        payload.status = form.status
      }

      const response = isEdit
        ? await axiosInstance.patch(`/erp/warehouses/${encodeURIComponent(id)}`, payload)
        : await axiosInstance.post('/erp/warehouses', {
            ...payload,
            status: form.status,
          })

      const data = response.data

      if (data?.success === false) {
        throw new Error(data.message || 'Unable to save warehouse.')
      }

      navigate('/company/warehouses', {
        replace: true,
        state: {
          successMessage: data?.message || (isEdit ? 'Warehouse updated successfully.' : 'Warehouse created successfully.'),
        },
      })
    } catch (error) {
      setApiError(error.response?.data?.message || error.message || 'Unable to save warehouse.')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = (field) =>
    `h-10 w-full rounded-lg border bg-erp-surface px-3 text-xs text-erp-text outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10 disabled:cursor-not-allowed disabled:opacity-60 ${
      errors[field] ? 'border-red-400' : 'border-erp-border'
    }`

  const labelClass = 'block text-xs font-semibold text-erp-text-secondary'

  const errorText = (field) => (errors[field] ? <p className="text-[11px] text-red-600">{errors[field]}</p> : null)

  if (loading) {
    return (
      <div className="min-w-0 space-y-3">
        <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="h-1 bg-erp-primary" />
          <div className="flex h-[calc(100%-4px)] items-center px-4 sm:px-5">
            <BreadCrumb items={items} />
          </div>
        </section>

        <Loading label="Loading warehouse..." description="Preparing warehouse information..." />
      </div>
    )
  }

  if (!hasFormPermission) {
    return (
      <div className="min-w-0 rounded-xl border border-rose-200 bg-erp-surface p-6 text-center">
        <h2 className="text-base font-semibold text-erp-text">Access Denied</h2>

        <p className="mt-2 text-sm text-erp-text-secondary">{isEdit ? 'You do not have permission to edit warehouses.' : 'You do not have permission to create warehouses.'}</p>

        <button type="button" onClick={goBack} className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-erp-primary px-4 text-xs font-semibold text-white hover:bg-erp-primary-hover">
          <ArrowLeft size={14} />
          Back to Warehouses
        </button>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-4 text-sm">
      {/* Header */}
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
              title="View warehouse"
              aria-label="View warehouse"
              className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-erp-border bg-erp-surface px-3 text-xs font-semibold text-erp-primary transition hover:bg-erp-primary/5"
            >
              <Eye size={16} />
              <span>View</span>
            </button>
          )}
        </div>
      </section>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Basic Information */}
        <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex items-center gap-2 border-b border-erp-border px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
              <Warehouse size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-erp-text">Basic Information</h2>
              <p className="text-[11px] text-erp-text-secondary">Enter the warehouse name and identification details.</p>
            </div>
          </div>

          <div className="grid gap-3 p-3 sm:grid-cols-2">
            <div className="min-w-0 space-y-1">
              <label htmlFor="warehouse-name" className={labelClass}>
                Warehouse Name <span className="text-erp-danger">*</span>
              </label>
              <input id="warehouse-name" autoFocus required maxLength={100} value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="e.g. Main Warehouse" disabled={saving} className={inputClass('name')} />
              {errorText('name')}
              <p className="text-right text-[10px] text-erp-text-muted">{form.name.length}/100</p>
            </div>

            <div className="min-w-0 space-y-1">
              <label htmlFor="warehouse-code" className={labelClass}>
                Warehouse Code <span className="text-erp-danger">*</span>
              </label>
              <div className="relative">
                <Hash size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-erp-text-muted" />
                <input id="warehouse-code" required maxLength={30} value={form.code} onChange={(event) => updateField('code', event.target.value)} placeholder="e.g. WH-001" disabled={saving} className={`${inputClass('code')} pl-9 uppercase`} />
              </div>
              {errorText('code')}
              <p className="text-[10px] text-erp-text-muted">Unique warehouse identification code.</p>
            </div>

            <div className="min-w-0 space-y-1">
              <label htmlFor="warehouse-capacity" className={labelClass}>
                Capacity
              </label>
              <div className="relative">
                <Boxes size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-erp-text-muted" />
                <input
                  id="warehouse-capacity"
                  type="number"
                  min="0"
                  step="any"
                  value={form.capacity}
                  onChange={(event) => updateField('capacity', event.target.value)}
                  placeholder="Enter warehouse capacity"
                  disabled={saving}
                  className={`${inputClass('capacity')} pl-9`}
                />
              </div>
              {errorText('capacity')}
            </div>

            <div className="min-w-0 space-y-1">
              <label htmlFor="warehouse-status" className={labelClass}>
                Warehouse Status
              </label>
              <select id="warehouse-status" value={form.status} onChange={(event) => updateField('status', event.target.value)} disabled={saving || (isEdit && !canUpdateStatus)} className={inputClass('status')}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              {errorText('status')}
            </div>
          </div>
        </section>

        {/* Location Details */}
        <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex items-center gap-2 border-b border-erp-border px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
              <MapPin size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-erp-text">Location Details</h2>
              <p className="text-[11px] text-erp-text-secondary">Specify the physical warehouse location.</p>
            </div>
          </div>

          <div className="grid gap-3 p-3 sm:grid-cols-2">
            <div className="min-w-0 space-y-1 sm:col-span-2">
              <label htmlFor="warehouse-address" className={labelClass}>
                Address
              </label>
              <input id="warehouse-address" maxLength={300} value={form.address} onChange={(event) => updateField('address', event.target.value)} placeholder="Street, building, area" disabled={saving} className={inputClass('address')} />
              {errorText('address')}
            </div>

            <div className="min-w-0 space-y-1">
              <label htmlFor="warehouse-city" className={labelClass}>
                City
              </label>
              <input id="warehouse-city" maxLength={100} value={form.city} onChange={(event) => updateField('city', event.target.value)} placeholder="e.g. Ahmedabad" disabled={saving} className={inputClass('city')} />
              {errorText('city')}
            </div>

            <div className="min-w-0 space-y-1">
              <label htmlFor="warehouse-state" className={labelClass}>
                State
              </label>
              <input id="warehouse-state" maxLength={100} value={form.state} onChange={(event) => updateField('state', event.target.value)} placeholder="e.g. Gujarat" disabled={saving} className={inputClass('state')} />
              {errorText('state')}
            </div>

            <div className="min-w-0 space-y-1">
              <label htmlFor="warehouse-pincode" className={labelClass}>
                Pincode
              </label>
              <input id="warehouse-pincode" inputMode="numeric" maxLength={6} value={form.pincode} onChange={(event) => updateField('pincode', event.target.value)} placeholder="6-digit pincode" disabled={saving} className={inputClass('pincode')} />
              {errorText('pincode')}
            </div>
          </div>
        </section>

        {/* Contact Details */}
        <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex items-center gap-2 border-b border-erp-border px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
              <UserRound size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-erp-text">Contact Details</h2>
              <p className="text-[11px] text-erp-text-secondary">Add manager and warehouse contact information.</p>
            </div>
          </div>

          <div className="grid gap-3 p-3 sm:grid-cols-2">
            <div className="min-w-0 space-y-1">
              <label htmlFor="warehouse-manager" className={labelClass}>
                Warehouse Manager
              </label>
              <input id="warehouse-manager" maxLength={100} value={form.manager} onChange={(event) => updateField('manager', event.target.value)} placeholder="Manager name" disabled={saving} className={inputClass('manager')} />
            </div>

            <div className="min-w-0 space-y-1">
              <label htmlFor="warehouse-manager-phone" className={labelClass}>
                Manager Phone
              </label>
              <div className="relative">
                <Phone size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-erp-text-muted" />
                <input
                  id="warehouse-manager-phone"
                  maxLength={20}
                  value={form.managerPhone}
                  onChange={(event) => updateField('managerPhone', event.target.value)}
                  placeholder="Manager phone number"
                  disabled={saving}
                  className={`${inputClass('managerPhone')} pl-9`}
                />
              </div>
              {errorText('managerPhone')}
            </div>

            <div className="min-w-0 space-y-1">
              <label htmlFor="warehouse-contact-person" className={labelClass}>
                Contact Person
              </label>
              <input
                id="warehouse-contact-person"
                maxLength={100}
                value={form.contactPerson}
                onChange={(event) => updateField('contactPerson', event.target.value)}
                placeholder="Contact person name"
                disabled={saving}
                className={inputClass('contactPerson')}
              />
            </div>

            <div className="min-w-0 space-y-1">
              <label htmlFor="warehouse-phone" className={labelClass}>
                Contact Phone
              </label>
              <div className="relative">
                <Phone size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-erp-text-muted" />
                <input id="warehouse-phone" maxLength={20} value={form.phone} onChange={(event) => updateField('phone', event.target.value)} placeholder="Warehouse contact number" disabled={saving} className={`${inputClass('phone')} pl-9`} />
              </div>
              {errorText('phone')}
            </div>
          </div>
        </section>

        {/* Additional Details */}
        <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex items-center gap-2 border-b border-erp-border px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
              <Building2 size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-erp-text">Additional Details</h2>
              <p className="text-[11px] text-erp-text-secondary">Add optional warehouse notes and description.</p>
            </div>
          </div>

          <div className="grid gap-3 p-3">
            <div className="min-w-0 space-y-1">
              <label htmlFor="warehouse-description" className={labelClass}>
                Description
              </label>
              <textarea
                id="warehouse-description"
                rows={4}
                maxLength={1000}
                value={form.description}
                onChange={(event) => updateField('description', event.target.value)}
                placeholder="Describe the warehouse, storage type or other notes..."
                disabled={saving}
                className={`w-full resize-y rounded-lg border bg-erp-surface px-3 py-2.5 text-xs text-erp-text outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10 ${
                  errors.description ? 'border-red-400' : 'border-erp-border'
                }`}
              />
              {errorText('description')}
              <p className="text-right text-[10px] text-erp-text-muted">{form.description.length}/1000</p>
            </div>
          </div>
        </section>

        {/* Warehouse Preview */}
        <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex items-center gap-2 border-b border-erp-border px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
              <Eye size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-erp-text">Warehouse Preview</h2>
              <p className="text-[11px] text-erp-text-secondary">Preview the details while completing the form.</p>
            </div>
          </div>

          <div className="grid gap-4 p-4 sm:grid-cols-[auto_1fr] sm:items-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-erp-border bg-erp-primary/5 text-erp-primary">
              <Warehouse size={42} strokeWidth={1.5} />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="break-words text-base font-bold text-erp-text">{form.name.trim() || 'Warehouse Name'}</h3>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${form.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{form.status}</span>
              </div>

              <p className="mt-1 text-xs text-erp-text-secondary">Code: {form.code.trim().toUpperCase() || 'WH-XXX'}</p>

              <div className="mt-3 grid gap-2 text-xs text-erp-text-secondary sm:grid-cols-2">
                <p className="flex min-w-0 items-start gap-2">
                  <MapPinned size={14} className="mt-0.5 shrink-0 text-erp-primary" />
                  <span className="break-words">{[form.city, form.state, form.pincode].filter(Boolean).join(', ') || 'Location not entered'}</span>
                </p>

                <p className="flex min-w-0 items-start gap-2">
                  <UserRound size={14} className="mt-0.5 shrink-0 text-erp-primary" />
                  <span className="break-words">{form.manager.trim() || 'Manager not assigned'}</span>
                </p>

                <p className="flex min-w-0 items-start gap-2">
                  <Phone size={14} className="mt-0.5 shrink-0 text-erp-primary" />
                  <span className="break-words">{form.phone.trim() || form.managerPhone.trim() || 'No contact number'}</span>
                </p>

                <p className="flex min-w-0 items-start gap-2">
                  <Boxes size={14} className="mt-0.5 shrink-0 text-erp-primary" />
                  <span>Capacity: {form.capacity === '' ? 'Not specified' : form.capacity}</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* API Error */}
        {apiError && (
          <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <p>{apiError}</p>
          </div>
        )}

        {/* Sticky Footer */}
        <footer className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-erp-border bg-erp-surface/95 p-2.5 shadow-sm backdrop-blur">
          <div className="hidden min-w-0 sm:block">
            <p className="text-xs font-semibold text-erp-text">{isEdit ? 'Update warehouse details' : 'Ready to create warehouse'}</p>
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
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Warehouse'}
            </button>
          </div>
        </footer>
      </form>
    </div>
  )
}
