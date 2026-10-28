import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Truck, Tag, RefreshCw, Pencil, CheckCircle2, FileText, CalendarDays, Clock, AlertCircle, Ban, MapPin, Phone, UserRound, Building2, Hash, MapPinned, Mail, IndianRupee, CreditCard, ShieldCheck, ReceiptText } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import Loading from '../Loading/Loading'
import { hasPermission, useAuth } from '../../context/AuthContext'

const buttonBase = 'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50'

function formatDate(date) {
  if (!date) return 'Not available'

  const parsedDate = new Date(date)

  if (Number.isNaN(parsedDate.getTime())) return 'Not available'

  return parsedDate.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatAmount(value) {
  if (value === '' || value === null || value === undefined) {
    return '₹ 0.00'
  }

  const amount = Number(value)

  if (!Number.isFinite(amount)) return 'Not available'

  return `₹ ${new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`
}

function DetailItem({ label, value, icon: Icon, inactive }) {
  const displayValue = value === null || value === undefined || value === '' ? 'Not provided' : value

  return (
    <div className={`min-w-0 rounded-lg border p-3 ${inactive ? 'border-erp-disabled-border bg-erp-disabled-light/50' : 'border-erp-border bg-erp-surface'}`}>
      <p className={`mb-2 flex items-center gap-2 text-xs ${inactive ? 'text-erp-disabled-text' : 'text-erp-text-secondary'}`}>
        {Icon && <Icon size={14} className="shrink-0" />}
        {label}
      </p>

      <p className={`break-words text-sm font-semibold ${inactive ? 'text-erp-disabled-text' : 'text-erp-text'}`}>{displayValue}</p>
    </div>
  )
}

function SectionHeader({ icon: Icon, title, description, inactive }) {
  return (
    <div className="mb-4 flex min-w-0 items-center gap-3">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${inactive ? 'bg-erp-disabled-light text-erp-disabled' : 'bg-erp-primary-light text-erp-primary'}`}>
        <Icon size={19} />
      </div>

      <div className="min-w-0">
        <h2 className={`text-sm font-bold ${inactive ? 'text-erp-disabled-text' : 'text-erp-text'}`}>{title}</h2>

        <p className={`mt-0.5 text-xs ${inactive ? 'text-erp-disabled-text' : 'text-erp-text-secondary'}`}>{description}</p>
      </div>
    </div>
  )
}

function getSupplierFromResponse(response) {
  const body = response?.data

  const candidates = [body?.data?.supplier, body?.data, body?.supplier, body]

  return candidates.find((item) => item && typeof item === 'object' && !Array.isArray(item) && (item._id || item.id))
}

export default function SupplierDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { permissions } = useAuth()
  const location = useLocation()

  const canView = hasPermission(permissions, 'supplier:view')
  const canUpdate = hasPermission(permissions, 'supplier:update')
  const canUpdateStatus = hasPermission(permissions, 'supplier:update-status')

  const [supplier, setSupplier] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)

  const isInactive =
    String(supplier?.status ?? '')
      .trim()
      .toLowerCase() === 'inactive'

  const canEdit = canUpdate && (!isInactive || canUpdateStatus)

  const panelClass = isInactive ? 'border-erp-disabled-border bg-erp-disabled-surface' : 'border-erp-border bg-erp-surface'

  const iconBoxClass = isInactive ? 'bg-erp-disabled-light text-erp-disabled' : 'bg-erp-primary-light text-erp-primary'

  const headingTextClass = isInactive ? 'text-erp-disabled-text' : 'text-erp-text'

  const secondaryTextClass = isInactive ? 'text-erp-disabled-text' : 'text-erp-text-secondary'

  function showToast(type, message) {
    setToast({ type, message })
  }

  function closeToast() {
    setToast(null)
  }

  async function fetchSupplier(showRefreshMessage = false) {
    if (!id) {
      setSupplier(null)
      setError('Supplier ID is missing.')
      setLoading(false)
      setRefreshing(false)
      return
    }

    setLoading(true)
    setRefreshing(showRefreshMessage)
    setError('')

    try {
      const response = await axiosInstance.get(`/erp/suppliers/${encodeURIComponent(id)}`)

      const data = getSupplierFromResponse(response)

      if (!data) {
        throw new Error('Supplier data was not found in the API response.')
      }

      setSupplier(data)

      if (showRefreshMessage) {
        showToast('success', 'Supplier details refreshed successfully.')
      }
    } catch (err) {
      setSupplier(null)
      setError(err.response?.data?.message || err.message || 'Unable to load supplier details.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    document.title = 'Supplier Details | MineERP'
    fetchSupplier()
  }, [id])

  useEffect(() => {
    const successMessage = location.state?.successMessage

    if (successMessage) {
      showToast('success', successMessage)

      // Message ફરીથી દેખાય નહીં તે માટે route state clear કરો
      navigate(location.pathname, {
        replace: true,
        state: null,
      })
    }
  }, [location.pathname, location.state, navigate])

  function handleEdit() {
    if (!supplier || !canEdit) return

    navigate(`/company/suppliers/${encodeURIComponent(supplier._id || supplier.id)}/edit`)
  }

  const breadcrumbItems = [
    { title: 'Suppliers', link: '/company/suppliers' },
    { title: supplier?.supplierName || 'Supplier Details', link: null },
  ]

  const fullAddress = [supplier?.address, supplier?.city, supplier?.state, supplier?.pincode, supplier?.country].filter(Boolean).join(', ')

  if (!canView) {
    return (
      <div className="min-w-0 rounded-xl border border-erp-border bg-erp-surface p-6 text-center">
        <h2 className="text-base font-semibold text-erp-text">Access Denied</h2>

        <p className="mt-2 text-sm text-erp-text-secondary">You do not have permission to view supplier details.</p>

        <button type="button" onClick={() => navigate('/company/suppliers', { replace: true })} className={`${buttonBase} mt-4 bg-erp-primary text-white hover:bg-erp-primary-hover`}>
          Back to Suppliers
        </button>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-4 text-erp-text">
      {toast && <Toast toast={toast} onClose={closeToast} />}

      {/* Header */}
      <section className={`overflow-hidden rounded-xl border shadow-erp-card ${panelClass} h-17`}>
        <div className={`h-1 ${isInactive ? 'bg-erp-disabled' : 'bg-erp-primary'}`} />

        <div className="flex min-w-0 flex-col gap-3 px-4 py-3 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1 overflow-hidden">
            <BreadCrumb items={breadcrumbItems} />
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold ${isInactive ? 'bg-erp-disabled-light text-erp-disabled-text' : 'bg-erp-primary-light text-erp-primary-dark'}`}>
              {isInactive ? <Ban size={13} /> : <Truck size={13} />}
              Supplier Details
            </span>

            <button
              type="button"
              onClick={() => fetchSupplier(true)}
              disabled={loading || refreshing}
              className={`${buttonBase} border ${isInactive ? 'border-erp-disabled-border bg-erp-disabled-light text-erp-disabled-text hover:bg-erp-disabled-border/40' : 'border-erp-border bg-erp-surface hover:bg-erp-hover'}`}
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>

            {canEdit && (
              <button
                type="button"
                onClick={handleEdit}
                disabled={loading || refreshing || !supplier}
                title={isInactive ? 'Activate the supplier before editing.' : 'Edit supplier'}
                className={`${buttonBase} bg-erp-primary text-white hover:bg-erp-primary-hover`}
              >
                <Pencil size={14} />
                Edit
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Loading */}
      {loading && <Loading label="Loading supplier details..." description="Fetching supplier information from MineERP..." />}

      {/* Error */}
      {!loading && error && (
        <section className="rounded-xl border border-erp-danger-border bg-erp-danger-light p-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-erp-danger" />

            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-erp-danger">Unable to load supplier</h2>

              <p className="mt-1 break-words text-sm text-erp-text">{error}</p>

              <button type="button" onClick={() => fetchSupplier()} disabled={loading || refreshing} className={`${buttonBase} mt-3 border border-erp-danger-border bg-white text-erp-danger hover:bg-erp-danger-light`}>
                <RefreshCw size={14} />
                Try Again
              </button>

              <button type="button" onClick={() => navigate('/company/suppliers', { replace: true })} className={`${buttonBase} mt-3 ml-2 border border-erp-border bg-erp-surface hover:bg-erp-hover`}>
                Back to Suppliers
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Supplier Details */}
      {!loading && !error && supplier && (
        <>
          {isInactive && (
            <div className="flex items-start gap-3 rounded-xl border border-erp-disabled-border bg-erp-disabled-light p-4">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-erp-disabled-border/50 text-erp-disabled-text">
                <Ban size={18} />
              </div>

              <div className="min-w-0">
                <h2 className="text-sm font-bold text-erp-disabled-text">This supplier is inactive</h2>

                <p className="mt-1 text-xs leading-5 text-erp-disabled-text">This supplier is currently inactive. Activate the supplier before editing its details.</p>
              </div>
            </div>
          )}

          <div className="grid min-w-0 grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
            {/* Supplier Information */}
            <section className={`min-w-0 rounded-xl border p-4 shadow-erp-card sm:p-5 ${panelClass}`}>
              <SectionHeader icon={Truck} title="Supplier Information" description="Basic supplier details and identification" inactive={isInactive} />

              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                <DetailItem label="Supplier Name" value={supplier.supplierName} icon={Building2} inactive={isInactive} />

                <DetailItem label="Supplier Code" value={supplier.supplierCode} icon={Hash} inactive={isInactive} />

                <div className="sm:col-span-2">
                  <DetailItem label="Contact Person" value={supplier.contactPerson} icon={UserRound} inactive={isInactive} />
                </div>
              </div>

              <div className={`mt-4 flex items-start gap-2 rounded-lg p-3 ${isInactive ? 'bg-erp-disabled-light' : 'bg-erp-surface-secondary/60'}`}>
                <Truck size={15} className={`mt-0.5 shrink-0 ${isInactive ? 'text-erp-disabled' : 'text-erp-text-muted'}`} />

                <p className={`text-xs leading-5 ${secondaryTextClass}`}>Supplier information is loaded from your company's supplier records.</p>
              </div>
            </section>

            {/* Contact Details */}
            <section className={`min-w-0 rounded-xl border p-4 shadow-erp-card sm:p-5 ${panelClass}`}>
              <SectionHeader icon={Phone} title="Contact Details" description="Supplier contact and communication information" inactive={isInactive} />

              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                <DetailItem label="Email Address" value={supplier.email} icon={Mail} inactive={isInactive} />

                <DetailItem label="Phone Number" value={supplier.phone} icon={Phone} inactive={isInactive} />

                <DetailItem label="Alternate Phone" value={supplier.alternatePhone} icon={Phone} inactive={isInactive} />

                <DetailItem label="Contact Person" value={supplier.contactPerson} icon={UserRound} inactive={isInactive} />
              </div>

              <div className={`mt-4 flex items-start gap-2 rounded-lg p-3 ${isInactive ? 'bg-erp-disabled-light' : 'bg-erp-surface-secondary/60'}`}>
                <AlertCircle size={15} className={`mt-0.5 shrink-0 ${isInactive ? 'text-erp-disabled' : 'text-erp-text-muted'}`} />

                <p className={`text-xs leading-5 ${secondaryTextClass}`}>Contact information helps your company communicate with the supplier regarding purchases and payments.</p>
              </div>
            </section>

            {/* Tax Information */}
            <section className={`min-w-0 rounded-xl border p-4 shadow-erp-card sm:p-5 ${panelClass}`}>
              <SectionHeader icon={ReceiptText} title="Tax Information" description="GST and PAN identification details" inactive={isInactive} />

              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                <DetailItem label="GST Number" value={supplier.gstNumber} icon={ReceiptText} inactive={isInactive} />

                <DetailItem label="PAN Number" value={supplier.panNumber} icon={ShieldCheck} inactive={isInactive} />
              </div>

              <div className={`mt-4 flex items-start gap-2 rounded-lg p-3 ${isInactive ? 'bg-erp-disabled-light' : 'bg-erp-surface-secondary/60'}`}>
                <AlertCircle size={15} className={`mt-0.5 shrink-0 ${isInactive ? 'text-erp-disabled' : 'text-erp-text-muted'}`} />

                <p className={`text-xs leading-5 ${secondaryTextClass}`}>Tax details are displayed as saved in the supplier record. Verify registration details separately before using them for tax compliance.</p>
              </div>
            </section>

            {/* Address Details */}
            <section className={`min-w-0 rounded-xl border p-4 shadow-erp-card sm:p-5 ${panelClass}`}>
              <SectionHeader icon={MapPinned} title="Address Details" description="Supplier's registered or business address" inactive={isInactive} />

              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <DetailItem label="Full Address" value={fullAddress} icon={MapPin} inactive={isInactive} />
                </div>

                <DetailItem label="City" value={supplier.city} icon={Building2} inactive={isInactive} />

                <DetailItem label="State" value={supplier.state} icon={MapPinned} inactive={isInactive} />

                <DetailItem label="Pincode" value={supplier.pincode} icon={Hash} inactive={isInactive} />

                <DetailItem label="Country" value={supplier.country} icon={MapPin} inactive={isInactive} />
              </div>
            </section>

            {/* Payment Information */}
            <section className={`min-w-0 rounded-xl border p-4 shadow-erp-card sm:p-5 ${panelClass}`}>
              <SectionHeader icon={CreditCard} title="Payment Information" description="Supplier payment terms and opening balance" inactive={isInactive} />

              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                <DetailItem label="Payment Terms" value={supplier.paymentTerms} icon={CreditCard} inactive={isInactive} />

                <DetailItem label="Opening Balance" value={formatAmount(supplier.openingBalance)} icon={IndianRupee} inactive={isInactive} />
              </div>

              <div className={`mt-4 flex items-start gap-2 rounded-lg p-3 ${isInactive ? 'bg-erp-disabled-light' : 'bg-erp-surface-secondary/60'}`}>
                <AlertCircle size={15} className={`mt-0.5 shrink-0 ${isInactive ? 'text-erp-disabled' : 'text-erp-text-muted'}`} />

                <p className={`text-xs leading-5 ${secondaryTextClass}`}>Opening balance is shown for reference. Your current edit endpoint does not update this value.</p>
              </div>
            </section>

            {/* Additional Information */}
            <section className={`min-w-0 rounded-xl border p-4 shadow-erp-card sm:p-5 ${panelClass}`}>
              <SectionHeader icon={FileText} title="Additional Information" description="Notes and other supplier information" inactive={isInactive} />

              <div className="grid min-w-0 grid-cols-1 gap-3">
                <DetailItem label="Notes" value={supplier.notes} icon={FileText} inactive={isInactive} />
              </div>

              <div className={`mt-4 flex items-start gap-2 rounded-lg p-3 ${isInactive ? 'bg-erp-disabled-light' : 'bg-erp-surface-secondary/60'}`}>
                <FileText size={15} className={`mt-0.5 shrink-0 ${isInactive ? 'text-erp-disabled' : 'text-erp-text-muted'}`} />

                <p className={`text-xs leading-5 ${secondaryTextClass}`}>Additional notes help your team maintain useful supplier information.</p>
              </div>
            </section>

            {/* Supplier Activity */}
            <section className={`min-w-0 rounded-xl border p-4 shadow-erp-card sm:p-5 lg:col-span-2 ${panelClass}`}>
              <SectionHeader icon={CalendarDays} title="Supplier Activity" description="Creation, modification and current status" inactive={isInactive} />

              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className={`flex min-w-0 items-start gap-3 rounded-lg border p-3 ${isInactive ? 'border-erp-disabled-border bg-erp-disabled-light/50' : 'border-erp-border'}`}>
                  <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${iconBoxClass}`}>
                    <CalendarDays size={16} />
                  </div>

                  <div className="min-w-0">
                    <p className={`text-xs font-medium ${secondaryTextClass}`}>Created On</p>

                    <p className={`mt-1 break-words text-sm font-semibold ${headingTextClass}`}>{formatDate(supplier.createdAt)}</p>
                  </div>
                </div>

                <div className={`flex min-w-0 items-start gap-3 rounded-lg border p-3 ${isInactive ? 'border-erp-disabled-border bg-erp-disabled-light/50' : 'border-erp-border'}`}>
                  <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${iconBoxClass}`}>
                    <Clock size={16} />
                  </div>

                  <div className="min-w-0">
                    <p className={`text-xs font-medium ${secondaryTextClass}`}>Last Updated</p>

                    <p className={`mt-1 break-words text-sm font-semibold ${headingTextClass}`}>{formatDate(supplier.updatedAt)}</p>
                  </div>
                </div>

                <div className={`flex min-w-0 items-center justify-between gap-3 rounded-lg border p-3 ${isInactive ? 'border-erp-disabled-border bg-erp-disabled-light/50' : 'border-erp-border bg-erp-surface'}`}>
                  <p className={`flex items-center gap-2 text-xs ${secondaryTextClass}`}>
                    <CheckCircle2 size={14} />
                    Current Status
                  </p>

                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${isInactive ? 'border border-erp-disabled-border bg-erp-disabled-light text-erp-disabled-text' : 'bg-emerald-50 text-emerald-700'}`}>
                    {isInactive ? <Ban size={12} /> : <span className="size-1.5 rounded-full bg-emerald-500" />}
                    {supplier.status || 'Not specified'}
                  </span>
                </div>
              </div>

              <div className={`mt-3 flex items-start gap-2 rounded-lg px-3 py-2.5 ${isInactive ? 'bg-erp-disabled-light' : 'bg-erp-surface-secondary/60'}`}>
                <AlertCircle size={15} className={`mt-0.5 shrink-0 ${isInactive ? 'text-erp-disabled' : 'text-erp-text-muted'}`} />

                <p className={`text-xs leading-5 ${secondaryTextClass}`}>Supplier details are loaded from the MineERP backend and scoped to your company.</p>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  )
}
