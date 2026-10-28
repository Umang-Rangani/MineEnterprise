import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Eye, Pencil, Users, CheckCircle2, XCircle, ChevronLeft, ChevronRight, RefreshCw, FilterX, AlertCircle, Power, LoaderCircle, Truck, MapPin, Phone, Mail } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import TrashBox from '../../TrashBox/TrashBox'
import Toast from '../../Toast/Toast'
import { hasPermission, useAuth } from '../../context/AuthContext'
import Loading from '../Loading/Loading'

const statusStyles = {
  Active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Inactive: 'border-rose-200 bg-rose-50 text-rose-700',
}

const formatNumber = (value) => new Intl.NumberFormat('en-IN').format(Number(value) || 0)

function getSupplierArray(response) {
  const data = response?.data

  if (Array.isArray(data?.suppliers)) return data.suppliers
  if (Array.isArray(data?.data?.suppliers)) return data.data.suppliers
  if (Array.isArray(data?.data)) return data.data

  return []
}

export default function CompanySuppliers() {
  const { permissions } = useAuth()

  const canCreate = hasPermission(permissions, 'supplier:create')
  const canView = hasPermission(permissions, 'supplier:view')
  const canUpdate = hasPermission(permissions, 'supplier:update')
  const canUpdateStatus = hasPermission(permissions, 'supplier:update-status')

  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [apiError, setApiError] = useState('')

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [refreshKey, setRefreshKey] = useState(0)

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  })

  const [statusTarget, setStatusTarget] = useState(null)
  const [processingId, setProcessingId] = useState('')
  const [toast, setToast] = useState(null)

  const breadcrumbItems = [{ title: 'Suppliers', link: null }]

  const showToast = (type, message) => {
    setToast({
      id: Date.now(),
      type,
      message,
      duration: 3000,
    })
  }

  useEffect(() => {
    document.title = 'Suppliers | MineERP'
  }, [])

  // Debounce search input.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, 350)

    return () => window.clearTimeout(timer)
  }, [search])

  // Fetch suppliers with server-side search, filters and pagination.
  useEffect(() => {
    let cancelled = false

    async function fetchSuppliers() {
      if (!hasLoaded) {
        setLoading(true)
      }

      setApiError('')

      try {
        const response = await axiosInstance.get('/erp/suppliers', {
          params: {
            page: currentPage,
            limit: pageSize,
            search: debouncedSearch || undefined,

            // The backend accepts only Active or Inactive.
            status: statusFilter === 'All' ? undefined : statusFilter,
          },
        })

        const data = response.data

        if (data?.success === false) {
          throw new Error(data.message || 'Unable to load suppliers.')
        }

        if (cancelled) return

        const list = getSupplierArray(response)
        setSuppliers(list)

        const serverPagination = data?.pagination

        if (serverPagination) {
          setPagination({
            page: Number(serverPagination.page) || currentPage,
            limit: Number(serverPagination.limit) || pageSize,
            total: Number(serverPagination.total) || 0,
            totalPages: Math.max(1, Number(serverPagination.totalPages) || 1),
          })
        } else {
          setPagination({
            page: currentPage,
            limit: pageSize,
            total: list.length,
            totalPages: 1,
          })
        }

        setHasLoaded(true)
      } catch (error) {
        if (cancelled) return

        setApiError(error.response?.data?.message || error.message || 'Unable to load suppliers.')
      } finally {
        if (!cancelled) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    }

    fetchSuppliers()

    return () => {
      cancelled = true
    }
  }, [currentPage, pageSize, debouncedSearch, statusFilter, refreshKey])

  // Keep the current page within the available page range.
  useEffect(() => {
    if (currentPage > pagination.totalPages) {
      setCurrentPage(Math.max(1, pagination.totalPages))
    }
  }, [currentPage, pagination.totalPages])

  const totalPages = Math.max(1, pagination.totalPages)
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * pageSize

  const activeOnPage = suppliers.filter((supplier) => supplier.status === 'Active').length

  const inactiveOnPage = suppliers.filter((supplier) => supplier.status === 'Inactive').length

  const hasActiveFilters = Boolean(search.trim()) || statusFilter !== 'All'

  const resetFilters = () => {
    setSearch('')
    setDebouncedSearch('')
    setStatusFilter('All')
    setCurrentPage(1)
  }

  const handleRefresh = () => {
    if (refreshing || loading) return

    setRefreshing(true)
    setLoading(true)
    setRefreshKey((previous) => previous + 1)
  }

  const confirmToggleStatus = async () => {
    if (!statusTarget || processingId || !canUpdateStatus) return

    const supplier = statusTarget
    const nextStatus = supplier.status === 'Active' ? 'Inactive' : 'Active'

    setProcessingId(String(supplier._id))

    try {
      const { data } = await axiosInstance.patch(`/erp/suppliers/${encodeURIComponent(supplier._id)}/status`, { status: nextStatus })

      if (data?.success === false) {
        throw new Error(data.message || 'Unable to update supplier status.')
      }

      setStatusTarget(null)

      showToast('success', data?.message || `${supplier.supplierName} marked ${nextStatus}.`)

      setRefreshKey((previous) => previous + 1)
    } catch (error) {
      showToast('error', error.response?.data?.message || error.message || 'Unable to update supplier status.')
    } finally {
      setProcessingId('')
    }
  }

  const statCards = [
    {
      title: 'Total Suppliers',
      value: pagination.total,
      icon: Truck,
      color: 'text-violet-700',
      border: 'border-violet-200',
    },
    {
      title: 'Active on Page',
      value: activeOnPage,
      icon: CheckCircle2,
      color: 'text-emerald-700',
      border: 'border-emerald-200',
    },
    {
      title: 'Inactive on Page',
      value: inactiveOnPage,
      icon: XCircle,
      color: 'text-rose-700',
      border: 'border-rose-200',
    },
  ]

  if (loading) {
    return (
      <div className="min-w-0 space-y-4 text-sm">
        <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="h-1 bg-erp-primary" />

          <div className="flex min-h-16 items-center px-4 sm:px-5">
            <BreadCrumb items={breadcrumbItems} />
          </div>
        </section>

        <section className="min-h-[480px] overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex min-h-[480px] items-center justify-center">
            <Loading fullScreen={false} label="Loading suppliers" description="Please wait while we load your company's supplier records." className="!h-full min-h-[480px]" />
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-4 pb-8 text-sm">
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        <div className="h-1 bg-erp-primary" />

        <div className="flex flex-col justify-between gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-5">
          <BreadCrumb items={breadcrumbItems} />

          <div className="flex  items-center gap-2">
            {statCards.map((card) => {
              const Icon = card.icon

              return (
                <div key={card.title} title={card.title} className={`flex h-9 items-center gap-2 whitespace-nowrap rounded-lg border ${card.border} px-3`}>
                  <Icon size={15} className={card.color} />
                  <span className={`hidden text-xs font-medium lg:inline ${card.color}`}>{card.title}</span>
                  <span className="text-sm font-bold text-erp-text">{formatNumber(card.value)}</span>
                </div>
              )
            })}

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-erp-border px-3 text-xs font-semibold text-erp-text-secondary hover:bg-erp-hover disabled:opacity-60"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>

            {canCreate && (
              <Link
                to="/company/suppliers/new"
                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-erp-primary px-3.5 text-xs font-semibold text-white transition hover:bg-erp-primary-hover focus:outline-none focus:ring-2 focus:ring-erp-primary/30 focus:ring-offset-1"
              >
                <Plus size={15} />
                Add Supplier
              </Link>
            )}
          </div>
        </div>
      </section>

      {apiError && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <p>{apiError}</p>

          <button type="button" onClick={handleRefresh} className="ml-auto shrink-0 font-semibold underline">
            Retry
          </button>
        </div>
      )}

      <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        <div className="flex flex-col gap-3 border-b border-erp-border p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 gap-2">
            <div className="relative min-w-0 flex-1 lg:w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setCurrentPage(1)
                }}
                placeholder="Search name, code, contact, email or phone..."
                aria-label="Search suppliers"
                className="h-9 w-full rounded-lg border border-erp-border bg-erp-surface pl-9 pr-3 text-xs text-erp-text outline-none focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10 sm:text-sm"
              />
            </div>

            {hasActiveFilters && (
              <button type="button" onClick={resetFilters} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-erp-border px-3 text-xs font-semibold text-erp-text-secondary hover:bg-erp-hover">
                <FilterX size={14} />
                Clear
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value)
                setCurrentPage(1)
              }}
              aria-label="Filter supplier status"
              className="h-9 min-w-32 rounded-lg border border-erp-border bg-erp-surface px-3 text-xs text-erp-text outline-none focus:border-erp-primary sm:text-sm"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        {loading && hasLoaded && (
          <div className="flex items-center justify-center gap-2 border-b border-erp-border px-4 py-3 text-xs text-erp-muted">
            <LoaderCircle size={15} className="animate-spin text-erp-primary" />
            Updating supplier list...
          </div>
        )}

        {/* Desktop table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[950px] text-left">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-100">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Supplier</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Contact</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Location</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Opening Balance</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {suppliers.map((supplier) => (
                <tr key={supplier._id} className="transition hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-erp-primary-light text-erp-primary">
                        <Truck size={17} />
                      </div>

                      <div className="min-w-0">
                        <p className="max-w-52 truncate text-xs font-semibold text-erp-text sm:text-sm">{supplier.supplierName}</p>
                        <p className="mt-0.5 text-[10px] text-erp-muted">Code: {supplier.supplierCode || '—'}</p>
                        {supplier.gstNumber && <p className="mt-0.5 text-[10px] text-slate-500">GST: {supplier.gstNumber}</p>}
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <Users size={14} className="shrink-0 text-slate-400" />
                        <span className="max-w-44 truncate">{supplier.contactPerson || 'No contact person'}</span>
                      </div>

                      {supplier.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Phone size={13} className="shrink-0 text-slate-400" />
                          <span>{supplier.phone}</span>
                        </div>
                      )}

                      {supplier.email && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Mail size={13} className="shrink-0 text-slate-400" />
                          <span className="max-w-48 truncate">{supplier.email}</span>
                        </div>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex max-w-48 items-start gap-1.5 text-xs text-slate-600">
                      <MapPin size={14} className="mt-0.5 shrink-0 text-slate-400" />
                      <span>{[supplier.city, supplier.state, supplier.country].filter(Boolean).join(', ') || supplier.address || '—'}</span>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <span className="text-xs font-semibold text-erp-text">₹{formatNumber(supplier.openingBalance)}</span>
                  </td>

                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold ${statusStyles[supplier.status] || statusStyles.Inactive}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${supplier.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      {supplier.status || 'Inactive'}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {canView && (
                        <Link to={`/company/suppliers/${supplier._id}`} title="View supplier" aria-label={`View ${supplier.supplierName}`} className="rounded-lg p-2 text-slate-500 hover:bg-erp-primary-light hover:text-erp-primary">
                          <Eye size={15} />
                        </Link>
                      )}

                      {canUpdate && (
                        <Link to={`/company/suppliers/${supplier._id}/edit`} title="Edit supplier" aria-label={`Edit ${supplier.supplierName}`} className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-600">
                          <Pencil size={15} />
                        </Link>
                      )}

                      {canUpdateStatus && (
                        <button
                          type="button"
                          onClick={() => setStatusTarget(supplier)}
                          title={supplier.status === 'Active' ? 'Deactivate supplier' : 'Activate supplier'}
                          aria-label={`Change status for ${supplier.supplierName}`}
                          disabled={Boolean(processingId)}
                          className={`flex h-8 w-8 items-center justify-center rounded-lg border disabled:opacity-50 ${
                            supplier.status === 'Active' ? 'border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100' : 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                          }`}
                        >
                          <Power size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {suppliers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-14 text-center">
                    <Truck size={25} className="mx-auto text-slate-400" />
                    <h3 className="mt-3 text-sm font-bold text-erp-text">No suppliers found</h3>
                    <p className="mt-1 text-xs text-erp-muted">{hasActiveFilters ? 'Try changing your search or status filter.' : 'No suppliers have been created yet.'}</p>
                    {!hasActiveFilters && canCreate && (
                      <Link to="/company/suppliers/new" className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-erp-primary px-3 py-2 text-xs font-semibold text-white hover:bg-erp-primary-hover">
                        <Plus size={14} />
                        Add your first supplier
                      </Link>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="divide-y divide-slate-100 md:hidden">
          {suppliers.map((supplier) => (
            <article key={supplier._id} className="space-y-3 p-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">
                  <Truck size={19} />
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="break-words text-sm font-semibold text-erp-text">{supplier.supplierName}</h3>
                  <p className="mt-1 break-words text-xs text-erp-muted">Code: {supplier.supplierCode || '—'}</p>
                  {supplier.gstNumber && <p className="mt-1 break-words text-xs text-slate-500">GST: {supplier.gstNumber}</p>}
                </div>

                <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold ${statusStyles[supplier.status] || statusStyles.Inactive}`}>{supplier.status || 'Inactive'}</span>
              </div>

              <div className="grid grid-cols-1 gap-3 rounded-lg bg-slate-50 p-3">
                <div>
                  <p className="text-[10px] text-slate-500">Contact Person</p>
                  <p className="mt-1 flex items-center gap-1.5 break-words text-xs font-medium text-slate-700">
                    <Users size={13} className="shrink-0" />
                    {supplier.contactPerson || 'Not provided'}
                  </p>
                </div>

                {supplier.phone && (
                  <div>
                    <p className="text-[10px] text-slate-500">Phone</p>
                    <p className="mt-1 flex items-center gap-1.5 break-all text-xs text-slate-700">
                      <Phone size={13} className="shrink-0" />
                      {supplier.phone}
                    </p>
                  </div>
                )}

                {supplier.email && (
                  <div>
                    <p className="text-[10px] text-slate-500">Email</p>
                    <p className="mt-1 flex items-center gap-1.5 break-all text-xs text-slate-700">
                      <Mail size={13} className="shrink-0" />
                      {supplier.email}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-[10px] text-slate-500">Location</p>
                  <p className="mt-1 flex items-start gap-1.5 break-words text-xs text-slate-700">
                    <MapPin size={13} className="mt-0.5 shrink-0" />
                    {[supplier.city, supplier.state, supplier.country].filter(Boolean).join(', ') || supplier.address || 'Not provided'}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] text-slate-500">Opening Balance</p>
                  <p className="mt-1 text-xs font-semibold text-slate-800">₹{formatNumber(supplier.openingBalance)}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-2">
                {canView && (
                  <Link to={`/company/suppliers/${supplier._id}`} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-erp-border text-xs font-semibold text-slate-700 hover:bg-erp-hover">
                    <Eye size={14} />
                    View
                  </Link>
                )}

                {canUpdate && (
                  <Link to={`/company/suppliers/${supplier._id}/edit`} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-erp-border text-xs font-semibold text-slate-700 hover:bg-erp-hover">
                    <Pencil size={14} />
                    Edit
                  </Link>
                )}

                {canUpdateStatus && (
                  <button
                    type="button"
                    onClick={() => setStatusTarget(supplier)}
                    disabled={Boolean(processingId)}
                    className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-erp-border text-xs font-semibold text-slate-700 hover:bg-erp-hover disabled:opacity-50"
                  >
                    <Power size={14} />
                    {supplier.status === 'Active' ? 'Deactivate' : 'Activate'}
                  </button>
                )}
              </div>
            </article>
          ))}

          {suppliers.length === 0 && (
            <div className="px-4 py-12 text-center">
              <Truck size={25} className="mx-auto text-slate-400" />
              <h3 className="mt-3 font-semibold text-erp-text">No suppliers found</h3>
              <p className="mt-1 text-xs text-erp-muted">{hasActiveFilters ? 'Try changing your search or status filter.' : 'No suppliers have been created yet.'}</p>
              {!hasActiveFilters && canCreate && (
                <Link to="/company/suppliers/new" className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-erp-primary px-3 py-2 text-xs font-semibold text-white hover:bg-erp-primary-hover">
                  <Plus size={14} />
                  Add Supplier
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="flex flex-col gap-3 border-t border-erp-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs text-erp-text-secondary sm:text-sm">
              Showing{' '}
              <span className="font-semibold text-erp-text">
                {pagination.total === 0 ? 0 : startIndex + 1}–{Math.min(startIndex + suppliers.length, pagination.total)}
              </span>{' '}
              of <span className="font-semibold text-erp-text">{formatNumber(pagination.total)}</span> suppliers
            </p>

            <div className="flex items-center gap-2">
              <label htmlFor="supplier-page-size" className="whitespace-nowrap text-xs text-erp-text-secondary">
                Rows:
              </label>

              <select
                id="supplier-page-size"
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value))
                  setCurrentPage(1)
                }}
                disabled={loading}
                className="h-8 rounded-lg border border-erp-border bg-erp-surface px-2 text-xs text-erp-text-secondary outline-none focus:border-erp-primary focus:ring-2 focus:ring-erp-ring disabled:opacity-50"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              disabled={safePage <= 1 || loading}
              onClick={() => setCurrentPage(1)}
              aria-label="First page"
              className="flex h-8 items-center justify-center rounded-lg border border-erp-border px-2 text-xs text-erp-text-secondary transition hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              First
            </button>

            <button
              type="button"
              disabled={safePage <= 1 || loading}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              aria-label="Previous page"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-erp-border text-erp-text-secondary transition hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>

            <span className="min-w-20 px-1 text-center text-xs text-erp-text-secondary sm:text-sm">
              Page {safePage} of {totalPages}
            </span>

            <button
              type="button"
              disabled={safePage >= totalPages || loading}
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              aria-label="Next page"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-erp-border text-erp-text-secondary transition hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>

            <button
              type="button"
              disabled={safePage >= totalPages || loading}
              onClick={() => setCurrentPage(totalPages)}
              aria-label="Last page"
              className="flex h-8 items-center justify-center rounded-lg border border-erp-border px-2 text-xs text-erp-text-secondary transition hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              Last
            </button>
          </div>
        </div>
      </section>

      {/* Activate / Deactivate confirmation */}
      <TrashBox
        isOpen={Boolean(statusTarget)}
        onClose={() => {
          if (!processingId) setStatusTarget(null)
        }}
        title={statusTarget?.status === 'Inactive' ? 'Activate Supplier?' : 'Deactivate Supplier?'}
        message={statusTarget?.status === 'Inactive' ? `Are you sure you want to activate "${statusTarget?.supplierName}"?` : `Are you sure you want to deactivate "${statusTarget?.supplierName}"?`}
        actionButtonText={statusTarget?.status === 'Inactive' ? 'Activate Supplier' : 'Deactivate Supplier'}
        cancelButtonText="Cancel"
        onAction={confirmToggleStatus}
        isProcessing={Boolean(processingId)}
        variant={statusTarget?.status === 'Inactive' ? 'activate' : 'deactivate'}
      />
    </div>
  )
}
