const mongoose = require('mongoose')

const salesOrderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductMineERP',
      required: true,
    },

    // Product snapshot
    productName: {
      type: String,
      required: true,
      trim: true,
    },

    sku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    unit: {
      type: String,
      required: true,
      trim: true,
      default: 'Piece',
    },

    quantity: {
      type: Number,
      required: true,
      min: [0.01, 'Quantity must be greater than zero.'],
    },

    rate: {
      type: Number,
      required: true,
      min: [0, 'Rate cannot be negative.'],
    },

    discount: {
      type: Number,
      min: [0, 'Discount cannot be negative.'],
      default: 0,
    },

    taxRate: {
      type: Number,
      min: [0, 'Tax rate cannot be negative.'],
      max: [100, 'Tax rate cannot exceed 100%.'],
      default: 0,
    },

    taxAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    lineTotal: {
      type: Number,
      min: 0,
      required: true,
    },

    reservedQuantity: {
      type: Number,
      min: 0,
      default: 0,
    },

    dispatchedQuantity: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  { _id: true },
)

const amendmentSchema = new mongoose.Schema(
  {
    amendmentNumber: {
      type: Number,
      required: true,
    },

    changes: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    reason: {
      type: String,
      trim: true,
      maxlength: [500, 'Reason cannot exceed 500 characters.'],
      default: '',
    },

    amendedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserEnterPrise',
      required: true,
    },

    amendedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true },
)

const salesOrderSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CompanyEnterPrise',
      required: true,
      index: true,
    },

    orderNumber: {
      type: String,
      required: true,
      trim: true,
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CustomerMineERP',
      required: true,
      index: true,
    },

    orderDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    expectedDeliveryDate: {
      type: Date,
      default: null,
    },

    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WarehouseMineERP',
      required: true,
    },

    items: {
      type: [salesOrderItemSchema],
      required: true,
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: 'At least one product is required.',
      },
    },

    subtotal: {
      type: Number,
      min: 0,
      required: true,
      default: 0,
    },

    discount: {
      type: Number,
      min: 0,
      default: 0,
    },

    taxAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    grandTotal: {
      type: Number,
      min: 0,
      required: true,
      default: 0,
    },

    status: {
      type: String,
      enum: ['Draft', 'Approved', 'Partially Dispatched', 'Dispatched', 'Cancelled'],
      default: 'Draft',
      index: true,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Notes cannot exceed 2000 characters.'],
      default: '',
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

    amendments: {
      type: [amendmentSchema],
      default: [],
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

salesOrderSchema.index({ companyId: 1, orderNumber: 1 }, { unique: true })

salesOrderSchema.index({
  companyId: 1,
  customerId: 1,
  orderDate: -1,
})

salesOrderSchema.index({
  companyId: 1,
  status: 1,
  orderDate: -1,
})

module.exports = mongoose.models.SalesOrderMineERP || mongoose.model('SalesOrderMineERP', salesOrderSchema)
