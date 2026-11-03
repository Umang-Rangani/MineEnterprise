import { useEffect, useState } from 'react'
import { Trash2, Power } from 'lucide-react'

export default function TrashBox({
  isOpen,
  onClose,
  title = 'Delete Product',
  message = 'Are you sure you want to delete this product?',
  actionButtonText = 'Delete Product',
  cancelButtonText = 'Cancel',
  onAction,
  isProcessing = false,
  variant = 'delete',

  // Optional warning message
  warningText,

  // Optional reason input
  showReasonInput = false,
  reason = '',
  onReasonChange,
  reasonPlaceholder = 'Enter reason...',
}) {
  const [isAnimating, setIsAnimating] = useState(false)

  const isActivate = variant === 'activate'
  const isDeactivate = variant === 'deactivate'
  const isDelete = variant === 'delete'

  const theme = isActivate
    ? {
        border: 'border-t-emerald-500',
        iconBg: 'bg-emerald-500',
        title: 'text-emerald-700',
        warning: 'text-emerald-600',
        button: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-300',
      }
    : isDeactivate
      ? {
          border: 'border-t-orange-500',
          iconBg: 'bg-orange-500',
          title: 'text-orange-700',
          warning: 'text-orange-600',
          button: 'bg-orange-500 hover:bg-orange-600 focus:ring-orange-300',
        }
      : {
          border: 'border-t-red-500',
          iconBg: 'bg-red-500',
          title: 'text-red-600',
          warning: 'text-red-500',
          button: 'bg-red-500 hover:bg-red-600 focus:ring-red-300',
        }

  const defaultWarning = isDelete ? 'This action cannot be undone.' : 'This change will affect the permissions assigned to this role.'

  const finalWarning = warningText || defaultWarning

  const isReasonInvalid = showReasonInput && !reason.trim()

  useEffect(() => {
    if (!isOpen) {
      setIsAnimating(false)
      return
    }

    const handleEscapeKey = (event) => {
      if (event.key === 'Escape' && !isProcessing) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscapeKey)
    setIsAnimating(true)

    return () => {
      document.removeEventListener('keydown', handleEscapeKey)
    }
  }, [isOpen, isProcessing, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={!isProcessing ? onClose : undefined} aria-hidden="true" />

      {/* Modal */}
      <div
        className={`relative z-10 w-full max-w-sm overflow-visible rounded-2xl border border-slate-200 border-t-[6px] ${theme.border} bg-white shadow-2xl ${isAnimating ? 'animate-in zoom-in-75 duration-300 ease-out' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-modal-title"
      >
        <div className="flex flex-col items-center px-6 pb-6 pt-3">
          {/* Action Icon */}
          <div className="-mt-9 mb-3">
            <div className={`flex size-16 items-center justify-center rounded-full border-4 border-white ${theme.iconBg} shadow-lg`}>
              {isDelete ? <Trash2 size={30} strokeWidth={2.2} className="text-white" /> : <Power size={30} strokeWidth={2.2} className="text-white" />}
            </div>
          </div>

          {/* Title */}
          <h3 id="confirmation-modal-title" className={`mt-1 text-center text-xl font-semibold leading-tight ${theme.title}`}>
            {title}
          </h3>

          {/* Message */}
          <div className="mt-4 w-full text-center">
            <p className="text-sm leading-relaxed text-slate-600">{message}</p>

            {finalWarning && <p className={`mt-2 text-xs font-medium ${theme.warning}`}>{finalWarning}</p>}
          </div>

          {/* Optional Reason Input */}
          {showReasonInput && (
            <div className="mt-5 w-full text-left">
              <label htmlFor="trashbox-reason" className="mb-1.5 block text-xs font-semibold text-slate-700">
                Reason <span className="text-red-500">*</span>
              </label>

              <textarea
                id="trashbox-reason"
                value={reason}
                onChange={(event) => onReasonChange?.(event.target.value)}
                placeholder={reasonPlaceholder}
                rows={3}
                disabled={isProcessing}
                maxLength={500}
                className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10 disabled:cursor-not-allowed disabled:bg-slate-50"
              />

              <div className="mt-1 flex items-center justify-between">
                <p className="text-[10px] text-slate-400">Please provide a reason to continue.</p>

                <span className="text-[10px] text-slate-400">{reason.length}/500</span>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="mt-6 flex w-full justify-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="h-10 min-w-28 rounded-lg border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 shadow-sm transition duration-200 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cancelButtonText}
            </button>

            <button
              type="button"
              onClick={onAction}
              disabled={isProcessing || isReasonInvalid}
              className={`h-10 min-w-32 rounded-lg px-5 text-sm font-semibold text-white shadow-sm transition duration-200 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${theme.button}`}
            >
              {isProcessing ? 'Please wait...' : actionButtonText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
