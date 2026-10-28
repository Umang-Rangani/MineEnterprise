const express = require('express')
const mongoose = require('mongoose')

const Purchase = require('../models/Purchase')
const PurchaseCounter = require('../models/PurchaseCounter')
const Product = require('../models/Product')
const Supplier = require('../models/Supplier')

const authMiddleware = require('../middleware/authMiddleware')
const permissionMiddleware = require('../middleware/permissionMiddleware')

const router = express.Router()

router.use(authMiddleware)

const PURCHASE_STATUSES = ['Draft', 'Ordered', 'Partially Received', 'Received', 'Cancelled']

const MAX_ITEMS = 500
const MAX_EXPORT_RECORDS = 10000

function getCompanyId(req, res) {
  const companyId = req.user?.companyId

  if (!companyId || !mongoose.isValidObjectId(companyId)) {
    res.status(403).json({
      success: false,
      message: 'Valid company access is required.',
    })
    return null
  }

  return new mongoose.Types.ObjectId(String(companyId))
}

function getUserId(req) {
  return req.user?.userId || req.user?._id || req.user?.id
}

function isValidNumber(value, min = 0) {
  return value !== '' && value !== null && value !== undefined && typeof value !== 'boolean' && Number.isFinite(Number(value)) && Number(value) >= min
}

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function sendKnownError(res, error, next) {
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: error.message,
    })
  }

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'Duplicate purchase number detected. Please retry.',
    })
  }

  return next(error)
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildPurchaseFilter(req, companyId, res) {
  const filter = { companyId }

  if (req.query.status) {
    if (!PURCHASE_STATUSES.includes(req.query.status)) {
      res.status(400).json({
        success: false,
        message: 'Invalid purchase status.',
      })
      return null
    }

    filter.status = req.query.status
  }

  if (req.query.supplierId) {
    if (!mongoose.isValidObjectId(req.query.supplierId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid supplier ID.',
      })
      return null
    }

    filter.supplierId = req.query.supplierId
  }

  if (req.query.search) {
    const search = String(req.query.search).trim()

    if (search.length > 150) {
      res.status(400).json({
        success: false,
        message: 'Search text is too long.',
      })
      return null
    }

    const escaped = escapeRegex(search)

    filter.$or = [{ purchaseNumber: { $regex: escaped, $options: 'i' } }, { supplierName: { $regex: escaped, $options: 'i' } }]
  }

  return filter
}

async function generatePurchaseNumber(companyId) {
  const counter = await PurchaseCounter.findOneAndUpdate(
    {
      companyId,
      name: 'purchase',
    },
    {
      $inc: { sequence: 1 },
      $setOnInsert: {
        companyId,
        name: 'purchase',
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  )

  return `PUR-${String(counter.sequence).padStart(6, '0')}`
}

/**
 * Validates purchase input and calculates all item totals.
 * Does not modify inventory.
 */
async function buildPurchaseData(body, companyId, res) {
  const { supplierId, purchaseDate, expectedDeliveryDate, items, discountAmount = 0, shippingCharges = 0, adjustmentAmount = 0, notes = '' } = body || {}

  if (!mongoose.isValidObjectId(supplierId)) {
    res.status(400).json({
      success: false,
      message: 'A valid supplier is required.',
    })
    return null
  }

  const supplier = await Supplier.findOne({
    _id: supplierId,
    companyId,
    status: 'Active',
  }).select('_id supplierName')

  if (!supplier) {
    res.status(400).json({
      success: false,
      message: 'Supplier must be active and belong to your company.',
    })
    return null
  }

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({
      success: false,
      message: 'At least one purchase item is required.',
    })
    return null
  }

  if (items.length > MAX_ITEMS) {
    res.status(400).json({
      success: false,
      message: `A purchase cannot contain more than ${MAX_ITEMS} items.`,
    })
    return null
  }

  if (!isValidNumber(discountAmount) || !isValidNumber(shippingCharges)) {
    res.status(400).json({
      success: false,
      message: 'Discount and shipping charges must be non-negative numbers.',
    })
    return null
  }

  if (!isValidNumber(adjustmentAmount) && !(typeof adjustmentAmount === 'number' && Number.isFinite(adjustmentAmount))) {
    res.status(400).json({
      success: false,
      message: 'Adjustment amount must be a valid number.',
    })
    return null
  }

  if (typeof notes !== 'string' || notes.length > 2000) {
    res.status(400).json({
      success: false,
      message: 'Notes must be text and cannot exceed 2000 characters.',
    })
    return null
  }

  const normalizedPurchaseDate = purchaseDate === undefined ? new Date() : new Date(purchaseDate)

  if (Number.isNaN(normalizedPurchaseDate.getTime())) {
    res.status(400).json({
      success: false,
      message: 'Invalid purchase date.',
    })
    return null
  }

  let normalizedExpectedDate = null

  if (expectedDeliveryDate !== undefined && expectedDeliveryDate !== null && expectedDeliveryDate !== '') {
    normalizedExpectedDate = new Date(expectedDeliveryDate)

    if (Number.isNaN(normalizedExpectedDate.getTime())) {
      res.status(400).json({
        success: false,
        message: 'Invalid expected delivery date.',
      })
      return null
    }

    if (normalizedExpectedDate < normalizedPurchaseDate) {
      res.status(400).json({
        success: false,
        message: 'Expected delivery date cannot precede purchase date.',
      })
      return null
    }
  }

  const seenProductIds = new Set()

  for (const item of items) {
    if (!item || !mongoose.isValidObjectId(item.productId)) {
      res.status(400).json({
        success: false,
        message: 'Every item must have a valid product ID.',
      })
      return null
    }

    const productKey = String(item.productId)

    if (seenProductIds.has(productKey)) {
      res.status(400).json({
        success: false,
        message: 'A product can only appear once. Combine its quantities.',
      })
      return null
    }

    seenProductIds.add(productKey)

    if (!isValidNumber(item.quantity, 0.001)) {
      res.status(400).json({
        success: false,
        message: 'Item quantity must be greater than zero.',
      })
      return null
    }

    if (item.unitPrice !== undefined && !isValidNumber(item.unitPrice)) {
      res.status(400).json({
        success: false,
        message: 'Unit price must be non-negative.',
      })
      return null
    }

    if (item.discountAmount !== undefined && !isValidNumber(item.discountAmount)) {
      res.status(400).json({
        success: false,
        message: 'Item discount must be non-negative.',
      })
      return null
    }

    if (item.taxRate !== undefined && (!isValidNumber(item.taxRate) || Number(item.taxRate) > 100)) {
      res.status(400).json({
        success: false,
        message: 'Item tax rate must be between 0 and 100.',
      })
      return null
    }
  }

  const productIds = items.map((item) => item.productId)

  const products = await Product.find({
    _id: { $in: productIds },
    companyId,
    status: 'Active',
  }).select('_id name sku unit costPrice taxRate')

  if (products.length !== items.length) {
    res.status(400).json({
      success: false,
      message: 'Every product must be active and belong to your company.',
    })
    return null
  }

  const productMap = new Map(products.map((product) => [String(product._id), product]))

  const normalizedItems = []
  let subtotal = 0
  let itemDiscountTotal = 0
  let taxTotal = 0

  for (const item of items) {
    const product = productMap.get(String(item.productId))
    const quantity = Number(item.quantity)

    const unitPrice = item.unitPrice === undefined ? Number(product.costPrice || 0) : Number(item.unitPrice)

    const taxRate = item.taxRate === undefined ? Number(product.taxRate || 0) : Number(item.taxRate)

    const lineDiscount = Number(item.discountAmount || 0)
    const grossAmount = roundMoney(quantity * unitPrice)

    if (!Number.isFinite(grossAmount) || !Number.isFinite(taxRate) || !Number.isFinite(lineDiscount)) {
      res.status(400).json({
        success: false,
        message: `Invalid item calculation for ${product.name}.`,
      })
      return null
    }

    if (lineDiscount > grossAmount) {
      res.status(400).json({
        success: false,
        message: `Discount cannot exceed the amount for ${product.name}.`,
      })
      return null
    }

    const taxableAmount = roundMoney(grossAmount - lineDiscount)
    const taxAmount = roundMoney((taxableAmount * taxRate) / 100)
    const lineTotal = roundMoney(taxableAmount + taxAmount)

    subtotal = roundMoney(subtotal + grossAmount)
    itemDiscountTotal = roundMoney(itemDiscountTotal + lineDiscount)
    taxTotal = roundMoney(taxTotal + taxAmount)

    normalizedItems.push({
      productId: product._id,
      productName: product.name,
      sku: product.sku,
      unit: product.unit || 'Piece',
      quantity,
      receivedQuantity: 0,
      unitPrice,
      taxRate,
      discountAmount: lineDiscount,
      taxableAmount,
      taxAmount,
      lineTotal,
    })
  }

  const purchaseDiscount = Number(discountAmount)
  const shipping = Number(shippingCharges)
  const adjustment = Number(adjustmentAmount)

  const availableAfterItemDiscount = roundMoney(subtotal - itemDiscountTotal)

  if (purchaseDiscount > availableAfterItemDiscount) {
    res.status(400).json({
      success: false,
      message: 'Purchase discount exceeds the remaining item amount.',
    })
    return null
  }

  const totalAmount = roundMoney(availableAfterItemDiscount - purchaseDiscount + taxTotal + shipping + adjustment)

  if (!Number.isFinite(totalAmount) || totalAmount < 0) {
    res.status(400).json({
      success: false,
      message: 'Purchase total must be a valid non-negative amount.',
    })
    return null
  }

  return {
    supplierId: supplier._id,
    supplierName: supplier.supplierName,
    purchaseDate: normalizedPurchaseDate,
    expectedDeliveryDate: normalizedExpectedDate,
    items: normalizedItems,
    subtotal,
    discountAmount: roundMoney(itemDiscountTotal + purchaseDiscount),
    taxAmount: taxTotal,
    shippingCharges: shipping,
    adjustmentAmount: adjustment,
    totalAmount,
    notes: notes.trim(),
  }
}

// GET /erp/purchases
router.get('/', permissionMiddleware('Purchase', 'LIST'), async (req, res, next) => {
  try {
    const companyId = getCompanyId(req, res)
    if (!companyId) return

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)

    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20))

    const filter = buildPurchaseFilter(req, companyId, res)
    if (!filter) return

    const [purchases, total] = await Promise.all([
      Purchase.find(filter)
        .sort({ purchaseDate: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('supplierId', 'supplierName supplierCode')
        .lean(),

      Purchase.countDocuments(filter),
    ])

    return res.status(200).json({
      success: true,
      purchases,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    return sendKnownError(res, error, next)
  }
})

// GET /erp/purchases/export
router.get('/export', permissionMiddleware('Purchase', 'EXPORT'), async (req, res, next) => {
  try {
    const companyId = getCompanyId(req, res)
    if (!companyId) return

    const filter = buildPurchaseFilter(req, companyId, res)
    if (!filter) return

    const purchases = await Purchase.find(filter)
      .select('purchaseNumber supplierName purchaseDate expectedDeliveryDate subtotal discountAmount taxAmount shippingCharges adjustmentAmount totalAmount paidAmount paymentStatus status notes')
      .sort({ purchaseDate: -1, _id: -1 })
      .limit(MAX_EXPORT_RECORDS + 1)
      .lean()

    if (purchases.length > MAX_EXPORT_RECORDS) {
      return res.status(400).json({
        success: false,
        message: 'More than 10,000 records match. Apply filters and download smaller batches.',
      })
    }

    const escapeCsv = (value, protectFormula = false) => {
      let text = value == null ? '' : String(value)

      if (protectFormula && /^[\s]*[=+\-@]/.test(text)) {
        text = `'${text}`
      }

      return `"${text.replace(/"/g, '""')}"`
    }

    const formatDate = (value) => {
      if (!value) return ''

      const date = new Date(value)

      return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
    }

    const columns = [
      ['Purchase Number', (p) => p.purchaseNumber, true],
      ['Supplier', (p) => p.supplierName, true],
      ['Purchase Date', (p) => formatDate(p.purchaseDate), false],
      ['Expected Delivery Date', (p) => formatDate(p.expectedDeliveryDate), false],
      ['Subtotal', (p) => p.subtotal, false],
      ['Discount', (p) => p.discountAmount, false],
      ['Tax', (p) => p.taxAmount, false],
      ['Shipping Charges', (p) => p.shippingCharges, false],
      ['Adjustment', (p) => p.adjustmentAmount, false],
      ['Total Amount', (p) => p.totalAmount, false],
      ['Paid Amount', (p) => p.paidAmount, false],
      ['Payment Status', (p) => p.paymentStatus, true],
      ['Purchase Status', (p) => p.status, true],
      ['Notes', (p) => p.notes, true],
    ]

    const header = columns.map(([heading]) => escapeCsv(heading, true)).join(',')

    const rows = purchases.map((purchase) => columns.map(([, getValue, protectFormula]) => escapeCsv(getValue(purchase), protectFormula)).join(','))

    const csv = '\uFEFF' + [header, ...rows].join('\r\n')

    const filename = `purchases-${new Date().toISOString().slice(0, 10)}.csv`

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Cache-Control', 'no-store')

    return res.status(200).send(csv)
  } catch (error) {
    return sendKnownError(res, error, next)
  }
})

// GET /erp/purchases/:id
router.get('/:id', permissionMiddleware('Purchase', 'VIEW'), async (req, res, next) => {
  try {
    const companyId = getCompanyId(req, res)
    if (!companyId) return

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid purchase ID.',
      })
    }

    const purchase = await Purchase.findOne({
      _id: req.params.id,
      companyId,
    })
      .populate('supplierId', 'supplierName supplierCode email phone')
      .populate('items.productId', 'name sku unit')
      .lean()

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found.',
      })
    }

    return res.status(200).json({
      success: true,
      purchase,
    })
  } catch (error) {
    return sendKnownError(res, error, next)
  }
})

// POST /erp/purchases
router.post('/', permissionMiddleware('Purchase', 'CREATE'), async (req, res, next) => {
  try {
    const companyId = getCompanyId(req, res)
    if (!companyId) return

    const userId = getUserId(req)

    if (!userId || !mongoose.isValidObjectId(userId)) {
      return res.status(401).json({
        success: false,
        message: 'Authenticated user ID is missing.',
      })
    }

    const data = await buildPurchaseData(req.body, companyId, res)
    if (!data) return

    const purchaseNumber = await generatePurchaseNumber(companyId)

    const purchase = await Purchase.create({
      companyId,
      purchaseNumber,
      ...data,
      paidAmount: 0,
      paymentStatus: 'Unpaid',
      status: 'Draft',
      createdBy: userId,
    })

    return res.status(201).json({
      success: true,
      message: 'Purchase created successfully. Inventory has not been changed.',
      purchase,
    })
  } catch (error) {
    return sendKnownError(res, error, next)
  }
})

// PATCH /erp/purchases/:id
// Only Draft purchases can be edited.
router.patch('/:id', permissionMiddleware('Purchase', 'UPDATE'), async (req, res, next) => {
  try {
    const companyId = getCompanyId(req, res)
    if (!companyId) return

    const userId = getUserId(req)

    if (!userId || !mongoose.isValidObjectId(userId)) {
      return res.status(401).json({
        success: false,
        message: 'Authenticated user ID is missing.',
      })
    }

    const { id } = req.params

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid purchase ID.',
      })
    }

    const existingPurchase = await Purchase.findOne({
      _id: id,
      companyId,
    }).select('_id status paidAmount paymentStatus')

    if (!existingPurchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found.',
      })
    }

    if (existingPurchase.status !== 'Draft') {
      return res.status(409).json({
        success: false,
        message: 'Only Draft purchases can be edited.',
      })
    }

    // Do not allow clients to alter payment fields or status.
    const data = await buildPurchaseData(req.body, companyId, res)
    if (!data) return

    existingPurchase.set({
      ...data,
      updatedBy: userId,
    })

    await existingPurchase.save()

    const purchase = await Purchase.findOne({
      _id: id,
      companyId,
    })
      .populate('supplierId', 'supplierName supplierCode')
      .lean()

    return res.status(200).json({
      success: true,
      message: 'Draft purchase updated successfully. Inventory has not been changed.',
      purchase,
    })
  } catch (error) {
    return sendKnownError(res, error, next)
  }
})

// PATCH /erp/purchases/:id/approve
// Approval transitions Draft -> Ordered.
router.patch('/:id/approve', permissionMiddleware('Purchase', 'APPROVE'), async (req, res, next) => {
  try {
    const companyId = getCompanyId(req, res)
    if (!companyId) return

    const userId = getUserId(req)

    if (!userId || !mongoose.isValidObjectId(userId)) {
      return res.status(401).json({
        success: false,
        message: 'Authenticated user ID is missing.',
      })
    }

    const { id } = req.params

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid purchase ID.',
      })
    }

    const purchase = await Purchase.findOneAndUpdate(
      {
        _id: id,
        companyId,
        status: 'Draft',
      },
      {
        $set: {
          status: 'Ordered',
          updatedBy: userId,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    )
      .populate('supplierId', 'supplierName supplierCode')
      .lean()

    if (purchase) {
      return res.status(200).json({
        success: true,
        message: 'Purchase approved successfully. Inventory has not been changed.',
        purchase,
      })
    }

    const existingPurchase = await Purchase.findOne({
      _id: id,
      companyId,
    })
      .select('_id status')
      .lean()

    if (!existingPurchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found.',
      })
    }

    return res.status(409).json({
      success: false,
      message: `Only Draft purchases can be approved. Current status: "${existingPurchase.status}".`,
    })
  } catch (error) {
    return sendKnownError(res, error, next)
  }
})

// PATCH /erp/purchases/:id/cancel
router.patch('/:id/cancel', permissionMiddleware('Purchase', 'CANCEL'), async (req, res, next) => {
  try {
    const companyId = getCompanyId(req, res)
    if (!companyId) return

    const userId = getUserId(req)

    if (!userId || !mongoose.isValidObjectId(userId)) {
      return res.status(401).json({
        success: false,
        message: 'Authenticated user ID is missing.',
      })
    }

    const { id } = req.params

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid purchase ID.',
      })
    }

    const purchase = await Purchase.findOneAndUpdate(
      {
        _id: id,
        companyId,
        status: { $in: ['Draft', 'Ordered'] },
      },
      {
        $set: {
          status: 'Cancelled',
          updatedBy: userId,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    )
      .populate('supplierId', 'supplierName supplierCode')
      .lean()

    if (purchase) {
      return res.status(200).json({
        success: true,
        message: 'Purchase cancelled successfully. Inventory has not been changed.',
        purchase,
      })
    }

    const existingPurchase = await Purchase.findOne({
      _id: id,
      companyId,
    })
      .select('_id status')
      .lean()

    if (!existingPurchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found.',
      })
    }

    return res.status(409).json({
      success: false,
      message: `Purchase with status "${existingPurchase.status}" cannot be cancelled through this API.`,
    })
  } catch (error) {
    return sendKnownError(res, error, next)
  }
})

module.exports = router
