const mongoose = require('mongoose')

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    phone: {
      type: String,
      default: '',
      trim: true,
    },

    role: {
      type: String,
      enum: ['SuperAdmin', 'CompanyAdmin', 'Employee', 'User'],
      default: 'User',
    },

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CompanyEnterPrise',
      default: null,
      index: true,
    },

    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
  },
  {
    timestamps: true,
  },
)

module.exports = mongoose.models.UserEnterPrise || mongoose.model('UserEnterPrise', userSchema)
