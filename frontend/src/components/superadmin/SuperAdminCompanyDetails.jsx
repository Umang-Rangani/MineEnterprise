import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, RefreshCw, Building2, UserRound, Mail, Phone, Globe, MapPin, CalendarDays, ShieldCheck, FileText, BriefcaseBusiness, CreditCard, AlertCircle, LoaderCircle, CheckCircle2, Clock3, XCircle, Ban, Hash } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Loading from '../Loading/Loading'

const statusStyles = {
  Approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Pending: 'border-amber-200 bg-amber-50 text-amber-700',
  Rejected: 'border-rose-200 bg-rose-50 text-rose-700',
  Inactive: 'border-slate-200 bg-slate-100 text-slate-600',
}

const statusIcons = {
  Approved: CheckCircle2,
  Pending: Clock3,
  Rejected: XCircle,
  Inactive: Ban,
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
    .toUpperCase() || 'CO'

const getCompanyAddress = (company) => [company.addressLine1, company.addressLine2, company.city, company.state, company.postalCode, company.country].filter(Boolean).join(', ') || '—'

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

export default function SuperAdminCompanyDetails() {
  const { companyId } = useParams()
  const navigate = useNavigate()

  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [apiError, setApiError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const breadcrumbItems = [
    {
      title: 'All Companies',
      link: '/superadmin/all-companies',
    },
    {
      title: 'Company Details',
      link: null,
    },
  ]

  useEffect(() => {
    document.title = 'Company Details | MineERP'
  }, [])

  // FETCH COMPANY DETAILS

  useEffect(() => {
    let cancelled = false

    async function fetchCompanyDetails() {
      if (!hasLoaded) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }

      setApiError('')

      try {
        const response = await axiosInstance.get(`/companies/${companyId}`)

        const data = response.data

        if (data?.success === false) {
          throw new Error(data.message || 'Unable to load company details.')
        }

        if (!data?.company) {
          throw new Error('Company details not found.')
        }

        if (cancelled) return

        setCompany(data.company)
        setHasLoaded(true)
      } catch (error) {
        if (cancelled) return

        setApiError(error.response?.data?.message || error.message || 'Unable to load company details.')
      } finally {
        if (!cancelled) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    }

    if (companyId) {
      fetchCompanyDetails()
    } else {
      setApiError('Company ID is missing.')
      setLoading(false)
    }

    return () => {
      cancelled = true
    }
  }, [companyId, refreshKey])

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
            <Loading fullScreen={false} label="Loading company details" description="Please wait while we load company information." className="!h-full min-h-[480px]" />
          </div>
        </section>
      </div>
    )
  }

  // API ERROR WITHOUT COMPANY DATA

  if (!company && apiError) {
    return (
      <div className="min-w-0 space-y-4 pb-8 text-sm">
        <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="h-1 bg-erp-primary" />

          <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <BreadCrumb items={breadcrumbItems} />

            <button
              type="button"
              onClick={() => navigate('/superadmin/all-companies')}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-erp-border px-3 text-xs font-semibold text-erp-text-secondary transition hover:bg-erp-hover"
            >
              <ArrowLeft size={14} />
              Back to Companies
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-erp-border bg-erp-surface p-6 shadow-erp-card sm:p-10">
          <div className="mx-auto flex max-w-md flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <AlertCircle size={23} />
            </div>

            <h2 className="mt-4 text-base font-bold text-erp-text">Unable to load company details</h2>

            <p className="mt-2 text-sm text-erp-muted">{apiError}</p>

            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button type="button" onClick={handleRetry} className="inline-flex h-9 items-center gap-2 rounded-lg bg-erp-primary px-4 text-xs font-semibold text-white transition hover:bg-erp-primary-hover">
                <RefreshCw size={14} />
                Try Again
              </button>

              <button
                type="button"
                onClick={() => navigate('/superadmin/all-companies')}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-erp-border px-4 text-xs font-semibold text-erp-text-secondary transition hover:bg-erp-hover"
              >
                <ArrowLeft size={14} />
                Back to Companies
              </button>
            </div>
          </div>
        </section>
      </div>
    )
  }

  const StatusIcon = statusIcons[company?.status] || Clock3

  return (
    <div className="min-w-0 space-y-4 pb-8 text-sm">
      {/* HEADER */}

      <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        <div className="h-1 bg-erp-primary" />

        <div className="flex flex-col justify-between gap-3 px-4 py-3 sm:px-5 lg:flex-row lg:items-center">
          <BreadCrumb items={breadcrumbItems} />

          <div className="flex  items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/superadmin/all-companies')}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-erp-border px-3 text-xs font-semibold text-erp-text-secondary transition hover:bg-erp-hover"
            >
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

      {/* COMPANY PROFILE */}

      <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        <div className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-erp-border bg-erp-primary-light">
              {company.logo ? <img src={company.logo} alt={company.companyName || 'Company logo'} className="h-full w-full object-cover" /> : <span className="text-xl font-bold text-erp-primary">{getInitials(company.companyName)}</span>}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="break-words text-lg font-bold text-erp-text sm:text-xl">{company.companyName || 'Unnamed Company'}</h1>

                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusStyles[company.status] || statusStyles.Inactive}`}>
                  <StatusIcon size={12} />
                  {company.status || 'Unknown'}
                </span>
              </div>

              <p className="mt-1 break-all text-xs text-erp-muted">{company.companyEmail || 'No company email'}</p>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-erp-text-secondary">
                <span className="inline-flex items-center gap-1.5">
                  <BriefcaseBusiness size={13} className="text-erp-primary" />
                  {company.businessType || 'Business type not specified'}
                </span>

                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={13} className="text-erp-primary" />
                  {[company.city, company.state].filter(Boolean).join(', ') || 'Location not specified'}
                </span>

                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays size={13} className="text-erp-primary" />
                  Registered {formatDate(company.createdAt)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {refreshing && (
          <div className="flex items-center justify-center gap-2 border-t border-erp-border px-4 py-2.5 text-xs text-erp-muted">
            <LoaderCircle size={14} className="animate-spin text-erp-primary" />
            Updating company details...
          </div>
        )}
      </section>

      {/* COMPANY INFORMATION */}

      <SectionCard title="Company Information" description="Registered business details" icon={Building2}>
        <DetailItem label="Company Name" value={company.companyName} icon={Building2} />

        <DetailItem label="Business Type" value={company.businessType} icon={BriefcaseBusiness} />

        <DetailItem label="Business Category" value={company.businessCategory} icon={FileText} />

        <DetailItem label="Company Email" value={company.companyEmail} icon={Mail} breakAll />

        <DetailItem label="Company Phone" value={company.companyPhone} icon={Phone} />

        <DetailItem label="Website" value={company.website} icon={Globe} breakAll />

        <DetailItem label="Currency" value={company.currency} icon={CreditCard} />

        <DetailItem label="Company ID" value={company._id} icon={Hash} breakAll />

        <DetailItem label="Registration Date" value={formatDate(company.createdAt, true)} icon={CalendarDays} />
      </SectionCard>

      {/* OWNER INFORMATION */}

      <SectionCard title="Owner Information" description="Company administrator account details" icon={UserRound}>
        <DetailItem label="Owner Name" value={company.owner?.name} icon={UserRound} />

        <DetailItem label="Owner Email" value={company.owner?.email} icon={Mail} breakAll />

        <DetailItem label="Owner Phone" value={company.owner?.phone} icon={Phone} />

        <DetailItem label="Owner Account Status" value={company.owner?.status} icon={ShieldCheck} />

        <DetailItem label="Owner Account Created" value={formatDate(company.owner?.createdAt)} icon={CalendarDays} />
      </SectionCard>

      {/* ADDRESS INFORMATION */}

      <SectionCard title="Address Information" description="Registered company address" icon={MapPin}>
        <div className="sm:col-span-2 lg:col-span-3">
          <DetailItem label="Complete Address" value={getCompanyAddress(company)} icon={MapPin} />
        </div>

        <DetailItem label="Address Line 1" value={company.addressLine1} />

        <DetailItem label="Address Line 2" value={company.addressLine2} />

        <DetailItem label="City" value={company.city} />

        <DetailItem label="State" value={company.state} />

        <DetailItem label="Country" value={company.country} />

        <DetailItem label="Postal Code" value={company.postalCode} />
      </SectionCard>

      {/* TAX INFORMATION */}

      <SectionCard title="Tax & Registration Information" description="Business tax identification details" icon={FileText}>
        <DetailItem label="GST Number" value={company.gstNumber} icon={FileText} />

        <DetailItem label="PAN Number" value={company.panNumber} icon={CreditCard} />

        <DetailItem label="Business Category" value={company.businessCategory} icon={BriefcaseBusiness} />
      </SectionCard>

      {/* APPROVAL INFORMATION */}

      <SectionCard title="Approval Information" description="Company registration review details" icon={ShieldCheck}>
        <DetailItem label="Current Status" value={company.status} icon={StatusIcon} />

        <DetailItem label="Reviewed By" value={company.approvedBy?.name} icon={UserRound} />

        <DetailItem label="Reviewer Email" value={company.approvedBy?.email} icon={Mail} breakAll />

        <DetailItem label="Approval / Review Date" value={formatDate(company.approvedAt, true)} icon={CalendarDays} />

        <DetailItem label="Last Updated" value={formatDate(company.updatedAt, true)} icon={RefreshCw} />

        {company.rejectionReason && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 sm:col-span-2 lg:col-span-3">
            <p className="text-[11px] font-semibold text-rose-700">Rejection Reason</p>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm text-rose-800">{company.rejectionReason}</p>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
