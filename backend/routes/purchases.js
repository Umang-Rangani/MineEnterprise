const express = require('express')
const mongoose = require('mongoose')

const Purchase = require('../models/Purchase')
const PurchaseCounter = require('../models/PurchaseCounter')
const Product = require('../models/Product')
const Supplier = require('../models/Supplier')

const authMiddleware = require('../middleware/authMiddleware')
const permissionMiddleware = require('../middleware/permissionMiddleware')

const { sendEmail } = require('../utils/sendEmail')
const purchaseOrderEmail = require('../utils/emailTemplates/purchaseOrderEmail')
const purchaseCancellationEmail = require('../utils/emailTemplates/purchaseCancellationEmail')

const router = express.Router()

router.use(authMiddleware)

const PURCHASE_STATUSES = ['Draft', 'Ordered', 'Partially Received', 'Received', 'Cancelled']

const MAX_ITEMS = 500
const MAX_EXPORT_RECORDS = 10000

// Common helpers

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

function formatEmailDate(value) {
  if (!value) return ''

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return ''

  return date.toISOString().slice(0, 10)
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

function getAuthenticatedUserId(req, res) {
  const userId = getUserId(req)

  if (!userId || !mongoose.isValidObjectId(userId)) {
    res.status(401).json({
      success: false,
      message: 'Authenticated user ID is missing.',
    })
    return null
  }

  return new mongoose.Types.ObjectId(String(userId))
}

function validatePurchaseId(id, res) {
  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({
      success: false,
      message: 'Invalid purchase ID.',
    })
    return false
  }

  return true
}

// Email helpers

function buildPurchaseEmailData(purchase, companyName = 'Your company') {
  const supplier = purchase.supplierId

  return {
    supplierName: supplier?.supplierName || purchase.supplierName,
    companyName,
    purchaseNumber: purchase.purchaseNumber,
    purchaseDate: formatEmailDate(purchase.purchaseDate),
    expectedDeliveryDate: formatEmailDate(purchase.expectedDeliveryDate),
    currency: 'INR',

    items: (purchase.items || []).map((item) => ({
      productName: item.productName,
      sku: item.sku || '',
      quantity: item.quantity,
      unit: item.unit || 'Piece',
      unitPrice: item.unitPrice,
      total: item.lineTotal,
    })),

    subtotal: purchase.subtotal,
    discountAmount: purchase.discountAmount,
    taxAmount: purchase.taxAmount,
    shippingCharges: purchase.shippingCharges,
    adjustmentAmount: purchase.adjustmentAmount,
    totalAmount: purchase.totalAmount,
    notes: purchase.notes || '',
  }
}

function buildOrderEmail(purchase) {
  return purchaseOrderEmail(buildPurchaseEmailData(purchase))
}

function buildCancellationEmail(purchase) {
  return purchaseCancellationEmail(buildPurchaseEmailData(purchase))
}

function getEmailResponse(email) {
  return {
    status: email.status,
    message: email.message,
  }
}

/**
 * Email attempts are recorded in purchaseHistory.
 * Email delivery failure does not reverse a status transition.
 *
 * historyId identifies the exact history event, so concurrent email
 * attempts cannot overwrite the result of another history event.
 */
async function sendAndRecordEmail({ purchaseId, companyId, emailType, to, subject, html, historyId }) {
  const isOrderEmail = emailType === 'order'

  const statusField = isOrderEmail ? 'orderEmailStatus' : 'cancellationEmailStatus'

  const sentAtField = isOrderEmail ? 'orderEmailSentAt' : 'cancellationEmailSentAt'

  const errorField = isOrderEmail ? 'orderEmailError' : 'cancellationEmailError'

  let emailStatus = 'Failed'
  let sentAt = null
  let emailError = ''

  if (!to || typeof to !== 'string' || !to.trim()) {
    emailError = 'Supplier email address is missing.'
  } else {
    try {
      await sendEmail({
        to: to.trim(),
        subject,
        html,
      })

      emailStatus = 'Sent'
      sentAt = new Date()
    } catch (error) {
      emailError = String(error?.message || 'Email delivery failed.').slice(0, 1000)

      console.error('Purchase email delivery failed:', {
        emailType,
        code: error?.code,
        responseCode: error?.responseCode,
        message: emailError,
      })
    }
  }

  const updatedPurchase = await Purchase.findOneAndUpdate(
    {
      _id: purchaseId,
      companyId,
      purchaseHistory: {
        $elemMatch: { _id: historyId },
      },
    },
    {
      $set: {
        [statusField]: emailStatus,
        [sentAtField]: sentAt,
        [errorField]: emailError,
        'purchaseHistory.$[event].emailStatus': emailStatus,
        'purchaseHistory.$[event].emailError': emailError,
      },
    },
    {
      new: true,
      runValidators: true,
      arrayFilters: [{ 'event._id': historyId }],
    },
  )
    .populate('supplierId', 'supplierName supplierCode email phone')
    .lean()

  if (!updatedPurchase) {
    throw new Error('Email result could not be saved. Check the purchase history before retrying.')
  }

  return {
    status: emailStatus.toLowerCase(),
    message: emailStatus === 'Sent' ? 'Email sent successfully.' : emailError,
    purchase: updatedPurchase,
  }
}

/**
 * Add an email-attempt history entry before sending the email.
 * This means a Pending entry exists even if the process stops mid-attempt.
 */

async function createEmailHistory({ purchaseId, companyId, userId, action, fromStatus, toStatus, emailType }) {
  const historyId = new mongoose.Types.ObjectId()

  // Step 1: Fetch current purchase
  const currentPurchase = await Purchase.findOne({
    _id: purchaseId,
    companyId,
  })
    .select('purchaseNumber purchaseDate expectedDeliveryDate supplierName items subtotal discountAmount taxAmount shippingCharges adjustmentAmount totalAmount paidAmount paymentStatus notes status')
    .lean()

  if (!currentPurchase) {
    throw new Error('Purchase not found while recording email history.')
  }

  // Step 2: Create snapshot
  const snapshot = buildPurchaseSnapshot(currentPurchase)

  // Step 3: Save email history with snapshot
  const purchase = await Purchase.findOneAndUpdate(
    {
      _id: purchaseId,
      companyId,
    },
    {
      $push: {
        purchaseHistory: {
          _id: historyId,
          action,
          fromStatus,
          toStatus,
          performedBy: userId,
          performedAt: new Date(),
          emailType,
          emailStatus: 'Pending',
          emailError: '',
          snapshot,
        },
      },
    },
    {
      new: true,
      runValidators: true,
    },
  )

  if (!purchase) {
    throw new Error('Purchase not found while recording email history.')
  }

  return historyId
}

function buildPurchaseChanges(existingPurchase, newData) {
  const fields = ['supplierId', 'supplierName', 'purchaseDate', 'expectedDeliveryDate', 'items', 'subtotal', 'discountAmount', 'taxAmount', 'shippingCharges', 'adjustmentAmount', 'totalAmount', 'notes']

  const changes = []

  function normalizeValue(value) {
    if (value === undefined || value === null) return null

    if (value instanceof Date) {
      return value.toISOString()
    }

    if (typeof value?.toHexString === 'function') {
      return value.toHexString()
    }

    if (Array.isArray(value)) {
      return value.map(normalizeValue)
    }

    if (typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value)
          .filter(([key]) => key !== '_id' && key !== '__v')
          .map(([key, item]) => [key, normalizeValue(item)]),
      )
    }

    return value
  }

  for (const field of fields) {
    const oldValue = normalizeValue(existingPurchase[field])
    const newValue = normalizeValue(newData[field])

    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({
        field,
        oldValue,
        newValue,
      })
    }
  }

  return changes
}

const buildPurchaseSnapshot = (purchase) => {
  console.log('========== BUILD SNAPSHOT START ==========')
  console.log('Purchase exists:', Boolean(purchase))
  console.log('Purchase number:', purchase?.purchaseNumber)
  console.log('Items count:', purchase?.items?.length)
  console.log('Purchase items:', JSON.stringify(purchase?.items, null, 2))

  if (!purchase) {
    console.log('ERROR: Purchase is null or undefined')
    return null
  }

  const snapshot = {
    purchaseNumber: purchase.purchaseNumber || '',
    purchaseDate: purchase.purchaseDate || null,
    expectedDeliveryDate: purchase.expectedDeliveryDate || null,
    status: purchase.status || '',
    supplierName: purchase.supplierName || '',

    items: (purchase.items || []).map((item) => ({
      productId: item.productId || null,
      productName: item.productName || '',
      sku: item.sku || '',
      unit: item.unit || 'Piece',
      quantity: Number(item.quantity || 0),
      receivedQuantity: Number(item.receivedQuantity || 0),
      unitPrice: Number(item.unitPrice || 0),
      taxRate: Number(item.taxRate || 0),
      discountAmount: Number(item.discountAmount || 0),
      taxableAmount: Number(item.taxableAmount || 0),
      taxAmount: Number(item.taxAmount || 0),
      lineTotal: Number(item.lineTotal || 0),
    })),

    subtotal: Number(purchase.subtotal || 0),
    discountAmount: Number(purchase.discountAmount || 0),
    taxAmount: Number(purchase.taxAmount || 0),
    shippingCharges: Number(purchase.shippingCharges || 0),
    adjustmentAmount: Number(purchase.adjustmentAmount || 0),
    totalAmount: Number(purchase.totalAmount || 0),
    paidAmount: Number(purchase.paidAmount || 0),
    paymentStatus: purchase.paymentStatus || '',
    notes: purchase.notes || '',
  }

  console.log('Generated snapshot:', JSON.stringify(snapshot, null, 2))
  console.log('========== BUILD SNAPSHOT END ==========')

  return snapshot
}
// Purchase data validation and calculations

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
        .select('-purchaseHistory')
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

    if (!validatePurchaseId(req.params.id, res)) return

    const purchase = await Purchase.findOne({
      _id: req.params.id,
      companyId,
    })
      .populate('supplierId', 'supplierName supplierCode email phone')
      .populate('items.productId', 'name sku unit')
      .select('-purchaseHistory')
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

// GET /erp/purchases/:id/history

router.get('/:id/history', permissionMiddleware('Purchase', 'HISTORY'), async (req, res, next) => {
  try {
    const companyId = getCompanyId(req, res)
    if (!companyId) return

    if (!validatePurchaseId(req.params.id, res)) return

    const purchase = await Purchase.findOne({
      _id: req.params.id,
      companyId,
    })
      .select('_id purchaseNumber purchaseHistory')
      .populate('purchaseHistory.performedBy', 'name email')
      .lean()

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found.',
      })
    }

    return res.status(200).json({
      success: true,
      history: purchase.purchaseHistory || [],
    })
  } catch (error) {
    return sendKnownError(res, error, next)
  }
})

// POST /erp/purchases
// Create Draft purchase

router.post('/', permissionMiddleware('Purchase', 'CREATE'), async (req, res, next) => {
  try {
    const companyId = getCompanyId(req, res)
    if (!companyId) return

    const userId = getAuthenticatedUserId(req, res)
    if (!userId) return

    const data = await buildPurchaseData(req.body, companyId, res)
    if (!data) return

    const purchaseNumber = await generatePurchaseNumber(companyId)

    console.log('========== PURCHASE CREATE ROUTE ==========')
    console.log('Route file:', __filename)
    console.log('Purchase model:', Purchase.modelName)
    console.log('Purchase number:', purchaseNumber)
    console.log('History schema paths:', Object.keys(Purchase.schema.path('purchaseHistory').schema.paths))

    const testSnapshot = buildPurchaseSnapshot({
      purchaseNumber,
      ...data,
      paidAmount: 0,
      paymentStatus: 'Unpaid',
      status: 'Draft',
    })

    console.log('TEST SNAPSHOT BEFORE SAVE:', JSON.stringify(testSnapshot, null, 2))

    const purchase = await Purchase.create({
      companyId,
      purchaseNumber,
      ...data,
      paidAmount: 0,
      paymentStatus: 'Unpaid',
      status: 'Draft',
      createdBy: userId,
      everApproved: false,
      orderEmailStatus: 'Not Sent',
      cancellationEmailStatus: 'Not Sent',
      purchaseHistory: [
        {
          action: 'Created',
          fromStatus: '',
          toStatus: 'Draft',
          performedBy: userId,
          performedAt: new Date(),
          changes: [],
          snapshot: testSnapshot,
          emailType: 'None',
          emailStatus: 'Not Required',
          emailError: '',
        },
      ],
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

/**
 * PATCH /erp/purchases/:id
 * Edit a never-approved Draft or a Draft returned by cancellation.
 */
router.patch('/:id', permissionMiddleware('Purchase', 'UPDATE'), async (req, res, next) => {
  try {
    const companyId = getCompanyId(req, res)
    if (!companyId) return

    const userId = getAuthenticatedUserId(req, res)
    if (!userId) return

    const { id } = req.params
    if (!validatePurchaseId(id, res)) return

    const existingPurchase = await Purchase.findOne({
      _id: id,
      companyId,
    })
      .select('_id status everApproved purchaseHistory supplierId supplierName purchaseDate expectedDeliveryDate items subtotal discountAmount taxAmount shippingCharges adjustmentAmount totalAmount notes')
      .lean()

    if (!existingPurchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found.',
      })
    }

    if (existingPurchase.status !== 'Draft') {
      return res.status(409).json({
        success: false,
        message: 'Only Draft purchases can be edited. Cancel an Ordered purchase first.',
      })
    }

    const history = existingPurchase.purchaseHistory || []

    const hasCancellationHistory = history.some((entry) => entry.action === 'Cancelled' && entry.fromStatus === 'Ordered' && entry.toStatus === 'Draft')

    // A previously approved purchase can only be edited after cancellation.
    if (existingPurchase.everApproved && !hasCancellationHistory) {
      return res.status(409).json({
        success: false,
        message: 'This previously approved purchase must be cancelled before editing.',
      })
    }

    const data = await buildPurchaseData(req.body, companyId, res)
    if (!data) return

    const changes = buildPurchaseChanges(existingPurchase, data)

    // Atomic protection against editing a purchase whose status changed.
    const updatedPurchase = await Purchase.findOneAndUpdate(
      {
        _id: id,
        companyId,
        status: 'Draft',
        $or: [
          { everApproved: { $ne: true } },
          {
            purchaseHistory: {
              $elemMatch: {
                action: 'Cancelled',
                fromStatus: 'Ordered',
                toStatus: 'Draft',
              },
            },
          },
        ],
      },

      {
        $set: {
          ...data,
          updatedBy: userId,
        },
        ...(changes.length > 0 && {
          $push: {
            purchaseHistory: {
              action: 'Edited',
              fromStatus: 'Draft',
              toStatus: 'Draft',
              performedBy: userId,
              performedAt: new Date(),
              changes,
              snapshot: buildPurchaseSnapshot({
                ...existingPurchase,
                ...data,
                status: 'Draft',
              }),
              emailType: 'None',
              emailStatus: 'Not Required',
              emailError: '',
            },
          },
        }),
      },

      {
        new: true,
        runValidators: true,
      },
    )
      .populate('supplierId', 'supplierName supplierCode')
      .lean()

    if (!updatedPurchase) {
      return res.status(409).json({
        success: false,
        message: 'Purchase status changed. Refresh and try again.',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Draft purchase updated successfully. You can approve it again when ready.',
      purchase: updatedPurchase,
    })
  } catch (error) {
    return sendKnownError(res, error, next)
  }
})

// PATCH /erp/purchases/:id/approve
router.patch('/:id/approve', permissionMiddleware('Purchase', 'APPROVE'), async (req, res, next) => {
  try {
    const companyId = getCompanyId(req, res)
    if (!companyId) return

    const userId = getAuthenticatedUserId(req, res)
    if (!userId) return

    const { id } = req.params
    if (!validatePurchaseId(id, res)) return

    const historyId = new mongoose.Types.ObjectId()

    const purchaseBeforeApproval = await Purchase.findOne({
      _id: id,
      companyId,
      status: 'Draft',
    })
      .select('purchaseNumber purchaseDate expectedDeliveryDate supplierName items subtotal discountAmount taxAmount shippingCharges adjustmentAmount totalAmount paidAmount paymentStatus notes')
      .lean()

    if (!purchaseBeforeApproval) {
      return res.status(409).json({
        success: false,
        message: 'Purchase is no longer in Draft status. Refresh and try again.',
      })
    }

    const approvalSnapshot = buildPurchaseSnapshot({
      ...purchaseBeforeApproval,
      status: 'Ordered',
    })

    let purchase = await Purchase.findOneAndUpdate(
      {
        _id: id,
        companyId,
        status: 'Draft',
      },
      {
        $set: {
          status: 'Ordered',
          everApproved: true,
          updatedBy: userId,
          orderEmailStatus: 'Not Sent',
          orderEmailSentAt: null,
          orderEmailError: '',
        },
        $push: {
          purchaseHistory: {
            _id: historyId,
            action: 'Approved',
            fromStatus: 'Draft',
            toStatus: 'Ordered',
            performedBy: userId,
            snapshot: approvalSnapshot,
            performedAt: new Date(),
            emailType: 'Order',
            emailStatus: 'Pending',
            emailError: '',
          },
        },
      },
      {
        new: true,
        runValidators: true,
      },
    )
      .populate('supplierId', 'supplierName supplierCode email phone')
      .lean()

    if (!purchase) {
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
    }

    const supplier = purchase.supplierId

    const email = await sendAndRecordEmail({
      purchaseId: purchase._id,
      companyId,
      emailType: 'order',
      to: supplier?.email,
      subject: `Purchase Order ${purchase.purchaseNumber}`,
      html: buildOrderEmail(purchase),
      historyId,
    })

    return res.status(200).json({
      success: true,
      message: email.status === 'sent' ? 'Purchase approved and supplier email sent successfully. Inventory has not been changed.' : 'Purchase approved, but the supplier email failed. You can retry the email. Inventory has not been changed.',
      purchase: email.purchase || purchase,
      email: getEmailResponse(email),
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

    const userId = getAuthenticatedUserId(req, res)
    if (!userId) return

    const { id } = req.params
    if (!validatePurchaseId(id, res)) return

    const historyId = new mongoose.Types.ObjectId()

    const purchaseBeforeCancellation = await Purchase.findOne({
      _id: id,
      companyId,
      status: 'Ordered',
    })
      .select('purchaseNumber purchaseDate expectedDeliveryDate supplierName items subtotal discountAmount taxAmount shippingCharges adjustmentAmount totalAmount paidAmount paymentStatus notes')
      .lean()

    if (!purchaseBeforeCancellation) {
      return res.status(409).json({
        success: false,
        message: 'Purchase is no longer Ordered. Refresh and try again.',
      })
    }

    const cancellationSnapshot = buildPurchaseSnapshot({
      ...purchaseBeforeCancellation,
      status: 'Draft',
    })

    const purchase = await Purchase.findOneAndUpdate(
      {
        _id: id,
        companyId,
        status: 'Ordered',
      },
      {
        $set: {
          status: 'Draft',
          updatedBy: userId,
          cancellationEmailStatus: 'Not Sent',
          cancellationEmailSentAt: null,
          cancellationEmailError: '',
        },
        $push: {
          purchaseHistory: {
            _id: historyId,
            action: 'Cancelled',
            fromStatus: 'Ordered',
            toStatus: 'Draft',
            performedBy: userId,
            snapshot: cancellationSnapshot,
            performedAt: new Date(),
            emailType: 'Cancellation',
            emailStatus: 'Pending',
            emailError: '',
          },
        },
      },
      {
        new: true,
        runValidators: true,
      },
    )
      .populate('supplierId', 'supplierName supplierCode email phone')
      .lean()

    if (!purchase) {
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
        message: `Only Ordered purchases can be cancelled. Current status: "${existingPurchase.status}".`,
      })
    }

    const supplier = purchase.supplierId

    const email = await sendAndRecordEmail({
      purchaseId: purchase._id,
      companyId,
      emailType: 'cancellation',
      to: supplier?.email,
      subject: `Purchase Order Cancellation ${purchase.purchaseNumber}`,
      html: buildCancellationEmail(purchase),
      historyId,
    })

    return res.status(200).json({
      success: true,
      message:
        email.status === 'sent'
          ? 'Purchase returned to Draft and supplier cancellation email sent successfully. Inventory has not been changed.'
          : 'Purchase returned to Draft, but the supplier cancellation email failed. You can retry the email. Inventory has not been changed.',
      purchase: email.purchase || purchase,
      email: getEmailResponse(email),
    })
  } catch (error) {
    return sendKnownError(res, error, next)
  }
})

// PATCH /erp/purchases/:id/retry-order-email
router.patch('/:id/retry-order-email', permissionMiddleware('Purchase', 'APPROVE'), async (req, res, next) => {
  try {
    const companyId = getCompanyId(req, res)
    if (!companyId) return

    const userId = getAuthenticatedUserId(req, res)
    if (!userId) return

    const { id } = req.params
    if (!validatePurchaseId(id, res)) return

    const purchase = await Purchase.findOne({
      _id: id,
      companyId,
      status: 'Ordered',
    })
      .populate('supplierId', 'supplierName supplierCode email phone')
      .lean()

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Ordered purchase not found. Only Ordered purchases can retry the order email.',
      })
    }

    if (purchase.orderEmailStatus === 'Sent') {
      return res.status(409).json({
        success: false,
        message: 'Purchase Order email has already been sent successfully.',
        purchase,
      })
    }

    const historyId = await createEmailHistory({
      purchaseId: purchase._id,
      companyId,
      userId,
      action: 'Email Retry',
      fromStatus: 'Ordered',
      toStatus: 'Ordered',
      emailType: 'Order',
    })

    const supplier = purchase.supplierId

    const email = await sendAndRecordEmail({
      purchaseId: purchase._id,
      companyId,
      emailType: 'order',
      to: supplier?.email,
      subject: `Purchase Order ${purchase.purchaseNumber}`,
      html: buildOrderEmail(purchase),
      historyId,
    })

    return res.status(200).json({
      success: email.status === 'sent',
      message: email.status === 'sent' ? 'Purchase Order email sent successfully.' : 'Purchase Order email could not be sent. Check the supplier email and try again.',
      purchase: email.purchase || purchase,
      email: getEmailResponse(email),
    })
  } catch (error) {
    return sendKnownError(res, error, next)
  }
})

// PATCH /erp/purchases/:id/retry-cancellation-email
// Retry cancellation email for a Draft purchase returned from Ordered

router.patch('/:id/retry-cancellation-email', permissionMiddleware('Purchase', 'CANCEL'), async (req, res, next) => {
  try {
    const companyId = getCompanyId(req, res)
    if (!companyId) return

    const userId = getAuthenticatedUserId(req, res)
    if (!userId) return

    const { id } = req.params
    if (!validatePurchaseId(id, res)) return

    const purchase = await Purchase.findOne({
      _id: id,
      companyId,
      status: 'Draft',
      everApproved: true,
    })
      .populate('supplierId', 'supplierName supplierCode email phone')
      .lean()

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Eligible Draft purchase not found. Cancellation email retry is only available after cancelling an Ordered purchase.',
      })
    }

    if (purchase.cancellationEmailStatus === 'Not Required') {
      return res.status(409).json({
        success: false,
        message: 'This purchase does not require a cancellation email.',
        purchase,
      })
    }

    if (purchase.cancellationEmailStatus === 'Sent') {
      return res.status(409).json({
        success: false,
        message: 'Cancellation email has already been sent successfully.',
        purchase,
      })
    }

    const historyId = await createEmailHistory({
      purchaseId: purchase._id,
      companyId,
      userId,
      action: 'Email Retry',
      fromStatus: 'Ordered',
      toStatus: 'Draft',
      emailType: 'Cancellation',
    })

    const supplier = purchase.supplierId

    const email = await sendAndRecordEmail({
      purchaseId: purchase._id,
      companyId,
      emailType: 'cancellation',
      to: supplier?.email,
      subject: `Purchase Order Cancellation ${purchase.purchaseNumber}`,
      html: buildCancellationEmail(purchase),
      historyId,
    })

    return res.status(200).json({
      success: email.status === 'sent',
      message: email.status === 'sent' ? 'Cancellation email sent successfully.' : 'Cancellation email could not be sent. Check the supplier email and try again.',
      purchase: email.purchase || purchase,
      email: getEmailResponse(email),
    })
  } catch (error) {
    return sendKnownError(res, error, next)
  }
})

// DELETE /erp/purchases/:id
// Only Draft purchases that have never been approved can be deleted.

router.delete('/:id', permissionMiddleware('Purchase', 'DELETE'), async (req, res, next) => {
  try {
    const companyId = getCompanyId(req, res)
    if (!companyId) return

    const { id } = req.params
    if (!validatePurchaseId(id, res)) return

    const purchase = await Purchase.findOne({
      _id: id,
      companyId,
    })
      .select('_id status everApproved purchaseHistory orderEmailStatus cancellationEmailStatus')
      .lean()

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found.',
      })
    }

    if (purchase.status !== 'Draft') {
      return res.status(409).json({
        success: false,
        message: 'Only Draft purchases can be deleted.',
      })
    }

    const history = purchase.purchaseHistory || []

    const hasApprovalHistory = purchase.everApproved === true || history.some((entry) => entry.action === 'Approved') || history.some((entry) => entry.fromStatus === 'Draft' && entry.toStatus === 'Ordered')

    if (hasApprovalHistory) {
      return res.status(409).json({
        success: false,
        message: 'This purchase has been approved before and cannot be deleted, even though it is currently Draft.',
      })
    }

    // Atomic protection against an approval happening after the read.
    const deletedPurchase = await Purchase.findOneAndDelete({
      _id: id,
      companyId,
      status: 'Draft',
      everApproved: { $ne: true },
      'purchaseHistory.action': { $ne: 'Approved' },
      'purchaseHistory.toStatus': { $ne: 'Ordered' },
    })

    if (!deletedPurchase) {
      return res.status(409).json({
        success: false,
        message: 'Purchase could not be deleted because its status or approval history changed. Refresh and try again.',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Draft purchase deleted successfully.',
    })
  } catch (error) {
    return sendKnownError(res, error, next)
  }
})

module.exports = router
