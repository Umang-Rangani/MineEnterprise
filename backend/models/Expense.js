const mongoose = require('mongoose')

const expenseHistorySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ['Created', 'Edited', 'Approved', 'Deleted'],
      required: true,
    },

    fromStatus: {
      type: String,
      default: '',
    },

    toStatus: {
      type: String,
      default: '',
    },

    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserEnterPrise',
      required: true,
    },

    performedAt: {
      type: Date,
      default: Date.now,
    },

    changes: {
      type: [
        {
          field: {
            type: String,
            required: true,
          },
          oldValue: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
          },
          newValue: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
          },
        },
      ],
      default: [],
    },
  },
  { _id: true },
)

const expenseSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CompanyEnterPrise',
      required: [true, 'Company is required'],
      index: true,
    },

    expenseNumber: {
      type: String,
      required: [true, 'Expense number is required'],
      trim: true,
      uppercase: true,
      maxlength: [50, 'Expense number cannot exceed 50 characters'],
    },

    expenseCategory: {
      type: String,
      required: [true, 'Expense category is required'],
      trim: true,
      maxlength: [100, 'Expense category cannot exceed 100 characters'],
    },

    title: {
      type: String,
      required: [true, 'Expense title is required'],
      trim: true,
      maxlength: [150, 'Expense title cannot exceed 150 characters'],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
      default: '',
    },

    expenseDate: {
      type: Date,
      required: [true, 'Expense date is required'],
      default: Date.now,
    },

    amount: {
      type: Number,
      required: [true, 'Expense amount is required'],
      min: [0.01, 'Expense amount must be greater than zero'],
    },

    taxRate: {
      type: Number,
      min: [0, 'Tax rate cannot be negative'],
      max: [100, 'Tax rate cannot exceed 100%'],
      default: 0,
    },

    taxAmount: {
      type: Number,
      min: [0, 'Tax amount cannot be negative'],
      default: 0,
    },

    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0.01, 'Total amount must be greater than zero'],
    },

    paymentMode: {
      type: String,
      enum: ['Cash', 'Bank Transfer', 'UPI', 'Cheque', 'Other'],
      required: [true, 'Payment mode is required'],
    },

    transactionReference: {
      type: String,
      trim: true,
      maxlength: [100, 'Transaction reference cannot exceed 100 characters'],
      default: '',
    },

    receiptNumber: {
      type: String,
      trim: true,
      maxlength: [100, 'Receipt number cannot exceed 100 characters'],
      default: '',
    },

    receiptFile: {
      filename: {
        type: String,
        default: '',
      },

      originalName: {
        type: String,
        default: '',
      },

      path: {
        type: String,
        default: '',
      },

      mimeType: {
        type: String,
        enum: ['', 'image/jpeg', 'image/png', 'application/pdf'],
        default: '',
      },

      size: {
        type: Number,
        min: 0,
        default: 0,
      },
    },

    status: {
      type: String,
      enum: ['Draft', 'Approved'],
      default: 'Draft',
      index: true,
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

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserEnterPrise',
      default: null,
    },

    deletedAt: {
      type: Date,
      default: null,
    },

    expenseHistory: {
      type: [expenseHistorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
)

expenseSchema.index({
  companyId: 1,
  isDeleted: 1,
  expenseDate: -1,
})
expenseSchema.index({ companyId: 1, expenseNumber: 1 }, { unique: true })

expenseSchema.index({
  companyId: 1,
  expenseDate: -1,
})

expenseSchema.index({
  companyId: 1,
  expenseCategory: 1,
  expenseDate: -1,
})

expenseSchema.index({
  companyId: 1,
  status: 1,
  expenseDate: -1,
})

module.exports = mongoose.models.ExpenseMineERP || mongoose.model('ExpenseMineERP', expenseSchema)
