import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Plus, Search, RefreshCw, Eye, Pencil, Users, Phone, Mail, MapPin, Wallet, CreditCard, ChevronLeft, ChevronRight, CircleAlert, UserRound, LoaderCircle } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import Loading from '../Loading/Loading'
import { hasPermission, useAuth } from '../../context/AuthContext'

export default function CompanyCustomers() {
  const navigate = useNavigate()
  const location = useLocation()

  const { permissions } = useAuth()

  const canCreate = hasPermission(permissions, 'customer:create')
  const canView = hasPermission(permissions, 'customer:view')
  const canUpdate = hasPermission(permissions, 'customer:update')
  const canUpdateStatus = hasPermission(permissions, 'customer:update-status')

  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All')
  const [page, setPage] = useState(1)

  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 10,
  })

  const [refreshKey, setRefreshKey] = useState(0)

  const [toast, setToast] = useState(null)
  const [updatingId, setUpdatingId] = useState(null)

  const showToast = (type, message, duration = 3000) => {
    setToast({
      id: Date.now(),
      type,
      message,
      duration,
    })
  }

  const closeToast = () => setToast(null)

  useEffect(() => {
    document.title = 'Customers | MineERP'
  }, [])

  useEffect(() => {
    if (location.state?.message) {
      showToast('success', location.state.message)

      navigate(location.pathname, {
        replace: true,
        state: {},
      })
    }
  }, [location.state, location.pathname, navigate])

  useEffect(() => {
    let cancelled = false

    const fetchCustomers = async () => {
      if (hasLoaded) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      try {
        const response = await axiosInstance.get('/erp/customers', {
          params: {
            search: search.trim(),
            status: status === 'All' ? undefined : status,
            page,
            limit: 10,
          },
        })

        if (cancelled) return

        const data = response.data

        setCustomers(Array.isArray(data.customers) ? data.customers : [])

        setPagination({
          total: data.pagination?.total ?? data.total ?? 0,
          totalPages: data.pagination?.totalPages ?? data.totalPages ?? 1,
          currentPage: data.pagination?.currentPage ?? data.page ?? page,
          limit: data.pagination?.limit ?? 10,
        })

        setHasLoaded(true)
      } catch (error) {
        if (!cancelled) {
          showToast('error', error.response?.data?.message || 'Unable to load customers.', 5000)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    }

    fetchCustomers()

    return () => {
      cancelled = true
    }
  }, [search, status, page, refreshKey])

  const handleStatusChange = async (customer) => {
    if (!canUpdateStatus || updatingId) return

    const nextStatus = customer.status === 'Active' ? 'Inactive' : 'Active'

    setUpdatingId(customer._id)

    try {
      await axiosInstance.patch(`/erp/customers/${customer._id}/status`, { status: nextStatus })

      setCustomers((current) => current.map((item) => (item._id === customer._id ? { ...item, status: nextStatus } : item)))

      showToast('success', `Customer ${nextStatus.toLowerCase()} successfully.`)
    } catch (error) {
      showToast('error', error.response?.data?.message || 'Unable to update customer status.', 5000)
    } finally {
      setUpdatingId(null)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(Number(amount) || 0)
  }

  const handleRefresh = () => {
    setPage(1)
    setRefreshKey((prev) => prev + 1)
  }

  const formatNumber = (value) => {
    return new Intl.NumberFormat('en-IN').format(Number(value) || 0)
  }

  const statCards = [
    {
      title: 'Total Customers',
      value: pagination.total,
      icon: Users,
      color: 'text-erp-primary',
      border: 'border-erp-primary/20',
    },
    {
      title: 'Showing Records',
      value: customers.length,
      icon: UserRound,
      color: 'text-blue-600',
      border: 'border-blue-200',
    },

  ]

  const startRecord = pagination.total === 0 ? 0 : (pagination.currentPage - 1) * pagination.limit + 1

  const endRecord = Math.min(pagination.currentPage * pagination.limit, pagination.total)

  const breadcrumbItems = [{ title: 'Customers', link: null }]

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
            <Loading fullScreen={false} label="Loading customers" description="Fetching customer information..." className="!h-full min-h-[400px]" />
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-4 text-sm">
      {toast && <Toast toast={toast} onClose={closeToast} />}

      {/* Header */}
      <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        <div className="h-1 bg-erp-primary" />

        <div className="flex flex-col justify-between gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-5">
          <div className="min-w-0">
            <BreadCrumb items={breadcrumbItems} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {statCards.map((card) => {
              const Icon = card.icon

              return (
                <div key={card.title} title={card.title} className={`flex h-9 items-center gap-2 whitespace-nowrap rounded-lg border ${card.border} px-3`}>
                  <Icon size={15} className={card.color} />

                  <span className={`hidden text-xs font-medium lg:inline ${card.color}`}>{card.title}</span>

                  <span className="text-sm font-bold text-erp-text">{typeof card.value === 'number' ? formatNumber(card.value) : card.value}</span>
                </div>
              )
            })}

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-erp-border px-3 text-xs font-semibold text-erp-text-secondary transition hover:bg-erp-hover disabled:opacity-60"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>

            {canCreate && (
              <button
                type="button"
                onClick={() => navigate('/company/customers/new')}
                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-erp-primary px-3.5 text-xs font-semibold text-white transition hover:bg-erp-primary-hover focus:outline-none focus:ring-2 focus:ring-erp-primary/30 focus:ring-offset-1"
              >
                <Plus size={15} />
                Add Customer
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Customer Table */}
      <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        {/* Filter Header */}
        <div className="flex flex-col gap-3 border-b border-erp-border p-3 sm:flex-row sm:items-center sm:justify-between ">
          <div className="relative min-w-0 flex-1 sm:max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Search customers..."
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value)
                setPage(1)
              }}
              className="h-10 min-w-32 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10"
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

     

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] border-collapse text-left">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500 border-b border-erp-border">
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Contact Details</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3 text-center">Opening Balance</th>
                <th className="px-4 py-3 text-center">Credit Limit</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                      <CircleAlert size={20} />
                    </div>

                    <p className="mt-3 text-xs font-bold text-slate-700">No customers found</p>

                    <p className="mt-1 text-[11px] text-slate-500">Try changing your search or status filter.</p>

                    {canCreate && (
                      <button type="button" onClick={() => navigate('/company/customers/new')} className="mt-3 text-xs font-bold text-erp-primary hover:underline">
                        Add your first customer
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                customers.map((customer) => {
                  const isActive = customer.status === 'Active'
                  const isUpdating = updatingId === customer._id

                  return (
                    <tr key={customer._id} className={`transition ${isActive ? 'hover:bg-slate-50/70' : 'bg-erp-disabled-surface hover:bg-erp-disabled-light/60'}`}>
                      <td className="px-4 py-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isActive ? 'bg-erp-primary/10 text-erp-primary' : 'bg-erp-disabled-light text-erp-disabled'}`}>
                            <UserRound size={16} />
                          </div>

                          <div className="min-w-0">
                            <p className={`truncate text-xs font-bold ${isActive ? 'text-slate-800' : 'text-erp-disabled-text'}`}>{customer.customerName}</p>

                            <p className="mt-0.5 text-[10px] font-medium text-slate-500">{customer.customerCode}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {customer.contactPerson && <p className={`text-xs font-semibold ${isActive ? 'text-slate-700' : 'text-erp-disabled-text'}`}>{customer.contactPerson}</p>}

                          {customer.phone && (
                            <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
                              <Phone size={11} />
                              {customer.phone}
                            </p>
                          )}

                          {customer.email && (
                            <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
                              <Mail size={11} />
                              {customer.email}
                            </p>
                          )}

                          {!customer.contactPerson && !customer.phone && !customer.email && <span className="text-[11px] text-slate-400">—</span>}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className={`flex items-center gap-1.5 text-xs ${isActive ? 'text-slate-600' : 'text-erp-disabled-text'}`}>
                          <MapPin size={12} className="shrink-0 text-slate-400" />
                          <span>{[customer.city, customer.state].filter(Boolean).join(', ') || '—'}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-semibold tabular-nums  ${isActive ? 'text-slate-700' : 'text-erp-disabled-text'}`}>{formatCurrency(customer.openingBalance)}</span>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-semibold tabular-nums ${isActive ? 'text-slate-700' : 'text-erp-disabled-text'}`}>{formatCurrency(customer.creditLimit)}</span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                            isActive ? 'border-erp-success-border bg-erp-success-light text-erp-success' : 'border-erp-disabled-border bg-erp-disabled-light text-erp-disabled-text'
                          }`}
                        >
                          {customer.status || 'Unknown'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          {canView && (
                            <button
                              type="button"
                              onClick={() => navigate(`/company/customers/${customer._id}`)}
                              title="View customer"
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-erp-primary/30 hover:bg-erp-primary/5 hover:text-erp-primary"
                            >
                              <Eye size={14} />
                            </button>
                          )}

                          {canUpdate && (
                            <button
                              type="button"
                              onClick={() => navigate(`/company/customers/${customer._id}/edit`)}
                              title="Edit customer"
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                            >
                              <Pencil size={14} />
                            </button>
                          )}

                          {canUpdateStatus && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(customer)}
                              disabled={isUpdating || Boolean(updatingId)}
                              title={isActive ? 'Deactivate customer' : 'Activate customer'}
                              className={`inline-flex h-8 min-w-20 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-[10px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                isActive ? 'border-erp-disabled-border bg-erp-disabled-light text-erp-disabled-text hover:bg-erp-disabled-surface' : 'border-erp-success-border bg-erp-success-light text-erp-success hover:bg-erp-success-border'
                              }`}
                            >
                              {isUpdating ? <LoaderCircle size={13} className="animate-spin" /> : isActive ? 'Disable' : 'Enable'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-erp-border px-3 py-3 sm:px-4">
          <p className="text-[11px] text-slate-500">
            Showing{' '}
            <span className="font-bold text-slate-700">
              {startRecord}-{endRecord}
            </span>{' '}
            of <span className="font-bold text-slate-700">{pagination.total}</span> customers
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || refreshing}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={14} />
              Previous
            </button>

            <span className="min-w-14 text-center text-[11px] font-bold text-slate-700">
              {pagination.currentPage} / {pagination.totalPages}
            </span>

            <button
              type="button"
              disabled={page >= pagination.totalPages || refreshing}
              onClick={() => setPage((current) => current + 1)}
              className="flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
