import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Eye, Pencil, Trash2, Warehouse, MapPin, Users, Package, CheckCircle2, XCircle, ChevronLeft, ChevronRight, Building2 } from 'lucide-react'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import TrashBox from '../../TrashBox/TrashBox'

const initialWarehouses = [
  {
    id: 'WH-001',
    name: 'Main Warehouse',
    code: 'WH-MAIN',
    location: 'Ahmedabad, Gujarat',
    manager: 'Rahul Patel',
    capacity: 5000,
    stockUnits: 3250,
    status: 'Active',
  },
  {
    id: 'WH-002',
    name: 'Secondary Warehouse',
    code: 'WH-SEC',
    location: 'Surat, Gujarat',
    manager: 'Amit Shah',
    capacity: 3000,
    stockUnits: 1850,
    status: 'Active',
  },
  {
    id: 'WH-003',
    name: 'Raw Material Store',
    code: 'WH-RAW',
    location: 'Vadodara, Gujarat',
    manager: 'Karan Mehta',
    capacity: 2500,
    stockUnits: 1200,
    status: 'Active',
  },
  {
    id: 'WH-004',
    name: 'Finished Goods Store',
    code: 'WH-FG',
    location: 'Rajkot, Gujarat',
    manager: 'Neha Patel',
    capacity: 4000,
    stockUnits: 0,
    status: 'Inactive',
  },
  {
    id: 'WH-005',
    name: 'Distribution Warehouse',
    code: 'WH-DIS',
    location: 'Gandhinagar, Gujarat',
    manager: 'Vishal Shah',
    capacity: 6000,
    stockUnits: 4200,
    status: 'Active',
  },
  {
    id: 'WH-006',
    name: 'Regional Storage',
    code: 'WH-REG',
    location: 'Anand, Gujarat',
    manager: 'Priya Mehta',
    capacity: 2000,
    stockUnits: 750,
    status: 'Inactive',
  },
]

const statusStyles = {
  Active: 'bg-emerald-50 text-emerald-700',
  Inactive: 'bg-red-50 text-red-700',
}

const formatNumber = (number) => new Intl.NumberFormat('en-IN').format(number)

export default function CompanyWarehouses() {
  const [warehouses, setWarehouses] = useState(initialWarehouses)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [currentPage, setCurrentPage] = useState(1)
  const [deleteWarehouse, setDeleteWarehouse] = useState(null)

  const itemsPerPage = 5

  const filteredWarehouses = warehouses.filter((warehouse) => {
    const searchText = search.toLowerCase()

    const matchesSearch = [warehouse.id, warehouse.name, warehouse.code, warehouse.location, warehouse.manager].some((value) => value.toLowerCase().includes(searchText))

    const matchesStatus = statusFilter === 'All' || warehouse.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const activeWarehouses = warehouses.filter((warehouse) => warehouse.status === 'Active').length

  const inactiveWarehouses = warehouses.filter((warehouse) => warehouse.status === 'Inactive').length

  const totalStock = warehouses.reduce((total, warehouse) => total + warehouse.stockUnits, 0)

  const totalCapacity = warehouses.reduce((total, warehouse) => total + warehouse.capacity, 0)

  const totalPages = Math.max(1, Math.ceil(filteredWarehouses.length / itemsPerPage))

  const safePage = Math.min(currentPage, totalPages)

  const paginatedWarehouses = filteredWarehouses.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage)

  const changeSearch = (value) => {
    setSearch(value)
    setCurrentPage(1)
  }

  const changeStatus = (value) => {
    setStatusFilter(value)
    setCurrentPage(1)
  }

  const confirmDelete = () => {
    if (!deleteWarehouse) return

    setWarehouses((previous) => previous.filter((warehouse) => warehouse.id !== deleteWarehouse.id))

    setDeleteWarehouse(null)
  }

  const statCards = [
    {
      title: 'Total Warehouses',
      value: String(warehouses.length),
      subtitle: 'All registered locations',
      icon: Warehouse,
      iconStyle: 'bg-violet-50 text-violet-600',
    },
    {
      title: 'Active Warehouses',
      value: String(activeWarehouses),
      subtitle: 'Currently operational',
      icon: CheckCircle2,
      iconStyle: 'bg-emerald-50 text-emerald-600',
    },
    {
      title: 'Inactive Warehouses',
      value: String(inactiveWarehouses),
      subtitle: 'Currently not operational',
      icon: XCircle,
      iconStyle: 'bg-red-50 text-red-500',
    },
    {
      title: 'Stock Units',
      value: formatNumber(totalStock),
      subtitle: `Capacity: ${formatNumber(totalCapacity)} units`,
      icon: Package,
      iconStyle: 'bg-blue-50 text-blue-600',
    },
  ]

  const breadcrumbItems = [
    {
      title: 'Warehouses',
      link: null,
    },
  ]

  return (
    <div className="space-y-6 pb-10">
      <BreadCrumb items={breadcrumbItems} />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Warehouses</h1>
          <p className="mt-1 text-sm text-slate-500">Manage warehouse locations, capacity and stock storage.</p>
        </div>

        <Link to="/company/warehouses/new" className="inline-flex items-center justify-center gap-2 rounded-xl bg-erp-primary px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-erp-primary-hover">
          <Plus size={18} />
          Add Warehouse
        </Link>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon

          return (
            <div key={card.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">{card.title}</p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-800">{card.value}</h2>
                </div>

                <div className={`rounded-xl p-3 ${card.iconStyle}`}>
                  <Icon size={21} />
                </div>
              </div>

              <p className="mt-3 text-xs text-slate-500">{card.subtitle}</p>
            </div>
          )
        })}
      </div>

      {/* Search and Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={search}
              onChange={(event) => changeSearch(event.target.value)}
              placeholder="Search warehouse, code, location or manager..."
              className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-erp-primary focus:ring-4 focus:ring-erp-primary/10"
            />
          </div>

          <select value={statusFilter} onChange={(event) => changeStatus(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-erp-primary">
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Warehouse Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-1 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-semibold text-slate-800">Warehouse Records</h2>
          <p className="text-sm text-slate-500">{filteredWarehouses.length} records found</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left">
            <thead className="bg-slate-50">
              <tr className="text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-4 font-semibold">Warehouse</th>
                <th className="px-5 py-4 font-semibold">Location</th>
                <th className="px-5 py-4 font-semibold">Manager</th>
                <th className="px-5 py-4 font-semibold">Stock / Capacity</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {paginatedWarehouses.map((warehouse) => {
                const capacityPercentage = warehouse.capacity > 0 ? Math.min(100, Math.round((warehouse.stockUnits / warehouse.capacity) * 100)) : 0

                return (
                  <tr key={warehouse.id} className="transition hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-erp-primary-light p-2.5 text-erp-primary">
                          <Warehouse size={19} />
                        </div>

                        <div>
                          <p className="font-semibold text-slate-800">{warehouse.name}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {warehouse.code} · {warehouse.id}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <MapPin size={15} className="shrink-0 text-slate-400" />
                        {warehouse.location}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Users size={16} className="text-slate-400" />
                        {warehouse.manager}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="w-44">
                        <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                          <span className="font-semibold text-slate-700">{formatNumber(warehouse.stockUnits)} units</span>
                          <span className="text-slate-500">{capacityPercentage}%</span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div className={`h-full rounded-full ${capacityPercentage >= 90 ? 'bg-red-500' : capacityPercentage >= 70 ? 'bg-amber-500' : 'bg-erp-primary'}`} style={{ width: `${capacityPercentage}%` }} />
                        </div>

                        <p className="mt-1 text-xs text-slate-400">of {formatNumber(warehouse.capacity)}</p>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[warehouse.status]}`}>{warehouse.status}</span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/company/warehouses/${warehouse.id}`} title="View warehouse" aria-label={`View ${warehouse.name}`} className="rounded-lg p-2 text-slate-500 transition hover:bg-erp-primary-light hover:text-erp-primary">
                          <Eye size={17} />
                        </Link>

                        <Link to={`/company/warehouses/${warehouse.id}/edit`} title="Edit warehouse" aria-label={`Edit ${warehouse.name}`} className="rounded-lg p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600">
                          <Pencil size={17} />
                        </Link>

                        <button type="button" onClick={() => setDeleteWarehouse(warehouse)} title="Delete warehouse" aria-label={`Delete ${warehouse.name}`} className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600">
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}

              {paginatedWarehouses.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center">
                      <div className="rounded-2xl bg-slate-100 p-4 text-slate-400">
                        <Search size={26} />
                      </div>
                      <h3 className="mt-4 font-semibold text-slate-800">No warehouses found</h3>
                      <p className="mt-1 text-sm text-slate-500">Try changing your search or filter selection.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Showing {filteredWarehouses.length === 0 ? 0 : (safePage - 1) * itemsPerPage + 1} to {Math.min(safePage * itemsPerPage, filteredWarehouses.length)} of {filteredWarehouses.length} warehouses
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage === 1}
              onClick={() => setCurrentPage(safePage - 1)}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft size={18} />
            </button>

            {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                className={`h-9 min-w-9 rounded-lg px-3 text-sm font-medium transition ${safePage === page ? 'bg-erp-primary text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                {page}
              </button>
            ))}

            <button
              type="button"
              disabled={safePage === totalPages}
              onClick={() => setCurrentPage(safePage + 1)}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      <TrashBox
        isOpen={Boolean(deleteWarehouse)}
        onClose={() => setDeleteWarehouse(null)}
        title="Delete Warehouse?"
        message={deleteWarehouse ? `Are you sure you want to delete ${deleteWarehouse.name} (${deleteWarehouse.code})? This only removes the warehouse from the current sample UI.` : ''}
        actionButtonText="Delete Warehouse"
        cancelButtonText="Cancel"
        onAction={confirmDelete}
        isProcessing={false}
      />
    </div>
  )
}
