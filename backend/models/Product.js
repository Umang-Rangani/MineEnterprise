const mongoose = require('mongoose')

const productSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CompanyEnterPrise',
      required: true,
      index: true,
    },

    productName: {
      type: String,
      required: true,
      trim: true,
    },

    sku: {
      type: String,
      trim: true,
      uppercase: true,
    },

    description: {
      type: String,
      trim: true,
      default: '',
    },

    category: {
      type: String,
      trim: true,
      default: '',
    },

    unit: {
      type: String,
      trim: true,
      default: 'Piece',
    },

    purchasePrice: {
      type: Number,
      min: 0,
      default: 0,
    },

    sellingPrice: {
      type: Number,
      min: 0,
      required: true,
    },

    stockQuantity: {
      type: Number,
      min: 0,
      default: 0,
    },

    lowStockAlert: {
      type: Number,
      min: 0,
      default: 5,
    },

    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
  },
  {
    timestamps: true,
  },
)

productSchema.index({ company: 1, productName: 1 })
productSchema.index({ company: 1, sku: 1 }, { unique: true, sparse: true })

module.exports = mongoose.model('ProductMineERP', productSchema)
