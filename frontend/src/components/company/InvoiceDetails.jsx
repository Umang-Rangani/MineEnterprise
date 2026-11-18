import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Pencil,
  ReceiptText,
  UserRound,
  CalendarDays,
  Warehouse,
  Package,
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
  Ban,
  Printer,
  Download,
  Mail,
  Send,
  RotateCcw,
  Truck,
  CreditCard,
  CircleDollarSign,
  Building2,
  ShoppingCart,
} from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import Loading from '../Loading/Loading'
import TrashBox from '../../TrashBox/TrashBox'
import { hasPermission, useAuth } from '../../context/AuthContext'

export default function InvoiceDetails() {
  const navigate = useNavigate()
  const { id } = useParams()

  const { permissions } = useAuth()

  const canUpdate = hasPermission(permissions, 'invoice:update')
  const canApprove = hasPermission(permissions, 'invoice:approve')
  const canCancel = hasPermission(permissions, 'invoice:cancel')
  const canDownload = hasPermission(permissions, 'invoice:download')
  const canEmail = hasPermission(permissions, 'invoice:email')

  const [invoice, setInvoice] = useState(null)

  const [loading, setLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState(null)

  const [pdfLoading, setPdfLoading] = useState(null)
  const [emailLoading, setEmailLoading] = useState(false)

  const [confirmation, setConfirmation] = useState({
    isOpen: false,
    type: null,
  })

  const [cancellationReason, setCancellationReason] = useState('')

  const showToast = (type, message, duration = 3000) => {
    setToast({ id: Date.now(), type, message, duration })
  }

  const closeToast = () => setToast(null)

  useEffect(() => {
    document.title = 'Invoice Details | MineERP'
  }, [])

  useEffect(() => {
    let cancelled = false

    const fetchInvoice = async () => {
      if (hasLoaded) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      try {
        const response = await axiosInstance.get(`/erp/invoices/${id}`)

        if (cancelled) return

        const data = response.data

        const invoiceData = data?.invoice || data?.data?.invoice || data?.data || null

        if (!invoiceData) {
          setInvoice(null)
          setHasLoaded(true)
          return
        }

        setInvoice(invoiceData)
        setHasLoaded(true)
      } catch (error) {
        if (!cancelled) {
          showToast('error', error.response?.data?.message || 'Unable to load invoice details.', 5000)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    }

    fetchInvoice()

    return () => {
      cancelled = true
    }
  }, [id, refreshKey])

  const status = invoice?.status || 'Unknown'

  const isDraft = status === 'Draft'
  const isApproved = status === 'Approved'
  const isPartiallyPaid = status === 'Partially Paid'
  const isPaid = status === 'Paid'
  const isOverdue = status === 'Overdue'
  const isCancelled = status === 'Cancelled'

  const paidAmount = Number(invoice?.paidAmount) || 0
  const balanceAmount = Number(invoice?.balanceAmount) || 0

  const canEditInvoice = canUpdate && isDraft

  const canApproveInvoice = canApprove && isDraft

  const canCancelInvoice = canCancel && (isDraft || isApproved) && paidAmount === 0

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
      Draft: 'border-amber-200 bg-amber-50 text-amber-700',
      Approved: 'border-blue-200 bg-blue-50 text-blue-700',
      'Partially Paid': 'border-violet-200 bg-violet-50 text-violet-700',
      Paid: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      Overdue: 'border-rose-200 bg-rose-50 text-rose-700',
      Cancelled: 'border-slate-200 bg-slate-100 text-slate-600',
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

  const openCancelConfirmation = () => {
    setCancellationReason('')

    setConfirmation({
      isOpen: true,
      type: 'cancel',
    })
  }

  const closeConfirmation = () => {
    if (actionLoading) return

    setConfirmation({
      isOpen: false,
      type: null,
    })

    setCancellationReason('')
  }

  const handleConfirmationAction = async () => {
    if (actionLoading) return

    if (confirmation.type === 'cancel' && !cancellationReason.trim()) {
      showToast('error', 'Cancellation reason is required.')
      return
    }

    setActionLoading(true)

    try {
      if (confirmation.type === 'approve') {
        await axiosInstance.patch(`/erp/invoices/${id}/approve`)

        showToast('success', 'Invoice approved successfully.')
      } else if (confirmation.type === 'cancel') {
        await axiosInstance.patch(`/erp/invoices/${id}/cancel`, {
          reason: cancellationReason.trim(),
        })

        showToast('success', 'Invoice cancelled successfully.')
      }

      setConfirmation({
        isOpen: false,
        type: null,
      })

      setCancellationReason('')

      setRefreshKey((current) => current + 1)
    } catch (error) {
      showToast('error', error.response?.data?.message || `Unable to ${confirmation.type} invoice.`, 5000)
    } finally {
      setActionLoading(false)
    }
  }

  const emailStatus = invoice?.emailStatus || 'Not Sent'
  const emailHistory = Array.isArray(invoice?.emailHistory) ? invoice.emailHistory : []
  const canEmailInvoice = canEmail && ['Approved', 'Partially Paid', 'Paid', 'Overdue'].includes(status)
  const canSendInvoiceEmail = canEmailInvoice && emailStatus === 'Not Sent'
  const canRetryInvoiceEmail = canEmailInvoice && emailStatus === 'Failed'

  const updateInvoiceFromEmailResponse = (payload) => {
    const updatedInvoice = payload?.invoice || payload?.data?.invoice || (payload?.data?._id ? payload.data : null)

    if (updatedInvoice?._id) {
      setInvoice(updatedInvoice)
    }
  }

  const handleInvoiceEmail = async (retry = false) => {
    if (emailLoading || (!canSendInvoiceEmail && !canRetryInvoiceEmail)) return

    setEmailLoading(true)

    try {
      const response = retry ? await axiosInstance.patch(`/erp/invoices/${id}/retry-email`) : await axiosInstance.post(`/erp/invoices/${id}/email`)

      updateInvoiceFromEmailResponse(response.data)

      const result = response.data?.status || response.data?.emailStatus
      if (result === 'failed' || result === 'Failed') {
        showToast('error', response.data?.message || 'Invoice email delivery failed.', 5000)
      } else {
        showToast('success', response.data?.message || (retry ? 'Invoice email retry completed.' : 'Invoice email sent successfully.'))
      }

      if (!response.data?.invoice && !response.data?.data?.invoice && !response.data?.data?._id) {
        setRefreshKey((current) => current + 1)
      }
    } catch (error) {
      updateInvoiceFromEmailResponse(error.response?.data)
      setRefreshKey((current) => current + 1)
      showToast('error', error.response?.data?.message || (retry ? 'Unable to retry invoice email.' : 'Unable to send invoice email.'), 5000)
    } finally {
      setEmailLoading(false)
    }
  }

  const getEmailStatusStyle = (value) => {
    const styles = {
      'Not Sent': 'border-slate-200 bg-slate-100 text-slate-600',
      Pending: 'border-amber-200 bg-amber-50 text-amber-700',
      Sent: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      Failed: 'border-rose-200 bg-rose-50 text-rose-700',
    }

    return styles[value] || 'border-slate-200 bg-slate-100 text-slate-600'
  }

  const canAccessPdf = canDownload && ['Approved', 'Partially Paid', 'Paid', 'Overdue'].includes(status)

  const getInvoicePdf = async () => {
    const response = await axiosInstance.get(`/erp/invoices/${id}/pdf`, {
      responseType: 'blob',
    })

    return response.data
  }

  const getInvoiceFileName = () => {
    const invoiceNumber = String(invoice?.invoiceNumber || 'Invoice').replace(/[^a-zA-Z0-9_-]/g, '_')

    return `${invoiceNumber}.pdf`
  }

  const handleDownloadPDF = async () => {
    if (!canAccessPdf || pdfLoading) return

    setPdfLoading('download')

    try {
      const pdfBlob = await getInvoicePdf()

      const pdfUrl = window.URL.createObjectURL(new Blob([pdfBlob], { type: 'application/pdf' }))

      const link = document.createElement('a')

      link.href = pdfUrl
      link.download = getInvoiceFileName()

      document.body.appendChild(link)
      link.click()
      link.remove()

      window.setTimeout(() => {
        window.URL.revokeObjectURL(pdfUrl)
      }, 1000)

      showToast('success', 'Invoice PDF downloaded successfully.')
    } catch (error) {
      showToast('error', error.response?.data?.message || 'Unable to download invoice PDF.', 5000)
    } finally {
      setPdfLoading(null)
    }
  }

  const handlePrint = async () => {
    if (!canAccessPdf || pdfLoading) return

    // Open tab immediately to avoid browser popup blocking.
    const printWindow = window.open('', '_blank')

    if (!printWindow) {
      showToast('error', 'Please allow pop-ups to print the invoice.')
      return
    }

    setPdfLoading('print')

    try {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Preparing Invoice PDF</title>
          </head>
          <body style="font-family: Arial, sans-serif; padding: 30px; text-align: center;">
            Preparing invoice PDF...
          </body>
        </html>
      `)

      printWindow.document.close()

      const pdfBlob = await getInvoicePdf()

      const pdfUrl = window.URL.createObjectURL(new Blob([pdfBlob], { type: 'application/pdf' }))

      printWindow.location.replace(pdfUrl)

      // Keep the URL alive while the PDF viewer is open.
      window.setTimeout(
        () => {
          window.URL.revokeObjectURL(pdfUrl)
        },
        10 * 60 * 1000,
      )
    } catch (error) {
      printWindow.close()

      showToast('error', error.response?.data?.message || 'Unable to open invoice PDF for printing.', 5000)
    } finally {
      setPdfLoading(null)
    }
  }

  const confirmationConfig =
    confirmation.type === 'approve'
      ? {
          title: 'Approve Invoice',
          message: 'Are you sure you want to approve this invoice? Once approved, the invoice will be finalized.',
          actionButtonText: 'Approve Invoice',
          warningText: 'Please verify the customer, dispatch quantities and invoice amount before approval.',
          variant: 'activate',
        }
      : {
          title: 'Cancel Invoice',
          message: 'Are you sure you want to cancel this invoice? This action will release the reserved invoice quantities.',
          actionButtonText: 'Cancel Invoice',
          warningText: 'The cancellation reason will be saved in this invoice.',
          variant: 'deactivate',
        }

  const breadcrumbItems = [
    { title: 'Invoices', link: '/company/invoices' },
    {
      title: invoice?.invoiceNumber || 'Invoice Details',
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

      <div>
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>

        <p className="text-[11px] text-slate-500">{description}</p>
      </div>
    </div>
  )

  const invoiceItems = Array.isArray(invoice?.items) ? invoice.items : []

  const subtotal = Number(invoice?.subtotal) || 0
  const discount = Number(invoice?.discount) || 0
  const taxAmount = Number(invoice?.taxAmount) || 0
  const grandTotal = Number(invoice?.grandTotal) || 0

  const customer = invoice?.customerId && typeof invoice.customerId === 'object' ? invoice.customerId : null

  const salesOrder = invoice?.salesOrderId && typeof invoice.salesOrderId === 'object' ? invoice.salesOrderId : null

  const warehouse = invoice?.warehouseId && typeof invoice.warehouseId === 'object' ? invoice.warehouseId : null

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
            <Loading fullScreen={false} label="Loading invoice" description="Fetching invoice information..." className="!h-full min-h-[400px]" />
          </div>
        </section>
      </div>
    )
  }

  if (!invoice) {
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

          <h2 className="mt-3 text-sm font-bold text-slate-800">Invoice not found</h2>

          <p className="mt-1 text-xs text-slate-500">Unable to find this invoice or you may not have access.</p>

          <div className="mt-4 flex justify-center gap-2">
            <button type="button" onClick={() => navigate('/company/invoices')} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              <ArrowLeft size={14} />
              Back to Invoices
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
        showReasonInput={confirmation.type === 'cancel'}
        reason={cancellationReason}
        onReasonChange={setCancellationReason}
        reasonPlaceholder="Enter cancellation reason..."
      />

      {/* Header */}
      <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card print:hidden">
        <div className="h-1 bg-erp-primary" />

        <div className="flex h-[calc(100%-4px)] min-w-0 items-center justify-between gap-3 px-4 sm:px-5">
          <div className="min-w-0 flex-1 overflow-hidden">
            <BreadCrumb items={breadcrumbItems} />
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {canApproveInvoice && (
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

            {canCancelInvoice && (
              <button
                type="button"
                onClick={openCancelConfirmation}
                disabled={actionLoading}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
              >
                <Ban size={14} />
                Cancel
              </button>
            )}

            {refreshing && <LoaderCircle size={15} className="animate-spin text-erp-disabled" />}

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing || actionLoading}
              title="Refresh invoice"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={14} />
              Refresh
            </button>

            {/* {canDownload && (
              <button type="button" onClick={handlePrint} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">
                <Printer size={14} />
                Print
              </button>
            )} */}

            {canSendInvoiceEmail && (
              <button
                type="button"
                onClick={() => handleInvoiceEmail(false)}
                disabled={emailLoading || actionLoading}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-erp-primary px-3 text-xs font-bold text-white transition hover:bg-erp-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {emailLoading ? <LoaderCircle size={14} className="animate-spin" /> : <Send size={14} />}
                Send Email
              </button>
            )}

            {canRetryInvoiceEmail && (
              <button
                type="button"
                onClick={() => handleInvoiceEmail(true)}
                disabled={emailLoading || actionLoading}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {emailLoading ? <LoaderCircle size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                Retry Email
              </button>
            )}

            {emailStatus === 'Pending' && (
              <span className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 text-xs font-semibold text-amber-700">
                <LoaderCircle size={14} className="animate-spin" />
                Email Pending
              </span>
            )}

            {canAccessPdf && (
              <>
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  disabled={Boolean(pdfLoading)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pdfLoading === 'download' ? <LoaderCircle size={14} className="animate-spin" /> : <Download size={14} />}
                  Download PDF
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={Boolean(pdfLoading)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pdfLoading === 'print' ? <LoaderCircle size={14} className="animate-spin" /> : <Printer size={14} />}
                  Print
                </button>
              </>
            )}

            {canEditInvoice && (
              <button
                type="button"
                onClick={() => navigate(`/company/invoices/${id}/edit`)}
                disabled={actionLoading}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-erp-primary px-3 text-xs font-bold text-white transition hover:bg-erp-primary-hover disabled:opacity-50"
              >
                <Pencil size={14} />
                Edit Invoice
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Invoice Overview */}
      <section className="overflow-hidden rounded-xl border border-erp-border bg-white shadow-erp-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-erp-primary/10 text-erp-primary">
              <ReceiptText size={23} />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-base font-bold text-slate-900">{invoice.invoiceNumber || 'Invoice'}</h1>

              <p className="mt-1 text-xs text-slate-500">Customer Invoice Details</p>
            </div>
          </div>

          <span className={`rounded-full border px-3 py-1 text-[11px] font-bold ${getStatusStyle(status)}`}>{status}</span>
        </div>

        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <DetailItem label="Customer" value={customer?.customerName} icon={UserRound} />
          <DetailItem label="Sales Order" value={salesOrder?.orderNumber || salesOrder?.salesOrderNumber} icon={ShoppingCart} />

          <DetailItem label="Invoice Date" value={formatDate(invoice.invoiceDate)} icon={CalendarDays} />

          <DetailItem label="Due Date" value={formatDate(invoice.dueDate)} icon={Clock} />

          <DetailItem label="Warehouse" value={warehouse?.warehouseName || warehouse?.name} icon={Warehouse} />

          <DetailItem label="Customer Code" value={customer?.customerCode} icon={Hash} />

          <DetailItem label="Created By" value={invoice.createdBy?.name} icon={UserRound} />

          <DetailItem label="Created At" value={formatDateTime(invoice.createdAt)} icon={CalendarDays} />
        </div>
      </section>

      {/* Status Notices */}
      {isDraft && (
        <section className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-600" />

          <div>
            <p className="text-xs font-bold text-amber-800">Draft Invoice</p>

            <p className="mt-1 text-xs leading-5 text-amber-700">This invoice has not been approved yet. Verify all invoice details before approval.</p>
          </div>
        </section>
      )}

      {isApproved && (
        <section className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-blue-600" />

          <div>
            <p className="text-xs font-bold text-blue-800">Invoice Approved</p>

            <p className="mt-1 text-xs leading-5 text-blue-700">This invoice has been approved. The outstanding amount can be collected through the Payments module.</p>
          </div>
        </section>
      )}

      {isPartiallyPaid && (
        <section className="flex items-start gap-3 rounded-xl border border-violet-200 bg-violet-50 p-3">
          <CreditCard size={18} className="mt-0.5 shrink-0 text-violet-600" />

          <div>
            <p className="text-xs font-bold text-violet-800">Partially Paid</p>

            <p className="mt-1 text-xs leading-5 text-violet-700">Payment has been received against this invoice, but an outstanding balance remains.</p>
          </div>
        </section>
      )}

      {isPaid && (
        <section className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />

          <div>
            <p className="text-xs font-bold text-emerald-800">Invoice Fully Paid</p>

            <p className="mt-1 text-xs leading-5 text-emerald-700">The full invoice amount has been received.</p>
          </div>
        </section>
      )}

      {isOverdue && (
        <section className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-rose-600" />

          <div>
            <p className="text-xs font-bold text-rose-800">Payment Overdue</p>

            <p className="mt-1 text-xs leading-5 text-rose-700">The invoice due date has passed and an outstanding amount remains.</p>
          </div>
        </section>
      )}

      {isCancelled && (
        <section className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3">
          <XCircle size={18} className="mt-0.5 shrink-0 text-red-600" />

          <div>
            <p className="text-xs font-bold text-red-800">Invoice Cancelled</p>

            <p className="mt-1 text-xs leading-5 text-red-700">This invoice has been cancelled and cannot be edited or approved.</p>
          </div>
        </section>
      )}

      {/* Payment Summary Cards */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-erp-border bg-white p-4 shadow-erp-card">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-slate-500">Grand Total</p>

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
              <IndianRupee size={18} />
            </div>
          </div>

          <p className="mt-3 text-xl font-bold tabular-nums text-slate-900">{formatCurrency(grandTotal)}</p>

          <p className="mt-1 text-[11px] text-slate-500">Total invoice value</p>
        </div>

        <div className="rounded-xl border border-erp-border bg-white p-4 shadow-erp-card">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-slate-500">Paid Amount</p>

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <CreditCard size={18} />
            </div>
          </div>

          <p className="mt-3 text-xl font-bold tabular-nums text-emerald-700">{formatCurrency(paidAmount)}</p>

          <p className="mt-1 text-[11px] text-slate-500">Amount received</p>
        </div>

        <div className="rounded-xl border border-erp-border bg-white p-4 shadow-erp-card sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-slate-500">Outstanding Balance</p>

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <CircleDollarSign size={18} />
            </div>
          </div>

          <p className="mt-3 text-xl font-bold tabular-nums text-amber-700">{formatCurrency(balanceAmount)}</p>

          <p className="mt-1 text-[11px] text-slate-500">Remaining amount</p>
        </div>
      </section>

      {/* Invoice Items */}
      <section className="overflow-hidden rounded-xl border border-erp-border bg-white">
        <SectionHeader icon={Package} title="Invoice Items" description={`${invoiceItems.length} product line(s) in this invoice`} />

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-100">
                <th className="px-3 py-3 text-[11px] font-bold text-slate-500">Product</th>
                <th className="px-3 py-3 text-[11px] font-bold text-slate-500">Dispatch</th>
                <th className="px-3 py-3 text-right text-[11px] font-bold text-slate-500">Quantity</th>
                <th className="px-3 py-3 text-right text-[11px] font-bold text-slate-500">Rate</th>
                <th className="px-3 py-3 text-right text-[11px] font-bold text-slate-500">Discount</th>
                <th className="px-3 py-3 text-right text-[11px] font-bold text-slate-500">GST</th>
                <th className="px-3 py-3 text-right text-[11px] font-bold text-slate-500">Tax Amount</th>
                <th className="px-3 py-3 text-right text-[11px] font-bold text-slate-500">Line Total</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {invoiceItems.length > 0 ? (
                invoiceItems.map((item, index) => {
                  const dispatch = item.dispatchId && typeof item.dispatchId === 'object' ? item.dispatchId : null

                  return (
                    <tr key={item._id || index} className="hover:bg-slate-50/70">
                      <td className="px-3 py-3">
                        <p className="text-xs font-bold text-slate-800">{item.productName || item.productId?.name || '—'}</p>

                        <p className="mt-1 text-[10px] text-slate-500">SKU: {item.sku || item.productId?.sku || '—'}</p>
                      </td>

                      <td className="px-3 py-3">
                        <p className="text-xs font-semibold text-slate-700">{dispatch?.dispatchNumber || '—'}</p>

                        <p className="mt-1 text-[10px] text-slate-500">{formatDate(dispatch?.dispatchDate)}</p>
                      </td>

                      <td className="px-3 py-3 text-right text-xs font-semibold tabular-nums text-slate-700">
                        {Number(item.quantity) || 0} {item.unit || ''}
                      </td>

                      <td className="px-3 py-3 text-right text-xs tabular-nums text-slate-700">{formatCurrency(item.rate)}</td>

                      <td className="px-3 py-3 text-right text-xs tabular-nums text-red-600">{formatCurrency(item.discount)}</td>

                      <td className="px-3 py-3 text-right text-xs text-slate-700">{Number(item.taxRate) || 0}%</td>

                      <td className="px-3 py-3 text-right text-xs tabular-nums text-slate-700">{formatCurrency(item.taxAmount)}</td>

                      <td className="px-3 py-3 text-right text-xs font-bold tabular-nums text-slate-900">{formatCurrency(item.lineTotal)}</td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center">
                    <Package size={24} className="mx-auto text-slate-300" />

                    <p className="mt-2 text-xs text-slate-500">No invoice items found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Amount Breakdown & Additional Information */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Left Column */}
        <div className="flex min-w-0 flex-col gap-4">
          {/* Approval Information */}
          {(invoice.approvedBy || invoice.approvedAt) && (
            <section className="overflow-hidden rounded-xl border border-erp-border bg-white">
              <SectionHeader icon={CheckCircle2} title="Approval Information" description="Invoice approval details" />

              <div className="grid gap-4 p-4 sm:grid-cols-2">
                <DetailItem label="Approved By" value={invoice.approvedBy?.name} icon={UserRound} />

                <DetailItem label="Approved At" value={formatDateTime(invoice.approvedAt)} icon={CalendarDays} />

                {/* <DetailItem label="Approval Status" value={invoice.approvedAt ? 'Approved' : 'Not Approved'} icon={CheckCircle2} /> */}
              </div>
            </section>
          )}

          {/* Invoice Notes */}
          <section className="flex-1 overflow-hidden rounded-xl border border-erp-border bg-white">
            <SectionHeader icon={FileText} title="Invoice Notes" description="Additional invoice information" />

            <div className="p-4">
              <p className="whitespace-pre-wrap text-xs leading-6 text-slate-600">{invoice.notes || 'No additional notes.'}</p>
            </div>
          </section>
        </div>

        {/* Right Column - Amount Breakdown */}
        <section className="h-fit overflow-hidden rounded-xl border border-erp-border bg-white shadow-erp-card">
          <div className="flex items-center gap-2 border-b border-slate-100 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
              <IndianRupee size={17} />
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900">Amount Breakdown</h2>

              <p className="text-[11px] text-slate-500">Invoice payment summary</p>
            </div>
          </div>

          <div className="space-y-3 p-4">
            <div className="flex justify-between gap-3 text-xs">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-semibold tabular-nums text-slate-800">{formatCurrency(subtotal)}</span>
            </div>

            <div className="flex justify-between gap-3 text-xs">
              <span className="text-slate-500">Discount</span>
              <span className="font-semibold tabular-nums text-red-600">- {formatCurrency(discount)}</span>
            </div>

            <div className="flex justify-between gap-3 text-xs">
              <span className="text-slate-500">Tax Amount</span>
              <span className="font-semibold tabular-nums text-slate-800">{formatCurrency(taxAmount)}</span>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <div className="flex justify-between gap-3">
                <span className="text-xs font-bold text-slate-800">Grand Total</span>

                <span className="text-lg font-bold tabular-nums text-erp-primary">{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            <div className="flex justify-between gap-3 border-t border-slate-100 pt-3 text-xs">
              <span className="text-slate-500">Paid Amount</span>

              <span className="font-semibold tabular-nums text-emerald-700">{formatCurrency(paidAmount)}</span>
            </div>

            <div className="flex justify-between gap-3 text-xs">
              <span className="font-bold text-slate-800">Balance Due</span>

              <span className="font-bold tabular-nums text-amber-700">{formatCurrency(balanceAmount)}</span>
            </div>
          </div>
        </section>
      </section>

      {/* Cancellation Information */}
      {invoice.status === 'Cancelled' && (
        <section className="overflow-hidden rounded-xl border border-red-200 bg-white">
          <SectionHeader icon={XCircle} title="Cancellation Information" description="Invoice cancellation details" />

          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <DetailItem label="Cancelled By" value={invoice.cancelledBy?.name} icon={UserRound} />

            <DetailItem label="Cancelled At" value={formatDateTime(invoice.cancelledAt)} icon={CalendarDays} />

            <div className="sm:col-span-2">
              <DetailItem label="Cancellation Reason" value={invoice.cancellationReason} icon={FileText} />
            </div>
          </div>
        </section>
      )}

      {/* Invoice Email Information */}
      {(canEmail || emailHistory.length > 0 || emailStatus !== 'Not Sent') && (
        <section className="overflow-hidden rounded-xl border border-erp-border bg-white">
          <SectionHeader icon={Mail} title="Invoice Email" description="Email delivery status and attempt history" />

          <div className="space-y-4 p-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-[11px] font-medium text-slate-500">Email Status</p>
                <div className="mt-1">
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold ${getEmailStatusStyle(emailStatus)}`}>{emailStatus}</span>
                </div>
              </div>

              <DetailItem label="Recipient Email" value={invoice.emailSentTo || customer?.email} icon={Mail} />
              <DetailItem label="Last Sent At" value={formatDateTime(invoice.emailSentAt)} icon={CalendarDays} />
            </div>

            {invoice.emailError && emailStatus === 'Failed' && (
              <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3">
                <AlertCircle size={15} className="mt-0.5 shrink-0 text-rose-600" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-rose-800">Email Delivery Error</p>
                  <p className="mt-1 break-words text-xs leading-5 text-rose-700">{invoice.emailError}</p>
                </div>
              </div>
            )}

            <div className="border-t border-slate-100 pt-3">
              <h3 className="text-xs font-bold text-slate-800">Email History</h3>

              {emailHistory.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {[...emailHistory].reverse().map((event, index) => (
                    <div key={event._id || `${event.attemptedAt || 'attempt'}-${index}`} className="rounded-lg border border-slate-100 bg-slate-50/70 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <Mail size={14} className="shrink-0 text-slate-400" />
                          <p className="break-all text-xs font-semibold text-slate-800">{event.to || 'No recipient recorded'}</p>
                        </div>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${getEmailStatusStyle(event.status)}`}>{event.status || 'Unknown'}</span>
                      </div>

                      <div className="mt-2 grid gap-2 text-[11px] text-slate-500 sm:grid-cols-2">
                        <p>
                          Attempted: <span className="font-medium text-slate-700">{formatDateTime(event.attemptedAt)}</span>
                        </p>
                        <p>
                          Sent: <span className="font-medium text-slate-700">{formatDateTime(event.sentAt)}</span>
                        </p>
                      </div>

                      {event.error && <p className="mt-2 break-words text-[11px] leading-5 text-rose-600">{event.error}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-slate-500">No email attempts have been recorded.</p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Record Information */}
      <section className="overflow-hidden rounded-xl border border-erp-border bg-white">
        <SectionHeader icon={ClipboardList} title="Record Information" description="Invoice record details" />

        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <DetailItem label="Invoice Number" value={invoice.invoiceNumber} icon={Hash} />

          <DetailItem label="Created At" value={formatDateTime(invoice.createdAt)} icon={CalendarDays} />

          <DetailItem label="Created By" value={invoice.createdBy?.name} icon={UserRound} />

          <DetailItem label="Last Updated" value={formatDateTime(invoice.updatedAt)} icon={RefreshCw} />
        </div>
      </section>

      {/* Footer */}
      <div className="flex justify-end print:hidden">
        <button type="button" onClick={() => navigate('/company/invoices')} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
          <ArrowLeft size={14} />
          Back to Invoices
        </button>
      </div>
    </div>
  )
}
