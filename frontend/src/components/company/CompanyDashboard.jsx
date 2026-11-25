import { useEffect, useState } from 'react'
import {
  Building2,
  Users,
  Package,
  ShoppingCart,
  IndianRupee,
  RefreshCw,
  AlertCircle,
  Mail,
  Phone,
  Globe,
  MapPin,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  XCircle,
  TrendingUp,
  TrendingDown,
  Warehouse,
  CreditCard,
  Receipt,
  Boxes,
  CalendarDays,
  Activity,
  Truck,
  Wallet,
  BarChart3,
} from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Loading from '../Loading/Loading'

const formatNumber = (value) => Number(value || 0).toLocaleString('en-IN')

const formatCurrency = (value, currency = 'INR') =>
  `${currency} ${Number(value || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  })}`

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

const getPayload = (response) => response?.data?.data || response?.data || {}

const statusStyles = {
  Draft: 'bg-slate-100 text-slate-700',
  Approved: 'bg-blue-50 text-blue-700',
  'Partially Dispatched': 'bg-amber-50 text-amber-700',
  Dispatched: 'bg-emerald-50 text-emerald-700',
  Cancelled: 'bg-red-50 text-red-700',
  Paid: 'bg-emerald-50 text-emerald-700',
  'Partially Paid': 'bg-amber-50 text-amber-700',
  Overdue: 'bg-red-50 text-red-700',
}

function SectionHeading({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-erp-primary-light text-erp-primary">
          <Icon size={18} />
        </div>

        <div className="min-w-0">
          <h2 className="text-sm font-bold text-slate-900">{title}</h2>
          {description && <p className="mt-0.5 text-[11px] text-slate-500">{description}</p>}
        </div>
      </div>

      {action}
    </div>
  )
}

function MetricCard({ label, value, description, icon: Icon, color, bg }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-2 break-words text-xl font-bold text-slate-900">{value}</p>
        </div>

        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bg} ${color}`}>
          <Icon size={20} />
        </div>
      </div>

      {description && <p className="mt-3 text-[11px] text-slate-500">{description}</p>}
    </div>
  )
}

function DetailItem({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className="mt-1 break-words text-xs font-semibold text-slate-800">{value || 'Not provided'}</p>
    </div>
  )
}

function ProgressItem({ label, value, total, color = 'bg-erp-primary' }) {
  const percentage = total > 0 ? Math.min((Number(value || 0) / Number(total)) * 100, 100) : 0

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        <span className="text-xs font-bold tabular-nums text-slate-800">{formatNumber(value)}</span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  )
}

export default function CompanyDashboard() {
  const [company, setCompany] = useState(null)
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [analyticsPeriod, setAnalyticsPeriod] = useState('monthly')

  useEffect(() => {
    document.title = 'Dashboard | MineERP'
  }, [])

  const items = [{ label: 'Dashboard' }]

  useEffect(() => {
    let cancelled = false

    const fetchDashboardData = async () => {
      setLoading(true)
      setError('')

      const results = await Promise.allSettled([axiosInstance.get('/companies/me'), axiosInstance.get('/erp/dashboard/summary')])

      if (cancelled) return

      const [companyResult, dashboardResult] = results

      if (companyResult.status === 'fulfilled' && companyResult.value.data?.success) {
        setCompany(companyResult.value.data.company)
      } else {
        const message = companyResult.status === 'rejected' ? companyResult.reason?.response?.data?.message : null

        setError(message || 'Unable to load company details.')
        setCompany(null)
      }

      if (dashboardResult.status === 'fulfilled' && dashboardResult.value.data?.success) {
        setDashboard(getPayload(dashboardResult.value))
      } else {
        const message = dashboardResult.status === 'rejected' ? dashboardResult.reason?.response?.data?.message : null

        setDashboard(null)

        setError((previous) => {
          const dashboardError = message || 'Unable to load dashboard summary.'

          return previous ? `${previous} ${dashboardError}` : dashboardError
        })
      }

      setLoading(false)
      setHasLoaded(true)
    }

    fetchDashboardData()

    return () => {
      cancelled = true
    }
  }, [refreshKey])

  const handleRefresh = () => {
    if (loading) return
    setRefreshKey((key) => key + 1)
  }

  const business = dashboard?.businessOverview || {}
  const salesOrders = dashboard?.salesOrders || {}
  const inventory = dashboard?.inventory || {}
  const finance = dashboard?.finance || {}
  const warehouses = dashboard?.warehouses || {}

  const visibleSections = dashboard?.visibleSections || {}

  // Fail closed: if a permission flag is missing, hide that section.
  const canSee = (section) => visibleSections[section] === true

  const canSeeProducts = canSee('products')
  const canSeeEmployees = canSee('employees')
  const canSeeSales = canSee('salesOrders')
  const canSeeInventory = canSee('inventory')
  const canSeeWarehouses = canSee('warehouses')
  const canSeeInvoices = canSee('invoices')
  const canSeePayments = canSee('payments')
  const canSeeFinance = canSee('finance')
  const canSeeCompany = canSee('company')
  const canSeeRecentOrders = canSee('recentOrders')
  const canSeeRecentActivities = canSee('recentActivities')

  const hasBusinessOverview = canSeeProducts || canSeeEmployees || canSeeSales || canSeeInvoices

  const hasAnalytics = canSeeInvoices || canSeePayments

  const currency = company?.currency || dashboard?.company?.currency || 'INR'

  const companyStatus = company?.status || dashboard?.company?.status || 'Unknown'

  const statusConfig = {
    Approved: {
      icon: CheckCircle2,
      className: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    },
    Pending: {
      icon: Clock3,
      className: 'bg-amber-50 text-amber-700 ring-amber-200',
    },
    Rejected: {
      icon: XCircle,
      className: 'bg-red-50 text-red-700 ring-red-200',
    },
  }

  const currentStatus = statusConfig[companyStatus] || {
    icon: AlertCircle,
    className: 'bg-slate-100 text-slate-600 ring-slate-200',
  }

  const StatusIcon = currentStatus.icon

  const analytics = dashboard?.analytics?.[analyticsPeriod] || {
    revenue: [],
    received: [],
  }

  const revenueData = canSeeInvoices && Array.isArray(analytics.revenue) ? analytics.revenue : []

  const receivedData = canSeePayments && Array.isArray(analytics.received) ? analytics.received : []

  const chartMaximum = Math.max(1, ...revenueData.map((item) => Number(item.value || 0)), ...receivedData.map((item) => Number(item.value || 0)))

  const chartLabels = [...new Set([...revenueData.map((item) => item.label), ...receivedData.map((item) => item.label)])].sort()

  const revenueMap = new Map(revenueData.map((item) => [item.label, item.value]))

  const receivedMap = new Map(receivedData.map((item) => [item.label, item.value]))

  const orderStatusItems = [
    { label: 'Draft', value: salesOrders.Draft, color: 'bg-slate-400' },
    { label: 'Approved', value: salesOrders.Approved, color: 'bg-blue-500' },
    {
      label: 'Partially Dispatched',
      value: salesOrders['Partially Dispatched'],
      color: 'bg-amber-500',
    },
    {
      label: 'Dispatched',
      value: salesOrders.Dispatched,
      color: 'bg-emerald-500',
    },
    {
      label: 'Cancelled',
      value: salesOrders.Cancelled,
      color: 'bg-red-500',
    },
  ]

  const companyInformation = [
    { label: 'Company Email', value: company?.companyEmail, icon: Mail },
    { label: 'Company Phone', value: company?.companyPhone, icon: Phone },
    {
      label: 'Business Category',
      value: company?.businessCategory,
      icon: BriefcaseBusiness,
    },
    { label: 'Website', value: company?.website, icon: Globe },
  ]

  const fullAddress = [company?.addressLine1, company?.addressLine2, company?.city, company?.state, company?.postalCode, company?.country].filter(Boolean).join(', ')

  const recentOrders = canSeeRecentOrders && Array.isArray(dashboard?.recentOrders) ? dashboard.recentOrders : []

  const recentActivities = canSeeRecentActivities && Array.isArray(dashboard?.recentActivities) ? dashboard.recentActivities : []

  if (loading && !hasLoaded) {
    return (
      <div className="min-w-0 space-y-4 text-sm">
        <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="h-1 bg-erp-primary" />
          <div className="flex min-h-16 items-center px-4 sm:px-5">
            <BreadCrumb items={items} />
          </div>
        </section>

        <section className="relative min-h-[480px] overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex min-h-[480px] items-center justify-center">
            <Loading fullScreen={false} label="Loading dashboard" description="Please wait while we load dashboard data." className="!h-full min-h-[480px]" />
          </div>
        </section>
      </div>
    )
  }

  if (error && !company && !dashboard) {
    return (
      <div className="min-w-0 space-y-4 text-sm">
        <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="h-1 bg-erp-primary" />
          <div className="flex min-h-16 items-center px-4 sm:px-5">
            <BreadCrumb items={items} />
          </div>
        </section>

        <section className="flex min-h-[400px] items-center justify-center rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="w-full max-w-sm text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertCircle size={23} />
            </div>

            <h2 className="mt-3 text-base font-bold text-slate-900">Unable to load dashboard</h2>

            <p className="mt-2 text-xs text-slate-500">{error}</p>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-erp-primary px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-erp-primary-hover disabled:opacity-60"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Try Again
            </button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-4 text-sm">
      {/* Header */}
      <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        <div className="h-1 bg-erp-primary" />

        <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-5">
          <BreadCrumb items={items} />

          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            title="Refresh dashboard"
            aria-label="Refresh dashboard"
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-erp-border bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'Refreshing' : 'Refresh'}</span>
          </button>
        </div>
      </section>

      {/* Error notice */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-600" />
          <div>
            <p className="text-xs font-semibold text-amber-800">Some dashboard information could not be loaded</p>
            <p className="mt-1 text-xs text-amber-700">{error}</p>
          </div>
        </div>
      )}

      {/* Welcome */}
      <section className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-gradient-to-l from-violet-50 to-transparent sm:block" />

        <div className="relative flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">
              {dashboard?.company?.logo || company?.logo ? <img src={dashboard?.company?.logo || company?.logo} alt="Company logo" className="h-full w-full rounded-xl object-cover" /> : <Building2 size={25} />}
            </div>

            <div className="min-w-0">
              <p className="text-xs text-slate-500">Welcome to your workspace</p>
              <h2 className="mt-1 break-words text-lg font-bold text-slate-900">{company?.companyName || dashboard?.company?.companyName || 'Your Company'}</h2>
              <p className="mt-1 text-xs text-slate-500">{company?.businessType || 'Company Dashboard'}</p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${currentStatus.className}`}>
              <StatusIcon size={13} />
              {companyStatus}
            </span>
            <p className="text-[11px] text-slate-500">Company account status</p>
          </div>
        </div>
      </section>

      {/* Business overview */}
      {hasBusinessOverview && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 size={17} className="text-erp-primary" />
            <h2 className="text-sm font-bold text-slate-900">Business Overview</h2>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {canSeeProducts && <MetricCard label="Total Products" value={formatNumber(business.totalProducts)} description={`${formatNumber(business.activeProducts)} active products`} icon={Package} color="text-violet-600" bg="bg-violet-50" />}

            {canSeeSales && (
              <MetricCard
                label="Total Sales Orders"
                value={formatNumber(business.totalSalesOrders)}
                description={`${formatCurrency(salesOrders.totalOrderValue, currency)} total order value`}
                icon={ShoppingCart}
                color="text-blue-600"
                bg="bg-blue-50"
              />
            )}

            {canSeeEmployees && <MetricCard label="Total Employees" value={formatNumber(business.totalEmployees)} description={`${formatNumber(business.activeEmployees)} active employees`} icon={Users} color="text-emerald-600" bg="bg-emerald-50" />}

            {canSeeInvoices && <MetricCard label="Total Revenue" value={formatCurrency(business.totalRevenue, currency)} description="Approved invoice revenue" icon={IndianRupee} color="text-amber-600" bg="bg-amber-50" />}
          </div>
        </section>
      )}

      {/* Sales analytics */}
      {hasAnalytics && (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <SectionHeading
            icon={TrendingUp}
            title="Sales Analytics"
            description="Revenue and payment collection trends"
            action={
              <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
                {[
                  { label: 'Daily', value: 'daily' },
                  { label: 'Weekly', value: 'weekly' },
                  { label: 'Monthly', value: 'monthly' },
                  { label: 'Yearly', value: 'yearly' },
                ].map((period) => (
                  <button
                    key={period.value}
                    type="button"
                    onClick={() => setAnalyticsPeriod(period.value)}
                    className={`rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition ${analyticsPeriod === period.value ? 'bg-white text-erp-primary shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    {period.label}
                  </button>
                ))}
              </div>
            }
          />

          <div className="p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap gap-4">
              {canSeeInvoices && (
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm bg-violet-500" />
                  <span className="text-xs text-slate-600">Revenue</span>
                </div>
              )}

              {canSeePayments && (
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                  <span className="text-xs text-slate-600">Received</span>
                </div>
              )}
            </div>

            {chartLabels.length === 0 ? (
              <div className="flex min-h-44 flex-col items-center justify-center text-center">
                <BarChart3 size={30} className="text-slate-300" />
                <p className="mt-2 text-xs font-semibold text-slate-600">No analytics data available</p>
                <p className="mt-1 text-[11px] text-slate-400">Data will appear here when transactions are available.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="flex min-w-[500px] items-end gap-3 px-1 pt-5">
                  {chartLabels.map((label) => {
                    const revenue = Number(revenueMap.get(label) || 0)
                    const received = Number(receivedMap.get(label) || 0)

                    const revenueHeight = Math.max(2, (revenue / chartMaximum) * 150)

                    const receivedHeight = Math.max(2, (received / chartMaximum) * 150)

                    return (
                      <div key={label} className="flex min-w-0 flex-1 flex-col items-center">
                        <div className="flex h-40 w-full items-end justify-center gap-1">
                          {canSeeInvoices && <div title={`Revenue: ${formatCurrency(revenue, currency)}`} className="w-3/12 max-w-7 rounded-t-md bg-violet-500 transition-all hover:bg-violet-600" style={{ height: `${revenueHeight}px` }} />}

                          {canSeePayments && <div title={`Received: ${formatCurrency(received, currency)}`} className="w-3/12 max-w-7 rounded-t-md bg-emerald-500 transition-all hover:bg-emerald-600" style={{ height: `${receivedHeight}px` }} />}
                        </div>

                        <p className="mt-2 max-w-full truncate text-[10px] font-medium text-slate-500">{label}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className={`mt-5 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 ${canSeeInvoices && canSeePayments ? 'sm:grid-cols-2' : 'sm:grid-cols-1'}`}>
              {canSeeInvoices && (
                <div className="rounded-lg bg-violet-50 p-3">
                  <p className="text-[11px] font-medium text-violet-700">Total Revenue in Period</p>
                  <p className="mt-1 text-base font-bold text-violet-900">
                    {formatCurrency(
                      revenueData.reduce((sum, item) => sum + Number(item.value || 0), 0),
                      currency,
                    )}
                  </p>
                </div>
              )}

              {canSeePayments && (
                <div className="rounded-lg bg-emerald-50 p-3">
                  <p className="text-[11px] font-medium text-emerald-700">Total Received in Period</p>
                  <p className="mt-1 text-base font-bold text-emerald-900">
                    {formatCurrency(
                      receivedData.reduce((sum, item) => sum + Number(item.value || 0), 0),
                      currency,
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Sales order status and inventory */}
      {(canSeeSales || canSeeInventory) && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {canSeeSales && (
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <SectionHeading icon={ShoppingCart} title="Sales Order Status" description="Overview of your sales orders" />

              <div className="space-y-4 p-4 sm:p-5">
                <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                  <div>
                    <p className="text-xs text-slate-500">Total Orders</p>
                    <p className="mt-1 text-xl font-bold text-slate-900">{formatNumber(salesOrders.total)}</p>
                  </div>
                  <ShoppingCart size={24} className="text-erp-primary" />
                </div>

                {orderStatusItems.map((item) => (
                  <ProgressItem key={item.label} label={item.label} value={item.value} total={salesOrders.total} color={item.color} />
                ))}

                <div className="border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500">Total Order Value</span>
                    <span className="text-sm font-bold text-slate-900">{formatCurrency(salesOrders.totalOrderValue, currency)}</span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {canSeeInventory && (
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <SectionHeading icon={Boxes} title="Inventory Overview" description="Current stock across your warehouses" />

              <div className="grid grid-cols-2 gap-3 p-4 sm:p-5">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-[11px] text-slate-500">Total Stock</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">{formatNumber(inventory.totalStock)}</p>
                </div>

                <div className="rounded-lg bg-blue-50 p-3">
                  <p className="text-[11px] text-blue-600">Reserved Stock</p>
                  <p className="mt-1 text-lg font-bold text-blue-900">{formatNumber(inventory.reservedStock)}</p>
                </div>

                <div className="rounded-lg bg-emerald-50 p-3">
                  <p className="text-[11px] text-emerald-600">Available Stock</p>
                  <p className="mt-1 text-lg font-bold text-emerald-900">{formatNumber(inventory.availableStock)}</p>
                </div>

                <div className="rounded-lg bg-violet-50 p-3">
                  <p className="text-[11px] text-violet-600">Total Products</p>
                  <p className="mt-1 text-lg font-bold text-violet-900">{formatNumber(inventory.totalProducts)}</p>
                </div>

                <div className="col-span-2 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                      <AlertCircle size={16} />
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-500">Low Stock</p>
                      <p className="text-sm font-bold text-slate-900">{formatNumber(inventory.lowStockProducts)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600">
                      <XCircle size={16} />
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-500">Out of Stock</p>
                      <p className="text-sm font-bold text-slate-900">{formatNumber(inventory.outOfStockProducts)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {/* Finance */}
      {canSeeFinance && (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <SectionHeading icon={Wallet} title="Finance Overview" description="Invoice, payment and outstanding summary" />

          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4 sm:p-5">
            {canSeeInvoices && (
              <>
                <MetricCard label="Total Invoices" value={formatNumber(finance.totalInvoices)} description="All invoices" icon={Receipt} color="text-violet-600" bg="bg-violet-50" />

                <MetricCard
                  label="Outstanding"
                  value={formatCurrency(finance.outstandingAmount, currency)}
                  description={`${formatNumber(finance.partiallyPaidInvoices)} partially paid invoices`}
                  icon={TrendingUp}
                  color="text-amber-600"
                  bg="bg-amber-50"
                />

                <MetricCard label="Overdue Amount" value={formatCurrency(finance.overdueAmount, currency)} description={`${formatNumber(finance.overdueInvoices)} overdue invoices`} icon={TrendingDown} color="text-red-600" bg="bg-red-50" />
              </>
            )}

            {canSeePayments && (
              <MetricCard label="Amount Received" value={formatCurrency(finance.paymentReceivedAmount, currency)} description={`${formatNumber(finance.paymentCount)} payments`} icon={CreditCard} color="text-emerald-600" bg="bg-emerald-50" />
            )}

            <div className={`grid grid-cols-1 gap-3 sm:col-span-2 ${canSeeInvoices && canSeePayments ? 'xl:col-span-4' : 'xl:col-span-2'}`}>
              {canSeeInvoices && (
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-[11px] text-slate-500">Invoice Revenue</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{formatCurrency(finance.totalRevenue, currency)}</p>
                </div>
              )}

              {canSeePayments && (
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-[11px] text-slate-500">Refunded Amount</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{formatCurrency(finance.refundedAmount, currency)}</p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Warehouse */}
      {canSeeWarehouses && (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <SectionHeading icon={Warehouse} title="Warehouse Overview" description="Warehouse availability and status" />

          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3 sm:p-5">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Total Warehouses</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{formatNumber(warehouses.total)}</p>
            </div>

            <div className="rounded-lg bg-emerald-50 p-3">
              <p className="text-xs text-emerald-600">Active Warehouses</p>
              <p className="mt-1 text-xl font-bold text-emerald-900">{formatNumber(warehouses.active)}</p>
            </div>

            <div className="rounded-lg bg-slate-100 p-3">
              <p className="text-xs text-slate-500">Inactive Warehouses</p>
              <p className="mt-1 text-xl font-bold text-slate-800">{formatNumber(warehouses.inactive)}</p>
            </div>
          </div>
        </section>
      )}

      {/* Recent orders and activities */}
      {(canSeeRecentOrders || canSeeRecentActivities) && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {canSeeRecentOrders && (
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <SectionHeading icon={Truck} title="Recent Sales Orders" description="Latest orders received by your company" />

              {recentOrders.length === 0 ? (
                <div className="flex min-h-36 flex-col items-center justify-center p-5 text-center">
                  <ShoppingCart size={27} className="text-slate-300" />
                  <p className="mt-2 text-xs font-semibold text-slate-600">No sales orders found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="px-4 py-3 text-[11px] font-semibold text-slate-500">Order</th>
                        <th className="px-4 py-3 text-[11px] font-semibold text-slate-500">Customer</th>
                        <th className="px-4 py-3 text-[11px] font-semibold text-slate-500">Date</th>
                        <th className="px-4 py-3 text-right text-[11px] font-semibold text-slate-500">Amount</th>
                        <th className="px-4 py-3 text-[11px] font-semibold text-slate-500">Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {recentOrders.map((order) => (
                        <tr key={order._id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70">
                          <td className="px-4 py-3 text-xs font-semibold text-erp-primary">{order.orderNumber || '—'}</td>
                          <td className="max-w-32 truncate px-4 py-3 text-xs font-medium text-slate-700">{order.customerName || '—'}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{formatDate(order.orderDate)}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold text-slate-800">{formatCurrency(order.grandTotal, currency)}</td>
                          <td className="px-4 py-3">
                            <span className={`whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-semibold ${statusStyles[order.status] || 'bg-slate-100 text-slate-600'}`}>{order.status || 'Unknown'}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {canSeeRecentActivities && (
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <SectionHeading icon={Activity} title="Recent Activities" description="Latest company activity records" />

              {recentActivities.length === 0 ? (
                <div className="flex min-h-36 flex-col items-center justify-center p-5 text-center">
                  <Activity size={27} className="text-slate-300" />
                  <p className="mt-2 text-xs font-semibold text-slate-600">No recent activities found</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentActivities.map((activity, index) => {
                    const activityTitle = activity.title || activity.action || activity.module || 'Company Activity'

                    const activityDescription = activity.description || activity.message || activity.details || ''

                    return (
                      <div key={activity._id || index} className="flex items-start gap-3 p-4">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                          <Activity size={15} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-800">{activityTitle}</p>

                          {activityDescription && <p className="mt-1 break-words text-[11px] leading-5 text-slate-500">{activityDescription}</p>}

                          <p className="mt-1 text-[10px] text-slate-400">{formatDate(activity.createdAt || activity.timestamp)}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {/* Company information */}
      {canSeeCompany && (
        <>
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <SectionHeading icon={Building2} title="Company Information" description="Registered company details" />

            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-5">
              {companyInformation.map((item) => {
                const Icon = item.icon

                return (
                  <div key={item.label} className="flex min-w-0 items-start gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                      <Icon size={16} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-slate-500">{item.label}</p>

                      {item.label === 'Website' && item.value ? (
                        <a href={/^https?:\/\//i.test(item.value) ? item.value : `https://${item.value}`} target="_blank" rel="noreferrer" className="mt-1 block break-words text-xs font-semibold text-erp-primary hover:underline">
                          {item.value}
                        </a>
                      ) : (
                        <p className="mt-1 break-words text-xs font-semibold text-slate-800">{item.value || 'Not provided'}</p>
                      )}
                    </div>
                  </div>
                )
              })}

              <div className="flex min-w-0 items-start gap-2.5 sm:col-span-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                  <MapPin size={16} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium text-slate-500">Company Address</p>
                  <p className="mt-1 break-words text-xs font-semibold leading-5 text-slate-800">{fullAddress || 'Address not provided'}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Registration details */}
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <SectionHeading icon={BriefcaseBusiness} title="Business & Registration Details" description="Additional registered company information" />

            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 sm:p-5">
              <DetailItem label="Business Type" value={company?.businessType} />
              <DetailItem label="Business Category" value={company?.businessCategory} />
              <DetailItem label="Currency" value={currency} />
              <DetailItem label="GST Number" value={company?.gstNumber} />
              <DetailItem label="PAN Number" value={company?.panNumber} />
              <DetailItem label="Company ID" value={company?._id || company?.id} />
            </div>
          </section>
        </>
      )}

      {/* No accessible dashboard sections */}
      {!hasBusinessOverview && !hasAnalytics && !canSeeSales && !canSeeInventory && !canSeeFinance && !canSeeWarehouses && !canSeeRecentOrders && !canSeeRecentActivities && !canSeeCompany && (
        <section className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <AlertCircle size={30} className="text-slate-300" />
          <h2 className="mt-3 text-sm font-bold text-slate-800">No Dashboard Sections Available</h2>
          <p className="mt-1 max-w-sm text-xs text-slate-500">You do not currently have permission to view any Dashboard sections. Please contact your Company Admin.</p>
        </section>
      )}

      {/* Last updated */}
      {dashboard?.generatedAt && (
        <div className="flex items-center justify-end gap-1.5 pb-1 text-[10px] text-slate-400">
          <CalendarDays size={12} />
          Last updated: {formatDate(dashboard.generatedAt)}
        </div>
      )}
    </div>
  )
}
