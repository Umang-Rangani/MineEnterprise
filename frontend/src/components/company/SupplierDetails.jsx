import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Building2, MapPin, Mail, Phone, FileText, Pencil, IndianRupee, UserRound, CalendarDays } from 'lucide-react'

const sampleSuppliers = [
  {
    id: 'SUP-001',
    name: 'Rajesh Patel',
    company: 'Patel Industrial Supplies',
    email: 'rajesh@patelindustrial.com',
    phone: '+91 98765 43210',
    city: 'Ahmedabad',
    gstin: '24ABCDE1234F1Z5',
    status: 'Active',
    outstanding: 25000,
    address: '12, GIDC Industrial Estate',
    state: 'Gujarat',
    pincode: '382430',
  },
  {
    id: 'SUP-002',
    name: 'Amit Shah',
    company: 'Shah Trading Co.',
    email: 'amit@shahtrading.com',
    phone: '+91 98765 12345',
    city: 'Surat',
    gstin: '24FGHIJ5678K1Z2',
    status: 'Active',
    outstanding: 12000,
    address: '45, Ring Road',
    state: 'Gujarat',
    pincode: '395002',
  },
  {
    id: 'SUP-003',
    name: 'Neha Desai',
    company: 'Desai Packaging',
    email: 'neha@desaipackaging.com',
    phone: '+91 98765 67890',
    city: 'Vadodara',
    gstin: '24KLMNO9012P1Z3',
    status: 'Inactive',
    outstanding: 0,
    address: '18, Makarpura GIDC',
    state: 'Gujarat',
    pincode: '390010',
  },
  {
    id: 'SUP-004',
    name: 'Karan Mehta',
    company: 'Mehta Raw Materials',
    email: 'karan@mehtaraw.com',
    phone: '+91 98765 24680',
    city: 'Rajkot',
    gstin: '24PQRST3456U1Z4',
    status: 'Active',
    outstanding: 18500,
    address: '22, Industrial Zone',
    state: 'Gujarat',
    pincode: '360002',
  },
  {
    id: 'SUP-005',
    name: 'Priya Joshi',
    company: 'Joshi Wholesale',
    email: 'priya@joshiwholesale.com',
    phone: '+91 98765 13579',
    city: 'Gandhinagar',
    gstin: '24VWXYZ7890A1Z5',
    status: 'Inactive',
    outstanding: 5000,
    address: '7, Sector 21',
    state: 'Gujarat',
    pincode: '382021',
  },
]

function DetailItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-lg bg-erp-primary-light p-2 text-erp-primary">
        <Icon size={18} />
      </div>

      <div className="min-w-0">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-1 break-words font-medium text-slate-800">{value || '—'}</p>
      </div>
    </div>
  )
}

export default function SupplierDetails() {
  const { id } = useParams()
  const navigate = useNavigate()

  const supplier = sampleSuppliers.find((item) => item.id === id)

  if (!supplier) {
    return (
      <section className="space-y-4">
        <button onClick={() => navigate('/company/suppliers')} className="inline-flex items-center gap-2 text-sm font-medium text-erp-primary hover:text-erp-primary-hover">
          <ArrowLeft size={18} />
          Back to Suppliers
        </button>

        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <Building2 size={40} className="mx-auto text-slate-300" />
          <h2 className="mt-3 text-lg font-semibold text-slate-800">Supplier Not Found</h2>
          <p className="mt-1 text-sm text-slate-500">The supplier record could not be found in the sample data.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button onClick={() => navigate('/company/suppliers')} className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-erp-primary">
            <ArrowLeft size={18} />
            Back to Suppliers
          </button>

          <h1 className="text-2xl font-bold text-slate-900">Supplier Details</h1>

          <p className="mt-1 text-sm text-slate-500">View supplier information and account summary.</p>
        </div>

        <button onClick={() => navigate(`/company/suppliers/${supplier.id}/edit`)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-erp-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-erp-primary-hover">
          <Pencil size={16} />
          Edit Supplier
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">
            <Building2 size={28} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-bold text-slate-900">{supplier.company}</h2>

              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${supplier.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{supplier.status}</span>
            </div>

            <p className="mt-1 text-sm text-slate-500">Supplier ID: {supplier.id}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <IndianRupee size={17} />
            Outstanding Balance
          </div>

          <p className="mt-3 text-2xl font-bold text-slate-900">₹{supplier.outstanding.toLocaleString('en-IN')}</p>

          <p className="mt-1 text-xs text-slate-500">Pending amount in sample data</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <UserRound size={17} />
            Contact Person
          </div>

          <p className="mt-3 text-lg font-semibold text-slate-900">{supplier.name}</p>

          <p className="mt-1 text-xs text-slate-500">Primary supplier contact</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <CalendarDays size={17} />
            Supplier Status
          </div>

          <p className="mt-3 text-lg font-semibold text-slate-900">{supplier.status}</p>

          <p className="mt-1 text-xs text-slate-500">Current account status</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <h3 className="mb-6 text-lg font-semibold text-slate-900">Contact Information</h3>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <DetailItem icon={UserRound} label="Contact Person" value={supplier.name} />

            <DetailItem icon={Building2} label="Company Name" value={supplier.company} />

            <DetailItem icon={Mail} label="Email Address" value={supplier.email} />

            <DetailItem icon={Phone} label="Phone Number" value={supplier.phone} />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <h3 className="mb-6 text-lg font-semibold text-slate-900">Address & Tax Information</h3>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <DetailItem icon={MapPin} label="Address" value={supplier.address} />

            <DetailItem icon={MapPin} label="City" value={supplier.city} />

            <DetailItem icon={MapPin} label="State" value={supplier.state} />

            <DetailItem icon={MapPin} label="Pincode" value={supplier.pincode} />

            <DetailItem icon={FileText} label="GSTIN" value={supplier.gstin} />
          </div>
        </div>
      </div>
    </section>
  )
}
