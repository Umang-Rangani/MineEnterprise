import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ShieldCheck, LockKeyhole, RefreshCw, Pencil, CheckCircle2, FileText, Settings2, AlertCircle, Ban, CircleCheck } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import Loading from '../Loading/Loading'
import { hasPermission, useAuth } from '../../context/AuthContext'

const buttonBase = 'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50'

function formatPermission(permission) {
  return String(permission || '')
    .split(':')
    .map((part) =>
      part
        .split(/[-_]/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '),
    )
    .join(' · ')
}

function getRolePermissions(role) {
  const permissions = role?.permissions

  if (Array.isArray(permissions)) {
    return [...new Set(permissions.map((permission) => (typeof permission === 'string' ? permission : permission?.key || permission?.name || '')).filter(Boolean))]
  }

  if (permissions && typeof permissions === 'object') {
    return [
      ...new Set(
        Object.entries(permissions).flatMap(([section, actions]) => {
          if (!Array.isArray(actions)) return []

          return actions
            .map((action) => {
              if (typeof action !== 'string') {
                return action?.key || action?.name || ''
              }

              return action.includes(':') ? action : `${section}:${action}`
            })
            .filter(Boolean)
        }),
      ),
    ]
  }

  return []
}

function formatDate(date) {
  if (!date) return 'Not available'

  const parsedDate = new Date(date)

  if (Number.isNaN(parsedDate.getTime())) return 'Not available'

  return parsedDate.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function DetailItem({ label, value, icon: Icon, inactive }) {
  return (
    <div className={`min-w-0 rounded-lg border p-3 ${inactive ? 'border-erp-disabled-border bg-erp-disabled-surface' : 'border-erp-border bg-erp-surface'}`}>
      <p className={`mb-2 flex items-center gap-2 text-xs ${inactive ? 'text-erp-disabled-text' : 'text-erp-text-secondary'}`}>
        {Icon && <Icon size={14} className="shrink-0" />}
        {label}
      </p>

      <p className={`break-words text-sm font-semibold ${inactive ? 'text-erp-disabled-text' : 'text-erp-text'}`}>{value || 'Not provided'}</p>
    </div>
  )
}

function SectionHeader({ icon: Icon, title, description, inactive }) {
  return (
    <div className="mb-4 flex min-w-0 flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${inactive ? 'bg-erp-disabled-light text-erp-disabled' : 'bg-erp-primary-light text-erp-primary'}`}>
          <Icon size={19} />
        </div>

        <div className="min-w-0">
          <h2 className="text-sm font-bold text-erp-text">{title}</h2>
          <p className="mt-0.5 text-xs text-erp-text-secondary">{description}</p>
        </div>
      </div>
    </div>
  )
}

export default function RoleDetails() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { permissions } = useAuth()

  const canView = hasPermission(permissions, 'role:view')
  const canUpdate = hasPermission(permissions, 'role:update')

  const canEdit = canUpdate

  const [role, setRole] = useState(null)
  const [availablePermissions, setAvailablePermissions] = useState({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(false)
  const [toast, setToast] = useState(null)

  const isPredefined = role?.type === 'Predefined'

  const isInactive =
    String(role?.status ?? '')
      .trim()
      .toLowerCase() === 'inactive' ||
    role?.isActive === false ||
    role?.active === false

  const rolePermissions = getRolePermissions(role)

  const panelClass = isInactive ? 'border-erp-disabled-border bg-erp-disabled-surface' : 'border-erp-border bg-erp-surface'

  const iconBoxClass = isInactive ? 'bg-erp-disabled-light text-erp-disabled' : 'bg-erp-primary-light text-erp-primary'

  function showToast(type, message) {
    setToast({ type, message })
  }

  function closeToast() {
    setToast(null)
  }

  async function fetchRole(showRefreshMessage = false) {
    setLoading(true)
    setRefreshing(showRefreshMessage)
    setError(false)

    try {
      const decodedId = decodeURIComponent(id || '')

      if (!decodedId) {
        throw new Error('Role ID is missing.')
      }

      let matchedRole = null
      let permissionsData = {}

      // Try fetching the role directly first.
      try {
        const response = await axiosInstance.get(`/erp/roles/${encodeURIComponent(decodedId)}`)

        const data = response.data

        if (data?.success && data.role) {
          matchedRole = data.role
          permissionsData = data.availablePermissions || {}
        }
      } catch (detailError) {
        if (detailError.response?.status !== 404 && detailError.response?.status !== 400) {
          throw detailError
        }
      }

      // Fallback to the roles list if direct details are unavailable.
      if (!matchedRole) {
        const firstResponse = await axiosInstance.get('/erp/roles', {
          params: {
            type: 'All',
            page: 1,
            limit: 100,
          },
        })

        const firstData = firstResponse.data

        if (!firstData?.success) {
          throw new Error(firstData?.message || 'Unable to load roles.')
        }

        const roles = Array.isArray(firstData.roles) ? [...firstData.roles] : []

        const totalPages = Math.max(1, Number(firstData.pagination?.totalPages) || 1)

        for (let page = 2; page <= totalPages; page += 1) {
          const pageResponse = await axiosInstance.get('/erp/roles', {
            params: {
              type: 'All',
              page,
              limit: 100,
            },
          })

          if (Array.isArray(pageResponse.data?.roles)) {
            roles.push(...pageResponse.data.roles)
          }
        }

        matchedRole = roles.find((item) => String(item._id || '') === decodedId || String(item.name || '') === decodedId)

        permissionsData = firstData.availablePermissions || {}

        if (!matchedRole) {
          throw new Error('Role was not found in the roles list. Check the role ID and access permissions.')
        }
      }

      setRole(matchedRole)
      setAvailablePermissions(permissionsData)

      if (showRefreshMessage) {
        showToast('success', 'Role details refreshed successfully.')
      }
    } catch (err) {
      setRole(null)
      setError(true)

      showToast('error', err.response?.data?.message || err.message || 'Unable to load role details.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    document.title = 'Role Details | MineERP'
    fetchRole()
  }, [id])

  function handleEdit() {
    if (!canEdit || !role || isInactive) return

    navigate(`/company/roles/${encodeURIComponent(role._id || role.name)}/edit`, {
      state: {
        role,
        availablePermissions,
        isPredefined,
      },
    })
  }

  const breadcrumbItems = [
    { title: 'Roles & Permissions', link: '/company/roles' },
    { title: role?.name || '...', link: null },
  ]

  if (!canView) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-erp-border bg-erp-surface px-6 py-10 text-center">
        <AlertCircle size={28} className="text-rose-500" />

        <h2 className="mt-4 text-lg font-bold text-erp-text">Access Denied</h2>

        <p className="mt-2 max-w-md text-sm text-erp-text-secondary">You do not have permission to view role details.</p>

        <button type="button" onClick={() => navigate('/company/roles')} className="mt-4 rounded-lg bg-erp-primary px-4 py-2 text-xs font-semibold text-white hover:bg-erp-primary-hover">
          Back to Roles
        </button>
      </div>
    )
  }

  //  INITIAL LOADING
  if (loading) {
    return (
      <div className="min-w-0 space-y-4 text-sm">
        <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="h-1 bg-erp-primary" />

          <div className="flex min-h-16 items-center px-4 sm:px-5">
            <BreadCrumb items={breadcrumbItems} />
          </div>
        </section>

        <section className="relative min-h-[480px] overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex min-h-[480px] items-center justify-center">
            <Loading fullScreen={false} label="Loading role details..." description="Please wait while we load your company's role details." className="!h-full min-h-[480px]" />
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-4 text-erp-text">
      {toast && <Toast toast={toast} onClose={closeToast} />}

      {/* Header */}
      <section className={`overflow-hidden rounded-xl border shadow-erp-card ${isInactive ? 'border-erp-disabled-border bg-erp-disabled-surface' : 'border-erp-border bg-erp-surface'}`}>
        <div className={`h-1 ${isInactive ? 'bg-erp-disabled' : 'bg-erp-primary'}`} />

        <div className="flex min-w-0 flex-col gap-4 px-4 py-3 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1 overflow-hidden">
            <BreadCrumb items={breadcrumbItems} />
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {role && (
              <span className={`${buttonBase} ${isInactive ? 'border border-erp-disabled-border bg-erp-disabled-light text-erp-disabled-text' : 'bg-erp-primary-light text-erp-primary-dark'}`}>
                {isInactive ? <Ban size={14} /> : <LockKeyhole size={14} />}

                {isInactive ? 'Inactive Role' : `${rolePermissions.length} Permissions`}
              </span>
            )}

            <button type="button" onClick={() => fetchRole(true)} disabled={loading || refreshing} className={`${buttonBase} border border-erp-border bg-erp-surface hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-50`}>
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>

            {canEdit && (
              <button
                type="button"
                onClick={handleEdit}
                disabled={loading || refreshing || !role || isInactive}
                title={isInactive ? 'Inactive roles cannot be edited.' : 'Edit role permissions'}
                className={`${buttonBase} ${isInactive ? 'border border-erp-disabled-border bg-erp-disabled-light text-erp-disabled' : 'bg-erp-primary text-white hover:bg-erp-primary-hover'}`}
              >
                <Pencil size={14} />
                Edit
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Error */}
      {!loading && error && (
        <section className="flex items-start gap-3 rounded-xl border border-erp-danger-border bg-erp-danger-light p-4">
          <AlertCircle size={20} className="mt-0.5 shrink-0 text-erp-danger" />

          <div className="min-w-0">
            <h2 className="text-sm font-bold text-erp-danger">Unable to load role</h2>

            <p className="mt-1 text-sm text-erp-danger">Check your access or refresh to try again.</p>

            <button type="button" onClick={() => fetchRole()} className="mt-3 rounded-lg border border-erp-danger-border bg-erp-surface px-3 py-2 text-xs font-semibold text-erp-danger hover:bg-erp-danger-light">
              Try again
            </button>
          </div>
        </section>
      )}

      {/* Role Details */}
      {!loading && !error && role && (
        <>
          {/* Inactive Notice */}
          {isInactive && (
            <section className="flex items-start gap-3 rounded-xl border border-erp-disabled-border bg-erp-disabled-light p-4">
              <Ban size={19} className="mt-0.5 shrink-0 text-erp-disabled" />

              <div className="min-w-0">
                <h2 className="text-sm font-bold text-erp-disabled-text">This role is inactive</h2>

                <p className="mt-1 text-xs leading-5 text-erp-disabled-text">This role is displayed in read-only mode. Editing is disabled while its status is inactive.</p>
              </div>
            </section>
          )}

          {/* Role Information + Role Activity */}
          <div className="grid min-w-0 grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
            {/* Role Information */}
            <section className={`min-w-0 rounded-xl border p-4 shadow-erp-card sm:p-5 ${panelClass}`}>
              <SectionHeader icon={ShieldCheck} title="Role Information" description="Basic role details" inactive={isInactive} />

              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                <DetailItem label="Role Name" value={role.name} icon={ShieldCheck} inactive={isInactive} />

                <DetailItem label="Role Type" value={role.type || 'Custom'} icon={Settings2} inactive={isInactive} />

                <div className="sm:col-span-2">
                  <DetailItem label="Description" value={role.description || 'No description provided.'} icon={FileText} inactive={isInactive} />
                </div>
              </div>

              <p className="mt-4 text-xs text-erp-text-muted">{isInactive ? 'This role is inactive and shown in read-only mode.' : isPredefined ? 'This is a predefined system role.' : 'Use Edit to update this custom role.'}</p>
            </section>

            {/* Role Activity */}
            <section className={`min-w-0 rounded-xl border p-4 shadow-erp-card sm:p-5 ${panelClass}`}>
              <SectionHeader icon={LockKeyhole} title="Role Activity" description="Role creation and last modification details" inactive={isInactive} />

              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                <div className={`flex min-w-0 items-start gap-3 rounded-lg border p-3 ${isInactive ? 'border-erp-disabled-border' : 'border-erp-border'}`}>
                  <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${iconBoxClass}`}>
                    <LockKeyhole size={16} />
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-medium text-erp-text-secondary">Created On</p>

                    <p className="mt-1 break-words text-sm font-semibold text-erp-text">{formatDate(role.createdAt)}</p>
                  </div>
                </div>

                <div className={`flex min-w-0 items-start gap-3 rounded-lg border p-3 ${isInactive ? 'border-erp-disabled-border' : 'border-erp-border'}`}>
                  <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${iconBoxClass}`}>
                    <CheckCircle2 size={16} />
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-medium text-erp-text-secondary">Last Updated</p>

                    <p className="mt-1 break-words text-sm font-semibold text-erp-text">{formatDate(role.updatedAt)}</p>
                  </div>
                </div>
              </div>

              <div className="sm:col-span-2 my-3 w-fit">
                <div className={`flex items-center justify-between gap-5 rounded-lg border p-3 ${isInactive ? 'border-erp-disabled-border bg-erp-disabled-light' : 'border-erp-border bg-erp-surface'}`}>
                  <span className="text-xs font-medium text-erp-text-secondary">Current Status</span>

                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                      isInactive ? 'border-erp-disabled-border bg-erp-disabled-surface text-erp-disabled-text' : 'border-erp-success-border bg-erp-success-light text-erp-success'
                    }`}
                  >
                    {isInactive ? <Ban size={13} /> : <CircleCheck size={13} />}
                    {role.status || 'Active'}
                  </span>
                </div>
              </div>

              <div className={`mt-3 flex items-start gap-2 rounded-lg px-3 py-2.5 ${isInactive ? 'bg-erp-disabled-light' : 'bg-erp-surface-secondary/60'}`}>
                <ShieldCheck size={15} className="mt-0.5 shrink-0 text-erp-text-muted" />

                <p className="text-xs leading-5 text-erp-text-secondary">
                  {isInactive
                    ? 'This role is inactive. Its saved permissions are shown below for reference.'
                    : isPredefined
                      ? 'This is a system-defined role. Its permissions follow the system role configuration.'
                      : 'This is a custom role. Its permissions determine the actions available to assigned employees.'}
                </p>
              </div>
            </section>
          </div>

          {/* Permissions Overview */}
          <section className={`min-w-0 w-full rounded-xl border p-4 shadow-erp-card sm:p-5 ${panelClass}`}>
            <SectionHeader icon={LockKeyhole} title="Permissions Overview" description="Permissions grouped by module" inactive={isInactive} />

            {rolePermissions.length > 0 ? (
              <div className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-2">
                {Object.entries(
                  rolePermissions.reduce((groups, permission) => {
                    const module = permission.split(':')[0] || 'Other'

                    if (!groups[module]) groups[module] = []

                    groups[module].push(permission)
                    return groups
                  }, {}),
                ).map(([module, permissions]) => (
                  <div key={module} className={`min-w-0 overflow-hidden rounded-xl border ${isInactive ? 'border-erp-disabled-border bg-erp-disabled-surface' : 'border-erp-border bg-erp-surface'}`}>
                    {/* Module title */}
                    <div className={`flex items-center gap-3 border-b px-4 py-3 ${isInactive ? 'border-erp-disabled-border bg-erp-disabled-light' : 'border-erp-border bg-erp-surface-secondary/60'}`}>
                      <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${iconBoxClass}`}>
                        <LockKeyhole size={17} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-erp-text">{module}</h3>

                        <p className="mt-0.5 text-xs text-erp-text-secondary">{permissions.length} permissions</p>
                      </div>
                    </div>

                    {/* Module permissions */}
                    <div className="space-y-2 p-3">
                      {permissions.map((permission) => (
                        <div key={permission} className={`flex min-w-0 items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${isInactive ? 'border-erp-disabled-border bg-erp-disabled-light' : 'border-erp-border hover:bg-erp-hover'}`}>
                          <CheckCircle2 size={16} className={`shrink-0 ${isInactive ? 'text-erp-disabled' : 'text-erp-success'}`} />

                          <div className="min-w-0 flex-1">
                            <p className={`break-words text-xs font-semibold ${isInactive ? 'text-erp-disabled-text' : 'text-erp-text'}`}>{formatPermission(permission)}</p>

                            <p className="mt-0.5 break-all text-[10px] text-erp-text-secondary">{permission}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed border-erp-border px-4 py-8 text-center">
                <LockKeyhole size={28} className="text-erp-text-muted" />

                <p className="mt-3 text-sm font-semibold text-erp-text">No permissions found</p>

                <p className="mt-1 text-xs text-erp-text-secondary">No permissions are assigned to this role.</p>
              </div>
            )}

            <div className={`mt-4 flex items-start gap-2 rounded-lg p-3 ${isInactive ? 'bg-erp-disabled-light' : 'bg-erp-surface-secondary/60'}`}>
              <LockKeyhole size={14} className="mt-0.5 shrink-0 text-erp-text-muted" />

              <p className="text-xs text-erp-text-secondary">
                {isInactive ? 'This role is inactive. Permissions are displayed for reference.' : isPredefined ? 'Predefined role permissions are managed by the system.' : 'Use Edit to change this custom role permissions.'}
              </p>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
