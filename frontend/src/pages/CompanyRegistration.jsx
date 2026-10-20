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

const inputClass = 'h-10 w-full rounded-lg border border-erp-border bg-erp-surface px-3 text-xs text-erp-text outline-none transition placeholder:text-erp-text-muted focus:border-erp-primary focus:ring-2 focus:ring-erp-primary/10'

const labelClass = 'mb-1.5 block text-xs font-semibold text-erp-text'

function Field({ label, name, value, onChange, required = false, type = 'text', placeholder = '', error, icon: Icon, children }) {
  return (
    <div className="min-w-0">
      <label htmlFor={name} className={labelClass}>
        {label}
        {required && <span className="ml-1 text-erp-danger">*</span>}
      </label>
      <div className="relative">
        {Icon && <Icon size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-erp-text-muted" />}
        {children || <input id={name} name={name} type={type} value={value} onChange={onChange} placeholder={placeholder} required={required} className={`${inputClass} ${Icon ? 'pl-9' : ''} ${error ? 'border-erp-danger' : ''}`} />}
      </div>
      {error && <p className="mt-1 text-[10px] text-erp-danger">{error}</p>}
    </div>
  )
}

function SectionLabel({ icon: Icon, title, description }) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-erp-primary-light text-erp-primary">
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <h3 className="text-sm font-bold text-erp-text">{title}</h3>
        <p className="mt-0.5 text-[10px] text-erp-text-secondary">{description}</p>
      </div>
    </div>
  )
}

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
    setForm((previous) => ({ ...previous, [name]: value }))
    setErrors((previous) => ({ ...previous, [name]: '' }))
    setError('')
  }

  const validateStep = (currentStep) => {
    const nextErrors = {}

    if (currentStep === 1) {
      if (!form.name.trim()) nextErrors.name = 'Owner name is required.'
      if (!form.email.trim()) nextErrors.email = 'Owner email is required.'
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
        nextErrors.email = 'Enter a valid email.'
      }

      if (!form.password) nextErrors.password = 'Password is required.'
      else if (form.password.length < 8) {
        nextErrors.password = 'Use at least 8 characters.'
      }

      if (form.confirmPassword !== form.password) {
        nextErrors.confirmPassword = 'Passwords do not match.'
      }

      if (!form.companyName.trim()) nextErrors.companyName = 'Company name is required.'
      if (!form.businessType) nextErrors.businessType = 'Select a business type.'
      if (!form.companyEmail.trim()) nextErrors.companyEmail = 'Company email is required.'
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.companyEmail.trim())) {
        nextErrors.companyEmail = 'Enter a valid email.'
      }

      if (!form.companyPhone.trim()) nextErrors.companyPhone = 'Company phone is required.'
      if (!form.businessCategory.trim()) nextErrors.businessCategory = 'Category is required.'
      if (form.website.trim() && !/^https?:\/\/.+\..+/i.test(form.website.trim())) {
        nextErrors.website = 'Enter a valid URL starting with http:// or https://.'
      }
    }

    if (currentStep === 2) {
      if (!form.addressLine1.trim()) nextErrors.addressLine1 = 'Address is required.'
      if (!form.city.trim()) nextErrors.city = 'City is required.'
      if (!form.state.trim()) nextErrors.state = 'State is required.'
      if (!form.country.trim()) nextErrors.country = 'Country is required.'
      if (!form.postalCode.trim()) nextErrors.postalCode = 'Postal code is required.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleNext = () => {
    setError('')
    if (validateStep(1)) setStep(2)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!validateStep(2)) return

    setSubmitting(true)

    try {
      const { confirmPassword, ...registrationData } = form

      const response = await axiosInstance.post('/companies/register', {
        ...registrationData,
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        companyName: form.companyName.trim(),
        companyEmail: form.companyEmail.trim().toLowerCase(),
        phone: form.phone.trim(),
        companyPhone: form.companyPhone.trim(),
        businessCategory: form.businessCategory.trim(),
        addressLine1: form.addressLine1.trim(),
        addressLine2: form.addressLine2.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        country: form.country.trim(),
        postalCode: form.postalCode.trim(),
        website: form.website.trim(),
        gstNumber: form.gstNumber.trim(),
        panNumber: form.panNumber.trim(),
      })

      setSuccess(response.data?.message || 'Registration submitted successfully. Your company is awaiting SuperAdmin approval.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to submit registration. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-dvh bg-erp-bg text-erp-text lg:grid lg:h-dvh lg:min-h-[600px] lg:grid-cols-[1fr_1fr] lg:overflow-hidden">
      <section className="relative hidden min-h-dvh overflow-hidden bg-erp-sidebar-bg px-10 py-8 text-erp-text-inverse lg:flex lg:flex-col lg:justify-between xl:px-14">
        <div className="pointer-events-none absolute -right-28 -top-28 h-80 w-80 rounded-full border border-erp-text-inverse/10" />
        <div className="pointer-events-none absolute -bottom-28 -left-20 h-80 w-80 rounded-full border border-erp-text-inverse/10" />
        <div className="pointer-events-none absolute bottom-24 right-12 h-40 w-40 rounded-full bg-erp-accent/20 blur-3xl" />

        <Link to="/" className="relative flex items-center gap-3">
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

          <div className="mt-7 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-erp-sidebar-border bg-erp-text-inverse/5 p-4">
              <Building2 size={19} className="text-erp-accent" />
              <p className="mt-3 text-sm font-semibold">Business workspace</p>
              <p className="mt-1 text-xs text-erp-sidebar-text-muted">Operations in one place</p>
            </div>
            <div className="rounded-xl border border-erp-sidebar-border bg-erp-text-inverse/5 p-4">
              <ShieldCheck size={19} className="text-erp-accent" />
              <p className="mt-3 text-sm font-semibold">Approval process</p>
              <p className="mt-1 text-xs text-erp-sidebar-text-muted">Reviewed before access</p>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3 rounded-xl border border-erp-sidebar-border bg-erp-text-inverse/5 p-4">
            <CheckCircle2 size={20} className="shrink-0 text-erp-accent" />
            <p className="text-xs leading-5 text-erp-sidebar-text-muted">Submit your details once. The SuperAdmin reviews your company registration before account access is enabled.</p>
          </div>
        </div>

        <p className="relative text-[11px] text-erp-sidebar-text-muted">© {new Date().getFullYear()} MineERP. All rights reserved.</p>
      </section>

      <section className="flex min-h-dvh items-center justify-center px-4 py-5 sm:px-6 lg:h-dvh lg:min-h-[600px] lg:overflow-y-auto lg:px-8 lg:py-4">
        <div className="w-full max-w-xl">
          <Link to="/" className="mb-4 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-erp-sidebar-bg text-erp-text-inverse">
              <Layers3 size={20} />
            </div>
            <div>
              <p className="text-base font-bold text-erp-primary">MineERP</p>
              <p className="text-[9px] tracking-[0.14em] text-erp-text-secondary">BUSINESS MANAGEMENT</p>
            </div>
          </Link>

          {success ? (
            <div className="rounded-2xl border border-erp-border bg-erp-surface p-6 text-center shadow-(--erp-shadow) sm:p-8">
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
            <div className="rounded-2xl border border-erp-border bg-erp-surface p-5 shadow-(--erp-shadow) sm:p-6">
              <div className="mb-5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-erp-primary-light text-erp-primary">{step === 1 ? <Building2 size={20} /> : <MapPin size={20} />}</div>

                <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-erp-text-secondary">Business registration</p>
                <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-erp-text">{step === 1 ? 'Register your company' : 'Complete your details'}</h2>
                <p className="mt-1.5 text-xs leading-5 text-erp-text-secondary">{step === 1 ? 'Enter your owner and business details to get started.' : 'Add your business address and financial information.'}</p>
              </div>

              <div className="mb-5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-erp-primary">STEP {step} OF 2</span>
                  <span className="text-[10px] text-erp-text-secondary">{step === 1 ? 'Owner & Company' : 'Address & Tax'}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-erp-surface-secondary">
                  <div className={`h-full rounded-full bg-erp-primary transition-all duration-300 ${step === 1 ? 'w-1/2' : 'w-full'}`} />
                </div>
              </div>

              {error && (
                <div role="alert" className="mb-4 rounded-lg border border-erp-danger/20 bg-erp-danger/10 px-3 py-2.5 text-xs text-erp-danger">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {step === 1 && (
                  <div className="space-y-5">
                    <div>
                      <SectionLabel icon={UserRound} title="Owner Details" description="Who will manage this business account?" />
                      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                        <Field label="Full name" name="name" value={form.name} onChange={handleChange} required placeholder="Your full name" icon={UserRound} error={errors.name} />
                        <Field label="Owner email" name="email" type="email" value={form.email} onChange={handleChange} required placeholder="you@company.com" icon={Mail} error={errors.email} />
                        <Field label="Personal phone" name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="Phone number (optional)" />
                        <div>
                          <label htmlFor="password" className={labelClass}>
                            Password <span className="text-erp-danger">*</span>
                          </label>
                          <div className="flex h-10 items-center gap-2 rounded-lg border border-erp-border px-3 focus-within:border-erp-primary focus-within:ring-2 focus-within:ring-erp-primary/10">
                            <LockKeyhole size={15} className="shrink-0 text-erp-text-muted" />
                            <input
                              id="password"
                              name="password"
                              type={showPassword ? 'text' : 'password'}
                              value={form.password}
                              onChange={handleChange}
                              placeholder="Minimum 8 characters"
                              autoComplete="new-password"
                              required
                              className="h-full min-w-0 flex-1 bg-transparent text-xs text-erp-text outline-none placeholder:text-erp-text-muted"
                            />
                            <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="shrink-0 text-erp-text-secondary hover:text-erp-primary">
                              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                          </div>
                          {errors.password && <p className="mt-1 text-[10px] text-erp-danger">{errors.password}</p>}
                        </div>
                        <div className="sm:col-span-2">
                          <label htmlFor="confirmPassword" className={labelClass}>
                            Confirm password <span className="text-erp-danger">*</span>
                          </label>
                          <div className="flex h-10 items-center gap-2 rounded-lg border border-erp-border px-3 focus-within:border-erp-primary focus-within:ring-2 focus-within:ring-erp-primary/10">
                            <LockKeyhole size={15} className="shrink-0 text-erp-text-muted" />
                            <input
                              id="confirmPassword"
                              name="confirmPassword"
                              type={showConfirmPassword ? 'text' : 'password'}
                              value={form.confirmPassword}
                              onChange={handleChange}
                              placeholder="Re-enter your password"
                              autoComplete="new-password"
                              required
                              className="h-full min-w-0 flex-1 bg-transparent text-xs text-erp-text outline-none placeholder:text-erp-text-muted"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword((value) => !value)}
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

                    <div className="border-t border-erp-border pt-4">
                      <SectionLabel icon={Building2} title="Company Details" description="Basic information about your business." />
                      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                        <Field label="Company name" name="companyName" value={form.companyName} onChange={handleChange} required placeholder="Registered business name" icon={Building2} error={errors.companyName} />
                        <Field label="Business type" name="businessType" value={form.businessType} onChange={handleChange} required error={errors.businessType}>
                          <select id="businessType" name="businessType" value={form.businessType} onChange={handleChange} required className={`${inputClass} ${errors.businessType ? 'border-erp-danger' : ''}`}>
                            <option value="">Select business type</option>
                            <option value="Manufacturer">Manufacturer</option>
                            <option value="Wholesaler">Wholesaler</option>
                            <option value="Retailer">Retailer</option>
                            <option value="Distributor">Distributor</option>
                            <option value="Other">Other</option>
                          </select>
                        </Field>
                        <Field label="Business category" name="businessCategory" value={form.businessCategory} onChange={handleChange} required placeholder="e.g. Electronics" error={errors.businessCategory} />
                        <Field label="Company email" name="companyEmail" type="email" value={form.companyEmail} onChange={handleChange} required placeholder="business@company.com" icon={Mail} error={errors.companyEmail} />
                        <Field label="Company phone" name="companyPhone" type="tel" value={form.companyPhone} onChange={handleChange} required placeholder="Business contact number" error={errors.companyPhone} />
                        <Field label="Website" name="website" type="url" value={form.website} onChange={handleChange} placeholder="https://example.com" icon={Globe2} error={errors.website} />
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-5">
                    <div>
                      <SectionLabel icon={MapPin} title="Business Address" description="Where is your business located?" />
                      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <Field label="Address line 1" name="addressLine1" value={form.addressLine1} onChange={handleChange} required placeholder="Building, street and area" error={errors.addressLine1} />
                        </div>
                        <div className="sm:col-span-2">
                          <Field label="Address line 2" name="addressLine2" value={form.addressLine2} onChange={handleChange} placeholder="Landmark, floor or suite (optional)" />
                        </div>
                        <Field label="City" name="city" value={form.city} onChange={handleChange} required placeholder="City" error={errors.city} />
                        <Field label="State" name="state" value={form.state} onChange={handleChange} required placeholder="State" error={errors.state} />
                        <Field label="Country" name="country" value={form.country} onChange={handleChange} required placeholder="Country" error={errors.country} />
                        <Field label="Postal code" name="postalCode" value={form.postalCode} onChange={handleChange} required placeholder="PIN / ZIP code" error={errors.postalCode} />
                      </div>
                    </div>

                    <div className="border-t border-erp-border pt-4">
                      <SectionLabel icon={ReceiptText} title="Tax & Financial Details" description="Optional business registration and currency details." />
                      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                        <Field label="GST number" name="gstNumber" value={form.gstNumber} onChange={handleChange} placeholder="GSTIN (optional)" />
                        <Field label="PAN number" name="panNumber" value={form.panNumber} onChange={handleChange} placeholder="PAN (optional)" />
                        <Field label="Currency" name="currency" value={form.currency} onChange={handleChange} required>
                          <select id="currency" name="currency" value={form.currency} onChange={handleChange} className={inputClass}>
                            <option value="INR">INR — Indian Rupee</option>
                            <option value="USD">USD — US Dollar</option>
                            <option value="GBP">GBP — British Pound</option>
                            <option value="EUR">EUR — Euro</option>
                            <option value="AED">AED — UAE Dirham</option>
                            <option value="CAD">CAD — Canadian Dollar</option>
                            <option value="AUD">AUD — Australian Dollar</option>
                          </select>
                        </Field>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 rounded-lg bg-erp-surface-secondary p-3">
                      <ShieldCheck size={15} className="mt-0.5 shrink-0 text-erp-primary" />
                      <p className="text-[10px] leading-4 text-erp-text-secondary">Your company registration will remain pending until it is reviewed by the SuperAdmin.</p>
                    </div>
                  </div>
                )}

                <div className="mt-5 flex items-center gap-3 border-t border-erp-border pt-4">
                  {step === 2 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setStep(1)
                        setError('')
                      }}
                      disabled={submitting}
                      className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-erp-border bg-erp-surface px-3 text-xs font-semibold text-erp-text transition hover:bg-erp-surface-secondary disabled:opacity-60"
                    >
                      <ArrowLeft size={15} />
                      Back
                    </button>
                  ) : (
                    <Link to="/login" className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-erp-border bg-erp-surface px-3 text-xs font-semibold text-erp-text transition hover:bg-erp-surface-secondary">
                      <ArrowLeft size={15} />
                      Sign in
                    </Link>
                  )}

                  {step === 1 ? (
                    <button type="button" onClick={handleNext} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-erp-primary px-3 text-xs font-semibold text-erp-text-inverse transition hover:bg-erp-primary-hover">
                      Continue <ArrowRight size={15} />
                    </button>
                  ) : (
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
                      ) : (
                        <>
                          Submit registration <ArrowRight size={15} />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </form>

              <p className="mt-4 text-center text-[10px] text-erp-text-muted">Secure registration · Company approval required</p>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
