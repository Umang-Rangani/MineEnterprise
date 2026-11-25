import React from 'react'
import { ChevronRight, Home, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth, hasPermission } from '../context/AuthContext'

export default function BreadCrumb({ items, className = '' }) {
  const { permissions } = useAuth()

  const canViewDashboard = hasPermission(permissions, 'dashboard:view')

  const homeItem = canViewDashboard ? { title: 'Dashboard', link: '/company', isHome: true } : { title: 'My Profile', link: '/company/profile', isHome: true }

  const breadcrumbItems = canViewDashboard
    ? [homeItem, ...(items || []), ...((items || []).length === 0 ? [{ title: 'My Profile', link: null }] : [])]
    : [homeItem, ...(items || []).filter((item, index) => !(index === 0 && item.title === 'My Profile'))]

  return (
    <nav className={`w-full ${className}`} aria-label="Breadcrumb">
      <ol className="no-scrollbar flex min-w-0 items-center gap-2 overflow-x-auto whitespace-nowrap py-1 text-xs sm:text-sm">
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1

          return (
            <React.Fragment key={`${item.title}-${index}`}>
              {index > 0 && (
                <li className="flex shrink-0 items-center">
                  <ChevronRight size={15} strokeWidth={1.8} className="text-slate-300" />
                </li>
              )}

              <li className="flex min-w-0 shrink-0 items-center" aria-current={isLast ? 'page' : undefined}>
                {item.link && !isLast ? (
                  <Link to={item.link} className="group inline-flex items-center gap-1.5 font-medium text-slate-500 transition-colors duration-200 hover:text-erp-primary">
                    {item.isHome &&
                      (canViewDashboard ? (
                        <Home size={15} strokeWidth={1.8} className="text-slate-400 transition-colors group-hover:text-erp-primary" />
                      ) : (
                        <UserRound size={15} strokeWidth={1.8} className="text-slate-400 transition-colors group-hover:text-erp-primary" />
                      ))}

                    <span className="max-w-32 truncate sm:max-w-48">{item.title}</span>
                  </Link>
                ) : (
                  <span className="inline-flex min-w-0 items-center gap-2 font-semibold text-erp-primary">
                    <span className="h-4 w-1 shrink-0 rounded-full bg-erp-primary" />
                    <span className="max-w-40 truncate sm:max-w-56">{item.title}</span>
                  </span>
                )}
              </li>
            </React.Fragment>
          )
        })}
      </ol>
    </nav>
  )
}
