import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Activity, Bell, Building2, CheckCheck, ChevronRight, LayoutDashboard, LogOut, Menu, Settings, ShieldCheck, Users, X, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const navigationItems = [
  { label: 'Dashboard', path: '/superadmin', icon: LayoutDashboard },
  { label: 'Companies', path: '/superadmin/companies', icon: Building2 },
  { label: 'Users & Access', path: '/superadmin/users', icon: Users },
  { label: 'System Activity', path: '/superadmin/activity', icon: Activity },
  { label: 'Settings', path: '/superadmin/settings', icon: Settings },
]

const pageTitles = {
  dashboard: 'Dashboard',
  companies: 'Companies',
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

  const currentPath = location.pathname.split('/').filter(Boolean).pop()
  const pageTitle = pageTitles[currentPath] || 'Dashboard'

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

  const sidebarWidth = desktopSidebarOpen ? 'lg:w-64' : 'lg:w-20'
  const contentPadding = desktopSidebarOpen ? 'lg:pl-64' : 'lg:pl-20'

  return (
    <div className="min-h-screen bg-erp-bg text-erp-text">
      {sidebarOpen && <button type="button" aria-label="Close navigation menu" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-40 bg-black/40 lg:hidden" />}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-erp-sidebar-border bg-erp-sidebar-bg transition-all duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 ${sidebarWidth}`}
      >
        <div className={`flex h-17 shrink-0 items-center border-b border-erp-sidebar-border ${desktopSidebarOpen ? 'gap-3 px-5' : 'justify-center px-2'}`}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-erp-primary text-erp-text-inverse">
            <ShieldCheck size={21} />
          </div>

          <div className={`min-w-0 overflow-hidden whitespace-nowrap transition-all duration-200 ${desktopSidebarOpen ? 'w-auto opacity-100' : 'w-0 opacity-0 lg:hidden'}`}>
            <h2 className="text-lg font-bold tracking-tight text-erp-text-inverse">MineERP</h2>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-erp-sidebar-text-muted">SuperAdmin</p>
          </div>

          <button type="button" aria-label="Close navigation menu" onClick={() => setSidebarOpen(false)} className="ml-auto rounded-lg p-2 text-erp-sidebar-text transition hover:bg-erp-sidebar-hover lg:hidden">
            <X size={18} />
          </button>
        </div>

        <div className={`pt-6 ${desktopSidebarOpen ? 'px-4' : 'px-2'}`}>
          <p className={`mb-3 overflow-hidden whitespace-nowrap px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-erp-sidebar-text-muted ${desktopSidebarOpen ? '' : 'lg:hidden'}`}>Platform</p>

          <nav className="space-y-1">
            {navigationItems.map(({ label, path, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                end={path === '/superadmin'}
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
        </div>

        <div className={`mt-auto pb-4 ${desktopSidebarOpen ? 'px-4' : 'px-2'}`}>
          <div className={`rounded-xl border border-erp-sidebar-border bg-erp-sidebar-hover p-3 ${desktopSidebarOpen ? '' : 'lg:hidden'}`}>
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="shrink-0 text-erp-sidebar-text" />
              <p className="text-xs font-semibold text-erp-text-inverse">Secure access</p>
            </div>

            <p className="mt-2 text-xs leading-5 text-erp-sidebar-text-muted">Restricted to authorized SuperAdmins.</p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            title={!desktopSidebarOpen && isDesktop ? 'Sign out' : undefined}
            className={`mt-3 flex w-full items-center rounded-xl py-3 text-sm font-medium text-erp-sidebar-text transition hover:bg-erp-danger/10 hover:text-erp-text-inverse ${desktopSidebarOpen ? 'gap-3 px-3' : 'justify-center px-0 lg:px-2'}`}
          >
            <LogOut size={18} className="shrink-0" />

            <span className={`overflow-hidden whitespace-nowrap ${desktopSidebarOpen ? '' : 'lg:hidden'}`}>Sign out</span>
          </button>
        </div>
      </aside>

      <div className={`min-h-screen transition-[padding] duration-300 ${contentPadding}`}>
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
              <p className="hidden text-xs text-erp-text-secondary sm:block">MineERP Control Center</p>
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

                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-erp-surface bg-erp-danger px-1 text-[10px] font-bold text-erp-text-inverse">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 top-12 z-50 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-erp-border bg-erp-surface shadow-xl">
                  <div className="flex items-center justify-between border-b border-erp-border px-4 py-4">
                    <div>
                      <h3 className="text-sm font-bold text-erp-text">Notifications</h3>
                      <p className="mt-1 text-xs text-erp-text-secondary">{unreadCount ? `${unreadCount} unread notification(s)` : 'You are all caught up'}</p>
                    </div>

                    {notifications.length > 0 && unreadCount > 0 && (
                      <button type="button" onClick={markAllAsRead} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-erp-primary hover:bg-erp-hover">
                        <CheckCheck size={14} />
                        Mark all read
                      </button>
                    )}
                  </div>

                  {notificationsLoading ? (
                    <div className="flex items-center justify-center gap-2 p-8 text-sm text-erp-text-secondary">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-erp-primary border-t-transparent" />
                      Loading notifications...
                    </div>
                  ) : notificationsError ? (
                    <div className="p-5 text-center">
                      <p className="text-sm text-erp-danger">{notificationsError}</p>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center px-5 py-9 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-erp-primary-light text-erp-primary">
                        <Bell size={21} />
                      </div>

                      <p className="mt-3 text-sm font-semibold text-erp-text">No notifications yet</p>

                      <p className="mt-1 text-xs leading-5 text-erp-text-secondary">New platform alerts will appear here when connected to your notification API.</p>
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
                            className={`flex w-full gap-3 border-b border-erp-border px-4 py-4 text-left transition last:border-b-0 hover:bg-erp-hover ${isRead ? '' : 'bg-erp-primary-light/40'}`}
                          >
                            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">
                              <Bell size={17} />
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-erp-text">{notification.title}</p>

                              <p className="mt-1 text-xs leading-5 text-erp-text-secondary">{notification.message}</p>

                              {notification.time && <p className="mt-2 text-[11px] text-erp-text-muted">{notification.time}</p>}
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

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-erp-primary-light text-sm font-bold text-erp-primary" title={user?.name || 'SuperAdmin'}>
              {(user?.name || 'S').trim().charAt(0).toUpperCase()}
            </div>

            <div className="hidden text-right sm:block">
              <p className="max-w-40 truncate text-sm font-semibold text-erp-text">{user?.name || 'SuperAdmin'}</p>
              <p className="max-w-40 truncate text-xs text-erp-text-secondary">{user?.email || 'Platform administrator'}</p>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
