import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Plus, ShieldCheck, RefreshCw, Search, Check, Pencil, Trash2, Users, LockKeyhole, SlidersHorizontal, PackageOpen } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import TrashBox from '../../TrashBox/TrashBox'

function getRolePermissions(role) {
  if (Array.isArray(role?.permissions)) {
    return role.permissions
  }

  return Object.values(role?.permissions || {}).flatMap((items) => (Array.isArray(items) ? items : []))
}

function formatPermission(permission) {
  return String(permission || '')
    .split(':')
    .map((part) =>
      part
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '),
    )
    .join(' · ')
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
  const [selectedRole, setSelectedRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [deletingRole, setDeletingRole] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState(null)

  const items = [{ title: 'Roles & Permissions', link: null }]

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

  async function fetchRoles(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const { data } = await axiosInstance.get('/erp/roles')

      if (!data.success) {
        throw new Error(data.message || 'Unable to load roles.')
      }

      const loadedRoles = data.roles || []

      setRoles(loadedRoles)
      setAvailablePermissions(data.availablePermissions || [])

      setSelectedRole((current) => {
        if (!current) return loadedRoles[0] || null

        return loadedRoles.find((role) => getRoleKey(role) === getRoleKey(current)) || loadedRoles[0] || null
      })

      if (isRefresh) {
        showToast('success', 'Roles refreshed successfully.')
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || err.message || 'Unable to load roles.')
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

      setSelectedRole((current) => (current && String(current._id) === deletedId ? null : current))

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

  const selectedPermissions = getRolePermissions(selectedRole)

  return (
    <div className="min-w-0 space-y-4 text-sm">
      <Toast toast={toast} onClose={closeToast} />

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
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex h-[88px] min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:h-22 sm:p-4">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-slate-500 sm:text-sm">Total Roles</p>
            <p className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{loading ? '—' : roles.length}</p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
            <ShieldCheck size={19} />
          </div>
        </div>

        <div className="flex h-[88px] min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:h-22 sm:p-4">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-slate-500 sm:text-sm">Predefined Roles</p>
            <p className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{loading ? '—' : predefinedCount}</p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <LockKeyhole size={19} />
          </div>
        </div>

        <div className="flex h-[88px] min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:h-22 sm:p-4">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-slate-500 sm:text-sm">Custom Roles</p>
            <p className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{loading ? '—' : customCount}</p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <Users size={19} />
          </div>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-5">
        <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:col-span-3">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Available Roles</h2>
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

          {loading ? (
            <div className="space-y-2 p-3 sm:p-4">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="flex min-h-[76px] items-center gap-3 rounded-lg border border-slate-100 p-3">
                  <div className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-slate-100" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-3.5 w-32 max-w-full animate-pulse rounded bg-slate-100" />
                    <div className="h-3 w-48 max-w-full animate-pulse rounded bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredRoles.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center px-4 py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                <PackageOpen size={23} />
              </div>
              <h3 className="mt-3 text-sm font-bold text-slate-800">No roles found</h3>
              <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">{normalizedSearch ? 'Try a different search term.' : 'Create a custom role to define access for your company.'}</p>

              {!normalizedSearch && (
                <button type="button" onClick={openCreatePage} className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg bg-erp-primary px-3 text-xs font-semibold text-white hover:bg-erp-primary-hover">
                  <Plus size={15} />
                  Create Custom Role
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2 p-3 sm:p-4">
              {filteredRoles.map((role) => {
                const isSelected = selectedRole && getRoleKey(role) === getRoleKey(selectedRole)

                const permissions = getRolePermissions(role)
                const isPredefined = role.type === 'Predefined'

                return (
                  <button
                    type="button"
                    key={getRoleKey(role)}
                    onClick={() => setSelectedRole(role)}
                    aria-pressed={Boolean(isSelected)}
                    className={`flex min-h-[78px] w-full items-center gap-3 rounded-lg border p-3 text-left transition sm:gap-3.5 ${
                      isSelected ? 'border-erp-primary/30 bg-violet-50/70' : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isPredefined ? 'bg-violet-50 text-violet-700' : 'bg-emerald-50 text-emerald-700'}`}>
                      {isPredefined ? <ShieldCheck size={18} /> : <Users size={18} />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="break-words text-xs font-semibold text-slate-800 sm:text-sm">{role.name}</h3>
                        <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${isPredefined ? 'bg-violet-50 text-violet-700' : 'bg-emerald-50 text-emerald-700'}`}>
                          {isPredefined ? 'Predefined' : 'Custom'}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500 sm:text-xs">{role.description || 'No description provided.'}</p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-base font-bold tabular-nums text-slate-800">{permissions.length}</p>
                      <p className="text-[10px] text-slate-400 sm:text-[11px]">Permissions</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
          <div className="flex min-h-[68px] items-center justify-between gap-3 border-b border-slate-100 p-3 sm:px-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Permission Details</h2>
              <p className="mt-0.5 text-xs text-slate-500">Review role access and actions.</p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
              <SlidersHorizontal size={17} />
            </div>
          </div>

          {loading ? (
            <div className="space-y-3 p-4">
              <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
              <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
              <div className="h-9 w-full animate-pulse rounded-lg bg-slate-100" />
              <div className="h-9 w-full animate-pulse rounded-lg bg-slate-100" />
            </div>
          ) : !selectedRole ? (
            <div className="flex min-h-48 flex-col items-center justify-center px-4 py-8 text-center">
              <ShieldCheck size={25} className="text-slate-300" />
              <p className="mt-2 text-sm font-semibold text-slate-700">Select a role</p>
              <p className="mt-1 text-xs text-slate-500">Choose a role from the list to inspect its permissions.</p>
            </div>
          ) : (
            <div className="p-3 sm:p-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${selectedRole.type === 'Predefined' ? 'bg-violet-50 text-violet-700' : 'bg-emerald-50 text-emerald-700'}`}>
                    {selectedRole.type === 'Predefined' ? <ShieldCheck size={20} /> : <Users size={20} />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="break-words text-sm font-bold text-slate-900">{selectedRole.name}</h3>
                    <span className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${selectedRole.type === 'Predefined' ? 'bg-violet-50 text-violet-700' : 'bg-emerald-50 text-emerald-700'}`}>
                      {selectedRole.type === 'Predefined' ? 'Predefined' : 'Custom'}
                    </span>
                  </div>
                </div>

                <p className="mt-3 break-words text-xs leading-5 text-slate-500">{selectedRole.description || 'No description provided.'}</p>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-[11px] text-slate-500">Total permissions</p>
                    <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">{selectedPermissions.length}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-[11px] text-slate-500">Role type</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">{selectedRole.type === 'Predefined' ? 'Built-in' : 'Custom'}</p>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => openEditPage(selectedRole)}
                  className="inline-flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:text-sm"
                >
                  <Pencil size={14} />
                  Edit Role
                </button>

                <button
                  type="button"
                  disabled={selectedRole.type !== 'Custom'}
                  onClick={() => setDeletingRole(selectedRole)}
                  title={selectedRole.type === 'Predefined' ? 'Predefined roles cannot be deleted.' : 'Delete custom role'}
                  className="inline-flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white sm:text-sm"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>

              {selectedRole.type === 'Predefined' && <p className="mt-2 text-[11px] leading-4 text-slate-400">Built-in roles are protected and cannot be deleted.</p>}

              <div className="mb-2 mt-5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <LockKeyhole size={15} className="text-slate-500" />
                  <h4 className="text-xs font-bold text-slate-800 sm:text-sm">Permissions</h4>
                </div>
                <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold tabular-nums text-slate-600 sm:text-xs">{selectedPermissions.length} total</span>
              </div>

              <div className="max-h-[320px] space-y-2 overflow-y-auto overscroll-contain pr-1">
                {selectedPermissions.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
                    <LockKeyhole size={21} className="mx-auto mb-2 text-slate-400" />
                    <p className="text-xs text-slate-500">No permissions assigned.</p>
                  </div>
                ) : (
                  selectedPermissions.map((permission, index) => (
                    <div key={`${permission}-${index}`} className="flex items-start gap-2.5 rounded-lg border border-slate-100 p-2.5 transition hover:bg-slate-50">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                        <Check size={11} />
                      </span>
                      <span className="min-w-0 break-words text-xs leading-5 text-slate-700">{formatPermission(permission)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      <TrashBox
        isOpen={Boolean(deletingRole)}
        onClose={() => {
          if (!deleting) {
            setDeletingRole(null)
          }
        }}
        title="Delete Custom Role"
        message={deletingRole ? `Are you sure you want to delete "${deletingRole.name}"? This role may be assigned to employees.` : 'Are you sure you want to delete this custom role?'}
        actionButtonText="Delete Role"
        cancelButtonText="Cancel"
        onAction={handleDeleteRole}
        isProcessing={deleting}
      />
    </div>
  )
}
