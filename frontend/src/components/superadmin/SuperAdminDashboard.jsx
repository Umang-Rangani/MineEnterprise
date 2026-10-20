import { useEffect, useState } from 'react'
import { Building2, CheckCircle2, Clock3, Users, RefreshCw } from 'lucide-react'
import axiosInstance from '../../api/axiosInstance'

const statCards = [
  {
    key: 'totalCompanies',
    title: 'Total Companies',
    description: 'All registered companies',
    icon: Building2,
  },
  {
    key: 'pendingApprovals',
    title: 'Pending Approvals',
    description: 'Awaiting your review',
    icon: Clock3,
  },
  {
    key: 'approvedCompanies',
    title: 'Approved Companies',
    description: 'Approved for access',
    icon: CheckCircle2,
  },
  {
    key: 'totalUsers',
    title: 'Total Users',
    description: 'Company admins and employees',
    icon: Users,
  },
]

const initialStats = {
  totalCompanies: 0,
  pendingApprovals: 0,
  approvedCompanies: 0,
  totalUsers: 0,
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState(initialStats)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchStats = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await axiosInstance.get('/superadmin/dashboard/stats')

      if (!response.data?.success || !response.data?.stats) {
        throw new Error('Invalid dashboard statistics response.')
      }

      setStats(response.data.stats)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to load dashboard statistics.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  return (
    <div className="min-h-full space-y-6 ">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-erp-text-secondary">MineERP Administration</p>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-erp-text sm:text-3xl">Dashboard Overview</h1>

          <p className="mt-2 text-sm text-erp-text-secondary">Manage companies, approvals, and users from one place.</p>
        </div>

        <button
          type="button"
          onClick={fetchStats}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-erp-border bg-erp-surface px-3 py-2 text-xs font-semibold text-erp-text transition hover:bg-erp-surface-secondary disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-erp-danger/20 bg-erp-danger/10 p-4">
          <p className="text-sm text-erp-danger">{error}</p>

          <button type="button" onClick={fetchStats} className="rounded-lg border border-erp-danger/20 px-3 py-2 text-xs font-semibold text-erp-danger hover:bg-erp-danger/10">
            Try again
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon

          return (
            <div key={stat.key} className="rounded-xl border border-erp-border bg-erp-surface p-5 shadow-(--erp-shadow)">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-erp-text-secondary">{stat.title}</p>

                  <p className="mt-3 text-3xl font-bold tracking-tight text-erp-text">{loading ? '...' : (stats[stat.key] ?? 0).toLocaleString()}</p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">
                  <Icon size={21} />
                </div>
              </div>

              <p className="mt-3 text-xs text-erp-text-muted">{stat.description}</p>
            </div>
          )
        })}
      </div>

      <section className="rounded-xl border border-erp-border bg-erp-surface p-5 sm:p-6">
        <h2 className="text-base font-semibold text-erp-text">Quick Overview</h2>

        <p className="mt-2 text-sm leading-6 text-erp-text-secondary">{loading ? 'Loading your dashboard data...' : error ? 'Dashboard data could not be loaded. Please retry.' : 'Your dashboard statistics are connected to the backend.'}</p>
      </section>
    </div>
  )
}
