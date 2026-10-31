const express = require('express')
const mongoose = require('mongoose')

const Supplier = require('../models/Supplier')
const authMiddleware = require('../middleware/authMiddleware')
const permissionMiddleware = require('../middleware/permissionMiddleware')
const Purchase = require('../models/Purchase')
const GoodsReceipt = require('../models/GoodsReceipt')

const router = express.Router()

router.use(authMiddleware)

const ALLOWED_FIELDS = ['supplierName', 'supplierCode', 'contactPerson', 'email', 'phone', 'alternatePhone', 'gstNumber', 'panNumber', 'address', 'city', 'state', 'pincode', 'country', 'paymentTerms', 'openingBalance', 'notes', 'status']

const getCompanyId = (req) => {
  if (req.user?.role === 'SuperAdmin') {
    return null
  }

  return req.company?._id || req.user?.companyId || null
}

const validateObjectId = (id) => mongoose.isValidObjectId(id)

const getSupplierPayload = (body = {}, fields = ALLOWED_FIELDS) => {
  const payload = {}

  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      payload[field] = body[field]
    }
  }

  return payload
}

const handleError = (error, res, next) => {
  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'Supplier code already exists in this company',
    })
  }

  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: error.message,
    })
  }

  return next(error)
}

// GET /erp/suppliers
router.get('/', permissionMiddleware('Supplier', 'LIST'), async (req, res, next) => {
  try {
    const companyId = getCompanyId(req)

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company context is required to list suppliers',
      })
    }

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)

    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 10))

    const search = String(req.query.search || '').trim()
    const status = String(req.query.status || '').trim()

    const filter = { companyId }

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

      const regex = new RegExp(escapedSearch, 'i')

      filter.$or = [{ supplierName: regex }, { supplierCode: regex }, { contactPerson: regex }, { email: regex }, { phone: regex }, { gstNumber: regex }]
    }

    if (status) {
      if (!['Active', 'Inactive'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Status must be Active or Inactive',
        })
      }

      filter.status = status
    }

    const [suppliers, total] = await Promise.all([
      Supplier.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      Supplier.countDocuments(filter),
    ])

    return res.status(200).json({
      success: true,
      suppliers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    return handleError(error, res, next)
  }
})

// POST /erp/suppliers
router.post('/', permissionMiddleware('Supplier', 'CREATE'), async (req, res, next) => {
  try {
    const companyId = getCompanyId(req)

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company context is required to create suppliers',
      })
    }

    const payload = getSupplierPayload(req.body)

    if (!String(payload.supplierName || '').trim() || !String(payload.supplierCode || '').trim()) {
      return res.status(400).json({
        success: false,
        message: 'Supplier name and supplier code are required',
      })
    }

    if (payload.status !== undefined && !['Active', 'Inactive'].includes(payload.status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be Active or Inactive',
      })
    }

    if (payload.openingBalance !== undefined && (!Number.isFinite(Number(payload.openingBalance)) || Number(payload.openingBalance) < 0)) {
      return res.status(400).json({
        success: false,
        message: 'Opening balance must be a valid non-negative number',
      })
    }

    const supplier = await Supplier.create({
      ...payload,
      companyId,
      createdBy: req.user.userId,
    })

    return res.status(201).json({
      success: true,
      message: 'Supplier created successfully',
      supplier,
    })
  } catch (error) {
    return handleError(error, res, next)
  }
})

// GET /erp/suppliers/:id
router.get('/:id', permissionMiddleware('Supplier', 'VIEW'), async (req, res, next) => {
  try {
    if (!validateObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid supplier ID',
      })
    }

    const companyId = getCompanyId(req)

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company context is required to view suppliers',
      })
    }

    const supplier = await Supplier.findOne({
      _id: req.params.id,
      companyId,
    }).lean()

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found',
      })
    }

    return res.status(200).json({
      success: true,
      supplier,
    })
  } catch (error) {
    return handleError(error, res, next)
  }
})

// GET /erp/suppliers/:id/purchase-history
router.get('/:id/purchase-history', permissionMiddleware('Purchase', 'LIST'), async (req, res, next) => {
  try {
    if (!validateObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid supplier ID',
      })
    }

    const companyId = getCompanyId(req)

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company context is required',
      })
    }

    const supplier = await Supplier.findOne({
      _id: req.params.id,
      companyId,
    })
      .select('_id supplierName supplierCode')
      .lean()

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found',
      })
    }

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)

    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 10))

    const purchaseFilter = {
      companyId,
      supplierId: supplier._id,
    }

    const receiptFilter = {
      companyId,
      supplierId: supplier._id,
      status: 'Confirmed',
    }

    const [purchases, totalPurchases, allPurchases, receipts] = await Promise.all([
      Purchase.find(purchaseFilter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('purchaseNumber purchaseDate status totalAmount paidAmount paymentStatus items createdAt')
        .lean(),

      Purchase.countDocuments(purchaseFilter),

      Purchase.find(purchaseFilter).select('status totalAmount paidAmount').lean(),

      GoodsReceipt.find(receiptFilter).select('receiptNumber purchaseId receiptDate items status').sort({ receiptDate: -1, _id: -1 }).lean(),
    ])

    // Cancelled orders are excluded from financial totals.
    const validPurchases = allPurchases.filter((purchase) => purchase.status !== 'Cancelled')

    const totalPurchaseValue = validPurchases.reduce((total, purchase) => total + (Number(purchase.totalAmount) || 0), 0)

    const totalPaid = validPurchases.reduce((total, purchase) => total + (Number(purchase.paidAmount) || 0), 0)

    const outstanding = Math.max(0, totalPurchaseValue - totalPaid)

    // Only confirmed receipts are included.
    let totalAcceptedQuantity = 0
    let totalDamagedQuantity = 0
    let totalReceivedValue = 0

    const productMap = new Map()

    for (const receipt of receipts) {
      for (const item of receipt.items || []) {
        const acceptedQuantity = Number(item.acceptedQuantity) || 0

        const damagedQuantity = Number(item.damagedQuantity) || 0

        const unitPrice = Number(item.unitPrice) || 0

        totalAcceptedQuantity += acceptedQuantity
        totalDamagedQuantity += damagedQuantity

        totalReceivedValue += acceptedQuantity * unitPrice

        const productKey = String(item.productId || item.sku || item.productName)

        if (!productMap.has(productKey)) {
          productMap.set(productKey, {
            productId: item.productId || null,
            productName: item.productName || 'Unknown Product',
            sku: item.sku || '',
            unit: item.unit || '',
            acceptedQuantity: 0,
            damagedQuantity: 0,
            receivedValue: 0,
          })
        }

        const product = productMap.get(productKey)

        product.acceptedQuantity += acceptedQuantity
        product.damagedQuantity += damagedQuantity
        product.receivedValue += acceptedQuantity * unitPrice
      }
    }

    return res.status(200).json({
      success: true,
      supplier,

      summary: {
        totalOrders: validPurchases.length,
        totalPurchaseValue,
        totalReceivedValue,
        totalPaid,
        outstanding,
        totalAcceptedQuantity,
        totalDamagedQuantity,
      },

      purchases,

      productSummary: Array.from(productMap.values()),

      receipts,

      pagination: {
        page,
        limit,
        total: totalPurchases,
        totalPages: Math.ceil(totalPurchases / limit),
      },
    })
  } catch (error) {
    return handleError(error, res, next)
  }
})

// PATCH /erp/suppliers/:id
router.patch('/:id', permissionMiddleware('Supplier', 'UPDATE'), async (req, res, next) => {
  try {
    if (!validateObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid supplier ID',
      })
    }

    const companyId = getCompanyId(req)

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company context is required to update suppliers',
      })
    }

    // Opening balance should not be changed through general edit.
    const payload = getSupplierPayload(
      req.body,
      ALLOWED_FIELDS.filter((field) => field !== 'openingBalance'),
    )

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Provide at least one field to update',
      })
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'supplierName') && !String(payload.supplierName || '').trim()) {
      return res.status(400).json({
        success: false,
        message: 'Supplier name cannot be empty',
      })
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'supplierCode') && !String(payload.supplierCode || '').trim()) {
      return res.status(400).json({
        success: false,
        message: 'Supplier code cannot be empty',
      })
    }

    if (payload.status !== undefined && !['Active', 'Inactive'].includes(payload.status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be Active or Inactive',
      })
    }

    const supplier = await Supplier.findOneAndUpdate(
      {
        _id: req.params.id,
        companyId,
      },
      {
        $set: {
          ...payload,
          updatedBy: req.user.userId,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    )

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Supplier updated successfully',
      supplier,
    })
  } catch (error) {
    return handleError(error, res, next)
  }
})

// PATCH /erp/suppliers/:id/status
router.patch('/:id/status', permissionMiddleware('Supplier', 'UPDATE_STATUS'), async (req, res, next) => {
  try {
    if (!validateObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid supplier ID',
      })
    }

    const companyId = getCompanyId(req)
    const { status } = req.body || {}

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company context is required to update supplier status',
      })
    }

    if (!['Active', 'Inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be Active or Inactive',
      })
    }

    const supplier = await Supplier.findOneAndUpdate(
      {
        _id: req.params.id,
        companyId,
      },
      {
        $set: {
          status,
          updatedBy: req.user.userId,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    )

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Supplier status updated successfully',
      supplier,
    })
  } catch (error) {
    return handleError(error, res, next)
  }
})

module.exports = router
