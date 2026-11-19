import { useEffect, useState } from 'react'
import {
  Search,
  RefreshCw,
  CalendarDays,
  Warehouse,
  Package,
  FileText,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  LoaderCircle,
  FilterX,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  SlidersHorizontal,
  Boxes,
  TrendingUp,
} from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import Loading from '../Loading/Loading'
import TrashBox from '../../TrashBox/TrashBox'
import { hasPermission, useAuth } from '../../context/AuthContext'

const movementStyles = {
  STOCK_IN: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  STOCK_OUT: 'border-rose-200 bg-rose-50 text-rose-700',
  TRANSFER: 'border-blue-200 bg-blue-50 text-blue-700',
  ADJUSTMENT: 'border-amber-200 bg-amber-50 text-amber-700',
}

const movementLabels = {
  STOCK_IN: 'Stock IN',
  STOCK_OUT: 'Stock OUT',
  TRANSFER: 'Transfer',
  ADJUSTMENT: 'Adjustment',
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

const formatDateTime = (value) => {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getProductName = (movement) => {
  const product = movement.productId

  if (product && typeof product === 'object') {
    return product.name || product.productName || 'Unknown Product'
  }

  return movement.productName || 'Unknown Product'
}

const getProductSKU = (movement) => {
  const product = movement.productId

  if (product && typeof product === 'object') {
    return product.sku || product.productCode || '—'
  }

  return movement.productSKU || '—'
}

const getWarehouseName = (movement) => {
  const warehouse = movement.warehouseId

  if (warehouse && typeof warehouse === 'object') {
    return warehouse.name || warehouse.warehouseName || '—'
  }

  return movement.warehouseName || '—'
}

const getDestinationWarehouseName = (movement) => {
  const warehouse = movement.destinationWarehouseId

  if (warehouse && typeof warehouse === 'object') {
    return warehouse.name || warehouse.warehouseName || '—'
  }

  return '—'
}

const getCreatedByName = (movement) => {
  const user = movement.createdBy

  if (user && typeof user === 'object') {
    return user.name || user.fullName || '—'
  }

  return '—'
}

const getProductArray = (response) => {
  const data = response?.data

  if (Array.isArray(data?.products)) return data.products
  if (Array.isArray(data?.data?.products)) return data.data.products
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data)) return data

  return []
}

const getWarehouseArray = (response) => {
  const data = response?.data

  if (Array.isArray(data?.warehouses)) return data.warehouses
  if (Array.isArray(data?.data?.warehouses)) return data.data.warehouses
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data)) return data.data || []

  return []
}

const getReportArray = (response) => {
  const data = response?.data

  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.movements)) return data.movements
  if (Array.isArray(data?.data?.movements)) return data.data.movements

  return []
}

const escapeCSV = (value) => {
  const text = String(value ?? '')
  return `"${text.replace(/"/g, '""')}"`
}

export default function StockMovementReport() {
  const { permissions } = useAuth()

  const canView = hasPermission(permissions, 'reports:inventory')
  const canExport = hasPermission(permissions, 'reports:export')

  const [reportRows, setReportRows] = useState([])
  const [products, setProducts] = useState([])
  const [warehouses, setWarehouses] = useState([])

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
  const [productId, setProductId] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [type, setType] = useState('All')

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
    { title: 'Stock Movement Report', link: null },
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
    document.title = 'Stock Movement Report | MineERP'
  }, [])

  // Load product and warehouse filter options.
  useEffect(() => {
    if (!canView) return

    let cancelled = false

    const fetchFilterOptions = async () => {
      try {
        const [productResponse, warehouseResponse] = await Promise.all([
          axiosInstance.get('/erp/products', {
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

        setProducts(getProductArray(productResponse))
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
  }, [canView])

  // Debounced search.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim())
      setPage(1)
    }, 350)

    return () => window.clearTimeout(timer)
  }, [search])

  // Fetch stock movement report.
  useEffect(() => {
    if (!canView) {
      setLoading(false)
      return
    }

    let cancelled = false

    const fetchStockMovementReport = async () => {
      if (hasLoaded) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      setApiError('')

      try {
        const response = await axiosInstance.get('/erp/reports/stock-movement', {
          params: {
            page,
            limit: pageLimit,
            search: debouncedSearch || undefined,
            fromDate: fromDate || undefined,
            toDate: toDate || undefined,
            productId: productId || undefined,
            warehouseId: warehouseId || undefined,
            type: type === 'All' ? undefined : type,
          },
        })

        if (cancelled) return

        const data = response.data

        if (data?.success === false) {
          throw new Error(data.message || 'Unable to load stock movement report.')
        }

        const rows = getReportArray(response)

        setReportRows(rows)
        setSummary(data?.summary || {})

        const serverPagination = data?.pagination || {}

        setPagination({
          total: Number(serverPagination.total) || 0,
          totalPages: Math.max(1, Number(serverPagination.totalPages) || 1),
          currentPage: Number(serverPagination.page || serverPagination.currentPage) || page,
          limit: Number(serverPagination.limit) || pageLimit,
        })

        setHasLoaded(true)
      } catch (error) {
        if (!cancelled) {
          const message = error.response?.data?.message || error.message || 'Unable to load stock movement report.'

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

    fetchStockMovementReport()

    return () => {
      cancelled = true
    }
  }, [canView, page, pageLimit, debouncedSearch, fromDate, toDate, productId, warehouseId, type, refreshKey])

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
    setProductId('')
    setWarehouseId('')
    setType('All')
    setPage(1)
  }

  const hasActiveFilters = Boolean(search.trim()) || Boolean(fromDate) || Boolean(toDate) || Boolean(productId) || Boolean(warehouseId) || type !== 'All'

  // Export current page records as CSV.
  const handleExport = () => {
    if (!canExport || reportRows.length === 0 || isExporting) return

    setShowExportConfirmation(true)
  }

  const confirmExport = () => {
    if (!canExport || reportRows.length === 0 || isExporting) return

    setIsExporting(true)

    try {
      const headers = ['Date', 'Product', 'SKU', 'Movement Type', 'Warehouse', 'Destination Warehouse', 'Quantity', 'Unit Cost', 'Total Cost', 'Previous Stock', 'New Stock', 'Reason', 'Reference', 'Created By']

      const rows = reportRows.map((movement) => [
        formatDateTime(movement.createdAt),
        getProductName(movement),
        getProductSKU(movement),
        movementLabels[movement.type] || movement.type,
        getWarehouseName(movement),
        getDestinationWarehouseName(movement),
        movement.quantity,
        movement.unitCost,
        movement.totalCost,
        movement.previousStock,
        movement.newStock,
        movement.reason,
        movement.reference,
        getCreatedByName(movement),
      ])

      const csvContent = [headers.map(escapeCSV).join(','), ...rows.map((row) => row.map(escapeCSV).join(','))].join('\n')

      const blob = new Blob(['\uFEFF' + csvContent], {
        type: 'text/csv;charset=utf-8;',
      })

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = url
      link.download = `stock-movement-report-${new Date().toISOString().slice(0, 10)}-page-${page}.csv`

      document.body.appendChild(link)
      link.click()
      link.remove()

      window.setTimeout(() => URL.revokeObjectURL(url), 1000)

      setShowExportConfirmation(false)
      showToast('success', 'Stock movement report exported successfully.')
    } catch (error) {
      showToast('error', error.message || 'Unable to export stock movement report.')
    } finally {
      setIsExporting(false)
    }
  }

  // Generate PDF using the backend report endpoint.
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
            <title>Stock Movement Report</title>
          </head>
          <body style="font-family: Arial, sans-serif; padding: 30px; text-align: center;">
            Generating Stock Movement Report PDF...
          </body>
        </html>
      `)

      const response = await axiosInstance.get('/erp/reports/stock-movement/pdf', {
        params: {
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          productId: productId || undefined,
          warehouseId: warehouseId || undefined,
          type: type === 'All' ? undefined : type,
          search: debouncedSearch || undefined,
        },
        responseType: 'blob',
      })

      const pdfBlob = new Blob([response.data], {
        type: 'application/pdf',
      })

      const pdfUrl = URL.createObjectURL(pdfBlob)

      printWindow.location.href = pdfUrl

      showToast('success', 'Stock Movement Report PDF generated successfully.')

      window.setTimeout(() => {
        URL.revokeObjectURL(pdfUrl)
      }, 60000)
    } catch (error) {
      printWindow.close()

      let message = 'Unable to generate Stock Movement Report PDF.'

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

  const totalMovements = summary.totalMovements ?? pagination.total

  const stockIn = summary.stockIn ?? 0
  const stockOut = summary.stockOut ?? 0
  const adjustmentNet = summary.adjustmentNet ?? 0
  const transferQuantity = summary.transferQuantity ?? 0

  const statCards = [
    {
      title: 'Total Movements',
      value: formatNumber(totalMovements),
      icon: Boxes,
      iconBg: 'bg-violet-50',
      iconColor: 'text-violet-600',
      valueColor: 'text-erp-text',
      description: 'Total stock transactions',
    },
    {
      title: 'Stock IN',
      value: formatNumber(stockIn),
      icon: ArrowDownToLine,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      valueColor: 'text-emerald-700',
      description: 'Quantity received',
    },
    {
      title: 'Stock OUT',
      value: formatNumber(stockOut),
      icon: ArrowUpFromLine,
      iconBg: 'bg-rose-50',
      iconColor: 'text-rose-600',
      valueColor: 'text-rose-700',
      description: 'Quantity issued',
    },
    {
      title: 'Transfer Quantity',
      value: formatNumber(transferQuantity),
      icon: ArrowLeftRight,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      valueColor: 'text-blue-700',
      description: 'Source-side transfer quantity',
    },
    {
      title: 'Adjustment Net',
      value: `${adjustmentNet > 0 ? '+' : ''}${formatNumber(adjustmentNet)}`,
      icon: SlidersHorizontal,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      valueColor: Number(adjustmentNet) >= 0 ? 'text-emerald-700' : 'text-rose-700',
      description: 'Net stock adjustment',
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

        <p className="mt-1 max-w-sm text-xs text-erp-muted">You do not have permission to view the Stock Movement Report.</p>
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
            <Loading fullScreen={false} label="Loading stock movement report" description="Fetching stock movement information..." className="!h-full min-h-[420px]" />
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

      {/* Report Title */}
      <section className="flex flex-col justify-between gap-3 rounded-xl border border-violet-100 bg-gradient-to-r from-violet-50 via-white to-indigo-50 p-4 shadow-sm sm:flex-row sm:items-center sm:px-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-erp-primary shadow-sm">
              <Package size={20} />
            </div>

            <div>
              <h1 className="text-base font-bold text-slate-800">Stock Movement Report</h1>

              <p className="mt-0.5 text-[11px] text-slate-500">Track stock IN, OUT, transfers and adjustments</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-violet-100 bg-white/80 px-3 py-2">
          <CalendarDays size={15} className="text-erp-primary" />

          <span className="text-[11px] font-semibold text-slate-600">{fromDate || toDate ? `${fromDate || 'Start'} — ${toDate || 'Today'}` : 'All available dates'}</span>
        </div>
      </section>

      {/* Summary Cards */}
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

      {/* Filters */}
      <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-sm print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-erp-border px-4 py-3">
          <div>
            <h2 className="text-xs font-bold text-erp-text">Report Filters</h2>

            <p className="mt-0.5 text-[10px] text-erp-muted">Refine stock movements using the filters below</p>
          </div>

          {hasActiveFilters && (
            <button type="button" onClick={handleClearFilters} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-100">
              <FilterX size={13} />
              Clear Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {/* From Date */}
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

          {/* To Date */}
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

          {/* Product */}
          <div className="min-w-0">
            <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-slate-600">
              <Package size={12} className="text-erp-primary" />
              Product
            </label>

            <select
              value={productId}
              onChange={(event) => {
                setProductId(event.target.value)
                setPage(1)
              }}
              className="h-9 w-full rounded-lg border border-erp-border bg-white px-2.5 text-xs text-erp-text outline-none focus:border-erp-primary"
            >
              <option value="">All Products</option>

              {products.map((product) => (
                <option key={product._id} value={product._id}>
                  {product.name || product.productName}
                  {product.sku ? ` (${product.sku})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Warehouse */}
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
                  {warehouse.name || warehouse.warehouseName}
                  {warehouse.code ? ` (${warehouse.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Movement Type */}
          <div className="min-w-0">
            <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-slate-600">
              <SlidersHorizontal size={12} className="text-erp-primary" />
              Movement Type
            </label>

            <select
              value={type}
              onChange={(event) => {
                setType(event.target.value)
                setPage(1)
              }}
              className="h-9 w-full rounded-lg border border-erp-border bg-white px-2.5 text-xs text-erp-text outline-none focus:border-erp-primary"
            >
              <option value="All">All Movements</option>
              <option value="STOCK_IN">Stock IN</option>
              <option value="STOCK_OUT">Stock OUT</option>
              <option value="TRANSFER">Transfer</option>
              <option value="ADJUSTMENT">Adjustment</option>
            </select>
          </div>

          {/* Search */}
          <div className="min-w-0">
            <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-slate-600">
              <Search size={12} className="text-erp-primary" />
              Search Movement
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
                placeholder="Product, SKU, reference..."
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
            <h2 className="text-xs font-bold text-erp-text">Stock Movement Transactions</h2>

            <p className="mt-0.5 text-[10px] text-erp-muted">Detailed product-wise inventory movement history</p>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg bg-violet-50 px-2.5 py-1.5 text-[10px] font-semibold text-violet-700">
            <FileText size={13} />
            {formatNumber(pagination.total)} Records
          </div>
        </div>

        {refreshing && hasLoaded && (
          <div className="flex items-center justify-center gap-2 border-b border-erp-border px-4 py-2.5 text-[11px] text-erp-muted">
            <LoaderCircle size={14} className="animate-spin text-erp-primary" />
            Updating stock movement report...
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1450px] border-collapse text-left">
            <thead>
              <tr className="border-b border-erp-border bg-slate-50">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">Date & Time</th>

                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">Product</th>

                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">Movement Type</th>

                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">Warehouse</th>

                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">Destination</th>

                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Quantity</th>

                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Unit Cost</th>

                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Total Cost</th>

                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Previous</th>

                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">New Stock</th>

                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">Reference</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {reportRows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-16 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                      <Package size={22} />
                    </div>

                    <p className="mt-3 text-xs font-bold text-slate-700">No stock movements found</p>

                    <p className="mt-1 text-[11px] text-slate-500">Try changing your date range or report filters.</p>

                    {hasActiveFilters && (
                      <button type="button" onClick={handleClearFilters} className="mt-3 text-xs font-bold text-erp-primary hover:underline">
                        Clear all filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                reportRows.map((movement) => {
                  const isAdjustment = movement.type === 'ADJUSTMENT'

                  const adjustmentDifference = Number(movement.newStock || 0) - Number(movement.previousStock || 0)

                  return (
                    <tr key={movement._id} className="transition hover:bg-violet-50/30">
                      {/* Date */}
                      <td className="px-4 py-3">
                        <p className="whitespace-nowrap text-xs font-semibold text-slate-700">{formatDate(movement.createdAt)}</p>

                        <p className="mt-1 whitespace-nowrap text-[10px] text-slate-500">
                          {movement.createdAt
                            ? new Date(movement.createdAt).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </p>
                      </td>

                      {/* Product */}
                      <td className="px-4 py-3">
                        <p className="max-w-48 truncate text-xs font-bold text-slate-800">{getProductName(movement)}</p>

                        <p className="mt-1 text-[10px] text-slate-500">SKU: {getProductSKU(movement)}</p>
                      </td>

                      {/* Movement Type */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex whitespace-nowrap items-center rounded-full border px-2.5 py-1 text-[10px] font-bold ${movementStyles[movement.type] || 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                          {movementLabels[movement.type] || movement.type}
                        </span>

                        {isAdjustment && <p className={`mt-1 text-[9px] font-semibold ${adjustmentDifference >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{adjustmentDifference >= 0 ? 'Increase' : 'Decrease'}</p>}
                      </td>

                      {/* Warehouse */}
                      <td className="px-4 py-3">
                        <p className="max-w-36 truncate text-xs font-medium text-slate-700">{getWarehouseName(movement)}</p>
                      </td>

                      {/* Destination */}
                      <td className="px-4 py-3">
                        <p className="max-w-36 truncate text-xs text-slate-600">{getDestinationWarehouseName(movement)}</p>
                      </td>

                      {/* Quantity */}
                      <td className="px-4 py-3 text-right">
                        <p className="whitespace-nowrap text-xs font-bold tabular-nums text-slate-800">{formatNumber(movement.quantity)}</p>
                      </td>

                      {/* Unit Cost */}
                      <td className="px-4 py-3 text-right">
                        <p className="whitespace-nowrap text-xs font-medium tabular-nums text-slate-700">{formatCurrency(movement.unitCost)}</p>
                      </td>

                      {/* Total Cost */}
                      <td className="px-4 py-3 text-right">
                        <p className="whitespace-nowrap text-xs font-semibold tabular-nums text-slate-800">{formatCurrency(movement.totalCost)}</p>
                      </td>

                      {/* Previous Stock */}
                      <td className="px-4 py-3 text-right">
                        <p className="whitespace-nowrap text-xs tabular-nums text-slate-600">{formatNumber(movement.previousStock)}</p>
                      </td>

                      {/* New Stock */}
                      <td className="px-4 py-3 text-right">
                        <p className="whitespace-nowrap text-xs font-bold tabular-nums text-emerald-700">{formatNumber(movement.newStock)}</p>
                      </td>

                      {/* Reference */}
                      <td className="px-4 py-3">
                        <p className="max-w-36 truncate text-xs font-semibold text-violet-700">{movement.reference || '—'}</p>

                        {movement.reason && (
                          <p title={movement.reason} className="mt-1 max-w-36 truncate text-[10px] text-slate-500">
                            {movement.reason}
                          </p>
                        )}
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
              of <span className="font-bold text-slate-700">{formatNumber(pagination.total)}</span> movements
            </p>

            <div className="flex items-center gap-2">
              <label htmlFor="stock-movement-page-limit" className="whitespace-nowrap text-[11px] font-medium text-slate-500">
                Rows per page
              </label>

              <select
                id="stock-movement-page-limit"
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

      {/* Report Note */}
      <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50/70 px-3 py-2.5 print:hidden">
        <TrendingUp size={15} className="mt-0.5 shrink-0 text-blue-600" />

        <p className="text-[10px] leading-relaxed text-blue-800">
          <span className="font-bold">Report information:</span> Stock IN and Stock OUT quantities are shown separately. Transfer records are maintained for both source and destination warehouses; transfer quantity in the summary counts only the
          source-side movement. Adjustment net is calculated using new stock minus previous stock.
        </p>
      </div>

      {/* Export Confirmation */}
      <TrashBox
        isOpen={showExportConfirmation}
        onClose={() => {
          if (!isExporting) setShowExportConfirmation(false)
        }}
        title="Export Stock Movement Report?"
        message={`This will export the ${reportRows.length} stock movement records currently displayed on page ${page}. Apply filters or change pages to export a different set of records.`}
        actionButtonText="Export CSV"
        cancelButtonText="Cancel"
        onAction={confirmExport}
        isProcessing={isExporting}
        variant="activate"
      />
    </div>
  )
}
