const express = require('express')
const mongoose = require('mongoose')

const Product = require('../models/Product')
const Warehouse = require('../models/Warehouse')
const Inventory = require('../models/Inventory')
const InventoryMovement = require('../models/InventoryMovement')

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

function getStockMovementData({ companyId, productId, warehouseId, type, quantity, previousStock, newStock, reason, reference, userId, destinationWarehouseId }) {
  return {
    companyId,
    productId,
    warehouseId,
    ...(destinationWarehouseId ? { destinationWarehouseId } : {}),
    type,
    quantity,
    previousStock,
    newStock,
    reason,
    reference,
    createdBy: userId,
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

    if (warehouse) {
      inventoryFilter.warehouseId = warehouse._id
    }

    const inventories = productIds.length ? await Inventory.find(inventoryFilter).populate('warehouseId', 'name code').lean() : []

    const inventoryMap = new Map()

    for (const row of inventories) {
      const key = String(row.productId)

      if (!inventoryMap.has(key)) {
        inventoryMap.set(key, [])
      }

      inventoryMap.get(key).push(row)
    }

    const inventoryItems = products.map((product) => {
      const rows = inventoryMap.get(String(product._id)) || []

      const currentStock = rows.reduce((sum, row) => sum + row.currentStock, 0)

      const reservedStock = rows.reduce((sum, row) => sum + row.reservedStock, 0)

      const availableStock = Math.max(0, currentStock - reservedStock)

      return {
        ...product,
        inventoryId: rows.length === 1 ? rows[0]._id : null,
        currentStock,
        reservedStock,
        availableStock,
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

// GET /erp/inventory/:id/history
// History route is declared before the product detail route.
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

    if (warehouse) {
      filter.warehouseId = warehouse._id
    }

    const rows = await Inventory.find(filter).populate('warehouseId', 'name code').lean()

    const currentStock = rows.reduce((sum, row) => sum + row.currentStock, 0)

    const reservedStock = rows.reduce((sum, row) => sum + row.reservedStock, 0)

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
        stockStatus: getStockStatus(availableStock, product.minStockLevel),
        warehouseStock: rows.map((row) => ({
          inventoryId: row._id,
          warehouseId: row.warehouseId?._id || row.warehouseId,
          warehouseName: row.warehouseId?.name || '',
          warehouseCode: row.warehouseId?.code || '',
          currentStock: row.currentStock,
          reservedStock: row.reservedStock,
          availableStock: Math.max(0, row.currentStock - row.reservedStock),
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

      const inventory = await getOrCreateWarehouseInventory({
        companyId,
        warehouseId: warehouse._id,
        productId: product._id,
        userId,
        session,
      })

      const previousStock = inventory.currentStock
      const amount = Number(quantity)
      const newStock = previousStock + amount

      inventory.currentStock = newStock
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
            newStock,
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
        newStock,
        quantity: amount,
        reservedStock: inventory.reservedStock,
        availableStock: getAvailableStock(inventory),
      }
    })

    return res.status(200).json({
      success: true,
      message: 'Stock added successfully.',
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

      const amount = Number(quantity)
      const previousStock = inventory.currentStock
      const availableStock = getAvailableStock(inventory)

      if (amount > availableStock) {
        throw createError('Insufficient available stock in this warehouse.')
      }

      const newStock = previousStock - amount

      inventory.currentStock = newStock
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
        reservedStock: inventory.reservedStock,
        availableStock: getAvailableStock(inventory),
      }
    })

    return res.status(200).json({
      success: true,
      message: 'Stock removed successfully.',
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

      const sourcePreviousStock = source.currentStock
      const destinationPreviousStock = destination.currentStock

      source.currentStock -= amount
      source.updatedBy = userId

      destination.currentStock += amount
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
            newStock: source.currentStock,
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
            newStock: destination.currentStock,
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
        source: {
          warehouseId: sourceWarehouse._id,
          warehouseName: sourceWarehouse.name,
          previousStock: sourcePreviousStock,
          newStock: source.currentStock,
          availableStock: getAvailableStock(source),
        },
        destination: {
          warehouseId: destinationWarehouse._id,
          warehouseName: destinationWarehouse.name,
          previousStock: destinationPreviousStock,
          newStock: destination.currentStock,
          availableStock: getAvailableStock(destination),
        },
      }
    })

    return res.status(200).json({
      success: true,
      message: 'Stock transferred successfully.',
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

    const { productId, warehouseId, physicalStock, reason, reference } = req.body

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

      const previousStock = inventory.currentStock
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
          reservedStock,
          availableStock: previousStock - reservedStock,
          movementCreated: false,
        }
        return
      }

      inventory.currentStock = actualStock
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
        reservedStock,
        availableStock: actualStock - reservedStock,
        movementCreated: true,
      }
    })

    return res.status(200).json({
      success: true,
      message: result.adjustment === 0 ? 'Physical stock matches system stock. No adjustment was needed.' : 'Stock adjusted successfully.',
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
