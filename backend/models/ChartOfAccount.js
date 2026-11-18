const mongoose = require('mongoose')

const chartOfAccountSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CompanyEnterPrise',
      required: true,
      index: true,
    },

    accountCode: {
      type: String,
      required: true,
      trim: true,
    },

    accountName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    accountType: {
      type: String,
      required: true,
      enum: ['Asset', 'Liability', 'Equity', 'Income', 'Expense'],
    },

    accountSubType: {
      type: String,
      trim: true,
      default: '',
      maxlength: 100,
    },

    parentAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChartOfAccount',
      default: null,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },

    openingBalance: {
      type: Number,
      default: 0,
      min: 0,
    },

    openingBalanceType: {
      type: String,
      enum: ['Debit', 'Credit'],
      default: 'Debit',
    },

    isSystem: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
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
  },
  { timestamps: true },
)

chartOfAccountSchema.index({ companyId: 1, accountCode: 1 }, { unique: true })

chartOfAccountSchema.index({
  companyId: 1,
  accountType: 1,
  isActive: 1,
})

chartOfAccountSchema.index({
  companyId: 1,
  parentAccount: 1,
})

module.exports = mongoose.models.ChartOfAccount || mongoose.model('ChartOfAccount', chartOfAccountSchema)
