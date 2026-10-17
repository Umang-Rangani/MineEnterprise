const mongoose = require('mongoose')

const erpPermissionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Permission name is required'],
      trim: true,
      maxlength: 100,
    },

    key: {
      type: String,
      required: [true, 'Permission key is required'],
      trim: true,
      uppercase: true,
      match: [/^[A-Z][A-Z0-9_]*$/, 'Permission key must contain uppercase letters, numbers and underscores'],
    },

    module: {
      type: String,
      required: [true, 'Permission module is required'],
      trim: true,
      enum: ['DASHBOARD', 'USERS', 'ROLES', 'COMPANIES', 'PRODUCTS', 'INVENTORY', 'SALES', 'PURCHASES', 'ACCOUNTS', 'HR', 'REPORTS', 'SETTINGS'],
    },

    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: 500,
    },

    isSystem: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
)

erpPermissionSchema.index({ module: 1, key: 1 }, { unique: true })

const ErpPermission = mongoose.model('ErpPermission', erpPermissionSchema)

module.exports = ErpPermission
