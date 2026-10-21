import { useEffect, useState } from 'react'
import { Building2, Package, ShoppingCart, Users, TrendingUp, ArrowUpRight, Clock3, CheckCircle2, AlertCircle } from 'lucide-react'
import axiosInstance from '../../api/axiosInstance'

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0)

const statCards = [
  {
    label: 'Total Products',
    value: '—',
    icon: Package,
    description: 'Products in your catalogue',
  },
  {
    label: 'Total Orders',
    value: '—',
    icon: ShoppingCart,
    description: 'Orders received by your business',
  },
  {
    label: 'Employees',
    value: '—',
    icon: Users,
    description: 'Team members in your workspace',
  },
  {
    label: 'Revenue',
    value: '—',
    icon: TrendingUp,
    description: 'Your business revenue',
  },
]

export default function CompanyDashboard() {
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const fetchCompany = async () => {
      try {
        setLoading(true)
        setError('')

        const response = await axiosInstance.get('/companies/me')

        if (active && response.data?.success) {
          setCompany(response.data.company)
        } else if (active) {
          setError('Company details could not be loaded.')
        }
      } catch (err) {
        if (active) {
          setError(err.response?.data?.message || 'Unable to load company details. Please try again.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchCompany()

    return () => {
      active = false
    }
  }, [])

  const statusConfig = {
    Approved: {
      icon: CheckCircle2,
      className: 'border-erp-success-border bg-erp-success-light text-erp-success',
      message: 'Your company has been approved. Your workspace is ready.',
    },
    Pending: {
      icon: Clock3,
      className: 'border-erp-warning-border bg-erp-warning-light text-erp-warning',
      message: 'Your registration is waiting for SuperAdmin approval.',
    },
    Rejected: {
      icon: AlertCircle,
      className: 'border-erp-danger-border bg-erp-danger-light text-erp-danger',
      message: company?.rejectionReason || 'Your registration was rejected. Please contact the administrator.',
    },
    Inactive: {
      icon: AlertCircle,
      className: 'border-erp-border bg-erp-surface-secondary text-erp-text-secondary',
      message: 'Your company account is currently inactive.',
    },
  }

  const currentStatus = statusConfig[company?.status] || statusConfig.Pending
  const StatusIcon = currentStatus.icon

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-erp-border bg-erp-surface p-6 shadow-erp-card sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-erp-primary-light/60 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-erp-text-secondary">Business overview</p>

            <h2 className="mt-3 break-words text-2xl font-bold tracking-tight sm:text-3xl">{loading ? 'Loading your workspace...' : company?.companyName || 'Company Dashboard'}</h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-erp-text-secondary">Welcome to your MineERP workspace. Manage your business operations from one place.</p>
          </div>

          <div className="flex h-16 w-16 shrink-0 items-center justify-center self-start rounded-2xl bg-erp-primary-light text-erp-primary sm:self-center">
            {company?.logo ? <img src={company.logo} alt={company?.companyName || 'Company logo'} className="h-full w-full rounded-2xl object-cover" /> : <Building2 size={30} />}
          </div>
        </div>

        {!loading && company && (
          <div className="relative mt-6 border-t border-erp-border pt-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${currentStatus.className}`}>
                <StatusIcon size={14} />
                {company.status}
              </span>

              {company.businessType && <span className="rounded-full border border-erp-border bg-erp-surface-secondary px-3 py-1.5 text-xs font-medium text-erp-text-secondary">{company.businessType}</span>}
            </div>

            <p className="mt-3 text-sm text-erp-text-secondary">{currentStatus.message}</p>
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-xl border border-erp-danger-border bg-erp-danger-light p-4">
            <p className="text-sm font-medium text-erp-danger">{error}</p>
            <button type="button" onClick={() => window.location.reload()} className="mt-3 rounded-lg border border-erp-danger-border px-3 py-2 text-sm font-semibold text-erp-danger transition hover:bg-erp-surface">
              Try again
            </button>
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Business summary</h2>
            <p className="mt-1 text-sm text-erp-text-secondary">An overview of your business workspace.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map(({ label, icon: Icon, description }) => (
            <div key={label} className="rounded-2xl border border-erp-border bg-erp-surface p-5 shadow-erp-card transition hover:-translate-y-0.5 hover:shadow-erp-dropdown">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">
                  <Icon size={21} />
                </div>
                <ArrowUpRight size={17} className="text-erp-text-muted" />
              </div>

              <p className="mt-5 text-sm font-medium text-erp-text-secondary">{label}</p>
              <p className="mt-1 text-2xl font-bold">{loading ? '...' : '—'}</p>
              <p className="mt-2 text-xs leading-5 text-erp-text-muted">{description}</p>
            </div>
          ))}
        </div>

        <p className="mt-3 text-xs text-erp-text-muted">Summary metrics will show actual values once the corresponding ERP APIs are connected.</p>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-erp-border bg-erp-surface p-6 shadow-erp-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="font-bold">Company information</h2>
              <p className="mt-1 text-xs text-erp-text-secondary">Your registered business details</p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {[
              ['Company email', company?.companyEmail],
              ['Phone', company?.companyPhone],
              ['Business category', company?.businessCategory],
              ['Website', company?.website],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-wrap justify-between gap-2 border-b border-erp-border pb-3 last:border-0 last:pb-0">
                <span className="text-sm text-erp-text-secondary">{label}</span>
                <span className="max-w-full break-all text-right text-sm font-medium">{loading ? 'Loading...' : value || 'Not provided'}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-erp-border bg-erp-surface p-6 shadow-erp-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">
              <Package size={20} />
            </div>
            <div>
              <h2 className="font-bold">Quick start</h2>
              <p className="mt-1 text-xs text-erp-text-secondary">Your next steps in MineERP</p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {[
              ['Review company information', 'Verify your registered business details.'],
              ['Set up your product catalogue', 'Prepare products for inventory management.'],
              ['Configure your team', 'Plan access for your employees.'],
            ].map(([title, description], index) => (
              <div key={title} className="flex gap-3 rounded-xl border border-erp-border bg-erp-surface-secondary p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-erp-surface text-sm font-bold text-erp-primary">{index + 1}</span>
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-erp-text-secondary">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
