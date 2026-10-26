import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Plus, RefreshCw, Search, Pencil, Trash2, Eye, PackageOpen, ChevronLeft, ChevronRight, Filter, FilterX, LoaderCircle, Power, FolderTree, Download } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import TrashBox from '../../TrashBox/TrashBox'
import Loading from '../Loading/Loading'
import { hasPermission, useAuth } from '../../context/AuthContext'

function getCategoryKey(category) {
  return category?._id ? String(category._id) : category?.name
}

function getErrorMessage(error, fallback) {
  return error.response?.data?.message || error.message || fallback
}

export default function CompanyCategories() {
  const navigate = useNavigate()
  const location = useLocation()

  const { permissions } = useAuth()

  const canList = hasPermission(permissions, 'category:list')
  const canView = hasPermission(permissions, 'category:view')
  const canCreate = hasPermission(permissions, 'category:create')
  const canUpdate = hasPermission(permissions, 'category:update')
  const canUpdateStatus = hasPermission(permissions, 'category:update-status')
  const canDelete = hasPermission(permissions, 'category:delete')
  const canExport = hasPermission(permissions, 'category:export')

  const canShowActions = canView || canUpdate || canDelete

  const [categories, setCategories] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [pageSize, setPageSize] = useState(5)
  const [currentPage, setCurrentPage] = useState(1)

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 5,
    total: 0,
    totalPages: 1,
  })

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
  })

  const [initialLoading, setInitialLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [isExporting, setIsExporting] = useState(false)

  const [deletingCategory, setDeletingCategory] = useState(null)
  const [deletingId, setDeletingId] = useState('')

  const [statusTarget, setStatusTarget] = useState(null)
  const [updatingStatusId, setUpdatingStatusId] = useState('')

  const [toast, setToast] = useState(null)
  const [error, setError] = useState('')

  const items = [{ title: 'Categories', link: null }]
  const hasActiveFilters = Boolean(search.trim()) || statusFilter !== 'All'

  const showToast = (type, message, duration = 3000) => {
    setToast({ id: Date.now(), type, message, duration })
  }

  const closeToast = () => setToast(null)

  useEffect(() => {
    document.title = 'Categories | MineERP'
  }, [])

  // Fetch categories and summary counts.
  useEffect(() => {
    let cancelled = false

    async function fetchCategories() {
      setIsFetching(true)
      setError('')

      try {
        const { data } = await axiosInstance.get('/erp/categories', {
          params: {
            search: search.trim(),
            status: statusFilter === 'All' ? undefined : statusFilter,
            page: currentPage,
            limit: pageSize,
          },
        })

        if (data.success === false) {
          throw new Error(data.message || 'Unable to load categories.')
        }

        if (cancelled) return

        setCategories(Array.isArray(data.categories) ? data.categories : [])

        const serverPagination = data.pagination || {}

        setPagination({
          page: Number(serverPagination.page) || currentPage,
          limit: Number(serverPagination.limit) || pageSize,
          total: Number(serverPagination.total) || 0,
          totalPages: Math.max(1, Number(serverPagination.totalPages) || 1),
        })

        setStats({
          total: Number(data.stats?.total) || 0,
          active: Number(data.stats?.active) || 0,
          inactive: Number(data.stats?.inactive) || 0,
        })

        const serverPage = Number(serverPagination.page) || currentPage

        if (serverPage !== currentPage) {
          setCurrentPage(serverPage)
        }
      } catch (err) {
        if (!cancelled) {
          setError(getErrorMessage(err, 'Unable to load categories.'))
        }
      } finally {
        if (!cancelled) {
          setInitialLoading(false)
          setIsFetching(false)
          setRefreshing(false)
        }
      }
    }

    fetchCategories()

    return () => {
      cancelled = true
    }
  }, [search, statusFilter, currentPage, pageSize, refreshKey])

  // Show success message received from the form or details page.
  useEffect(() => {
    if (!location.state?.successMessage) return

    showToast('success', location.state.successMessage)

    navigate(location.pathname, {
      replace: true,
      state: null,
    })
  }, [location.state, location.pathname, navigate])

  const handleRefresh = () => {
    if (isFetching) return

    setRefreshing(true)
    setRefreshKey((key) => key + 1)
  }

  // Export categories through the secured backend endpoint.
  const handleExportCategories = async () => {
    if (!canExport || isExporting) return

    setIsExporting(true)

    try {
      const response = await axiosInstance.get('/erp/categories/export', {
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
      link.download = `categories-${new Date().toISOString().slice(0, 10)}.csv`

      document.body.appendChild(link)
      link.click()
      link.remove()

      // Revoke after the browser has had a chance to start the download.
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)

      showToast('success', 'Categories exported successfully.')
    } catch (err) {
      // Blob responses can contain the backend's JSON error message.
      let message = 'Unable to export categories.'

      if (err.response?.data instanceof Blob) {
        try {
          const errorData = JSON.parse(await err.response.data.text())
          message = errorData.message || message
        } catch {
          // Keep the fallback message.
        }
      } else {
        message = getErrorMessage(err, message)
      }

      showToast('error', message)
    } finally {
      setIsExporting(false)
    }
  }

  const openCreatePage = () => {
    navigate('/company/categories/new')
  }

  const openDetailsPage = (category) => {
    if (!category?._id) return
    navigate(`/company/categories/${category._id}`)
  }

  const openEditPage = (category) => {
    if (!category?._id) return
    navigate(`/company/categories/${category._id}/edit`)
  }

  const handleToggleStatus = async () => {
    if (!canUpdateStatus || !statusTarget?._id || updatingStatusId) return

    const category = statusTarget
    const nextStatus = category.status === 'Active' ? 'Inactive' : 'Active'
    const categoryId = String(category._id)

    setUpdatingStatusId(categoryId)

    try {
      const { data } = await axiosInstance.patch(`/erp/categories/${categoryId}`, { status: nextStatus })

      if (data.success === false) {
        throw new Error(data.message || 'Unable to update category status.')
      }

      setStatusTarget(null)
      showToast('success', data.message || `Category ${nextStatus.toLowerCase()} successfully.`)
      setRefreshKey((key) => key + 1)
    } catch (err) {
      showToast('error', getErrorMessage(err, 'Unable to update category status.'))
    } finally {
      setUpdatingStatusId('')
    }
  }

  const handleDeleteCategory = async () => {
    if (!deletingCategory?._id || deletingId) return

    const categoryId = String(deletingCategory._id)
    setDeletingId(categoryId)

    try {
      const { data } = await axiosInstance.delete(`/erp/categories/${categoryId}`)

      if (data.success === false) {
        throw new Error(data.message || 'Unable to delete category.')
      }

      setDeletingCategory(null)
      showToast('success', data.message || 'Category deleted successfully.')

      if (categories.length === 1 && currentPage > 1) {
        setCurrentPage((page) => page - 1)
      } else {
        setRefreshKey((key) => key + 1)
      }
    } catch (err) {
      showToast('error', getErrorMessage(err, 'Unable to delete category.'))
    } finally {
      setDeletingId('')
    }
  }

  const resetFilters = () => {
    setSearch('')
    setStatusFilter('All')
    setCurrentPage(1)
  }

  const totalPages = Math.max(1, Number(pagination.totalPages) || 1)
  const safePage = Math.min(currentPage, totalPages)
  const totalFilteredCategories = Number(pagination.total) || 0
  const startItem = totalFilteredCategories === 0 ? 0 : (safePage - 1) * pageSize + 1
  const endItem = Math.min(safePage * pageSize, totalFilteredCategories)

  if (!canList) {
    return (
      <div className="rounded-xl border border-rose-200 bg-white p-6 text-center">
        <h2 className="text-base font-semibold text-slate-800">Access Denied</h2>
        <p className="mt-1 text-sm text-slate-500">You do not have permission to view categories.</p>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-4 text-sm">
      <Toast toast={toast} onClose={closeToast} />

      {/* Header */}
      <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        <div className="h-1 bg-erp-primary" />

        <div className="flex h-[calc(100%-4px)] min-w-0 items-center justify-between gap-3 px-4 sm:px-5">
          <div className="min-w-0 flex-1 overflow-hidden">
            <BreadCrumb items={items} />
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="flex h-9 items-center gap-2 whitespace-nowrap rounded-lg border border-erp-border px-3">
              <span className="text-xs text-slate-500">Total</span>
              <span className="text-sm font-bold text-slate-900">{stats.total}</span>
            </div>

            <div className="hidden h-9 items-center gap-2 whitespace-nowrap rounded-lg border border-emerald-200 px-3 sm:flex">
              <span className="text-xs text-emerald-700">Active</span>
              <span className="text-sm font-bold text-slate-900">{stats.active}</span>
            </div>

            <div className="hidden h-9 items-center gap-2 whitespace-nowrap rounded-lg border border-rose-200 px-3 md:flex">
              <span className="text-xs text-rose-700">Inactive</span>
              <span className="text-sm font-bold text-slate-900">{stats.inactive}</span>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={isFetching}
              title="Refresh categories"
              aria-label="Refresh categories"
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-erp-border bg-erp-surface px-3 text-xs font-semibold text-slate-600 transition hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {canExport && (
              <button
                type="button"
                onClick={handleExportCategories}
                disabled={isExporting}
                title="Export categories to CSV"
                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-erp-border bg-erp-surface px-3 text-xs font-semibold text-slate-700 transition hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isExporting ? <LoaderCircle size={15} className="animate-spin" /> : <Download size={15} />}
                <span>{isExporting ? 'Exporting...' : 'Export'}</span>
              </button>
            )}

            {canCreate && (
              <button
                type="button"
                onClick={openCreatePage}
                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-erp-primary px-3.5 text-xs font-semibold text-white transition hover:bg-erp-primary-hover focus:outline-none focus:ring-2 focus:ring-erp-primary/30 focus:ring-offset-1"
              >
                <Plus size={15} />
                <span>Create Category</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Categories list */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Search and filters */}
        <div className="flex flex-col gap-3 border-b border-slate-100 p-3 sm:px-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-1 lg:flex-wrap lg:justify-between">
            <div className="flex min-w-0 gap-3 sm:gap-5">
              <div className="relative min-w-0 flex-1 lg:w-100 lg:flex-none">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

                <input
                  type="search"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value)
                    setCurrentPage(1)
                  }}
                  placeholder="Search categories..."
                  aria-label="Search categories"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none transition placeholder:text-slate-400 focus:border-erp-primary focus:bg-white focus:ring-2 focus:ring-erp-primary/10 sm:text-sm"
                />
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  title="Clear filters"
                  aria-label="Clear filters"
                  className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 sm:text-sm"
                >
                  <FilterX size={14} />
                </button>
              )}
            </div>

            <div className="flex gap-3 sm:gap-5">
              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value)
                  setCurrentPage(1)
                }}
                aria-label="Filter categories by status"
                className="h-9 min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10 sm:text-sm"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table and loading */}
        <div className="relative min-h-[220px]">
          {initialLoading ? (
            <div className="flex min-h-[280px] items-center justify-center">
              <Loading fullScreen={false} label="Loading categories" description="Fetching category records..." className="!h-full min-h-[220px]" />
            </div>
          ) : categories.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center px-4 py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                <PackageOpen size={24} />
              </div>

              <h3 className="mt-3 text-sm font-bold text-slate-800">{hasActiveFilters ? 'No matching categories' : 'No categories available'}</h3>

              <p className="mt-1 max-w-xs text-xs text-slate-500">{hasActiveFilters ? 'Try another search or change your filter.' : 'Create a category to start organizing your products.'}</p>

              {hasActiveFilters ? (
                <button type="button" onClick={resetFilters} className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                  <Filter size={14} />
                  Clear filters
                </button>
              ) : (
                canCreate && (
                  <button type="button" onClick={openCreatePage} className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg bg-erp-primary px-3 text-xs font-semibold text-white hover:bg-erp-primary-hover">
                    <Plus size={15} />
                    Create Category
                  </button>
                )
              )}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[850px] text-left">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-100">
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Category</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Code</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Description</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</th>
                      {canShowActions && <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Actions</th>}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {categories.map((category) => {
                      const isInactive = category.status === 'Inactive'
                      const categoryId = String(category._id || '')

                      return (
                        <tr key={getCategoryKey(category)} className="transition hover:bg-slate-50/70">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                                <FolderTree size={17} />
                              </div>
                              <div className="min-w-0">
                                <p className="max-w-52 truncate text-xs font-semibold text-slate-800 sm:text-sm">{category.name || 'Unnamed category'}</p>
                                <p className="mt-0.5 text-[10px] text-slate-400">{category.createdAt ? `Created ${new Date(category.createdAt).toLocaleDateString()}` : 'Category'}</p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <span className="inline-flex max-w-36 truncate rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600">{category.code || '—'}</span>
                          </td>

                          <td className="max-w-[260px] px-4 py-3">
                            <p className="line-clamp-2 text-xs leading-5 text-slate-500">{category.description || 'No description provided.'}</p>
                          </td>

                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-1 text-[11px] font-semibold ${isInactive ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${isInactive ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                              {isInactive ? 'Inactive' : 'Active'}
                            </span>
                          </td>

                          {canShowActions && (
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1.5">
                                {canView && (
                                  <button
                                    type="button"
                                    onClick={() => openDetailsPage(category)}
                                    title="View category"
                                    aria-label={`View ${category.name}`}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-erp-primary/30 hover:bg-erp-primary/5 hover:text-erp-primary"
                                  >
                                    <Eye size={15} />
                                  </button>
                                )}

                                {canUpdate && (
                                  <button
                                    type="button"
                                    onClick={() => openEditPage(category)}
                                    title="Edit category"
                                    aria-label={`Edit ${category.name}`}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-erp-primary/30 hover:bg-erp-primary/5 hover:text-erp-primary"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                )}

                                {canUpdateStatus && (
                                  <button
                                    type="button"
                                    onClick={() => setStatusTarget(category)}
                                    disabled={Boolean(updatingStatusId)}
                                    title={isInactive ? 'Activate category' : 'Deactivate category'}
                                    aria-label={`${isInactive ? 'Activate' : 'Deactivate'} ${category.name}`}
                                    className={`flex h-8 w-8 items-center justify-center rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                      isInactive ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100'
                                    }`}
                                  >
                                    {updatingStatusId === categoryId ? <LoaderCircle size={15} className="animate-spin" /> : <Power size={15} />}
                                  </button>
                                )}

                                {canDelete && (
                                  <button
                                    type="button"
                                    onClick={() => setDeletingCategory(category)}
                                    disabled={Boolean(deletingId)}
                                    title="Delete category"
                                    aria-label={`Delete ${category.name}`}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 transition hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
                                  >
                                    {deletingId === categoryId ? <LoaderCircle size={15} className="animate-spin" /> : <Trash2 size={15} />}
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="divide-y divide-slate-100 md:hidden">
                {categories.map((category) => {
                  const isInactive = category.status === 'Inactive'
                  const categoryId = String(category._id || '')

                  return (
                    <div key={getCategoryKey(category)} className="space-y-3 p-3">
                      <div className="flex items-start gap-2.5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                          <FolderTree size={18} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-semibold text-slate-900">{category.name || 'Unnamed category'}</p>
                          <p className="mt-1 break-words text-xs text-slate-500">Code: {category.code || '—'}</p>
                          <p className="mt-1 break-words text-xs leading-5 text-slate-500">{category.description || 'No description provided.'}</p>
                        </div>

                        <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-semibold ${isInactive ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${isInactive ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                          {isInactive ? 'Inactive' : 'Active'}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-2.5">
                        {canView && (
                          <button
                            type="button"
                            onClick={() => openDetailsPage(category)}
                            className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <Eye size={14} />
                            View
                          </button>
                        )}

                        {canUpdate && (
                          <button type="button" onClick={() => openEditPage(category)} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-erp-primary/10 text-xs font-semibold text-erp-primary hover:bg-erp-primary/15">
                            <Pencil size={14} />
                            Edit
                          </button>
                        )}

                        {canUpdateStatus && (
                          <button
                            type="button"
                            onClick={() => setStatusTarget(category)}
                            disabled={Boolean(updatingStatusId)}
                            className={`inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border text-xs font-semibold disabled:opacity-50 ${
                              isInactive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-orange-200 bg-orange-50 text-orange-600'
                            }`}
                          >
                            <Power size={14} />
                            {isInactive ? 'Activate' : 'Deactivate'}
                          </button>
                        )}

                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => setDeletingCategory(category)}
                            disabled={Boolean(deletingId)}
                            className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-600 hover:bg-rose-100 disabled:opacity-50"
                          >
                            {deletingId === categoryId ? <LoaderCircle size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* Loading overlay */}
          {!initialLoading && isFetching && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 backdrop-blur-[2px]">
              <Loading fullScreen={false} label="Updating categories" description="Refreshing category records..." className="!h-full min-h-[220px]" />
            </div>
          )}

          {/* Fetch error with retry */}
          {!initialLoading && error && categories.length === 0 && (
            <div className="border-t border-rose-100 bg-rose-50 px-4 py-3 text-center">
              <p className="text-xs text-rose-700">{error}</p>
              <button type="button" onClick={handleRefresh} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100">
                <RefreshCw size={13} />
                Try again
              </button>
            </div>
          )}
        </div>

        {/* Pagination */}
        {!initialLoading && (
          <div className="flex flex-col gap-3 border-t border-slate-100 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs text-slate-500 sm:text-sm">
                Showing{' '}
                <span className="font-semibold text-slate-700">
                  {startItem}–{endItem}
                </span>{' '}
                of <span className="font-semibold text-slate-700">{totalFilteredCategories}</span> categories
              </p>

              <div className="flex items-center gap-2">
                <label htmlFor="category-page-size" className="whitespace-nowrap text-xs text-slate-500">
                  Rows:
                </label>

                <select
                  id="category-page-size"
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value))
                    setCurrentPage(1)
                  }}
                  disabled={isFetching}
                  className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage <= 1 || isFetching}
                onClick={() => setCurrentPage(1)}
                aria-label="First page"
                className="flex h-8 items-center justify-center rounded-lg border border-slate-200 px-2 text-xs text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                1
              </button>

              <button
                type="button"
                disabled={safePage <= 1 || isFetching}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                aria-label="Previous page"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>

              <span className="min-w-20 px-1 text-center text-xs text-slate-600 sm:text-sm">
                Page {safePage} of {totalPages}
              </span>

              <button
                type="button"
                disabled={safePage >= totalPages || isFetching}
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                aria-label="Next page"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>

              <button
                type="button"
                disabled={safePage >= totalPages || isFetching}
                onClick={() => setCurrentPage(totalPages)}
                aria-label="Last page"
                className="flex h-8 items-center justify-center rounded-lg border border-slate-200 px-2 text-xs text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {totalPages}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Delete confirmation */}
      <TrashBox
        isOpen={Boolean(deletingCategory)}
        onClose={() => {
          if (!deletingId) setDeletingCategory(null)
        }}
        title="Delete Category"
        message={`Are you sure you want to delete "${deletingCategory?.name || 'this category'}"? Categories assigned to products cannot be deleted. Reassign those products first.`}
        actionButtonText="Delete Category"
        cancelButtonText="Cancel"
        onAction={handleDeleteCategory}
        isProcessing={Boolean(deletingId)}
      />

      {/* Activate / Deactivate confirmation */}
      <TrashBox
        isOpen={Boolean(statusTarget)}
        onClose={() => {
          if (!updatingStatusId) setStatusTarget(null)
        }}
        title={statusTarget?.status === 'Inactive' ? 'Activate Category' : 'Deactivate Category'}
        message={statusTarget?.status === 'Inactive' ? `Are you sure you want to activate "${statusTarget?.name}"?` : `Are you sure you want to deactivate "${statusTarget?.name}"?`}
        actionButtonText={statusTarget?.status === 'Inactive' ? 'Activate Category' : 'Deactivate Category'}
        cancelButtonText="Cancel"
        onAction={handleToggleStatus}
        isProcessing={Boolean(updatingStatusId)}
        variant={statusTarget?.status === 'Inactive' ? 'activate' : 'deactivate'}
      />
    </div>
  )
}
