import { useCallback, useEffect, useState } from 'react'
import { Search, Plus, Tags, Pencil, Trash2, X, RefreshCw, ChevronLeft, ChevronRight, AlertCircle, Filter, Eye } from 'lucide-react'
import axiosInstance from '../../api/axiosInstance'

const initialForm = {
  name: '',
  code: '',
  description: '',
  status: 'Active',
}

export default function CompanyCategories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  })
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [form, setForm] = useState(initialForm)
  const [deleteCategory, setDeleteCategory] = useState(null)
  const [viewCategory, setViewCategory] = useState(null)

  const loadCategories = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await axiosInstance.get('/erp/categories', {
        params: {
          page,
          limit: 10,
          search: search.trim() || undefined,
          status: statusFilter || undefined,
        },
      })

      const data = response.data
      setCategories(data.categories || data.data?.categories || [])
      setPagination(
        data.pagination || {
          page,
          limit: 10,
          total: data.total || 0,
          totalPages: data.totalPages || 1,
        },
      )
    } catch (err) {
      setError(err.response?.data?.message)
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  useEffect(() => {
    if (!success) return

    const timeout = setTimeout(() => setSuccess(''), 3000)
    return () => clearTimeout(timeout)
  }, [success])

  const openCreateModal = () => {
    setEditingCategory(null)
    setForm(initialForm)
    setError('')
    setModalOpen(true)
  }

  const openEditModal = (category) => {
    setEditingCategory(category)
    setForm({
      name: category.name || '',
      code: category.code || '',
      description: category.description || '',
      status: category.status || 'Active',
    })
    setError('')
    setModalOpen(true)
  }

  const handleFormChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    const payload = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      description: form.description.trim(),
      status: form.status,
    }

    try {
      if (editingCategory) {
        await axiosInstance.patch(`/erp/categories/${editingCategory._id}`, payload)
        setSuccess('Category successfully updated.')
      } else {
        await axiosInstance.post('/erp/categories', payload)
        setSuccess('Category successfully created.')
      }

      setModalOpen(false)
      setEditingCategory(null)
      setForm(initialForm)

      if (!editingCategory && page !== 1) {
        setPage(1)
      } else {
        await loadCategories()
      }
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteCategory) return

    setSaving(true)
    setError('')

    try {
      await axiosInstance.delete(`/erp/categories/${deleteCategory._id}`)

      setDeleteCategory(null)
      setSuccess('Category successfully deleted.')

      if (categories.length === 1 && page > 1) {
        setPage((current) => current - 1)
      } else {
        await loadCategories()
      }
    } catch (err) {
      setError(err.response?.data?.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-erp-muted">
            <Tags size={16} />
            <span>Inventory Management</span>
            <span>/</span>
            <span className="text-erp-text">Categories</span>
          </div>

          <h1 className="mt-2 text-2xl font-bold text-erp-text">Categories</h1>
          <p className="mt-1 text-sm text-erp-muted">Organize your products with categories and manage their status.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadCategories}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-erp-border bg-erp-surface px-4 py-2.5 text-sm font-medium text-erp-text transition hover:bg-erp-hover disabled:opacity-60"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button type="button" onClick={openCreateModal} className="inline-flex items-center justify-center gap-2 rounded-xl bg-erp-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-erp-primary-hover">
            <Plus size={17} />
            Add Category
          </button>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <Tags size={17} />
          {success}
        </div>
      )}

      {error && !modalOpen && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-erp-border bg-erp-surface p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-erp-muted">Total Categories</p>
              <p className="mt-2 text-2xl font-bold text-erp-text">{pagination.total ?? categories.length}</p>
            </div>
            <div className="rounded-xl bg-erp-primary-light p-3 text-erp-primary">
              <Tags size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-erp-border bg-erp-surface p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-erp-muted">Active on This Page</p>
              <p className="mt-2 text-2xl font-bold text-erp-text">{categories.filter((category) => category.status === 'Active').length}</p>
            </div>
            <div className="rounded-xl bg-green-50 p-3 text-green-700">
              <Tags size={22} />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-erp-border bg-erp-surface p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-erp-muted" />
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Search category name, code or description..."
              className="w-full rounded-xl border border-erp-border bg-erp-bg py-2.5 pl-10 pr-4 text-sm text-erp-text outline-none transition placeholder:text-erp-muted focus:border-erp-primary"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={17} className="shrink-0 text-erp-muted" />
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value)
                setPage(1)
              }}
              className="min-w-40 rounded-xl border border-erp-border bg-erp-surface px-3 py-2.5 text-sm text-erp-text outline-none focus:border-erp-primary"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-erp-border bg-erp-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-erp-border px-5 py-4">
          <div>
            <h2 className="font-semibold text-erp-text">Category Catalogue</h2>
            <p className="mt-1 text-xs text-erp-muted">{pagination.total ?? categories.length} category(s) found</p>
          </div>
          <span className="rounded-lg bg-erp-bg px-3 py-1.5 text-xs font-medium text-erp-muted">
            Page {pagination.page || page} of {pagination.totalPages || 1}
          </span>
        </div>

        {loading ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-erp-muted">
            <RefreshCw size={26} className="animate-spin text-erp-primary" />
            <p className="text-sm">Loading categories...</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
            <div className="rounded-2xl bg-erp-bg p-4 text-erp-muted">
              <Tags size={30} />
            </div>
            <h3 className="mt-4 font-semibold text-erp-text">No categories found</h3>
            <p className="mt-1 max-w-sm text-sm text-erp-muted">Add your first category or change your search and filters.</p>
            <button type="button" onClick={openCreateModal} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-erp-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-erp-primary-hover">
              <Plus size={16} />
              Add Category
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[750px] text-left">
                <thead className="bg-erp-bg text-xs uppercase tracking-wide text-erp-muted">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Category</th>
                    <th className="px-4 py-4 font-semibold">Code</th>
                    <th className="px-4 py-4 font-semibold">Description</th>
                    <th className="px-4 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 text-right font-semibold">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-erp-border">
                  {categories.map((category) => (
                    <tr key={category._id} className="transition hover:bg-erp-hover">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">
                            <Tags size={19} />
                          </div>
                          <span className="text-sm font-semibold text-erp-text">{category.name}</span>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-sm font-medium text-erp-text">{category.code || '—'}</td>

                      <td className="max-w-xs px-4 py-4 text-sm text-erp-muted">
                        <p className="truncate">{category.description || 'No description'}</p>
                      </td>

                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${category.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{category.status}</span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setViewCategory(category)}
                            title="View category"
                            className="rounded-lg border border-erp-border p-2 text-erp-muted transition hover:border-erp-primary hover:bg-erp-primary-light hover:text-erp-primary"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(category)}
                            title="Edit category"
                            className="rounded-lg border border-erp-border p-2 text-erp-muted transition hover:border-erp-primary hover:bg-erp-primary-light hover:text-erp-primary"
                          >
                            <Pencil size={16} />
                          </button>
                          <button type="button" onClick={() => setDeleteCategory(category)} title="Delete category" className="rounded-lg border border-erp-border p-2 text-erp-muted transition hover:border-red-200 hover:bg-red-50 hover:text-red-600">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-erp-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-erp-muted">
                Showing {categories.length} of {pagination.total ?? categories.length} categories
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-erp-border px-3 py-2 text-sm text-erp-text hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= (pagination.totalPages || 1)}
                  onClick={() => setPage((current) => Math.min(pagination.totalPages || 1, current + 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-erp-border px-3 py-2 text-sm text-erp-text hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-erp-border bg-erp-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-erp-border px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-lg font-bold text-erp-text">{editingCategory ? 'Edit Category' : 'Add Category'}</h2>
                <p className="mt-1 text-sm text-erp-muted">Enter the category details below.</p>
              </div>
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg p-2 text-erp-muted hover:bg-erp-hover hover:text-erp-text">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid max-h-[65vh] grid-cols-1 gap-4 overflow-y-auto p-5 sm:grid-cols-2 sm:p-6">
                {error && (
                  <div className="col-span-full flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle size={17} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <label className="space-y-1.5 text-sm font-medium text-erp-text">
                  Category Name *
                  <input
                    required
                    maxLength={100}
                    name="name"
                    value={form.name}
                    onChange={handleFormChange}
                    placeholder="e.g. Cricket Equipment"
                    className="w-full rounded-xl border border-erp-border bg-erp-surface px-3 py-2.5 font-normal outline-none focus:border-erp-primary"
                  />
                </label>

                <label className="space-y-1.5 text-sm font-medium text-erp-text">
                  Category Code
                  <input
                    maxLength={40}
                    name="code"
                    value={form.code}
                    onChange={handleFormChange}
                    placeholder="e.g. CRICKET"
                    className="w-full rounded-xl border border-erp-border bg-erp-surface px-3 py-2.5 font-normal uppercase outline-none focus:border-erp-primary"
                  />
                </label>

                <label className="space-y-1.5 text-sm font-medium text-erp-text sm:col-span-2">
                  Description
                  <textarea
                    rows={3}
                    maxLength={500}
                    name="description"
                    value={form.description}
                    onChange={handleFormChange}
                    placeholder="Describe this category..."
                    className="w-full resize-y rounded-xl border border-erp-border bg-erp-surface px-3 py-2.5 font-normal outline-none focus:border-erp-primary"
                  />
                </label>

                <label className="space-y-1.5 text-sm font-medium text-erp-text">
                  Status
                  <select name="status" value={form.status} onChange={handleFormChange} className="w-full rounded-xl border border-erp-border bg-erp-surface px-3 py-2.5 font-normal outline-none focus:border-erp-primary">
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </label>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-erp-border px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                <button type="button" onClick={() => setModalOpen(false)} disabled={saving} className="rounded-xl border border-erp-border px-5 py-2.5 text-sm font-semibold text-erp-text hover:bg-erp-hover disabled:opacity-60">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="rounded-xl bg-erp-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-erp-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
                  {saving ? 'Saving...' : editingCategory ? 'Update Category' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-erp-border bg-erp-surface p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <Trash2 size={22} />
            </div>
            <h2 className="mt-4 text-lg font-bold text-erp-text">Delete Category?</h2>
            <p className="mt-2 text-sm leading-6 text-erp-muted">
              Are you sure you want to delete <span className="font-semibold text-erp-text">{deleteCategory.name}</span>? Products linked to this category must be reassigned before it can be deleted.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteCategory(null)} disabled={saving} className="rounded-xl border border-erp-border px-4 py-2.5 text-sm font-semibold text-erp-text hover:bg-erp-hover disabled:opacity-60">
                Cancel
              </button>
              <button type="button" onClick={handleDelete} disabled={saving} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                {saving ? 'Deleting...' : 'Delete Category'}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-erp-border bg-erp-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-erp-border px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-lg font-bold text-erp-text">Category Details</h2>
                <p className="mt-1 text-sm text-erp-muted">Complete category information.</p>
              </div>
              <button type="button" onClick={() => setViewCategory(null)} className="rounded-lg p-2 text-erp-muted hover:bg-erp-hover hover:text-erp-text">
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 sm:p-6">
              {[
                ['Category Name', viewCategory.name],
                ['Category Code', viewCategory.code || '—'],
                ['Status', viewCategory.status || '—'],
                ['Created At', viewCategory.createdAt ? new Date(viewCategory.createdAt).toLocaleString('en-IN') : '—'],
                ['Updated At', viewCategory.updatedAt ? new Date(viewCategory.updatedAt).toLocaleString('en-IN') : '—'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-erp-border bg-erp-bg p-3">
                  <p className="text-xs font-medium text-erp-muted">{label}</p>
                  <p className="mt-1 break-words text-sm font-semibold text-erp-text">{value}</p>
                </div>
              ))}

              <div className="rounded-xl border border-erp-border bg-erp-bg p-3 sm:col-span-2">
                <p className="text-xs font-medium text-erp-muted">Description</p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-erp-text">{viewCategory.description || 'No description available.'}</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-erp-border px-5 py-4 sm:px-6">
              <button type="button" onClick={() => setViewCategory(null)} className="rounded-xl border border-erp-border px-5 py-2.5 text-sm font-semibold text-erp-text hover:bg-erp-hover">
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const category = viewCategory
                  setViewCategory(null)
                  openEditModal(category)
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-erp-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-erp-primary-hover"
              >
                <Pencil size={15} />
                Edit Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
