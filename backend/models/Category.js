const mongoose = require('mongoose')

const categorySchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CompanyEnterPrise',
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: [true, 'Category name is required.'],
      trim: true,
      maxlength: [100, 'Category name cannot exceed 100 characters.'],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters.'],
      default: '',
    },

    code: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: [40, 'Category code cannot exceed 40 characters.'],
      default: '',
    },

    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserEnterPrise',
      required: true,
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

categorySchema.index({ companyId: 1, name: 1 })
categorySchema.index({ companyId: 1, code: 1 })

module.exports = mongoose.models.CategoryEnterPrise || mongoose.model('CategoryEnterPrise', categorySchema)
