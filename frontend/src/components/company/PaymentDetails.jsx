import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Pencil,
  ReceiptText,
  UserRound,
  CalendarDays,
  FileText,
  Hash,
  LoaderCircle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  IndianRupee,
  ClipboardList,
  Printer,
  Download,
  RotateCcw,
  CreditCard,
  CircleDollarSign,
  Building2,
  Wallet,
  Banknote,
  Landmark,
  Smartphone,
  BadgeCheck,
  History,
} from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import Loading from '../Loading/Loading'
import { hasPermission, useAuth } from '../../context/AuthContext'

export default function PaymentDetails() {
  const navigate = useNavigate()
  const { id } = useParams()

  const { permissions } = useAuth()

  const canUpdate = hasPermission(permissions, 'payment:update')
  const canRefund = hasPermission(permissions, 'payment:refund')
  const canView = hasPermission(permissions, 'payment:view')

  const [payment, setPayment] = useState(null)

  const [loading, setLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const [refundLoading, setRefundLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(null)

  const [toast, setToast] = useState(null)

  const [refundModal, setRefundModal] = useState(false)
  const [refundAmount, setRefundAmount] = useState('')
  const [refundDate, setRefundDate] = useState(new Date().toLocaleDateString('en-CA'))
  const [refundReason, setRefundReason] = useState('')

  const today = new Date().toLocaleDateString('en-CA')

  const showToast = (type, message, duration = 3000) => {
    setToast({ id: Date.now(), type, message, duration })
  }

  const closeToast = () => setToast(null)

  useEffect(() => {
    document.title = 'Payment Details | MineERP'
  }, [])

  useEffect(() => {
    let cancelled = false

    const fetchPayment = async () => {
      if (hasLoaded) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      try {
        const response = await axiosInstance.get(`/erp/payments/${id}`)

        if (cancelled) return

        const data = response.data

        const paymentData = data?.payment || data?.data?.payment || data?.data || null

        if (!paymentData) {
          setPayment(null)
          setHasLoaded(true)
          return
        }

        setPayment(paymentData)
        setHasLoaded(true)
      } catch (error) {
        if (!cancelled) {
          showToast('error', error.response?.data?.message || 'Unable to load payment details.', 5000)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    }

    fetchPayment()

    return () => {
      cancelled = true
    }
  }, [id, refreshKey])

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

  const status = payment?.status || 'Unknown'

  const originalAmount = Number(payment?.amount) || 0
  const refundedAmount = Number(payment?.refundedAmount) || 0
  const netReceived = Math.max(0, originalAmount - refundedAmount)

  const remainingRefundable = Math.max(0, originalAmount - refundedAmount)

  const invoice = payment?.invoiceId && typeof payment.invoiceId === 'object' ? payment.invoiceId : null

  const customer = payment?.customerId && typeof payment.customerId === 'object' ? payment.customerId : null

  const refundHistory = Array.isArray(payment?.refundHistory) ? payment.refundHistory : []

  const isRefunded = status === 'Refunded'
  const isPartiallyRefunded = status === 'Partially Refunded'

  const canEditPayment = canUpdate && !isRefunded

  const canMakeRefund = canRefund && ['Completed', 'Partially Refunded'].includes(status) && remainingRefundable > 0

  const getStatusStyle = (value) => {
    const styles = {
      Completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      Refunded: 'border-rose-200 bg-rose-50 text-rose-700',
      'Partially Refunded': 'border-amber-200 bg-amber-50 text-amber-700',
    }

    return styles[value] || 'border-slate-200 bg-slate-100 text-slate-600'
  }

  const getPaymentModeIcon = (mode) => {
    const icons = {
      Cash: Banknote,
      'Bank Transfer': Landmark,
      UPI: Smartphone,
      Cheque: Building2,
    }

    return icons[mode] || Wallet
  }

  const handleRefresh = () => {
    setRefreshKey((current) => current + 1)
  }

  const openRefundModal = () => {
    setRefundAmount('')
    setRefundDate(today)
    setRefundReason('')
    setRefundModal(true)
  }

  const closeRefundModal = () => {
    if (refundLoading) return

    setRefundModal(false)
    setRefundAmount('')
    setRefundDate(today)
    setRefundReason('')
  }

  const handleRefund = async (event) => {
    event.preventDefault()

    if (refundLoading) return

    const amount = Number(refundAmount)

    if (!refundAmount.trim() || !Number.isFinite(amount) || amount <= 0) {
      showToast('error', 'Enter a valid refund amount.')
      return
    }

    if (Math.round(amount * 100) !== amount * 100) {
      showToast('error', 'Refund amount can have maximum 2 decimal places.')
      return
    }

    if (amount > remainingRefundable) {
      showToast('error', `Refund amount cannot exceed ${formatCurrency(remainingRefundable)}.`)
      return
    }

    if (!refundDate) {
      showToast('error', 'Refund date is required.')
      return
    }

    if (refundDate > today) {
      showToast('error', 'Refund date cannot be in the future.')
      return
    }

    if (refundReason.trim().length < 3) {
      showToast('error', 'Refund reason must be at least 3 characters.')
      return
    }

    if (refundReason.trim().length > 500) {
      showToast('error', 'Refund reason cannot exceed 500 characters.')
      return
    }

    setRefundLoading(true)

    try {
      await axiosInstance.post(`/erp/payments/${id}/refund`, {
        amount,
        refundDate,
        reason: refundReason.trim(),
      })

      closeRefundModal()

      showToast('success', 'Payment refund recorded successfully.')

      setRefreshKey((current) => current + 1)
    } catch (error) {
      showToast('error', error.response?.data?.message || 'Unable to process payment refund.', 5000)
    } finally {
      setRefundLoading(false)
    }
  }

  const getPaymentReceipt = async () => {
    const response = await axiosInstance.get(`/erp/payments/${id}/receipt`, {
      responseType: 'blob',
    })

    return response.data
  }

  const getReceiptFileName = () => {
    const paymentNumber = String(payment?.paymentNumber || 'Payment').replace(/[^a-zA-Z0-9_-]/g, '_')

    return `${paymentNumber}_Receipt.pdf`
  }

  const handleDownloadReceipt = async () => {
    if (!canView || pdfLoading) return

    setPdfLoading('download')

    try {
      const pdfBlob = await getPaymentReceipt()

      const pdfUrl = window.URL.createObjectURL(new Blob([pdfBlob], { type: 'application/pdf' }))

      const link = document.createElement('a')

      link.href = pdfUrl
      link.download = getReceiptFileName()

      document.body.appendChild(link)
      link.click()
      link.remove()

      window.setTimeout(() => {
        window.URL.revokeObjectURL(pdfUrl)
      }, 1000)

      showToast('success', 'Payment receipt downloaded successfully.')
    } catch (error) {
      showToast('error', error.response?.data?.message || 'Unable to download payment receipt.', 5000)
    } finally {
      setPdfLoading(null)
    }
  }

  const handlePrintReceipt = async () => {
    if (!canView || pdfLoading) return

    const printWindow = window.open('', '_blank')

    if (!printWindow) {
      showToast('error', 'Please allow pop-ups to print the receipt.')
      return
    }

    setPdfLoading('print')

    try {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Preparing Payment Receipt</title>
          </head>
          <body style="font-family: Arial, sans-serif; padding: 30px; text-align: center;">
            Preparing payment receipt...
          </body>
        </html>
      `)

      printWindow.document.close()

      const pdfBlob = await getPaymentReceipt()

      const pdfUrl = window.URL.createObjectURL(new Blob([pdfBlob], { type: 'application/pdf' }))

      printWindow.location.replace(pdfUrl)

      window.setTimeout(
        () => {
          window.URL.revokeObjectURL(pdfUrl)
        },
        10 * 60 * 1000,
      )
    } catch (error) {
      printWindow.close()

      showToast('error', error.response?.data?.message || 'Unable to open payment receipt for printing.', 5000)
    } finally {
      setPdfLoading(null)
    }
  }

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

      <div>
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>

        <p className="text-[11px] text-slate-500">{description}</p>
      </div>
    </div>
  )

  const breadcrumbItems = [
    { title: 'Payments', link: '/company/payments' },
    {
      title: payment?.paymentNumber || 'Payment Details',
      link: null,
    },
  ]

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
            <Loading fullScreen={false} label="Loading payment" description="Fetching payment information..." className="!h-full min-h-[400px]" />
          </div>
        </section>
      </div>
    )
  }

  if (!payment) {
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
          <ReceiptText size={28} className="mx-auto text-slate-300" />

          <h2 className="mt-3 text-sm font-bold text-slate-800">Payment not found</h2>

          <p className="mt-1 text-xs text-slate-500">Unable to find this payment or you may not have access.</p>

          <div className="mt-4 flex justify-center gap-2">
            <button type="button" onClick={() => navigate('/company/payments')} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              <ArrowLeft size={14} />
              Back to Payments
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

  const PaymentModeIcon = getPaymentModeIcon(payment.paymentMode)

  return (
    <div className="min-w-0 space-y-4 text-sm">
      {toast && <Toast toast={toast} onClose={closeToast} />}

      {/* Refund Modal */}
      {refundModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-3 backdrop-blur-[2px]">
          <div className="my-auto w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                  <RotateCcw size={17} />
                </div>

                <div>
                  <h2 className="text-sm font-bold text-slate-900">Refund Payment</h2>

                  <p className="text-[11px] text-slate-500">Record a refund against this payment</p>
                </div>
              </div>

              <button type="button" onClick={closeRefundModal} disabled={refundLoading} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50">
                <XCircle size={18} />
              </button>
            </div>

            <form onSubmit={handleRefund} className="space-y-4 p-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="flex justify-between gap-3 text-xs">
                  <span className="text-amber-800">Remaining refundable amount</span>

                  <span className="font-bold tabular-nums text-amber-800">{formatCurrency(remainingRefundable)}</span>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Refund Amount <span className="text-red-500">*</span>
                </label>

                <div className="relative">
                  <IndianRupee size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

                  <input
                    type="number"
                    min="0.01"
                    max={remainingRefundable}
                    step="0.01"
                    value={refundAmount}
                    onChange={(event) => setRefundAmount(event.target.value)}
                    placeholder="Enter refund amount"
                    required
                    disabled={refundLoading}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10 disabled:bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Refund Date <span className="text-red-500">*</span>
                </label>

                <input
                  type="date"
                  value={refundDate}
                  max={today}
                  onChange={(event) => setRefundDate(event.target.value)}
                  required
                  disabled={refundLoading}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10 disabled:bg-slate-50"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Refund Reason <span className="text-red-500">*</span>
                </label>

                <textarea
                  value={refundReason}
                  onChange={(event) => setRefundReason(event.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Enter reason for refund..."
                  required
                  disabled={refundLoading}
                  className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10 disabled:bg-slate-50"
                />

                <p className="mt-1 text-right text-[10px] text-slate-400">{refundReason.length}/500 characters</p>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={closeRefundModal}
                  disabled={refundLoading}
                  className="inline-flex h-9 items-center rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Go Back
                </button>

                <button type="submit" disabled={refundLoading} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-rose-600 px-3 text-xs font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50">
                  {refundLoading ? <LoaderCircle size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                  {refundLoading ? 'Processing...' : 'Confirm Refund'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <section className="min-h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        <div className="h-1 bg-erp-primary" />

        <div className="flex min-h-16 min-w-0 flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-5">
          <div className="min-w-0 flex-1 overflow-hidden">
            <BreadCrumb items={breadcrumbItems} />
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {canMakeRefund && (
              <button
                type="button"
                onClick={openRefundModal}
                disabled={refundLoading}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
              >
                <RotateCcw size={14} />
                Refund
              </button>
            )}

            {refreshing && <LoaderCircle size={15} className="animate-spin text-erp-disabled" />}

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing || refundLoading}
              title="Refresh payment"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={14} />
              Refresh
            </button>

            {canView && (
              <>
                <button
                  type="button"
                  onClick={handleDownloadReceipt}
                  disabled={Boolean(pdfLoading)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pdfLoading === 'download' ? <LoaderCircle size={14} className="animate-spin" /> : <Download size={14} />}
                  Download Receipt
                </button>

                <button
                  type="button"
                  onClick={handlePrintReceipt}
                  disabled={Boolean(pdfLoading)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pdfLoading === 'print' ? <LoaderCircle size={14} className="animate-spin" /> : <Printer size={14} />}
                  Print
                </button>
              </>
            )}

            {canEditPayment && (
              <button type="button" onClick={() => navigate(`/company/payments/${id}/edit`)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-erp-primary px-3 text-xs font-bold text-white transition hover:bg-erp-primary-hover">
                <Pencil size={14} />
                Edit Payment
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Payment Overview */}
      <section className="overflow-hidden rounded-xl border border-erp-border bg-white shadow-erp-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-erp-primary/10 text-erp-primary">
              <ReceiptText size={23} />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-base font-bold text-slate-900">{payment.paymentNumber || 'Payment'}</h1>

              <p className="mt-1 text-xs text-slate-500">Customer Payment Receipt Details</p>
            </div>
          </div>

          <span className={`rounded-full border px-3 py-1 text-[11px] font-bold ${getStatusStyle(status)}`}>{status}</span>
        </div>

        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <DetailItem label="Customer" value={customer?.customerName} icon={UserRound} />

          <DetailItem label="Invoice Number" value={invoice?.invoiceNumber} icon={ReceiptText} />

          <DetailItem label="Payment Date" value={formatDate(payment.paymentDate)} icon={CalendarDays} />

          <DetailItem label="Payment Mode" value={payment.paymentMode} icon={PaymentModeIcon} />

          <DetailItem label="Customer Code" value={customer?.customerCode} icon={Hash} />

          <DetailItem label="Transaction Reference" value={payment.transactionReference} icon={Hash} />

          <DetailItem label="Recorded By" value={payment.recordedBy?.name} icon={UserRound} />

          <DetailItem label="Created At" value={formatDateTime(payment.createdAt)} icon={CalendarDays} />
        </div>
      </section>

      {/* Status Notices */}
      {status === 'Completed' && (
        <section className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />

          <div>
            <p className="text-xs font-bold text-emerald-800">Payment Completed</p>

            <p className="mt-1 text-xs leading-5 text-emerald-700">This payment has been successfully recorded against the invoice.</p>
          </div>
        </section>
      )}

      {isPartiallyRefunded && (
        <section className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-600" />

          <div>
            <p className="text-xs font-bold text-amber-800">Partially Refunded</p>

            <p className="mt-1 text-xs leading-5 text-amber-700">A partial refund has been recorded. The remaining refundable amount is {formatCurrency(remainingRefundable)}.</p>
          </div>
        </section>
      )}

      {isRefunded && (
        <section className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3">
          <XCircle size={18} className="mt-0.5 shrink-0 text-rose-600" />

          <div>
            <p className="text-xs font-bold text-rose-800">Payment Fully Refunded</p>

            <p className="mt-1 text-xs leading-5 text-rose-700">The full payment amount has been refunded. No further refund or payment update is allowed.</p>
          </div>
        </section>
      )}

      {/* Payment Summary Cards */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-erp-border bg-white p-4 shadow-erp-card">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-slate-500">Original Amount</p>

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
              <IndianRupee size={18} />
            </div>
          </div>

          <p className="mt-3 text-xl font-bold tabular-nums text-slate-900">{formatCurrency(originalAmount)}</p>

          <p className="mt-1 text-[11px] text-slate-500">Original payment received</p>
        </div>

        <div className="rounded-xl border border-erp-border bg-white p-4 shadow-erp-card">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-slate-500">Refunded Amount</p>

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
              <RotateCcw size={18} />
            </div>
          </div>

          <p className="mt-3 text-xl font-bold tabular-nums text-rose-700">{formatCurrency(refundedAmount)}</p>

          <p className="mt-1 text-[11px] text-slate-500">Total amount refunded</p>
        </div>

        <div className="rounded-xl border border-erp-border bg-white p-4 shadow-erp-card sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-slate-500">Net Amount Received</p>

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <CircleDollarSign size={18} />
            </div>
          </div>

          <p className="mt-3 text-xl font-bold tabular-nums text-emerald-700">{formatCurrency(netReceived)}</p>

          <p className="mt-1 text-[11px] text-slate-500">Amount retained after refunds</p>
        </div>
      </section>

      {/* Invoice Information */}
      <section className="overflow-hidden rounded-xl border border-erp-border bg-white">
        <SectionHeader icon={ReceiptText} title="Invoice Information" description="Invoice against which this payment was recorded" />

        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <DetailItem label="Invoice Number" value={invoice?.invoiceNumber} icon={Hash} />

          <DetailItem label="Invoice Date" value={formatDate(invoice?.invoiceDate)} icon={CalendarDays} />

          <DetailItem label="Due Date" value={formatDate(invoice?.dueDate)} icon={Clock} />

          <DetailItem label="Invoice Total" value={formatCurrency(invoice?.grandTotal)} icon={IndianRupee} />

          <DetailItem label="Invoice Paid Amount" value={formatCurrency(invoice?.paidAmount)} icon={CreditCard} />

          <DetailItem label="Invoice Balance" value={formatCurrency(invoice?.balanceAmount)} icon={CircleDollarSign} />

          <DetailItem label="Invoice Status" value={invoice?.status} icon={BadgeCheck} />
        </div>
      </section>

      {/* Refund History */}
      <section className="overflow-hidden rounded-xl border border-erp-border bg-white">
        <SectionHeader icon={History} title="Refund History" description={`${refundHistory.length} refund record(s) for this payment`} />

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-100">
                <th className="px-3 py-3 text-[11px] font-bold text-slate-500">Refund Date</th>

                <th className="px-3 py-3 text-right text-[11px] font-bold text-slate-500">Refund Amount</th>

                <th className="px-3 py-3 text-[11px] font-bold text-slate-500">Reason</th>

                <th className="px-3 py-3 text-[11px] font-bold text-slate-500">Refunded By</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {refundHistory.length > 0 ? (
                [...refundHistory].reverse().map((refund, index) => (
                  <tr key={refund._id || index} className="hover:bg-slate-50/70">
                    <td className="px-3 py-3 text-xs font-medium text-slate-700">{formatDate(refund.refundDate)}</td>

                    <td className="px-3 py-3 text-right text-xs font-bold tabular-nums text-rose-700">{formatCurrency(refund.amount)}</td>

                    <td className="max-w-[280px] px-3 py-3">
                      <p className="break-words text-xs text-slate-700">{refund.reason || '—'}</p>
                    </td>

                    <td className="px-3 py-3 text-xs font-medium text-slate-700">{refund.refundedBy?.name || '—'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-3 py-10 text-center">
                    <History size={24} className="mx-auto text-slate-300" />

                    <p className="mt-2 text-xs text-slate-500">No refunds have been recorded for this payment.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Payment Notes */}
      <section className="overflow-hidden rounded-xl border border-erp-border bg-white">
        <SectionHeader icon={FileText} title="Payment Notes" description="Additional payment information" />

        <div className="p-4">
          <p className="whitespace-pre-wrap text-xs leading-6 text-slate-600">{payment.notes || 'No additional notes.'}</p>
        </div>
      </section>

      {/* Record Information */}
      <section className="overflow-hidden rounded-xl border border-erp-border bg-white">
        <SectionHeader icon={ClipboardList} title="Record Information" description="Payment record details" />

        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <DetailItem label="Payment Number" value={payment.paymentNumber} icon={Hash} />

          <DetailItem label="Recorded By" value={payment.recordedBy?.name} icon={UserRound} />

          <DetailItem label="Created At" value={formatDateTime(payment.createdAt)} icon={CalendarDays} />

          <DetailItem label="Last Updated By" value={payment.updatedBy?.name} icon={UserRound} />

          <DetailItem label="Last Updated" value={formatDateTime(payment.updatedAt)} icon={RefreshCw} />
        </div>
      </section>

      {/* Footer */}
      <div className="flex justify-end">
        <button type="button" onClick={() => navigate('/company/payments')} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
          <ArrowLeft size={14} />
          Back to Payments
        </button>
      </div>
    </div>
  )
}
