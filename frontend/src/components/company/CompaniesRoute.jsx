import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, ShieldCheck, LogOut, Menu, X, Bell, ChevronRight, PanelLeftClose, PanelLeftOpen, Building2, Tags, Package, Boxes, Truck, ContactRound, ShoppingCart, ShoppingBag, FileText, CreditCard, Receipt, ChartNoAxesCombined, Settings, Warehouse, } from 'lucide-react'

import { useAuth } from '../../context/AuthContext'

const navigationItems = [
  {
    label: 'Dashboard',
    path: '/company',
    icon: LayoutDashboard,
    end: true,
    section: 'Dashboard',
    actions: ['dashboard:view'],
  },
  {
    label: 'Employees',
    path: '/company/employees',
    icon: Users,
    section: 'Employee',
    actions: ['employee:list', 'employee:view'],
  },
  {
    label: 'Roles & Permissions',
    path: '/company/roles',
    icon: ShieldCheck,
    section: 'Role',
    actions: ['role:list', 'role:view'],
  },
  {
    label: 'Categories',
    path: '/company/categories',
    icon: Tags,
    section: 'Category',
    actions: ['category:list', 'category:view'],
  },
  {
    label: 'Products',
    path: '/company/products',
    icon: Package,
    section: 'Product',
    actions: ['product:list', 'product:view'],
  },
  {
    label: 'Inventory',
    path: '/company/inventory',
    icon: Boxes,
    section: 'Inventory',
    actions: ['inventory:view', 'inventory:view-stock'],
  },
  {
    label: 'Suppliers',
    path: '/company/suppliers',
    icon: Truck,
    section: 'Supplier',
    actions: ['supplier:list', 'supplier:view'],
  },
  {
    label: 'Customers',
    path: '/company/customers',
    icon: ContactRound,
    section: 'Customer',
    actions: ['customer:list', 'customer:view'],
  },
  {
    label: 'Purchase',
    path: '/company/purchases',
    icon: ShoppingCart,
    section: 'Purchase',
    actions: ['purchase:list', 'purchase:view'],
  },
  {
    label: 'Sales & Orders',
    path: '/company/orders',
    icon: ShoppingBag,
    section: 'Sales',
    actions: ['sales:list', 'sales:view'],
  },
  {
    label: 'Invoices',
    path: '/company/invoices',
    icon: FileText,
    section: 'Invoice',
    actions: ['invoice:list', 'invoice:view'],
  },
  {
    label: 'Payments',
    path: '/company/payments',
    icon: CreditCard,
    section: 'Payment',
    actions: ['payment:list', 'payment:view'],
  },
  {
    label: 'Expenses',
    path: '/company/expenses',
    icon: Receipt,
    section: 'Expense',
    actions: ['expense:list', 'expense:view'],
  },
  {
    label: 'Warehouse',
    path: '/company/warehouses',
    icon: Warehouse,
    section: 'Warehouse',
    actions: ['warehouse:list', 'warehouse:view'],
  },
  {
    label: 'Reports',
    path: '/company/reports',
    icon: ChartNoAxesCombined,
    section: 'Reports',
    actions: ['reports:view'],
  },
  {
    label: 'Settings',
    path: '/company/settings',
    icon: Settings,
    section: 'Settings',
    actions: ['settings:view'],
  },
]

const pageTitles = {
  company: 'Dashboard',
  employees: 'Employees',
  roles: 'Roles & Permissions',
  categories: 'Categories',
  products: 'Products',
  inventory: 'Inventory',
  suppliers: 'Suppliers Management',
  customers: 'Customers Management',
  purchases: 'Purchase Management',
  orders: 'Sales & Orders',
  invoices: 'Invoice Management',
  payments: 'Payment Management',
  expenses: 'Expense Management',
  warehouses: 'Warehouse Management',
  reports: 'Reports & Analytics',
  settings: 'Company Settings',
}

const hasPermission = (permissions, actions = []) => {
  // SuperAdmin permissions are unrestricted.
  if (permissions === null) return true

  if (!permissions || typeof permissions !== 'object') {
    return false
  }

  const sectionKey = {
    dashboard: 'Dashboard',
    employee: 'Employee',
    role: 'Role',
    category: 'Category',
    product: 'Product',
    inventory: 'Inventory',
    supplier: 'Supplier',
    customer: 'Customer',
    purchase: 'Purchase',
    sales: 'Sales',
    invoice: 'Invoice',
    payment: 'Payment',
    expense: 'Expense',
    warehouse: 'Warehouse',
    reports: 'Reports',
    settings: 'Settings',
  }

  return actions.some((action) => {
    const section = action.split(':')[0]
    const key = sectionKey[section]

    return (key && Array.isArray(permissions[key]) && permissions[key].includes(action)) || (Array.isArray(permissions.__customActions) && permissions.__customActions.includes(action))
  })
}

export default function CompaniesRoute() {
  const { user, permissions, loading, logout } = useAuth()

  const location = useLocation()
  const navigate = useNavigate()
  const sidebarRef = useRef(null)

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)

  useEffect(() => {
    setSidebarOpen(false)
    setNotificationOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setSidebarOpen(false)
        setNotificationOpen(false)
      }
    }

    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-erp-primary" />
          <p className="mt-4 text-sm font-medium text-slate-600">Loading your workspace...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  const userRoles = Array.isArray(user.roles) ? user.roles.map((role) => (typeof role === 'string' ? role : role?.name)) : []

  const isCompanyAdmin = user.role === 'CompanyAdmin' || userRoles.includes('CompanyAdmin')

  const isEmployee = user.role === 'Employee' || userRoles.includes('Employee')

  if (!isCompanyAdmin && !isEmployee) {
    return <Navigate to="/" replace />
  }

  const visibleNavigationItems = navigationItems.filter((item) => hasPermission(permissions, item.actions))

  const pathParts = location.pathname.split('/').filter(Boolean)

  const currentPath = pathParts[1] || 'company'

  const pageTitle = pageTitles[currentPath] || 'Company Workspace'

  const displayName = user.name || user.fullName || user.email?.split('@')[0] || 'User'

  const roleLabel = isCompanyAdmin ? 'Company Admin' : 'Employee'

  const companyName = user.companyName || user.company?.companyName || 'MineERP Workspace'

  const handleLogout = async () => {
    if (loggingOut) return

    try {
      setLoggingOut(true)
      await logout()
      navigate('/login', { replace: true })
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {sidebarOpen && <button type="button" aria-label="Close sidebar overlay" className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside
        ref={sidebarRef}
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200 bg-white transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-72'} ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="flex h-20 shrink-0 items-center justify-between border-b border-slate-100 px-5">
          <NavLink to="/company" className="flex min-w-0 items-center gap-3" title="MineERP">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-erp-primary text-white shadow-sm">
              <Building2 size={22} />
            </div>

            {!sidebarCollapsed && (
              <div className="min-w-0">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  Mine<span className="text-erp-primary">ERP</span>
                </h1>
                <p className="truncate text-xs text-slate-500">Enterprise workspace</p>
              </div>
            )}
          </NavLink>

          <button type="button" onClick={() => setSidebarOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="Close sidebar">
            <X size={19} />
          </button>
        </div>

        {!sidebarCollapsed && (
          <div className="mx-4 mt-5 rounded-xl border border-violet-100 bg-violet-50/70 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-erp-primary shadow-sm">
                <Building2 size={20} />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">{companyName}</p>
                <p className="mt-0.5 text-xs text-slate-500">{roleLabel}</p>
              </div>
            </div>
          </div>
        )}

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          {!sidebarCollapsed && <p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Workspace</p>}

          {visibleNavigationItems.map((item) => {
            const Icon = item.icon

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                title={sidebarCollapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${isActive ? 'bg-erp-primary-light text-erp-primary' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'} ${
                    sidebarCollapsed ? 'justify-center' : ''
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={19} className={isActive ? 'shrink-0 text-erp-primary' : 'shrink-0 text-slate-500 group-hover:text-slate-700'} />

                    {!sidebarCollapsed && (
                      <>
                        <span className="flex-1 truncate">{item.label}</span>

                        {isActive && <ChevronRight size={16} className="shrink-0" />}
                      </>
                    )}
                  </>
                )}
              </NavLink>
            )
          })}

          {visibleNavigationItems.length === 0 && <p className="px-3 py-4 text-sm text-slate-500">No modules are available for your account.</p>}
        </nav>

        <div className="shrink-0 border-t border-slate-100 p-3">
          <button type="button" onClick={() => setSidebarCollapsed((previous) => !previous)} className="hidden w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-600 hover:bg-slate-100 lg:flex">
            {sidebarCollapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}

            {!sidebarCollapsed && <span>Collapse sidebar</span>}
          </button>

          <div className={`flex items-center gap-3 rounded-xl bg-slate-50 p-3 ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-erp-primary-light text-sm font-bold text-erp-primary">{displayName.charAt(0).toUpperCase()}</div>

            {!sidebarCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">{displayName}</p>
                <p className="truncate text-xs text-slate-500">{user.email}</p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            title={sidebarCollapsed ? 'Logout' : undefined}
            className={`mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 ${sidebarCollapsed ? 'justify-center' : ''}`}
          >
            <LogOut size={19} />

            {!sidebarCollapsed && <span>{loggingOut ? 'Logging out...' : 'Logout'}</span>}
          </button>
        </div>
      </aside>

      <div className={`min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-72'}`}>
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={() => setSidebarOpen(true)} className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Open sidebar">
              <Menu size={22} />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Workspace</span>
                <ChevronRight size={13} />
                <span className="truncate text-slate-600">{pageTitle}</span>
              </div>

              <h2 className="mt-1 truncate text-lg font-bold text-slate-900 sm:text-xl">{pageTitle}</h2>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationOpen((previous) => !previous)}
                className={`relative rounded-xl p-2.5 transition-colors ${notificationOpen ? 'bg-erp-primary-light text-erp-primary' : 'text-slate-500 hover:bg-slate-100'}`}
                aria-label="Notifications"
                aria-expanded={notificationOpen}
              >
                <Bell size={20} />
              </button>

              {notificationOpen && (
                <div className="absolute right-0 top-12 z-50 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl sm:w-80">
                  <h3 className="font-semibold text-slate-900">Notifications</h3>
                  <p className="mt-2 text-sm text-slate-500">You are all caught up.</p>
                </div>
              )}
            </div>

            <div className="hidden h-9 w-px bg-slate-200 sm:block" />

            <div className="hidden max-w-44 sm:block">
              <p className="truncate text-sm font-semibold text-slate-800">{displayName}</p>
              <p className="truncate text-xs text-slate-500">{roleLabel}</p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-erp-primary-light text-sm font-bold text-erp-primary sm:hidden">{displayName.charAt(0).toUpperCase()}</div>
          </div>
        </header>

        <main className="px-4 sm:px-6 lg:px-8 ">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
