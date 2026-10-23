import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, UserRound, Building2, Mail, Phone, MapPin, FileText, IndianRupee, CalendarDays } from 'lucide-react'

const sampleCustomers = [
  {
    id: 'CUS-001',
    name: 'Rahul Shah',
    company: 'Shah Enterprises',
    email: 'rahul@shahenterprises.com',
    phone: '+91 98765 43210',
    city: 'Ahmedabad',
    type: 'Business',
    status: 'Active',
    outstanding: 15000,
    gstin: '24ABCDE1234F1Z5',
    address: '12, CG Road',
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
    city: 'Surat',
    type: 'Business',
    status: 'Active',
    outstanding: 8500,
    gstin: '24FGHIJ5678K1Z2',
    address: '45, Ring Road',
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
    city: 'Vadodara',
    type: 'Individual',
    status: 'Active',
    outstanding: 0,
    gstin: '',
    address: '18, Alkapuri',
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
    city: 'Rajkot',
    type: 'Business',
    status: 'Inactive',
    outstanding: 12000,
    gstin: '24KLMNO9012P1Z3',
    address: '22, Industrial Zone',
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
    city: 'Gandhinagar',
    type: 'Business',
    status: 'Active',
    outstanding: 4500,
    gstin: '24PQRST3456U1Z4',
    address: '7, Sector 21',
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
    city: 'Ahmedabad',
    type: 'Individual',
    status: 'Inactive',
    outstanding: 0,
    gstin: '',
    address: '3, Satellite Road',
    state: 'Gujarat',
    pincode: '380015',
    notes: '',
  },
]

export default function CustomerDetails() {
  const { id } = useParams()
  const navigate = useNavigate()

  const customer = sampleCustomers.find((item) => item.id === id)

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)

  if (!customer) {
    return (
      <section className="space-y-5">
        <button type="button" onClick={() => navigate('/company/customers')} className="inline-flex items-center gap-2 text-sm font-medium text-erp-primary hover:text-erp-primary-hover">
          <ArrowLeft size={18} />
          Back to Customers
        </button>

        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <UserRound size={40} className="mx-auto text-slate-300" />

          <h2 className="mt-3 text-lg font-semibold text-slate-800">Customer Not Found</h2>

          <p className="mt-1 text-sm text-slate-500">The requested customer could not be found in the sample data.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button type="button" onClick={() => navigate('/company/customers')} className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-erp-primary">
            <ArrowLeft size={18} />
            Back to Customers
          </button>

          <h1 className="text-2xl font-bold text-slate-900">Customer Details</h1>

          <p className="mt-1 text-sm text-slate-500">View customer profile and account information.</p>
        </div>

        <button
          type="button"
          onClick={() => navigate(`/company/customers/${customer.id}/edit`)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-erp-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-erp-primary-hover"
        >
          <Pencil size={17} />
          Edit Customer
        </button>
      </div>

      {/* Customer Profile */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">{customer.type === 'Business' ? <Building2 size={28} /> : <UserRound size={28} />}</div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-bold text-slate-900">{customer.company}</h2>

              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${customer.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{customer.status}</span>
            </div>

            <p className="mt-1 text-sm text-slate-500">Customer ID: {customer.id}</p>
          </div>

          <span className="w-fit rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600">{customer.type} Customer</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <IndianRupee size={17} />
            Outstanding Balance
          </div>

          <p className="mt-3 text-2xl font-bold text-slate-900">{formatCurrency(customer.outstanding)}</p>

          <p className="mt-1 text-xs text-slate-500">Pending amount in sample data</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <UserRound size={17} />
            Contact Person
          </div>

          <p className="mt-3 text-lg font-semibold text-slate-900">{customer.name}</p>

          <p className="mt-1 text-xs text-slate-500">Primary customer contact</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <CalendarDays size={17} />
            Account Status
          </div>

          <p className="mt-3 text-lg font-semibold text-slate-900">{customer.status}</p>

          <p className="mt-1 text-xs text-slate-500">Current customer status</p>
        </div>
      </div>

      {/* Contact Information */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="mb-5 text-lg font-semibold text-slate-900">Contact Information</h2>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-erp-primary-light p-2 text-erp-primary">
              <UserRound size={18} />
            </div>

            <div>
              <p className="text-sm text-slate-500">Contact Person</p>
              <p className="mt-1 font-medium text-slate-800">{customer.name}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-erp-primary-light p-2 text-erp-primary">
              <Building2 size={18} />
            </div>

            <div>
              <p className="text-sm text-slate-500">Company Name</p>
              <p className="mt-1 font-medium text-slate-800">{customer.company}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-erp-primary-light p-2 text-erp-primary">
              <Mail size={18} />
            </div>

            <div className="min-w-0">
              <p className="text-sm text-slate-500">Email Address</p>
              <p className="mt-1 break-all font-medium text-slate-800">{customer.email || '—'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-erp-primary-light p-2 text-erp-primary">
              <Phone size={18} />
            </div>

            <div>
              <p className="text-sm text-slate-500">Phone Number</p>
              <p className="mt-1 font-medium text-slate-800">{customer.phone || '—'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Address and Tax Information */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="mb-5 text-lg font-semibold text-slate-900">Address Information</h2>

          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-erp-primary-light p-2 text-erp-primary">
                <MapPin size={18} />
              </div>

              <div>
                <p className="text-sm text-slate-500">Address</p>
                <p className="mt-1 font-medium text-slate-800">{customer.address || '—'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <p className="text-sm text-slate-500">City</p>
                <p className="mt-1 font-medium text-slate-800">{customer.city || '—'}</p>
              </div>

              <div>
                <p className="text-sm text-slate-500">State</p>
                <p className="mt-1 font-medium text-slate-800">{customer.state || '—'}</p>
              </div>

              <div>
                <p className="text-sm text-slate-500">Pincode</p>
                <p className="mt-1 font-medium text-slate-800">{customer.pincode || '—'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="mb-5 text-lg font-semibold text-slate-900">Tax & Additional Information</h2>

          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-erp-primary-light p-2 text-erp-primary">
                <FileText size={18} />
              </div>

              <div>
                <p className="text-sm text-slate-500">GSTIN</p>
                <p className="mt-1 font-medium text-slate-800">{customer.gstin || 'Not provided'}</p>
              </div>
            </div>

            <div>
              <p className="text-sm text-slate-500">Customer Notes</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{customer.notes || 'No additional notes.'}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
