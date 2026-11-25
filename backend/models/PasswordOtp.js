const mongoose = require('mongoose')

const passwordOtpSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserEnterPrise',
      required: true,
      index: true,
    },

    // SELF_SERVICE or ADMIN_EMPLOYEE_RESET
    purpose: {
      type: String,
      enum: ['SELF_SERVICE', 'ADMIN_EMPLOYEE_RESET'],
      default: 'SELF_SERVICE',
      required: true,
      index: true,
    },

    // User who requested the reset.
    // Null for existing self-service flow.
    requestedById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserEnterPrise',
      default: null,
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

passwordOtpSchema.index({ userId: 1, purpose: 1, createdAt: -1 })

passwordOtpSchema.index({ requestedById: 1, userId: 1, purpose: 1, createdAt: -1 })

module.exports = mongoose.models.PasswordOtp || mongoose.model('PasswordOtp', passwordOtpSchema)
