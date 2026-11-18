import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Pencil,
  Receipt,
  UserRound,
  CalendarDays,
  FileText,
  Hash,
  LoaderCircle,
  RefreshCw,
  CheckCircle2,
  Clock,
  History,
  AlertCircle,
  IndianRupee,
  ClipboardList,
  Ban,
  Upload,
  Image,
  File,
  CreditCard,
  Tag,
  Download,
  Eye,
  X,
  Wallet,
  Maximize2,
} from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import Loading from '../Loading/Loading'
import TrashBox from '../../TrashBox/TrashBox'
import { hasPermission, useAuth } from '../../context/AuthContext'

export default function ExpenseDetails() {
  const navigate = useNavigate()
  const { id } = useParams()

  const { permissions } = useAuth()

  const canUpdate = hasPermission(permissions, 'expense:update')
  const canApprove = hasPermission(permissions, 'expense:approve')
  const canDelete = hasPermission(permissions, 'expense:delete')
  const canView = hasPermission(permissions, 'expense:view')

  const [expense, setExpense] = useState(null)

  const [loading, setLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState(null)

  const [confirmation, setConfirmation] = useState({
    isOpen: false,
    type: null,
  })

  const [receiptUrl, setReceiptUrl] = useState('')
  const [receiptLoading, setReceiptLoading] = useState(false)
  const [receiptError, setReceiptError] = useState('')
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)

  const showToast = (type, message, duration = 3000) => {
    setToast({
      id: Date.now(),
      type,
      message,
      duration,
    })
  }

  const closeToast = () => setToast(null)

  useEffect(() => {
    document.title = 'Expense Details | MineERP'
  }, [])

  // Fetch expense details
  useEffect(() => {
    let cancelled = false

    const fetchExpense = async () => {
      if (hasLoaded) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      try {
        const response = await axiosInstance.get(`/erp/expenses/${id}`)

        if (cancelled) return

        const data = response.data
        const expenseData = data?.expense || data?.data?.expense || data?.data || null

        if (!expenseData) {
          setExpense(null)
          setHasLoaded(true)
          return
        }

        setExpense(expenseData)
        setHasLoaded(true)
      } catch (error) {
        if (!cancelled) {
          showToast('error', error.response?.data?.message || 'Unable to load expense details.', 5000)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    }

    fetchExpense()

    return () => {
      cancelled = true
    }
  }, [id, refreshKey])

  // Fetch receipt preview
  useEffect(() => {
    let cancelled = false
    let objectUrl = ''

    const fetchReceipt = async () => {
      if (!expense?.receiptFile?.filename || !canView) {
        setReceiptUrl('')
        setReceiptError('')
        setReceiptLoading(false)
        return
      }

      setReceiptLoading(true)
      setReceiptError('')
      setReceiptUrl('')

      try {
        const response = await axiosInstance.get(`/erp/expenses/${id}/receipt`, { responseType: 'blob' })

        if (cancelled) return

        objectUrl = URL.createObjectURL(response.data)
        setReceiptUrl(objectUrl)
      } catch (error) {
        if (!cancelled) {
          setReceiptError(error.response?.data?.message || 'Unable to load receipt preview.')
        }
      } finally {
        if (!cancelled) {
          setReceiptLoading(false)
        }
      }
    }

    fetchReceipt()

    return () => {
      cancelled = true

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [id, expense?.receiptFile?.filename, canView])

  // Close preview popup with Escape key
  useEffect(() => {
    if (!receiptModalOpen) return

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setReceiptModalOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [receiptModalOpen])

  const status = expense?.status || 'Unknown'

  const isDraft = status === 'Draft'
  const isApproved = status === 'Approved'

  const canEditExpense = canUpdate && isDraft
  const canApproveExpense = canApprove && isDraft
  const canDeleteExpense = canDelete && isDraft

  const isImageReceipt = ['image/jpeg', 'image/png'].includes(expense?.receiptFile?.mimeType)

  const isPdfReceipt = expense?.receiptFile?.mimeType === 'application/pdf'

  const hasReceipt = Boolean(expense?.receiptFile?.filename)

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(Number(amount) || 0)

  const formatDate = (date) => {
    if (!date) return '—'

    const parsedDate = new Date(date)

    if (Number.isNaN(parsedDate.getTime())) return '—'

    return parsedDate.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const formatDateTime = (date) => {
    if (!date) return '—'

    const parsedDate = new Date(date)

    if (Number.isNaN(parsedDate.getTime())) return '—'

    return parsedDate.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusStyle = (value) => {
    const styles = {
      Draft: 'border-slate-200 bg-slate-100 text-slate-700',
      Approved: 'border-erp-success-border bg-erp-success-light text-erp-success',
    }

    return styles[value] || 'border-slate-200 bg-slate-100 text-slate-600'
  }

  const handleRefresh = () => {
    setRefreshKey((current) => current + 1)
  }

  const openApproveConfirmation = () => {
    setConfirmation({
      isOpen: true,
      type: 'approve',
    })
  }

  const openDeleteConfirmation = () => {
    setConfirmation({
      isOpen: true,
      type: 'delete',
    })
  }

  const closeConfirmation = () => {
    if (actionLoading) return

    setConfirmation({
      isOpen: false,
      type: null,
    })
  }

  const handleConfirmationAction = async () => {
    if (actionLoading) return

    setActionLoading(true)

    try {
      if (confirmation.type === 'approve') {
        await axiosInstance.patch(`/erp/expenses/${id}/approve`)

        showToast('success', 'Expense approved successfully.')
      } else if (confirmation.type === 'delete') {
        await axiosInstance.delete(`/erp/expenses/${id}`)

        showToast('success', 'Expense deleted successfully.')

        setTimeout(() => {
          navigate('/company/expenses')
        }, 700)
      }

      setConfirmation({
        isOpen: false,
        type: null,
      })

      if (confirmation.type === 'approve') {
        setRefreshKey((current) => current + 1)
      }
    } catch (error) {
      showToast('error', error.response?.data?.message || `Unable to ${confirmation.type} expense.`, 5000)
    } finally {
      setActionLoading(false)
    }
  }

  const confirmationConfig =
    confirmation.type === 'approve'
      ? {
          title: 'Approve Expense',
          message: 'Are you sure you want to approve this expense?',
          actionButtonText: 'Approve Expense',
          warningText: 'Once approved, this expense can no longer be edited or deleted.',
          variant: 'activate',
        }
      : {
          title: 'Delete Expense',
          message: 'Are you sure you want to delete this expense?',
          actionButtonText: 'Delete Expense',
          warningText: 'This expense will be removed from the active expense list.',
          variant: 'deactivate',
        }

  const breadcrumbItems = [
    {
      title: 'Expenses',
      link: '/company/expenses',
    },
    {
      title: expense?.expenseNumber || 'Expense Details',
      link: null,
    },
  ]

  const DetailItem = ({ label, value, icon: Icon }) => (
    <div className="min-w-0">
      <p className="text-[11px] font-medium text-slate-500">{label}</p>

      <div className="mt-1 flex min-w-0 items-center gap-2">
        {Icon && <Icon size={14} className="shrink-0 text-slate-400" />}

        <p className="break-words text-xs font-semibold text-slate-800">{value || '—'}</p>
      </div>
    </div>
  )

  const SectionHeader = ({ icon: Icon, title, description }) => (
    <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
        <Icon size={16} />
      </div>

      <div className="min-w-0">
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
        <p className="text-[11px] text-slate-500">{description}</p>
      </div>
    </div>
  )

  const handleReceiptDownload = async () => {
    try {
      const response = await axiosInstance.get(`/erp/expenses/${id}/receipt`, { responseType: 'blob' })

      const downloadUrl = URL.createObjectURL(response.data)
      const link = document.createElement('a')

      link.href = downloadUrl
      link.download = expense?.receiptFile?.originalName || expense?.receiptFile?.filename || 'expense-receipt'

      document.body.appendChild(link)
      link.click()
      link.remove()

      setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000)
    } catch (error) {
      showToast('error', error.response?.data?.message || 'Unable to download receipt.', 5000)
    }
  }

  // Loading
  if (loading && !hasLoaded) {
    return (
      <div className="min-w-0 space-y-4 text-sm">
        <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="h-1 bg-erp-primary" />

          <div className="flex min-h-16 items-center px-4 sm:px-5">
            <BreadCrumb items={breadcrumbItems} />
          </div>
        </section>

        <section className="relative min-h-[400px] overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex min-h-[400px] items-center justify-center">
            <Loading fullScreen={false} label="Loading expense" description="Fetching expense information..." className="!h-full min-h-[400px]" />
          </div>
        </section>
      </div>
    )
  }

  // Not found
  if (!expense) {
    return (
      <div className="min-w-0 space-y-4 text-sm">
        {toast && <Toast toast={toast} onClose={closeToast} />}

        <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="h-1 bg-erp-primary" />

          <div className="flex min-h-16 items-center px-4 sm:px-5">
            <BreadCrumb items={breadcrumbItems} />
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white px-4 py-12 text-center">
          <Receipt size={28} className="mx-auto text-slate-300" />

          <h2 className="mt-3 text-sm font-bold text-slate-800">Expense not found</h2>

          <p className="mt-1 text-xs text-slate-500">Unable to find this expense or you may not have access.</p>

          <div className="mt-4 flex justify-center gap-2">
            <button type="button" onClick={() => navigate('/company/expenses')} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              <ArrowLeft size={14} />
              Back to Expenses
            </button>

            <button type="button" onClick={handleRefresh} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-erp-primary px-3 text-xs font-semibold text-white hover:bg-erp-primary-hover">
              <RefreshCw size={14} />
              Retry
            </button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-4 text-sm">
      {toast && <Toast toast={toast} onClose={closeToast} />}

      <TrashBox
        isOpen={confirmation.isOpen}
        onClose={closeConfirmation}
        title={confirmationConfig.title}
        message={confirmationConfig.message}
        actionButtonText={confirmationConfig.actionButtonText}
        cancelButtonText="Go Back"
        onAction={handleConfirmationAction}
        isProcessing={actionLoading}
        variant={confirmationConfig.variant}
        warningText={confirmationConfig.warningText}
      />

      {/* Receipt Preview Popup */}
      {receiptModalOpen && receiptUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm sm:p-6" onClick={() => setReceiptModalOpen(false)}>
          <div className="flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                {isImageReceipt ? <Image size={17} className="shrink-0 text-erp-primary" /> : <FileText size={17} className="shrink-0 text-red-500" />}

                <div className="min-w-0">
                  <h3 className="truncate text-sm font-bold text-slate-800">Receipt Preview</h3>
                  <p className="truncate text-[10px] text-slate-500">{expense.receiptFile?.originalName || 'Expense receipt'}</p>
                </div>
              </div>

              <button type="button" onClick={() => setReceiptModalOpen(false)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100" title="Close preview">
                <X size={17} />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-slate-100 p-3 sm:p-5">
              {isImageReceipt ? (
                <img src={receiptUrl} alt="Expense receipt" className="max-h-[78vh] max-w-full rounded-lg object-contain shadow-sm" />
              ) : isPdfReceipt ? (
                <iframe src={receiptUrl} title="Expense receipt PDF" className="h-[78vh] w-full rounded-lg border border-slate-200 bg-white" />
              ) : (
                <p className="text-xs text-slate-500">Preview is not available for this file type.</p>
              )}
            </div>

            <div className="flex shrink-0 justify-end gap-2 border-t border-slate-200 px-4 py-3">
              <button type="button" onClick={handleReceiptDownload} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-erp-primary px-3 text-xs font-semibold text-white transition hover:bg-erp-primary-hover">
                <Download size={14} />
                Download
              </button>

              <button type="button" onClick={() => setReceiptModalOpen(false)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        <div className="h-1 bg-erp-primary" />

        <div className="flex h-[calc(100%-4px)] min-w-0 items-center justify-between gap-3 px-4 sm:px-5">
          <div className="min-w-0 flex-1 overflow-hidden">
            <BreadCrumb items={breadcrumbItems} />
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {canApproveExpense && (
              <button
                type="button"
                onClick={openApproveConfirmation}
                disabled={actionLoading}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-erp-success px-3 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                <CheckCircle2 size={14} />
                Approve
              </button>
            )}

            {canDeleteExpense && (
              <button
                type="button"
                onClick={openDeleteConfirmation}
                disabled={actionLoading}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
              >
                <Ban size={14} />
                Delete
              </button>
            )}

            {refreshing && <LoaderCircle size={15} className="animate-spin text-erp-disabled" />}

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing || actionLoading}
              title="Refresh expense"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={14} />
              Refresh
            </button>

            {canEditExpense && (
              <button
                type="button"
                onClick={() => navigate(`/company/expenses/${id}/edit`)}
                disabled={actionLoading}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-erp-primary px-3 text-xs font-bold text-white transition hover:bg-erp-primary-hover disabled:opacity-50"
              >
                <Pencil size={14} />
                Edit Expense
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Expense Overview */}
      <section className="overflow-hidden rounded-xl border border-erp-border bg-white shadow-erp-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-erp-primary/10 text-erp-primary">
              <Receipt size={23} />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-base font-bold text-slate-900">{expense.expenseNumber || 'Expense'}</h1>

              <p className="mt-1 text-xs text-slate-500">{expense.title || 'Expense Details'}</p>
            </div>
          </div>

          <span className={`rounded-full border px-3 py-1 text-[11px] font-bold ${getStatusStyle(status)}`}>{status}</span>
        </div>

        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <DetailItem label="Expense Category" value={expense.expenseCategory} icon={Tag} />

          <DetailItem label="Expense Title" value={expense.title} icon={FileText} />

          <DetailItem label="Expense Date" value={formatDate(expense.expenseDate)} icon={CalendarDays} />

          <DetailItem label="Payment Mode" value={expense.paymentMode} icon={CreditCard} />

          <DetailItem label="Transaction Reference" value={expense.transactionReference} icon={Hash} />

          <DetailItem label="Receipt Number" value={expense.receiptNumber} icon={FileText} />

          <DetailItem label="Created By" value={expense.createdBy?.name} icon={UserRound} />

          <DetailItem label="Created At" value={formatDateTime(expense.createdAt)} icon={Clock} />

          <DetailItem label="Last Updated By" value={expense.updatedBy?.name} icon={UserRound} />

          <DetailItem label="Last Updated" value={formatDateTime(expense.updatedAt)} icon={RefreshCw} />
        </div>
      </section>

      {/* Status Notice */}
      {isDraft && (
        <section className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <AlertCircle size={19} className="mt-0.5 shrink-0 text-amber-600" />

          <div className="min-w-0">
            <p className="text-xs font-bold text-amber-800">Expense Pending Approval</p>

            <p className="mt-1 text-xs leading-5 text-amber-700">This expense is currently in Draft status. It must be approved before it is considered an approved expense.</p>
          </div>
        </section>
      )}

      {isApproved && (
        <section className="flex items-start gap-3 rounded-xl border border-erp-success-border bg-erp-success-light p-3">
          <CheckCircle2 size={19} className="mt-0.5 shrink-0 text-erp-success" />

          <div className="min-w-0">
            <p className="text-xs font-bold text-erp-success">Expense Approved</p>

            <p className="mt-1 text-xs leading-5 text-erp-success">This expense has been approved successfully.</p>
          </div>
        </section>
      )}

      {/* Receipt Attachment + Amount Summary */}
      <div className="grid items-stretch gap-4 lg:grid-cols-2">
        {/* Receipt Attachment */}
        <section className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-erp-border bg-white shadow-erp-card">
          <SectionHeader icon={Upload} title="Receipt Attachment" description="Uploaded expense receipt and document preview" />

          <div className="flex flex-1 flex-col p-3">
            {hasReceipt ? (
              <>
                <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">{isImageReceipt ? <Image size={19} /> : <FileText size={19} />}</div>

                  <div className="min-w-0 flex-1">
                    <p className="break-all text-xs font-bold text-slate-800">{expense.receiptFile.originalName || expense.receiptFile.filename}</p>

                    <p className="mt-1 text-[10px] text-slate-500">
                      {isImageReceipt ? 'Image receipt' : isPdfReceipt ? 'PDF document' : 'Attached file'}
                      {expense.receiptFile.size ? ` · ${(expense.receiptFile.size / (1024 * 1024)).toFixed(2)} MB` : ''}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setReceiptModalOpen(true)}
                  disabled={!receiptUrl || receiptLoading || Boolean(receiptError)}
                  className="group relative mt-3 flex min-h-[190px] flex-1 flex-col items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-3 transition hover:border-erp-primary/40 hover:bg-erp-primary/5 disabled:cursor-not-allowed"
                >
                  {receiptLoading ? (
                    <div className="py-8 text-center">
                      <LoaderCircle size={25} className="mx-auto animate-spin text-erp-primary" />
                      <p className="mt-2 text-xs text-slate-500">Loading receipt...</p>
                    </div>
                  ) : receiptError ? (
                    <div className="py-8 text-center">
                      <AlertCircle size={25} className="mx-auto text-red-400" />
                      <p className="mt-2 text-xs font-semibold text-red-600">Preview unavailable</p>
                      <p className="mt-1 text-[11px] text-slate-500">{receiptError}</p>
                    </div>
                  ) : receiptUrl && isImageReceipt ? (
                    <>
                      <img src={receiptUrl} alt="Expense receipt thumbnail" className="max-h-[210px] w-full rounded-md object-contain" />

                      <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-slate-900/75 px-2.5 py-1.5 text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
                        <Maximize2 size={12} />
                        View Larger
                      </span>
                    </>
                  ) : receiptUrl && isPdfReceipt ? (
                    <div className="flex flex-col items-center py-6 text-center">
                      <FileText size={42} className="text-red-500" />
                      <p className="mt-3 text-xs font-semibold text-slate-700">PDF Receipt</p>
                      <p className="mt-1 text-[10px] text-slate-500">Click to open document preview</p>
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <File size={30} className="mx-auto text-slate-300" />
                      <p className="mt-2 text-xs text-slate-500">Preview not available</p>
                    </div>
                  )}
                </button>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setReceiptModalOpen(true)}
                    disabled={!receiptUrl || receiptLoading || Boolean(receiptError)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Eye size={14} />
                    Open Preview
                  </button>

                  <button type="button" onClick={handleReceiptDownload} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-erp-primary px-3 text-xs font-semibold text-white transition hover:bg-erp-primary-hover">
                    <Download size={14} />
                    Download Receipt
                  </button>
                </div>
              </>
            ) : (
              <div className="flex min-h-[260px] flex-1 flex-col items-center justify-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                  <FileText size={25} />
                </div>

                <p className="mt-3 text-xs font-semibold text-slate-600">No receipt uploaded</p>

                <p className="mt-1 text-[11px] text-slate-400">No attachment is available for this expense.</p>
              </div>
            )}
          </div>
        </section>

        {/* Amount Summary */}
        <section className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-erp-border bg-white shadow-erp-card">
          <SectionHeader icon={Wallet} title="Amount Summary" description="Expense amount and tax breakdown" />

          <div className="flex flex-1 flex-col p-3">
            <div className="flex flex-1 flex-col justify-center rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium text-slate-500">Base Amount</p>
                    <p className="mt-1 text-sm font-bold tabular-nums text-slate-800">{formatCurrency(expense.amount)}</p>
                  </div>

                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-500">
                    <IndianRupee size={17} />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium text-slate-500">Tax Rate</p>
                    <p className="mt-1 text-sm font-bold text-slate-800">{Number(expense.taxRate) || 0}%</p>
                  </div>

                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-500">
                    <Hash size={17} />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium text-slate-500">Tax Amount</p>
                    <p className="mt-1 text-sm font-bold tabular-nums text-slate-800">{formatCurrency(expense.taxAmount)}</p>
                  </div>

                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-500">
                    <Receipt size={17} />
                  </div>
                </div>
              </div>

              <div className="mt-5 border-t border-slate-200 pt-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-slate-700">Total Expense</p>
                    <p className="mt-1 text-[10px] text-slate-500">Including applicable tax</p>
                  </div>

                  <p className="text-xl font-extrabold tabular-nums text-erp-primary">{formatCurrency(expense.totalAmount)}</p>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-erp-primary/15 bg-erp-primary/5 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <CreditCard size={15} className="text-erp-primary" />
                <span className="text-[11px] font-semibold text-slate-600">Payment Mode</span>
              </div>

              <span className="text-xs font-bold text-erp-primary">{expense.paymentMode || '—'}</span>
            </div>
          </div>
        </section>
      </div>

      {/* Description */}
      <section className="overflow-hidden rounded-xl border border-erp-border bg-white shadow-erp-card">
        <SectionHeader icon={FileText} title="Expense Description" description="Additional information about this expense" />

        <div className="p-3">
          <p className="whitespace-pre-wrap text-xs leading-5 text-slate-600">{expense.description || 'No description provided.'}</p>
        </div>
      </section>

      {/* Approval Information */}
      {(expense.approvedBy || expense.approvedAt || isApproved) && (
        <section className="overflow-hidden rounded-xl border border-erp-border bg-white shadow-erp-card">
          <SectionHeader icon={CheckCircle2} title="Approval Information" description="Expense approval details" />

          <div className="grid gap-4 p-3 sm:grid-cols-2 lg:grid-cols-3">
            <DetailItem label="Approved By" value={expense.approvedBy?.name} icon={UserRound} />

            <DetailItem label="Approved At" value={formatDateTime(expense.approvedAt)} icon={CalendarDays} />

            <DetailItem label="Approval Status" value={expense.approvedAt ? 'Approved' : 'Not Approved'} icon={CheckCircle2} />
          </div>
        </section>
      )}

      {/* Compact Expense History */}
      <section className="overflow-hidden rounded-xl border border-erp-border bg-white shadow-erp-card">
        <SectionHeader icon={History} title="Expense History" description="Recent changes and activities" />

        <div className="divide-y divide-slate-100">
          {Array.isArray(expense.expenseHistory) && expense.expenseHistory.length > 0 ? (
            [...expense.expenseHistory].reverse().map((history, index) => (
              <div key={history._id || index} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
                    {history.action === 'Approved' ? <CheckCircle2 size={15} /> : history.action === 'Deleted' ? <Ban size={15} /> : <History size={15} />}
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800">{history.action || 'Activity'}</p>

                    <p className="mt-0.5 truncate text-[10px] text-slate-500">
                      {history.performedBy?.name || 'Unknown user'}
                      {history.toStatus ? ` · ${history.toStatus}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5 text-[10px] text-slate-500">
                  <Clock size={12} />
                  {formatDateTime(history.performedAt)}
                </div>

                {Array.isArray(history.changes) && history.changes.length > 0 && (
                  <div className="w-full rounded-md bg-slate-50 px-3 py-2">
                    <p className="text-[10px] font-semibold text-slate-600">
                      {history.changes
                        .map((change) => change.field)
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="px-3 py-5 text-center text-xs text-slate-500">No expense history found.</p>
          )}
        </div>
      </section>

      {/* Record Information */}
      <section className="overflow-hidden rounded-xl border border-erp-border bg-white shadow-erp-card">
        <SectionHeader icon={ClipboardList} title="Record Information" description="Expense record details" />

        <div className="grid gap-4 p-3 sm:grid-cols-2 lg:grid-cols-3">
          <DetailItem label="Expense Number" value={expense.expenseNumber} icon={Hash} />

          <DetailItem label="Created At" value={formatDateTime(expense.createdAt)} icon={CalendarDays} />

          <DetailItem label="Last Updated" value={formatDateTime(expense.updatedAt)} icon={RefreshCw} />
        </div>
      </section>

      {/* Footer */}
      <div className="flex justify-end">
        <button type="button" onClick={() => navigate('/company/expenses')} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
          <ArrowLeft size={14} />
          Back to Expenses
        </button>
      </div>
    </div>
  )
}
