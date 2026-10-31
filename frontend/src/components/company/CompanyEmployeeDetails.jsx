import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { UserRound, Mail, Phone, ShieldCheck, RefreshCw, CalendarDays, Building2, Pencil, CheckCircle2, LockKeyhole, UserX, Ban, AlertCircle } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import Loading from '../Loading/Loading'
import { hasPermission, useAuth } from '../../context/AuthContext'

const buttonBase = 'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50'

function formatDate(date) {
  if (!date) return 'Not available'

  const parsedDate = new Date(date)

  if (Number.isNaN(parsedDate.getTime())) return 'Not available'

  return parsedDate.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function DetailItem({ label, value, icon: Icon, inactive }) {
  return (
    <div className={`min-w-0 rounded-lg border p-3 ${inactive ? 'border-erp-disabled-border bg-erp-disabled-light/50' : 'border-erp-border bg-erp-surface'}`}>
      <p className={`mb-2 flex items-center gap-2 text-xs ${inactive ? 'text-erp-disabled-text' : 'text-erp-text-secondary'}`}>
        {Icon && <Icon size={14} className="shrink-0" />}
        {label}
      </p>

      <p className={`break-words text-sm font-semibold ${inactive ? 'text-erp-disabled-text' : 'text-erp-text'}`}>{value || 'Not provided'}</p>
    </div>
  )
}

function SectionHeader({ icon: Icon, title, description, inactive }) {
  return (
    <div className="mb-4 flex min-w-0 items-center gap-3">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${inactive ? 'bg-erp-disabled-light text-erp-disabled' : 'bg-erp-primary-light text-erp-primary'}`}>
        <Icon size={19} />
      </div>

      <div className="min-w-0">
        <h2 className={`text-sm font-bold ${inactive ? 'text-erp-disabled-text' : 'text-erp-text'}`}>{title}</h2>

        <p className={`mt-0.5 text-xs ${inactive ? 'text-erp-disabled-text' : 'text-erp-text-secondary'}`}>{description}</p>
      </div>
    </div>
  )
}

export default function CompanyEmployeeDetails() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { permissions: currentUserPermissions } = useAuth()

  const canEditEmployee = hasPermission(currentUserPermissions, 'employee:update')

  const [employee, setEmployee] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [toast, setToast] = useState(null)
  const [error, setError] = useState('')

  const isInactive =
    String(employee?.status ?? '')
      .trim()
      .toLowerCase() === 'inactive'

  const panelClass = isInactive ? 'border-erp-disabled-border bg-erp-disabled-surface' : 'border-erp-border bg-erp-surface'

  const iconBoxClass = isInactive ? 'bg-erp-disabled-light text-erp-disabled' : 'bg-erp-primary-light text-erp-primary'

  const headingTextClass = isInactive ? 'text-erp-disabled-text' : 'text-erp-text'

  const secondaryTextClass = isInactive ? 'text-erp-disabled-text' : 'text-erp-text-secondary'

  function showToast(type, message) {
    setToast({ type, message })
  }

  function closeToast() {
    setToast(null)
  }

  async function fetchEmployee(showRefreshMessage = false) {
    if (!id) {
      setEmployee(null)
      setError('Employee ID is missing.')
      setLoading(false)
      setRefreshing(false)
      return
    }

    setLoading(true)
    setRefreshing(showRefreshMessage)
    setError('')

    try {
      const { data } = await axiosInstance.get(`/erp/employees/${encodeURIComponent(id)}`)

      if (!data?.success || !data.employee) {
        throw new Error(data?.message || 'Unable to load employee details.')
      }

      setEmployee(data.employee)

      if (showRefreshMessage) {
        showToast('success', 'Employee details refreshed successfully.')
      }
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Unable to load employee details.'

      setError(message)
      setEmployee(null)

      showToast('error', message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    document.title = 'Employee Details | MineERP'
    fetchEmployee()

    // Fetch details again when the employee ID changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  function handleEdit() {
    if (!employee || isInactive || !canEditEmployee) return

    navigate(`/company/employees/${encodeURIComponent(employee._id || id)}/edit`)
  }
  const roles = Array.isArray(employee?.roles) ? employee.roles : []

  const employeePermissions = employee?.permissions && typeof employee.permissions === 'object' ? employee.permissions : {}

  const permissionEntries = Object.entries(employeePermissions).filter(([, actions]) => Array.isArray(actions) && actions.length > 0)

  const totalPermissions = permissionEntries.reduce((total, [, actions]) => total + actions.length, 0)

  const breadcrumbItems = [
    { title: 'Employees', link: '/company/employees' },
    { title: employee?.name || '...', link: null },
  ]

  //  INITIAL LOADING 
  if (loading ) {
    return (
      <div className="min-w-0 space-y-4 text-sm">
        <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="h-1 bg-erp-primary" />

          <div className="flex min-h-16 items-center px-4 sm:px-5">
            <BreadCrumb items={breadcrumbItems} />
          </div>
        </section>

        <section className="relative min-h-[480px] overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex min-h-[480px] items-center justify-center">
            <Loading fullScreen={false} label="Loading employee details..." description="Please wait while we load your company's employee details." className="!h-full min-h-[480px]" />
          </div>
        </section>
      </div>
    )
  }

  

  return (
    <div className="min-w-0 space-y-4 text-erp-text">
      {toast && <Toast toast={toast} onClose={closeToast} />}

      {/* Header */}
      <section className={`overflow-hidden rounded-xl border shadow-erp-card ${panelClass} h-17`}>
        <div className={`h-1 ${isInactive ? 'bg-erp-disabled' : 'bg-erp-primary'}`} />

        <div className="flex min-w-0 flex-col gap-4 px-4 py-3 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1 overflow-hidden">
            <BreadCrumb items={breadcrumbItems} />
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {employee && (
              <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold ${isInactive ? 'bg-erp-disabled-light text-erp-disabled-text' : 'bg-erp-primary-light text-erp-primary-dark'}`}>
                {isInactive ? <Ban size={13} /> : <ShieldCheck size={13} />}
                Employee Details
              </span>
            )}

            <button
              type="button"
              onClick={() => fetchEmployee(true)}
              disabled={loading || refreshing}
              className={`${buttonBase} border ${isInactive ? 'border-erp-disabled-border bg-erp-disabled-light text-erp-disabled-text hover:bg-erp-disabled-border/40' : 'border-erp-border bg-erp-surface hover:bg-erp-hover'}`}
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>

            {canEditEmployee && (
              <button
                type="button"
                onClick={handleEdit}
                disabled={!employee || loading || isInactive}
                title={isInactive ? 'Inactive employees cannot be edited.' : 'Edit employee'}
                className={`${buttonBase} ${isInactive ? 'bg-erp-disabled-light text-erp-disabled-text' : 'bg-erp-primary text-white hover:bg-erp-primary-hover'}`}
              >
                <Pencil size={14} />
                Edit
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Error */}
      {!loading && error && (
        <section className="rounded-xl border border-erp-danger-border bg-erp-danger-light p-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-erp-danger" />

            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-erp-danger">Unable to load employee</h2>

              <p className="mt-1 break-words text-sm text-erp-text">{error}</p>

              <button type="button" onClick={() => fetchEmployee()} className={`${buttonBase} mt-3 border border-erp-danger-border bg-white text-erp-danger hover:bg-erp-danger-light`}>
                <RefreshCw size={14} />
                Try Again
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Employee Details */}
      {!loading && !error && employee && (
        <>
          {/* Inactive Notice */}
          {isInactive && (
            <div className="flex items-start gap-3 rounded-xl border border-erp-disabled-border bg-erp-disabled-light p-4">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-erp-disabled-border/50 text-erp-disabled-text">
                <UserX size={18} />
              </div>

              <div className="min-w-0">
                <h2 className="text-sm font-bold text-erp-disabled-text">This employee is inactive</h2>

                <p className="mt-1 text-xs leading-5 text-erp-disabled-text">This employee account is currently inactive. Editing is unavailable while the account remains inactive.</p>
              </div>
            </div>
          )}

          {/* Personal Information + Account Information */}
          <div className="grid min-w-0 grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
            {/* Personal Information */}
            <section className={`min-w-0 rounded-xl border p-4 shadow-erp-card sm:p-5 ${panelClass}`}>
              <SectionHeader icon={UserRound} title="Personal Information" description="Basic employee details" inactive={isInactive} />

              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                <DetailItem label="Full Name" value={employee.name} icon={UserRound} inactive={isInactive} />

                <DetailItem label="Email Address" value={employee.email} icon={Mail} inactive={isInactive} />

                <DetailItem label="Phone Number" value={employee.phone} icon={Phone} inactive={isInactive} />

                <DetailItem label="Account Role" value={employee.role || 'Employee'} icon={ShieldCheck} inactive={isInactive} />

                {/* Assigned Roles */}
                <div className={`min-w-0 rounded-lg border p-3 sm:col-span-2 ${isInactive ? 'border-erp-disabled-border bg-erp-disabled-light/50' : 'border-erp-border bg-erp-surface'}`}>
                  <p className={`mb-2 flex items-center gap-2 text-xs ${secondaryTextClass}`}>
                    <ShieldCheck size={14} />
                    Assigned Roles
                  </p>

                  {roles.filter((role) => role?.name).length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {[...new Map(roles.filter((role) => role?.name).map((role) => [role.name, role])).values()].map((role) => (
                        <span
                          key={role.name}
                          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-semibold ${
                            isInactive ? 'border-erp-disabled-border bg-erp-disabled-light text-erp-disabled-text' : 'border-erp-border bg-erp-surface-secondary text-erp-text'
                          }`}
                        >
                          {role.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm font-semibold text-erp-text-muted">No roles assigned</p>
                  )}
                </div>
              </div>

              <p className={`mt-4 text-xs ${secondaryTextClass}`}>{isInactive ? 'This employee account is inactive.' : 'Use Edit to update employee information.'}</p>
            </section>

            {/* Account Information */}
            <section className={`min-w-0 rounded-xl border p-4 shadow-erp-card sm:p-5 ${panelClass}`}>
              <SectionHeader icon={Building2} title="Account Information" description="Account and record details" inactive={isInactive} />

              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                <DetailItem label="Created At" value={formatDate(employee.createdAt)} icon={CalendarDays} inactive={isInactive} />

                <DetailItem label="Company" value={employee.companyId ? 'Assigned to your company' : 'Not assigned'} icon={Building2} inactive={isInactive} />

                <DetailItem label="Last Updated" value={formatDate(employee.updatedAt)} icon={RefreshCw} inactive={isInactive} />

                {/* Account Status */}
                <div className={`min-w-0 rounded-lg border p-3 ${isInactive ? 'border-erp-disabled-border bg-erp-disabled-light/50' : 'border-erp-border bg-erp-surface'}`}>
                  <p className={`mb-2 flex items-center gap-2 text-xs ${secondaryTextClass}`}>
                    <ShieldCheck size={14} />
                    Account Status
                  </p>

                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${employee.status === 'Active' ? 'bg-erp-success' : isInactive ? 'bg-erp-disabled' : 'bg-erp-text-muted'}`} />

                    <span className={`text-sm font-semibold ${employee.status === 'Active' ? 'text-erp-success' : isInactive ? 'text-erp-disabled-text' : 'text-erp-text-muted'}`}>{employee.status || 'Unknown'}</span>
                  </div>
                </div>
              </div>

              <div className={`mt-4 flex items-start gap-2 rounded-lg p-3 ${isInactive ? 'bg-erp-disabled-light' : 'bg-erp-surface-secondary/60'}`}>
                {isInactive ? <Ban size={14} className="mt-0.5 shrink-0 text-erp-disabled" /> : <Building2 size={14} className="mt-0.5 shrink-0 text-erp-text-muted" />}

                <p className={`text-xs leading-5 ${secondaryTextClass}`}>
                  Account information is scoped to your company.
                  {isInactive ? ' This employee account is inactive.' : ' Employee details are displayed according to your access permissions.'}
                </p>
              </div>
            </section>
          </div>

          {/* Permissions Overview */}
          <section className={`min-w-0 w-full rounded-xl border p-4 shadow-erp-card sm:p-5 ${panelClass}`}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBoxClass}`}>
                  <LockKeyhole size={19} />
                </div>

                <div className="min-w-0">
                  <h2 className={`text-sm font-bold ${headingTextClass}`}>Permissions Overview</h2>

                  <p className={`mt-0.5 text-xs ${secondaryTextClass}`}>Effective permissions assigned to this employee</p>
                </div>
              </div>

              <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ${isInactive ? 'bg-erp-disabled-light text-erp-disabled-text' : 'bg-erp-primary-light text-erp-primary-dark'}`}>
                <ShieldCheck size={14} />
                {totalPermissions} Permissions
              </span>
            </div>

            {permissionEntries.length > 0 ? (
              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {permissionEntries.map(([section, actions]) => (
                  <div key={section} className={`min-w-0 rounded-lg border p-3 ${isInactive ? 'border-erp-disabled-border bg-erp-disabled-light/50' : 'border-erp-border bg-erp-surface'}`}>
                    <div className={`mb-3 flex items-center justify-between gap-2 border-b pb-2 ${isInactive ? 'border-erp-disabled-border' : 'border-erp-border'}`}>
                      <h3 className={`break-words text-xs font-bold capitalize ${headingTextClass}`}>{section.replace(/([A-Z])/g, ' $1').replace(/[-_]/g, ' ')}</h3>

                      <span className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold ${isInactive ? 'bg-erp-disabled-light text-erp-disabled-text' : 'bg-erp-surface-secondary text-erp-text-secondary'}`}>{actions.length}</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {actions.map((action) => (
                        <span
                          key={action}
                          className={`inline-flex max-w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium ${isInactive ? 'bg-erp-disabled-light text-erp-disabled-text' : 'bg-erp-success-light text-erp-success'}`}
                        >
                          <CheckCircle2 size={12} className="shrink-0" />
                          <span className="break-words">{action}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed px-4 py-8 text-center ${isInactive ? 'border-erp-disabled-border' : 'border-erp-border'}`}>
                <LockKeyhole size={28} className="text-erp-text-muted" />

                <p className={`mt-3 text-sm font-semibold ${headingTextClass}`}>Permission details unavailable</p>

                <p className={`mt-1 max-w-lg text-xs ${secondaryTextClass}`}>The API response does not include permissions in the expected section-to-actions format.</p>
              </div>
            )}

            <div className={`mt-4 flex items-start gap-2 rounded-lg p-3 ${isInactive ? 'bg-erp-disabled-light' : 'bg-erp-surface-secondary/60'}`}>
              <LockKeyhole size={14} className={`mt-0.5 shrink-0 ${isInactive ? 'text-erp-disabled' : 'text-erp-text-muted'}`} />

              <p className={`text-xs ${secondaryTextClass}`}>This section is read-only. Use Edit to change employee roles and access permissions.</p>
            </div>
          </section>
        </>
      )}

      {/* No employee found */}
      {!loading && !error && !employee && (
        <section className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-erp-border bg-erp-surface p-5 text-center shadow-erp-card">
          <UserRound size={32} className="text-erp-text-muted" />

          <h2 className="mt-3 text-sm font-bold">Employee details unavailable</h2>

          <p className="mt-1 max-w-md text-xs text-erp-text-secondary">Check your access or try loading the employee again.</p>

          <button type="button" onClick={() => fetchEmployee()} className={`${buttonBase} mt-4 bg-erp-primary text-white hover:bg-erp-primary-hover`}>
            <RefreshCw size={14} />
            Try Again
          </button>
        </section>
      )}
    </div>
  )
}
