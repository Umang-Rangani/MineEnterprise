import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Landmark, Save, LoaderCircle, RefreshCw, FileText, Layers3, Info } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import Loading from '../Loading/Loading'
import { hasPermission, useAuth } from '../../context/AuthContext'

const ACCOUNT_TYPES = ['Asset', 'Liability', 'Equity', 'Income', 'Expense']

const initialForm = {
  accountName: '',
  accountType: 'Asset',
  accountSubType: '',
  parentAccount: '',
  description: '',
}

const getAccount = (response) => {
  const data = response?.data
  return data?.data?.account || data?.data || data?.account || data
}

const getAccounts = (response) => {
  const data = response?.data
  const accounts = data?.data?.accounts || data?.data || data?.accounts
  return Array.isArray(accounts) ? accounts : []
}

export default function ChartOfAccountForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const { permissions } = useAuth()

  const canView = hasPermission(permissions, 'accounting:view')
  const canManage = hasPermission(permissions, 'accounting:manage-accounts')

  const [form, setForm] = useState(initialForm)
  const [accounts, setAccounts] = useState([])
  const [accountCode, setAccountCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  const [toast, setToast] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})

  const showToast = (type, message, duration = 3000) => {
    setToast({ id: Date.now(), type, message, duration })
  }

  const closeToast = () => setToast(null)

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

  useEffect(() => {
    document.title = isEdit ? 'Edit Account | MineERP' : 'Create Account | MineERP'
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
          const accountResponse = await axiosInstance.get(`/erp/chart-of-accounts/${id}`)

          if (cancelled) return

          const account = getAccount(accountResponse)

          if (!account?._id) {
            throw new Error('Account details were not found.')
          }

          if (account.isSystem) {
            throw new Error('System accounts cannot be edited.')
          }

          setAccountCode(account.accountCode || '')

          setForm({
            accountName: account.accountName || '',
            accountType: account.accountType || 'Asset',
            accountSubType: account.accountSubType || '',
            parentAccount: account.parentAccount?._id || account.parentAccount || '',
            description: account.description || '',
          })
        } else {
          setForm(initialForm)
          setAccountCode('')
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(true)
          showToast('error', error.response?.data?.message || error.message || 'Unable to load account information.', 5000)
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

  const parentOptions = accounts.filter((account) => {
    if (String(account._id) === String(id || '')) return false

    const isCurrentParent = String(account._id) === String(form.parentAccount)

    return account.accountType === form.accountType && (account.isActive || isCurrentParent)
  })

  const validateForm = () => {
    const errors = {}

    if (!form.accountName.trim()) {
      errors.accountName = 'Account name is required.'
    } else if (form.accountName.trim().length > 150) {
      errors.accountName = 'Account name cannot exceed 150 characters.'
    }

    if (!ACCOUNT_TYPES.includes(form.accountType)) {
      errors.accountType = 'Select a valid account type.'
    }

    if (form.accountSubType.trim().length > 100) {
      errors.accountSubType = 'Account sub type cannot exceed 100 characters.'
    }

    if (form.description.trim().length > 1000) {
      errors.description = 'Description cannot exceed 1000 characters.'
    }

    if (form.parentAccount && !parentOptions.some((account) => String(account._id) === String(form.parentAccount))) {
      errors.parentAccount = 'Select a valid active parent account.'
    }

    setFieldErrors(errors)

    if (Object.keys(errors).length) {
      showToast('warning', 'Please check the highlighted fields.')
      return false
    }

    return true
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!canManage) {
      showToast('error', 'You do not have permission to manage accounts.')
      return
    }

    if (saving || !validateForm()) return

    setSaving(true)

    try {
      const payload = {
        accountName: form.accountName.trim(),
        accountSubType: form.accountSubType.trim(),
        parentAccount: form.parentAccount || null,
        description: form.description.trim(),
      }

      if (isEdit) {
        await axiosInstance.patch(`/erp/chart-of-accounts/${id}`, payload)
      } else {
        payload.accountType = form.accountType

        await axiosInstance.post('/erp/chart-of-accounts', payload)
      }

      navigate('/company/chart-of-accounts', {
        state: {
          message: isEdit ? 'Account updated successfully.' : 'Account created successfully.',
        },
      })
    } catch (error) {
      showToast('error', error.response?.data?.message || `Unable to ${isEdit ? 'update' : 'create'} account.`, 5000)
    } finally {
      setSaving(false)
    }
  }

  const breadcrumbItems = [
    {
      title: 'Chart of Accounts',
      link: '/company/chart-of-accounts',
    },
    {
      title: isEdit ? 'Edit Account' : 'Create Account',
      link: null,
    },
  ]

  const inputClass = (field) =>
    `h-10 w-full rounded-lg border bg-white px-3 text-xs text-slate-700 outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 ${
      fieldErrors[field] ? 'border-red-400' : 'border-slate-200'
    }`

  const labelClass = 'mb-1.5 block text-xs font-semibold text-slate-700'

  const renderError = (field) => (fieldErrors[field] ? <p className="mt-1 text-[11px] text-red-600">{fieldErrors[field]}</p> : null)

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
            <Loading fullScreen={false} label="Loading account" description="Fetching account information..." className="!h-full min-h-[400px]" />
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
          <Landmark size={30} className="mx-auto text-slate-300" />

          <h2 className="mt-3 text-sm font-bold text-slate-800">Unable to load account</h2>

          <p className="mt-1 text-xs text-slate-500">Required account information could not be loaded.</p>

          <div className="mt-4 flex justify-center gap-2">
            <button type="button" onClick={() => navigate('/company/chart-of-accounts')} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              <ArrowLeft size={14} />
              Back to Accounts
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
        <p className="mt-1 text-xs text-slate-500">You do not have permission to view accounts.</p>
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

          {isEdit && <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-bold text-slate-600">{accountCode}</span>}
        </div>
      </section>

      {!canManage && (
        <section className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <Info size={16} className="mt-0.5 shrink-0 text-amber-700" />
          <div>
            <p className="text-xs font-bold text-amber-800">View-only access</p>
            <p className="mt-1 text-[11px] text-amber-700">You can view account information but cannot create or update accounts.</p>
          </div>
        </section>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Account Information */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
              <Landmark size={16} />
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900">Account Information</h2>
              <p className="text-[11px] text-slate-500">Enter the account name and classification</p>
            </div>
          </div>

          <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="min-w-0">
              <label className={labelClass}>Account Code</label>
              <input type="text" value={isEdit ? accountCode : 'Auto-generated on save'} disabled className={inputClass('accountCode')} />
              <p className="mt-1 text-[10px] text-slate-400">Generated automatically by the system</p>
            </div>

            <div className="min-w-0">
              <label className={labelClass}>
                Account Name <span className="text-red-500">*</span>
              </label>
              <input type="text" maxLength={150} value={form.accountName} onChange={(event) => updateFormField('accountName', event.target.value)} disabled={!canManage} placeholder="Enter account name" className={inputClass('accountName')} />
              {renderError('accountName')}
            </div>

            <div className="min-w-0">
              <label className={labelClass}>
                Account Type <span className="text-red-500">*</span>
              </label>
              <select value={form.accountType} onChange={(event) => updateFormField('accountType', event.target.value)} disabled={isEdit || !canManage} className={inputClass('accountType')}>
                {ACCOUNT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              {renderError('accountType')}
              {isEdit && <p className="mt-1 text-[10px] text-slate-400">Account type cannot be changed after creation.</p>}
            </div>
          </div>
        </section>

        {/* Account Hierarchy */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <Layers3 size={16} />
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900">Account Classification</h2>
              <p className="text-[11px] text-slate-500">Set sub type and parent account</p>
            </div>
          </div>

          <div className="grid gap-3 p-3 sm:grid-cols-2">
            <div className="min-w-0">
              <label className={labelClass}>Account Sub Type</label>
              <input
                type="text"
                maxLength={100}
                value={form.accountSubType}
                onChange={(event) => updateFormField('accountSubType', event.target.value)}
                disabled={!canManage}
                placeholder="e.g. Current Asset, Operating Income"
                className={inputClass('accountSubType')}
              />
              {renderError('accountSubType')}
            </div>

            <div className="min-w-0">
              <label className={labelClass}>Parent Account</label>
              <select value={form.parentAccount} onChange={(event) => updateFormField('parentAccount', event.target.value)} disabled={!canManage} className={inputClass('parentAccount')}>
                <option value="">No Parent Account</option>
                {parentOptions.map((account) => (
                  <option key={account._id} value={account._id}>
                    {account.accountCode} - {account.accountName}
                  </option>
                ))}
              </select>
              {renderError('parentAccount')}
              <p className="mt-1 text-[10px] text-slate-400">Only accounts of the same account type are shown.</p>
            </div>
          </div>
        </section>

        {/* Description */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
              <FileText size={16} />
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900">Description & Notes</h2>
              <p className="text-[11px] text-slate-500">Additional information about this account</p>
            </div>
          </div>

          <div className="p-3">
            <textarea
              rows={4}
              maxLength={1000}
              value={form.description}
              onChange={(event) => updateFormField('description', event.target.value)}
              disabled={!canManage}
              placeholder="Enter account details or additional notes..."
              className={`w-full resize-y rounded-lg border bg-white px-3 py-2.5 text-xs outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10 disabled:cursor-not-allowed disabled:bg-slate-50 ${
                fieldErrors.description ? 'border-red-400' : 'border-slate-200'
              }`}
            />

            <div className="mt-1 flex items-center justify-between gap-2">
              {renderError('description')}
              <p className="ml-auto text-[10px] text-slate-400">{form.description.length}/1000</p>
            </div>
          </div>
        </section>

        {/* Information */}
        <section className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50/70 p-3">
          <Info size={15} className="mt-0.5 shrink-0 text-blue-600" />
          <div>
            <p className="text-xs font-semibold text-blue-800">Account balance information</p>
            <p className="mt-1 text-[11px] leading-relaxed text-blue-700">New accounts are created with zero opening balance. Opening balances should be recorded through journal entries.</p>
          </div>
        </section>

        {/* Actions */}
        <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white/95 p-2.5 shadow-sm backdrop-blur">
          <p className="hidden text-[11px] text-slate-500 sm:block">{isEdit ? 'Review the account details before saving changes.' : 'The account will be added to your Chart of Accounts.'}</p>

          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            <button type="button" onClick={() => navigate('/company/chart-of-accounts')} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
              <ArrowLeft size={14} />
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving || !canManage}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-erp-primary px-4 text-xs font-bold text-white transition hover:bg-erp-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <LoaderCircle size={15} className="animate-spin" /> : <Save size={15} />}
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Account'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
