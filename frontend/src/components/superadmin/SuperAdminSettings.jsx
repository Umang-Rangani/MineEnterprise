import { useEffect, useState } from 'react'
import { UserRound, ShieldCheck, Building2, Settings as SettingsIcon, Save, LockKeyhole, Eye, EyeOff, LoaderCircle, AlertCircle, CheckCircle2, RefreshCw, Mail, Phone, Globe, CalendarDays, Coins } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import Loading from '../Loading/Loading'

const inputClass =
  'h-9 w-full rounded-lg border border-erp-border bg-erp-surface px-3 text-xs text-erp-text outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm'

const labelClass = 'mb-1.5 block text-xs font-semibold text-erp-text-secondary'

const cardClass = 'overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card'

const initialPreferences = {
  defaultCurrency: 'INR',
  timezone: 'Asia/Kolkata',
  dateFormat: 'DD/MM/YYYY',
}

const breadcrumbItems = [
  {
    title: 'Settings',
    link: null,
  },
]

export default function SuperAdminSettings() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [profileSaving, setProfileSaving] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [preferencesSaving, setPreferencesSaving] = useState(false)

  const [apiError, setApiError] = useState('')

  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
  })

  const [password, setPassword] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const [preferences, setPreferences] = useState(initialPreferences)

  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [toast, setToast] = useState(null)

  const [hasLoaded, setHasLoaded] = useState(false)

  const showToast = (type, message) => {
    setToast({
      id: Date.now(),
      type,
      message,
      duration: 3000,
    })
  }

  useEffect(() => {
    document.title = 'Settings | MineERP'
  }, [])

  // FETCH SETTINGS

  const fetchSettings = async (isRefresh = false) => {
    if (isRefresh && !hasLoaded) return

    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setApiError('')

    try {
      const [profileResponse, settingsResponse] = await Promise.all([axiosInstance.get('/superadmin/me'), axiosInstance.get('/superadmin/settings')])

      const user = profileResponse.data?.user
      const settings = settingsResponse.data?.settings

      if (!user) {
        throw new Error('Unable to load SuperAdmin profile.')
      }

      setProfile({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      })

      setPreferences({
        defaultCurrency: settings?.defaultCurrency || initialPreferences.defaultCurrency,
        timezone: settings?.timezone || initialPreferences.timezone,
        dateFormat: settings?.dateFormat || initialPreferences.dateFormat,
      })

      setHasLoaded(true)
    } catch (error) {
      setApiError(error.response?.data?.message || error.message || 'Unable to load settings.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  // PROFILE CHANGE

  const handleProfileChange = (event) => {
    const { name, value } = event.target

    setProfile((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  // PASSWORD CHANGE

  const handlePasswordChange = (event) => {
    const { name, value } = event.target

    setPassword((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  // PREFERENCES CHANGE

  const handlePreferenceChange = (event) => {
    const { name, value } = event.target

    setPreferences((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  // UPDATE PROFILE

  const handleProfileSubmit = async (event) => {
    event.preventDefault()

    const name = profile.name.trim()
    const phone = profile.phone.trim()

    if (name.length < 2 || name.length > 100) {
      showToast('error', 'Name must be between 2 and 100 characters.')
      return
    }

    if (phone.length > 20) {
      showToast('error', 'Phone number cannot exceed 20 characters.')
      return
    }

    try {
      setProfileSaving(true)

      const response = await axiosInstance.patch('/superadmin/profile', {
        name,
        phone,
      })

      const updatedUser = response.data?.user

      if (updatedUser) {
        setProfile({
          name: updatedUser.name || '',
          email: updatedUser.email || profile.email,
          phone: updatedUser.phone || '',
        })
      }

      showToast('success', response.data?.message || 'Profile updated successfully.')
    } catch (error) {
      showToast('error', error.response?.data?.message || 'Unable to update profile.')
    } finally {
      setProfileSaving(false)
    }
  }

  // CHANGE PASSWORD

  const handlePasswordSubmit = async (event) => {
    event.preventDefault()

    const { currentPassword, newPassword, confirmPassword } = password

    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('error', 'All password fields are required.')
      return
    }

    if (newPassword.length < 8) {
      showToast('error', 'New password must be at least 8 characters.')
      return
    }

    if (newPassword !== confirmPassword) {
      showToast('error', 'New password and confirm password do not match.')
      return
    }

    if (currentPassword === newPassword) {
      showToast('error', 'New password must be different from current password.')
      return
    }

    try {
      setPasswordSaving(true)

      const response = await axiosInstance.patch('/superadmin/change-password', {
        currentPassword,
        newPassword,
        confirmPassword,
      })

      setPassword({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })

      setShowCurrentPassword(false)
      setShowNewPassword(false)
      setShowConfirmPassword(false)

      showToast('success', response.data?.message || 'Password changed successfully.')
    } catch (error) {
      showToast('error', error.response?.data?.message || 'Unable to change password.')
    } finally {
      setPasswordSaving(false)
    }
  }

  // SAVE PREFERENCES

  const handlePreferencesSubmit = async (event) => {
    event.preventDefault()

    try {
      setPreferencesSaving(true)

      const response = await axiosInstance.patch('/superadmin/settings', preferences)

      const updatedSettings = response.data?.settings

      if (updatedSettings) {
        setPreferences({
          defaultCurrency: updatedSettings.defaultCurrency,
          timezone: updatedSettings.timezone,
          dateFormat: updatedSettings.dateFormat,
        })
      }

      showToast('success', response.data?.message || 'System preferences saved successfully.')
    } catch (error) {
      showToast('error', error.response?.data?.message || 'Unable to save system preferences.')
    } finally {
      setPreferencesSaving(false)
    }
  }

  // PASSWORD FIELD

  const renderPasswordField = (label, name, visible, toggleVisible) => (
    <div>
      <label className={labelClass}>{label}</label>

      <div className="relative">
        <input type={visible ? 'text' : 'password'} name={name} value={password[name]} onChange={handlePasswordChange} autoComplete="new-password" required className={`${inputClass} pr-10`} />

        <button type="button" onClick={toggleVisible} aria-label={visible ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-erp-muted transition hover:text-erp-text">
          {visible ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  )

  // INITIAL LOADING

  if (loading && !hasLoaded) {
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
            <Loading fullScreen={false} label="Loading settings" description="Please wait while we load platform settings." className="!h-full min-h-[480px]" />
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-4 pb-8 text-sm">
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      {/* HEADER */}

      <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        <div className="h-1 bg-erp-primary" />

        <div className="flex flex-col justify-between gap-3 px-4 py-3 sm:px-5 sm:flex-row sm:items-center">
          <div>
            <BreadCrumb items={breadcrumbItems} />

            {/* <h1 className="mt-2 text-lg font-bold text-erp-text">Settings</h1> */}

            {/* <p className="mt-1 text-xs text-erp-text-secondary">Manage your SuperAdmin account and platform preferences.</p> */}
          </div>

          <button
            type="button"
            onClick={() => fetchSettings(true)}
            disabled={refreshing || loading}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-erp-border px-3 text-xs font-semibold text-erp-text-secondary transition hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />

            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </section>

      {/* API ERROR */}

      {apiError && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />

          <p>{apiError}</p>

          <button type="button" onClick={() => fetchSettings(true)} disabled={refreshing} className="ml-auto shrink-0 font-semibold underline disabled:opacity-50">
            Retry
          </button>
        </div>
      )}

      {!apiError && (
        <>
          {/* ACCOUNT SETTINGS */}

          <section className={cardClass}>
            <div className="flex items-center gap-3 border-b border-erp-border p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-erp-primary-light text-erp-primary">
                <UserRound size={19} />
              </div>

              <div>
                <h2 className="text-sm font-bold text-erp-text">Account Settings</h2>

                <p className="mt-0.5 text-xs text-erp-muted">Update your SuperAdmin profile information.</p>
              </div>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-4 p-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Full Name</label>

                  <input type="text" name="name" value={profile.name} onChange={handleProfileChange} placeholder="Enter your name" minLength={2} maxLength={100} required className={inputClass} />
                </div>

                <div>
                  <label className={labelClass}>Email Address</label>

                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-erp-muted" />

                    <input type="email" value={profile.email} readOnly className={`${inputClass} cursor-not-allowed pl-9 opacity-70`} />
                  </div>

                  <p className="mt-1 text-[10px] text-erp-muted">Email address cannot be changed.</p>
                </div>

                <div>
                  <label className={labelClass}>Phone Number</label>

                  <div className="relative">
                    <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-erp-muted" />

                    <input type="tel" name="phone" value={profile.phone} onChange={handleProfileChange} placeholder="Enter phone number" maxLength={20} className={`${inputClass} pl-9`} />
                  </div>
                </div>
              </div>

              <div className="flex justify-end border-t border-erp-border pt-4">
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-erp-primary px-4 text-xs font-semibold text-white transition hover:bg-erp-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {profileSaving ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}

                  {profileSaving ? 'Saving...' : 'Update Profile'}
                </button>
              </div>
            </form>
          </section>

          {/* SECURITY SETTINGS */}

          <section className={cardClass}>
            <div className="flex items-center gap-3 border-b border-erp-border p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-erp-primary-light text-erp-primary">
                <ShieldCheck size={19} />
              </div>

              <div>
                <h2 className="text-sm font-bold text-erp-text">Security Settings</h2>

                <p className="mt-0.5 text-xs text-erp-muted">Change your SuperAdmin account password.</p>
              </div>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4 p-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {renderPasswordField('Current Password', 'currentPassword', showCurrentPassword, () => setShowCurrentPassword((previous) => !previous))}

                {renderPasswordField('New Password', 'newPassword', showNewPassword, () => setShowNewPassword((previous) => !previous))}

                {renderPasswordField('Confirm New Password', 'confirmPassword', showConfirmPassword, () => setShowConfirmPassword((previous) => !previous))}
              </div>

              <div className="flex items-start gap-2 rounded-lg border border-violet-100 bg-erp-primary-light/40 p-3 text-xs text-erp-text-secondary">
                <LockKeyhole size={15} className="mt-0.5 shrink-0 text-erp-primary" />

                <p>New password must contain at least 8 characters and must be different from your current password.</p>
              </div>

              <div className="flex justify-end border-t border-erp-border pt-4">
                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-erp-primary px-4 text-xs font-semibold text-white transition hover:bg-erp-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {passwordSaving ? <LoaderCircle size={14} className="animate-spin" /> : <LockKeyhole size={14} />}

                  {passwordSaving ? 'Updating...' : 'Change Password'}
                </button>
              </div>
            </form>
          </section>

          {/* PLATFORM INFORMATION */}

          <section className={cardClass}>
            <div className="flex items-center gap-3 border-b border-erp-border p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-erp-primary-light text-erp-primary">
                <Building2 size={19} />
              </div>

              <div>
                <h2 className="text-sm font-bold text-erp-text">Platform Information</h2>

                <p className="mt-0.5 text-xs text-erp-muted">Basic information about the MineERP platform.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
              <div>
                <label className={labelClass}>Platform Name</label>

                <input type="text" value="MineERP" readOnly className={`${inputClass} cursor-not-allowed opacity-70`} />
              </div>

              <div>
                <label className={labelClass}>Platform Version</label>

                <input type="text" value="1.0.0" readOnly className={`${inputClass} cursor-not-allowed opacity-70`} />
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>Platform Description</label>

                <textarea
                  value="MineERP is a standalone SaaS ERP platform designed to manage business operations through a centralized system."
                  readOnly
                  rows={3}
                  className="w-full resize-none rounded-lg border border-erp-border bg-erp-surface px-3 py-2 text-xs text-erp-text outline-none opacity-70 sm:text-sm"
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-erp-text-secondary md:col-span-2">
                <CheckCircle2 size={14} className="text-emerald-600" />
                Platform information is read-only.
              </div>
            </div>
          </section>

          {/* SYSTEM PREFERENCES */}

          <section className={cardClass}>
            <div className="flex items-center gap-3 border-b border-erp-border p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-erp-primary-light text-erp-primary">
                <SettingsIcon size={19} />
              </div>

              <div>
                <h2 className="text-sm font-bold text-erp-text">System Preferences</h2>

                <p className="mt-0.5 text-xs text-erp-muted">Configure default platform preferences.</p>
              </div>
            </div>

            <form onSubmit={handlePreferencesSubmit} className="space-y-4 p-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>
                    <span className="inline-flex items-center gap-1.5">
                      <Coins size={14} />
                      Default Currency
                    </span>
                  </label>

                  <select name="defaultCurrency" value={preferences.defaultCurrency} onChange={handlePreferenceChange} className={inputClass}>
                    <option value="INR">INR - Indian Rupee</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="AED">AED - UAE Dirham</option>
                    <option value="SGD">SGD - Singapore Dollar</option>
                    <option value="CAD">CAD - Canadian Dollar</option>
                    <option value="AUD">AUD - Australian Dollar</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>
                    <span className="inline-flex items-center gap-1.5">
                      <Globe size={14} />
                      Default Timezone
                    </span>
                  </label>

                  <select name="timezone" value={preferences.timezone} onChange={handlePreferenceChange} className={inputClass}>
                    <option value="Asia/Kolkata">India (Asia/Kolkata)</option>
                    <option value="UTC">UTC</option>
                    <option value="Asia/Dubai">Dubai (Asia/Dubai)</option>
                    <option value="Asia/Singapore">Singapore (Asia/Singapore)</option>
                    <option value="Europe/London">London (Europe/London)</option>
                    <option value="America/New_York">New York (America/New_York)</option>
                    <option value="America/Los_Angeles">Los Angeles (America/Los_Angeles)</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays size={14} />
                      Date Format
                    </span>
                  </label>

                  <select name="dateFormat" value={preferences.dateFormat} onChange={handlePreferenceChange} className={inputClass}>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end border-t border-erp-border pt-4">
                <button
                  type="submit"
                  disabled={preferencesSaving}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-erp-primary px-4 text-xs font-semibold text-white transition hover:bg-erp-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {preferencesSaving ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}

                  {preferencesSaving ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </form>
          </section>
        </>
      )}
    </div>
  )
}
