import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FolderTree, Tag, RefreshCw, Pencil, Trash2, CheckCircle2, FileText, CalendarDays, Clock, AlertCircle, X, Ban } from 'lucide-react'

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

function DetailItem({ label, value, icon: Icon, inactive }) {
  return (
    <div className={`min-w-0 rounded-lg border p-3 ${inactive ? 'border-erp-disabled-border bg-erp-disabled-light/50' : 'border-erp-border bg-erp-surface'}`}>
      <p className={`mb-2 flex items-center gap-2 text-xs ${inactive ? 'text-erp-disabled-text' : 'text-erp-text-secondary'}`}>
        {Icon && <Icon size={14} className="shrink-0" />}
        {label}
      </p>

      <p className={`break-words text-sm font-semibold ${inactive ? 'text-erp-disabled-text' : 'text-erp-text'}`}>{value || 'Not provided'}</p>
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

export default function CategoryDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { permissions } = useAuth()

  const canView = hasPermission(permissions, 'category:view')
  const canUpdate = hasPermission(permissions, 'category:update')
  const canDelete = hasPermission(permissions, 'category:delete')

  const [category, setCategory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const isInactive =
    String(category?.status ?? '')
      .trim()
      .toLowerCase() === 'inactive'

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

  async function fetchCategory(showRefreshMessage = false) {
    setLoading(true)
    setRefreshing(showRefreshMessage)
    setError('')

    try {
      if (!id) {
        throw new Error('Category ID is missing.')
      }

      const { data } = await axiosInstance.get(`/erp/categories/${encodeURIComponent(id)}`)

      if (!data?.success || !data.category) {
        throw new Error(data?.message || 'Unable to load category details.')
      }

      setCategory(data.category)

      if (showRefreshMessage) {
        showToast('success', 'Category details refreshed successfully.')
      }
    } catch (err) {
      setCategory(null)

      setError(err.response?.data?.message || err.message || 'Unable to load category details.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    document.title = 'Category Details | MineERP'
    fetchCategory()
  }, [id])

  function handleEdit() {
    if (!category || isInactive) return

    navigate(`/company/categories/${encodeURIComponent(category._id || id)}/edit`)
  }

  async function handleDelete() {
    if (!category || deleting) return

    setDeleting(true)

    try {
      const { data } = await axiosInstance.delete(`/erp/categories/${encodeURIComponent(category._id || id)}`)

      if (data?.success === false) {
        throw new Error(data.message || 'Unable to delete category.')
      }

      navigate('/company/categories', {
        replace: true,
        state: {
          successMessage: data?.message || 'Category deleted successfully.',
        },
      })
    } catch (err) {
      setShowDeleteModal(false)

      showToast('error', err.response?.data?.message || err.message || 'Unable to delete category.')
    } finally {
      setDeleting(false)
    }
  }

  const breadcrumbItems = [
    { title: 'Categories', link: '/company/categories' },
    { title: category?.name || 'Category Details', link: null },
  ]

  if (!canView) {
    return (
      <div className="min-w-0 rounded-xl border border-erp-border bg-erp-surface p-6 text-center">
        <h2 className="text-base font-semibold text-erp-text">Access Denied</h2>

        <p className="mt-2 text-sm text-erp-text-secondary">You do not have permission to view category details.</p>

        <button type="button" onClick={() => navigate('/company/categories', { replace: true })} className={`${buttonBase} mt-4 bg-erp-primary text-white hover:bg-erp-primary-hover`}>
          Back to Categories
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

        <div className="flex min-w-0 flex-col gap-4 px-4 py-3 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1 overflow-hidden">
            <BreadCrumb items={breadcrumbItems} />
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold ${isInactive ? 'bg-erp-disabled-light text-erp-disabled-text' : 'bg-erp-primary-light text-erp-primary-dark'}`}>
              {isInactive ? <Ban size={13} /> : <FolderTree size={13} />}
              Category Details
            </span>

            <button
              type="button"
              onClick={() => fetchCategory(true)}
              disabled={loading || refreshing || deleting}
              className={`${buttonBase} border ${isInactive ? 'border-erp-disabled-border bg-erp-disabled-light text-erp-disabled-text hover:bg-erp-disabled-border/40' : 'border-erp-border bg-erp-surface hover:bg-erp-hover'}`}
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>

            {canUpdate && (
              <button
                type="button"
                onClick={handleEdit}
                disabled={loading || refreshing || deleting || !category || isInactive}
                title={isInactive ? 'Inactive categories cannot be edited.' : 'Edit category'}
                className={`${buttonBase} ${isInactive ? 'cursor-not-allowed bg-erp-disabled-light text-erp-disabled-text' : 'bg-erp-primary text-white hover:bg-erp-primary-hover'}`}
              >
                <Pencil size={14} />
                Edit
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Loading */}
      {loading && <Loading label="Loading category details..." />}

      {/* Error */}
      {!loading && error && (
        <section className="rounded-xl border border-erp-danger-border bg-erp-danger-light p-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-erp-danger" />

            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-erp-danger">Unable to load category</h2>

              <p className="mt-1 break-words text-sm text-erp-text">{error}</p>

              <button type="button" onClick={() => fetchCategory()} className={`${buttonBase} mt-3 border border-erp-danger-border bg-white text-erp-danger hover:bg-erp-danger-light`}>
                <RefreshCw size={14} />
                Try Again
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Category Details */}
      {!loading && !error && category && (
        <>
          {/* Inactive Notice */}
          {isInactive && (
            <div className="flex items-start gap-3 rounded-xl border border-erp-disabled-border bg-erp-disabled-light p-4">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-erp-disabled-border/50 text-erp-disabled-text">
                <Ban size={18} />
              </div>

              <div className="min-w-0">
                <h2 className="text-sm font-bold text-erp-disabled-text">This category is inactive</h2>

                <p className="mt-1 text-xs leading-5 text-erp-disabled-text">This category is currently disabled. Editing is unavailable while the category remains inactive.</p>
              </div>
            </div>
          )}

          <div className="grid min-w-0 grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
            {/* Category Information */}
            <section className={`min-w-0 rounded-xl border p-4 shadow-erp-card sm:p-5 ${panelClass}`}>
              <SectionHeader icon={FolderTree} title="Category Information" description="Basic category details" inactive={isInactive} />

              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                <DetailItem label="Category Name" value={category.name} icon={Tag} inactive={isInactive} />

                <DetailItem label="Category Code" value={category.code} icon={FileText} inactive={isInactive} />

                <div className="sm:col-span-2">
                  <DetailItem label="Description" value={category.description || 'No description provided.'} icon={FileText} inactive={isInactive} />
                </div>
              </div>

              <div className={`mt-4 flex items-start gap-2 rounded-lg p-3 ${isInactive ? 'bg-erp-disabled-light' : 'bg-erp-surface-secondary/60'}`}>
                {isInactive ? <Ban size={15} className="mt-0.5 shrink-0 text-erp-disabled" /> : <FolderTree size={15} className="mt-0.5 shrink-0 text-erp-text-muted" />}

                <p className={`text-xs leading-5 ${secondaryTextClass}`}>
                  Category information is scoped to your company.
                  {isInactive ? ' This category is inactive.' : ' Use Edit to update its details.'}
                </p>
              </div>
            </section>

            {/* Category Activity */}
            <section className={`min-w-0 rounded-xl border p-4 shadow-erp-card sm:p-5 ${panelClass}`}>
              <SectionHeader icon={CalendarDays} title="Category Activity" description="Creation and last modification details" inactive={isInactive} />

              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                {/* Created On */}
                <div className={`flex min-w-0 items-start gap-3 rounded-lg border p-3 ${isInactive ? 'border-erp-disabled-border bg-erp-disabled-light/50' : 'border-erp-border'}`}>
                  <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${iconBoxClass}`}>
                    <CalendarDays size={16} />
                  </div>

                  <div className="min-w-0">
                    <p className={`text-xs font-medium ${secondaryTextClass}`}>Created On</p>

                    <p className={`mt-1 break-words text-sm font-semibold ${headingTextClass}`}>{formatDate(category.createdAt)}</p>
                  </div>
                </div>

                {/* Last Updated */}
                <div className={`flex min-w-0 items-start gap-3 rounded-lg border p-3 ${isInactive ? 'border-erp-disabled-border bg-erp-disabled-light/50' : 'border-erp-border'}`}>
                  <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${iconBoxClass}`}>
                    <Clock size={16} />
                  </div>

                  <div className="min-w-0">
                    <p className={`text-xs font-medium ${secondaryTextClass}`}>Last Updated</p>

                    <p className={`mt-1 break-words text-sm font-semibold ${headingTextClass}`}>{formatDate(category.updatedAt)}</p>
                  </div>
                </div>

                {/* Status */}
                <div className={`flex w-fit min-w-0 items-center gap-5 rounded-lg border p-3 sm:col-span-2 ${isInactive ? 'border-erp-disabled-border bg-erp-disabled-light/50' : 'border-erp-border bg-erp-surface'}`}>
                  <p className={`flex items-center gap-2 text-xs ${secondaryTextClass}`}>
                    <CheckCircle2 size={14} />
                    Current Status
                  </p>

                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${isInactive ? 'border border-erp-disabled-border bg-erp-disabled-light text-erp-disabled-text' : 'bg-emerald-50 text-emerald-700'}`}>
                    {isInactive ? <Ban size={12} /> : <span className="size-1.5 rounded-full bg-emerald-500" />}

                    {category.status || 'Not specified'}
                  </span>
                </div>
              </div>

              <div className={`mt-3 flex items-start gap-2 rounded-lg px-3 py-2.5 ${isInactive ? 'bg-erp-disabled-light' : 'bg-erp-surface-secondary/60'}`}>
                <AlertCircle size={15} className={`mt-0.5 shrink-0 ${isInactive ? 'text-erp-disabled' : 'text-erp-text-muted'}`} />

                <p className={`text-xs leading-5 ${secondaryTextClass}`}>Deleting a category may be blocked if products are still linked to it. Remove or reassign those product references before trying again.</p>
              </div>
            </section>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && category && canDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deleting) {
              setShowDeleteModal(false)
            }
          }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby="delete-category-title" className="w-full max-w-md rounded-xl border border-erp-border bg-erp-surface p-5 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                <Trash2 size={19} />
              </div>

              <div className="min-w-0 flex-1">
                <h2 id="delete-category-title" className="text-sm font-bold text-erp-text">
                  Delete Category?
                </h2>

                <p className="mt-1 break-words text-xs leading-5 text-erp-text-secondary">
                  Are you sure you want to delete <span className="font-bold text-erp-text">{category.name}</span>? This action cannot be undone.
                </p>
              </div>

              <button type="button" onClick={() => setShowDeleteModal(false)} disabled={deleting} aria-label="Close dialog" className="rounded-lg p-1.5 text-erp-text-secondary hover:bg-erp-hover disabled:opacity-50">
                <X size={17} />
              </button>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setShowDeleteModal(false)} disabled={deleting} className={`${buttonBase} border border-erp-border bg-erp-surface hover:bg-erp-hover`}>
                Cancel
              </button>

              <button type="button" onClick={handleDelete} disabled={deleting} className={`${buttonBase} bg-red-600 text-white hover:bg-red-700`}>
                {deleting ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}

                {deleting ? 'Deleting...' : 'Delete Category'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
