import { useEffect, useState } from 'react'
import { Plus, X, ShieldCheck, RefreshCw, Search, Check, ChevronDown, ChevronRight } from 'lucide-react'
import axiosInstance from '../../api/axiosInstance'

export default function CompanyRoles() {
  const [roles, setRoles] = useState([])
  const [availablePermissions, setAvailablePermissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')
  const [selectedRole, setSelectedRole] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [expandedSections, setExpandedSections] = useState({})
  const [form, setForm] = useState({
    name: '',
    description: '',
    permissions: [],
  })

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
        return loadedRoles.find((role) => (role._id ? role._id === current._id : role.name === current.name && role.type === current.type)) || null
      })
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to load roles.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRoles()
  }, [])

  function openCreateModal() {
    setError('')
    setSuccess('')
    setForm({ name: '', description: '', permissions: [] })
    setExpandedSections(Object.fromEntries(availablePermissions.map((item) => [item.section, true])))
    setModalOpen(true)
  }

  function closeCreateModal() {
    if (saving) return
    setModalOpen(false)
  }

  function togglePermission(permission) {
    setForm((current) => ({
      ...current,
      permissions: current.permissions.includes(permission) ? current.permissions.filter((item) => item !== permission) : [...current.permissions, permission],
    }))
  }

  function toggleSection(sectionPermissions) {
    const allSelected = sectionPermissions.every((permission) => form.permissions.includes(permission))

    setForm((current) => ({
      ...current,
      permissions: allSelected ? current.permissions.filter((permission) => !sectionPermissions.includes(permission)) : [...new Set([...current.permissions, ...sectionPermissions])],
    }))
  }

  function toggleSectionExpanded(section) {
    setExpandedSections((current) => ({
      ...current,
      [section]: !current[section],
    }))
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

  async function handleCreateRole(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!form.name.trim()) {
      setError('Please enter a role name.')
      return
    }

    setSaving(true)

    try {
      const { data } = await axiosInstance.post('/erp/roles', {
        name: form.name.trim(),
        description: form.description.trim(),
        permissions: form.permissions,
      })

      if (!data.success) {
        throw new Error(data.message || 'Unable to create role.')
      }

      setRoles((current) => [...current, data.role])
      setSelectedRole(data.role)
      setModalOpen(false)
      setForm({ name: '', description: '', permissions: [] })
      setSuccess(data.message || 'Custom role created successfully.')
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to create role.')
    } finally {
      setSaving(false)
    }
  }

  const filteredRoles = roles.filter((role) => `${role.name} ${role.description || ''} ${role.type || ''}`.toLowerCase().includes(search.toLowerCase()))

  const predefinedCount = roles.filter((role) => role.type === 'Predefined').length

  const customCount = roles.filter((role) => role.type === 'Custom').length

  return (
    <div className="min-h-screen bg-erp-bg  text-erp-text ">
      <div className="mx-auto  space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Roles & Permissions</h1>
            <p className="mt-1 text-sm text-erp-text-secondary">Create company roles and control their module permissions.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={fetchRoles}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-erp-border bg-erp-surface px-4 py-2.5 text-sm font-semibold hover:bg-erp-hover disabled:opacity-50"
            >
              <RefreshCw size={16} />
              Refresh
            </button>

            <button type="button" onClick={openCreateModal} className="inline-flex items-center justify-center gap-2 rounded-xl bg-erp-primary px-4 py-2.5 text-sm font-semibold text-white shadow-erp-card transition hover:bg-erp-primary-hover">
              <Plus size={17} />
              Create Custom Role
            </button>
          </div>
        </div>

        {error && !modalOpen && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-erp-danger-border bg-erp-danger-light p-4 text-sm text-erp-danger">
            <p>{error}</p>
            <button type="button" onClick={() => setError('')} aria-label="Dismiss error">
              <X size={17} />
            </button>
          </div>
        )}

        {success && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-erp-success-border bg-erp-success-light p-4 text-sm text-erp-success">
            <p>{success}</p>
            <button type="button" onClick={() => setSuccess('')} aria-label="Dismiss success message">
              <X size={17} />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard label="Total Roles" value={loading ? '—' : roles.length} description="Available to your company" icon={<ShieldCheck size={20} />} />
          <SummaryCard label="Predefined Roles" value={loading ? '—' : predefinedCount} description="Built-in role templates" icon={<ShieldCheck size={20} />} />
          <SummaryCard label="Custom Roles" value={loading ? '—' : customCount} description="Company-created roles" icon={<Plus size={20} />} />
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-5">
          <section className="overflow-hidden rounded-2xl border border-erp-border bg-erp-surface shadow-erp-card lg:col-span-3">
            <div className="space-y-4 border-b border-erp-border p-5">
              <div>
                <h2 className="font-semibold">Available Roles</h2>
                <p className="mt-1 text-sm text-erp-text-secondary">Select a role to review its permissions.</p>
              </div>

              <div className="relative">
                <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-erp-text-muted" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search roles..."
                  className="w-full rounded-xl border border-erp-border bg-erp-surface px-10 py-2.5 text-sm outline-none focus:border-erp-focus focus:ring-2 focus:ring-erp-ring"
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
              <div className="p-10 text-center text-sm text-erp-text-secondary">No matching roles found.</div>
            ) : (
              <div className="divide-y divide-erp-border">
                {filteredRoles.map((role, index) => {
                  const isSelected = selectedRole && (role._id ? role._id === selectedRole._id : role.name === selectedRole.name && role.type === selectedRole.type)

                  const permissionCount = Array.isArray(role.permissions) ? role.permissions.length : Object.values(role.permissions || {}).reduce((total, list) => total + (Array.isArray(list) ? list.length : 0), 0)

                  return (
                    <button
                      type="button"
                      key={`${role.type}-${role._id || role.name || index}`}
                      onClick={() => setSelectedRole(role)}
                      className={`flex w-full items-center justify-between gap-4 p-4 text-left transition sm:p-5 ${isSelected ? 'bg-erp-primary-light' : 'hover:bg-erp-surface-hover'}`}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">{role.name}</h3>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${role.type === 'Predefined' ? 'bg-erp-primary-light text-erp-primary-dark' : 'bg-erp-success-light text-erp-success'}`}>{role.type}</span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-erp-text-secondary">{role.description || 'No description provided.'}</p>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-lg font-bold">{permissionCount}</p>
                        <p className="text-xs text-erp-text-muted">permissions</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-erp-border bg-erp-surface shadow-erp-card lg:col-span-2">
            <div className="border-b border-erp-border p-5">
              <h2 className="font-semibold">Permission Details</h2>
              <p className="mt-1 text-sm text-erp-text-secondary">{selectedRole ? `Permissions assigned to ${selectedRole.name}.` : 'Select a role to inspect its permissions.'}</p>
            </div>

            {!selectedRole ? (
              <div className="p-8 text-center text-sm text-erp-text-secondary">Choose a role from the list.</div>
            ) : (
              <div className="p-5">
                <h3 className="text-lg font-bold">{selectedRole.name}</h3>
                <p className="mt-1 text-sm text-erp-text-secondary">{selectedRole.description || 'No description provided.'}</p>

                <span className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${selectedRole.type === 'Predefined' ? 'bg-erp-primary-light text-erp-primary-dark' : 'bg-erp-success-light text-erp-success'}`}>
                  {selectedRole.type} Role
                </span>

                <div className="mb-3 mt-5 flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Permissions</h4>
                  <span className="rounded-lg bg-erp-surface-secondary px-2.5 py-1 text-xs font-semibold">
                    {Array.isArray(selectedRole.permissions) ? selectedRole.permissions.length : Object.values(selectedRole.permissions || {}).reduce((total, list) => total + (Array.isArray(list) ? list.length : 0), 0)} total
                  </span>
                </div>

                <div className="max-h-[440px] space-y-2 overflow-y-auto pr-1">
                  {Array.isArray(selectedRole.permissions) ? (
                    selectedRole.permissions.length === 0 ? (
                      <p className="rounded-xl bg-erp-surface-secondary p-4 text-sm text-erp-text-secondary">No permissions assigned.</p>
                    ) : (
                      selectedRole.permissions.map((permission) => <PermissionItem key={permission} label={formatPermission(permission)} />)
                    )
                  ) : (
                    Object.entries(selectedRole.permissions || {}).flatMap(([section, permissions]) => (permissions || []).map((permission) => <PermissionItem key={`${section}-${permission}`} label={formatPermission(permission)} />))
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-erp-overlay/50 p-3 py-6 sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeCreateModal()
          }}
        >
          <div className="my-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-erp-border bg-erp-surface shadow-erp-modal">
            <div className="flex items-center justify-between gap-4 border-b border-erp-border p-5 sm:p-6">
              <div>
                <h2 className="text-lg font-bold sm:text-xl">Create Custom Role</h2>
                <p className="mt-1 text-sm text-erp-text-secondary">Choose only the permissions this role needs.</p>
              </div>

              <button type="button" onClick={closeCreateModal} disabled={saving} className="rounded-xl p-2 text-erp-text-secondary hover:bg-erp-hover disabled:opacity-50" aria-label="Close dialog">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateRole}>
              <div className="max-h-[65vh] space-y-6 overflow-y-auto p-5 sm:p-6">
                {error && <div className="rounded-xl border border-erp-danger-border bg-erp-danger-light p-3 text-sm text-erp-danger">{error}</div>}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Role Name <span className="text-erp-danger">*</span>
                    </label>
                    <input
                      required
                      maxLength={80}
                      value={form.name}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      placeholder="e.g. Junior Accountant"
                      className="w-full rounded-xl border border-erp-border bg-erp-surface px-3.5 py-3 text-sm outline-none focus:border-erp-focus focus:ring-2 focus:ring-erp-ring"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold">Description</label>
                    <input
                      maxLength={500}
                      value={form.description}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                      placeholder="What can this role access?"
                      className="w-full rounded-xl border border-erp-border bg-erp-surface px-3.5 py-3 text-sm outline-none focus:border-erp-focus focus:ring-2 focus:ring-erp-ring"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-erp-border bg-erp-surface-secondary p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">Permissions</h3>
                      <p className="mt-1 text-xs text-erp-text-secondary">{form.permissions.length} permission(s) selected</p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          permissions: current.permissions.length === availablePermissions.reduce((total, section) => total + section.permissions.length, 0) ? [] : [...new Set(availablePermissions.flatMap((section) => section.permissions))],
                        }))
                      }
                      className="text-sm font-semibold text-erp-primary hover:underline"
                    >
                      {form.permissions.length > 0 && form.permissions.length === availablePermissions.reduce((total, section) => total + section.permissions.length, 0) ? 'Clear All' : 'Select All'}
                    </button>
                  </div>
                </div>

                {availablePermissions.length === 0 ? (
                  <div className="rounded-xl border border-erp-warning-border bg-erp-warning-light p-4 text-sm text-erp-warning">
                    No permissions were returned by the API. Check the GET /erp/roles response and confirm that availablePermissions is included.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {availablePermissions.map((section) => {
                      const selectedCount = section.permissions.filter((permission) => form.permissions.includes(permission)).length

                      const allSelected = section.permissions.length > 0 && selectedCount === section.permissions.length

                      return (
                        <div key={section.section} className="overflow-hidden rounded-xl border border-erp-border">
                          <div className="flex items-center gap-3 bg-erp-surface p-4">
                            <button type="button" onClick={() => toggleSectionExpanded(section.section)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                              {expandedSections[section.section] ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
                              <span className="font-semibold">{section.section}</span>
                              <span className="rounded-full bg-erp-surface-secondary px-2 py-0.5 text-xs text-erp-text-secondary">
                                {selectedCount}/{section.permissions.length}
                              </span>
                            </button>

                            <button type="button" onClick={() => toggleSection(section.permissions)} className="shrink-0 text-xs font-semibold text-erp-primary hover:underline">
                              {allSelected ? 'Clear' : 'Select all'}
                            </button>
                          </div>

                          {expandedSections[section.section] && (
                            <div className="grid grid-cols-1 gap-2 border-t border-erp-border p-4 sm:grid-cols-2">
                              {section.permissions.map((permission) => {
                                const checked = form.permissions.includes(permission)

                                return (
                                  <label key={permission} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${checked ? 'border-erp-primary bg-erp-primary-light' : 'border-erp-border hover:bg-erp-surface-hover'}`}>
                                    <input type="checkbox" checked={checked} onChange={() => togglePermission(permission)} className="mt-1 h-4 w-4 accent-erp-primary" />
                                    <span className="min-w-0 text-sm">
                                      {formatPermission(permission)}
                                      <span className="mt-1 block break-all text-xs text-erp-text-muted">{permission}</span>
                                    </span>
                                  </label>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-erp-border bg-erp-surface p-5 sm:flex-row sm:justify-end sm:p-6">
                <button type="button" onClick={closeCreateModal} disabled={saving} className="rounded-xl border border-erp-border bg-erp-surface px-5 py-2.5 text-sm font-semibold hover:bg-erp-hover disabled:opacity-50">
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving || availablePermissions.length === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-erp-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-erp-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check size={17} />
                      Save Custom Role
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, description, icon }) {
  return (
    <div className="rounded-2xl border border-erp-border bg-erp-surface p-5 shadow-erp-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-erp-text-secondary">{label}</p>
          <p className="mt-2 text-3xl font-bold">{value}</p>
          <p className="mt-1 text-xs text-erp-text-muted">{description}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">{icon}</div>
      </div>
    </div>
  )
}

function PermissionItem({ label }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-erp-border p-3">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-erp-success-light text-xs font-bold text-erp-success">
        <Check size={13} />
      </span>
      <span className="text-sm">{label}</span>
    </div>
  )
}
