import { useEffect, useState } from 'react'
import { Search, RefreshCw, CalendarDays, IndianRupee, ArrowDownLeft, ArrowUpRight, TrendingUp, TrendingDown, FileText, AlertCircle, Activity } from 'lucide-react'

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
    link: '/company/financial-statements/profit-loss',
  },
  {
    title: 'Profit & Loss',
    link: null,
  },
]

export default function CompanyProfitLoss() {
  const { permissions } = useAuth()

  const canView = hasPermission(permissions, 'accounting:view-ledger')

  const today = new Date().toISOString().split('T')[0]
  const firstDay = `${today.slice(0, 4)}-${today.slice(5, 7)}-01`

  const [fromDate, setFromDate] = useState(firstDay)
  const [toDate, setToDate] = useState(today)

  const [report, setReport] = useState(null)
  const [search, setSearch] = useState('')

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
    document.title = 'Profit & Loss | MineERP'
  }, [])

  // LOAD PROFIT & LOSS REPORT
  const fetchReport = async (showRefresh = false) => {
    if (!canView) {
      setError('You do not have permission to view financial statements.')
      setLoading(false)
      setRefreshing(false)
      return
    }

    if (!fromDate || !toDate) {
      setError('Please select both report dates.')
      return
    }

    if (fromDate > toDate) {
      setError('From date cannot be later than To date.')
      return
    }

    try {
      if (showRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      setError('')

      const response = await axiosInstance.get('/erp/financial-statements/profit-loss', {
        params: {
          fromDate,
          toDate,
        },
      })

      if (response.data?.success === false) {
        throw new Error(response.data.message || 'Unable to load Profit & Loss report.')
      }

      const result = response.data?.data || {}

      setReport({
        fromDate: result.fromDate || fromDate,
        toDate: result.toDate || toDate,
        income: result.income || {},
        expenses: result.expenses || {},
        summary: result.summary || {},
      })

      if (showRefresh) {
        showToast('success', 'Profit & Loss report refreshed successfully.')
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load Profit & Loss report.')

      setReport(null)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // INITIAL LOAD
  useEffect(() => {
    if (canView) {
      fetchReport()
    } else {
      setLoading(false)
      setError('You do not have permission to view financial statements.')
    }
  }, [canView])

  const incomeAccounts = Array.isArray(report?.income?.accounts) ? report.income.accounts : []

  const expenseAccounts = Array.isArray(report?.expenses?.accounts) ? report.expenses.accounts : []

  // SEARCH FILTER
  const filteredIncome = incomeAccounts.filter((account) => {
    const value = `${account.accountCode || ''} ${account.accountName || ''}`.toLowerCase()

    return value.includes(search.trim().toLowerCase())
  })

  const filteredExpenses = expenseAccounts.filter((account) => {
    const value = `${account.accountCode || ''} ${account.accountName || ''}`.toLowerCase()

    return value.includes(search.trim().toLowerCase())
  })

  const totalIncome = Number(report?.summary?.totalIncome || 0)
  const totalExpenses = Number(report?.summary?.totalExpenses || 0)
  const netProfit = Number(report?.summary?.netProfit || 0)

  const isProfit = netProfit > 0
  const isLoss = netProfit < 0

  // SUMMARY CARDS
  const summaryCards = [
    {
      title: 'Total Income',
      value: totalIncome,
      icon: ArrowDownLeft,
      iconStyle: 'bg-emerald-50 text-emerald-600',
      valueStyle: 'text-emerald-700',
      borderStyle: 'bg-emerald-500',
    },
    {
      title: 'Total Expenses',
      value: totalExpenses,
      icon: ArrowUpRight,
      iconStyle: 'bg-rose-50 text-rose-600',
      valueStyle: 'text-rose-700',
      borderStyle: 'bg-rose-500',
    },
    {
      title: isProfit ? 'Net Profit' : isLoss ? 'Net Loss' : 'Net Result',
      value: Math.abs(netProfit),
      icon: isProfit ? TrendingUp : isLoss ? TrendingDown : Activity,
      iconStyle: isProfit ? 'bg-emerald-50 text-emerald-600' : isLoss ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-600',
      valueStyle: isProfit ? 'text-emerald-700' : isLoss ? 'text-rose-700' : 'text-slate-700',
      borderStyle: isProfit ? 'bg-emerald-500' : isLoss ? 'bg-rose-500' : 'bg-slate-400',
    },
  ]

  // ACCOUNT TABLE
  const renderAccountTable = (accounts, title, type) => {
    const isIncome = type === 'income'

    const sectionTotal = Number(isIncome ? report?.income?.total : report?.expenses?.total)

    return (
      <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        <div className="flex items-center justify-between gap-3 border-b border-erp-border px-4 py-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800">{title}</h3>

            <p className="mt-0.5 text-[11px] text-slate-500">{accounts.length} accounts</p>
          </div>

          <span className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${isIncome ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{formatCurrency(sectionTotal)}</span>
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
              <table className="w-full min-w-[750px] text-left text-xs">
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

                      <td className="whitespace-nowrap px-4 py-3 text-right font-bold tabular-nums text-slate-800">{formatCurrency(account.balance)}</td>
                    </tr>
                  ))}
                </tbody>

                <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 font-bold text-slate-800">
                      Total
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-right font-bold tabular-nums text-emerald-700">{formatCurrency(accounts.reduce((sum, account) => sum + Number(account.totalDebit || 0), 0))}</td>

                    <td className="whitespace-nowrap px-4 py-3 text-right font-bold tabular-nums text-blue-700">{formatCurrency(accounts.reduce((sum, account) => sum + Number(account.totalCredit || 0), 0))}</td>

                    <td className="whitespace-nowrap px-4 py-3 text-right font-bold tabular-nums text-slate-800">{formatCurrency(sectionTotal)}</td>
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

                    <p className="shrink-0 text-xs font-bold tabular-nums text-slate-800">{formatCurrency(account.balance)}</p>
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
            <p className="text-xs font-bold text-slate-700">Total {isIncome ? 'Income' : 'Expenses'}</p>

            <p className={`text-sm font-bold tabular-nums ${isIncome ? 'text-emerald-700' : 'text-rose-700'}`}>{formatCurrency(sectionTotal)}</p>
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

        <p className="mt-1 text-xs text-slate-500">You do not have permission to view financial statements.</p>
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

      {/* REPORT PERIOD FILTERS */}
      <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        <div className="flex items-center gap-2 border-b border-erp-border px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
            <CalendarDays size={16} />
          </div>

          <div>
            <h2 className="text-sm font-bold text-slate-800">Profit & Loss Filters</h2>

            <p className="text-[11px] text-slate-500">Select a date range to view income and expenses</p>
          </div>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            fetchReport()
          }}
          className="grid items-end gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">From Date</label>

            <input
              type="date"
              value={fromDate}
              max={toDate || today}
              onChange={(event) => setFromDate(event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">To Date</label>

            <input
              type="date"
              value={toDate}
              min={fromDate}
              max={today}
              onChange={(event) => setToDate(event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10"
            />
          </div>

          <button
            type="submit"
            disabled={loading || refreshing || !fromDate || !toDate || fromDate > toDate}
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
          <Loading fullScreen={false} label="Loading Profit & Loss" description="Calculating income and expenses..." className="!h-full min-h-[300px]" />
        </section>
      )}

      {/* REPORT CONTENT */}
      {!loading && report && (
        <>
          {/* REPORT INFORMATION */}
          <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-erp-border bg-erp-surface p-3 shadow-erp-card">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
                <IndianRupee size={19} />
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Financial Statement</p>

                <h2 className="text-sm font-bold text-slate-800">Profit & Loss Statement</h2>

                <p className="text-[11px] text-slate-500">
                  {formatDate(report.fromDate)} - {formatDate(report.toDate)}
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Total Accounts</p>

              <p className="text-sm font-bold tabular-nums text-slate-800">{incomeAccounts.length + expenseAccounts.length}</p>
            </div>
          </section>

          {/* SUMMARY CARDS */}
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {summaryCards.map((card) => {
              const Icon = card.icon

              return (
                <div key={card.title} className="relative overflow-hidden rounded-xl border border-erp-border bg-erp-surface p-4 shadow-erp-card">
                  <div className={`absolute inset-x-0 top-0 h-1 ${card.borderStyle}`} />

                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-500">{card.title}</p>

                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.iconStyle}`}>
                      <Icon size={16} />
                    </div>
                  </div>

                  <p className={`mt-3 text-lg font-bold tabular-nums ${card.valueStyle}`}>{formatCurrency(card.value)}</p>
                </div>
              )
            })}
          </section>

          {/* ACCOUNT BREAKDOWN HEADER */}
          <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Account Breakdown</h2>

              <p className="mt-0.5 text-[11px] text-slate-500">Income and expense account-wise details</p>
            </div>

            <div className="relative w-full sm:max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search account code or name..."
                className="h-9 w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-700 outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10"
              />
            </div>
          </section>

          {/* INCOME ACCOUNTS */}
          {renderAccountTable(filteredIncome, 'Income Accounts', 'income')}

          {/* EXPENSE ACCOUNTS */}
          {renderAccountTable(filteredExpenses, 'Expense Accounts', 'expense')}

          {/* NET RESULT */}
          <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
            <div className="h-1 bg-erp-primary" />

            <div className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Net Result</h3>

                  <p className="mt-1 text-[11px] text-slate-500">Total Income minus Total Expenses</p>
                </div>

                <div className="text-left sm:text-right">
                  <p className={`text-xl font-bold tabular-nums ${isProfit ? 'text-emerald-700' : isLoss ? 'text-rose-700' : 'text-slate-700'}`}>{formatCurrency(Math.abs(netProfit))}</p>

                  <p className={`mt-1 text-xs font-semibold ${isProfit ? 'text-emerald-600' : isLoss ? 'text-rose-600' : 'text-slate-500'}`}>{report.summary?.status || 'Break Even'}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-erp-border pt-3">
                <div>
                  <p className="text-[10px] font-semibold text-slate-500">Total Income</p>

                  <p className="mt-1 text-xs font-bold tabular-nums text-emerald-700">{formatCurrency(totalIncome)}</p>
                </div>

                <div>
                  <p className="text-[10px] font-semibold text-slate-500">Total Expenses</p>

                  <p className="mt-1 text-xs font-bold tabular-nums text-rose-700">{formatCurrency(totalExpenses)}</p>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
