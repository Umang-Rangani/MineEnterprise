import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Warehouse, Tag, RefreshCw, Pencil, Trash2, CheckCircle2, FileText, CalendarDays, Clock, AlertCircle, Ban, MapPin, Phone, UserRound, Boxes, Building2, Hash, MapPinned, Users } from 'lucide-react'

  import axiosInstance from '../../api/axiosInstance'
  import BreadCrumb from '../../BreadCrumb/BreadCrumb'
  import Toast from '../../Toast/Toast'
  import Loading from '../Loading/Loading'
  import TrashBox from '../../TrashBox/TrashBox'
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

function formatQuantity(value) {
  if (value === '' || value === null || value === undefined) {
    return 'Not provided'
  }

  const quantity = Number(value)

  if (!Number.isFinite(quantity)) return 'Not provided'

  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
  }).format(quantity)
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

function getWarehouseFromResponse(response) {
  const body = response?.data

  // Supports common Express response formats:
  // { data: warehouse }, { warehouse: warehouse }, or direct warehouse object.
  const candidates = [body?.data?.warehouse, body?.data, body?.warehouse, body]

  return candidates.find((item) => item && typeof item === 'object' && !Array.isArray(item) && (item._id || item.id))
}

export default function WarehousesDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { permissions } = useAuth()

  const canView = hasPermission(permissions, 'warehouse:view')
  const canUpdate = hasPermission(permissions, 'warehouse:update')
  const canUpdateStatus = hasPermission(permissions, 'warehouse:update-status')
  const canDelete = hasPermission(permissions, 'warehouse:delete')

  const [warehouse, setWarehouse] = useState(null)

  const [stockSummary, setStockSummary] = useState(null)
  const [stockLoading, setStockLoading] = useState(false)
  const [stockError, setStockError] = useState('')

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const isInactive =
    String(warehouse?.status ?? '')
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

  async function fetchWarehouse(showRefreshMessage = false) {
    if (!id) {
      setWarehouse(null)
      setError('Warehouse ID is missing.')
      setLoading(false)
      setRefreshing(false)
      return
    }

    setLoading(true)
    setRefreshing(showRefreshMessage)
    setError('')

    try {
      const response = await axiosInstance.get(`/erp/warehouses/${encodeURIComponent(id)}`)

      const data = getWarehouseFromResponse(response)

      if (!data) {
        throw new Error('Warehouse data was not found in the API response.')
      }

      setWarehouse(data)
      await fetchStockSummary(data._id || data.id)

      if (showRefreshMessage) {
        showToast('success', 'Warehouse details refreshed successfully.')
      }
    } catch (err) {
      setWarehouse(null)

      setError(err.response?.data?.message || err.message || 'Unable to load warehouse details.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function fetchStockSummary(warehouseId) {
    if (!warehouseId) return

    setStockLoading(true)
    setStockError('')

    try {
      const response = await axiosInstance.get(`/erp/warehouses/${encodeURIComponent(warehouseId)}/stock-summary`)

      setStockSummary(response.data?.data || null)
    } catch (err) {
      setStockSummary(null)
      setStockError(err.response?.data?.message || 'Unable to load warehouse stock summary.')
    } finally {
      setStockLoading(false)
    }
  }

  useEffect(() => {
    document.title = 'Warehouse Details | MineERP'
    fetchWarehouse()
  }, [id])

  function handleEdit() {
    if (!warehouse || !canEdit) return

    navigate(`/company/warehouses/${encodeURIComponent(warehouse._id || warehouse.id)}/edit`)
  }

  async function handleDelete() {
    if (!warehouse || deleting || !canDelete) return

    const warehouseId = warehouse._id || warehouse.id

    if (!warehouseId) {
      showToast('error', 'Warehouse ID is missing.')
      return
    }

    setDeleting(true)

    try {
      await axiosInstance.delete(`/erp/warehouses/${encodeURIComponent(warehouseId)}`)

      setShowDeleteModal(false)

      navigate('/company/warehouses', {
        replace: true,
        state: {
          successMessage: 'Warehouse deleted successfully.',
        },
      })
    } catch (err) {
      setShowDeleteModal(false)

      showToast('error', err.response?.data?.message || err.message || 'Unable to delete warehouse.')
    } finally {
      setDeleting(false)
    }
  }

  const breadcrumbItems = [
    { title: 'Warehouses', link: '/company/warehouses' },
    { title: warehouse?.name || 'Warehouse Details', link: null },
  ]

  const fullAddress = [warehouse?.address, warehouse?.city, warehouse?.state, warehouse?.pincode].filter(Boolean).join(', ')

  if (!canView) {
    return (
      <div className="min-w-0 rounded-xl border border-erp-border bg-erp-surface p-6 text-center">
        <h2 className="text-base font-semibold text-erp-text">Access Denied</h2>

        <p className="mt-2 text-sm text-erp-text-secondary">You do not have permission to view warehouse details.</p>

        <button type="button" onClick={() => navigate('/company/warehouses', { replace: true })} className={`${buttonBase} mt-4 bg-erp-primary text-white hover:bg-erp-primary-hover`}>
          Back to Warehouses
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
              {isInactive ? <Ban size={13} /> : <Warehouse size={13} />}
              Warehouse Details
            </span>

            <button
              type="button"
              onClick={() => fetchWarehouse(true)}
              disabled={loading || refreshing || deleting}
              className={`${buttonBase} border ${isInactive ? 'border-erp-disabled-border bg-erp-disabled-light text-erp-disabled-text hover:bg-erp-disabled-border/40' : 'border-erp-border bg-erp-surface hover:bg-erp-hover'}`}
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>

            {canEdit && (
              <button
                type="button"
                onClick={handleEdit}
                disabled={loading || refreshing || deleting || !warehouse}
                title={isInactive ? 'Activate the warehouse before editing.' : 'Edit warehouse'}
                className={`${buttonBase} bg-erp-primary text-white hover:bg-erp-primary-hover`}
              >
                <Pencil size={14} />
                Edit
              </button>
            )}

            {canDelete && (
              <button type="button" onClick={() => setShowDeleteModal(true)} disabled={loading || refreshing || deleting || !warehouse} className={`${buttonBase} border border-red-200 bg-red-50 text-red-600 hover:bg-red-100`}>
                <Trash2 size={14} />
                Delete
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Loading */}
      {loading && <Loading label="Loading warehouse details..." description="Fetching warehouse information from MineERP..." />}

      {/* Error */}
      {!loading && error && (
        <section className="rounded-xl border border-erp-danger-border bg-erp-danger-light p-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-erp-danger" />

            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-erp-danger">Unable to load warehouse</h2>

              <p className="mt-1 break-words text-sm text-erp-text">{error}</p>

              <button type="button" onClick={() => fetchWarehouse()} disabled={loading || refreshing} className={`${buttonBase} mt-3 border border-erp-danger-border bg-white text-erp-danger hover:bg-erp-danger-light`}>
                <RefreshCw size={14} />
                Try Again
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Warehouse Details */}
      {!loading && !error && warehouse && (
        <>
          {isInactive && (
            <div className="flex items-start gap-3 rounded-xl border border-erp-disabled-border bg-erp-disabled-light p-4">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-erp-disabled-border/50 text-erp-disabled-text">
                <Ban size={18} />
              </div>

              <div className="min-w-0">
                <h2 className="text-sm font-bold text-erp-disabled-text">This warehouse is inactive</h2>

                <p className="mt-1 text-xs leading-5 text-erp-disabled-text">This warehouse is currently disabled for normal operations. Activate it before editing its details.</p>
              </div>
            </div>
          )}

          <div className="grid min-w-0 grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
            {/* Warehouse Information */}
            <section className={`min-w-0 rounded-xl border p-4 shadow-erp-card sm:p-5 ${panelClass}`}>
              <SectionHeader icon={Warehouse} title="Warehouse Information" description="Basic warehouse details and identification" inactive={isInactive} />

              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                <DetailItem label="Warehouse Name" value={warehouse.name} icon={Tag} inactive={isInactive} />

                <DetailItem label="Warehouse Code" value={warehouse.code} icon={Hash} inactive={isInactive} />

                <div className="sm:col-span-2">
                  <DetailItem label="Description" value={warehouse.description || 'No description provided.'} icon={FileText} inactive={isInactive} />
                </div>
              </div>

              <div className={`mt-4 flex items-start gap-2 rounded-lg p-3 ${isInactive ? 'bg-erp-disabled-light' : 'bg-erp-surface-secondary/60'}`}>
                {isInactive ? <Ban size={15} className="mt-0.5 shrink-0 text-erp-disabled" /> : <Warehouse size={15} className="mt-0.5 shrink-0 text-erp-text-muted" />}

                <p className={`text-xs leading-5 ${secondaryTextClass}`}>
                  Warehouse information is loaded from your company's warehouse records.
                  {isInactive ? ' This warehouse is inactive.' : ' Keep its name and code unique and accurate.'}
                </p>
              </div>
            </section>

            {/* Location Details */}
            <section className={`min-w-0 rounded-xl border p-4 shadow-erp-card sm:p-5 ${panelClass}`}>
              <SectionHeader icon={MapPinned} title="Location Details" description="Warehouse address and geographical details" inactive={isInactive} />

              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <DetailItem label="Full Address" value={fullAddress} icon={MapPin} inactive={isInactive} />
                </div>

                <DetailItem label="City" value={warehouse.city} icon={Building2} inactive={isInactive} />

                <DetailItem label="State" value={warehouse.state} icon={MapPinned} inactive={isInactive} />

                <DetailItem label="Pincode" value={warehouse.pincode} icon={Hash} inactive={isInactive} />
              </div>

              {warehouse.addressMapUrl && (
                <a href={warehouse.addressMapUrl} target="_blank" rel="noreferrer" className={`${buttonBase} mt-4 border border-erp-border bg-erp-surface hover:bg-erp-hover`}>
                  <MapPin size={14} />
                  Open Map
                </a>
              )}
            </section>

            {/* Contact Details */}
            <section className={`min-w-0 rounded-xl border p-4 shadow-erp-card sm:p-5 ${panelClass}`}>
              <SectionHeader icon={Phone} title="Contact Details" description="Warehouse manager and contact information" inactive={isInactive} />

              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                <DetailItem label="Warehouse Manager" value={warehouse.manager} icon={UserRound} inactive={isInactive} />

                <DetailItem label="Manager Phone" value={warehouse.managerPhone} icon={Phone} inactive={isInactive} />

                <DetailItem label="Contact Person" value={warehouse.contactPerson} icon={Users} inactive={isInactive} />

                <DetailItem label="Contact Phone" value={warehouse.phone} icon={Phone} inactive={isInactive} />
              </div>

              <div className={`mt-4 flex items-start gap-2 rounded-lg p-3 ${isInactive ? 'bg-erp-disabled-light' : 'bg-erp-surface-secondary/60'}`}>
                <AlertCircle size={15} className={`mt-0.5 shrink-0 ${isInactive ? 'text-erp-disabled' : 'text-erp-text-muted'}`} />

                <p className={`text-xs leading-5 ${secondaryTextClass}`}>Contact information helps identify the person responsible for warehouse operations.</p>
              </div>
            </section>

            {/* Capacity Information */}
            <section className={`min-w-0 rounded-xl border p-4 shadow-erp-card sm:p-5 ${panelClass}`}>
              <SectionHeader icon={Boxes} title="Capacity Information" description="Storage capacity and live warehouse stock" inactive={isInactive} />

              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                <DetailItem label="Total Capacity" value={formatQuantity(warehouse.capacity)} icon={Boxes} inactive={isInactive} />

                <DetailItem label="Capacity Unit" value={warehouse.capacityUnit || 'Not specified'} icon={Tag} inactive={isInactive} />

                <DetailItem label="Warehouse Type" value={warehouse.warehouseType || 'General'} icon={Building2} inactive={isInactive} />

                <DetailItem label="Total Stock" value={stockSummary ? formatQuantity(stockSummary.totalStock) : 'Loading...'} icon={Boxes} inactive={isInactive} />

                <DetailItem label="Reserved Stock" value={stockSummary ? formatQuantity(stockSummary.totalReservedStock) : 'Loading...'} icon={Tag} inactive={isInactive} />

                <DetailItem label="Available Stock" value={stockSummary ? formatQuantity(stockSummary.availableStock) : 'Loading...'} icon={Boxes} inactive={isInactive} />

                <DetailItem label="Products in Warehouse" value={stockSummary ? formatQuantity(stockSummary.productCount) : 'Loading...'} icon={Building2} inactive={isInactive} />

                {stockLoading && <p className={`text-xs ${secondaryTextClass}`}>Loading warehouse stock summary...</p>}

                {!stockLoading && stockError && (
                  <div className="mt-3 rounded-lg border border-erp-danger-border bg-erp-danger-light p-3">
                    <p className="text-sm font-medium text-erp-danger">Unable to load stock summary</p>

                    <p className="mt-1 text-xs text-erp-text">{stockError}</p>

                    <button type="button" onClick={() => fetchStockSummary(warehouse._id || warehouse.id)} className={`${buttonBase} mt-2 border border-erp-danger-border bg-white text-erp-danger`}>
                      <RefreshCw size={13} />
                      Retry
                    </button>
                  </div>
                )}
              </div>

              {stockSummary && (
                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className={`text-sm font-medium ${secondaryTextClass}`}>Capacity Utilization</span>

                    <span className={`text-sm font-semibold ${secondaryTextClass}`}>{stockSummary.capacityUsedPercentage}%</span>
                  </div>

                  <div className="h-2.5 overflow-hidden rounded-full bg-erp-surface-secondary">
                    <div
                      className="h-full rounded-full bg-erp-primary transition-all"
                      style={{
                        width: `${Math.min(100, Math.max(0, stockSummary.capacityUsedPercentage))}%`,
                      }}
                    />
                  </div>

                  <p className={`mt-2 text-xs ${secondaryTextClass}`}>Remaining capacity: {formatQuantity(stockSummary.remainingCapacity)}</p>
                </div>
              )}

              <div className={`mt-4 flex items-start gap-2 rounded-lg p-3 ${isInactive ? 'bg-erp-disabled-light' : 'bg-erp-surface-secondary/60'}`}>
                <AlertCircle size={15} className={`mt-0.5 shrink-0 ${isInactive ? 'text-erp-disabled' : 'text-erp-text-muted'}`} />

                <p className={`text-xs leading-5 ${secondaryTextClass}`}>Stock figures are loaded from warehouse inventory records. Capacity utilization is meaningful only when warehouse capacity and stock quantities use compatible units.</p>
              </div>
            </section>

            {/* Warehouse Activity */}
            <section className={`min-w-0 rounded-xl border p-4 shadow-erp-card sm:p-5 lg:col-span-2 ${panelClass}`}>
              <SectionHeader icon={CalendarDays} title="Warehouse Activity" description="Creation, modification and current status" inactive={isInactive} />

              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className={`flex min-w-0 items-start gap-3 rounded-lg border p-3 ${isInactive ? 'border-erp-disabled-border bg-erp-disabled-light/50' : 'border-erp-border'}`}>
                  <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${iconBoxClass}`}>
                    <CalendarDays size={16} />
                  </div>

                  <div className="min-w-0">
                    <p className={`text-xs font-medium ${secondaryTextClass}`}>Created On</p>

                    <p className={`mt-1 break-words text-sm font-semibold ${headingTextClass}`}>{formatDate(warehouse.createdAt)}</p>
                  </div>
                </div>

                <div className={`flex min-w-0 items-start gap-3 rounded-lg border p-3 ${isInactive ? 'border-erp-disabled-border bg-erp-disabled-light/50' : 'border-erp-border'}`}>
                  <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${iconBoxClass}`}>
                    <Clock size={16} />
                  </div>

                  <div className="min-w-0">
                    <p className={`text-xs font-medium ${secondaryTextClass}`}>Last Updated</p>

                    <p className={`mt-1 break-words text-sm font-semibold ${headingTextClass}`}>{formatDate(warehouse.updatedAt)}</p>
                  </div>
                </div>

                <div className={`flex min-w-0 items-center justify-between gap-3 rounded-lg border p-3 ${isInactive ? 'border-erp-disabled-border bg-erp-disabled-light/50' : 'border-erp-border bg-erp-surface'}`}>
                  <p className={`flex items-center gap-2 text-xs ${secondaryTextClass}`}>
                    <CheckCircle2 size={14} />
                    Current Status
                  </p>

                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${isInactive ? 'border border-erp-disabled-border bg-erp-disabled-light text-erp-disabled-text' : 'bg-emerald-50 text-emerald-700'}`}>
                    {isInactive ? <Ban size={12} /> : <span className="size-1.5 rounded-full bg-emerald-500" />}

                    {warehouse.status || 'Not specified'}
                  </span>
                </div>
              </div>

              <div className={`mt-3 flex items-start gap-2 rounded-lg px-3 py-2.5 ${isInactive ? 'bg-erp-disabled-light' : 'bg-erp-surface-secondary/60'}`}>
                <AlertCircle size={15} className={`mt-0.5 shrink-0 ${isInactive ? 'text-erp-disabled' : 'text-erp-text-muted'}`} />

                <p className={`text-xs leading-5 ${secondaryTextClass}`}>Warehouse details are loaded from the MineERP backend.</p>
              </div>
            </section>
          </div>
        </>
      )}

      <TrashBox
        isOpen={showDeleteModal}
        onClose={() => {
          if (!deleting) setShowDeleteModal(false)
        }}
        title="Delete Warehouse?"
        message={
          <>
            Are you sure you want to delete <strong className="font-bold text-slate-900">{warehouse?.name || 'this warehouse'}</strong>?
          </>
        }
        actionButtonText="Delete Warehouse"
        cancelButtonText="Cancel"
        onAction={handleDelete}
        isProcessing={deleting}
        variant="delete"
      />
    </div>
  )
}
