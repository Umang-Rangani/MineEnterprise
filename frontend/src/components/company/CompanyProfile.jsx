import { useEffect, useState } from 'react'
import { UserRound, Mail, Phone, ShieldCheck, CalendarDays, Building2, MapPin, Warehouse, Pencil, RefreshCw, AlertCircle, Globe, BriefcaseBusiness, Hash } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import Loading from '../Loading/Loading'
import { useAuth } from '../../context/AuthContext'

const buttonBase = 'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50'

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

function getRoleLabel(user) {
  if (Array.isArray(user?.roles) && user.roles.length > 0) {
    const roles = user.roles.map((role) => (typeof role === 'string' ? role : role?.name)).filter(Boolean)

    if (roles.length > 0) return [...new Set(roles)].join(', ')
  }

  return user?.role || 'Employee'
}

function getProfilePhotoUrl(filePath) {
  if (!filePath) return ''

  if (/^https?:\/\//i.test(filePath)) return filePath

  const baseURL = axiosInstance.defaults.baseURL || ''

  return `${baseURL.replace(/\/$/, '')}/${filePath.replace(/^\//, '')}`
}

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="min-w-0 rounded-lg border border-erp-border bg-erp-surface p-3">
      <p className="mb-2 flex items-center gap-2 text-xs text-erp-text-secondary">
        {Icon && <Icon size={14} className="shrink-0" />}
        {label}
      </p>

      <p className="break-words text-sm font-semibold text-erp-text">{value || 'Not provided'}</p>
    </div>
  )
}

function SectionHeader({ icon: Icon, title, description }) {
  return (
    <div className="mb-4 flex min-w-0 items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-erp-primary-light text-erp-primary">
        <Icon size={19} />
      </div>

      <div className="min-w-0">
        <h2 className="text-sm font-bold text-erp-text">{title}</h2>
        <p className="mt-0.5 text-xs text-erp-text-secondary">{description}</p>
      </div>
    </div>
  )
}

function SectionCard({ title, description, icon: Icon, children }) {
  return (
    <section className="min-w-0 rounded-xl border border-erp-border bg-erp-surface p-4 shadow-erp-card sm:p-5">
      <SectionHeader icon={Icon} title={title} description={description} />

      {children}
    </section>
  )
}

export default function CompanyProfile() {
  const navigate = useNavigate()

  const { user: authUser } = useAuth()

  const userRoles = Array.isArray(authUser?.roles) ? authUser.roles.map((role) => (typeof role === 'string' ? role : role?.name)) : []

  const isCompanyAdmin = authUser?.role === 'CompanyAdmin' || userRoles.includes('CompanyAdmin')

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)

  function showToast(type, message) {
    setToast({ type, message })
  }

  function closeToast() {
    setToast(null)
  }

  async function fetchProfile(showRefreshMessage = false) {
    if (showRefreshMessage) {
      setRefreshing(true)
    } else if (!profile) {
      setLoading(true)
    }

    setError('')

    try {
      const response = await axiosInstance.get('/erp/profile')
      const data = response.data

      if (!data?.success || !data?.user) {
        throw new Error(data?.message || 'Unable to load profile.')
      }

      setProfile(data)

      if (showRefreshMessage) {
        showToast('success', 'Profile refreshed successfully.')
      }
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to load your profile.'

      setError(message)

      if (showRefreshMessage) {
        showToast('error', message)
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    document.title = 'My Profile | MineERP'
    fetchProfile()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const user = profile?.user || {}
  const company = profile?.company
  const defaultWarehouse = profile?.defaultWarehouse

  const assignedWarehouses = Array.isArray(profile?.assignedWarehouses) ? profile.assignedWarehouses : []

  // const breadcrumbItems = [{ title: 'My Profile', link: null }]
  const breadcrumbItems = []

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
            <Loading fullScreen={false} label="Loading your profile..." description="Please wait while we load your account information." className="!h-full min-h-[480px]" />
          </div>
        </section>
      </div>
    )
  }

  if (error && !profile) {
    return (
      <div className="min-w-0 space-y-4 text-sm">
        <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="h-1 bg-erp-primary" />

          <div className="flex min-h-16 items-center px-4 sm:px-5">
            <BreadCrumb items={breadcrumbItems} />
          </div>
        </section>

        <section className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-erp-danger-border bg-erp-surface p-5 text-center shadow-erp-card">
          <AlertCircle size={30} className="text-erp-danger" />

          <h2 className="mt-3 text-sm font-bold text-erp-text">Unable to load profile</h2>

          <p className="mt-1 max-w-md text-xs text-erp-text-secondary">{error}</p>

          <button type="button" onClick={() => fetchProfile()} className={`${buttonBase} mt-4 bg-erp-primary text-white hover:bg-erp-primary-hover`}>
            <RefreshCw size={14} />
            Try Again
          </button>
        </section>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-4 text-erp-text">
      {toast && <Toast toast={toast} onClose={closeToast} />}

      {/* Header */}
      <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        <div className="h-1 bg-erp-primary" />

        <div className="flex min-w-0 flex-col gap-4 px-4 py-3 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1 overflow-hidden">
            <BreadCrumb items={breadcrumbItems} />
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-erp-primary-light px-2.5 py-1.5 text-xs font-semibold text-erp-primary-dark">
              <UserRound size={13} />
              My Profile
            </span>

            <button type="button" onClick={() => fetchProfile(true)} disabled={refreshing} className={`${buttonBase} border border-erp-border bg-erp-surface hover:bg-erp-hover`}>
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>

            {isCompanyAdmin && (
              <button type="button" onClick={() => navigate('/company/profile/edit')} className={`${buttonBase} bg-erp-primary text-white hover:bg-erp-primary-hover`}>
                <Pencil size={14} />
                Edit Profile
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Error */}
      {error && (
        <section className="rounded-xl border border-erp-danger-border bg-erp-danger-light p-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={17} className="mt-0.5 shrink-0 text-erp-danger" />

            <div className="min-w-0">
              <h2 className="text-sm font-bold text-erp-danger">Unable to complete action</h2>

              <p className="mt-1 break-words text-xs text-erp-text">{error}</p>
            </div>
          </div>
        </section>
      )}

      {/* Profile Summary */}
      <section className="min-w-0 rounded-xl border border-erp-border bg-erp-surface p-4 shadow-erp-card sm:p-5">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-erp-border bg-erp-primary-light text-2xl font-bold text-erp-primary">
            {user.profilePhoto ? <img src={getProfilePhotoUrl(user.profilePhoto)} alt="Profile" className="h-full w-full object-cover" /> : (user.name || user.email || 'U').charAt(0).toUpperCase()}
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="break-words text-lg font-bold text-erp-text">{user.name || 'User'}</h2>

            <p className="mt-1 break-all text-xs text-erp-text-secondary">{user.email || 'Email not available'}</p>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-erp-primary-light px-2.5 py-1.5 text-[10px] font-semibold text-erp-primary-dark">
                <ShieldCheck size={12} />
                {getRoleLabel(user)}
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-md bg-erp-success-light px-2.5 py-1.5 text-[10px] font-semibold text-erp-success">
                <span className="h-1.5 w-1.5 rounded-full bg-erp-success" />
                {user.status || 'Unknown'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Personal Information */}
      <SectionCard title="Personal Information" description="Your personal contact details." icon={UserRound}>
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          <InfoItem icon={UserRound} label="Full Name" value={user.name} />

          <InfoItem icon={Mail} label="Email Address" value={user.email} />

          <InfoItem icon={Phone} label="Phone Number" value={user.phone} />
        </div>
      </SectionCard>

      {/* Account Information */}
      <SectionCard title="Account Information" description="Your MineERP account details." icon={ShieldCheck}>
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          <InfoItem icon={BriefcaseBusiness} label="Assigned Role" value={getRoleLabel(user)} />

          <InfoItem icon={ShieldCheck} label="Account Status" value={user.status} />

          <InfoItem icon={CalendarDays} label="Account Created" value={formatDate(user.createdAt)} />

          <InfoItem icon={CalendarDays} label="Last Updated" value={formatDate(user.updatedAt)} />
        </div>
      </SectionCard>

      {/* Company Information */}
      <SectionCard title="Company Information" description="Company associated with your account." icon={Building2}>
        {company ? (
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoItem icon={Building2} label="Company Name" value={company.companyName} />

            <InfoItem icon={BriefcaseBusiness} label="Business Type" value={company.businessType} />

            <InfoItem icon={Mail} label="Company Email" value={company.companyEmail} />

            <InfoItem icon={Phone} label="Company Phone" value={company.companyPhone} />

            <InfoItem icon={Globe} label="Website" value={company.website} />

            <InfoItem icon={Hash} label="GST Number" value={company.gstNumber} />

            <InfoItem icon={Hash} label="PAN Number" value={company.panNumber} />

            <InfoItem icon={MapPin} label="Address" value={[company.addressLine1, company.addressLine2, company.city, company.state, company.postalCode, company.country].filter(Boolean).join(', ')} />
          </div>
        ) : (
          <div className="flex min-h-28 items-center justify-center rounded-lg border border-dashed border-erp-border bg-erp-surface-secondary/40 px-4 py-6 text-center">
            <p className="text-xs text-erp-text-secondary">No company information is associated with this account.</p>
          </div>
        )}
      </SectionCard>

      {/* Warehouse Information */}
      <SectionCard title="Warehouse Information" description="Your default and assigned warehouse access." icon={Warehouse}>
        <div className="space-y-5">
          {/* Default Warehouse */}
          <div>
            <h3 className="mb-3 text-xs font-bold text-erp-text">Default Warehouse</h3>

            {defaultWarehouse ? (
              <div className="rounded-lg border border-erp-primary/20 bg-erp-primary-light/30 p-3 sm:p-4">
                <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                  <InfoItem icon={Warehouse} label="Warehouse Name" value={defaultWarehouse.name} />

                  <InfoItem icon={Hash} label="Warehouse Code" value={defaultWarehouse.code} />

                  <InfoItem icon={MapPin} label="Location" value={[defaultWarehouse.address, defaultWarehouse.city, defaultWarehouse.state, defaultWarehouse.pincode].filter(Boolean).join(', ')} />

                  <InfoItem icon={ShieldCheck} label="Status" value={defaultWarehouse.status} />
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-erp-border bg-erp-surface-secondary/40 px-3 py-4">
                <p className="text-xs text-erp-text-secondary">No default warehouse assigned.</p>
              </div>
            )}
          </div>

          {/* Assigned Warehouses */}
          <div>
            <h3 className="mb-3 text-xs font-bold text-erp-text">Assigned Warehouses</h3>

            {assignedWarehouses.length > 0 ? (
              <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2">
                {assignedWarehouses.map((warehouse) => (
                  <div key={warehouse._id} className="min-w-0 rounded-lg border border-erp-border bg-erp-surface p-3 sm:p-4">
                    <div className="mb-3 flex min-w-0 items-center gap-2 border-b border-erp-border pb-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-erp-primary-light text-erp-primary">
                        <Warehouse size={16} />
                      </div>

                      <h4 className="min-w-0 break-words text-sm font-bold text-erp-text">{warehouse.name || 'Warehouse'}</h4>
                    </div>

                    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                      <InfoItem icon={Hash} label="Warehouse Code" value={warehouse.code} />

                      <InfoItem icon={ShieldCheck} label="Status" value={warehouse.status} />

                      <div className="sm:col-span-2">
                        <InfoItem icon={MapPin} label="Location" value={[warehouse.address, warehouse.city, warehouse.state, warehouse.pincode].filter(Boolean).join(', ')} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-erp-border bg-erp-surface-secondary/40 px-3 py-4">
                <p className="text-xs text-erp-text-secondary">No additional warehouses assigned.</p>
              </div>
            )}
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
