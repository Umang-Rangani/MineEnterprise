const mongoose = require('mongoose')

const purchaseItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductMineERP',
      required: [true, 'Product is required'],
    },

    productName: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [150, 'Product name cannot exceed 150 characters'],
    },

    sku: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: [80, 'SKU cannot exceed 80 characters'],
      default: '',
    },

    unit: {
      type: String,
      trim: true,
      maxlength: [30, 'Unit cannot exceed 30 characters'],
      default: 'Piece',
    },

    quantity: {
      type: Number,
      required: [true, 'Purchase quantity is required'],
      min: [0.001, 'Quantity must be greater than zero'],
    },

    receivedQuantity: {
      type: Number,
      min: [0, 'Received quantity cannot be negative'],
      default: 0,
    },

    unitPrice: {
      type: Number,
      required: [true, 'Purchase price is required'],
      min: [0, 'Purchase price cannot be negative'],
    },

    taxRate: {
      type: Number,
      min: [0, 'Tax rate cannot be negative'],
      max: [100, 'Tax rate cannot exceed 100%'],
      default: 0,
    },

    discountAmount: {
      type: Number,
      min: [0, 'Discount cannot be negative'],
      default: 0,
    },

    taxableAmount: {
      type: Number,
      min: [0, 'Taxable amount cannot be negative'],
      default: 0,
    },

    taxAmount: {
      type: Number,
      min: [0, 'Tax amount cannot be negative'],
      default: 0,
    },

    lineTotal: {
      type: Number,
      min: [0, 'Line total cannot be negative'],
      default: 0,
    },
  },
  { _id: true },
)

const purchaseSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CompanyEnterPrise',
      required: [true, 'Company is required'],
      index: true,
    },

    purchaseNumber: {
      type: String,
      required: [true, 'Purchase number is required'],
      trim: true,
      uppercase: true,
      maxlength: [50, 'Purchase number cannot exceed 50 characters'],
    },

    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SupplierMineERP',
      required: [true, 'Supplier is required'],
    },

    supplierName: {
      type: String,
      required: [true, 'Supplier name is required'],
      trim: true,
      maxlength: [150, 'Supplier name cannot exceed 150 characters'],
    },

    purchaseDate: {
      type: Date,
      required: [true, 'Purchase date is required'],
      default: Date.now,
    },

    expectedDeliveryDate: {
      type: Date,
      default: null,
    },

    items: {
      type: [purchaseItemSchema],
      validate: {
        validator(items) {
          return Array.isArray(items) && items.length > 0
        },
        message: 'At least one purchase item is required',
      },
    },

    subtotal: {
      type: Number,
      required: true,
      min: [0, 'Subtotal cannot be negative'],
      default: 0,
    },

    discountAmount: {
      type: Number,
      min: [0, 'Discount cannot be negative'],
      default: 0,
    },

    taxAmount: {
      type: Number,
      min: [0, 'Tax cannot be negative'],
      default: 0,
    },

    shippingCharges: {
      type: Number,
      min: [0, 'Shipping charges cannot be negative'],
      default: 0,
    },

    adjustmentAmount: {
      type: Number,
      default: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: [0, 'Total amount cannot be negative'],
      default: 0,
    },

    paidAmount: {
      type: Number,
      min: [0, 'Paid amount cannot be negative'],
      default: 0,
    },

    paymentStatus: {
      type: String,
      enum: ['Unpaid', 'Partially Paid', 'Paid'],
      default: 'Unpaid',
      index: true,
    },

    status: {
      type: String,
      enum: ['Draft', 'Ordered', 'Partially Received', 'Received', 'Cancelled'],
      default: 'Draft',
      index: true,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
      default: '',
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserEnterPrise',
      required: [true, 'Creator is required'],
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

purchaseSchema.index({ companyId: 1, purchaseNumber: 1 }, { unique: true })

purchaseSchema.index({ companyId: 1, purchaseDate: -1 })
purchaseSchema.index({ companyId: 1, supplierId: 1, purchaseDate: -1 })
purchaseSchema.index({ companyId: 1, status: 1, purchaseDate: -1 })

module.exports = mongoose.models.PurchaseMineERP || mongoose.model('PurchaseMineERP', purchaseSchema)
