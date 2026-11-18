const mongoose = require('mongoose')

const journalEntryCounterSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CompanyEnterPrise',
      required: true,
      index: true,
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

journalEntryCounterSchema.index({ companyId: 1 }, { unique: true })

module.exports = mongoose.models.JournalEntryCounter || mongoose.model('JournalEntryCounter', journalEntryCounterSchema)
