import { Activity, ArrowRight, Building2, CheckCircle2, Clock3, RefreshCw, ShieldCheck, XCircle } from 'lucide-react'
import { CompanyTable, StatCard, StatusBadge } from './SuperAdminCommon'

export default function SuperAdminOverview({ companies, companyStats, companiesLoading, companiesError, companyMessage, companyActionId, onRetry, onViewAllCompanies, onApproveCompany, onRejectCompany, onViewCompany }) {
  const pendingCompanies = companies.filter((company) => company.status === 'Pending')

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Companies" value={companiesError ? '—' : companyStats.total} description="All registered companies" icon={Building2} loading={companiesLoading} />

        <StatCard title="Pending Approvals" value={companiesError ? '—' : companyStats.pending} description="Companies waiting for review" icon={Clock3} loading={companiesLoading} />

        <StatCard title="Active Companies" value={companiesError ? '—' : companyStats.active} description="Approved and active companies" icon={CheckCircle2} loading={companiesLoading} />

        <StatCard title="Rejected Companies" value={companiesError ? '—' : companyStats.rejected} description="Company registrations rejected" icon={XCircle} loading={companiesLoading} />
      </div>

      {companiesError && (
        <div className="mt-5 flex flex-col gap-3 rounded-xl border border-erp-danger/30 bg-erp-danger/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-erp-danger">{companiesError}</p>

          <button type="button" onClick={onRetry} className="inline-flex items-center justify-center gap-2 rounded-lg border border-erp-border bg-erp-surface px-3 py-2 text-sm font-medium text-erp-danger hover:bg-erp-danger/10">
            <RefreshCw size={15} />
            Retry
          </button>
        </div>
      )}

      {companyMessage && (
        <div className="mt-5 flex items-start gap-2 rounded-xl border border-erp-success/30 bg-erp-success/10 p-4 text-sm text-erp-success">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          {companyMessage}
        </div>
      )}

      <section className="mt-7">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-erp-text">Pending Company Approvals</h2>
            <p className="mt-1 text-sm text-erp-text-secondary">Review new registrations before granting access.</p>
          </div>

          <button type="button" onClick={onViewAllCompanies} className="inline-flex items-center justify-center gap-2 rounded-xl border border-erp-border bg-erp-surface px-4 py-2.5 text-sm font-semibold text-erp-text transition hover:bg-erp-hover">
            View all companies
            <ArrowRight size={16} />
          </button>
        </div>

        <CompanyTable companies={pendingCompanies} loading={companiesLoading} actionId={companyActionId} onApprove={onApproveCompany} onReject={onRejectCompany} onView={onViewCompany} />

        {!companiesLoading && !companiesError && pendingCompanies.length === 0 && <p className="mt-3 text-xs text-erp-text-secondary">No pending approvals. Your company registrations are up to date.</p>}
      </section>

      <section className="mt-7 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-erp-border bg-erp-surface p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">
              <ShieldCheck size={20} />
            </div>

            <div>
              <h3 className="font-semibold text-erp-text">Security overview</h3>
              <p className="text-xs text-erp-text-secondary">Your platform access</p>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-erp-border pt-4">
            <div>
              <p className="text-sm font-medium text-erp-text">SuperAdmin access</p>
              <p className="mt-1 text-xs text-erp-text-secondary">Full platform administration</p>
            </div>

            <span className="rounded-full bg-erp-success/10 px-3 py-1 text-xs font-semibold text-erp-success">Active</span>
          </div>
        </div>

        <div className="rounded-2xl border border-erp-border bg-erp-surface p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">
              <Activity size={20} />
            </div>

            <div>
              <h3 className="font-semibold text-erp-text">Company summary</h3>
              <p className="text-xs text-erp-text-secondary">Current registration status</p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {[
              ['Active', companyStats.active],
              ['Pending', companyStats.pending],
              ['Rejected', companyStats.rejected],
              ['Inactive', companyStats.inactive],
            ].map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <StatusBadge status={status} />

                <span className="text-sm font-semibold text-erp-text">{companiesLoading || companiesError ? '—' : count}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
