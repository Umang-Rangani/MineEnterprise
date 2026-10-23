import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'

export default function TrashBox({ isOpen, onClose, title = 'Delete Product', message = 'Are you sure you want to delete this product?', actionButtonText = 'Delete Product', cancelButtonText = 'Cancel', onAction, isProcessing = false }) {
  const [isAnimating, setIsAnimating] = useState(false)

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
        className={`relative z-10 w-full max-w-sm overflow-visible rounded-2xl border border-slate-200 border-t-[6px] border-t-red-500 bg-white shadow-2xl ${isAnimating ? 'animate-in zoom-in-75 duration-300 ease-out' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
      >
        <div className="flex flex-col items-center px-6 pb-6 pt-3">
          {/* Delete Icon */}
          <div className="-mt-9 mb-3">
            <div className="flex size-16 items-center justify-center rounded-full border-4 border-white bg-red-500 shadow-lg">
              <Trash2 size={30} strokeWidth={2.2} className="text-white" />
            </div>
          </div>

          {/* Title */}
          <h3 id="delete-modal-title" className="mt-1 text-center text-xl font-semibold leading-tight text-red-600">
            {title}
          </h3>

          {/* Message */}
          <div className="mt-4 w-full text-center">
            <p className="text-sm leading-relaxed text-slate-600">{message}</p>

            <p className="mt-2 text-xs font-medium text-red-500">This action cannot be undone.</p>
          </div>

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
              disabled={isProcessing}
              className="h-10 min-w-32 rounded-lg bg-red-500 px-5 text-sm font-semibold text-white shadow-sm transition duration-200 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isProcessing ? 'Deleting...' : actionButtonText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
