import { useCallback, useEffect, useMemo, useState } from 'react'
import { Building2, Search, Filter, Eye, CheckCircle2, Clock3, XCircle, RefreshCw, X, Check, Ban, AlertCircle } from 'lucide-react'
import axiosInstance from '../../api/axiosInstance'

export default function SuperAdminCompanies() {
  const [companies, setCompanies] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [processingId, setProcessingId] = useState('')
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [rejectCompany, setRejectCompany] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')

  const fetchCompanies = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setError('')

    try {
      const response = await axiosInstance.get('/companies')

      if (!response.data?.success || !Array.isArray(response.data?.data)) {
        throw new Error(response.data?.message || 'Invalid companies response')
      }

      setCompanies(response.data.data)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load companies.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchCompanies()
  }, [fetchCompanies])

  const filteredCompanies = useMemo(() => {
    const query = search.trim().toLowerCase()

    return companies.filter((company) => {
      const matchesSearch = !query || [company.companyName, company.email, company.companyCode, company.ownerName].some((value) => value?.toLowerCase().includes(query))

      const matchesStatus = statusFilter === 'All' || company.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [companies, search, statusFilter])

  const counts = useMemo(
    () => ({
      total: companies.length,
      pending: companies.filter((company) => company.status === 'Pending').length,
      active: companies.filter((company) => company.status === 'Active').length,
      rejected: companies.filter((company) => company.status === 'Rejected').length,
      inactive: companies.filter((company) => company.status === 'Inactive').length,
    }),
    [companies],
  )

  const approveCompany = async (company) => {
    const confirmed = window.confirm(`Approve ${company.companyName}?\n\nThe company owner will be allowed to log in after approval.`)

    if (!confirmed) return

    setProcessingId(company._id)
    setError('')
    setNotice('')

    try {
      const response = await axiosInstance.post(`/companies/${company._id}/approve`)

      setNotice(response.data?.message || 'Company approved successfully.')
      await fetchCompanies(true)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve company.')
    } finally {
      setProcessingId('')
    }
  }

  const openRejectDialog = (company) => {
    setRejectCompany(company)
    setRejectionReason('')
    setError('')
    setNotice('')
  }

  const rejectSelectedCompany = async (event) => {
    event.preventDefault()

    if (!rejectCompany || !rejectionReason.trim()) {
      setError('Please enter a rejection reason.')
      return
    }

    if (rejectionReason.trim().length > 500) {
      setError('Rejection reason cannot exceed 500 characters.')
      return
    }

    setProcessingId(rejectCompany._id)
    setError('')
    setNotice('')

    try {
      const response = await axiosInstance.post(`/companies/${rejectCompany._id}/reject`, { reason: rejectionReason.trim() })

      setNotice(response.data?.message || 'Company request rejected.')
      setRejectCompany(null)
      setRejectionReason('')
      await fetchCompanies(true)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject company request.')
    } finally {
      setProcessingId('')
    }
  }

  const deactivateCompany = async (company) => {
    const confirmed = window.confirm(`Deactivate ${company.companyName}?\n\nUsers of this company will no longer be able to access the ERP.`)

    if (!confirmed) return

    setProcessingId(company._id)
    setError('')
    setNotice('')

    try {
      const response = await axiosInstance.patch(`/companies/${company._id}/status`, {
        status: 'Inactive',
      })

      setNotice(response.data?.message || 'Company deactivated successfully.')
      await fetchCompanies(true)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to deactivate company.')
    } finally {
      setProcessingId('')
    }
  }

  const statusClass = (status) => {
    switch (status) {
      case 'Active':
        return 'bg-erp-success/10 text-erp-success'
      case 'Pending':
        return 'bg-erp-warning/10 text-erp-warning'
      case 'Rejected':
        return 'bg-erp-danger/10 text-erp-danger'
      case 'Inactive':
        return 'bg-erp-surface-secondary text-erp-text-secondary'
      default:
        return 'bg-erp-surface-secondary text-erp-text-secondary'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-erp-text sm:text-2xl">Companies</h2>
          <p className="mt-1 text-sm text-erp-text-secondary">Review registration requests and manage company access.</p>
        </div>

        <button
          type="button"
          onClick={() => fetchCompanies(true)}
          disabled={loading || refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-erp-border bg-erp-surface px-4 py-3 text-sm font-semibold text-erp-text transition hover:bg-erp-hover disabled:opacity-60"
        >
          <RefreshCw size={17} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-erp-danger/20 bg-erp-danger/10 p-3 text-sm text-erp-danger">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
          <button type="button" onClick={() => setError('')} className="ml-auto" aria-label="Dismiss error">
            <X size={16} />
          </button>
        </div>
      )}

      {notice && (
        <div role="status" className="flex items-start gap-2 rounded-xl border border-erp-success/20 bg-erp-success/10 p-3 text-sm text-erp-success">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')} className="ml-auto" aria-label="Dismiss message">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Total Companies', value: counts.total, icon: Building2, color: 'text-erp-primary' },
          { label: 'Pending Requests', value: counts.pending, icon: Clock3, color: 'text-erp-warning' },
          { label: 'Active Companies', value: counts.active, icon: CheckCircle2, color: 'text-erp-success' },
          { label: 'Rejected Requests', value: counts.rejected, icon: XCircle, color: 'text-erp-danger' },
        ].map((item) => {
          const Icon = item.icon

          return (
            <div key={item.label} className="rounded-2xl border border-erp-border bg-erp-surface p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-erp-text-secondary sm:text-sm">{item.label}</p>
                <Icon size={19} className={item.color} />
              </div>
              <p className="mt-3 text-2xl font-bold text-erp-text sm:text-3xl">{item.value}</p>
            </div>
          )
        })}
      </div>

      <div className="rounded-2xl border border-erp-border bg-erp-surface">
        <div className="flex flex-col gap-3 border-b border-erp-border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h3 className="font-bold text-erp-text">Company Requests</h3>
            <p className="mt-1 text-xs text-erp-text-secondary">{filteredCompanies.length} companies found</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative">
              <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-erp-text-muted" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search companies..."
                className="w-full rounded-xl border border-erp-border bg-erp-surface py-2.5 pl-9 pr-3 text-sm text-erp-text outline-none placeholder:text-erp-text-muted focus:border-erp-focus sm:w-60"
              />
            </div>

            <div className="relative">
              <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-erp-text-secondary" />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="w-full appearance-none rounded-xl border border-erp-border bg-erp-surface py-2.5 pl-9 pr-8 text-sm text-erp-text outline-none focus:border-erp-focus sm:w-44"
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Active">Active</option>
                <option value="Rejected">Rejected</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 px-5 py-16 text-sm text-erp-text-secondary">
            <RefreshCw size={18} className="animate-spin" />
            Loading companies...
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-erp-primary-light text-erp-primary">
              <Building2 size={26} />
            </div>
            <h3 className="mt-4 font-semibold text-erp-text">{search || statusFilter !== 'All' ? 'No companies found' : 'No company requests yet'}</h3>
            <p className="mt-1 max-w-sm text-sm leading-6 text-erp-text-secondary">{search || statusFilter !== 'All' ? 'Try changing your search or status filter.' : 'Public company registration requests will appear here.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left">
              <thead className="bg-erp-surface-secondary">
                <tr className="text-xs font-semibold uppercase tracking-wide text-erp-text-secondary">
                  <th className="px-5 py-4">Company</th>
                  <th className="px-5 py-4">Owner</th>
                  <th className="px-5 py-4">Business Type</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Registered</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompanies.map((company) => (
                  <tr key={company._id} className="border-t border-erp-border transition hover:bg-erp-hover">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">
                          <Building2 size={19} />
                        </div>
                        <div>
                          <p className="font-semibold text-erp-text">{company.companyName}</p>
                          <p className="mt-1 text-xs text-erp-text-secondary">{company.email}</p>
                          <p className="mt-1 text-[11px] text-erp-text-muted">{company.companyCode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-erp-text">{company.ownerName || '—'}</p>
                      <p className="mt-1 text-xs text-erp-text-secondary">{company.phone || 'No phone'}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-erp-text-secondary">{company.businessType || '—'}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(company.status)}`}>{company.status}</span>
                    </td>
                    <td className="px-5 py-4 text-sm text-erp-text-secondary">{company.createdAt ? new Date(company.createdAt).toLocaleDateString() : '—'}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button type="button" title="View company details" onClick={() => setSelectedCompany(company)} className="rounded-lg border border-erp-border p-2 text-erp-text-secondary hover:bg-erp-hover hover:text-erp-primary">
                          <Eye size={16} />
                        </button>

                        {company.status === 'Pending' && (
                          <>
                            <button
                              type="button"
                              title="Approve company"
                              disabled={processingId === company._id}
                              onClick={() => approveCompany(company)}
                              className="rounded-lg border border-erp-success/20 p-2 text-erp-success hover:bg-erp-success/10 disabled:opacity-50"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              type="button"
                              title="Reject company"
                              disabled={processingId === company._id}
                              onClick={() => openRejectDialog(company)}
                              className="rounded-lg border border-erp-danger/20 p-2 text-erp-danger hover:bg-erp-danger/10 disabled:opacity-50"
                            >
                              <Ban size={16} />
                            </button>
                          </>
                        )}

                        {company.status === 'Active' && (
                          <button
                            type="button"
                            title="Deactivate company"
                            disabled={processingId === company._id}
                            onClick={() => deactivateCompany(company)}
                            className="rounded-lg border border-erp-warning/20 p-2 text-erp-warning hover:bg-erp-warning/10 disabled:opacity-50"
                          >
                            <XCircle size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedCompany && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-auto max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-erp-border bg-erp-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-erp-border px-5 py-4">
              <div>
                <h3 className="font-bold text-erp-text">Company Details</h3>
                <p className="mt-1 text-xs text-erp-text-secondary">{selectedCompany.companyName}</p>
              </div>
              <button type="button" onClick={() => setSelectedCompany(null)} className="rounded-lg p-2 text-erp-text-secondary hover:bg-erp-hover" aria-label="Close details">
                <X size={19} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
              {[
                ['Company Name', selectedCompany.companyName],
                ['Company Code', selectedCompany.companyCode],
                ['Company Email', selectedCompany.email],
                ['Phone', selectedCompany.phone],
                ['Owner Name', selectedCompany.ownerName],
                ['Business Type', selectedCompany.businessType],
                ['GSTIN', selectedCompany.gstin],
                ['Address', selectedCompany.address],
                ['Registered On', selectedCompany.createdAt ? new Date(selectedCompany.createdAt).toLocaleString() : '—'],
                ['Approved On', selectedCompany.approvedAt ? new Date(selectedCompany.approvedAt).toLocaleString() : '—'],
                ['Rejected On', selectedCompany.rejectedAt ? new Date(selectedCompany.rejectedAt).toLocaleString() : '—'],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <p className="text-xs font-medium text-erp-text-secondary">{label}</p>
                  <p className="mt-1 break-words text-sm text-erp-text">{value || '—'}</p>
                </div>
              ))}

              {selectedCompany.rejectionReason && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium text-erp-text-secondary">Rejection Reason</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-erp-danger">{selectedCompany.rejectionReason}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-erp-border p-4">
              <button type="button" onClick={() => setSelectedCompany(null)} className="rounded-xl bg-erp-primary px-4 py-2.5 text-sm font-semibold text-erp-text-inverse hover:bg-erp-primary-hover">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectCompany && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-auto w-full max-w-md overflow-hidden rounded-2xl border border-erp-border bg-erp-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-erp-border px-5 py-4">
              <div>
                <h3 className="font-bold text-erp-text">Reject Company Request</h3>
                <p className="mt-1 text-xs text-erp-text-secondary">{rejectCompany.companyName}</p>
              </div>
              <button type="button" disabled={processingId === rejectCompany._id} onClick={() => setRejectCompany(null)} className="rounded-lg p-2 text-erp-text-secondary hover:bg-erp-hover" aria-label="Close rejection dialog">
                <X size={19} />
              </button>
            </div>

            <form onSubmit={rejectSelectedCompany} className="space-y-4 p-5">
              <div>
                <label htmlFor="rejectionReason" className="mb-1.5 block text-sm font-medium text-erp-text">
                  Reason for rejection *
                </label>
                <textarea
                  id="rejectionReason"
                  required
                  maxLength={500}
                  rows={4}
                  value={rejectionReason}
                  onChange={(event) => setRejectionReason(event.target.value)}
                  placeholder="Explain why this registration request is being rejected..."
                  className="w-full resize-y rounded-xl border border-erp-border bg-erp-surface px-3.5 py-3 text-sm text-erp-text outline-none placeholder:text-erp-text-muted focus:border-erp-focus"
                />
                <p className="mt-1 text-right text-xs text-erp-text-muted">{rejectionReason.length}/500</p>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={processingId === rejectCompany._id}
                  onClick={() => setRejectCompany(null)}
                  className="rounded-xl border border-erp-border px-4 py-3 text-sm font-semibold text-erp-text-secondary hover:bg-erp-hover disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingId === rejectCompany._id || !rejectionReason.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-erp-danger px-4 py-3 text-sm font-semibold text-erp-text-inverse hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {processingId === rejectCompany._id ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
