import { useEffect, useState } from 'react'
import { RefreshCw, CalendarDays, Landmark, IndianRupee, Wallet, TrendingUp, TrendingDown, FileText, AlertCircle, CheckCircle2, XCircle, Activity, Scale } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import Loading from '../Loading/Loading'
import { hasPermission, useAuth } from '../../context/AuthContext'

const formatCurrency = (amount) =>
  `₹${Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

const formatDate = (date) => {
  if (!date) return '-'

  return new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const breadcrumbItems = [
  {
    title: 'Accounting',
    link: '/company/chart-of-accounts',
  },
  {
    title: 'Financial Statements',
    link: '/company/financial-statements/balance-sheet',
  },
  {
    title: 'Balance Sheet',
    link: null,
  },
]

export default function CompanyBalanceSheet() {
  const { permissions } = useAuth()

  const canView = hasPermission(permissions, 'accounting:view-ledger')

  const date = new Date()
  const today = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  
  const [asOfDate, setAsOfDate] = useState(today)
  const [appliedAsOfDate, setAppliedAsOfDate] = useState(today)

  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)

  const showToast = (type, message, duration = 3000) => {
    setToast({
      id: Date.now(),
      type,
      message,
      duration,
    })
  }

  const closeToast = () => setToast(null)

  useEffect(() => {
    document.title = 'Balance Sheet | MineERP'
  }, [])

  // LOAD BALANCE SHEET
  const fetchReport = async (showRefresh = false, selectedDate = appliedAsOfDate) => {
    if (!canView) {
      setError('You do not have permission to view financial statements.')
      setLoading(false)
      setRefreshing(false)
      return
    }

    if (!selectedDate) {
      setError('Please select an accounting date.')
      return
    }

    if (selectedDate > today) {
      setError('Balance Sheet date cannot be in the future.')
      return
    }

    try {
      if (showRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      setError('')

      const response = await axiosInstance.get('/erp/financial-statements/balance-sheet', {
        params: {
          asOfDate: selectedDate,
        },
      })

      if (response.data?.success === false) {
        throw new Error(response.data.message || 'Unable to load Balance Sheet.')
      }

      const result = response.data?.data || {}

      setReport({
        asOfDate: result.asOfDate || selectedDate,
        assets: result.assets || {},
        liabilities: result.liabilities || {},
        equity: result.equity || {},
        summary: result.summary || {},
      })

      if (showRefresh) {
        showToast('success', 'Balance Sheet refreshed successfully.')
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load Balance Sheet.')

      setReport(null)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // INITIAL LOAD
  useEffect(() => {
    if (canView) {
      fetchReport(false, appliedAsOfDate)
    } else {
      setLoading(false)
      setError('You do not have permission to view financial statements.')
    }
  }, [canView])

  const assets = Array.isArray(report?.assets?.accounts) ? report.assets.accounts : []

  const liabilities = Array.isArray(report?.liabilities?.accounts) ? report.liabilities.accounts : []

  const equity = Array.isArray(report?.equity?.accounts) ? report.equity.accounts : []

  const totalAssets = Number(report?.summary?.totalAssets || 0)
  const totalLiabilities = Number(report?.summary?.totalLiabilities || 0)
  const totalEquity = Number(report?.summary?.totalEquity || 0)
  const currentEarnings = Number(report?.equity?.currentEarnings || 0)

  const totalLiabilitiesAndEquity = Number(report?.summary?.totalLiabilitiesAndEquity || 0)

  const difference = Number(report?.summary?.difference || 0)
  const isBalanced = report?.summary?.isBalanced === true

  const totalAccounts = assets.length + liabilities.length + equity.length

  // ACCOUNT SECTION
  const renderAccountSection = (title, accounts, total, type) => {
    const styles = {
      asset: {
        badge: 'bg-blue-50 text-blue-700',
        amount: 'text-blue-700',
        icon: 'bg-blue-50 text-blue-700',
      },
      liability: {
        badge: 'bg-orange-50 text-orange-700',
        amount: 'text-orange-700',
        icon: 'bg-orange-50 text-orange-700',
      },
      equity: {
        badge: 'bg-violet-50 text-violet-700',
        amount: 'text-violet-700',
        icon: 'bg-violet-50 text-violet-700',
      },
    }

    const style = styles[type]

    return (
      <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        <div className="flex items-center justify-between gap-3 border-b border-erp-border px-4 py-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800">{title}</h3>

            <p className="mt-0.5 text-[11px] text-slate-500">{accounts.length} accounts</p>
          </div>

          <span className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${style.badge}`}>{formatCurrency(total)}</span>
        </div>

        {accounts.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <FileText size={28} className="mx-auto text-slate-300" />

            <p className="mt-2 text-xs font-medium text-slate-500">No accounts found.</p>
          </div>
        ) : (
          <>
            {/* DESKTOP TABLE */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[650px] text-left text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-bold">Account Code</th>

                    <th className="px-4 py-3 font-bold">Account Name</th>

                    <th className="px-4 py-3 text-right font-bold">Debit</th>

                    <th className="px-4 py-3 text-right font-bold">Credit</th>

                    <th className="px-4 py-3 text-right font-bold">Balance</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {accounts.map((account) => (
                    <tr key={account._id} className="transition hover:bg-slate-50/70">
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-erp-primary">{account.accountCode}</td>

                      <td className="px-4 py-3 font-semibold text-slate-800">{account.accountName}</td>

                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums text-emerald-700">{Number(account.totalDebit || 0) > 0 ? formatCurrency(account.totalDebit) : '—'}</td>

                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums text-blue-700">{Number(account.totalCredit || 0) > 0 ? formatCurrency(account.totalCredit) : '—'}</td>

                      <td className={`whitespace-nowrap px-4 py-3 text-right font-bold tabular-nums ${style.amount}`}>{formatCurrency(account.balance)}</td>
                    </tr>
                  ))}
                </tbody>

                <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 font-bold text-slate-800">
                      Total
                    </td>

                    <td className="px-4 py-3 text-right font-bold tabular-nums text-emerald-700">{formatCurrency(accounts.reduce((sum, account) => sum + Number(account.totalDebit || 0), 0))}</td>

                    <td className="px-4 py-3 text-right font-bold tabular-nums text-blue-700">{formatCurrency(accounts.reduce((sum, account) => sum + Number(account.totalCredit || 0), 0))}</td>

                    <td className={`px-4 py-3 text-right font-bold tabular-nums ${style.amount}`}>{formatCurrency(total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* MOBILE ACCOUNT CARDS */}
            <div className="divide-y divide-slate-100 md:hidden">
              {accounts.map((account) => (
                <div key={account._id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-erp-primary">{account.accountCode}</p>

                      <h4 className="mt-1 text-xs font-bold text-slate-800">{account.accountName}</h4>
                    </div>

                    <p className={`shrink-0 text-xs font-bold tabular-nums ${style.amount}`}>{formatCurrency(account.balance)}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-emerald-50 p-2">
                      <p className="text-[10px] font-semibold text-emerald-700">Debit</p>

                      <p className="mt-1 text-[11px] font-bold tabular-nums text-emerald-800">{formatCurrency(account.totalDebit)}</p>
                    </div>

                    <div className="rounded-lg bg-blue-50 p-2">
                      <p className="text-[10px] font-semibold text-blue-700">Credit</p>

                      <p className="mt-1 text-[11px] font-bold tabular-nums text-blue-800">{formatCurrency(account.totalCredit)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold text-slate-700">Total {title}</p>

            <p className={`text-sm font-bold tabular-nums ${style.amount}`}>{formatCurrency(total)}</p>
          </div>
        </div>
      </section>
    )
  }

  if (!canView) {
    return (
      <div className="rounded-xl border border-red-200 bg-white p-8 text-center">
        <AlertCircle size={28} className="mx-auto text-red-500" />

        <h2 className="mt-3 text-sm font-bold text-slate-800">Access denied</h2>

        <p className="mt-1 text-xs text-slate-500">You do not have permission to view the Balance Sheet.</p>
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
            onClick={() => fetchReport(true)}
            disabled={loading || refreshing}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </section>

      {/* FILTERS */}
      <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        <div className="flex items-center gap-2 border-b border-erp-border px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
            <CalendarDays size={16} />
          </div>

          <div>
            <h2 className="text-sm font-bold text-slate-800">Balance Sheet Filters</h2>

            <p className="text-[11px] text-slate-500">Select an accounting date to view financial position</p>
          </div>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            setAppliedAsOfDate(asOfDate)
            fetchReport(false, asOfDate)
          }}
          className="grid items-end gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">As Of Date</label>

            <div className="relative">
              <CalendarDays size={14} className="absolute left-3 top-3 text-slate-400" />

              <input
                type="date"
                value={asOfDate}
                max={today}
                onChange={(event) => setAsOfDate(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-700 outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || refreshing || !asOfDate}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-erp-primary px-3 text-xs font-semibold text-white transition hover:bg-erp-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Activity size={14} />
            Generate Report
          </button>
        </form>
      </section>

      {/* ERROR */}
      {error && (
        <section className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
          <AlertCircle size={17} className="mt-0.5 shrink-0 text-red-600" />

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-red-700">{error}</p>

            <button type="button" onClick={() => fetchReport()} className="mt-1 text-[11px] font-semibold text-red-700 underline">
              Try again
            </button>
          </div>
        </section>
      )}

      {/* LOADING */}
      {loading && (
        <section className="relative min-h-[300px] overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <Loading fullScreen={false} label="Loading Balance Sheet" description="Calculating assets, liabilities and equity..." className="!h-full min-h-[300px]" />
        </section>
      )}

      {/* REPORT CONTENT */}
      {!loading && report && (
        <>
          {/* REPORT INFORMATION */}
          <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-erp-border bg-erp-surface p-3 shadow-erp-card">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
                <Landmark size={19} />
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Financial Statement</p>

                <h2 className="text-sm font-bold text-slate-800">Balance Sheet</h2>

                <p className="text-[11px] text-slate-500">As of {formatDate(report.asOfDate)}</p>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Total Accounts</p>

              <p className="text-sm font-bold tabular-nums text-slate-800">{totalAccounts}</p>
            </div>
          </section>

          {/* SUMMARY CARDS */}
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="relative overflow-hidden rounded-xl border border-erp-border bg-erp-surface p-4 shadow-erp-card">
              <div className="absolute inset-x-0 top-0 h-1 bg-blue-500" />

              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-500">Total Assets</p>

                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                  <Wallet size={16} />
                </div>
              </div>

              <p className="mt-3 text-lg font-bold tabular-nums text-blue-700">{formatCurrency(totalAssets)}</p>
            </div>

            <div className="relative overflow-hidden rounded-xl border border-erp-border bg-erp-surface p-4 shadow-erp-card">
              <div className="absolute inset-x-0 top-0 h-1 bg-orange-500" />

              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-500">Total Liabilities</p>

                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-700">
                  <TrendingDown size={16} />
                </div>
              </div>

              <p className="mt-3 text-lg font-bold tabular-nums text-orange-700">{formatCurrency(totalLiabilities)}</p>
            </div>

            <div className="relative overflow-hidden rounded-xl border border-erp-border bg-erp-surface p-4 shadow-erp-card">
              <div className="absolute inset-x-0 top-0 h-1 bg-violet-500" />

              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-500">Total Equity</p>

                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                  <IndianRupee size={16} />
                </div>
              </div>

              <p className="mt-3 text-lg font-bold tabular-nums text-violet-700">{formatCurrency(totalEquity + currentEarnings)}</p>
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

          {/* ASSETS */}
          {renderAccountSection('Assets', assets, report.assets?.total || 0, 'asset')}

          {/* LIABILITIES */}
          {renderAccountSection('Liabilities', liabilities, report.liabilities?.total || 0, 'liability')}

          {/* EQUITY */}
          {renderAccountSection('Equity', equity, report.equity?.total || 0, 'equity')}

          {/* EQUITY SUMMARY */}
          <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
            <div className="h-1 bg-erp-primary" />

            <div className="p-4">
              <h3 className="text-sm font-bold text-slate-800">Equity Summary</h3>

              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-600">Equity Accounts</p>

                  <p className="text-xs font-semibold tabular-nums text-slate-800">{formatCurrency(totalEquity)}</p>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-600">Current Earnings</p>

                  <p className={`text-xs font-semibold tabular-nums ${currentEarnings >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{formatCurrency(currentEarnings)}</p>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-erp-border pt-3">
                  <p className="text-xs font-bold text-slate-800">Total Equity Including Earnings</p>

                  <p className="text-sm font-bold tabular-nums text-violet-700">{formatCurrency(report.equity?.totalIncludingEarnings ?? totalEquity + currentEarnings)}</p>
                </div>
              </div>
            </div>
          </section>

          {/* BALANCE SHEET SUMMARY */}
          <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
            <div className="h-1 bg-erp-primary" />

            <div className="p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
                  <Scale size={17} />
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-800">Balance Sheet Summary</h3>

                  <p className="text-[11px] text-slate-500">Assets = Liabilities + Equity</p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-600">Total Assets</p>

                  <p className="text-xs font-bold tabular-nums text-blue-700">{formatCurrency(totalAssets)}</p>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-600">Total Liabilities</p>

                  <p className="text-xs font-bold tabular-nums text-orange-700">{formatCurrency(totalLiabilities)}</p>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-600">Total Equity Including Earnings</p>

                  <p className="text-xs font-bold tabular-nums text-violet-700">{formatCurrency(totalEquity + currentEarnings)}</p>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-erp-border pt-3">
                  <p className="text-xs font-bold text-slate-800">Liabilities + Equity</p>

                  <p className="text-sm font-bold tabular-nums text-slate-900">{formatCurrency(totalLiabilitiesAndEquity)}</p>
                </div>

                <div className={`flex items-center gap-2 rounded-lg border p-3 ${isBalanced ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
                  {isBalanced ? <CheckCircle2 size={17} className="shrink-0 text-emerald-600" /> : <XCircle size={17} className="shrink-0 text-red-600" />}

                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-bold ${isBalanced ? 'text-emerald-800' : 'text-red-800'}`}>{isBalanced ? 'Balance Sheet is Balanced' : 'Balance Sheet is Unbalanced'}</p>

                    <p className={`mt-0.5 text-[10px] ${isBalanced ? 'text-emerald-700' : 'text-red-700'}`}>Difference: {formatCurrency(difference)}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
