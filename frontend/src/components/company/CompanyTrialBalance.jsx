import { useEffect, useState } from 'react'
import { Search, RefreshCw, FilterX, CalendarDays, Landmark, IndianRupee, ArrowDownLeft, ArrowUpRight, Wallet, FileText, AlertCircle, CheckCircle2, XCircle, Activity } from 'lucide-react'

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

const getTrialBalance = (response) => {
  const data = response?.data
  const result = data?.data || data || {}

  return result && typeof result === 'object' ? result : {}
}

const accountTypeStyles = {
  Asset: 'bg-blue-50 text-blue-700',
  Liability: 'bg-orange-50 text-orange-700',
  Equity: 'bg-violet-50 text-violet-700',
  Income: 'bg-emerald-50 text-emerald-700',
  Expense: 'bg-rose-50 text-rose-700',
}

const breadcrumbItems = [
  {
    title: 'Accounting',
    link: '/company/chart-of-accounts',
  },
  {
    title: 'Trial Balance',
    link: null,
  },
]

export default function CompanyTrialBalance() {
  const { permissions } = useAuth()

  const canView = hasPermission(permissions, 'accounting:view-ledger')

  const [asOfDate, setAsOfDate] = useState('')
  const [appliedAsOfDate, setAppliedAsOfDate] = useState('')

  const [search, setSearch] = useState('')
  const [accountType, setAccountType] = useState('')

  const [trialBalance, setTrialBalance] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)

  const [toast, setToast] = useState(null)
  const [retryKey, setRetryKey] = useState(0)

  const showToast = (type, message, duration = 3000) => {
    setToast({ id: Date.now(), type, message, duration })
  }

  const closeToast = () => setToast(null)

  useEffect(() => {
    document.title = 'Trial Balance | MineERP'
  }, [])

  // LOAD TRIAL BALANCE
  useEffect(() => {
    let cancelled = false

    const loadTrialBalance = async () => {
      setLoading(true)
      setLoadError(false)

      try {
        const params = {}

        if (appliedAsOfDate) {
          params.asOfDate = appliedAsOfDate
        }

        const response = await axiosInstance.get('/erp/trial-balance', {
          params,
        })

        if (response.data?.success === false) {
          throw new Error(response.data.message || 'Unable to load trial balance.')
        }

        if (cancelled) return

        const result = getTrialBalance(response)

        setTrialBalance({
          asOfDate: result.asOfDate || null,
          accounts: Array.isArray(result.accounts) ? result.accounts : [],
          summary: result.summary || {},
        })
      } catch (error) {
        if (!cancelled) {
          setLoadError(true)
          setTrialBalance(null)

          showToast('error', error.response?.data?.message || error.message || 'Unable to load trial balance.', 5000)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    if (canView) {
      loadTrialBalance()
    } else {
      setLoading(false)
    }

    return () => {
      cancelled = true
    }
  }, [appliedAsOfDate, retryKey, canView])

  // APPLY DATE FILTER
  const applyFilters = (event) => {
    event.preventDefault()
    setAppliedAsOfDate(asOfDate)
  }

  // RESET FILTERS
  const resetFilters = () => {
    setAsOfDate('')
    setAppliedAsOfDate('')
    setSearch('')
    setAccountType('')
  }

  const accounts = Array.isArray(trialBalance?.accounts) ? trialBalance.accounts : []

  const summary = trialBalance?.summary || {}

  // LOCAL SEARCH AND ACCOUNT TYPE FILTER
  const filteredAccounts = accounts.filter((account) => {
    const searchValue = search.trim().toLowerCase()

    const matchesSearch =
      !searchValue ||
      account.accountCode?.toLowerCase().includes(searchValue) ||
      account.accountName?.toLowerCase().includes(searchValue) ||
      account.accountType?.toLowerCase().includes(searchValue) ||
      account.accountSubType?.toLowerCase().includes(searchValue)

    const matchesType = !accountType || account.accountType === accountType

    return matchesSearch && matchesType
  })

  const totalDebit = Number(summary.totalDebit || 0)
  const totalCredit = Number(summary.totalCredit || 0)
  const difference = Number(summary.difference || 0)
  const isBalanced = summary.isBalanced === true

  const totalAccounts = accounts.length
  const debitAccounts = accounts.filter((account) => Number(account.closingDebit || 0) > 0).length
  const creditAccounts = accounts.filter((account) => Number(account.closingCredit || 0) > 0).length

  if (!canView) {
    return (
      <div className="rounded-xl border border-red-200 bg-white p-8 text-center">
        <AlertCircle size={28} className="mx-auto text-red-500" />
        <h2 className="mt-3 text-sm font-bold text-slate-800">Access denied</h2>
        <p className="mt-1 text-xs text-slate-500">You do not have permission to view the trial balance.</p>
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
            disabled={loading}
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
            <h2 className="text-sm font-bold text-slate-800">Trial Balance Filters</h2>
            <p className="text-[11px] text-slate-500">Select an accounting date to view account balances</p>
          </div>
        </div>

        <form onSubmit={applyFilters} className="grid  items-center gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">As Of Date</label>

            <div className="relative">
              <CalendarDays size={14} className="absolute left-3 top-3 text-slate-400" />

              <input
                type="date"
                value={asOfDate}
                onChange={(event) => setAsOfDate(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-700 outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10"
              />
            </div>

            <p className="mt-1 text-[10px] text-slate-400">Leave blank to include all posted entries.</p>
          </div>

          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-erp-primary px-3 text-xs font-semibold text-white transition hover:bg-erp-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Search size={14} />
              Apply Filters
            </button>

            <button
              type="button"
              onClick={resetFilters}
              disabled={loading && !appliedAsOfDate && !asOfDate}
              title="Reset Filters"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <FilterX size={15} />
            </button>
          </div>
        </form>
      </section>

      {/* LOADING */}
      {loading && (
        <section className="relative min-h-[350px] overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <Loading fullScreen={false} label="Loading trial balance" description="Calculating account balances..." className="!h-full min-h-[350px]" />
        </section>
      )}

      {/* ERROR */}
      {!loading && loadError && (
        <section className="rounded-xl border border-red-200 bg-white px-4 py-12 text-center">
          <AlertCircle size={28} className="mx-auto text-red-400" />

          <h2 className="mt-3 text-sm font-bold text-slate-800">Unable to load trial balance</h2>

          <p className="mt-1 text-xs text-slate-500">Please try again.</p>

          <button type="button" onClick={() => setRetryKey((previous) => previous + 1)} className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-erp-primary px-3 text-xs font-semibold text-white hover:bg-erp-primary-hover">
            <RefreshCw size={14} />
            Retry
          </button>
        </section>
      )}

      {/* TRIAL BALANCE CONTENT */}
      {!loading && !loadError && trialBalance && (
        <>
          {/* REPORT INFORMATION */}
          <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-erp-border bg-erp-surface p-3 shadow-erp-card">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
                <Landmark size={19} />
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Trial Balance Report</p>

                <h2 className="text-sm font-bold text-slate-800">
                  {trialBalance.asOfDate
                    ? `As of ${new Date(`${trialBalance.asOfDate}T00:00:00`).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}`
                    : 'All Posted Transactions'}
                </h2>

                <p className="text-[11px] text-slate-500">Includes active and inactive accounts</p>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Total Accounts</p>

              <p className="text-sm font-bold tabular-nums text-slate-800">{totalAccounts.toLocaleString('en-IN')}</p>
            </div>
          </section>

          {/* SUMMARY CARDS */}
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="relative overflow-hidden rounded-xl border border-erp-border bg-erp-surface p-4 shadow-erp-card">
              <div className="absolute inset-x-0 top-0 h-1 bg-emerald-500" />

              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-500">Total Debit Balance</p>

                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                  <ArrowDownLeft size={16} />
                </div>
              </div>

              <p className="mt-3 text-lg font-bold tabular-nums text-slate-900">{formatCurrency(totalDebit)}</p>
            </div>

            <div className="relative overflow-hidden rounded-xl border border-erp-border bg-erp-surface p-4 shadow-erp-card">
              <div className="absolute inset-x-0 top-0 h-1 bg-blue-500" />

              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-500">Total Credit Balance</p>

                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                  <ArrowUpRight size={16} />
                </div>
              </div>

              <p className="mt-3 text-lg font-bold tabular-nums text-slate-900">{formatCurrency(totalCredit)}</p>
            </div>

            <div className="relative overflow-hidden rounded-xl border border-erp-border bg-erp-surface p-4 shadow-erp-card">
              <div className="absolute inset-x-0 top-0 h-1 bg-erp-primary" />

              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-500">Difference</p>

                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
                  <IndianRupee size={16} />
                </div>
              </div>

              <p className="mt-3 text-lg font-bold tabular-nums text-slate-900">{formatCurrency(difference)}</p>
            </div>

            <div className="relative overflow-hidden rounded-xl border border-erp-border bg-erp-surface p-4 shadow-erp-card">
              <div className={`absolute inset-x-0 top-0 h-1 ${isBalanced ? 'bg-emerald-500' : 'bg-red-500'}`} />

              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-500">Balance Status</p>

                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isBalanced ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{isBalanced ? <CheckCircle2 size={16} /> : <XCircle size={16} />}</div>
              </div>

              <p className={`mt-3 text-lg font-bold ${isBalanced ? 'text-emerald-700' : 'text-red-600'}`}>{isBalanced ? 'Balanced' : 'Unbalanced'}</p>
            </div>
          </section>

          {/* ACCOUNT STATISTICS */}
          <section className="grid gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-xl border border-erp-border bg-erp-surface p-3 shadow-erp-card">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <Activity size={17} />
              </div>

              <div>
                <p className="text-[10px] font-semibold text-slate-400">Total Accounts</p>
                <p className="text-sm font-bold text-slate-800">{totalAccounts}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-erp-border bg-erp-surface p-3 shadow-erp-card">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <ArrowDownLeft size={17} />
              </div>

              <div>
                <p className="text-[10px] font-semibold text-slate-400">Debit Balance Accounts</p>
                <p className="text-sm font-bold text-slate-800">{debitAccounts}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-erp-border bg-erp-surface p-3 shadow-erp-card">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <ArrowUpRight size={17} />
              </div>

              <div>
                <p className="text-[10px] font-semibold text-slate-400">Credit Balance Accounts</p>
                <p className="text-sm font-bold text-slate-800">{creditAccounts}</p>
              </div>
            </div>
          </section>

          {/* ACCOUNT TABLE */}
          <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-erp-border px-4 py-3">
              <div>
                <h2 className="text-sm font-bold text-slate-800">Account Balances</h2>

                <p className="text-[11px] text-slate-500">Account-wise debit and credit balances</p>
              </div>

              <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[10px] font-semibold text-slate-600">{filteredAccounts.length} Accounts</span>
            </div>

            {/* TABLE FILTERS */}
            <div className="grid gap-2 border-b border-slate-100 p-3 sm:grid-cols-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-3 text-slate-400" />

                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search account code or name..."
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-700 outline-none focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10"
                />
              </div>

              <select
                value={accountType}
                onChange={(event) => setAccountType(event.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10"
              >
                <option value="">All Account Types</option>
                <option value="Asset">Asset</option>
                <option value="Liability">Liability</option>
                <option value="Equity">Equity</option>
                <option value="Income">Income</option>
                <option value="Expense">Expense</option>
              </select>
            </div>

            {filteredAccounts.length === 0 ? (
              <div className="px-4 py-14 text-center">
                <FileText size={28} className="mx-auto text-slate-300" />

                <h3 className="mt-3 text-sm font-bold text-slate-700">No Accounts Found</h3>

                <p className="mt-1 text-xs text-slate-500">No accounts match your search or selected account type.</p>
              </div>
            ) : (
              <>
                {/* DESKTOP TABLE */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[1100px] text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-3 font-bold">Account Code</th>
                        <th className="px-3 py-3 font-bold">Account Name</th>
                        <th className="px-3 py-3 font-bold">Account Type</th>
                        <th className="px-3 py-3 text-right font-bold">Total Debit</th>
                        <th className="px-3 py-3 text-right font-bold">Total Credit</th>
                        <th className="px-3 py-3 text-right font-bold">Closing Debit</th>
                        <th className="px-3 py-3 text-right font-bold">Closing Credit</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {filteredAccounts.map((account) => (
                        <tr key={account._id} className="transition hover:bg-slate-50/70">
                          <td className="whitespace-nowrap px-3 py-3 font-semibold text-erp-primary">{account.accountCode}</td>

                          <td className="px-3 py-3">
                            <p className="font-semibold text-slate-800">{account.accountName}</p>

                            {account.parentAccount?.accountName && <p className="mt-1 text-[10px] text-slate-400">Parent: {account.parentAccount.accountName}</p>}

                            {!account.isActive && <span className="mt-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500">Inactive</span>}
                          </td>

                          <td className="px-3 py-3">
                            <span className={`rounded-md px-2 py-1 text-[10px] font-semibold ${accountTypeStyles[account.accountType] || 'bg-slate-100 text-slate-600'}`}>{account.accountType}</span>
                          </td>

                          <td className="whitespace-nowrap px-3 py-3 text-right font-medium tabular-nums text-emerald-700">{Number(account.totalDebit || 0) > 0 ? formatCurrency(account.totalDebit) : '—'}</td>

                          <td className="whitespace-nowrap px-3 py-3 text-right font-medium tabular-nums text-blue-700">{Number(account.totalCredit || 0) > 0 ? formatCurrency(account.totalCredit) : '—'}</td>

                          <td className="whitespace-nowrap px-3 py-3 text-right font-bold tabular-nums text-emerald-700">{Number(account.closingDebit || 0) > 0 ? formatCurrency(account.closingDebit) : '—'}</td>

                          <td className="whitespace-nowrap px-3 py-3 text-right font-bold tabular-nums text-blue-700">{Number(account.closingCredit || 0) > 0 ? formatCurrency(account.closingCredit) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>

                    <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                      <tr>
                        <td colSpan={3} className="px-3 py-3 font-bold text-slate-800">
                          Grand Total
                        </td>

                        <td className="whitespace-nowrap px-3 py-3 text-right font-bold tabular-nums text-emerald-700">{formatCurrency(accounts.reduce((sum, account) => sum + Number(account.totalDebit || 0), 0))}</td>

                        <td className="whitespace-nowrap px-3 py-3 text-right font-bold tabular-nums text-blue-700">{formatCurrency(accounts.reduce((sum, account) => sum + Number(account.totalCredit || 0), 0))}</td>

                        <td className="whitespace-nowrap px-3 py-3 text-right font-bold tabular-nums text-emerald-700">{formatCurrency(totalDebit)}</td>

                        <td className="whitespace-nowrap px-3 py-3 text-right font-bold tabular-nums text-blue-700">{formatCurrency(totalCredit)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* MOBILE ACCOUNT CARDS */}
                <div className="space-y-2 p-3 md:hidden">
                  {filteredAccounts.map((account) => (
                    <div key={account._id} className="rounded-lg border border-slate-200 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold text-erp-primary">{account.accountCode}</p>

                          <h3 className="mt-1 text-xs font-bold text-slate-800">{account.accountName}</h3>

                          {account.parentAccount?.accountName && <p className="mt-1 text-[10px] text-slate-400">Parent: {account.parentAccount.accountName}</p>}
                        </div>

                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className={`rounded-md px-2 py-1 text-[10px] font-semibold ${accountTypeStyles[account.accountType] || 'bg-slate-100 text-slate-600'}`}>{account.accountType}</span>

                          {!account.isActive && <span className="text-[9px] font-semibold text-slate-400">Inactive</span>}
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="rounded-lg bg-emerald-50 p-2">
                          <p className="text-[10px] font-semibold text-emerald-700">Total Debit</p>

                          <p className="mt-1 text-[11px] font-bold tabular-nums text-emerald-800">{formatCurrency(account.totalDebit)}</p>
                        </div>

                        <div className="rounded-lg bg-blue-50 p-2">
                          <p className="text-[10px] font-semibold text-blue-700">Total Credit</p>

                          <p className="mt-1 text-[11px] font-bold tabular-nums text-blue-800">{formatCurrency(account.totalCredit)}</p>
                        </div>

                        <div className="rounded-lg border border-emerald-100 bg-white p-2">
                          <p className="text-[10px] font-semibold text-emerald-700">Closing Debit</p>

                          <p className="mt-1 text-[11px] font-bold tabular-nums text-emerald-800">{formatCurrency(account.closingDebit)}</p>
                        </div>

                        <div className="rounded-lg border border-blue-100 bg-white p-2">
                          <p className="text-[10px] font-semibold text-blue-700">Closing Credit</p>

                          <p className="mt-1 text-[11px] font-bold tabular-nums text-blue-800">{formatCurrency(account.closingCredit)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* GRAND TOTAL SUMMARY */}
            <div className="border-t border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-slate-800">Grand Total</p>

                  <p className="mt-1 text-[10px] text-slate-500">Closing debit and credit balances</p>
                </div>

                <div className="flex flex-wrap gap-4">
                  <div className="text-right">
                    <p className="text-[10px] font-semibold text-emerald-700">Debit</p>
                    <p className="text-xs font-bold tabular-nums text-emerald-800">{formatCurrency(totalDebit)}</p>
                  </div>

                  <div className="text-right">
                    <p className="text-[10px] font-semibold text-blue-700">Credit</p>
                    <p className="text-xs font-bold tabular-nums text-blue-800">{formatCurrency(totalCredit)}</p>
                  </div>
                </div>
              </div>

              <div className={`mt-3 flex items-center gap-2 rounded-lg border p-3 ${isBalanced ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
                {isBalanced ? <CheckCircle2 size={17} className="shrink-0 text-emerald-600" /> : <XCircle size={17} className="shrink-0 text-red-600" />}

                <div className="min-w-0">
                  <p className={`text-xs font-bold ${isBalanced ? 'text-emerald-800' : 'text-red-800'}`}>{isBalanced ? 'Trial Balance is Balanced' : 'Trial Balance is Unbalanced'}</p>

                  <p className={`mt-0.5 text-[10px] ${isBalanced ? 'text-emerald-700' : 'text-red-700'}`}>Difference: {formatCurrency(difference)}</p>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
