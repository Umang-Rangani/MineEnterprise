import { Link } from 'react-router-dom'
import { ArrowRight, Building2, CheckCircle2, Layers3, LockKeyhole, ShieldCheck, Users, Workflow, ChartNoAxesCombined } from 'lucide-react'

const features = [
  {
    icon: Building2,
    title: 'Business Management',
    description: 'Manage your business information and daily operations from one workspace.',
  },
  {
    icon: Users,
    title: 'Team & User Access',
    description: 'Organize users and control access according to assigned roles.',
  },
  {
    icon: ShieldCheck,
    title: 'Role-Based Security',
    description: 'Keep your workspace secure with controlled permissions.',
  },
  {
    icon: ChartNoAxesCombined,
    title: 'Business Overview',
    description: 'Get a clear overview of your business activities and operations.',
  },
]

export default function HeroPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-erp-bg text-erp-text">
      <header className="sticky top-0 z-20 border-b border-erp-border bg-erp-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-erp-primary text-erp-text-inverse">
              <Layers3 size={22} />
            </div>

            <div>
              <p className="text-lg font-bold tracking-tight">MineERP</p>
              <p className="text-[9px] tracking-[0.16em] text-erp-text-secondary">BUSINESS MANAGEMENT</p>
            </div>
          </Link>

          <nav className="flex items-center gap-2 sm:gap-3">
            <Link to="/login" className="rounded-lg px-3 py-2 text-xs font-semibold text-erp-text transition hover:bg-erp-surface-secondary sm:px-4">
              Sign In
            </Link>

            <Link to="/register-company" className="flex items-center gap-2 rounded-lg bg-erp-primary px-3 py-2.5 text-xs font-semibold text-erp-text-inverse transition hover:bg-erp-primary-hover sm:px-4">
              <span className="hidden sm:inline">Register Business</span>
              <span className="sm:hidden">Register</span>
              <ArrowRight size={14} />
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative">
        <div className="pointer-events-none absolute -right-32 -top-24 h-96 w-96 rounded-full bg-erp-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-32 top-40 h-80 w-80 rounded-full bg-erp-accent/10 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-28">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-erp-border bg-erp-surface px-3 py-2 text-[11px] font-semibold text-erp-primary">
              <CheckCircle2 size={15} />
              One Workspace. Smarter Business.
            </div>

            <h1 className="mt-6 max-w-2xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Manage your business.
              <span className="mt-2 block text-erp-primary">Move forward with confidence.</span>
            </h1>

            <p className="mt-5 max-w-xl text-sm leading-7 text-erp-text-secondary sm:text-base">
              Meet MineERP — a centralized workspace designed to help you manage business operations, organize your team, and control access through role-based permissions.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/login" className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-erp-primary px-6 py-3 text-sm font-semibold text-erp-text-inverse transition hover:bg-erp-primary-hover">
                Sign In to MineERP
                <ArrowRight size={17} />
              </Link>

              <Link to="/register-company" className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-erp-border bg-erp-surface px-6 py-3 text-sm font-semibold text-erp-text transition hover:bg-erp-surface-secondary">
                <Building2 size={17} />
                Register Your Business
              </Link>
            </div>

            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-3 text-xs text-erp-text-secondary">
              <span className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-erp-primary" />
                Centralized workspace
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-erp-primary" />
                Role-based access
              </span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-erp-primary/5 blur-xl" />

            <div className="relative rounded-2xl border border-erp-border bg-erp-surface p-5 shadow-(--erp-shadow) sm:p-7">
              <div className="flex items-center justify-between border-b border-erp-border pb-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">
                    <Workflow size={23} />
                  </div>

                  <div>
                    <h2 className="text-base font-bold">Your Business Hub</h2>
                    <p className="mt-1 text-xs text-erp-text-secondary">One place for your operations</p>
                  </div>
                </div>

                <ShieldCheck size={22} className="text-erp-primary" />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-erp-border bg-erp-surface-secondary p-4">
                  <Building2 size={20} className="text-erp-primary" />
                  <p className="mt-4 text-sm font-semibold">Business</p>
                  <p className="mt-1 text-xs text-erp-text-secondary">Organized operations</p>
                </div>

                <div className="rounded-xl border border-erp-border bg-erp-surface-secondary p-4">
                  <Users size={20} className="text-erp-primary" />
                  <p className="mt-4 text-sm font-semibold">Team</p>
                  <p className="mt-1 text-xs text-erp-text-secondary">Managed access</p>
                </div>

                <div className="rounded-xl border border-erp-border bg-erp-surface-secondary p-4">
                  <LockKeyhole size={20} className="text-erp-primary" />
                  <p className="mt-4 text-sm font-semibold">Security</p>
                  <p className="mt-1 text-xs text-erp-text-secondary">Role-based control</p>
                </div>

                <div className="rounded-xl border border-erp-border bg-erp-surface-secondary p-4">
                  <ChartNoAxesCombined size={20} className="text-erp-primary" />
                  <p className="mt-4 text-sm font-semibold">Overview</p>
                  <p className="mt-1 text-xs text-erp-text-secondary">Clear visibility</p>
                </div>
              </div>

              <div className="mt-4 flex items-start gap-3 rounded-xl border border-erp-border p-4">
                <ShieldCheck size={19} className="mt-0.5 shrink-0 text-erp-primary" />
                <div>
                  <p className="text-sm font-semibold">Access that makes sense</p>
                  <p className="mt-1 text-xs leading-5 text-erp-text-secondary">Users access only the areas permitted by their assigned roles and permissions.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-erp-border bg-erp-surface">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-erp-primary">Built for better control</p>

            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Everything starts with a better workspace.</h2>

            <p className="mt-4 text-sm leading-6 text-erp-text-secondary">Bring your business workflow, users, and access management together in one place.</p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, description }) => (
              <div key={title} className="rounded-2xl border border-erp-border bg-erp-bg p-5 transition hover:-translate-y-1 hover:shadow-(--erp-shadow)">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">
                  <Icon size={21} />
                </div>

                <h3 className="mt-4 text-sm font-bold">{title}</h3>

                <p className="mt-2 text-xs leading-6 text-erp-text-secondary">{description}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 rounded-2xl bg-erp-sidebar-bg px-5 py-9 text-center text-erp-text-inverse sm:px-8">
            <h2 className="text-2xl font-bold sm:text-3xl">Ready to get started?</h2>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-erp-sidebar-text-muted">Sign in to your existing account or submit your business for MineERP registration and approval.</p>

            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to="/login" className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-erp-primary px-5 py-3 text-xs font-semibold text-erp-text-inverse transition hover:bg-erp-primary-hover">
                Sign In
                <ArrowRight size={15} />
              </Link>

              <Link to="/register-company" className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-erp-text-inverse/20 px-5 py-3 text-xs font-semibold transition hover:bg-erp-text-inverse/5">
                Register Business
                <Building2 size={15} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-erp-border px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 text-center sm:flex-row sm:text-left">
          <p className="text-sm font-bold">MineERP</p>
          <p className="text-xs text-erp-text-secondary">© {new Date().getFullYear()} MineERP. All rights reserved.</p>
        </div>
      </footer>
    </main>
  )
}
