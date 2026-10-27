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

  return companyId
}

function validQuantity(quantity) {
  return quantity !== '' && typeof quantity !== 'boolean' && quantity !== null && quantity !== undefined && Number.isFinite(Number(quantity)) && Number(quantity) > 0
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
      message: 'A conflicting inventory record already exists. Please retry.',
    })
  }

  return null
}

async function getCompanyWarehouse(companyId, warehouseId, session) {
  if (!mongoose.isValidObjectId(warehouseId)) {
    const error = new Error('Valid warehouse ID is required.')
    error.status = 400
    throw error
  }

  let query = Warehouse.findOne({
    _id: warehouseId,
    companyId,
    status: 'Active',
  })

  if (session) query = query.session(session)

  const warehouse = await query

  if (!warehouse) {
    const error = new Error('Active warehouse not found in your company.')
    error.status = 404
    throw error
  }

  return warehouse
}


async function getOrCreateWarehouseInventory({ companyId, warehouseId, productId, userId, session }) {
  const filter = {
    companyId,
    warehouseId,
    productId,
  }

  const inventory = await Inventory.findOneAndUpdate(
    filter,
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

  return inventory
}

function getStockStatus(availableStock, minStockLevel = 0) {
  if (availableStock <= 0) return 'Out of Stock'
  if (availableStock <= minStockLevel) return 'Low Stock'
  return 'In Stock'
}

function getPagination(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1)

  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20))

  return { page, limit }
}

async function validateProduct(companyId, productId, session) {
  if (!mongoose.isValidObjectId(productId)) {
    const error = new Error('Valid product ID is required.')
    error.status = 400
    throw error
  }

  let query = Product.findOne({
    _id: productId,
    companyId,
  })

  if (session) query = query.session(session)

  const product = await query

  if (!product) {
    const error = new Error('Product not found in your company.')
    error.status = 404
    throw error
  }

  return product
}

// GET /erp/inventory
router.get('/', permissionMiddleware('Inventory', 'VIEW'), async (req, res, next) => {
  try {
    const companyId = validCompanyId(req, res)
    if (!companyId) return

    const { page, limit } = getPagination(req.query)

    const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''

    const productFilter = {
      companyId,
    }

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

      productFilter.$or = [{ name: { $regex: escapedSearch, $options: 'i' } }, { sku: { $regex: escapedSearch, $options: 'i' } }, { barcode: { $regex: escapedSearch, $options: 'i' } }]
    }

    if (['Active', 'Inactive'].includes(req.query.status)) {
      productFilter.status = req.query.status
    }

    let warehouse = null

    if (req.query.warehouseId) {
      warehouse = await getCompanyWarehouse(companyId, req.query.warehouseId)
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

    for (const inventory of inventories) {
      const key = String(inventory.productId)

      if (!inventoryMap.has(key)) {
        inventoryMap.set(key, [])
      }

      inventoryMap.get(key).push(inventory)
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
      warehouse = await getCompanyWarehouse(companyId, req.query.warehouseId)
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
      const warehouse = await getCompanyWarehouse(companyId, req.query.warehouseId)

      filter.$or = [{ warehouseId: warehouse._id }, { destinationWarehouseId: warehouse._id }]
    }

    const [movements, total] = await Promise.all([
      InventoryMovement.find(filter)
        .populate('createdBy', 'name email')
        .populate('warehouseId', 'name code')
        .populate('destinationWarehouseId', 'name code')
        .sort({ createdAt: -1 })
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

// POST /erp/inventory/stock-in
router.post('/stock-in', permissionMiddleware('Inventory', 'ADJUST_STOCK'), async (req, res, next) => {
  let session

  try {
    const companyId = validCompanyId(req, res)
    if (!companyId) return

    const userId = getUserId(req)
    const { productId, warehouseId, quantity, reason, reference } = req.body

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authenticated user ID is missing.',
      })
    }

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid product ID is required.',
      })
    }

    if (!validQuantity(quantity)) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a positive number.',
      })
    }

    if (reason !== undefined && typeof reason !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Reason must be text.',
      })
    }

    if (reference !== undefined && typeof reference !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Reference must be text.',
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
      const amount = Number(quantity)
      const newStock = previousStock + amount

      inventory.currentStock = newStock
      inventory.updatedBy = userId

      await inventory.save({ session })

      await InventoryMovement.create(
        [
          {
            companyId,
            productId: product._id,
            warehouseId: warehouse._id,
            type: 'STOCK_IN',
            quantity: amount,
            previousStock,
            newStock,
            reason: reason?.trim() || 'Stock received',
            reference: reference?.trim() || '',
            createdBy: userId,
          },
        ],
        { session },
      )

      result = {
        productId: product._id,
        warehouseId: warehouse._id,
        warehouseName: warehouse.name,
        previousStock,
        newStock,
        quantity: amount,
        availableStock: newStock - inventory.reservedStock,
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

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authenticated user ID is missing.',
      })
    }

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid product ID is required.',
      })
    }

    if (!validQuantity(quantity)) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a positive number.',
      })
    }

    if (reason !== undefined && typeof reason !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Reason must be text.',
      })
    }

    if (reference !== undefined && typeof reference !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Reference must be text.',
      })
    }

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
        const error = new Error('No inventory record exists for this product in the selected warehouse.')
        error.status = 400
        throw error
      }

      const previousStock = inventory.currentStock
      const availableStock = previousStock - inventory.reservedStock
      const amount = Number(quantity)

      if (amount > availableStock) {
        const error = new Error('Insufficient available stock in this warehouse.')
        error.status = 400
        throw error
      }

      const newStock = previousStock - amount

      inventory.currentStock = newStock
      inventory.updatedBy = userId

      await inventory.save({ session })

      await InventoryMovement.create(
        [
          {
            companyId,
            productId: product._id,
            warehouseId: warehouse._id,
            type: 'STOCK_OUT',
            quantity: amount,
            previousStock,
            newStock,
            reason: reason?.trim() || 'Stock issued',
            reference: reference?.trim() || '',
            createdBy: userId,
          },
        ],
        { session },
      )

      result = {
        productId: product._id,
        warehouseId: warehouse._id,
        warehouseName: warehouse.name,
        previousStock,
        newStock,
        quantity: amount,
        reservedStock: inventory.reservedStock,
        availableStock: newStock - inventory.reservedStock,
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

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authenticated user ID is missing.',
      })
    }

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid product ID is required.',
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

    if (reason !== undefined && typeof reason !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Reason must be text.',
      })
    }

    if (reference !== undefined && typeof reference !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Reference must be text.',
      })
    }

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
        const error = new Error('Product has no stock record in the source warehouse.')
        error.status = 400
        throw error
      }

      const amount = Number(quantity)
      const availableStock = source.currentStock - source.reservedStock

      if (amount > availableStock) {
        const error = new Error('Insufficient available stock in source warehouse.')
        error.status = 400
        throw error
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
          {
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
            createdBy: userId,
          },
          {
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
            createdBy: userId,
          },
        ],
        { session },
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
          availableStock: source.currentStock - source.reservedStock,
        },
        destination: {
          warehouseId: destinationWarehouse._id,
          warehouseName: destinationWarehouse.name,
          previousStock: destinationPreviousStock,
          newStock: destination.currentStock,
          availableStock: destination.currentStock - destination.reservedStock,
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

module.exports = router
