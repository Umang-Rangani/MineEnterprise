const mongoose = require('mongoose')

const journalEntryLineSchema = new mongoose.Schema(
  {
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChartOfAccount',
      required: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },

    debit: {
      type: Number,
      min: 0,
      default: 0,
    },

    credit: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  {
    _id: true,
  },
)

const journalEntrySchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CompanyEnterPrise',
      required: true,
      index: true,
    },

    journalNumber: {
      type: String,
      required: true,
      trim: true,
    },

    entryDate: {
      type: Date,
      required: true,
    },

    referenceNumber: {
      type: String,
      trim: true,
      maxlength: 100,
      default: '',
    },

    narration: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    lines: {
      type: [journalEntryLineSchema],
      required: true,
      validate: {
        validator: (lines) => lines.length >= 2,
        message: 'Journal entry must contain at least two lines.',
      },
    },

    totalDebit: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    totalCredit: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    status: {
      type: String,
      enum: ['Draft', 'Posted', 'Cancelled'],
      default: 'Draft',
      index: true,
    },

    sourceType: {
      type: String,
      enum: ['Manual', 'Purchase', 'GoodsReceipt', 'OpeningStock', 'Sales', 'SalesDispatch', 'Invoice', 'Payment', 'Expense', 'Reversal'],
      default: 'Manual',
      index: true,
    },

    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    reversalOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JournalEntry',
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserEnterPrise',
      default: null,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserEnterPrise',
      default: null,
    },

    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserEnterPrise',
      default: null,
    },

    postedAt: {
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
      maxlength: 500,
      default: '',
    },
  },
  {
    timestamps: true,
  },
)

journalEntrySchema.index({ companyId: 1, journalNumber: 1 }, { unique: true })

journalEntrySchema.index({
  companyId: 1,
  entryDate: -1,
  status: 1,
})

journalEntrySchema.index({
  companyId: 1,
  sourceType: 1,
  sourceId: 1,
})

module.exports = mongoose.models.JournalEntry || mongoose.model('JournalEntry', journalEntrySchema)
