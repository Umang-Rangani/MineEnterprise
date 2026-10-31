import { useEffect, useState } from 'react'
import { Building2, Users, Package, ShoppingCart, IndianRupee, RefreshCw, AlertCircle, Mail, Phone, Globe, MapPin, BriefcaseBusiness, CheckCircle2, Clock3, XCircle } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Loading from '../Loading/Loading'

export default function CompanyDashboard() {
  const [company, setCompany] = useState(null)

  const [stats, setStats] = useState({
    products: null,
    orders: null,
    employees: null,
    revenue: null,
  })

  const [loading, setLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const items = [{ title: 'Dashboard', link: null }]

  useEffect(() => {
    let cancelled = false

    const fetchDashboardData = async () => {
      setLoading(true)
      setError('')

      try {
        const results = await Promise.allSettled([axiosInstance.get('/companies/me'), axiosInstance.get('/erp/employees')])

        if (cancelled) return

        const [companyResult, employeesResult] = results

        if (companyResult.status === 'fulfilled' && companyResult.value.data?.success) {
          setCompany(companyResult.value.data.company)
        } else {
          const message = companyResult.status === 'rejected' ? companyResult.reason?.response?.data?.message : null

          setError(message || 'Unable to load company details.')
        }

        if (employeesResult.status === 'fulfilled' && employeesResult.value.data?.success) {
          const employeeData = employeesResult.value.data

          setStats((previous) => ({
            ...previous,
            employees: typeof employeeData.count === 'number' ? employeeData.count : Array.isArray(employeeData.employees) ? employeeData.employees.length : 0,
          }))
        } else {
          setStats((previous) => ({
            ...previous,
            employees: null,
          }))
        }
      } catch {
        if (!cancelled) {
          setError('Unable to load dashboard data.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
          setHasLoaded(true)
        }
      }
    }

    fetchDashboardData()

    return () => {
      cancelled = true
    }
  }, [refreshKey])

  const handleRefresh = () => {
    if (loading) return

    setLoading(true)
    setHasLoaded(false)
    setRefreshKey((key) => key + 1)
  }

  const statCards = [
    {
      label: 'Total Products',
      value: stats.products,
      icon: Package,
      description: 'Products in your company',
      color: 'text-violet-600',
      bg: 'bg-violet-50',
    },
    {
      label: 'Total Orders',
      value: stats.orders,
      icon: ShoppingCart,
      description: 'Orders received',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Employees',
      value: stats.employees,
      icon: Users,
      description: 'Company team members',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Revenue',
      value: stats.revenue,
      icon: IndianRupee,
      description: 'Total company revenue',
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
  ]

  const companyStatus = company?.status || 'Unknown'

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

  const companyInformation = [
    {
      label: 'Company Email',
      value: company?.companyEmail,
      icon: Mail,
    },
    {
      label: 'Company Phone',
      value: company?.companyPhone,
      icon: Phone,
    },
    {
      label: 'Business Category',
      value: company?.businessCategory,
      icon: BriefcaseBusiness,
    },
    {
      label: 'Website',
      value: company?.website,
      icon: Globe,
    },
  ]

  const fullAddress = [company?.addressLine1, company?.addressLine2, company?.city, company?.state, company?.postalCode, company?.country].filter(Boolean).join(', ')

  // Full page loading
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

  // Error screen
  if (error && !company) {
    return (
      <div className="min-w-0 space-y-4 text-sm">
        <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="h-1 bg-erp-primary" />

          <div className="flex min-h-16 items-center px-4 sm:px-5">
            <BreadCrumb items={items} />
          </div>
        </section>

        <section className="flex min-h-[400px] items-center justify-center rounded-xl border border-erp-border bg-erp-surface p-6 shadow-erp-card">
          <div className="w-full max-w-sm rounded-xl border border-red-100 bg-white p-6 text-center shadow-sm">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-red-50">
              <AlertCircle size={22} className="text-red-600" />
            </div>

            <h2 className="mt-3 text-base font-bold text-slate-900">Unable to load dashboard</h2>

            <p className="mt-2 text-xs text-slate-500">{error}</p>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-erp-primary px-4 py-2 text-xs font-semibold text-white transition hover:bg-erp-primary-hover disabled:opacity-60"
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
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-erp-border bg-erp-surface px-3 text-xs font-semibold text-slate-600 transition hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </section>

      {/* Error notice */}
      {error && company && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-600" />

          <div>
            <p className="text-xs font-semibold text-amber-800">Company information could not be refreshed</p>

            <p className="mt-1 text-xs text-amber-700">{error}</p>
          </div>
        </div>
      )}

      {/* Statistics */}
      <section >
        {/* Company welcome card */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm mb-3" >

          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">
                <Building2 size={24} />
              </div>

              <div className="min-w-0">
                <p className="text-xs text-slate-500">Welcome to your workspace</p>

                <h2 className="mt-1 break-words text-lg font-bold text-slate-900">{company?.companyName || 'Your Company'}</h2>

                <p className="mt-1 text-xs text-slate-500">{company?.businessType || 'Business type not available'}</p>
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
        </div>



        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((stat) => {
            const Icon = stat.icon

            return (
              <div key={stat.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-500">{stat.label}</p>

                    <p className="mt-2 text-xl font-bold text-slate-900">
                      {stat.value === null ? '—' : stat.label === 'Revenue' ? `${company?.currency || 'INR'} ${Number(stat.value).toLocaleString('en-IN')}` : Number(stat.value).toLocaleString('en-IN')}
                    </p>
                  </div>

                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${stat.bg} ${stat.color}`}>
                    <Icon size={19} />
                  </div>
                </div>

                <p className="mt-3 text-[11px] text-slate-500">{stat.description}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Company information */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-erp-primary-light text-erp-primary">
            <Building2 size={18} />
          </div>

          <div>
            <h2 className="text-sm font-bold text-slate-900">Company Information</h2>

            <p className="mt-0.5 text-[11px] text-slate-500">Registered company details</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
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
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3.5">
          <h2 className="text-sm font-bold text-slate-900">Business & Registration Details</h2>

          <p className="mt-0.5 text-[11px] text-slate-500">Additional registered company information.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              label: 'Business Type',
              value: company?.businessType,
            },
            {
              label: 'Business Category',
              value: company?.businessCategory,
            },
            {
              label: 'Currency',
              value: company?.currency || 'INR',
            },
            {
              label: 'GST Number',
              value: company?.gstNumber,
            },
            {
              label: 'PAN Number',
              value: company?.panNumber,
            },
            {
              label: 'Company ID',
              value: company?._id || company?.id,
              mono: true,
            },
          ].map((item) => (
            <div key={item.label} className="min-w-0">
              <p className="text-[11px] font-medium text-slate-500">{item.label}</p>

              <p className={`mt-1 break-words text-xs font-semibold text-slate-800 ${item.mono ? 'font-mono' : ''}`}>{item.value || 'Not provided'}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
