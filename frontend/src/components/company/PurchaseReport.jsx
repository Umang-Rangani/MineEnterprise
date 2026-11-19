import React, { useEffect, useState } from 'react'
import { Search, RefreshCw, Download, Printer, CalendarDays, ShoppingCart, IndianRupee, Package, Truck, ChevronLeft, ChevronRight, FilterX, FileText, Clock, CheckCircle2, AlertCircle, XCircle, LoaderCircle } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import Loading from '../Loading/Loading'
import TrashBox from '../../TrashBox/TrashBox'

import { hasPermission, useAuth } from '../../context/AuthContext'

const PURCHASE_STATUSES = ['Draft', 'Ordered', 'Partially Received', 'Received', 'Cancelled']

const PAYMENT_STATUSES = ['Unpaid', 'Partially Paid', 'Paid']

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value || 0))

const formatNumber = (value) =>
  new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
  }).format(Number(value || 0))

const formatDate = (date) => {
  if (!date) return '-'

  const parsedDate = new Date(date)

  if (Number.isNaN(parsedDate.getTime())) return '-'

  return parsedDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const getArray = (response) => {
  const data = response?.data

  if (Array.isArray(data)) return data
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.suppliers)) return data.suppliers
  if (Array.isArray(data?.data?.suppliers)) return data.data.suppliers

  return []
}

const getStatusStyle = (status) => {
  const styles = {
    Draft: 'bg-slate-100 text-slate-700',
    Ordered: 'bg-blue-100 text-blue-700',
    'Partially Received': 'bg-amber-100 text-amber-700',
    Received: 'bg-emerald-100 text-emerald-700',
    Cancelled: 'bg-red-100 text-red-700',
  }

  return styles[status] || 'bg-slate-100 text-slate-700'
}

const getPaymentStyle = (status) => {
  const styles = {
    Unpaid: 'bg-red-100 text-red-700',
    'Partially Paid': 'bg-amber-100 text-amber-700',
    Paid: 'bg-emerald-100 text-emerald-700',
  }

  return styles[status] || 'bg-slate-100 text-slate-700'
}

const getStatusIcon = (status) => {
  if (status === 'Received') return CheckCircle2
  if (status === 'Cancelled') return XCircle
  if (status === 'Partially Received') return Clock
  if (status === 'Ordered') return Truck

  return FileText
}

const escapeCSV = (value) => {
  const text = String(value ?? '')
  return `"${text.replace(/"/g, '""')}"`
}

export default function PurchaseReport() {
  const auth = useAuth()

  const permissions = auth?.permissions || auth?.user?.permissions || {}

  const canView = hasPermission(permissions, 'reports:purchase')
  const canExport = hasPermission(permissions, 'reports:export')

  const [purchases, setPurchases] = useState([])
  const [suppliers, setSuppliers] = useState([])

  const [summary, setSummary] = useState({
    purchaseCount: 0,
    financialPurchaseCount: 0,
    subtotal: 0,
    discountAmount: 0,
    taxAmount: 0,
    shippingCharges: 0,
    adjustmentAmount: 0,
    totalAmount: 0,
    paidAmount: 0,
    outstandingAmount: 0,
    orderedQuantity: 0,
    receivedQuantity: 0,
    acceptedQuantity: 0,
    damagedQuantity: 0,
    pendingQuantity: 0,
    draftCount: 0,
    orderedCount: 0,
    partiallyReceivedCount: 0,
    receivedCount: 0,
    cancelledCount: 0,
  })

  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  })

  const [pageLimit, setPageLimit] = useState(10)

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const [toast, setToast] = useState(null)
  const [showExportConfirmation, setShowExportConfirmation] = useState(false)
  const [exporting, setExporting] = useState(false)

  const [printing, setPrinting] = useState(false)

  const breadcrumbItems = [
    { title: 'Reports', link: '/company/reports' },
    { title: 'Purchase Report', link: null },
  ]

  const showToast = (message, type = 'success') => {
    setToast({
      id: Date.now(),
      message,
      type,
      duration: 3000,
    })
  }

  const fetchSuppliers = async () => {
    try {
      const response = await axiosInstance.get('/erp/suppliers', {
        params: {
          page: 1,
          limit: 100,
        },
      })

      setSuppliers(getArray(response))
    } catch (err) {
      console.error('Failed to fetch suppliers:', err)
    }
  }

  useEffect(() => {
    if (canView) {
      fetchSuppliers()
    }
  }, [canView])

  useEffect(() => {
    if (!canView) {
      setLoading(false)
      return
    }

    const fetchPurchases = async () => {
      try {
        setError('')

        if (refreshKey === 0) {
          setLoading(true)
        } else {
          setRefreshing(true)
        }

        const response = await axiosInstance.get('/erp/reports/purchase', {
          params: {
            page: pagination.page,
            limit: pageLimit,
            search: search.trim() || undefined,
            status: status || undefined,
            paymentStatus: paymentStatus || undefined,
            supplierId: supplierId || undefined,
            fromDate: fromDate || undefined,
            toDate: toDate || undefined,
          },
        })

        const result = response?.data

        if (!result?.success) {
          throw new Error(result?.message || 'Failed to fetch Purchase Report.')
        }

        setPurchases(Array.isArray(result.data) ? result.data : [])

        setSummary((previous) => ({
          ...previous,
          ...(result.summary || {}),
        }))

        setPagination((previous) => ({
          ...previous,
          ...(result.pagination || {}),
          limit: pageLimit,
        }))
      } catch (err) {
        const message = err.response?.data?.message || err.message || 'Something went wrong while loading Purchase Report.'

        setError(message)
        setPurchases([])
        showToast(message, 'error')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    }

    fetchPurchases()
  }, [canView, pagination.page, pageLimit, pagination.limit, search, status, paymentStatus, supplierId, fromDate, toDate, refreshKey])

  const handleRefresh = () => {
    setRefreshKey((previous) => previous + 1)
  }

  const handleResetFilters = () => {
    setSearch('')
    setStatus('')
    setPaymentStatus('')
    setSupplierId('')
    setFromDate('')
    setToDate('')

    setPagination((previous) => ({
      ...previous,
      page: 1,
    }))
  }

  const handleFilterChange = (setter, value) => {
    setter(value)

    setPagination((previous) => ({
      ...previous,
      page: 1,
    }))
  }

  const handlePageChange = (page) => {
    if (page < 1 || page > pagination.totalPages) return

    setPagination((previous) => ({
      ...previous,
      page,
    }))
  }

  const handleExport = () => {
    if (!canExport) {
      showToast('You do not have permission to export reports.', 'error')
      return
    }

    if (!purchases.length) {
      showToast('No purchase records available to export.', 'error')
      return
    }

    setShowExportConfirmation(true)
  }

  const confirmExport = () => {
    try {
      setExporting(true)

      const headers = [
        'Purchase Number',
        'Supplier',
        'Purchase Date',
        'Expected Delivery Date',
        'Status',
        'Payment Status',
        'Subtotal',
        'Discount',
        'Tax',
        'Shipping Charges',
        'Adjustment',
        'Total Amount',
        'Paid Amount',
        'Outstanding Amount',
        'Ordered Quantity',
        'Received Quantity',
        'Accepted Quantity',
        'Damaged Quantity',
        'Pending Quantity',
        'Items',
        'Notes',
      ]

      const rows = purchases.map((purchase) => [
        purchase.purchaseNumber,
        purchase.supplier?.name,
        formatDate(purchase.purchaseDate),
        formatDate(purchase.expectedDeliveryDate),
        purchase.status,
        purchase.paymentStatus,
        purchase.subtotal,
        purchase.discountAmount,
        purchase.taxAmount,
        purchase.shippingCharges,
        purchase.adjustmentAmount,
        purchase.totalAmount,
        purchase.paidAmount,
        purchase.outstandingAmount,
        purchase.orderedQuantity,
        purchase.receivedQuantity,
        purchase.acceptedQuantity,
        purchase.damagedQuantity,
        purchase.pendingQuantity,
        purchase.itemCount,
        purchase.notes,
      ])

      const csvContent = [headers.map(escapeCSV).join(','), ...rows.map((row) => row.map(escapeCSV).join(','))].join('\n')

      const blob = new Blob(['\uFEFF' + csvContent], {
        type: 'text/csv;charset=utf-8;',
      })

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = url
      link.download = `purchase-report-${new Date().toISOString().slice(0, 10)}.csv`

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      URL.revokeObjectURL(url)

      setShowExportConfirmation(false)
      showToast('Purchase Report exported successfully.')
    } catch (err) {
      console.error('Purchase Report export failed:', err)
      showToast('Failed to export Purchase Report.', 'error')
    } finally {
      setExporting(false)
    }
  }

  const handlePrint = async () => {
    if (printing) return

    // Open blank tab immediately to avoid popup blocking.
    const printWindow = window.open('', '_blank')

    if (!printWindow) {
      showToast('Please allow pop-ups to open the Purchase Report PDF.', 'error')
      return
    }

    try {
      setPrinting(true)

      const response = await axiosInstance.get('/erp/reports/purchase/pdf', {
        params: {
          search: search.trim() || undefined,
          status: status || undefined,
          paymentStatus: paymentStatus || undefined,
          supplierId: supplierId || undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
        },
        responseType: 'blob',
      })

      const pdfBlob = new Blob([response.data], {
        type: 'application/pdf',
      })

      const pdfUrl = window.URL.createObjectURL(pdfBlob)

      printWindow.location.href = pdfUrl

      // Release the object URL after the PDF has had time to load.
      window.setTimeout(() => {
        window.URL.revokeObjectURL(pdfUrl)
      }, 60000)
    } catch (err) {
      console.error('Purchase Report PDF failed:', err)

      if (printWindow && !printWindow.closed) {
        printWindow.close()
      }

      let message = 'Failed to generate Purchase Report PDF.'

      if (err.response?.data instanceof Blob) {
        try {
          const errorData = JSON.parse(await err.response.data.text())
          message = errorData.message || message
        } catch {
          // Keep the default error message.
        }
      } else {
        message = err.response?.data?.message || err.message || message
      }

      showToast(message, 'error')
    } finally {
      setPrinting(false)
    }
  }

  const statCards = [
    {
      title: 'Total Purchases',
      value: formatNumber(summary.purchaseCount),
      subtitle: `${formatNumber(summary.financialPurchaseCount)} financial purchases`,
      icon: ShoppingCart,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
    },
    {
      title: 'Purchase Amount',
      value: formatCurrency(summary.totalAmount),
      subtitle: 'Excluding drafts and cancelled',
      icon: IndianRupee,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Paid Amount',
      value: formatCurrency(summary.paidAmount),
      subtitle: 'Total amount paid',
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      title: 'Outstanding',
      value: formatCurrency(summary.outstandingAmount),
      subtitle: 'Remaining payable amount',
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
  ]

  if (!canView) {
    return (
      <div className="flex min-h-[350px] items-center justify-center rounded-xl border border-erp-border bg-erp-surface p-6">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-amber-500" />

          <h2 className="text-lg font-semibold text-erp-text">Access Restricted</h2>

          <p className="mt-1 text-sm text-erp-muted">You do not have permission to view the Purchase Report.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-w-0 space-y-4 pb-8 text-sm">
        <section className="flex h-17 items-center justify-between overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card print:hidden">
          <div className="flex h-full w-full items-center border-t-4 border-erp-primary px-4 sm:px-5">
            <BreadCrumb items={breadcrumbItems} />
          </div>
        </section>

        <section className="relative min-h-[420px] overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-sm">
          <div className="flex min-h-[420px] items-center justify-center">
            <Loading fullScreen={false} label="Loading Purchase Report" description="Fetching purchase and supplier information..." className="!h-full min-h-[420px]" />
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-4 pb-8 text-sm">
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
                disabled={purchases.length === 0 || exporting}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-erp-primary px-3.5 text-xs font-semibold text-white transition hover:bg-erp-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {exporting ? <LoaderCircle size={14} className="animate-spin" /> : <Download size={14} />}
                Export CSV
              </button>
            )}
          </div>
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
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-erp-muted">{card.title}</p>

                  <h3 className="mt-2 truncate text-base font-bold text-erp-text sm:text-lg">{card.value}</h3>

                  <p className="mt-1 text-[11px] text-erp-muted">{card.subtitle}</p>
                </div>

                <div className={`shrink-0 rounded-xl p-2.5 ${card.bg}`}>
                  <Icon size={19} className={card.color} />
                </div>
              </div>
            </article>
          )
        })}
      </section>

      {/* Purchase Status Summary */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          {
            label: 'Draft',
            value: summary.draftCount,
            color: 'text-slate-700',
            bg: 'bg-slate-100',
          },
          {
            label: 'Ordered',
            value: summary.orderedCount,
            color: 'text-blue-700',
            bg: 'bg-blue-100',
          },
          {
            label: 'Partially Received',
            value: summary.partiallyReceivedCount,
            color: 'text-amber-700',
            bg: 'bg-amber-100',
          },
          {
            label: 'Received',
            value: summary.receivedCount,
            color: 'text-emerald-700',
            bg: 'bg-emerald-100',
          },
          {
            label: 'Cancelled',
            value: summary.cancelledCount,
            color: 'text-red-700',
            bg: 'bg-red-100',
          },
        ].map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-2 rounded-xl border border-erp-border bg-erp-surface p-3.5 shadow-sm">
            <span className="text-[11px] font-medium text-erp-muted">{item.label}</span>

            <span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${item.bg} ${item.color}`}>{formatNumber(item.value)}</span>
          </div>
        ))}
      </section>

      {/* Quantity and Purchase Breakdown */}
      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-erp-border bg-erp-surface p-3.5 shadow-sm sm:p-4">
          <div className="mb-4 flex items-center gap-2">
            <div className="rounded-lg bg-violet-50 p-2">
              <Package size={18} className="text-violet-600" />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-erp-text">Purchase Quantity Summary</h3>
              <p className="text-[11px] text-erp-muted">Ordered and received quantities</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {[
              ['Ordered', summary.orderedQuantity],
              ['Received', summary.receivedQuantity],
              ['Accepted', summary.acceptedQuantity],
              ['Damaged', summary.damagedQuantity],
              ['Pending', summary.pendingQuantity],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-[11px] text-erp-muted">{label}</p>
                <p className="mt-1 text-base font-bold text-erp-text sm:text-lg">{formatNumber(value)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-erp-border bg-erp-surface p-3.5 shadow-sm sm:p-4">
          <div className="mb-4 flex items-center gap-2">
            <div className="rounded-lg bg-emerald-50 p-2">
              <IndianRupee size={18} className="text-emerald-600" />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-erp-text">Purchase Amount Breakdown</h3>
              <p className="text-[11px] text-erp-muted">Financial purchases only</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {[
              ['Subtotal', summary.subtotal],
              ['Discount', summary.discountAmount],
              ['Tax', summary.taxAmount],
              ['Shipping', summary.shippingCharges],
              ['Adjustment', summary.adjustmentAmount],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-[11px] text-erp-muted">{label}</p>
                <p className="mt-1 text-sm font-semibold text-erp-text sm:text-base">{formatCurrency(value)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-sm print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-erp-border px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-erp-text">Purchase Records</h3>
            <p className="mt-0.5 text-[11px] text-erp-muted">Search and filter your purchase transactions</p>
          </div>

          <button type="button" onClick={handleResetFilters} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-erp-border px-2.5 text-[11px] font-semibold text-erp-text-secondary transition hover:bg-erp-hover">
            <FilterX size={13} />
            Clear Filters
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="relative xl:col-span-2">
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-erp-muted">Search</label>

            <Search size={14} className="absolute bottom-2.5 left-3 text-erp-muted" />

            <input
              type="text"
              value={search}
              onChange={(event) => handleFilterChange(setSearch, event.target.value)}
              placeholder="Purchase number, supplier..."
              className="h-9 w-full rounded-lg border border-erp-border bg-erp-surface pl-9 pr-3 text-xs text-erp-text outline-none transition placeholder:text-erp-muted focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-erp-muted">Purchase Status</label>

            <select value={status} onChange={(event) => handleFilterChange(setStatus, event.target.value)} className="h-9 w-full rounded-lg border border-erp-border bg-erp-surface px-2.5 text-xs text-erp-text outline-none focus:border-erp-primary">
              <option value="">All Status</option>
              {PURCHASE_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-erp-muted">Payment Status</label>

            <select
              value={paymentStatus}
              onChange={(event) => handleFilterChange(setPaymentStatus, event.target.value)}
              className="h-9 w-full rounded-lg border border-erp-border bg-erp-surface px-2.5 text-xs text-erp-text outline-none focus:border-erp-primary"
            >
              <option value="">All Payments</option>
              {PAYMENT_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-erp-muted">Supplier</label>

            <select
              value={supplierId}
              onChange={(event) => handleFilterChange(setSupplierId, event.target.value)}
              className="h-9 w-full rounded-lg border border-erp-border bg-erp-surface px-2.5 text-xs text-erp-text outline-none focus:border-erp-primary"
            >
              <option value="">All Suppliers</option>
              {suppliers.map((supplier) => (
                <option key={supplier._id} value={supplier._id}>
                  {supplier.supplierName || supplier.name || 'Supplier'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-erp-muted">From Date</label>

            <div className="relative">
              <CalendarDays size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-erp-muted" />

              <input
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(event) => handleFilterChange(setFromDate, event.target.value)}
                className="h-9 w-full rounded-lg border border-erp-border bg-erp-surface pl-8 pr-1.5 text-xs text-erp-text outline-none focus:border-erp-primary"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-erp-muted">To Date</label>

            <div className="relative">
              <CalendarDays size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-erp-muted" />

              <input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(event) => handleFilterChange(setToDate, event.target.value)}
                className="h-9 w-full rounded-lg border border-erp-border bg-erp-surface pl-8 pr-1.5 text-xs text-erp-text outline-none focus:border-erp-primary"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />

          <div className="min-w-0 flex-1">
            <p className="font-semibold">Unable to load Purchase Report</p>
            <p className="mt-1">{error}</p>
          </div>

          <button type="button" onClick={handleRefresh} className="shrink-0 font-semibold underline">
            Retry
          </button>
        </div>
      )}

      {/* Table */}
      <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-erp-border px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-erp-text">Purchase Transactions</h3>
            <p className="mt-0.5 text-[11px] text-erp-muted">{formatNumber(pagination.total)} records found</p>
          </div>

          <div className="rounded-lg bg-erp-bg px-2.5 py-1 text-[11px] font-medium text-erp-muted">
            Page {pagination.page} of {Math.max(1, pagination.totalPages)}
          </div>
        </div>

        {refreshing && (
          <div className="flex items-center gap-2 border-b border-erp-border bg-erp-bg px-4 py-2 text-xs text-erp-muted">
            <LoaderCircle size={14} className="animate-spin" />
            Updating purchase records...
          </div>
        )}

        {!purchases.length ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center px-4 text-center">
            <div className="mb-3 rounded-2xl bg-erp-bg p-4">
              <ShoppingCart size={28} className="text-erp-muted" />
            </div>

            <h3 className="text-sm font-semibold text-erp-text">No Purchase Records Found</h3>

            <p className="mt-1 max-w-sm text-xs text-erp-muted">No purchases match the selected filters. Try changing your search or clearing the filters.</p>

            <button type="button" onClick={handleResetFilters} className="mt-4 rounded-lg bg-erp-primary px-4 py-2 text-xs font-semibold text-white transition hover:bg-erp-primary-hover">
              Clear Filters
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1250px] text-left text-sm">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-erp-muted">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Purchase</th>
                    <th className="px-4 py-3 font-semibold">Supplier</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">Total Amount</th>
                    <th className="px-4 py-3 text-right font-semibold">Paid</th>
                    <th className="px-4 py-3 text-right font-semibold">Outstanding</th>
                    <th className="px-4 py-3 font-semibold">Payment</th>
                    <th className="px-4 py-3 text-right font-semibold">Ordered</th>
                    <th className="px-4 py-3 text-right font-semibold">Accepted</th>
                    <th className="px-4 py-3 text-right font-semibold">Pending</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {purchases.map((purchase) => {
                    const StatusIcon = getStatusIcon(purchase.status)

                    return (
                      <tr key={purchase._id} className="transition hover:bg-violet-50/30">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-erp-text">{purchase.purchaseNumber || '-'}</p>
                          <p className="mt-0.5 text-[11px] text-erp-muted">{formatNumber(purchase.itemCount)} items</p>
                        </td>

                        <td className="px-4 py-3">
                          <p className="font-medium text-erp-text">{purchase.supplier?.name || '-'}</p>

                          {purchase.supplier?.code && <p className="mt-0.5 text-[11px] text-erp-muted">{purchase.supplier.code}</p>}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-xs text-erp-muted">{formatDate(purchase.purchaseDate)}</td>

                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${getStatusStyle(purchase.status)}`}>
                            <StatusIcon size={12} />
                            {purchase.status}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold text-erp-text">{formatCurrency(purchase.totalAmount)}</td>

                        <td className="whitespace-nowrap px-4 py-3 text-right text-xs text-emerald-700">{formatCurrency(purchase.paidAmount)}</td>

                        <td className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold text-amber-700">{formatCurrency(purchase.outstandingAmount)}</td>

                        <td className="px-4 py-3">
                          <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${getPaymentStyle(purchase.paymentStatus)}`}>{purchase.paymentStatus || '-'}</span>
                        </td>

                        <td className="px-4 py-3 text-right text-xs text-erp-text">{formatNumber(purchase.orderedQuantity)}</td>

                        <td className="px-4 py-3 text-right text-xs font-medium text-emerald-700">{formatNumber(purchase.acceptedQuantity)}</td>

                        <td className="px-4 py-3 text-right text-xs font-medium text-amber-700">{formatNumber(purchase.pendingQuantity)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="space-y-3 p-3 lg:hidden">
              {purchases.map((purchase) => {
                const StatusIcon = getStatusIcon(purchase.status)

                return (
                  <div key={purchase._id} className="rounded-xl border border-erp-border p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="break-all text-sm font-bold text-erp-text">{purchase.purchaseNumber || '-'}</p>

                        <p className="mt-1 text-xs text-erp-muted">{purchase.supplier?.name || 'Unknown Supplier'}</p>
                      </div>

                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${getStatusStyle(purchase.status)}`}>
                        <StatusIcon size={12} />
                        {purchase.status}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3 border-t border-erp-border pt-3">
                      <div>
                        <p className="text-[11px] text-erp-muted">Purchase Date</p>
                        <p className="mt-1 text-xs font-medium text-erp-text">{formatDate(purchase.purchaseDate)}</p>
                      </div>

                      <div>
                        <p className="text-[11px] text-erp-muted">Payment Status</p>
                        <span className={`mt-1 inline-block rounded-full px-2 py-1 text-[11px] font-semibold ${getPaymentStyle(purchase.paymentStatus)}`}>{purchase.paymentStatus || '-'}</span>
                      </div>

                      <div>
                        <p className="text-[11px] text-erp-muted">Total Amount</p>
                        <p className="mt-1 text-sm font-bold text-erp-text">{formatCurrency(purchase.totalAmount)}</p>
                      </div>

                      <div>
                        <p className="text-[11px] text-erp-muted">Paid Amount</p>
                        <p className="mt-1 text-sm font-semibold text-emerald-700">{formatCurrency(purchase.paidAmount)}</p>
                      </div>

                      <div>
                        <p className="text-[11px] text-erp-muted">Outstanding</p>
                        <p className="mt-1 text-sm font-semibold text-amber-700">{formatCurrency(purchase.outstandingAmount)}</p>
                      </div>

                      <div>
                        <p className="text-[11px] text-erp-muted">Ordered / Accepted</p>
                        <p className="mt-1 text-sm font-medium text-erp-text">
                          {formatNumber(purchase.orderedQuantity)} / {formatNumber(purchase.acceptedQuantity)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] text-erp-muted">Pending Quantity</p>
                        <p className="mt-1 text-sm font-semibold text-amber-700">{formatNumber(purchase.pendingQuantity)}</p>
                      </div>

                      <div>
                        <p className="text-[11px] text-erp-muted">Items</p>
                        <p className="mt-1 text-sm font-medium text-erp-text">{formatNumber(purchase.itemCount)}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            <div className="flex flex-col items-center justify-between gap-3 border-t border-erp-border px-4 py-3 sm:flex-row print:hidden">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-[11px] text-erp-muted">
                  Showing <span className="font-semibold text-erp-text">{pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                  <span className="font-semibold text-erp-text">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="font-semibold text-erp-text">{pagination.total}</span> records
                </p>

                <div className="flex items-center gap-2">
                  <label htmlFor="purchase-page-limit" className="whitespace-nowrap text-[11px] font-medium text-erp-muted">
                    Rows per page
                  </label>

                  <select
                    id="purchase-page-limit"
                    value={pageLimit}
                    onChange={(event) => {
                      const limit = Number(event.target.value)
                      setPageLimit(limit)
                      setPagination((previous) => ({
                        ...previous,
                        page: 1,
                        limit,
                      }))
                    }}
                    className="h-8 rounded-lg border border-erp-border bg-erp-surface px-2 text-[11px] font-semibold text-erp-text outline-none focus:border-erp-primary"
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
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-erp-border text-erp-text transition hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={15} />
                </button>

                <span className="min-w-[90px] text-center text-[11px] font-medium text-erp-text">
                  Page {pagination.page} / {Math.max(1, pagination.totalPages)}
                </span>

                <button
                  type="button"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages || pagination.totalPages === 0}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-erp-border text-erp-text transition hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Export Confirmation */}
      <TrashBox
        isOpen={showExportConfirmation}
        onClose={() => setShowExportConfirmation(false)}
        onAction={confirmExport}
        isProcessing={exporting}
        variant="activate"
        title="Export Purchase Report?"
        message={`Are you sure you want to export the ${purchases.length} purchase records currently displayed on this page as a CSV file?`}
        actionButtonText="Export CSV"
        cancelButtonText="Cancel"
      />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}
