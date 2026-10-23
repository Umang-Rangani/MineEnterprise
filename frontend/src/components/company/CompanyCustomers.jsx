import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Users, UserCheck, UserX, Eye, Pencil, Trash2, ChevronLeft, ChevronRight, MapPin, Mail, Phone, X, Building2 } from 'lucide-react'

const initialCustomers = [
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
  },
]

export default function CompanyCustomers() {
  const navigate = useNavigate()

  const [customers, setCustomers] = useState(initialCustomers)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [currentPage, setCurrentPage] = useState(1)
  const [deleteCustomer, setDeleteCustomer] = useState(null)

  const pageSize = 5

  const totalCustomers = customers.length
  const activeCustomers = customers.filter((customer) => customer.status === 'Active').length
  const inactiveCustomers = customers.filter((customer) => customer.status === 'Inactive').length

  const filteredCustomers = useMemo(() => {
    const term = search.trim().toLowerCase()

    return customers.filter((customer) => {
      const matchesSearch = [customer.id, customer.name, customer.company, customer.email, customer.phone, customer.city].some((value) => value.toLowerCase().includes(term))

      const matchesStatus = statusFilter === 'All' || customer.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [customers, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / pageSize))

  const safePage = Math.min(currentPage, totalPages)

  const paginatedCustomers = filteredCustomers.slice((safePage - 1) * pageSize, safePage * pageSize)

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)

  const handleDelete = () => {
    if (!deleteCustomer) return

    setCustomers((previous) => previous.filter((customer) => customer.id !== deleteCustomer.id))

    setDeleteCustomer(null)
  }

  return (
    <section className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customers</h1>

          <p className="mt-1 text-sm text-slate-500">Manage customer information and outstanding balances.</p>
        </div>

        <button onClick={() => navigate('/company/customers/new')} className="inline-flex items-center justify-center gap-2 rounded-lg bg-erp-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-erp-primary-hover">
          <Plus size={18} />
          Add Customer
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Customers</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{totalCustomers}</p>
            </div>

            <div className="rounded-xl bg-violet-50 p-3 text-violet-600">
              <Users size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">Active Customers</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{activeCustomers}</p>
            </div>

            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
              <UserCheck size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">Inactive Customers</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{inactiveCustomers}</p>
            </div>

            <div className="rounded-xl bg-rose-50 p-3 text-rose-600">
              <UserX size={22} />
            </div>
          </div>
        </div>
      </div>

      {/* Customer Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">Customer Directory</h2>

            <p className="mt-1 text-sm text-slate-500">{filteredCustomers.length} customers found</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setCurrentPage(1)
                }}
                placeholder="Search customers..."
                className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-3 text-sm outline-none transition focus:border-erp-primary sm:w-64"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value)
                setCurrentPage(1)
              }}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-erp-primary"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4 font-semibold">Customer</th>
                <th className="px-5 py-4 font-semibold">Contact</th>
                <th className="px-5 py-4 font-semibold">City</th>
                <th className="px-5 py-4 font-semibold">Type</th>
                <th className="px-5 py-4 font-semibold">Outstanding</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {paginatedCustomers.map((customer) => (
                <tr key={customer.id} className="transition hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-erp-primary-light text-erp-primary">
                        <Building2 size={19} />
                      </div>

                      <div>
                        <p className="font-semibold text-slate-800">{customer.company}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {customer.id} · {customer.name}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <div className="space-y-1">
                      <p className="flex items-center gap-2 text-slate-700">
                        <Mail size={14} className="shrink-0 text-slate-400" />
                        {customer.email}
                      </p>

                      <p className="flex items-center gap-2 text-xs text-slate-500">
                        <Phone size={14} className="shrink-0" />
                        {customer.phone}
                      </p>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <MapPin size={15} className="text-slate-400" />
                      {customer.city}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{customer.type}</span>
                  </td>

                  <td className="px-5 py-4 font-semibold text-slate-800">{formatCurrency(customer.outstanding)}</td>

                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${customer.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{customer.status}</span>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button type="button" title="View customer" onClick={() => navigate(`/company/customers/${customer.id}`)} className="rounded-lg p-2 text-slate-500 transition hover:bg-violet-50 hover:text-erp-primary">
                        <Eye size={17} />
                      </button>

                      <button type="button" title="Edit customer" onClick={() => navigate(`/company/customers/${customer.id}/edit`)} className="rounded-lg p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600">
                        <Pencil size={17} />
                      </button>

                      <button type="button" title="Delete customer" onClick={() => setDeleteCustomer(customer)} className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600">
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {paginatedCustomers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center">
                    <Users size={36} className="mx-auto text-slate-300" />

                    <p className="mt-3 font-medium text-slate-700">No customers found</p>

                    <p className="mt-1 text-sm text-slate-500">Try changing your search or status filter.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Showing {filteredCustomers.length === 0 ? 0 : (safePage - 1) * pageSize + 1} to {Math.min(safePage * pageSize, filteredCustomers.length)} of {filteredCustomers.length} customers
          </p>

          <div className="flex items-center gap-2">
            <button type="button" disabled={safePage === 1} onClick={() => setCurrentPage(safePage - 1)} className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
              <ChevronLeft size={18} />
            </button>

            <span className="px-2 text-sm font-medium text-slate-700">
              Page {safePage} of {totalPages}
            </span>

            <button
              type="button"
              disabled={safePage === totalPages}
              onClick={() => setCurrentPage(safePage + 1)}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      {deleteCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Delete Customer</h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Are you sure you want to delete <span className="font-semibold text-slate-800">{deleteCustomer.company}</span>? This will remove the customer from this sample list.
                </p>
              </div>

              <button type="button" onClick={() => setDeleteCustomer(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X size={20} />
              </button>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setDeleteCustomer(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                Cancel
              </button>

              <button type="button" onClick={handleDelete} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700">
                Delete Customer
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
