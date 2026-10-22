const mongoose = require('mongoose')

// Current stock, reserved stock અને available stock
const inventorySchema = new mongoose.Schema(
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
    },

    currentStock: {
      type: Number,
      required: true,
      min: [0, 'Current stock cannot be negative.'],
      default: 0,
    },

    reservedStock: {
      type: Number,
      min: [0, 'Reserved stock cannot be negative.'],
      default: 0,
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

inventorySchema.index({ companyId: 1, productId: 1 }, { unique: true })

inventorySchema.virtual('availableStock').get(function () {
  return Math.max(0, this.currentStock - this.reservedStock)
})

inventorySchema.set('toJSON', { virtuals: true })
inventorySchema.set('toObject', { virtuals: true })

module.exports = mongoose.models.InventoryMineERP || mongoose.model('InventoryMineERP', inventorySchema)
