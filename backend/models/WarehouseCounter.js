const mongoose = require('mongoose')

const warehouseCounterSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CompanyEnterPrise',
      required: true,
      unique: true,
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

module.exports = mongoose.models.WarehouseCounterMineERP || mongoose.model('WarehouseCounterMineERP', warehouseCounterSchema)
