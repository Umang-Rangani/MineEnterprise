import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Warehouse, Save, MapPin, UserRound, Hash, Package } from 'lucide-react'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'

const initialWarehouses = [
  {
    id: 'WH-001',
    name: 'Main Warehouse',
    code: 'WH-MAIN',
    location: 'Ahmedabad, Gujarat',
    manager: 'Rahul Patel',
    capacity: 5000,
    stockUnits: 3250,
    status: 'Active',
  },
  {
    id: 'WH-002',
    name: 'Secondary Warehouse',
    code: 'WH-SEC',
    location: 'Surat, Gujarat',
    manager: 'Amit Shah',
    capacity: 3000,
    stockUnits: 1850,
    status: 'Active',
  },
  {
    id: 'WH-003',
    name: 'Raw Material Store',
    code: 'WH-RAW',
    location: 'Vadodara, Gujarat',
    manager: 'Karan Mehta',
    capacity: 2500,
    stockUnits: 1200,
    status: 'Active',
  },
  {
    id: 'WH-004',
    name: 'Finished Goods Store',
    code: 'WH-FG',
    location: 'Rajkot, Gujarat',
    manager: 'Neha Patel',
    capacity: 4000,
    stockUnits: 0,
    status: 'Inactive',
  },
  {
    id: 'WH-005',
    name: 'Distribution Warehouse',
    code: 'WH-DIS',
    location: 'Gandhinagar, Gujarat',
    manager: 'Vishal Shah',
    capacity: 6000,
    stockUnits: 4200,
    status: 'Active',
  },
  {
    id: 'WH-006',
    name: 'Regional Storage',
    code: 'WH-REG',
    location: 'Anand, Gujarat',
    manager: 'Priya Mehta',
    capacity: 2000,
    stockUnits: 750,
    status: 'Inactive',
  },
]

const emptyForm = {
  name: '',
  code: '',
  location: '',
  manager: '',
  capacity: '',
  stockUnits: '0',
  status: 'Active',
}

export default function WarehouseForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const existingWarehouse = initialWarehouses.find((warehouse) => warehouse.id === id)

  const [formData, setFormData] = useState(() =>
    existingWarehouse
      ? {
          ...existingWarehouse,
          capacity: String(existingWarehouse.capacity),
          stockUnits: String(existingWarehouse.stockUnits),
        }
      : emptyForm,
  )

  const [errors, setErrors] = useState({})
  const [successMessage, setSuccessMessage] = useState('')

  const breadcrumbItems = [
    {
      title: 'Warehouses',
      link: '/company/warehouses',
    },
    {
      title: isEdit ? 'Edit Warehouse' : 'Add Warehouse',
      link: null,
    },
  ]

  const handleChange = (event) => {
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

  const handleSubmit = (event) => {
    event.preventDefault()

    const newErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Warehouse name is required.'
    }

    if (!formData.code.trim()) {
      newErrors.code = 'Warehouse code is required.'
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required.'
    }

    if (!formData.manager.trim()) {
      newErrors.manager = 'Warehouse manager is required.'
    }

    if (formData.capacity === '' || !Number.isFinite(Number(formData.capacity)) || Number(formData.capacity) <= 0) {
      newErrors.capacity = 'Capacity must be greater than zero.'
    }

    if (formData.stockUnits === '' || !Number.isFinite(Number(formData.stockUnits)) || Number(formData.stockUnits) < 0) {
      newErrors.stockUnits = 'Stock units cannot be negative.'
    } else if (Number(formData.stockUnits) > Number(formData.capacity)) {
      newErrors.stockUnits = 'Stock cannot exceed warehouse capacity.'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Demo only: data is not saved permanently or shared with the list page.
    setSuccessMessage(isEdit ? 'Warehouse details validated successfully.' : 'Warehouse details validated successfully.')
  }

  const inputClass = (field) => `mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-erp-primary focus:ring-4 focus:ring-erp-primary/10 ${errors[field] ? 'border-red-400' : 'border-slate-200'}`

  if (isEdit && !existingWarehouse) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <Warehouse className="mx-auto text-slate-400" size={36} />
        <h2 className="mt-4 text-xl font-bold text-slate-800">Warehouse not found</h2>
        <p className="mt-2 text-sm text-slate-500">This sample warehouse ID does not exist.</p>
        <Link to="/company/warehouses" className="mt-5 inline-flex rounded-xl bg-erp-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-erp-primary-hover">
          Back to Warehouses
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-10">
      <BreadCrumb items={breadcrumbItems} />

      <div className="flex items-center gap-3">
    

        <div>
          <h1 className="text-2xl font-bold text-slate-800">{isEdit ? 'Edit Warehouse' : 'Add Warehouse'}</h1>
          <p className="mt-1 text-sm text-slate-500">{isEdit ? 'Update the warehouse information.' : 'Enter the details to create a warehouse record.'}</p>
        </div>
      </div>

      {successMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {successMessage}
          <p className="mt-1 text-xs">This is a demo form. The changes are not saved to the list yet.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-5">
            <div className="rounded-xl bg-erp-primary-light p-3 text-erp-primary">
              <Warehouse size={22} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-800">Warehouse Information</h2>
              <p className="mt-1 text-sm text-slate-500">Basic details and location.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700">
                Warehouse Name <span className="text-red-500">*</span>
              </label>
              <input name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Main Warehouse" className={inputClass('name')} />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Warehouse Code <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Hash size={17} className="absolute left-3 top-1/2 mt-1 -translate-y-1/2 text-slate-400" />
                <input name="code" value={formData.code} onChange={handleChange} placeholder="e.g. WH-MAIN" className={`${inputClass('code')} pl-10 uppercase`} />
              </div>
              {errors.code && <p className="mt-1 text-xs text-red-600">{errors.code}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Location <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MapPin size={17} className="absolute left-3 top-1/2 mt-1 -translate-y-1/2 text-slate-400" />
                <input name="location" value={formData.location} onChange={handleChange} placeholder="City, State" className={`${inputClass('location')} pl-10`} />
              </div>
              {errors.location && <p className="mt-1 text-xs text-red-600">{errors.location}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Warehouse Manager <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <UserRound size={17} className="absolute left-3 top-1/2 mt-1 -translate-y-1/2 text-slate-400" />
                <input name="manager" value={formData.manager} onChange={handleChange} placeholder="Manager name" className={`${inputClass('manager')} pl-10`} />
              </div>
              {errors.manager && <p className="mt-1 text-xs text-red-600">{errors.manager}</p>}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-5">
            <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
              <Package size={22} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-800">Capacity & Status</h2>
              <p className="mt-1 text-sm text-slate-500">Set storage capacity and current stock.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700">
                Storage Capacity (Units) <span className="text-red-500">*</span>
              </label>
              <input type="number" min="1" name="capacity" value={formData.capacity} onChange={handleChange} placeholder="e.g. 5000" className={inputClass('capacity')} />
              {errors.capacity && <p className="mt-1 text-xs text-red-600">{errors.capacity}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Current Stock Units</label>
              <input type="number" min="0" name="stockUnits" value={formData.stockUnits} onChange={handleChange} placeholder="0" className={inputClass('stockUnits')} />
              {errors.stockUnits && <p className="mt-1 text-xs text-red-600">{errors.stockUnits}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Warehouse Status</label>
              <select name="status" value={formData.status} onChange={handleChange} className={inputClass('status')}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => navigate('/company/warehouses')} className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
            Cancel
          </button>

          <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-erp-primary px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-erp-primary-hover">
            <Save size={18} />
            {isEdit ? 'Update Warehouse' : 'Save Warehouse'}
          </button>
        </div>
      </form>
    </div>
  )
}
