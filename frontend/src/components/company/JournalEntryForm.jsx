import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, BookOpen, CalendarDays, FileText, Plus, Trash2, Save, LoaderCircle, RefreshCw, Info, Calculator } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import Loading from '../Loading/Loading'
import { hasPermission, useAuth } from '../../context/AuthContext'

const initialLine = {
  accountId: '',
  description: '',
  debit: '',
  credit: '',
}

const initialForm = {
  entryDate: new Date().toLocaleDateString('en-CA'),
  referenceNumber: '',
  narration: '',
  lines: [{ ...initialLine }, { ...initialLine }],
}

const getAccounts = (response) => {
  const data = response?.data
  const accounts = data?.data?.accounts || data?.data || data?.accounts
  return Array.isArray(accounts) ? accounts : []
}

const getJournal = (response) => {
  const data = response?.data
  return data?.data?.entry || data?.data?.journalEntry || data?.data || data?.entry || data
}

const roundAmount = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100

const formatAmount = (value) =>
  Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

export default function JournalEntryForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const { permissions } = useAuth()

  const canView = hasPermission(permissions, 'accounting:view')
  const canManage = hasPermission(permissions, 'accounting:journal-entry')

  const [form, setForm] = useState(initialForm)
  const [accounts, setAccounts] = useState([])
  const [journalNumber, setJournalNumber] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  const [toast, setToast] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [lineErrors, setLineErrors] = useState({})

  const showToast = (type, message, duration = 3000) => {
    setToast({ id: Date.now(), type, message, duration })
  }

  const closeToast = () => setToast(null)

  useEffect(() => {
    document.title = isEdit ? 'Edit Journal Entry | MineERP' : 'Create Journal Entry | MineERP'
  }, [isEdit])

  useEffect(() => {
    let cancelled = false

    const loadFormData = async () => {
      setLoading(true)
      setLoadError(false)

      try {
        const accountsResponse = await axiosInstance.get('/erp/chart-of-accounts')

        if (cancelled) return

        setAccounts(getAccounts(accountsResponse))

        if (isEdit) {
          const journalResponse = await axiosInstance.get(`/erp/journal-entries/${id}`)

          if (cancelled) return

          const entry = getJournal(journalResponse)

          if (!entry?._id) {
            throw new Error('Journal entry details were not found.')
          }

          if (entry.status !== 'Draft' || entry.sourceType !== 'Manual') {
            throw new Error('Only manual draft journal entries can be edited.')
          }

          setJournalNumber(entry.journalNumber || '')

          setForm({
            entryDate: entry.entryDate ? new Date(entry.entryDate).toLocaleDateString('en-CA') : initialForm.entryDate,
            referenceNumber: entry.referenceNumber || '',
            narration: entry.narration || '',
            lines:
              Array.isArray(entry.lines) && entry.lines.length
                ? entry.lines.map((line) => ({
                    accountId: line.accountId?._id || line.accountId || '',
                    description: line.description || '',
                    debit: Number(line.debit) > 0 ? String(line.debit) : '',
                    credit: Number(line.credit) > 0 ? String(line.credit) : '',
                  }))
                : initialForm.lines,
          })
        } else {
          setForm({
            ...initialForm,
            entryDate: new Date().toLocaleDateString('en-CA'),
            lines: [{ ...initialLine }, { ...initialLine }],
          })
          setJournalNumber('')
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(true)
          showToast('error', error.response?.data?.message || error.message || 'Unable to load journal entry information.', 5000)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadFormData()

    return () => {
      cancelled = true
    }
  }, [id, isEdit, retryKey])

  const updateFormField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))

    setFieldErrors((current) => ({
      ...current,
      [field]: '',
    }))
  }

  const updateLine = (index, field, value) => {
    setForm((current) => ({
      ...current,
      lines: current.lines.map((line, lineIndex) => {
        if (lineIndex !== index) return line

        const updatedLine = {
          ...line,
          [field]: value,
        }

        if (field === 'debit' && Number(value) > 0) {
          updatedLine.credit = ''
        }

        if (field === 'credit' && Number(value) > 0) {
          updatedLine.debit = ''
        }

        return updatedLine
      }),
    }))

    setLineErrors((current) => ({
      ...current,
      [index]: {
        ...current[index],
        [field]: '',
      },
    }))
  }

  const addLine = () => {
    setForm((current) => ({
      ...current,
      lines: [...current.lines, { ...initialLine }],
    }))
  }

  const removeLine = (index) => {
    if (form.lines.length <= 2) {
      showToast('warning', 'At least two journal lines are required.')
      return
    }

    setForm((current) => ({
      ...current,
      lines: current.lines.filter((_, lineIndex) => lineIndex !== index),
    }))

    setLineErrors({})
  }

  const totalDebit = roundAmount(form.lines.reduce((total, line) => total + (Number(line.debit) || 0), 0))

  const totalCredit = roundAmount(form.lines.reduce((total, line) => total + (Number(line.credit) || 0), 0))

  const difference = roundAmount(totalDebit - totalCredit)
  const isBalanced = totalDebit > 0 && totalCredit > 0 && difference === 0

  const validateForm = () => {
    const errors = {}
    const rowErrors = {}

    if (!form.entryDate) {
      errors.entryDate = 'Entry date is required.'
    }

    if (form.referenceNumber.trim().length > 100) {
      errors.referenceNumber = 'Reference number cannot exceed 100 characters.'
    }

    if (!form.narration.trim()) {
      errors.narration = 'Narration is required.'
    } else if (form.narration.trim().length > 1000) {
      errors.narration = 'Narration cannot exceed 1000 characters.'
    }

    if (form.lines.length < 2) {
      errors.lines = 'At least two journal lines are required.'
    }

    form.lines.forEach((line, index) => {
      const currentErrors = {}

      if (!line.accountId) {
        currentErrors.accountId = 'Select an account.'
      } else if (!accounts.some((account) => String(account._id) === String(line.accountId) && account.isActive)) {
        currentErrors.accountId = 'Select an active account.'
      }

      const debit = Number(line.debit) || 0
      const credit = Number(line.credit) || 0

      if (debit < 0 || credit < 0) {
        currentErrors.amount = 'Amount cannot be negative.'
      } else if (debit === 0 && credit === 0) {
        currentErrors.amount = 'Enter a debit or credit amount.'
      } else if (debit > 0 && credit > 0) {
        currentErrors.amount = 'Enter either debit or credit, not both.'
      }

      if (line.description.trim().length > 250) {
        currentErrors.description = 'Description cannot exceed 250 characters.'
      }

      if (Object.keys(currentErrors).length) {
        rowErrors[index] = currentErrors
      }
    })

    if (totalDebit <= 0 || totalCredit <= 0) {
      errors.balance = 'Both debit and credit totals must be greater than zero.'
    } else if (difference !== 0) {
      errors.balance = 'Total debit and total credit must be equal.'
    }

    setFieldErrors(errors)
    setLineErrors(rowErrors)

    if (Object.keys(errors).length || Object.keys(rowErrors).length) {
      showToast('warning', 'Please check the highlighted fields.')
      return false
    }

    return true
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!canManage) {
      showToast('error', 'You do not have permission to manage journal entries.')
      return
    }

    if (saving || !validateForm()) return

    setSaving(true)

    try {
      const payload = {
        entryDate: form.entryDate,
        referenceNumber: form.referenceNumber.trim(),
        narration: form.narration.trim(),
        lines: form.lines.map((line) => ({
          accountId: line.accountId,
          description: line.description.trim(),
          debit: Number(line.debit) || 0,
          credit: Number(line.credit) || 0,
        })),
      }

      if (isEdit) {
        await axiosInstance.patch(`/erp/journal-entries/${id}`, payload)
      } else {
        await axiosInstance.post('/erp/journal-entries', payload)
      }

      navigate('/company/journal-entries', {
        state: {
          message: isEdit ? 'Journal entry updated successfully.' : 'Journal entry created successfully.',
        },
      })
    } catch (error) {
      showToast('error', error.response?.data?.message || `Unable to ${isEdit ? 'update' : 'create'} journal entry.`, 5000)
    } finally {
      setSaving(false)
    }
  }

  const breadcrumbItems = [
    {
      title: 'Journal Entries',
      link: '/company/journal-entries',
    },
    {
      title: isEdit ? 'Edit Journal Entry' : 'Create Journal Entry',
      link: null,
    },
  ]

  const inputClass = (hasError = false) =>
    `h-10 w-full rounded-lg border bg-white px-3 text-xs text-slate-700 outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 ${
      hasError ? 'border-red-400' : 'border-slate-200'
    }`

  const labelClass = 'mb-1.5 block text-xs font-semibold text-slate-700'

  const renderError = (message) => (message ? <p className="mt-1 text-[11px] text-red-600">{message}</p> : null)

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
            <Loading fullScreen={false} label="Loading journal entry" description="Fetching journal information..." className="!h-full min-h-[400px]" />
          </div>
        </section>
      </div>
    )
  }

  if (loadError) {
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
          <p className="mt-1 text-xs text-slate-500">Required journal entry information could not be loaded.</p>

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

  return (
    <div className="min-w-0 space-y-4 text-sm">
      {toast && <Toast toast={toast} onClose={closeToast} />}

      {/* Header */}
      <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        <div className="h-1 bg-erp-primary" />

        <div className="flex h-[calc(100%-4px)] items-center justify-between gap-3 px-4 sm:px-5">
          <div className="min-w-0 flex-1 overflow-hidden">
            <BreadCrumb items={breadcrumbItems} />
          </div>

          {isEdit && <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-bold text-slate-600">{journalNumber}</span>}
        </div>
      </section>

      {!canManage && (
        <section className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <Info size={16} className="mt-0.5 shrink-0 text-amber-700" />
          <div>
            <p className="text-xs font-bold text-amber-800">View-only access</p>
            <p className="mt-1 text-[11px] text-amber-700">You can view journal entry information but cannot create or update entries.</p>
          </div>
        </section>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Basic Information */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
              <BookOpen size={16} />
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900">Journal Information</h2>
              <p className="text-[11px] text-slate-500">Enter the journal date and transaction details</p>
            </div>
          </div>

          <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="min-w-0">
              <label className={labelClass}>Journal Number</label>
              <input type="text" value={isEdit ? journalNumber : 'Auto-generated on save'} disabled className={inputClass()} />
              <p className="mt-1 text-[10px] text-slate-400">Generated automatically by the system</p>
            </div>

            <div className="min-w-0">
              <label className={labelClass}>
                Entry Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <CalendarDays size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="date" value={form.entryDate} onChange={(event) => updateFormField('entryDate', event.target.value)} disabled={!canManage} className={`${inputClass(Boolean(fieldErrors.entryDate))} pl-9`} />
              </div>
              {renderError(fieldErrors.entryDate)}
            </div>

            <div className="min-w-0">
              <label className={labelClass}>Reference Number</label>
              <input
                type="text"
                maxLength={100}
                value={form.referenceNumber}
                onChange={(event) => updateFormField('referenceNumber', event.target.value)}
                disabled={!canManage}
                placeholder="e.g. REF-001"
                className={inputClass(Boolean(fieldErrors.referenceNumber))}
              />
              {renderError(fieldErrors.referenceNumber)}
            </div>
          </div>

          <div className="border-t border-slate-100 p-3">
            <label className={labelClass}>
              Narration <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              maxLength={1000}
              value={form.narration}
              onChange={(event) => updateFormField('narration', event.target.value)}
              disabled={!canManage}
              placeholder="Describe the purpose of this journal entry..."
              className={`w-full resize-y rounded-lg border bg-white px-3 py-2.5 text-xs outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10 disabled:cursor-not-allowed disabled:bg-slate-50 ${
                fieldErrors.narration ? 'border-red-400' : 'border-slate-200'
              }`}
            />

            <div className="mt-1 flex items-center justify-between gap-2">
              {renderError(fieldErrors.narration)}
              <p className="ml-auto text-[10px] text-slate-400">{form.narration.length}/1000</p>
            </div>
          </div>
        </section>

        {/* Journal Lines */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <FileText size={16} />
              </div>

              <div>
                <h2 className="text-sm font-bold text-slate-900">Journal Entry Lines</h2>
                <p className="text-[11px] text-slate-500">Add accounts and their debit or credit amounts</p>
              </div>
            </div>

            <button
              type="button"
              onClick={addLine}
              disabled={!canManage}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-erp-primary/20 bg-erp-primary/5 px-3 text-[11px] font-bold text-erp-primary transition hover:bg-erp-primary/10 disabled:opacity-50"
            >
              <Plus size={14} />
              Add Line
            </button>
          </div>

          {fieldErrors.lines && <p className="px-3 pt-2 text-[11px] text-red-600">{fieldErrors.lines}</p>}

          <div className="space-y-3 p-3">
            {form.lines.map((line, index) => (
              <div key={index} className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-700">Line {index + 1}</p>

                  <button
                    type="button"
                    onClick={() => removeLine(index)}
                    disabled={!canManage || form.lines.length <= 2}
                    title="Remove line"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="min-w-0 lg:col-span-2">
                    <label className={labelClass}>
                      Account <span className="text-red-500">*</span>
                    </label>
                    <select value={line.accountId} onChange={(event) => updateLine(index, 'accountId', event.target.value)} disabled={!canManage} className={inputClass(Boolean(lineErrors[index]?.accountId))}>
                      <option value="">Select Account</option>
                      {accounts
                        .filter((account) => account.isActive || String(account._id) === String(line.accountId))
                        .map((account) => (
                          <option key={account._id} value={account._id}>
                            {account.accountCode} - {account.accountName} ({account.accountType})
                          </option>
                        ))}
                    </select>
                    {renderError(lineErrors[index]?.accountId)}
                  </div>

                  <div className="min-w-0">
                    <label className={labelClass}>Debit Amount (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.debit}
                      onChange={(event) => updateLine(index, 'debit', event.target.value)}
                      disabled={!canManage || Number(line.credit) > 0}
                      placeholder="0.00"
                      className={inputClass(Boolean(lineErrors[index]?.amount))}
                    />
                  </div>

                  <div className="min-w-0">
                    <label className={labelClass}>Credit Amount (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.credit}
                      onChange={(event) => updateLine(index, 'credit', event.target.value)}
                      disabled={!canManage || Number(line.debit) > 0}
                      placeholder="0.00"
                      className={inputClass(Boolean(lineErrors[index]?.amount))}
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <label className={labelClass}>Line Description</label>
                  <input
                    type="text"
                    maxLength={250}
                    value={line.description}
                    onChange={(event) => updateLine(index, 'description', event.target.value)}
                    disabled={!canManage}
                    placeholder="Optional line description"
                    className={inputClass(Boolean(lineErrors[index]?.description))}
                  />
                  {renderError(lineErrors[index]?.description)}
                </div>

                {renderError(lineErrors[index]?.amount)}
              </div>
            ))}
          </div>
        </section>

        {/* Totals */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
              <Calculator size={16} />
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900">Journal Summary</h2>
              <p className="text-[11px] text-slate-500">Debit and credit totals must match</p>
            </div>
          </div>

          <div className="grid gap-3 p-3 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-semibold text-slate-500">Total Debit</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-slate-800">₹{formatAmount(totalDebit)}</p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-semibold text-slate-500">Total Credit</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-slate-800">₹{formatAmount(totalCredit)}</p>
            </div>

            <div className={`rounded-lg border p-3 ${isBalanced ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
              <p className={`text-[11px] font-semibold ${isBalanced ? 'text-emerald-700' : 'text-amber-700'}`}>Difference</p>
              <p className={`mt-1 text-lg font-bold tabular-nums ${isBalanced ? 'text-emerald-800' : 'text-amber-800'}`}>₹{formatAmount(Math.abs(difference))}</p>
              <p className={`mt-1 text-[10px] font-semibold ${isBalanced ? 'text-emerald-700' : 'text-amber-700'}`}>{isBalanced ? 'Balanced' : 'Not Balanced'}</p>
            </div>
          </div>

          {renderError(fieldErrors.balance)}
        </section>

        {/* Information */}
        <section className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50/70 p-3">
          <Info size={15} className="mt-0.5 shrink-0 text-blue-600" />
          <div>
            <p className="text-xs font-semibold text-blue-800">Double-entry accounting</p>
            <p className="mt-1 text-[11px] leading-relaxed text-blue-700">Every journal entry must have at least two lines. Total debit must always equal total credit. Saving creates a Draft entry; it does not post the transaction to the ledger.</p>
          </div>
        </section>

        {/* Actions */}
        <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white/95 p-2.5 shadow-sm backdrop-blur">
          <p className="hidden text-[11px] text-slate-500 sm:block">{isEdit ? 'Review the draft journal entry before saving changes.' : 'The journal entry will be saved as Draft.'}</p>

          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            <button type="button" onClick={() => navigate('/company/journal-entries')} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
              <ArrowLeft size={14} />
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving || !canManage}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-erp-primary px-4 text-xs font-bold text-white transition hover:bg-erp-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <LoaderCircle size={15} className="animate-spin" /> : <Save size={15} />}
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Save Draft'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
