import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Pencil, RefreshCw, FilterX, AlertCircle, LoaderCircle, ChevronLeft, ChevronRight, Landmark, ShieldCheck, Layers3, Power, Check } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import Loading from '../Loading/Loading'
import TrashBox from '../../TrashBox/TrashBox'
import { hasPermission, useAuth } from '../../context/AuthContext'

const accountTypeStyles = {
  Asset: 'border-blue-200 bg-blue-50 text-blue-700',
  Liability: 'border-rose-200 bg-rose-50 text-rose-700',
  Equity: 'border-violet-200 bg-violet-50 text-violet-700',
  Income: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Expense: 'border-amber-200 bg-amber-50 text-amber-700',
}

const formatNumber = (value) =>
  new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)

function getAccountsArray(response) {
  const data = response?.data

  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.accounts)) return data.accounts
  if (Array.isArray(data?.data?.accounts)) return data.data.accounts

  return []
}

function getAccountTypeColor(type) {
  return accountTypeStyles[type] || 'border-slate-200 bg-slate-50 text-slate-700'
}

export default function CompanyChartOfAccounts() {
  const { permissions } = useAuth()

  const canManage = hasPermission(permissions, 'accounting:manage-accounts')

  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [apiError, setApiError] = useState('')

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')

  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [refreshKey, setRefreshKey] = useState(0)

  const [toast, setToast] = useState(null)
  const [processingId, setProcessingId] = useState('')

  const [actionModal, setActionModal] = useState({
    isOpen: false,
    account: null,
  })

  const breadcrumbItems = [
    { title: 'Chart of Accounts', link: null },
  ]

  const showToast = (type, message) => {
    setToast({
      id: Date.now(),
      type,
      message,
      duration: 3000,
    })
  }

  useEffect(() => {
    document.title = 'Chart of Accounts | MineERP'
  }, [])

  // FETCH ACCOUNTS

  useEffect(() => {
    let cancelled = false

    async function fetchAccounts() {
      if (!hasLoaded) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }

      setApiError('')

      try {
        const response = await axiosInstance.get('/erp/chart-of-accounts')

        if (response.data?.success === false) {
          throw new Error(response.data.message || 'Unable to load accounts.')
        }

        if (cancelled) return

        setAccounts(getAccountsArray(response))
        setHasLoaded(true)
      } catch (error) {
        if (cancelled) return

        setApiError(error.response?.data?.message || error.message || 'Unable to load chart of accounts.')
      } finally {
        if (!cancelled) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    }

    fetchAccounts()

    return () => {
      cancelled = true
    }
  }, [refreshKey])

  // SEARCH AND FILTERS

  const filteredAccounts = accounts.filter((account) => {
    const query = search.trim().toLowerCase()

    const searchableValues = [account.accountCode, account.accountName, account.accountType, account.accountSubType, account.description, account.isSystem ? 'system' : 'custom']

    const matchesSearch =
      !query ||
      searchableValues.some((value) =>
        String(value || '')
          .toLowerCase()
          .includes(query),
      )

    const matchesType = typeFilter === 'All' || account.accountType === typeFilter

    const matchesStatus = statusFilter === 'All' || (statusFilter === 'Active' && account.isActive) || (statusFilter === 'Inactive' && !account.isActive)

    return matchesSearch && matchesType && matchesStatus
  })

  // STATISTICS

  const totalAccounts = accounts.length
  const systemAccounts = accounts.filter((account) => account.isSystem).length
  const customAccounts = accounts.filter((account) => !account.isSystem).length
  const activeAccounts = accounts.filter((account) => account.isActive).length

  const statCards = [
    {
      title: 'Total Accounts',
      value: totalAccounts,
      icon: Landmark,
      color: 'text-violet-700',
      border: 'border-violet-200',
    },
    {
      title: 'System Accounts',
      value: systemAccounts,
      icon: ShieldCheck,
      color: 'text-blue-700',
      border: 'border-blue-200',
    },
    {
      title: 'Custom Accounts',
      value: customAccounts,
      icon: Layers3,
      color: 'text-amber-700',
      border: 'border-amber-200',
    },
    {
      title: 'Active Accounts',
      value: activeAccounts,
      icon: Check,
      color: 'text-emerald-700',
      border: 'border-emerald-200',
    },
  ]

  const hasActiveFilters = Boolean(search.trim()) || typeFilter !== 'All' || statusFilter !== 'All'

  const totalPages = Math.max(1, Math.ceil(filteredAccounts.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * pageSize

  const paginatedAccounts = filteredAccounts.slice(startIndex, startIndex + pageSize)

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const resetFilters = () => {
    setSearch('')
    setTypeFilter('All')
    setStatusFilter('All')
    setCurrentPage(1)
  }

  // REFRESH

  const handleRefresh = () => {
    if (refreshing || loading || processingId) return

    setRefreshKey((previous) => previous + 1)
  }

  // STATUS MODAL

  const openStatusModal = (account) => {
    if (processingId || account.isSystem || !canManage) return

    setActionModal({
      isOpen: true,
      account,
    })
  }

  const closeStatusModal = () => {
    if (processingId) return

    setActionModal({
      isOpen: false,
      account: null,
    })
  }

  // ACTIVATE / DEACTIVATE

  const handleConfirmStatus = async () => {
    const account = actionModal.account

    if (!account?._id || processingId || account.isSystem || !canManage) {
      return
    }

    const accountId = String(account._id)
    const nextStatus = !account.isActive

    setProcessingId(accountId)

    try {
      const response = await axiosInstance.patch(`/erp/chart-of-accounts/${encodeURIComponent(accountId)}/status`, {
        isActive: nextStatus,
      })

      if (response.data?.success === false) {
        throw new Error(response.data.message || 'Unable to update account status.')
      }

      showToast('success', nextStatus ? 'Account activated successfully.' : 'Account deactivated successfully.')

      setActionModal({
        isOpen: false,
        account: null,
      })

      setRefreshKey((previous) => previous + 1)
    } catch (error) {
      showToast('error', error.response?.data?.message || error.message || 'Unable to update account status.')
    } finally {
      setProcessingId('')
    }
  }

  // ACCOUNT ACTIONS

  const renderAccountActions = (account) => {
    const accountId = String(account._id)
    const isProcessing = processingId === accountId

    return (
      <div className="flex items-center justify-end gap-1">
        {!account.isSystem && canManage && (
          <>
            <Link to={`/company/chart-of-accounts/${accountId}/edit`} title="Edit account" aria-label={`Edit ${account.accountName}`} className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-600">
              <Pencil size={15} />
            </Link>

            <button
              type="button"
              title={account.isActive ? 'Deactivate account' : 'Activate account'}
              aria-label={`${account.isActive ? 'Deactivate' : 'Activate'} ${account.accountName}`}
              disabled={Boolean(processingId)}
              onClick={() => openStatusModal(account)}
              className={`rounded-lg p-2 disabled:opacity-50 ${account.isActive ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
            >
              {isProcessing ? <LoaderCircle size={15} className="animate-spin" /> : <Power size={15} />}
            </button>
          </>
        )}

        {account.isSystem && (
          <span title="System accounts cannot be modified" className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-slate-400">
            <ShieldCheck size={13} />
            Protected
          </span>
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
            <Loading fullScreen={false} label="Loading accounts" description="Please wait while we load your chart of accounts." className="!h-full min-h-[480px]" />
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-4 pb-8 text-sm">
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      <TrashBox
        isOpen={actionModal.isOpen}
        onClose={closeStatusModal}
        title={actionModal.account?.isActive ? 'Deactivate Account' : 'Activate Account'}
        message={actionModal.account?.isActive ? `Are you sure you want to deactivate ${actionModal.account?.accountName || 'this account'}?` : `Are you sure you want to activate ${actionModal.account?.accountName || 'this account'}?`}
        warningText={actionModal.account?.isActive ? 'This account will no longer be available for new accounting transactions.' : 'This account will become available for accounting transactions again.'}
        actionButtonText={actionModal.account?.isActive ? 'Deactivate Account' : 'Activate Account'}
        cancelButtonText="Cancel"
        variant={actionModal.account?.isActive ? 'delete' : 'activate'}
        onAction={handleConfirmStatus}
        isProcessing={Boolean(processingId)}
      />

      {/* HEADER */}

      <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        <div className="h-1 bg-erp-primary" />

        <div className="flex flex-col justify-between gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-5">
          <BreadCrumb items={breadcrumbItems} />

          <div className="flex  items-center gap-2">
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

            {canManage && (
              <Link
                to="/company/chart-of-accounts/new"
                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-erp-primary px-3.5 text-xs font-semibold text-white transition hover:bg-erp-primary-hover focus:outline-none focus:ring-2 focus:ring-erp-primary/30 focus:ring-offset-1"
              >
                <Plus size={15} />
                Add Account
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

      {/* ACCOUNTS TABLE */}

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
                placeholder="Search account code, name or type..."
                aria-label="Search accounts"
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
              value={typeFilter}
              onChange={(event) => {
                setTypeFilter(event.target.value)
                setCurrentPage(1)
              }}
              aria-label="Filter account type"
              className="h-9 min-w-36 rounded-lg border border-erp-border bg-erp-surface px-3 text-xs text-erp-text outline-none focus:border-erp-primary sm:text-sm"
            >
              <option value="All">All Account Types</option>
              <option value="Asset">Asset</option>
              <option value="Liability">Liability</option>
              <option value="Equity">Equity</option>
              <option value="Income">Income</option>
              <option value="Expense">Expense</option>
            </select>

            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value)
                setCurrentPage(1)
              }}
              aria-label="Filter account status"
              className="h-9 min-w-32 rounded-lg border border-erp-border bg-erp-surface px-3 text-xs text-erp-text outline-none focus:border-erp-primary sm:text-sm"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* REFRESH STATUS */}

        {refreshing && hasLoaded && (
          <div className="flex items-center justify-center gap-2 border-b border-erp-border px-4 py-3 text-xs text-erp-muted">
            <LoaderCircle size={15} className="animate-spin text-erp-primary" />
            Updating account list...
          </div>
        )}

        {/* SEARCH SCOPE NOTE */}

        {search.trim() && <div className="border-b border-erp-border bg-slate-50/70 px-4 py-2 text-xs text-erp-text-secondary">Showing matches from all currently loaded accounts.</div>}

        {/* DESKTOP TABLE */}

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-100">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Account Code</th>

                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Account Name</th>

                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Account Type</th>

                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Sub Type</th>

                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Account Category</th>

                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</th>

                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {paginatedAccounts.map((account) => (
                <tr key={account._id} className="transition hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <p className="whitespace-nowrap text-xs font-semibold text-erp-text">{account.accountCode || '—'}</p>
                  </td>

                  <td className="px-4 py-3">
                    <p className="max-w-52 truncate text-xs font-semibold text-erp-text sm:text-sm">{account.accountName || '—'}</p>

                    {account.description && <p className="mt-0.5 max-w-52 truncate text-[10px] text-erp-muted">{account.description}</p>}
                  </td>

                  <td className="px-4 py-3">
                    <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-1 text-[10px] font-semibold ${getAccountTypeColor(account.accountType)}`}>{account.accountType || '—'}</span>
                  </td>

                  <td className="px-4 py-3">
                    <p className="max-w-40 truncate text-xs text-slate-600">{account.accountSubType || '—'}</p>
                  </td>

                  <td className="px-4 py-3">
                    {account.isSystem ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">
                        <ShieldCheck size={12} />
                        System
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-1 text-[10px] font-semibold text-violet-700">Custom</span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-1 text-[10px] font-semibold ${account.isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-600'}`}>
                      {account.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>

                  <td className="px-4 py-3">{renderAccountActions(account)}</td>
                </tr>
              ))}

              {paginatedAccounts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center">
                    <Landmark size={26} className="mx-auto text-slate-400" />

                    <h3 className="mt-3 text-sm font-bold text-erp-text">No accounts found</h3>

                    <p className="mt-1 text-xs text-erp-muted">{hasActiveFilters ? 'Try changing your search or filters.' : 'No accounts have been created yet.'}</p>

                    {!hasActiveFilters && canManage && (
                      <Link to="/company/chart-of-accounts/new" className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-erp-primary px-3.5 text-xs font-semibold text-white hover:bg-erp-primary-hover">
                        <Plus size={14} />
                        Add First Account
                      </Link>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE ACCOUNTS */}

        <div className="divide-y divide-slate-100 md:hidden">
          {paginatedAccounts.map((account) => (
            <article key={account._id} className="space-y-3 p-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">
                  <Landmark size={19} />
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="break-words text-sm font-semibold text-erp-text">{account.accountName || 'Account'}</h3>

                  <p className="mt-1 text-xs text-erp-muted">Code: {account.accountCode || '—'}</p>

                  <p className="mt-1 break-words text-xs text-slate-600">{account.accountSubType || account.accountType || '—'}</p>
                </div>

                <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold ${getAccountTypeColor(account.accountType)}`}>{account.accountType || '—'}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3">
                <div>
                  <p className="text-[10px] text-slate-500">Account Category</p>

                  <p className="mt-1 text-xs font-medium text-slate-700">{account.isSystem ? 'System Account' : 'Custom Account'}</p>
                </div>

                <div>
                  <p className="text-[10px] text-slate-500">Status</p>

                  <p className={`mt-1 text-xs font-semibold ${account.isActive ? 'text-emerald-700' : 'text-slate-500'}`}>{account.isActive ? 'Active' : 'Inactive'}</p>
                </div>

                {account.parentAccount && (
                  <div className="col-span-2 border-t border-slate-200 pt-2">
                    <p className="text-[10px] text-slate-500">Parent Account</p>

                    <p className="mt-1 text-xs font-medium text-slate-700">{typeof account.parentAccount === 'object' ? account.parentAccount.accountName || '—' : 'Linked Account'}</p>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
                {!account.isSystem && canManage ? (
                  <>
                    <Link to={`/company/chart-of-accounts/${account._id}/edit`} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-erp-border text-xs font-semibold text-slate-700 hover:bg-erp-hover">
                      <Pencil size={14} />
                      Edit
                    </Link>

                    <button
                      type="button"
                      onClick={() => openStatusModal(account)}
                      disabled={Boolean(processingId)}
                      className={`inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border text-xs font-semibold disabled:opacity-50 ${
                        account.isActive ? 'border-rose-200 text-rose-700 hover:bg-rose-50' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                      }`}
                    >
                      {processingId === String(account._id) ? <LoaderCircle size={14} className="animate-spin" /> : <Power size={14} />}
                      {account.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </>
                ) : (
                  <div className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 text-xs font-semibold text-blue-700">
                    <ShieldCheck size={14} />
                    Protected System Account
                  </div>
                )}
              </div>
            </article>
          ))}

          {paginatedAccounts.length === 0 && (
            <div className="px-4 py-12 text-center">
              <Landmark size={26} className="mx-auto text-slate-400" />

              <h3 className="mt-3 font-semibold text-erp-text">No accounts found</h3>

              <p className="mt-1 text-xs text-erp-muted">{hasActiveFilters ? 'Try changing your search or filters.' : 'No accounts have been created yet.'}</p>

              {!hasActiveFilters && canManage && (
                <Link to="/company/chart-of-accounts/new" className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-erp-primary px-3.5 text-xs font-semibold text-white hover:bg-erp-primary-hover">
                  <Plus size={14} />
                  Add First Account
                </Link>
              )}
            </div>
          )}
        </div>

        {/* PAGINATION */}

        <div className="flex flex-col gap-3 border-t border-erp-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs text-erp-text-secondary sm:text-sm">
              Showing <span className="font-semibold text-erp-text">{filteredAccounts.length === 0 ? '0' : `${startIndex + 1}–${Math.min(startIndex + paginatedAccounts.length, filteredAccounts.length)}`}</span> of{' '}
              <span className="font-semibold text-erp-text">{formatNumber(filteredAccounts.length)}</span> accounts
            </p>

            <div className="flex items-center gap-2">
              <label htmlFor="account-page-size" className="whitespace-nowrap text-xs text-erp-text-secondary">
                Rows:
              </label>

              <select
                id="account-page-size"
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
