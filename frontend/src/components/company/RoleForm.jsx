import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, ChevronDown, ChevronRight, ShieldCheck, LoaderCircle, AlertCircle } from 'lucide-react'
import axiosInstance from '../../api/axiosInstance'

export default function RoleForm({ initialRole = null, availablePermissions: initialAvailablePermissions = [], onSave }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams()

  const isEdit = Boolean(id || initialRole?._id)
  const roleId = id || initialRole?._id

  const [form, setForm] = useState({
    name: initialRole?.name || '',
    description: initialRole?.description || '',
    permissions: Array.isArray(initialRole?.permissions) ? [...initialRole.permissions] : Object.values(initialRole?.permissions || {}).flatMap((items) => (Array.isArray(items) ? items : [])),
  })

  const [availablePermissions, setAvailablePermissions] = useState(location.state?.availablePermissions || initialAvailablePermissions)
  const [expandedSections, setExpandedSections] = useState({})
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [apiError, setApiError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    let active = true

    async function loadRoleForm() {
      setLoading(true)
      setApiError('')

      try {
        // Fetch roles and available permission groups from the backend.
        const { data } = await axiosInstance.get('/erp/roles')

        if (!data.success) {
          throw new Error(data.message || 'Unable to load roles.')
        }

        if (!active) return

        const permissionGroups = data.availablePermissions || []
        setAvailablePermissions(permissionGroups)
        setExpandedSections(Object.fromEntries(permissionGroups.map((section) => [section.section, true])))

        if (isEdit) {
          const role = (data.roles || []).find((item) => String(item._id) === String(roleId))

          if (!role) {
            throw new Error('Role not found. Predefined roles cannot be edited using the custom role form.')
          }

          if (role.type !== 'Custom' || role.isSystem) {
            throw new Error('Predefined or system roles cannot be edited here.')
          }

          setForm({
            name: role.name || '',
            description: role.description || '',
            permissions: Array.isArray(role.permissions) ? [...role.permissions] : Object.values(role.permissions || {}).flatMap((items) => (Array.isArray(items) ? items : [])),
          })
        } else if (initialRole) {
          setForm({
            name: initialRole.name || '',
            description: initialRole.description || '',
            permissions: Array.isArray(initialRole.permissions) ? [...initialRole.permissions] : Object.values(initialRole.permissions || {}).flatMap((items) => (Array.isArray(items) ? items : [])),
          })
        }
      } catch (error) {
        if (active) {
          setApiError(error.response?.data?.message || error.message || 'Failed to load role information.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadRoleForm()

    return () => {
      active = false
    }
  }, [isEdit, roleId, initialRole])

  function goBack() {
    navigate('/company/roles')
  }

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))

    setErrors((current) => ({
      ...current,
      [field]: '',
    }))

    setApiError('')
    setSuccessMessage('')
  }

  function togglePermission(permission) {
    setForm((current) => ({
      ...current,
      permissions: current.permissions.includes(permission) ? current.permissions.filter((item) => item !== permission) : [...current.permissions, permission],
    }))

    setApiError('')
    setSuccessMessage('')
  }

  function toggleSection(permissions) {
    const allSelected = permissions.length > 0 && permissions.every((permission) => form.permissions.includes(permission))

    setForm((current) => ({
      ...current,
      permissions: allSelected ? current.permissions.filter((permission) => !permissions.includes(permission)) : [...new Set([...current.permissions, ...permissions])],
    }))

    setApiError('')
    setSuccessMessage('')
  }

  function toggleExpanded(section) {
    setExpandedSections((current) => ({
      ...current,
      [section]: !(current[section] ?? true),
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

  async function handleSubmit(event) {
    event.preventDefault()

    const nextErrors = {}

    if (!form.name.trim()) {
      nextErrors.name = 'Role name is required.'
    } else if (form.name.trim().length > 100) {
      nextErrors.name = 'Role name cannot exceed 100 characters.'
    }

    if (form.description.trim().length > 500) {
      nextErrors.description = 'Description cannot exceed 500 characters.'
    }

    setErrors(nextErrors)
    setApiError('')
    setSuccessMessage('')

    if (Object.keys(nextErrors).length > 0) return

    const values = {
      name: form.name.trim(),
      description: form.description.trim(),
      permissions: [...new Set(form.permissions)],
    }

    setSaving(true)

    try {
      let response

      if (isEdit) {
        response = await axiosInstance.patch(`/erp/roles/${roleId}`, values)
      } else {
        response = await axiosInstance.post('/erp/roles', values)
      }

      if (!response.data.success) {
        throw new Error(response.data.message || 'Unable to save role.')
      }

      if (onSave) {
        await onSave(response.data.role || values)
      }

      setSuccessMessage(response.data.message || (isEdit ? 'Role updated successfully.' : 'Role created successfully.'))

      navigate('/company/roles', {
        replace: true,
        state: {
          successMessage: response.data.message || (isEdit ? 'Role updated successfully.' : 'Role created successfully.'),
        },
      })
    } catch (error) {
      setApiError(error.response?.data?.message || error.message || 'Something went wrong while saving the role.')
    } finally {
      setSaving(false)
    }
  }

  const allPermissions = [...new Set(availablePermissions.flatMap((section) => section.permissions || []))]

  const allSelected = allPermissions.length > 0 && allPermissions.every((permission) => form.permissions.includes(permission))

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-erp-bg p-6">
        <div className="flex items-center gap-3 text-sm font-medium text-erp-text-secondary">
          <LoaderCircle size={22} className="animate-spin text-erp-primary" />
          Loading role information...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full space-y-6 bg-erp-bg  text-erp-text ">
      <div className="mx-auto w-full ">
        <button type="button" onClick={goBack} className="mb-5 inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-erp-text-secondary transition hover:text-erp-primary">
          <ArrowLeft size={18} />
          Back to Roles
        </button>

        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">
            <ShieldCheck size={24} />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{isEdit ? 'Edit Role' : 'Create Custom Role'}</h1>
            <p className="mt-2 text-sm text-erp-text-secondary sm:text-base">{isEdit ? 'Update role details and access permissions.' : 'Create a custom role and define which actions it can perform.'}</p>
          </div>
        </div>
      </div>

      <section className="mx-auto w-full  overflow-hidden rounded-2xl border border-erp-border bg-erp-surface shadow-sm">
        <form onSubmit={handleSubmit}>
          <div className="space-y-8 p-5 sm:p-7 lg:p-8">
            {apiError && (
              <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <AlertCircle size={20} className="mt-0.5 shrink-0" />
                <p>{apiError}</p>
              </div>
            )}

            {successMessage && (
              <div role="status" className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                {successMessage}
              </div>
            )}

            <section className="space-y-5">
              <div>
                <h2 className="text-lg font-bold">Basic Information</h2>
                <p className="mt-1 text-sm text-erp-text-secondary">Enter the name and description of this role.</p>
              </div>

              <div>
                <label htmlFor="role-name" className="mb-2 block text-sm font-semibold">
                  Role Name <span className="text-erp-danger">*</span>
                </label>

                <input
                  id="role-name"
                  autoFocus
                  required
                  maxLength={100}
                  value={form.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  placeholder="e.g. Junior Accountant"
                  className="w-full rounded-xl border border-erp-border bg-erp-surface px-4 py-3 text-sm outline-none transition focus:border-erp-focus focus:ring-2 focus:ring-erp-ring"
                />

                {errors.name && <p className="mt-2 text-sm text-erp-danger">{errors.name}</p>}

                <p className="mt-1.5 text-xs text-erp-text-muted">{form.name.length}/100 characters</p>
              </div>

              <div>
                <label htmlFor="role-description" className="mb-2 block text-sm font-semibold">
                  Description
                </label>

                <textarea
                  id="role-description"
                  rows={4}
                  maxLength={500}
                  value={form.description}
                  onChange={(event) => updateField('description', event.target.value)}
                  placeholder="Describe this role's responsibilities and access."
                  className="w-full resize-y rounded-xl border border-erp-border bg-erp-surface px-4 py-3 text-sm outline-none transition focus:border-erp-focus focus:ring-2 focus:ring-erp-ring"
                />

                <div className="mt-1.5 flex justify-between gap-3">
                  {errors.description ? <p className="text-sm text-erp-danger">{errors.description}</p> : <span />}
                  <span className="text-xs text-erp-text-muted">{form.description.length}/500</span>
                </div>
              </div>
            </section>

            <div className="border-t border-erp-border" />

            <section className="space-y-4">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <h2 className="text-lg font-bold">Module Permissions</h2>
                  <p className="mt-1 text-sm text-erp-text-secondary">Turn individual permissions on or off for this role.</p>
                </div>

                <span className="inline-flex w-fit items-center rounded-lg bg-erp-primary-light px-3 py-2 text-sm font-bold text-erp-primary-dark">{form.permissions.length} selected</span>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => updateField('permissions', allSelected ? [] : allPermissions)}
                  disabled={allPermissions.length === 0}
                  className="text-sm font-semibold text-erp-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {allSelected ? 'Clear all permissions' : 'Select all permissions'}
                </button>
              </div>

              {availablePermissions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-erp-border bg-erp-surface-secondary p-6 text-center">
                  <ShieldCheck size={28} className="mx-auto mb-3 text-erp-text-muted" />
                  <h3 className="text-sm font-semibold">No permission groups available</h3>
                  <p className="mt-1 text-sm text-erp-text-secondary">Unable to load permission groups from the server.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {availablePermissions.map((section) => {
                    const sectionPermissions = section.permissions || []
                    const selectedCount = sectionPermissions.filter((permission) => form.permissions.includes(permission)).length
                    const isExpanded = expandedSections[section.section] ?? true
                    const sectionAllSelected = sectionPermissions.length > 0 && selectedCount === sectionPermissions.length

                    return (
                      <div key={section.section} className="overflow-hidden rounded-xl border border-erp-border">
                        <div className="flex items-center gap-3 bg-erp-surface-secondary p-4">
                          <button type="button" onClick={() => toggleExpanded(section.section)} aria-expanded={isExpanded} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                            {isExpanded ? <ChevronDown size={18} className="shrink-0" /> : <ChevronRight size={18} className="shrink-0" />}

                            <span className="font-semibold">{section.section}</span>

                            <span className="rounded-full bg-erp-surface px-2.5 py-1 text-xs text-erp-text-secondary">
                              {selectedCount}/{sectionPermissions.length}
                            </span>
                          </button>

                          <button type="button" onClick={() => toggleSection(sectionPermissions)} className="shrink-0 text-xs font-semibold text-erp-primary hover:underline sm:text-sm">
                            {sectionAllSelected ? 'Clear' : 'Select all'}
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="grid grid-cols-1 gap-3 border-t border-erp-border p-3 sm:grid-cols-2 sm:p-4">
                            {sectionPermissions.map((permission) => {
                              const checked = form.permissions.includes(permission)

                              return (
                                <div key={permission} className={`flex items-center justify-between gap-3 rounded-xl border p-3 transition ${checked ? 'border-erp-primary bg-erp-primary-light' : 'border-erp-border hover:bg-erp-surface-hover'}`}>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium">{formatPermission(permission)}</p>
                                    <p className="mt-1 break-all text-xs text-erp-text-muted">{permission}</p>
                                  </div>

                                  <PermissionSwitch checked={checked} onChange={() => togglePermission(permission)} label={formatPermission(permission)} />
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </div>

          <footer className="flex flex-col-reverse gap-3 border-t border-erp-border bg-erp-surface-secondary p-5 sm:flex-row sm:justify-end sm:px-8 sm:py-5">
            <button type="button" onClick={goBack} disabled={saving} className="rounded-xl border border-erp-border bg-erp-surface px-5 py-3 text-sm font-semibold transition hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-50">
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving || loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-erp-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-erp-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <LoaderCircle size={18} className="animate-spin" /> : <Check size={18} />}
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Role'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  )
}

function PermissionSwitch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-erp-ring focus:ring-offset-2 ${checked ? 'bg-erp-primary' : 'bg-slate-300'}`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}
