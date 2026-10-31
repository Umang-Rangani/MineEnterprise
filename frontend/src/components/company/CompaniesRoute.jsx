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
    label: 'Purchase',
    path: '/company/purchases',
    icon: ShoppingCart,
    actions: ['purchase:list'],
  },
  {
    label: 'Goods Receipts',
    path: '/company/goods-receipts',
    icon: Package,
    actions: ['purchase:list'],
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
  purchases: 'Purchase Management',
  'goods-receipts': 'Goods Receipts',
  warehouses: 'Warehouses',
}

const pageDescriptions = {
  company: 'Company overview and business activity',
  employees: 'Manage your team and employee access',
  roles: 'Manage roles and employee permissions',
  categories: 'Organize your product categories',
  products: 'Manage products and pricing',
  inventory: 'Monitor stock and inventory movements',
  suppliers: 'Manage supplier information',
  purchases: 'Manage supplier purchases',
  'goods-receipts': 'Manage received goods and warehouse stock entries',
  warehouses: 'Manage warehouse locations and stock',
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
  purchase: 'Purchase',
  customer: 'Customer',



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
    pattern: /^\/company\/suppliers\/export\/?$/,
    actions: ['supplier:export'],
  },
  {
    pattern: /^\/company\/suppliers\/[^/]+\/status\/?$/,
    actions: ['supplier:update-status'],
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

  // Goods Receipts
  {
    pattern: /^\/company\/goods-receipts\/new\/?$/,
    actions: ['purchase:create'],
  },
  {
    pattern: /^\/company\/goods-receipts\/[^/]+\/edit\/?$/,
    actions: ['purchase:create'],
  },
  {
    pattern: /^\/company\/goods-receipts\/[^/]+\/?$/,
    actions: ['purchase:view'],
  },
  {
    pattern: /^\/company\/goods-receipts\/?$/,
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
  const { user, permissions, permissionsLoading, permissionsError, loading, logout } = useAuth()

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

  if (permissionsLoading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50">
        {/* Background Effects */}
        <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-200/30 blur-3xl" />

        <div className="relative flex flex-col items-center">
          {/* 3D Loader */}
          <div className="relative flex h-44 w-44 items-center justify-center">
            {/* Outer Orbit */}
            <div className="absolute inset-0 animate-[spin_7s_linear_infinite] rounded-full border border-violet-300/70 [transform:rotateX(65deg)_rotateY(-15deg)]">
              <span className="absolute -left-1 top-1/2 h-3 w-3 rounded-full bg-violet-500 shadow-[0_0_15px_#8b5cf6]" />
            </div>

            {/* Middle Orbit */}
            <div className="absolute inset-3 animate-[spin_5s_linear_infinite_reverse] rounded-full border-2 border-dashed border-purple-300/80 [transform:rotateX(65deg)_rotateY(55deg)]">
              <span className="absolute -right-1 top-1/2 h-2.5 w-2.5 rounded-full bg-purple-500 shadow-[0_0_12px_#8b5cf6]" />
            </div>

            {/* Inner Orbit */}
            <div className="absolute inset-6 animate-[spin_4s_linear_infinite] rounded-full border border-violet-400/60 [transform:rotateX(65deg)_rotateY(-55deg)]" />

            {/* Glow */}
            <div className="absolute h-24 w-24 rounded-full bg-violet-500/20 blur-2xl" />

            {/* 3D Core */}
            <div className="relative flex h-20 w-20 items-center justify-center rounded-[26px] border border-white/70 bg-gradient-to-br from-violet-400 via-violet-600 to-indigo-800 shadow-[0_18px_35px_-12px_rgba(109,40,217,0.65),inset_0_2px_5px_rgba(255,255,255,0.5)] [transform:rotateX(12deg)_rotateY(-12deg)] animate-[float_3s_ease-in-out_infinite]">
              <div className="absolute inset-1 rounded-[22px] border border-white/20" />

              <svg viewBox="0 0 24 24" fill="none" className="h-9 w-9 text-white drop-shadow-lg">
                <path d="M12 3L19 6V11C19 15.5 16 19 12 21C8 19 5 15.5 5 11V6L12 3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>

              {/* Shine */}
              <div className="absolute left-3 top-2 h-5 w-10 rotate-[-35deg] rounded-full bg-white/25 blur-md" />
            </div>
          </div>

          {/* Loading Text */}
          <div className="mt-5 text-center">
            <h3 className="text-sm font-semibold tracking-wide text-slate-800">Securing Your Workspace</h3>

            <p className="mt-2 text-xs text-slate-500">Loading your permissions...</p>

            {/* Animated Progress Dots */}
            <div className="mt-4 flex items-center justify-center gap-1.5">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400 [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-500 [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-600 [animation-delay:300ms]" />
            </div>
          </div>
        </div>

        {/* Bottom Branding */}
        <div className="absolute bottom-7 text-[10px] font-medium tracking-[0.25em] text-slate-400">
          MINEERP <span className="mx-1 text-violet-400">•</span> ENTERPRISE WORKSPACE
        </div>

        {/* Custom Animation */}
        <style>
          {`
          @keyframes float {
            0%, 100% {
              transform: translateY(0) rotateX(12deg) rotateY(-12deg);
            }
            50% {
              transform: translateY(-9px) rotateX(18deg) rotateY(-5deg);
            }
          }
        `}
        </style>
      </div>
    )
  }

  if (permissionsError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="max-w-sm rounded-xl border border-red-200 bg-white p-6 text-center">
          <h2 className="text-base font-semibold text-slate-800">Unable to load permissions</h2>

          <p className="mt-2 text-sm text-slate-500">{permissionsError}</p>

          <button type="button" onClick={() => loadPermissions(user)} className="mt-4 rounded-lg bg-erp-primary px-4 py-2 text-xs font-semibold text-white">
            Try again
          </button>
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
