import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, Layers3, LockKeyhole, Mail, ShieldCheck, Building2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { user, loading, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!loading && user) {
    return <Navigate to={user.role === 'SuperAdmin' ? '/superadmin' : '/'} replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const currentUser = await login(email.trim(), password)
      const previousPath = location.state?.from?.pathname

      const destination = currentUser.role === 'SuperAdmin' ? '/superadmin' : previousPath && previousPath !== '/login' ? previousPath : '/'

      navigate(destination, { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to sign in. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-dvh bg-erp-bg text-erp-text lg:grid lg:min-h-dvh lg:grid-cols-[1fr_1fr]">
      <section className="relative hidden min-h-dvh overflow-hidden bg-erp-sidebar-bg px-10 py-8 text-erp-text-inverse lg:flex lg:flex-col lg:justify-between xl:px-14">
        <div className="pointer-events-none absolute -right-28 -top-28 h-80 w-80 rounded-full border border-erp-text-inverse/10" />
        <div className="pointer-events-none absolute -bottom-28 -left-20 h-80 w-80 rounded-full border border-erp-text-inverse/10" />
        <div className="pointer-events-none absolute bottom-24 right-12 h-40 w-40 rounded-full bg-erp-accent/20 blur-3xl" />

        <Link to="/login" className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-erp-text-inverse/10 ring-1 ring-erp-text-inverse/15">
            <Layers3 size={23} />
          </div>

          <div>
            <p className="text-lg font-bold tracking-tight">MineERP</p>
            <p className="text-[10px] tracking-[0.18em] text-erp-sidebar-text-muted">ENTERPRISE RESOURCE PLANNING</p>
          </div>
        </Link>

        <div className="relative max-w-lg">
          <span className="inline-flex items-center gap-2 rounded-full border border-erp-text-inverse/15 bg-erp-text-inverse/5 px-3 py-1.5 text-[11px] font-medium text-erp-sidebar-text">
            <ShieldCheck size={14} />
            One workspace. Better control.
          </span>

          <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">
            Run your business
            <span className="mt-1 block text-erp-accent">with clarity.</span>
          </h1>

          <p className="mt-4 max-w-sm text-sm leading-6 text-erp-sidebar-text-muted">Manage your teams and operations from one secure enterprise workspace.</p>

          <div className="mt-7 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-erp-sidebar-border bg-erp-text-inverse/5 p-4">
              <Building2 size={19} className="text-erp-accent" />
              <p className="mt-3 text-sm font-semibold">Unified operations</p>
              <p className="mt-1 text-xs text-erp-sidebar-text-muted">Your business in one place</p>
            </div>

            <div className="rounded-xl border border-erp-sidebar-border bg-erp-text-inverse/5 p-4">
              <ShieldCheck size={19} className="text-erp-accent" />
              <p className="mt-3 text-sm font-semibold">Secure access</p>
              <p className="mt-1 text-xs text-erp-sidebar-text-muted">Access based on your role</p>
            </div>
          </div>
        </div>

        <p className="relative text-[11px] text-erp-sidebar-text-muted">© {new Date().getFullYear()} MineERP. All rights reserved.</p>
      </section>

      <section className="flex min-h-dvh items-center justify-center px-4 py-5 sm:px-6 lg:px-8">
        <div className="w-full max-w-sm">
          <Link to="/login" className="mb-5 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-erp-sidebar-bg text-erp-text-inverse">
              <Layers3 size={20} />
            </div>

            <div>
              <p className="text-base font-bold text-erp-primary">MineERP</p>
              <p className="text-[9px] tracking-[0.14em] text-erp-text-secondary">BUSINESS MANAGEMENT</p>
            </div>
          </Link>

          <div className="rounded-2xl border border-erp-border bg-erp-surface p-5 shadow-(--erp-shadow) sm:p-6">
            <div className="mb-5">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">
                <LockKeyhole size={20} />
              </div>

              <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-erp-text-secondary">Welcome back</p>

              <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-erp-text">Sign in to MineERP</h2>

              <p className="mt-1.5 text-xs leading-5 text-erp-text-secondary">Enter your email and password to access your workspace.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-xs font-semibold text-erp-text">
                  Email address
                </label>

                <div className="flex h-10 items-center gap-2.5 rounded-lg border border-erp-border px-3 transition focus-within:border-erp-primary focus-within:ring-2 focus-within:ring-erp-primary/10">
                  <Mail size={16} className="shrink-0 text-erp-text-muted" />

                  <input
                    id="email"
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@company.com"
                    required
                    className="h-full min-w-0 flex-1 bg-transparent text-xs text-erp-text outline-none placeholder:text-erp-text-muted"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block text-xs font-semibold text-erp-text">
                  Password
                </label>

                <div className="flex h-10 items-center gap-2.5 rounded-lg border border-erp-border px-3 transition focus-within:border-erp-primary focus-within:ring-2 focus-within:ring-erp-primary/10">
                  <LockKeyhole size={16} className="shrink-0 text-erp-text-muted" />

                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    required
                    className="h-full min-w-0 flex-1 bg-transparent text-xs text-erp-text outline-none placeholder:text-erp-text-muted"
                  />

                  <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="shrink-0 text-erp-text-secondary transition hover:text-erp-primary">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div role="alert" className="rounded-lg border border-erp-danger/20 bg-erp-danger/10 px-3 py-2.5 text-xs text-erp-danger">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || loading}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-erp-primary px-4 text-xs font-semibold text-erp-text-inverse transition hover:bg-erp-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Signing in...' : 'Sign in securely'}
                {!submitting && <ArrowRight size={15} />}
              </button>
            </form>

            <div className="mt-5 border-t border-erp-border pt-4">
              <p className="text-center text-xs text-erp-text-secondary">New to MineERP?</p>

              <Link
                to="/register-company"
                className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-erp-border bg-erp-surface px-4 py-2.5 text-xs font-semibold text-erp-primary transition hover:bg-erp-surface-secondary"
              >
                <Building2 size={16} />
                Register Your Business
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-lg bg-erp-surface-secondary p-3">
              <ShieldCheck size={15} className="mt-0.5 shrink-0 text-erp-primary" />

              <p className="text-[10px] leading-4 text-erp-text-secondary">Secure authentication with access based on your assigned role.</p>
            </div>
          </div>

          <p className="mt-4 text-center text-[10px] text-erp-text-muted">Authorized users only · Secure enterprise access</p>
        </div>
      </section>
    </main>
  )
}
