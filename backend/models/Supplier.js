const mongoose = require('mongoose')

const supplierSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CompanyEnterPrise',
      required: [true, 'Company is required'],
      index: true,
    },

    supplierName: {
      type: String,
      required: [true, 'Supplier name is required'],
      trim: true,
      maxlength: [150, 'Supplier name cannot exceed 150 characters'],
    },

    supplierCode: {
      type: String,
      required: [true, 'Supplier code is required'],
      trim: true,
      uppercase: true,
      maxlength: [50, 'Supplier code cannot exceed 50 characters'],
    },

    contactPerson: {
      type: String,
      trim: true,
      maxlength: [100, 'Contact person cannot exceed 100 characters'],
      default: '',
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: [150, 'Email cannot exceed 150 characters'],
      default: '',
    },

    phone: {
      type: String,
      trim: true,
      maxlength: [20, 'Phone cannot exceed 20 characters'],
      default: '',
    },

    alternatePhone: {
      type: String,
      trim: true,
      maxlength: [20, 'Alternate phone cannot exceed 20 characters'],
      default: '',
    },

    gstNumber: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: [15, 'GST number cannot exceed 15 characters'],
      default: '',
    },

    panNumber: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: [10, 'PAN number cannot exceed 10 characters'],
      default: '',
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

    country: {
      type: String,
      trim: true,
      maxlength: [100, 'Country cannot exceed 100 characters'],
      default: 'India',
    },

    paymentTerms: {
      type: String,
      trim: true,
      maxlength: [100, 'Payment terms cannot exceed 100 characters'],
      default: '',
    },

    openingBalance: {
      type: Number,
      min: [0, 'Opening balance cannot be negative'],
      default: 0,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
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

supplierSchema.index({ companyId: 1, supplierCode: 1 }, { unique: true })

supplierSchema.index({ companyId: 1, supplierName: 1 })

supplierSchema.index({ companyId: 1, status: 1, supplierName: 1 })

supplierSchema.index({ companyId: 1, email: 1 })

module.exports = mongoose.models.SupplierMineERP || mongoose.model('SupplierMineERP', supplierSchema)
