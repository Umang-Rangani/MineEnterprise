import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  History,
  RefreshCw,
  CalendarDays,
  UserRound,
  CheckCircle2,
  Mail,
  MailCheck,
  MailX,
  FileText,
  AlertCircle,
  RotateCcw,
  Ban,
  ShieldCheck,
  Pencil,
  Package,
  Clock,
  ArrowRight,
  Activity,
  IndianRupee,
  Truck,
  Receipt,
  Boxes,
  CreditCard,
} from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import Loading from '../Loading/Loading'
import { hasPermission, useAuth } from '../../context/AuthContext'

const buttonBase = 'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50'

function formatDateTime(value) {
  if (!value) return 'Not available'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not available'
  return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatDate(value) {
  if (!value) return 'Not available'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not available'
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatMoney(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '₹0.00'
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number.toLocaleString('en-IN', { maximumFractionDigits: 3 }) : '0'
}

function getHistoryFromResponse(response) {
  const body = response?.data
  if (Array.isArray(body?.history)) return body.history
  if (Array.isArray(body?.data?.history)) return body.data.history
  return null
}

function getActionDetails(action) {
  const normalized = String(action || '').toLowerCase()
  const details = {
    created: ['Purchase Created', 'A new purchase record was created.', FileText, 'text-blue-700', 'bg-blue-50', 'bg-blue-500'],
    edited: ['Purchase Updated', 'Purchase details were modified.', Pencil, 'text-violet-700', 'bg-violet-50', 'bg-violet-500'],
    approved: ['Purchase Approved', 'The purchase was approved and moved to Ordered.', CheckCircle2, 'text-emerald-700', 'bg-emerald-50', 'bg-emerald-500'],
    cancelled: ['Purchase Cancelled', 'The purchase was cancelled.', Ban, 'text-red-700', 'bg-red-50', 'bg-red-500'],
    'email retry': ['Email Retry', 'An attempt was made to resend a purchase-related email.', RotateCcw, 'text-indigo-700', 'bg-indigo-50', 'bg-indigo-500'],
  }
  const [title, description, icon, color, background, dot] = details[normalized] || [action || 'Activity', 'A purchase activity was recorded.', History, 'text-erp-text-secondary', 'bg-erp-surface-secondary', 'bg-erp-disabled']
  return { title, description, icon, color, background, dot }
}

function getEmailStatusStyle(status) {
  const normalized = String(status || '').toLowerCase()
  const styles = {
    sent: ['Sent', MailCheck, 'bg-emerald-50 text-emerald-700 border-emerald-200'],
    failed: ['Failed', MailX, 'bg-red-50 text-red-700 border-red-200'],
    pending: ['Pending', Clock, 'bg-amber-50 text-amber-700 border-amber-200'],
    'not required': ['Not Required', Mail, 'bg-slate-100 text-slate-600 border-slate-200'],
  }
  const [label, icon, className] = styles[normalized] || [status || 'Not recorded', Mail, 'bg-erp-surface-secondary text-erp-text-secondary border-erp-border']
  return { label, icon, className }
}

function formatFieldLabel(field) {
  const labels = {
    supplierId: 'Supplier',
    supplierName: 'Supplier Name',
    purchaseNumber: 'Purchase Number',
    purchaseDate: 'Purchase Date',
    expectedDeliveryDate: 'Expected Delivery',
    items: 'Purchase Items',
    subtotal: 'Subtotal',
    discountAmount: 'Discount',
    taxAmount: 'Tax',
    shippingCharges: 'Shipping Charges',
    adjustmentAmount: 'Adjustment',
    totalAmount: 'Total Amount',
    paidAmount: 'Paid Amount',
    paymentStatus: 'Payment Status',
    notes: 'Notes',
    status: 'Status',
  }
  return (
    labels[field] ||
    String(field || 'Field')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (c) => c.toUpperCase())
      .trim()
  )
}

function formatValue(value, field) {
  if (value === null || value === undefined || value === '') return '—'
  if (value instanceof Date) return formatDate(value)
  if (typeof value === 'string') {
    if (
      String(field || '')
        .toLowerCase()
        .includes('date') &&
      !Number.isNaN(new Date(value).getTime())
    )
      return formatDate(value)
    return value
  }
  if (typeof value === 'number') {
    if (['subtotal', 'discountAmount', 'taxAmount', 'shippingCharges', 'adjustmentAmount', 'totalAmount', 'paidAmount', 'unitPrice', 'taxableAmount', 'lineTotal'].includes(field)) return formatMoney(value)
    return formatNumber(value)
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) {
    if (!value.length) return 'No items'
    return value
      .map((item, index) => {
        if (item == null) return `Item ${index + 1}`
        if (typeof item !== 'object') return String(item)
        const name = item.productName || item.name || item.itemName || item.sku || item.productId?.name || item.productId?.productName || `Item ${index + 1}`
        const quantity = item.quantity ?? item.orderedQuantity
        const price = item.unitPrice ?? item.purchasePrice ?? item.price
        return [name, quantity !== undefined ? `Qty: ${formatNumber(quantity)}` : null, price !== undefined ? `Price: ${formatMoney(price)}` : null].filter(Boolean).join(' · ')
      })
      .join('\n')
  }
  if (typeof value === 'object') {
    if (value.$date) return formatDateTime(value.$date)
    if (value._id && Object.keys(value).length === 1) return String(value._id)
    if (typeof value.toHexString === 'function') return value.toHexString()
    try {
      return JSON.stringify(value, null, 2)
    } catch {
      return String(value)
    }
  }
  return String(value)
}

export default function CompanyPurchaseHistory() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { permissions } = useAuth()
  const canViewHistory = hasPermission(permissions, 'purchase:history')
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const [expandedIds, setExpandedIds] = useState({})

  function showToast(type, message) {
    setToast({ type, message })
  }
  function closeToast() {
    setToast(null)
  }

  async function fetchHistory(showRefreshMessage = false) {
    if (!id) {
      setHistory([])
      setError('Purchase ID is missing.')
      setLoading(false)
      setRefreshing(false)
      return
    }

    if (showRefreshMessage) setRefreshing(true)

    setLoading(true)
    setError('')

    try {
      const response = await axiosInstance.get(`/erp/purchases/${encodeURIComponent(id)}/history`)

      const data = getHistoryFromResponse(response)

      if (!data) {
        throw new Error('Purchase history was not found in the API response.')
      }

      const sortedHistory = [...data].sort((a, b) => new Date(b.performedAt || 0).getTime() - new Date(a.performedAt || 0).getTime())

      setHistory(sortedHistory)

      if (showRefreshMessage) {
        showToast('success', 'Purchase history refreshed successfully.')
      }
    } catch (err) {
      setHistory([])
      setError(err.response?.data?.message || err.message || 'Unable to load purchase history.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    document.title = 'Purchase History | MineERP'
    fetchHistory()
  }, [id])

  function getEventKey(event, index) {
    return event._id || `${event.action || 'activity'}-${index}`
  }
  function toggleEvent(event, index) {
    const key = getEventKey(event, index)
    setExpandedIds((current) => ({ ...current, [key]: !current[key] }))
  }
  function expandAll() {
    const next = {}
    history.forEach((event, index) => {
      next[getEventKey(event, index)] = true
    })
    setExpandedIds(next)
  }
  function collapseAll() {
    setExpandedIds({})
  }

  const latestEvent = history[0]

  const approvedCount = history.filter((event) => String(event.action || '').toLowerCase() === 'approved').length
  const editedCount = history.filter((event) => String(event.action || '').toLowerCase() === 'edited').length
  const breadcrumbItems = [
    { title: 'Purchases', link: '/company/purchases' },
    { title: 'Purchase Details', link: `/company/purchases/${encodeURIComponent(id || '')}` },
    { title: 'Purchase History', link: null },
  ]

  if (!canViewHistory) {
    return (
      <div className="min-w-0 rounded-xl border border-erp-border bg-erp-surface p-5 text-center">
        <ShieldCheck size={28} className="mx-auto mb-3 text-erp-danger" />
        <h2 className="text-base font-semibold text-erp-text">Access Denied</h2>
        <p className="mt-2 text-sm text-erp-text-secondary">You do not have permission to view purchase history.</p>
        <button type="button" onClick={() => navigate(`/company/purchases/${encodeURIComponent(id || '')}`, { replace: true })} className={`${buttonBase} mt-4 bg-erp-primary text-white hover:bg-erp-primary-hover`}>
          <ArrowLeft size={14} /> Back to Purchase
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-w-0 space-y-4 text-sm">
        <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card h-17">
          <div className="h-1 bg-erp-primary" />
          <div className="flex min-h-16 items-center px-4 sm:px-5">
            <BreadCrumb items={breadcrumbItems} />
          </div>
        </section>
        <section className="min-h-[480px] overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex min-h-[480px] items-center justify-center">
            <Loading label="Loading purchase history..." description="Fetching purchase activity from MineERP..." />
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-3 text-erp-text">
      {toast && <Toast toast={toast} onClose={closeToast} />}

      <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card h-17">
        <div className="h-1 bg-erp-primary" />
        <div className="flex flex-col justify-between gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-5">
          <BreadCrumb items={breadcrumbItems} />
          <div className="flex  items-center gap-2">
            {[
              { title: 'Total Activities', value: history.length, icon: History, color: 'text-blue-600', border: 'border-blue-200' },
              { title: 'Approvals', value: approvedCount, icon: CheckCircle2, color: 'text-emerald-600', border: 'border-emerald-200' },
              { title: 'Purchase Edits', value: editedCount, icon: Pencil, color: 'text-violet-600', border: 'border-violet-200' },
            ].map((card) => {
              const Icon = card.icon
              return (
                <div key={card.title} title={card.title} className={`flex h-9 items-center gap-2 whitespace-nowrap rounded-lg border ${card.border} px-3`}>
                  <Icon size={15} className={card.color} />
                  <span className={`hidden text-xs font-medium lg:inline ${card.color}`}>{card.title}</span>
                  <span className="text-sm font-bold text-erp-text">{formatNumber(card.value)}</span>
                </div>
              )
            })}

            <button
              type="button"
              onClick={() => fetchHistory(true)}
              disabled={refreshing || loading}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-erp-primary px-3.5 text-xs font-semibold text-white transition hover:bg-erp-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />

              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </section>

      {error && (
        <section className="rounded-xl border border-erp-danger-border bg-erp-danger-light p-3">
          <div className="flex items-start gap-2">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-erp-danger" />
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-erp-danger">Unable to load purchase history</h2>
              <p className="mt-1 break-words text-sm text-erp-text">{error}</p>
              <button type="button" onClick={() => fetchHistory()} className={`${buttonBase} mt-3 border border-erp-danger-border bg-white text-erp-danger hover:bg-erp-danger-light`}>
                <RefreshCw size={14} /> Try Again
              </button>
            </div>
          </div>
        </section>
      )}

      {!error && (
        <>
          <section className="min-w-0 overflow-hidden rounded-xl border border-erp-border bg-erp-surface">
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-erp-border px-3 py-2.5 sm:px-4">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-erp-primary-light text-erp-primary">
                  <History size={16} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-erp-text">Activity Timeline</h2>
                  <p className="mt-0.5 text-[11px] text-erp-text-secondary">Expand an activity to view its saved purchase details</p>
                </div>
              </div>

              <div className="min-w-0">
                <p className="text-[10px] text-erp-text-secondary">Latest Activity</p>

                <p className="truncate text-xs font-bold text-erp-text">{latestEvent ? getActionDetails(latestEvent.action).title : 'No activity recorded'}</p>

                <p className="text-[10px] text-erp-text-secondary">{latestEvent ? formatDateTime(latestEvent.performedAt) : 'Not available'}</p>
              </div>
            </div>

            {!history.length ? (
              <div className="px-4 py-8 text-center">
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-erp-surface-secondary text-erp-text-secondary">
                  <History size={22} />
                </div>
                <h3 className="text-sm font-semibold text-erp-text">No history available</h3>
                <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-erp-text-secondary">No recorded activities were returned for this purchase. Activities will appear here when saved by the API.</p>
              </div>
            ) : (
              <div className="p-3">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-erp-surface-secondary/40 px-3 py-2">
                  <p className="text-[11px] text-erp-text-secondary">Newest activity appears first</p>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={expandAll} className="text-[11px] font-semibold text-erp-primary hover:underline">
                      Expand all
                    </button>
                    <button type="button" onClick={collapseAll} className="text-[11px] font-semibold text-erp-text-secondary hover:text-erp-primary">
                      Collapse all
                    </button>
                  </div>
                </div>

                {history.map((event, index) => {
                  const key = getEventKey(event, index)
                  const expanded = Boolean(expandedIds[key])
                  const actionDetails = getActionDetails(event.action)
                  const ActionIcon = actionDetails.icon
                  const performer = event.performedBy && typeof event.performedBy === 'object' ? event.performedBy : null
                  const emailType = String(event.emailType || 'None')
                  const hasEmail = ['Order', 'Cancellation'].includes(emailType)
                  const hasChanges = Array.isArray(event.changes) && event.changes.length > 0
                  const snapshot = event.snapshot || null
                  const emailDetails = getEmailStatusStyle(event.emailStatus)
                  const EmailIcon = emailDetails.icon

                  return (
                    <div key={key} className="relative flex min-w-0 gap-2.5">
                      <div className="relative flex w-7 shrink-0 flex-col items-center pt-4">
                        <div className={`z-10 flex h-8 w-8 items-center justify-center rounded-full ring-4 ring-erp-surface ${actionDetails.background} ${actionDetails.color}`}>
                          <ActionIcon size={15} />
                        </div>
                        {index !== history.length - 1 && <div className="absolute bottom-0 top-8 w-px bg-erp-border" />}
                      </div>

                      <div className={`mb-2.5 min-w-0 flex-1 overflow-hidden rounded-xl border border-erp-border bg-erp-surface ${expanded ? 'shadow-sm' : ''}`}>
                        <button
                          type="button"
                          onClick={() => toggleEvent(event, index)}
                          aria-expanded={expanded}
                          className={`flex w-full min-w-0 items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${expanded ? 'bg-erp-primary-light' : 'bg-erp-surface hover:bg-erp-hover'}`}
                        >
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${actionDetails.background} ${actionDetails.color}`}>
                            <ActionIcon size={17} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <h3 className="text-xs font-bold text-erp-text sm:text-sm">{actionDetails.title}</h3>
                              <span className="rounded-full bg-erp-surface-secondary px-2 py-0.5 text-[10px] font-semibold text-erp-text-secondary">#{index + 1}</span>
                              {hasChanges && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                                  <Pencil size={10} />
                                  {event.changes.length} changed
                                </span>
                              )}
                              {snapshot && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                  <Package size={10} />
                                  Snapshot saved
                                </span>
                              )}
                            </div>
                            <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[11px] text-erp-text-secondary">
                              <Clock size={11} />
                              {formatDateTime(event.performedAt)}
                              {performer?.name && (
                                <>
                                  <span>·</span>
                                  <span className="truncate">{performer.name}</span>
                                </>
                              )}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {hasEmail && (
                              <span className="hidden md:inline-flex">
                                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold ${emailDetails.className}`}>
                                  <EmailIcon size={12} />
                                  {emailDetails.label}
                                </span>
                              </span>
                            )}
                            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-erp-surface-secondary text-erp-text-secondary">{expanded ? <ArrowUp size={14} /> : <ArrowDown size={14} />}</span>
                          </div>
                        </button>

                        {expanded && (
                          <div className="space-y-3 border-t border-erp-border px-3 py-3 sm:px-4">
                            <div className="flex items-start gap-2 rounded-lg border border-erp-border bg-erp-surface-secondary/30 p-2.5">
                              <Activity size={15} className="mt-0.5 shrink-0 text-erp-primary" />
                              <p className="text-xs leading-5 text-erp-text-secondary">{actionDetails.description}</p>
                            </div>

                            <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                              {[
                                { label: 'Activity', value: event.action, icon: History },
                                { label: 'Performed At', value: formatDateTime(event.performedAt), icon: CalendarDays },
                                { label: 'Performed By', value: performer ? [performer.name, performer.email].filter(Boolean).join(' · ') : 'User details unavailable', icon: UserRound },
                                { label: 'Status Change', value: event.fromStatus || event.toStatus ? `${event.fromStatus || '—'} → ${event.toStatus || '—'}` : 'No status transition', icon: RefreshCw },
                              ].map((item) => {
                                const Icon = item.icon
                                const displayValue = item.value === null || item.value === undefined || item.value === '' ? 'Not provided' : item.value
                                return (
                                  <div key={item.label} className="flex min-w-0 items-start gap-2 rounded-lg border border-erp-border/70 bg-erp-surface-secondary/30 px-2.5 py-2">
                                    <Icon size={14} className="mt-0.5 shrink-0 text-erp-text-secondary" />
                                    <div className="min-w-0 flex-1">
                                      <p className="text-[10px] font-medium uppercase tracking-wide text-erp-text-secondary">{item.label}</p>
                                      <p className="mt-0.5 break-words text-xs font-semibold text-erp-text">{displayValue}</p>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>

                            {event.toStatus &&
                              (() => {
                                const normalized = String(event.toStatus || '').toLowerCase()
                                let style = 'border-erp-border bg-erp-surface-secondary text-erp-text-secondary'
                                if (['ordered', 'partially received'].includes(normalized)) style = 'border-blue-200 bg-blue-50 text-blue-700'
                                else if (normalized === 'received') style = 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                else if (normalized === 'draft') style = 'border-amber-200 bg-amber-50 text-amber-700'
                                else if (normalized === 'cancelled') style = 'border-red-200 bg-red-50 text-red-700'
                                return (
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[11px] text-erp-text-secondary">Status after event</span>
                                    <span className={`inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-semibold ${style}`}>{event.toStatus || 'Not recorded'}</span>
                                  </div>
                                )
                              })()}

                            {String(event.action || '').toLowerCase() === 'edited' &&
                              (!hasChanges ? (
                                <div className="rounded-lg border border-erp-border bg-erp-surface-secondary/30 px-3 py-2.5">
                                  <p className="text-xs text-erp-text-secondary">No field-level changes were recorded for this activity.</p>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <h4 className="text-xs font-bold text-erp-text">Changed Fields</h4>
                                    <span className="rounded-full bg-violet-50 px-2 py-1 text-[10px] font-semibold text-violet-700">
                                      {event.changes.length} {event.changes.length === 1 ? 'change' : 'changes'}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                                    {event.changes.map((change, changeIndex) => (
                                      <div key={`${change.field || 'field'}-${changeIndex}`} className="min-w-0 overflow-hidden rounded-lg border border-erp-border bg-erp-surface">
                                        <div className="border-b border-erp-border bg-erp-surface-secondary/50 px-3 py-2">
                                          <p className="text-xs font-semibold text-erp-text">{formatFieldLabel(change.field)}</p>
                                        </div>
                                        <div className="grid min-w-0 grid-cols-1 gap-2 p-2 sm:grid-cols-[minmax(0,1fr)_20px_minmax(0,1fr)]">
                                          <div className="min-w-0 rounded-md border border-red-100 bg-red-50/70 p-2">
                                            <p className="mb-1 text-[10px] font-bold uppercase text-red-600">Previous</p>
                                            <p className="whitespace-pre-wrap break-words text-xs leading-5 text-red-800">{formatValue(change.oldValue, change.field)}</p>
                                          </div>
                                          <div className="hidden items-center justify-center text-erp-text-muted sm:flex">
                                            <ArrowRight size={14} />
                                          </div>
                                          <div className="min-w-0 rounded-md border border-emerald-100 bg-emerald-50/70 p-2">
                                            <p className="mb-1 text-[10px] font-bold uppercase text-emerald-600">Updated</p>
                                            <p className="whitespace-pre-wrap break-words text-xs leading-5 text-emerald-800">{formatValue(change.newValue, change.field)}</p>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}

                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Receipt size={15} className="text-erp-primary" />
                                <h4 className="text-xs font-bold text-erp-text">Purchase Details at This Event</h4>
                              </div>
                              {!snapshot ? (
                                <div className="rounded-lg border border-dashed border-erp-border bg-erp-surface-secondary/30 p-3">
                                  <div className="flex items-start gap-2.5">
                                    <AlertCircle size={18} className="shrink-0 text-amber-700" />
                                    <div>
                                      <h4 className="text-sm font-bold text-erp-text">Purchase snapshot unavailable</h4>
                                      <p className="mt-1 text-xs leading-5 text-erp-text-secondary">This activity was saved without a purchase snapshot, so historical product and amount details cannot be reconstructed reliably.</p>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                (() => {
                                  const items = Array.isArray(snapshot.items) ? snapshot.items : []
                                  const amountRows = [
                                    ['Subtotal', snapshot.subtotal],
                                    ['Discount', snapshot.discountAmount],
                                    ['Tax Amount', snapshot.taxAmount],
                                    ['Shipping Charges', snapshot.shippingCharges],
                                    ['Adjustment', snapshot.adjustmentAmount],
                                  ]
                                  const purchaseStatus = String(snapshot.status || '').toLowerCase()
                                  let purchaseStatusStyle = 'border-erp-border bg-erp-surface-secondary text-erp-text-secondary'
                                  if (['ordered', 'partially received'].includes(purchaseStatus)) purchaseStatusStyle = 'border-blue-200 bg-blue-50 text-blue-700'
                                  else if (purchaseStatus === 'received') purchaseStatusStyle = 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                  else if (purchaseStatus === 'draft') purchaseStatusStyle = 'border-amber-200 bg-amber-50 text-amber-700'
                                  else if (purchaseStatus === 'cancelled') purchaseStatusStyle = 'border-red-200 bg-red-50 text-red-700'
                                  const infoItems = [
                                    { label: 'Purchase Date', value: formatDate(snapshot.purchaseDate), icon: CalendarDays },
                                    { label: 'Expected Delivery', value: formatDate(snapshot.expectedDeliveryDate), icon: Truck },
                                    { label: 'Payment Status', value: snapshot.paymentStatus || 'Not recorded', icon: CreditCard },
                                  ]
                                  return (
                                    <div className="space-y-2.5">
                                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-erp-border bg-erp-surface-secondary/30 px-3 py-2">
                                        <div className="flex min-w-0 items-center gap-2.5">
                                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-erp-primary-light text-erp-primary">
                                            <Receipt size={16} />
                                          </div>
                                          <div className="min-w-0">
                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-erp-text-secondary">Purchase Number</p>
                                            <h4 className="break-words text-sm font-bold text-erp-text">{snapshot.purchaseNumber || 'Not recorded'}</h4>
                                            <p className="text-[11px] text-erp-text-secondary">{snapshot.supplierName || 'Supplier not recorded'}</p>
                                          </div>
                                        </div>
                                        <span className={`inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-semibold ${purchaseStatusStyle}`}>{snapshot.status || 'Not recorded'}</span>
                                      </div>

                                      <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-3">
                                        {infoItems.map((item) => {
                                          const Icon = item.icon
                                          return (
                                            <div key={item.label} className="flex min-w-0 items-start gap-2 rounded-lg border border-erp-border/70 bg-erp-surface-secondary/30 px-2.5 py-2">
                                              <Icon size={14} className="mt-0.5 shrink-0 text-erp-text-secondary" />
                                              <div className="min-w-0 flex-1">
                                                <p className="text-[10px] font-medium uppercase tracking-wide text-erp-text-secondary">{item.label}</p>
                                                <p className="mt-0.5 break-words text-xs font-semibold text-erp-text">{item.value === null || item.value === undefined || item.value === '' ? 'Not provided' : item.value}</p>
                                              </div>
                                            </div>
                                          )
                                        })}
                                      </div>

                                      <div className="grid min-w-0 grid-cols-1 items-start gap-2.5 xl:grid-cols-[minmax(0,1fr)_260px]">
                                        <div className="min-w-0 self-start overflow-hidden rounded-lg border border-erp-border">
                                          <div className="flex items-center justify-between gap-2 border-b border-erp-border bg-erp-surface-secondary/40 px-3 py-2">
                                            <div className="flex items-center gap-2">
                                              <Package size={15} className="text-erp-primary" />
                                              <h4 className="text-xs font-bold text-erp-text">Product Details</h4>
                                            </div>
                                            <span className="rounded-full border border-erp-border bg-erp-surface px-2 py-0.5 text-[10px] font-semibold text-erp-text-secondary">
                                              {items.length} {items.length === 1 ? 'item' : 'items'}
                                            </span>
                                          </div>
                                          {!items.length ? (
                                            <div className="px-3 py-6 text-center">
                                              <Boxes size={22} className="mx-auto text-erp-text-muted" />
                                              <p className="mt-2 text-xs text-erp-text-secondary">No product items were saved in this snapshot.</p>
                                            </div>
                                          ) : (
                                            <div className="space-y-2 p-2.5">
                                              {items.map((item, itemIndex) => (
                                                <div key={`${item.productId || item.sku || item.productName || 'item'}-${itemIndex}`} className="rounded-lg border border-erp-border bg-erp-surface p-2.5">
                                                  <div className="flex min-w-0 items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                      <p className="break-words text-xs font-bold text-erp-text">{item.productName || 'Unnamed product'}</p>
                                                      <p className="mt-0.5 break-all text-[10px] text-erp-text-secondary">
                                                        SKU: {item.sku || '—'}
                                                        {item.productId ? ` · ID: ${String(item.productId?._id || item.productId)}` : ''}
                                                      </p>
                                                    </div>
                                                    <p className="shrink-0 text-xs font-bold text-erp-text">{formatMoney(item.lineTotal)}</p>
                                                  </div>
                                                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                                                    {[
                                                      ['Quantity', formatNumber(item.quantity)],
                                                      ['Received', formatNumber(item.receivedQuantity)],
                                                      ['Unit', item.unit || 'Piece'],
                                                      ['Unit Price', formatMoney(item.unitPrice)],
                                                      ['Tax Rate', `${formatNumber(item.taxRate)}%`],
                                                      ['Discount', formatMoney(item.discountAmount)],
                                                      ['Tax Amount', formatMoney(item.taxAmount)],
                                                    ].map(([label, value]) => (
                                                      <div key={label} className="min-w-0 rounded-md bg-erp-surface-secondary/40 px-2 py-1.5">
                                                        <p className="text-[10px] text-erp-text-secondary">{label}</p>
                                                        <p className="mt-0.5 break-words text-xs font-semibold text-erp-text">{value}</p>
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>

                                        <div className="self-start rounded-lg border border-erp-border bg-erp-surface-secondary/30 p-3">
                                          <div className="mb-1 flex items-center gap-2">
                                            <IndianRupee size={15} className="text-erp-primary" />
                                            <h4 className="text-xs font-bold text-erp-text">Amount Summary</h4>
                                          </div>
                                          {amountRows.map(([label, value]) => (
                                            <div key={label} className="flex items-start justify-between gap-3 py-1.5">
                                              <span className="text-xs text-erp-text-secondary">{label}</span>
                                              <span className="text-right text-xs font-semibold tabular-nums text-erp-text">{formatMoney(value)}</span>
                                            </div>
                                          ))}
                                          <div className="mt-1 flex items-start justify-between gap-3 border-t border-erp-border pt-2">
                                            <span className="text-xs font-bold text-erp-text">Total Amount</span>
                                            <span className="text-right text-sm font-bold tabular-nums text-erp-primary">{formatMoney(snapshot.totalAmount)}</span>
                                          </div>
                                          <div className="mt-2 flex items-center justify-between gap-2 rounded-md border border-erp-border bg-erp-surface px-2.5 py-2">
                                            <span className="text-xs text-erp-text-secondary">Paid Amount</span>
                                            <span className="text-xs font-bold text-emerald-700">{formatMoney(snapshot.paidAmount)}</span>
                                          </div>
                                          <div className="flex items-center justify-between gap-2 pt-2">
                                            <span className="text-xs text-erp-text-secondary">Balance</span>
                                            <span className="text-xs font-bold text-erp-text">{formatMoney(Number(snapshot.totalAmount || 0) - Number(snapshot.paidAmount || 0))}</span>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="rounded-lg border border-erp-border bg-erp-surface p-3">
                                        <div className="flex items-center gap-2">
                                          <FileText size={15} className="text-erp-primary" />
                                          <h4 className="text-xs font-bold text-erp-text">Purchase Notes</h4>
                                        </div>
                                        <p className="mt-1.5 whitespace-pre-wrap break-words text-xs leading-5 text-erp-text-secondary">{snapshot.notes || 'No notes recorded.'}</p>
                                      </div>
                                    </div>
                                  )
                                })()
                              )}
                            </div>

                            {hasEmail && (
                              <div className="overflow-hidden rounded-lg border border-erp-border bg-erp-surface">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-erp-border px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    <Mail size={14} className="text-erp-text-secondary" />
                                    <p className="text-xs font-bold text-erp-text">{emailType === 'Order' ? 'Purchase Order Email' : 'Cancellation Email'}</p>
                                  </div>
                                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold ${emailDetails.className}`}>
                                    <EmailIcon size={12} />
                                    {emailDetails.label}
                                  </span>
                                </div>
                                <div className="p-3">
                                  {event.emailError ? (
                                    <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2">
                                      <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-600" />
                                      <p className="break-words text-xs leading-5 text-red-700">{event.emailError}</p>
                                    </div>
                                  ) : String(event.emailStatus || '').toLowerCase() === 'sent' ? (
                                    <p className="flex items-center gap-1.5 text-xs text-emerald-700">
                                      <CheckCircle2 size={13} />
                                      Email delivery was recorded as successful.
                                    </p>
                                  ) : (
                                    <p className="text-xs text-erp-text-secondary">Email delivery details are recorded above.</p>
                                  )}
                                </div>
                              </div>
                            )}
                            {!hasEmail && event.emailStatus && (
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[11px] text-erp-text-secondary">Email status</span>
                                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold ${emailDetails.className}`}>
                                  <EmailIcon size={12} />
                                  {emailDetails.label}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          <div className="flex items-start gap-2 rounded-xl border border-erp-border bg-erp-surface-secondary/40 px-3 py-2.5">
            <AlertCircle size={14} className="mt-0.5 shrink-0 text-erp-text-muted" />
            <p className="text-[11px] leading-5 text-erp-text-secondary">Product and amount details are displayed from the snapshot saved with each activity. Older records without a snapshot cannot show historical product details accurately.</p>
          </div>
        </>
      )}
    </div>
  )
}
