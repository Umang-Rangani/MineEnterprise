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

const ChartOfAccount = require('../models/ChartOfAccount')
const JournalEntry = require('../models/JournalEntry')
const JournalEntryCounter = require('../models/JournalEntryCounter')

const initializeDefaultChartOfAccounts = require('../services/defaultChartOfAccounts')

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

const lockPurchaseForReceipt = async (purchaseId, companyId, session) => {
  // Update the Purchase document to create a write conflict
  // when another transaction operates on the same Purchase.
  const result = await Purchase.updateOne(
    {
      _id: purchaseId,
      companyId,
    },
    {
      $inc: { goodsReceiptRevision: 1 },
    },
    { session },
  )

  if (!result.matchedCount) {
    throw httpError('Purchase order not found', 404)
  }

  const purchase = await Purchase.findOne({
    _id: purchaseId,
    companyId,
  }).session(session)

  if (!purchase) {
    throw httpError('Purchase order not found', 404)
  }

  return purchase
}

const roundMoney = (value) => {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100
}

const allocateAmount = (amount, items, weights) => {
  const totalAmount = roundMoney(amount)
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)

  if (items.length === 0 || totalWeight <= 0) {
    return items.map(() => 0)
  }

  let allocated = 0

  return items.map((item, index) => {
    if (index === items.length - 1) {
      return roundMoney(totalAmount - allocated)
    }

    const value = roundMoney((totalAmount * weights[index]) / totalWeight)

    allocated = roundMoney(allocated + value)

    return value
  })
}

const generateJournalNumber = async (companyId, entryDate, session) => {
  const counter = await JournalEntryCounter.findOneAndUpdate(
    { companyId },
    {
      $inc: { lastNumber: 1 },
      $setOnInsert: { companyId },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      session,
    },
  )

  const year = new Date(entryDate).getFullYear()

  return `JE-${year}-${String(counter.lastNumber).padStart(6, '0')}`
}

const createGoodsReceiptJournalEntry = async ({ receipt, purchase, acceptedLines, companyId, userId, session }) => {
  const eligibleLines = acceptedLines.filter((line) => line.acceptedQuantity > 0)

  if (eligibleLines.length === 0) {
    return {
      journalEntry: null,
      lineValuations: [],
    }
  }

  const purchaseItems = purchase.items

  const itemDiscountTotal = roundMoney(purchaseItems.reduce((sum, item) => sum + Number(item.discountAmount || 0), 0))

  const purchaseLevelDiscount = roundMoney(Number(purchase.discountAmount || 0) - itemDiscountTotal)

  const shippingCharges = roundMoney(Number(purchase.shippingCharges || 0))
  const adjustmentAmount = roundMoney(Number(purchase.adjustmentAmount || 0))

  const weights = purchaseItems.map((item) => Math.max(0, Number(item.taxableAmount || 0)))

  const totalWeight = roundMoney(weights.reduce((sum, weight) => sum + weight, 0))

  if (totalWeight <= 0) {
    throw httpError('Purchase item taxable values are invalid for accounting', 409)
  }

  if (purchaseLevelDiscount < 0 || purchaseLevelDiscount > totalWeight) {
    throw httpError('Purchase-level discount allocation is invalid', 409)
  }

  const discountAllocations = allocateAmount(purchaseLevelDiscount, purchaseItems, weights)
  const shippingAllocations = allocateAmount(shippingCharges, purchaseItems, weights)
  const adjustmentAllocations = allocateAmount(adjustmentAmount, purchaseItems, weights)

  const itemCostMap = new Map()

  purchaseItems.forEach((item, index) => {
    const taxableValue = Number(item.taxableAmount || 0)

    const fullItemCost = roundMoney(taxableValue - discountAllocations[index] + shippingAllocations[index] + adjustmentAllocations[index])

    if (!Number.isFinite(fullItemCost) || fullItemCost < 0) {
      throw httpError(`Invalid inventory cost for ${item.productName}`, 409)
    }

    itemCostMap.set(String(item._id), fullItemCost)
  })

  let totalInventoryValue = 0
  const lineValuations = []

  for (const line of eligibleLines) {
    const { item, purchaseItem, acceptedQuantity } = line

    const orderedQuantity = Number(purchaseItem.quantity)
    const previousAcceptedQuantity = Number(purchaseItem.acceptedQuantity || 0)

    const fullItemCost = itemCostMap.get(String(purchaseItem._id))

    if (!Number.isFinite(orderedQuantity) || orderedQuantity <= 0 || !Number.isFinite(previousAcceptedQuantity) || previousAcceptedQuantity < 0 || previousAcceptedQuantity + acceptedQuantity > orderedQuantity) {
      throw httpError(`Invalid accepted quantity for ${item.productName}`, 409)
    }

    const previousPostedValue = roundMoney((fullItemCost * previousAcceptedQuantity) / orderedQuantity)

    const newCumulativeValue = roundMoney((fullItemCost * (previousAcceptedQuantity + acceptedQuantity)) / orderedQuantity)

    const lineInventoryValue = roundMoney(newCumulativeValue - previousPostedValue)

    if (lineInventoryValue < 0) {
      throw httpError(`Invalid inventory value for ${item.productName}`, 409)
    }

    const unitCost = roundMoney(lineInventoryValue / acceptedQuantity)

    lineValuations.push({
      purchaseItemId: purchaseItem._id,
      productId: item.productId,
      acceptedQuantity,
      totalCost: lineInventoryValue,
      unitCost,
    })

    totalInventoryValue = roundMoney(totalInventoryValue + lineInventoryValue)
  }

  if (totalInventoryValue <= 0) {
    throw httpError('Accepted stock has zero inventory value. Please verify purchase costs before confirming.', 409)
  }

  const [inventoryAccount, grniAccount] = await Promise.all([
    ChartOfAccount.findOne({
      companyId,
      accountCode: '1200',
      accountType: 'Asset',
      isActive: true,
    }).session(session),

    ChartOfAccount.findOne({
      companyId,
      accountCode: '2010',
      accountType: 'Liability',
      isActive: true,
    }).session(session),
  ])

  if (!inventoryAccount) {
    throw httpError('Inventory account (1200) not found or inactive. Please check Chart of Accounts.', 409)
  }

  if (!grniAccount) {
    throw httpError('GRNI account (2010) not found or inactive. Please check Chart of Accounts.', 409)
  }

  const existingEntry = await JournalEntry.findOne({
    companyId,
    sourceType: 'GoodsReceipt',
    sourceId: receipt._id,
  }).session(session)

  if (existingEntry) {
    throw httpError('Accounting entry already exists for this goods receipt', 409)
  }

  const journalNumber = await generateJournalNumber(companyId, receipt.receiptDate, session)

  const [journalEntry] = await JournalEntry.create(
    [
      {
        companyId,
        journalNumber,
        entryDate: receipt.receiptDate,
        referenceNumber: receipt.receiptNumber,
        narration: `Inventory received against Purchase Order ${purchase.purchaseNumber} - Goods Receipt ${receipt.receiptNumber}`,

        lines: [
          {
            accountId: inventoryAccount._id,
            description: `Inventory received - ${receipt.receiptNumber}`,
            debit: totalInventoryValue,
            credit: 0,
          },
          {
            accountId: grniAccount._id,
            description: `Goods received not invoiced - ${receipt.receiptNumber}`,
            debit: 0,
            credit: totalInventoryValue,
          },
        ],

        totalDebit: totalInventoryValue,
        totalCredit: totalInventoryValue,
        status: 'Posted',
        sourceType: 'GoodsReceipt',
        sourceId: receipt._id,
        createdBy: userId,
        updatedBy: userId,
        postedBy: userId,
        postedAt: new Date(),
      },
    ],
    { session },
  )

  return {
    journalEntry,
    lineValuations,
  }
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
      const purchase = await lockPurchaseForReceipt(purchaseId, companyId, session)

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

        if (damagedQuantity > 0 && !String(input.damageReason || '').trim()) {
          throw httpError('Damage reason is required when damaged quantity is greater than zero')
        }

        const orderedQuantity = Number(purchaseItem.quantity)
        const previouslyReceivedQuantity = Number(purchaseItem.receivedQuantity || 0)

        if (!Number.isFinite(orderedQuantity) || orderedQuantity <= 0 || !Number.isFinite(previouslyReceivedQuantity) || previouslyReceivedQuantity < 0 || previouslyReceivedQuantity > orderedQuantity) {
          throw httpError(`Invalid purchase quantity for ${purchaseItem.productName}`, 409)
        }

        const remainingQuantity = orderedQuantity - previouslyReceivedQuantity

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
          orderedQuantity,
          previouslyReceivedQuantity,
          receivedQuantity,
          damagedQuantity,
          damageReason: String(input.damageReason || '').trim(),
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
    let createdJournalEntry = null

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

      const purchase = await lockPurchaseForReceipt(receipt.purchaseId, companyId, session)

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

        if (
          String(purchaseItem.productId) !== String(item.productId) ||
          !Number.isFinite(orderedQuantity) ||
          orderedQuantity <= 0 ||
          !Number.isFinite(currentReceived) ||
          currentReceived < 0 ||
          currentReceived > orderedQuantity ||
          !Number.isFinite(receiptQuantity) ||
          receiptQuantity <= 0 ||
          !Number.isFinite(damagedQuantity) ||
          damagedQuantity < 0 ||
          damagedQuantity > receiptQuantity ||
          (damagedQuantity > 0 && !String(item.damageReason || '').trim()) ||
          receiptQuantity > remainingQuantity
        ) {
          throw httpError(`Receipt quantity is no longer valid for ${item.productName}`, 409)
        }

        const acceptedQuantity = receiptQuantity - damagedQuantity

        item.previouslyReceivedQuantity = currentReceived
        item.orderedQuantity = orderedQuantity
        item.acceptedQuantity = acceptedQuantity

        acceptedLines.push({
          item,
          purchaseItem,
          currentReceived,
          receiptQuantity,
          damagedQuantity,
          acceptedQuantity,
        })
      }

      // Ensure default Chart of Accounts exist for this company.
      await initializeDefaultChartOfAccounts(companyId, session)

      // Create automatic accounting entry before updating accepted quantities.
      const receiptAccounting = await createGoodsReceiptJournalEntry({
        receipt,
        purchase,
        acceptedLines,
        companyId,
        userId: req.user.userId,
        session,
      })

      createdJournalEntry = receiptAccounting.journalEntry

      const valuationMap = new Map(receiptAccounting.lineValuations.map((line) => [String(line.purchaseItemId), line]))

      // Update stock only for accepted, undamaged quantities.
      for (const line of acceptedLines) {
        const { item, purchaseItem, receiptQuantity, damagedQuantity, acceptedQuantity } = line

        if (acceptedQuantity > 0) {
          const valuation = valuationMap.get(String(purchaseItem._id))

          if (!valuation) {
            throw httpError(`Inventory valuation missing for ${item.productName}`, 409)
          }

          const existingInventory = await Inventory.findOne({
            companyId,
            warehouseId: receipt.warehouseId,
            productId: item.productId,
          }).session(session)

          const previousStock = Number(existingInventory?.currentStock || 0)
          const previousStockValue = roundMoney(Number(existingInventory?.stockValue || 0))

          if (!Number.isFinite(previousStock) || previousStock < 0 || !Number.isFinite(previousStockValue) || previousStockValue < 0) {
            throw httpError(`Invalid existing inventory valuation for ${item.productName}`, 409)
          }

          // Existing stock must have a valid valuation before adding new stock.
          if (previousStock > 0 && previousStockValue <= 0) {
            throw httpError(`Existing stock valuation is missing for ${item.productName}. Please complete inventory valuation first.`, 409)
          }

          if (previousStock === 0 && previousStockValue !== 0) {
            throw httpError(`Inventory quantity and stock value are inconsistent for ${item.productName}`, 409)
          }

          const newStock = previousStock + acceptedQuantity

          const newStockValue = roundMoney(previousStockValue + valuation.totalCost)

          const newAverageCost = roundMoney(newStockValue / newStock)

          if (!Number.isFinite(newAverageCost) || newAverageCost < 0 || !Number.isFinite(newStockValue)) {
            throw httpError(`Unable to calculate weighted average cost for ${item.productName}`, 409)
          }

          const inventoryFilter = existingInventory
            ? { _id: existingInventory._id, companyId }
            : {
                companyId,
                warehouseId: receipt.warehouseId,
                productId: item.productId,
              }

          const inventoryUpdate = await Inventory.findOneAndUpdate(
            inventoryFilter,
            {
              $set: {
                currentStock: newStock,
                averageCost: newAverageCost,
                stockValue: newStockValue,
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
              upsert: !existingInventory,
              setDefaultsOnInsert: true,
              runValidators: true,
              session,
            },
          )

          await InventoryMovement.create(
            [
              {
                companyId,
                productId: item.productId,
                warehouseId: receipt.warehouseId,
                type: 'STOCK_IN',
                quantity: acceptedQuantity,

                unitCost: valuation.unitCost,
                totalCost: valuation.totalCost,
                averageCostAfter: newAverageCost,

                previousStock,
                newStock: Number(inventoryUpdate.currentStock),
                reason: `Goods Receipt ${receipt.receiptNumber}`,
                reference: receipt.receiptNumber,
                createdBy: req.user.userId,
              },
            ],
            { session },
          )
        }

        // Update total physically received quantity
        purchaseItem.receivedQuantity = Number(purchaseItem.receivedQuantity || 0) + receiptQuantity

        // Update total damaged quantity
        purchaseItem.damagedQuantity = Number(purchaseItem.damagedQuantity || 0) + damagedQuantity

        // Update total accepted quantity
        purchaseItem.acceptedQuantity = Number(purchaseItem.acceptedQuantity || 0) + acceptedQuantity
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
      message: 'Goods receipt confirmed, inventory updated and accounting entry posted successfully',
      receipt: confirmedReceipt,
      journalEntry: createdJournalEntry,
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

      const purchase = await lockPurchaseForReceipt(receipt.purchaseId, companyId, session)

      if (!['Ordered', 'Partially Received'].includes(purchase.status)) {
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

        if (damagedQuantity > 0 && !String(input.damageReason || '').trim()) {
          throw httpError('Damage reason is required when damaged quantity is greater than zero')
        }

        const orderedQuantity = Number(purchaseItem.quantity)
        const previouslyReceivedQuantity = Number(purchaseItem.receivedQuantity || 0)

        if (!Number.isFinite(orderedQuantity) || orderedQuantity <= 0 || !Number.isFinite(previouslyReceivedQuantity) || previouslyReceivedQuantity < 0 || previouslyReceivedQuantity > orderedQuantity) {
          throw httpError(`Invalid purchase quantity for ${purchaseItem.productName}`, 409)
        }

        const remainingQuantity = orderedQuantity - previouslyReceivedQuantity

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
          orderedQuantity,
          previouslyReceivedQuantity,
          receivedQuantity,
          damagedQuantity,
          damageReason: String(input.damageReason || '').trim(),
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

    const reason = String(req.body?.reason || '').trim()

    if (reason.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a cancellation reason (at least 3 characters)',
      })
    }

    let cancelledReceipt

    await session.withTransaction(async () => {
      const receipt = await GoodsReceipt.findOne({
        _id: id,
        companyId,
      }).session(session)

      if (!receipt) {
        throw httpError('Goods receipt not found', 404)
      }

      if (receipt.status !== 'Draft') {
        throw httpError(`Only Draft receipts can be cancelled. Current status: ${receipt.status}`, 409)
      }

      await lockPurchaseForReceipt(receipt.purchaseId, companyId, session)

      const updatedReceipt = await GoodsReceipt.findOneAndUpdate(
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
          session,
        },
      )

      if (!updatedReceipt) {
        throw httpError('Goods receipt is no longer available for cancellation', 409)
      }

      cancelledReceipt = updatedReceipt
    })

    return res.status(200).json({
      success: true,
      message: 'Goods receipt draft cancelled successfully',
      receipt: cancelledReceipt,
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
