import { useEffect, useState } from 'react'
import { NavLink, Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom'

import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  Bell,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Building2,
  Tags,
  Package,
  Boxes,
  Truck,
  ContactRound,
  ShoppingCart,
  ShoppingBag,
  FileText,
  CreditCard,
  Receipt,
  ChartNoAxesCombined,
  Settings,
  Warehouse,
} from 'lucide-react'

import { useAuth } from '../../context/AuthContext'

const navigationItems = [
  {
    label: 'Dashboard',
    path: '/company',
    icon: LayoutDashboard,
    end: true,
    actions: ['dashboard:view'],
  },
  {
    label: 'Employees',
    path: '/company/employees',
    icon: Users,
    actions: ['employee:list'],
  },
  {
    label: 'Roles & Permissions',
    path: '/company/roles',
    icon: ShieldCheck,
    actions: ['role:list'],
  },
  {
    label: 'Categories',
    path: '/company/categories',
    icon: Tags,
    actions: ['category:list', 'category:view'],
  },
  {
    label: 'Products',
    path: '/company/products',
    icon: Package,
    actions: ['product:list', 'product:view'],
  },
  {
    label: 'Inventory',
    path: '/company/inventory',
    icon: Boxes,
    actions: ['inventory:view', 'inventory:view-stock'],
  },
    {
    label: 'Warehouse',
    path: '/company/warehouses',
    icon: Warehouse,
    actions: ['warehouse:list'],
  },
  {
    label: 'Suppliers',
    path: '/company/suppliers',
    icon: Truck,
    actions: ['supplier:list'],
  },
  {
    label: 'Customers',
    path: '/company/customers',
    icon: ContactRound,
    actions: ['customer:list'],
  },
  {
    label: 'Purchase',
    path: '/company/purchases',
    icon: ShoppingCart,
    actions: ['purchase:list'],
  },
  {
    label: 'Sales & Orders',
    path: '/company/orders',
    icon: ShoppingBag,
    actions: ['sales:list'],
  },
  {
    label: 'Invoices',
    path: '/company/invoices',
    icon: FileText,
    actions: ['invoice:list'],
  },
  {
    label: 'Payments',
    path: '/company/payments',
    icon: CreditCard,
    actions: ['payment:list'],
  },
  {
    label: 'Expenses',
    path: '/company/expenses',
    icon: Receipt,
    actions: ['expense:list'],
  },

  {
    label: 'Reports',
    path: '/company/reports',
    icon: ChartNoAxesCombined,
    actions: ['reports:view'],
  },
  {
    label: 'Settings',
    path: '/company/settings',
    icon: Settings,
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
  suppliers: 'Suppliers',
  customers: 'Customers',
  purchases: 'Purchase Management',
  orders: 'Sales & Orders',
  invoices: 'Invoices',
  payments: 'Payments',
  expenses: 'Expenses',
  warehouses: 'Warehouses',
  reports: 'Reports & Analytics',
  settings: 'Company Settings',
}

const pageDescriptions = {
  company: 'Company overview and business activity',
  employees: 'Manage your team and employee access',
  roles: 'Manage roles and employee permissions',
  categories: 'Organize your product categories',
  products: 'Manage products and pricing',
  inventory: 'Monitor stock and inventory movements',
  suppliers: 'Manage supplier information',
  customers: 'Manage customer information',
  purchases: 'Manage supplier purchases',
  orders: 'Manage sales and customer orders',
  invoices: 'Manage company invoices',
  payments: 'Track payments and outstanding balances',
  expenses: 'Manage and track company expenses',
  warehouses: 'Manage warehouse locations and stock',
  reports: 'Review business performance',
  settings: 'Manage company preferences',
}

const sectionKey = {
  dashboard: 'Dashboard',
  employee: 'Employee',
  role: 'Role',
  category: 'Category',
  product: 'Product',
  inventory: 'Inventory',
  warehouse: 'Warehouse',
  supplier: 'Supplier',
  customer: 'Customer',
  purchase: 'Purchase',
  sales: 'Sales',
  invoice: 'Invoice',
  payment: 'Payment',
  expense: 'Expense',
  accounting: 'Accounting',
  reports: 'Reports',
  settings: 'Settings',
}

const hasPermission = (permissions, actions = []) => {
  // SuperAdmin has full access
  if (permissions === null) return true

  if (!permissions || typeof permissions !== 'object') {
    return false
  }

  // Menu should be visible if at least one required action is allowed.
  return actions.some((action) => {
    const section = action.split(':')[0]
    const key = sectionKey[section]

    const hasSectionPermission = key && Array.isArray(permissions[key]) && permissions[key].includes(action)

    const hasCustomPermission = Array.isArray(permissions.__customActions) && permissions.__customActions.includes(action)

    return Boolean(hasSectionPermission || hasCustomPermission)
  })
}

/*
 * More specific routes must appear before general routes.
 * For example, /employees/new must be checked before /employees/:id.
 */
const routePermissions = [
  // Employees
  {
    pattern: /^\/company\/employees\/new\/?$/,
    actions: ['employee:create'],
  },
  {
    pattern: /^\/company\/employees\/[^/]+\/edit\/?$/,
    actions: ['employee:update'],
  },
  {
    pattern: /^\/company\/employees\/[^/]+\/?$/,
    actions: ['employee:view'],
  },
  {
    pattern: /^\/company\/employees\/?$/,
    actions: ['employee:list'],
  },

  // Roles
  {
    pattern: /^\/company\/roles\/new\/?$/,
    actions: ['role:create'],
  },
  {
    pattern: /^\/company\/roles\/[^/]+\/edit\/?$/,
    actions: ['role:update'],
  },
  {
    pattern: /^\/company\/roles\/[^/]+\/?$/,
    actions: ['role:view'],
  },
  {
    pattern: /^\/company\/roles\/?$/,
    actions: ['role:list'],
  },

  // Categories
  {
    pattern: /^\/company\/categories\/new\/?$/,
    actions: ['category:create'],
  },
  {
    pattern: /^\/company\/categories\/[^/]+\/edit\/?$/,
    actions: ['category:view', 'category:update'],
  },
  {
    pattern: /^\/company\/categories\/[^/]+\/?$/,
    actions: ['category:view'],
  },
  {
    pattern: /^\/company\/categories\/?$/,
    actions: ['category:list'],
  },

  //  products
  {
    pattern: /^\/company\/products\/?$/,
    actions: ['product:list', 'product:view'],
  },
  {
    pattern: /^\/company\/inventory\/?$/,
    actions: ['inventory:view', 'inventory:view-stock'],
  },

  // Suppliers
  {
    pattern: /^\/company\/suppliers\/new\/?$/,
    actions: ['supplier:create'],
  },
  {
    pattern: /^\/company\/suppliers\/[^/]+\/edit\/?$/,
    actions: ['supplier:update'],
  },
  {
    pattern: /^\/company\/suppliers\/[^/]+\/?$/,
    actions: ['supplier:view'],
  },
  {
    pattern: /^\/company\/suppliers\/?$/,
    actions: ['supplier:list'],
  },

  // Customers
  {
    pattern: /^\/company\/customers\/new\/?$/,
    actions: ['customer:create'],
  },
  {
    pattern: /^\/company\/customers\/[^/]+\/edit\/?$/,
    actions: ['customer:update'],
  },
  {
    pattern: /^\/company\/customers\/[^/]+\/?$/,
    actions: ['customer:view'],
  },
  {
    pattern: /^\/company\/customers\/?$/,
    actions: ['customer:list'],
  },

  // Purchases
  {
    pattern: /^\/company\/purchases\/new\/?$/,
    actions: ['purchase:create'],
  },
  {
    pattern: /^\/company\/purchases\/[^/]+\/edit\/?$/,
    actions: ['purchase:update'],
  },
  {
    pattern: /^\/company\/purchases\/[^/]+\/?$/,
    actions: ['purchase:view'],
  },
  {
    pattern: /^\/company\/purchases\/?$/,
    actions: ['purchase:list'],
  },

  // Sales and orders
  {
    pattern: /^\/company\/orders\/new\/?$/,
    actions: ['sales:create'],
  },
  {
    pattern: /^\/company\/orders\/[^/]+\/edit\/?$/,
    actions: ['sales:update'],
  },
  {
    pattern: /^\/company\/orders\/[^/]+\/?$/,
    actions: ['sales:view'],
  },
  {
    pattern: /^\/company\/orders\/?$/,
    actions: ['sales:list'],
  },

  // Invoices
  {
    pattern: /^\/company\/invoices\/new\/?$/,
    actions: ['invoice:create'],
  },
  {
    pattern: /^\/company\/invoices\/[^/]+\/edit\/?$/,
    actions: ['invoice:update'],
  },
  {
    pattern: /^\/company\/invoices\/[^/]+\/?$/,
    actions: ['invoice:view'],
  },
  {
    pattern: /^\/company\/invoices\/?$/,
    actions: ['invoice:list'],
  },

  // Payments
  {
    pattern: /^\/company\/payments\/new\/?$/,
    actions: ['payment:record'],
  },
  {
    pattern: /^\/company\/payments\/[^/]+\/edit\/?$/,
    actions: ['payment:update'],
  },
  {
    pattern: /^\/company\/payments\/[^/]+\/?$/,
    actions: ['payment:view'],
  },
  {
    pattern: /^\/company\/payments\/?$/,
    actions: ['payment:list'],
  },

  // Expenses
  {
    pattern: /^\/company\/expenses\/new\/?$/,
    actions: ['expense:create'],
  },
  {
    pattern: /^\/company\/expenses\/[^/]+\/edit\/?$/,
    actions: ['expense:update'],
  },
  {
    pattern: /^\/company\/expenses\/[^/]+\/?$/,
    actions: ['expense:view'],
  },
  {
    pattern: /^\/company\/expenses\/?$/,
    actions: ['expense:list'],
  },

  // Warehouses
  {
    pattern: /^\/company\/warehouses\/new\/?$/,
    actions: ['warehouse:create'],
  },
  {
    pattern: /^\/company\/warehouses\/[^/]+\/edit\/?$/,
    actions: ['warehouse:update'],
  },
  {
    pattern: /^\/company\/warehouses\/[^/]+\/?$/,
    actions: ['warehouse:view'],
  },
  {
    pattern: /^\/company\/warehouses\/?$/,
    actions: ['warehouse:list'],
  },

  // Reports and settings
  {
    pattern: /^\/company\/reports\/?$/,
    actions: ['reports:view'],
  },
  {
    pattern: /^\/company\/settings\/?$/,
    actions: ['settings:view'],
  },

  // Dashboard
  {
    pattern: /^\/company\/?$/,
    actions: ['dashboard:view'],
  },
]

export default function CompaniesRoute() {
  const { user, permissions, loading, logout } = useAuth()

  const location = useLocation()
  const navigate = useNavigate()

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
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-violet-200 border-t-erp-primary" />
          <p className="mt-3 text-xs text-slate-500">Loading workspace...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  const userRoles = Array.isArray(user.roles) ? user.roles.map((role) => (typeof role === 'string' ? role : role?.name)) : []

  const isCompanyAdmin = user.role === 'CompanyAdmin' || userRoles.includes('CompanyAdmin')

  const isEmployee = ['Employee', 'Manager', 'Accountant', 'InventoryManager', 'SalesManager'].includes(user.role) || userRoles.some((role) => ['Employee', 'Manager', 'Accountant', 'InventoryManager', 'SalesManager'].includes(role))

  if (!isCompanyAdmin && !isEmployee) {
    return <Navigate to="/" replace />
  }

  const matchedRoute = routePermissions.find((route) => route.pattern.test(location.pathname))

  if (matchedRoute && !hasPermission(permissions, matchedRoute.actions)) {
    const previousPath = location.state?.from?.pathname

    const previousRoute = previousPath ? routePermissions.find((route) => route.pattern.test(previousPath)) : null

    const fallbackPath = previousPath && previousPath !== '/forbidden' && previousRoute && hasPermission(permissions, previousRoute.actions) ? previousPath : '/company'

    console.log('COMPANY ROUTE DEBUG:', {
      userRole: user?.role,
      pathname: location.pathname,
      permissions,
    })

    return (
      <Navigate
        to="/forbidden"
        replace={false}
        state={{
          from: location,
          fallbackPath,
        }}
      />
    )
  }

  const visibleNavigationItems = navigationItems.filter((item) => hasPermission(permissions, item.actions))

  const pathParts = location.pathname.split('/').filter(Boolean)
  const currentPath = pathParts[1] || 'company'

  const pageTitle = pageTitles[currentPath] || 'Company Workspace'
  const pageDescription = pageDescriptions[currentPath] || 'Company workspace overview'

  const displayName = user.name || user.fullName || user.email?.split('@')[0] || 'User'

  const roleLabel = isCompanyAdmin ? 'Company Admin' : user.role || 'Employee'

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

  // console.log('Current user:', user)
  // console.log('Current permissions:', permissions)
  // console.log('Role list permission:', hasPermission(permissions, ['role:list']))

  // console.log('Current permissions:', permissions)
  // console.log('Employee list:', hasPermission(permissions, ['employee:list']))
  // console.log('Role list:', hasPermission(permissions, ['role:list']))
  // console.log('Category list:', hasPermission(permissions, ['category:list']))

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {sidebarOpen && <button type="button" aria-label="Close sidebar overlay" className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200 bg-white transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-60'} ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Brand */}
        <div className={`flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-3 ${sidebarCollapsed ? 'lg:justify-center' : ''}`}>
          <NavLink to="/company" className="flex min-w-0 items-center gap-2.5" title="MineERP">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-erp-primary text-white">
              <Building2 size={20} />
            </div>

            {!sidebarCollapsed && (
              <div className="min-w-0">
                <h1 className="text-lg font-bold leading-5 tracking-tight text-slate-900">
                  Mine<span className="text-erp-primary">ERP</span>
                </h1>
                <p className="mt-0.5 text-[10px] text-slate-500">Enterprise workspace</p>
              </div>
            )}
          </NavLink>

          <button type="button" onClick={() => setSidebarOpen(false)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="Close sidebar">
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
          {!sidebarCollapsed && <p className="mb-2 px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Workspace</p>}

          {visibleNavigationItems.map((item) => {
            const Icon = item.icon

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                title={sidebarCollapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors ${isActive ? 'bg-erp-primary-light text-erp-primary' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'} ${
                    sidebarCollapsed ? 'justify-center px-0' : ''
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={17} className={`shrink-0 ${isActive ? 'text-erp-primary' : 'text-slate-500 group-hover:text-slate-700'}`} />

                    {!sidebarCollapsed && (
                      <>
                        <span className="flex-1 truncate">{item.label}</span>

                        {isActive && <ChevronRight size={14} className="shrink-0" />}
                      </>
                    )}
                  </>
                )}
              </NavLink>
            )
          })}

          {visibleNavigationItems.length === 0 && <p className="px-2.5 py-3 text-xs text-slate-500">No modules available.</p>}
        </nav>

        {/* Sidebar Footer */}
        <div className="shrink-0 border-t border-slate-100 p-2">
          <button type="button" onClick={() => setSidebarCollapsed((previous) => !previous)} className="mb-1 hidden w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-slate-600 hover:bg-slate-100 lg:flex">
            {sidebarCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}

            {!sidebarCollapsed && <span>Collapse sidebar</span>}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            title={sidebarCollapsed ? 'Logout' : undefined}
            className={`mt-1.5 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 ${
              sidebarCollapsed ? 'justify-center px-0' : ''
            }`}
          >
            <LogOut size={17} />
            {!sidebarCollapsed && <span>{loggingOut ? 'Logging out...' : 'Logout'}</span>}
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <div className={`min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60'}`}>
        {/* Common Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-3 backdrop-blur sm:px-5">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <button type="button" onClick={() => setSidebarOpen(true)} className="shrink-0 rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Open sidebar">
              <Menu size={20} />
            </button>

            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold leading-5 text-slate-900 sm:text-base">{pageTitle}</h2>
              <p className="truncate text-[11px] leading-4 text-slate-500 sm:text-xs">{pageDescription}</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {/* Notifications */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationOpen((previous) => !previous)}
                className={`relative rounded-lg p-2 transition-colors ${notificationOpen ? 'bg-erp-primary-light text-erp-primary' : 'text-slate-500 hover:bg-slate-100'}`}
                aria-label="Notifications"
                aria-expanded={notificationOpen}
              >
                <Bell size={18} />
              </button>

              {notificationOpen && (
                <div className="absolute right-0 top-10 z-50 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-lg sm:w-72">
                  <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
                  <p className="mt-1.5 text-xs text-slate-500">You are all caught up.</p>
                </div>
              )}
            </div>

            <div className="hidden h-7 w-px bg-slate-200 sm:block" />

            <div className="hidden max-w-36 sm:block">
              <p className="truncate text-xs font-semibold text-slate-800">{displayName}</p>
              <p className="truncate text-[10px] text-slate-500">{roleLabel}</p>
            </div>

            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-erp-primary-light text-xs font-bold text-erp-primary sm:hidden">{displayName.charAt(0).toUpperCase()}</div>

            <div className="hidden h-7 w-px bg-slate-200 sm:block" />

            <div className={`flex items-center gap-2.5 rounded-lg bg-slate-50 p-2 ${sidebarCollapsed ? 'justify-center' : ''}`}>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-erp-primary-light text-xs font-bold text-erp-primary">{displayName.charAt(0).toUpperCase()}</div>

              {!sidebarCollapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-800">{displayName}</p>
                  <p className="truncate text-[10px] text-slate-500">{user.email}</p>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="px-3 py-4 sm:px-5 sm:py-5">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
