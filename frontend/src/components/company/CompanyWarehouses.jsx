import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Eye, Pencil, Trash2, Warehouse, MapPin, Users, CheckCircle2, XCircle, ChevronLeft, ChevronRight, RefreshCw, Filter, FilterX, AlertCircle, Power, LoaderCircle, Download, Phone } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import TrashBox from '../../TrashBox/TrashBox'
import Toast from '../../Toast/Toast'
import { hasPermission, useAuth } from '../../context/AuthContext'

const statusStyles = {
  Active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Inactive: 'border-rose-200 bg-rose-50 text-rose-700',
}

const formatNumber = (value) => new Intl.NumberFormat('en-IN').format(Number(value) || 0)

function getCapacityPercentage(warehouse) {
  const capacity = Number(warehouse.capacity) || 0
  const stock = Number(warehouse.stockUnits) || 0

  if (!capacity) return 0

  return Math.min(100, Math.round((stock / capacity) * 100))
}

function getCapacityColor(percentage) {
  if (percentage >= 90) return 'bg-rose-500'
  if (percentage >= 70) return 'bg-amber-500'
  return 'bg-erp-primary'
}

function getWarehouseArray(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.warehouses)) return data.warehouses
  if (Array.isArray(data?.data?.warehouses)) return data.data.warehouses
  if (Array.isArray(data?.data)) return data.data

  return []
}

function getWarehouseObject(data) {
  return data?.warehouse || data?.data?.warehouse || data?.data || null
}

export default function CompanyWarehouses() {
  const { permissions } = useAuth()

  const canCreate = hasPermission(permissions, 'warehouse:create')
  const canView = hasPermission(permissions, 'warehouse:view')
  const canUpdate = hasPermission(permissions, 'warehouse:update')
  const canUpdateStatus = hasPermission(permissions, 'warehouse:update-status')
  const canDelete = hasPermission(permissions, 'warehouse:delete')
  const canExport = hasPermission(permissions, 'warehouse:export')

  const [warehouses, setWarehouses] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [apiError, setApiError] = useState('')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [pageSize, setPageSize] = useState(5)
  const [currentPage, setCurrentPage] = useState(1)

  const [deleteWarehouse, setDeleteWarehouse] = useState(null)
  const [statusTarget, setStatusTarget] = useState(null)
  const [processingId, setProcessingId] = useState('')
  const [toast, setToast] = useState(null)

  const [isExporting, setIsExporting] = useState(false)

  const breadcrumbItems = [{ title: 'Warehouses', link: null }]

  const showToast = (type, message) => {
    setToast({
      id: Date.now(),
      type,
      message,
      duration: 3000,
    })
  }

  const loadWarehouses = useCallback(async (showLoader = true) => {
    if (showLoader) {
      setLoading(true)
    }

    setApiError('')

    try {
      const { data } = await axiosInstance.get('/erp/warehouses')

      if (data?.success === false) {
        throw new Error(data.message || 'Unable to load warehouses.')
      }

      setWarehouses(getWarehouseArray(data))
    } catch (error) {
      setApiError(error.response?.data?.message || error.message || 'Unable to load warehouses.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    document.title = 'Warehouses | MineERP'
    loadWarehouses()
  }, [loadWarehouses])

  const stats = useMemo(() => {
    const active = warehouses.filter((item) => item.status === 'Active').length

    const inactive = warehouses.filter((item) => item.status === 'Inactive').length

    const totalStock = warehouses.reduce((sum, item) => sum + Number(item.stockUnits || 0), 0)

    const totalCapacity = warehouses.reduce((sum, item) => sum + Number(item.capacity || 0), 0)

    return {
      total: warehouses.length,
      active,
      inactive,
      totalStock,
      totalCapacity,
    }
  }, [warehouses])

  const filteredWarehouses = useMemo(() => {
    const query = search.trim().toLowerCase()

    return warehouses.filter((item) => {
      const matchesSearch = [item._id, item.name, item.code, item.address, item.city, item.state, item.manager, item.phone].some((value) =>
        String(value || '')
          .toLowerCase()
          .includes(query),
      )

      const matchesStatus = statusFilter === 'All' || item.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [warehouses, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredWarehouses.length / pageSize))

  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * pageSize

  const paginatedWarehouses = filteredWarehouses.slice(startIndex, startIndex + pageSize)

  const hasActiveFilters = Boolean(search.trim()) || statusFilter !== 'All'

  const resetFilters = () => {
    setSearch('')
    setStatusFilter('All')
    setCurrentPage(1)
  }

  const handleRefresh = () => {
    if (refreshing || loading) return

    setRefreshing(true)
    loadWarehouses(false)
  }

  const handleExportWarehouses = async () => {
    if (!canExport || isExporting) return

    setIsExporting(true)

    try {
      const response = await axiosInstance.get('/erp/warehouses/export', {
        params: {
          search: search.trim() || undefined,
          status: statusFilter === 'All' ? undefined : statusFilter,
        },
        responseType: 'blob',
      })

      const blob = new Blob([response.data], {
        type: 'text/csv;charset=utf-8;',
      })

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = url
      link.download = `warehouses-${new Date().toISOString().slice(0, 10)}.csv`

      document.body.appendChild(link)
      link.click()
      link.remove()

      window.setTimeout(() => URL.revokeObjectURL(url), 1000)

      showToast('success', 'Warehouses exported successfully.')
    } catch (error) {
      let message = 'Unable to export warehouses.'

      if (error.response?.data instanceof Blob) {
        try {
          const errorData = JSON.parse(await error.response.data.text())
          message = errorData.message || message
        } catch {
          // Use the fallback message.
        }
      } else {
        message = error.response?.data?.message || error.message || message
      }

      showToast('error', message)
    } finally {
      setIsExporting(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteWarehouse || processingId) return

    const warehouse = deleteWarehouse
    setProcessingId(String(warehouse._id))
    setApiError('')

    try {
      const { data } = await axiosInstance.delete(`/erp/warehouses/${encodeURIComponent(warehouse._id)}`)

      if (data?.success === false) {
        throw new Error(data.message || 'Unable to delete warehouse.')
      }

      setWarehouses((previous) => previous.filter((item) => item._id !== warehouse._id))

      showToast('success', data?.message || `${warehouse.name} deleted successfully.`)

      setDeleteWarehouse(null)
    } catch (error) {
      showToast('error', error.response?.data?.message || error.message || 'Unable to delete warehouse.')
    } finally {
      setProcessingId('')
    }
  }

  const confirmToggleStatus = async () => {
    if (!statusTarget || processingId) return

    const warehouse = statusTarget
    const nextStatus = warehouse.status === 'Active' ? 'Inactive' : 'Active'

    setProcessingId(String(warehouse._id))
    setApiError('')

    try {
      // Backend endpoint should validate warehouse:update-status permission.
      const { data } = await axiosInstance.patch(`/erp/warehouses/${encodeURIComponent(warehouse._id)}/status`, { status: nextStatus })

      if (data?.success === false) {
        throw new Error(data.message || 'Unable to update warehouse status.')
      }

      const updatedWarehouse = getWarehouseObject(data)

      setWarehouses((previous) =>
        previous.map((item) =>
          item._id === warehouse._id
            ? {
                ...item,
                ...(updatedWarehouse && typeof updatedWarehouse === 'object' ? updatedWarehouse : {}),
                status: updatedWarehouse?.status || nextStatus,
              }
            : item,
        ),
      )

      showToast('success', data?.message || `${warehouse.name} marked ${nextStatus}.`)

      setStatusTarget(null)
    } catch (error) {
      showToast('error', error.response?.data?.message || error.message || 'Unable to update warehouse status.')
    } finally {
      setProcessingId('')
    }
  }

  const statCards = [
    {
      title: 'Total Warehouses',
      value: stats.total,
      icon: Warehouse,
      color: 'text-violet-700',
      border: 'border-violet-200',
    },
    {
      title: 'Active Warehouses',
      value: stats.active,
      icon: CheckCircle2,
      color: 'text-emerald-700',
      border: 'border-emerald-200',
    },
    {
      title: 'Inactive Warehouses',
      value: stats.inactive,
      icon: XCircle,
      color: 'text-rose-700',
      border: 'border-rose-200',
    },
  ]

  if (loading) {
    return (
      <div className="min-w-0 space-y-4">
        <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card h-17">
          <div className="h-1 bg-erp-primary" />
          <div className="flex min-h-16 items-center px-4 sm:px-5">
            <BreadCrumb items={breadcrumbItems} />
          </div>
        </section>

        <div className="flex min-h-48 items-center justify-center rounded-xl border border-erp-border bg-erp-surface">
          <div className="text-center">
            <RefreshCw size={24} className="mx-auto animate-spin text-erp-primary" />
            <p className="mt-3 text-sm font-semibold text-erp-text">Loading warehouses...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-4 pb-8 text-sm">
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card h-17">
        <div className="h-1 bg-erp-primary" />

        <div className="flex flex-col justify-between gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-5">
          <BreadCrumb items={breadcrumbItems} />

          <div className="flex items-center gap-2">
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
              disabled={refreshing}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-erp-border px-3 text-xs font-semibold text-erp-text-secondary hover:bg-erp-hover disabled:opacity-60"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>

            {canExport && (
              <button
                type="button"
                onClick={handleExportWarehouses}
                disabled={isExporting}
                title="Export warehouses to CSV"
                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-erp-border bg-erp-surface px-3 text-xs font-semibold text-erp-text-secondary transition hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isExporting ? <LoaderCircle size={15} className="animate-spin" /> : <Download size={15} />}

                <span>{isExporting ? 'Exporting...' : 'Export'}</span>
              </button>
            )}

            {canCreate && (
              <Link
                to="/company/warehouses/new"
                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-erp-primary px-3.5 text-xs font-semibold text-white transition hover:bg-erp-primary-hover focus:outline-none focus:ring-2 focus:ring-erp-primary/30 focus:ring-offset-1"
              >
                <Plus size={15} />
                Add Warehouse
              </Link>
            )}
          </div>
        </div>
      </section>

      {apiError && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <p>{apiError}</p>
          <button type="button" onClick={() => loadWarehouses()} className="ml-auto shrink-0 font-semibold underline">
            Retry
          </button>
        </div>
      )}

      <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        <div className="flex flex-col gap-3 border-b border-erp-border p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1 lg:w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setCurrentPage(1)
                }}
                placeholder="Search name, code, location or manager..."
                aria-label="Search warehouses"
                className="h-9 w-full rounded-lg border border-erp-border bg-erp-surface pl-9 pr-3 text-xs text-erp-text outline-none focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10 sm:text-sm"
              />
            </div>

            {hasActiveFilters && (
              <button type="button" onClick={resetFilters} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-erp-border px-3 text-xs font-semibold text-erp-text-secondary hover:bg-erp-hover">
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
              aria-label="Filter warehouse status"
              className="h-9 min-w-32 rounded-lg border border-erp-border bg-erp-surface px-3 text-xs text-erp-text outline-none focus:border-erp-primary sm:text-sm"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[950px] text-left">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-100">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Warehouse</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Location</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Manager</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Stock / Capacity</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {paginatedWarehouses.map((warehouse) => {
                const percentage = getCapacityPercentage(warehouse)

                return (
                  <tr key={warehouse._id} className="transition hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-erp-primary-light text-erp-primary">
                          <Warehouse size={17} />
                        </div>
                        <div className="min-w-0">
                          <p className="max-w-52 truncate text-xs font-semibold text-erp-text sm:text-sm">{warehouse.name}</p>
                          {/* <p className="mt-0.5 text-[10px] text-erp-muted">{warehouse.code}</p> */}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex max-w-48 items-center gap-1.5 text-xs text-slate-600">
                        <MapPin size={14} className="shrink-0 text-slate-400" />
                        <span className="truncate">{[warehouse.city, warehouse.state].filter(Boolean).join(', ') || warehouse.address || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <Users size={14} className="shrink-0 text-slate-400" />
                          <span>{warehouse.manager || 'Unassigned'}</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Phone size={14} className="shrink-0 text-slate-400" />
                          <span>{warehouse.managerPhone || 'No phone number'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-40">
                        <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px]">
                          <span className="font-semibold text-slate-700">{formatNumber(warehouse.stockUnits)} units</span>
                          <span className="text-slate-500">{percentage}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div className={`h-full rounded-full ${getCapacityColor(percentage)}`} style={{ width: `${percentage}%` }} />
                        </div>
                        <p className="mt-1 text-[10px] text-slate-400">Capacity: {formatNumber(warehouse.capacity)}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold ${statusStyles[warehouse.status] || statusStyles.Inactive}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${warehouse.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        {warehouse.status || 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {canView && (
                          <Link to={`/company/warehouses/${warehouse._id}`} title="View warehouse" aria-label={`View ${warehouse.name}`} className="rounded-lg p-2 text-slate-500 hover:bg-erp-primary-light hover:text-erp-primary">
                            <Eye size={15} />
                          </Link>
                        )}

                        {canUpdate && (
                          <Link to={`/company/warehouses/${warehouse._id}/edit`} title="Edit warehouse" aria-label={`Edit ${warehouse.name}`} className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-600">
                            <Pencil size={15} />
                          </Link>
                        )}

                        {canUpdateStatus && (
                          <button
                            type="button"
                            onClick={() => setStatusTarget(warehouse)}
                            title={warehouse.status === 'Active' ? 'Deactivate warehouse' : 'Activate warehouse'}
                            disabled={Boolean(processingId)}
                            className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
                              warehouse.status === 'Active' ? 'border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100' : 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                            }`}
                          >
                            <Power size={15} />
                          </button>
                        )}

                        {canDelete && (
                          <button type="button" onClick={() => setDeleteWarehouse(warehouse)} title="Delete warehouse" aria-label={`Delete ${warehouse.name}`} className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600">
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}

              {paginatedWarehouses.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-14 text-center">
                    <Warehouse size={25} className="mx-auto text-slate-400" />
                    <h3 className="mt-3 text-sm font-bold text-erp-text">No warehouses found</h3>
                    <p className="mt-1 text-xs text-erp-muted">{hasActiveFilters ? 'Try changing your search or status filter.' : 'No warehouses have been created yet.'}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-slate-100 md:hidden">
          {paginatedWarehouses.map((warehouse) => {
            const percentage = getCapacityPercentage(warehouse)

            return (
              <article key={warehouse._id} className="space-y-3 p-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">
                    <Warehouse size={19} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="break-words text-sm font-semibold text-erp-text">{warehouse.name}</h3>
                    <p className="mt-1 break-words text-xs text-erp-muted">{warehouse.code}</p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                      <MapPin size={12} />
                      {[warehouse.city, warehouse.state].filter(Boolean).join(', ') || warehouse.address || '—'}
                    </p>
                  </div>

                  <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold ${statusStyles[warehouse.status] || statusStyles.Inactive}`}>{warehouse.status || 'Inactive'}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3">
                  <div>
                    <p className="text-[10px] text-slate-500">Manager</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-slate-700">
                      <Users size={13} />
                      {warehouse.manager || 'Unassigned'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500">Stock / Capacity</p>
                    <p className="mt-1 text-xs font-semibold text-slate-800">
                      {formatNumber(warehouse.stockUnits)} / {formatNumber(warehouse.capacity)}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <div className="mb-1 flex justify-between text-[10px] text-slate-500">
                      <span>Capacity used</span>
                      <span>{percentage}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                      <div className={`h-full rounded-full ${getCapacityColor(percentage)}`} style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-2">
                  {canView && (
                    <Link to={`/company/warehouses/${warehouse._id}`} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-erp-border text-xs font-semibold text-slate-700 hover:bg-erp-hover">
                      <Eye size={14} />
                      View
                    </Link>
                  )}

                  {canUpdate && (
                    <Link to={`/company/warehouses/${warehouse._id}/edit`} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-erp-border text-xs font-semibold text-slate-700 hover:bg-erp-hover">
                      <Pencil size={14} />
                      Edit
                    </Link>
                  )}

                  {canUpdateStatus && (
                    <button
                      type="button"
                      onClick={() => setStatusTarget(warehouse)}
                      disabled={Boolean(processingId)}
                      className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-erp-border text-xs font-semibold text-slate-700 hover:bg-erp-hover"
                    >
                      <Power size={14} />
                      {warehouse.status === 'Active' ? 'Deactivate' : 'Activate'}
                    </button>
                  )}

                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => setDeleteWarehouse(warehouse)}
                      aria-label={`Delete ${warehouse.name}`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </article>
            )
          })}

          {paginatedWarehouses.length === 0 && (
            <div className="px-4 py-12 text-center">
              <Warehouse size={25} className="mx-auto text-slate-400" />
              <h3 className="mt-3 font-semibold text-erp-text">No warehouses found</h3>
              <p className="mt-1 text-xs text-erp-muted">{hasActiveFilters ? 'Try changing your search or status filter.' : 'No warehouses have been created yet.'}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-erp-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs text-erp-muted">
              Showing{' '}
              <span className="font-semibold text-erp-text">
                {filteredWarehouses.length === 0 ? 0 : startIndex + 1}–{Math.min(startIndex + pageSize, filteredWarehouses.length)}
              </span>{' '}
              of <span className="font-semibold text-erp-text">{filteredWarehouses.length}</span>
            </p>

            <div className="flex items-center gap-2">
              <label htmlFor="warehouse-page-size" className="text-xs text-erp-muted">
                Rows:
              </label>
              <select
                id="warehouse-page-size"
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value))
                  setCurrentPage(1)
                }}
                className="h-8 rounded-lg border border-erp-border bg-erp-surface px-2 text-xs text-erp-text"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button type="button" disabled={safePage <= 1} onClick={() => setCurrentPage(1)} aria-label="First page" className="flex h-8 items-center justify-center rounded-lg border border-erp-border px-2 text-xs disabled:opacity-40">
              1
            </button>
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              aria-label="Previous page"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-erp-border disabled:opacity-40"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="min-w-20 text-center text-xs text-erp-muted">
              Page {safePage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              aria-label="Next page"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-erp-border disabled:opacity-40"
            >
              <ChevronRight size={15} />
            </button>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage(totalPages)}
              aria-label="Last page"
              className="flex h-8 items-center justify-center rounded-lg border border-erp-border px-2 text-xs disabled:opacity-40"
            >
              {totalPages}
            </button>
          </div>
        </div>
      </section>

      <TrashBox
        isOpen={Boolean(deleteWarehouse)}
        onClose={() => {
          if (!processingId) setDeleteWarehouse(null)
        }}
        title="Delete Warehouse?"
        message={deleteWarehouse ? `Are you sure you want to delete ${deleteWarehouse.name} (${deleteWarehouse.manager})?` : ''}
        actionButtonText="Delete Warehouse"
        cancelButtonText="Cancel"
        onAction={confirmDelete}
        isProcessing={Boolean(processingId)}
      />

      <TrashBox
        isOpen={Boolean(statusTarget)}
        onClose={() => {
          if (!processingId) setStatusTarget(null)
        }}
        title={statusTarget?.status === 'Inactive' ? 'Activate Warehouse?' : 'Deactivate Warehouse?'}
        message={statusTarget?.status === 'Inactive' ? `Are you sure you want to activate "${statusTarget?.name}"?` : `Are you sure you want to deactivate "${statusTarget?.name}"?`}
        actionButtonText={statusTarget?.status === 'Inactive' ? 'Activate Warehouse' : 'Deactivate Warehouse'}
        cancelButtonText="Cancel"
        onAction={confirmToggleStatus}
        isProcessing={Boolean(processingId)}
        variant={statusTarget?.status === 'Inactive' ? 'activate' : 'deactivate'}
      />
    </div>
  )
}
