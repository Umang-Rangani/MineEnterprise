import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, UserRound, Mail, Phone, MapPin, Building2, CreditCard, Wallet, FileText, Hash, LoaderCircle, RefreshCw, CalendarDays } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import Loading from '../Loading/Loading'
import { hasPermission, useAuth } from '../../context/AuthContext'

export default function CustomerDetails() {
  const navigate = useNavigate()
  const { id } = useParams()

  const { permissions } = useAuth()
  const canUpdate = hasPermission(permissions, 'customer:update')

  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [toast, setToast] = useState(null)

  const showToast = (type, message, duration = 3000) => {
    setToast({ id: Date.now(), type, message, duration })
  }

  const closeToast = () => setToast(null)

  useEffect(() => {
    document.title = 'Customer Details | MineERP'
  }, [])

  useEffect(() => {
    let cancelled = false

    const fetchCustomer = async () => {
      if (hasLoaded) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      try {
        const response = await axiosInstance.get(`/erp/customers/${id}`)

        if (cancelled) return

        setCustomer(response.data.customer || response.data)
        setHasLoaded(true)
      } catch (error) {
        if (!cancelled) {
          showToast('error', error.response?.data?.message || 'Unable to load customer details.', 5000)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    }

    fetchCustomer()

    return () => {
      cancelled = true
    }
  }, [id, refreshKey])

  const isInactive = customer?.status === 'Inactive'

  const theme = {
    section: isInactive ? 'border-erp-disabled-border bg-erp-disabled-surface' : 'border-erp-border bg-white',
    sectionHeader: isInactive ? 'border-erp-disabled-border' : 'border-slate-100',
    heading: isInactive ? 'text-erp-disabled-text' : 'text-slate-900',
    text: isInactive ? 'text-erp-disabled-text' : 'text-slate-500',
    icon: isInactive ? 'bg-erp-disabled-light text-erp-disabled' : 'bg-erp-primary/10 text-erp-primary',
    detailIcon: isInactive ? 'text-erp-disabled' : 'text-slate-400',
    detailValue: isInactive ? 'text-erp-disabled-text' : 'text-slate-800',
    card: isInactive ? 'border-erp-disabled-border bg-erp-disabled-surface' : 'border-erp-border bg-white',
    innerCard: isInactive ? 'border-erp-disabled-border bg-erp-disabled-light/60' : 'border-slate-100 bg-white',
    accentIcon: isInactive ? 'text-erp-disabled' : 'text-erp-primary',
    divider: isInactive ? 'border-erp-disabled-border' : 'border-slate-100',
  }

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(Number(amount) || 0)

  const formatDate = (date) => {
    if (!date) return '—'

    const parsedDate = new Date(date)

    if (Number.isNaN(parsedDate.getTime())) return '—'

    return parsedDate.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const items = [
    { title: 'Customers', link: '/company/customers' },
    { title: customer?.customerName || 'Customer Details', link: null },
  ]

  const DetailItem = ({ label, value, icon: Icon }) => (
    <div className="min-w-0">
      <p className={`text-[11px] font-medium ${theme.text}`}>{label}</p>
      <div className="mt-1 flex min-w-0 items-center gap-2">
        {Icon && <Icon size={14} className={`shrink-0 ${theme.detailIcon}`} />}
        <p className={`break-words text-xs font-semibold ${theme.detailValue}`}>{value || '—'}</p>
      </div>
    </div>
  )

  const SectionHeader = ({ icon: Icon, title, description }) => (
    <div className={`flex items-center gap-2 border-b px-3 py-2.5 ${theme.sectionHeader}`}>
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${theme.icon}`}>
        <Icon size={16} />
      </div>
      <div>
        <h2 className={`text-sm font-bold ${theme.heading}`}>{title}</h2>
        <p className={`text-[11px] ${theme.text}`}>{description}</p>
      </div>
    </div>
  )

  const handleRefresh = () => {
    setRefreshKey((current) => current + 1)
  }

  if (loading && !hasLoaded) {
    return (
      <div className="min-w-0 space-y-4 text-sm">
        <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="h-1 bg-erp-primary" />
          <div className="flex min-h-16 items-center px-4 sm:px-5">
            <BreadCrumb items={items} />
          </div>
        </section>

        <section className="relative min-h-[400px] overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex min-h-[400px] items-center justify-center">
            <Loading fullScreen={false} label="Loading customer details" description="Fetching customer information..." className="!h-full min-h-[400px]" />
          </div>
        </section>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="min-w-0 space-y-4 text-sm">
        {toast && <Toast toast={toast} onClose={closeToast} />}

        <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="h-1 bg-erp-primary" />
          <div className="flex min-h-16 items-center px-4 sm:px-5">
            <BreadCrumb items={items} />
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white px-4 py-12 text-center">
          <UserRound size={28} className="mx-auto text-slate-300" />
          <h2 className="mt-3 text-sm font-bold text-slate-800">Customer not found</h2>
          <p className="mt-1 text-xs text-slate-500">Unable to find this customer or you may not have access.</p>

          <div className="mt-4 flex justify-center gap-2">
            <button type="button" onClick={() => navigate('/company/customers')} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              <ArrowLeft size={14} />
              Back to Customers
            </button>

            <button type="button" onClick={handleRefresh} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-erp-primary px-3 text-xs font-semibold text-white hover:bg-erp-primary-hover">
              <RefreshCw size={14} />
              Retry
            </button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-4 text-sm">
      {toast && <Toast toast={toast} onClose={closeToast} />}

      {/* Header */}
      <section className={`h-17 overflow-hidden rounded-xl border shadow-erp-card ${isInactive ? 'border-erp-disabled-border bg-erp-disabled-surface' : 'border-erp-border bg-erp-surface'}`}>
        <div className={`h-1 ${isInactive ? 'bg-erp-disabled' : 'bg-erp-primary'}`} />

        <div className="flex h-[calc(100%-4px)] min-w-0 items-center justify-between gap-3 px-4 sm:px-5">
          <div className="min-w-0 flex-1 overflow-hidden">
            <BreadCrumb items={items} />
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {refreshing && <LoaderCircle size={15} className="animate-spin text-erp-disabled" />}

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh customer"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-erp-disabled-border text-erp-disabled-text transition hover:bg-erp-disabled-light disabled:opacity-50"
            >
              <RefreshCw size={14} />
            </button>

            {canUpdate && (
              <button
                type="button"
                onClick={() => navigate(`/company/customers/${id}/edit`)}
                className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition ${
                  isInactive ? 'border border-erp-disabled-border bg-erp-disabled-light text-erp-disabled-text hover:bg-erp-disabled-surface' : 'bg-erp-primary text-white hover:bg-erp-primary-hover'
                }`}
              >
                <Pencil size={14} />
                Edit Customer
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Customer Overview */}
      <section className={`overflow-hidden rounded-xl border shadow-erp-card ${theme.section}`}>
        <div className={`flex flex-wrap items-center justify-between gap-3 border-b p-4 ${theme.sectionHeader}`}>
          <div className="flex min-w-0 items-center gap-3">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${theme.icon}`}>
              <UserRound size={23} />
            </div>

            <div className="min-w-0">
              <h1 className={`truncate text-base font-bold ${theme.heading}`}>{customer.customerName}</h1>
              <p className={`mt-1 text-xs ${theme.text}`}>Customer Code: {customer.customerCode || '—'}</p>
            </div>
          </div>

          <span className={`rounded-full border px-3 py-1 text-[11px] font-bold ${isInactive ? 'border-erp-disabled-border bg-erp-disabled-light text-erp-disabled-text' : 'border-erp-success-border bg-erp-success-light text-erp-success'}`}>
            {customer.status || 'Unknown'}
          </span>
        </div>

        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <DetailItem label="Contact Person" value={customer.contactPerson} icon={UserRound} />
          <DetailItem label="Phone Number" value={customer.phone} icon={Phone} />
          <DetailItem label="Email Address" value={customer.email} icon={Mail} />
          <DetailItem label="Alternate Phone" value={customer.alternatePhone} icon={Phone} />
        </div>
      </section>

      {/* Financial Summary */}
      <section className="grid gap-3 sm:grid-cols-2">
        <div className={`rounded-xl border p-4 shadow-erp-card ${theme.card}`}>
          <div className="flex items-center justify-between">
            <p className={`text-xs font-medium ${theme.text}`}>Opening Balance</p>
            <Wallet size={18} className={isInactive ? 'text-erp-disabled' : 'text-erp-success'} />
          </div>
          <p className={`mt-2 text-xl font-bold tabular-nums ${theme.heading}`}>{formatCurrency(customer.openingBalance)}</p>
        </div>

        <div className={`rounded-xl border p-4 shadow-erp-card ${theme.card}`}>
          <div className="flex items-center justify-between">
            <p className={`text-xs font-medium ${theme.text}`}>Credit Limit</p>
            <CreditCard size={18} className={isInactive ? 'text-erp-disabled' : 'text-erp-primary'} />
          </div>
          <p className={`mt-2 text-xl font-bold tabular-nums ${theme.heading}`}>{formatCurrency(customer.creditLimit)}</p>
        </div>
      </section>

      {/* Tax Information */}
      <section className={`overflow-hidden rounded-xl border ${theme.section}`}>
        <SectionHeader icon={FileText} title="Tax Information" description="GST and PAN details" />
        <div className="grid gap-4 p-3 sm:grid-cols-2 lg:grid-cols-4">
          <DetailItem label="GST Number" value={customer.gstNumber} icon={Hash} />
          <DetailItem label="PAN Number" value={customer.panNumber} icon={Hash} />
        </div>
      </section>

      {/* Address Information */}
      <section className={`overflow-hidden rounded-xl border ${theme.section}`}>
        <SectionHeader icon={MapPin} title="Address Information" description="Billing and shipping addresses" />

        <div className="grid gap-4 p-3 lg:grid-cols-2">
          <div className={`rounded-lg border p-3 ${theme.innerCard}`}>
            <div className="mb-2 flex items-center gap-2">
              <Building2 size={14} className={theme.accentIcon} />
              <h3 className={`text-xs font-bold ${theme.heading}`}>Billing Address</h3>
            </div>
            <p className={`whitespace-pre-wrap text-xs leading-5 ${theme.text}`}>{customer.billingAddress || '—'}</p>
          </div>

          <div className={`rounded-lg border p-3 ${theme.innerCard}`}>
            <div className="mb-2 flex items-center gap-2">
              <MapPin size={14} className={theme.accentIcon} />
              <h3 className={`text-xs font-bold ${theme.heading}`}>Shipping Address</h3>
            </div>
            <p className={`whitespace-pre-wrap text-xs leading-5 ${theme.text}`}>{customer.shippingAddress || '—'}</p>
          </div>
        </div>

        <div className={`grid gap-4 border-t p-3 sm:grid-cols-2 lg:grid-cols-4 ${theme.divider}`}>
          <DetailItem label="City" value={customer.city} icon={MapPin} />
          <DetailItem label="State" value={customer.state} icon={MapPin} />
          <DetailItem label="Pincode" value={customer.pincode} icon={Hash} />
          <DetailItem label="Country" value={customer.country} icon={MapPin} />
        </div>
      </section>

      {/* Payment Information */}
      <section className={`overflow-hidden rounded-xl border ${theme.section}`}>
        <SectionHeader icon={CreditCard} title="Payment Information" description="Customer payment terms" />
        <div className="grid gap-4 p-3 sm:grid-cols-2 lg:grid-cols-3">
          <DetailItem label="Payment Terms" value={customer.paymentTerms} icon={CreditCard} />
          <DetailItem label="Opening Balance" value={formatCurrency(customer.openingBalance)} icon={Wallet} />
          <DetailItem label="Credit Limit" value={formatCurrency(customer.creditLimit)} icon={CreditCard} />
        </div>
      </section>

      {/* Notes */}
      <section className={`overflow-hidden rounded-xl border ${theme.section}`}>
        <SectionHeader icon={FileText} title="Additional Notes" description="Other customer information" />
        <div className="p-3">
          <p className={`whitespace-pre-wrap text-xs leading-5 ${theme.text}`}>{customer.notes || 'No additional notes.'}</p>
        </div>
      </section>

      {/* Record Information */}
      <section className={`overflow-hidden rounded-xl border ${theme.section}`}>
        <SectionHeader icon={CalendarDays} title="Record Information" description="Customer record timestamps" />
        <div className="grid gap-4 p-3 sm:grid-cols-2">
          <DetailItem label="Created At" value={formatDate(customer.createdAt)} icon={CalendarDays} />
          <DetailItem label="Last Updated" value={formatDate(customer.updatedAt)} icon={CalendarDays} />
        </div>
      </section>

      <div className="flex justify-end">
        <button type="button" onClick={() => navigate('/company/customers')} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
          <ArrowLeft size={14} />
          Back to Customers
        </button>
      </div>
    </div>
  )
}
