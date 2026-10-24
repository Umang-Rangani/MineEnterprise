import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { UserRound, Mail, Phone, ShieldCheck, RefreshCw, CalendarDays, Building2, Pencil, CheckCircle2, BriefcaseBusiness, UserCheck, UserX, LockKeyhole, Users } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import Loading from '../Loading/Loading'

const buttonBase = 'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50'

export default function CompanyEmployeeDetails() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [employee, setEmployee] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [toast, setToast] = useState(null)

  function showToast(type, message) {
    setToast({ type, message })
  }

  function closeToast() {
    setToast(null)
  }

  async function fetchEmployee(showLoader = true) {
    if (showLoader) {
      setLoading(true)
    } else {
      setRefreshing(true)
      setLoading(true)
    }

    try {
      const response = await axiosInstance.get(`/erp/employees/${id}`)
      const data = response.data

      if (!data.success || !data.employee) {
        throw new Error(data.message || 'Unable to load employee details.')
      }

      setEmployee(data.employee)

      if (!showLoader) {
        showToast('success', 'Employee details refreshed successfully.')
      }
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Unable to load employee details.'

      showToast('error', message)

      if (showLoader) {
        setEmployee(null)
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    document.title = 'Employee Details | MineERP'
    fetchEmployee()
  }, [id])

  function handleEdit() {
    navigate(`/company/employees/${id}/edit`)
  }

  const roles = Array.isArray(employee?.roles) ? employee.roles : []

  const permissions = employee?.permissions && typeof employee.permissions === 'object' ? employee.permissions : {}

  const permissionEntries = Object.entries(permissions).filter(([, actions]) => Array.isArray(actions) && actions.length > 0)

  const items = [
    { title: 'Employees', link: '/company/employees' },
    { title: employee?.name || 'Employee Details', link: null },
  ]



  return (
    <div className="min-w-0 space-y-4 text-erp-text">
      {toast && <Toast toast={toast} onClose={closeToast} />}

      {/* header */}
      <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card h-17">
        <div className="h-1 bg-erp-primary" />

        <div className="flex min-w-0 flex-col gap-4 px-4 py-3 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1 overflow-hidden">
            <BreadCrumb items={items} />
          </div>

          {/* Roles and Status — No Separate Boxes */}
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-5">
            {/* Assigned Roles */}

            {/* Subtle Divider */}
            <div className="hidden h-8 w-px bg-erp-border sm:block" />

            {/* Account Status */}

            <div className="flex shrink-0 items-center gap-2">
              <button type="button" onClick={() => fetchEmployee(false)} disabled={refreshing} className={`${buttonBase} border border-erp-border bg-erp-surface hover:bg-erp-hover`}>
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                Refresh
              </button>

              <button type="button" onClick={handleEdit} disabled={!employee} className={`${buttonBase} bg-erp-primary text-white hover:bg-erp-primary-hover`}>
                <Pencil size={14} />
                Edit
              </button>
            </div>
          </div>
        </div>
      </section>


      {loading && <Loading label="Loading employee details..." className="min-" /> }

      {!employee ? (
        <section className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-erp-border bg-erp-surface p-5 text-center shadow-erp-card">
          <UserRound size={32} className="text-erp-text-muted" />

          <h2 className="mt-3 text-sm font-bold">Employee details unavailable</h2>

          <p className="mt-1 max-w-md text-xs text-erp-text-secondary">Check your access or try loading the employee again.</p>

          <button type="button" onClick={() => fetchEmployee()} className={`${buttonBase} mt-4 bg-erp-primary text-white hover:bg-erp-primary-hover`}>
            <RefreshCw size={14} />
            Try Again
          </button>
        </section>
      ) : (
        <>
          {/* Employee Header */}

          {/* Personal Information + Account Information */}
          <div className="grid min-w-0 grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
            {/* Left: Personal Information */}
            <section className="min-w-0 rounded-xl border border-erp-border bg-erp-surface p-4 shadow-erp-card sm:p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-erp-primary-light text-erp-primary">
                  <UserRound size={19} />
                </div>

                <div className="min-w-0">
                  <h2 className="text-sm font-bold">Personal Information</h2>
                  <p className="mt-0.5 text-xs text-erp-text-secondary">Basic employee details</p>
                </div>
              </div>

              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                {/* Full Name */}
                <div className="min-w-0 rounded-lg border border-erp-border p-3">
                  <p className="mb-2 flex items-center gap-2 text-xs text-erp-text-secondary">
                    <UserRound size={14} />
                    Full Name
                  </p>
                  <p className="break-words text-sm font-semibold">{employee.name || 'Not provided'}</p>
                </div>

                {/* Email Address */}
                <div className="min-w-0 rounded-lg border border-erp-border p-3">
                  <p className="mb-2 flex items-center gap-2 text-xs text-erp-text-secondary">
                    <Mail size={14} />
                    Email Address
                  </p>
                  <p className="break-all text-sm font-semibold">{employee.email || 'Not provided'}</p>
                </div>

                {/* Phone Number */}
                <div className="min-w-0 rounded-lg border border-erp-border p-3">
                  <p className="mb-2 flex items-center gap-2 text-xs text-erp-text-secondary">
                    <Phone size={14} />
                    Phone Number
                  </p>
                  <p className="break-words text-sm font-semibold">{employee.phone || 'Not provided'}</p>
                </div>

                {/* Account Role */}
                <div className="min-w-0 rounded-lg border border-erp-border p-3">
                  <p className="mb-2 flex items-center gap-2 text-xs text-erp-text-secondary">
                    <ShieldCheck size={14} />
                    Account Role
                  </p>
                  <p className="break-words text-sm font-semibold">{employee.role || 'Employee'}</p>
                </div>

                {/* Assigned Roles */}
                <div className="min-w-0 rounded-lg border border-erp-border p-3 sm:col-span-2">
                  <p className="mb-2 flex items-center gap-2 text-xs text-erp-text-secondary">
                    <ShieldCheck size={14} />
                    Assigned Roles
                  </p>

                  {Array.isArray(roles) && roles.filter((role) => role?.name).length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {[...new Map(roles.filter((role) => role?.name).map((role) => [role.name, role])).values()].map((role) => (
                        <span key={role.name} className="inline-flex items-center gap-1.5 rounded-md   px-2.5 py-1.5 text-xs font-semibold ">
                          {/* <ShieldCheck size={13} className="shrink-0" /> */}
                          {role.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm font-semibold text-erp-text-muted">No roles assigned</p>
                  )}
                </div>
              </div>

              <p className="mt-4 text-xs text-erp-text-muted">Use Edit to update employee information.</p>
            </section>

            {/* Right: Account Information */}

            <section className="min-w-0 rounded-xl border border-erp-border bg-erp-surface p-4 shadow-erp-card sm:p-5">
              {/* Section Header */}
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-erp-primary-light text-erp-primary">
                  <Building2 size={19} />
                </div>

                <div className="min-w-0">
                  <h2 className="text-sm font-bold">Account Information</h2>
                  <p className="mt-0.5 text-xs text-erp-text-secondary">Account and record details</p>
                </div>
              </div>

              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                {/* Created At */}
                <div className="min-w-0 rounded-lg border border-erp-border p-3">
                  <p className="mb-2 flex items-center gap-2 text-xs text-erp-text-secondary">
                    <CalendarDays size={14} />
                    Created At
                  </p>

                  <p className="break-words text-sm font-semibold">{employee.createdAt && !Number.isNaN(new Date(employee.createdAt).getTime()) ? new Date(employee.createdAt).toLocaleString() : 'Not available'}</p>
                </div>

                {/* Company */}
                <div className="min-w-0 rounded-lg border border-erp-border p-3">
                  <p className="mb-2 flex items-center gap-2 text-xs text-erp-text-secondary">
                    <Building2 size={14} />
                    Company
                  </p>

                  <p className="break-words text-sm font-semibold">{employee.companyId ? 'Assigned to your company' : 'Not assigned'}</p>
                </div>

                {/* Last Updated */}
                <div className="min-w-0 rounded-lg border border-erp-border p-3">
                  <p className="mb-2 flex items-center gap-2 text-xs text-erp-text-secondary">
                    <RefreshCw size={14} />
                    Last Updated
                  </p>

                  <p className="break-words text-sm font-semibold">{employee.updatedAt && !Number.isNaN(new Date(employee.updatedAt).getTime()) ? new Date(employee.updatedAt).toLocaleString() : 'Not available'}</p>
                </div>

                {/* Account Status */}
                <div className="min-w-0 rounded-lg border border-erp-border p-3">
                  <p className="mb-2 flex items-center gap-2 text-xs text-erp-text-secondary">
                    <ShieldCheck size={14} />
                    Account Status
                  </p>

                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${employee.status === 'Active' ? 'bg-erp-success' : 'bg-erp-warning'}`} />

                    <span className={`text-sm font-semibold ${employee.status === 'Active' ? 'text-erp-success' : 'text-erp-warning'}`}>{employee.status || 'Unknown'}</span>
                  </div>
                </div>

              </div>
            </section>
          </div>

          {/* Permissions Overview — Full Width */}
          <section className="min-w-0 w-full rounded-xl border border-erp-border bg-erp-surface p-4 shadow-erp-card sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-erp-primary-light text-erp-primary">
                  <LockKeyhole size={19} />
                </div>

                <div className="min-w-0">
                  <h2 className="text-sm font-bold">Permissions Overview</h2>
                  <p className="mt-0.5 text-xs text-erp-text-secondary">Effective permissions assigned to this employee</p>
                </div>
              </div>

              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-erp-primary-light px-3 py-2 text-xs font-semibold text-erp-primary-dark">
                <ShieldCheck size={14} />
                {permissionEntries.reduce((total, [, actions]) => total + actions.length, 0)} Permissions
              </span>
            </div>

            {permissionEntries.length > 0 ? (
              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {permissionEntries.map(([section, actions]) => (
                  <div key={section} className="min-w-0 rounded-lg border border-erp-border bg-erp-surface p-3">
                    <div className="mb-3 flex items-center justify-between gap-2 border-b border-erp-border pb-2">
                      <h3 className="break-words text-xs font-bold capitalize">{section.replace(/([A-Z])/g, ' $1').replace(/[-_]/g, ' ')}</h3>

                      <span className="shrink-0 rounded-md bg-erp-surface-secondary px-2 py-1 text-[10px] font-semibold text-erp-text-secondary">{actions.length}</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {actions.map((action) => (
                        <span key={action} className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-erp-success-light px-2 py-1.5 text-[11px] font-medium text-erp-success">
                          <CheckCircle2 size={12} className="shrink-0" />
                          <span className="break-words">{action}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed border-erp-border px-4 py-8 text-center">
                <LockKeyhole size={28} className="text-erp-text-muted" />

                <p className="mt-3 text-sm font-semibold">Permission details unavailable</p>

                <p className="mt-1 max-w-lg text-xs text-erp-text-secondary">The API response does not include permissions in the expected section-to-actions format.</p>
              </div>
            )}

            <div className="mt-4 flex items-start gap-2 rounded-lg bg-erp-surface-secondary/60 p-3">
              <LockKeyhole size={14} className="mt-0.5 shrink-0 text-erp-text-muted" />

              <p className="text-xs text-erp-text-secondary">This section is read-only. Use Edit to change employee roles and access permissions.</p>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
