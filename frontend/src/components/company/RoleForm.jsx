import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronDown, ChevronRight, ShieldCheck, LoaderCircle, AlertCircle, Trash2, Save, Search, RefreshCw, LockKeyhole, CheckCircle2, Info, Users, View, Eye } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import TrashBox from '../../TrashBox/TrashBox'
import Loading from '../Loading/Loading'
import { hasPermission, useAuth } from '../../context/AuthContext'

function normalizePermissionGroups(permissions) {
  if (Array.isArray(permissions)) {
    return permissions
      .filter((item) => item && typeof item === 'object')
      .map((section, index) => ({
        section: section.section || section.name || `Section ${index + 1}`,
        permissions: Array.isArray(section.permissions) ? section.permissions : [],
      }))
  }

  if (permissions && typeof permissions === 'object') {
    if (Array.isArray(permissions.sections)) {
      return normalizePermissionGroups(permissions.sections)
    }

    return Object.entries(permissions).map(([section, items]) => ({
      section,
      permissions: Array.isArray(items) ? items.filter((item) => typeof item === 'string') : Array.isArray(items?.permissions) ? items.permissions : [],
    }))
  }

  return []
}

function flattenPermissions(permissions) {
  if (Array.isArray(permissions)) {
    return [...new Set(permissions.filter((item) => typeof item === 'string'))]
  }

  if (permissions && typeof permissions === 'object') {
    return [...new Set(Object.values(permissions).flatMap((items) => (Array.isArray(items) ? items.filter((item) => typeof item === 'string') : [])))]
  }

  return []
}

function humanize(value) {
  return String(value || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_:-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function getPermissionLabel(permission) {
  const parts = String(permission).split(/[:._]/)
  const action = parts[parts.length - 1]?.toUpperCase()

  const labels = {
    LIST: 'View List',
    VIEW: 'View Details',
    CREATE: 'Create',
    UPDATE: 'Edit',
    EDIT: 'Edit',
    DELETE: 'Delete',
    READ: 'View',
    MANAGE: 'Manage',
    APPROVE: 'Approve',
    EXPORT: 'Export',
    IMPORT: 'Import',
  }

  return labels[action] || humanize(action || permission)
}

function getPermissionDescription(permission) {
  const action = String(permission).split(/[:._]/).pop()?.toUpperCase()

  const descriptions = {
    LIST: 'View records and lists',
    VIEW: 'Open and view record details',
    CREATE: 'Create new records',
    UPDATE: 'Edit existing records',
    EDIT: 'Edit existing records',
    DELETE: 'Delete records',
    READ: 'View information',
    MANAGE: 'Manage this section',
    APPROVE: 'Approve pending requests',
    EXPORT: 'Export data',
    IMPORT: 'Import data',
  }

  return descriptions[action] || `Allow ${getPermissionLabel(permission).toLowerCase()} access`
}

function getSectionIcon(section) {
  const value = String(section || '').toLowerCase()

  if (value.includes('employee') || value.includes('user')) return Users
  if (value.includes('role') || value.includes('permission')) return ShieldCheck
  if (value.includes('product') || value.includes('inventory')) return LockKeyhole

  return ShieldCheck
}

export default function RoleForm({ initialRole = null, availablePermissions: initialAvailablePermissions = [], onSave }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams()

  const { permissions } = useAuth()

  const canView = hasPermission(permissions, 'role:view')

  const openDetailsPage = (role) => {
    if (!canView || !role) return

    navigate(`/company/roles/${encodeURIComponent(id)}`, {
      state: {
        role,
        availablePermissions,
      },
    })
  }

  const routeRole = location.state?.role || initialRole

  const isPredefined = location.state?.isPredefined === true || routeRole?.type === 'Predefined'

  const roleId = id || routeRole?._id || routeRole?.name || ''
  const isEdit = Boolean(id || routeRole?._id || isPredefined)
  const roleName = isPredefined ? routeRole?.name || id || '' : ''

  const [form, setForm] = useState({
    name: routeRole?.name || '',
    description: routeRole?.description || '',
    permissions: flattenPermissions(routeRole?.permissions),
  })

  const [availablePermissions, setAvailablePermissions] = useState(() => normalizePermissionGroups(location.state?.availablePermissions || initialAvailablePermissions))

  const [expandedSections, setExpandedSections] = useState({})
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteBox, setShowDeleteBox] = useState(false)
  const [apiError, setApiError] = useState('')
  const [toast, setToast] = useState(null)
  const [permissionSearch, setPermissionSearch] = useState('')

  const items = [
    { title: 'Roles & Permissions', link: '/company/roles' },
    {
      title: isEdit ? (isPredefined ? `${roleName || 'Role'} Permissions` : 'Edit Role') : 'Create Custom Role',
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

        if (data.success === false) {
          throw new Error(data.message || 'Unable to load roles.')
        }

        if (!active) return

        const permissionGroups = normalizePermissionGroups(data.availablePermissions)

        setAvailablePermissions(permissionGroups)

        setExpandedSections(Object.fromEntries(permissionGroups.map((section) => [section.section, true])))

        if (isEdit) {
          const roles = Array.isArray(data.roles) ? data.roles : []

          const role = roles.find((item) => {
            if (isPredefined) {
              return item.type === 'Predefined' && item.name === (routeRole?.name || roleId)
            }

            return item.type === 'Custom' && String(item._id) === String(roleId)
          })

          if (!role) {
            throw new Error('Role not found. Return to Roles & Permissions and try again.')
          }

          if (role.type === 'Custom' && role.isSystem) {
            throw new Error('System roles cannot be edited.')
          }

          setForm({
            name: role.name || '',
            description: role.description || '',
            permissions: flattenPermissions(role.permissions),
          })
        } else if (routeRole) {
          setForm({
            name: routeRole.name || '',
            description: routeRole.description || '',
            permissions: flattenPermissions(routeRole.permissions),
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
  }

  function togglePermission(permission) {
    setForm((current) => ({
      ...current,
      permissions: current.permissions.includes(permission) ? current.permissions.filter((item) => item !== permission) : [...current.permissions, permission],
    }))

    setApiError('')
  }

  function toggleSection(permissions) {
    const allSelected = permissions.length > 0 && permissions.every((permission) => form.permissions.includes(permission))

    setForm((current) => ({
      ...current,
      permissions: allSelected ? current.permissions.filter((permission) => !permissions.includes(permission)) : [...new Set([...current.permissions, ...permissions])],
    }))

    setApiError('')
  }

  function toggleExpanded(section) {
    setExpandedSections((current) => ({
      ...current,
      [section]: !(current[section] ?? true),
    }))
  }

  async function refreshPermissions() {
    if (refreshing || saving || deleting) return

    setRefreshing(true)
    setApiError('')

    try {
      const { data } = await axiosInstance.get('/erp/roles')

      if (data.success === false) {
        throw new Error(data.message || 'Unable to refresh permissions.')
      }

      const permissionGroups = normalizePermissionGroups(data.availablePermissions)

      setAvailablePermissions(permissionGroups)

      setExpandedSections((current) => ({
        ...current,
        ...Object.fromEntries(permissionGroups.map((section) => [section.section, current[section.section] ?? true])),
      }))

      setToast({
        type: 'success',
        message: 'Permissions refreshed successfully.',
      })
    } catch (error) {
      setApiError(error.response?.data?.message || error.message || 'Unable to refresh permissions.')
    } finally {
      setRefreshing(false)
    }
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
        response = await axiosInstance.patch(`/erp/roles/predefined/${encodeURIComponent(roleId)}`, { permissions: values.permissions })
      } else if (isEdit) {
        response = await axiosInstance.patch(`/erp/roles/${encodeURIComponent(roleId)}`, values)
      } else {
        response = await axiosInstance.post('/erp/roles', values)
      }

      if (response.data.success === false) {
        throw new Error(response.data.message || 'Unable to save role.')
      }

      if (onSave) {
        await onSave(response.data.role || values)
      }

      const savedRole = response.data.role

      if (savedRole?._id) {
        navigate(`/company/roles/${savedRole._id}`, {
          replace: true,
          state: {
            successMessage: response.data.message || (isEdit ? 'Role updated successfully.' : 'Role created successfully.'),
          },
        })
      } else if (isPredefined) {
        navigate(`/company/roles/${encodeURIComponent(roleId)}`, {
          replace: true,
          state: {
            successMessage: response.data.message || 'Permissions updated successfully.',
          },
        })
      } else {
        navigate('/company/roles', {
          replace: true,
          state: {
            successMessage: response.data.message || 'Role saved successfully.',
          },
        })
      }
    } catch (error) {
      setApiError(error.response?.data?.message || error.message || 'Something went wrong while saving the role.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteRole() {
    if (!isEdit || isPredefined || !roleId || deleting || saving) return

    setDeleting(true)
    setApiError('')

    try {
      const { data } = await axiosInstance.delete(`/erp/roles/${encodeURIComponent(roleId)}`)

      if (data.success === false) {
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

  const visibleSections = availablePermissions
    .map((section) => ({
      ...section,
      visiblePermissions: (section.permissions || []).filter((permission) => {
        if (!normalizedPermissionSearch) return true

        return `${permission} ${String(permission).split(':').join(' ')} ${getPermissionLabel(permission)}`.toLowerCase().includes(normalizedPermissionSearch)
      }),
    }))
    .filter((section) => !normalizedPermissionSearch || section.visiblePermissions.length > 0)

  if (loading) {
    return (
      <div className="min-w-0 space-y-3">
        <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="h-1 bg-erp-primary" />
          <div className="flex h-[calc(100%-4px)] items-center px-4 sm:px-5">
            <BreadCrumb items={items} />
          </div>
        </section>

        <Loading label={id ? 'Loading role for editing...' : 'Preparing new role form...'} />
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-3">
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        <div className="h-1 bg-erp-primary" />

        <div className="flex h-[calc(100%-4px)] min-w-0 items-center justify-between gap-3 px-4 sm:px-5">
          <div className="min-w-0 flex-1 overflow-hidden">
            <BreadCrumb items={items} />
          </div>


          {isEdit && canView && routeRole && (
            <button
              type="button"
              onClick={() => openDetailsPage(routeRole)}
              title="View role details"
              aria-label="View role details"
              className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-erp-border bg-erp-surface px-3 text-xs font-semibold text-erp-primary transition hover:bg-erp-primary/5"
            >
              <Eye size={16} />
              <span>View</span>
            </button>
          )}
        </div>
      </section>

      <form onSubmit={handleSubmit} className="space-y-3">
        <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex items-center gap-2 border-b border-erp-border px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
              <ShieldCheck size={16} />
            </div>

            <div>
              <h2 className="text-sm font-bold text-erp-text">Basic Information</h2>
              <p className="text-[11px] text-erp-text-secondary">{isPredefined ? 'The predefined role name cannot be changed.' : 'Enter the role details and responsibilities'}</p>
            </div>
          </div>

          <div className="grid gap-3 p-3 sm:grid-cols-2">
            <div className="min-w-0 space-y-1">
              <label htmlFor="role-name" className="block text-xs font-semibold text-erp-text-secondary">
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
                className={`h-10 w-full rounded-lg border px-3 text-xs outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10 ${errors.name ? 'border-red-400' : 'border-erp-border'} ${
                  isPredefined ? 'cursor-not-allowed bg-erp-bg text-erp-text-secondary' : 'bg-erp-surface text-erp-text'
                }`}
              />

              {errors.name && <p className="text-[11px] text-red-600">{errors.name}</p>}

              <p className="text-right text-[10px] text-erp-text-muted">{form.name.length}/100</p>
            </div>

            <div className="min-w-0 space-y-1">
              <label htmlFor="role-description" className="block text-xs font-semibold text-erp-text-secondary">
                Description
              </label>

              <textarea
                id="role-description"
                rows={2}
                maxLength={500}
                readOnly={isPredefined}
                value={form.description}
                onChange={(event) => updateField('description', event.target.value)}
                placeholder="Describe this role's responsibilities and access."
                className={`w-full resize-y rounded-lg border px-3 py-2.5 text-xs outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10 ${errors.description ? 'border-red-400' : 'border-erp-border'} ${
                  isPredefined ? 'cursor-not-allowed bg-erp-bg text-erp-text-secondary' : 'bg-erp-surface text-erp-text'
                }`}
              />

              {errors.description && <p className="text-[11px] text-red-600">{errors.description}</p>}

              <p className="text-right text-[10px] text-erp-text-muted">{form.description.length}/500</p>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-erp-border px-3 py-2.5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
                <LockKeyhole size={16} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-erp-text">Module Permissions</h2>
                <p className="text-[11px] text-erp-text-secondary">Choose which actions this role can perform</p>
              </div>
            </div>

            <div className="flex items-center gap-1 rounded-lg bg-erp-primary/10 px-2 py-1.5 text-[11px] font-bold text-erp-primary">
              <CheckCircle2 size={13} />
              {form.permissions.length} selected
            </div>
          </div>

          <div className="space-y-3 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="relative w-full sm:max-w-xs">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-erp-text-muted" />
                <input
                  type="search"
                  value={permissionSearch}
                  onChange={(event) => setPermissionSearch(event.target.value)}
                  placeholder="Search permissions..."
                  aria-label="Search permissions"
                  className="h-9 w-full rounded-lg border border-erp-border bg-erp-surface pl-8 pr-2.5 text-xs text-erp-text outline-none focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10"
                />
              </div>

              <button
                type="button"
                onClick={() => updateField('permissions', allSelected ? [] : allPermissions)}
                disabled={allPermissions.length === 0}
                className="text-xs font-semibold text-erp-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              >
                {allSelected ? 'Clear all' : 'Enable all'}
              </button>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50/70 px-2.5 py-2 text-xs text-blue-800">
              <Info size={14} className="mt-0.5 shrink-0" />
              <p>Select permissions to control access to each ERP module. Use the section controls to enable or disable permissions in bulk.</p>
            </div>

            {availablePermissions.length === 0 ? (
              <div className="rounded-lg border border-dashed border-erp-border bg-erp-bg px-3 py-7 text-center">
                <ShieldCheck size={24} className="mx-auto text-erp-text-muted" />
                <p className="mt-2 text-xs font-semibold text-erp-text">No permission groups available</p>
                <p className="mt-1 text-[11px] text-erp-text-secondary">Permission groups could not be loaded from the server.</p>
                <button
                  type="button"
                  onClick={refreshPermissions}
                  disabled={refreshing}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-erp-primary px-3 py-2 text-xs font-semibold text-white hover:bg-erp-primary-hover disabled:opacity-50"
                >
                  <RefreshCw size={13} />
                  {refreshing ? 'Refreshing...' : 'Try again'}
                </button>
              </div>
            ) : visibleSections.length === 0 ? (
              <div className="rounded-lg border border-dashed border-erp-border px-3 py-7 text-center">
                <Search size={23} className="mx-auto text-erp-text-muted" />
                <p className="mt-2 text-xs font-semibold text-erp-text">No matching permissions found</p>
                <p className="mt-1 text-[11px] text-erp-text-secondary">Try another permission name or action.</p>
              </div>
            ) : (
              <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                {visibleSections.map((section) => {
                  const sectionPermissions = section.permissions || []
                  const visiblePermissions = section.visiblePermissions
                  const Icon = getSectionIcon(section.section)

                  const selectedCount = sectionPermissions.filter((permission) => form.permissions.includes(permission)).length

                  const visibleAllSelected = visiblePermissions.length > 0 && visiblePermissions.every((permission) => form.permissions.includes(permission))

                  const isExpanded = normalizedPermissionSearch.length > 0 || (expandedSections[section.section] ?? true)

                  return (
                    <div key={section.section} className="overflow-hidden rounded-lg border border-erp-border">
                      <div className="flex items-center justify-between gap-2 bg-erp-bg px-2.5 py-2">
                        <button type="button" onClick={() => toggleExpanded(section.section)} aria-expanded={isExpanded} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                          {isExpanded ? <ChevronDown size={15} className="shrink-0 text-erp-text-secondary" /> : <ChevronRight size={15} className="shrink-0 text-erp-text-secondary" />}

                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-erp-surface text-erp-primary">
                            <Icon size={14} />
                          </span>

                          <span className="min-w-0">
                            <span className="block truncate text-xs font-bold text-erp-text">{humanize(section.section)}</span>
                            <span className="block text-[10px] text-erp-text-secondary">
                              {selectedCount}/{sectionPermissions.length} enabled
                            </span>
                          </span>
                        </button>

                        <button type="button" onClick={() => toggleSection(visiblePermissions)} className="shrink-0 text-[10px] font-semibold text-erp-primary hover:underline">
                          {visibleAllSelected ? 'Disable all' : 'Enable all'}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="divide-y divide-erp-border px-2.5">
                          {visiblePermissions.map((permission) => {
                            const checked = form.permissions.includes(permission)

                            return (
                              <div key={permission} className="flex items-center gap-2 py-2">
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-semibold text-erp-text">{getPermissionLabel(permission)}</p>
                                  <p className="mt-0.5 break-words text-[10px] leading-4 text-erp-text-secondary">{getPermissionDescription(permission)}</p>
                                  <p className="mt-0.5 break-all text-[10px] text-erp-text-muted">{permission}</p>
                                </div>

                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={checked}
                                  aria-label={`${getPermissionLabel(permission)} permission`}
                                  onClick={() => togglePermission(permission)}
                                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-erp-primary/30 ${checked ? 'bg-erp-primary' : 'bg-slate-300'}`}
                                >
                                  <span className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
                                </button>
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
          </div>
        </section>

        <footer className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-erp-border bg-erp-surface/95 p-2.5 shadow-sm backdrop-blur">
          <div className="hidden min-w-0 sm:block">
            <p className="text-xs font-semibold text-erp-text">{form.permissions.length} permissions selected</p>
            <p className="mt-0.5 text-[10px] text-erp-text-secondary">Review the role permissions before saving.</p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={goBack}
              disabled={saving || deleting}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-erp-border bg-erp-surface px-3 text-xs font-semibold text-erp-text-secondary transition hover:bg-erp-hover disabled:opacity-50"
            >
              <ArrowLeft size={14} />
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving || deleting}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-erp-primary px-4 text-xs font-bold text-white transition hover:bg-erp-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}

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
