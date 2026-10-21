const mongoose = require('mongoose')

const customRoleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },

    permissions: {
      type: [String],
      default: [],
    },

    isSystem: {
      type: Boolean,
      default: false,
      immutable: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserEnterPrise',
      default: null,
    },
  },
  {
    timestamps: true,
  },
)

const companySchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
      trim: true,
    },

    businessType: {
      type: String,
      required: true,
      enum: ['Manufacturer', 'Wholesaler', 'Retailer', 'Distributor', 'Other'],
    },

    companyEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    companyPhone: {
      type: String,
      required: true,
      trim: true,
    },

    logo: {
      type: String,
      default: '',
    },

    website: {
      type: String,
      default: '',
      trim: true,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserEnterPrise',
      required: true,
    },

    addressLine1: {
      type: String,
      required: true,
      trim: true,
    },

    addressLine2: {
      type: String,
      default: '',
      trim: true,
    },

    city: {
      type: String,
      required: true,
      trim: true,
    },

    state: {
      type: String,
      required: true,
      trim: true,
    },

    country: {
      type: String,
      required: true,
      trim: true,
    },

    postalCode: {
      type: String,
      required: true,
      trim: true,
    },

    gstNumber: {
      type: String,
      default: '',
      trim: true,
      uppercase: true,
    },

    panNumber: {
      type: String,
      default: '',
      trim: true,
      uppercase: true,
    },

    currency: {
      type: String,
      required: true,
      default: 'INR',
      uppercase: true,
      trim: true,
    },

    businessCategory: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Inactive'],
      default: 'Pending',
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserEnterPrise',
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    rejectionReason: {
      type: String,
      default: '',
      trim: true,
    },

    customRoles: {
      type: [customRoleSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
)

companySchema.index({ owner: 1 })
companySchema.index({ status: 1 })

module.exports = mongoose.models.CompanyEnterPrise || mongoose.model('CompanyEnterPrise', companySchema)
