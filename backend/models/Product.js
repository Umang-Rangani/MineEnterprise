const mongoose = require('mongoose')

const productSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CompanyEnterPrise',
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: [true, 'Product name is required.'],
      trim: true,
      maxlength: [150, 'Product name cannot exceed 150 characters.'],
    },

    sku: {
      type: String,
      required: [true, 'Product SKU is required.'],
      trim: true,
      uppercase: true,
      maxlength: [80, 'SKU cannot exceed 80 characters.'],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters.'],
      default: '',
    },

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CategoryEnterPrise',
      default: null,
    },

    barcode: {
      type: String,
      trim: true,
      default: '',
    },

    unit: {
      type: String,
      trim: true,
      default: 'Piece',
      maxlength: [30, 'Unit cannot exceed 30 characters.'],
    },

    costPrice: {
      type: Number,
      required: true,
      min: [0, 'Cost price cannot be negative.'],
      default: 0,
    },

    sellingPrice: {
      type: Number,
      required: true,
      min: [0, 'Selling price cannot be negative.'],
      default: 0,
    },

    taxRate: {
      type: Number,
      min: [0, 'Tax rate cannot be negative.'],
      max: [100, 'Tax rate cannot exceed 100%.'],
      default: 0,
    },

    openingStock: {
      type: Number,
      min: [0, 'Opening stock cannot be negative.'],
      default: 0,
    },

    minStockLevel: {
      type: Number,
      min: [0, 'Minimum stock level cannot be negative.'],
      default: 0,
    },

    imageUrl: {
      type: String,
      trim: true,
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

productSchema.index({ companyId: 1, sku: 1 }, { unique: true })

productSchema.index({ companyId: 1, name: 1 })
productSchema.index({ companyId: 1, categoryId: 1, status: 1 })

module.exports = mongoose.models.ProductMineERP || mongoose.model('ProductMineERP', productSchema)
