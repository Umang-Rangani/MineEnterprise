import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Truck, Users, CheckCircle2, XCircle, Eye, Pencil, Trash2, Mail, Phone, MapPin, Filter } from 'lucide-react'

const initialSuppliers = [
  {
    id: 'SUP-001',
    name: 'Shree Ganesh Traders',
    company: 'Shree Ganesh Traders',
    email: 'ganesh@example.com',
    phone: '+91 98765 43210',
    city: 'Ahmedabad',
    gstin: '24ABCDE1234F1Z5',
    status: 'Active',
    outstanding: 18500,
  },
  {
    id: 'SUP-002',
    name: 'Patel Industrial Supplies',
    company: 'Patel Industrial Supplies',
    email: 'patel@example.com',
    phone: '+91 98765 12345',
    city: 'Surat',
    gstin: '24FGHIJ5678K1Z2',
    status: 'Active',
    outstanding: 32000,
  },
  {
    id: 'SUP-003',
    name: 'National Packaging Co.',
    company: 'National Packaging Co.',
    email: 'sales@example.com',
    phone: '+91 98765 67890',
    city: 'Vadodara',
    gstin: '24LMNOP9012Q1Z3',
    status: 'Inactive',
    outstanding: 0,
  },
  {
    id: 'SUP-004',
    name: 'Reliable Raw Materials',
    company: 'Reliable Raw Materials',
    email: 'info@example.com',
    phone: '+91 99887 76655',
    city: 'Rajkot',
    gstin: '24RSTUV3456W1Z4',
    status: 'Active',
    outstanding: 12500,
  },
  {
    id: 'SUP-005',
    name: 'Om Enterprise',
    company: 'Om Enterprise',
    email: 'contact@example.com',
    phone: '+91 98989 89898',
    city: 'Gandhinagar',
    gstin: '24XYZAB7890C1Z6',
    status: 'Inactive',
    outstanding: 7500,
  },
]

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)

const statusStyles = {
  Active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  Inactive: 'bg-slate-100 text-slate-600 ring-slate-500/20',
}

export default function CompanySuppliers() {
  const navigate = useNavigate()

  const [suppliers, setSuppliers] = useState(initialSuppliers)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)

  const pageSize = 5

  const stats = useMemo(
    () => ({
      total: suppliers.length,
      active: suppliers.filter((supplier) => supplier.status === 'Active').length,
      inactive: suppliers.filter((supplier) => supplier.status === 'Inactive').length,
      outstanding: suppliers.reduce((total, supplier) => total + supplier.outstanding, 0),
    }),
    [suppliers],
  )

  const filteredSuppliers = useMemo(() => {
    const query = search.trim().toLowerCase()

    return suppliers.filter((supplier) => {
      const matchesSearch = !query || [supplier.id, supplier.name, supplier.company, supplier.email, supplier.phone, supplier.city, supplier.gstin].some((value) => value.toLowerCase().includes(query))

      const matchesStatus = statusFilter === 'All' || supplier.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [suppliers, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredSuppliers.length / pageSize))

  const safePage = Math.min(currentPage, totalPages)

  const paginatedSuppliers = filteredSuppliers.slice((safePage - 1) * pageSize, safePage * pageSize)

  const handleSearch = (value) => {
    setSearch(value)
    setCurrentPage(1)
  }

  const handleStatusChange = (value) => {
    setStatusFilter(value)
    setCurrentPage(1)
  }

  const handleDelete = () => {
    if (!deleteTarget) return

    setSuppliers((previous) => previous.filter((supplier) => supplier.id !== deleteTarget.id))

    setDeleteTarget(null)
  }

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Truck size={16} />
            <span>Business Management</span>
            <span>/</span>
            <span className="text-erp-primary">Suppliers</span>
          </div>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Suppliers Management</h1>

          <p className="mt-1 text-sm text-slate-500">Manage your suppliers and keep their contact information organized.</p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/company/suppliers/new')}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-erp-primary px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-erp-primary-hover"
        >
          <Plus size={18} />
          Add Supplier
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Suppliers" value={stats.total} icon={Truck} iconClass="bg-violet-50 text-violet-600" description="All registered suppliers" />

        <StatCard title="Active Suppliers" value={stats.active} icon={CheckCircle2} iconClass="bg-emerald-50 text-emerald-600" description="Currently active" />

        <StatCard title="Inactive Suppliers" value={stats.inactive} icon={XCircle} iconClass="bg-slate-100 text-slate-600" description="Currently inactive" />

        <StatCard title="Total Outstanding" value={formatCurrency(stats.outstanding)} icon={Users} iconClass="bg-amber-50 text-amber-600" description="Sample outstanding balance" compact />
      </div>

      {/* Suppliers table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">All Suppliers</h2>
            <p className="mt-1 text-sm text-slate-500">
              {filteredSuppliers.length} supplier
              {filteredSuppliers.length === 1 ? '' : 's'} found
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative sm:w-72">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

              <input
                type="search"
                value={search}
                onChange={(event) => handleSearch(event.target.value)}
                placeholder="Search suppliers..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-erp-primary focus:ring-4 focus:ring-erp-primary/10"
              />
            </div>

            <div className="relative sm:w-44">
              <Filter size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

              <select
                value={statusFilter}
                onChange={(event) => handleStatusChange(event.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-erp-primary focus:ring-4 focus:ring-erp-primary/10"
              >
                <option value="All">All statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-100">
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Supplier</th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Contact Information</th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">City</th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Outstanding</th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {paginatedSuppliers.map((supplier) => (
                <tr key={supplier.id} className="transition hover:bg-slate-50/70">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-erp-primary-light font-bold text-erp-primary">{supplier.name.charAt(0).toUpperCase()}</div>

                      <div>
                        <p className="font-semibold text-slate-800">{supplier.name}</p>
                        <p className="mt-1 text-xs text-slate-500">{supplier.id}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <div className="space-y-1.5">
                      <p className="flex items-center gap-2 text-sm text-slate-700">
                        <Mail size={14} className="shrink-0 text-slate-400" />
                        {supplier.email}
                      </p>
                      <p className="flex items-center gap-2 text-xs text-slate-500">
                        <Phone size={14} className="shrink-0 text-slate-400" />
                        {supplier.phone}
                      </p>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <p className="flex items-center gap-2 text-sm text-slate-700">
                      <MapPin size={15} className="text-slate-400" />
                      {supplier.city}
                    </p>
                  </td>

                  <td className="px-5 py-4">
                    <span className="text-sm font-semibold tabular-nums text-slate-800">{formatCurrency(supplier.outstanding)}</span>
                  </td>

                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusStyles[supplier.status]}`}>{supplier.status}</span>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <ActionButton label="View supplier" onClick={() => navigate(`/company/suppliers/${supplier.id}`)}>
                        <Eye size={17} />
                      </ActionButton>

                      <ActionButton label="Edit supplier" onClick={() => navigate(`/company/suppliers/${supplier.id}/edit`)}>
                        <Pencil size={17} />
                      </ActionButton>

                      <ActionButton label="Delete supplier" danger onClick={() => setDeleteTarget(supplier)}>
                        <Trash2 size={17} />
                      </ActionButton>
                    </div>
                  </td>
                </tr>
              ))}

              {paginatedSuppliers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                      <Search size={22} />
                    </div>
                    <p className="mt-3 font-semibold text-slate-800">No suppliers found</p>
                    <p className="mt-1 text-sm text-slate-500">Try another search term or change the status filter.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setSearch('')
                        setStatusFilter('All')
                        setCurrentPage(1)
                      }}
                      className="mt-3 text-sm font-semibold text-erp-primary hover:underline"
                    >
                      Clear filters
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-sm text-slate-500">
            Showing {filteredSuppliers.length === 0 ? 0 : (safePage - 1) * pageSize + 1} to {Math.min(safePage * pageSize, filteredSuppliers.length)} of {filteredSuppliers.length} suppliers
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage === 1}
              onClick={() => setCurrentPage(safePage - 1)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>

            <span className="rounded-lg bg-erp-primary-light px-3.5 py-2 text-sm font-semibold text-erp-primary">
              {safePage} / {totalPages}
            </span>

            <button
              type="button"
              disabled={safePage === totalPages}
              onClick={() => setCurrentPage(safePage + 1)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {/* Delete confirmation */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setDeleteTarget(null)
            }
          }}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="delete-supplier-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <Trash2 size={22} />
            </div>

            <h2 id="delete-supplier-title" className="mt-4 text-lg font-bold text-slate-900">
              Delete supplier?
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Are you sure you want to delete <span className="font-semibold text-slate-800">{deleteTarget.name}</span>? This removes the supplier from the current sample list.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Cancel
              </button>

              <button type="button" onClick={handleDelete} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700">
                Delete Supplier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ title, value, icon: Icon, iconClass, description, compact = false }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className={`mt-3 font-bold tracking-tight text-slate-900 ${compact ? 'text-xl' : 'text-2xl'}`}>{value}</p>
        </div>

        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
          <Icon size={21} />
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">{description}</p>
    </div>
  )
}

function ActionButton({ children, label, onClick, danger = false }) {
  return (
    <button type="button" title={label} aria-label={label} onClick={onClick} className={`rounded-lg p-2 transition ${danger ? 'text-slate-400 hover:bg-red-50 hover:text-red-600' : 'text-slate-500 hover:bg-erp-primary-light hover:text-erp-primary'}`}>
      {children}
    </button>
  )
}
