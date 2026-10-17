import { useState } from 'react'
import { Activity, ArrowRight, Building2, CheckCircle2, Clock3, ShieldCheck, Users, UserCheck, UserX, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const overviewCards = [
  {
    title: 'Total Companies',
    value: '—',
    description: 'Registered on MineERP',
    icon: Building2,
    color: 'bg-stone-100 text-stone-700',
    path: '/superadmin/companies',
  },
  {
    title: 'Total Users',
    value: '—',
    description: 'All platform users',
    icon: Users,
    color: 'bg-amber-50 text-amber-700',
    path: '/superadmin/users',
  },
  {
    title: 'Active Companies',
    value: '—',
    description: 'Currently active',
    icon: CheckCircle2,
    color: 'bg-green-50 text-green-700',
    path: '/superadmin/companies',
  },
  {
    title: 'Inactive Companies',
    value: '—',
    description: 'Currently inactive',
    icon: Clock3,
    color: 'bg-red-50 text-red-700',
    path: '/superadmin/companies',
  },
]

const quickActions = [
  {
    title: 'Manage Companies',
    description: 'View and manage registered companies.',
    icon: Building2,
    path: '/superadmin/companies',
  },
  {
    title: 'Manage Users',
    description: 'Review users and their access.',
    icon: UserCheck,
    path: '/superadmin/users',
  },
  {
    title: 'System Activity',
    description: 'Review platform activity and events.',
    icon: Activity,
    path: '/superadmin/activity',
  },
  {
    title: 'Platform Settings',
    description: 'Review SuperAdmin settings.',
    icon: ShieldCheck,
    path: '/superadmin/settings',
  },
]

export default function SuperAdminDashboard() {
  const navigate = useNavigate()
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = () => {
    setRefreshing(true)
    window.setTimeout(() => setRefreshing(false), 400)
  }

  return (
    <div className="space-y-7">
      <section className="relative flex flex-col gap-5 overflow-hidden rounded-2xl bg-erp-sidebar-bg p-6 text-erp-text-inverse sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Welcome to MineERP</h2>

          <p className="mt-2 text-sm leading-6 text-erp-sidebar-text-muted">Manage your platform, oversee companies, control user access and monitor system activity from one place.</p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/superadmin/companies')}
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-erp-primary px-4 py-3 text-sm font-semibold text-erp-text-inverse transition hover:bg-erp-primary-hover"
        >
          View Companies
        </button>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-erp-text">Platform Overview</h2>
            <p className="mt-1 text-sm text-erp-text-secondary">Summary of your MineERP platform</p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-erp-border bg-erp-surface px-3 py-2 text-sm font-medium text-erp-text-secondary transition hover:bg-erp-hover disabled:opacity-60"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {overviewCards.map((card) => {
            const Icon = card.icon

            return (
              <button key={card.title} type="button" onClick={() => navigate(card.path)} className="group rounded-2xl border border-erp-border bg-erp-surface p-5 text-left transition hover:-translate-y-0.5 hover:border-[#B9ADA0] hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.color}`}>
                    <Icon size={21} />
                  </div>

                  <ArrowRight size={17} className="text-erp-text-muted opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100" />
                </div>

                <p className="mt-5 text-sm font-medium text-erp-text-secondary">{card.title}</p>

                <p className="mt-1 text-3xl font-bold tracking-tight text-erp-text">{card.value}</p>

                <p className="mt-2 text-xs text-erp-text-muted">{card.description}</p>
              </button>
            )
          })}
        </div>

        <p className="mt-3 text-xs text-erp-text-muted">Statistics will appear after connecting the dashboard to your backend APIs.</p>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-erp-border bg-erp-surface p-5 sm:p-6 xl:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-erp-text">Recent System Activity</h2>
              <p className="mt-1 text-sm text-erp-text-secondary">Latest events across the platform</p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-700">
              <Activity size={19} />
            </div>
          </div>

          <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-erp-border px-5 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-stone-600">
              <Clock3 size={22} />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-erp-text">No activity to display</h3>

            <p className="mt-1 max-w-sm text-xs leading-5 text-erp-text-secondary">Recent events will appear here after the system activity API is connected.</p>

            <button type="button" onClick={() => navigate('/superadmin/activity')} className="mt-4 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-erp-primary transition hover:bg-erp-hover">
              View all activity
              <ArrowRight size={15} />
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-erp-border bg-erp-surface p-5 sm:p-6">
          <h2 className="text-base font-bold text-erp-text">Quick Actions</h2>
          <p className="mt-1 text-sm text-erp-text-secondary">Common administration tasks</p>

          <div className="mt-5 space-y-2">
            {quickActions.map((action) => {
              const Icon = action.icon

              return (
                <button key={action.title} type="button" onClick={() => navigate(action.path)} className="group flex w-full items-center gap-3 rounded-xl border border-transparent p-3 text-left transition hover:border-erp-border hover:bg-erp-hover">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F4F2EE] text-[#6B6258]">
                    <Icon size={19} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-erp-text">{action.title}</p>
                    <p className="mt-1 text-xs leading-5 text-erp-text-secondary">{action.description}</p>
                  </div>

                  <ArrowRight size={16} className="shrink-0 text-erp-text-muted transition group-hover:translate-x-1" />
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-erp-border bg-erp-surface p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
            <ShieldCheck size={20} />
          </div>

          <div>
            <h2 className="text-sm font-bold text-erp-text">Platform Access & Security</h2>
            <p className="mt-1 text-sm leading-6 text-erp-text-secondary">Use the Users & Access section to review platform users. Keep administrative access limited to authorized accounts.</p>

            <button type="button" onClick={() => navigate('/superadmin/users')} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-erp-primary hover:underline">
              Manage user access
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
