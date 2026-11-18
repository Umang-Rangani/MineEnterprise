const mongoose = require('mongoose')

const paymentSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CompanyEnterPrise',
      required: true,
      index: true,
    },

    paymentNumber: {
      type: String,
      required: true,
      trim: true,
    },

    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InvoiceMineERP',
      required: true,
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CustomerMineERP',
      required: true,
    },

    paymentDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    amount: {
      type: Number,
      required: true,
      min: [0.01, 'Payment amount must be greater than zero.'],
    },

    paymentMode: {
      type: String,
      enum: ['Cash', 'Bank Transfer', 'UPI', 'Cheque'],
      required: true,
    },

    transactionReference: {
      type: String,
      trim: true,
      default: '',
      maxlength: [100, 'Transaction reference cannot exceed 100 characters.'],
    },

    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters.'],
      default: '',
    },

    status: {
      type: String,
      enum: ['Completed', 'Refunded', 'Partially Refunded'],
      default: 'Completed',
      index: true,
    },

    refundedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    refundHistory: [
      {
        amount: {
          type: Number,
          required: true,
          min: 0.01,
        },

        refundDate: {
          type: Date,
          required: true,
          default: Date.now,
        },

        reason: {
          type: String,
          required: true,
          trim: true,
          maxlength: 500,
        },

        refundedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'UserEnterPrise',
          required: true,
        },
      },
    ],

    recordedBy: {
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

// INDEXES
paymentSchema.index({ companyId: 1, paymentNumber: 1 }, { unique: true })

paymentSchema.index({
  companyId: 1,
  invoiceId: 1,
  paymentDate: -1,
})

paymentSchema.index({
  companyId: 1,
  customerId: 1,
  paymentDate: -1,
})

paymentSchema.index({
  companyId: 1,
  status: 1,
  paymentDate: -1,
})

module.exports = mongoose.models.PaymentMineERP || mongoose.model('PaymentMineERP', paymentSchema)
