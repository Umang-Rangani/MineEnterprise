import { useEffect } from 'react'
import { CircleCheck, AlertCircle, Info, X, TriangleAlert } from 'lucide-react'

const toastStyles = {
  success: {
    icon: CircleCheck,
    container: 'border-emerald-200 bg-white',
    iconColor: 'text-emerald-600',
    titleColor: 'text-emerald-800',
    progress: 'bg-emerald-500',
    title: 'Success',
  },
  error: {
    icon: AlertCircle,
    container: 'border-red-200 bg-white',
    iconColor: 'text-red-600',
    titleColor: 'text-red-800',
    progress: 'bg-red-500',
    title: 'Error',
  },
  warning: {
    icon: TriangleAlert,
    container: 'border-amber-200 bg-white',
    iconColor: 'text-amber-600',
    titleColor: 'text-amber-800',
    progress: 'bg-amber-500',
    title: 'Warning',
  },
  info: {
    icon: Info,
    container: 'border-blue-200 bg-white',
    iconColor: 'text-blue-600',
    titleColor: 'text-blue-800',
    progress: 'bg-blue-500',
    title: 'Information',
  },
}

export default function Toast({ toast, onClose }) {
  const type = toast?.type || 'info'
  const config = toastStyles[type] || toastStyles.info
  const Icon = config.icon
  const duration = toast?.duration ?? 3000

  useEffect(() => {
    if (!toast?.message || duration <= 0) return

    const timer = setTimeout(() => {
      onClose?.()
    }, duration)

    return () => clearTimeout(timer)
  }, [toast, duration, onClose])

  if (!toast?.message) return null

  return (
    <div className="pointer-events-none fixed right-3 top-3 z-[100] flex w-[calc(100%-1.5rem)] max-w-[300px] flex-col sm:right-4 sm:top-4" aria-live={type === 'error' ? 'assertive' : 'polite'} aria-atomic="true">
      <div role={type === 'error' ? 'alert' : 'status'} className={`pointer-events-auto overflow-hidden rounded-lg border shadow-md ${config.container}`}>
        <div className="flex items-start gap-2 px-2.5 py-2">
          <Icon size={17} className={`mt-0.5 shrink-0 ${config.iconColor}`} />

          <div className="min-w-0 flex-1">
            <p className={`text-xs font-semibold ${config.titleColor}`}>{toast.title || config.title}</p>

            <p className="mt-0.5 break-words text-xs leading-4 text-slate-600">{toast.message}</p>
          </div>

          <button type="button" onClick={onClose} aria-label="Close notification" className="shrink-0 rounded p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
            <X size={13} />
          </button>
        </div>

        {duration > 0 && (
          <div className="h-0.5 w-full bg-slate-100">
            <div
              key={`${toast.id || ''}-${toast.message}`}
              className={`h-full ${config.progress}`}
              style={{
                animation: `mineerp-toast-progress ${duration}ms linear forwards`,
              }}
            />
          </div>
        )}
      </div>

      <style>{`
        @keyframes mineerp-toast-progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  )
}
