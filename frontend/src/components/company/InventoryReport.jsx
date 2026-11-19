import { useEffect, useState } from 'react'
import {
  Search,
  RefreshCw,
  Package,
  Boxes,
  Warehouse,
  Tags,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  LoaderCircle,
  FilterX,
  ChartNoAxesCombined,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  FileText,
  Archive,
  ShieldCheck,
} from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import Loading from '../Loading/Loading'
import TrashBox from '../../TrashBox/TrashBox'
import { hasPermission, useAuth } from '../../context/AuthContext'

const stockStatusStyles = {
  'In Stock': 'border-emerald-200 bg-emerald-50 text-emerald-700',
  'Low Stock': 'border-amber-200 bg-amber-50 text-amber-700',
  'Out of Stock': 'border-rose-200 bg-rose-50 text-rose-700',
}

const productStatusStyles = {
  Active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Inactive: 'border-slate-200 bg-slate-50 text-slate-600',
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

const escapeCSV = (value) => {
  const text = String(value ?? '')
  return `"${text.replace(/"/g, '""')}"`
}

const getArray = (response, keys = []) => {
  const data = response?.data

  if (Array.isArray(data)) return data

  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key]
    if (Array.isArray(data?.data?.[key])) return data.data[key]
  }

  if (Array.isArray(data?.data)) return data.data

  return []
}

const getProductCategory = (product) => {
  const category = product.category

  if (category && typeof category === 'object') {
    return category.name || category.categoryName || 'Uncategorized'
  }

  return product.categoryName || 'Uncategorized'
}

const getWarehouseStockText = (product) => {
  const warehouses = product.warehouseStock || []

  if (!warehouses.length) return 'No stock record'

  return warehouses
    .map((item) => {
      const warehouseName = item.warehouse?.name || item.warehouse?.code || 'Unknown Warehouse'

      return `${warehouseName}: ${formatNumber(item.availableStock)}`
    })
    .join(' | ')
}

export default function InventoryReport() {
  const { permissions } = useAuth()

  const canView = hasPermission(permissions, 'reports:inventory')
  const canExport = hasPermission(permissions, 'reports:export')

  const [reportRows, setReportRows] = useState([])
  const [categories, setCategories] = useState([])
  const [warehouses, setWarehouses] = useState([])

  const [loading, setLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const [apiError, setApiError] = useState('')
  const [toast, setToast] = useState(null)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const [categoryId, setCategoryId] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [productStatus, setProductStatus] = useState('All')
  const [stockStatus, setStockStatus] = useState('All')

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

  const [printing, setPrinting] = useState(false)

  const breadcrumbItems = [
    { title: 'Reports', link: '/company/reports' },
    { title: 'Inventory Report', link: null },
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
    document.title = 'Inventory Report | MineERP'
  }, [])

  // Load category and warehouse filter options.
  useEffect(() => {
    if (!canView) return

    let cancelled = false

    const fetchFilterOptions = async () => {
      try {
        const [categoryResponse, warehouseResponse] = await Promise.all([
          axiosInstance.get('/erp/categories', {
            params: {
              page: 1,
              limit: 100,
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

        setCategories(getArray(categoryResponse, ['categories']).filter((category) => category.status !== 'Inactive'))

        setWarehouses(getArray(warehouseResponse, ['warehouses']).filter((warehouse) => warehouse.status !== 'Inactive'))
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
    }, 350)

    return () => window.clearTimeout(timer)
  }, [search])

  // Fetch inventory report.
  useEffect(() => {
    if (!canView) {
      setLoading(false)
      return
    }

    let cancelled = false

    const fetchInventoryReport = async () => {
      if (hasLoaded) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      setApiError('')

      try {
        const response = await axiosInstance.get('/erp/reports/inventory', {
          params: {
            page,
            limit: 10,
            search: debouncedSearch || undefined,
            categoryId: categoryId || undefined,
            warehouseId: warehouseId || undefined,
            productStatus: productStatus === 'All' ? undefined : productStatus,
            stockStatus: stockStatus === 'All' ? undefined : stockStatus,
          },
        })

        if (cancelled) return

        const data = response.data

        if (data?.success === false) {
          throw new Error(data.message || 'Unable to load inventory report.')
        }

        setReportRows(getArray(response))
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
          const message = error.response?.data?.message || error.message || 'Unable to load inventory report.'

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

    fetchInventoryReport()

    return () => {
      cancelled = true
    }
  }, [canView, page, pageLimit, debouncedSearch, categoryId, warehouseId, productStatus, stockStatus, refreshKey])

  const handleRefresh = () => {
    if (refreshing || loading) return

    setRefreshing(true)
    setRefreshKey((previous) => previous + 1)
  }

  const handleClearFilters = () => {
    setSearch('')
    setDebouncedSearch('')
    setCategoryId('')
    setWarehouseId('')
    setProductStatus('All')
    setStockStatus('All')
    setPage(1)
  }

  const hasActiveFilters = Boolean(search.trim()) || Boolean(categoryId) || Boolean(warehouseId) || productStatus !== 'All' || stockStatus !== 'All'

  const handleExport = () => {
    if (!canExport || reportRows.length === 0 || isExporting) return

    setShowExportConfirmation(true)
  }

  const confirmExport = () => {
    if (!canExport || reportRows.length === 0 || isExporting) return

    setIsExporting(true)

    try {
      const headers = ['Product Name', 'SKU', 'Barcode', 'Category', 'Product Status', 'Warehouse Stock', 'Current Stock', 'Reserved Stock', 'Available Stock', 'Minimum Stock Level', 'Average Cost', 'Stock Value', 'Stock Status']

      const rows = reportRows.map((product) => [
        product.name,
        product.sku,
        product.barcode,
        getProductCategory(product),
        product.productStatus,
        getWarehouseStockText(product),
        product.currentStock,
        product.reservedStock,
        product.availableStock,
        product.minStockLevel,
        product.averageCost,
        product.stockValue,
        product.stockStatus,
      ])

      const csvContent = [headers.map(escapeCSV).join(','), ...rows.map((row) => row.map(escapeCSV).join(','))].join('\n')

      const blob = new Blob(['\uFEFF' + csvContent], {
        type: 'text/csv;charset=utf-8;',
      })

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = url
      link.download = `inventory-report-${new Date().toISOString().slice(0, 10)}-page-${page}.csv`

      document.body.appendChild(link)
      link.click()
      link.remove()

      window.setTimeout(() => URL.revokeObjectURL(url), 1000)

      setShowExportConfirmation(false)
      showToast('success', 'Inventory report exported successfully.')
    } catch (error) {
      showToast('error', error.message || 'Unable to export inventory report.')
    } finally {
      setIsExporting(false)
    }
  }

  const handlePrint = async () => {
    if (printing) return

    const printWindow = window.open('', '_blank')

    if (!printWindow) {
      showToast('Please allow pop-ups to open the Inventory Report PDF.', 'error')
      return
    }

    try {
      setPrinting(true)

      const response = await axiosInstance.get('/erp/reports/inventory/pdf', {
        params: {
          search: debouncedSearch.trim() || undefined,
          categoryId: categoryId || undefined,
          warehouseId: warehouseId || undefined,
          productStatus: productStatus === 'All' ? undefined : productStatus,
          stockStatus: stockStatus === 'All' ? undefined : stockStatus,
        },
        responseType: 'blob',
      })

      const pdfBlob = new Blob([response.data], {
        type: 'application/pdf',
      })

      const pdfUrl = window.URL.createObjectURL(pdfBlob)

      printWindow.location.href = pdfUrl

      window.setTimeout(() => {
        window.URL.revokeObjectURL(pdfUrl)
      }, 60000)
    } catch (err) {
      console.error('Inventory Report PDF failed:', err)

      if (printWindow && !printWindow.closed) {
        printWindow.close()
      }

      let message = 'Failed to generate Inventory Report PDF.'

      if (err.response?.data instanceof Blob) {
        try {
          const errorData = JSON.parse(await err.response.data.text())
          message = errorData.message || message
        } catch {
          // Keep default error message.
        }
      } else {
        message = err.response?.data?.message || err.message || message
      }

      showToast(message, 'error')
    } finally {
      setPrinting(false)
    }
  }

  const totalProducts = summary.productCount ?? pagination.total
  const totalStock = summary.totalStock ?? 0
  const reservedStock = summary.reservedStock ?? 0
  const availableStock = summary.availableStock ?? 0
  const totalStockValue = summary.totalStockValue ?? 0
  const averageCost = summary.averageCost ?? 0
  const lowStockCount = summary.lowStockCount ?? 0
  const outOfStockCount = summary.outOfStockCount ?? 0
  const inStockCount = summary.inStockCount ?? 0

  const statCards = [
    {
      title: 'Total Products',
      value: formatNumber(totalProducts),
      icon: Package,
      iconBg: 'bg-violet-50',
      iconColor: 'text-violet-600',
      valueColor: 'text-erp-text',
      description: 'Products in report',
    },
    {
      title: 'Total Stock',
      value: formatNumber(totalStock),
      icon: Boxes,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      valueColor: 'text-erp-text',
      description: 'Physical stock quantity',
    },
    {
      title: 'Reserved Stock',
      value: formatNumber(reservedStock),
      icon: ShieldCheck,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      valueColor: 'text-amber-700',
      description: 'Stock reserved for orders',
    },
    {
      title: 'Available Stock',
      value: formatNumber(availableStock),
      icon: Archive,
      iconBg: 'bg-teal-50',
      iconColor: 'text-teal-600',
      valueColor: 'text-teal-700',
      description: 'Available for operations',
    },
    {
      title: 'Stock Value',
      value: formatCurrency(totalStockValue),
      icon: IndianRupee,
      iconBg: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
      valueColor: 'text-erp-text',
      description: 'Current inventory valuation',
    },
    {
      title: 'Average Cost',
      value: formatCurrency(averageCost),
      icon: TrendingUp,
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-600',
      valueColor: 'text-erp-text',
      description: 'Weighted average cost',
    },
    {
      title: 'Low Stock',
      value: formatNumber(lowStockCount),
      icon: TrendingDown,
      iconBg: 'bg-orange-50',
      iconColor: 'text-orange-600',
      valueColor: 'text-orange-700',
      description: 'At or below minimum level',
    },
    {
      title: 'Out of Stock',
      value: formatNumber(outOfStockCount),
      icon: CircleAlert,
      iconBg: 'bg-rose-50',
      iconColor: 'text-rose-600',
      valueColor: 'text-rose-700',
      description: 'No available stock',
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

        <p className="mt-1 max-w-sm text-xs text-erp-muted">You do not have permission to view the Inventory Report.</p>
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
            <Loading fullScreen={false} label="Loading inventory report" description="Fetching product and stock information..." className="!h-full min-h-[420px]" />
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
              disabled={printing}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-erp-border px-3 text-xs font-semibold text-erp-text-secondary transition hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {printing ? <LoaderCircle size={14} className="animate-spin" /> : <Printer size={14} />}

              {printing ? 'Generating PDF...' : 'Print'}
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
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-erp-primary shadow-sm">
            <ChartNoAxesCombined size={20} />
          </div>

          <div>
            <h1 className="text-base font-bold text-slate-800">Inventory Overview</h1>
            <p className="mt-0.5 text-[11px] text-slate-500">Current stock levels, availability and inventory valuation</p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-violet-100 bg-white/80 px-3 py-2">
          <Package size={15} className="text-erp-primary" />
          <span className="text-[11px] font-semibold text-slate-600">Current Inventory Snapshot</span>
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

      {/* Stock status overview */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/60 p-3.5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">In Stock</p>
            <p className="mt-1 text-lg font-bold text-emerald-800">{formatNumber(inStockCount)}</p>
          </div>

          <CheckCircle2 size={22} className="text-emerald-600" />
        </div>

        <div className="flex items-center justify-between rounded-xl border border-amber-100 bg-amber-50/60 p-3.5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">Low Stock</p>
            <p className="mt-1 text-lg font-bold text-amber-800">{formatNumber(lowStockCount)}</p>
          </div>

          <TrendingDown size={22} className="text-amber-600" />
        </div>

        <div className="flex items-center justify-between rounded-xl border border-rose-100 bg-rose-50/60 p-3.5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-rose-700">Out of Stock</p>
            <p className="mt-1 text-lg font-bold text-rose-800">{formatNumber(outOfStockCount)}</p>
          </div>

          <CircleAlert size={22} className="text-rose-600" />
        </div>
      </section>

      {/* Filters */}
      <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-sm print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-erp-border px-4 py-3">
          <div>
            <h2 className="text-xs font-bold text-erp-text">Report Filters</h2>
            <p className="mt-0.5 text-[10px] text-erp-muted">Refine inventory records using the filters below</p>
          </div>

          {hasActiveFilters && (
            <button type="button" onClick={handleClearFilters} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-100">
              <FilterX size={13} />
              Clear Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {/* Category */}
          <div className="min-w-0">
            <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-slate-600">
              <Tags size={12} className="text-erp-primary" />
              Category
            </label>

            <select
              value={categoryId}
              onChange={(event) => {
                setCategoryId(event.target.value)
                setPage(1)
              }}
              className="h-9 w-full rounded-lg border border-erp-border bg-white px-2.5 text-xs text-erp-text outline-none focus:border-erp-primary"
            >
              <option value="">All Categories</option>

              {categories.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name || category.categoryName}
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
                  {warehouse.name}
                  {warehouse.code ? ` (${warehouse.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Product Status */}
          <div className="min-w-0">
            <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-slate-600">
              <CheckCircle2 size={12} className="text-erp-primary" />
              Product Status
            </label>

            <select
              value={productStatus}
              onChange={(event) => {
                setProductStatus(event.target.value)
                setPage(1)
              }}
              className="h-9 w-full rounded-lg border border-erp-border bg-white px-2.5 text-xs text-erp-text outline-none focus:border-erp-primary"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* Stock Status */}
          <div className="min-w-0">
            <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-slate-600">
              <Boxes size={12} className="text-erp-primary" />
              Stock Status
            </label>

            <select
              value={stockStatus}
              onChange={(event) => {
                setStockStatus(event.target.value)
                setPage(1)
              }}
              className="h-9 w-full rounded-lg border border-erp-border bg-white px-2.5 text-xs text-erp-text outline-none focus:border-erp-primary"
            >
              <option value="All">All Stock Statuses</option>
              <option value="In Stock">In Stock</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Out of Stock">Out of Stock</option>
            </select>
          </div>

          {/* Search */}
          <div className="min-w-0">
            <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-slate-600">
              <Search size={12} className="text-erp-primary" />
              Search Product
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
                placeholder="Product name, SKU, barcode..."
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
            <h2 className="text-xs font-bold text-erp-text">Inventory Records</h2>

            <p className="mt-0.5 text-[10px] text-erp-muted">Product-wise stock and valuation details</p>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg bg-violet-50 px-2.5 py-1.5 text-[10px] font-semibold text-violet-700">
            <FileText size={13} />
            {formatNumber(pagination.total)} Records
          </div>
        </div>

        {refreshing && hasLoaded && (
          <div className="flex items-center justify-center gap-2 border-b border-erp-border px-4 py-2.5 text-[11px] text-erp-muted">
            <LoaderCircle size={14} className="animate-spin text-erp-primary" />
            Updating inventory report...
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1450px] border-collapse text-left">
            <thead>
              <tr className="border-b border-erp-border bg-slate-50">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">Product Details</th>

                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">Category</th>

                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">Warehouse Stock</th>

                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Current Stock</th>

                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Reserved</th>

                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Available</th>

                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Average Cost</th>

                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Stock Value</th>

                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wide text-slate-500">Stock Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {reportRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                      <Package size={22} />
                    </div>

                    <p className="mt-3 text-xs font-bold text-slate-700">No inventory records found</p>

                    <p className="mt-1 text-[11px] text-slate-500">Try changing your search or inventory filters.</p>

                    {hasActiveFilters && (
                      <button type="button" onClick={handleClearFilters} className="mt-3 text-xs font-bold text-erp-primary hover:underline">
                        Clear all filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                reportRows.map((product) => {
                  const warehousesForProduct = product.warehouseStock || []

                  return (
                    <tr key={product._id} className="transition hover:bg-violet-50/30">
                      <td className="px-4 py-3">
                        <p className="text-xs font-bold text-slate-800">{product.name || '—'}</p>

                        <p className="mt-1 text-[10px] text-slate-500">SKU: {product.sku || '—'}</p>

                        {product.barcode && <p className="mt-1 text-[10px] text-slate-400">Barcode: {product.barcode}</p>}

                        <span className={`mt-1.5 inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold ${productStatusStyles[product.productStatus] || 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                          {product.productStatus || 'Unknown'}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <p className="max-w-36 truncate text-xs text-slate-600">{getProductCategory(product)}</p>

                        <p className="mt-1 text-[10px] text-slate-400">Unit: {product.unit || 'Piece'}</p>
                      </td>

                      <td className="px-4 py-3">
                        {warehousesForProduct.length === 0 ? (
                          <span className="text-[10px] text-slate-400">No stock record</span>
                        ) : (
                          <div className="flex max-w-64 flex-col gap-1.5">
                            {warehousesForProduct.slice(0, 3).map((item) => (
                              <div key={item.inventoryId} className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-2 py-1">
                                <span className="max-w-36 truncate text-[10px] text-slate-600">{item.warehouse?.name || 'Warehouse'}</span>

                                <span className="whitespace-nowrap text-[10px] font-bold tabular-nums text-slate-800">{formatNumber(item.availableStock)}</span>
                              </div>
                            ))}

                            {warehousesForProduct.length > 3 && <span className="text-[9px] font-semibold text-erp-primary">+{warehousesForProduct.length - 3} more warehouses</span>}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <p className="whitespace-nowrap text-xs font-semibold tabular-nums text-slate-800">{formatNumber(product.currentStock)}</p>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <p className="whitespace-nowrap text-xs font-semibold tabular-nums text-amber-700">{formatNumber(product.reservedStock)}</p>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <p className="whitespace-nowrap text-xs font-bold tabular-nums text-emerald-700">{formatNumber(product.availableStock)}</p>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <p className="whitespace-nowrap text-xs font-semibold tabular-nums text-slate-700">{formatCurrency(product.averageCost)}</p>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <p className="whitespace-nowrap text-xs font-bold tabular-nums text-slate-800">{formatCurrency(product.stockValue)}</p>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex whitespace-nowrap items-center rounded-full border px-2.5 py-1 text-[10px] font-bold ${stockStatusStyles[product.stockStatus] || 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                          {product.stockStatus || 'Unknown'}
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

      {/* Inventory calculation note */}
      <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50/70 px-3 py-2.5 print:hidden">
        <ChartNoAxesCombined size={15} className="mt-0.5 shrink-0 text-blue-600" />

        <p className="text-[10px] leading-relaxed text-blue-800">
          <span className="font-bold">Report calculation:</span> Available Stock = Current Stock − Reserved Stock. Stock Value is based on actual inventory valuation, and Average Cost = Stock Value ÷ Current Stock. Low Stock is determined using the
          product's minimum stock level. This report shows the current inventory snapshot, not historical stock movement.
        </p>
      </div>

      {/* Export Confirmation */}
      <TrashBox
        isOpen={showExportConfirmation}
        onClose={() => {
          if (!isExporting) setShowExportConfirmation(false)
        }}
        title="Export Inventory Report?"
        message={`This will export the ${reportRows.length} inventory records currently displayed on page ${page}. Apply filters or change pages to export a different set of records.`}
        actionButtonText="Export CSV"
        cancelButtonText="Cancel"
        onAction={confirmExport}
        isProcessing={isExporting}
        variant="activate"
      />
    </div>
  )
}
