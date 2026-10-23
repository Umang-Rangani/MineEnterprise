import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, UserRound, Building2, Mail, Phone, MapPin, FileText, Eye, EyeOff } from 'lucide-react'

const sampleCustomers = [
  {
    id: 'CUS-001',
    name: 'Rahul Shah',
    company: 'Shah Enterprises',
    email: 'rahul@shahenterprises.com',
    phone: '+91 98765 43210',
    type: 'Business',
    status: 'Active',
    gstin: '24ABCDE1234F1Z5',
    address: '12, CG Road',
    city: 'Ahmedabad',
    state: 'Gujarat',
    pincode: '380009',
    notes: 'Regular customer',
  },
  {
    id: 'CUS-002',
    name: 'Priya Patel',
    company: 'Patel Retail Store',
    email: 'priya@patelretail.com',
    phone: '+91 98765 12345',
    type: 'Business',
    status: 'Active',
    gstin: '24FGHIJ5678K1Z2',
    address: '45, Ring Road',
    city: 'Surat',
    state: 'Gujarat',
    pincode: '395002',
    notes: '',
  },
  {
    id: 'CUS-003',
    name: 'Aarav Mehta',
    company: 'Individual Customer',
    email: 'aarav@example.com',
    phone: '+91 98765 67890',
    type: 'Individual',
    status: 'Active',
    gstin: '',
    address: '18, Alkapuri',
    city: 'Vadodara',
    state: 'Gujarat',
    pincode: '390007',
    notes: '',
  },
  {
    id: 'CUS-004',
    name: 'Neha Desai',
    company: 'Desai Distributors',
    email: 'neha@desaidesai.com',
    phone: '+91 98765 24680',
    type: 'Business',
    status: 'Inactive',
    gstin: '24KLMNO9012P1Z3',
    address: '22, Industrial Zone',
    city: 'Rajkot',
    state: 'Gujarat',
    pincode: '360002',
    notes: '',
  },
  {
    id: 'CUS-005',
    name: 'Karan Joshi',
    company: 'Joshi Traders',
    email: 'karan@joshitraders.com',
    phone: '+91 98765 13579',
    type: 'Business',
    status: 'Active',
    gstin: '24PQRST3456U1Z4',
    address: '7, Sector 21',
    city: 'Gandhinagar',
    state: 'Gujarat',
    pincode: '382021',
    notes: '',
  },
  {
    id: 'CUS-006',
    name: 'Ananya Shah',
    company: 'Individual Customer',
    email: 'ananya@example.com',
    phone: '+91 98765 97531',
    type: 'Individual',
    status: 'Inactive',
    gstin: '',
    address: '3, Satellite Road',
    city: 'Ahmedabad',
    state: 'Gujarat',
    pincode: '380015',
    notes: '',
  },
]

const emptyForm = {
  name: '',
  company: '',
  email: '',
  phone: '',
  type: 'Business',
  status: 'Active',
  gstin: '',
  address: '',
  city: '',
  state: 'Gujarat',
  pincode: '',
  notes: '',
}

export default function CustomerForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const existingCustomer = sampleCustomers.find((customer) => customer.id === id)

  const [formData, setFormData] = useState(() => {
    if (existingCustomer) {
      const { id: customerId, ...customerData } = existingCustomer
      return customerData
    }

    return emptyForm
  })

  const [errors, setErrors] = useState({})
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [showGstin, setShowGstin] = useState(false)

  const updateField = (field, value) => {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }))

    setErrors((previous) => ({
      ...previous,
      [field]: '',
    }))
  }

  const validateForm = () => {
    const nextErrors = {}

    if (!formData.name.trim()) {
      nextErrors.name = 'Contact person name is required.'
    }

    if (formData.type === 'Business' && !formData.company.trim()) {
      nextErrors.company = 'Company name is required for business customers.'
    }

    if (!formData.email.trim()) {
      nextErrors.email = 'Email address is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      nextErrors.email = 'Enter a valid email address.'
    }

    if (!formData.phone.trim()) {
      nextErrors.phone = 'Phone number is required.'
    } else if (!/^[+]?[\d\s()-]{8,20}$/.test(formData.phone)) {
      nextErrors.phone = 'Enter a valid phone number.'
    }

    if (formData.gstin.trim()) {
      if (!/^[0-9A-Z]{15}$/i.test(formData.gstin.trim())) {
        nextErrors.gstin = 'GSTIN must contain 15 alphanumeric characters.'
      }
    }

    if (formData.pincode.trim() && !/^\d{6}$/.test(formData.pincode.trim())) {
      nextErrors.pincode = 'Pincode must contain 6 digits.'
    }

    setErrors(nextErrors)

    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!validateForm()) return

    setShowConfirmation(true)
  }

  if (isEdit && !existingCustomer) {
    return (
      <section className="space-y-5">
        <button type="button" onClick={() => navigate('/company/customers')} className="inline-flex items-center gap-2 text-sm font-medium text-erp-primary hover:text-erp-primary-hover">
          <ArrowLeft size={18} />
          Back to Customers
        </button>

        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <UserRound size={40} className="mx-auto text-slate-300" />
          <h2 className="mt-3 text-lg font-semibold text-slate-800">Customer Not Found</h2>
          <p className="mt-1 text-sm text-slate-500">The requested customer does not exist in the sample data.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <div>
        <button type="button" onClick={() => navigate('/company/customers')} className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-erp-primary">
          <ArrowLeft size={18} />
          Back to Customers
        </button>

        <h1 className="text-2xl font-bold text-slate-900">{isEdit ? 'Edit Customer' : 'Add Customer'}</h1>

        <p className="mt-1 text-sm text-slate-500">{isEdit ? 'Update the customer information below.' : 'Enter the customer information to create a customer record.'}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4 sm:px-6">
            <div className="rounded-lg bg-erp-primary-light p-2 text-erp-primary">
              <UserRound size={20} />
            </div>

            <div>
              <h2 className="font-semibold text-slate-900">Basic Information</h2>
              <p className="text-sm text-slate-500">Customer type and contact details.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Customer Type <span className="text-rose-500">*</span>
              </label>

              <select
                value={formData.type}
                onChange={(event) => {
                  const type = event.target.value

                  setFormData((previous) => ({
                    ...previous,
                    type,
                    company: type === 'Individual' ? 'Individual Customer' : '',
                  }))

                  setErrors((previous) => ({
                    ...previous,
                    company: '',
                  }))
                }}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10"
              >
                <option value="Business">Business</option>
                <option value="Individual">Individual</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Contact Person Name <span className="text-rose-500">*</span>
              </label>

              <input
                type="text"
                value={formData.name}
                onChange={(event) => updateField('name', event.target.value)}
                placeholder="Enter contact person name"
                className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10 ${errors.name ? 'border-rose-400' : 'border-slate-200'}`}
              />

              {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name}</p>}
            </div>

            {formData.type === 'Business' && (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Company Name <span className="text-rose-500">*</span>
                </label>

                <div className="relative">
                  <Building2 size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

                  <input
                    type="text"
                    value={formData.company}
                    onChange={(event) => updateField('company', event.target.value)}
                    placeholder="Enter company name"
                    className={`w-full rounded-lg border py-2.5 pl-10 pr-3 text-sm outline-none focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10 ${errors.company ? 'border-rose-400' : 'border-slate-200'}`}
                  />
                </div>

                {errors.company && <p className="mt-1 text-xs text-rose-600">{errors.company}</p>}
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Email Address <span className="text-rose-500">*</span>
              </label>

              <div className="relative">
                <Mail size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

                <input
                  type="email"
                  value={formData.email}
                  onChange={(event) => updateField('email', event.target.value)}
                  placeholder="customer@example.com"
                  className={`w-full rounded-lg border py-2.5 pl-10 pr-3 text-sm outline-none focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10 ${errors.email ? 'border-rose-400' : 'border-slate-200'}`}
                />
              </div>

              {errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Phone Number <span className="text-rose-500">*</span>
              </label>

              <div className="relative">
                <Phone size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(event) => updateField('phone', event.target.value)}
                  placeholder="+91 98765 43210"
                  className={`w-full rounded-lg border py-2.5 pl-10 pr-3 text-sm outline-none focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10 ${errors.phone ? 'border-rose-400' : 'border-slate-200'}`}
                />
              </div>

              {errors.phone && <p className="mt-1 text-xs text-rose-600">{errors.phone}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Status</label>

              <select value={formData.status} onChange={(event) => updateField('status', event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-erp-primary">
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4 sm:px-6">
            <div className="rounded-lg bg-erp-primary-light p-2 text-erp-primary">
              <MapPin size={20} />
            </div>

            <div>
              <h2 className="font-semibold text-slate-900">Address Information</h2>
              <p className="text-sm text-slate-500">Customer billing and location details.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6">
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">Address</label>

              <input
                type="text"
                value={formData.address}
                onChange={(event) => updateField('address', event.target.value)}
                placeholder="Street, building, area"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-erp-primary"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">City</label>

              <input
                type="text"
                value={formData.city}
                onChange={(event) => updateField('city', event.target.value)}
                placeholder="Enter city"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-erp-primary"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">State</label>

              <input
                type="text"
                value={formData.state}
                onChange={(event) => updateField('state', event.target.value)}
                placeholder="Enter state"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-erp-primary"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Pincode</label>

              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={formData.pincode}
                onChange={(event) => updateField('pincode', event.target.value)}
                placeholder="6-digit pincode"
                className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-erp-primary ${errors.pincode ? 'border-rose-400' : 'border-slate-200'}`}
              />

              {errors.pincode && <p className="mt-1 text-xs text-rose-600">{errors.pincode}</p>}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4 sm:px-6">
            <div className="rounded-lg bg-erp-primary-light p-2 text-erp-primary">
              <FileText size={20} />
            </div>

            <div>
              <h2 className="font-semibold text-slate-900">Tax & Additional Information</h2>
              <p className="text-sm text-slate-500">Optional GST and customer notes.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">GSTIN</label>

              <div className="relative">
                <input
                  type={showGstin ? 'text' : 'password'}
                  value={formData.gstin}
                  maxLength={15}
                  onChange={(event) => updateField('gstin', event.target.value.toUpperCase())}
                  placeholder="15-character GSTIN"
                  className={`w-full rounded-lg border py-2.5 pl-3 pr-10 text-sm outline-none focus:border-erp-primary ${errors.gstin ? 'border-rose-400' : 'border-slate-200'}`}
                />

                <button type="button" onClick={() => setShowGstin((previous) => !previous)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700" aria-label={showGstin ? 'Hide GSTIN' : 'Show GSTIN'}>
                  {showGstin ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>

              {errors.gstin && <p className="mt-1 text-xs text-rose-600">{errors.gstin}</p>}
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">Notes</label>

              <textarea
                rows={4}
                value={formData.notes}
                onChange={(event) => updateField('notes', event.target.value)}
                placeholder="Add any additional information about this customer..."
                className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-erp-primary"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => navigate('/company/customers')} className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
            Cancel
          </button>

          <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-lg bg-erp-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-erp-primary-hover">
            <Save size={17} />
            {isEdit ? 'Update Customer' : 'Save Customer'}
          </button>
        </div>
      </form>

      {showConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">{isEdit ? 'Update Customer' : 'Customer Form Validated'}</h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">{isEdit ? 'The form is valid. Permanent updates are not enabled in this UI-only stage.' : 'The form is valid. Permanent customer creation is not enabled in this UI-only stage.'}</p>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setShowConfirmation(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                Continue Editing
              </button>

              <button type="button" onClick={() => navigate('/company/customers')} className="rounded-lg bg-erp-primary px-4 py-2 text-sm font-semibold text-white hover:bg-erp-primary-hover">
                Back to Customers
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
