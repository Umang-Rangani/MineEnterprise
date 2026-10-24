import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronDown, ChevronRight, ShieldCheck, LoaderCircle, AlertCircle, Trash2, Save, Search } from 'lucide-react'
import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import TrashBox from '../../TrashBox/TrashBox'

export default function RoleForm({ initialRole = null, availablePermissions: initialAvailablePermissions = [], onSave }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams()

  const routeRole = location.state?.role || initialRole

  const isPredefined = location.state?.isPredefined === true || routeRole?.type === 'Predefined'

  const roleId = id || routeRole?._id || routeRole?.name || ''

  const isEdit = Boolean(id || routeRole?._id || isPredefined)

  const roleName = isPredefined ? routeRole?.name || id || '' : ''

  const [form, setForm] = useState({
    name: routeRole?.name || '',
    description: routeRole?.description || '',
    permissions: Array.isArray(routeRole?.permissions) ? [...routeRole.permissions] : Object.values(routeRole?.permissions || {}).flatMap((items) => (Array.isArray(items) ? items : [])),
  })

  const [availablePermissions, setAvailablePermissions] = useState(location.state?.availablePermissions || initialAvailablePermissions)

  const [expandedSections, setExpandedSections] = useState({})
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteBox, setShowDeleteBox] = useState(false)
  const [apiError, setApiError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [toast, setToast] = useState(null)
  const [permissionSearch, setPermissionSearch] = useState('')

  const items = [
    { title: 'Roles & Permissions', link: '/company/roles' },
    {
      title: isEdit ? (isPredefined ? `Edit ${roleName || 'Role'} Permissions` : 'Edit Role') : 'Create Custom Role',
      link: null,
    },
  ]

  useEffect(() => {
    document.title = `${isEdit ? (isPredefined ? 'Edit Predefined Role Permissions' : 'Edit Role') : 'Create Custom Role'} | MineERP`
  }, [isEdit, isPredefined])

  useEffect(() => {
    let active = true

    async function loadRoleForm() {
      setLoading(true)
      setApiError('')

      try {
        const { data } = await axiosInstance.get('/erp/roles')

        if (!data.success) {
          throw new Error(data.message || 'Unable to load roles.')
        }

        if (!active) return

        const permissionGroups = data.availablePermissions || []

        setAvailablePermissions(permissionGroups)

        setExpandedSections(Object.fromEntries(permissionGroups.map((section) => [section.section, true])))

        if (isEdit) {
          const roles = data.roles || []

          const role = roles.find((item) => {
            if (isPredefined) {
              return item.type === 'Predefined' && item.name === roleId
            }

            return item.type === 'Custom' && String(item._id) === String(roleId)
          })

          if (!role) {
            throw new Error('Role not found. Please return to Roles & Permissions and try again.')
          }

          if (role.type === 'Custom' && role.isSystem) {
            throw new Error('System roles cannot be edited.')
          }

          const permissions = Array.isArray(role.permissions) ? [...role.permissions] : Object.values(role.permissions || {}).flatMap((values) => (Array.isArray(values) ? values : []))

          setForm({
            name: role.name || '',
            description: role.description || '',
            permissions,
          })
        } else if (routeRole) {
          setForm({
            name: routeRole.name || '',
            description: routeRole.description || '',
            permissions: Array.isArray(routeRole.permissions) ? [...routeRole.permissions] : Object.values(routeRole.permissions || {}).flatMap((values) => (Array.isArray(values) ? values : [])),
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
  }, [isEdit, isPredefined, roleId])

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

  async function handleSubmit(event) {
    event.preventDefault()

    const nextErrors = {}

    if (!isPredefined && !form.name.trim()) {
      nextErrors.name = 'Role name is required.'
    } else if (!isPredefined && form.name.trim().length > 100) {
      nextErrors.name = 'Role name cannot exceed 100 characters.'
    }

    if (!isPredefined && form.description.trim().length > 500) {
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

      if (isEdit && isPredefined) {
        response = await axiosInstance.patch(`/erp/roles/predefined/${encodeURIComponent(roleId)}`, {
          permissions: values.permissions,
        })
      } else if (isEdit) {
        response = await axiosInstance.patch(`/erp/roles/${encodeURIComponent(roleId)}`, values)
      } else {
        response = await axiosInstance.post('/erp/roles', values)
      }

      if (!response.data.success) {
        throw new Error(response.data.message || 'Unable to save role.')
      }

      if (onSave) {
        await onSave(response.data.role || values)
      }

      const message = response.data.message || (isEdit ? 'Role updated successfully.' : 'Role created successfully.')

      navigate('/company/roles', {
        replace: true,
        state: { successMessage: message },
      })
    } catch (error) {
      setApiError(error.response?.data?.message || error.message || 'Something went wrong while saving the role.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteRole() {
    if (!isEdit || isPredefined || !roleId || deleting || saving) {
      return
    }

    setDeleting(true)
    setApiError('')

    try {
      const { data } = await axiosInstance.delete(`/erp/roles/${encodeURIComponent(roleId)}`)

      if (!data.success) {
        throw new Error(data.message || 'Unable to delete role.')
      }

      setShowDeleteBox(false)

      navigate('/company/roles', {
        replace: true,
        state: {
          successMessage: data.message || 'Custom role deleted successfully.',
        },
      })
    } catch (error) {
      setShowDeleteBox(false)
      setApiError(error.response?.data?.message || error.message || 'Unable to delete role.')
    } finally {
      setDeleting(false)
    }
  }

  const allPermissions = [...new Set(availablePermissions.flatMap((section) => section.permissions || []))]

  const allSelected = allPermissions.length > 0 && allPermissions.every((permission) => form.permissions.includes(permission))

  const normalizedPermissionSearch = permissionSearch.trim().toLowerCase()

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
    <div className="min-w-0 space-y-4 bg-erp-bg text-erp-text">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="flex min-h-10 min-w-0 items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center overflow-hidden">
          <BreadCrumb items={items} />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={goBack}
            disabled={saving || deleting}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-erp-border bg-erp-surface px-2.5 text-xs font-semibold text-erp-text-secondary transition hover:bg-erp-hover disabled:opacity-50 sm:px-3 sm:text-sm"
          >
            <ArrowLeft size={15} />
            <span>Back</span>
          </button>

          {isEdit && !isPredefined && (
            <button
              type="button"
              onClick={() => setShowDeleteBox(true)}
              disabled={saving || deleting}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-2.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50 sm:px-3 sm:text-sm"
            >
              <Trash2 size={15} />
              <span className="hidden sm:inline">Delete Role</span>
              <span className="sm:hidden">Delete</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-3 rounded-xl border border-erp-border bg-erp-surface p-4 shadow-sm sm:p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">
          <ShieldCheck size={22} />
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold tracking-tight sm:text-xl">{isEdit ? (isPredefined ? `Edit ${roleName || 'Role'} Permissions` : 'Edit Role') : 'Create Custom Role'}</h1>

          <p className="mt-1 text-xs text-erp-text-secondary sm:text-sm">
            {isPredefined ? 'Update permissions for this predefined role in your company.' : isEdit ? 'Update role details and access permissions.' : 'Create a custom role and define its permissions.'}
          </p>
        </div>

        <span className="hidden shrink-0 rounded-lg bg-erp-primary-light px-3 py-2 text-xs font-semibold text-erp-primary sm:inline-flex">{isPredefined ? 'Predefined role' : isEdit ? 'Edit mode' : 'New role'}</span>
      </div>

      {apiError && (
        <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <p className="min-w-0 break-words">{apiError}</p>
        </div>
      )}

      {successMessage && (
        <div role="status" className="rounded-xl border border-green-200 bg-green-50 p-3.5 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-sm">
          <div className="border-b border-erp-border px-4 py-3.5 sm:px-5">
            <h2 className="text-sm font-bold">Basic Information</h2>
            <p className="mt-1 text-xs text-erp-text-secondary">{isPredefined ? 'This predefined role name cannot be changed.' : 'Enter the role name and its responsibilities.'}</p>
          </div>

          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-5">
            <div className="min-w-0">
              <label htmlFor="role-name" className="mb-1.5 block text-xs font-semibold sm:text-sm">
                Role Name {!isPredefined && <span className="text-erp-danger">*</span>}
              </label>

              <input
                id="role-name"
                autoFocus={!isPredefined}
                required={!isPredefined}
                maxLength={100}
                readOnly={isPredefined}
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
                placeholder="e.g. Junior Accountant"
                className={`h-10 w-full rounded-lg border border-erp-border px-3 text-sm outline-none transition focus:border-erp-focus focus:ring-2 focus:ring-erp-ring ${
                  isPredefined ? 'cursor-not-allowed bg-erp-surface-secondary text-erp-text-secondary' : 'bg-erp-surface'
                }`}
              />

              {errors.name && <p className="mt-1.5 text-xs text-erp-danger">{errors.name}</p>}

              <p className="mt-1 text-right text-[11px] text-erp-text-muted">{form.name.length}/100</p>
            </div>

            <div className="min-w-0">
              <label htmlFor="role-description" className="mb-1.5 block text-xs font-semibold sm:text-sm">
                Description
              </label>

              <textarea
                id="role-description"
                rows={3}
                maxLength={500}
                readOnly={isPredefined}
                value={form.description}
                onChange={(event) => updateField('description', event.target.value)}
                placeholder="Describe this role's responsibilities and access."
                className={`w-full resize-y rounded-lg border border-erp-border px-3 py-2.5 text-sm outline-none transition focus:border-erp-focus focus:ring-2 focus:ring-erp-ring ${
                  isPredefined ? 'cursor-not-allowed bg-erp-surface-secondary text-erp-text-secondary' : 'bg-erp-surface'
                }`}
              />

              {errors.description && <p className="mt-1.5 text-xs text-erp-danger">{errors.description}</p>}

              <p className="mt-1 text-right text-[11px] text-erp-text-muted">{form.description.length}/500</p>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-sm">
          <div className="flex flex-col gap-3 border-b border-erp-border p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="min-w-0">
              <h2 className="text-sm font-bold">Module Permissions</h2>
              <p className="mt-1 text-xs text-erp-text-secondary">Choose which actions this role can perform.</p>
            </div>

            <span className="inline-flex w-fit shrink-0 items-center rounded-lg bg-erp-primary-light px-3 py-2 text-xs font-bold text-erp-primary">{form.permissions.length} selected</span>
          </div>

          <div className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-xs">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-erp-text-muted" />

                <input
                  type="search"
                  value={permissionSearch}
                  onChange={(event) => setPermissionSearch(event.target.value)}
                  placeholder="Search permissions..."
                  aria-label="Search permissions"
                  className="h-9 w-full rounded-lg border border-erp-border bg-erp-surface pl-9 pr-3 text-xs outline-none transition focus:border-erp-focus focus:ring-2 focus:ring-erp-ring sm:text-sm"
                />
              </div>

              <button
                type="button"
                onClick={() => updateField('permissions', allSelected ? [] : allPermissions)}
                disabled={allPermissions.length === 0}
                className="self-start text-xs font-semibold text-erp-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto sm:text-sm"
              >
                {allSelected ? 'Clear all permissions' : 'Select all permissions'}
              </button>
            </div>

            {availablePermissions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-erp-border bg-erp-surface-secondary p-6 text-center">
                <ShieldCheck size={26} className="mx-auto mb-2 text-erp-text-muted" />
                <h3 className="text-sm font-semibold">No permission groups available</h3>
                <p className="mt-1 text-xs text-erp-text-secondary">Unable to load permission groups from the server.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {availablePermissions.map((section) => {
                  const sectionPermissions = section.permissions || []

                  const visiblePermissions = sectionPermissions.filter((permission) => `${permission} ${permission.split(':').join(' ')}`.toLowerCase().includes(normalizedPermissionSearch))

                  const selectedCount = sectionPermissions.filter((permission) => form.permissions.includes(permission)).length

                  const isExpanded = expandedSections[section.section] ?? true

                  if (normalizedPermissionSearch && visiblePermissions.length === 0) {
                    return null
                  }

                  return (
                    <div key={section.section} className="overflow-hidden rounded-xl border border-erp-border">
                      <div className="flex items-center gap-2 bg-erp-surface-secondary px-3 py-3 sm:px-4">
                        <button type="button" onClick={() => toggleExpanded(section.section)} aria-expanded={isExpanded} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                          {isExpanded ? <ChevronDown size={17} className="shrink-0" /> : <ChevronRight size={17} className="shrink-0" />}

                          <span className="truncate text-xs font-bold sm:text-sm">{section.section}</span>

                          <span className="shrink-0 rounded-md bg-erp-surface px-2 py-1 text-[10px] font-semibold text-erp-text-secondary">
                            {selectedCount}/{sectionPermissions.length}
                          </span>
                        </button>

                        <button type="button" onClick={() => toggleSection(visiblePermissions)} className="shrink-0 text-[11px] font-semibold text-erp-primary hover:underline sm:text-xs">
                          {visiblePermissions.length > 0 && visiblePermissions.every((permission) => form.permissions.includes(permission)) ? 'Clear' : 'Select all'}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="grid grid-cols-1 gap-2 border-t border-erp-border p-3 sm:grid-cols-2 sm:p-4">
                          {visiblePermissions.map((permission) => {
                            const checked = form.permissions.includes(permission)

                            return (
                              <label
                                key={permission}
                                className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-3 transition ${checked ? 'border-erp-primary/40 bg-erp-primary-light/50' : 'border-erp-border hover:bg-erp-surface-hover'}`}
                              >
                                <span className="min-w-0 flex-1">
                                  <span className="block break-words text-xs font-semibold sm:text-sm">
                                    {permission
                                      .split(':')
                                      .map((part) =>
                                        part
                                          .split('-')
                                          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                                          .join(' '),
                                      )
                                      .join(' · ')}
                                  </span>

                                  <span className="mt-1 block break-all text-[10px] text-erp-text-muted sm:text-[11px]">{permission}</span>
                                </span>

                                <input type="checkbox" checked={checked} onChange={() => togglePermission(permission)} className="h-4 w-4 shrink-0 cursor-pointer rounded border-erp-border accent-[var(--color-erp-primary)]" />
                              </label>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}

                {normalizedPermissionSearch && !availablePermissions.some((section) => (section.permissions || []).some((permission) => `${permission} ${permission.split(':').join(' ')}`.toLowerCase().includes(normalizedPermissionSearch))) && (
                  <div className="rounded-lg border border-dashed border-erp-border p-6 text-center text-xs text-erp-text-secondary">No matching permissions found.</div>
                )}
              </div>
            )}
          </div>
        </section>

        <footer className="sticky bottom-0 z-20 flex flex-col-reverse gap-2 rounded-xl border border-erp-border bg-erp-surface/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <p className="hidden text-xs text-erp-text-secondary sm:block">{form.permissions.length} permissions selected for this role</p>

          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <button
              type="button"
              onClick={goBack}
              disabled={saving || deleting}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-erp-border bg-erp-surface px-4 text-xs font-semibold text-erp-text-secondary transition hover:bg-erp-hover disabled:opacity-50 sm:text-sm"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving || deleting}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-erp-primary px-5 text-xs font-semibold text-white transition hover:bg-erp-primary-hover disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
            >
              {saving ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}

              {saving ? 'Saving...' : isPredefined ? 'Save Permissions' : isEdit ? 'Save Changes' : 'Create Role'}
            </button>
          </div>
        </footer>
      </form>

      {!isPredefined && (
        <TrashBox
          isOpen={showDeleteBox}
          onClose={() => {
            if (!deleting) setShowDeleteBox(false)
          }}
          title="Delete Custom Role"
          message={`Are you sure you want to delete "${form.name || 'this custom role'}"? This role may be assigned to employees.`}
          actionButtonText="Delete Role"
          cancelButtonText="Cancel"
          onAction={handleDeleteRole}
          isProcessing={deleting}
        />
      )}
    </div>
  )
}
