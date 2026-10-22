import { useEffect, useState } from 'react'
import { Building2, Users, Package, ShoppingCart, IndianRupee, RefreshCw, AlertCircle, Mail, Phone, Globe, MapPin, BriefcaseBusiness, CheckCircle2, Clock3, XCircle } from 'lucide-react'
import axiosInstance from '../../api/axiosInstance'

export default function CompanyDashboard() {
  const [company, setCompany] = useState(null)
  const [stats, setStats] = useState({
    products: null,
    orders: null,
    employees: null,
    revenue: null,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchDashboardData = async (activeCheck = () => true) => {
    setLoading(true)
    setError('')

    const results = await Promise.allSettled([axiosInstance.get('/companies/me'), axiosInstance.get('/erp/employees')])

    if (!activeCheck()) return

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
      // Employee count permission may be unavailable for some roles.
      setStats((previous) => ({
        ...previous,
        employees: null,
      }))
    }

    if (activeCheck()) {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true

    fetchDashboardData(() => active)

    return () => {
      active = false
    }
  }, [])

  const handleRetry = () => {
    fetchDashboardData()
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

  if (loading && !company && !error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-erp-primary-light border-t-erp-primary" />
          <p className="text-sm text-slate-500">Loading company dashboard...</p>
        </div>
      </div>
    )
  }

  if (error && !company) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
            <AlertCircle className="h-7 w-7 text-red-600" />
          </div>

          <h2 className="mt-4 text-lg font-bold text-slate-900">Unable to load dashboard</h2>

          <p className="mt-2 text-sm text-slate-500">{error}</p>

          <button
            type="button"
            onClick={handleRetry}
            disabled={loading}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-erp-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-erp-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-erp-primary">Company Workspace</p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Dashboard</h1>

          <p className="mt-2 text-sm text-slate-500">Overview of your company and business activity.</p>
        </div>

        <button
          type="button"
          onClick={handleRetry}
          disabled={loading}
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Error Notice */}
      {error && company && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

          <div>
            <p className="text-sm font-semibold text-amber-800">Company information could not be refreshed</p>
            <p className="mt-1 text-sm text-amber-700">{error}</p>
          </div>
        </div>
      )}

      {/* Welcome Card */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-2 bg-gradient-to-r from-erp-primary via-erp-accent to-violet-300" />

        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-erp-primary-light text-erp-primary">
              <Building2 size={32} />
            </div>

            <div className="min-w-0">
              <p className="text-sm text-slate-500">Welcome to your workspace</p>

              <h2 className="mt-1 break-words text-xl font-bold text-slate-900 sm:text-2xl">{company?.companyName || 'Your Company'}</h2>

              <p className="mt-1 text-sm text-slate-500">{company?.businessType || 'Business type not available'}</p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${currentStatus.className}`}>
              <StatusIcon size={14} />
              {companyStatus}
            </span>

            <p className="text-xs text-slate-500">Company account status</p>
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900">Business Overview</h2>
          <p className="mt-1 text-sm text-slate-500">Your company statistics at a glance.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((stat) => {
            const Icon = stat.icon

            return (
              <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-500">{stat.label}</p>

                    <p className="mt-2 text-2xl font-bold text-slate-900">
                      {loading ? '...' : stat.value === null ? '—' : stat.label === 'Revenue' ? `${company?.currency || 'INR'} ${Number(stat.value).toLocaleString('en-IN')}` : Number(stat.value).toLocaleString('en-IN')}
                    </p>
                  </div>

                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${stat.bg} ${stat.color}`}>
                    <Icon size={22} />
                  </div>
                </div>

                <p className="mt-4 text-xs text-slate-500">{stat.description}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Company Information */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">
            <Building2 size={20} />
          </div>

          <div>
            <h2 className="font-bold text-slate-900">Company Information</h2>
            <p className="mt-1 text-xs text-slate-500">Registered company details</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6">
          {companyInformation.map((item) => {
            const Icon = item.icon

            return (
              <div key={item.label} className="flex min-w-0 gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
                  <Icon size={18} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-500">{item.label}</p>

                  {item.label === 'Website' && item.value ? (
                    <a href={/^https?:\/\//i.test(item.value) ? item.value : `https://${item.value}`} target="_blank" rel="noreferrer" className="mt-1 block break-words text-sm font-semibold text-erp-primary hover:underline">
                      {item.value}
                    </a>
                  ) : (
                    <p className="mt-1 break-words text-sm font-semibold text-slate-800">{item.value || 'Not provided'}</p>
                  )}
                </div>
              </div>
            )
          })}

          <div className="flex min-w-0 gap-3 sm:col-span-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
              <MapPin size={18} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-500">Company Address</p>

              <p className="mt-1 break-words text-sm font-semibold leading-6 text-slate-800">{fullAddress || 'Address not provided'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Registration Details */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
          <h2 className="font-bold text-slate-900">Business & Registration Details</h2>
          <p className="mt-1 text-xs text-slate-500">Additional information registered for your company.</p>
        </div>

        <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 lg:grid-cols-3 sm:p-6">
          <div>
            <p className="text-xs font-medium text-slate-500">Business Type</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">{company?.businessType || 'Not provided'}</p>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500">Business Category</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">{company?.businessCategory || 'Not provided'}</p>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500">Currency</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">{company?.currency || 'INR'}</p>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500">GST Number</p>
            <p className="mt-1 break-words text-sm font-semibold text-slate-800">{company?.gstNumber || 'Not provided'}</p>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500">PAN Number</p>
            <p className="mt-1 break-words text-sm font-semibold text-slate-800">{company?.panNumber || 'Not provided'}</p>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500">Company ID</p>
            <p className="mt-1 break-all font-mono text-xs font-semibold text-slate-700">{company?._id || company?.id || 'Not available'}</p>
          </div>
        </div>
      </section>
    </div>
  )
}
