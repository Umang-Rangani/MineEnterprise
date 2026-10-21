import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, ShieldCheck, LogOut, Menu, X, Bell, ChevronRight, PanelLeftClose, PanelLeftOpen, Building2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const navigationItems = [
  {
    label: 'Dashboard',
    path: '/company',
    icon: LayoutDashboard,
    end: true,
    section: 'Dashboard',
    actions: ['dashboard:view'],
    routeAvailable: true,
  },
  {
    label: 'Employees',
    path: '/company/employees',
    icon: Users,
    section: 'Employee',
    actions: ['employee:list', 'employee:view'],
    routeAvailable: true,
  },
  {
    label: 'Roles & Permissions',
    path: '/company/roles',
    icon: ShieldCheck,
    section: 'Role',
    actions: ['role:list', 'role:view'],
    routeAvailable: true,
  },
  {
    label: 'Products',
    path: '/company/products',
    icon: Building2,
    section: 'Product',
    actions: ['product:list', 'product:view'],
    routeAvailable: false,
  },
  {
    label: 'Inventory',
    path: '/company/inventory',
    icon: Building2,
    section: 'Inventory',
    actions: ['inventory:view', 'inventory:view-stock'],
    routeAvailable: false,
  },
  {
    label: 'Sales & Orders',
    path: '/company/orders',
    icon: Building2,
    section: 'Sales',
    actions: ['sales:list', 'sales:view'],
    routeAvailable: false,
  },
  {
    label: 'Reports',
    path: '/company/reports',
    icon: Building2,
    section: 'Reports',
    actions: ['reports:view'],
    routeAvailable: false,
  },
  {
    label: 'Settings',
    path: '/company/settings',
    icon: Building2,
    section: 'Settings',
    actions: ['settings:view'],
    routeAvailable: false,
  },
]

const pageTitles = {
  company: 'Dashboard',
  employees: 'Employees',
  roles: 'Roles & Permissions',
  products: 'Products',
  inventory: 'Inventory',
  orders: 'Sales & Orders',
  reports: 'Reports',
  settings: 'Settings',
}

const hasPermission = (permissions, actions) => {
  if (permissions === null) return true

  if (!permissions || typeof permissions !== 'object') return false

  return actions.some((action) => {
    const section = action.split(':')[0]

    const sectionKey = {
      dashboard: 'Dashboard',
      employee: 'Employee',
      role: 'Role',
      product: 'Product',
      inventory: 'Inventory',
      sales: 'Sales',
      reports: 'Reports',
      settings: 'Settings',
    }[section]

    return permissions[sectionKey]?.includes(action) || permissions.__customActions?.includes(action)
  })
}

export default function CompaniesRoute() {
  const { user, permissions, loading, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const notificationRef = useRef(null)

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true)
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches)
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  const pathParts = location.pathname.split('/').filter(Boolean)
  const currentPath = pathParts[pathParts.length - 1] || 'company'

  const pageTitle = currentPath === 'company' || currentPath === 'company' ? 'Dashboard' : pageTitles[currentPath] || 'Employee Details'

  const visibleNavigationItems = navigationItems.filter((item) => item.routeAvailable && hasPermission(permissions, item.actions))

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)')

    const handleScreenChange = (event) => {
      setIsDesktop(event.matches)
      if (event.matches) setSidebarOpen(false)
    }

    mediaQuery.addEventListener('change', handleScreenChange)

    return () => {
      mediaQuery.removeEventListener('change', handleScreenChange)
    }
  }, [])

  useEffect(() => {
    setSidebarOpen(false)
    setNotificationsOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationsOpen(false)
      }
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setNotificationsOpen(false)
        setSidebarOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const handleLogout = async () => {
    try {
      await logout()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  const toggleSidebar = () => {
    if (isDesktop) {
      setDesktopSidebarOpen((previous) => !previous)
    } else {
      setSidebarOpen((previous) => !previous)
    }
  }

  const sidebarWidth = desktopSidebarOpen ? 'lg:w-64' : 'lg:w-20'
  const contentPadding = desktopSidebarOpen ? 'lg:pl-64' : 'lg:pl-20'

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-erp-bg">
        <p className="text-sm text-erp-text-secondary">Loading your workspace...</p>
      </div>
    )
  }

  if (!user || !['CompanyAdmin', 'Employee'].includes(user.role)) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-dvh overflow-x-clip bg-erp-bg text-erp-text">
      {sidebarOpen && <button type="button" aria-label="Close navigation menu" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-40 bg-black/40 lg:hidden" />}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-erp-sidebar-border bg-erp-sidebar-bg transition-all duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 ${sidebarWidth}`}
      >
        <div className={`flex h-17 shrink-0 items-center border-b border-erp-sidebar-border ${desktopSidebarOpen ? 'gap-3 px-5' : 'justify-center px-2'}`}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-erp-primary text-erp-text-inverse">
            <Building2 size={21} />
          </div>

          <div className={`min-w-0 overflow-hidden whitespace-nowrap transition-all duration-200 ${desktopSidebarOpen ? 'w-auto opacity-100' : 'w-0 opacity-0 lg:hidden'}`}>
            <h2 className="text-lg font-bold tracking-tight text-erp-text-inverse">MineERP</h2>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-erp-sidebar-text-muted">Business Workspace</p>
          </div>

          <button type="button" aria-label="Close navigation menu" onClick={() => setSidebarOpen(false)} className="ml-auto rounded-lg p-2 text-erp-sidebar-text transition hover:bg-erp-sidebar-hover lg:hidden">
            <X size={18} />
          </button>
        </div>

        <div className={`flex-1 overflow-y-auto py-6 ${desktopSidebarOpen ? 'px-4' : 'px-2'}`}>
          <p className={`mb-3 overflow-hidden whitespace-nowrap px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-erp-sidebar-text-muted ${desktopSidebarOpen ? '' : 'lg:hidden'}`}>Workspace</p>

          <nav className="space-y-1">
            {visibleNavigationItems.map(({ label, path, icon: Icon, end }) => (
              <NavLink
                key={path}
                to={path}
                end={end}
                onClick={() => setSidebarOpen(false)}
                title={!desktopSidebarOpen && isDesktop ? label : undefined}
                className={({ isActive }) =>
                  `group flex items-center rounded-xl py-3 text-sm font-medium transition ${desktopSidebarOpen ? 'gap-3 px-3' : 'justify-center px-0 lg:px-2'} ${
                    isActive ? 'bg-erp-sidebar-active text-erp-text-inverse shadow-sm' : 'text-erp-sidebar-text hover:bg-erp-sidebar-hover hover:text-erp-text-inverse'
                  }`
                }
              >
                <Icon size={18} className="shrink-0" />

                <span className={`overflow-hidden whitespace-nowrap transition-all duration-200 ${desktopSidebarOpen ? 'flex-1 opacity-100' : 'w-0 flex-none opacity-0 lg:hidden'}`}>{label}</span>

                <ChevronRight size={15} className={`shrink-0 opacity-0 transition group-hover:opacity-70 ${desktopSidebarOpen ? 'ml-auto' : 'hidden'}`} />
              </NavLink>
            ))}
          </nav>

          <div className={`mt-6 rounded-xl border border-erp-sidebar-border bg-erp-sidebar-hover p-3 ${desktopSidebarOpen ? '' : 'lg:hidden'}`}>
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="shrink-0 text-erp-sidebar-text" />
              <p className="text-xs font-semibold text-erp-text-inverse">Secure workspace</p>
            </div>
            <p className="mt-2 text-xs leading-5 text-erp-sidebar-text-muted">Manage your business from one place.</p>
          </div>
        </div>

        <div className={`shrink-0 border-t border-erp-sidebar-border py-4 ${desktopSidebarOpen ? 'px-4' : 'px-2'}`}>
          <button
            type="button"
            onClick={handleLogout}
            title={!desktopSidebarOpen && isDesktop ? 'Sign out' : undefined}
            className={`flex w-full items-center rounded-xl py-3 text-sm font-medium text-erp-sidebar-text transition hover:bg-erp-danger/10 hover:text-erp-text-inverse ${desktopSidebarOpen ? 'gap-3 px-3' : 'justify-center px-0 lg:px-2'}`}
          >
            <LogOut size={18} className="shrink-0" />
            <span className={desktopSidebarOpen ? '' : 'lg:hidden'}>Sign out</span>
          </button>
        </div>
      </aside>

      <div className={`min-h-dvh min-w-0 transition-[padding] duration-300 ${contentPadding}`}>
        <header className="sticky top-0 z-30 flex h-17 items-center justify-between gap-3 border-b border-erp-border bg-erp-surface px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label={isDesktop ? 'Toggle sidebar width' : 'Open navigation menu'}
              aria-expanded={isDesktop ? desktopSidebarOpen : sidebarOpen}
              onClick={toggleSidebar}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-erp-border p-2 text-erp-primary transition hover:bg-erp-hover"
            >
              {isDesktop ? desktopSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} /> : <Menu size={20} />}
            </button>

            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold text-erp-text sm:text-lg">{pageTitle}</h1>
              <p className="hidden text-xs text-erp-text-secondary sm:block">MineERP Business Center</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <div className="relative" ref={notificationRef}>
              <button
                type="button"
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
                onClick={() => setNotificationsOpen((previous) => !previous)}
                className={`relative flex h-10 w-10 items-center justify-center rounded-xl border transition ${
                  notificationsOpen ? 'border-erp-primary bg-erp-primary-light text-erp-primary' : 'border-erp-border bg-erp-surface text-erp-text-secondary hover:bg-erp-hover'
                }`}
              >
                <Bell size={19} />
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 top-12 z-50 w-[min(320px,calc(100vw-2rem))] rounded-2xl border border-erp-border bg-erp-surface p-5 shadow-erp-dropdown">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">
                      <Bell size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold">Notifications</h3>
                      <p className="mt-1 text-xs text-erp-text-secondary">No notifications yet</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-erp-primary-light text-sm font-bold text-erp-primary" title={user?.name || 'MineERP User'}>
              {(user?.name || 'U').trim().charAt(0).toUpperCase()}
            </div>

            <div className="hidden min-w-0 text-right sm:block">
              <p className="max-w-40 truncate text-sm font-semibold text-erp-text">{user?.name || 'MineERP User'}</p>
              <p className="max-w-40 truncate text-xs text-erp-text-secondary">
                {user?.role === 'CompanyAdmin'
                  ? 'Company Administrator'
                  : (user?.roles || [])
                      .map((role) => role.name)
                      .filter(Boolean)
                      .join(', ') || 'Employee'}
              </p>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
