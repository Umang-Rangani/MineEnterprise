import { useEffect, useState } from 'react'
import {
  Search,
  RefreshCw,
  CalendarDays,
  Users,
  Warehouse,
  FileText,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Wallet,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  LoaderCircle,
  FilterX,
  ChartNoAxesCombined,
  Receipt,
  CheckCircle2,
} from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import Loading from '../Loading/Loading'
import TrashBox from '../../TrashBox/TrashBox'
import { hasPermission, useAuth } from '../../context/AuthContext'

const statusStyles = {
  Approved: 'border-blue-200 bg-blue-50 text-blue-700',
  'Partially Paid': 'border-amber-200 bg-amber-50 text-amber-700',
  Paid: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Overdue: 'border-rose-200 bg-rose-50 text-rose-700',
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

const getCustomerName = (invoice) => {
  const customer = invoice.customerId

  if (customer && typeof customer === 'object') {
    return customer.customerName || customer.name || 'Unknown Customer'
  }

  return invoice.customerName || 'Unknown Customer'
}

const getWarehouseName = (invoice) => {
  const warehouse = invoice.warehouseId

  if (warehouse && typeof warehouse === 'object') {
    return warehouse.name || warehouse.warehouseName || '—'
  }

  return invoice.warehouseName || '—'
}

const getSalesOrderNumber = (invoice) => {
  const salesOrder = invoice.salesOrderId

  if (salesOrder && typeof salesOrder === 'object') {
    return salesOrder.orderNumber || salesOrder.salesOrderNumber || salesOrder.soNumber || '—'
  }

  return invoice.salesOrderNumber || '—'
}

const getCustomerArray = (response) => {
  const data = response?.data

  if (Array.isArray(data?.customers)) return data.customers
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data)) return data

  return []
}

const getWarehouseArray = (response) => {
  const data = response?.data

  if (Array.isArray(data?.warehouses)) return data.warehouses
  if (Array.isArray(data?.data?.warehouses)) return data.data.warehouses
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data)) return data

  return []
}

const getReportArray = (response) => {
  const data = response?.data

  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.invoices)) return data.invoices
  if (Array.isArray(data?.data?.invoices)) return data.data.invoices
  if (Array.isArray(data?.data?.data)) return data.data.data

  return []
}

const escapeCSV = (value) => {
  const text = String(value ?? '')
  return `"${text.replace(/"/g, '""')}"`
}

export default function SalesReport() {
  const { permissions } = useAuth()

  const canView = hasPermission(permissions, 'reports:sales')
  const canExport = hasPermission(permissions, 'reports:export')

  const [reportRows, setReportRows] = useState([])
  const [customers, setCustomers] = useState([])
  const [warehouses, setWarehouses] = useState([])

  const [loading, setLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const [apiError, setApiError] = useState('')
  const [toast, setToast] = useState(null)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
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

  const [isPrinting, setIsPrinting] = useState(false)

  const breadcrumbItems = [
    { title: 'Reports', link: '/company/reports' },
    { title: 'Sales Report', link: null },
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
    document.title = 'Sales Report | MineERP'
  }, [])

  // Load customer and warehouse filter options.
  useEffect(() => {
    let cancelled = false

    const fetchFilterOptions = async () => {
      try {
        const [customerResponse, warehouseResponse] = await Promise.all([
          axiosInstance.get('/erp/customers', {
            params: {
              page: 1,
              limit: 100,
              status: 'Active',
            },
          }),
          axiosInstance.get('/erp/warehouses', {
            params: {
              page: 1,
              limit: 100,
              status: 'Active',
            },
          }),
        ])

        if (cancelled) return

        setCustomers(getCustomerArray(customerResponse))
        setWarehouses(getWarehouseArray(warehouseResponse))
      } catch (error) {
        if (!cancelled) {
          showToast('error', error.response?.data?.message || 'Unable to load report filters.', 5000)
        }
      }
    }

    fetchFilterOptions()

    return () => {
      cancelled = true
    }
  }, [])

  // Debounced search.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, 350)

    return () => window.clearTimeout(timer)
  }, [search])

  // Fetch sales report.
  useEffect(() => {
    if (!canView) {
      setLoading(false)
      return
    }

    let cancelled = false

    const fetchSalesReport = async () => {
      if (hasLoaded) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      setApiError('')

      try {
        const response = await axiosInstance.get('/erp/reports/sales', {
          params: {
            page,
            limit: 10,
            search: debouncedSearch || undefined,
            fromDate: fromDate || undefined,
            toDate: toDate || undefined,
            customerId: customerId || undefined,
            warehouseId: warehouseId || undefined,
            status: status === 'All' ? undefined : status,
          },
        })

        if (cancelled) return

        const data = response.data

        if (data?.success === false) {
          throw new Error(data.message || 'Unable to load sales report.')
        }

        const rows = getReportArray(response)

        setReportRows(rows)
        setSummary(data?.summary || data?.data?.summary || {})

        const serverPagination = data?.pagination || data?.data?.pagination

        setPagination({
          total: Number(serverPagination?.total) || 0,
          totalPages: Math.max(1, Number(serverPagination?.totalPages) || 1),
          currentPage: Number(serverPagination?.currentPage || serverPagination?.page) || page,
          limit: Number(serverPagination?.limit) || pageLimit,
        })

        setHasLoaded(true)
      } catch (error) {
        if (!cancelled) {
          const message = error.response?.data?.message || error.message || 'Unable to load sales report.'

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

    fetchSalesReport()

    return () => {
      cancelled = true
    }
  }, [canView, page, pageLimit, debouncedSearch, fromDate, toDate, customerId, warehouseId, status, refreshKey])

  const handleRefresh = () => {
    if (refreshing || loading) return

    setRefreshing(true)
    setRefreshKey((previous) => previous + 1)
  }

  const handleClearFilters = () => {
    setSearch('')
    setDebouncedSearch('')
    setFromDate('')
    setToDate('')
    setCustomerId('')
    setWarehouseId('')
    setStatus('All')
    setPage(1)
  }

  const hasActiveFilters = Boolean(search.trim()) || Boolean(fromDate) || Boolean(toDate) || Boolean(customerId) || Boolean(warehouseId) || status !== 'All'

  const handleExport = () => {
    if (!canExport || reportRows.length === 0 || isExporting) return

    setShowExportConfirmation(true)
  }

  const confirmExport = () => {
    if (!canExport || reportRows.length === 0 || isExporting) return

    setIsExporting(true)

    try {
      const headers = ['Invoice Number', 'Invoice Date', 'Customer', 'Sales Order', 'Warehouse', 'Status', 'Net Sales', 'Tax', 'Total Invoiced', 'Paid', 'Outstanding', 'Allocated COGS', 'Gross Profit']

      const rows = reportRows.map((invoice) => [
        invoice.invoiceNumber,
        formatDate(invoice.invoiceDate || invoice.date),
        getCustomerName(invoice),
        getSalesOrderNumber(invoice),
        getWarehouseName(invoice),
        invoice.status,
        invoice.netSales,
        invoice.tax,
        invoice.grandTotal,
        invoice.paid,
        invoice.balance,
        invoice.allocatedCOGS,
        invoice.grossProfit,
      ])

      const csvContent = [headers.map(escapeCSV).join(','), ...rows.map((row) => row.map(escapeCSV).join(','))].join('\n')

      const blob = new Blob(['\uFEFF' + csvContent], {
        type: 'text/csv;charset=utf-8;',
      })

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = url
      link.download = `sales-report-${new Date().toISOString().slice(0, 10)}-page-${page}.csv`

      document.body.appendChild(link)
      link.click()
      link.remove()

      window.setTimeout(() => URL.revokeObjectURL(url), 1000)

      setShowExportConfirmation(false)
      showToast('success', 'Sales report exported successfully.')
    } catch (error) {
      showToast('error', error.message || 'Unable to export sales report.')
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
          <title>Sales Report</title>
        </head>
        <body style="font-family: Arial, sans-serif; padding: 30px; text-align: center;">
          Generating Sales Report PDF...
        </body>
      </html>
    `)

      const response = await axiosInstance.get('/erp/reports/sales/pdf', {
        params: {
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          customerId: customerId || undefined,
          warehouseId: warehouseId || undefined,
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

      showToast('success', 'Sales Report PDF generated successfully.')

      window.setTimeout(() => {
        URL.revokeObjectURL(pdfUrl)
      }, 60000)
    } catch (error) {
      printWindow.close()

      let message = 'Unable to generate Sales Report PDF.'

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

  const totalInvoices = summary.totalInvoices ?? summary.total ?? pagination.total
  const netSales = summary.netSales ?? 0
  const totalTax = summary.tax ?? summary.totalTax ?? summary.taxAmount ?? 0
  const totalInvoiced = summary.grandTotal ?? summary.totalInvoiced ?? 0
  const totalPaid = summary.paid ?? summary.paidAmount ?? 0
  const outstanding = summary.balance ?? summary.outstanding ?? summary.balanceAmount ?? 0
  const allocatedCOGS = summary.allocatedCOGS ?? summary.totalCOGS ?? 0
  const grossProfit = summary.grossProfit ?? 0

  const statCards = [
    {
      title: 'Total Invoices',
      value: formatNumber(totalInvoices),
      icon: Receipt,
      iconBg: 'bg-violet-50',
      iconColor: 'text-violet-600',
      valueColor: 'text-erp-text',
      description: 'Revenue invoices',
    },
    {
      title: 'Net Sales',
      value: formatCurrency(netSales),
      icon: TrendingUp,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      valueColor: 'text-emerald-700',
      description: 'Before GST',
    },
    {
      title: 'Total Tax',
      value: formatCurrency(totalTax),
      icon: FileText,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      valueColor: 'text-erp-text',
      description: 'GST collected',
    },
    {
      title: 'Total Invoiced',
      value: formatCurrency(totalInvoiced),
      icon: IndianRupee,
      iconBg: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
      valueColor: 'text-erp-text',
      description: 'Including tax',
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
      icon: CircleAlert,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      valueColor: 'text-amber-700',
      description: 'Pending collection',
    },
    {
      title: 'Allocated COGS',
      value: formatCurrency(allocatedCOGS),
      icon: TrendingDown,
      iconBg: 'bg-orange-50',
      iconColor: 'text-orange-600',
      valueColor: 'text-erp-text',
      description: 'Dispatch stock cost',
    },
    {
      title: 'Gross Profit',
      value: formatCurrency(grossProfit),
      icon: ChartNoAxesCombined,
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-600',
      valueColor: Number(grossProfit) >= 0 ? 'text-emerald-700' : 'text-rose-600',
      description: 'Net sales minus COGS',
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

        <p className="mt-1 max-w-sm text-xs text-erp-muted">You do not have permission to view the Sales Report.</p>
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
            <Loading fullScreen={false} label="Loading sales report" description="Fetching invoice and sales information..." className="!h-full min-h-[420px]" />
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

            {/* <p className="mt-0.5 hidden text-[10px] text-erp-muted sm:block">Track sales performance, collections and gross profit</p> */}
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

      {/* Report title */}
      <section className="flex flex-col justify-between gap-3 rounded-xl border border-violet-100 bg-gradient-to-r from-violet-50 via-white to-indigo-50 p-4 shadow-sm sm:flex-row sm:items-center sm:px-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-erp-primary shadow-sm">
              <ChartNoAxesCombined size={20} />
            </div>

            <div>
              <h1 className="text-base font-bold text-slate-800">Sales Performance</h1>
              <p className="mt-0.5 text-[11px] text-slate-500">Invoice-based sales and profitability overview</p>
            </div>
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
            <p className="mt-0.5 text-[10px] text-erp-muted">Refine sales records using the filters below</p>
          </div>

          {hasActiveFilters && (
            <button type="button" onClick={handleClearFilters} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-100">
              <FilterX size={13} />
              Clear Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
              className="h-9 w-full rounded-lg border border-erp-border bg-white px-2.5 text-xs text-erp-text outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10"
            />
          </div>

          <div className="min-w-0">
            <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-slate-600">
              <Users size={12} className="text-erp-primary" />
              Customer
            </label>

            <select
              value={customerId}
              onChange={(event) => {
                setCustomerId(event.target.value)
                setPage(1)
              }}
              className="h-9 w-full rounded-lg border border-erp-border bg-white px-2.5 text-xs text-erp-text outline-none focus:border-erp-primary"
            >
              <option value="">All Customers</option>

              {customers.map((customer) => (
                <option key={customer._id} value={customer._id}>
                  {customer.customerName}
                  {customer.customerCode ? ` (${customer.customerCode})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-0">
            <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-slate-600">
              <Warehouse size={12} className="text-erp-primary" />
              Warehouse
            </label>

            <select
              value={warehouseId}
              onChange={(event) => {
                setWarehouseId(event.target.value)
                setPage(1)
              }}
              className="h-9 w-full rounded-lg border border-erp-border bg-white px-2.5 text-xs text-erp-text outline-none focus:border-erp-primary"
            >
              <option value="">All Warehouses</option>

              {warehouses.map((warehouse) => (
                <option key={warehouse._id} value={warehouse._id}>
                  {warehouse.name}
                  {warehouse.code ? ` (${warehouse.code})` : ''}
                </option>
              ))}
            </select>
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
              <option value="Approved">Approved</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Paid">Paid</option>
              <option value="Overdue">Overdue</option>
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
                placeholder="Invoice number or notes..."
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

      {/* Report Table */}
      <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-erp-border px-4 py-3">
          <div>
            <h2 className="text-xs font-bold text-erp-text">Sales Transactions</h2>

            <p className="mt-0.5 text-[10px] text-erp-muted">Invoice-wise sales and cost allocation details</p>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg bg-violet-50 px-2.5 py-1.5 text-[10px] font-semibold text-violet-700">
            <FileText size={13} />
            {formatNumber(pagination.total)} Records
          </div>
        </div>

        {refreshing && hasLoaded && (
          <div className="flex items-center justify-center gap-2 border-b border-erp-border px-4 py-2.5 text-[11px] text-erp-muted">
            <LoaderCircle size={14} className="animate-spin text-erp-primary" />
            Updating sales report...
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1250px] border-collapse text-left">
            <thead>
              <tr className="border-b border-erp-border bg-slate-50">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">Invoice Details</th>

                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">Customer</th>

                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">Warehouse</th>

                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Net Sales</th>

                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">COGS</th>

                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Gross Profit</th>

                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Outstanding</th>

                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wide text-slate-500">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {reportRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                      <FileText size={22} />
                    </div>

                    <p className="mt-3 text-xs font-bold text-slate-700">No sales records found</p>

                    <p className="mt-1 text-[11px] text-slate-500">Try changing your date range or report filters.</p>

                    {hasActiveFilters && (
                      <button type="button" onClick={handleClearFilters} className="mt-3 text-xs font-bold text-erp-primary hover:underline">
                        Clear all filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                reportRows.map((invoice) => {
                  const missingCost = Number(invoice.costAllocationMissing) > 0
                  const profit = Number(invoice.grossProfit) || 0

                  return (
                    <tr key={invoice._id || invoice.invoiceNumber} className="transition hover:bg-violet-50/30">
                      <td className="px-4 py-3">
                        <p className="text-xs font-bold text-slate-800">{invoice.invoiceNumber || '—'}</p>

                        <p className="mt-1 text-[10px] text-slate-500">{formatDate(invoice.invoiceDate || invoice.date)}</p>

                        <p className="mt-1 text-[10px] text-violet-600">{getSalesOrderNumber(invoice)}</p>
                      </td>

                      <td className="px-4 py-3">
                        <p className="max-w-44 truncate text-xs font-semibold text-slate-700">{getCustomerName(invoice)}</p>
                      </td>

                      <td className="px-4 py-3">
                        <p className="max-w-36 truncate text-xs text-slate-600">{getWarehouseName(invoice)}</p>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <p className="whitespace-nowrap text-xs font-semibold tabular-nums text-slate-800">{formatCurrency(invoice.netSales)}</p>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <p className="whitespace-nowrap text-xs font-semibold tabular-nums text-orange-700">{formatCurrency(invoice.allocatedCOGS)}</p>

                        {missingCost && (
                          <p title="Some invoice item costs could not be allocated." className="mt-1 text-[9px] font-semibold text-rose-600">
                            Cost incomplete
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <p className={`whitespace-nowrap text-xs font-bold tabular-nums ${profit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>{formatCurrency(invoice.grossProfit)}</p>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <p className="whitespace-nowrap text-xs font-semibold tabular-nums text-amber-700">{formatCurrency(invoice.balance)}</p>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex whitespace-nowrap items-center rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusStyles[invoice.status] || 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                          {invoice.status || 'Unknown'}
                        </span>
                      </td>
                    </tr>
                  )
                })
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
              of <span className="font-bold text-slate-700">{formatNumber(pagination.total)}</span> products
            </p>

            <div className="flex items-center gap-2">
              <label htmlFor="inventory-page-limit" className="whitespace-nowrap text-[11px] font-medium text-slate-500">
                Rows per page
              </label>

              <select
                id="inventory-page-limit"
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

          <div className="flex items-center gap-2">
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
          </div>
        </div>
      </section>

      {/* Profitability note */}
      <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50/70 px-3 py-2.5 print:hidden">
        <ChartNoAxesCombined size={15} className="mt-0.5 shrink-0 text-blue-600" />

        <p className="text-[10px] leading-relaxed text-blue-800">
          <span className="font-bold">Report calculation:</span> Net Sales excludes GST. COGS is allocated from confirmed dispatch cost snapshots against invoiced quantities. Gross Profit = Net Sales − Allocated COGS. Any incomplete cost allocation
          is marked in the transaction table.
        </p>
      </div>

      {/* Export Confirmation */}
      <TrashBox
        isOpen={showExportConfirmation}
        onClose={() => {
          if (!isExporting) setShowExportConfirmation(false)
        }}
        title="Export Sales Report?"
        message={`This will export the ${reportRows.length} sales records currently displayed on page ${page}. Apply filters or change pages to export a different set of records.`}
        actionButtonText="Export CSV"
        cancelButtonText="Cancel"
        onAction={confirmExport}
        isProcessing={isExporting}
        variant="activate"
      />
    </div>
  )
}
