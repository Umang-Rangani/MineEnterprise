const express = require('express')
const mongoose = require('mongoose')

const GoodsReceipt = require('../models/GoodsReceipt')
const Purchase = require('../models/Purchase')
const PurchaseCounter = require('../models/PurchaseCounter')
const Supplier = require('../models/Supplier')
const Warehouse = require('../models/Warehouse')
const Inventory = require('../models/Inventory')
const InventoryMovement = require('../models/InventoryMovement')
const authMiddleware = require('../middleware/authMiddleware')
const permissionMiddleware = require('../middleware/permissionMiddleware')

const router = express.Router()

router.use(authMiddleware)

const isValidObjectId = (id) => mongoose.isValidObjectId(id)

const getCompanyId = (req) => {
  if (req.user?.role === 'SuperAdmin') return null
  return req.company?._id || req.user?.companyId || null
}

const httpError = (message, status = 400) => Object.assign(new Error(message), { status })

const handleError = (error, res, next) => {
  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'Duplicate document number or record already exists',
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

const generateReceiptNumber = async (companyId, session) => {
  const counter = await PurchaseCounter.findOneAndUpdate(
    {
      companyId,
      name: 'goodsReceipt',
    },
    {
      $inc: { sequence: 1 },
      $setOnInsert: {
        companyId,
        name: 'goodsReceipt',
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      session,
    },
  )

  return `GRN-${String(counter.sequence).padStart(6, '0')}`
}

const parseQuantity = (value, fieldName) => {
  const number = Number(value)

  if (!Number.isFinite(number) || number < 0) {
    throw httpError(`${fieldName} must be a valid non-negative number`)
  }

  return number
}

// GET /erp/goods-receipts
router.get('/', permissionMiddleware('Purchase', 'LIST'), async (req, res, next) => {
  try {
    const companyId = getCompanyId(req)

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company context is required',
      })
    }

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)

    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 10))

    const filter = { companyId }

    if (req.query.status) {
      if (!['Draft', 'Confirmed', 'Cancelled'].includes(req.query.status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid receipt status',
        })
      }

      filter.status = req.query.status
    }

    if (req.query.purchaseId) {
      if (!isValidObjectId(req.query.purchaseId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid purchase ID',
        })
      }

      filter.purchaseId = req.query.purchaseId
    }

    if (req.query.supplierId) {
      if (!isValidObjectId(req.query.supplierId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid supplier ID',
        })
      }

      filter.supplierId = req.query.supplierId
    }

    const [receipts, total] = await Promise.all([
      GoodsReceipt.find(filter)
        .populate('purchaseId', 'purchaseNumber')
        .populate('supplierId', 'supplierName')
        .populate('warehouseId', 'name code')
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      GoodsReceipt.countDocuments(filter),
    ])

    return res.status(200).json({
      success: true,
      receipts,
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

// POST /erp/goods-receipts
// Create a draft. Does not update actual inventory.
router.post('/', permissionMiddleware('Purchase', 'CREATE'), async (req, res, next) => {
  const session = await mongoose.startSession()

  try {
    const companyId = getCompanyId(req)

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company context is required',
      })
    }

    const { purchaseId, warehouseId, receiptDate, items, notes } = req.body || {}

    if (!isValidObjectId(purchaseId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid purchase order is required',
      })
    }

    if (!isValidObjectId(warehouseId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid warehouse is required',
      })
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one receipt item is required',
      })
    }

    const date = receiptDate ? new Date(receiptDate) : new Date()

    if (Number.isNaN(date.getTime()) || date > new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Receipt date must be valid and cannot be in the future',
      })
    }

    let createdReceipt

    await session.withTransaction(async () => {
      const purchase = await Purchase.findOne({
        _id: purchaseId,
        companyId,
      }).session(session)

      if (!purchase) {
        throw httpError('Purchase order not found', 404)
      }

      if (!['Ordered', 'Partially Received'].includes(purchase.status)) {
        throw httpError('Only ordered or partially received purchases can receive goods')
      }

      const warehouse = await Warehouse.findOne({
        _id: warehouseId,
        companyId,
        status: 'Active',
      }).session(session)

      if (!warehouse) {
        throw httpError('Active warehouse not found in this company')
      }

      const supplier = await Supplier.findOne({
        _id: purchase.supplierId,
        companyId,
      }).session(session)

      if (!supplier) {
        throw httpError('Purchase supplier not found')
      }

      const requestedItems = new Map()

      for (const item of items) {
        if (!isValidObjectId(item.purchaseItemId)) {
          throw httpError('Invalid purchase item ID')
        }

        const key = String(item.purchaseItemId)

        if (requestedItems.has(key)) {
          throw httpError('Duplicate purchase items are not allowed in one receipt')
        }

        requestedItems.set(key, item)
      }

      const receiptItems = []

      for (const [purchaseItemId, input] of requestedItems) {
        const purchaseItem = purchase.items.find((item) => String(item._id) === purchaseItemId)

        if (!purchaseItem) {
          throw httpError('Receipt item does not belong to this purchase order')
        }

        const receivedQuantity = parseQuantity(input.receivedQuantity, 'Received quantity')

        const damagedQuantity = parseQuantity(input.damagedQuantity ?? 0, 'Damaged quantity')

        if (receivedQuantity <= 0) {
          throw httpError('Received quantity must be greater than zero')
        }

        if (damagedQuantity > receivedQuantity) {
          throw httpError('Damaged quantity cannot exceed received quantity')
        }

        const previouslyReceivedQuantity = Number(purchaseItem.receivedQuantity || 0)

        const remainingQuantity = Number(purchaseItem.quantity) - previouslyReceivedQuantity

        if (receivedQuantity > remainingQuantity) {
          throw httpError(`Received quantity exceeds remaining quantity for ${purchaseItem.productName}`)
        }

        const otherDrafts = await GoodsReceipt.find({
          companyId,
          purchaseId: purchase._id,
          status: 'Draft',
          'items.purchaseItemId': purchaseItem._id,
        })
          .session(session)
          .lean()

        const alreadyDraftedQuantity = otherDrafts.reduce((sum, draft) => {
          const matchingItems = draft.items.filter((draftItem) => String(draftItem.purchaseItemId) === purchaseItemId)

          return sum + matchingItems.reduce((itemSum, draftItem) => itemSum + Number(draftItem.receivedQuantity || 0), 0)
        }, 0)

        if (receivedQuantity + alreadyDraftedQuantity > remainingQuantity) {
          throw httpError(`Quantity already exists in another draft for ${purchaseItem.productName}`, 409)
        }

        receiptItems.push({
          purchaseItemId: purchaseItem._id,
          productId: purchaseItem.productId,
          productName: purchaseItem.productName,
          sku: purchaseItem.sku || '',
          unit: purchaseItem.unit || 'Piece',
          orderedQuantity: Number(purchaseItem.quantity),
          previouslyReceivedQuantity,
          receivedQuantity,
          damagedQuantity,
          acceptedQuantity: receivedQuantity - damagedQuantity,
          unitPrice: Number(purchaseItem.unitPrice),
          notes: String(input.notes || '').trim(),
        })
      }

      const receiptNumber = await generateReceiptNumber(companyId, session)

      const [receipt] = await GoodsReceipt.create(
        [
          {
            companyId,
            receiptNumber,
            purchaseId: purchase._id,
            purchaseNumber: purchase.purchaseNumber,
            supplierId: supplier._id,
            supplierName: supplier.supplierName,
            warehouseId: warehouse._id,
            receiptDate: date,
            items: receiptItems,
            status: 'Draft',
            notes: String(notes || '').trim(),
            createdBy: req.user.userId,
            updatedBy: req.user.userId,
          },
        ],
        { session },
      )

      createdReceipt = receipt
    })

    return res.status(201).json({
      success: true,
      message: 'Goods receipt draft created successfully',
      receipt: createdReceipt,
    })
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      })
    }

    return handleError(error, res, next)
  } finally {
    await session.endSession()
  }
})

// POST /erp/goods-receipts/:id/confirm
router.post('/:id/confirm', permissionMiddleware('Purchase', 'APPROVE'), async (req, res, next) => {
  const session = await mongoose.startSession()

  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid goods receipt ID',
      })
    }

    const companyId = getCompanyId(req)

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company context is required',
      })
    }

    let confirmedReceipt

    await session.withTransaction(async () => {
      const receipt = await GoodsReceipt.findOne({
        _id: req.params.id,
        companyId,
      }).session(session)

      if (!receipt) {
        throw httpError('Goods receipt not found', 404)
      }

      if (receipt.status !== 'Draft') {
        throw httpError(`Only Draft receipts can be confirmed. Current status: ${receipt.status}`, 409)
      }

      const purchase = await Purchase.findOne({
        _id: receipt.purchaseId,
        companyId,
      }).session(session)

      if (!purchase) {
        throw httpError('Related purchase order not found', 404)
      }

      if (!['Ordered', 'Partially Received'].includes(purchase.status)) {
        throw httpError('Purchase order is not eligible for goods receipt', 409)
      }

      const warehouse = await Warehouse.findOne({
        _id: receipt.warehouseId,
        companyId,
        status: 'Active',
      }).session(session)

      if (!warehouse) {
        throw httpError('Receipt warehouse is no longer active', 409)
      }

      // Reload and validate quantities against the current Purchase.
      const purchaseItemMap = new Map(purchase.items.map((item) => [String(item._id), item]))

      const acceptedLines = []

      for (const item of receipt.items) {
        const purchaseItem = purchaseItemMap.get(String(item.purchaseItemId))

        if (!purchaseItem) {
          throw httpError(`Purchase item ${item.productName} no longer exists`, 409)
        }

        const currentReceived = Number(purchaseItem.receivedQuantity || 0)

        const orderedQuantity = Number(purchaseItem.quantity)
        const remainingQuantity = orderedQuantity - currentReceived
        const receiptQuantity = Number(item.receivedQuantity)
        const damagedQuantity = Number(item.damagedQuantity || 0)
        const acceptedQuantity = receiptQuantity - damagedQuantity

        if (receiptQuantity <= 0 || damagedQuantity < 0 || damagedQuantity > receiptQuantity || receiptQuantity > remainingQuantity) {
          throw httpError(`Receipt quantity is no longer valid for ${item.productName}`, 409)
        }

        item.previouslyReceivedQuantity = currentReceived
        item.orderedQuantity = orderedQuantity
        item.acceptedQuantity = acceptedQuantity

        acceptedLines.push({
          item,
          purchaseItem,
          currentReceived,
          receiptQuantity,
          acceptedQuantity,
        })
      }

      // Update stock only for accepted, undamaged quantities.
      for (const line of acceptedLines) {
        const { item, purchaseItem, acceptedQuantity } = line

        if (acceptedQuantity > 0) {
          const inventory = await Inventory.findOneAndUpdate(
            {
              companyId,
              warehouseId: receipt.warehouseId,
              productId: item.productId,
            },
            {
              $inc: {
                currentStock: acceptedQuantity,
              },
              $set: {
                updatedBy: req.user.userId,
              },
              $setOnInsert: {
                companyId,
                warehouseId: receipt.warehouseId,
                productId: item.productId,
                createdBy: req.user.userId,
                reservedStock: 0,
              },
            },
            {
              new: true,
              upsert: true,
              setDefaultsOnInsert: true,
              runValidators: true,
              session,
            },
          )

          const previousStock = Number(inventory.currentStock) - acceptedQuantity

          await InventoryMovement.create(
            [
              {
                companyId,
                productId: item.productId,
                warehouseId: receipt.warehouseId,
                type: 'STOCK_IN',
                quantity: acceptedQuantity,
                previousStock,
                newStock: Number(inventory.currentStock),
                reason: `Goods Receipt ${receipt.receiptNumber}`,
                reference: receipt.receiptNumber,
                createdBy: req.user.userId,
              },
            ],
            { session },
          )
        }

        purchaseItem.receivedQuantity = Number(purchaseItem.receivedQuantity || 0) + line.receiptQuantity
      }

      const allItemsReceived = purchase.items.every((item) => Number(item.receivedQuantity || 0) >= Number(item.quantity))

      purchase.status = allItemsReceived ? 'Received' : 'Partially Received'

      purchase.updatedBy = req.user.userId

      await purchase.save({ session })

      // The status transition is the receipt's idempotency guard.
      // A repeated confirmation cannot process the same Draft again.
      receipt.status = 'Confirmed'
      receipt.confirmedAt = new Date()
      receipt.confirmedBy = req.user.userId
      receipt.stockUpdatedAt = new Date()
      receipt.stockUpdateReference = receipt.receiptNumber
      receipt.updatedBy = req.user.userId

      await receipt.save({ session })

      confirmedReceipt = receipt
    })

    return res.status(200).json({
      success: true,
      message: 'Goods receipt confirmed and inventory updated successfully',
      receipt: confirmedReceipt,
    })
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      })
    }

    return handleError(error, res, next)
  } finally {
    await session.endSession()
  }
})

/* PATCH /erp/goods-receipts/:id
   Edit a Draft receipt only. Inventory is not updated here.
*/
router.patch('/:id', permissionMiddleware('Purchase', 'CREATE'), async (req, res, next) => {
  const session = await mongoose.startSession()

  try {
    const companyId = getCompanyId(req)
    const userId = req.user?.userId
    const { id } = req.params

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company context is required',
      })
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid goods receipt ID',
      })
    }

    const { warehouseId, receiptDate, items, notes } = req.body || {}

    if (!isValidObjectId(warehouseId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid warehouse is required',
      })
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one receipt item is required',
      })
    }

    const date = receiptDate ? new Date(receiptDate) : new Date()

    if (Number.isNaN(date.getTime()) || date > new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Receipt date must be valid and cannot be in the future',
      })
    }

    let updatedReceipt

    await session.withTransaction(async () => {
      const receipt = await GoodsReceipt.findOne({
        _id: id,
        companyId,
      }).session(session)

      if (!receipt) {
        throw httpError('Goods receipt not found', 404)
      }

      if (receipt.status !== 'Draft') {
        throw httpError(`Only Draft receipts can be edited. Current status: ${receipt.status}`, 409)
      }

      const purchase = await Purchase.findOne({
        _id: receipt.purchaseId,
        companyId,
      }).session(session)

      if (!purchase || !['Ordered', 'Partially Received'].includes(purchase.status)) {
        throw httpError('Purchase order is no longer eligible for goods receipt', 409)
      }

      const warehouse = await Warehouse.findOne({
        _id: warehouseId,
        companyId,
        status: 'Active',
      }).session(session)

      if (!warehouse) {
        throw httpError('Active warehouse not found in this company')
      }

      const supplier = await Supplier.findOne({
        _id: purchase.supplierId,
        companyId,
      }).session(session)

      if (!supplier) {
        throw httpError('Purchase supplier not found')
      }

      const requestedItems = new Map()

      for (const input of items) {
        if (!isValidObjectId(input.purchaseItemId)) {
          throw httpError('Invalid purchase item ID')
        }

        const key = String(input.purchaseItemId)

        if (requestedItems.has(key)) {
          throw httpError('Duplicate purchase items are not allowed in one receipt')
        }

        requestedItems.set(key, input)
      }

      const receiptItems = []

      for (const [purchaseItemId, input] of requestedItems) {
        const purchaseItem = purchase.items.find((item) => String(item._id) === purchaseItemId)

        if (!purchaseItem) {
          throw httpError('Receipt item does not belong to this purchase order')
        }

        const receivedQuantity = parseQuantity(input.receivedQuantity, 'Received quantity')

        const damagedQuantity = parseQuantity(input.damagedQuantity ?? 0, 'Damaged quantity')

        if (receivedQuantity <= 0) {
          throw httpError('Received quantity must be greater than zero')
        }

        if (damagedQuantity > receivedQuantity) {
          throw httpError('Damaged quantity cannot exceed received quantity')
        }

        const previouslyReceivedQuantity = Number(purchaseItem.receivedQuantity || 0)

        const remainingQuantity = Number(purchaseItem.quantity) - previouslyReceivedQuantity

        if (receivedQuantity > remainingQuantity) {
          throw httpError(`Received quantity exceeds remaining quantity for ${purchaseItem.productName}`, 409)
        }

        // Do not count this receipt itself when checking other drafts.
        const otherDrafts = await GoodsReceipt.find({
          companyId,
          purchaseId: purchase._id,
          _id: { $ne: receipt._id },
          status: 'Draft',
          'items.purchaseItemId': purchaseItem._id,
        })
          .session(session)
          .lean()

        const alreadyDraftedQuantity = otherDrafts.reduce((sum, draft) => {
          const matchingItems = draft.items.filter((draftItem) => String(draftItem.purchaseItemId) === purchaseItemId)

          return sum + matchingItems.reduce((itemSum, draftItem) => itemSum + Number(draftItem.receivedQuantity || 0), 0)
        }, 0)

        if (receivedQuantity + alreadyDraftedQuantity > remainingQuantity) {
          throw httpError(`Quantity already exists in another draft for ${purchaseItem.productName}`, 409)
        }

        receiptItems.push({
          purchaseItemId: purchaseItem._id,
          productId: purchaseItem.productId,
          productName: purchaseItem.productName,
          sku: purchaseItem.sku || '',
          unit: purchaseItem.unit || 'Piece',
          orderedQuantity: Number(purchaseItem.quantity),
          previouslyReceivedQuantity,
          receivedQuantity,
          damagedQuantity,
          acceptedQuantity: receivedQuantity - damagedQuantity,
          unitPrice: Number(purchaseItem.unitPrice),
          notes: String(input.notes || '').trim(),
        })
      }

      receipt.warehouseId = warehouse._id
      receipt.supplierId = supplier._id
      receipt.supplierName = supplier.supplierName
      receipt.receiptDate = date
      receipt.items = receiptItems
      receipt.notes = String(notes || '').trim()
      receipt.updatedBy = userId

      await receipt.save({ session })

      updatedReceipt = receipt
    })

    return res.status(200).json({
      success: true,
      message: 'Goods receipt draft updated successfully',
      receipt: updatedReceipt,
    })
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      })
    }

    return handleError(error, res, next)
  } finally {
    await session.endSession()
  }
})

/* PATCH /erp/goods-receipts/:id/cancel
   Cancel a Draft receipt only. No stock changes occur.
*/
router.patch('/:id/cancel', permissionMiddleware('Purchase', 'CREATE'), async (req, res, next) => {
  try {
    const companyId = getCompanyId(req)
    const userId = req.user?.userId
    const { id } = req.params

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company context is required',
      })
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid goods receipt ID',
      })
    }

    const reason = String(req.body?.reason || '').trim()

    if (reason.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a cancellation reason (at least 3 characters)',
      })
    }

    const receipt = await GoodsReceipt.findOneAndUpdate(
      {
        _id: id,
        companyId,
        status: 'Draft',
      },
      {
        $set: {
          status: 'Cancelled',
          cancelledAt: new Date(),
          cancelledBy: userId,
          cancellationReason: reason,
          updatedBy: userId,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    )

    if (!receipt) {
      const existing = await GoodsReceipt.findOne({
        _id: id,
        companyId,
      }).select('status')

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Goods receipt not found',
        })
      }

      return res.status(409).json({
        success: false,
        message: `Only Draft receipts can be cancelled. Current status: ${existing.status}`,
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Goods receipt draft cancelled successfully',
      receipt,
    })
  } catch (error) {
    return handleError(error, res, next)
  }
})

// GET /erp/goods-receipts/:id
router.get('/:id', permissionMiddleware('Purchase', 'VIEW'), async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid goods receipt ID',
      })
    }

    const companyId = getCompanyId(req)

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company context is required',
      })
    }

    const receipt = await GoodsReceipt.findOne({
      _id: req.params.id,
      companyId,
    })
      .populate('purchaseId', 'purchaseNumber')
      .populate('supplierId', 'supplierName')
      .populate('warehouseId', 'name code')
      .lean()

    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: 'Goods receipt not found',
      })
    }

    return res.status(200).json({
      success: true,
      receipt,
    })
  } catch (error) {
    return handleError(error, res, next)
  }
})

module.exports = router
