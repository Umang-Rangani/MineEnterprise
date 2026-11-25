import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Camera, Check, CheckCircle2, Eye, EyeOff, KeyRound, LoaderCircle, Mail, RefreshCw, Save, ShieldCheck, Upload, User, X } from 'lucide-react'

import axiosInstance from '../../api/axiosInstance'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'
import Loading from '../Loading/Loading'
import Toast from '../../Toast/Toast'

const MAX_FILE_SIZE = 4 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const initialPasswordState = {
  otp: '',
  newPassword: '',
  confirmPassword: '',
}

function getProfilePhotoUrl(filePath) {
  if (!filePath) return ''

  if (/^https?:\/\//i.test(filePath)) return filePath

  const baseURL = axiosInstance.defaults.baseURL || 'http://localhost:3000'

  return `${baseURL.replace(/\/$/, '')}/${filePath.replace(/^\//, '')}`
}

export default function CompanyProfileEdit() {
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState(null)

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  })

  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [removePhoto, setRemovePhoto] = useState(false)
  const [photoError, setPhotoError] = useState('')

  const [passwordStep, setPasswordStep] = useState(0)
  const [passwordData, setPasswordData] = useState(initialPasswordState)
  const [otpLoading, setOtpLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [otpMessage, setOtpMessage] = useState('')
  const [otpError, setOtpError] = useState('')
  const [resendSeconds, setResendSeconds] = useState(0)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [toast, setToast] = useState({
    show: false,
    type: 'success',
    message: '',
  })

  const [errors, setErrors] = useState({})

  const currentPhoto = profile?.user?.profilePhoto || ''
  const displayedPhoto = imagePreview || (!removePhoto ? getProfilePhotoUrl(currentPhoto) : '')

  const items = [
    { title: 'My Profile', link: '/company/profile' },
    { title: 'Edit Profile', link: null },
  ]

  useEffect(() => {
    document.title = 'Edit Profile | MineERP'
  }, [])

  const showToast = (message, type = 'success') => {
    setToast({ show: true, type, message })
  }

  async function fetchProfile() {
    try {
      setLoading(true)

      const response = await axiosInstance.get('/erp/profile')
      const data = response.data

      setProfile(data)

      setFormData({
        name: data.user?.name || '',
        phone: data.user?.phone || '',
      })

      setImagePreview('')
      setImageFile(null)
      setRemovePhoto(false)
    } catch (error) {
      showToast(error.response?.data?.message || 'Unable to load profile.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  useEffect(() => {
    if (resendSeconds <= 0) return

    const timer = setTimeout(() => {
      setResendSeconds((previous) => Math.max(0, previous - 1))
    }, 1000)

    return () => clearTimeout(timer)
  }, [resendSeconds])

  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview)
      }
    }
  }, [imagePreview])

  function handleInputChange(event) {
    const { name, value } = event.target

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }))

    setErrors((previous) => ({
      ...previous,
      [name]: '',
    }))
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setPhotoError('Only JPG, PNG and WEBP images are allowed.')
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setPhotoError('Profile photo must be smaller than 4 MB.')
      return
    }

    setPhotoError('')
    setRemovePhoto(false)
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  function handleRemovePhoto() {
    setImageFile(null)
    setImagePreview('')
    setRemovePhoto(true)
    setPhotoError('')

    const input = document.getElementById('profile-photo')

    if (input) input.value = ''
  }

  function validateProfile() {
    const nextErrors = {}

    const name = formData.name.trim()
    const phone = formData.phone.trim()

    if (name.length < 2 || name.length > 100) {
      nextErrors.name = 'Name must be between 2 and 100 characters.'
    }

    if (phone.length > 20) {
      nextErrors.phone = 'Phone number cannot exceed 20 characters.'
    }

    setErrors(nextErrors)

    return Object.keys(nextErrors).length === 0
  }

  async function uploadNewPhoto() {
    if (!imageFile) return null

    const uploadData = new FormData()
    uploadData.append('file', imageFile)

    const response = await axiosInstance.post('/erp/profile/upload-photo', uploadData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })

    return response.data.filePath
  }

  async function deleteOldPhoto(filePath) {
    if (!filePath) return

    try {
      await axiosInstance.delete('/erp/profile/delete-photo', {
        data: { filePath },
      })
    } catch (error) {
      console.error('Old profile photo cleanup failed:', error.message)
    }
  }

  async function handleSaveProfile(event) {
    event.preventDefault()

    if (saving || !validateProfile()) return

    try {
      setSaving(true)

      const oldPhoto = currentPhoto
      let uploadedPhoto = null

      if (imageFile) {
        uploadedPhoto = await uploadNewPhoto()
      }

      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
      }

      if (uploadedPhoto) {
        payload.profilePhoto = uploadedPhoto
      } else if (removePhoto) {
        payload.profilePhoto = ''
      }

      try {
        await axiosInstance.patch('/erp/profile', payload)
      } catch (error) {
        if (uploadedPhoto) {
          await deleteOldPhoto(uploadedPhoto)
        }

        throw error
      }

      if ((uploadedPhoto || removePhoto) && oldPhoto) {
        await deleteOldPhoto(oldPhoto)
      }

      showToast('Profile updated successfully.')
      await fetchProfile()
    } catch (error) {
      showToast(error.response?.data?.message || 'Unable to update profile.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleRequestOtp(isResend = false) {
    try {
      setOtpLoading(true)
      setOtpError('')
      setOtpMessage('')

      const endpoint = isResend ? '/password/resend-otp' : '/password/request-otp'
      const response = await axiosInstance.post(endpoint)

      setOtpMessage(response.data.message || 'OTP sent successfully.')
      setResendSeconds(response.data.resendAfter || 60)

      if (!isResend) {
        setPasswordStep(1)
      }

      showToast(response.data.message || 'OTP sent successfully.')
    } catch (error) {
      const message = error.response?.data?.message || 'Unable to send OTP.'

      setOtpError(message)
      showToast(message, 'error')
    } finally {
      setOtpLoading(false)
    }
  }

  async function handleVerifyOtp() {
    if (!/^\d{6}$/.test(passwordData.otp)) {
      setOtpError('Please enter a valid 6-digit OTP.')
      return
    }

    try {
      setOtpLoading(true)
      setOtpError('')
      setOtpMessage('')

      const response = await axiosInstance.post('/password/verify-otp', {
        otp: passwordData.otp,
      })

      setOtpMessage(response.data.message || 'Email verified successfully.')
      setPasswordStep(2)
      showToast('Email verified successfully.')
    } catch (error) {
      setOtpError(error.response?.data?.message || 'Unable to verify OTP.')
    } finally {
      setOtpLoading(false)
    }
  }

  function handlePasswordChange(event) {
    const { name, value } = event.target

    setPasswordData((previous) => ({
      ...previous,
      [name]: value,
    }))

    setOtpError('')
  }

  async function handleUpdatePassword() {
    if (passwordData.newPassword.length < 8 || passwordData.newPassword.length > 128) {
      setOtpError('Password must be between 8 and 128 characters.')
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setOtpError('New password and confirm password do not match.')
      return
    }

    try {
      setPasswordLoading(true)
      setOtpError('')

      const response = await axiosInstance.post('/password/update-password', {
        newPassword: passwordData.newPassword,
        confirmPassword: passwordData.confirmPassword,
      })

      setPasswordStep(3)
      setPasswordData(initialPasswordState)
      setOtpMessage(response.data.message || 'Password changed successfully.')
      setResendSeconds(0)

      showToast('Password changed successfully.')
    } catch (error) {
      setOtpError(error.response?.data?.message || 'Unable to update password.')
    } finally {
      setPasswordLoading(false)
    }
  }

  function resetPasswordFlow() {
    setPasswordStep(0)
    setPasswordData(initialPasswordState)
    setOtpMessage('')
    setOtpError('')
    setResendSeconds(0)
  }

  const inputClass = (field) =>
    `h-10 w-full rounded-lg border bg-erp-surface px-3 text-xs text-erp-text outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10 disabled:cursor-not-allowed disabled:opacity-60 ${
      errors[field] ? 'border-red-400' : 'border-erp-border'
    }`

  const labelClass = 'block text-xs font-semibold text-erp-text-secondary'

  const errorText = (field) => (errors[field] ? <p className="text-[11px] text-red-600">{errors[field]}</p> : null)

  const passwordSteps = [
    { label: 'Request OTP', description: 'Send verification code' },
    { label: 'Verify OTP', description: 'Confirm your email' },
    { label: 'New Password', description: 'Create a new password' },
  ]

  if (loading) {
    return (
      <div className="min-w-0 space-y-4 text-sm">
        <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="h-1 bg-erp-primary" />

          <div className="flex min-h-16 items-center px-4 sm:px-5">
            <BreadCrumb items={items} />
          </div>
        </section>

        <section className="relative min-h-[420px] overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="flex min-h-[420px] items-center justify-center">
            <Loading fullScreen={false} label="Loading profile..." description="Preparing your profile information..." className="!h-full min-h-[420px]" />
          </div>
        </section>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-w-0 space-y-4 text-sm">
        <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
          <div className="h-1 bg-erp-primary" />
          <div className="flex min-h-16 items-center px-4 sm:px-5">
            <BreadCrumb items={items} />
          </div>
        </section>

        <section className="rounded-xl border border-erp-border bg-erp-surface p-6 text-center shadow-erp-card">
          <p className="text-sm text-erp-text-secondary">Unable to load profile information.</p>

          <button type="button" onClick={fetchProfile} className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-erp-primary px-4 text-xs font-semibold text-white hover:bg-erp-primary-hover">
            <RefreshCw size={14} />
            Try Again
          </button>
        </section>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-4 pb-2 text-sm">
      {/* Header */}
      <section className="h-17 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
        <div className="h-1 bg-erp-primary" />

        <div className="flex h-[calc(100%-4px)] min-w-0 items-center justify-between gap-3 px-4 sm:px-5">
          <div className="min-w-0 flex-1 overflow-hidden">
            <BreadCrumb items={items} />
          </div>

          <button
            type="button"
            onClick={() => navigate('/company/profile')}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-erp-border bg-erp-surface px-3 text-xs font-semibold text-erp-text-secondary transition hover:bg-erp-hover"
          >
            <ArrowLeft size={14} />
            <span>Back</span>
          </button>
        </div>
      </section>

      <form onSubmit={handleSaveProfile} className="space-y-3">
        <div className="grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-3">
          <div className="min-w-0 space-y-3 xl:col-span-2">
            {/* Personal Information */}
            <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
              <div className="flex items-center gap-2 border-b border-erp-border px-3 py-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
                  <User size={16} />
                </div>

                <div>
                  <h2 className="text-sm font-bold text-erp-text">Personal Information</h2>
                  <p className="text-[11px] text-erp-text-secondary">Update your basic profile details.</p>
                </div>
              </div>

              <div className="grid gap-3 p-3 sm:grid-cols-2">
                <div className="min-w-0 space-y-1 sm:col-span-2">
                  <label htmlFor="profile-name" className={labelClass}>
                    Full Name <span className="text-erp-danger">*</span>
                  </label>

                  <input id="profile-name" type="text" autoFocus required maxLength={100} name="name" value={formData.name} onChange={handleInputChange} placeholder="Enter your full name" disabled={saving} className={inputClass('name')} />

                  {errorText('name')}

                  <p className="text-right text-[10px] text-erp-text-muted">{formData.name.length}/100</p>
                </div>

                <div className="min-w-0 space-y-1">
                  <label htmlFor="profile-email" className={labelClass}>
                    Email Address
                  </label>

                  <div className="relative">
                    <Mail size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-erp-text-muted" />

                    <input id="profile-email" type="email" value={profile.user?.email || ''} disabled className={`${inputClass('email')} cursor-not-allowed bg-erp-hover/40 pl-9`} />
                  </div>

                  <p className="text-[10px] text-erp-text-muted">Email address cannot be changed here.</p>
                </div>

                <div className="min-w-0 space-y-1">
                  <label htmlFor="profile-phone" className={labelClass}>
                    Phone Number
                  </label>

                  <input id="profile-phone" type="tel" maxLength={20} name="phone" value={formData.phone} onChange={handleInputChange} placeholder="Enter phone number" disabled={saving} className={inputClass('phone')} />

                  {errorText('phone')}
                </div>
              </div>
            </section>

            {/* Profile Photo */}
            <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
              <div className="flex items-center gap-2 border-b border-erp-border px-3 py-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
                  <Camera size={16} />
                </div>

                <div>
                  <h2 className="text-sm font-bold text-erp-text">Profile Photo</h2>
                  <p className="text-[11px] text-erp-text-secondary">Upload or change your profile picture.</p>
                </div>
              </div>

              <div className="grid gap-4 p-3 sm:grid-cols-2">
                {/* Photo Preview */}
                <div className="flex min-w-0 flex-col items-center justify-center gap-3 rounded-xl border border-erp-border bg-erp-hover/30 p-4">
                  <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-2 border-erp-border bg-erp-surface shadow-sm">
                    {displayedPhoto ? <img src={displayedPhoto} alt="Profile preview" className="h-full w-full object-cover" /> : <User size={48} className="text-erp-text-muted" />}
                  </div>

                  <p className="text-xs font-semibold text-erp-text">{imageFile ? 'New Photo Preview' : 'Profile Picture'}</p>

                  {imageFile && <p className="max-w-full truncate text-[10px] text-erp-text-secondary">{imageFile.name}</p>}
                </div>

                {/* Upload Controls */}
                <div className="flex min-w-0 flex-col justify-center gap-3">
                  <div>
                    <label htmlFor="profile-photo" className={labelClass}>
                      Upload Profile Photo
                    </label>

                    <label
                      htmlFor="profile-photo"
                      className={`mt-2 flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-erp-border bg-erp-hover/30 p-4 text-center transition hover:border-erp-primary hover:bg-erp-primary/5 ${
                        saving ? 'pointer-events-none opacity-60' : ''
                      }`}
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-erp-primary/10 text-erp-primary">
                        <Upload size={21} />
                      </div>

                      <p className="mt-2 text-xs font-semibold text-erp-text">Click to upload photo</p>

                      <p className="mt-1 text-[10px] text-erp-text-secondary">JPG, PNG or WEBP</p>

                      <p className="mt-1 text-[10px] text-erp-text-muted">Maximum file size: 4 MB</p>
                    </label>

                    <input id="profile-photo" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={handleImageChange} disabled={saving} className="hidden" />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {displayedPhoto && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        disabled={saving}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-erp-surface px-3 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        <X size={14} />
                        Remove Photo
                      </button>
                    )}

                    {imageFile && (
                      <button
                        type="button"
                        onClick={() => {
                          setImageFile(null)
                          setImagePreview('')
                          const input = document.getElementById('profile-photo')
                          if (input) input.value = ''
                        }}
                        disabled={saving}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-erp-border bg-erp-surface px-3 text-xs font-semibold text-erp-text-secondary hover:bg-erp-hover disabled:opacity-50"
                      >
                        <X size={14} />
                        Clear Selection
                      </button>
                    )}
                  </div>

                  {photoError && <p className="text-[11px] text-red-600">{photoError}</p>}

                  {imageFile && (
                    <div className="rounded-lg border border-erp-primary/20 bg-erp-primary/5 p-3">
                      <p className="text-xs font-semibold text-erp-text">New photo selected</p>
                      <p className="mt-1 break-all text-[10px] text-erp-text-secondary">
                        {imageFile.name} · {(imageFile.size / 1024).toFixed(1)} KB
                      </p>
                      <p className="mt-1 text-[10px] text-erp-text-muted">Photo will be uploaded when you save changes.</p>
                    </div>
                  )}

                  {removePhoto && <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-[11px] text-amber-800">Your profile photo will be removed after saving changes.</div>}
                </div>
              </div>
            </section>

            {/* Change Password */}
            <section className="overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
              <div className="flex items-center gap-2 border-b border-erp-border px-3 py-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
                  <KeyRound size={16} />
                </div>

                <div>
                  <h2 className="text-sm font-bold text-erp-text">Change Password</h2>
                  <p className="text-[11px] text-erp-text-secondary">Verify your registered email before changing password.</p>
                </div>
              </div>

              <div className="space-y-4 p-3">
                {/* Password Stepper */}
                <div className="grid grid-cols-3 gap-2">
                  {passwordSteps.map((step, index) => {
                    const completed = passwordStep === 3 || index < passwordStep
                    const active = passwordStep === index

                    return (
                      <div key={step.label} className="min-w-0">
                        <div className="mb-2 flex items-center gap-2">
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${completed ? 'bg-emerald-100 text-emerald-700' : active ? 'bg-erp-primary text-white' : 'bg-erp-hover text-erp-text-muted'}`}
                          >
                            {completed ? <Check size={15} /> : index + 1}
                          </div>

                          <div className={`h-1 flex-1 rounded-full ${index < passwordStep ? 'bg-emerald-400' : 'bg-erp-hover'}`} />
                        </div>

                        <p className="truncate text-[11px] font-bold text-erp-text">{step.label}</p>

                        <p className="mt-0.5 hidden text-[10px] text-erp-text-muted sm:block">{step.description}</p>
                      </div>
                    )
                  })}
                </div>

                {/* Step 1: Request OTP */}
                {passwordStep === 0 && (
                  <div className="rounded-xl border border-erp-primary/20 bg-erp-primary/5 p-4">
                    <div className="flex gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-erp-primary/10 text-erp-primary">
                        <ShieldCheck size={20} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="text-xs font-bold text-erp-text">Verify Your Email Address</h3>

                        <p className="mt-1 text-[11px] leading-5 text-erp-text-secondary">A 6-digit verification OTP will be sent to your registered email address.</p>

                        <p className="mt-2 break-all text-xs font-semibold text-erp-text">{profile.user?.email || 'Registered email'}</p>

                        <button
                          type="button"
                          disabled={otpLoading}
                          onClick={() => handleRequestOtp(false)}
                          className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg bg-erp-primary px-4 text-xs font-bold text-white transition hover:bg-erp-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {otpLoading ? <LoaderCircle size={14} className="animate-spin" /> : <Mail size={14} />}
                          Send Verification OTP
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Verify OTP */}
                {passwordStep === 1 && (
                  <div className="space-y-3 rounded-xl border border-erp-border bg-erp-hover/20 p-4">
                    <div>
                      <h3 className="text-xs font-bold text-erp-text">Enter Verification Code</h3>

                      <p className="mt-1 text-[11px] text-erp-text-secondary">Enter the 6-digit OTP sent to {profile.user?.email}.</p>
                    </div>

                    <input
                      type="text"
                      name="otp"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={passwordData.otp}
                      onChange={(event) => {
                        const value = event.target.value.replace(/\D/g, '').slice(0, 6)

                        setPasswordData((previous) => ({
                          ...previous,
                          otp: value,
                        }))

                        setOtpError('')
                      }}
                      placeholder="Enter 6-digit OTP"
                      className="h-12 w-full rounded-lg border border-erp-border bg-erp-surface px-3 text-center text-lg font-bold tracking-[0.5em] text-erp-text outline-none transition focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10"
                    />

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <button type="button" disabled={otpLoading} onClick={handleVerifyOtp} className="inline-flex h-9 items-center gap-2 rounded-lg bg-erp-primary px-4 text-xs font-bold text-white hover:bg-erp-primary-hover disabled:opacity-60">
                        {otpLoading && <LoaderCircle size={14} className="animate-spin" />}
                        Verify OTP
                      </button>

                      <button
                        type="button"
                        disabled={otpLoading || resendSeconds > 0}
                        onClick={() => handleRequestOtp(true)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-erp-primary disabled:cursor-not-allowed disabled:text-erp-text-muted"
                      >
                        <RefreshCw size={13} />
                        {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : 'Resend OTP'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: New Password */}
                {passwordStep === 2 && (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-emerald-800">
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0" />

                      <p className="text-[11px] leading-5">Email verified successfully. You can now create your new password.</p>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="new-password" className={labelClass}>
                        New Password
                      </label>

                      <div className="relative">
                        <input
                          id="new-password"
                          type={showNewPassword ? 'text' : 'password'}
                          name="newPassword"
                          value={passwordData.newPassword}
                          onChange={handlePasswordChange}
                          placeholder="Enter new password"
                          className={`${inputClass('newPassword')} pr-10`}
                        />

                        <button type="button" onClick={() => setShowNewPassword((previous) => !previous)} className="absolute right-3 top-1/2 -translate-y-1/2 text-erp-text-muted hover:text-erp-text">
                          {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="confirm-password" className={labelClass}>
                        Confirm New Password
                      </label>

                      <div className="relative">
                        <input
                          id="confirm-password"
                          type={showConfirmPassword ? 'text' : 'password'}
                          name="confirmPassword"
                          value={passwordData.confirmPassword}
                          onChange={handlePasswordChange}
                          placeholder="Confirm new password"
                          className={`${inputClass('confirmPassword')} pr-10`}
                        />

                        <button type="button" onClick={() => setShowConfirmPassword((previous) => !previous)} className="absolute right-3 top-1/2 -translate-y-1/2 text-erp-text-muted hover:text-erp-text">
                          {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>

                    <p className="text-[10px] text-erp-text-muted">Password must contain between 8 and 128 characters.</p>

                    <button
                      type="button"
                      disabled={passwordLoading}
                      onClick={handleUpdatePassword}
                      className="inline-flex h-9 items-center gap-2 rounded-lg bg-erp-primary px-4 text-xs font-bold text-white transition hover:bg-erp-primary-hover disabled:opacity-60"
                    >
                      {passwordLoading ? <LoaderCircle size={14} className="animate-spin" /> : <KeyRound size={14} />}
                      Update Password
                    </button>
                  </div>
                )}

                {/* Completed */}
                {passwordStep === 3 && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-5 text-center">
                    <CheckCircle2 size={38} className="mx-auto text-emerald-600" />

                    <h3 className="mt-3 text-sm font-bold text-emerald-800">Password Changed Successfully</h3>

                    <p className="mt-1 text-[11px] text-emerald-700">Your account password has been updated.</p>

                    <button type="button" onClick={resetPasswordFlow} className="mt-3 text-xs font-bold text-erp-primary hover:underline">
                      Change Password Again
                    </button>
                  </div>
                )}

                {otpError && (
                  <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[11px] text-red-700">
                    {otpError}
                  </div>
                )}

                {otpMessage && passwordStep !== 3 && !otpError && <p className="text-[10px] text-emerald-700">{otpMessage}</p>}
              </div>
            </section>
          </div>

          {/* Account Summary */}
          <aside className="h-fit min-w-0 overflow-hidden rounded-xl border border-erp-border bg-erp-surface shadow-erp-card">
            <div className="border-b border-erp-border px-3 py-2.5">
              <h2 className="text-sm font-bold text-erp-text">Account Summary</h2>
              <p className="text-[11px] text-erp-text-secondary">Your account information.</p>
            </div>

            <div className="p-4">
              <div className="flex flex-col items-center rounded-xl border border-erp-border bg-erp-hover/20 p-4 text-center">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-erp-border bg-erp-surface">
                  {displayedPhoto ? <img src={displayedPhoto} alt="Profile" className="h-full w-full object-cover" /> : <User size={30} className="text-erp-text-muted" />}
                </div>

                <h3 className="mt-3 text-sm font-bold text-erp-text">{formData.name || profile.user?.name}</h3>

                <p className="mt-1 max-w-full break-all text-[10px] text-erp-text-secondary">{profile.user?.email}</p>

                <span className="mt-3 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-700">{profile.user?.status || 'Active'}</span>
              </div>

              <div className="my-4 border-t border-erp-border" />

              <div className="space-y-3">
                <div>
                  <p className={labelClass}>Account Role</p>
                  <p className="mt-1 text-xs font-semibold text-erp-text">{profile.user?.role || '-'}</p>
                </div>

                <div>
                  <p className={labelClass}>Company</p>
                  <p className="mt-1 break-words text-xs font-semibold text-erp-text">{profile.company?.companyName || '-'}</p>
                </div>

                <div>
                  <p className={labelClass}>Registered Email</p>
                  <p className="mt-1 break-all text-xs font-semibold text-erp-text">{profile.user?.email || '-'}</p>
                </div>

                <div>
                  <p className={labelClass}>Phone Number</p>
                  <p className="mt-1 text-xs font-semibold text-erp-text">{formData.phone || '-'}</p>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-erp-primary/20 bg-erp-primary/5 p-3">
                <div className="flex items-start gap-2">
                  <ShieldCheck size={15} className="mt-0.5 shrink-0 text-erp-primary" />

                  <p className="text-[10px] leading-5 text-erp-text-secondary">Keep your profile information up to date to maintain accurate account details.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* Sticky Footer */}
        <footer className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-erp-border bg-erp-surface/95 p-2.5 shadow-sm backdrop-blur">
          <div className="hidden min-w-0 sm:block">
            <p className="text-xs font-semibold text-erp-text">Update Profile Information</p>

            <p className="mt-0.5 text-[10px] text-erp-text-secondary">Review your changes before saving.</p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/company/profile')}
              disabled={saving}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-erp-border bg-erp-surface px-3 text-xs font-semibold text-erp-text-secondary transition hover:bg-erp-hover disabled:opacity-50"
            >
              <ArrowLeft size={14} />
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-erp-primary px-4 text-xs font-bold text-white transition hover:bg-erp-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}

              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </footer>
      </form>

      {toast.show && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() =>
            setToast((previous) => ({
              ...previous,
              show: false,
            }))
          }
        />
      )}
    </div>
  )
}
