const mongoose = require('mongoose')

const warehouseSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CompanyEnterPrise',
      required: [true, 'Company is required'],
      index: true,
    },

    name: {
      type: String,
      required: [true, 'Warehouse name is required'],
      trim: true,
      maxlength: [100, 'Warehouse name cannot exceed 100 characters'],
    },

    code: {
      type: String,
      required: [true, 'Warehouse code is required'],
      trim: true,
      uppercase: true,
      maxlength: [30, 'Warehouse code cannot exceed 30 characters'],
    },

    address: {
      type: String,
      trim: true,
      maxlength: [300, 'Address cannot exceed 300 characters'],
      default: '',
    },

    city: {
      type: String,
      trim: true,
      maxlength: [100, 'City cannot exceed 100 characters'],
      default: '',
    },

    state: {
      type: String,
      trim: true,
      maxlength: [100, 'State cannot exceed 100 characters'],
      default: '',
    },

    pincode: {
      type: String,
      trim: true,
      maxlength: [10, 'Pincode cannot exceed 10 characters'],
      default: '',
    },

    manager: {
      type: String,
      trim: true,
      maxlength: [100, 'Manager name cannot exceed 100 characters'],
      default: '',
    },

    managerPhone: {
      type: String,
      trim: true,
      maxlength: [20, 'Manager phone cannot exceed 20 characters'],
      default: '',
    },

    contactPerson: {
      type: String,
      trim: true,
      maxlength: [100, 'Contact person cannot exceed 100 characters'],
      default: '',
    },

    phone: {
      type: String,
      trim: true,
      maxlength: [20, 'Phone cannot exceed 20 characters'],
      default: '',
    },

    capacity: {
      type: Number,
      min: [0, 'Capacity cannot be negative'],
      default: 0,
    },

    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: '',
    },

    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserEnterPrise',
      required: [true, 'Creator is required'],
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserEnterPrise',
      default: null,
    },
  },
  {
    timestamps: true,
  },
)

warehouseSchema.index({ companyId: 1, code: 1 }, { unique: true })

warehouseSchema.index({
  companyId: 1,
  status: 1,
  name: 1,
})

module.exports = mongoose.models.WarehouseMineERP || mongoose.model('WarehouseMineERP', warehouseSchema)
