import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Building2, Check, CheckCircle2, ChevronRight, ChartNoAxesCombined, CircleDollarSign, LayoutDashboard, LockKeyhole, Menu, Package, ShieldCheck, ShoppingBag, Users, Workflow, X, Zap } from 'lucide-react'

const features = [
  {
    icon: Building2,
    title: 'Business Management',
    description: 'Manage company information, operations, and business settings from one centralized workspace.',
  },
  {
    icon: Users,
    title: 'Team Management',
    description: 'Organize your team, manage user accounts, and assign responsibilities with clarity.',
  },
  {
    icon: ShieldCheck,
    title: 'Access & Security',
    description: 'Protect business information with structured roles and permission-based access.',
  },
  {
    icon: ChartNoAxesCombined,
    title: 'Business Insights',
    description: 'Get a clear overview of business activity with an organized and easy-to-understand dashboard.',
  },
]

const modules = [
  { icon: LayoutDashboard, label: 'Dashboard', active: true },
  { icon: Building2, label: 'Business' },
  { icon: Package, label: 'Operations' },
  { icon: Users, label: 'Team & Users' },
  { icon: LockKeyhole, label: 'Permissions' },
]

const workspaceBenefits = [
  {
    icon: LayoutDashboard,
    title: 'One unified workspace',
    description: 'Bring essential business tools together.',
  },
  {
    icon: ShieldCheck,
    title: 'Controlled access',
    description: 'Manage access according to assigned roles.',
  },
  {
    icon: Workflow,
    title: 'Organized operations',
    description: 'Keep business information structured.',
  },
]

const businessBenefits = [
  {
    icon: CircleDollarSign,
    title: 'A clear business overview',
    description: 'Keep important business information organized and accessible.',
  },
  {
    icon: Users,
    title: 'A more organized team',
    description: 'Give each user access according to their responsibilities.',
  },
  {
    icon: LockKeyhole,
    title: 'Security built around roles',
    description: 'Align workspace access with assigned permissions.',
  },
]

function BrandLogo({ compact = false }) {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-3">
      <div className={`flex items-center justify-center rounded-xl bg-erp-primary text-erp-text-inverse shadow-erp-card ${compact ? 'h-9 w-9' : 'h-11 w-11'}`}>
        <Workflow size={compact ? 20 : 23} strokeWidth={2.1} />
      </div>

      <div>
        <span className={`block font-extrabold tracking-tight text-erp-text ${compact ? 'text-sm' : 'text-lg'}`}>
          Mine<span className="text-erp-primary">ERP</span>
        </span>

        <span className="block text-[9px] font-semibold tracking-[0.16em] text-erp-text-secondary">BUSINESS MANAGEMENT</span>
      </div>
    </Link>
  )
}

function DashboardPreview() {
  return (
    <div className="relative mx-auto w-full min-w-0">
      <div className="pointer-events-none absolute -inset-5 rounded-[36px] bg-erp-primary/10 blur-3xl" />

      <div className="relative overflow-hidden rounded-2xl border border-erp-border bg-erp-surface shadow-erp-modal">
        {/* Dashboard header */}
        <div className="flex items-center justify-between gap-3 border-b border-erp-border px-3 py-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">
              <Workflow size={21} />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-erp-text">MineERP Workspace</p>
              <p className="mt-0.5 text-xs text-erp-text-secondary">Your business at a glance</p>
            </div>
          </div>

          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-erp-success-border bg-erp-success-light px-2 py-1.5 text-[9px] font-semibold text-erp-success sm:px-3 sm:text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-erp-success" />
            Workspace ready
          </span>
        </div>

        <div className="grid grid-cols-[106px_minmax(0,1fr)] sm:grid-cols-[140px_minmax(0,1fr)]">
          {/* Sidebar */}
          <aside className="border-r border-erp-border bg-erp-surface-secondary/70 p-2 sm:p-3">
            <p className="mb-3 px-1 pt-2 text-[9px] font-bold uppercase tracking-wider text-erp-text-muted sm:px-2">Workspace</p>

            <div className="space-y-1">
              {modules.map(({ icon: Icon, label, active }) => (
                <div
                  key={label}
                  className={`flex items-center gap-2 rounded-lg px-2 py-2.5 text-[9px] font-medium sm:gap-2.5 sm:px-3 sm:text-xs ${
                    active ? 'bg-erp-sidebar-active text-erp-sidebar-active-text shadow-erp-card' : 'text-erp-text-secondary transition hover:bg-erp-surface-hover hover:text-erp-primary'
                  }`}
                >
                  <Icon size={14} className="shrink-0" />
                  <span className="truncate">{label}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-xl border border-erp-border bg-erp-primary-light/70 p-2 sm:p-3">
              <ShieldCheck size={18} className="text-erp-primary" />
              <p className="mt-2 text-[10px] font-bold text-erp-text sm:text-xs">Secure access</p>
              <p className="mt-1 text-[9px] leading-4 text-erp-text-secondary">Role-based permissions</p>
            </div>
          </aside>

          {/* Main dashboard */}
          <div className="min-w-0 p-2.5 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-erp-text sm:text-lg">Overview</h2>
                <p className="mt-1 text-[10px] text-erp-text-secondary sm:text-xs">Your workspace summary</p>
              </div>

              <div className="rounded-lg border border-erp-border p-2 text-erp-primary">
                <LayoutDashboard size={16} />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-5 sm:gap-3">
              <div className="rounded-xl border border-erp-border bg-erp-bg p-2.5 sm:p-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-erp-primary-light text-erp-primary">
                  <Building2 size={16} />
                </div>
                <p className="mt-3 text-[10px] text-erp-text-secondary sm:text-xs">Business profile</p>
                <p className="mt-1 text-xs font-bold text-erp-text sm:text-sm">Centralized</p>
              </div>

              <div className="rounded-xl border border-erp-border bg-erp-bg p-2.5 sm:p-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-erp-accent-light text-erp-primary">
                  <Users size={16} />
                </div>
                <p className="mt-3 text-[10px] text-erp-text-secondary sm:text-xs">Team access</p>
                <p className="mt-1 text-xs font-bold text-erp-text sm:text-sm">Role based</p>
              </div>
            </div>

            {/* Activity chart */}
            <div className="mt-3 rounded-xl border border-erp-border p-3 sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold text-erp-text sm:text-sm">Workspace activity</p>
                <span className="text-[9px] text-erp-text-muted sm:text-[10px]">Illustrative preview</span>
              </div>

              <div className="mt-5 flex h-20 items-end gap-1.5 sm:h-28 sm:gap-3">
                {[34, 52, 42, 68, 48, 79, 60, 92, 70, 84, 62, 100].map((height, index) => (
                  <div key={index} className="flex h-full flex-1 items-end">
                    <div className={`w-full rounded-t-sm ${index === 7 ? 'bg-erp-chart-primary' : 'bg-erp-primary-light'}`} style={{ height: `${height}%` }} />
                  </div>
                ))}
              </div>

              <div className="mt-2 flex justify-between text-[9px] text-erp-text-muted">
                <span>Organize</span>
                <span>Manage</span>
                <span>Grow</span>
              </div>
            </div>

            <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-erp-success-border bg-erp-success-light/60 p-2.5 sm:gap-3 sm:p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-erp-surface text-erp-success">
                <CheckCircle2 size={18} />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-bold text-erp-text">Your workspace, connected</p>
                <p className="mt-1 text-[10px] leading-4 text-erp-text-secondary">Business, team and permissions in one place.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating security card */}
      <div className="absolute -bottom-5 -left-3 hidden items-center gap-3 rounded-2xl border border-erp-border bg-erp-surface p-4 shadow-erp-dropdown sm:flex">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-erp-success-light text-erp-success">
          <ShieldCheck size={21} />
        </div>
        <div>
          <p className="text-xs font-bold text-erp-text">Controlled access</p>
          <p className="mt-1 text-[11px] text-erp-text-secondary">Permissions by role</p>
        </div>
      </div>
    </div>
  )
}

export default function HeroPage() {
  const [menuOpen, setMenuOpen] = useState(false)

  const closeMenu = () => setMenuOpen(false)

  return (
    <main className="min-h-screen overflow-hidden bg-erp-bg text-erp-text">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-erp-border bg-erp-surface/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-400 items-center justify-between gap-4 px-4 sm:h-[72px] sm:px-6 lg:px-8">
          <BrandLogo />

          <nav className="hidden items-center gap-7 md:flex">
            <a href="#features" className="text-sm font-medium text-erp-text-secondary transition hover:text-erp-primary">
              Features
            </a>
            <a href="#workspace" className="text-sm font-medium text-erp-text-secondary transition hover:text-erp-primary">
              Workspace
            </a>
            <a href="#about" className="text-sm font-medium text-erp-text-secondary transition hover:text-erp-primary">
              Why MineERP
            </a>
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <Link to="/login" className="rounded-xl px-4 py-2.5 text-sm font-semibold text-erp-text transition hover:bg-erp-surface-secondary">
              Sign In
            </Link>

            <Link to="/register-company" className="inline-flex items-center gap-2 rounded-xl bg-erp-primary px-5 py-3 text-sm font-semibold text-erp-text-inverse shadow-erp-card transition hover:bg-erp-primary-hover">
              Get Started
              <ArrowRight size={16} />
            </Link>
          </div>

          <button
            type="button"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-erp-border text-erp-text transition hover:bg-erp-surface-secondary md:hidden"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {menuOpen && (
          <nav className="border-t border-erp-border bg-erp-surface px-4 py-4 md:hidden">
            <div className="mx-auto flex max-w-400 flex-col gap-1">
              <a href="#features" onClick={closeMenu} className="rounded-lg px-3 py-3 text-sm font-medium text-erp-text-secondary hover:bg-erp-surface-secondary">
                Features
              </a>
              <a href="#workspace" onClick={closeMenu} className="rounded-lg px-3 py-3 text-sm font-medium text-erp-text-secondary hover:bg-erp-surface-secondary">
                Workspace
              </a>
              <a href="#about" onClick={closeMenu} className="rounded-lg px-3 py-3 text-sm font-medium text-erp-text-secondary hover:bg-erp-surface-secondary">
                Why MineERP
              </a>

              <Link to="/login" onClick={closeMenu} className="mt-2 rounded-lg border border-erp-border px-3 py-3 text-center text-sm font-semibold text-erp-text">
                Sign In
              </Link>

              <Link to="/register-company" onClick={closeMenu} className="rounded-lg bg-erp-primary px-3 py-3 text-center text-sm font-semibold text-erp-text-inverse">
                Get Started
              </Link>
            </div>
          </nav>
        )}
      </header>

      {/* Hero */}
      <section id="workspace" className="relative isolate scroll-mt-20 overflow-hidden bg-gradient-to-b from-erp-primary-light/50 via-erp-bg to-erp-bg">
        <div className="pointer-events-none absolute -right-32 -top-24 -z-10 h-96 w-96 rounded-full bg-erp-accent/15 blur-3xl sm:h-[500px] sm:w-[500px]" />
        <div className="pointer-events-none absolute -bottom-24 -left-32 -z-10 h-80 w-80 rounded-full bg-erp-primary/10 blur-3xl" />

        <div className="mx-auto grid max-w-400 items-center gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-14 lg:px-8 lg:py-24">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-erp-border bg-erp-surface px-3.5 py-2 text-xs font-semibold text-erp-primary shadow-erp-card">
              <Zap size={14} className="fill-erp-primary" />
              One platform. Complete business control.
            </div>

            <h1 className="mt-7 text-4xl font-extrabold leading-[1.12] tracking-tight text-erp-text sm:text-5xl lg:text-[60px]">
              Run your business
              <span className="mt-2 block text-erp-primary">with clarity.</span>
              Grow with confidence.
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-erp-text-secondary sm:text-lg">Meet MineERP — your centralized business workspace for managing operations, organizing your team, and controlling access without the complexity.</p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/register-company"
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-erp-primary px-6 py-4 text-sm font-bold text-erp-text-inverse shadow-erp-dropdown transition hover:-translate-y-0.5 hover:bg-erp-primary-hover"
              >
                Register Your Business
                <ArrowRight size={17} />
              </Link>

              <Link
                to="/login"
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl border border-erp-border bg-erp-surface px-6 py-4 text-sm font-bold text-erp-text transition hover:border-erp-focus hover:bg-erp-surface-hover"
              >
                Sign In to MineERP
                <ChevronRight size={17} />
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3 border-t border-erp-border pt-6">
              {['Centralized workspace', 'Role-based permissions', 'Organized operations'].map((item) => (
                <span key={item} className="flex items-center gap-2 text-xs font-medium text-erp-text-secondary">
                  <CheckCircle2 size={15} className="shrink-0 text-erp-success" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <DashboardPreview />
        </div>
      </section>

      {/* Workspace benefits */}
      <section className="border-y border-erp-border bg-erp-surface">
        <div className="mx-auto grid max-w-400 grid-cols-1 gap-6 px-4 py-7 sm:grid-cols-3 sm:px-6 lg:px-8">
          {workspaceBenefits.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex items-center gap-4 sm:px-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">
                <Icon size={22} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-erp-text">{title}</h2>
                <p className="mt-1 text-xs leading-5 text-erp-text-secondary">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20 bg-erp-bg py-20 sm:py-24">
        <div className="mx-auto max-w-400 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-erp-primary">Built for better business</span>

            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-erp-text sm:text-4xl lg:text-5xl">
              Everything organized.
              <span className="block text-erp-primary">Nothing overcomplicated.</span>
            </h2>

            <p className="mt-5 text-sm leading-7 text-erp-text-secondary sm:text-base">Get the visibility and control you need to keep your business running in one connected workspace.</p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, description }) => (
              <article key={title} className="group rounded-2xl border border-erp-border bg-erp-surface p-6 transition duration-300 hover:-translate-y-1 hover:border-erp-focus hover:shadow-erp-dropdown">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary transition group-hover:bg-erp-primary group-hover:text-erp-text-inverse">
                  <Icon size={23} />
                </div>

                <h3 className="mt-6 text-base font-bold text-erp-text">{title}</h3>

                <p className="mt-3 text-sm leading-7 text-erp-text-secondary">{description}</p>

                <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-erp-primary">
                  <Check size={14} />
                  Part of your workspace
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Why MineERP */}
      <section id="about" className="scroll-mt-20 bg-erp-surface py-20 sm:py-24">
        <div className="mx-auto grid max-w-400 items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-erp-primary">A smarter way to work</span>

            <h2 className="mt-4 max-w-xl text-3xl font-extrabold leading-tight tracking-tight text-erp-text sm:text-4xl">
              Less scattered work.
              <span className="block text-erp-primary">More business control.</span>
            </h2>

            <p className="mt-5 max-w-xl text-sm leading-7 text-erp-text-secondary sm:text-base">MineERP brings business information and team access into a structured environment, helping you spend less time navigating disconnected processes.</p>

            <div className="mt-8 space-y-5">
              {businessBenefits.map(({ icon: Icon, title, description }) => (
                <div key={title} className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">
                    <Icon size={20} />
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-erp-text">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-erp-text-secondary">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative isolate overflow-hidden rounded-3xl bg-erp-sidebar-bg p-7 text-erp-text-inverse sm:p-10">
            <div className="pointer-events-none absolute -right-20 -top-20 -z-10 h-64 w-64 rounded-full bg-erp-primary/30 blur-3xl" />

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-erp-sidebar-active text-erp-sidebar-active-text">
              <ShieldCheck size={25} />
            </div>

            <p className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-erp-sidebar-text">Your business. Your workspace.</p>

            <h3 className="mt-4 max-w-md text-3xl font-extrabold leading-tight sm:text-4xl">Designed to keep your operations connected.</h3>

            <p className="mt-4 max-w-md text-sm leading-7 text-erp-sidebar-text-muted">A structured workspace helps your business information, users, and permissions stay organized as your team works.</p>

            <div className="mt-8 space-y-4">
              {['Centralized business information', 'Organized team access', 'Role-based permission management', 'A consistent workspace experience'].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-erp-sidebar-active text-erp-sidebar-active-text">
                    <Check size={12} />
                  </span>
                  <span className="text-sm text-erp-sidebar-text">{item}</span>
                </div>
              ))}
            </div>

            <div className="mt-9 border-t border-erp-sidebar-border pt-6">
              <p className="text-xs leading-6 text-erp-sidebar-text-muted">Built for businesses that value clarity, structure, and controlled access.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-erp-bg px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        <div className="relative isolate mx-auto max-w-400 overflow-hidden rounded-3xl bg-erp-primary px-6 py-12 text-center text-erp-text-inverse sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute -right-20 -top-28 -z-10 h-72 w-72 rounded-full border-[40px] border-white/10" />
          <div className="pointer-events-none absolute -bottom-36 -left-20 -z-10 h-72 w-72 rounded-full border-[40px] border-white/10" />

          <div className="relative mx-auto max-w-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
              <ShoppingBag size={27} />
            </div>

            <h2 className="mt-6 text-3xl font-extrabold tracking-tight sm:text-4xl">Bring your business together.</h2>

            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-white/80 sm:text-base">Start with a centralized workspace designed to simplify business management, organize your team, and keep access under control.</p>

            <div className="mt-8">
              <Link
                to="/register-company"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-erp-surface px-6 py-3.5 text-sm font-bold text-erp-primary shadow-erp-dropdown transition hover:-translate-y-0.5 hover:bg-erp-primary-light"
              >
                Register Your Business
                <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-erp-border bg-erp-surface">
        <div className="mx-auto flex max-w-400 flex-col gap-5 px-4 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <BrandLogo compact />

          <p className="text-xs leading-5 text-erp-text-secondary">© {new Date().getFullYear()} MineERP. All rights reserved.</p>

          <Link to="/login" className="inline-flex items-center gap-2 text-xs font-semibold text-erp-text-secondary transition hover:text-erp-primary">
            Access your workspace
            <ArrowRight size={14} />
          </Link>
        </div>
      </footer>
    </main>
  )
}
