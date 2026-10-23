import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, UserRound, Mail, Phone, ShieldCheck, RefreshCw, CalendarDays, Building2, AlertCircle, Pencil, CheckCircle2, BriefcaseBusiness, UserCheck, UserX, LockKeyhole, Users, X } from 'lucide-react'
import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'

const buttonBase = 'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50'

function formatDate(date) {
  if (!date) return 'Not available'

  const parsedDate = new Date(date)

  if (Number.isNaN(parsedDate.getTime())) return 'Not available'

  return parsedDate.toLocaleString()
}

function DetailItem({ label, value, icon: Icon, breakAll = false }) {
  return (
    <div className="min-w-0">
      <p className="mb-1.5 text-xs font-semibold text-erp-text-secondary">{label}</p>

      <div className="flex min-h-10 min-w-0 items-center gap-2 rounded-lg border border-erp-border bg-erp-surface-secondary/40 px-3 py-2">
        {Icon && <Icon size={15} className="shrink-0 text-erp-text-muted" />}

        <span className={`min-w-0 text-sm font-medium ${breakAll ? 'break-all' : 'break-words'}`}>{value || 'Not provided'}</span>
      </div>
    </div>
  )
}

function SectionCard({ icon: Icon, title, description, action, children }) {
  return (
    <section className="min-w-0 rounded-xl border border-erp-border bg-erp-surface p-3 shadow-erp-card sm:p-4">
      <div className="mb-3 flex min-w-0 items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-erp-primary-light text-erp-primary">
          <Icon size={18} />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-erp-text">{title}</h2>
          <p className="mt-0.5 text-xs text-erp-text-secondary">{description}</p>
        </div>

        {action}
      </div>

      {children}
    </section>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3" aria-label="Loading employee details">
      <div className="h-32 animate-pulse rounded-xl border border-erp-border bg-erp-surface-secondary/70" />

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <div className="h-44 animate-pulse rounded-xl border border-erp-border bg-erp-surface-secondary/70" />
        <div className="h-44 animate-pulse rounded-xl border border-erp-border bg-erp-surface-secondary/70" />
        <div className="h-36 animate-pulse rounded-xl border border-erp-border bg-erp-surface-secondary/70" />
        <div className="h-36 animate-pulse rounded-xl border border-erp-border bg-erp-surface-secondary/70" />
      </div>
    </div>
  )
}

export default function CompanyEmployeeDetails() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [employee, setEmployee] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const items = [
    { title: 'Employees', link: '/company/employees' },
    { title: 'Employee Details', link: null },
  ]

  async function fetchEmployee(showLoader = true) {
    if (showLoader) setLoading(true)
    else setRefreshing(true)

    setError('')

    try {
      const response = await axiosInstance.get(`/erp/employees/${id}`)
      const data = response.data

      if (!data.success || !data.employee) {
        throw new Error(data.message || 'Unable to load employee details.')
      }

      setEmployee(data.employee)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to load employee details.')

      if (showLoader) setEmployee(null)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    document.title = 'Employee Details | MineERP'
    fetchEmployee()

    // The employee is reloaded when the route ID changes.
  }, [id])

  function handleEdit() {
    navigate(`/company/employees/${id}/edit`)
  }

  const roles = Array.isArray(employee?.roles) ? employee.roles : []
  const permissions = employee?.permissions && typeof employee.permissions === 'object' ? employee.permissions : {}

  const permissionEntries = Object.entries(permissions).filter(([, actions]) => Array.isArray(actions) && actions.length > 0)

  return (
    <div className="min-w-0 space-y-3 text-erp-text">
      {/* Stable page header */}
      <div className="flex min-h-10 min-w-0 flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center overflow-hidden">
          <BreadCrumb items={items} />
        </div>

        <div className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-erp-primary/15 bg-erp-primary/5 px-2.5 text-[11px] font-semibold text-erp-primary">
          <ShieldCheck size={14} />
          <span>Employee Profile</span>
        </div>
      </div>

      {/* Page title and actions */}
      <div className="flex min-h-[54px] flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-lg font-bold leading-6 text-erp-text">Employee Details</h1>
          <p className="mt-0.5 text-xs text-erp-text-secondary">Employee information, roles and account access.</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={() => fetchEmployee(false)} disabled={loading || refreshing} className={`${buttonBase} border border-erp-border bg-erp-surface hover:bg-erp-hover`}>
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button type="button" onClick={handleEdit} disabled={!employee || loading} className={`${buttonBase} bg-erp-primary text-white hover:bg-erp-primary-hover`}>
            <Pencil size={14} />
            Edit
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div role="alert" className="flex min-w-0 items-start gap-2 rounded-lg border border-erp-danger-border bg-erp-danger-light p-3">
          <AlertCircle size={17} className="mt-0.5 shrink-0 text-erp-danger" />

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-erp-danger">Unable to load employee details</p>
            <p className="mt-1 break-words text-xs text-erp-danger">{error}</p>
          </div>

          <button type="button" onClick={() => setError('')} aria-label="Dismiss error" className="rounded-md p-1 text-erp-danger hover:opacity-70">
            <X size={15} />
          </button>
        </div>
      )}

      {loading ? (
        <LoadingSkeleton />
      ) : !employee ? (
        <section className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-erp-border bg-erp-surface p-5 text-center shadow-erp-card">
          <AlertCircle size={32} className="text-erp-danger" />

          <h2 className="mt-3 text-sm font-bold">Employee details unavailable</h2>

          <p className="mt-1 max-w-md text-xs text-erp-text-secondary">Check your access or try loading the employee again.</p>

          <button type="button" onClick={() => fetchEmployee()} className={`${buttonBase} mt-4 bg-erp-primary text-white hover:bg-erp-primary-hover`}>
            <RefreshCw size={14} />
            Try Again
          </button>
        </section>
      ) : (
        <>
          {/* Employee profile summary */}
          <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
            <div className="h-1 bg-erp-primary" />

            <div className="flex min-w-0 flex-col justify-between gap-3 p-3 sm:flex-row sm:items-center sm:p-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary sm:h-16 sm:w-16">
                  <UserRound size={30} strokeWidth={1.5} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="break-words text-base font-bold sm:text-lg">{employee.name || 'Unnamed Employee'}</h2>

                    <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${employee.status === 'Active' ? 'bg-erp-success-light text-erp-success' : 'bg-erp-warning-light text-erp-warning'}`}>{employee.status || 'Unknown'}</span>
                  </div>

                  <p className="mt-1 break-all text-xs text-erp-text-secondary">{employee.email || 'No email provided'}</p>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-md bg-erp-primary-light px-2 py-1 text-[11px] font-semibold text-erp-primary-dark">
                      <ShieldCheck size={12} />
                      {employee.role || 'Employee'}
                    </span>

                    <span className="inline-flex items-center gap-1 rounded-md border border-erp-border bg-erp-surface-secondary px-2 py-1 text-[11px] font-medium text-erp-text-secondary">
                      <BriefcaseBusiness size={12} />
                      {roles.length} assigned roles
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="grid min-w-0 grid-cols-1 items-start gap-3 xl:grid-cols-2">
            {/* Personal information */}
            <SectionCard icon={UserRound} title="Personal Information" description="Basic employee account details.">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DetailItem label="Full Name" value={employee.name} icon={UserRound} />
                <DetailItem label="Email Address" value={employee.email} icon={Mail} breakAll />
                <DetailItem label="Phone Number" value={employee.phone} icon={Phone} />
                <DetailItem label="Account Role" value={employee.role || 'Employee'} icon={ShieldCheck} />
              </div>
              <p className="mt-3 text-[11px] text-erp-text-muted">Use Edit to update employee information.</p>
            </SectionCard>

            {/* Assigned roles */}
            <SectionCard
              icon={ShieldCheck}
              title="Role & Access"
              description="Roles assigned to this employee."
              action={<span className="shrink-0 rounded-md bg-erp-primary-light px-2 py-1 text-[10px] font-semibold text-erp-primary-dark">{roles.length} assigned</span>}
            >
              {roles.length === 0 ? (
                <div className="rounded-lg border border-dashed border-erp-border px-3 py-6 text-center">
                  <LockKeyhole size={25} className="mx-auto text-erp-text-muted" />
                  <p className="mt-2 text-sm font-semibold">No roles assigned</p>
                  <p className="mt-1 text-xs text-erp-text-secondary">No roles are currently assigned to this employee.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {roles.map((role, index) => (
                    <div key={`${role.type}-${role.customRoleId || role.name}-${index}`} className="flex min-w-0 items-center gap-2 rounded-lg border border-erp-border p-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-erp-primary-light text-erp-primary">
                        <ShieldCheck size={16} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="break-words text-xs font-semibold">{role.name || 'Unnamed Role'}</p>
                        <p className="mt-0.5 text-[11px] text-erp-text-secondary">{role.type === 'Custom' ? 'Custom role' : 'Predefined role'}</p>
                      </div>

                      <CheckCircle2 size={16} className="shrink-0 text-erp-success" />
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3 rounded-lg bg-erp-surface-secondary/60 p-2.5">
                <p className="text-xs text-erp-text-secondary">
                  <ShieldCheck size={14} className="mr-1 inline text-erp-text-muted" />
                  Edit employee access to change roles and permissions.
                </p>
              </div>
            </SectionCard>

            {/* Permissions */}
            <SectionCard icon={LockKeyhole} title="Permissions Overview" description="Effective permissions returned by the API.">
              {permissionEntries.length > 0 ? (
                <div className="space-y-2">
                  {permissionEntries.map(([section, actions]) => (
                    <div key={section} className="rounded-lg border border-erp-border p-3">
                      <h3 className="mb-2 text-xs font-bold capitalize">{section.replace(/([A-Z])/g, ' $1').replace(/[-_]/g, ' ')}</h3>

                      <div className="flex flex-wrap gap-1.5">
                        {actions.map((action) => (
                          <span key={action} className="inline-flex items-center gap-1 rounded-md bg-erp-success-light px-2 py-1 text-[10px] font-semibold text-erp-success">
                            <CheckCircle2 size={11} />
                            {action}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-erp-border px-3 py-6 text-center">
                  <LockKeyhole size={25} className="mx-auto text-erp-text-muted" />
                  <p className="mt-2 text-sm font-semibold">Permission details unavailable</p>
                  <p className="mt-1 text-xs text-erp-text-secondary">The API response does not include permissions in the expected section-to-actions format.</p>
                </div>
              )}

              <p className="mt-3 text-[11px] text-erp-text-muted">This section is read-only. Use Edit to change access.</p>
            </SectionCard>

            {/* Account status */}
            <SectionCard icon={Users} title="Account Status" description="Current state of the employee account.">
              <div className="flex items-center gap-3 rounded-lg border border-erp-border p-3">
                {employee.status === 'Active' ? <UserCheck size={22} className="shrink-0 text-erp-success" /> : <UserX size={22} className="shrink-0 text-erp-warning" />}

                <div className="min-w-0">
                  <p className="text-sm font-semibold">{employee.status || 'Unknown'}</p>
                  <p className="mt-0.5 text-xs text-erp-text-secondary">Current employee account status</p>
                </div>
              </div>
            </SectionCard>

            {/* Account information */}
            <SectionCard icon={Building2} title="Account Information" description="Reference information for this record.">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="rounded-lg border border-erp-border p-3">
                  <div className="flex items-center gap-1.5 text-xs text-erp-text-secondary">
                    <CalendarDays size={14} />
                    Created At
                  </div>
                  <p className="mt-2 break-words text-xs font-semibold">{formatDate(employee.createdAt)}</p>
                </div>

                <div className="rounded-lg border border-erp-border p-3">
                  <div className="flex items-center gap-1.5 text-xs text-erp-text-secondary">
                    <Building2 size={14} />
                    Company
                  </div>
                  <p className="mt-2 text-xs font-semibold">{employee.companyId ? 'Assigned to your company' : 'Not assigned'}</p>
                </div>

                {employee.updatedAt && (
                  <div className="rounded-lg border border-erp-border p-3 sm:col-span-2">
                    <div className="flex items-center gap-1.5 text-xs text-erp-text-secondary">
                      <RefreshCw size={14} />
                      Last Updated
                    </div>
                    <p className="mt-2 break-words text-xs font-semibold">{formatDate(employee.updatedAt)}</p>
                  </div>
                )}
              </div>
            </SectionCard>
          </div>

          {/* Bottom actions */}
          <div className="flex min-h-10 flex-wrap items-center justify-end gap-2 pb-1">
            <button type="button" onClick={() => navigate('/company/employees')} className={`${buttonBase} border border-erp-border bg-erp-surface hover:bg-erp-hover`}>
              <ArrowLeft size={14} />
              Back to Employees
            </button>

            <button type="button" onClick={handleEdit} className={`${buttonBase} bg-erp-primary text-white hover:bg-erp-primary-hover`}>
              <Pencil size={14} />
              Edit Employee
            </button>
          </div>
        </>
      )}
    </div>
  )
}
