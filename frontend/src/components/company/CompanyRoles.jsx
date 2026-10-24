import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Plus, ShieldCheck, RefreshCw, Search, Pencil, Trash2, AlertTriangle, X, Users, Eye, PackageOpen } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import TrashBox from '../../TrashBox/TrashBox'

function getRolePermissions(role) {
  if (Array.isArray(role?.permissions)) return role.permissions

  return Object.values(role?.permissions || {}).flatMap((items) => (Array.isArray(items) ? items : []))
}

function getRoleKey(role) {
  return role?._id ? String(role._id) : `${role?.type || ''}-${role?.name || ''}`
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

  const items = [{ title: 'Roles & Permissions', link: null }]

  function showToast(type, message, duration = 3000) {
    setToast({
      id: Date.now(),
      type,
      message,
      duration,
    })
  }

  async function fetchRoles(isRefresh = false) {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    setError('')

    try {
      const { data } = await axiosInstance.get('/erp/roles')

      if (!data.success) {
        throw new Error(data.message || 'Unable to load roles.')
      }

      setRoles(data.roles || [])
      setAvailablePermissions(data.availablePermissions || [])

      if (isRefresh) {
        showToast('success', 'Roles refreshed successfully.')
      }
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Unable to load roles.'

      setError(message)

      if (isRefresh) showToast('error', message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    document.title = 'Roles & Permissions | MineERP'
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

      const { data } = await axiosInstance.delete(`/erp/roles/${deletedId}`)

      if (!data.success) {
        throw new Error(data.message || 'Unable to delete role.')
      }

      setRoles((current) => current.filter((role) => String(role._id) !== deletedId))

      setDeletingRole(null)

      showToast('success', data.message || 'Custom role deleted successfully.')

      await fetchRoles()
    } catch (err) {
      showToast('error', err.response?.data?.message || err.message || 'Unable to delete role.')
    } finally {
      setDeleting(false)
    }
  }

  const normalizedSearch = search.trim().toLowerCase()

  const filteredRoles = roles.filter((role) => `${role.name || ''} ${role.description || ''} ${role.type || ''}`.toLowerCase().includes(normalizedSearch))

  const predefinedCount = roles.filter((role) => role.type === 'Predefined').length

  const customCount = roles.filter((role) => role.type === 'Custom').length

  return (
    <div className="min-w-0 space-y-4 text-sm text-slate-800">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Header */}
      <div className="flex min-h-10 min-w-0 items-center justify-between gap-2">
        <div className="flex h-10 min-w-0 flex-1 items-center overflow-hidden">
          <BreadCrumb items={items} />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => fetchRoles(true)}
            disabled={refreshing || loading}
            title="Refresh roles"
            aria-label="Refresh roles"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 sm:px-3 sm:text-sm"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={openCreatePage}
            className="inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-erp-primary px-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-erp-primary-hover sm:px-3.5 sm:text-sm"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Create Custom Role</span>
            <span className="sm:hidden">Create</span>
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div role="alert" className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 sm:text-sm">
          <div className="flex min-w-0 items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <p className="break-words">{error}</p>
          </div>

          <button type="button" onClick={() => setError('')} aria-label="Dismiss error" className="shrink-0 rounded-md p-1 hover:bg-red-100">
            <X size={15} />
          </button>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex h-[88px] items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm sm:h-24 sm:p-4">
          <div>
            <p className="text-xs font-medium text-slate-500">Total Roles</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{loading ? '—' : roles.length}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
            <ShieldCheck size={19} />
          </div>
        </div>

        <div className="flex h-[88px] items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm sm:h-24 sm:p-4">
          <div>
            <p className="text-xs font-medium text-slate-500">Predefined Roles</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{loading ? '—' : predefinedCount}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <ShieldCheck size={19} />
          </div>
        </div>

        <div className="flex h-[88px] items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm sm:h-24 sm:p-4">
          <div>
            <p className="text-xs font-medium text-slate-500">Custom Roles</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{loading ? '—' : customCount}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <Users size={19} />
          </div>
        </div>
      </div>

      {/* Roles Table */}
      <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Roles List</h2>
            <p className="mt-0.5 text-xs text-slate-500">{loading ? 'Loading roles...' : `${filteredRoles.length} of ${roles.length} roles`}</p>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search roles..."
              aria-label="Search roles"
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none transition placeholder:text-slate-400 focus:border-erp-primary focus:bg-white focus:ring-2 focus:ring-erp-primary/10 sm:text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Role Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-center">Permissions</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [1, 2, 3, 4].map((item) => (
                  <tr key={item}>
                    <td colSpan={5} className="px-4 py-4">
                      <div className="h-8 animate-pulse rounded-md bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : filteredRoles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <PackageOpen size={28} className="mx-auto text-slate-300" />
                    <p className="mt-2 text-sm font-semibold text-slate-700">No roles found</p>
                    <p className="mt-1 text-xs text-slate-500">{normalizedSearch ? 'Try another search term.' : 'Create a custom role to define company access.'}</p>

                    {!normalizedSearch && (
                      <button type="button" onClick={openCreatePage} className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg bg-erp-primary px-3 text-xs font-semibold text-white hover:bg-erp-primary-hover">
                        <Plus size={15} />
                        Create Custom Role
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredRoles.map((role) => {
                  const permissions = getRolePermissions(role)
                  const isPredefined = role.type === 'Predefined'

                  return (
                    <tr key={getRoleKey(role)} className="transition hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isPredefined ? 'bg-violet-50 text-violet-700' : 'bg-emerald-50 text-emerald-700'}`}>
                            {isPredefined ? <ShieldCheck size={17} /> : <Users size={17} />}
                          </div>

                          <div className="min-w-0">
                            <p className="max-w-[220px] truncate text-xs font-semibold text-slate-800 sm:text-sm">{role.name}</p>
                            <p className="mt-0.5 text-[10px] text-slate-400">{isPredefined ? 'System role' : 'Company role'}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-semibold ${isPredefined ? 'bg-violet-50 text-violet-700' : 'bg-emerald-50 text-emerald-700'}`}>{role.type || 'Custom'}</span>
                      </td>

                      <td className="max-w-[260px] px-4 py-3">
                        <p className="line-clamp-2 text-xs leading-5 text-slate-500">{role.description || 'No description provided.'}</p>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex min-w-10 items-center justify-center rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-bold tabular-nums text-slate-700">{permissions.length}</span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openDetailsPage(role)}
                            title="View role"
                            aria-label={`View ${role.name}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                          >
                            <Eye size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditPage(role)}
                            title="Edit role"
                            aria-label={`Edit ${role.name}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                          >
                            <Pencil size={15} />
                          </button>

                          <button
                            type="button"
                            disabled={role.type !== 'Custom'}
                            onClick={() => setDeletingRole(role)}
                            title={isPredefined ? 'Predefined roles cannot be deleted' : 'Delete custom role'}
                            aria-label={`Delete ${role.name}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-red-600 transition hover:border-red-200 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && filteredRoles.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Showing <strong className="text-slate-700">{filteredRoles.length}</strong> roles
            </span>
            <span>Predefined roles cannot be deleted.</span>
          </div>
        )}
      </section>

      {/* Delete Confirmation */}
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
