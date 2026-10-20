import { useEffect, useState } from 'react'
import { Building2, RefreshCw, Clock3, Mail, UserRound } from 'lucide-react'
import axiosInstance from '../../api/axiosInstance'

export default function PendingCompanies() {
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchCompanies = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await axiosInstance.get('/companies/pending')

      if (!response.data?.success) {
        throw new Error('Unable to load pending companies.')
      }

      setCompanies(response.data.companies || [])
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to load pending companies.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCompanies()
  }, [])

  return (
    <div className="min-h-full space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-erp-text-secondary">Company Management</p>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-erp-text sm:text-3xl">Pending Companies</h1>

          <p className="mt-2 text-sm text-erp-text-secondary">Review new business registrations awaiting approval.</p>
        </div>

        <button
          type="button"
          onClick={fetchCompanies}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-erp-border bg-erp-surface px-3 py-2 text-xs font-semibold text-erp-text transition hover:bg-erp-surface-secondary disabled:opacity-60"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-erp-border bg-erp-surface p-4 shadow-(--erp-shadow)">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">
          <Clock3 size={21} />
        </div>

        <div>
          <p className="text-xs text-erp-text-secondary">Awaiting review</p>
          <p className="text-2xl font-bold text-erp-text">{loading ? '...' : companies.length}</p>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-erp-danger/20 bg-erp-danger/10 p-4 text-sm text-erp-danger">
          {error}
        </div>
      )}

      {!loading && !error && companies.length === 0 && (
        <div className="rounded-xl border border-dashed border-erp-border bg-erp-surface p-10 text-center">
          <Building2 size={32} className="mx-auto text-erp-text-muted" />
          <h2 className="mt-3 text-base font-semibold text-erp-text">No pending companies</h2>
          <p className="mt-1 text-sm text-erp-text-secondary">New registrations awaiting review will appear here.</p>
        </div>
      )}

      {companies.length > 0 && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {companies.map((company) => (
            <article key={company._id} className="rounded-xl border border-erp-border bg-erp-surface p-5 shadow-(--erp-shadow)">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">
                  <Building2 size={21} />
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="break-words text-base font-semibold text-erp-text">{company.companyName}</h2>
                  <p className="mt-1 text-xs text-erp-text-secondary">
                    {company.businessType} · {company.businessCategory}
                  </p>
                </div>

                <span className="shrink-0 rounded-full bg-erp-primary-light px-2.5 py-1 text-[10px] font-semibold text-erp-primary">Pending</span>
              </div>

              <div className="mt-5 space-y-3 border-t border-erp-border pt-4">
                <div className="flex items-start gap-2.5 text-sm">
                  <UserRound size={16} className="mt-0.5 shrink-0 text-erp-text-muted" />
                  <div>
                    <p className="text-xs text-erp-text-secondary">Owner</p>
                    <p className="mt-0.5 text-sm font-medium text-erp-text">{company.owner?.name || 'Owner details unavailable'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-sm">
                  <Mail size={16} className="mt-0.5 shrink-0 text-erp-text-muted" />
                  <div className="min-w-0">
                    <p className="text-xs text-erp-text-secondary">Company email</p>
                    <p className="mt-0.5 break-all text-sm text-erp-text">{company.companyEmail}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-erp-text-secondary">Location</p>
                  <p className="mt-1 text-sm text-erp-text">{[company.city, company.state, company.country].filter(Boolean).join(', ')}</p>
                </div>

                <div>
                  <p className="text-xs text-erp-text-secondary">Registered</p>
                  <p className="mt-1 text-sm text-erp-text">{company.createdAt ? new Date(company.createdAt).toLocaleDateString() : '—'}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
