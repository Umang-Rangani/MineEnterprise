import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Layers3, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

function WorkspaceLoader() {
  return (
    <div className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden bg-slate-50 px-4">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-violet-200/40 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-purple-200/40 blur-3xl" />

        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: 'linear-gradient(#6d28d9 1px, transparent 1px), linear-gradient(90deg, #6d28d9 1px, transparent 1px)',
            backgroundSize: '36px 36px',
          }}
        />
      </div>

      {/* Loader card */}
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center rounded-3xl border border-white/80 bg-white/80 px-8 py-10 shadow-2xl shadow-violet-900/[0.06] backdrop-blur-xl sm:px-12 sm:py-12">
        {/* Brand */}
        <div className="mb-9 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-erp-primary text-white shadow-lg shadow-erp-primary/25">
            <Layers3 size={25} strokeWidth={2.2} />
          </div>

          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Mine<span className="text-erp-primary">ERP</span>
            </h1>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Business Management</p>
          </div>
        </div>

        {/* Large animation */}
        <div className="relative flex h-36 w-36 items-center justify-center">
          <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-r-erp-primary/30 border-t-erp-primary" />

          <div
            className="absolute inset-3 animate-spin rounded-full border-[3px] border-transparent border-b-violet-300 border-l-violet-300/30"
            style={{
              animationDirection: 'reverse',
              animationDuration: '2s',
            }}
          />

          <div className="absolute inset-6 animate-pulse rounded-full bg-erp-primary/[0.06]" />

          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-erp-primary shadow-lg shadow-violet-900/10">
            <ShieldCheck size={34} strokeWidth={1.7} />
          </div>

          <div className="absolute inset-0 animate-spin">
            <span className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 rounded-full bg-erp-primary shadow-md shadow-erp-primary/30" />
          </div>

          <div
            className="absolute inset-2 animate-spin"
            style={{
              animationDirection: 'reverse',
              animationDuration: '3s',
            }}
          >
            <span className="absolute bottom-0 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-violet-300" />
          </div>
        </div>

        {/* Loading message */}
        <div className="mt-8 text-center">
          <h2 className="text-lg font-bold text-slate-800">Preparing your workspace</h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">Securely loading your account and permissions...</p>
        </div>

        {/* Progress animation */}
        <div className="mt-7 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full w-2/5 animate-[workspace-loading_1.5s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-violet-400 via-erp-primary to-violet-400" />
        </div>

        <p className="mt-5 text-[10px] font-semibold tracking-[0.15em] text-slate-400">PLEASE WAIT · LOADING WORKSPACE</p>
      </div>

      <style>{`
        @keyframes workspace-loading {
          0% {
            transform: translateX(-110%);
          }
          50% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(280%);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-spin,
          .animate-pulse {
            animation-duration: 3s !important;
          }
        }
      `}</style>
    </div>
  )
}

export default function ProtectedRoute({ allowedRoles }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <WorkspaceLoader />
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'SuperAdmin') {
      return <Navigate to="/superadmin" replace />
    }

    return <Navigate to="/" replace />
  }

  return <Outlet />
}
