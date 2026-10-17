const mongoose = require('mongoose')

const companySchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      minlength: [2, 'Company name must contain at least 2 characters'],
      maxlength: [150, 'Company name cannot exceed 150 characters'],
    },

    companyCode: {
      type: String,
      unique: true,
      uppercase: true,
      trim: true,
      default: undefined,
    },

    email: {
      type: String,
      required: [true, 'Company email is required'],
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid company email'],
    },

    phone: {
      type: String,
      trim: true,
      default: '',
    },

    ownerName: {
      type: String,
      required: [true, 'Owner name is required'],
      trim: true,
      minlength: [2, 'Owner name must contain at least 2 characters'],
      maxlength: [100, 'Owner name cannot exceed 100 characters'],
    },

    businessType: {
      type: String,
      required: [true, 'Business type is required'],
      trim: true,
      maxlength: [100, 'Business type cannot exceed 100 characters'],
    },

    gstin: {
      type: String,
      uppercase: true,
      trim: true,
      default: '',
    },

    address: {
      type: String,
      trim: true,
      default: '',
    },

    status: {
      type: String,
      enum: ['Pending', 'Active', 'Rejected', 'Inactive'],
      default: 'Pending',
      index: true,
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

    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserEnterPrise',
      default: null,
    },

    rejectedAt: {
      type: Date,
      default: null,
    },

    rejectionReason: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Rejection reason cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
  },
)

companySchema.index({ companyCode: 1 }, { unique: true, sparse: true })

const Company = mongoose.model('CompanyEnterPrise', companySchema)

module.exports = Company
