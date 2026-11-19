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
  CreditCard,
  Banknote,
  ClipboardList,
  Tag,
} from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import Loading from '../Loading/Loading'
import TrashBox from '../../TrashBox/TrashBox'
import { hasPermission, useAuth } from '../../context/AuthContext'

const statusStyles = {
  Approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Draft: 'border-amber-200 bg-amber-50 text-amber-700',
}

const paymentModeStyles = {
  Cash: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  'Bank Transfer': 'border-blue-200 bg-blue-50 text-blue-700',
  UPI: 'border-violet-200 bg-violet-50 text-violet-700',
  Cheque: 'border-amber-200 bg-amber-50 text-amber-700',
  Other: 'border-slate-200 bg-slate-50 text-slate-600',
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
  if (Array.isArray(data?.expenses)) return data.expenses
  if (Array.isArray(data?.data?.expenses)) return data.data.expenses

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

export default function ExpenseReport() {
  const { permissions } = useAuth()

  const canView = hasPermission(permissions, 'reports:expense')
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
  const [category, setCategory] = useState('All')
  const [paymentMode, setPaymentMode] = useState('All')

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
    { title: 'Expense Report', link: null },
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
    document.title = 'Expense Report | MineERP'
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

    const fetchExpenseReport = async () => {
      if (hasLoaded) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      setApiError('')

      try {
        const response = await axiosInstance.get('/erp/reports/expense', {
          params: {
            page,
            limit: pageLimit,
            search: debouncedSearch || undefined,
            fromDate: fromDate || undefined,
            toDate: toDate || undefined,
            status: status === 'All' ? undefined : status,
            category: category === 'All' ? undefined : category,
            paymentMode: paymentMode === 'All' ? undefined : paymentMode,
          },
        })

        if (cancelled) return

        const data = response.data

        if (data?.success === false) {
          throw new Error(data.message || 'Unable to load expense report.')
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
          const message = error.response?.data?.message || error.message || 'Unable to load expense report.'

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

    fetchExpenseReport()

    return () => {
      cancelled = true
    }
  }, [canView, page, pageLimit, debouncedSearch, fromDate, toDate, status, category, paymentMode, refreshKey])

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
    setCategory('All')
    setPaymentMode('All')
    setPage(1)
  }

  const hasActiveFilters = Boolean(search.trim()) || Boolean(fromDate) || Boolean(toDate) || status !== 'All' || category !== 'All' || paymentMode !== 'All'

  const handleExport = () => {
    if (!canExport || reportRows.length === 0 || isExporting) return

    setShowExportConfirmation(true)
  }

  const confirmExport = () => {
    if (!canExport || reportRows.length === 0 || isExporting) return

    setIsExporting(true)

    try {
      const headers = ['Expense Number', 'Expense Date', 'Expense Category', 'Title', 'Description', 'Payment Mode', 'Amount', 'Tax Rate', 'Tax Amount', 'Total Amount', 'Receipt Number', 'Transaction Reference', 'Status']

      const rows = reportRows.map((expense) => [
        expense.expenseNumber,
        formatDate(expense.expenseDate),
        expense.expenseCategory,
        expense.title,
        expense.description,
        expense.paymentMode,
        expense.amount,
        expense.taxRate,
        expense.taxAmount,
        expense.totalAmount,
        expense.receiptNumber,
        expense.transactionReference,
        expense.status,
      ])

      const csvContent = [headers.map(escapeCSV).join(','), ...rows.map((row) => row.map(escapeCSV).join(','))].join('\n')

      const blob = new Blob(['\uFEFF' + csvContent], {
        type: 'text/csv;charset=utf-8;',
      })

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = url
      link.download = `expense-report-${new Date().toISOString().slice(0, 10)}-page-${page}.csv`

      document.body.appendChild(link)
      link.click()
      link.remove()

      window.setTimeout(() => URL.revokeObjectURL(url), 1000)

      setShowExportConfirmation(false)
      showToast('success', 'Expense report exported successfully.')
    } catch (error) {
      showToast('error', error.message || 'Unable to export expense report.')
    } finally {
      setIsExporting(false)
    }
  }

  const handlePrint = async () => {
    if (isPrinting) return

    const printWindow = window.open('', '_blank')

    if (!printWindow) {
      showToast('error', 'Please allow pop-ups to open the report PDF.')
      return
    }

    setIsPrinting(true)

    try {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Expense Report</title>
          </head>
          <body style="font-family: Arial, sans-serif; padding: 30px; text-align: center;">
            Generating Expense Report PDF...
          </body>
        </html>
      `)

      const response = await axiosInstance.get('/erp/reports/expense/pdf', {
        params: {
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          status: status === 'All' ? undefined : status,
          category: category === 'All' ? undefined : category,
          paymentMode: paymentMode === 'All' ? undefined : paymentMode,
          search: debouncedSearch || undefined,
        },
        responseType: 'blob',
      })

      const contentType = response.headers?.['content-type'] || ''

      if (contentType.includes('application/json')) {
        const errorData = JSON.parse(await response.data.text())
        throw new Error(errorData.message || 'Unable to generate expense PDF.')
      }

      const pdfBlob = new Blob([response.data], {
        type: 'application/pdf',
      })

      const pdfUrl = URL.createObjectURL(pdfBlob)

      printWindow.location.href = pdfUrl

      showToast('success', 'Expense Report PDF generated successfully.')

      window.setTimeout(() => {
        URL.revokeObjectURL(pdfUrl)
      }, 60000)
    } catch (error) {
      printWindow.close()

      let message = 'Unable to generate Expense Report PDF.'

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

  const totalExpenses = getSummaryValue(summary, ['totalExpenses'], pagination.total)

  const approvedCount = getSummaryValue(summary, ['approvedCount'])
  const draftCount = getSummaryValue(summary, ['draftCount'])

  const totalAmount = getSummaryValue(summary, ['totalAmount'])
  const totalTax = getSummaryValue(summary, ['totalTax'])
  const approvedAmount = getSummaryValue(summary, ['approvedAmount'])
  const draftAmount = getSummaryValue(summary, ['draftAmount'])

  const statCards = [
    {
      title: 'Total Expenses',
      value: formatNumber(totalExpenses),
      icon: Receipt,
      iconBg: 'bg-violet-50',
      iconColor: 'text-violet-600',
      valueColor: 'text-erp-text',
      description: 'Expenses matching filters',
    },
    {
      title: 'Approved Expenses',
      value: formatNumber(approvedCount),
      icon: CheckCircle2,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      valueColor: 'text-emerald-700',
      description: 'Approved expense records',
    },
    {
      title: 'Draft Expenses',
      value: formatNumber(draftCount),
      icon: Clock,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      valueColor: 'text-amber-700',
      description: 'Pending expense records',
    },
    {
      title: 'Total Amount',
      value: formatCurrency(totalAmount),
      icon: IndianRupee,
      iconBg: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
      valueColor: 'text-erp-text',
      description: 'Total expense amount',
    },
    {
      title: 'Total Tax',
      value: formatCurrency(totalTax),
      icon: TrendingDown,
      iconBg: 'bg-rose-50',
      iconColor: 'text-rose-600',
      valueColor: 'text-rose-700',
      description: 'Tax on recorded expenses',
    },
    {
      title: 'Approved Amount',
      value: formatCurrency(approvedAmount),
      icon: TrendingUp,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      valueColor: 'text-emerald-700',
      description: 'Total approved expenses',
    },
    {
      title: 'Draft Amount',
      value: formatCurrency(draftAmount),
      icon: Wallet,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      valueColor: 'text-amber-700',
      description: 'Total draft expenses',
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

        <p className="mt-1 max-w-sm text-xs text-erp-muted">You do not have permission to view the Expense Report.</p>
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
            <Loading fullScreen={false} label="Loading expense report" description="Fetching expense and tax information..." className="!h-full min-h-[420px]" />
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-4 pb-8 text-sm">
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      {/* Header */}
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
              disabled={isPrinting || !canExport}
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

      {/* Overview */}
      <section className="flex flex-col justify-between gap-3 rounded-xl border border-violet-100 bg-gradient-to-r from-violet-50 via-white to-indigo-50 p-4 shadow-sm sm:flex-row sm:items-center sm:px-5">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-erp-primary shadow-sm">
            <Receipt size={20} />
          </div>

          <div>
            <h1 className="text-base font-bold text-slate-800">Expense Overview</h1>

            <p className="mt-0.5 text-[11px] text-slate-500">Expense records, payment modes and tax overview</p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-violet-100 bg-white/80 px-3 py-2">
          <CalendarDays size={15} className="text-erp-primary" />

          <span className="text-[11px] font-semibold text-slate-600">{fromDate || toDate ? `${fromDate || 'Start'} — ${toDate || 'Today'}` : 'All available dates'}</span>
        </div>
      </section>

      {/* Summary Cards */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
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

      {/* Filters */}
      <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-sm print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-erp-border px-4 py-3">
          <div>
            <h2 className="text-xs font-bold text-erp-text">Report Filters</h2>

            <p className="mt-0.5 text-[10px] text-erp-muted">Refine expense records using the filters below</p>
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
              Expense Status
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
              <option value="Approved">Approved</option>
              <option value="Draft">Draft</option>
            </select>
          </div>

          <div className="min-w-0">
            <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-slate-600">
              <Banknote size={12} className="text-erp-primary" />
              Payment Mode
            </label>

            <select
              value={paymentMode}
              onChange={(event) => {
                setPaymentMode(event.target.value)
                setPage(1)
              }}
              className="h-9 w-full rounded-lg border border-erp-border bg-white px-2.5 text-xs text-erp-text outline-none focus:border-erp-primary"
            >
              <option value="All">All Payment Modes</option>
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="UPI">UPI</option>
              <option value="Cheque">Cheque</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="min-w-0 sm:col-span-2 lg:col-span-3 xl:col-span-2">
            <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-slate-600">
              <Tag size={12} className="text-erp-primary" />
              Expense Category
            </label>

            <input
              type="text"
              value={category === 'All' ? '' : category}
              onChange={(event) => {
                setCategory(event.target.value || 'All')
                setPage(1)
              }}
              placeholder="Enter exact expense category..."
              className="h-9 w-full rounded-lg border border-erp-border bg-white px-2.5 text-xs text-erp-text outline-none focus:border-erp-primary"
            />
          </div>

          <div className="min-w-0 sm:col-span-2 lg:col-span-3 xl:col-span-2">
            <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-slate-600">
              <Search size={12} className="text-erp-primary" />
              Search Expense
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
                placeholder="Expense no., title, receipt no., transaction reference..."
                className="h-9 w-full rounded-lg border border-erp-border bg-white pl-9 pr-3 text-xs text-erp-text outline-none focus:border-erp-primary"
              />
            </div>
          </div>
        </div>
      </section>

      {/* API Error */}
      {apiError && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
          <CircleAlert size={15} className="mt-0.5 shrink-0" />

          <p>{apiError}</p>

          <button type="button" onClick={handleRefresh} className="ml-auto shrink-0 font-semibold underline">
            Retry
          </button>
        </div>
      )}

      {/* Expense Details */}
      <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-erp-border px-4 py-3">
          <div>
            <h2 className="text-xs font-bold text-erp-text">Expense Details</h2>

            <p className="mt-0.5 text-[10px] text-erp-muted">Expense-wise amount, tax and payment details</p>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg bg-violet-50 px-2.5 py-1.5 text-[10px] font-semibold text-violet-700">
            <FileText size={13} />
            {formatNumber(pagination.total)} Records
          </div>
        </div>

        {refreshing && hasLoaded && (
          <div className="flex items-center justify-center gap-2 border-b border-erp-border px-4 py-2.5 text-[11px] text-erp-muted">
            <LoaderCircle size={14} className="animate-spin text-erp-primary" />
            Updating expense report...
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1400px] border-collapse text-left">
            <thead>
              <tr className="border-b border-erp-border bg-slate-50">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">Expense Details</th>

                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">Category</th>

                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">Expense Date</th>

                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wide text-slate-500">Payment Mode</th>

                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wide text-slate-500">Status</th>

                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Amount</th>

                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Tax</th>

                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Total Amount</th>

                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wide text-slate-500">Receipt</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading && !hasLoaded ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <LoaderCircle size={22} className="mx-auto animate-spin text-erp-primary" />
                    <p className="mt-2 text-xs text-slate-500">Loading expenses...</p>
                  </td>
                </tr>
              ) : reportRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                      <Receipt size={22} />
                    </div>

                    <p className="mt-3 text-xs font-bold text-slate-700">No expenses found</p>

                    <p className="mt-1 text-[11px] text-slate-500">Try changing your search or report filters.</p>

                    {hasActiveFilters && (
                      <button type="button" onClick={handleClearFilters} className="mt-3 text-xs font-bold text-erp-primary hover:underline">
                        Clear all filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                reportRows.map((expense) => (
                  <tr key={expense._id || expense.expenseNumber} className="transition hover:bg-violet-50/30">
                    <td className="px-4 py-3">
                      <p className="text-xs font-bold text-slate-800">{expense.expenseNumber || '—'}</p>

                      <p className="mt-1 max-w-52 truncate text-[10px] text-slate-500" title={expense.title}>
                        {expense.title || '—'}
                      </p>

                      {expense.description && (
                        <p className="mt-1 max-w-52 truncate text-[10px] text-slate-400" title={expense.description}>
                          {expense.description}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <span className="inline-flex whitespace-nowrap items-center rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-700">{expense.expenseCategory || '—'}</span>
                    </td>

                    <td className="px-4 py-3">
                      <p className="whitespace-nowrap text-xs font-medium text-slate-700">{formatDate(expense.expenseDate)}</p>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex whitespace-nowrap items-center rounded-full border px-2.5 py-1 text-[10px] font-bold ${paymentModeStyles[expense.paymentMode] || 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                        {expense.paymentMode || '—'}
                      </span>

                      {expense.transactionReference && (
                        <p className="mx-auto mt-1 max-w-36 truncate text-[10px] text-slate-400" title={expense.transactionReference}>
                          Ref: {expense.transactionReference}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex whitespace-nowrap items-center rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusStyles[expense.status] || 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                        {expense.status || 'Unknown'}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <p className="whitespace-nowrap text-xs font-semibold tabular-nums text-slate-800">{formatCurrency(expense.amount)}</p>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <p className="whitespace-nowrap text-xs font-semibold tabular-nums text-rose-700">{formatCurrency(expense.taxAmount)}</p>

                      {Number(expense.taxRate) > 0 && <p className="mt-1 text-[10px] text-slate-400">{formatNumber(expense.taxRate)}%</p>}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <p className="whitespace-nowrap text-xs font-bold tabular-nums text-emerald-700">{formatCurrency(expense.totalAmount)}</p>
                    </td>

                    <td className="px-4 py-3 text-center">
                      {expense.receiptNumber ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                          <Receipt size={11} />
                          {expense.receiptNumber}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-erp-border px-3 py-3 sm:px-4 print:hidden">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[11px] text-slate-500">
              Showing{' '}
              <span className="font-bold text-slate-700">
                {startRecord}-{endRecord}
              </span>{' '}
              of <span className="font-bold text-slate-700">{formatNumber(pagination.total)}</span> expenses
            </p>

            <div className="flex items-center gap-2">
              <label htmlFor="expense-page-limit" className="whitespace-nowrap text-[11px] font-semibold text-slate-500">
                Rows per page
              </label>

              <select
                id="expense-page-limit"
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
              disabled={pagination.currentPage <= 1 || refreshing}
              onClick={() => setPage(1)}
              title="First page"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-erp-border text-slate-600 transition hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronsLeft size={14} />
            </button>

            <button
              type="button"
              disabled={pagination.currentPage <= 1 || refreshing}
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
              disabled={pagination.currentPage >= pagination.totalPages || refreshing}
              onClick={() => setPage((current) => current + 1)}
              className="flex h-8 items-center gap-1 rounded-lg border border-erp-border px-2.5 text-[11px] font-semibold text-slate-600 transition hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight size={14} />
            </button>

            <button
              type="button"
              disabled={pagination.currentPage >= pagination.totalPages || refreshing}
              onClick={() => setPage(pagination.totalPages)}
              title="Last page"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-erp-border text-slate-600 transition hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronsRight size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* Report Note */}
      <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50/70 px-3 py-2.5 print:hidden">
        <ChartNoAxesCombined size={15} className="mt-0.5 shrink-0 text-blue-600" />

        <p className="text-[10px] leading-relaxed text-blue-800">
          <span className="font-bold">Report calculation:</span> Total Amount includes the expense amount and applicable tax. Approved and Draft totals are calculated according to the selected filters. Expense records shown in this report exclude
          deleted records.
        </p>
      </div>

      {/* Export Confirmation */}
      <TrashBox
        isOpen={showExportConfirmation}
        onClose={() => {
          if (!isExporting) {
            setShowExportConfirmation(false)
          }
        }}
        title="Export Expense Report?"
        message={`This will export the ${reportRows.length} expense records currently displayed on page ${page}. Apply filters or change pages to export a different set of records.`}
        actionButtonText="Export CSV"
        cancelButtonText="Cancel"
        onAction={confirmExport}
        isProcessing={isExporting}
        variant="activate"
      />
    </div>
  )
}
