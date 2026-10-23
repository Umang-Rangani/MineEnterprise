import React from 'react'
import { ChevronRight, Home } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function BreadCrumb({ items, className = '' }) {
  const breadcrumbItems = [{ title: 'Home', link: '/company', isHome: true }, ...items]

  return (
    <nav className={`w-full ${className}`} aria-label="Breadcrumb">
      <ol className="no-scrollbar flex items-center gap-2 overflow-x-auto whitespace-nowrap py-1 text-sm">
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
                    {item.isHome && <Home size={15} strokeWidth={1.8} className="text-slate-400 transition-colors group-hover:text-erp-primary" />}

                    <span className="max-w-48 truncate">{item.title}</span>
                  </Link>
                ) : (
                  <span className="inline-flex min-w-0 items-center gap-2 font-semibold text-erp-primary">
                    <span className="h-4 w-1 shrink-0 rounded-full bg-erp-primary" />
                    <span className="max-w-56 truncate">{item.title}</span>
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
