const mongoose = require('mongoose')

const assignedRoleSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Predefined', 'Custom'],
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    customRoleId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
  },
  {
    _id: false,
  },
)

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

    roles: {
      type: [assignedRoleSchema],
      default: [],
    },

    permissionOverrides: {
      type: [String],
      default: undefined,
    },

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CompanyEnterPrise',
      default: null,
      index: true,
    },

    // Employee's default warehouse
    defaultWarehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WarehouseMineERP',
      default: null,
      index: true,
    },

    // Warehouses assigned to the employee
    assignedWarehouses: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'WarehouseMineERP',
        },
      ],
      default: [],
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
