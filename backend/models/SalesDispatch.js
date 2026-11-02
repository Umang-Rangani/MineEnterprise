const mongoose = require('mongoose')

const salesDispatchItemSchema = new mongoose.Schema(
  {
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
      min: [0.01, 'Dispatch quantity must be greater than zero.'],
    },
  },
  { _id: true },
)

const salesDispatchSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CompanyEnterPrise',
      required: true,
      index: true,
    },

    dispatchNumber: {
      type: String,
      required: true,
      trim: true,
    },

    salesOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SalesOrderMineERP',
      required: true,
      index: true,
    },

    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WarehouseMineERP',
      required: true,
    },

    items: {
      type: [salesDispatchItemSchema],
      required: true,
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: 'At least one dispatch item is required.',
      },
    },

    dispatchDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    deliveryReference: {
      type: String,
      trim: true,
      maxlength: [150, 'Delivery reference cannot exceed 150 characters.'],
      default: '',
    },

    transportName: {
      type: String,
      trim: true,
      maxlength: [150, 'Transport name cannot exceed 150 characters.'],
      default: '',
    },

    vehicleNumber: {
      type: String,
      trim: true,
      maxlength: [30, 'Vehicle number cannot exceed 30 characters.'],
      default: '',
    },

    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters.'],
      default: '',
    },

    status: {
      type: String,
      enum: ['Confirmed', 'Cancelled'],
      default: 'Confirmed',
      index: true,
    },

    dispatchedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserEnterPrise',
      required: true,
    },

    dispatchedAt: {
      type: Date,
      default: Date.now,
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
  },
  {
    timestamps: true,
  },
)

salesDispatchSchema.index({ companyId: 1, dispatchNumber: 1 }, { unique: true })

salesDispatchSchema.index({
  companyId: 1,
  salesOrderId: 1,
  dispatchDate: -1,
})

salesDispatchSchema.index({
  companyId: 1,
  status: 1,
  dispatchDate: -1,
})

module.exports = mongoose.models.SalesDispatchMineERP || mongoose.model('SalesDispatchMineERP', salesDispatchSchema)
