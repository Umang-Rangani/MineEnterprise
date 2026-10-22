import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Plus, ShieldCheck, RefreshCw, Search, Check, Pencil, Trash2, AlertTriangle, X } from 'lucide-react'
import axiosInstance from '../../api/axiosInstance'

export default function CompanyRoles() {
  const navigate = useNavigate()
  const location = useLocation()

  const [roles, setRoles] = useState([])
  const [availablePermissions, setAvailablePermissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')
  const [selectedRole, setSelectedRole] = useState(null)
  const [deletingRole, setDeletingRole] = useState(null)
  const [deleting, setDeleting] = useState(false)

  async function fetchRoles() {
    setLoading(true)
    setError('')

    try {
      const { data } = await axiosInstance.get('/erp/roles')

      if (!data.success) {
        throw new Error(data.message || 'Unable to load roles.')
      }

      const loadedRoles = data.roles || []

      setRoles(loadedRoles)
      setAvailablePermissions(data.availablePermissions || [])

      setSelectedRole((current) => {
        if (!current) return null

        return loadedRoles.find((role) => (current._id ? String(role._id) === String(current._id) : role.name === current.name && role.type === current.type)) || null
      })
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to load roles.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRoles()

    if (location.state?.successMessage) {
      setSuccess(location.state.successMessage)

      navigate(location.pathname, {
        replace: true,
        state: null,
      })
    }
  }, [])

  function openCreatePage() {
    setError('')

    navigate('/company/roles/new', {
      state: { availablePermissions },
    })
  }

  function openEditPage(role) {
    if (!role) return

    // Custom roles use their MongoDB ID.
    // Predefined roles use their name as the identifier.
    const roleIdentifier = role._id || role.name

    setError('')

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

    // Predefined roles cannot be deleted.
    if (deletingRole.type === 'Predefined') {
      setError('Predefined roles cannot be deleted.')
      setDeletingRole(null)
      return
    }

    if (!deletingRole._id) {
      setError('Custom role ID is missing.')
      return
    }

    setDeleting(true)
    setError('')
    setSuccess('')

    try {
      const deletedId = String(deletingRole._id)

      const { data } = await axiosInstance.delete(`/erp/roles/${deletedId}`)

      if (!data.success) {
        throw new Error(data.message || 'Unable to delete role.')
      }

      setDeletingRole(null)

      setSelectedRole((current) => (current && String(current._id) === deletedId ? null : current))

      setSuccess(data.message || 'Custom role deleted successfully.')

      await fetchRoles()
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to delete role.')
    } finally {
      setDeleting(false)
    }
  }

  function formatPermission(permission) {
    return permission
      .split(':')
      .map((part) =>
        part
          .split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' '),
      )
      .join(' · ')
  }

  const filteredRoles = roles.filter((role) => `${role.name} ${role.description || ''} ${role.type || ''}`.toLowerCase().includes(search.toLowerCase().trim()))

  const predefinedCount = roles.filter((role) => role.type === 'Predefined').length

  const customCount = roles.filter((role) => role.type === 'Custom').length

  const selectedPermissions = Array.isArray(selectedRole?.permissions) ? selectedRole.permissions : Object.values(selectedRole?.permissions || {}).flatMap((items) => (Array.isArray(items) ? items : []))

  return (
    <div className="min-h-full space-y-6 bg-erp-bg text-erp-text">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Roles & Permissions</h1>
          <p className="mt-1 text-sm text-erp-text-secondary">Manage company roles and control access to ERP modules.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={fetchRoles}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-erp-border bg-erp-surface px-4 py-2.5 text-sm font-semibold transition hover:bg-erp-hover disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button type="button" onClick={openCreatePage} className="inline-flex items-center justify-center gap-2 rounded-xl bg-erp-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-erp-primary-hover">
            <Plus size={17} />
            Create Custom Role
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-erp-danger-border bg-erp-danger-light p-4 text-sm text-erp-danger">
          <p>{error}</p>
          <button type="button" onClick={() => setError('')} aria-label="Dismiss error">
            <X size={17} />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-erp-success-border bg-erp-success-light p-4 text-sm text-erp-success">
          <p>{success}</p>
          <button type="button" onClick={() => setSuccess('')} aria-label="Dismiss success message">
            <X size={17} />
          </button>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label="Total Roles" value={loading ? '—' : roles.length} description="All available roles" />

        <SummaryCard label="Predefined Roles" value={loading ? '—' : predefinedCount} description="Built-in role templates" />

        <SummaryCard label="Custom Roles" value={loading ? '—' : customCount} description="Created by your company" />
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-5">
        {/* Role list */}
        <section className="overflow-hidden rounded-2xl border border-erp-border bg-erp-surface lg:col-span-3">
          <div className="space-y-4 border-b border-erp-border p-5">
            <div>
              <h2 className="font-semibold">Available Roles</h2>
              <p className="mt-1 text-sm text-erp-text-secondary">Select a role to view its permissions.</p>
            </div>

            <div className="relative">
              <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-erp-text-muted" />

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search roles..."
                className="w-full rounded-xl border border-erp-border bg-erp-surface px-10 py-2.5 text-sm outline-none transition focus:border-erp-focus focus:ring-2 focus:ring-erp-ring"
              />
            </div>
          </div>

          {loading ? (
            <div className="space-y-3 p-5">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="h-16 animate-pulse rounded-xl bg-erp-surface-secondary" />
              ))}
            </div>
          ) : filteredRoles.length === 0 ? (
            <div className="p-10 text-center">
              <ShieldCheck size={30} className="mx-auto mb-3 text-erp-text-muted" />
              <p className="font-semibold">No roles found</p>
              <p className="mt-1 text-sm text-erp-text-secondary">Try another search or create a custom role.</p>
            </div>
          ) : (
            <div className="divide-y divide-erp-border">
              {filteredRoles.map((role, index) => {
                const isSelected = selectedRole && (role._id ? String(role._id) === String(selectedRole._id) : role.name === selectedRole.name && role.type === selectedRole.type)

                const permissions = Array.isArray(role.permissions) ? role.permissions : Object.values(role.permissions || {}).flatMap((items) => (Array.isArray(items) ? items : []))

                return (
                  <button
                    type="button"
                    key={`${role.type}-${role._id || role.name || index}`}
                    onClick={() => {
                      setSelectedRole(role)
                      setError('')
                    }}
                    className={`flex w-full items-center justify-between gap-4 p-4 text-left transition sm:p-5 ${isSelected ? 'bg-erp-primary-light' : 'hover:bg-erp-surface-hover'}`}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{role.name}</h3>
                        <RoleBadge type={role.type} />
                      </div>

                      <p className="mt-1 line-clamp-2 text-sm text-erp-text-secondary">{role.description || 'No description provided.'}</p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-lg font-bold">{permissions.length}</p>
                      <p className="text-xs text-erp-text-muted">permissions</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        {/* Permission details */}
        <section className="overflow-hidden rounded-2xl border border-erp-border bg-erp-surface lg:col-span-2">
          <div className="border-b border-erp-border p-5">
            <h2 className="font-semibold">Permission Details</h2>
            <p className="mt-1 text-sm text-erp-text-secondary">{selectedRole ? `Access assigned to ${selectedRole.name}.` : 'Select a role to inspect its access.'}</p>
          </div>

          {!selectedRole ? (
            <div className="p-8 text-center">
              <ShieldCheck size={30} className="mx-auto mb-3 text-erp-text-muted" />
              <p className="text-sm text-erp-text-secondary">Choose a role from the list.</p>
            </div>
          ) : (
            <div className="p-5">
              <div className="flex flex-col gap-4">
                <div className="min-w-0">
                  <h3 className="text-lg font-bold">{selectedRole.name}</h3>

                  <p className="mt-1 text-sm text-erp-text-secondary">{selectedRole.description || 'No description provided.'}</p>

                  <div className="mt-3">
                    <RoleBadge type={selectedRole.type} />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {/* Edit enabled for all roles */}
                  <button type="button" onClick={() => openEditPage(selectedRole)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-erp-border px-3.5 py-2 text-sm font-semibold transition hover:bg-erp-hover">
                    <Pencil size={15} />
                    Edit Role
                  </button>

                  {/* Delete enabled only for custom roles */}
                  <button
                    type="button"
                    disabled={selectedRole.type === 'Predefined'}
                    onClick={() => {
                      setError('')
                      setDeletingRole(selectedRole)
                    }}
                    title={selectedRole.type === 'Predefined' ? 'Predefined roles cannot be deleted.' : 'Delete custom role'}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-erp-danger-border px-3.5 py-2 text-sm font-semibold text-erp-danger transition hover:bg-erp-danger-light disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 size={15} />
                    Delete
                  </button>
                </div>
              </div>

              <div className="mb-3 mt-6 flex items-center justify-between">
                <h4 className="text-sm font-semibold">Permissions</h4>

                <span className="rounded-lg bg-erp-surface-secondary px-2.5 py-1 text-xs font-semibold">{selectedPermissions.length} total</span>
              </div>

              <div className="max-h-[440px] space-y-2 overflow-y-auto pr-1">
                {selectedPermissions.length === 0 ? (
                  <p className="rounded-xl bg-erp-surface-secondary p-4 text-sm text-erp-text-secondary">No permissions assigned.</p>
                ) : (
                  selectedPermissions.map((permission, index) => (
                    <div key={`${permission}-${index}`} className="flex items-start gap-3 rounded-xl border border-erp-border p-3">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-erp-success-light text-erp-success">
                        <Check size={13} />
                      </span>

                      <span className="break-words text-sm">{formatPermission(permission)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Delete confirmation */}
      {deletingRole && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-erp-overlay/50 p-4">
          <section role="alertdialog" aria-modal="true" aria-labelledby="delete-role-title" className="w-full max-w-md rounded-2xl border border-erp-border bg-erp-surface p-6 shadow-erp-modal">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-erp-danger-light text-erp-danger">
              <AlertTriangle size={24} />
            </div>

            <h2 id="delete-role-title" className="text-lg font-bold">
              Delete Role?
            </h2>

            <p className="mt-2 text-sm leading-6 text-erp-text-secondary">
              Are you sure you want to delete <strong className="text-erp-text">{deletingRole.name}</strong>? This action cannot be undone.
            </p>

            {error && <p className="mt-4 rounded-xl border border-erp-danger-border bg-erp-danger-light p-3 text-sm text-erp-danger">{error}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() => {
                  setDeletingRole(null)
                  setError('')
                }}
                className="rounded-xl border border-erp-border px-4 py-2.5 text-sm font-semibold hover:bg-erp-hover disabled:opacity-50"
              >
                Cancel
              </button>

              <button type="button" disabled={deleting} onClick={handleDeleteRole} className="inline-flex items-center gap-2 rounded-xl bg-erp-danger px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50">
                {deleting ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={15} />
                    Delete Role
                  </>
                )}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, description }) {
  return (
    <div className="rounded-2xl border border-erp-border bg-erp-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-erp-text-secondary">{label}</p>
          <p className="mt-2 text-3xl font-bold">{value}</p>
          <p className="mt-1 text-xs text-erp-text-muted">{description}</p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">
          <ShieldCheck size={20} />
        </div>
      </div>
    </div>
  )
}

function RoleBadge({ type }) {
  const isPredefined = type === 'Predefined'

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${isPredefined ? 'bg-erp-primary-light text-erp-primary-dark' : 'bg-erp-success-light text-erp-success'}`}>{type || 'Custom'}</span>
}
