import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Activity, Bell, Building2, CheckCheck, ChevronRight, LayoutDashboard, LogOut, Menu, Settings, ShieldCheck, Users, X, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const navigationItems = [
  { label: 'Dashboard', path: '/superadmin', icon: LayoutDashboard },
  { label: 'Companies', path: '/superadmin/companies', icon: Building2 },
  { label: 'All Companies', path: '/superadmin/all-companies', icon: Building2 },
  { label: 'Users & Access', path: '/superadmin/users', icon: Users },
  { label: 'System Activity', path: '/superadmin/activity', icon: Activity },
  { label: 'Settings', path: '/superadmin/settings', icon: Settings },
]

const pageTitles = {
  dashboard: 'Dashboard',
  companies: 'Companies',
  'all-companies': 'All Companies',
  users: 'Users & Access',
  activity: 'System Activity',
  settings: 'Settings',
}

export default function SuperAdminRoute() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true)
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches)

  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [notificationsLoading] = useState(false)
  const [notificationsError] = useState('')
  const [readNotificationIds, setReadNotificationIds] = useState([])

  const notificationRef = useRef(null)

  const currentPath = location.pathname.split('/').filter(Boolean)

  const pageTitle = currentPath[1] === 'companies' && currentPath[2] ? 'Company Details' : pageTitles[currentPath[currentPath.length - 1]] || 'Dashboard'

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)')

    const handleScreenChange = (event) => {
      setIsDesktop(event.matches)

      if (event.matches) {
        setSidebarOpen(false)
      }
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
    function handleOutsideClick(event) {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationsOpen(false)
      }
    }

    function handleEscape(event) {
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

  const unreadCount = notifications.filter((notification) => !readNotificationIds.includes(notification.id)).length

  const handleLogout = async () => {
    try {
      await logout()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  const markAllAsRead = () => {
    setReadNotificationIds(notifications.map((notification) => notification.id))
  }

  const markAsRead = (notificationId) => {
    setReadNotificationIds((previous) => (previous.includes(notificationId) ? previous : [...previous, notificationId]))
  }

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id)

    if (notification.path) {
      navigate(notification.path)
      setNotificationsOpen(false)
    }
  }

  const toggleSidebar = () => {
    if (isDesktop) {
      setDesktopSidebarOpen((previous) => !previous)
    } else {
      setSidebarOpen((previous) => !previous)
    }
  }

  const sidebarWidth = desktopSidebarOpen ? 'lg:w-60' : 'lg:w-[68px]'
  const contentPadding = desktopSidebarOpen ? 'lg:pl-60' : 'lg:pl-[68px]'

  return (
    <div className="min-h-screen bg-erp-bg text-erp-text">
      {/* Mobile Overlay */}
      {sidebarOpen && <button type="button" aria-label="Close navigation menu" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] lg:hidden" />}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-erp-sidebar-border bg-erp-sidebar-bg transition-all duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 ${sidebarWidth}`}
      >
        {/* Logo */}
        <div className={`flex h-16 shrink-0 items-center border-b border-erp-sidebar-border ${desktopSidebarOpen ? 'gap-3 px-4' : 'justify-center px-2'}`}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-erp-primary text-erp-text-inverse shadow-sm">
            <ShieldCheck size={19} />
          </div>

          <div className={`min-w-0 overflow-hidden whitespace-nowrap transition-all duration-200 ${desktopSidebarOpen ? 'flex-1 opacity-100' : 'w-0 opacity-0 lg:hidden'}`}>
            <h2 className="text-base font-bold tracking-tight text-erp-text-inverse">MineERP</h2>
            <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-erp-sidebar-text-muted">SuperAdmin Panel</p>
          </div>

          <button type="button" aria-label="Close navigation menu" onClick={() => setSidebarOpen(false)} className="ml-auto rounded-lg p-1.5 text-erp-sidebar-text transition hover:bg-erp-sidebar-hover lg:hidden">
            <X size={17} />
          </button>
        </div>

        {/* Navigation */}
        <div className={`flex-1 overflow-y-auto pt-5 ${desktopSidebarOpen ? 'px-3' : 'px-2'}`}>
          <p className={`mb-2 overflow-hidden whitespace-nowrap px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-erp-sidebar-text-muted ${desktopSidebarOpen ? '' : 'lg:hidden'}`}>Main Menu</p>

          <nav className="space-y-1">
            {navigationItems.map(({ label, path, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                end={path === '/superadmin'}
                onClick={() => setSidebarOpen(false)}
                title={!desktopSidebarOpen && isDesktop ? label : undefined}
                className={({ isActive }) =>
                  `group relative flex items-center rounded-lg py-2.5 text-[13px] font-medium transition-all duration-200 ${desktopSidebarOpen ? 'gap-3 px-3' : 'justify-center px-0 lg:px-2'} ${
                    isActive ? 'bg-erp-sidebar-active text-erp-text-inverse shadow-sm' : 'text-erp-sidebar-text hover:bg-erp-sidebar-hover hover:text-erp-text-inverse'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <span className="absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full bg-erp-primary-light" />}

                    <Icon size={17} className="shrink-0" />

                    <span className={`overflow-hidden whitespace-nowrap transition-all duration-200 ${desktopSidebarOpen ? 'flex-1 opacity-100' : 'w-0 flex-none opacity-0 lg:hidden'}`}>{label}</span>

                    <ChevronRight size={14} className={`shrink-0 transition ${isActive ? 'opacity-70' : 'opacity-0 group-hover:opacity-60'} ${desktopSidebarOpen ? 'ml-auto' : 'hidden'}`} />
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Sidebar Bottom */}
        <div className={`shrink-0 border-t border-erp-sidebar-border py-3 ${desktopSidebarOpen ? 'px-3' : 'px-2'}`}>
          {desktopSidebarOpen && (
            <div className="mb-2 rounded-lg border border-erp-sidebar-border bg-erp-sidebar-hover p-2.5">
              <div className="flex items-center gap-2">
                <ShieldCheck size={15} className="shrink-0 text-erp-sidebar-text" />
                <p className="text-[11px] font-semibold text-erp-text-inverse">Secure Access</p>
              </div>

              <p className="mt-1.5 pl-[23px] text-[10px] leading-4 text-erp-sidebar-text-muted">Authorized administrators only.</p>
            </div>
          )}

          <button
            type="button"
            onClick={handleLogout}
            title={!desktopSidebarOpen && isDesktop ? 'Sign out' : undefined}
            className={`flex w-full items-center rounded-lg py-2.5 text-[13px] font-medium text-erp-sidebar-text transition hover:bg-erp-danger/10 hover:text-erp-text-inverse ${desktopSidebarOpen ? 'gap-3 px-3' : 'justify-center px-0 lg:px-2'}`}
          >
            <LogOut size={17} className="shrink-0" />

            <span className={`whitespace-nowrap ${desktopSidebarOpen ? '' : 'lg:hidden'}`}>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`min-h-screen transition-[padding] duration-300 ${contentPadding}`}>
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-erp-border bg-erp-surface px-4 sm:px-6 lg:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label={isDesktop ? 'Toggle sidebar width' : 'Open navigation menu'}
              aria-expanded={isDesktop ? desktopSidebarOpen : sidebarOpen}
              onClick={toggleSidebar}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-erp-border text-erp-primary transition hover:bg-erp-hover"
            >
              {isDesktop ? desktopSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} /> : <Menu size={19} />}
            </button>

            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold text-erp-text sm:text-base">{pageTitle}</h1>
              <p className="hidden text-[11px] text-erp-text-secondary sm:block">MineERP Control Center</p>
            </div>
          </div>

          {/* Header Right */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <button
                type="button"
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
                onClick={() => setNotificationsOpen((previous) => !previous)}
                className={`relative flex h-9 w-9 items-center justify-center rounded-lg border transition ${
                  notificationsOpen ? 'border-erp-primary bg-erp-primary-light text-erp-primary' : 'border-erp-border bg-erp-surface text-erp-text-secondary hover:bg-erp-hover'
                }`}
              >
                <Bell size={17} />

                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full border-2 border-erp-surface bg-erp-danger px-1 text-[9px] font-bold text-erp-text-inverse">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 top-11 z-50 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-xl">
                  <div className="flex items-center justify-between border-b border-erp-border px-3.5 py-3">
                    <div>
                      <h3 className="text-sm font-bold text-erp-text">Notifications</h3>
                      <p className="mt-0.5 text-[11px] text-erp-text-secondary">{unreadCount ? `${unreadCount} unread notification(s)` : 'You are all caught up'}</p>
                    </div>

                    {notifications.length > 0 && unreadCount > 0 && (
                      <button type="button" onClick={markAllAsRead} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-erp-primary hover:bg-erp-hover">
                        <CheckCheck size={13} />
                        Mark all read
                      </button>
                    )}
                  </div>

                  {notificationsLoading ? (
                    <div className="flex items-center justify-center gap-2 p-7 text-xs text-erp-text-secondary">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-erp-primary border-t-transparent" />
                      Loading notifications...
                    </div>
                  ) : notificationsError ? (
                    <div className="p-5 text-center">
                      <p className="text-xs text-erp-danger">{notificationsError}</p>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center px-5 py-8 text-center">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-erp-primary-light text-erp-primary">
                        <Bell size={19} />
                      </div>

                      <p className="mt-3 text-xs font-semibold text-erp-text">No notifications yet</p>

                      <p className="mt-1 text-[11px] leading-5 text-erp-text-secondary">New platform alerts will appear here when connected to your notification API.</p>
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.map((notification) => {
                        const isRead = readNotificationIds.includes(notification.id)

                        return (
                          <button
                            key={notification.id}
                            type="button"
                            onClick={() => handleNotificationClick(notification)}
                            className={`flex w-full gap-3 border-b border-erp-border px-3.5 py-3 text-left transition last:border-b-0 hover:bg-erp-hover ${isRead ? '' : 'bg-erp-primary-light/40'}`}
                          >
                            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-erp-primary-light text-erp-primary">
                              <Bell size={15} />
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-erp-text">{notification.title}</p>

                              <p className="mt-1 text-[11px] leading-5 text-erp-text-secondary">{notification.message}</p>

                              {notification.time && <p className="mt-1.5 text-[10px] text-erp-text-muted">{notification.time}</p>}
                            </div>

                            {!isRead && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-erp-primary" />}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* User Profile */}
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-erp-primary-light text-sm font-bold text-erp-primary" title={user?.name || 'SuperAdmin'}>
              {(user?.name || 'S').trim().charAt(0).toUpperCase()}
            </div>

            <div className="hidden text-right sm:block">
              <p className="max-w-40 truncate text-xs font-semibold text-erp-text">{user?.name || 'SuperAdmin'}</p>
              <p className="max-w-40 truncate text-[10px] text-erp-text-secondary">{user?.email || 'Platform administrator'}</p>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="mx-auto max-w-[1600px] p-4 sm:p-5 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
