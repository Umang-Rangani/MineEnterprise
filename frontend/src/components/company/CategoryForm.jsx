import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FolderTree, LoaderCircle, Save, Tag, FileText, CheckCircle2, AlertCircle, Eye } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import Loading from '../Loading/Loading'
import { hasPermission, useAuth } from '../../context/AuthContext'

export default function CategoryForm() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams()

  const isEdit = Boolean(id)

  const { permissions } = useAuth()

  const canCreate = hasPermission(permissions, 'category:create')
  const canUpdate = hasPermission(permissions, 'category:update')
  const canUpdateStatus = hasPermission(permissions, 'category:update-status')
  const canView = hasPermission(permissions, 'category:view')

  const hasFormPermission = isEdit ? canView && (canUpdate || canUpdateStatus) : canCreate

  const [form, setForm] = useState({
    name: '',
    code: '',
    description: '',
    status: 'Active',
  })

  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')
  const [toast, setToast] = useState(null)

  const openDetailsPage = () => {
    if (!id) return
    navigate(`/company/categories/${id}`)
  }

  const items = [
    { title: 'Categories', link: '/company/categories' },
    {
      title: isEdit ? 'Edit Category' : 'Create Category',
      link: null,
    },
  ]

  useEffect(() => {
    document.title = `${isEdit ? 'Edit Category' : 'Create Category'} | MineERP`
  }, [isEdit])

  useEffect(() => {
    let active = true

    async function loadCategory() {
      if (!isEdit) {
        setLoading(false)
        return
      }

      setLoading(true)
      setApiError('')

      try {
        const { data } = await axiosInstance.get(`/erp/categories/${id}`)

        if (data.success === false) {
          throw new Error(data.message || 'Unable to load category.')
        }

        if (!active) return

        const category = data.category

        if (!category) {
          throw new Error('Category not found.')
        }

        setForm({
          name: category.name || '',
          code: category.code || '',
          description: category.description || '',
          status: category.status || 'Active',
        })
      } catch (error) {
        if (active) {
          setApiError(error.response?.data?.message || error.message || 'Unable to load category.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadCategory()

    return () => {
      active = false
    }
  }, [id, isEdit])

  function goBack() {
    navigate('/company/categories')
  }

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))

    setErrors((current) => ({
      ...current,
      [field]: '',
    }))

    setApiError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (saving) return

    const nextErrors = {}
    const name = form.name.trim()
    const code = form.code.trim().toUpperCase()
    const description = form.description.trim()

    if (!name) {
      nextErrors.name = 'Category name is required.'
    } else if (name.length > 100) {
      nextErrors.name = 'Category name cannot exceed 100 characters.'
    }

    if (code.length > 30) {
      nextErrors.code = 'Category code cannot exceed 30 characters.'
    }

    if (description.length > 1000) {
      nextErrors.description = 'Description cannot exceed 1000 characters.'
    }

    setErrors(nextErrors)
    setApiError('')

    if (Object.keys(nextErrors).length > 0) return

    setSaving(true)

    try {
      const payload = {
        name,
        code,
        description,
        status: form.status,
      }

      const response = isEdit ? await axiosInstance.patch(`/erp/categories/${id}`, payload) : await axiosInstance.post('/erp/categories', payload)

      if (response.data.success === false) {
        throw new Error(response.data.message || 'Unable to save category.')
      }

      navigate('/company/categories', {
        replace: true,
        state: {
          successMessage: response.data.message || (isEdit ? 'Category updated successfully.' : 'Category created successfully.'),
        },
      })
    } catch (error) {
      setApiError(error.response?.data?.message || error.message || 'Something went wrong while saving the category.')
    } finally {
      setSaving(false)
    }
  }

  if (!hasFormPermission) {
    return (
      <div className="min-w-0 rounded-xl border border-rose-200 bg-white p-6 text-center">
        <h2 className="text-base font-semibold text-slate-800">Access Denied</h2>

        <p className="mt-2 text-sm text-slate-500">{isEdit ? 'You do not have permission to edit categories.' : 'You do not have permission to create categories.'}</p>

        <button type="button" onClick={() => navigate('/company/categories', { replace: true })} className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-erp-primary px-4 text-xs font-semibold text-white hover:bg-erp-primary-hover">
          <ArrowLeft size={14} />
          Back to Categories
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-w-0 space-y-3">
        <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="h-1 bg-erp-primary" />
          <div className="flex h-[calc(100%-4px)] items-center px-4 sm:px-5">
            <BreadCrumb items={items} />
          </div>
        </section>

        <Loading label="Loading category..." description="Preparing category information..." />
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-4 text-sm">
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        <div className="h-1 bg-erp-primary" />

        <div className="flex h-[calc(100%-4px)] min-w-0 items-center justify-between gap-3 px-4 sm:px-5">
          <div className="min-w-0 flex-1 overflow-hidden">
            <BreadCrumb items={items} />
          </div>

          {/* {isEdit && canView && (
            <button
              type="button"
              onClick={openDetailsPage}
              title="View category"
              aria-label="View category"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-erp-primary/30 hover:bg-erp-primary/5 hover:text-erp-primary"
            >
              <Eye size={15} />
            </button>
          )} */}

          {isEdit && canView  && (
            <button
              type="button"
              onClick={openDetailsPage}
              title="View category"
              aria-label="View category"
              className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-erp-border bg-erp-surface px-3 text-xs font-semibold text-erp-primary transition hover:bg-erp-primary/5"
            >
              <Eye size={16} />
              <span>View</span>
            </button>
          )}
        </div>
      </section>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Basic Information */}
        <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex items-center gap-2 border-b border-erp-border px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
              <Tag size={16} />
            </div>

            <div>
              <h2 className="text-sm font-bold text-erp-text">Basic Information</h2>
              <p className="text-[11px] text-erp-text-secondary">Enter the category name and identification details.</p>
            </div>
          </div>

          <div className="grid gap-3 p-3 sm:grid-cols-2">
            {/* Category Name */}
            <div className="min-w-0 space-y-1">
              <label htmlFor="category-name" className="block text-xs font-semibold text-erp-text-secondary">
                Category Name <span className="text-erp-danger">*</span>
              </label>

              <input
                id="category-name"
                autoFocus
                required
                maxLength={100}
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
                placeholder="e.g. Electronics"
                disabled={saving}
                className={`h-10 w-full rounded-lg border bg-erp-surface px-3 text-xs text-erp-text outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10 ${errors.name ? 'border-red-400' : 'border-erp-border'}`}
              />

              {errors.name && <p className="text-[11px] text-red-600">{errors.name}</p>}

              <p className="text-right text-[10px] text-erp-text-muted">{form.name.length}/100</p>
            </div>

            {/* Category Code */}
            <div className="min-w-0 space-y-1">
              <label htmlFor="category-code" className="block text-xs font-semibold text-erp-text-secondary">
                Category Code
              </label>

              <input
                id="category-code"
                maxLength={30}
                value={form.code}
                onChange={(event) => updateField('code', event.target.value.toUpperCase())}
                placeholder="e.g. ELEC-001"
                disabled={saving}
                className={`h-10 w-full rounded-lg border bg-erp-surface px-3 text-xs uppercase text-erp-text outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10 ${
                  errors.code ? 'border-red-400' : 'border-erp-border'
                }`}
              />

              {errors.code && <p className="text-[11px] text-red-600">{errors.code}</p>}

              <p className="text-[10px] text-erp-text-muted">Optional unique identifier for this category.</p>
            </div>

            {/* Description */}
            <div className="min-w-0 space-y-1 sm:col-span-2">
              <label htmlFor="category-description" className="block text-xs font-semibold text-erp-text-secondary">
                Description
              </label>

              <textarea
                id="category-description"
                rows={3}
                maxLength={1000}
                value={form.description}
                onChange={(event) => updateField('description', event.target.value)}
                placeholder="Describe the products that belong to this category..."
                disabled={saving}
                className={`w-full resize-y rounded-lg border bg-erp-surface px-3 py-2.5 text-xs text-erp-text outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10 ${
                  errors.description ? 'border-red-400' : 'border-erp-border'
                }`}
              />

              {errors.description && <p className="text-[11px] text-red-600">{errors.description}</p>}

              <p className="text-right text-[10px] text-erp-text-muted">{form.description.length}/1000</p>
            </div>
          </div>
        </section>

        {/* Status */}
        <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex items-center gap-2 border-b border-erp-border px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
              <CheckCircle2 size={16} />
            </div>

            <div>
              <h2 className="text-sm font-bold text-erp-text">Category Status</h2>
              <p className="text-[11px] text-erp-text-secondary">Control whether this category is active.</p>
            </div>
          </div>

          <div className="grid gap-3 p-3 sm:grid-cols-2">
            <div className="min-w-0 space-y-1">
              <label htmlFor="category-status" className="block text-xs font-semibold text-erp-text-secondary">
                Status
              </label>
              <select
                id="category-status"
                value={form.status}
                onChange={(event) => updateField('status', event.target.value)}
                disabled={saving || (isEdit ? !canUpdateStatus : !canCreate)}
                className="h-10 w-full rounded-lg border border-erp-border bg-erp-surface px-3 text-xs text-erp-text outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50/70 px-3 py-2.5 text-xs text-blue-800">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />

              <p className="leading-5">{form.status === 'Active' ? 'Active categories are available for normal category selection.' : 'Inactive categories are retained but marked as unavailable for normal use.'}</p>
            </div>
          </div>
        </section>

        {/* API error */}
        {apiError && (
          <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <p>{apiError}</p>
          </div>
        )}

        {/* Sticky Footer */}
        <footer className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-erp-border bg-erp-surface/95 p-2.5 shadow-sm backdrop-blur">
          <div className="hidden min-w-0 sm:block">
            <p className="text-xs font-semibold text-erp-text">{isEdit ? 'Update category details' : 'Ready to create category'}</p>

            <p className="mt-0.5 text-[10px] text-erp-text-secondary">Review the information before saving.</p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={goBack}
              disabled={saving}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-erp-border bg-erp-surface px-3 text-xs font-semibold text-erp-text-secondary transition hover:bg-erp-hover disabled:opacity-50"
            >
              <ArrowLeft size={14} />
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-erp-primary px-4 text-xs font-bold text-white transition hover:bg-erp-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}

              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Category'}
            </button>
          </div>
        </footer>
      </form>
    </div>
  )
}
