import { useState } from 'react'
import axiosInstance from '../api/axiosInstance'

export default function CompanyRegistration() {
  const [formData, setFormData] = useState({
    companyName: '',
    email: '',
    phone: '',
    ownerName: '',
    ownerEmail: '',
    ownerPassword: '',
    businessType: '',
    gstin: '',
    address: '',
  })

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    try {
      const { data } = await axiosInstance.post('/companies/register', formData)

      setMessage(`Registration successful! Company Code: ${data.data.companyCode}. Your application is Pending SuperAdmin approval.`)

      setFormData({
        companyName: '',
        email: '',
        phone: '',
        ownerName: '',
        ownerEmail: '',
        ownerPassword: '',
        businessType: '',
        gstin: '',
        address: '',
      })
    } catch (err) {
      setError(err.response?.data?.message || 'Company registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fields = [
    { name: 'companyName', label: 'Company Name', required: true },
    { name: 'email', label: 'Company Email', type: 'email', required: true },
    { name: 'phone', label: 'Company Phone', required: true },
    { name: 'ownerName', label: 'Owner Name', required: true },
    { name: 'ownerEmail', label: 'Owner Email', type: 'email', required: true },
    { name: 'ownerPassword', label: 'Owner Password', type: 'password', required: true },
    { name: 'businessType', label: 'Business Type', required: true },
    { name: 'gstin', label: 'GSTIN (Optional)' },
    { name: 'address', label: 'Address', required: true },
  ]

  return (
    <div className="erp-page min-h-screen flex items-center justify-center p-4">
      <div className="erp-card w-full max-w-2xl p-6 md:p-8">
        <h1 className="text-2xl font-bold erp-text">Register Your Company</h1>

        <p className="erp-muted mt-2 mb-6">Submit your business details for SuperAdmin approval.</p>

        {message && <div className="mb-4 rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-800">{message}</div>}

        {error && <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {fields.map((field) => (
              <div key={field.name} className={field.name === 'address' ? 'sm:col-span-2' : ''}>
                <label className="erp-label mb-1 block">{field.label}</label>

                {field.name === 'address' ? (
                  <textarea name={field.name} value={formData[field.name]} onChange={handleChange} required={field.required} rows={3} className="erp-input w-full" />
                ) : (
                  <input name={field.name} type={field.type || 'text'} value={formData[field.name]} onChange={handleChange} required={field.required} minLength={field.name === 'ownerPassword' ? 8 : undefined} className="erp-input w-full" />
                )}
              </div>
            ))}
          </div>

          <button type="submit" disabled={loading} className="erp-btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? 'Registering...' : 'Register Company'}
          </button>
        </form>
      </div>
    </div>
  )
}
