import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Home, ShieldAlert, ShieldCheck, LockKeyhole, Sparkles } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function Forbidden() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  const isSuperAdmin = user?.role === 'SuperAdmin' || user?.role === 'superadmin'

  const dashboardPath = isSuperAdmin ? '/superadmin' : '/company'

  useEffect(() => {
    document.title = 'Access Forbidden | MineERP'
  }, [])

  function handleGoBack() {
    const fallbackPath = location.state?.fallbackPath

    if (fallbackPath && fallbackPath !== '/forbidden') {
      navigate(fallbackPath, { replace: true })
      return
    }

    if (window.history.state?.idx > 0) {
      navigate(-1)
      return
    }

    navigate(dashboardPath, { replace: true })
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-erp-bg px-4 py-5 text-erp-text sm:px-6">
      {/* Background */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-erp-primary/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-20 h-72 w-72 rounded-full bg-purple-300/20 blur-3xl" />

        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'linear-gradient(var(--color-erp-primary) 1px, transparent 1px), linear-gradient(90deg, var(--color-erp-primary) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      {/* Main content */}
      <section className="relative z-10 w-full max-w-4xl">
        <div className="overflow-hidden rounded-2xl border border-erp-border bg-erp-surface shadow-xl shadow-slate-900/5">
          <div className="grid md:grid-cols-[0.85fr_1.15fr]">
            {/* Illustration */}
            <div className="relative flex min-h-44 items-center justify-center overflow-hidden bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-100 p-5 sm:min-h-64 sm:p-8">
              <div className="absolute left-7 top-6 h-12 w-12 rotate-12 rounded-xl border border-white/80 bg-white/40" />
              <div className="absolute bottom-7 right-7 h-16 w-16 rounded-full border border-violet-200/80" />

              <Sparkles size={20} className="absolute right-8 top-7 text-violet-500/60" />

              <div className="relative flex h-36 w-36 items-center justify-center sm:h-44 sm:w-44">
                <div className="absolute inset-0 rounded-full border-2 border-dashed animate-spin border-violet-300/80" />

                <div className="absolute inset-4 rounded-full border border-violet-200 bg-white/30" />

                <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white shadow-xl shadow-violet-700/25 sm:h-28 sm:w-28">
                  <ShieldCheck size={62} strokeWidth={1.5} className="opacity-30" />

                  <span className="absolute flex h-12 w-12 items-center justify-center rounded-xl border border-white/30 bg-white/15 backdrop-blur-sm">
                    <ShieldAlert size={29} strokeWidth={1.7} />
                  </span>
                </div>

                <span className="absolute right-2 top-5 h-2.5 w-2.5 rounded-full bg-violet-500" />
                <span className="absolute bottom-5 left-1 h-2.5 w-2.5 rounded-full bg-indigo-500" />
              </div>

              <div className="absolute bottom-3 left-0 right-0 text-center">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/75 px-3 py-1.5 text-[9px] font-bold tracking-widest text-violet-700 sm:text-[10px]">
                  <LockKeyhole size={12} />
                  ACCESS CONTROL ACTIVE
                </span>
              </div>
            </div>

            {/* Message and actions */}
            <div className="flex flex-col justify-center p-5 sm:p-8 md:p-9">
              <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600">
                <LockKeyhole size={14} />
                ERROR 403 · FORBIDDEN
              </div>

              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-erp-primary">Access restricted</p>

              <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-erp-text sm:text-3xl">
                You can't access
                <span className="block text-erp-primary">this page.</span>
              </h1>

              <p className="mt-3 max-w-md text-sm leading-6 text-erp-text-secondary">Your account doesn't have the required permission to open this page. Contact your Company Admin if you need access.</p>

              {/* Information */}
              <div className="mt-5 flex items-start gap-3 rounded-xl border border-erp-border bg-erp-surface-secondary p-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-erp-primary-light text-erp-primary">
                  <ShieldCheck size={19} />
                </span>

                <div>
                  <p className="text-sm font-bold text-erp-text">Your account is protected</p>
                  <p className="mt-1 text-xs leading-5 text-erp-text-secondary">Only users with the appropriate permissions can access restricted modules.</p>
                </div>
              </div>

              {/* Buttons */}
              <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
                <button
                  type="button"
                  onClick={handleGoBack}
                  className="group inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-erp-border bg-erp-surface px-4 text-sm font-semibold text-erp-text transition hover:bg-erp-hover"
                >
                  <ArrowLeft size={17} className="transition-transform group-hover:-translate-x-1" />
                  Go Back
                </button>

                <button
                  type="button"
                  onClick={() => navigate(dashboardPath, { replace: true })}
                  className="group inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-erp-primary px-4 text-sm font-semibold text-white shadow-md shadow-erp-primary/20 transition hover:bg-erp-primary-hover"
                >
                  <Home size={17} />
                  Dashboard
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </button>
              </div>

              <div className="mt-5 flex items-center justify-between gap-3 border-t border-erp-border pt-4">
                <span className="text-[10px] text-erp-text-muted">MineERP Security</span>

                <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-erp-text-muted">
                  <ShieldCheck size={12} />
                  Protected workspace
                </span>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-3 text-center text-[10px] text-erp-text-muted">Error code: 403_ACCESS_DENIED</p>
      </section>
    </main>
  )
}
