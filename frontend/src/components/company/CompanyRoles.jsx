import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Plus,
  ShieldCheck,
  RefreshCw,
  Search,
  Pencil,
  Trash2,
  AlertTriangle,
  X,
  Users,
  Eye,
  PackageOpen,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import TrashBox from '../../TrashBox/TrashBox'

function getRolePermissions(role) {
  if (Array.isArray(role?.permissions)) return role.permissions

  return Object.values(role?.permissions || {}).flatMap((items) =>
    Array.isArray(items) ? items : [],
  )
}

function getRoleKey(role) {
  return role?._id
    ? String(role._id)
    : `${role?.type || ''}-${role?.name || ''}`
}

function humanize(value) {
  return String(value || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function CompanyRolesShimmer() {
  return (
    <div className="min-w-0 space-y-4">
      {/* Header shimmer */}
      <div className="flex h-10 items-center justify-between gap-3">
        <div className="h-5 w-44 animate-pulse rounded-md bg-slate-200" />

        <div className="flex gap-2">
          <div className="h-9 w-9 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-9 w-24 animate-pulse rounded-lg bg-slate-200" />
        </div>
      </div>

      {/* Statistics shimmer */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="flex h-[88px] items-center justify-between rounded-xl border border-slate-200 bg-white p-4 sm:h-24"
          >
            <div className="space-y-2">
              <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
              <div className="h-6 w-12 animate-pulse rounded bg-slate-200" />
            </div>

            <div className="h-10 w-10 animate-pulse rounded-lg bg-slate-100" />
          </div>
        ))}
      </div>

      {/* Roles directory shimmer */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-3 sm:px-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
          <div className="h-9 w-full animate-pulse rounded-lg bg-slate-100 sm:max-w-xs" />
        </div>

        <div className="divide-y divide-slate-100">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="flex items-center gap-3 px-4 py-4">
              <div className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-slate-100" />

              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-3 w-32 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-48 max-w-full animate-pulse rounded bg-slate-100" />
              </div>

              <div className="hidden h-6 w-20 animate-pulse rounded-full bg-slate-100 sm:block" />
              <div className="hidden h-8 w-24 animate-pulse rounded-lg bg-slate-100 md:block" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function CompanyRoles() {
  const navigate = useNavigate()
  const location = useLocation()

  const [roles, setRoles] = useState([])
  const [availablePermissions, setAvailablePermissions] = useState([])
  const [search, setSearch] = useState('')

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [deletingRole, setDeletingRole] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const [toast, setToast] = useState(null)
  const [error, setError] = useState('')
  const [pageSize, setPageSize] = useState(5)
  const [currentPage, setCurrentPage] = useState(1)

  const items = [{ title: 'Roles & Permissions', link: null }]

  function showToast(type, message, duration = 3000) {
    setToast({
      id: Date.now(),
      type,
      message,
      duration,
    })
  }

  function closeToast() {
    setToast(null)
  }

  useEffect(() => {
    document.title = 'Roles & Permissions | MineERP'
  }, [])

  async function fetchRoles(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setError('')

    try {
      const { data } = await axiosInstance.get('/erp/roles')

      if (!data.success) {
        throw new Error(data.message || 'Unable to load roles.')
      }

      setRoles(data.roles || [])
      setAvailablePermissions(data.availablePermissions || [])

      if (isRefresh) {
        setCurrentPage(1)
        showToast('success', 'Roles refreshed successfully.')
      }
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.message ||
        'Unable to load roles.'

      setError(message)

      if (isRefresh) {
        showToast('error', message)
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchRoles()

    if (location.state?.successMessage) {
      showToast('success', location.state.successMessage)

      navigate(location.pathname, {
        replace: true,
        state: null,
      })
    }
  }, [])

  function openCreatePage() {
    navigate('/company/roles/new', {
      state: { availablePermissions },
    })
  }

  function openDetailsPage(role) {
    if (!role) return

    const roleIdentifier = role._id || role.name

    navigate(`/company/roles/${encodeURIComponent(roleIdentifier)}`, {
      state: {
        role,
        availablePermissions,
      },
    })
  }

  function openEditPage(role) {
    if (!role) return

    const roleIdentifier = role._id || role.name

    navigate(`/company/roles/${encodeURIComponent(roleIdentifier)}/edit`, {
      state: {
        role,
        availablePermissions,
        isPredefined: role.type === 'Predefined',
      },
    })
  }

  async function handleDeleteRole() {
    if (!deletingRole || deleting) return

    if (deletingRole.type !== 'Custom') {
      showToast('error', 'Only custom roles can be deleted.')
      return
    }

    if (!deletingRole._id) {
      showToast('error', 'Custom role ID is missing.')
      return
    }

    setDeleting(true)

    try {
      const deletedId = String(deletingRole._id)

      const { data } = await axiosInstance.delete(
        `/erp/roles/${deletedId}`,
      )

      if (!data.success) {
        throw new Error(data.message || 'Unable to delete role.')
      }

      setRoles((current) =>
        current.filter((role) => String(role._id) !== deletedId),
      )

      setDeletingRole(null)

      showToast(
        'success',
        data.message || 'Custom role deleted successfully.',
      )

      // Refresh roles after deletion.
      await fetchRoles()
    } catch (err) {
      showToast(
        'error',
        err.response?.data?.message ||
          err.message ||
          'Unable to delete role.',
      )
    } finally {
      setDeleting(false)
    }
  }

  const normalizedSearch = search.trim().toLowerCase()

  const filteredRoles = roles.filter((role) => {
    const searchableText = [
      role.name,
      role.description,
      role.type,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return searchableText.includes(normalizedSearch)
  })

  const predefinedCount = roles.filter(
    (role) => role.type === 'Predefined',
  ).length

  const customCount = roles.filter(
    (role) => role.type === 'Custom',
  ).length

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRoles.length / pageSize),
  )

  const safePage = Math.min(currentPage, totalPages)

  const paginatedRoles = filteredRoles.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  )

  const hasActiveSearch = Boolean(search.trim())

  function resetSearch() {
    setSearch('')
    setCurrentPage(1)
  }

  if (loading || refreshing) {
    return (
      <>
        <Toast toast={toast} onClose={closeToast} />
        <CompanyRolesShimmer />
      </>
    )
  }

  return (
    <div className="min-w-0 space-y-4 text-sm text-slate-800">
      <Toast toast={toast} onClose={closeToast} />

      {/* Header */}
      <div className="flex min-h-10 min-w-0 items-center justify-between gap-2">
        <div className="flex h-10 min-w-0 flex-1 items-center overflow-hidden">
          <BreadCrumb items={items} />
        </div>

        <div className="flex h-10 shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => fetchRoles(true)}
            disabled={refreshing || loading}
            title="Refresh roles"
            aria-label="Refresh roles"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-60 sm:w-auto sm:px-3"
          >
            <RefreshCw
              size={15}
              className={refreshing ? 'animate-spin' : ''}
            />
            <span className="hidden sm:ml-1.5 sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={openCreatePage}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-erp-primary px-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-erp-primary-hover sm:px-3.5 sm:text-sm"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Create Custom Role</span>
            <span className="sm:hidden">Create</span>
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 sm:text-sm"
        >
          <div className="flex min-w-0 items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <p className="break-words">{error}</p>
          </div>

          <button
            type="button"
            onClick={() => setError('')}
            aria-label="Dismiss error"
            className="shrink-0 rounded-md p-1 hover:bg-red-100"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex h-[88px] min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm sm:h-24 sm:p-4">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-slate-500 sm:text-sm">
              Total Roles
            </p>
            <p className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              {roles.length}
            </p>
          </div>

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
            <ShieldCheck size={19} />
          </div>
        </div>

        <div className="flex h-[88px] min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm sm:h-24 sm:p-4">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-slate-500 sm:text-sm">
              Predefined Roles
            </p>
            <p className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              {predefinedCount}
            </p>
          </div>

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <ShieldCheck size={19} />
          </div>
        </div>

        <div className="flex h-[88px] min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm sm:h-24 sm:p-4">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-slate-500 sm:text-sm">
              Custom Roles
            </p>
            <p className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              {customCount}
            </p>
          </div>

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <Users size={19} />
          </div>
        </div>
      </div>

      {/* Roles Directory */}
      <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Search and filter - same pattern as CompanyEmployees */}
        <div className="flex flex-col gap-3 border-b border-slate-100 p-3 sm:px-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-800">
              Roles Directory
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Search and filter roles
            </p>
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:justify-end">
            {/* Search */}
            <div className="relative min-w-0 lg:w-80">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

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

            {/* Clear filter */}
            {hasActiveSearch && (
              <button
                type="button"
                onClick={resetSearch}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 sm:text-sm"
              >
                <X size={14} />
                Clear filter
              </button>
            )}
          </div>
        </div>

        {/* Empty state */}
        {filteredRoles.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center px-4 py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
              <PackageOpen size={24} />
            </div>

            <h3 className="mt-3 text-sm font-bold text-slate-800">
              {hasActiveSearch ? 'No matching roles' : 'No roles available'}
            </h3>

            <p className="mt-1 max-w-xs text-xs text-slate-500">
              {hasActiveSearch
                ? 'Try another search term.'
                : 'Create a custom role to define company access.'}
            </p>

            {hasActiveSearch ? (
              <button
                type="button"
                onClick={resetSearch}
                className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <X size={14} />
                Clear filter
              </button>
            ) : (
              <button
                type="button"
                onClick={openCreatePage}
                className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg bg-erp-primary px-3 text-xs font-semibold text-white transition hover:bg-erp-primary-hover"
              >
                <Plus size={15} />
                Create Custom Role
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-100">
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Role
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Type
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Description
                    </th>
                    <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Permissions
                    </th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {paginatedRoles.map((role) => {
                    const permissions = getRolePermissions(role)
                    const isPredefined = role.type === 'Predefined'

                    return (
                      <tr
                        key={getRoleKey(role)}
                        className="transition hover:bg-slate-50/70"
                      >
                        <td className="px-4 py-3">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <div
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                                isPredefined
                                  ? 'bg-violet-50 text-violet-700'
                                  : 'bg-emerald-50 text-emerald-700'
                              }`}
                            >
                              {isPredefined ? (
                                <ShieldCheck size={17} />
                              ) : (
                                <Users size={17} />
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className="max-w-48 truncate text-xs font-semibold text-slate-800 sm:text-sm">
                                {role.name}
                              </p>
                              <p className="mt-0.5 text-[10px] text-slate-400">
                                {isPredefined ? 'System role' : 'Company role'}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-semibold ${
                              isPredefined
                                ? 'bg-violet-50 text-violet-700'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {humanize(role.type || 'Custom')}
                          </span>
                        </td>

                        <td className="max-w-[260px] px-4 py-3">
                          <p className="line-clamp-2 text-xs leading-5 text-slate-500">
                            {role.description || 'No description provided.'}
                          </p>
                        </td>

                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex min-w-10 items-center justify-center rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-bold tabular-nums text-slate-700">
                            {permissions.length}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openDetailsPage(role)}
                              title="View role"
                              aria-label={`View ${role.name}`}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-erp-primary/30 hover:bg-erp-primary/5 hover:text-erp-primary"
                            >
                              <Eye size={15} />
                            </button>

                            <button
                              type="button"
                              onClick={() => openEditPage(role)}
                              title="Edit role"
                              aria-label={`Edit ${role.name}`}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-erp-primary/30 hover:bg-erp-primary/5 hover:text-erp-primary"
                            >
                              <Pencil size={14} />
                            </button>

                            <button
                              type="button"
                              disabled={isPredefined || deleting}
                              onClick={() => setDeletingRole(role)}
                              title={
                                isPredefined
                                  ? 'Predefined roles cannot be deleted'
                                  : 'Delete custom role'
                              }
                              aria-label={`Delete ${role.name}`}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="divide-y divide-slate-100 md:hidden">
              {paginatedRoles.map((role) => {
                const permissions = getRolePermissions(role)
                const isPredefined = role.type === 'Predefined'

                return (
                  <div key={getRoleKey(role)} className="space-y-3 p-3">
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                          isPredefined
                            ? 'bg-violet-50 text-violet-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {isPredefined ? (
                          <ShieldCheck size={18} />
                        ) : (
                          <Users size={18} />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm font-semibold text-slate-900">
                          {role.name}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {role.description || 'No description provided.'}
                        </p>
                      </div>

                      <span
                        className={`inline-flex shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${
                          isPredefined
                            ? 'bg-violet-50 text-violet-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {humanize(role.type || 'Custom')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                      <span className="text-xs text-slate-500">
                        Permissions
                      </span>
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
                        {permissions.length}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openDetailsPage(role)}
                        className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <Eye size={14} />
                        View
                      </button>

                      <button
                        type="button"
                        onClick={() => openEditPage(role)}
                        className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-erp-primary/10 text-xs font-semibold text-erp-primary transition hover:bg-erp-primary/15"
                      >
                        <Pencil size={14} />
                        Edit
                      </button>

                      <button
                        type="button"
                        disabled={isPredefined || deleting}
                        onClick={() => setDeletingRole(role)}
                        className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-200 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            <div className="flex flex-col gap-3 border-t border-slate-100 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-xs text-slate-500 sm:text-sm">
                  Showing{' '}
                  <span className="font-semibold text-slate-700">
                    {filteredRoles.length === 0
                      ? 0
                      : (safePage - 1) * pageSize + 1}
                    –{Math.min(safePage * pageSize, filteredRoles.length)}
                  </span>{' '}
                  of{' '}
                  <span className="font-semibold text-slate-700">
                    {filteredRoles.length}
                  </span>{' '}
                  roles
                </p>

                <div className="flex items-center gap-2">
                  <label
                    htmlFor="role-page-size"
                    className="whitespace-nowrap text-xs text-slate-500"
                  >
                    Rows:
                  </label>

                  <select
                    id="role-page-size"
                    value={pageSize}
                    onChange={(event) => {
                      setPageSize(Number(event.target.value))
                      setCurrentPage(1)
                    }}
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
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage(1)}
                  aria-label="First page"
                  className="flex h-8 items-center justify-center rounded-lg border border-slate-200 px-2 text-xs text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  First
                </button>

                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() =>
                    setCurrentPage((page) => Math.max(1, page - 1))
                  }
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
                  disabled={safePage >= totalPages}
                  onClick={() =>
                    setCurrentPage((page) =>
                      Math.min(totalPages, page + 1),
                    )
                  }
                  aria-label="Next page"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight size={16} />
                </button>

                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  aria-label="Last page"
                  className="flex h-8 items-center justify-center rounded-lg border border-slate-200 px-2 text-xs text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Last
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Delete confirmation */}
      <TrashBox
        isOpen={Boolean(deletingRole)}
        onClose={() => {
          if (!deleting) setDeletingRole(null)
        }}
        title="Delete Custom Role"
        message={`Are you sure you want to delete "${deletingRole?.name || 'this custom role'}"? This role may be assigned to employees and deleting it may affect their access.`}
        actionButtonText="Delete Role"
        cancelButtonText="Cancel"
        onAction={handleDeleteRole}
        isProcessing={deleting}
      />
    </div>
  )
}