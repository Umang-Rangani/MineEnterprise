import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, UserRound, Mail, Phone, ShieldCheck, RefreshCw, CalendarDays, Building2, AlertCircle, Pencil, CheckCircle2, BriefcaseBusiness, UserCheck, UserX, LockKeyhole, Users, X } from 'lucide-react'
import axiosInstance from '../../api/axiosInstance'

export default function CompanyEmployeeDetails() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [employee, setEmployee] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50'

  async function fetchEmployee(showLoader = true) {
    if (showLoader) setLoading(true)

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
      setEmployee(null)
    } finally {
      if (showLoader) setLoading(false)
    }
  }

  useEffect(() => {
    fetchEmployee()
  }, [id])

  function handleEdit() {
    navigate(`/company/employees/${id}/edit`)
  }

  function formatDate(date) {
    if (!date) return 'Not available'

    const parsedDate = new Date(date)

    if (Number.isNaN(parsedDate.getTime())) {
      return 'Not available'
    }

    return parsedDate.toLocaleString()
  }

  function DetailItem({ label, value, icon: Icon, breakAll = false }) {
    return (
      <div>
        <p className="text-sm font-semibold">{label}</p>

        <div className="mt-2 flex min-h-12 items-center gap-3 rounded-xl border border-erp-border bg-erp-surface-secondary/50 px-4 py-3">
          {Icon && <Icon size={17} className="shrink-0 text-erp-text-muted" />}

          <span className={`text-sm font-medium ${breakAll ? 'break-all' : 'break-words'}`}>{value || 'Not provided'}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-erp-bg text-erp-text">
      <div className="mx-auto max-w-7xl space-y-6 pb-10">
        {/* Page Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <button type="button" onClick={() => navigate('/company/employees')} className={`${buttonClass} border border-erp-border bg-erp-surface px-3`} aria-label="Back to employees">
              <ArrowLeft size={18} />
            </button>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-erp-primary">Workforce Management</p>

              <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Employee Profile</h1>

              <p className="mt-1 text-sm text-erp-text-secondary">View employee information, assigned roles and account status.</p>
            </div>
          </div>

          <button type="button" onClick={() => fetchEmployee()} disabled={loading} className={`${buttonClass} border border-erp-border bg-erp-surface hover:bg-erp-hover`}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div role="alert" className="flex items-start gap-3 rounded-2xl border border-erp-danger-border bg-erp-danger-light p-4">
            <AlertCircle size={20} className="mt-0.5 shrink-0 text-erp-danger" />

            <div className="min-w-0 flex-1">
              <p className="font-semibold text-erp-danger">Unable to load employee details</p>

              <p className="mt-1 break-words text-sm text-erp-danger">{error}</p>
            </div>

            <button type="button" onClick={() => setError('')} className="rounded-lg p-1 text-erp-danger hover:opacity-70" aria-label="Dismiss error">
              <X size={17} />
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="space-y-5">
            <div className="h-52 animate-pulse rounded-2xl bg-erp-surface-secondary" />
            <div className="h-72 animate-pulse rounded-2xl bg-erp-surface-secondary" />
          </div>
        ) : error && !employee ? (
          <section className="rounded-2xl border border-erp-border bg-erp-surface p-10 text-center shadow-erp-card">
            <AlertCircle size={38} className="mx-auto text-erp-danger" />

            <h2 className="mt-4 text-lg font-bold">Employee details unavailable</h2>

            <p className="mt-2 text-sm text-erp-text-secondary">Check your access or try loading the employee again.</p>

            <button type="button" onClick={() => fetchEmployee()} className={`${buttonClass} mt-5 bg-erp-primary text-white hover:bg-erp-primary-hover`}>
              <RefreshCw size={16} />
              Try Again
            </button>
          </section>
        ) : employee ? (
          <>
            {/* Employee Profile Header */}
            <section className="overflow-hidden rounded-2xl border border-erp-border bg-erp-surface shadow-erp-card">
              <div className="h-1.5 bg-erp-primary" />

              <div className="p-5 sm:p-7">
                <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-erp-primary-light text-erp-primary sm:h-24 sm:w-24">
                      <UserRound size={44} strokeWidth={1.5} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="break-words text-xl font-bold sm:text-2xl">{employee.name || 'Unnamed Employee'}</h2>

                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${employee.status === 'Active' ? 'bg-erp-success-light text-erp-success' : 'bg-erp-warning-light text-erp-warning'}`}>{employee.status || 'Unknown'}</span>
                      </div>

                      <p className="mt-2 break-all text-sm text-erp-text-secondary">{employee.email || 'No email provided'}</p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-erp-primary-light px-3 py-1.5 text-xs font-semibold text-erp-primary-dark">
                          <ShieldCheck size={14} />
                          {employee.role || 'Employee'}
                        </span>

                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-erp-border bg-erp-surface-secondary px-3 py-1.5 text-xs font-medium text-erp-text-secondary">
                          <BriefcaseBusiness size={14} />
                          {(employee.roles || []).length} assigned roles
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Personal Information */}
            <section className="rounded-2xl border border-erp-border bg-erp-surface p-5 shadow-erp-card sm:p-7">
              <div className="mb-6 flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">
                  <UserRound size={21} />
                </div>

                <div>
                  <h2 className="text-lg font-bold">Personal Information</h2>

                  <p className="mt-1 text-sm text-erp-text-secondary">Basic details associated with this employee account.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <DetailItem label="Full Name" value={employee.name} icon={UserRound} />

                <DetailItem label="Email Address" value={employee.email} icon={Mail} breakAll />

                <DetailItem label="Phone Number" value={employee.phone} icon={Phone} />

                <DetailItem label="Account Role" value={employee.role || 'Employee'} icon={ShieldCheck} />
              </div>

              <p className="mt-4 text-xs text-erp-text-muted">Employee details are read-only on this page. Use Edit Employee to make changes.</p>
            </section>

            {/* Assigned Roles */}
            <section className="rounded-2xl border border-erp-border bg-erp-surface p-5 shadow-erp-card sm:p-7">
              <div className="mb-6 flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">
                  <ShieldCheck size={21} />
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold">Role & Access</h2>

                  <p className="mt-1 text-sm text-erp-text-secondary">Roles currently assigned to this employee.</p>
                </div>

                <span className="shrink-0 rounded-lg bg-erp-primary-light px-3 py-1.5 text-xs font-semibold text-erp-primary-dark">{(employee.roles || []).length} assigned</span>
              </div>

              {(employee.roles || []).length === 0 ? (
                <div className="rounded-xl border border-dashed border-erp-border p-8 text-center">
                  <LockKeyhole size={30} className="mx-auto text-erp-text-muted" />

                  <h3 className="mt-3 font-semibold">No roles assigned</h3>

                  <p className="mt-1 text-sm text-erp-text-secondary">This employee does not currently have any assigned roles.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {employee.roles.map((role, index) => (
                    <div key={`${role.type}-${role.customRoleId || role.name}-${index}`} className="flex items-center gap-3 rounded-xl border border-erp-border p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">
                        <ShieldCheck size={20} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm font-semibold">{role.name || 'Unnamed Role'}</p>

                        <p className="mt-1 text-xs text-erp-text-secondary">{role.type === 'Custom' ? 'Custom role' : 'Predefined role'}</p>
                      </div>

                      <CheckCircle2 size={18} className="shrink-0 text-erp-success" />
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-5 rounded-xl border border-erp-border bg-erp-surface-secondary/50 p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck size={18} className="mt-0.5 shrink-0 text-erp-text-muted" />

                  <p className="text-sm text-erp-text-secondary">To change assigned roles or permissions, open the Edit Employee page.</p>
                </div>
              </div>
            </section>

            {/* Permissions Overview */}
            <section className="rounded-2xl border border-erp-border bg-erp-surface p-5 shadow-erp-card sm:p-7">
              <div className="mb-6 flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">
                  <ShieldCheck size={21} />
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold">Permissions Overview</h2>
                  <p className="mt-1 text-sm text-erp-text-secondary">View the permissions currently available to this employee.</p>
                </div>
              </div>

              {employee.permissions && Object.keys(employee.permissions).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(employee.permissions).map(([section, actions]) => (
                    <div key={section} className="rounded-xl border border-erp-border p-4">
                      <h3 className="mb-3 text-sm font-bold capitalize">{section.replace(/([A-Z])/g, ' $1').replace(/[-_]/g, ' ')}</h3>

                      <div className="flex flex-wrap gap-2">
                        {(Array.isArray(actions) ? actions : []).map((action) => (
                          <span key={action} className="inline-flex items-center gap-1.5 rounded-lg bg-erp-success-light px-3 py-1.5 text-xs font-semibold text-erp-success">
                            <CheckCircle2 size={14} />
                            {action}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-erp-border p-7 text-center">
                  <LockKeyhole size={28} className="mx-auto text-erp-text-muted" />
                  <h3 className="mt-3 font-semibold">Permission details unavailable</h3>
                  <p className="mt-1 text-sm text-erp-text-secondary">The employee details API does not currently provide the effective permissions in the expected format.</p>
                </div>
              )}

              <p className="mt-4 text-xs leading-5 text-erp-text-muted">Permissions are displayed for reference only. Use Edit Employee to change access.</p>
            </section>

            {/* Account Status */}
            <section className="rounded-2xl border border-erp-border bg-erp-surface p-5 shadow-erp-card sm:p-7">
              <div className="mb-5 flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">
                  <Users size={21} />
                </div>

                <div>
                  <h2 className="text-lg font-bold">Account Status</h2>

                  <p className="mt-1 text-sm text-erp-text-secondary">Current state of this employee account.</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-erp-border p-4">
                {employee.status === 'Active' ? <UserCheck size={24} className="text-erp-success" /> : <UserX size={24} className="text-erp-warning" />}

                <div>
                  <p className="text-sm font-semibold">{employee.status || 'Unknown'}</p>

                  <p className="mt-1 text-xs text-erp-text-secondary">Current employee account status</p>
                </div>
              </div>
            </section>

            {/* Account Information */}
            <section className="rounded-2xl border border-erp-border bg-erp-surface p-5 shadow-erp-card sm:p-7">
              <h2 className="text-lg font-bold">Account Information</h2>

              <p className="mt-1 text-sm text-erp-text-secondary">Reference details for this employee record.</p>

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-erp-border p-4">
                  <div className="flex items-center gap-2 text-sm text-erp-text-secondary">
                    <CalendarDays size={17} />
                    Created At
                  </div>

                  <p className="mt-2 text-sm font-semibold">{formatDate(employee.createdAt)}</p>
                </div>

                <div className="rounded-xl border border-erp-border p-4">
                  <div className="flex items-center gap-2 text-sm text-erp-text-secondary">
                    <Building2 size={17} />
                    Company
                  </div>

                  <p className="mt-2 text-sm font-semibold">{employee.companyId ? 'Assigned to your company' : 'Not assigned'}</p>
                </div>

                {employee.updatedAt && (
                  <div className="rounded-xl border border-erp-border p-4">
                    <div className="flex items-center gap-2 text-sm text-erp-text-secondary">
                      <RefreshCw size={17} />
                      Last Updated
                    </div>

                    <p className="mt-2 text-sm font-semibold">{formatDate(employee.updatedAt)}</p>
                  </div>
                )}
              </div>
            </section>

            {/* Bottom Navigation */}
            <div className="flex flex-col justify-between gap-3 pb-4 sm:flex-row">
              <button type="button" onClick={() => navigate('/company/employees')} className={`${buttonClass} border border-erp-border bg-erp-surface hover:bg-erp-hover`}>
                <ArrowLeft size={16} />
                Back to Employees
              </button>

              <button type="button" onClick={handleEdit} className={`${buttonClass} bg-erp-primary text-white hover:bg-erp-primary-hover`}>
                <Pencil size={16} />
                Edit Employee
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
