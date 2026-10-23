import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Building2, Save, X, User, Mail, Phone, MapPin, FileText } from 'lucide-react'

const sampleSuppliers = [
  {
    id: 'SUP-001',
    name: 'Shree Ganesh Traders',
    company: 'Shree Ganesh Traders',
    email: 'ganesh@example.com',
    phone: '+91 98765 43210',
    gstin: '24ABCDE1234F1Z5',
    address: 'CG Road',
    city: 'Ahmedabad',
    state: 'Gujarat',
    pincode: '380009',
    status: 'Active',
    notes: '',
  },
  {
    id: 'SUP-002',
    name: 'Patel Industrial Supplies',
    company: 'Patel Industrial Supplies',
    email: 'patel@example.com',
    phone: '+91 98765 12345',
    gstin: '24FGHIJ5678K1Z2',
    address: 'Ring Road',
    city: 'Surat',
    state: 'Gujarat',
    pincode: '395002',
    status: 'Active',
    notes: '',
  },
]

const emptyForm = {
  name: '',
  company: '',
  email: '',
  phone: '',
  gstin: '',
  address: '',
  city: '',
  state: 'Gujarat',
  pincode: '',
  status: 'Active',
  notes: '',
}

export default function SupplierForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const existingSupplier = sampleSuppliers.find((supplier) => supplier.id === id)

  const [form, setForm] = useState(() => {
    if (existingSupplier) {
      return { ...emptyForm, ...existingSupplier }
    }

    return { ...emptyForm }
  })

  const [errors, setErrors] = useState({})
  const [saved, setSaved] = useState(false)

  const updateField = (event) => {
    const { name, value } = event.target

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }))

    setErrors((previous) => ({
      ...previous,
      [name]: '',
    }))
  }

  const validateForm = () => {
    const nextErrors = {}

    if (!form.name.trim()) {
      nextErrors.name = 'Contact person name is required.'
    }

    if (!form.company.trim()) {
      nextErrors.company = 'Company name is required.'
    }

    if (!form.email.trim()) {
      nextErrors.email = 'Email address is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      nextErrors.email = 'Enter a valid email address.'
    }

    if (!form.phone.trim()) {
      nextErrors.phone = 'Phone number is required.'
    } else if (!/^[+\d\s()-]{7,20}$/.test(form.phone)) {
      nextErrors.phone = 'Enter a valid phone number.'
    }

    if (form.pincode && !/^\d{6}$/.test(form.pincode)) {
      nextErrors.pincode = 'Pincode must contain 6 digits.'
    }

    if (form.gstin && !/^[0-9A-Z]{15}$/i.test(form.gstin.trim())) {
      nextErrors.gstin = 'GSTIN must contain 15 characters.'
    }

    setErrors(nextErrors)

    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!validateForm()) return

    // UI-only: persistence will be implemented during API integration.
    setSaved(true)
  }

  if (isEdit && !existingSupplier) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <h2 className="text-lg font-bold text-slate-900">Supplier not found</h2>

        <p className="mt-2 text-sm text-slate-500">This sample supplier is not available in the form.</p>

        <button type="button" onClick={() => navigate('/company/suppliers')} className="mt-5 rounded-xl bg-erp-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-erp-primary-hover">
          Back to Suppliers
        </button>
      </div>
    )
  }

  if (saved) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <Save size={26} />
        </div>

        <h2 className="mt-4 text-xl font-bold text-slate-900">{isEdit ? 'Supplier form validated' : 'Supplier form validated'}</h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">The form is valid. The data has not been saved permanently because this page is currently UI-only. API integration will be added later.</p>

        <button type="button" onClick={() => navigate('/company/suppliers')} className="mt-6 rounded-xl bg-erp-primary px-5 py-3 text-sm font-semibold text-white hover:bg-erp-primary-hover">
          Back to Suppliers
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto  space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => navigate('/company/suppliers')} className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50" aria-label="Back to suppliers">
          <ArrowLeft size={19} />
        </button>

        <div>
          <p className="text-sm text-slate-500">Suppliers Management</p>

          <h1 className="mt-1 text-2xl font-bold text-slate-900">{isEdit ? 'Edit Supplier' : 'Add Supplier'}</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Basic information */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">
              <Building2 size={20} />
            </div>

            <div>
              <h2 className="font-bold text-slate-900">Basic Information</h2>
              <p className="mt-1 text-xs text-slate-500">Enter the supplier's business and contact details.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6">
            <FormField label="Company Name" name="company" value={form.company} onChange={updateField} error={errors.company} required placeholder="Enter company name" icon={Building2} />

            <FormField label="Contact Person" name="name" value={form.name} onChange={updateField} error={errors.name} required placeholder="Enter contact person name" icon={User} />

            <FormField label="Email Address" name="email" type="email" value={form.email} onChange={updateField} error={errors.email} required placeholder="supplier@example.com" icon={Mail} />

            <FormField label="Phone Number" name="phone" type="tel" value={form.phone} onChange={updateField} error={errors.phone} required placeholder="+91 98765 43210" icon={Phone} />

            <FormField label="GSTIN" name="gstin" value={form.gstin} onChange={updateField} error={errors.gstin} placeholder="15-character GSTIN" icon={FileText} />

            <div>
              <label htmlFor="status" className="mb-2 block text-sm font-semibold text-slate-700">
                Supplier Status
              </label>

              <select
                id="status"
                name="status"
                value={form.status}
                onChange={updateField}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-erp-primary focus:ring-4 focus:ring-erp-primary/10"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        </section>

        {/* Address */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <MapPin size={20} />
            </div>

            <div>
              <h2 className="font-bold text-slate-900">Address Information</h2>
              <p className="mt-1 text-xs text-slate-500">Add the supplier's business address.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6">
            <div className="sm:col-span-2">
              <FormField label="Street Address" name="address" value={form.address} onChange={updateField} placeholder="Building, street or area" icon={MapPin} />
            </div>

            <FormField label="City" name="city" value={form.city} onChange={updateField} placeholder="Enter city" />

            <FormField label="State" name="state" value={form.state} onChange={updateField} placeholder="Enter state" />

            <FormField label="Pincode" name="pincode" value={form.pincode} onChange={updateField} error={errors.pincode} placeholder="6-digit pincode" maxLength={6} />
          </div>
        </section>

        {/* Notes */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <label htmlFor="notes" className="mb-2 block text-sm font-semibold text-slate-700">
            Additional Notes
          </label>

          <textarea
            id="notes"
            name="notes"
            value={form.notes}
            onChange={updateField}
            rows={4}
            placeholder="Add any additional information..."
            className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-erp-primary focus:ring-4 focus:ring-erp-primary/10"
          />
        </section>

        {/* Actions */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => navigate('/company/suppliers')} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <X size={17} />
            Cancel
          </button>

          <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-erp-primary px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-erp-primary-hover">
            <Save size={17} />
            {isEdit ? 'Update Supplier' : 'Save Supplier'}
          </button>
        </div>
      </form>
    </div>
  )
}

function FormField({ label, name, value, onChange, error, required = false, type = 'text', placeholder = '', icon: Icon, maxLength }) {
  return (
    <div>
      <label htmlFor={name} className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      <div className="relative">
        {Icon && <Icon size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />}

        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          maxLength={maxLength}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${name}-error` : undefined}
          className={`w-full rounded-xl border bg-white py-3 text-sm outline-none transition placeholder:text-slate-400 focus:ring-4 focus:ring-erp-primary/10 ${Icon ? 'pl-10 pr-3.5' : 'px-3.5'} ${
            error ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-erp-primary'
          }`}
        />
      </div>

      {error && (
        <p id={`${name}-error`} className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
