const mongoose = require('mongoose')

const goodsReceiptItemSchema = new mongoose.Schema(
  {
    purchaseItemId: {
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
    },

    unit: {
      type: String,
      default: 'Piece',
      trim: true,
    },

    orderedQuantity: {
      type: Number,
      required: true,
      min: 0,
    },

    previouslyReceivedQuantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    receivedQuantity: {
      type: Number,
      required: true,
      min: 0,
    },

    damagedQuantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    acceptedQuantity: {
      type: Number,
      required: true,
      min: 0,
    },

    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    notes: {
      type: String,
      default: '',
      trim: true,
      maxlength: 1000,
    },
  },
  {
    _id: true,
  },
)

const goodsReceiptSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CompanyEnterPrise',
      required: true,
      index: true,
    },

    receiptNumber: {
      type: String,
      required: true,
      trim: true,
    },

    purchaseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseMineERP',
      required: true,
      index: true,
    },

    purchaseNumber: {
      type: String,
      required: true,
      trim: true,
    },

    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SupplierMineERP',
      required: true,
      index: true,
    },

    supplierName: {
      type: String,
      required: true,
      trim: true,
    },

    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WarehouseMineERP',
      required: true,
      index: true,
    },

    receiptDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    items: {
      type: [goodsReceiptItemSchema],
      required: true,
      validate: {
        validator(items) {
          return Array.isArray(items) && items.length > 0
        },
        message: 'At least one receipt item is required',
      },
    },

    status: {
      type: String,
      enum: ['Draft', 'Confirmed', 'Cancelled'],
      default: 'Draft',
      required: true,
      index: true,
    },

    notes: {
      type: String,
      default: '',
      trim: true,
      maxlength: 2000,
    },

    confirmedAt: {
      type: Date,
      default: null,
    },

    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserEnterPrise',
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserEnterPrise',
      default: null,
    },

    cancellationReason: {
      type: String,
      default: '',
      trim: true,
      maxlength: 1000,
    },

    stockUpdatedAt: {
      type: Date,
      default: null,
    },

    stockUpdateReference: {
      type: String,
      default: '',
      trim: true,
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

goodsReceiptSchema.index({ companyId: 1, receiptNumber: 1 }, { unique: true })

goodsReceiptSchema.index({
  companyId: 1,
  purchaseId: 1,
  receiptDate: -1,
})

goodsReceiptSchema.index({
  companyId: 1,
  supplierId: 1,
  receiptDate: -1,
})

goodsReceiptSchema.index({
  companyId: 1,
  status: 1,
  receiptDate: -1,
})

module.exports = mongoose.models.GoodsReceiptMineERP || mongoose.model('GoodsReceiptMineERP', goodsReceiptSchema)
