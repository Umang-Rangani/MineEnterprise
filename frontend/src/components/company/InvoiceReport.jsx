import { useEffect, useState } from 'react'
import {
  Search,
  RefreshCw,
  CalendarDays,
  FileText,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Wallet,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CircleAlert,
  LoaderCircle,
  FilterX,
  ChartNoAxesCombined,
  CheckCircle2,
  Receipt,
  Clock,
  Mail,
  Ban,
  ClipboardList,
} from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import Loading from '../Loading/Loading'
import TrashBox from '../../TrashBox/TrashBox'
import { hasPermission, useAuth } from '../../context/AuthContext'

const statusStyles = {
  Draft: 'border-slate-200 bg-slate-100 text-slate-600',
  Approved: 'border-blue-200 bg-blue-50 text-blue-700',
  'Partially Paid': 'border-amber-200 bg-amber-50 text-amber-700',
  Paid: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Overdue: 'border-rose-200 bg-rose-50 text-rose-700',
  Cancelled: 'border-slate-300 bg-slate-100 text-slate-500',
}

const emailStatusStyles = {
  Sent: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Pending: 'border-amber-200 bg-amber-50 text-amber-700',
  Failed: 'border-rose-200 bg-rose-50 text-rose-700',
  'Not Sent': 'border-slate-200 bg-slate-100 text-slate-600',
}

const formatNumber = (value) =>
  new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)

const formatDate = (value) => {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const getReportArray = (response) => {
  const data = response?.data

  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.invoices)) return data.invoices
  if (Array.isArray(data?.data?.invoices)) return data.data.invoices

  return []
}

const escapeCSV = (value) => {
  const text = String(value ?? '')
  return `"${text.replace(/"/g, '""')}"`
}

const getSummaryValue = (summary, keys, fallback = 0) => {
  for (const key of keys) {
    if (summary?.[key] !== undefined && summary?.[key] !== null) {
      return summary[key]
    }
  }

  return fallback
}

export default function InvoiceReport() {
  const { permissions } = useAuth()

  const canView = hasPermission(permissions, 'reports:invoice')
  const canExport = hasPermission(permissions, 'reports:export')

  const [reportRows, setReportRows] = useState([])

  const [loading, setLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)

  const [apiError, setApiError] = useState('')
  const [toast, setToast] = useState(null)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [status, setStatus] = useState('All')

  const [page, setPage] = useState(1)
  const [pageLimit, setPageLimit] = useState(10)

  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 10,
  })

  const [summary, setSummary] = useState({})

  const [refreshKey, setRefreshKey] = useState(0)
  const [showExportConfirmation, setShowExportConfirmation] = useState(false)

  const breadcrumbItems = [
    { title: 'Reports', link: '/company/reports' },
    { title: 'Invoice Report', link: null },
  ]

  const showToast = (type, message, duration = 3000) => {
    setToast({
      id: Date.now(),
      type,
      message,
      duration,
    })
  }

  useEffect(() => {
    document.title = 'Invoice Report | MineERP'
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, 350)

    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    if (!canView) {
      setLoading(false)
      return
    }

    let cancelled = false

    const fetchInvoiceReport = async () => {
      if (hasLoaded) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      setApiError('')

      try {
        const response = await axiosInstance.get('/erp/reports/invoice', {
          params: {
            page,
            limit: pageLimit,
            search: debouncedSearch || undefined,
            fromDate: fromDate || undefined,
            toDate: toDate || undefined,
            status: status === 'All' ? undefined : status,
          },
        })

        if (cancelled) return

        const data = response.data

        if (data?.success === false) {
          throw new Error(data.message || 'Unable to load invoice report.')
        }

        const rows = getReportArray(response)

        setReportRows(rows)
        setSummary(data?.summary || data?.data?.summary || {})

        const serverPagination = data?.pagination || data?.data?.pagination || {}

        setPagination({
          total: Number(serverPagination.total) || 0,
          totalPages: Math.max(1, Number(serverPagination.totalPages) || 1),
          currentPage: Number(serverPagination.currentPage || serverPagination.page) || page,
          limit: Number(serverPagination.limit) || pageLimit,
        })

        setHasLoaded(true)
      } catch (error) {
        if (!cancelled) {
          const message = error.response?.data?.message || error.message || 'Unable to load invoice report.'

          setApiError(message)
          showToast('error', message, 5000)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    }

    fetchInvoiceReport()

    return () => {
      cancelled = true
    }
  }, [canView, page, debouncedSearch, fromDate, toDate, status, refreshKey, pageLimit])

  const handleRefresh = () => {
    if (refreshing || loading) return

    setRefreshKey((previous) => previous + 1)
  }

  const handleClearFilters = () => {
    setSearch('')
    setDebouncedSearch('')
    setFromDate('')
    setToDate('')
    setStatus('All')
    setPage(1)
  }

  const hasActiveFilters = Boolean(search.trim()) || Boolean(fromDate) || Boolean(toDate) || status !== 'All'

  const handleExport = () => {
    if (!canExport || reportRows.length === 0 || isExporting) return

    setShowExportConfirmation(true)
  }

  const confirmExport = () => {
    if (!canExport || reportRows.length === 0 || isExporting) return

    setIsExporting(true)

    try {
      const headers = [
        'Invoice Number',
        'Invoice Date',
        'Due Date',
        'Customer Name',
        'Customer Code',
        'Sales Order',
        'Warehouse',
        'Status',
        'Subtotal',
        'Discount',
        'Tax Amount',
        'Grand Total',
        'Paid Amount',
        'Balance Amount',
        'Item Count',
        'Email Status',
        'Email Sent To',
        'Email Sent Date',
        'Notes',
      ]

      const rows = reportRows.map((invoice) => [
        invoice.invoiceNumber,
        formatDate(invoice.invoiceDate),
        formatDate(invoice.dueDate),
        invoice.customer?.name,
        invoice.customer?.code,
        invoice.salesOrder?.orderNumber,
        invoice.warehouse?.name,
        invoice.status,
        invoice.subtotal,
        invoice.discount,
        invoice.taxAmount,
        invoice.grandTotal,
        invoice.paidAmount,
        invoice.balanceAmount,
        invoice.itemCount,
        invoice.emailStatus || 'Not Sent',
        invoice.emailSentTo,
        formatDate(invoice.emailSentAt),
        invoice.notes,
      ])

      const csvContent = [headers.map(escapeCSV).join(','), ...rows.map((row) => row.map(escapeCSV).join(','))].join('\n')

      const blob = new Blob(['\uFEFF' + csvContent], {
        type: 'text/csv;charset=utf-8;',
      })

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = url
      link.download = `invoice-report-${new Date().toISOString().slice(0, 10)}-page-${page}.csv`

      document.body.appendChild(link)
      link.click()
      link.remove()

      window.setTimeout(() => URL.revokeObjectURL(url), 1000)

      setShowExportConfirmation(false)
      showToast('success', 'Invoice report exported successfully.')
    } catch (error) {
      showToast('error', error.message || 'Unable to export invoice report.')
    } finally {
      setIsExporting(false)
    }
  }

  const handlePrint = async () => {
    if (isPrinting) return

    const printWindow = window.open('', '_blank')

    if (!printWindow) {
      showToast('error', 'Please allow pop-ups to print the report.')
      return
    }

    setIsPrinting(true)

    try {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Invoice Report</title>
          </head>
          <body style="font-family: Arial, sans-serif; padding: 30px; text-align: center;">
            Generating Invoice Report PDF...
          </body>
        </html>
      `)

      const response = await axiosInstance.get('/erp/reports/invoice/pdf', {
        params: {
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          status: status === 'All' ? undefined : status,
          search: debouncedSearch || undefined,
        },
        responseType: 'blob',
      })

      const pdfBlob = new Blob([response.data], {
        type: 'application/pdf',
      })

      const pdfUrl = URL.createObjectURL(pdfBlob)

      printWindow.location.href = pdfUrl

      showToast('success', 'Invoice Report PDF generated successfully.')

      window.setTimeout(() => {
        URL.revokeObjectURL(pdfUrl)
      }, 60000)
    } catch (error) {
      printWindow.close()

      let message = 'Unable to generate Invoice Report PDF.'

      if (error.response?.data instanceof Blob) {
        try {
          const errorData = JSON.parse(await error.response.data.text())
          message = errorData.message || message
        } catch {
          // Keep default error message.
        }
      } else {
        message = error.response?.data?.message || error.message || message
      }

      showToast('error', message, 5000)
    } finally {
      setIsPrinting(false)
    }
  }

  const totalInvoices = getSummaryValue(summary, ['totalInvoices'], pagination.total)
  const draftInvoices = getSummaryValue(summary, ['draftInvoices', 'draftCount'])
  const approvedInvoices = getSummaryValue(summary, ['approvedInvoices', 'approvedCount'])
  const partiallyPaidInvoices = getSummaryValue(summary, ['partiallyPaidInvoices', 'partiallyPaidCount'])
  const paidInvoices = getSummaryValue(summary, ['paidInvoices', 'paidCount'])
  const overdueInvoices = getSummaryValue(summary, ['overdueInvoices', 'overdueCount'])
  const cancelledInvoices = getSummaryValue(summary, ['cancelledInvoices', 'cancelledCount'])

  const grandTotal = getSummaryValue(summary, ['grandTotal', 'totalGrandTotal'])
  const totalPaid = getSummaryValue(summary, ['totalPaid', 'paidAmount'])
  const outstanding = getSummaryValue(summary, ['totalOutstanding', 'outstanding', 'balanceAmount'])

  const statCards = [
    {
      title: 'Total Invoices',
      value: formatNumber(totalInvoices),
      icon: Receipt,
      iconBg: 'bg-violet-50',
      iconColor: 'text-violet-600',
      valueColor: 'text-erp-text',
      description: 'Invoices matching filters',
    },
    {
      title: 'Draft',
      value: formatNumber(draftInvoices),
      icon: FileText,
      iconBg: 'bg-slate-100',
      iconColor: 'text-slate-600',
      valueColor: 'text-erp-text',
      description: 'Pending approval',
    },
    {
      title: 'Approved',
      value: formatNumber(approvedInvoices),
      icon: CheckCircle2,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      valueColor: 'text-blue-700',
      description: 'Approved invoices',
    },
    {
      title: 'Partially Paid',
      value: formatNumber(partiallyPaidInvoices),
      icon: Clock,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      valueColor: 'text-amber-700',
      description: 'Payment in progress',
    },
    {
      title: 'Paid',
      value: formatNumber(paidInvoices),
      icon: TrendingUp,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      valueColor: 'text-emerald-700',
      description: 'Fully paid invoices',
    },
    {
      title: 'Overdue',
      value: formatNumber(overdueInvoices),
      icon: TrendingDown,
      iconBg: 'bg-rose-50',
      iconColor: 'text-rose-600',
      valueColor: 'text-rose-700',
      description: 'Past due invoices',
    },
    {
      title: 'Grand Total',
      value: formatCurrency(grandTotal),
      icon: IndianRupee,
      iconBg: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
      valueColor: 'text-erp-text',
      description: 'Eligible invoice value',
    },
    {
      title: 'Amount Received',
      value: formatCurrency(totalPaid),
      icon: Wallet,
      iconBg: 'bg-teal-50',
      iconColor: 'text-teal-600',
      valueColor: 'text-teal-700',
      description: 'Payments received',
    },
    {
      title: 'Outstanding',
      value: formatCurrency(outstanding),
      icon: TrendingDown,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      valueColor: 'text-amber-700',
      description: 'Pending collection',
    },
    {
      title: 'Cancelled',
      value: formatNumber(cancelledInvoices),
      icon: Ban,
      iconBg: 'bg-slate-100',
      iconColor: 'text-slate-500',
      valueColor: 'text-slate-600',
      description: 'Cancelled invoices',
    },
  ]

  const startRecord = pagination.total === 0 ? 0 : (pagination.currentPage - 1) * pagination.limit + 1

  const endRecord = Math.min(pagination.currentPage * pagination.limit, pagination.total)

  if (!canView) {
    return (
      <div className="flex min-h-[350px] flex-col items-center justify-center rounded-xl border border-erp-border bg-erp-surface p-6 text-center shadow-erp-card">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <CircleAlert size={26} />
        </div>

        <h2 className="mt-4 text-base font-bold text-erp-text">Access Restricted</h2>

        <p className="mt-1 max-w-sm text-xs text-erp-muted">You do not have permission to view the Invoice Report.</p>
      </div>
    )
  }

  if (loading && !hasLoaded) {
    return (
      <div className="min-w-0 space-y-4 text-sm">
        <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="h-1 bg-erp-primary" />

          <div className="flex min-h-16 items-center px-4 sm:px-5">
            <BreadCrumb items={breadcrumbItems} />
          </div>
        </section>

        <section className="relative min-h-[420px] overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex min-h-[420px] items-center justify-center">
            <Loading fullScreen={false} label="Loading invoice report" description="Fetching invoice and payment information..." className="!h-full min-h-[420px]" />
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-4 pb-8 text-sm">
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card print:hidden">
        <div className="h-1 bg-erp-primary" />

        <div className="flex min-h-16 flex-col justify-between gap-2 px-4 py-2 sm:flex-row sm:items-center sm:px-5">
          <div className="min-w-0">
            <BreadCrumb items={breadcrumbItems} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-erp-border px-3 text-xs font-semibold text-erp-text-secondary transition hover:bg-erp-hover disabled:opacity-60"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-erp-border px-3 text-xs font-semibold text-erp-text-secondary transition hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPrinting ? <LoaderCircle size={14} className="animate-spin" /> : <Printer size={14} />}
              {isPrinting ? 'Generating PDF...' : 'Print'}
            </button>

            {canExport && (
              <button
                type="button"
                onClick={handleExport}
                disabled={reportRows.length === 0 || isExporting}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-erp-primary px-3.5 text-xs font-semibold text-white transition hover:bg-erp-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isExporting ? <LoaderCircle size={14} className="animate-spin" /> : <Download size={14} />}
                Export CSV
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="flex flex-col justify-between gap-3 rounded-xl border border-violet-100 bg-gradient-to-r from-violet-50 via-white to-indigo-50 p-4 shadow-sm sm:flex-row sm:items-center sm:px-5">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-erp-primary shadow-sm">
            <Receipt size={20} />
          </div>

          <div>
            <h1 className="text-base font-bold text-slate-800">Invoice Overview</h1>

            <p className="mt-0.5 text-[11px] text-slate-500">Invoice status, billing value and payment collection overview</p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-violet-100 bg-white/80 px-3 py-2">
          <CalendarDays size={15} className="text-erp-primary" />

          <span className="text-[11px] font-semibold text-slate-600">{fromDate || toDate ? `${fromDate || 'Start'} — ${toDate || 'Today'}` : 'All available dates'}</span>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {statCards.map((card) => {
          const Icon = card.icon

          return (
            <article key={card.title} className="group min-w-0 rounded-xl border border-erp-border bg-erp-surface p-3.5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-[11px]">{card.title}</p>

                  <p className={`mt-2 break-words text-base font-bold tabular-nums sm:text-lg ${card.valueColor}`}>{card.value}</p>
                </div>

                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${card.iconBg} ${card.iconColor} transition group-hover:scale-105`}>
                  <Icon size={17} />
                </div>
              </div>

              <p className="mt-2 text-[10px] text-slate-400">{card.description}</p>
            </article>
          )
        })}
      </section>

      <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-sm print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-erp-border px-4 py-3">
          <div>
            <h2 className="text-xs font-bold text-erp-text">Report Filters</h2>

            <p className="mt-0.5 text-[10px] text-erp-muted">Refine invoice records using the filters below</p>
          </div>

          {hasActiveFilters && (
            <button type="button" onClick={handleClearFilters} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-100">
              <FilterX size={13} />
              Clear Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <div className="min-w-0">
            <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-slate-600">
              <CalendarDays size={12} className="text-erp-primary" />
              From Date
            </label>

            <input
              type="date"
              value={fromDate}
              max={toDate || undefined}
              onChange={(event) => {
                setFromDate(event.target.value)
                setPage(1)
              }}
              className="h-9 w-full rounded-lg border border-erp-border bg-white px-2.5 text-xs text-erp-text outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10"
            />
          </div>

          <div className="min-w-0">
            <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-slate-600">
              <CalendarDays size={12} className="text-erp-primary" />
              To Date
            </label>

            <input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(event) => {
                setToDate(event.target.value)
                setPage(1)
              }}
              className="h-9 w-full rounded-lg border border-erp-border bg-white px-2.5 text-xs text-erp-text outline-none transition focus:border-erp-primary"
            />
          </div>

          <div className="min-w-0">
            <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-slate-600">
              <CheckCircle2 size={12} className="text-erp-primary" />
              Invoice Status
            </label>

            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value)
                setPage(1)
              }}
              className="h-9 w-full rounded-lg border border-erp-border bg-white px-2.5 text-xs text-erp-text outline-none focus:border-erp-primary"
            >
              <option value="All">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Approved">Approved</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Paid">Paid</option>
              <option value="Overdue">Overdue</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div className="min-w-0">
            <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-slate-600">
              <Search size={12} className="text-erp-primary" />
              Search Invoice
            </label>

            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                placeholder="Invoice no., notes, email..."
                className="h-9 w-full rounded-lg border border-erp-border bg-white pl-9 pr-3 text-xs text-erp-text outline-none focus:border-erp-primary"
              />
            </div>
          </div>
        </div>
      </section>

      {apiError && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
          <CircleAlert size={15} className="mt-0.5 shrink-0" />

          <p>{apiError}</p>

          <button type="button" onClick={handleRefresh} className="ml-auto shrink-0 font-semibold underline">
            Retry
          </button>
        </div>
      )}

      <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-erp-border px-4 py-3">
          <div>
            <h2 className="text-xs font-bold text-erp-text">Invoice Details</h2>

            <p className="mt-0.5 text-[10px] text-erp-muted">Invoice-wise billing, payment and email delivery details</p>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg bg-violet-50 px-2.5 py-1.5 text-[10px] font-semibold text-violet-700">
            <FileText size={13} />
            {formatNumber(pagination.total)} Records
          </div>
        </div>

        {refreshing && hasLoaded && (
          <div className="flex items-center justify-center gap-2 border-b border-erp-border px-4 py-2.5 text-[11px] text-erp-muted">
            <LoaderCircle size={14} className="animate-spin text-erp-primary" />
            Updating invoice report...
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1450px] border-collapse text-left">
            <thead>
              <tr className="border-b border-erp-border bg-slate-50">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">Invoice Details</th>

                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">Customer</th>

                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">Order / Warehouse</th>

                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wide text-slate-500">Status</th>

                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Items</th>

                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Grand Total</th>

                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Paid</th>

                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Outstanding</th>

                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wide text-slate-500">Email</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {reportRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                      <Receipt size={22} />
                    </div>

                    <p className="mt-3 text-xs font-bold text-slate-700">No invoices found</p>

                    <p className="mt-1 text-[11px] text-slate-500">Try changing your search or report filters.</p>

                    {hasActiveFilters && (
                      <button type="button" onClick={handleClearFilters} className="mt-3 text-xs font-bold text-erp-primary hover:underline">
                        Clear all filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                reportRows.map((invoice) => (
                  <tr key={invoice._id || invoice.invoiceNumber} className="transition hover:bg-violet-50/30">
                    <td className="px-4 py-3">
                      <p className="text-xs font-bold text-slate-800">{invoice.invoiceNumber || '—'}</p>

                      <p className="mt-1 whitespace-nowrap text-[10px] text-violet-600">Invoice: {formatDate(invoice.invoiceDate)}</p>

                      <p className="mt-1 whitespace-nowrap text-[10px] text-slate-400">Due: {formatDate(invoice.dueDate)}</p>
                    </td>

                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-slate-700">{invoice.customer?.name || '—'}</p>

                      {invoice.customer?.code && <p className="mt-1 text-[10px] text-violet-600">{invoice.customer.code}</p>}
                    </td>

                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-slate-700">{invoice.salesOrder?.orderNumber || '—'}</p>

                      <p className="mt-1 text-[10px] text-slate-500">{invoice.warehouse?.name || '—'}</p>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex whitespace-nowrap items-center rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusStyles[invoice.status] || 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                        {invoice.status || 'Unknown'}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <p className="text-xs font-semibold tabular-nums text-slate-700">{formatNumber(invoice.itemCount)}</p>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <p className="whitespace-nowrap text-xs font-semibold tabular-nums text-slate-800">{formatCurrency(invoice.grandTotal)}</p>

                      <p className="mt-1 whitespace-nowrap text-[9px] text-slate-400">Tax: {formatCurrency(invoice.taxAmount)}</p>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <p className="whitespace-nowrap text-xs font-semibold tabular-nums text-emerald-700">{formatCurrency(invoice.paidAmount)}</p>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <p className="whitespace-nowrap text-xs font-bold tabular-nums text-amber-700">{formatCurrency(invoice.balanceAmount)}</p>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex whitespace-nowrap items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold ${emailStatusStyles[invoice.emailStatus || 'Not Sent'] || emailStatusStyles['Not Sent']}`}>
                        <Mail size={11} />
                        {invoice.emailStatus || 'Not Sent'}
                      </span>

                      {invoice.emailSentAt && <p className="mt-1 whitespace-nowrap text-[9px] text-slate-400">{formatDate(invoice.emailSentAt)}</p>}

                      {invoice.emailSentTo && (
                        <p className="mt-1 max-w-36 truncate text-[9px] text-slate-400" title={invoice.emailSentTo}>
                          {invoice.emailSentTo}
                        </p>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-erp-border px-3 py-3 sm:px-4 print:hidden">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[11px] text-slate-500">
              Showing{' '}
              <span className="font-bold text-slate-700">
                {startRecord}-{endRecord}
              </span>{' '}
              of <span className="font-bold text-slate-700">{formatNumber(pagination.total)}</span> invoices
            </p>

            <div className="flex items-center gap-2">
              <label htmlFor="invoice-page-limit" className="whitespace-nowrap text-[11px] font-semibold text-slate-500">
                Rows per page
              </label>

              <select
                id="invoice-page-limit"
                value={pageLimit}
                onChange={(event) => {
                  setPageLimit(Number(event.target.value))
                  setPage(1)
                }}
                className="h-8 rounded-lg border border-erp-border bg-white px-2 text-[11px] font-semibold text-erp-text outline-none focus:border-erp-primary"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={20}>20</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1 || refreshing}
              onClick={() => setPage(1)}
              title="First page"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-erp-border text-slate-600 transition hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronsLeft size={14} />
            </button>

            <button
              type="button"
              disabled={page <= 1 || refreshing}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="flex h-8 items-center gap-1 rounded-lg border border-erp-border px-2.5 text-[11px] font-semibold text-slate-600 transition hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={14} />
              Previous
            </button>

            <span className="min-w-16 text-center text-[11px] font-bold text-slate-700">
              {pagination.currentPage} / {pagination.totalPages}
            </span>

            <button
              type="button"
              disabled={page >= pagination.totalPages || refreshing}
              onClick={() => setPage((current) => current + 1)}
              className="flex h-8 items-center gap-1 rounded-lg border border-erp-border px-2.5 text-[11px] font-semibold text-slate-600 transition hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight size={14} />
            </button>

            <button
              type="button"
              disabled={page >= pagination.totalPages || refreshing}
              onClick={() => setPage(pagination.totalPages)}
              title="Last page"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-erp-border text-slate-600 transition hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronsRight size={14} />
            </button>
          </div>
        </div>
      </section>

      <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50/70 px-3 py-2.5 print:hidden">
        <ChartNoAxesCombined size={15} className="mt-0.5 shrink-0 text-blue-600" />

        <p className="text-[10px] leading-relaxed text-blue-800">
          <span className="font-bold">Report calculation:</span> Financial totals include Approved, Partially Paid, Paid and Overdue invoices. Draft and Cancelled invoices are excluded from Grand Total, Amount Received and Outstanding calculations.
          Invoice counts are shown separately for each status. Date filtering is based on Invoice Date.
        </p>
      </div>

      <TrashBox
        isOpen={showExportConfirmation}
        onClose={() => {
          if (!isExporting) {
            setShowExportConfirmation(false)
          }
        }}
        title="Export Invoice Report?"
        message={`This will export the ${reportRows.length} invoice records currently displayed on page ${page}. Apply filters or change pages to export a different set of records.`}
        actionButtonText="Export CSV"
        cancelButtonText="Cancel"
        onAction={confirmExport}
        isProcessing={isExporting}
        variant="activate"
      />
    </div>
  )
}
