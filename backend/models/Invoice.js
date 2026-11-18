const mongoose = require('mongoose')

const invoiceItemSchema = new mongoose.Schema(
  {
    dispatchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SalesDispatchMineERP',
      required: true,
    },

    dispatchItemId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    salesOrderItemId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductMineERP',
      required: true,
    },

    productName: {
      type: String,
      required: true,
      trim: true,
    },

    sku: {
      type: String,
      default: '',
      trim: true,
      uppercase: true,
    },

    unit: {
      type: String,
      default: 'Piece',
      trim: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: [0.01, 'Invoice quantity must be greater than zero.'],
    },

    rate: {
      type: Number,
      required: true,
      min: [0, 'Rate cannot be negative.'],
    },

    discount: {
      type: Number,
      default: 0,
      min: [0, 'Discount cannot be negative.'],
    },

    taxRate: {
      type: Number,
      default: 0,
      min: [0, 'Tax rate cannot be negative.'],
      max: [100, 'Tax rate cannot exceed 100%.'],
    },

    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    lineTotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: true,
  },
)

// EMAIL HISTORY
const invoiceEmailHistorySchema = new mongoose.Schema(
  {
    emailType: {
      type: String,
      enum: ['Invoice'],
      default: 'Invoice',
    },

    to: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    subject: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ['Pending', 'Sent', 'Failed'],
      default: 'Pending',
    },

    attemptedAt: {
      type: Date,
      default: Date.now,
    },

    sentAt: {
      type: Date,
      default: null,
    },

    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserEnterPrise',
      required: true,
    },

    messageId: {
      type: String,
      default: '',
    },

    error: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    _id: true,
  },
)

const invoiceSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CompanyEnterPrise',
      required: true,
      index: true,
    },

    invoiceNumber: {
      type: String,
      required: true,
      trim: true,
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CustomerMineERP',
      required: true,
    },

    salesOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SalesOrderMineERP',
      required: true,
    },

    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WarehouseMineERP',
      required: true,
    },

    invoiceDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    dueDate: {
      type: Date,
      default: null,
    },

    items: {
      type: [invoiceItemSchema],
      required: true,
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: 'At least one invoice item is required.',
      },
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    discount: {
      type: Number,
      default: 0,
      min: 0,
    },

    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    grandTotal: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    balanceAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    status: {
      type: String,
      enum: ['Draft', 'Approved', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled'],
      default: 'Draft',
      index: true,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Notes cannot exceed 2000 characters.'],
      default: '',
    },

    // EMAIL TRACKING
    emailStatus: {
      type: String,
      enum: ['Not Sent', 'Pending', 'Sent', 'Failed'],
      default: 'Not Sent',
      index: true,
    },

    emailSentAt: {
      type: Date,
      default: null,
    },

    emailSentTo: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },

    emailError: {
      type: String,
      trim: true,
      default: '',
    },

    emailSentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserEnterPrise',
      default: null,
    },

    emailHistory: {
      type: [invoiceEmailHistorySchema],
      default: [],
    },

    // APPROVAL
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserEnterPrise',
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    // CANCELLATION
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserEnterPrise',
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    cancellationReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Cancellation reason cannot exceed 500 characters.'],
      default: '',
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

// INDEXES
invoiceSchema.index({ companyId: 1, invoiceNumber: 1 }, { unique: true })

invoiceSchema.index({
  companyId: 1,
  customerId: 1,
  invoiceDate: -1,
})

invoiceSchema.index({
  companyId: 1,
  salesOrderId: 1,
  status: 1,
})

invoiceSchema.index({
  companyId: 1,
  status: 1,
  invoiceDate: -1,
})

invoiceSchema.index({
  companyId: 1,
  'items.dispatchId': 1,
  'items.dispatchItemId': 1,
})

module.exports = mongoose.models.InvoiceMineERP || mongoose.model('InvoiceMineERP', invoiceSchema)
