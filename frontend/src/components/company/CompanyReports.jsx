import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ChartNoAxesCombined, ShoppingCart, Boxes, ArrowLeftRight, Users, Truck, FileText, Wallet, Receipt, ArrowUpRight, BarChart3, TrendingUp, Package } from 'lucide-react'

import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import { useAuth, hasPermission } from '../../context/AuthContext'

const reportGroups = [
  {
    category: 'Sales & Revenue',
    description: 'Track sales performance and customer revenue.',
    reports: [
      {
        title: 'Sales Report',
        description: 'Analyze sales orders, revenue, quantities and sales performance.',
        path: '/company/reports/sales',
        permission: 'reports:sales',
        icon: ChartNoAxesCombined,
        iconColor: 'text-violet-700',
        iconBg: 'bg-violet-50',
        accent: 'bg-violet-500',
        tag: 'Sales',
      },
      {
        title: 'Customer Report',
        description: 'Review customer activity, purchase history and business contribution.',
        path: '/company/reports/customers',
        permission: 'reports:customer',
        icon: Users,
        iconColor: 'text-blue-700',
        iconBg: 'bg-blue-50',
        accent: 'bg-blue-500',
        tag: 'Customers',
      },
    ],
  },
  {
    category: 'Purchase & Inventory',
    description: 'Monitor procurement, stock and warehouse operations.',
    reports: [
      {
        title: 'Purchase Report',
        description: 'Analyze purchase orders, supplier spending and received quantities.',
        path: '/company/reports/purchases',
        permission: 'reports:purchase',
        icon: ShoppingCart,
        iconColor: 'text-emerald-700',
        iconBg: 'bg-emerald-50',
        accent: 'bg-emerald-500',
        tag: 'Purchase',
      },
      {
        title: 'Inventory Report',
        description: 'View available stock, inventory valuation and warehouse balances.',
        path: '/company/reports/inventory',
        permission: 'reports:inventory',
        icon: Boxes,
        iconColor: 'text-indigo-700',
        iconBg: 'bg-indigo-50',
        accent: 'bg-indigo-500',
        tag: 'Inventory',
      },
      {
        title: 'Stock Movement Report',
        description: 'Track every Stock IN, Stock OUT and warehouse stock transfer.',
        path: '/company/reports/stock-movements',
        permission: 'reports:inventory',
        icon: ArrowLeftRight,
        iconColor: 'text-amber-700',
        iconBg: 'bg-amber-50',
        accent: 'bg-amber-500',
        tag: 'Stock',
      },
      {
        title: 'Supplier Report',
        description: 'Review supplier transactions, purchase history and procurement activity.',
        path: '/company/reports/suppliers',
        permission: 'reports:supplier',
        icon: Truck,
        iconColor: 'text-cyan-700',
        iconBg: 'bg-cyan-50',
        accent: 'bg-cyan-500',
        tag: 'Suppliers',
      },
    ],
  },
  {
    category: 'Finance & Expenses',
    description: 'Understand invoices, collections and business expenses.',
    reports: [
      {
        title: 'Invoice Report',
        description: 'Analyze invoices, outstanding balances and payment status.',
        path: '/company/reports/invoices',
        permission: 'reports:invoice',
        icon: FileText,
        iconColor: 'text-rose-700',
        iconBg: 'bg-rose-50',
        accent: 'bg-rose-500',
        tag: 'Invoices',
      },
      {
        title: 'Payment Report',
        description: 'Track customer payments, collections and payment methods.',
        path: '/company/reports/payments',
        permission: 'reports:payment',
        icon: Wallet,
        iconColor: 'text-teal-700',
        iconBg: 'bg-teal-50',
        accent: 'bg-teal-500',
        tag: 'Payments',
      },
      {
        title: 'Expense Report',
        description: 'Review business expenses, categories and total expenditure.',
        path: '/company/reports/expenses',
        permission: 'reports:expense',
        icon: Receipt,
        iconColor: 'text-orange-700',
        iconBg: 'bg-orange-50',
        accent: 'bg-orange-500',
        tag: 'Expenses',
      },
    ],
  },
]

export default function CompanyReports() {
  const { permissions } = useAuth()

  const canViewReports = hasPermission(permissions, 'reports:view')

  const visibleGroups = reportGroups
    .map((group) => ({
      ...group,
      reports: group.reports.filter((report) => hasPermission(permissions, report.permission)),
    }))
    .filter((group) => group.reports.length > 0)

  const visibleReportCount = visibleGroups.reduce((total, group) => total + group.reports.length, 0)

  const breadcrumbItems = [{ title: 'Reports', link: null }]

  useEffect(() => {
    document.title = 'Reports | MineERP'
  }, [])

  return (
    <div className="min-w-0 space-y-4 pb-8 text-sm">
      {/* HEADER */}

      <section className="flex h-17 items-center justify-between overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        <div className="h-full w-full border-t-4 border-erp-primary flex items-center justify-between px-4 sm:px-5">
          <BreadCrumb items={breadcrumbItems} />

          <div className="flex shrink-0 items-center gap-2 rounded-lg border border-erp-border bg-erp-surface px-3 py-1.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-erp-primary-light text-erp-primary">
              <BarChart3 size={17} />
            </div>

            <p className="text-sm font-bold text-erp-text">{visibleReportCount} Reports</p>
          </div>
        </div>
      </section>

      {/* ACCESS VALIDATION */}

      {!canViewReports ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-center">
          <ChartNoAxesCombined size={30} className="mx-auto text-amber-600" />

          <h2 className="mt-3 text-sm font-bold text-amber-800">Reports Access Required</h2>

          <p className="mt-1 text-xs text-amber-700">You do not have permission to access the Reports dashboard.</p>
        </section>
      ) : visibleReportCount === 0 ? (
        <section className="rounded-xl border border-erp-border bg-erp-surface px-4 py-14 text-center shadow-erp-card">
          <FileText size={32} className="mx-auto text-slate-400" />

          <h2 className="mt-3 text-sm font-bold text-erp-text">No Reports Available</h2>

          <p className="mt-1 text-xs text-erp-muted">Your account does not currently have access to any report.</p>
        </section>
      ) : (
        <>
          {/* OVERVIEW BANNER */}

          <section className="relative overflow-hidden rounded-xl bg-gradient-to-r from-violet-800 via-violet-700 to-indigo-700 p-5 text-white shadow-erp-card sm:p-6">
            <div className="pointer-events-none absolute -right-8 -top-12 h-48 w-48 rounded-full border-[24px] border-white/10" />
            <div className="pointer-events-none absolute -bottom-16 right-32 h-40 w-40 rounded-full bg-white/5" />

            <div className="relative flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-violet-100">
                  <TrendingUp size={12} />
                  BUSINESS INTELLIGENCE
                </div>

                <h2 className="mt-3 text-xl font-bold sm:text-2xl">Your Business, At A Glance</h2>

                <p className="mt-2 max-w-lg text-xs leading-5 text-violet-100 sm:text-sm">Explore detailed reports across sales, purchases, inventory and finance. Turn your business data into meaningful insights.</p>
              </div>

              <div className="flex h-20 w-20 shrink-0 items-center justify-center self-start rounded-2xl border border-white/20 bg-white/10 sm:mr-5 sm:h-24 sm:w-24">
                <ChartNoAxesCombined size={48} strokeWidth={1.4} className="text-white" />
              </div>
            </div>
          </section>

          {/* REPORT GROUPS */}

          <div className="space-y-6">
            {visibleGroups.map((group) => (
              <section key={group.category} className="space-y-3">
                {/* CATEGORY HEADER */}

                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-erp-text sm:text-base">{group.category}</h2>
                    <p className="mt-0.5 text-[11px] text-erp-muted sm:text-xs">{group.description}</p>
                  </div>

                  <span className="shrink-0 rounded-full border border-erp-border bg-erp-surface px-2.5 py-1 text-[10px] font-semibold text-erp-text-secondary">{group.reports.length} Reports</span>
                </div>

                {/* REPORT CARDS */}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {group.reports.map((report) => {
                    const Icon = report.icon

                    return (
                      <Link
                        key={report.path}
                        to={report.path}
                        className="group relative flex min-h-[185px] flex-col overflow-hidden rounded-xl border border-erp-border bg-erp-surface p-4 shadow-erp-card transition-all duration-200 hover:-translate-y-1 hover:border-erp-primary/40 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-erp-primary/30"
                      >
                        <div className={`absolute left-0 top-0 h-1 w-full ${report.accent} opacity-80`} />

                        <div className="flex items-start justify-between gap-3">
                          <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${report.iconBg} ${report.iconColor}`}>
                            <Icon size={21} />
                          </div>

                          <span className="rounded-full border border-erp-border bg-slate-50 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-erp-text-secondary">{report.tag}</span>
                        </div>

                        <div className="mt-4 flex-1">
                          <h3 className="text-sm font-bold text-erp-text transition-colors group-hover:text-erp-primary">{report.title}</h3>

                          <p className="mt-1.5 text-xs leading-5 text-erp-muted">{report.description}</p>
                        </div>

                        <div className="mt-4 flex items-center justify-between border-t border-erp-border pt-3">
                          <span className="text-xs font-semibold text-erp-primary">Open Report</span>

                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-erp-primary-light text-erp-primary transition-all group-hover:translate-x-1 group-hover:bg-erp-primary group-hover:text-white">
                            <ArrowUpRight size={15} />
                          </span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>

          {/* FOOTER NOTE */}

          <div className="flex items-start gap-2 rounded-lg border border-erp-border bg-erp-surface px-3 py-3">
            <Package size={15} className="mt-0.5 shrink-0 text-erp-primary" />

            <p className="text-[11px] leading-5 text-erp-text-secondary">Reports are generated using your company's recorded transactions. Data availability depends on your assigned permissions and selected report filters.</p>
          </div>
        </>
      )}
    </div>
  )
}
