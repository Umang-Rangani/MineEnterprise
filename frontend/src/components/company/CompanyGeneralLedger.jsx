import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Search, RefreshCw, FilterX, CalendarDays, Landmark, IndianRupee, ArrowDownLeft, ArrowUpRight, Wallet, ChevronLeft, ChevronRight, LoaderCircle, FileText, AlertCircle } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import Loading from '../Loading/Loading'
import { hasPermission, useAuth } from '../../context/AuthContext'

const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

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

const getAccounts = (response) => {
  const data = response?.data
  const result = data?.data?.accounts || data?.data || data?.accounts || []

  return Array.isArray(result) ? result : []
}

const getLedger = (response) => {
  const data = response?.data
  const result = data?.data?.ledger || data?.data || data?.ledger || {}

  return result && typeof result === 'object' ? result : {}
}

const getBalanceLabel = (amount, type) => {
  const value = Number(amount || 0)

  if (value === 0) return formatCurrency(0)

  return `${formatCurrency(value)} ${type || ''}`.trim()
}

const initialFilters = {
  accountId: '',
  fromDate: '',
  toDate: '',
}

export default function CompanyGeneralLedger() {
  const { permissions } = useAuth()

  const canView = hasPermission(permissions, 'accounting:view-ledger')

  const [accounts, setAccounts] = useState([])
  const [accountsLoading, setAccountsLoading] = useState(true)

  const [filters, setFilters] = useState(initialFilters)
  const [appliedFilters, setAppliedFilters] = useState(initialFilters)

  const [ledger, setLedger] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)

  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  })

  const [toast, setToast] = useState(null)
  const [retryKey, setRetryKey] = useState(0)

  const showToast = (type, message, duration = 3000) => {
    setToast({ id: Date.now(), type, message, duration })
  }

  const closeToast = () => setToast(null)

  useEffect(() => {
    document.title = 'General Ledger | MineERP'
  }, [])

  // LOAD CHART OF ACCOUNTS
  useEffect(() => {
    let cancelled = false

    const loadAccounts = async () => {
      setAccountsLoading(true)

      try {
        const response = await axiosInstance.get('/erp/chart-of-accounts', {
          params: {
            isActive: 'true',
          },
        })

        if (response.data?.success === false) {
          throw new Error(response.data.message || 'Unable to load accounts.')
        }

        if (!cancelled) {
          setAccounts(getAccounts(response))
        }
      } catch (error) {
        if (!cancelled) {
          showToast('error', error.response?.data?.message || error.message || 'Unable to load accounts.', 5000)
        }
      } finally {
        if (!cancelled) setAccountsLoading(false)
      }
    }

    if (canView) loadAccounts()
    else setAccountsLoading(false)

    return () => {
      cancelled = true
    }
  }, [canView])

  // LOAD GENERAL LEDGER
  useEffect(() => {
    let cancelled = false

    const loadLedger = async () => {
      if (!appliedFilters.accountId) {
        setLedger(null)
        setLoading(false)
        setLoadError(false)
        return
      }

      setLoading(true)
      setLoadError(false)

      try {
        const params = {
          accountId: appliedFilters.accountId,
          page,
          limit,
        }

        if (appliedFilters.fromDate) {
          params.fromDate = appliedFilters.fromDate
        }

        if (appliedFilters.toDate) {
          params.toDate = appliedFilters.toDate
        }

        const response = await axiosInstance.get('/erp/general-ledger', {
          params,
        })

        if (response.data?.success === false) {
          throw new Error(response.data.message || 'Unable to load general ledger.')
        }

        if (cancelled) return

        const result = getLedger(response)

        setLedger(result)

        const paginationData = response.data?.pagination || response.data?.data?.pagination || result.pagination || {}

        setPagination({
          page: Number(paginationData.page || page),
          limit: Number(paginationData.limit || limit),
          total: Number(paginationData.total || 0),
          totalPages: Math.max(1, Number(paginationData.totalPages || 1)),
        })
      } catch (error) {
        if (!cancelled) {
          setLoadError(true)
          setLedger(null)

          showToast('error', error.response?.data?.message || error.message || 'Unable to load general ledger.', 5000)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    if (canView) loadLedger()
    else setLoading(false)

    return () => {
      cancelled = true
    }
  }, [appliedFilters, page, limit, retryKey, canView])

  const handleFilterChange = (name, value) => {
    setFilters((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  const applyFilters = (event) => {
    event.preventDefault()

    if (!filters.accountId) {
      showToast('error', 'Please select an account.')
      return
    }

    if (filters.fromDate && filters.toDate && filters.fromDate > filters.toDate) {
      showToast('error', 'From date cannot be later than To date.')
      return
    }

    setPage(1)
    setAppliedFilters({ ...filters })
  }

  const resetFilters = () => {
    setFilters(initialFilters)
    setAppliedFilters(initialFilters)
    setLedger(null)
    setPage(1)
    setLoadError(false)
  }

  const entries = Array.isArray(ledger?.entries) ? ledger.entries : []

  const summary = ledger?.summary || {}

  const openingBalance = Number(summary.openingBalance || 0)
  const totalDebit = Number(summary.totalDebit || 0)
  const totalCredit = Number(summary.totalCredit || 0)
  const closingBalance = Number(summary.closingBalance || 0)

  const openingBalanceType = summary.openingBalanceType || ''
  const closingBalanceType = summary.closingBalanceType || ''

  const selectedAccount = accounts.find((account) => String(account._id) === String(appliedFilters.accountId))

  const breadcrumbItems = [
    {
      title: 'Accounting',
      link: '/company/chart-of-accounts',
    },
    {
      title: 'General Ledger',
      link: null,
    },
  ]

  if (!canView) {
    return (
      <div className="rounded-xl border border-red-200 bg-white p-8 text-center">
        <AlertCircle size={28} className="mx-auto text-red-500" />
        <h2 className="mt-3 text-sm font-bold text-slate-800">Access denied</h2>
        <p className="mt-1 text-xs text-slate-500">You do not have permission to view the general ledger.</p>
      </div>
    )
  }

  if (accountsLoading) {
    return (
      <div className="min-w-0 space-y-4 text-sm">
        <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="h-1 bg-erp-primary" />
          <div className="flex min-h-16 items-center px-4 sm:px-5">
            <BreadCrumb items={breadcrumbItems} />
          </div>
        </section>

        <section className="relative min-h-[350px] overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <Loading fullScreen={false} label="Loading accounts" description="Fetching chart of accounts..." className="!h-full min-h-[350px]" />
        </section>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-4 text-sm">
      {toast && <Toast toast={toast} onClose={closeToast} />}

      {/* HEADER */}
      <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        <div className="h-1 bg-erp-primary" />

        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <BreadCrumb items={breadcrumbItems} />
          </div>

          <button
            type="button"
            onClick={() => setRetryKey((previous) => previous + 1)}
            disabled={!appliedFilters.accountId || loading}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </section>

      {/* FILTERS */}
      <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        <div className="flex items-center gap-2 border-b border-erp-border px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
            <Search size={16} />
          </div>

          <div>
            <h2 className="text-sm font-bold text-slate-800">Ledger Filters</h2>
            <p className="text-[11px] text-slate-500">Select an account and date range to view transactions</p>
          </div>
        </div>

        <form onSubmit={applyFilters} className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Account <span className="text-red-500">*</span>
            </label>

            <select
              value={filters.accountId}
              onChange={(event) => handleFilterChange('accountId', event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10"
              required
            >
              <option value="">Select Account</option>
              {accounts.map((account) => (
                <option key={account._id} value={account._id}>
                  {account.accountCode} - {account.accountName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">From Date</label>

            <div className="relative">
              <CalendarDays size={14} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="date"
                value={filters.fromDate}
                max={filters.toDate || undefined}
                onChange={(event) => handleFilterChange('fromDate', event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-700 outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">To Date</label>

            <div className="relative">
              <CalendarDays size={14} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="date"
                value={filters.toDate}
                min={filters.fromDate || undefined}
                onChange={(event) => handleFilterChange('toDate', event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-700 outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10"
              />
            </div>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              disabled={loading || !filters.accountId}
              className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-erp-primary px-3 text-xs font-semibold text-white transition hover:bg-erp-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Search size={14} />
              Apply Filters
            </button>

            <button
              type="button"
              onClick={resetFilters}
              disabled={loading && !appliedFilters.accountId}
              title="Reset Filters"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <FilterX size={15} />
            </button>
          </div>
        </form>
      </section>

      {/* EMPTY STATE */}
      {!appliedFilters.accountId && (
        <section className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-14 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-erp-primary/10 text-erp-primary">
            <BookOpen size={23} />
          </div>
          <h2 className="mt-3 text-sm font-bold text-slate-800">Select an Account</h2>
          <p className="mt-1 text-xs text-slate-500">Choose an account and apply filters to view its ledger transactions.</p>
        </section>
      )}

      {/* LEDGER CONTENT */}
      {appliedFilters.accountId && (
        <>
          {loading ? (
            <section className="relative min-h-[350px] overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
              <Loading fullScreen={false} label="Loading general ledger" description="Fetching account transactions..." className="!h-full min-h-[350px]" />
            </section>
          ) : loadError ? (
            <section className="rounded-xl border border-red-200 bg-white px-4 py-12 text-center">
              <AlertCircle size={28} className="mx-auto text-red-400" />
              <h2 className="mt-3 text-sm font-bold text-slate-800">Unable to load general ledger</h2>
              <p className="mt-1 text-xs text-slate-500">Please try again.</p>
              <button type="button" onClick={() => setRetryKey((previous) => previous + 1)} className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-erp-primary px-3 text-xs font-semibold text-white hover:bg-erp-primary-hover">
                <RefreshCw size={14} />
                Retry
              </button>
            </section>
          ) : ledger ? (
            <>
              {/* SELECTED ACCOUNT */}
              <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-erp-border bg-erp-surface p-3 shadow-erp-card">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
                    <Landmark size={19} />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Selected Account</p>
                    <h2 className="truncate text-sm font-bold text-slate-800">{ledger.account?.accountName || selectedAccount?.accountName || 'Account'}</h2>
                    <p className="text-[11px] text-slate-500">
                      {ledger.account?.accountCode || selectedAccount?.accountCode || '—'}
                      {ledger.account?.accountType ? ` · ${ledger.account.accountType}` : ''}
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Transactions</p>
                  <p className="text-sm font-bold tabular-nums text-slate-800">{pagination.total.toLocaleString('en-IN')}</p>
                </div>
              </section>

              {/* SUMMARY CARDS */}
              <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="relative overflow-hidden rounded-xl border border-erp-border bg-erp-surface p-4 shadow-erp-card">
                  <div className="absolute inset-x-0 top-0 h-1 bg-slate-400" />
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-500">Opening Balance</p>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                      <Wallet size={16} />
                    </div>
                  </div>
                  <p className="mt-3 text-lg font-bold tabular-nums text-slate-900">{getBalanceLabel(openingBalance, openingBalanceType)}</p>
                </div>

                <div className="relative overflow-hidden rounded-xl border border-erp-border bg-erp-surface p-4 shadow-erp-card">
                  <div className="absolute inset-x-0 top-0 h-1 bg-emerald-500" />
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-500">Total Debit</p>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                      <ArrowDownLeft size={16} />
                    </div>
                  </div>
                  <p className="mt-3 text-lg font-bold tabular-nums text-slate-900">{formatCurrency(totalDebit)}</p>
                </div>

                <div className="relative overflow-hidden rounded-xl border border-erp-border bg-erp-surface p-4 shadow-erp-card">
                  <div className="absolute inset-x-0 top-0 h-1 bg-blue-500" />
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-500">Total Credit</p>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                      <ArrowUpRight size={16} />
                    </div>
                  </div>
                  <p className="mt-3 text-lg font-bold tabular-nums text-slate-900">{formatCurrency(totalCredit)}</p>
                </div>

                <div className="relative overflow-hidden rounded-xl border border-erp-border bg-erp-surface p-4 shadow-erp-card">
                  <div className="absolute inset-x-0 top-0 h-1 bg-erp-primary" />
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-500">Closing Balance</p>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
                      <IndianRupee size={16} />
                    </div>
                  </div>
                  <p className="mt-3 text-lg font-bold tabular-nums text-slate-900">{getBalanceLabel(closingBalance, closingBalanceType)}</p>
                </div>
              </section>

              {/* LEDGER TABLE */}
              <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-erp-border px-4 py-3">
                  <div>
                    <h2 className="text-sm font-bold text-slate-800">Ledger Transactions</h2>
                    <p className="text-[11px] text-slate-500">Posted journal entries for the selected account</p>
                  </div>

                  <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[10px] font-semibold text-slate-600">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                </div>

                {entries.length === 0 ? (
                  <div className="px-4 py-14 text-center">
                    <FileText size={28} className="mx-auto text-slate-300" />
                    <h3 className="mt-3 text-sm font-bold text-slate-700">No Transactions Found</h3>
                    <p className="mt-1 text-xs text-slate-500">No posted journal entries were found for this account in the selected date range.</p>
                  </div>
                ) : (
                  <>
                    <div className="hidden overflow-x-auto md:block">
                      <table className="w-full min-w-[1050px] text-left text-xs">
                        <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                          <tr>
                            <th className="px-3 py-3 font-bold">Date</th>
                            <th className="px-3 py-3 font-bold">Journal Number</th>
                            <th className="px-3 py-3 font-bold">Reference</th>
                            <th className="px-3 py-3 font-bold">Narration / Description</th>
                            <th className="px-3 py-3 text-right font-bold">Debit</th>
                            <th className="px-3 py-3 text-right font-bold">Credit</th>
                            <th className="px-3 py-3 text-right font-bold">Running Balance</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                          {entries.map((entry, index) => (
                            <tr key={entry.lineId || entry._id || index} className="transition hover:bg-slate-50/70">
                              <td className="whitespace-nowrap px-3 py-3 text-slate-600">{formatDate(entry.entryDate)}</td>

                              <td className="px-3 py-3">
                                {entry.journalEntryId ? (
                                  <Link to={`/company/journal-entries/${entry.journalEntryId}`} className="font-semibold text-erp-primary transition hover:underline">
                                    {entry.journalNumber || '—'}
                                  </Link>
                                ) : (
                                  <span className="font-semibold text-slate-700">{entry.journalNumber || '—'}</span>
                                )}
                              </td>

                              <td className="px-3 py-3 text-slate-600">{entry.referenceNumber || '—'}</td>

                              <td className="max-w-[300px] px-3 py-3">
                                <p className="truncate font-medium text-slate-700" title={entry.narration || ''}>
                                  {entry.narration || '—'}
                                </p>
                                {entry.description && (
                                  <p className="mt-1 truncate text-[10px] text-slate-400" title={entry.description}>
                                    {entry.description}
                                  </p>
                                )}
                              </td>

                              <td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums text-emerald-700">{Number(entry.debit || 0) > 0 ? formatCurrency(entry.debit) : '—'}</td>

                              <td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums text-blue-700">{Number(entry.credit || 0) > 0 ? formatCurrency(entry.credit) : '—'}</td>

                              <td className="whitespace-nowrap px-3 py-3 text-right font-bold tabular-nums text-slate-800">
                                {formatCurrency(entry.runningBalance)}
                                <span className="ml-1 text-[10px] font-medium text-slate-400">{entry.runningBalanceType || ''}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* MOBILE LEDGER */}
                    <div className="space-y-2 p-3 md:hidden">
                      {entries.map((entry, index) => (
                        <div key={entry.lineId || entry._id || index} className="rounded-lg border border-slate-200 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[10px] text-slate-400">{formatDate(entry.entryDate)}</p>

                              {entry.journalEntryId ? (
                                <Link to={`/company/journal-entries/${entry.journalEntryId}`} className="mt-1 inline-block text-xs font-bold text-erp-primary hover:underline">
                                  {entry.journalNumber || '—'}
                                </Link>
                              ) : (
                                <p className="mt-1 text-xs font-bold text-slate-800">{entry.journalNumber || '—'}</p>
                              )}

                              <p className="mt-1 text-[11px] text-slate-500">Reference: {entry.referenceNumber || '—'}</p>
                            </div>

                            <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">{entry.runningBalanceType || '—'}</span>
                          </div>

                          <p className="mt-2 text-xs leading-relaxed text-slate-700">{entry.narration || '—'}</p>

                          {entry.description && <p className="mt-1 text-[11px] text-slate-500">{entry.description}</p>}

                          <div className="mt-3 grid grid-cols-3 gap-2">
                            <div className="rounded-lg bg-emerald-50 p-2">
                              <p className="text-[10px] font-semibold text-emerald-700">Debit</p>
                              <p className="mt-1 text-[11px] font-bold tabular-nums text-emerald-800">{formatCurrency(entry.debit)}</p>
                            </div>

                            <div className="rounded-lg bg-blue-50 p-2">
                              <p className="text-[10px] font-semibold text-blue-700">Credit</p>
                              <p className="mt-1 text-[11px] font-bold tabular-nums text-blue-800">{formatCurrency(entry.credit)}</p>
                            </div>

                            <div className="rounded-lg bg-slate-100 p-2">
                              <p className="text-[10px] font-semibold text-slate-600">Balance</p>
                              <p className="mt-1 text-[11px] font-bold tabular-nums text-slate-800">{formatCurrency(entry.runningBalance)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* PAGINATION */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-3 py-3">
                  <p className="text-[11px] text-slate-500">
                    Showing <span className="font-semibold text-slate-700">{pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                    <span className="font-semibold text-slate-700">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="font-semibold text-slate-700">{pagination.total}</span> transactions
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPage((previous) => Math.max(1, previous - 1))}
                      disabled={pagination.page <= 1 || loading}
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft size={14} />
                      Previous
                    </button>

                    <span className="text-[11px] font-semibold tabular-nums text-slate-600">
                      {pagination.page} / {pagination.totalPages}
                    </span>

                    <button
                      type="button"
                      onClick={() => setPage((previous) => Math.min(pagination.totalPages, previous + 1))}
                      disabled={pagination.page >= pagination.totalPages || loading}
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </section>
            </>
          ) : null}
        </>
      )}
    </div>
  )
}
