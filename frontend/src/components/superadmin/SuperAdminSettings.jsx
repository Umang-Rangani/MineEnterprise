import { useEffect, useRef, useState } from 'react'
import { UserRound, ShieldCheck, Mail, Phone, Pencil, Save, X, LockKeyhole, Eye, EyeOff, LoaderCircle, AlertCircle, CheckCircle2, RefreshCw, ArrowLeft, ArrowRight, KeyRound, Send, Check, Shield } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Toast from '../../Toast/Toast'
import Loading from '../Loading/Loading'

const inputClass =
  'h-10 w-full rounded-lg border border-erp-border bg-erp-surface px-3 text-sm text-erp-text outline-none transition placeholder:text-erp-muted focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10 disabled:cursor-not-allowed disabled:opacity-60'

const labelClass = 'mb-1.5 block text-xs font-semibold text-erp-text-secondary'

const cardClass = 'overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card'

const breadcrumbItems = [
  {
    title: 'Settings',
    link: null,
  },
]

export default function SuperAdminSettings() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)

  const [activeSection, setActiveSection] = useState('account')
  const [profileMode, setProfileMode] = useState('view')

  const [profileSaving, setProfileSaving] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [otpSending, setOtpSending] = useState(false)
  const [otpVerifying, setOtpVerifying] = useState(false)

  const [apiError, setApiError] = useState('')

  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
  })

  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
  })

  const [securityScreen, setSecurityScreen] = useState('overview')
  const [passwordStep, setPasswordStep] = useState('start')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [resendSeconds, setResendSeconds] = useState(0)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const otpRefs = useRef([])

  const [toast, setToast] = useState(null)

  // Keep Account Information locked while the password-change screen is active.
  const isPasswordFlowLocked = activeSection === 'security' && securityScreen === 'change'

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

  // OTP RESEND COUNTDOWN

  useEffect(() => {
    if (passwordStep !== 'otp' || resendSeconds <= 0) return

    const timer = setTimeout(() => {
      setResendSeconds((previous) => Math.max(previous - 1, 0))
    }, 1000)

    return () => clearTimeout(timer)
  }, [passwordStep, resendSeconds])

  // FETCH PROFILE

  const fetchSettings = async (isRefresh = false) => {
    if (isRefresh && !hasLoaded) return

    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setApiError('')

    try {
      const response = await axiosInstance.get('/superadmin/me')
      const user = response.data?.user

      if (!user) {
        throw new Error('Unable to load SuperAdmin profile.')
      }

      const userProfile = {
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      }

      setProfile(userProfile)

      setProfileForm({
        name: userProfile.name,
        phone: userProfile.phone,
      })

      setHasLoaded(true)
    } catch (error) {
      setApiError(error.response?.data?.message || error.message || 'Unable to load profile information.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  // PROFILE FORM CHANGE

  const handleProfileChange = (event) => {
    const { name, value } = event.target

    setProfileForm((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  // OPEN PROFILE EDIT

  const handleEditProfile = () => {
    setProfileForm({
      name: profile.name,
      phone: profile.phone,
    })

    setProfileMode('edit')
  }

  // CANCEL PROFILE EDIT

  const handleCancelProfileEdit = () => {
    setProfileForm({
      name: profile.name,
      phone: profile.phone,
    })

    setProfileMode('view')
  }

  // SAVE PROFILE

  const handleProfileSubmit = async (event) => {
    event.preventDefault()

    const name = profileForm.name.trim()
    const phone = profileForm.phone.trim()

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

      const updatedProfile = {
        name: updatedUser?.name || name,
        email: updatedUser?.email || profile.email,
        phone: updatedUser?.phone ?? phone,
      }

      setProfile(updatedProfile)

      setProfileForm({
        name: updatedProfile.name,
        phone: updatedProfile.phone,
      })

      setProfileMode('view')

      showToast('success', response.data?.message || 'Profile updated successfully.')
    } catch (error) {
      showToast('error', error.response?.data?.message || 'Unable to update profile.')
    } finally {
      setProfileSaving(false)
    }
  }

  // START OTP FLOW

  const handleSendOtp = async () => {
    if (!profile.email || otpSending) return

    try {
      setOtpSending(true)

      const response = await axiosInstance.post('/password/request-otp')

      setOtp(['', '', '', '', '', ''])
      setPasswordStep('otp')
      setResendSeconds(60)

      showToast('success', response.data?.message || 'Verification OTP sent to your registered email.')

      setTimeout(() => {
        otpRefs.current[0]?.focus()
      }, 100)
    } catch (error) {
      showToast('error', error.response?.data?.message || 'Unable to send verification OTP.')
    } finally {
      setOtpSending(false)
    }
  }

  // RESEND OTP

  const handleResendOtp = async () => {
    if (resendSeconds > 0 || passwordSaving || otpSending) return

    try {
      setPasswordSaving(true)

      const response = await axiosInstance.post('/password/resend-otp')

      setOtp(['', '', '', '', '', ''])
      setResendSeconds(60)

      otpRefs.current[0]?.focus()

      showToast('success', response.data?.message || 'A new verification OTP has been sent.')
    } catch (error) {
      showToast('error', error.response?.data?.message || 'Unable to resend verification OTP.')
    } finally {
      setPasswordSaving(false)
    }
  }

  // OTP INPUT CHANGE

  const handleOtpChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1)

    setOtp((previous) => {
      const updated = [...previous]
      updated[index] = digit
      return updated
    })

    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }
  }

  // OTP KEYBOARD NAVIGATION

  const handleOtpKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }

    if (event.key === 'ArrowRight' && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }
  }

  // OTP PASTE

  const handleOtpPaste = (event) => {
    event.preventDefault()

    const pastedValue = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)

    if (!pastedValue) return

    const updatedOtp = Array.from({ length: 6 }, (_, index) => pastedValue[index] || '')

    setOtp(updatedOtp)

    const nextIndex = Math.min(pastedValue.length, 5)
    otpRefs.current[nextIndex]?.focus()
  }

  // VERIFY OTP

  const handleVerifyOtp = async (event) => {
    event.preventDefault()

    const enteredOtp = otp.join('')

    if (enteredOtp.length !== 6) {
      showToast('error', 'Please enter the complete 6-digit OTP.')
      return
    }

    try {
      setOtpVerifying(true)

      const response = await axiosInstance.post('/password/verify-otp', {
        otp: enteredOtp,
      })

      setPasswordStep('new-password')

      showToast('success', response.data?.message || 'Email verified successfully.')
    } catch (error) {
      showToast('error', error.response?.data?.message || 'Invalid or expired OTP.')
    } finally {
      setOtpVerifying(false)
    }
  }

  // BACK TO PASSWORD START

  const handleBackToPassword = () => {
    setPasswordStep('start')
    setOtp(['', '', '', '', '', ''])
    setResendSeconds(0)
    setNewPassword('')
    setConfirmPassword('')
  }

  // BACK TO OTP

  const handleBackToOtp = () => {
    setPasswordStep('otp')
    setNewPassword('')
    setConfirmPassword('')
  }

  // UPDATE PASSWORD

  const handleUpdatePassword = async (event) => {
    event.preventDefault()

    if (!newPassword || !confirmPassword) {
      showToast('error', 'Both password fields are required.')
      return
    }

    if (newPassword.length < 8 || newPassword.length > 128) {
      showToast('error', 'Password must be between 8 and 128 characters.')
      return
    }

    if (newPassword !== confirmPassword) {
      showToast('error', 'Passwords do not match.')
      return
    }

    try {
      setPasswordSaving(true)

      const response = await axiosInstance.post('/password/update-password', {
        newPassword,
        confirmPassword,
      })

      showToast('success', response.data?.message || 'Password updated successfully.')

      resetPasswordFlow()
    } catch (error) {
      showToast('error', error.response?.data?.message || 'Unable to update password.')
    } finally {
      setPasswordSaving(false)
    }
  }

  // RESET PASSWORD FLOW

  const resetPasswordFlow = () => {
    setSecurityScreen('overview')
    setPasswordStep('start')
    setOtp(['', '', '', '', '', ''])
    setResendSeconds(0)
    setNewPassword('')
    setConfirmPassword('')
    setShowNewPassword(false)
    setShowConfirmPassword(false)
  }

  // INITIAL LOADING

  if (loading && !hasLoaded) {
    return (
      <div className="min-w-0 space-y-4 text-sm">
        <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="h-1 bg-erp-primary" />

          <div className="flex min-h-16 items-center px-4 sm:px-5">
            <BreadCrumb items={breadcrumbItems} />
          </div>
        </section>

        <section className="min-h-[480px] rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex min-h-[480px] items-center justify-center">
            <Loading fullScreen={false} label="Loading settings" description="Please wait while we load your account information." className="!h-full min-h-[480px]" />
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-4 pb-8 text-sm">
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      {/* HEADER */}

      <section className={cardClass}>
        <div className="h-1 bg-erp-primary" />

        <div className="flex h-17 flex-col justify-between gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-5">
          <div>
            <BreadCrumb items={breadcrumbItems} />
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
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
          {/* LEFT SIDEBAR */}

          <aside className="space-y-3">
            {/* ACCOUNT SUMMARY */}

            <div className="rounded-xl border border-erp-border bg-erp-surface p-4 shadow-erp-card">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-erp-primary-light text-lg font-bold text-erp-primary">{profile.name?.charAt(0)?.toUpperCase() || 'S'}</div>

                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-erp-text">{profile.name || 'SuperAdmin'}</p>

                  <p className="mt-1 truncate text-[10px] text-erp-muted">SuperAdmin Account</p>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 border-t border-erp-border pt-3 text-[10px] text-erp-muted">
                <Shield size={13} className="text-emerald-600" />
                Account information
              </div>
            </div>

            <div className="rounded-xl border border-erp-border bg-erp-surface p-3 shadow-erp-card">
              <p className="mb-3 px-2 text-[10px] font-bold uppercase tracking-wider text-erp-muted">Account</p>

              <button
                type="button"
                onClick={() => {
                  if (isPasswordFlowLocked) return
                  setActiveSection('account')
                  setProfileMode('view')
                  resetPasswordFlow()
                }}
                disabled={isPasswordFlowLocked}
                title={isPasswordFlowLocked ? 'Finish or exit the password-change flow to access Account Information.' : 'Open Account Information'}
                aria-disabled={isPasswordFlowLocked}
                className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition ${
                  activeSection === 'account'
                    ? 'border-erp-primary/30 bg-erp-primary-light/50 text-erp-primary'
                    : isPasswordFlowLocked
                      ? 'cursor-not-allowed border-transparent text-erp-muted opacity-50'
                      : 'border-transparent text-erp-text-secondary hover:bg-erp-hover'
                }`}
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${activeSection === 'account' ? 'bg-erp-primary text-white' : 'bg-erp-hover text-erp-muted'}`}>
                  <UserRound size={17} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold">Account Information</p>
                  <p className="mt-0.5 text-[10px] text-erp-muted">Personal details</p>
                </div>

                <ArrowRight size={15} className={activeSection === 'account' ? 'text-erp-primary' : 'text-erp-muted'} />
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveSection('security')
                  setProfileMode('view')
                  resetPasswordFlow()
                }}
                className={`mt-2 flex w-full items-center gap-3 rounded-lg border p-3 text-left transition ${
                  activeSection === 'security' ? 'border-erp-primary/30 bg-erp-primary-light/50 text-erp-primary' : 'border-transparent text-erp-text-secondary hover:bg-erp-hover'
                }`}
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${activeSection === 'security' ? 'bg-erp-primary text-white' : 'bg-erp-hover text-erp-muted'}`}>
                  <ShieldCheck size={17} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold">Password & Security</p>
                  <p className="mt-0.5 text-[10px] text-erp-muted">Password protection</p>
                </div>

                <ArrowRight size={15} className={activeSection === 'security' ? 'text-erp-primary' : 'text-erp-muted'} />
              </button>
            </div>
          </aside>

          {/* RIGHT CONTENT */}

          <main className="min-w-0">
            {activeSection === 'account' && (
              <section className={cardClass}>
                {/* ACCOUNT HEADER */}

                <div className="flex flex-col justify-between gap-3 border-b border-erp-border p-4 sm:flex-row sm:items-center sm:p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-erp-primary-light text-erp-primary">
                      <UserRound size={19} />
                    </div>

                    <div>
                      <h2 className="text-sm font-bold text-erp-text">Account Information</h2>

                      <p className="mt-0.5 text-xs text-erp-muted">Manage your personal account details.</p>
                    </div>
                  </div>

                  {profileMode === 'view' && (
                    <button type="button" onClick={handleEditProfile} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-erp-primary px-3 text-xs font-semibold text-white transition hover:bg-erp-primary/90">
                      <Pencil size={14} />
                      Edit Profile
                    </button>
                  )}
                </div>

                {profileMode === 'view' ? (
                  <div className="space-y-4 p-4 sm:p-5">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="rounded-lg border border-erp-border p-4">
                        <div className="mb-3 flex items-center gap-2 text-erp-muted">
                          <UserRound size={15} />
                          <span className="text-xs font-semibold">Full Name</span>
                        </div>

                        <p className="break-words text-sm font-semibold text-erp-text">{profile.name || 'Not provided'}</p>
                      </div>

                      <div className="rounded-lg border border-erp-border p-4">
                        <div className="mb-3 flex items-center gap-2 text-erp-muted">
                          <Mail size={15} />
                          <span className="text-xs font-semibold">Email Address</span>
                        </div>

                        <p className="break-all text-sm font-semibold text-erp-text">{profile.email || 'Not provided'}</p>

                        <p className="mt-1 text-[10px] text-erp-muted">Registered email address</p>
                      </div>

                      <div className="rounded-lg border border-erp-border p-4">
                        <div className="mb-3 flex items-center gap-2 text-erp-muted">
                          <Phone size={15} />
                          <span className="text-xs font-semibold">Phone Number</span>
                        </div>

                        <p className="break-words text-sm font-semibold text-erp-text">{profile.phone || 'Not provided'}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 rounded-lg border border-erp-border bg-erp-hover/40 p-3">
                      <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" />

                      <p className="text-xs text-erp-text-secondary">Your registered email address is used for account verification and password recovery.</p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleProfileSubmit} className="space-y-5 p-4 sm:p-5">
                    <div>
                      <h3 className="text-sm font-bold text-erp-text">Edit Profile Details</h3>

                      <p className="mt-1 text-xs text-erp-muted">Update your name and contact information.</p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className={labelClass}>Full Name</label>

                        <input type="text" name="name" value={profileForm.name} onChange={handleProfileChange} placeholder="Enter your full name" minLength={2} maxLength={100} required className={inputClass} />
                      </div>

                      <div>
                        <label className={labelClass}>Email Address</label>

                        <div className="relative">
                          <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-erp-muted" />

                          <input type="email" value={profile.email} readOnly className={`${inputClass} cursor-not-allowed pl-9 opacity-70`} />
                        </div>

                        <p className="mt-1 text-[10px] text-erp-muted">Email address cannot be changed.</p>
                      </div>

                      <div>
                        <label className={labelClass}>Phone Number</label>

                        <div className="relative">
                          <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-erp-muted" />

                          <input type="tel" name="phone" value={profileForm.phone} onChange={handleProfileChange} placeholder="Enter phone number" maxLength={20} className={`${inputClass} pl-9`} />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col-reverse gap-2 border-t border-erp-border pt-4 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={handleCancelProfileEdit}
                        disabled={profileSaving}
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-erp-border px-4 text-xs font-semibold text-erp-text-secondary transition hover:bg-erp-hover disabled:opacity-50"
                      >
                        <X size={14} />
                        Cancel
                      </button>

                      <button
                        type="submit"
                        disabled={profileSaving}
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-erp-primary px-4 text-xs font-semibold text-white transition hover:bg-erp-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {profileSaving ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}

                        {profileSaving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                )}
              </section>
            )}

            {/* PASSWORD & SECURITY */}

            {activeSection === 'security' && (
              <section className={cardClass}>
                <div className="flex flex-col justify-between gap-3 border-b border-erp-border p-4 sm:flex-row sm:items-center sm:p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-erp-primary-light text-erp-primary">
                      <ShieldCheck size={19} />
                    </div>

                    <div>
                      <h2 className="text-sm font-bold text-erp-text">{securityScreen === 'overview' ? 'Password & Security' : 'Change Your Password'}</h2>
                      <p className="mt-0.5 text-xs text-erp-muted">{securityScreen === 'overview' ? 'Manage your password and account protection.' : 'Verify your registered email before creating a new password.'}</p>
                    </div>
                  </div>

                  {securityScreen === 'change' && (
                    <button
                      type="button"
                      onClick={() => {
                        resetPasswordFlow()
                      }}
                      disabled={otpSending || otpVerifying || passwordSaving}
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-erp-border px-3 text-xs font-semibold text-erp-text-secondary transition hover:bg-erp-hover disabled:opacity-50"
                    >
                      <ArrowLeft size={14} />
                      Back to Security
                    </button>
                  )}
                </div>

                {securityScreen === 'overview' ? (
                  <div className="p-4 sm:p-5">
                    <div className="rounded-xl border border-erp-border bg-erp-hover/30 p-5 sm:p-6">
                      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-erp-primary-light text-erp-primary">
                          <LockKeyhole size={26} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-bold text-erp-text">Password Protection</h3>
                          <p className="mt-1 max-w-xl text-xs leading-5 text-erp-muted">Keep your MineERP account secure. You can change your password after verifying your registered email address with a one-time verification code.</p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSecurityScreen('change')}
                          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-erp-primary px-4 text-xs font-semibold text-white transition hover:bg-erp-primary/90"
                        >
                          <KeyRound size={15} />
                          Change Your Password
                          <ArrowRight size={15} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 flex items-start gap-2 rounded-lg border border-erp-border p-3">
                      <ShieldCheck size={15} className="mt-0.5 shrink-0 text-erp-primary" />
                      <p className="text-xs leading-5 text-erp-text-secondary">A verification code will be sent to your registered email. You do not need to enter your current password.</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 sm:p-5">
                    {/* PASSWORD PROGRESS */}

                    <div className="grid grid-cols-1 gap-5 md:grid-cols-[180px_minmax(0,1fr)]">
                      <div className="rounded-xl border border-erp-border bg-erp-hover/30 p-4">
                        <p className="mb-5 text-[10px] font-bold uppercase tracking-wider text-erp-muted">Password Recovery</p>

                        <div className="relative space-y-6">
                          {[
                            {
                              key: 'start',
                              label: 'Email OTP',
                              description: 'Send verification code',
                            },
                            {
                              key: 'otp',
                              label: 'Verify OTP',
                              description: 'Confirm your email',
                            },
                            {
                              key: 'new-password',
                              label: 'New Password',
                              description: 'Create new password',
                            },
                          ].map((step, index) => {
                            const steps = ['start', 'otp', 'new-password']
                            const currentIndex = steps.indexOf(passwordStep)
                            const isCompleted = index < currentIndex
                            const isActive = index === currentIndex

                            return (
                              <div key={step.key} className="relative flex items-start gap-3">
                                {index < 2 && <div className={`absolute left-[15px] top-8 h-9 w-0.5 ${isCompleted ? 'bg-erp-primary' : 'bg-erp-border'}`} />}

                                <div
                                  className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition ${
                                    isCompleted ? 'border-erp-primary bg-erp-primary text-white' : isActive ? 'border-erp-primary bg-erp-primary-light text-erp-primary' : 'border-erp-border bg-erp-surface text-erp-muted'
                                  }`}
                                >
                                  {isCompleted ? <Check size={15} /> : index + 1}
                                </div>

                                <div className="min-w-0 pt-0.5">
                                  <p className={`text-xs font-bold ${isActive || isCompleted ? 'text-erp-primary' : 'text-erp-text-secondary'}`}>{step.label}</p>

                                  <p className="mt-1 text-[10px] leading-4 text-erp-muted">{step.description}</p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* RIGHT SIDE */}

                      <div className="min-w-0">
                        {/* STEP 1 - SEND OTP */}

                        {passwordStep === 'start' && (
                          <div className="mx-auto max-w-md py-5 text-center">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-erp-primary-light text-erp-primary">
                              <LockKeyhole size={28} />
                            </div>

                            <h3 className="mt-5 text-base font-bold text-erp-text">Change Your Password</h3>

                            <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-erp-muted">To protect your account, we will send a verification code to your registered email address. Verify your email before creating a new password.</p>

                            <div className="mt-6 rounded-xl border border-erp-border bg-erp-hover/30 p-4 text-left">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-erp-surface text-erp-primary">
                                  <Mail size={18} />
                                </div>

                                <div className="min-w-0 flex-1">
                                  <p className="text-[10px] font-semibold text-erp-muted">REGISTERED EMAIL ADDRESS</p>

                                  <p className="mt-1 break-all text-xs font-bold text-erp-text">{profile.email || 'Email not available'}</p>
                                </div>

                                <ShieldCheck size={18} className="shrink-0 text-emerald-600" />
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={handleSendOtp}
                              disabled={!profile.email || otpSending}
                              className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-erp-primary px-5 text-xs font-semibold text-white transition hover:bg-erp-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {otpSending ? <LoaderCircle size={15} className="animate-spin" /> : <Send size={15} />}

                              {otpSending ? 'Sending OTP...' : 'Send Verification Code'}
                            </button>

                            <p className="mt-3 text-[10px] text-erp-muted">You do not need your current password to continue.</p>
                          </div>
                        )}

                        {/* STEP 2 - OTP VERIFICATION */}

                        {passwordStep === 'otp' && (
                          <form onSubmit={handleVerifyOtp} className="mx-auto max-w-md py-4">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-erp-primary-light text-erp-primary">
                              <Mail size={28} />
                            </div>

                            <div className="mt-5 text-center">
                              <h3 className="text-base font-bold text-erp-text">Verify Your Email</h3>

                              <p className="mt-2 text-xs leading-5 text-erp-muted">Enter the 6-digit verification code sent to your registered email address.</p>

                              <p className="mt-1 break-all text-xs font-bold text-erp-primary">{profile.email}</p>
                            </div>

                            {/* SIX SQUARE OTP INPUTS */}

                            <div className="mt-7 flex justify-center gap-2 sm:gap-3">
                              {otp.map((digit, index) => (
                                <input
                                  key={index}
                                  ref={(element) => {
                                    otpRefs.current[index] = element
                                  }}
                                  type="text"
                                  inputMode="numeric"
                                  autoComplete={index === 0 ? 'one-time-code' : 'off'}
                                  value={digit}
                                  maxLength={1}
                                  onChange={(event) => handleOtpChange(index, event.target.value)}
                                  onKeyDown={(event) => handleOtpKeyDown(index, event)}
                                  onPaste={index === 0 ? handleOtpPaste : undefined}
                                  disabled={otpVerifying}
                                  aria-label={`OTP digit ${index + 1}`}
                                  className="h-11 w-10 rounded-lg border border-erp-border bg-erp-surface text-center text-lg font-bold text-erp-text outline-none transition focus:border-erp-primary focus:bg-erp-primary-light/30 focus:ring-2 focus:ring-erp-primary/10 disabled:opacity-60 sm:h-12 sm:w-12"
                                />
                              ))}
                            </div>

                            <div className="mt-5 text-center">
                              {resendSeconds > 0 ? (
                                <p className="text-xs text-erp-muted">
                                  Didn't receive the code? Resend in{' '}
                                  <span className="font-bold tabular-nums text-erp-primary">
                                    00:
                                    {String(resendSeconds).padStart(2, '0')}
                                  </span>
                                </p>
                              ) : (
                                <button type="button" onClick={handleResendOtp} disabled={passwordSaving || otpSending} className="inline-flex items-center gap-1.5 text-xs font-semibold text-erp-primary hover:underline disabled:opacity-50">
                                  {passwordSaving ? <LoaderCircle size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                                  Resend Verification Code
                                </button>
                              )}
                            </div>

                            <div className="mt-7 space-y-2">
                              <button
                                type="submit"
                                disabled={otp.join('').length !== 6 || otpVerifying}
                                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-erp-primary px-5 text-xs font-semibold text-white transition hover:bg-erp-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {otpVerifying ? (
                                  <>
                                    <LoaderCircle size={15} className="animate-spin" />
                                    Verifying...
                                  </>
                                ) : (
                                  <>
                                    Verify OTP
                                    <ArrowRight size={15} />
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={handleBackToPassword}
                                disabled={otpVerifying || otpSending || passwordSaving}
                                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-erp-border px-5 text-xs font-semibold text-erp-text-secondary transition hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <ArrowLeft size={14} />
                                Back to Send Verification Code
                              </button>
                            </div>

                            <p className="mt-4 text-center text-[10px] text-erp-muted">Never share your verification code with anyone.</p>
                          </form>
                        )}

                        {/* STEP 3 - NEW PASSWORD */}

                        {passwordStep === 'new-password' && (
                          <form onSubmit={handleUpdatePassword} className="mx-auto max-w-md py-4">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-erp-primary-light text-erp-primary">
                              <KeyRound size={28} />
                            </div>

                            <div className="mt-5 text-center">
                              <h3 className="text-base font-bold text-erp-text">Create New Password</h3>

                              <p className="mt-2 text-xs leading-5 text-erp-muted">Set a strong password for your MineERP account.</p>
                            </div>

                            <div className="mt-7 space-y-4">
                              <div>
                                <label className={labelClass}>New Password</label>

                                <div className="relative">
                                  <input
                                    type={showNewPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(event) => setNewPassword(event.target.value)}
                                    placeholder="Enter new password"
                                    autoComplete="new-password"
                                    minLength={8}
                                    maxLength={128}
                                    required
                                    disabled={passwordSaving}
                                    className={`${inputClass} pr-10`}
                                  />

                                  <button
                                    type="button"
                                    onClick={() => setShowNewPassword((previous) => !previous)}
                                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-erp-muted hover:text-erp-text"
                                  >
                                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                  </button>
                                </div>
                              </div>

                              <div>
                                <label className={labelClass}>Confirm New Password</label>

                                <div className="relative">
                                  <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(event) => setConfirmPassword(event.target.value)}
                                    placeholder="Confirm new password"
                                    autoComplete="new-password"
                                    minLength={8}
                                    maxLength={128}
                                    required
                                    disabled={passwordSaving}
                                    className={`${inputClass} pr-10`}
                                  />

                                  <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword((previous) => !previous)}
                                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-erp-muted hover:text-erp-text"
                                  >
                                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                  </button>
                                </div>
                              </div>

                              <div className="flex items-start gap-2 rounded-lg border border-erp-border bg-erp-hover/40 p-3">
                                <ShieldCheck size={15} className="mt-0.5 shrink-0 text-erp-primary" />

                                <p className="text-[11px] leading-5 text-erp-text-secondary">Your password must contain at least 8 characters. Choose a password that is difficult to guess.</p>
                              </div>

                              <button
                                type="submit"
                                disabled={passwordSaving}
                                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-erp-primary px-5 text-xs font-semibold text-white transition hover:bg-erp-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {passwordSaving ? <LoaderCircle size={15} className="animate-spin" /> : <LockKeyhole size={15} />}

                                {passwordSaving ? 'Updating Password...' : 'Update Password'}
                              </button>

                              <button
                                type="button"
                                onClick={handleBackToOtp}
                                disabled={passwordSaving}
                                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-erp-border px-5 text-xs font-semibold text-erp-text-secondary transition hover:bg-erp-hover disabled:opacity-50"
                              >
                                <ArrowLeft size={14} />
                                Back to OTP
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </section>
            )}
          </main>
        </div>
      )}
    </div>
  )
}
