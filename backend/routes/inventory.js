const express = require('express')
const mongoose = require('mongoose')

const Product = require('../models/Product')
const Inventory = require('../models/Inventory')
const InventoryMovement = require('../models/InventoryMovement')
const permissionMiddleware = require('../middleware/permissionMiddleware')
const authMiddleware = require('../middleware/authMiddleware')

const router = express.Router()

router.use(authMiddleware)

// GET /erp/inventory
router.get('/', permissionMiddleware('Inventory', 'VIEW'), async (req, res, next) => {
  try {
    const companyId = req.user.companyId

    if (!companyId || !mongoose.isValidObjectId(companyId)) {
      return res.status(403).json({
        success: false,
        message: 'Valid company access is required',
      })
    }

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20))
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''

    const productFilter = { companyId }

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

      productFilter.$or = [{ name: { $regex: escapedSearch, $options: 'i' } }, { sku: { $regex: escapedSearch, $options: 'i' } }, { barcode: { $regex: escapedSearch, $options: 'i' } }]
    }

    if (['Active', 'Inactive'].includes(req.query.status)) {
      productFilter.status = req.query.status
    }

    const [products, total] = await Promise.all([
      Product.find(productFilter)
        .select('_id name sku barcode unit costPrice sellingPrice openingStock minStockLevel status imageUrl')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Product.countDocuments(productFilter),
    ])

    const productIds = products.map((product) => product._id)

    const inventories = await Inventory.find({
      companyId,
      productId: { $in: productIds },
    }).lean()

    const inventoryMap = new Map(inventories.map((inventory) => [String(inventory.productId), inventory]))

    const inventoryItems = products.map((product) => {
      const inventory = inventoryMap.get(String(product._id))
      const currentStock = inventory ? inventory.currentStock : product.openingStock
      const reservedStock = inventory ? inventory.reservedStock : 0
      const availableStock = Math.max(0, currentStock - reservedStock)

      let stockStatus = 'In Stock'

      if (availableStock <= 0) {
        stockStatus = 'Out of Stock'
      } else if (availableStock <= product.minStockLevel) {
        stockStatus = 'Low Stock'
      }

      return {
        ...product,
        inventoryId: inventory?._id || null,
        currentStock,
        reservedStock,
        availableStock,
        stockStatus,
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
    return next(error)
  }
})

// GET /erp/inventory/:id
router.get('/:id', permissionMiddleware('Inventory', 'VIEW'), async (req, res, next) => {
  try {
    const companyId = req.user.companyId

    if (!companyId || !mongoose.isValidObjectId(companyId)) {
      return res.status(403).json({
        success: false,
        message: 'Valid company access is required',
      })
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID',
      })
    }

    const product = await Product.findOne({
      _id: req.params.id,
      companyId,
    }).lean()

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      })
    }

    const inventory = await Inventory.findOne({
      companyId,
      productId: product._id,
    }).lean()

    const currentStock = inventory ? inventory.currentStock : product.openingStock
    const reservedStock = inventory ? inventory.reservedStock : 0

    return res.status(200).json({
      success: true,
      inventory: {
        ...product,
        inventoryId: inventory?._id || null,
        currentStock,
        reservedStock,
        availableStock: Math.max(0, currentStock - reservedStock),
        stockStatus: currentStock - reservedStock <= 0 ? 'Out of Stock' : currentStock - reservedStock <= product.minStockLevel ? 'Low Stock' : 'In Stock',
      },
    })
  } catch (error) {
    return next(error)
  }
})

// GET /erp/inventory/:id/history
router.get('/:id/history', permissionMiddleware('Inventory', 'VIEW_HISTORY'), async (req, res, next) => {
  try {
    const companyId = req.user.companyId

    if (!companyId || !mongoose.isValidObjectId(companyId)) {
      return res.status(403).json({
        success: false,
        message: 'Valid company access is required',
      })
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID',
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
        message: 'Product not found',
      })
    }

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20))

    const filter = {
      companyId,
      productId: product._id,
    }

    const [movements, total] = await Promise.all([
      InventoryMovement.find(filter)
        .populate('createdBy', 'name email')
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
    return next(error)
  }
})

// POST /erp/inventory/stock-in
router.post('/stock-in', permissionMiddleware('Inventory', 'ADJUST_STOCK'), async (req, res, next) => {
  const session = await mongoose.startSession()

  try {
    const companyId = req.user.companyId
    const { productId, quantity, reason, reference } = req.body

    if (!companyId || !mongoose.isValidObjectId(companyId)) {
      return res.status(403).json({
        success: false,
        message: 'Valid company access is required',
      })
    }

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid product ID is required',
      })
    }

    if (quantity === '' || typeof quantity === 'boolean' || !Number.isFinite(Number(quantity)) || Number(quantity) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a positive number',
      })
    }

    if (reason !== undefined && typeof reason !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Reason must be text',
      })
    }

    if (reference !== undefined && typeof reference !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Reference must be text',
      })
    }

    const product = await Product.findOne({
      _id: productId,
      companyId,
    })
      .session(session)
      .lean()

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found in your company',
      })
    }

    await session.withTransaction(async () => {
      let inventory = await Inventory.findOne({
        companyId,
        productId: product._id,
      }).session(session)

      if (!inventory) {
        const created = await Inventory.create(
          [
            {
              companyId,
              productId: product._id,
              currentStock: product.openingStock || 0,
              reservedStock: 0,
              createdBy: req.user.userId,
            },
          ],
          { session },
        )

        inventory = created[0]
      }

      const previousStock = inventory.currentStock
      const newStock = previousStock + Number(quantity)

      inventory.currentStock = newStock
      inventory.updatedBy = req.user.userId

      await inventory.save({ session })

      await InventoryMovement.create(
        [
          {
            companyId,
            productId: product._id,
            type: 'STOCK_IN',
            quantity: Number(quantity),
            previousStock,
            newStock,
            reason: reason?.trim() || 'Stock received',
            reference: reference?.trim() || '',
            createdBy: req.user.userId,
          },
        ],
        { session },
      )

      req.inventoryResult = {
        previousStock,
        newStock,
        quantity: Number(quantity),
      }
    })

    return res.status(200).json({
      success: true,
      message: 'Stock added successfully',
      ...req.inventoryResult,
    })
  } catch (error) {
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: error.message,
      })
    }

    return next(error)
  } finally {
    await session.endSession()
  }
})

// POST /erp/inventory/stock-out
router.post('/stock-out', permissionMiddleware('Inventory', 'ADJUST_STOCK'), async (req, res, next) => {
  const session = await mongoose.startSession()

  try {
    const companyId = req.user.companyId
    const { productId, quantity, reason, reference } = req.body

    if (!companyId || !mongoose.isValidObjectId(companyId)) {
      return res.status(403).json({
        success: false,
        message: 'Valid company access is required',
      })
    }

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid product ID is required',
      })
    }

    if (quantity === '' || typeof quantity === 'boolean' || !Number.isFinite(Number(quantity)) || Number(quantity) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a positive number',
      })
    }

    if (reason !== undefined && typeof reason !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Reason must be text',
      })
    }

    if (reference !== undefined && typeof reference !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Reference must be text',
      })
    }

    const product = await Product.findOne({
      _id: productId,
      companyId,
    })
      .session(session)
      .lean()

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found in your company',
      })
    }

    await session.withTransaction(async () => {
      let inventory = await Inventory.findOne({
        companyId,
        productId: product._id,
      }).session(session)

      if (!inventory) {
        const created = await Inventory.create(
          [
            {
              companyId,
              productId: product._id,
              currentStock: product.openingStock || 0,
              reservedStock: 0,
              createdBy: req.user.userId,
            },
          ],
          { session },
        )

        inventory = created[0]
      }

      const previousStock = inventory.currentStock
      const availableStock = previousStock - inventory.reservedStock

      if (Number(quantity) > availableStock) {
        const error = new Error('Insufficient available stock')
        error.status = 400
        throw error
      }

      const newStock = previousStock - Number(quantity)

      inventory.currentStock = newStock
      inventory.updatedBy = req.user.userId

      await inventory.save({ session })

      await InventoryMovement.create(
        [
          {
            companyId,
            productId: product._id,
            type: 'STOCK_OUT',
            quantity: Number(quantity),
            previousStock,
            newStock,
            reason: reason?.trim() || 'Stock issued',
            reference: reference?.trim() || '',
            createdBy: req.user.userId,
          },
        ],
        { session },
      )

      req.inventoryResult = {
        previousStock,
        newStock,
        quantity: Number(quantity),
      }
    })

    return res.status(200).json({
      success: true,
      message: 'Stock removed successfully',
      ...req.inventoryResult,
    })
  } catch (error) {
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

    return next(error)
  } finally {
    await session.endSession()
  }
})

module.exports = router
