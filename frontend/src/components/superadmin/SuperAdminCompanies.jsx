import { useEffect, useMemo, useState } from 'react'
import { Building2, CheckCircle2, Clock3, RefreshCw, Search, XCircle, MapPin, Mail, Phone, Globe, AlertCircle, X, Eye, CalendarDays, FileText, UserRound, BriefcaseBusiness, Hash, FilterX } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import Loading from '../Loading/Loading'

const formatDate = (date) => {
  if (!date) return '—'

  const parsedDate = new Date(date)

  return Number.isNaN(parsedDate.getTime())
    ? '—'
    : parsedDate.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
}

const formatNumber = (value) =>
  new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)

const DetailItem = ({ icon: Icon, label, value }) => (
  <div className="flex min-w-0 items-start gap-2 rounded-lg border border-erp-border bg-erp-surface p-2.5">
    <Icon size={14} className="mt-0.5 shrink-0 text-erp-muted" />

    <div className="min-w-0">
      <p className="text-[10px] font-medium text-erp-text-secondary">{label}</p>

      <p className="mt-0.5 break-words text-xs font-semibold text-erp-text">{value || '—'}</p>
    </div>
  </div>
)

export default function SuperAdminCompanies() {
  const [companies, setCompanies] = useState([])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)

  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const [actionLoading, setActionLoading] = useState('')
  const [message, setMessage] = useState('')
  const [actionError, setActionError] = useState('')

  const [viewCompany, setViewCompany] = useState(null)
  const [rejectingCompany, setRejectingCompany] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')

  const [toast, setToast] = useState(null)

  const breadcrumbItems = [
    {
      title: 'Company Registrations',
      link: null,
    },
  ]

  const showToast = (type, toastMessage) => {
    setToast({
      id: Date.now(),
      type,
      message: toastMessage,
      duration: 3000,
    })
  }

  // FETCH COMPANIES

  const fetchCompanies = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await axiosInstance.get('/companies/pending')

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to load companies.')
      }

      setCompanies(Array.isArray(response.data.companies) ? response.data.companies : [])
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to load pending companies.')
    } finally {
      setLoading(false)
      setHasLoaded(true)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    document.title = 'Company Registrations | MineERP'

    fetchCompanies()
  }, [refreshKey])

  // SEARCH

  const filteredCompanies = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) return companies

    return companies.filter((company) =>
      [company.companyName, company.companyEmail, company.companyPhone, company.businessType, company.businessCategory, company.owner?.name, company.owner?.email, company.city, company.state, company.country, company.gstNumber, company.panNumber]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    )
  }, [companies, search])

  // REFRESH

  const handleRefresh = () => {
    if (loading || refreshing || actionLoading) return

    setRefreshing(true)
    setRefreshKey((previous) => previous + 1)
  }

  // COMPANY REVIEW

  const reviewCompany = async (company, action, reason = '') => {
    if (!company?._id) return

    setActionLoading(company._id)
    setMessage('')
    setActionError('')

    try {
      const payload =
        action === 'Reject'
          ? {
              action,
              rejectionReason: reason.trim(),
            }
          : { action }

      const response = await axiosInstance.patch(`/companies/${company._id}/review`, payload)

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to review company.')
      }

      setCompanies((previous) => previous.filter((item) => item._id !== company._id))

      const successMessage = response.data.message || `Company ${action === 'Approve' ? 'approved' : 'rejected'} successfully.`

      setMessage(successMessage)
      showToast('success', successMessage)

      setViewCompany(null)
      setRejectingCompany(null)
      setRejectionReason('')
    } catch (err) {
      setActionError(err.response?.data?.message || err.message || 'Unable to review company.')
    } finally {
      setActionLoading('')
    }
  }

  const handleApprove = (company) => {
    if (!window.confirm(`Are you sure you want to approve ${company.companyName}?`)) {
      return
    }

    reviewCompany(company, 'Approve')
  }

  const handleReject = (event) => {
    event.preventDefault()

    if (!rejectionReason.trim()) {
      setActionError('Please provide a rejection reason.')
      return
    }

    reviewCompany(rejectingCompany, 'Reject', rejectionReason)
  }

  // DIALOG ACTIONS

  const openRejectDialog = (company) => {
    setViewCompany(null)
    setRejectingCompany(company)
    setRejectionReason('')
    setActionError('')
    setMessage('')
  }

  const closeRejectDialog = () => {
    if (actionLoading) return

    setRejectingCompany(null)
    setRejectionReason('')
    setActionError('')
  }

  const openCompanyDetails = (company) => {
    setViewCompany(company)
    setActionError('')
    setMessage('')
  }

  const resetSearch = () => {
    setSearch('')
  }

  // SUMMARY

  const summaryCards = [
    {
      title: 'Total Pending',
      value: companies.length,
      icon: Building2,
      color: 'text-violet-700',
      border: 'border-violet-200',
    },
    {
      title: 'Matched Results',
      value: filteredCompanies.length,
      icon: Search,
      color: 'text-emerald-700',
      border: 'border-emerald-200',
    },
  ]

  // INITIAL LOADING

  if (loading && !hasLoaded) {
    return (
      <div className="min-w-0 space-y-4 text-sm">
        <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card h-17">
          <div className="h-1 bg-erp-primary" />

          <div className="flex min-h-16 items-center px-4 sm:px-5">
            <BreadCrumb items={breadcrumbItems} />
          </div>
        </section>

        <section className="relative min-h-[480px] overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex min-h-[480px] items-center justify-center">
            <Loading fullScreen={false} label="Loading companies" description="Please wait while we load pending company registrations." className="!h-full min-h-[480px]" />
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-4 pb-8 text-sm">
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      {/* HEADER */}

      <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        <div className="h-1 bg-erp-primary" />

        <div className="flex flex-col justify-between gap-3 px-4 py-3 sm:px-5 lg:flex-row lg:items-center">
          <BreadCrumb items={breadcrumbItems} />

          <div className="flex items-center gap-2">
            {summaryCards.map((card) => {
              const Icon = card.icon

              return (
                <div key={card.title} title={card.title} className={`flex h-9 items-center gap-2 whitespace-nowrap rounded-lg border ${card.border} px-3`}>
                  <Icon size={15} className={card.color} />

                  <span className={`hidden text-xs font-medium lg:inline ${card.color}`}>{card.title}</span>

                  <span className="text-sm font-bold text-erp-text">{formatNumber(card.value)}</span>
                </div>
              )
            })}

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing || loading || Boolean(actionLoading)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-erp-border px-3 text-xs font-semibold text-erp-text-secondary transition hover:bg-erp-hover disabled:opacity-60"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />

              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </section>

      {/* SUCCESS MESSAGE */}

      {message && (
        <div className="flex items-start gap-2 rounded-lg border border-erp-success-border bg-erp-success-light px-3 py-2.5 text-xs text-erp-success">
          <CheckCircle2 size={15} className="mt-0.5 shrink-0" />

          <p className="flex-1">{message}</p>

          <button type="button" onClick={() => setMessage('')} aria-label="Dismiss success message" className="shrink-0">
            <X size={15} />
          </button>
        </div>
      )}

      {/* ACTION ERROR */}

      {actionError && !rejectingCompany && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-erp-danger-border bg-erp-danger-light px-3 py-2.5 text-xs text-erp-danger">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />

          <p className="flex-1">{actionError}</p>

          <button type="button" onClick={() => setActionError('')} aria-label="Dismiss error" className="shrink-0">
            <X size={15} />
          </button>
        </div>
      )}

      {/* COMPANIES TABLE */}

      <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        {/* FILTERS */}

        <div className="flex flex-col gap-3 border-b border-erp-border p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 gap-2">
            <div className="relative min-w-0 flex-1 lg:w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search company, owner or GST..."
                aria-label="Search companies"
                className="h-9 w-full rounded-lg border border-erp-border bg-erp-surface pl-9 pr-3 text-xs text-erp-text outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10 sm:text-sm"
              />
            </div>

            {search.trim() && (
              <button type="button" onClick={resetSearch} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-erp-border px-3 text-xs font-semibold text-erp-text-secondary transition hover:bg-erp-hover">
                <FilterX size={14} />
                Clear
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 text-xs font-semibold text-amber-700">
              <Clock3 size={14} />
              Pending Review
            </span>
          </div>
        </div>

        {/* FETCH ERROR */}

        {error && (
          <div role="alert" className="flex items-start gap-2 border-b border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />

            <p className="flex-1">{error}</p>

            <button type="button" onClick={handleRefresh} disabled={refreshing || loading} className="ml-auto shrink-0 font-semibold underline disabled:opacity-50">
              Retry
            </button>
          </div>
        )}

        {/* REFRESH STATUS */}

        {refreshing && hasLoaded && (
          <div className="flex items-center justify-center gap-2 border-b border-erp-border px-4 py-3 text-xs text-erp-muted">
            <RefreshCw size={15} className="animate-spin text-erp-primary" />
            Updating company registrations...
          </div>
        )}

        {/* SEARCH SCOPE */}

        {search.trim() && <div className="border-b border-erp-border bg-slate-50/70 px-4 py-2 text-xs text-erp-text-secondary">Showing {formatNumber(filteredCompanies.length)} matching pending registrations.</div>}

        {/* DESKTOP TABLE */}

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[1000px] text-left">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-100">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Company</th>

                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Owner</th>

                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Contact</th>

                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Registered Date</th>

                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</th>

                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredCompanies.map((company) => (
                <tr key={company._id} className="transition hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-erp-primary-light text-xs font-bold text-erp-primary">
                        <Building2 size={17} />
                      </div>

                      <div className="min-w-0">
                        <p className="max-w-44 truncate text-xs font-semibold text-erp-text sm:text-sm">{company.companyName || 'Unnamed Company'}</p>

                        <p className="mt-0.5 max-w-44 truncate text-[10px] text-erp-muted">{company.businessType || 'Business type not provided'}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <p className="max-w-40 truncate text-xs font-medium text-erp-text">{company.owner?.name || '—'}</p>

                    <p className="mt-0.5 max-w-40 truncate text-[10px] text-erp-muted">{company.owner?.email || '—'}</p>
                  </td>

                  <td className="px-4 py-3">
                    <p className="max-w-44 truncate text-xs text-erp-text">{company.companyEmail || '—'}</p>

                    <p className="mt-0.5 text-[10px] text-erp-muted">{company.companyPhone || '—'}</p>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 whitespace-nowrap text-xs text-slate-600">
                      <CalendarDays size={13} className="shrink-0 text-slate-400" />

                      {formatDate(company.createdAt)}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700">
                      <Clock3 size={11} />
                      Pending
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        title="View company"
                        aria-label={`View ${company.companyName || 'company'}`}
                        onClick={() => openCompanyDetails(company)}
                        className="rounded-lg p-2 text-slate-500 transition hover:bg-erp-primary-light hover:text-erp-primary"
                      >
                        <Eye size={15} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApprove(company)}
                        disabled={Boolean(actionLoading)}
                        title="Approve company"
                        aria-label={`Approve ${company.companyName}`}
                        className="rounded-lg p-2 text-emerald-600 transition hover:bg-emerald-50 disabled:opacity-50"
                      >
                        {actionLoading === company._id ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                      </button>

                      <button
                        type="button"
                        onClick={() => openRejectDialog(company)}
                        disabled={Boolean(actionLoading)}
                        title="Reject company"
                        aria-label={`Reject ${company.companyName}`}
                        className="rounded-lg p-2 text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                      >
                        <XCircle size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredCompanies.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-14 text-center">
                    <Building2 size={26} className="mx-auto text-slate-400" />

                    <h3 className="mt-3 text-sm font-bold text-erp-text">{companies.length === 0 ? 'No pending companies' : 'No matching companies'}</h3>

                    <p className="mt-1 text-xs text-erp-muted">{companies.length === 0 ? 'New company registrations will appear here.' : 'Try changing your search.'}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE COMPANY CARDS */}

        <div className="divide-y divide-slate-100 md:hidden">
          {filteredCompanies.map((company) => (
            <article key={company._id} className="space-y-3 p-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-erp-primary-light text-erp-primary">
                  <Building2 size={18} />
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="break-words text-sm font-semibold text-erp-text">{company.companyName || 'Unnamed Company'}</h3>

                  <p className="mt-1 break-all text-xs text-erp-muted">{company.companyEmail || '—'}</p>

                  <p className="mt-1 text-xs text-slate-600">{company.owner?.name || '—'}</p>
                </div>

                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700">
                  <Clock3 size={11} />
                  Pending
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3">
                <div>
                  <p className="text-[10px] text-slate-500">Business Type</p>

                  <p className="mt-1 text-xs font-medium text-slate-700">{company.businessType || '—'}</p>
                </div>

                <div>
                  <p className="text-[10px] text-slate-500">Registered Date</p>

                  <p className="mt-1 text-xs font-medium text-slate-700">{formatDate(company.createdAt)}</p>
                </div>

                <div className="col-span-2 border-t border-slate-200 pt-2">
                  <p className="text-[10px] text-slate-500">Contact</p>

                  <p className="mt-1 break-all text-xs font-medium text-slate-700">{company.companyPhone || '—'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 border-t border-slate-100 pt-2">
                <button
                  type="button"
                  onClick={() => openCompanyDetails(company)}
                  className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-erp-border text-xs font-semibold text-slate-700 transition hover:bg-erp-hover"
                >
                  <Eye size={14} />
                  View Details
                </button>

                <button
                  type="button"
                  onClick={() => handleApprove(company)}
                  disabled={Boolean(actionLoading)}
                  className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-50 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                >
                  {actionLoading === company._id ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  Approve
                </button>

                <button
                  type="button"
                  onClick={() => openRejectDialog(company)}
                  disabled={Boolean(actionLoading)}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
                  aria-label={`Reject ${company.companyName}`}
                >
                  <XCircle size={15} />
                </button>
              </div>
            </article>
          ))}

          {filteredCompanies.length === 0 && (
            <div className="px-4 py-12 text-center">
              <Building2 size={26} className="mx-auto text-slate-400" />

              <h3 className="mt-3 text-sm font-semibold text-erp-text">{companies.length === 0 ? 'No pending companies' : 'No matching companies'}</h3>

              <p className="mt-1 text-xs text-erp-muted">{companies.length === 0 ? 'New company registrations will appear here.' : 'Try changing your search.'}</p>

              {search.trim() && (
                <button type="button" onClick={resetSearch} className="mt-3 text-xs font-semibold text-erp-primary">
                  Clear Search
                </button>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}

        <div className="flex flex-col gap-2 border-t border-erp-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <p className="text-xs text-erp-text-secondary">
            Showing <span className="font-semibold text-erp-text">{formatNumber(filteredCompanies.length)}</span> of <span className="font-semibold text-erp-text">{formatNumber(companies.length)}</span> pending companies
          </p>

          <p className="text-[10px] text-erp-muted">Use View Details to see complete registration information.</p>
        </div>
      </section>

      {/* COMPANY DETAILS MODAL */}

      {viewCompany && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-3 backdrop-blur-[2px]" onClick={() => setViewCompany(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="company-details-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-erp-border bg-erp-surface shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            {/* MODAL HEADER */}

            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-erp-border bg-erp-surface px-4 py-3">
              <div>
                <h3 id="company-details-title" className="text-sm font-bold text-erp-text">
                  Company Details
                </h3>

                <p className="mt-0.5 text-[10px] text-erp-text-secondary">Complete company registration information</p>
              </div>

              <button type="button" onClick={() => setViewCompany(null)} className="flex h-8 w-8 items-center justify-center rounded-lg text-erp-text-secondary transition hover:bg-erp-hover" aria-label="Close company details">
                <X size={17} />
              </button>
            </div>

            <div className="space-y-4 p-4">
              {/* COMPANY IDENTITY */}

              <div className="flex flex-col gap-3 rounded-lg border border-erp-border bg-erp-hover/40 p-3 sm:flex-row sm:items-center">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-erp-primary-light text-erp-primary">
                  <Building2 size={21} />
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className="break-words text-sm font-bold text-erp-text">{viewCompany.companyName || 'Unnamed Company'}</h4>

                  <p className="mt-0.5 text-[10px] text-erp-text-secondary">{viewCompany.businessCategory || 'Business category not specified'}</p>
                </div>

                <span className="w-fit rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700">Pending</span>
              </div>

              {/* BUSINESS INFORMATION */}

              <section>
                <h4 className="mb-2 flex items-center gap-1.5 text-xs font-bold text-erp-text">
                  <BriefcaseBusiness size={14} className="text-erp-primary" />
                  Business Information
                </h4>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <DetailItem icon={Building2} label="Company Name" value={viewCompany.companyName} />

                  <DetailItem icon={BriefcaseBusiness} label="Business Type" value={viewCompany.businessType} />

                  <DetailItem icon={FileText} label="Business Category" value={viewCompany.businessCategory} />

                  <DetailItem icon={Mail} label="Company Email" value={viewCompany.companyEmail} />

                  <DetailItem icon={Phone} label="Company Phone" value={viewCompany.companyPhone} />

                  <DetailItem icon={Globe} label="Website" value={viewCompany.website} />
                </div>
              </section>

              {/* OWNER INFORMATION */}

              <section>
                <h4 className="mb-2 flex items-center gap-1.5 text-xs font-bold text-erp-text">
                  <UserRound size={14} className="text-erp-primary" />
                  Owner Information
                </h4>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <DetailItem icon={UserRound} label="Owner Name" value={viewCompany.owner?.name} />

                  <DetailItem icon={Mail} label="Owner Email" value={viewCompany.owner?.email} />

                  <DetailItem icon={Phone} label="Owner Phone" value={viewCompany.owner?.phone} />
                </div>
              </section>

              {/* ADDRESS INFORMATION */}

              <section>
                <h4 className="mb-2 flex items-center gap-1.5 text-xs font-bold text-erp-text">
                  <MapPin size={14} className="text-erp-primary" />
                  Address Information
                </h4>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <DetailItem icon={MapPin} label="Address Line 1" value={viewCompany.addressLine1} />

                  <DetailItem icon={MapPin} label="Address Line 2" value={viewCompany.addressLine2} />

                  <DetailItem icon={MapPin} label="City" value={viewCompany.city} />

                  <DetailItem icon={MapPin} label="State" value={viewCompany.state} />

                  <DetailItem icon={Globe} label="Country" value={viewCompany.country} />

                  <DetailItem icon={Hash} label="Postal Code" value={viewCompany.postalCode} />
                </div>
              </section>

              {/* TAX INFORMATION */}

              <section>
                <h4 className="mb-2 flex items-center gap-1.5 text-xs font-bold text-erp-text">
                  <FileText size={14} className="text-erp-primary" />
                  Tax & Registration
                </h4>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <DetailItem icon={FileText} label="GST Number" value={viewCompany.gstNumber} />

                  <DetailItem icon={FileText} label="PAN Number" value={viewCompany.panNumber} />

                  <DetailItem icon={Hash} label="Currency" value={viewCompany.currency} />

                  <DetailItem icon={CalendarDays} label="Registration Date" value={formatDate(viewCompany.createdAt)} />

                  <DetailItem icon={CalendarDays} label="Last Updated" value={formatDate(viewCompany.updatedAt)} />

                  <DetailItem icon={Clock3} label="Application Status" value={viewCompany.status || 'Pending'} />
                </div>
              </section>

              {/* ACTION ERROR */}

              {actionError && (
                <div className="flex items-start gap-2 rounded-lg border border-erp-danger-border bg-erp-danger-light p-3 text-xs text-erp-danger">
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              {/* MODAL FOOTER */}

              <div className="flex flex-col-reverse justify-between gap-2 border-t border-erp-border pt-3 sm:flex-row">
                <button type="button" onClick={() => setViewCompany(null)} className="h-8 rounded-lg border border-erp-border px-4 text-xs font-semibold text-erp-text transition hover:bg-erp-hover">
                  Close Details
                </button>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => openRejectDialog(viewCompany)}
                    disabled={Boolean(actionLoading)}
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                  >
                    <XCircle size={14} />
                    Reject
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApprove(viewCompany)}
                    disabled={Boolean(actionLoading)}
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-erp-primary px-3 text-xs font-semibold text-white transition hover:bg-erp-primary-hover disabled:opacity-50"
                  >
                    {actionLoading === viewCompany._id ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    Approve Company
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REJECT COMPANY MODAL */}

      {rejectingCompany && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-3 backdrop-blur-[2px]"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeRejectDialog()
            }
          }}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="reject-company-title" className="w-full max-w-md rounded-xl border border-erp-border bg-erp-surface p-4 shadow-2xl sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="reject-company-title" className="text-sm font-bold text-erp-text">
                  Reject Company
                </h2>

                <p className="mt-1 text-xs text-erp-text-secondary">{rejectingCompany.companyName}</p>
              </div>

              <button type="button" onClick={closeRejectDialog} disabled={Boolean(actionLoading)} className="rounded-lg p-1.5 text-erp-text-secondary transition hover:bg-erp-hover disabled:opacity-50" aria-label="Close rejection dialog">
                <X size={17} />
              </button>
            </div>

            <form onSubmit={handleReject} className="mt-4 space-y-3">
              <div>
                <label htmlFor="rejectionReason" className="mb-1.5 block text-xs font-semibold text-erp-text">
                  Rejection Reason <span className="text-erp-danger">*</span>
                </label>

                <textarea
                  id="rejectionReason"
                  value={rejectionReason}
                  onChange={(event) => setRejectionReason(event.target.value)}
                  rows={4}
                  maxLength={1000}
                  required
                  placeholder="Explain why this company registration is being rejected..."
                  className="w-full resize-y rounded-lg border border-erp-border bg-erp-surface p-3 text-xs text-erp-text outline-none placeholder:text-erp-text-muted focus:border-erp-focus focus:ring-2 focus:ring-erp-ring"
                />

                <p className="mt-1 text-right text-[10px] text-erp-text-muted">{rejectionReason.length}/1000</p>
              </div>

              {actionError && (
                <div className="flex items-start gap-2 rounded-lg border border-erp-danger-border bg-erp-danger-light p-2.5 text-xs text-erp-danger">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
                <button type="button" onClick={closeRejectDialog} disabled={Boolean(actionLoading)} className="h-9 rounded-lg border border-erp-border px-3 text-xs font-semibold text-erp-text transition hover:bg-erp-hover disabled:opacity-50">
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={Boolean(actionLoading) || !rejectionReason.trim()}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-erp-danger px-3 text-xs font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {actionLoading === rejectingCompany._id && <RefreshCw size={14} className="animate-spin" />}
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
