const mongoose = require('mongoose')

const passwordOtpSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserEnterPrise',
      required: true,
      index: true,
    },

    otpHash: {
      type: String,
      required: true,
      select: false,
    },

    expiresAt: {
      type: Date,
      required: true,
      expires: 0,
    },

    attempts: {
      type: Number,
      default: 0,
    },

    verifiedAt: {
      type: Date,
      default: null,
    },

    consumedAt: {
      type: Date,
      default: null,
    },

    lastSentAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  },
)

passwordOtpSchema.index({ userId: 1, createdAt: -1 })

module.exports = mongoose.models.PasswordOtp || mongoose.model('PasswordOtp', passwordOtpSchema)
