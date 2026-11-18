import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, BookOpen, CalendarDays, FileText, Hash, UserRound, CheckCircle2, Clock, XCircle, Info, RefreshCw, LoaderCircle, Landmark, IndianRupee, Ban, Pencil } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import Loading from '../Loading/Loading'
import { hasPermission, useAuth } from '../../context/AuthContext'
import TrashBox from '../../TrashBox/TrashBox'

const statusStyles = {
  Draft: 'border-amber-200 bg-amber-50 text-amber-700',
  Posted: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Cancelled: 'border-red-200 bg-red-50 text-red-700',
}

const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

const formatDate = (value) => {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const getJournal = (response) => {
  const data = response?.data
  return data?.data?.entry || data?.data?.journalEntry || data?.data || data?.entry || data
}

const getPersonName = (person) => {
  if (!person) return '—'

  if (typeof person === 'string') return person

  return person.name || person.fullName || person.email || '—'
}

export default function JournalEntryDetails() {
  const navigate = useNavigate()
  const { id } = useParams()

  const { permissions } = useAuth()

  const canView = hasPermission(permissions, 'accounting:view')
  const canManage = hasPermission(permissions, 'accounting:journal-entry')

  const [journal, setJournal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)
  const [toast, setToast] = useState(null)

  const [postConfirmation, setPostConfirmation] = useState(false)
  const [postProcessing, setPostProcessing] = useState(false)

  const [cancelModal, setCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelProcessing, setCancelProcessing] = useState(false)

  const showToast = (type, message, duration = 3000) => {
    setToast({ id: Date.now(), type, message, duration })
  }

  const closeToast = () => setToast(null)

  // ---------------- POST JOURNAL ENTRY ----------------

  const closePostConfirmation = () => {
    if (postProcessing) return
    setPostConfirmation(false)
  }

  const postJournalEntry = async () => {
    if (!journal?._id || postProcessing || cancelProcessing) return

    setPostProcessing(true)

    try {
      const response = await axiosInstance.patch(`/erp/journal-entries/${encodeURIComponent(id)}/post`)

      const data = response.data

      if (data?.success === false) {
        throw new Error(data.message || 'Unable to post journal entry.')
      }

      showToast('success', data?.message || 'Journal entry posted successfully.')

      setPostConfirmation(false)
      setRetryKey((previous) => previous + 1)
    } catch (error) {
      showToast('error', error.response?.data?.message || error.message || 'Unable to post journal entry.', 5000)
    } finally {
      setPostProcessing(false)
    }
  }

  // ---------------- CANCEL JOURNAL ENTRY ----------------

  const closeCancelModal = () => {
    if (cancelProcessing || postProcessing) return

    setCancelModal(false)
    setCancelReason('')
  }

  const cancelJournalEntry = async () => {
    if (!journal?._id || cancelProcessing || postProcessing) return

    if (cancelReason.trim().length < 3) {
      showToast('error', 'Please enter a cancellation reason of at least 3 characters.')
      return
    }

    setCancelProcessing(true)

    try {
      const response = await axiosInstance.patch(`/erp/journal-entries/${encodeURIComponent(id)}/cancel`, {
        reason: cancelReason.trim(),
      })

      const data = response.data

      if (data?.success === false) {
        throw new Error(data.message || 'Unable to cancel journal entry.')
      }

      showToast('success', data?.message || 'Journal entry cancelled successfully.')

      setCancelModal(false)
      setCancelReason('')
      setRetryKey((previous) => previous + 1)
    } catch (error) {
      showToast('error', error.response?.data?.message || error.message || 'Unable to cancel journal entry.', 5000)
    } finally {
      setCancelProcessing(false)
    }
  }

  useEffect(() => {
    document.title = 'Journal Entry Details | MineERP'
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadJournal = async () => {
      setLoading(true)
      setLoadError(false)

      try {
        const response = await axiosInstance.get(`/erp/journal-entries/${id}`)

        if (cancelled) return

        const entry = getJournal(response)

        if (!entry?._id) {
          throw new Error('Journal entry details were not found.')
        }

        setJournal(entry)
      } catch (error) {
        if (!cancelled) {
          setLoadError(true)
          showToast('error', error.response?.data?.message || error.message || 'Unable to load journal entry.', 5000)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    if (canView && id) loadJournal()
    else setLoading(false)

    return () => {
      cancelled = true
    }
  }, [id, retryKey, canView])

  const breadcrumbItems = [
    {
      title: 'Journal Entries',
      link: '/company/journal-entries',
    },
    {
      title: 'Journal Entry Details',
      link: null,
    },
  ]

  const lines = Array.isArray(journal?.lines) ? journal.lines : []

  const totalDebit = Number(journal?.totalDebit ?? lines.reduce((sum, line) => sum + Number(line.debit || 0), 0))

  const totalCredit = Number(journal?.totalCredit ?? lines.reduce((sum, line) => sum + Number(line.credit || 0), 0))

  const status = journal?.status || 'Draft'

  const inputClass = 'h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs text-slate-700'

  if (!canView) {
    return (
      <div className="rounded-xl border border-red-200 bg-white p-8 text-center">
        <Info size={26} className="mx-auto text-red-500" />
        <h2 className="mt-3 text-sm font-bold text-slate-800">Access denied</h2>
        <p className="mt-1 text-xs text-slate-500">You do not have permission to view journal entries.</p>
        <button type="button" onClick={() => navigate('/company')} className="mt-4 rounded-lg bg-erp-primary px-4 py-2 text-xs font-semibold text-white">
          Back to Dashboard
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-w-0 space-y-4 text-sm">
        <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="h-1 bg-erp-primary" />
          <div className="flex min-h-16 items-center px-4 sm:px-5">
            <BreadCrumb items={breadcrumbItems} />
          </div>
        </section>

        <section className="relative min-h-[400px] overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex min-h-[400px] items-center justify-center">
            <Loading fullScreen={false} label="Loading journal entry" description="Fetching journal entry information..." className="!h-full min-h-[400px]" />
          </div>
        </section>
      </div>
    )
  }

  if (loadError || !journal) {
    return (
      <div className="min-w-0 space-y-4 text-sm">
        {toast && <Toast toast={toast} onClose={closeToast} />}

        <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="h-1 bg-erp-primary" />
          <div className="flex min-h-16 items-center px-4 sm:px-5">
            <BreadCrumb items={breadcrumbItems} />
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white px-4 py-12 text-center">
          <BookOpen size={30} className="mx-auto text-slate-300" />

          <h2 className="mt-3 text-sm font-bold text-slate-800">Unable to load journal entry</h2>

          <p className="mt-1 text-xs text-slate-500">Journal entry information could not be loaded.</p>

          <div className="mt-4 flex justify-center gap-2">
            <button type="button" onClick={() => navigate('/company/journal-entries')} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              <ArrowLeft size={14} />
              Back to Journal Entries
            </button>

            <button type="button" onClick={() => setRetryKey((current) => current + 1)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-erp-primary px-3 text-xs font-semibold text-white hover:bg-erp-primary-hover">
              <RefreshCw size={14} />
              Retry
            </button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-4 text-sm">
      {toast && <Toast toast={toast} onClose={closeToast} />}

      {/* Header */}
      <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card h-17">
        <div className="h-1 bg-erp-primary" />

        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <div className="min-w-0 flex-1">
            <BreadCrumb items={breadcrumbItems} />
          </div>

          {status === 'Draft' && canManage && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {(journal.sourceType || 'Manual') === 'Manual' && (
                <Link to={`/company/journal-entries/${id}/edit`} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-erp-primary/30 px-3 text-xs font-semibold text-erp-primary transition hover:bg-erp-primary/5">
                  <Pencil size={14} />
                  Edit Entry
                </Link>
              )}

              <button
                type="button"
                onClick={() => setPostConfirmation(true)}
                disabled={postProcessing || cancelProcessing}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {postProcessing ? <LoaderCircle size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Post Journal
              </button>

              <button
                type="button"
                onClick={() => {
                  setCancelReason('')
                  setCancelModal(true)
                }}
                disabled={postProcessing || cancelProcessing}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-3 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Ban size={14} />
                Cancel Journal
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Status Information */}
      {status === 'Posted' && (
        <section className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-700" />
          <div>
            <p className="text-xs font-bold text-emerald-800">Journal Entry Posted</p>
            <p className="mt-1 text-[11px] text-emerald-700">This entry has been posted and can no longer be edited.</p>
          </div>
        </section>
      )}

      {status === 'Draft' && (
        <section className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <Clock size={16} className="mt-0.5 shrink-0 text-amber-700" />
          <div>
            <p className="text-xs font-bold text-amber-800">Draft Journal Entry</p>
            <p className="mt-1 text-[11px] text-amber-700">This entry has not been posted to the accounts yet.</p>
          </div>
        </section>
      )}

      {status === 'Cancelled' && (
        <section className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
          <XCircle size={16} className="mt-0.5 shrink-0 text-red-700" />
          <div>
            <p className="text-xs font-bold text-red-800">Journal Entry Cancelled</p>
            <p className="mt-1 text-[11px] text-red-700">{journal.cancellationReason || 'This journal entry has been cancelled.'}</p>
          </div>
        </section>
      )}

      {/* Journal Information */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
            <FileText size={16} />
          </div>

          <div>
            <h2 className="text-sm font-bold text-slate-900">Journal Information</h2>
            <p className="text-[11px] text-slate-500">Basic entry and reference details</p>
          </div>
        </div>

        <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Journal Number</label>
            <div className="relative">
              <Hash size={14} className="absolute left-3 top-3 text-slate-400" />
              <input value={journal.journalNumber || '—'} readOnly className={`${inputClass} pl-9 font-semibold`} />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Entry Date</label>
            <div className="relative">
              <CalendarDays size={14} className="absolute left-3 top-3 text-slate-400" />
              <input value={formatDate(journal.entryDate)} readOnly className={`${inputClass} pl-9`} />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Reference Number</label>
            <div className="relative">
              <Hash size={14} className="absolute left-3 top-3 text-slate-400" />
              <input value={journal.referenceNumber || '—'} readOnly className={`${inputClass} pl-9`} />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Source Type</label>
            <input value={journal.sourceType || 'Manual'} readOnly className={inputClass} />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Created By</label>
            <div className="relative">
              <UserRound size={14} className="absolute left-3 top-3 text-slate-400" />
              <input value={getPersonName(journal.createdBy)} readOnly className={`${inputClass} pl-9`} />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Posted By</label>
            <div className="relative">
              <CheckCircle2 size={14} className="absolute left-3 top-3 text-slate-400" />
              <input value={getPersonName(journal.postedBy)} readOnly className={`${inputClass} pl-9`} />
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 p-3">
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">Narration</label>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-xs leading-relaxed text-slate-700">{journal.narration || 'No narration provided.'}</div>
        </div>

        {journal.postedAt && (
          <div className="border-t border-slate-100 px-3 py-2.5 text-[11px] text-slate-500">
            Posted on: <span className="font-semibold text-slate-700">{formatDate(journal.postedAt)}</span>
          </div>
        )}

        {journal.cancelledAt && (
          <div className="border-t border-slate-100 px-3 py-2.5 text-[11px] text-slate-500">
            Cancelled on: <span className="font-semibold text-slate-700">{formatDate(journal.cancelledAt)}</span>
          </div>
        )}
      </section>

      {/* Journal Lines */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <Landmark size={16} />
          </div>

          <div>
            <h2 className="text-sm font-bold text-slate-900">Journal Entry Lines</h2>
            <p className="text-[11px] text-slate-500">Account-wise debit and credit breakdown</p>
          </div>
        </div>

        {lines.length === 0 ? (
          <div className="px-4 py-10 text-center text-xs text-slate-500">No journal lines found.</div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[700px] text-left text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-3 font-bold">#</th>
                    <th className="px-3 py-3 font-bold">Account</th>
                    <th className="px-3 py-3 font-bold">Description</th>
                    <th className="px-3 py-3 text-right font-bold">Debit</th>
                    <th className="px-3 py-3 text-right font-bold">Credit</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {lines.map((line, index) => {
                    const account = line.accountId

                    return (
                      <tr key={line._id || index} className="hover:bg-slate-50/70">
                        <td className="px-3 py-3 text-slate-500">{index + 1}</td>

                        <td className="px-3 py-3">
                          <p className="font-semibold text-slate-800">{account?.accountName || 'Account unavailable'}</p>
                          <p className="mt-0.5 text-[10px] text-slate-400">{account?.accountCode || '—'}</p>
                        </td>

                        <td className="px-3 py-3 text-slate-600">{line.description || '—'}</td>

                        <td className="px-3 py-3 text-right font-semibold tabular-nums text-slate-800">{Number(line.debit || 0) > 0 ? formatCurrency(line.debit) : '—'}</td>

                        <td className="px-3 py-3 text-right font-semibold tabular-nums text-slate-800">{Number(line.credit || 0) > 0 ? formatCurrency(line.credit) : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>

                <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                  <tr>
                    <td colSpan={3} className="px-3 py-3 text-right font-bold text-slate-700">
                      Total
                    </td>
                    <td className="px-3 py-3 text-right font-bold tabular-nums text-emerald-700">{formatCurrency(totalDebit)}</td>
                    <td className="px-3 py-3 text-right font-bold tabular-nums text-blue-700">{formatCurrency(totalCredit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="space-y-2 p-3 md:hidden">
              {lines.map((line, index) => {
                const account = line.accountId

                return (
                  <div key={line._id || index} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold text-slate-400">LINE {index + 1}</p>
                        <p className="mt-1 text-xs font-bold text-slate-800">{account?.accountName || 'Account unavailable'}</p>
                        <p className="mt-0.5 text-[10px] text-slate-400">{account?.accountCode || '—'}</p>
                      </div>
                    </div>

                    {line.description && <p className="mt-2 text-[11px] text-slate-500">{line.description}</p>}

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-lg bg-emerald-50 p-2">
                        <p className="text-[10px] font-semibold text-emerald-700">Debit</p>
                        <p className="mt-1 text-xs font-bold tabular-nums text-emerald-800">{formatCurrency(line.debit)}</p>
                      </div>

                      <div className="rounded-lg bg-blue-50 p-2">
                        <p className="text-[10px] font-semibold text-blue-700">Credit</p>
                        <p className="mt-1 text-xs font-bold tabular-nums text-blue-800">{formatCurrency(line.credit)}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Totals */}
        <div className="grid gap-3 border-t border-slate-100 bg-slate-50/70 p-3 sm:grid-cols-2">
          <div className="rounded-lg border border-emerald-100 bg-white p-3">
            <div className="flex items-center gap-2 text-emerald-700">
              <IndianRupee size={15} />
              <span className="text-xs font-semibold">Total Debit</span>
            </div>
            <p className="mt-2 text-lg font-bold tabular-nums text-slate-900">{formatCurrency(totalDebit)}</p>
          </div>

          <div className="rounded-lg border border-blue-100 bg-white p-3">
            <div className="flex items-center gap-2 text-blue-700">
              <IndianRupee size={15} />
              <span className="text-xs font-semibold">Total Credit</span>
            </div>
            <p className="mt-2 text-lg font-bold tabular-nums text-slate-900">{formatCurrency(totalCredit)}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-3 py-3">
          <span className="text-xs font-semibold text-slate-600">Balance Difference</span>
          <span className={`text-sm font-bold tabular-nums ${Math.abs(totalDebit - totalCredit) < 0.01 ? 'text-emerald-700' : 'text-red-600'}`}>
            {formatCurrency(Math.abs(totalDebit - totalCredit))}
            {Math.abs(totalDebit - totalCredit) < 0.01 ? ' · Balanced' : ' · Not Balanced'}
          </span>
        </div>
      </section>

      {/* Cancellation information */}
      {status === 'Cancelled' && journal.cancellationReason && (
        <section className="overflow-hidden rounded-xl border border-red-200 bg-white">
          <div className="flex items-center gap-2 border-b border-red-100 px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600">
              <XCircle size={16} />
            </div>
            <h2 className="text-sm font-bold text-slate-900">Cancellation Information</h2>
          </div>

          <div className="p-3">
            <p className="text-xs leading-relaxed text-slate-700">{journal.cancellationReason}</p>
          </div>
        </section>
      )}

      {/* Bottom Actions */}
      <div className="flex items-center justify-end gap-2 w-fit rounded-xl ml-auto  p-2.5 ">
        <button type="button" onClick={() => navigate('/company/journal-entries')} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
          <ArrowLeft size={14} />
          Back to Journal Entries
        </button>
      </div>

      {/* POST CONFIRMATION */}

      {postConfirmation && (
        <TrashBox
          isOpen={postConfirmation}
          onClose={closePostConfirmation}
          onAction={postJournalEntry}
          isProcessing={postProcessing}
          variant="activate"
          title="Post Journal Entry?"
          message={`Post ${journal.journalNumber || 'this journal entry'}? Once posted, this entry will be locked and cannot be edited or cancelled.`}
          actionButtonText="Post Entry"
          cancelButtonText="Keep Draft"
        />
      )}

      {/* CANCEL CONFIRMATION */}

      <TrashBox
        isOpen={cancelModal}
        onClose={closeCancelModal}
        onAction={cancelJournalEntry}
        isProcessing={cancelProcessing}
        variant="delete"
        title="Cancel Journal Entry?"
        message={`Are you sure you want to cancel ${journal?.journalNumber || 'this journal entry'}?`}
        warningText="This action will mark the journal entry as cancelled."
        actionButtonText="Cancel Entry"
        cancelButtonText="Keep Draft"
        showReasonInput
        reason={cancelReason}
        onReasonChange={setCancelReason}
        reasonPlaceholder="Enter cancellation reason..."
      />
    </div>
  )
}
