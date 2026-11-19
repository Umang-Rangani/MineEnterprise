const mongoose = require('mongoose')

const actorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserEnterPrise',
      default: null,
    },
    name: {
      type: String,
      default: '',
      trim: true,
    },
    email: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
    },
    role: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: false },
)

const targetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserEnterPrise',
      default: null,
    },
    name: {
      type: String,
      default: '',
      trim: true,
    },
    email: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
    },
    role: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: false },
)

const companySchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CompanyEnterPrise',
      default: null,
    },
    companyName: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: false },
)

const systemActivitySchema = new mongoose.Schema(
  {
    actor: {
      type: actorSchema,
      default: () => ({}),
    },

    target: {
      type: targetSchema,
      default: null,
    },

    company: {
      type: companySchema,
      default: null,
    },

    action: {
      type: String,
      required: true,
      enum: ['SUPERADMIN_SETUP', 'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'COMPANY_REGISTERED', 'COMPANY_APPROVED', 'COMPANY_REJECTED', 'USER_ACTIVATED', 'USER_DEACTIVATED'],
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    ipAddress: {
      type: String,
      default: '',
      trim: true,
    },

    userAgent: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  },
)

systemActivitySchema.index({ createdAt: -1 })
systemActivitySchema.index({ action: 1, createdAt: -1 })
systemActivitySchema.index({ 'company.companyId': 1, createdAt: -1 })
systemActivitySchema.index({ 'actor.userId': 1, createdAt: -1 })

module.exports = mongoose.models.SystemActivityMineERP || mongoose.model('SystemActivityMineERP', systemActivitySchema)
