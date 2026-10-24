import { Layers3 } from 'lucide-react'

export default function Loading({ label = 'Preparing your workspace', description = 'Securely loading your account and permissions...', className = '', fullScreen = true }) {
  return (
    <main role="status" aria-live="polite" aria-label={label} className={`relative flex w-full flex-col items-center justify-center overflow-hidden bg-white ${fullScreen ? 'min-h-[calc(100vh-110px)]' : 'h-[100px]'} ${className}`}>
      {/* Subtle background */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-erp-primary/10 blur-3xl" />

        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-purple-300/15 blur-3xl" />

        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'linear-gradient(var(--color-erp-primary) 1px, transparent 1px), linear-gradient(90deg, var(--color-erp-primary) 1px, transparent 1px)',
            backgroundSize: '36px 36px',
          }}
        />
      </div>

      {/* Prime-style spinner */}
      <div aria-hidden="true" className="relative z-10 flex h-16 w-16 items-center justify-center">
        <svg viewBox="0 0 50 50" className="h-16 w-16 animate-spin motion-reduce:animate-none" style={{ animationDuration: '0.8s' }} fill="none">
          <circle cx="25" cy="25" r="20" stroke="currentColor" strokeWidth="4" className="text-erp-primary/15" />

          <path d="M45 25A20 20 0 0 0 25 5" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="text-erp-primary" />
        </svg>
      </div>

      {/* Loading message */}
      <div className="relative z-10 mt-6 max-w-sm text-center">
        <h2 className="text-base font-semibold tracking-tight text-erp-text">{label}</h2>

        <p className="mt-2 text-sm leading-6 text-erp-text-secondary">{description}</p>
      </div>

      {/* Subtle animated indicator */}
      <div aria-hidden="true" className="relative z-10 mt-6 flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-erp-primary" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-erp-primary/60 [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-erp-primary/30 [animation-delay:300ms]" />
      </div>
    </main>
  )
}
