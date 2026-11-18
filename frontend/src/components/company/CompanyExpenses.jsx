import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Eye, Pencil, Receipt, CheckCircle2, RefreshCw, FilterX, AlertCircle, LoaderCircle, CalendarDays, ChevronLeft, ChevronRight, IndianRupee, Download, Trash2, Check, FileText } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import Loading from '../Loading/Loading'
import TrashBox from '../../TrashBox/TrashBox'
import { hasPermission, useAuth } from '../../context/AuthContext'

const statusStyles = {
  Draft: 'border-amber-200 bg-amber-50 text-amber-700',
  Approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
}

const formatNumber = (value) =>
  new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)

const formatCurrency = (value) => `₹${formatNumber(value)}`

const formatDate = (value) => {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function getExpenseArray(response) {
  const data = response?.data

  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.expenses)) return data.expenses
  if (Array.isArray(data?.data?.expenses)) return data.data.expenses

  return []
}

function getExpenseStatusColor(status) {
  return statusStyles[status] || statusStyles.Draft
}

export default function CompanyExpenses() {
  const { permissions } = useAuth()

  const canCreate = hasPermission(permissions, 'expense:create')
  const canView = hasPermission(permissions, 'expense:view')
  const canUpdate = hasPermission(permissions, 'expense:update')
  const canApprove = hasPermission(permissions, 'expense:approve')
  const canDelete = hasPermission(permissions, 'expense:delete')

  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [apiError, setApiError] = useState('')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [refreshKey, setRefreshKey] = useState(0)

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  })

  const [toast, setToast] = useState(null)
  const [processingId, setProcessingId] = useState('')

  // TRASHBOX STATE

  const [actionModal, setActionModal] = useState({
    isOpen: false,
    type: '',
    expense: null,
  })

  const breadcrumbItems = [{ title: 'Expenses', link: null }]

  const showToast = (type, message) => {
    setToast({
      id: Date.now(),
      type,
      message,
      duration: 3000,
    })
  }

  useEffect(() => {
    document.title = 'Expenses | MineERP'
  }, [])

  // FETCH EXPENSES

  useEffect(() => {
    let cancelled = false

    async function fetchExpenses() {
      const isInitialLoad = !hasLoaded

      if (isInitialLoad) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }

      setApiError('')

      try {
        const response = await axiosInstance.get('/erp/expenses', {
          params: {
            page: currentPage,
            limit: pageSize,
            status: statusFilter === 'All' ? undefined : statusFilter,
          },
        })

        const data = response.data

        if (data?.success === false) {
          throw new Error(data.message || 'Unable to load expenses.')
        }

        if (cancelled) return

        const list = getExpenseArray(response)

        setExpenses(list)

        const serverPagination = data?.pagination || data?.data?.pagination

        if (serverPagination) {
          setPagination({
            page: Number(serverPagination.page) || currentPage,
            limit: Number(serverPagination.limit) || pageSize,
            total: Number(serverPagination.total) || 0,
            totalPages: Math.max(1, Number(serverPagination.totalPages) || 1),
          })
        } else {
          setPagination({
            page: currentPage,
            limit: pageSize,
            total: list.length,
            totalPages: 1,
          })
        }

        setHasLoaded(true)
      } catch (error) {
        if (cancelled) return

        setApiError(error.response?.data?.message || error.message || 'Unable to load expenses.')
      } finally {
        if (!cancelled) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    }

    fetchExpenses()

    return () => {
      cancelled = true
    }
  }, [currentPage, pageSize, statusFilter, refreshKey])

  // PAGE VALIDATION

  useEffect(() => {
    if (currentPage > pagination.totalPages) {
      setCurrentPage(Math.max(1, pagination.totalPages))
    }
  }, [currentPage, pagination.totalPages])

  // SEARCH

  const filteredExpenses = expenses.filter((expense) => {
    const query = search.trim().toLowerCase()

    if (!query) return true

    const searchableValues = [expense.expenseNumber, expense.expenseCategory, expense.title, expense.description, expense.paymentMode, expense.transactionReference, expense.receiptNumber, expense.status]

    return searchableValues.some((value) =>
      String(value || '')
        .toLowerCase()
        .includes(query),
    )
  })

  // PAGE STATISTICS

  const draftOnPage = expenses.filter((expense) => expense.status === 'Draft').length

  const approvedOnPage = expenses.filter((expense) => expense.status === 'Approved').length

  const totalAmountOnPage = expenses.reduce((total, expense) => total + Number(expense.totalAmount || 0), 0)

  const hasActiveFilters = Boolean(search.trim()) || statusFilter !== 'All'

  const totalPages = Math.max(1, pagination.totalPages)
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * pageSize

  const resetFilters = () => {
    setSearch('')
    setStatusFilter('All')
    setCurrentPage(1)
  }

  // REFRESH

  const handleRefresh = () => {
    if (refreshing || loading || processingId) return

    setRefreshing(true)
    setRefreshKey((previous) => previous + 1)
  }

  // OPEN / CLOSE ACTION MODAL

  const openActionModal = (type, expense) => {
    if (processingId) return

    setActionModal({
      isOpen: true,
      type,
      expense,
    })
  }

  const closeActionModal = () => {
    if (processingId) return

    setActionModal({
      isOpen: false,
      type: '',
      expense: null,
    })
  }

  // APPROVE / DELETE ACTION

  const handleConfirmAction = async () => {
    const expense = actionModal.expense
    const actionType = actionModal.type

    if (!expense?._id || processingId) return

    const expenseId = String(expense._id)

    if (expense.status !== 'Draft') {
      closeActionModal()
      showToast('error', 'Only draft expenses can be modified.')
      return
    }

    if (actionType !== 'approve' && actionType !== 'delete') return

    setProcessingId(expenseId)

    try {
      if (actionType === 'approve') {
        const response = await axiosInstance.patch(`/erp/expenses/${encodeURIComponent(expenseId)}/approve`)

        if (response.data?.success === false) {
          throw new Error(response.data.message || 'Unable to approve expense.')
        }

        showToast('success', 'Expense approved successfully.')
      }

      if (actionType === 'delete') {
        const response = await axiosInstance.delete(`/erp/expenses/${encodeURIComponent(expenseId)}`)

        if (response.data?.success === false) {
          throw new Error(response.data.message || 'Unable to delete expense.')
        }

        showToast('success', 'Expense deleted successfully.')
      }

      setActionModal({
        isOpen: false,
        type: '',
        expense: null,
      })

      if (actionType === 'delete' && expenses.length === 1 && currentPage > 1) {
        setCurrentPage((page) => Math.max(1, page - 1))
      } else {
        setRefreshKey((previous) => previous + 1)
      }
    } catch (error) {
      showToast('error', error.response?.data?.message || error.message || `Unable to ${actionType} expense.`)
    } finally {
      setProcessingId('')
    }
  }

  // DOWNLOAD RECEIPT

  const handleDownloadReceipt = async (expense) => {
    const expenseId = String(expense._id)

    if (!expenseId || processingId || !expense.receiptFile?.filename) return

    setProcessingId(expenseId)

    try {
      const response = await axiosInstance.get(`/erp/expenses/${encodeURIComponent(expenseId)}/receipt`, {
        responseType: 'blob',
      })

      const contentType = response.headers?.['content-type'] || expense.receiptFile.mimeType || 'application/octet-stream'

      const blob = new Blob([response.data], {
        type: contentType,
      })

      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')

      const originalName = expense.receiptFile.originalName
      const extension = contentType === 'application/pdf' ? '.pdf' : contentType === 'image/png' ? '.png' : '.jpg'

      const filename = originalName || `${expense.expenseNumber || 'Expense-Receipt'}${extension}`

      link.href = url
      link.download = filename

      document.body.appendChild(link)
      link.click()
      link.remove()

      window.URL.revokeObjectURL(url)

      showToast('success', 'Expense receipt downloaded successfully.')
    } catch (error) {
      let message = 'Unable to download expense receipt.'

      if (error.response?.data instanceof Blob) {
        try {
          const errorData = JSON.parse(await error.response.data.text())
          message = errorData.message || message
        } catch {
          message = 'Unable to download expense receipt.'
        }
      } else {
        message = error.response?.data?.message || error.message || message
      }

      showToast('error', message)
    } finally {
      setProcessingId('')
    }
  }

  // STATISTICS

  const statCards = [
    {
      title: 'Total Expenses',
      value: pagination.total,
      icon: Receipt,
      color: 'text-violet-700',
      border: 'border-violet-200',
    },
    {
      title: 'Draft on Page',
      value: draftOnPage,
      icon: FileText,
      color: 'text-amber-700',
      border: 'border-amber-200',
    },
    {
      title: 'Approved on Page',
      value: approvedOnPage,
      icon: CheckCircle2,
      color: 'text-emerald-700',
      border: 'border-emerald-200',
    },
    {
      title: 'Total Amount on Page',
      value: formatCurrency(totalAmountOnPage),
      icon: IndianRupee,
      color: 'text-blue-700',
      border: 'border-blue-200',
    },
  ]

  // DESKTOP ACTIONS

  const renderExpenseActions = (expense) => {
    const expenseId = String(expense._id)
    const isProcessing = processingId === expenseId

    return (
      <div className="flex items-center justify-end gap-1">
        {canView && (
          <Link to={`/company/expenses/${expenseId}`} title="View expense" aria-label={`View ${expense.expenseNumber || 'expense'}`} className="rounded-lg p-2 text-slate-500 hover:bg-erp-primary-light hover:text-erp-primary">
            <Eye size={15} />
          </Link>
        )}

        {canUpdate && expense.status === 'Draft' && (
          <Link to={`/company/expenses/${expenseId}/edit`} title="Edit expense" aria-label={`Edit ${expense.expenseNumber || 'expense'}`} className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-600">
            <Pencil size={15} />
          </Link>
        )}

        {canApprove && expense.status === 'Draft' && (
          <button
            type="button"
            title="Approve expense"
            aria-label={`Approve ${expense.expenseNumber || 'expense'}`}
            disabled={Boolean(processingId)}
            onClick={() => openActionModal('approve', expense)}
            className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
          >
            {isProcessing ? <LoaderCircle size={15} className="animate-spin" /> : <Check size={15} />}
          </button>
        )}

        {canDelete && expense.status === 'Draft' && (
          <button
            type="button"
            title="Delete expense"
            aria-label={`Delete ${expense.expenseNumber || 'expense'}`}
            disabled={Boolean(processingId)}
            onClick={() => openActionModal('delete', expense)}
            className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
          >
            <Trash2 size={15} />
          </button>
        )}

        {canView && expense.receiptFile?.filename && (
          <button
            type="button"
            title="Download receipt"
            aria-label={`Download receipt for ${expense.expenseNumber || 'expense'}`}
            disabled={Boolean(processingId)}
            onClick={() => handleDownloadReceipt(expense)}
            className="rounded-lg p-2 text-violet-600 hover:bg-violet-50 disabled:opacity-50"
          >
            {isProcessing ? <LoaderCircle size={15} className="animate-spin" /> : <Download size={15} />}
          </button>
        )}
      </div>
    )
  }

  // INITIAL LOADING

  if (loading && !hasLoaded) {
    return (
      <div className="min-w-0 space-y-4 text-sm">
        <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="h-1 bg-erp-primary" />

          <div className="flex min-h-16 items-center px-4 sm:px-5">
            <BreadCrumb items={breadcrumbItems} />
          </div>
        </section>

        <section className="relative min-h-[480px] overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex min-h-[480px] items-center justify-center">
            <Loading fullScreen={false} label="Loading expenses" description="Please wait while we load your company's expenses." className="!h-full min-h-[480px]" />
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-4 pb-8 text-sm">
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      {/* TRASHBOX */}

      <TrashBox
        isOpen={actionModal.isOpen}
        onClose={closeActionModal}
        title={actionModal.type === 'approve' ? 'Approve Expense' : 'Delete Expense'}
        message={actionModal.type === 'approve' ? `Are you sure you want to approve ${actionModal.expense?.expenseNumber || 'this expense'}?` : `Are you sure you want to delete ${actionModal.expense?.expenseNumber || 'this expense'}?`}
        warningText={actionModal.type === 'approve' ? 'Once approved, this expense cannot be edited.' : 'This expense will be moved to deleted records.'}
        actionButtonText={actionModal.type === 'approve' ? 'Approve Expense' : 'Delete Expense'}
        cancelButtonText="Cancel"
        variant={actionModal.type === 'approve' ? 'activate' : 'delete'}
        onAction={handleConfirmAction}
        isProcessing={Boolean(processingId)}
      />

      {/* HEADER */}

      <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        <div className="h-1 bg-erp-primary" />

        <div className="flex flex-col justify-between gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-5">
          <BreadCrumb items={breadcrumbItems} />

          <div className="flex items-center gap-2">
            {statCards.map((card) => {
              const Icon = card.icon

              return (
                <div key={card.title} title={card.title} className={`flex h-9 items-center gap-2 whitespace-nowrap rounded-lg border ${card.border} px-3`}>
                  <Icon size={15} className={card.color} />

                  <span className={`hidden text-xs font-medium lg:inline ${card.color}`}>{card.title}</span>

                  <span className="text-sm font-bold text-erp-text">{card.value}</span>
                </div>
              )
            })}

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing || loading || Boolean(processingId)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-erp-border px-3 text-xs font-semibold text-erp-text-secondary hover:bg-erp-hover disabled:opacity-60"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>

            {canCreate && (
              <Link
                to="/company/expenses/new"
                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-erp-primary px-3.5 text-xs font-semibold text-white transition hover:bg-erp-primary-hover focus:outline-none focus:ring-2 focus:ring-erp-primary/30 focus:ring-offset-1"
              >
                <Plus size={15} />
                Add Expense
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* API ERROR */}

      {apiError && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />

          <p>{apiError}</p>

          <button type="button" onClick={handleRefresh} disabled={refreshing} className="ml-auto shrink-0 font-semibold underline disabled:opacity-50">
            Retry
          </button>
        </div>
      )}

      {/* EXPENSES TABLE */}

      <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        {/* FILTERS */}

        <div className="flex flex-col gap-3 border-b border-erp-border p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 gap-2">
            <div className="relative min-w-0 flex-1 lg:w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setCurrentPage(1)
                }}
                placeholder="Search expense, category or reference..."
                aria-label="Search expenses"
                className="h-9 w-full rounded-lg border border-erp-border bg-erp-surface pl-9 pr-3 text-xs text-erp-text outline-none focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10 sm:text-sm"
              />
            </div>

            {hasActiveFilters && (
              <button type="button" onClick={resetFilters} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-erp-border px-3 text-xs font-semibold text-erp-text-secondary hover:bg-erp-hover">
                <FilterX size={14} />
                Clear
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value)
                setCurrentPage(1)
              }}
              aria-label="Filter expense status"
              className="h-9 min-w-40 rounded-lg border border-erp-border bg-erp-surface px-3 text-xs text-erp-text outline-none focus:border-erp-primary sm:text-sm"
            >
              <option value="All">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Approved">Approved</option>
            </select>
          </div>
        </div>

        {/* REFRESH STATUS */}

        {refreshing && hasLoaded && (
          <div className="flex items-center justify-center gap-2 border-b border-erp-border px-4 py-3 text-xs text-erp-muted">
            <LoaderCircle size={15} className="animate-spin text-erp-primary" />
            Updating expense list...
          </div>
        )}

        {/* SEARCH SCOPE NOTE */}

        {search.trim() && <div className="border-b border-erp-border bg-slate-50/70 px-4 py-2 text-xs text-erp-text-secondary">Showing matches from the currently loaded page only.</div>}

        {/* DESKTOP TABLE */}

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[1050px] text-left">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-100">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Expense</th>

                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Category</th>

                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Expense Date</th>

                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Payment Mode</th>

                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Amount</th>

                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Tax</th>

                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Amount</th>

                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</th>

                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.map((expense) => (
                <tr key={expense._id} className="transition hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-erp-primary-light text-erp-primary">
                        <Receipt size={17} />
                      </div>

                      <div className="min-w-0">
                        <p className="max-w-44 truncate text-xs font-semibold text-erp-text sm:text-sm">{expense.expenseNumber || '—'}</p>

                        <p className="mt-0.5 max-w-44 truncate text-[10px] text-erp-muted">{expense.title || 'Untitled expense'}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <p className="max-w-40 truncate text-xs font-medium text-erp-text">{expense.expenseCategory || '—'}</p>

                    {expense.receiptNumber && <p className="mt-0.5 text-[10px] text-erp-muted">Receipt: {expense.receiptNumber}</p>}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 whitespace-nowrap text-xs text-slate-600">
                      <CalendarDays size={13} className="shrink-0 text-slate-400" />
                      {formatDate(expense.expenseDate)}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <p className="whitespace-nowrap text-xs text-slate-600">{expense.paymentMode || '—'}</p>
                  </td>

                  <td className="px-4 py-3 text-right">
                    <p className="whitespace-nowrap text-xs font-semibold text-erp-text">{formatCurrency(expense.amount)}</p>
                  </td>

                  <td className="px-4 py-3 text-right">
                    <p className="whitespace-nowrap text-xs text-slate-600">{formatCurrency(expense.taxAmount)}</p>

                    <p className="mt-0.5 whitespace-nowrap text-[10px] text-erp-muted">{formatNumber(expense.taxRate)}%</p>
                  </td>

                  <td className="px-4 py-3 text-right">
                    <p className="whitespace-nowrap text-xs font-semibold text-erp-text">{formatCurrency(expense.totalAmount)}</p>
                  </td>

                  <td className="px-4 py-3">
                    <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-1 text-[10px] font-semibold ${getExpenseStatusColor(expense.status)}`}>{expense.status || 'Draft'}</span>
                  </td>

                  <td className="px-4 py-3">{renderExpenseActions(expense)}</td>
                </tr>
              ))}

              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-14 text-center">
                    <Receipt size={26} className="mx-auto text-slate-400" />

                    <h3 className="mt-3 text-sm font-bold text-erp-text">No expenses found</h3>

                    <p className="mt-1 text-xs text-erp-muted">{hasActiveFilters ? 'Try changing your search or status filter.' : 'No expenses have been recorded yet.'}</p>

                    {!hasActiveFilters && canCreate && (
                      <Link to="/company/expenses/new" className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-erp-primary px-3.5 text-xs font-semibold text-white hover:bg-erp-primary-hover">
                        <Plus size={14} />
                        Add First Expense
                      </Link>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE EXPENSES */}

        <div className="divide-y divide-slate-100 md:hidden">
          {filteredExpenses.map((expense) => {
            const expenseId = String(expense._id)
            const isProcessing = processingId === expenseId

            return (
              <article key={expense._id} className="space-y-3 p-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">
                    <Receipt size={19} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="break-words text-sm font-semibold text-erp-text">{expense.expenseNumber || 'Expense'}</h3>

                    <p className="mt-1 break-words text-xs text-erp-muted">{expense.title || '—'}</p>

                    <p className="mt-1 break-words text-xs text-slate-600">{expense.expenseCategory || '—'}</p>
                  </div>

                  <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold ${getExpenseStatusColor(expense.status)}`}>{expense.status || 'Draft'}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3">
                  <div>
                    <p className="text-[10px] text-slate-500">Expense Date</p>

                    <p className="mt-1 text-xs font-medium text-slate-700">{formatDate(expense.expenseDate)}</p>
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-500">Payment Mode</p>

                    <p className="mt-1 text-xs font-medium text-slate-700">{expense.paymentMode || '—'}</p>
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-500">Amount</p>

                    <p className="mt-1 text-xs font-semibold text-erp-text">{formatCurrency(expense.amount)}</p>
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-500">Tax Amount</p>

                    <p className="mt-1 text-xs font-semibold text-slate-700">{formatCurrency(expense.taxAmount)}</p>
                  </div>

                  <div className="col-span-2 border-t border-slate-200 pt-2">
                    <p className="text-[10px] text-slate-500">Total Amount</p>

                    <p className="mt-1 text-sm font-bold text-erp-text">{formatCurrency(expense.totalAmount)}</p>
                  </div>
                </div>

                {expense.transactionReference && <p className="break-all text-[10px] text-erp-muted">Reference: {expense.transactionReference}</p>}

                <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
                  {canView && (
                    <Link to={`/company/expenses/${expenseId}`} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-erp-border text-xs font-semibold text-slate-700 hover:bg-erp-hover">
                      <Eye size={14} />
                      View
                    </Link>
                  )}

                  {canUpdate && expense.status === 'Draft' && (
                    <Link to={`/company/expenses/${expenseId}/edit`} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-erp-border text-xs font-semibold text-slate-700 hover:bg-erp-hover">
                      <Pencil size={14} />
                      Edit
                    </Link>
                  )}

                  {canApprove && expense.status === 'Draft' && (
                    <button
                      type="button"
                      onClick={() => openActionModal('approve', expense)}
                      disabled={Boolean(processingId)}
                      className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                    >
                      {isProcessing ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />}
                      Approve
                    </button>
                  )}

                  {canDelete && expense.status === 'Draft' && (
                    <button
                      type="button"
                      onClick={() => openActionModal('delete', expense)}
                      disabled={Boolean(processingId)}
                      className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-rose-200 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  )}

                  {canView && expense.receiptFile?.filename && (
                    <button
                      type="button"
                      onClick={() => handleDownloadReceipt(expense)}
                      disabled={Boolean(processingId)}
                      className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-violet-200 text-xs font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-50"
                    >
                      {isProcessing ? <LoaderCircle size={14} className="animate-spin" /> : <Download size={14} />}
                      Receipt
                    </button>
                  )}
                </div>
              </article>
            )
          })}

          {filteredExpenses.length === 0 && (
            <div className="px-4 py-12 text-center">
              <Receipt size={26} className="mx-auto text-slate-400" />

              <h3 className="mt-3 font-semibold text-erp-text">No expenses found</h3>

              <p className="mt-1 text-xs text-erp-muted">{hasActiveFilters ? 'Try changing your search or status filter.' : 'No expenses have been recorded yet.'}</p>

              {!hasActiveFilters && canCreate && (
                <Link to="/company/expenses/new" className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-erp-primary px-3.5 text-xs font-semibold text-white hover:bg-erp-primary-hover">
                  <Plus size={14} />
                  Add First Expense
                </Link>
              )}
            </div>
          )}
        </div>

        {/* PAGINATION */}

        <div className="flex flex-col gap-3 border-t border-erp-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs text-erp-text-secondary sm:text-sm">
              {search.trim() ? (
                <>
                  <span className="font-semibold text-erp-text">{formatNumber(filteredExpenses.length)}</span> matching on this page
                  <span className="ml-1 text-erp-muted">
                    (page {safePage} of {totalPages})
                  </span>
                </>
              ) : (
                <>
                  Showing <span className="font-semibold text-erp-text">{pagination.total === 0 ? '0' : `${startIndex + 1}–${Math.min(startIndex + expenses.length, pagination.total)}`}</span> of{' '}
                  <span className="font-semibold text-erp-text">{formatNumber(pagination.total)}</span> expenses
                </>
              )}
            </p>

            <div className="flex items-center gap-2">
              <label htmlFor="expense-page-size" className="whitespace-nowrap text-xs text-erp-text-secondary">
                Rows:
              </label>

              <select
                id="expense-page-size"
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value))
                  setCurrentPage(1)
                }}
                disabled={loading || refreshing}
                className="h-8 rounded-lg border border-erp-border bg-erp-surface px-2 text-xs text-erp-text-secondary outline-none focus:border-erp-primary disabled:opacity-50"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              disabled={safePage <= 1 || loading || refreshing}
              onClick={() => setCurrentPage(1)}
              className="flex h-8 items-center justify-center rounded-lg border border-erp-border px-2 text-xs text-erp-text-secondary transition hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              First
            </button>

            <button
              type="button"
              disabled={safePage <= 1 || loading || refreshing}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              aria-label="Previous page"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-erp-border text-erp-text-secondary transition hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>

            <span className="min-w-20 px-1 text-center text-xs text-erp-text-secondary sm:text-sm">
              Page {safePage} of {totalPages}
            </span>

            <button
              type="button"
              disabled={safePage >= totalPages || loading || refreshing}
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              aria-label="Next page"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-erp-border text-erp-text-secondary transition hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>

            <button
              type="button"
              disabled={safePage >= totalPages || loading || refreshing}
              onClick={() => setCurrentPage(totalPages)}
              className="flex h-8 items-center justify-center rounded-lg border border-erp-border px-2 text-xs text-erp-text-secondary transition hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              Last
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
