import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Plus, ShieldCheck, RefreshCw, Search, Pencil, Trash2, Users, Eye, PackageOpen, ChevronLeft, ChevronRight, Filter, FilterX, LockKeyhole, LoaderCircle, Power, ShieldAlert } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import TrashBox from '../../TrashBox/TrashBox'
import Loading from '../Loading/Loading'
import { hasPermission, useAuth } from '../../context/AuthContext'

function getRolePermissions(role) {
  if (Array.isArray(role?.permissions)) return role.permissions

  return Object.values(role?.permissions || {}).flatMap((items) => (Array.isArray(items) ? items : []))
}

function getRoleKey(role) {
  return role?._id ? String(role._id) : `${role?.type || ''}-${role?.name || ''}`
}

function humanize(value) {
  return String(value || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export default function CompanyRoles() {
  const navigate = useNavigate()
  const location = useLocation()
  const { permissions } = useAuth()

  const canList = hasPermission(permissions, 'role:list')
  const canView = hasPermission(permissions, 'role:view')
  const canCreate = hasPermission(permissions, 'role:create')

  const canUpdate = hasPermission(permissions, 'role:update')
  const canChangeStatus = hasPermission(permissions, 'role:update-status')
  const canDelete = hasPermission(permissions, 'role:delete')

  // Edit permissions ne role:update thi control karo.
  const canEdit = canUpdate

  const canShowActions = canView || canEdit || canDelete || canChangeStatus

  const [roles, setRoles] = useState([])
  const [availablePermissions, setAvailablePermissions] = useState([])

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [pageSize, setPageSize] = useState(5)
  const [currentPage, setCurrentPage] = useState(1)

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 5,
    totalRoles: 0,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  })

  const [stats, setStats] = useState({
    totalRoles: 0,
    predefinedRoles: 0,
    customRoles: 0,
  })
  const [loading, setLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const hasLoadedRef = useRef(false)

  const [deletingRole, setDeletingRole] = useState(null)
  const [deletingId, setDeletingId] = useState('')
  const [toast, setToast] = useState(null)
  const [error, setError] = useState('')

  const [togglingRole, setTogglingRole] = useState('')
  const [roleStatusTarget, setRoleStatusTarget] = useState(null)

  const items = [{ title: 'Roles & Permissions', link: null }]
  const hasActiveFilters = Boolean(search.trim()) || typeFilter !== 'All'

  const showToast = (type, message, duration = 3000) => {
    setToast({
      id: Date.now(),
      type,
      message,
      duration,
    })
  }

  const closeToast = () => {
    setToast(null)
  }

  useEffect(() => {
    document.title = 'Roles & Permissions | MineERP'
  }, [])

  useEffect(() => {
    let cancelled = false

    async function fetchRoles() {
      if (!canList) {
        setRoles([])
        setLoading(false)
        setRefreshing(false)
        setHasLoaded(true)
        hasLoadedRef.current = true
        return
      }

      if (!hasLoadedRef.current) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }

      setError('')

      try {
        const { data } = await axiosInstance.get('/erp/roles', {
          params: {
            search: search.trim(),
            type: typeFilter,
            page: currentPage,
            limit: pageSize,
          },
        })

        if (data.success === false) {
          throw new Error(data.message || 'Unable to load roles.')
        }

        if (cancelled) return

        setRoles(Array.isArray(data.roles) ? data.roles : [])
        setAvailablePermissions(Array.isArray(data.availablePermissions) ? data.availablePermissions : [])

        if (data.stats) {
          setStats({
            totalRoles: Number(data.stats.totalRoles) || 0,
            predefinedRoles: Number(data.stats.predefinedRoles) || 0,
            customRoles: Number(data.stats.customRoles) || 0,
          })
        }

        if (data.pagination) {
          setPagination(data.pagination)

          if (Number.isInteger(data.pagination.page) && data.pagination.page !== currentPage) {
            setCurrentPage(data.pagination.page)
          }
        } else {
          setPagination({
            page: currentPage,
            limit: pageSize,
            totalRoles: Array.isArray(data.roles) ? data.roles.length : 0,
            totalPages: data.roles?.length ? 1 : 0,
            hasPreviousPage: currentPage > 1,
            hasNextPage: false,
          })
        }
      } catch (err) {
        if (!cancelled) {
          const message = err.response?.data?.message || err.message || 'Unable to load roles. Please try again.'

          setError(message)
          showToast('error', message)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
          setRefreshing(false)
          setHasLoaded(true)
          hasLoadedRef.current = true
        }
      }
    }

    fetchRoles()

    return () => {
      cancelled = true
    }
  }, [canList, search, typeFilter, currentPage, pageSize, refreshKey])

  useEffect(() => {
    if (!location.state?.successMessage) return

    showToast('success', location.state.successMessage)

    navigate(location.pathname, {
      replace: true,
      state: null,
    })
  }, [location.state, location.pathname, navigate])

  const handleRefresh = () => {
    if (loading || refreshing || !canList) return

    setLoading(true)
    setHasLoaded(false)
    hasLoadedRef.current = false
    setRefreshing(false)

    setRefreshKey((key) => key + 1)
  }

  const openCreatePage = () => {
    if (!canCreate) return

    navigate('/company/roles/new', {
      state: { availablePermissions },
    })
  }

  const openDetailsPage = (role) => {
    if (!canView || !role) return

    const identifier = role._id || role.name

    navigate(`/company/roles/${encodeURIComponent(identifier)}`, {
      state: { role, availablePermissions },
    })
  }

  const openEditPage = (role) => {
    if (!canEdit || !role) return

    const identifier = role._id || role.name

    navigate(`/company/roles/${encodeURIComponent(identifier)}/edit`, {
      state: {
        role,
        availablePermissions,
        isPredefined: role.type === 'Predefined',
      },
    })
  }

  const handleToggleRoleStatus = async () => {
    if (!roleStatusTarget || togglingRole || !canChangeStatus) return

    const role = roleStatusTarget
    const nextIsActive = role.isActive === false

    setTogglingRole(role.name)

    try {
      let data

      if (role.type === 'Custom') {
        const response = await axiosInstance.patch(`/erp/roles/${encodeURIComponent(role._id)}`, { isActive: nextIsActive })
        data = response.data
      } else {
        const response = await axiosInstance.patch(`/erp/roles/predefined/${encodeURIComponent(role.name)}`, { isActive: nextIsActive })
        data = response.data
      }

      if (data.success === false) {
        throw new Error(data.message || 'Unable to update role status.')
      }

      showToast('success', data.message || `Role ${nextIsActive ? 'activated' : 'deactivated'} successfully.`)

      setRoleStatusTarget(null)
      setRefreshKey((key) => key + 1)
    } catch (err) {
      showToast('error', err.response?.data?.message || err.message || 'Unable to update role status.')
    } finally {
      setTogglingRole('')
    }
  }

  const handleDeleteRole = async () => {
    if (!deletingRole?._id || deletingId || !canDelete) return

    if (deletingRole.type !== 'Custom') {
      showToast('error', 'Only custom roles can be deleted.')
      return
    }

    const roleId = String(deletingRole._id)

    setDeletingId(roleId)

    try {
      const { data } = await axiosInstance.delete(`/erp/roles/${roleId}`)

      if (data.success === false) {
        throw new Error(data.message || 'Unable to delete role.')
      }

      setDeletingRole(null)
      showToast('success', data.message || 'Custom role deleted successfully.')

      if (roles.length === 1 && currentPage > 1) {
        setCurrentPage((page) => page - 1)
      } else {
        setRefreshKey((key) => key + 1)
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || err.message || 'Unable to delete role. Please try again.')
    } finally {
      setDeletingId('')
    }
  }

  const totalPages = Math.max(1, Number(pagination.totalPages) || 0)
  const safePage = Math.min(currentPage, totalPages)
  const totalFilteredRoles = Number(pagination.totalRoles) || 0
  const startItem = totalFilteredRoles === 0 ? 0 : (safePage - 1) * pageSize + 1
  const endItem = Math.min(safePage * pageSize, totalFilteredRoles)

  const resetFilters = () => {
    setSearch('')
    setTypeFilter('All')
    setCurrentPage(1)
  }

  if (loading && !hasLoaded) {
    return (
      <div className="min-w-0 space-y-4 text-sm">
        <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="h-1 bg-erp-primary" />
          <div className="flex min-h-16 items-center px-4 sm:px-5">
            <BreadCrumb items={items} />
          </div>
        </section>

        <section className="relative min-h-[480px] overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex min-h-[480px] items-center justify-center">
            <Loading fullScreen={false} label="Loading roles" description="Please wait while we load role records." className="!h-full min-h-[480px]" />
          </div>
        </section>
      </div>
    )
  }

  if (!canList) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <ShieldAlert size={28} />
        </div>
        <h2 className="mt-4 text-lg font-bold text-slate-800">Access Denied</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">You do not have permission to view Roles & Permissions.</p>
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
              <span className="text-sm font-bold text-slate-900">{stats.totalRoles}</span>
            </div>

            <div className="hidden h-9 items-center gap-2 whitespace-nowrap rounded-lg border border-violet-200 px-3 sm:flex">
              <span className="text-xs text-violet-700">Predefined</span>
              <span className="text-sm font-bold text-slate-900">{stats.predefinedRoles}</span>
            </div>

            <div className="flex h-9 items-center gap-2 whitespace-nowrap rounded-lg border border-emerald-200 px-3">
              <span className="text-xs text-emerald-700">Custom</span>
              <span className="text-sm font-bold text-slate-900">{stats.customRoles}</span>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading || refreshing}
              title="Refresh roles"
              aria-label="Refresh roles"
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-erp-border bg-erp-surface px-3 text-xs font-semibold text-slate-600 transition hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>

            {canCreate && (
              <button
                type="button"
                onClick={openCreatePage}
                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-erp-primary px-3.5 text-xs font-semibold text-white transition hover:bg-erp-primary-hover focus:outline-none focus:ring-2 focus:ring-erp-primary/30 focus:ring-offset-1"
              >
                <Plus size={15} />
                <span>Create Role</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Roles list */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
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
                  placeholder="Search roles..."
                  aria-label="Search roles"
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
                value={typeFilter}
                onChange={(event) => {
                  setTypeFilter(event.target.value)
                  setCurrentPage(1)
                }}
                aria-label="Filter roles by type"
                className="h-9 min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10 sm:text-sm"
              >
                <option value="All">All Role Types</option>
                <option value="Predefined">Predefined</option>
                <option value="Custom">Custom</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table and loading overlay */}
        <div className="relative min-h-[220px]">
          {refreshing && hasLoaded && (
            <div className="flex items-center justify-center gap-2 border-b border-slate-100 px-4 py-3 text-xs text-slate-500">
              <LoaderCircle size={15} className="animate-spin text-erp-primary" />
              Updating roles...
            </div>
          )}
          {roles.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center px-4 py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                <PackageOpen size={24} />
              </div>

              <h3 className="mt-3 text-sm font-bold text-slate-800">{hasActiveFilters ? 'No matching roles' : 'No roles available'}</h3>

              <p className="mt-1 max-w-xs text-xs text-slate-500">{hasActiveFilters ? 'Try another search or change your filter.' : 'Create a custom role to start managing permissions.'}</p>

              {hasActiveFilters ? (
                <button type="button" onClick={resetFilters} className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                  <Filter size={14} />
                  Clear filters
                </button>
              ) : (
                canCreate && (
                  <button type="button" onClick={openCreatePage} className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg bg-erp-primary px-3 text-xs font-semibold text-white hover:bg-erp-primary-hover">
                    <Plus size={15} />
                    Create Custom Role
                  </button>
                )
              )}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[900px] text-left">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-100">
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Role</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Type</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Description</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Permissions</th>
                      {canShowActions && <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Actions</th>}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {roles.map((role) => {
                      const rolePermissions = getRolePermissions(role)
                      const isPredefined = role.type === 'Predefined'
                      const isCustom = role.type === 'Custom'
                      const isInactive = role.isActive === false

                      const canToggleThisRole = canChangeStatus
                      const canDeleteThisRole = isCustom && canDelete

                      return (
                        <tr key={getRoleKey(role)} className="transition hover:bg-slate-50/70">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isPredefined ? 'bg-violet-50 text-violet-700' : 'bg-emerald-50 text-emerald-700'}`}>
                                {isPredefined ? <LockKeyhole size={17} /> : <Users size={17} />}
                              </div>

                              <div className="min-w-0">
                                <p className="max-w-48 truncate text-xs font-semibold text-slate-800 sm:text-sm">{role.name || 'Unnamed role'}</p>

                                <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${isInactive ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{isInactive ? 'Inactive' : 'Active'}</span>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-1 text-[11px] font-semibold ${isPredefined ? 'bg-violet-50 text-violet-700' : 'bg-emerald-50 text-emerald-700'}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${isPredefined ? 'bg-violet-500' : 'bg-emerald-500'}`} />
                              {humanize(role.type || 'Custom')}
                            </span>
                          </td>

                          <td className="max-w-[260px] px-4 py-3">
                            <p className="line-clamp-2 text-xs leading-5 text-slate-500">{role.description || 'No description provided.'}</p>
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 text-xs text-slate-700">
                              <ShieldCheck size={14} className="shrink-0 text-slate-400" />
                              <span className="font-semibold tabular-nums">{rolePermissions.length}</span>
                              <span className="text-slate-500">permissions</span>
                            </div>
                          </td>

                          {canShowActions && (
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1.5">
                                {canView && (
                                  <button
                                    type="button"
                                    onClick={() => openDetailsPage(role)}
                                    title="View role"
                                    aria-label={`View ${role.name}`}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-erp-primary/30 hover:bg-erp-primary/5 hover:text-erp-primary"
                                  >
                                    <Eye size={15} />
                                  </button>
                                )}

                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => openEditPage(role)}
                                    title="Edit role permissions"
                                    aria-label={`Edit ${role.name}`}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-erp-primary/30 hover:bg-erp-primary/5 hover:text-erp-primary"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                )}

                                {canToggleThisRole && (
                                  <button
                                    type="button"
                                    onClick={() => setRoleStatusTarget(role)}
                                    disabled={Boolean(togglingRole)}
                                    title={isInactive ? 'Activate role' : 'Deactivate role'}
                                    aria-label={`${isInactive ? 'Activate' : 'Deactivate'} ${role.name}`}
                                    className={`flex h-8 w-8 items-center justify-center rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                      isInactive ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100'
                                    }`}
                                  >
                                    {togglingRole === role.name ? <LoaderCircle size={15} className="animate-spin" /> : <Power size={15} />}
                                  </button>
                                )}

                                {canDeleteThisRole && (
                                  <button
                                    type="button"
                                    onClick={() => setDeletingRole(role)}
                                    disabled={Boolean(deletingId)}
                                    title="Delete custom role"
                                    aria-label={`Delete ${role.name}`}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 transition hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
                                  >
                                    {deletingId === String(role._id) ? <LoaderCircle size={15} className="animate-spin" /> : <Trash2 size={15} />}
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
                {roles.map((role) => {
                  const rolePermissions = getRolePermissions(role)
                  const isPredefined = role.type === 'Predefined'
                  const isCustom = role.type === 'Custom'
                  const isInactive = role.isActive === false

                  return (
                    <div key={getRoleKey(role)} className="space-y-3 p-3">
                      <div className="flex items-start gap-2.5">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${isPredefined ? 'bg-violet-50 text-violet-700' : 'bg-emerald-50 text-emerald-700'}`}>
                          {isPredefined ? <LockKeyhole size={18} /> : <Users size={18} />}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-semibold text-slate-900">{role.name || 'Unnamed role'}</p>

                          <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${isInactive ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{isInactive ? 'Inactive' : 'Active'}</span>

                          <p className="mt-0.5 break-words text-xs text-slate-500">{role.description || 'No description provided.'}</p>
                        </div>

                        <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-1 text-[11px] font-semibold ${isPredefined ? 'bg-violet-50 text-violet-700' : 'bg-emerald-50 text-emerald-700'}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${isPredefined ? 'bg-violet-500' : 'bg-emerald-500'}`} />
                          {humanize(role.type || 'Custom')}
                        </span>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                        <span className="flex items-center gap-1.5 text-xs text-slate-500">
                          <ShieldCheck size={13} />
                          Permissions
                        </span>
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">{rolePermissions.length}</span>
                      </div>

                      {canShowActions && (
                        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-2.5">
                          {canView && (
                            <button type="button" onClick={() => openDetailsPage(role)} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                              <Eye size={14} />
                              View
                            </button>
                          )}

                          {canEdit && (
                            <button type="button" onClick={() => openEditPage(role)} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-erp-primary/10 text-xs font-semibold text-erp-primary hover:bg-erp-primary/15">
                              <Pencil size={14} />
                              Edit
                            </button>
                          )}

                          {canChangeStatus && (
                            <button
                              type="button"
                              onClick={() => setRoleStatusTarget(role)}
                              disabled={Boolean(togglingRole)}
                              className={`inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${
                                isInactive ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100'
                              }`}
                            >
                              {togglingRole === role.name ? <LoaderCircle size={14} className="animate-spin" /> : <Power size={14} />}
                              {isInactive ? 'Activate' : 'Deactivate'}
                            </button>
                          )}

                          {isCustom && canDelete && (
                            <button
                              type="button"
                              onClick={() => setDeletingRole(role)}
                              disabled={Boolean(deletingId)}
                              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {deletingId === String(role._id) ? <LoaderCircle size={14} className="animate-spin" /> : <Trash2 size={14} />}
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* Server-side pagination */}
        {hasLoaded && (
          <div className="flex flex-col gap-3 border-t border-slate-100 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs text-slate-500 sm:text-sm">
                Showing{' '}
                <span className="font-semibold text-slate-700">
                  {startItem}–{endItem}
                </span>{' '}
                of <span className="font-semibold text-slate-700">{totalFilteredRoles}</span> roles
              </p>

              <div className="flex items-center gap-2">
                <label htmlFor="role-page-size" className="whitespace-nowrap text-xs text-slate-500">
                  Rows:
                </label>

                <select
                  id="role-page-size"
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value))
                    setCurrentPage(1)
                  }}
                  disabled={loading || refreshing}
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
                disabled={safePage <= 1 || loading || refreshing}
                onClick={() => setCurrentPage(1)}
                aria-label="First page"
                className="flex h-8 items-center justify-center rounded-lg border border-slate-200 px-2 text-xs text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                1
              </button>

              <button
                type="button"
                disabled={safePage <= 1 || loading || refreshing}
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
                disabled={safePage >= totalPages || loading || refreshing}
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                aria-label="Next page"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>

              <button
                type="button"
                disabled={safePage >= totalPages || loading || refreshing}
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
        isOpen={Boolean(deletingRole)}
        onClose={() => {
          if (!deletingId) setDeletingRole(null)
        }}
        title="Delete Custom Role"
        message={`Are you sure you want to delete "${deletingRole?.name || 'this custom role'}"? This role may be assigned to employees, and deleting it may affect their access.`}
        actionButtonText="Delete Role"
        cancelButtonText="Cancel"
        onAction={handleDeleteRole}
        isProcessing={Boolean(deletingId)}
      />

      {/* Activate / Deactivate Confirmation */}
      <TrashBox
        isOpen={Boolean(roleStatusTarget)}
        onClose={() => {
          if (!togglingRole) setRoleStatusTarget(null)
        }}
        title={roleStatusTarget?.isActive === false ? 'Activate Role' : 'Deactivate Role'}
        message={
          roleStatusTarget?.isActive === false
            ? `Are you sure you want to activate "${roleStatusTarget?.name}"? Its configured permissions will become effective again.`
            : `Are you sure you want to deactivate "${roleStatusTarget?.name}"? Its permissions should no longer be effective.`
        }
        actionButtonText={roleStatusTarget?.isActive === false ? 'Activate Role' : 'Deactivate Role'}
        cancelButtonText="Cancel"
        onAction={handleToggleRoleStatus}
        isProcessing={Boolean(togglingRole)}
        variant={roleStatusTarget?.isActive === false ? 'activate' : 'deactivate'}
      />
    </div>
  )
}
