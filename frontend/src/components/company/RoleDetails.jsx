import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ShieldCheck, LockKeyhole, RefreshCw, Pencil, CheckCircle2, Users, FileText, Settings2, AlertCircle } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'

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
    return permissions.map((permission) => (typeof permission === 'string' ? permission : permission?.key || permission?.name || '')).filter(Boolean)
  }

  if (permissions && typeof permissions === 'object') {
    return Object.entries(permissions).flatMap(([section, actions]) => {
      if (!Array.isArray(actions)) return []

      return actions
        .map((action) => {
          if (typeof action !== 'string') {
            return action?.key || action?.name || ''
          }

          return action.includes(':') ? action : `${section}:${action}`
        })
        .filter(Boolean)
    })
  }

  return []
}

function SectionCard({ icon: Icon, title, description, action, children }) {
  return (
    <section className="min-w-0 rounded-xl border border-erp-border bg-erp-surface p-3 shadow-erp-card sm:p-4">
      <div className="mb-3 flex min-w-0 items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-erp-primary-light text-erp-primary">
          <Icon size={18} />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-erp-text">{title}</h2>
          <p className="mt-0.5 text-xs text-erp-text-secondary">{description}</p>
        </div>

        {action}
      </div>

      {children}
    </section>
  )
}

function DetailItem({ label, value, icon: Icon }) {
  return (
    <div className="min-w-0">
      <p className="mb-1.5 text-xs font-semibold text-erp-text-secondary">{label}</p>

      <div className="flex min-h-10 min-w-0 items-center gap-2 rounded-lg border border-erp-border bg-erp-surface-secondary/40 px-3 py-2">
        {Icon && <Icon size={15} className="shrink-0 text-erp-text-muted" />}

        <span className="min-w-0 break-words text-sm font-medium text-erp-text">{value || 'Not provided'}</span>
      </div>
    </div>
  )
}

export default function RoleDetails() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [role, setRole] = useState(null)
  const [availablePermissions, setAvailablePermissions] = useState({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(false)
  const [toast, setToast] = useState(null)

  const isPredefined = role?.type === 'Predefined'
  const rolePermissions = getRolePermissions(role)

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
      const response = await axiosInstance.get('/erp/roles')
      const data = response.data

      if (!data?.success) {
        throw new Error(data?.message || 'Unable to load role details.')
      }

      const decodedId = decodeURIComponent(id || '')
      const roles = Array.isArray(data.roles) ? data.roles : []

      const matchedRole = roles.find((item) => String(item._id || '') === decodedId || String(item.name || '') === decodedId)

      if (!matchedRole) {
        setRole(null)
        setError(true)
        showToast('error', 'Role not found or you do not have access.')
        return
      }

      setRole(matchedRole)
      setAvailablePermissions(data.availablePermissions || {})

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

    // Fetch role details whenever the route ID changes.
  }, [id])

  function handleEdit() {
    if (!role || isPredefined) return

    navigate(`/company/roles/${encodeURIComponent(role._id || role.name)}/edit`, {
      state: {
        role,
        availablePermissions,
        isPredefined,
      },
    })
  }

  function handleBack() {
    navigate('/company/roles')
  }

  const breadcrumbItems = [
    { title: 'Roles & Permissions', link: '/company/roles' },
    { title: role?.name || 'Role Details', link: null },
  ]

  if (loading) {
    return (
      <div className="min-w-0 space-y-3 text-erp-text">
        {toast && <Toast toast={toast} onClose={closeToast} />}

        <div className="flex min-h-10 items-center">
          <BreadCrumb items={breadcrumbItems} />
        </div>

        <div className="animate-pulse space-y-3">
          <div className="h-28 rounded-xl border border-erp-border bg-erp-surface" />

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <div className="h-56 rounded-xl border border-erp-border bg-erp-surface" />
            <div className="h-56 rounded-xl border border-erp-border bg-erp-surface" />
            <div className="h-64 rounded-xl border border-erp-border bg-erp-surface" />
            <div className="h-64 rounded-xl border border-erp-border bg-erp-surface" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-3 text-erp-text">
      {toast && <Toast toast={toast} onClose={closeToast} />}

      {/* Breadcrumb and actions */}
      <div className="flex min-h-10 min-w-0 flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
      
          <div className="min-w-0 flex-1 overflow-hidden">
            <BreadCrumb items={breadcrumbItems} />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={() => fetchRole(true)} disabled={refreshing} className={`${buttonBase} border border-erp-border bg-erp-surface hover:bg-erp-hover`}>
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>

          {role && !isPredefined && (
            <button type="button" onClick={handleEdit} className={`${buttonBase} bg-erp-primary text-white hover:bg-erp-primary-hover`}>
              <Pencil size={14} />
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Error / not found */}
      {error || !role ? (
        <section className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-erp-border bg-erp-surface p-5 text-center shadow-erp-card">
          <AlertCircle size={32} className="text-erp-text-muted" />

          <h2 className="mt-3 text-sm font-bold">Role details unavailable</h2>

          <p className="mt-1 max-w-md text-xs text-erp-text-secondary">Check your access or refresh the role details to try again.</p>

          <button type="button" onClick={() => fetchRole()} className={`${buttonBase} mt-4 bg-erp-primary text-white hover:bg-erp-primary-hover`}>
            <RefreshCw size={14} />
            Try Again
          </button>
        </section>
      ) : (
        <>
          {/* Role profile summary */}
          <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
            <div className="h-1 bg-erp-primary" />

            <div className="flex min-w-0 flex-col justify-between gap-3 p-3 sm:flex-row sm:items-center sm:p-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary sm:h-16 sm:w-16">
                  <ShieldCheck size={30} strokeWidth={1.5} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="break-words text-base font-bold sm:text-lg">{role.name || 'Unnamed Role'}</h1>

                    <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${isPredefined ? 'bg-erp-primary-light text-erp-primary-dark' : 'bg-erp-success-light text-erp-success'}`}>{role.type || 'Custom'}</span>
                  </div>

                  <p className="mt-1 break-words text-xs text-erp-text-secondary">{role.description || 'No description provided.'}</p>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-md bg-erp-primary-light px-2 py-1 text-[11px] font-semibold text-erp-primary-dark">
                      <LockKeyhole size={12} />
                      {rolePermissions.length} permissions
                    </span>

                    <span className="inline-flex items-center gap-1 rounded-md border border-erp-border bg-erp-surface-secondary px-2 py-1 text-[11px] font-medium text-erp-text-secondary">
                      <Users size={12} />
                      {isPredefined ? 'System Role' : 'Company Role'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="grid min-w-0 grid-cols-1 items-start gap-3 xl:grid-cols-2">
            {/* Role information */}
            <SectionCard icon={ShieldCheck} title="Role Information" description="Basic role details.">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DetailItem label="Role Name" value={role.name} icon={ShieldCheck} />

                <DetailItem label="Role Type" value={role.type || 'Custom'} icon={Settings2} />

                <div className="sm:col-span-2">
                  <DetailItem label="Description" value={role.description || 'No description provided.'} icon={FileText} />
                </div>
              </div>

              <p className="mt-3 text-[11px] text-erp-text-muted">{isPredefined ? 'This is a predefined system role.' : 'Use Edit to update this custom role.'}</p>
            </SectionCard>

            {/* Permission summary */}
            <SectionCard
              icon={LockKeyhole}
              title="Permission Summary"
              description="Overview of assigned access."
              action={<span className="shrink-0 rounded-md bg-erp-primary-light px-2 py-1 text-[10px] font-semibold text-erp-primary-dark">{rolePermissions.length} total</span>}
            >
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-erp-border p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-erp-primary-light text-erp-primary">
                      <LockKeyhole size={16} />
                    </div>

                    <span className="text-xs text-erp-text-secondary">Permissions</span>
                  </div>

                  <p className="mt-3 text-xl font-bold">{rolePermissions.length}</p>
                </div>

                <div className="rounded-lg border border-erp-border p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-erp-success-light text-erp-success">
                      <CheckCircle2 size={16} />
                    </div>

                    <span className="text-xs text-erp-text-secondary">Role Type</span>
                  </div>

                  <p className="mt-3 break-words text-sm font-bold">{isPredefined ? 'Predefined' : 'Custom'}</p>
                </div>
              </div>

              <div className="mt-3 rounded-lg bg-erp-surface-secondary/60 p-2.5">
                <p className="text-xs text-erp-text-secondary">
                  <ShieldCheck size={14} className="mr-1 inline text-erp-text-muted" />
                  {isPredefined ? 'Permissions are determined by the system role configuration.' : 'Permissions define the actions available to employees assigned this role.'}
                </p>
              </div>
            </SectionCard>

            {/* Permissions list */}
            <div className="xl:col-span-2">
              <SectionCard
                icon={LockKeyhole}
                title="Permissions Overview"
                description="Actions assigned to this role."
                action={<span className="shrink-0 rounded-md border border-erp-border bg-erp-surface-secondary px-2 py-1 text-[10px] font-semibold text-erp-text-secondary">Read only</span>}
              >
                {rolePermissions.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-erp-border px-3 py-8 text-center">
                    <LockKeyhole size={26} className="mx-auto text-erp-text-muted" />

                    <p className="mt-2 text-sm font-semibold">No permissions found</p>

                    <p className="mt-1 text-xs text-erp-text-secondary">This API response does not contain any permissions for this role.</p>
                  </div>
                ) : (
                  <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {rolePermissions.map((permission, index) => (
                      <div key={`${permission}-${index}`} className="flex min-w-0 items-start gap-2.5 rounded-lg border border-erp-border p-3 transition-colors hover:bg-erp-hover">
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-erp-success-light text-erp-success">
                          <CheckCircle2 size={15} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="break-words text-xs font-semibold text-erp-text">{formatPermission(permission)}</p>

                          <p className="mt-1 break-all text-[10px] text-erp-text-secondary">{permission}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <p className="mt-3 text-[11px] text-erp-text-muted">{isPredefined ? 'Predefined role permissions are managed by the system.' : 'Use Edit to change this custom role permissions.'}</p>
              </SectionCard>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
