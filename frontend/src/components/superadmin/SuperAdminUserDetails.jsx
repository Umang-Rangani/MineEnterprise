import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, RefreshCw, UserRound, Mail, Phone, Building2, CalendarDays, ShieldCheck, AlertCircle, LoaderCircle, CheckCircle2, XCircle, Ban, Hash, BriefcaseBusiness, KeyRound, Clock3, Globe, MapPin } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Loading from '../Loading/Loading'

const statusStyles = {
  Active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Inactive: 'border-slate-200 bg-slate-100 text-slate-600',
}

const statusIcons = {
  Active: CheckCircle2,
  Inactive: Ban,
}

const roleStyles = {
  CompanyAdmin: 'border-violet-200 bg-violet-50 text-violet-700',
  Employee: 'border-blue-200 bg-blue-50 text-blue-700',
}

const formatDate = (value, includeTime = false) => {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(includeTime && {
      hour: '2-digit',
      minute: '2-digit',
    }),
  })
}

const getInitials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase() || 'US'

function DetailItem({ label, value, icon: Icon, breakAll = false }) {
  return (
    <div className="min-w-0 rounded-lg border border-erp-border bg-erp-surface p-3">
      <p className="text-[11px] font-medium text-erp-muted">{label}</p>

      <div className="mt-2 flex min-w-0 items-start gap-2">
        {Icon && <Icon size={15} className="mt-0.5 shrink-0 text-erp-primary" />}

        <p className={`min-w-0 text-sm font-medium text-erp-text ${breakAll ? 'break-all' : 'break-words'}`}>{value || '—'}</p>
      </div>
    </div>
  )
}

function SectionCard({ title, description, icon: Icon, children }) {
  return (
    <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
      <div className="flex items-center gap-3 border-b border-erp-border px-4 py-3 sm:px-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-erp-primary-light text-erp-primary">
          <Icon size={17} />
        </div>

        <div className="min-w-0">
          <h2 className="text-sm font-bold text-erp-text">{title}</h2>

          {description && <p className="mt-0.5 text-[11px] text-erp-muted">{description}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-3">{children}</div>
    </section>
  )
}

export default function SuperAdminUserDetails() {
  const { userId } = useParams()
  const navigate = useNavigate()

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [apiError, setApiError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const breadcrumbItems = [
    {
      title: 'Users & Access',
      link: '/superadmin/users',
    },
    {
      title: 'User Details',
      link: null,
    },
  ]

  useEffect(() => {
    document.title = 'User Details | MineERP'
  }, [])

  // FETCH USER DETAILS

  useEffect(() => {
    let cancelled = false

    async function fetchUserDetails() {
      if (!hasLoaded) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }

      setApiError('')

      try {
        const response = await axiosInstance.get(`/superadmin/users/${userId}`)

        const data = response.data

        if (data?.success === false) {
          throw new Error(data.message || 'Unable to load user details.')
        }

        if (!data?.user) {
          throw new Error('User details not found.')
        }

        if (cancelled) return

        setUser(data.user)
        setHasLoaded(true)
      } catch (error) {
        if (cancelled) return

        setApiError(error.response?.data?.message || error.message || 'Unable to load user details.')
      } finally {
        if (!cancelled) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    }

    if (userId) {
      fetchUserDetails()
    } else {
      setApiError('User ID is missing.')
      setLoading(false)
    }

    return () => {
      cancelled = true
    }
  }, [userId, refreshKey])

  const handleRefresh = () => {
    if (refreshing || loading) return

    setRefreshKey((previous) => previous + 1)
  }

  const handleRetry = () => {
    if (refreshing || loading) return

    setRefreshKey((previous) => previous + 1)
  }

  // INITIAL LOADING

  if (loading && !hasLoaded) {
    return (
      <div className="min-w-0 space-y-4 text-sm">
        <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="h-1 bg-erp-primary" />

          <div className="flex min-h-16 items-center px-4 sm:px-5">
            <BreadCrumb items={breadcrumbItems} />
          </div>
        </section>

        <section className="relative min-h-[480px] overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex min-h-[480px] items-center justify-center">
            <Loading fullScreen={false} label="Loading user details" description="Please wait while we load user information." className="!h-full min-h-[480px]" />
          </div>
        </section>
      </div>
    )
  }

  // API ERROR WITHOUT USER DATA

  if (!user && apiError) {
    return (
      <div className="min-w-0 space-y-4 pb-8 text-sm">
        <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="h-1 bg-erp-primary" />

          <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <BreadCrumb items={breadcrumbItems} />

            <button
              type="button"
              onClick={() => navigate('/superadmin/users')}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-erp-border px-3 text-xs font-semibold text-erp-text-secondary transition hover:bg-erp-hover"
            >
              <ArrowLeft size={14} />
              Back to Users
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-erp-border bg-erp-surface p-6 shadow-erp-card sm:p-10">
          <div className="mx-auto flex max-w-md flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <AlertCircle size={23} />
            </div>

            <h2 className="mt-4 text-base font-bold text-erp-text">Unable to load user details</h2>

            <p className="mt-2 text-sm text-erp-muted">{apiError}</p>

            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button type="button" onClick={handleRetry} className="inline-flex h-9 items-center gap-2 rounded-lg bg-erp-primary px-4 text-xs font-semibold text-white transition hover:bg-erp-primary-hover">
                <RefreshCw size={14} />
                Try Again
              </button>

              <button type="button" onClick={() => navigate('/superadmin/users')} className="inline-flex h-9 items-center gap-2 rounded-lg border border-erp-border px-4 text-xs font-semibold text-erp-text-secondary transition hover:bg-erp-hover">
                <ArrowLeft size={14} />
                Back to Users
              </button>
            </div>
          </div>
        </section>
      </div>
    )
  }

  const company = user.company || {}
  const StatusIcon = statusIcons[user.status] || Clock3

  const assignedRoles = Array.isArray(user.roles) ? user.roles : []
  const permissionOverrides = Array.isArray(user.permissionOverrides) ? user.permissionOverrides : []

  return (
    <div className="min-w-0 space-y-4 pb-8 text-sm">
      {/* HEADER */}

      <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        <div className="h-1 bg-erp-primary" />

        <div className="flex flex-col justify-between gap-3 px-4 py-3 sm:px-5 lg:flex-row lg:items-center">
          <BreadCrumb items={breadcrumbItems} />

          <div className="flex items-center gap-2">
            <button type="button" onClick={() => navigate('/superadmin/users')} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-erp-border px-3 text-xs font-semibold text-erp-text-secondary transition hover:bg-erp-hover">
              <ArrowLeft size={14} />
              Back
            </button>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-erp-border px-3 text-xs font-semibold text-erp-text-secondary transition hover:bg-erp-hover disabled:opacity-60"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </section>

      {/* API ERROR DURING REFRESH */}

      {apiError && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />

          <p>{apiError}</p>

          <button type="button" onClick={handleRetry} disabled={refreshing} className="ml-auto shrink-0 font-semibold underline disabled:opacity-50">
            Retry
          </button>
        </div>
      )}

      {/* USER PROFILE */}
{/* 
      <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        <div className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-erp-border bg-erp-primary-light">
              <span className="text-xl font-bold text-erp-primary">{getInitials(user.name)}</span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="break-words text-lg font-bold text-erp-text sm:text-xl">{user.name || 'Unnamed User'}</h1>

                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusStyles[user.status] || statusStyles.Inactive}`}>
                  <StatusIcon size={12} />
                  {user.status || 'Unknown'}
                </span>

                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold ${roleStyles[user.role] || 'border-slate-200 bg-slate-50 text-slate-700'}`}>{user.role || 'Unknown Role'}</span>
              </div>

              <p className="mt-1 break-all text-xs text-erp-muted">{user.email || 'No email address'}</p>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-erp-text-secondary">
                <span className="inline-flex items-center gap-1.5">
                  <Phone size={13} className="text-erp-primary" />
                  {user.phone || 'No phone number'}
                </span>

                <span className="inline-flex items-center gap-1.5">
                  <Building2 size={13} className="text-erp-primary" />
                  {company.companyName || 'No company assigned'}
                </span>

                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays size={13} className="text-erp-primary" />
                  Joined {formatDate(user.createdAt)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {refreshing && (
          <div className="flex items-center justify-center gap-2 border-t border-erp-border px-4 py-2.5 text-xs text-erp-muted">
            <LoaderCircle size={14} className="animate-spin text-erp-primary" />
            Updating user details...
          </div>
        )}
      </section> */}

      {/* USER INFORMATION */}

      <SectionCard title="User Information" description="Personal and account information" icon={UserRound}>
        <DetailItem label="Full Name" value={user.name} icon={UserRound} />

        <DetailItem label="Email Address" value={user.email} icon={Mail} breakAll />

        <DetailItem label="Phone Number" value={user.phone} icon={Phone} />

        <DetailItem label="Primary Role" value={user.role} icon={ShieldCheck} />

        <DetailItem label="Account Status" value={user.status} icon={StatusIcon} />

        <DetailItem label="User ID" value={user._id} icon={Hash} breakAll />

        <DetailItem label="Account Created" value={formatDate(user.createdAt, true)} icon={CalendarDays} />

        <DetailItem label="Last Updated" value={formatDate(user.updatedAt, true)} icon={RefreshCw} />
      </SectionCard>

      {/* COMPANY INFORMATION */}

      <SectionCard title="Company Information" description="Company associated with this user account" icon={Building2}>
        <DetailItem label="Company Name" value={company.companyName} icon={Building2} />

        <DetailItem label="Company Email" value={company.companyEmail} icon={Mail} breakAll />

        <DetailItem label="Business Type" value={company.businessType} icon={BriefcaseBusiness} />

        <DetailItem label="Company Status" value={company.status} icon={ShieldCheck} />

        <DetailItem label="Company ID" value={company._id} icon={Hash} breakAll />

        <DetailItem label="Website" value={company.website} icon={Globe} breakAll />

        <DetailItem label="Location" value={[company.city, company.state, company.country].filter(Boolean).join(', ')} icon={MapPin} />
      </SectionCard>

      {/* ASSIGNED ROLES */}

      <SectionCard title="Assigned Roles" description="Roles currently assigned to this user" icon={ShieldCheck}>
        {assignedRoles.length > 0 ? (
          <div className="sm:col-span-2 lg:col-span-3">
            <div className="flex flex-wrap gap-2">
              {assignedRoles.map((role, index) => (
                <div key={role.customRoleId || `${role.name}-${index}`} className="inline-flex items-center gap-2 rounded-lg border border-erp-border bg-erp-hover px-3 py-2">
                  <ShieldCheck size={14} className="text-erp-primary" />

                  <span className="text-xs font-semibold text-erp-text">{role.name || 'Unnamed Role'}</span>

                  <span className="rounded-full bg-erp-primary-light px-2 py-0.5 text-[10px] font-medium text-erp-primary">{role.type || 'Role'}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="sm:col-span-2 lg:col-span-3">
            <p className="rounded-lg border border-dashed border-erp-border p-4 text-center text-xs text-erp-muted">No additional roles assigned to this user.</p>
          </div>
        )}
      </SectionCard>

      {/* PERMISSION OVERRIDES */}

      <SectionCard title="Permission Overrides" description="Individual permission overrides configured for this user" icon={KeyRound}>
        {permissionOverrides.length > 0 ? (
          <div className="sm:col-span-2 lg:col-span-3">
            <div className="flex flex-wrap gap-2">
              {permissionOverrides.map((permission, index) => (
                <span key={`${permission}-${index}`} className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-medium text-violet-700">
                  {permission}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="sm:col-span-2 lg:col-span-3">
            <p className="rounded-lg border border-dashed border-erp-border p-4 text-center text-xs text-erp-muted">No individual permission overrides configured.</p>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
