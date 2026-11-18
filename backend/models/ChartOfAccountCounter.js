const mongoose = require('mongoose')

const chartOfAccountCounterSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CompanyEnterPrise',
      required: true,
    },
    lastNumber: {
      type: Number,
      required: true,
      default: 1000,
      min: 0,
    },
  },
  { timestamps: true },
)

chartOfAccountCounterSchema.index({ companyId: 1 }, { unique: true })

module.exports = mongoose.models.ChartOfAccountCounter || mongoose.model('ChartOfAccountCounter', chartOfAccountCounterSchema)
