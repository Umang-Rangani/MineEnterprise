import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Warehouse,
  Tag,
  RefreshCw,
  Pencil,
  Trash2,
  CheckCircle2,
  FileText,
  CalendarDays,
  Clock,
  AlertCircle,
  Ban,
  MapPin,
  Phone,
  UserRound,
  Boxes,
  Building2,
  Hash,
  MapPinned,
  Users,
  Package,
  Layers,
  TrendingUp,
  PackageCheck,
  PackageX,
  Activity,
} from 'lucide-react'

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
    return '0'
  }

  const quantity = Number(value)

  if (!Number.isFinite(quantity)) return '0'

  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
  }).format(quantity)
}

function formatQuantityWithUnit(value, unit) {
  return `${formatQuantity(value)} ${unit || ''}`.trim()
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

function SummaryCard({ title, value, description, icon: Icon, color }) {
  const colors = {
    primary: 'bg-erp-primary/10 text-erp-primary',
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-rose-50 text-rose-600',
    violet: 'bg-violet-50 text-violet-600',
  }

  return (
    <div className="min-w-0 rounded-xl border border-erp-border bg-erp-surface p-4 shadow-erp-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-erp-text-secondary">{title}</p>

          <p className="mt-2 break-words text-xl font-bold text-erp-text">{value}</p>

          {description && <p className="mt-1 text-[10px] text-erp-text-muted">{description}</p>}
        </div>

        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${colors[color] || colors.primary}`}>
          <Icon size={19} />
        </div>
      </div>
    </div>
  )
}

function getWarehouseFromResponse(response) {
  const body = response?.data

  const candidates = [body?.data?.warehouse, body?.data, body?.warehouse, body]

  return candidates.find((item) => item && typeof item === 'object' && !Array.isArray(item) && (item._id || item.id))
}

function getStockProducts(stockSummary) {
  return Array.isArray(stockSummary?.products) ? stockSummary.products : []
}

function getUnitTotals(products, field) {
  const totals = new Map()

  products.forEach((product) => {
    const unit = product.unit || 'Unit'
    const quantity = Number(product[field]) || 0

    totals.set(unit, (totals.get(unit) || 0) + quantity)
  })

  return Array.from(totals.entries())
    .map(([unit, quantity]) => ({
      unit,
      quantity,
    }))
    .sort((a, b) => a.unit.localeCompare(b.unit))
}

function formatUnitTotals(products, field) {
  const totals = getUnitTotals(products, field)

  if (!totals.length) return '0'

  return totals.map((item) => formatQuantityWithUnit(item.quantity, item.unit)).join(' · ')
}

function getCapacityUsage(products, capacityUnit) {
  if (!capacityUnit) return null

  const matchingProducts = products.filter(
    (product) =>
      String(product.unit || '')
        .trim()
        .toLowerCase() === String(capacityUnit).trim().toLowerCase(),
  )

  return matchingProducts.reduce((total, product) => total + (Number(product.currentStock) || 0), 0)
}

function getLowStockProducts(products) {
  return products.filter((product) => product.isLowStock === true)
}

function getProductStatus(product) {
  if (product.productStatus === 'Inactive') {
    return {
      label: 'Inactive Product',
      className: 'bg-slate-100 text-slate-600',
    }
  }

  if (product.isLowStock) {
    return {
      label: 'Low Stock',
      className: 'bg-rose-50 text-rose-700',
    }
  }

  return {
    label: 'In Stock',
    className: 'bg-emerald-50 text-emerald-700',
  }
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

  const products = getStockProducts(stockSummary)
  const lowStockProducts = getLowStockProducts(products)

  const totalProducts = stockSummary?.totalProducts ?? products.length

  const totalCategories = stockSummary?.totalCategories ?? 0

  const totalLowStock = stockSummary?.lowStockCount ?? lowStockProducts.length

  const totalStockDisplay = formatUnitTotals(products, 'currentStock')
  const reservedStockDisplay = formatUnitTotals(products, 'reservedStock')
  const availableStockDisplay = formatUnitTotals(products, 'availableStock')

  const capacityUnit = warehouse?.capacityUnit || ''
  const capacity = Number(warehouse?.capacity) || 0

  const matchingUnitStock = getCapacityUsage(products, capacityUnit)

  const capacityPercentage = capacity > 0 && matchingUnitStock !== null ? Math.min(100, Math.max(0, (matchingUnitStock / capacity) * 100)) : null

  const remainingCapacity = capacity > 0 && matchingUnitStock !== null ? Math.max(0, capacity - matchingUnitStock) : null

  const fullAddress = [warehouse?.address, warehouse?.city, warehouse?.state, warehouse?.pincode].filter(Boolean).join(', ')

  const breadcrumbItems = [
    { title: 'Warehouses', link: '/company/warehouses' },
    { title: warehouse?.name || 'Warehouse Details', link: null },
  ]

  function showToast(type, message) {
    setToast({ type, message })
  }

  function closeToast() {
    setToast(null)
  }

  async function fetchStockSummary(warehouseId) {
    if (!warehouseId) return

    setStockLoading(true)
    setStockError('')

    try {
      const response = await axiosInstance.get(`/erp/warehouses/${encodeURIComponent(warehouseId)}/stock-summary`)

      const summary = response.data?.data

      if (!summary) {
        throw new Error('Stock summary was not found in the API response.')
      }

      setStockSummary(summary)
    } catch (err) {
      setStockSummary(null)

      setStockError(err.response?.data?.message || err.message || 'Unable to load warehouse stock summary.')
    } finally {
      setStockLoading(false)
    }
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
      <section className={`overflow-hidden rounded-xl border shadow-erp-card ${panelClass}`}>
        <div className={`h-1 ${isInactive ? 'bg-erp-disabled' : 'bg-erp-primary'}`} />

        <div className="flex min-w-0 flex-col gap-3 px-4 py-3 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1 overflow-hidden">
            <BreadCrumb items={breadcrumbItems} />
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
           

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
              <button type="button" onClick={handleEdit} disabled={loading || refreshing || deleting || !warehouse} title="Edit warehouse" className={`${buttonBase} bg-erp-primary text-white hover:bg-erp-primary-hover`}>
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

          {/* Warehouse Summary */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Activity size={17} className="text-erp-primary" />

              <h2 className="text-sm font-bold text-erp-text">Warehouse Overview</h2>
            </div>

            {stockLoading && <div className="mb-3 rounded-lg border border-erp-border bg-erp-surface px-3 py-2 text-xs text-erp-text-secondary">Loading inventory summary...</div>}

            {!stockLoading && stockError && (
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-erp-danger-border bg-erp-danger-light p-3">
                <div className="flex min-w-0 items-start gap-2">
                  <AlertCircle size={15} className="mt-0.5 shrink-0 text-erp-danger" />

                  <p className="text-xs text-erp-danger">{stockError}</p>
                </div>

                <button type="button" onClick={() => fetchStockSummary(warehouse._id || warehouse.id)} className={`${buttonBase} border border-erp-danger-border bg-white text-erp-danger`}>
                  <RefreshCw size={13} />
                  Retry
                </button>
              </div>
            )}

            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <SummaryCard title="Total Products" value={stockSummary ? formatQuantity(totalProducts) : '—'} description="Products stored in this warehouse" icon={Package} color="primary" />

              <SummaryCard title="Total Categories" value={stockSummary ? formatQuantity(totalCategories) : '—'} description="Distinct product categories" icon={Layers} color="violet" />

              <SummaryCard title="Total Stock" value={stockSummary ? totalStockDisplay : '—'} description="Grouped by product unit" icon={Boxes} color="blue" />

              <SummaryCard title="Reserved Stock" value={stockSummary ? reservedStockDisplay : '—'} description="Stock reserved for orders" icon={PackageCheck} color="amber" />

              <SummaryCard title="Available Stock" value={stockSummary ? availableStockDisplay : '—'} description="Stock available for use" icon={TrendingUp} color="green" />

              <SummaryCard title="Low Stock Products" value={stockSummary ? formatQuantity(totalLowStock) : '—'} description="Products at or below minimum level" icon={PackageX} color="red" />
            </div>
          </section>

          {/* Main Details */}
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
                  {isInactive ? ' This warehouse is inactive.' : ' The warehouse code is system-generated and cannot be changed.'}
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

                <DetailItem label="Stock in Capacity Unit" value={stockSummary ? (capacityUnit ? formatQuantityWithUnit(matchingUnitStock, capacityUnit) : 'Capacity unit not configured') : 'Loading...'} icon={Package} inactive={isInactive} />

                <DetailItem label="Remaining Capacity" value={stockSummary ? (remainingCapacity === null ? 'Not available' : formatQuantityWithUnit(remainingCapacity, capacityUnit)) : 'Loading...'} icon={TrendingUp} inactive={isInactive} />
              </div>

              {stockSummary && capacity > 0 && capacityPercentage !== null && (
                <div className="mt-5">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span className={`text-sm font-medium ${secondaryTextClass}`}>Capacity Utilization</span>

                    <span className={`text-sm font-bold ${headingTextClass}`}>{capacityPercentage.toFixed(1)}%</span>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-erp-surface-secondary">
                    <div
                      className={`h-full rounded-full transition-all ${capacityPercentage >= 90 ? 'bg-rose-500' : capacityPercentage >= 70 ? 'bg-amber-500' : 'bg-erp-primary'}`}
                      style={{
                        width: `${capacityPercentage}%`,
                      }}
                    />
                  </div>

                  <p className={`mt-2 text-xs ${secondaryTextClass}`}>
                    {formatQuantityWithUnit(matchingUnitStock, capacityUnit)} used out of {formatQuantityWithUnit(capacity, capacityUnit)}
                  </p>
                </div>
              )}

              {stockSummary && (!capacityUnit || capacity <= 0) && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="flex items-start gap-2 text-xs leading-5 text-amber-800">
                    <AlertCircle size={15} className="mt-0.5 shrink-0" />
                    {capacity <= 0 ? 'Enter a capacity greater than zero to calculate utilization.' : 'Select a capacity unit to calculate utilization.'}
                  </p>
                </div>
              )}

              {stockSummary && capacityUnit && capacity > 0 && (
                <div className="mt-4 rounded-lg border border-erp-border bg-erp-surface-secondary/60 p-3">
                  <p className={`text-xs leading-5 ${secondaryTextClass}`}>
                    Capacity utilization includes only products whose inventory unit matches the warehouse capacity unit ({capacityUnit}). Other product units are shown separately in the inventory summary.
                  </p>
                </div>
              )}
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
            </section>
          </div>

          {/* Product-wise Stock Details */}
          <section className={`min-w-0 overflow-hidden rounded-xl border shadow-erp-card ${panelClass}`}>
            <div className="border-b border-erp-border p-4 sm:p-5">
              <SectionHeader icon={Package} title="Product-wise Stock Details" description="Inventory products stored in this warehouse" inactive={isInactive} />

              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-erp-primary/10 px-2.5 py-1.5 text-xs font-semibold text-erp-primary">{formatQuantity(totalProducts)} Products</span>

                <span className="rounded-md bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700">{formatQuantity(totalLowStock)} Low Stock</span>
              </div>
            </div>

            {stockLoading ? (
              <div className="p-6 text-center">
                <RefreshCw size={20} className="mx-auto animate-spin text-erp-primary" />

                <p className="mt-2 text-xs text-erp-text-secondary">Loading product inventory...</p>
              </div>
            ) : stockError ? (
              <div className="p-6 text-center">
                <AlertCircle size={22} className="mx-auto text-erp-danger" />

                <p className="mt-2 text-sm font-semibold text-erp-text">Unable to load product details</p>

                <p className="mt-1 text-xs text-erp-text-secondary">{stockError}</p>

                <button type="button" onClick={() => fetchStockSummary(warehouse._id || warehouse.id)} className={`${buttonBase} mt-3 bg-erp-primary text-white hover:bg-erp-primary-hover`}>
                  <RefreshCw size={13} />
                  Retry
                </button>
              </div>
            ) : products.length === 0 ? (
              <div className="p-8 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-erp-primary/10 text-erp-primary">
                  <Package size={24} />
                </div>

                <h3 className="mt-3 text-sm font-semibold text-erp-text">No Products Found</h3>

                <p className="mt-1 text-xs text-erp-text-secondary">There are currently no inventory products in this warehouse.</p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[1050px] text-left text-xs">
                    <thead className="bg-erp-surface-secondary text-erp-text-secondary">
                      <tr>
                        <th className="px-4 py-3 font-semibold">#</th>
                        <th className="px-4 py-3 font-semibold">Product</th>
                        <th className="px-4 py-3 font-semibold">SKU</th>
                        <th className="px-4 py-3 font-semibold">Category</th>
                        <th className="px-4 py-3 text-right font-semibold">Current Stock</th>
                        <th className="px-4 py-3 text-right font-semibold">Reserved</th>
                        <th className="px-4 py-3 text-right font-semibold">Available</th>
                        <th className="px-4 py-3 text-right font-semibold">Minimum Stock</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-erp-border">
                      {products.map((product, index) => {
                        const status = getProductStatus(product)

                        return (
                          <tr key={product.inventoryId || product.productId} className="transition hover:bg-erp-hover/50">
                            <td className="px-4 py-3 text-erp-text-muted">{index + 1}</td>

                            <td className="px-4 py-3">
                              <div className="font-semibold text-erp-text">{product.name || 'Unnamed Product'}</div>

                              <div className="mt-0.5 text-[10px] text-erp-text-muted">{product.productStatus || 'Active'}</div>
                            </td>

                            <td className="px-4 py-3 font-medium text-erp-text-secondary">{product.sku || '—'}</td>

                            <td className="px-4 py-3 text-erp-text-secondary">{product.category?.name || 'Uncategorized'}</td>

                            <td className="px-4 py-3 text-right font-semibold text-erp-text">{formatQuantityWithUnit(product.currentStock, product.unit)}</td>

                            <td className="px-4 py-3 text-right text-amber-700">{formatQuantityWithUnit(product.reservedStock, product.unit)}</td>

                            <td className="px-4 py-3 text-right font-semibold text-emerald-700">{formatQuantityWithUnit(product.availableStock, product.unit)}</td>

                            <td className="px-4 py-3 text-right text-erp-text-secondary">{formatQuantityWithUnit(product.minStockLevel, product.unit)}</td>

                            <td className="px-4 py-3">
                              <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold ${status.className}`}>{status.label}</span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="grid gap-3 p-3 md:hidden">
                  {products.map((product, index) => {
                    const status = getProductStatus(product)

                    return (
                      <div key={product.inventoryId || product.productId} className="min-w-0 rounded-lg border border-erp-border bg-erp-surface p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-2">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
                              <Package size={17} />
                            </div>

                            <div className="min-w-0">
                              <p className="break-words text-xs font-bold text-erp-text">
                                {index + 1}. {product.name || 'Unnamed Product'}
                              </p>

                              <p className="mt-1 break-all text-[10px] text-erp-text-muted">SKU: {product.sku || '—'}</p>
                            </div>
                          </div>

                          <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${status.className}`}>{status.label}</span>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <div className="rounded-md bg-erp-surface-secondary p-2">
                            <p className="text-[10px] text-erp-text-muted">Category</p>

                            <p className="mt-1 break-words text-xs font-semibold text-erp-text">{product.category?.name || 'Uncategorized'}</p>
                          </div>

                          <div className="rounded-md bg-erp-surface-secondary p-2">
                            <p className="text-[10px] text-erp-text-muted">Unit</p>

                            <p className="mt-1 text-xs font-semibold text-erp-text">{product.unit || '—'}</p>
                          </div>

                          <div className="rounded-md bg-erp-surface-secondary p-2">
                            <p className="text-[10px] text-erp-text-muted">Current Stock</p>

                            <p className="mt-1 text-xs font-semibold text-erp-text">{formatQuantity(product.currentStock)}</p>
                          </div>

                          <div className="rounded-md bg-erp-surface-secondary p-2">
                            <p className="text-[10px] text-erp-text-muted">Reserved Stock</p>

                            <p className="mt-1 text-xs font-semibold text-amber-700">{formatQuantity(product.reservedStock)}</p>
                          </div>

                          <div className="rounded-md bg-erp-surface-secondary p-2">
                            <p className="text-[10px] text-erp-text-muted">Available Stock</p>

                            <p className="mt-1 text-xs font-semibold text-emerald-700">{formatQuantity(product.availableStock)}</p>
                          </div>

                          <div className="rounded-md bg-erp-surface-secondary p-2">
                            <p className="text-[10px] text-erp-text-muted">Minimum Stock</p>

                            <p className="mt-1 text-xs font-semibold text-erp-text">{formatQuantity(product.minStockLevel)}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </section>

          {/* Low Stock Products */}
          <section className={`min-w-0 overflow-hidden rounded-xl border shadow-erp-card ${panelClass}`}>
            <div className="border-b border-erp-border p-4 sm:p-5">
              <SectionHeader icon={PackageX} title="Low Stock Products" description="Products that have reached or fallen below their minimum stock level" inactive={isInactive} />
            </div>

            {stockLoading ? (
              <div className="p-5 text-center text-xs text-erp-text-secondary">Loading low stock products...</div>
            ) : lowStockProducts.length === 0 ? (
              <div className="p-6 text-center">
                <CheckCircle2 size={25} className="mx-auto text-emerald-600" />

                <p className="mt-2 text-sm font-semibold text-erp-text">No Low Stock Products</p>

                <p className="mt-1 text-xs text-erp-text-secondary">All products are currently above their minimum stock level.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px] text-left text-xs">
                  <thead className="bg-rose-50 text-rose-800">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Product</th>
                      <th className="px-4 py-3 font-semibold">SKU</th>
                      <th className="px-4 py-3 text-right font-semibold">Available Stock</th>
                      <th className="px-4 py-3 text-right font-semibold">Minimum Stock</th>
                      <th className="px-4 py-3 font-semibold">Category</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-erp-border">
                    {lowStockProducts.map((product) => (
                      <tr key={product.inventoryId || product.productId} className="hover:bg-rose-50/40">
                        <td className="px-4 py-3 font-semibold text-erp-text">{product.name || 'Unnamed Product'}</td>

                        <td className="px-4 py-3 text-erp-text-secondary">{product.sku || '—'}</td>

                        <td className="px-4 py-3 text-right font-semibold text-rose-700">{formatQuantityWithUnit(product.availableStock, product.unit)}</td>

                        <td className="px-4 py-3 text-right text-erp-text-secondary">{formatQuantityWithUnit(product.minStockLevel, product.unit)}</td>

                        <td className="px-4 py-3 text-erp-text-secondary">{product.category?.name || 'Uncategorized'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {/* Delete Confirmation */}
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
