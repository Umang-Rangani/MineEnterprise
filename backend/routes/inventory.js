const express = require('express')
const mongoose = require('mongoose')

const Product = require('../models/Product')
const Warehouse = require('../models/Warehouse')
const Inventory = require('../models/Inventory')
const InventoryMovement = require('../models/InventoryMovement')
const GoodsReceipt = require('../models/GoodsReceipt')
const Purchase = require('../models/Purchase')

const permissionMiddleware = require('../middleware/permissionMiddleware')
const authMiddleware = require('../middleware/authMiddleware')

const router = express.Router()

router.use(authMiddleware)

// HELPERS

function getUserId(req) {
  return req.user?.userId || req.user?._id || req.user?.id
}

function validCompanyId(req, res) {
  const companyId = req.user?.companyId

  if (!companyId || !mongoose.isValidObjectId(companyId)) {
    res.status(403).json({
      success: false,
      message: 'Valid company access is required.',
    })
    return null
  }

  return new mongoose.Types.ObjectId(companyId)
}

function validQuantity(value) {
  return value !== '' && typeof value !== 'boolean' && value !== null && value !== undefined && Number.isFinite(Number(value)) && Number(value) > 0
}

function validNonNegativeQuantity(value) {
  return value !== '' && typeof value !== 'boolean' && value !== null && value !== undefined && Number.isFinite(Number(value)) && Number(value) >= 0
}

function handleError(res, error) {
  if (error.status) {
    return res.status(error.status).json({
      success: false,
      message: error.message,
    })
  }

  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: error.message,
    })
  }

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'A conflicting inventory record already exists. Please refresh and retry.',
    })
  }

  return null
}

function createError(message, status = 400) {
  const error = new Error(message)
  error.status = status
  return error
}

function validateTextFields({ reason, reference }) {
  if (reason !== undefined && typeof reason !== 'string') {
    throw createError('Reason must be text.')
  }

  if (reference !== undefined && typeof reference !== 'string') {
    throw createError('Reference must be text.')
  }

  if (typeof reason === 'string' && reason.trim().length > 500) {
    throw createError('Reason cannot exceed 500 characters.')
  }

  if (typeof reference === 'string' && reference.trim().length > 100) {
    throw createError('Reference cannot exceed 100 characters.')
  }
}

function getPagination(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20))

  return { page, limit }
}

function getStockStatus(availableStock, minStockLevel = 0) {
  if (availableStock <= 0) return 'Out of Stock'
  if (availableStock <= minStockLevel) return 'Low Stock'
  return 'In Stock'
}

function getAvailableStock(inventory) {
  return inventory.currentStock - inventory.reservedStock
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100
}

function validateUnitCost(value, fieldName = 'Unit cost') {
  if (value === '' || value === null || value === undefined || typeof value === 'boolean' || !Number.isFinite(Number(value)) || Number(value) <= 0) {
    throw createError(`${fieldName} must be greater than zero.`)
  }

  return roundMoney(Number(value))
}

function validateInventoryValuation(inventory, label = 'Inventory') {
  const quantity = Number(inventory.currentStock) || 0
  const averageCost = Number(inventory.averageCost) || 0
  const stockValue = Number(inventory.stockValue) || 0

  if (quantity < 0 || averageCost < 0 || stockValue < 0) {
    throw createError(`${label} contains invalid negative valuation data. Complete valuation review first.`)
  }

  if (quantity === 0) {
    if (Math.abs(stockValue) > 0.01) {
      throw createError(`${label} has zero quantity but non-zero stock value. Complete valuation review first.`)
    }

    return {
      quantity,
      averageCost: 0,
      stockValue: 0,
    }
  }

  if (averageCost <= 0 || stockValue <= 0) {
    throw createError(`${label} has stock without a reliable valuation. Complete Inventory Valuation Review first.`)
  }

  const expectedValue = roundMoney(quantity * averageCost)

  if (Math.abs(expectedValue - stockValue) > 0.02) {
    throw createError(`${label} average cost and stock value do not reconcile. Complete Inventory Valuation Review first.`)
  }

  return {
    quantity,
    averageCost,
    stockValue,
  }
}

function getNewWeightedAverage({ previousQuantity, previousValue, addedQuantity, addedValue }) {
  const newQuantity = Number(previousQuantity) + Number(addedQuantity)
  const newValue = roundMoney(Number(previousValue) + Number(addedValue))

  return {
    newQuantity,
    newValue,
    newAverageCost: newQuantity > 0 ? roundMoney(newValue / newQuantity) : 0,
  }
}

async function getCompanyWarehouse(companyId, warehouseId, session) {
  if (!mongoose.isValidObjectId(warehouseId)) {
    throw createError('Valid warehouse ID is required.')
  }

  let query = Warehouse.findOne({
    _id: warehouseId,
    companyId,
    status: 'Active',
  })

  if (session) query = query.session(session)

  const warehouse = await query

  if (!warehouse) {
    throw createError('Active warehouse not found in your company.', 404)
  }

  return warehouse
}

async function getCompanyWarehouseForRead(companyId, warehouseId) {
  if (!mongoose.isValidObjectId(warehouseId)) {
    throw createError('Valid warehouse ID is required.')
  }

  const warehouse = await Warehouse.findOne({
    _id: warehouseId,
    companyId,
  })

  if (!warehouse) {
    throw createError('Warehouse not found in your company.', 404)
  }

  return warehouse
}

async function validateProduct(companyId, productId, session) {
  if (!mongoose.isValidObjectId(productId)) {
    throw createError('Valid product ID is required.')
  }

  let query = Product.findOne({
    _id: productId,
    companyId,
  })

  if (session) query = query.session(session)

  const product = await query

  if (!product) {
    throw createError('Product not found in your company.', 404)
  }

  if (product.status !== 'Active') {
    throw createError('This product is inactive. Activate the product before performing stock operations.', 400)
  }

  return product
}

async function getOrCreateWarehouseInventory({ companyId, warehouseId, productId, userId, session }) {
  return Inventory.findOneAndUpdate(
    {
      companyId,
      warehouseId,
      productId,
    },
    {
      $setOnInsert: {
        companyId,
        warehouseId,
        productId,
        currentStock: 0,
        reservedStock: 0,
        averageCost: 0,
        stockValue: 0,
        createdBy: userId,
      },
    },
    {
      upsert: true,
      new: true,
      session,
      setDefaultsOnInsert: true,
      runValidators: true,
    },
  )
}

function getStockMovementData({ companyId, productId, warehouseId, type, quantity, previousStock, newStock, reason, reference, userId, destinationWarehouseId, unitCost, totalCost, averageCostAfter }) {
  return {
    companyId,
    productId,
    warehouseId,
    ...(destinationWarehouseId ? { destinationWarehouseId } : {}),
    type,
    quantity,
    previousStock,
    newStock,
    ...(unitCost !== undefined ? { unitCost: roundMoney(unitCost) } : {}),
    ...(totalCost !== undefined ? { totalCost: roundMoney(totalCost) } : {}),
    ...(averageCostAfter !== undefined ? { averageCostAfter: roundMoney(averageCostAfter) } : {}),
    reason,
    reference,
    createdBy: userId,
  }
}

// HISTORICAL VALUATION HELPERS

function allocateAmount(amount, items, weights) {
  const totalAmount = roundMoney(Number(amount) || 0)
  const totalWeight = weights.reduce((sum, weight) => sum + Math.max(0, Number(weight) || 0), 0)

  if (!items.length) return []

  if (totalWeight <= 0) {
    if (totalAmount !== 0) {
      throw createError('Cannot allocate purchase charges because item taxable values are zero.')
    }

    return items.map(() => 0)
  }

  const positiveIndexes = []

  weights.forEach((weight, index) => {
    if (Number(weight) > 0) positiveIndexes.push(index)
  })

  const result = items.map(() => 0)
  let allocated = 0

  positiveIndexes.forEach((index, position) => {
    if (position === positiveIndexes.length - 1) {
      result[index] = roundMoney(totalAmount - allocated)
      return
    }

    const weight = Math.max(0, Number(weights[index]) || 0)
    const value = roundMoney((totalAmount * weight) / totalWeight)

    result[index] = value
    allocated = roundMoney(allocated + value)
  })

  return result
}

function getHistoricalPurchaseItemCosts(purchase) {
  const items = purchase.items || []

  if (!items.length) {
    throw createError(`Purchase ${purchase.purchaseNumber || purchase._id} has no items.`)
  }

  const itemData = items.map((item) => {
    const quantity = Number(item.quantity) || 0
    const unitPrice = Number(item.unitPrice) || 0
    const grossAmount = roundMoney(quantity * unitPrice)
    const itemDiscount = roundMoney(Number(item.discountAmount) || 0)

    const taxableAmount = roundMoney(Number(item.taxableAmount) || Math.max(0, grossAmount - itemDiscount))

    return {
      purchaseItemId: item._id,
      productId: item.productId,
      orderedQuantity: quantity,
      itemDiscount,
      taxableAmount,
    }
  })

  const totalItemDiscount = roundMoney(itemData.reduce((sum, item) => sum + item.itemDiscount, 0))

  const purchaseDiscount = roundMoney(Math.max(0, (Number(purchase.discountAmount) || 0) - totalItemDiscount))

  const shippingCharges = roundMoney(Number(purchase.shippingCharges) || 0)
  const adjustmentAmount = roundMoney(Number(purchase.adjustmentAmount) || 0)
  const weights = itemData.map((item) => item.taxableAmount)

  const allocatedDiscount = allocateAmount(purchaseDiscount, itemData, weights)
  const allocatedShipping = allocateAmount(shippingCharges, itemData, weights)
  const allocatedAdjustment = allocateAmount(adjustmentAmount, itemData, weights)

  return itemData.map((item, index) => {
    const fullItemCost = roundMoney(item.taxableAmount - allocatedDiscount[index] + allocatedShipping[index] + allocatedAdjustment[index])

    if (!Number.isFinite(item.orderedQuantity) || item.orderedQuantity <= 0 || fullItemCost < 0) {
      throw createError(`Invalid historical valuation for purchase item ${item.purchaseItemId}.`)
    }

    return {
      purchaseItemId: item.purchaseItemId,
      productId: item.productId,
      orderedQuantity: item.orderedQuantity,
      fullItemCost,
      unitCost: roundMoney(fullItemCost / item.orderedQuantity),
    }
  })
}

function getMovementKey({ reference, productId, warehouseId }) {
  return [String(reference || '').trim(), String(productId || ''), String(warehouseId || '')].join('|')
}

function getReceiptMovementMap(movements) {
  const map = new Map()

  for (const movement of movements) {
    if (movement.type !== 'STOCK_IN') continue

    const reference = String(movement.reference || '').trim()
    if (!reference) continue

    const key = getMovementKey({
      reference,
      productId: movement.productId,
      warehouseId: movement.warehouseId,
    })

    if (!map.has(key)) {
      map.set(key, {
        quantity: 0,
        movements: [],
      })
    }

    const entry = map.get(key)
    entry.quantity += Number(movement.quantity) || 0
    entry.movements.push(movement)
  }

  for (const entry of map.values()) {
    entry.quantity = Number(entry.quantity.toFixed(6))
    entry.movements.sort((a, b) => {
      const difference = new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
      return difference || String(a._id).localeCompare(String(b._id))
    })
  }

  return map
}

function buildGoodsReceiptValuationMap({ receipts, purchases, movements }) {
  const purchaseMap = new Map(purchases.map((purchase) => [String(purchase._id), purchase]))

  const movementMap = getReceiptMovementMap(movements)
  const acceptedQuantityMap = new Map()
  const valuationMap = new Map()
  const issues = []

  const sortedReceipts = [...receipts].sort((a, b) => {
    const difference = new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
    return difference || String(a._id).localeCompare(String(b._id))
  })

  for (const receipt of sortedReceipts) {
    const purchase = purchaseMap.get(String(receipt.purchaseId))

    if (!purchase) {
      issues.push({
        receiptNumber: receipt.receiptNumber,
        reason: 'Linked purchase record was not found.',
      })
      continue
    }

    let purchaseCosts

    try {
      purchaseCosts = getHistoricalPurchaseItemCosts(purchase)
    } catch (error) {
      issues.push({
        receiptNumber: receipt.receiptNumber,
        reason: error.message,
      })
      continue
    }

    const purchaseCostMap = new Map(purchaseCosts.map((item) => [String(item.purchaseItemId), item]))

    const receiptGroups = new Map()

    for (const receiptItem of receipt.items || []) {
      const acceptedQuantity = Number(receiptItem.acceptedQuantity) || 0
      if (acceptedQuantity <= 0) continue

      const purchaseItemId = String(receiptItem.purchaseItemId || '')
      const purchaseItem = purchaseCostMap.get(purchaseItemId)

      if (!purchaseItem) {
        issues.push({
          receiptNumber: receipt.receiptNumber,
          productId: String(receiptItem.productId || ''),
          reason: 'Purchase item could not be matched.',
        })
        continue
      }

      const orderedQuantity = Number(purchaseItem.orderedQuantity) || 0

      if (orderedQuantity <= 0 || acceptedQuantity > orderedQuantity) {
        issues.push({
          receiptNumber: receipt.receiptNumber,
          purchaseItemId,
          reason: 'Invalid accepted or ordered quantity.',
        })
        continue
      }

      const previousAccepted = acceptedQuantityMap.get(purchaseItemId) || 0
      const cumulativeAccepted = previousAccepted + acceptedQuantity

      if (cumulativeAccepted > orderedQuantity) {
        issues.push({
          receiptNumber: receipt.receiptNumber,
          purchaseItemId,
          reason: 'Cumulative accepted quantity exceeds ordered quantity.',
        })
        continue
      }

      const previousValue = roundMoney((purchaseItem.fullItemCost * previousAccepted) / orderedQuantity)

      const cumulativeValue = roundMoney((purchaseItem.fullItemCost * cumulativeAccepted) / orderedQuantity)

      const lineCost = roundMoney(cumulativeValue - previousValue)

      acceptedQuantityMap.set(purchaseItemId, cumulativeAccepted)

      const productId = String(receiptItem.productId || purchaseItem.productId)
      const warehouseId = String(receipt.warehouseId)

      const key = getMovementKey({
        reference: receipt.receiptNumber,
        productId,
        warehouseId,
      })

      if (!receiptGroups.has(key)) {
        receiptGroups.set(key, {
          reference: receipt.receiptNumber,
          productId,
          warehouseId,
          quantity: 0,
          totalCost: 0,
        })
      }

      const group = receiptGroups.get(key)
      group.quantity += acceptedQuantity
      group.totalCost = roundMoney(group.totalCost + lineCost)
    }

    for (const [key, expected] of receiptGroups) {
      const actual = movementMap.get(key)

      const quantityMatches = Boolean(actual && Math.abs(actual.quantity - expected.quantity) < 0.000001)

      const movementEntries = actual?.movements || []

      valuationMap.set(key, {
        ...expected,
        movementQuantity: actual?.quantity ?? 0,
        movements: movementEntries,
        movementMatched: quantityMatches,
        reason: quantityMatches ? '' : actual ? 'Receipt quantity does not match inventory movement quantity.' : 'Matching inventory movement was not found.',
      })

      if (!quantityMatches) {
        issues.push({
          receiptNumber: expected.reference,
          productId: expected.productId,
          warehouseId: expected.warehouseId,
          expectedQuantity: expected.quantity,
          actualQuantity: actual?.quantity ?? 0,
          reason: valuationMap.get(key).reason,
        })
      }
    }
  }

  return {
    valuationMap,
    issues,
  }
}

function buildTransferMovementMap(movements) {
  const groups = new Map()
  const issues = []

  for (const movement of movements) {
    if (movement.type !== 'TRANSFER') continue

    const reference = String(movement.reference || '').trim()
    const productId = String(movement.productId || '')
    const warehouseId = String(movement.warehouseId || '')
    const destinationWarehouseId = String(movement.destinationWarehouseId || '')

    if (!reference || !productId || !warehouseId || !destinationWarehouseId || warehouseId === destinationWarehouseId) {
      issues.push({
        movementId: movement._id,
        reason: 'Transfer movement has incomplete warehouse or reference information.',
      })
      continue
    }

    const warehousePair = [warehouseId, destinationWarehouseId].sort()
    const key = [reference, productId, warehousePair[0], warehousePair[1]].join('|')

    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(movement)
  }

  const transferMap = new Map()

  for (const [key, entries] of groups) {
    if (entries.length !== 2) {
      issues.push({
        reference: entries[0]?.reference || '',
        reason: 'Transfer must contain exactly two matching movement records.',
      })
      continue
    }

    const outbound = entries.filter((item) => Number(item.newStock) < Number(item.previousStock))

    const inbound = entries.filter((item) => Number(item.newStock) > Number(item.previousStock))

    if (outbound.length !== 1 || inbound.length !== 1) {
      issues.push({
        reference: entries[0]?.reference || '',
        reason: 'Transfer source and destination movements could not be identified.',
      })
      continue
    }

    const source = outbound[0]
    const destination = inbound[0]

    const quantityMatches = Math.abs(Number(source.quantity) - Number(destination.quantity)) < 0.000001

    const warehousesMatch = String(source.destinationWarehouseId) === String(destination.warehouseId) && String(destination.destinationWarehouseId) === String(source.warehouseId)

    const sourceSnapshotMatches = Math.abs(Number(source.previousStock) - Number(source.newStock) - Number(source.quantity)) < 0.000001

    const destinationSnapshotMatches = Math.abs(Number(destination.newStock) - Number(destination.previousStock) - Number(destination.quantity)) < 0.000001

    if (!quantityMatches || !warehousesMatch || !sourceSnapshotMatches || !destinationSnapshotMatches) {
      issues.push({
        reference: source.reference,
        reason: 'Transfer quantity, stock snapshots or warehouse pairing do not match.',
      })
      continue
    }

    const transfer = {
      key,
      reference: source.reference,
      productId: String(source.productId),
      sourceWarehouseId: String(source.warehouseId),
      destinationWarehouseId: String(destination.warehouseId),
      quantity: Number(source.quantity),
      sourceMovement: source,
      destinationMovement: destination,
    }

    transferMap.set(String(source._id), transfer)
    transferMap.set(String(destination._id), transfer)
  }

  return {
    transferMap,
    issues,
  }
}

function getInventoryKey(productId, warehouseId) {
  return `${String(productId)}|${String(warehouseId)}`
}

function replayStockMovements({ movements, products, receiptValuationMap, transferMap }) {
  const productMap = new Map(products.map((product) => [String(product._id), product]))

  const states = new Map()
  const issues = []
  const processedTransfers = new Set()
  const processedReceipts = new Set()

  const sortedMovements = [...movements].sort((a, b) => {
    const difference = new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
    return difference || String(a._id).localeCompare(String(b._id))
  })

  function getState(productId, warehouseId) {
    const key = getInventoryKey(productId, warehouseId)

    if (!states.has(key)) {
      states.set(key, {
        productId: String(productId),
        warehouseId: String(warehouseId),
        quantity: 0,
        stockValue: 0,
        averageCost: 0,
        fallbackQuantity: 0,
        fallbackValue: 0,
        historicalReceivedQuantity: 0,
        historicalPurchaseValue: 0,
        transferredInQuantity: 0,
        transferredOutQuantity: 0,
        manualReview: false,
        reasons: [],
      })
    }

    return states.get(key)
  }

  function addIssue(state, reason, movement) {
    state.manualReview = true

    if (!state.reasons.includes(reason)) {
      state.reasons.push(reason)
    }

    issues.push({
      productId: state.productId,
      warehouseId: state.warehouseId,
      movementId: movement?._id || null,
      reason,
    })
  }

  function updateAverageCost(state) {
    state.stockValue = roundMoney(state.stockValue)

    if (state.quantity <= 0) {
      state.quantity = 0
      state.stockValue = 0
      state.averageCost = 0
      return
    }

    state.averageCost = roundMoney(state.stockValue / state.quantity)
  }

  function checkMovementStock(state, movement) {
    const previousStock = Number(movement.previousStock)

    if (!Number.isFinite(previousStock) || Math.abs(previousStock - state.quantity) > 0.000001) {
      addIssue(state, 'Movement previous stock does not match reconstructed stock.', movement)
      return false
    }

    return true
  }

  function checkNewStock(movement, expected) {
    return Number.isFinite(Number(movement.newStock)) && Math.abs(Number(movement.newStock) - expected) < 0.000001
  }

  for (const movement of sortedMovements) {
    const productId = String(movement.productId)
    const warehouseId = String(movement.warehouseId)
    const state = getState(productId, warehouseId)
    const quantity = Number(movement.quantity)

    if (!Number.isFinite(quantity) || quantity <= 0) {
      addIssue(state, 'Movement quantity is invalid.', movement)
      continue
    }

    // TRANSFER
    if (movement.type === 'TRANSFER') {
      const transfer = transferMap.get(String(movement._id))

      if (!transfer) {
        addIssue(state, 'Transfer could not be matched with its corresponding movement.', movement)
        continue
      }

      if (processedTransfers.has(transfer.key)) continue

      // Process the transfer only when its source movement is reached.
      // If destination movement is earlier in sort order, wait for source.
      if (String(movement._id) !== String(transfer.sourceMovement._id)) {
        continue
      }

      const source = getState(transfer.productId, transfer.sourceWarehouseId)
      const destination = getState(transfer.productId, transfer.destinationWarehouseId)

      const sourceValid = checkMovementStock(source, transfer.sourceMovement)
      const destinationValid = checkMovementStock(destination, transfer.destinationMovement)

      if (!sourceValid || !destinationValid) {
        addIssue(source, 'Transfer source stock history does not reconcile.', transfer.sourceMovement)
        addIssue(destination, 'Transfer destination stock history does not reconcile.', transfer.destinationMovement)
        processedTransfers.add(transfer.key)
        continue
      }

      const sourceNewStock = source.quantity - transfer.quantity
      const destinationNewStock = destination.quantity + transfer.quantity

      if (transfer.quantity > source.quantity || !checkNewStock(transfer.sourceMovement, sourceNewStock) || !checkNewStock(transfer.destinationMovement, destinationNewStock)) {
        addIssue(source, 'Transfer stock snapshots do not reconcile with reconstructed stock.', transfer.sourceMovement)
        addIssue(destination, 'Transfer stock snapshots do not reconcile with reconstructed stock.', transfer.destinationMovement)
        processedTransfers.add(transfer.key)
        continue
      }

      if (source.quantity > 0 && (source.averageCost <= 0 || source.stockValue <= 0)) {
        addIssue(source, 'Transfer source has no reliable reconstructed stock valuation.', transfer.sourceMovement)
        processedTransfers.add(transfer.key)
        continue
      }

      const transferredValue = transfer.quantity === source.quantity ? source.stockValue : roundMoney(transfer.quantity * source.averageCost)

      if (destination.quantity > 0 && (destination.averageCost <= 0 || destination.stockValue <= 0)) {
        addIssue(destination, 'Transfer destination has no reliable reconstructed stock valuation.', transfer.destinationMovement)
        processedTransfers.add(transfer.key)
        continue
      }

      source.quantity = sourceNewStock
      source.stockValue = roundMoney(source.stockValue - transferredValue)
      source.transferredOutQuantity += transfer.quantity
      updateAverageCost(source)

      destination.quantity = destinationNewStock
      destination.stockValue = roundMoney(destination.stockValue + transferredValue)
      destination.transferredInQuantity += transfer.quantity
      updateAverageCost(destination)

      processedTransfers.add(transfer.key)
      continue
    }

    // STOCK IN
    if (movement.type === 'STOCK_IN') {
      const receiptKey = getMovementKey({
        reference: movement.reference,
        productId,
        warehouseId,
      })

      const receipt = receiptValuationMap.get(receiptKey)

      if (receipt) {
        if (processedReceipts.has(receiptKey)) continue

        processedReceipts.add(receiptKey)

        if (!receipt.movementMatched) {
          addIssue(state, receipt.reason, movement)
          continue
        }

        const receiptMovements = receipt.movements || []
        const firstMovement = receiptMovements[0]
        const lastMovement = receiptMovements[receiptMovements.length - 1]

        if (!firstMovement || !lastMovement) {
          addIssue(state, 'Receipt inventory movements are missing.', movement)
          continue
        }

        if (!checkMovementStock(state, firstMovement)) continue

        const expectedNewStock = state.quantity + receipt.quantity

        if (!checkNewStock(lastMovement, expectedNewStock)) {
          addIssue(state, 'Receipt ending stock does not match reconstructed stock.', lastMovement)
          continue
        }

        state.quantity = expectedNewStock
        state.stockValue = roundMoney(state.stockValue + receipt.totalCost)
        state.historicalReceivedQuantity += receipt.quantity
        state.historicalPurchaseValue = roundMoney(state.historicalPurchaseValue + receipt.totalCost)
        updateAverageCost(state)
        continue
      }

      if (!checkMovementStock(state, movement)) continue

      const expectedNewStock = state.quantity + quantity

      if (!checkNewStock(movement, expectedNewStock)) {
        addIssue(state, 'Stock In new stock does not match movement quantity.', movement)
        continue
      }

      const product = productMap.get(productId)
      const storedUnitCost = Number(movement.unitCost)
      const storedTotalCost = Number(movement.totalCost)

      let totalCost = null

      if (
        movement.unitCost !== null &&
        movement.unitCost !== undefined &&
        Number.isFinite(storedUnitCost) &&
        storedUnitCost > 0 &&
        movement.totalCost !== null &&
        movement.totalCost !== undefined &&
        Number.isFinite(storedTotalCost) &&
        storedTotalCost > 0
      ) {
        totalCost = storedTotalCost
      } else if (Number(product?.costPrice) > 0) {
        totalCost = roundMoney(quantity * Number(product.costPrice))
        state.fallbackQuantity += quantity
        state.fallbackValue = roundMoney(state.fallbackValue + totalCost)
      } else {
        addIssue(state, 'Stock In cost is unavailable. Manual valuation is required.', movement)
        continue
      }

      state.quantity = expectedNewStock
      state.stockValue = roundMoney(state.stockValue + totalCost)
      updateAverageCost(state)
      continue
    }

    // STOCK OUT
    if (movement.type === 'STOCK_OUT') {
      if (!checkMovementStock(state, movement)) continue

      if (quantity > state.quantity) {
        addIssue(state, 'Stock Out quantity exceeds reconstructed stock.', movement)
        continue
      }

      if (state.quantity > 0 && (state.averageCost <= 0 || state.stockValue <= 0)) {
        addIssue(state, 'Stock Out cannot be valued because reconstructed stock cost is unavailable.', movement)
        continue
      }

      const expectedNewStock = state.quantity - quantity

      if (!checkNewStock(movement, expectedNewStock)) {
        addIssue(state, 'Stock Out new stock does not match movement quantity.', movement)
        continue
      }

      const outgoingValue = quantity === state.quantity ? state.stockValue : roundMoney(quantity * state.averageCost)

      state.quantity = expectedNewStock
      state.stockValue = roundMoney(state.stockValue - outgoingValue)
      updateAverageCost(state)
      continue
    }

    // ADJUSTMENT
    if (movement.type === 'ADJUSTMENT') {
      if (!checkMovementStock(state, movement)) continue

      const previousStock = Number(movement.previousStock)
      const newStock = Number(movement.newStock)

      if (!Number.isFinite(newStock) || Math.abs(Math.abs(newStock - previousStock) - quantity) > 0.000001) {
        addIssue(state, 'Adjustment movement quantity is inconsistent.', movement)
        continue
      }

      const difference = newStock - previousStock

      if (difference < 0) {
        const removedQuantity = Math.abs(difference)

        if (removedQuantity > state.quantity) {
          addIssue(state, 'Negative adjustment exceeds reconstructed stock.', movement)
          continue
        }

        if (state.quantity > 0 && (state.averageCost <= 0 || state.stockValue <= 0)) {
          addIssue(state, 'Negative adjustment cannot be valued because stock cost is unavailable.', movement)
          continue
        }

        const adjustmentValue = removedQuantity === state.quantity ? state.stockValue : roundMoney(removedQuantity * state.averageCost)

        state.quantity = newStock
        state.stockValue = roundMoney(state.stockValue - adjustmentValue)
        updateAverageCost(state)
        continue
      }

      if (difference > 0) {
        const unitCost = Number(movement.unitCost)
        const totalCost = Number(movement.totalCost)

        if (!Number.isFinite(unitCost) || unitCost <= 0 || !Number.isFinite(totalCost) || totalCost <= 0) {
          addIssue(state, 'Positive adjustment has no reliable stored cost. Manual valuation is required.', movement)
          continue
        }

        if (!checkNewStock(movement, newStock)) {
          addIssue(state, 'Positive adjustment new stock does not match movement quantity.', movement)
          continue
        }

        state.quantity = newStock
        state.stockValue = roundMoney(state.stockValue + totalCost)
        state.fallbackQuantity += difference
        state.fallbackValue = roundMoney(state.fallbackValue + totalCost)
        updateAverageCost(state)
      }

      continue
    }

    addIssue(state, `Unsupported movement type: ${movement.type}`, movement)
  }

  return {
    states,
    issues,
  }
}

// GET /erp/inventory
router.get('/', permissionMiddleware('Inventory', 'VIEW'), async (req, res, next) => {
  try {
    const companyId = validCompanyId(req, res)
    if (!companyId) return

    const { page, limit } = getPagination(req.query)
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''

    const productFilter = { companyId }

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

      productFilter.$or = [{ name: { $regex: escapedSearch, $options: 'i' } }, { sku: { $regex: escapedSearch, $options: 'i' } }, { barcode: { $regex: escapedSearch, $options: 'i' } }]
    }

    if (['Active', 'Inactive'].includes(req.query.status)) {
      productFilter.status = req.query.status
    }

    let warehouse = null

    if (req.query.warehouseId) {
      warehouse = await getCompanyWarehouseForRead(companyId, req.query.warehouseId)
    }

    const [products, total] = await Promise.all([
      Product.find(productFilter)
        .select('_id name sku barcode unit costPrice sellingPrice openingStock minStockLevel status imageUrl categoryId')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      Product.countDocuments(productFilter),
    ])

    const productIds = products.map((product) => product._id)

    const inventoryFilter = {
      companyId,
      productId: { $in: productIds },
    }

    if (warehouse) inventoryFilter.warehouseId = warehouse._id

    const inventories = productIds.length ? await Inventory.find(inventoryFilter).populate('warehouseId', 'name code').lean() : []

    const inventoryMap = new Map()

    for (const row of inventories) {
      const key = String(row.productId)

      if (!inventoryMap.has(key)) inventoryMap.set(key, [])
      inventoryMap.get(key).push(row)
    }

    const inventoryItems = products.map((product) => {
      const rows = inventoryMap.get(String(product._id)) || []

      const currentStock = rows.reduce((sum, row) => sum + Number(row.currentStock || 0), 0)
      const reservedStock = rows.reduce((sum, row) => sum + Number(row.reservedStock || 0), 0)
      const stockValue = roundMoney(rows.reduce((sum, row) => sum + Number(row.stockValue || 0), 0))
      const availableStock = Math.max(0, currentStock - reservedStock)
      const averageCost = currentStock > 0 ? roundMoney(stockValue / currentStock) : 0

      return {
        ...product,
        inventoryId: rows.length === 1 ? rows[0]._id : null,
        currentStock,
        reservedStock,
        availableStock,
        averageCost,
        stockValue,
        stockStatus: getStockStatus(availableStock, product.minStockLevel),
        warehouseId: warehouse?._id || null,
        warehouseName: warehouse?.name || null,
        warehouseStock: rows.map((row) => ({
          inventoryId: row._id,
          warehouseId: row.warehouseId?._id || row.warehouseId,
          warehouseName: row.warehouseId?.name || '',
          warehouseCode: row.warehouseId?.code || '',
          currentStock: row.currentStock,
          reservedStock: row.reservedStock,
          availableStock: Math.max(0, row.currentStock - row.reservedStock),
          averageCost: Number(row.averageCost || 0),
          stockValue: Number(row.stockValue || 0),
        })),
      }
    })

    return res.status(200).json({
      success: true,
      inventory: inventoryItems,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    if (handleError(res, error)) return
    return next(error)
  }
})

// INVENTORY VALUATION PREVIEW - READ ONLY

router.get('/valuation-preview', permissionMiddleware('Inventory', 'VIEW'), async (req, res, next) => {
  try {
    const companyId = validCompanyId(req, res)
    if (!companyId) return

    const productId = req.query.productId
    const warehouseId = req.query.warehouseId

    if (productId && !mongoose.isValidObjectId(productId)) {
      throw createError('Invalid product ID.')
    }

    if (warehouseId && !mongoose.isValidObjectId(warehouseId)) {
      throw createError('Invalid warehouse ID.')
    }

    if (warehouseId) {
      await getCompanyWarehouseForRead(companyId, warehouseId)
    }

    const productFilter = { companyId }
    if (productId) productFilter._id = productId

    const inventoryFilter = { companyId }
    if (productId) inventoryFilter.productId = productId
    if (warehouseId) inventoryFilter.warehouseId = warehouseId

    const movementFilter = { companyId }
    if (productId) movementFilter.productId = productId

    if (warehouseId) {
      movementFilter.$or = [{ warehouseId }, { destinationWarehouseId: warehouseId }]
    }

    const receiptFilter = {
      companyId,
      status: 'Confirmed',
    }

    if (warehouseId) receiptFilter.warehouseId = warehouseId

    const [products, inventories, movements, receipts] = await Promise.all([
      Product.find(productFilter).select('_id name sku costPrice').lean(),

      Inventory.find(inventoryFilter).populate('productId', 'name sku costPrice').populate('warehouseId', 'name code').lean(),

      InventoryMovement.find(movementFilter).sort({ createdAt: 1, _id: 1 }).lean(),

      GoodsReceipt.find(receiptFilter).lean(),
    ])

    const purchaseIds = [...new Set(receipts.map((receipt) => String(receipt.purchaseId)))].filter((id) => mongoose.isValidObjectId(id))

    const purchases = purchaseIds.length
      ? await Purchase.find({
          companyId,
          _id: { $in: purchaseIds },
        }).lean()
      : []

    const receiptResult = buildGoodsReceiptValuationMap({
      receipts,
      purchases,
      movements,
    })

    const transferResult = buildTransferMovementMap(movements)

    const replayResult = replayStockMovements({
      movements,
      products,
      receiptValuationMap: receiptResult.valuationMap,
      transferMap: transferResult.transferMap,
    })

    const inventoryMap = new Map(inventories.map((item) => [getInventoryKey(item.productId?._id || item.productId, item.warehouseId?._id || item.warehouseId), item]))

    const preview = []

    for (const [key, state] of replayResult.states) {
      const actual = inventoryMap.get(key)

      const actualQuantity = Number(actual?.currentStock || 0)
      const actualAverageCost = Number(actual?.averageCost || 0)
      const actualStockValue = Number(actual?.stockValue || 0)

      const quantityMatches = Boolean(actual) && Math.abs(actualQuantity - state.quantity) < 0.000001

      const validExistingValuation =
        Boolean(actual && actualQuantity > 0 && actualAverageCost > 0 && actualStockValue > 0 && Math.abs(roundMoney(actualAverageCost * actualQuantity) - actualStockValue) <= 0.02) ||
        Boolean(actual && actualQuantity === 0 && actualAverageCost === 0 && actualStockValue === 0)

      const reasons = [...state.reasons]

      if (!actual) reasons.push('Inventory record is missing.')

      if (actual && !quantityMatches) {
        reasons.push('Reconstructed quantity does not match current inventory quantity.')
      }

      const manualReview = state.manualReview || !quantityMatches || (!validExistingValuation && state.quantity > 0 && state.stockValue <= 0)

      const product = products.find((item) => String(item._id) === state.productId)

      preview.push({
        productId: state.productId,
        productName: product?.name || actual?.productId?.name || '',
        sku: product?.sku || actual?.productId?.sku || '',
        warehouseId: state.warehouseId,
        warehouseName: actual?.warehouseId?.name || '',
        reconstructedQuantity: state.quantity,
        actualQuantity,
        quantityMatches,
        reconstructedAverageCost: state.averageCost,
        reconstructedStockValue: state.stockValue,
        existingAverageCost: actualAverageCost,
        existingStockValue: actualStockValue,
        existingValuationValid: validExistingValuation,
        fallbackQuantity: state.fallbackQuantity,
        fallbackValue: state.fallbackValue,
        historicalReceivedQuantity: state.historicalReceivedQuantity,
        historicalPurchaseValue: state.historicalPurchaseValue,
        transferredInQuantity: state.transferredInQuantity,
        transferredOutQuantity: state.transferredOutQuantity,
        status: manualReview ? 'Manual Review' : validExistingValuation ? 'Existing Valuation Preserved' : 'Ready for Valuation',
        reasons: [...new Set(reasons)],
      })
    }

    for (const inventory of inventories) {
      const key = getInventoryKey(inventory.productId?._id || inventory.productId, inventory.warehouseId?._id || inventory.warehouseId)

      if (replayResult.states.has(key)) continue

      const actualQuantity = Number(inventory.currentStock || 0)
      const actualAverageCost = Number(inventory.averageCost || 0)
      const actualStockValue = Number(inventory.stockValue || 0)

      const validExistingValuation = actualQuantity === 0 ? actualAverageCost === 0 && actualStockValue === 0 : actualAverageCost > 0 && actualStockValue > 0 && Math.abs(roundMoney(actualQuantity * actualAverageCost) - actualStockValue) <= 0.02

      preview.push({
        productId: String(inventory.productId?._id || inventory.productId),
        productName: inventory.productId?.name || '',
        sku: inventory.productId?.sku || '',
        warehouseId: String(inventory.warehouseId?._id || inventory.warehouseId),
        warehouseName: inventory.warehouseId?.name || '',
        reconstructedQuantity: 0,
        actualQuantity,
        quantityMatches: actualQuantity === 0,
        reconstructedAverageCost: 0,
        reconstructedStockValue: 0,
        existingAverageCost: actualAverageCost,
        existingStockValue: actualStockValue,
        existingValuationValid: validExistingValuation,
        fallbackQuantity: 0,
        fallbackValue: 0,
        historicalReceivedQuantity: 0,
        historicalPurchaseValue: 0,
        transferredInQuantity: 0,
        transferredOutQuantity: 0,
        status: actualQuantity === 0 && validExistingValuation ? 'Existing Valuation Preserved' : 'Manual Review',
        reasons: actualQuantity === 0 && validExistingValuation ? [] : ['No movement history was found for this inventory record.'],
      })
    }

    const summary = {
      totalRecords: preview.length,
      readyForValuation: preview.filter((item) => item.status === 'Ready for Valuation').length,
      existingValuationPreserved: preview.filter((item) => item.status === 'Existing Valuation Preserved').length,
      manualReview: preview.filter((item) => item.status === 'Manual Review').length,
      reconstructedStockValue: roundMoney(preview.reduce((sum, item) => sum + Number(item.reconstructedStockValue || 0), 0)),
    }

    return res.status(200).json({
      success: true,
      message: 'Read-only inventory valuation preview generated successfully.',
      data: {
        summary,
        preview,
        issues: [...receiptResult.issues, ...transferResult.issues, ...replayResult.issues],
      },
    })
  } catch (error) {
    if (handleError(res, error)) return
    return next(error)
  }
})

// GET /erp/inventory/:id/history
router.get('/:id/history', permissionMiddleware('Inventory', 'VIEW_HISTORY'), async (req, res, next) => {
  try {
    const companyId = validCompanyId(req, res)
    if (!companyId) return

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID.',
      })
    }

    const product = await Product.findOne({
      _id: req.params.id,
      companyId,
    })
      .select('_id')
      .lean()

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      })
    }

    const { page, limit } = getPagination(req.query)

    const filter = {
      companyId,
      productId: product._id,
    }

    if (req.query.warehouseId) {
      const warehouse = await getCompanyWarehouseForRead(companyId, req.query.warehouseId)

      filter.$or = [{ warehouseId: warehouse._id }, { destinationWarehouseId: warehouse._id }]
    }

    const [movements, total] = await Promise.all([
      InventoryMovement.find(filter)
        .populate('createdBy', 'name email')
        .populate('warehouseId', 'name code')
        .populate('destinationWarehouseId', 'name code')
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      InventoryMovement.countDocuments(filter),
    ])

    return res.status(200).json({
      success: true,
      movements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    if (handleError(res, error)) return
    return next(error)
  }
})

// GET /erp/inventory/:id
router.get('/:id', permissionMiddleware('Inventory', 'VIEW'), async (req, res, next) => {
  try {
    const companyId = validCompanyId(req, res)
    if (!companyId) return

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID.',
      })
    }

    const product = await Product.findOne({
      _id: req.params.id,
      companyId,
    })
      .populate('categoryId', 'name')
      .lean()

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      })
    }

    let warehouse = null

    if (req.query.warehouseId) {
      warehouse = await getCompanyWarehouseForRead(companyId, req.query.warehouseId)
    }

    const filter = {
      companyId,
      productId: product._id,
    }

    if (warehouse) filter.warehouseId = warehouse._id

    const rows = await Inventory.find(filter).populate('warehouseId', 'name code').lean()

    const currentStock = rows.reduce((sum, row) => sum + Number(row.currentStock || 0), 0)
    const reservedStock = rows.reduce((sum, row) => sum + Number(row.reservedStock || 0), 0)
    const stockValue = roundMoney(rows.reduce((sum, row) => sum + Number(row.stockValue || 0), 0))
    const averageCost = currentStock > 0 ? roundMoney(stockValue / currentStock) : 0
    const availableStock = Math.max(0, currentStock - reservedStock)

    return res.status(200).json({
      success: true,
      inventory: {
        ...product,
        inventoryId: rows.length === 1 ? rows[0]._id : null,
        warehouseId: warehouse?._id || null,
        warehouseName: warehouse?.name || null,
        currentStock,
        reservedStock,
        availableStock,
        averageCost,
        stockValue,
        stockStatus: getStockStatus(availableStock, product.minStockLevel),
        warehouseStock: rows.map((row) => ({
          inventoryId: row._id,
          warehouseId: row.warehouseId?._id || row.warehouseId,
          warehouseName: row.warehouseId?.name || '',
          warehouseCode: row.warehouseId?.code || '',
          currentStock: row.currentStock,
          reservedStock: row.reservedStock,
          availableStock: Math.max(0, row.currentStock - row.reservedStock),
          averageCost: Number(row.averageCost || 0),
          stockValue: Number(row.stockValue || 0),
        })),
      },
    })
  } catch (error) {
    if (handleError(res, error)) return
    return next(error)
  }
})

// POST /erp/inventory/stock-in
router.post('/stock-in', permissionMiddleware('Inventory', 'ADJUST_STOCK'), async (req, res, next) => {
  let session

  try {
    const companyId = validCompanyId(req, res)
    if (!companyId) return

    const userId = getUserId(req)

    const { productId, warehouseId, quantity, unitCost: rawUnitCost, reason, reference } = req.body

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(401).json({
        success: false,
        message: 'Authenticated user ID is missing or invalid.',
      })
    }

    if (!validQuantity(quantity)) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a positive number.',
      })
    }

    validateTextFields({ reason, reference })

    const unitCost = validateUnitCost(rawUnitCost)
    const amount = Number(quantity)
    const totalCost = roundMoney(amount * unitCost)

    session = await mongoose.startSession()

    let result

    await session.withTransaction(async () => {
      const product = await validateProduct(companyId, productId, session)
      const warehouse = await getCompanyWarehouse(companyId, warehouseId, session)

      const inventory = await getOrCreateWarehouseInventory({
        companyId,
        warehouseId: warehouse._id,
        productId: product._id,
        userId,
        session,
      })

      const valuation = validateInventoryValuation(inventory)
      const previousStock = valuation.quantity

      const updated = getNewWeightedAverage({
        previousQuantity: previousStock,
        previousValue: valuation.stockValue,
        addedQuantity: amount,
        addedValue: totalCost,
      })

      inventory.currentStock = updated.newQuantity
      inventory.averageCost = updated.newAverageCost
      inventory.stockValue = updated.newValue
      inventory.updatedBy = userId

      await inventory.save({ session })

      await InventoryMovement.create(
        [
          getStockMovementData({
            companyId,
            productId: product._id,
            warehouseId: warehouse._id,
            type: 'STOCK_IN',
            quantity: amount,
            previousStock,
            newStock: updated.newQuantity,
            unitCost,
            totalCost,
            averageCostAfter: updated.newAverageCost,
            reason: reason?.trim() || 'Stock received',
            reference: reference?.trim() || '',
            userId,
          }),
        ],
        { session },
      )

      result = {
        productId: product._id,
        productName: product.name,
        warehouseId: warehouse._id,
        warehouseName: warehouse.name,
        previousStock,
        newStock: updated.newQuantity,
        quantity: amount,
        unitCost,
        totalCost,
        previousAverageCost: valuation.averageCost,
        averageCost: updated.newAverageCost,
        stockValue: updated.newValue,
        reservedStock: inventory.reservedStock,
        availableStock: getAvailableStock(inventory),
      }
    })

    return res.status(200).json({
      success: true,
      message: 'Stock added and weighted average cost updated successfully.',
      data: result,
    })
  } catch (error) {
    if (handleError(res, error)) return
    return next(error)
  } finally {
    if (session) await session.endSession()
  }
})

// POST /erp/inventory/stock-out
router.post('/stock-out', permissionMiddleware('Inventory', 'ADJUST_STOCK'), async (req, res, next) => {
  let session

  try {
    const companyId = validCompanyId(req, res)
    if (!companyId) return

    const userId = getUserId(req)
    const { productId, warehouseId, quantity, reason, reference } = req.body

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(401).json({
        success: false,
        message: 'Authenticated user ID is missing or invalid.',
      })
    }

    if (!validQuantity(quantity)) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a positive number.',
      })
    }

    validateTextFields({ reason, reference })

    session = await mongoose.startSession()

    let result

    await session.withTransaction(async () => {
      const product = await validateProduct(companyId, productId, session)
      const warehouse = await getCompanyWarehouse(companyId, warehouseId, session)

      const inventory = await Inventory.findOne({
        companyId,
        warehouseId: warehouse._id,
        productId: product._id,
      }).session(session)

      if (!inventory) {
        throw createError('No inventory record exists for this product in the selected warehouse.')
      }

      const valuation = validateInventoryValuation(inventory)
      const amount = Number(quantity)
      const availableStock = getAvailableStock(inventory)

      if (amount > availableStock) {
        throw createError('Insufficient available stock in this warehouse.')
      }

      const previousStock = valuation.quantity
      const newStock = previousStock - amount

      const totalCost = amount === previousStock ? valuation.stockValue : roundMoney(amount * valuation.averageCost)

      const newStockValue = roundMoney(valuation.stockValue - totalCost)
      const newAverageCost = newStock > 0 ? roundMoney(newStockValue / newStock) : 0

      inventory.currentStock = newStock
      inventory.stockValue = newStockValue
      inventory.averageCost = newAverageCost
      inventory.updatedBy = userId

      await inventory.save({ session })

      await InventoryMovement.create(
        [
          getStockMovementData({
            companyId,
            productId: product._id,
            warehouseId: warehouse._id,
            type: 'STOCK_OUT',
            quantity: amount,
            previousStock,
            newStock,
            unitCost: valuation.averageCost,
            totalCost,
            averageCostAfter: newAverageCost,
            reason: reason?.trim() || 'Stock issued',
            reference: reference?.trim() || '',
            userId,
          }),
        ],
        { session },
      )

      result = {
        productId: product._id,
        productName: product.name,
        warehouseId: warehouse._id,
        warehouseName: warehouse.name,
        previousStock,
        newStock,
        quantity: amount,
        unitCost: valuation.averageCost,
        totalCost,
        averageCost: newAverageCost,
        stockValue: newStockValue,
        reservedStock: inventory.reservedStock,
        availableStock: getAvailableStock(inventory),
      }
    })

    return res.status(200).json({
      success: true,
      message: 'Stock removed and inventory valuation updated successfully.',
      data: result,
    })
  } catch (error) {
    if (handleError(res, error)) return
    return next(error)
  } finally {
    if (session) await session.endSession()
  }
})

// POST /erp/inventory/stock-transfer
router.post('/stock-transfer', permissionMiddleware('Inventory', 'ADJUST_STOCK'), async (req, res, next) => {
  let session

  try {
    const companyId = validCompanyId(req, res)
    if (!companyId) return

    const userId = getUserId(req)

    const { productId, sourceWarehouseId, destinationWarehouseId, quantity, reason, reference } = req.body

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(401).json({
        success: false,
        message: 'Authenticated user ID is missing or invalid.',
      })
    }

    if (!validQuantity(quantity)) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a positive number.',
      })
    }

    if (!mongoose.isValidObjectId(sourceWarehouseId) || !mongoose.isValidObjectId(destinationWarehouseId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid source and destination warehouse IDs are required.',
      })
    }

    if (String(sourceWarehouseId) === String(destinationWarehouseId)) {
      return res.status(400).json({
        success: false,
        message: 'Source and destination warehouses must be different.',
      })
    }

    validateTextFields({ reason, reference })

    session = await mongoose.startSession()

    let result

    await session.withTransaction(async () => {
      const product = await validateProduct(companyId, productId, session)

      const sourceWarehouse = await getCompanyWarehouse(companyId, sourceWarehouseId, session)

      const destinationWarehouse = await getCompanyWarehouse(companyId, destinationWarehouseId, session)

      const source = await Inventory.findOne({
        companyId,
        warehouseId: sourceWarehouse._id,
        productId: product._id,
      }).session(session)

      if (!source) {
        throw createError('Product has no stock record in the source warehouse.')
      }

      const sourceValuation = validateInventoryValuation(source)
      const amount = Number(quantity)
      const availableStock = getAvailableStock(source)

      if (amount > availableStock) {
        throw createError('Insufficient available stock in source warehouse.')
      }

      const destination = await getOrCreateWarehouseInventory({
        companyId,
        warehouseId: destinationWarehouse._id,
        productId: product._id,
        userId,
        session,
      })

      const destinationValuation = validateInventoryValuation(destination, 'Destination inventory')

      const sourcePreviousStock = source.currentStock
      const destinationPreviousStock = destination.currentStock

      const transferredValue = amount === sourceValuation.quantity ? sourceValuation.stockValue : roundMoney(amount * sourceValuation.averageCost)

      const sourceNewStock = sourceValuation.quantity - amount
      const sourceNewValue = roundMoney(sourceValuation.stockValue - transferredValue)
      const sourceNewAverageCost = sourceNewStock > 0 ? roundMoney(sourceNewValue / sourceNewStock) : 0

      const destinationUpdated = getNewWeightedAverage({
        previousQuantity: destinationValuation.quantity,
        previousValue: destinationValuation.stockValue,
        addedQuantity: amount,
        addedValue: transferredValue,
      })

      source.currentStock = sourceNewStock
      source.stockValue = sourceNewValue
      source.averageCost = sourceNewAverageCost
      source.updatedBy = userId

      destination.currentStock = destinationUpdated.newQuantity
      destination.stockValue = destinationUpdated.newValue
      destination.averageCost = destinationUpdated.newAverageCost
      destination.updatedBy = userId

      await source.save({ session })
      await destination.save({ session })

      const transferReference = reference?.trim() || `TR-${new mongoose.Types.ObjectId().toString()}`

      await InventoryMovement.create(
        [
          getStockMovementData({
            companyId,
            productId: product._id,
            warehouseId: sourceWarehouse._id,
            destinationWarehouseId: destinationWarehouse._id,
            type: 'TRANSFER',
            quantity: amount,
            previousStock: sourcePreviousStock,
            newStock: sourceNewStock,
            unitCost: sourceValuation.averageCost,
            totalCost: transferredValue,
            averageCostAfter: sourceNewAverageCost,
            reason: reason?.trim() || 'Stock transferred out',
            reference: transferReference,
            userId,
          }),
          getStockMovementData({
            companyId,
            productId: product._id,
            warehouseId: destinationWarehouse._id,
            destinationWarehouseId: sourceWarehouse._id,
            type: 'TRANSFER',
            quantity: amount,
            previousStock: destinationPreviousStock,
            newStock: destinationUpdated.newQuantity,
            unitCost: sourceValuation.averageCost,
            totalCost: transferredValue,
            averageCostAfter: destinationUpdated.newAverageCost,
            reason: reason?.trim() || 'Stock transferred in',
            reference: transferReference,
            userId,
          }),
        ],
        { session, ordered: true },
      )

      result = {
        reference: transferReference,
        productId: product._id,
        productName: product.name,
        quantity: amount,
        transferredUnitCost: sourceValuation.averageCost,
        transferredValue,
        source: {
          warehouseId: sourceWarehouse._id,
          warehouseName: sourceWarehouse.name,
          previousStock: sourcePreviousStock,
          newStock: sourceNewStock,
          averageCost: sourceNewAverageCost,
          stockValue: sourceNewValue,
          availableStock: getAvailableStock(source),
        },
        destination: {
          warehouseId: destinationWarehouse._id,
          warehouseName: destinationWarehouse.name,
          previousStock: destinationPreviousStock,
          newStock: destinationUpdated.newQuantity,
          averageCost: destinationUpdated.newAverageCost,
          stockValue: destinationUpdated.newValue,
          availableStock: getAvailableStock(destination),
        },
      }
    })

    return res.status(200).json({
      success: true,
      message: 'Stock transferred and warehouse valuations updated successfully.',
      data: result,
    })
  } catch (error) {
    if (handleError(res, error)) return
    return next(error)
  } finally {
    if (session) await session.endSession()
  }
})

// POST /erp/inventory/stock-adjustment
// physicalStock = warehouse માં ગણેલો actual stock
router.post('/stock-adjustment', permissionMiddleware('Inventory', 'ADJUST_STOCK'), async (req, res, next) => {
  let session

  try {
    const companyId = validCompanyId(req, res)
    if (!companyId) return

    const userId = getUserId(req)

    const { productId, warehouseId, physicalStock, unitCost: rawUnitCost, reason, reference } = req.body

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(401).json({
        success: false,
        message: 'Authenticated user ID is missing or invalid.',
      })
    }

    if (!validNonNegativeQuantity(physicalStock)) {
      return res.status(400).json({
        success: false,
        message: 'Physical stock must be a valid number greater than or equal to zero.',
      })
    }

    validateTextFields({ reason, reference })

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Reason is required for stock adjustment.',
      })
    }

    session = await mongoose.startSession()

    let result

    await session.withTransaction(async () => {
      const product = await validateProduct(companyId, productId, session)
      const warehouse = await getCompanyWarehouse(companyId, warehouseId, session)

      const inventory = await getOrCreateWarehouseInventory({
        companyId,
        warehouseId: warehouse._id,
        productId: product._id,
        userId,
        session,
      })

      const valuation = validateInventoryValuation(inventory)

      const previousStock = valuation.quantity
      const reservedStock = inventory.reservedStock
      const actualStock = Number(physicalStock)

      if (actualStock < reservedStock) {
        throw createError(`Physical stock cannot be less than reserved stock (${reservedStock}). Release reservations first if appropriate.`)
      }

      const difference = actualStock - previousStock

      if (difference === 0) {
        result = {
          productId: product._id,
          productName: product.name,
          warehouseId: warehouse._id,
          warehouseName: warehouse.name,
          previousStock,
          newStock: previousStock,
          physicalStock: actualStock,
          adjustment: 0,
          unitCost: valuation.averageCost,
          totalCost: 0,
          averageCost: valuation.averageCost,
          stockValue: valuation.stockValue,
          reservedStock,
          availableStock: previousStock - reservedStock,
          movementCreated: false,
        }
        return
      }

      let adjustmentUnitCost = valuation.averageCost
      let adjustmentValue = 0
      let newStockValue = valuation.stockValue
      let newAverageCost = valuation.averageCost

      if (difference < 0) {
        const removedQuantity = Math.abs(difference)

        if (removedQuantity > previousStock - reservedStock) {
          throw createError('Adjustment cannot reduce stock below reserved stock.')
        }

        adjustmentValue = removedQuantity === previousStock ? valuation.stockValue : roundMoney(removedQuantity * valuation.averageCost)

        newStockValue = roundMoney(valuation.stockValue - adjustmentValue)
        newAverageCost = actualStock > 0 ? roundMoney(newStockValue / actualStock) : 0
      } else {
        adjustmentUnitCost = validateUnitCost(rawUnitCost, 'Unit cost is required for positive stock adjustment')

        adjustmentValue = roundMoney(difference * adjustmentUnitCost)
        newStockValue = roundMoney(valuation.stockValue + adjustmentValue)
        newAverageCost = actualStock > 0 ? roundMoney(newStockValue / actualStock) : 0
      }

      inventory.currentStock = actualStock
      inventory.averageCost = newAverageCost
      inventory.stockValue = newStockValue
      inventory.updatedBy = userId

      await inventory.save({ session })

      await InventoryMovement.create(
        [
          getStockMovementData({
            companyId,
            productId: product._id,
            warehouseId: warehouse._id,
            type: 'ADJUSTMENT',
            quantity: Math.abs(difference),
            previousStock,
            newStock: actualStock,
            unitCost: adjustmentUnitCost,
            totalCost: adjustmentValue,
            averageCostAfter: newAverageCost,
            reason: reason.trim(),
            reference: reference?.trim() || '',
            userId,
          }),
        ],
        { session },
      )

      result = {
        productId: product._id,
        productName: product.name,
        warehouseId: warehouse._id,
        warehouseName: warehouse.name,
        previousStock,
        newStock: actualStock,
        physicalStock: actualStock,
        adjustment: difference,
        unitCost: adjustmentUnitCost,
        totalCost: adjustmentValue,
        averageCost: newAverageCost,
        stockValue: newStockValue,
        reservedStock,
        availableStock: actualStock - reservedStock,
        movementCreated: true,
      }
    })

    return res.status(200).json({
      success: true,
      message: result.adjustment === 0 ? 'Physical stock matches system stock. No adjustment was needed.' : 'Stock adjusted and inventory valuation updated successfully.',
      data: result,
    })
  } catch (error) {
    if (handleError(res, error)) return
    return next(error)
  } finally {
    if (session) await session.endSession()
  }
})

module.exports = router
