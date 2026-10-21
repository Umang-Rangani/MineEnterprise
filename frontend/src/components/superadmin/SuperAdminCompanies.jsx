import { useCallback, useEffect, useMemo, useState } from 'react'
import { Building2, CheckCircle2, Clock3, RefreshCw, Search, XCircle, MapPin, Mail, Phone, Globe, AlertCircle, X, Eye, CalendarDays, FileText, UserRound, BriefcaseBusiness, Hash } from 'lucide-react'
import axiosInstance from '../../api/axiosInstance'

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

const DetailItem = ({ icon: Icon, label, value }) => (
  <div className="flex min-w-0 gap-3 rounded-xl border border-erp-border bg-erp-surface p-3">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-erp-surface-secondary text-erp-primary">
      <Icon size={17} />
    </div>
    <div className="min-w-0">
      <p className="text-xs font-medium text-erp-text-muted">{label}</p>
      <p className="mt-1 wrap-break-word text-sm font-semibold text-erp-text">{value || 'Not provided'}</p>
    </div>
  </div>
)

export default function SuperAdminCompanies() {
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [actionLoading, setActionLoading] = useState('')
  const [message, setMessage] = useState('')
  const [actionError, setActionError] = useState('')
  const [viewCompany, setViewCompany] = useState(null)
  const [rejectingCompany, setRejectingCompany] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')

  const fetchCompanies = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await axiosInstance.get('/companies/pending')

      if (response.data?.success) {
        setCompanies(Array.isArray(response.data.companies) ? response.data.companies : [])
      } else {
        setError(response.data?.message || 'Unable to load companies.')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load pending companies.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCompanies()
  }, [fetchCompanies])

  const filteredCompanies = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) return companies

    return companies.filter((company) =>
      [company.companyName, company.companyEmail, company.companyPhone, company.businessType, company.businessCategory, company.owner?.name, company.owner?.email, company.city, company.state, company.country, company.gstNumber, company.panNumber]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    )
  }, [companies, search])

  const reviewCompany = async (company, action, reason = '') => {
    if (!company?._id) return

    setActionLoading(company._id)
    setMessage('')
    setActionError('')

    try {
      const payload = action === 'Reject' ? { action, rejectionReason: reason.trim() } : { action }

      const response = await axiosInstance.patch(`/companies/${company._id}/review`, payload)

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to review company.')
      }

      setCompanies((previous) => previous.filter((item) => item._id !== company._id))

      setMessage(response.data.message || `Company ${action === 'Approve' ? 'approved' : 'rejected'} successfully.`)

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
    if (!window.confirm(`Approve ${company.companyName}?`)) return
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

  const summaryCards = [
    {
      label: 'Pending Review',
      value: companies.length,
      description: 'Companies awaiting approval',
      icon: Clock3,
      iconClass: 'text-erp-warning',
      iconBg: 'bg-erp-warning-light',
    },
    {
      label: 'Matched Results',
      value: filteredCompanies.length,
      description: 'Companies matching your search',
      icon: Search,
      iconClass: 'text-erp-primary',
      iconBg: 'bg-erp-primary-light',
    },
    {
      label: 'Review Access',
      value: 'SuperAdmin',
      description: 'Authorized company reviewer',
      icon: CheckCircle2,
      iconClass: 'text-erp-success',
      iconBg: 'bg-erp-success-light',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Building2 size={25} className="text-erp-primary" />
            <h2 className="text-2xl font-bold text-erp-text">Company Registrations</h2>
          </div>
          <p className="mt-2 text-sm text-erp-text-secondary">Review registrations and manage company approval requests.</p>
        </div>

        <button
          type="button"
          onClick={fetchCompanies}
          disabled={loading || Boolean(actionLoading)}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-erp-border bg-erp-surface px-4 py-2.5 text-sm font-semibold text-erp-text transition hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map((card) => {
          const Icon = card.icon

          return (
            <div key={card.label} className="rounded-2xl border border-erp-border bg-erp-surface p-5 shadow-erp-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-erp-text-secondary">{card.label}</p>
                  <p className="mt-3 text-2xl font-bold text-erp-text">{loading && typeof card.value === 'number' ? '—' : card.value}</p>
                  <p className="mt-1 text-xs text-erp-text-muted">{card.description}</p>
                </div>

                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${card.iconBg} ${card.iconClass}`}>
                  <Icon size={21} />
                </div>
              </div>
            </div>
          )
        })}
      </div> */}

      {message && (
        <div className="flex items-start gap-2 rounded-xl border border-erp-success-border bg-erp-success-light p-4 text-sm text-erp-success">
          <CheckCircle2 size={18} className="shrink-0" />
          <span>{message}</span>
          <button type="button" onClick={() => setMessage('')} className="ml-auto" aria-label="Dismiss success message">
            <X size={17} />
          </button>
        </div>
      )}

      {actionError && !rejectingCompany && (
        <div className="flex items-start gap-2 rounded-xl border border-erp-danger-border bg-erp-danger-light p-4 text-sm text-erp-danger">
          <AlertCircle size={18} className="shrink-0" />
          <span>{actionError}</span>
          <button type="button" onClick={() => setActionError('')} className="ml-auto" aria-label="Dismiss error">
            <X size={17} />
          </button>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-erp-border bg-erp-surface shadow-erp-card">
        <div className="flex flex-col gap-4 border-b border-erp-border p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-erp-text">Pending Companies</h3>
            <p className="mt-1 text-sm text-erp-text-secondary">View full details or review a registration from the table.</p>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-erp-text-muted" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search companies..."
              className="w-full rounded-xl border border-erp-border bg-erp-surface py-2.5 pl-10 pr-4 text-sm text-erp-text outline-none placeholder:text-erp-text-muted focus:border-erp-focus focus:ring-2 focus:ring-erp-ring"
            />
          </div>

          
        </div>

        {error && (
          <div className="m-5 flex items-start gap-3 rounded-xl border border-erp-danger-border bg-erp-danger-light p-4 text-sm text-erp-danger">
            <AlertCircle size={18} className="shrink-0" />
            <span className="flex-1">{error}</span>
            <button type="button" onClick={fetchCompanies} className="font-semibold underline">
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-3 p-12 text-sm text-erp-text-secondary">
            <RefreshCw size={18} className="animate-spin" />
            Loading companies...
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-erp-primary-light text-erp-primary">
              <Building2 size={27} />
            </div>
            <h3 className="mt-4 font-semibold text-erp-text">{companies.length === 0 ? 'No pending companies' : 'No matching companies'}</h3>
            <p className="mt-1 text-sm text-erp-text-secondary">{companies.length === 0 ? 'New registrations will appear here.' : 'Try another company name, email, or location.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-212.5 text-left">
              <thead className="bg-erp-surface-secondary">
                <tr className="border-b border-erp-border">
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-erp-text-secondary">Company</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-erp-text-secondary">Owner</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-erp-text-secondary">Contact</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-erp-text-secondary">Registered</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-erp-text-secondary">Status</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-erp-text-secondary">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-erp-border">
                {filteredCompanies.map((company) => (
                  <tr key={company._id} className="transition hover:bg-erp-surface-hover">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">
                          <Building2 size={19} />
                        </div>
                        <div className="min-w-0 max-w-56">
                          <p className="truncate text-sm font-semibold text-erp-text">{company.companyName || 'Unnamed Company'}</p>
                          <p className="mt-1 truncate text-xs text-erp-text-secondary">{company.businessType || 'Business type not provided'}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <p className="max-w-44 truncate text-sm font-medium text-erp-text">{company.owner?.name || 'Not available'}</p>
                      <p className="mt-1 max-w-44 truncate text-xs text-erp-text-secondary">{company.owner?.email || 'No owner email'}</p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="max-w-48 truncate text-sm text-erp-text">{company.companyEmail || 'No email'}</p>
                      <p className="mt-1 text-xs text-erp-text-secondary">{company.companyPhone || 'No phone'}</p>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-sm text-erp-text-secondary">{formatDate(company.createdAt)}</td>

                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-erp-warning-border bg-erp-warning-light px-2.5 py-1 text-xs font-semibold text-erp-warning">
                        <Clock3 size={13} />
                        Pending
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setViewCompany(company)
                            setActionError('')
                            setMessage('')
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-erp-border px-3 py-2 text-xs font-semibold text-erp-primary transition hover:bg-erp-primary-light"
                        >
                          <Eye size={15} />
                          View
                        </button>

                        <button
                          type="button"
                          onClick={() => handleApprove(company)}
                          disabled={Boolean(actionLoading)}
                          title="Approve company"
                          aria-label={`Approve ${company.companyName}`}
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-erp-success-light text-erp-success transition hover:opacity-80 disabled:opacity-50"
                        >
                          {actionLoading === company._id ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={17} />}
                        </button>

                        <button
                          type="button"
                          onClick={() => openRejectDialog(company)}
                          disabled={Boolean(actionLoading)}
                          title="Reject company"
                          aria-label={`Reject ${company.companyName}`}
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-erp-danger-light text-erp-danger transition hover:opacity-80 disabled:opacity-50"
                        >
                          <XCircle size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredCompanies.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-erp-border px-5 py-3 text-xs text-erp-text-secondary sm:flex-row sm:items-center sm:justify-between">
            <span>
              Showing {filteredCompanies.length} of {companies.length} pending companies
            </span>
            <span>Use View to see complete registration details.</span>
          </div>
        )}
      </section>

      {viewCompany && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-erp-overlay/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setViewCompany(null)
          }}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="company-details-title" className="my-auto max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-erp-border bg-erp-surface shadow-erp-modal">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-erp-border bg-erp-surface p-5 sm:p-6">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">
                  <Building2 size={24} />
                </div>
                <div className="min-w-0">
                  <h2 id="company-details-title" className="wrap-break-word text-xl font-bold text-erp-text">
                    {viewCompany.companyName || 'Company Details'}
                  </h2>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="text-sm text-erp-text-secondary">{viewCompany.businessType || 'Business type not provided'}</span>
                    <span className="rounded-full border border-erp-warning-border bg-erp-warning-light px-2 py-0.5 text-xs font-semibold text-erp-warning">Pending</span>
                  </div>
                </div>
              </div>

              <button type="button" onClick={() => setViewCompany(null)} className="shrink-0 rounded-lg p-2 text-erp-text-secondary transition hover:bg-erp-hover" aria-label="Close company details">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6 p-5 sm:p-6">
              <section>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-erp-text">
                  <BriefcaseBusiness size={17} className="text-erp-primary" />
                  Business Information
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <DetailItem icon={Building2} label="Company Name" value={viewCompany.companyName} />
                  <DetailItem icon={BriefcaseBusiness} label="Business Type" value={viewCompany.businessType} />
                  <DetailItem icon={FileText} label="Business Category" value={viewCompany.businessCategory} />
                  <DetailItem icon={Mail} label="Company Email" value={viewCompany.companyEmail} />
                  <DetailItem icon={Phone} label="Company Phone" value={viewCompany.companyPhone} />
                  <DetailItem icon={Globe} label="Website" value={viewCompany.website} />
                </div>
              </section>

              <section>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-erp-text">
                  <UserRound size={17} className="text-erp-primary" />
                  Owner Information
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <DetailItem icon={UserRound} label="Owner Name" value={viewCompany.owner?.name} />
                  <DetailItem icon={Mail} label="Owner Email" value={viewCompany.owner?.email} />
                  <DetailItem icon={Phone} label="Owner Phone" value={viewCompany.owner?.phone} />
                </div>
              </section>

              <section>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-erp-text">
                  <MapPin size={17} className="text-erp-primary" />
                  Registered Address
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <DetailItem icon={MapPin} label="Address Line 1" value={viewCompany.addressLine1} />
                  <DetailItem icon={MapPin} label="Address Line 2" value={viewCompany.addressLine2} />
                  <DetailItem icon={Building2} label="City" value={viewCompany.city} />
                  <DetailItem icon={MapPin} label="State" value={viewCompany.state} />
                  <DetailItem icon={Globe} label="Country" value={viewCompany.country} />
                  <DetailItem icon={Hash} label="Postal Code" value={viewCompany.postalCode} />
                </div>
              </section>

              <section>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-erp-text">
                  <FileText size={17} className="text-erp-primary" />
                  Tax & Registration
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <DetailItem icon={FileText} label="GST Number" value={viewCompany.gstNumber} />
                  <DetailItem icon={FileText} label="PAN Number" value={viewCompany.panNumber} />
                  <DetailItem icon={Hash} label="Currency" value={viewCompany.currency} />
                  <DetailItem icon={CalendarDays} label="Registration Date" value={formatDate(viewCompany.createdAt)} />
                  <DetailItem icon={CalendarDays} label="Last Updated" value={formatDate(viewCompany.updatedAt)} />
                  <DetailItem icon={Clock3} label="Application Status" value={viewCompany.status || 'Pending'} />
                </div>
              </section>

              {/* <div className="break-all rounded-xl border border-erp-border bg-erp-surface-secondary p-3">
                <p className="text-xs font-medium text-erp-text-muted">Company Record ID</p>
                <p className="mt-1 text-sm text-erp-text">{viewCompany._id}</p>
              </div> */}

              {actionError && (
                <div className="flex items-start gap-2 rounded-xl border border-erp-danger-border bg-erp-danger-light p-3 text-sm text-erp-danger">
                  <AlertCircle size={17} className="mt-0.5 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              <div className="flex flex-col-reverse justify-between gap-3 border-t border-erp-border pt-5 sm:flex-row">
                <button type="button" onClick={() => setViewCompany(null)} className="rounded-xl border border-erp-border px-4 py-2.5 text-sm font-semibold text-erp-text transition hover:bg-erp-hover">
                  Close Details
                </button>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => openRejectDialog(viewCompany)}
                    disabled={Boolean(actionLoading)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-erp-danger-border px-4 py-2.5 text-sm font-semibold text-erp-danger transition hover:bg-erp-danger-light disabled:opacity-60"
                  >
                    <XCircle size={17} />
                    Reject
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApprove(viewCompany)}
                    disabled={Boolean(actionLoading)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-erp-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-erp-primary-hover disabled:opacity-60"
                  >
                    {actionLoading === viewCompany._id ? <RefreshCw size={17} className="animate-spin" /> : <CheckCircle2 size={17} />}
                    Approve Company
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {rejectingCompany && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-erp-overlay/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeRejectDialog()
          }}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="reject-company-title" className="my-auto w-full max-w-lg rounded-2xl border border-erp-border bg-erp-surface p-6 shadow-erp-modal">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="reject-company-title" className="text-xl font-bold text-erp-text">
                  Reject Company
                </h2>
                <p className="mt-1 text-sm text-erp-text-secondary">{rejectingCompany.companyName}</p>
              </div>

              <button type="button" onClick={closeRejectDialog} disabled={Boolean(actionLoading)} className="rounded-lg p-2 text-erp-text-secondary hover:bg-erp-hover disabled:opacity-50" aria-label="Close rejection dialog">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleReject} className="mt-5 space-y-4">
              <div>
                <label htmlFor="rejectionReason" className="mb-2 block text-sm font-semibold text-erp-text">
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
                  className="w-full resize-y rounded-xl border border-erp-border bg-erp-surface p-3 text-sm text-erp-text outline-none placeholder:text-erp-text-muted focus:border-erp-focus focus:ring-2 focus:ring-erp-ring"
                />
                <p className="mt-1 text-right text-xs text-erp-text-muted">{rejectionReason.length}/1000</p>
              </div>

              {actionError && (
                <div className="flex items-start gap-2 rounded-xl border border-erp-danger-border bg-erp-danger-light p-3 text-sm text-erp-danger">
                  <AlertCircle size={17} className="mt-0.5 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
                <button type="button" onClick={closeRejectDialog} disabled={Boolean(actionLoading)} className="rounded-xl border border-erp-border px-4 py-2.5 text-sm font-semibold text-erp-text hover:bg-erp-hover disabled:opacity-60">
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={Boolean(actionLoading) || !rejectionReason.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-erp-danger px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading === rejectingCompany._id && <RefreshCw size={16} className="animate-spin" />}
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
