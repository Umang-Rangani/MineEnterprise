const mongoose = require('mongoose')

const purchaseCounterSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CompanyEnterPrise',
      required: [true, 'Company is required'],
    },

    name: {
      type: String,
      required: true,
      trim: true,
      default: 'purchase',
    },

    sequence: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
)

purchaseCounterSchema.index({ companyId: 1, name: 1 }, { unique: true })

module.exports = mongoose.models.PurchaseCounterMineERP || mongoose.model('PurchaseCounterMineERP', purchaseCounterSchema)
