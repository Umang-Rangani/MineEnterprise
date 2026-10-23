import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Pencil,
  Warehouse,
  MapPin,
  UserRound,
  Package,
  CheckCircle2,
  XCircle,
  Hash,
  Building2,
} from 'lucide-react'
import BreadCrumb from '../../BreadCrumb/BreadCrumb'

const sampleWarehouses = [
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

const formatNumber = (number) =>
  new Intl.NumberFormat('en-IN').format(number)

function DetailCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Icon size={17} className="text-slate-400" />
        {label}
      </div>
      <p className="mt-2 break-words font-semibold text-slate-800">
        {value}
      </p>
    </div>
  )
}

export default function WarehouseDetails() {
  const { id } = useParams()

  const warehouse = sampleWarehouses.find(
    (item) => item.id === id,
  )

  if (!warehouse) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <Warehouse size={38} className="mx-auto text-slate-400" />

        <h2 className="mt-4 text-xl font-bold text-slate-800">
          Warehouse not found
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          No sample warehouse was found for ID: {id}
        </p>

        <Link
          to="/company/warehouses"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-erp-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-erp-primary-hover"
        >
          <ArrowLeft size={17} />
          Back to Warehouses
        </Link>
      </div>
    )
  }

  const percentage =
    warehouse.capacity > 0
      ? Math.min(
          100,
          Math.round(
            (warehouse.stockUnits / warehouse.capacity) * 100,
          ),
        )
      : 0

  const breadcrumbItems = [
    {
      title: 'Warehouses',
      link: '/company/warehouses',
    },
    {
      title: warehouse.name,
      link: null,
    },
  ]

  return (
    <div className="space-y-6 pb-10">
      <BreadCrumb items={breadcrumbItems} />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">

          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Warehouse Details
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              View warehouse information and storage capacity.
            </p>
          </div>
        </div>

        <Link
          to={`/company/warehouses/${warehouse.id}/edit`}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-erp-primary px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-erp-primary-hover"
        >
          <Pencil size={17} />
          Edit Warehouse
        </Link>
      </div>

      {/* Warehouse Overview */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:p-7">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-erp-primary-light text-erp-primary">
            <Warehouse size={30} />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-slate-800">
              {warehouse.name}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {warehouse.code} · {warehouse.id}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                  warehouse.status === 'Active'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                {warehouse.status === 'Active' ? (
                  <CheckCircle2 size={14} />
                ) : (
                  <XCircle size={14} />
                )}
                {warehouse.status}
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                <Building2 size={14} />
                Warehouse
              </span>
            </div>
          </div>
        </div>

        {/* Information */}
        <div className="p-5 sm:p-7">
          <h3 className="mb-4 font-semibold text-slate-800">
            General Information
          </h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <DetailCard
              label="Warehouse Name"
              value={warehouse.name}
              icon={Warehouse}
            />

            <DetailCard
              label="Warehouse Code"
              value={warehouse.code}
              icon={Hash}
            />

            <DetailCard
              label="Location"
              value={warehouse.location}
              icon={MapPin}
            />

            <DetailCard
              label="Warehouse Manager"
              value={warehouse.manager}
              icon={UserRound}
            />

            <DetailCard
              label="Storage Capacity"
              value={`${formatNumber(warehouse.capacity)} units`}
              icon={Package}
            />

            <DetailCard
              label="Current Stock"
              value={`${formatNumber(warehouse.stockUnits)} units`}
              icon={Package}
            />
          </div>
        </div>
      </div>

      {/* Capacity */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold text-slate-800">
              Storage Utilization
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Current stock compared with total warehouse capacity.
            </p>
          </div>

          <p className="text-2xl font-bold text-slate-800">
            {percentage}%
          </p>
        </div>

        <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all ${
              percentage >= 90
                ? 'bg-red-500'
                : percentage >= 70
                  ? 'bg-amber-500'
                  : 'bg-erp-primary'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        <div className="mt-3 flex flex-wrap justify-between gap-2 text-sm">
          <span className="text-slate-500">
            Used: {formatNumber(warehouse.stockUnits)} units
          </span>

          <span className="text-slate-500">
            Available:{' '}
            {formatNumber(
              Math.max(0, warehouse.capacity - warehouse.stockUnits),
            )}{' '}
            units
          </span>
        </div>
      </div>

      <div className="flex justify-end">
        <Link
          to="/company/warehouses"
          className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Back to Warehouses
        </Link>
      </div>
    </div>
  )
}