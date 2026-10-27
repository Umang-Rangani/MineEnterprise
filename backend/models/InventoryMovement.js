const mongoose = require('mongoose')

// Stock In, Stock Out અને stock history
const inventoryMovementSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CompanyEnterPrise',
      required: true,
      index: true,
    },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductMineERP',
      required: true,
      index: true,
    },

    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WarehouseMineERP',
      required: true,
      index: true,
    },

    destinationWarehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WarehouseMineERP',
      default: null,
    },

    type: {
      type: String,
      enum: ['STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'TRANSFER'],
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: [0.01, 'Quantity must be greater than zero.'],
    },

    previousStock: {
      type: Number,
      required: true,
      min: [0, 'Previous stock cannot be negative.'],
    },

    newStock: {
      type: Number,
      required: true,
      min: [0, 'New stock cannot be negative.'],
    },

    reason: {
      type: String,
      trim: true,
      maxlength: [500, 'Reason cannot exceed 500 characters.'],
      default: '',
    },

    reference: {
      type: String,
      trim: true,
      maxlength: [100, 'Reference cannot exceed 100 characters.'],
      default: '',
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserEnterPrise',
      required: true,
    },
  },
  {
    timestamps: true,
  },
)

inventoryMovementSchema.index({
  companyId: 1,
  productId: 1,
  createdAt: -1,
})

inventoryMovementSchema.index({
  companyId: 1,
  type: 1,
  createdAt: -1,
})

module.exports = mongoose.models.InventoryMovementMineERP || mongoose.model('InventoryMovementMineERP', inventoryMovementSchema)
