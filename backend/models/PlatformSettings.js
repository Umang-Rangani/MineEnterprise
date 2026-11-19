const mongoose = require('mongoose')

const platformSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: 'platform',
      unique: true,
      required: true,
      immutable: true,
    },

    defaultCurrency: {
      type: String,
      default: 'INR',
      trim: true,
      uppercase: true,
    },

    timezone: {
      type: String,
      default: 'Asia/Kolkata',
      trim: true,
    },

    dateFormat: {
      type: String,
      enum: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'],
      default: 'DD/MM/YYYY',
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

platformSettingsSchema.index({ key: 1 }, { unique: true })

module.exports = mongoose.models.PlatformSettingsMineERP || mongoose.model('PlatformSettingsMineERP', platformSettingsSchema)
