const mongoose = require('mongoose')

const salesCounterSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CompanyEnterPrise',
      required: true,
    },

    year: {
      type: Number,
      required: true,
    },

    lastNumber: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
)

salesCounterSchema.index({ companyId: 1, year: 1 }, { unique: true })

module.exports = mongoose.models.SalesCounterMineERP || mongoose.model('SalesCounterMineERP', salesCounterSchema)
