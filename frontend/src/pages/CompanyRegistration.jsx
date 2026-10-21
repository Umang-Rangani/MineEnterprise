import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, Eye, EyeOff, Layers3, LockKeyhole, Mail, MapPin, ShieldCheck, UserRound, LoaderCircle, ReceiptText, Globe2 } from 'lucide-react'
import axiosInstance from '../api/axiosInstance'

const initialForm = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  phone: '',
  companyName: '',
  businessType: '',
  companyEmail: '',
  companyPhone: '',
  website: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  country: 'India',
  postalCode: '',
  gstNumber: '',
  panNumber: '',
  currency: 'INR',
  businessCategory: '',
}

const inputClass = 'h-9 w-full min-w-0 rounded-lg border border-erp-border bg-erp-surface px-3 text-xs text-erp-text outline-none transition placeholder:text-erp-text-muted focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10'

const labelClass = 'mb-1 block text-[11px] font-semibold text-erp-text'

export default function CompanyRegistration() {
  const [form, setForm] = useState(initialForm)
  const [step, setStep] = useState(1)
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleChange = (event) => {
    const { name, value } = event.target

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }))

    setErrors((previous) => ({
      ...previous,
      [name]: '',
    }))

    setError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    const nextErrors = {}
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (step === 1) {
      if (!form.name.trim()) {
        nextErrors.name = 'Owner name is required.'
      }

      if (!form.email.trim()) {
        nextErrors.email = 'Owner email is required.'
      } else if (!emailPattern.test(form.email.trim())) {
        nextErrors.email = 'Enter a valid email.'
      }

      if (!form.password) {
        nextErrors.password = 'Password is required.'
      } else if (form.password.length < 8) {
        nextErrors.password = 'Use at least 8 characters.'
      }

      if (!form.confirmPassword) {
        nextErrors.confirmPassword = 'Confirm your password.'
      } else if (form.confirmPassword !== form.password) {
        nextErrors.confirmPassword = 'Passwords do not match.'
      }
    }

    if (step === 2) {
      if (!form.companyName.trim()) {
        nextErrors.companyName = 'Company name is required.'
      }

      if (!form.businessType) {
        nextErrors.businessType = 'Select a business type.'
      }

      if (!form.businessCategory.trim()) {
        nextErrors.businessCategory = 'Category is required.'
      }

      if (!form.companyEmail.trim()) {
        nextErrors.companyEmail = 'Company email is required.'
      } else if (!emailPattern.test(form.companyEmail.trim())) {
        nextErrors.companyEmail = 'Enter a valid email.'
      }

      if (!form.companyPhone.trim()) {
        nextErrors.companyPhone = 'Company phone is required.'
      }

      if (form.website.trim() && !/^https?:\/\/.+\..+/i.test(form.website.trim())) {
        nextErrors.website = 'Enter a valid website URL.'
      }
    }

    if (step === 3) {
      if (!form.addressLine1.trim()) {
        nextErrors.addressLine1 = 'Address is required.'
      }

      if (!form.city.trim()) {
        nextErrors.city = 'City is required.'
      }

      if (!form.state.trim()) {
        nextErrors.state = 'State is required.'
      }

      if (!form.country.trim()) {
        nextErrors.country = 'Country is required.'
      }

      if (!form.postalCode.trim()) {
        nextErrors.postalCode = 'Postal code is required.'
      }
    }

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    if (step < 3) {
      setStep((previous) => previous + 1)
      return
    }

    setSubmitting(true)

    try {
      const { confirmPassword, ...registrationData } = form

      const response = await axiosInstance.post('/companies/register', {
        ...registrationData,
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        phone: form.phone.trim(),
        companyName: form.companyName.trim(),
        businessType: form.businessType,
        businessCategory: form.businessCategory.trim(),
        companyEmail: form.companyEmail.trim().toLowerCase(),
        companyPhone: form.companyPhone.trim(),
        website: form.website.trim(),
        addressLine1: form.addressLine1.trim(),
        addressLine2: form.addressLine2.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        country: form.country.trim(),
        postalCode: form.postalCode.trim(),
        gstNumber: form.gstNumber.trim(),
        panNumber: form.panNumber.trim(),
        currency: form.currency,
      })

      setSuccess(response.data?.message || 'Registration submitted successfully. Your company is awaiting SuperAdmin approval.')
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to submit registration. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const goBack = () => {
    setStep((previous) => Math.max(previous - 1, 1))
    setErrors({})
    setError('')
  }

  return (
    <main className="flex h-dvh w-full overflow-hidden bg-erp-bg text-erp-text">
      <section className="relative hidden h-dvh w-1/3 shrink-0 flex-col justify-between overflow-hidden bg-erp-sidebar-bg px-8 py-6 text-erp-text-inverse lg:flex xl:px-12 xl:py-8">
        <div className="pointer-events-none absolute -right-28 -top-28 h-80 w-80 rounded-full border border-erp-text-inverse/10" />
        <div className="pointer-events-none absolute -bottom-28 -left-20 h-80 w-80 rounded-full border border-erp-text-inverse/10" />
        <div className="pointer-events-none absolute bottom-24 right-12 h-40 w-40 rounded-full bg-erp-accent/20 blur-3xl" />

        <Link to="/" className="relative flex shrink-0 items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-erp-text-inverse/10 ring-1 ring-erp-text-inverse/15">
            <Layers3 size={23} />
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight">MineERP</p>
            <p className="text-[10px] tracking-[0.18em] text-erp-sidebar-text-muted">ENTERPRISE RESOURCE PLANNING</p>
          </div>
        </Link>

        <div className="relative max-w-lg">
          <span className="inline-flex items-center gap-2 rounded-full border border-erp-text-inverse/15 bg-erp-text-inverse/5 px-3 py-1.5 text-[11px] font-medium text-erp-sidebar-text">
            <Building2 size={14} />
            Your business starts here
          </span>

          <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">
            Build your business
            <span className="mt-1 block text-erp-accent">on one platform.</span>
          </h1>

          <p className="mt-4 max-w-sm text-sm leading-6 text-erp-sidebar-text-muted">Bring your business information together and prepare your team for a more organized way to work.</p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-erp-sidebar-border bg-erp-text-inverse/5 p-3.5">
              <Building2 size={19} className="text-erp-accent" />
              <p className="mt-2.5 text-sm font-semibold">Business workspace</p>
              <p className="mt-1 text-xs text-erp-sidebar-text-muted">Operations in one place</p>
            </div>

            <div className="rounded-xl border border-erp-sidebar-border bg-erp-text-inverse/5 p-3.5">
              <ShieldCheck size={19} className="text-erp-accent" />
              <p className="mt-2.5 text-sm font-semibold">Approval process</p>
              <p className="mt-1 text-xs text-erp-sidebar-text-muted">Reviewed before access</p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-xl border border-erp-sidebar-border bg-erp-text-inverse/5 p-3.5">
            <CheckCircle2 size={20} className="shrink-0 text-erp-accent" />
            <p className="text-xs leading-5 text-erp-sidebar-text-muted">Submit your details once. The SuperAdmin reviews your company registration before account access is enabled.</p>
          </div>
        </div>

        <p className="relative shrink-0 text-[11px] text-erp-sidebar-text-muted">© {new Date().getFullYear()} MineERP. All rights reserved.</p>
      </section>

      <section className="flex h-dvh min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden p-3 sm:p-4 lg:p-5">
        <div className="flex h-full min-h-0 w-full max-w-275 flex-col overflow-hidden">
          <Link to="/" className="mb-3 flex shrink-0 items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-erp-sidebar-bg text-erp-text-inverse">
              <Layers3 size={20} />
            </div>
            <div>
              <p className="text-base font-bold text-erp-primary">MineERP</p>
              <p className="text-[9px] tracking-[0.14em] text-erp-text-secondary">BUSINESS MANAGEMENT</p>
            </div>
          </Link>

          {success ? (
            <div className="my-auto max-h-full overflow-y-auto rounded-2xl border border-erp-border bg-erp-surface p-6 text-center shadow-(--erp-shadow) sm:p-8">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 size={26} />
              </div>

              <h2 className="mt-4 text-xl font-bold text-erp-text">Registration Submitted</h2>
              <p className="mt-3 text-sm leading-6 text-erp-text-secondary">{success}</p>

              <div className="mt-5 rounded-xl bg-erp-surface-secondary p-4 text-left">
                <p className="text-xs font-semibold text-erp-text">What happens next?</p>
                <p className="mt-1.5 text-xs leading-5 text-erp-text-secondary">Your company is pending SuperAdmin approval. You can sign in after the approval process is complete and your company account is enabled.</p>
              </div>

              <Link to="/login" className="mt-6 flex h-11 items-center justify-center gap-2 rounded-lg bg-erp-primary px-4 text-xs font-semibold text-erp-text-inverse transition hover:bg-erp-primary-hover">
                Back to Login <ArrowRight size={15} />
              </Link>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-erp-border bg-erp-surface p-4 shadow-(--erp-shadow) sm:p-5 lg:p-5">
              <div className="mb-3 flex shrink-0 flex-col gap-3 border-b border-erp-border pb-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">{step === 1 ? <UserRound size={19} /> : step === 2 ? <Building2 size={19} /> : <MapPin size={19} />}</div>

                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-erp-text-secondary">Business registration</p>
                    <h2 className="mt-0.5 text-lg font-bold tracking-tight text-erp-text sm:text-xl">{step === 1 ? 'Create your account' : step === 2 ? 'Register your company' : 'Complete your details'}</h2>
                    <p className="mt-0.5 text-[11px] leading-4 text-erp-text-secondary">
                      {step === 1 ? 'Enter the details of the person managing this business.' : step === 2 ? 'Tell us about your company and business activities.' : 'Add your business address and financial information.'}
                    </p>
                  </div>
                </div>

                <div className="w-full shrink-0 sm:w-62 lg:w-140">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold text-erp-primary">STEP {step} OF 3</span>
                    <span className="text-[10px] text-erp-text-secondary">{step === 1 ? 'Owner Details' : step === 2 ? 'Company Details' : 'Address & Tax'}</span>
                  </div>

                  <div className="h-1.5 overflow-hidden rounded-full bg-erp-surface-secondary">
                    <div className="h-full rounded-full bg-erp-primary transition-all duration-300" style={{ width: `${(step / 3) * 100}%` }} />
                  </div>

                  <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                    {[
                      { number: 1, label: 'Owner' },
                      { number: 2, label: 'Company' },
                      { number: 3, label: 'Address' },
                    ].map((item) => (
                      <div
                        key={item.number}
                        className={`rounded-md border px-1.5 py-1 text-center ${
                          step === item.number ? 'border-erp-primary bg-erp-primary-light text-erp-primary' : step > item.number ? 'border-erp-primary/30 bg-erp-surface-secondary text-erp-text' : 'border-erp-border bg-erp-bg text-erp-text-muted'
                        }`}
                      >
                        <span className="text-[9px] font-semibold">
                          {step > item.number && <CheckCircle2 size={10} className="mr-0.5 inline-block" />}
                          {step > item.number ? '' : `${item.number}. `}
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {error && (
                <div role="alert" className="mb-3 shrink-0 rounded-lg border border-erp-danger/20 bg-erp-danger/10 px-3 py-2 text-xs text-erp-danger">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 scrollbar-none [&::-webkit-scrollbar]:hidden">
                  {step === 1 && (
                    <div>
                      <div className="mb-3 flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-erp-primary-light text-erp-primary">
                          <UserRound size={17} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-erp-text">Owner Details</h3>
                          <p className="mt-0.5 text-[10px] text-erp-text-secondary">Who will manage this business account?</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="min-w-0">
                          <label htmlFor="name" className={labelClass}>
                            Full name <span className="text-erp-danger">*</span>
                          </label>
                          <input id="name" name="name" value={form.name} onChange={handleChange} required placeholder="Your full name" autoComplete="name" className={`${inputClass} ${errors.name ? 'border-erp-danger' : ''}`} />
                          {errors.name && <p className="mt-1 text-[10px] text-erp-danger">{errors.name}</p>}
                        </div>

                        <div className="min-w-0">
                          <label htmlFor="email" className={labelClass}>
                            Owner email <span className="text-erp-danger">*</span>
                          </label>
                          <div className="relative">
                            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-erp-text-muted" />
                            <input
                              id="email"
                              name="email"
                              type="email"
                              value={form.email}
                              onChange={handleChange}
                              required
                              placeholder="you@company.com"
                              autoComplete="email"
                              className={`${inputClass} pl-9 ${errors.email ? 'border-erp-danger' : ''}`}
                            />
                          </div>
                          {errors.email && <p className="mt-1 text-[10px] text-erp-danger">{errors.email}</p>}
                        </div>

                        <div className="min-w-0">
                          <label htmlFor="phone" className={labelClass}>
                            Personal phone
                          </label>
                          <input id="phone" name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="Phone number (optional)" autoComplete="tel" className={inputClass} />
                        </div>

                        <div className="min-w-0">
                          <label htmlFor="password" className={labelClass}>
                            Password <span className="text-erp-danger">*</span>
                          </label>
                          <div className="flex h-9 items-center gap-2 rounded-lg border border-erp-border bg-erp-surface px-3 focus-within:border-erp-primary focus-within:ring-2 focus-within:ring-erp-primary/10">
                            <LockKeyhole size={15} className="shrink-0 text-erp-text-muted" />
                            <input
                              id="password"
                              name="password"
                              type={showPassword ? 'text' : 'password'}
                              value={form.password}
                              onChange={handleChange}
                              required
                              minLength={8}
                              placeholder="Minimum 8 characters"
                              autoComplete="new-password"
                              className="h-full min-w-0 flex-1 bg-transparent text-xs text-erp-text outline-none placeholder:text-erp-text-muted"
                            />
                            <button type="button" onClick={() => setShowPassword((previous) => !previous)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="shrink-0 text-erp-text-secondary hover:text-erp-primary">
                              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                          </div>
                          {errors.password && <p className="mt-1 text-[10px] text-erp-danger">{errors.password}</p>}
                        </div>

                        <div className="min-w-0 sm:col-span-2">
                          <label htmlFor="confirmPassword" className={labelClass}>
                            Confirm password <span className="text-erp-danger">*</span>
                          </label>
                          <div className="flex h-9 items-center gap-2 rounded-lg border border-erp-border bg-erp-surface px-3 focus-within:border-erp-primary focus-within:ring-2 focus-within:ring-erp-primary/10">
                            <LockKeyhole size={15} className="shrink-0 text-erp-text-muted" />
                            <input
                              id="confirmPassword"
                              name="confirmPassword"
                              type={showConfirmPassword ? 'text' : 'password'}
                              value={form.confirmPassword}
                              onChange={handleChange}
                              required
                              autoComplete="new-password"
                              placeholder="Re-enter your password"
                              className="h-full min-w-0 flex-1 bg-transparent text-xs text-erp-text outline-none placeholder:text-erp-text-muted"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword((previous) => !previous)}
                              aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                              className="shrink-0 text-erp-text-secondary hover:text-erp-primary"
                            >
                              {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                          </div>
                          {errors.confirmPassword && <p className="mt-1 text-[10px] text-erp-danger">{errors.confirmPassword}</p>}
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div>
                      <div className="mb-3 flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-erp-primary-light text-erp-primary">
                          <Building2 size={17} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-erp-text">Company Details</h3>
                          <p className="mt-0.5 text-[10px] text-erp-text-secondary">Basic information about your business.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="min-w-0">
                          <label htmlFor="companyName" className={labelClass}>
                            Company name <span className="text-erp-danger">*</span>
                          </label>
                          <div className="relative">
                            <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-erp-text-muted" />
                            <input
                              id="companyName"
                              name="companyName"
                              value={form.companyName}
                              onChange={handleChange}
                              required
                              placeholder="Registered business name"
                              className={`${inputClass} pl-9 ${errors.companyName ? 'border-erp-danger' : ''}`}
                            />
                          </div>
                          {errors.companyName && <p className="mt-1 text-[10px] text-erp-danger">{errors.companyName}</p>}
                        </div>

                        <div className="min-w-0">
                          <label htmlFor="businessType" className={labelClass}>
                            Business type <span className="text-erp-danger">*</span>
                          </label>
                          <select id="businessType" name="businessType" value={form.businessType} onChange={handleChange} required className={`${inputClass} ${errors.businessType ? 'border-erp-danger' : ''}`}>
                            <option value="">Select business type</option>
                            <option value="Manufacturer">Manufacturer</option>
                            <option value="Wholesaler">Wholesaler</option>
                            <option value="Retailer">Retailer</option>
                            <option value="Distributor">Distributor</option>
                            <option value="Other">Other</option>
                          </select>
                          {errors.businessType && <p className="mt-1 text-[10px] text-erp-danger">{errors.businessType}</p>}
                        </div>

                        <div className="min-w-0">
                          <label htmlFor="businessCategory" className={labelClass}>
                            Business category <span className="text-erp-danger">*</span>
                          </label>
                          <input
                            id="businessCategory"
                            name="businessCategory"
                            value={form.businessCategory}
                            onChange={handleChange}
                            required
                            placeholder="e.g. Electronics"
                            className={`${inputClass} ${errors.businessCategory ? 'border-erp-danger' : ''}`}
                          />
                          {errors.businessCategory && <p className="mt-1 text-[10px] text-erp-danger">{errors.businessCategory}</p>}
                        </div>

                        <div className="min-w-0">
                          <label htmlFor="companyEmail" className={labelClass}>
                            Company email <span className="text-erp-danger">*</span>
                          </label>
                          <div className="relative">
                            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-erp-text-muted" />
                            <input
                              id="companyEmail"
                              name="companyEmail"
                              type="email"
                              value={form.companyEmail}
                              onChange={handleChange}
                              required
                              placeholder="business@company.com"
                              className={`${inputClass} pl-9 ${errors.companyEmail ? 'border-erp-danger' : ''}`}
                            />
                          </div>
                          {errors.companyEmail && <p className="mt-1 text-[10px] text-erp-danger">{errors.companyEmail}</p>}
                        </div>

                        <div className="min-w-0">
                          <label htmlFor="companyPhone" className={labelClass}>
                            Company phone <span className="text-erp-danger">*</span>
                          </label>
                          <input
                            id="companyPhone"
                            name="companyPhone"
                            type="tel"
                            value={form.companyPhone}
                            onChange={handleChange}
                            required
                            placeholder="Business contact number"
                            className={`${inputClass} ${errors.companyPhone ? 'border-erp-danger' : ''}`}
                          />
                          {errors.companyPhone && <p className="mt-1 text-[10px] text-erp-danger">{errors.companyPhone}</p>}
                        </div>

                        <div className="min-w-0">
                          <label htmlFor="website" className={labelClass}>
                            Website
                          </label>
                          <div className="relative">
                            <Globe2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-erp-text-muted" />
                            <input id="website" name="website" type="url" value={form.website} onChange={handleChange} placeholder="https://example.com" className={`${inputClass} pl-9 ${errors.website ? 'border-erp-danger' : ''}`} />
                          </div>
                          {errors.website && <p className="mt-1 text-[10px] text-erp-danger">{errors.website}</p>}
                        </div>
                      </div>

                      <div className="border-t border-erp-border pt-2.5">
                        <div className="mb-2.5 flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-erp-primary-light text-erp-primary">
                            <ReceiptText size={17} />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-erp-text">Tax & Financial Details</h3>
                            <p className="mt-0.5 text-[10px] text-erp-text-secondary">Optional business registration and currency details.</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-x-3 gap-y-2.5 sm:grid-cols-2 xl:grid-cols-3">
                          <div className="min-w-0">
                            <label htmlFor="gstNumber" className={labelClass}>
                              GST number
                            </label>
                            <input id="gstNumber" name="gstNumber" value={form.gstNumber} onChange={handleChange} placeholder="GSTIN (optional)" className={inputClass} />
                          </div>

                          <div className="min-w-0">
                            <label htmlFor="panNumber" className={labelClass}>
                              PAN number
                            </label>
                            <input id="panNumber" name="panNumber" value={form.panNumber} onChange={handleChange} placeholder="PAN (optional)" className={inputClass} />
                          </div>

                          <div className="min-w-0">
                            <label htmlFor="currency" className={labelClass}>
                              Currency <span className="text-erp-danger">*</span>
                            </label>
                            <select id="currency" name="currency" value={form.currency} onChange={handleChange} required className={inputClass}>
                              <option value="INR">INR — Indian Rupee</option>
                              <option value="USD">USD — US Dollar</option>
                              <option value="GBP">GBP — British Pound</option>
                              <option value="EUR">EUR — Euro</option>
                              <option value="AED">AED — UAE Dirham</option>
                              <option value="CAD">CAD — Canadian Dollar</option>
                              <option value="AUD">AUD — Australian Dollar</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-3">
                      <div>
                        <div className="mb-2.5 flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-erp-primary-light text-erp-primary">
                            <MapPin size={17} />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-erp-text">Business Address</h3>
                            <p className="mt-0.5 text-[10px] text-erp-text-secondary">Where is your business located?</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-x-3 gap-y-2.5 sm:grid-cols-2 xl:grid-cols-3">
                          <div className="min-w-0 sm:col-span-2 xl:col-span-3">
                            <label htmlFor="addressLine1" className={labelClass}>
                              Address line 1 <span className="text-erp-danger">*</span>
                            </label>
                            <input
                              id="addressLine1"
                              name="addressLine1"
                              value={form.addressLine1}
                              onChange={handleChange}
                              required
                              placeholder="Building, street and area"
                              className={`${inputClass} ${errors.addressLine1 ? 'border-erp-danger' : ''}`}
                            />
                            {errors.addressLine1 && <p className="mt-1 text-[10px] text-erp-danger">{errors.addressLine1}</p>}
                          </div>

                          <div className="min-w-0 sm:col-span-2 xl:col-span-3">
                            <label htmlFor="addressLine2" className={labelClass}>
                              Address line 2
                            </label>
                            <input id="addressLine2" name="addressLine2" value={form.addressLine2} onChange={handleChange} placeholder="Landmark, floor or suite (optional)" className={inputClass} />
                          </div>

                          <div className="min-w-0">
                            <label htmlFor="city" className={labelClass}>
                              City <span className="text-erp-danger">*</span>
                            </label>
                            <input id="city" name="city" value={form.city} onChange={handleChange} required placeholder="City" className={`${inputClass} ${errors.city ? 'border-erp-danger' : ''}`} />
                            {errors.city && <p className="mt-1 text-[10px] text-erp-danger">{errors.city}</p>}
                          </div>

                          <div className="min-w-0">
                            <label htmlFor="state" className={labelClass}>
                              State <span className="text-erp-danger">*</span>
                            </label>
                            <input id="state" name="state" value={form.state} onChange={handleChange} required placeholder="State" className={`${inputClass} ${errors.state ? 'border-erp-danger' : ''}`} />
                            {errors.state && <p className="mt-1 text-[10px] text-erp-danger">{errors.state}</p>}
                          </div>

                          <div className="min-w-0">
                            <label htmlFor="country" className={labelClass}>
                              Country <span className="text-erp-danger">*</span>
                            </label>
                            <input id="country" name="country" value={form.country} onChange={handleChange} required placeholder="Country" className={`${inputClass} ${errors.country ? 'border-erp-danger' : ''}`} />
                            {errors.country && <p className="mt-1 text-[10px] text-erp-danger">{errors.country}</p>}
                          </div>

                          <div className="min-w-0">
                            <label htmlFor="postalCode" className={labelClass}>
                              Postal code <span className="text-erp-danger">*</span>
                            </label>
                            <input id="postalCode" name="postalCode" value={form.postalCode} onChange={handleChange} required placeholder="PIN / ZIP code" className={`${inputClass} ${errors.postalCode ? 'border-erp-danger' : ''}`} />
                            {errors.postalCode && <p className="mt-1 text-[10px] text-erp-danger">{errors.postalCode}</p>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 rounded-lg bg-erp-surface-secondary p-2.5">
                        <ShieldCheck size={14} className="mt-0.5 shrink-0 text-erp-primary" />
                        <p className="text-[10px] leading-4 text-erp-text-secondary">Your company registration will remain pending until it is reviewed by the Super Admin.</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex shrink-0 items-center gap-3 border-t border-erp-border pt-3">
                  {step === 1 ? (
                    <Link to="/login" className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-erp-border bg-erp-surface px-3 text-xs font-semibold text-erp-text transition hover:bg-erp-surface-secondary">
                      <ArrowLeft size={15} />
                      Sign in
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={goBack}
                      disabled={submitting}
                      className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-erp-border bg-erp-surface px-3 text-xs font-semibold text-erp-text transition hover:bg-erp-surface-secondary disabled:opacity-60"
                    >
                      <ArrowLeft size={15} />
                      Back
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-erp-primary px-3 text-xs font-semibold text-erp-text-inverse transition hover:bg-erp-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <LoaderCircle size={15} className="animate-spin" />
                        Submitting...
                      </>
                    ) : step < 3 ? (
                      <>
                        Continue <ArrowRight size={15} />
                      </>
                    ) : (
                      <>
                        Submit registration <ArrowRight size={15} />
                      </>
                    )}
                  </button>
                </div>
              </form>

              <p className="mt-2 shrink-0 text-center text-[10px] text-erp-text-muted">Secure registration · Company approval required</p>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
