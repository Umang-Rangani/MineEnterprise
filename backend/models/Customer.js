const mongoose = require('mongoose')

const customerSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CompanyEnterPrise',
      required: true,
      index: true,
    },

    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      maxlength: [150, 'Customer name cannot exceed 150 characters'],
    },

    customerCode: {
      type: String,
      required: [true, 'Customer code is required'],
      trim: true,
      uppercase: true,
      maxlength: [30, 'Customer code cannot exceed 30 characters'],
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

    billingAddress: {
      type: String,
      trim: true,
      maxlength: [500, 'Billing address cannot exceed 500 characters'],
      default: '',
    },

    shippingAddress: {
      type: String,
      trim: true,
      maxlength: [500, 'Shipping address cannot exceed 500 characters'],
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

    creditLimit: {
      type: Number,
      min: [0, 'Credit limit cannot be negative'],
      default: 0,
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
      required: true,
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

customerSchema.index({ companyId: 1, customerCode: 1 }, { unique: true })

customerSchema.index({
  companyId: 1,
  customerName: 1,
})

customerSchema.index({
  companyId: 1,
  status: 1,
  customerName: 1,
})

customerSchema.index({
  companyId: 1,
  email: 1,
})

module.exports = mongoose.models.CustomerMineERP || mongoose.model('CustomerMineERP', customerSchema)
