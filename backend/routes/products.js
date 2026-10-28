const express = require('express')
const mongoose = require('mongoose')

const Product = require('../models/Product')
const Warehouse = require('../models/Warehouse')
const Inventory = require('../models/Inventory')
const InventoryMovement = require('../models/InventoryMovement')

const authMiddleware = require('../middleware/authMiddleware')
const permissionMiddleware = require('../middleware/permissionMiddleware')

const router = express.Router()

router.use(authMiddleware)

function validCompanyId(req, res) {
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

function getProductFilter(query, companyId) {
  const filter = { companyId }
  const search = typeof query.search === 'string' ? query.search.trim() : ''

  if (search) {
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    filter.$or = [{ name: { $regex: escapedSearch, $options: 'i' } }, { sku: { $regex: escapedSearch, $options: 'i' } }, { barcode: { $regex: escapedSearch, $options: 'i' } }]
  }

  if (['Active', 'Inactive'].includes(query.status)) {
    filter.status = query.status
  }

  if (query.categoryId) {
    if (!mongoose.isValidObjectId(query.categoryId)) {
      const error = new Error('Invalid category ID.')
      error.status = 400
      throw error
    }

    filter.categoryId = query.categoryId
  }

  return filter
}

async function getStockMap(companyId, productIds) {
  if (!productIds.length) return new Map()

  const totals = await Inventory.aggregate([
    {
      $match: {
        companyId,
        productId: { $in: productIds },
      },
    },
    {
      $group: {
        _id: '$productId',
        totalStock: { $sum: '$currentStock' },
        reservedStock: { $sum: '$reservedStock' },
      },
    },
  ])

  return new Map(
    totals.map((item) => [
      String(item._id),
      {
        totalStock: item.totalStock,
        reservedStock: item.reservedStock,
      },
    ]),
  )
}

function addStockToProduct(product, stock = {}) {
  const totalStock = stock.totalStock || 0
  const reservedStock = stock.reservedStock || 0

  return {
    ...product,
    totalStock,
    reservedStock,
    availableStock: Math.max(0, totalStock - reservedStock),
  }
}

function validNonNegativeNumber(value) {
  return value !== '' && typeof value !== 'boolean' && value !== null && value !== undefined && Number.isFinite(Number(value)) && Number(value) >= 0
}

function sendKnownError(res, error) {
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
    console.error('Duplicate key error details:', {
      message: error.message,
      keyPattern: error.keyPattern,
      keyValue: error.keyValue,
      index: error.message?.match(/index:\s+(\S+)/)?.[1],
    })

    return res.status(409).json({
      success: false,
      message: 'Duplicate database record detected.',
      details: {
        keyPattern: error.keyPattern || null,
        keyValue: error.keyValue || null,
        index: error.message?.match(/index:\s+(\S+)/)?.[1] || null,
      },
    })
  }

  return null
}

// GET /erp/products
router.get('/', permissionMiddleware('Product', 'LIST'), async (req, res, next) => {
  try {
    const companyId = validCompanyId(req, res)
    if (!companyId) return

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20))
    const filter = getProductFilter(req.query, companyId)

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ])

    const stockMap = await getStockMap(
      companyId,
      products.map((product) => product._id),
    )

    const productsWithStock = products.map((product) => addStockToProduct(product, stockMap.get(String(product._id))))

    return res.status(200).json({
      success: true,
      products: productsWithStock,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    const response = sendKnownError(res, error)
    if (response) return response
    return next(error)
  }
})

// GET /erp/products/export
router.get('/export', permissionMiddleware('Product', 'EXPORT'), async (req, res, next) => {
  try {
    const companyId = validCompanyId(req, res)
    if (!companyId) return

    const filter = getProductFilter(req.query, companyId)
    const products = await Product.find(filter).sort({ createdAt: -1 }).lean()

    const columns = [
      ['Name', 'name'],
      ['SKU', 'sku'],
      ['Barcode', 'barcode'],
      ['Category ID', 'categoryId'],
      ['Unit', 'unit'],
      ['Cost Price', 'costPrice'],
      ['Selling Price', 'sellingPrice'],
      ['Tax Rate', 'taxRate'],
      ['Minimum Stock', 'minStockLevel'],
      ['Total Stock', 'totalStock'],
      ['Status', 'status'],
    ]

    const stockMap = await getStockMap(
      companyId,
      products.map((product) => product._id),
    )

    const productsWithStock = products.map((product) => addStockToProduct(product, stockMap.get(String(product._id))))

    const escapeCsv = (value) => {
      let text = value == null ? '' : String(value)

      if (/^[\s]*[=+\-@]/.test(text)) {
        text = `'${text}`
      }

      return `"${text.replace(/"/g, '""')}"`
    }

    const csv = [columns.map(([label]) => escapeCsv(label)).join(','), ...productsWithStock.map((product) => columns.map(([, key]) => escapeCsv(product[key])).join(','))].join('\r\n')

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="products.csv"')

    return res.status(200).send('\uFEFF' + csv)
  } catch (error) {
    const response = sendKnownError(res, error)
    if (response) return response
    return next(error)
  }
})

// GET /erp/products/:id
router.get('/:id', permissionMiddleware('Product', 'VIEW'), async (req, res, next) => {
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
      .populate({ path: 'categoryId', select: 'name' })
      .lean()

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      })
    }

    const [stockMap, warehouseRows] = await Promise.all([
      getStockMap(companyId, [product._id]),
      Inventory.find({
        companyId,
        productId: product._id,
      })
        .populate({ path: 'warehouseId', select: 'name code status' })
        .lean(),
    ])

    const stock = stockMap.get(String(product._id)) || {
      totalStock: 0,
      reservedStock: 0,
    }

    const warehouseStock = warehouseRows
      .filter((row) => row.warehouseId)
      .map((row) => ({
        warehouseId: row.warehouseId._id,
        warehouseName: row.warehouseId.name,
        warehouseCode: row.warehouseId.code,
        currentStock: row.currentStock,
        reservedStock: row.reservedStock,
        availableStock: Math.max(0, row.currentStock - row.reservedStock),
      }))

    return res.status(200).json({
      success: true,
      product: {
        ...addStockToProduct(product, stock),
        warehouseStock,
      },
    })
  } catch (error) {
    const response = sendKnownError(res, error)
    if (response) return response
    return next(error)
  }
})

// POST /erp/products
router.post('/', permissionMiddleware('Product', 'CREATE'), async (req, res, next) => {
  let session

  try {
    const companyId = validCompanyId(req, res)
    if (!companyId) return

    const userId = getUserId(req)

    if (!userId || !mongoose.isValidObjectId(userId)) {
      return res.status(401).json({
        success: false,
        message: 'Authenticated user ID is missing.',
      })
    }

    const { name, sku, description, categoryId, barcode, unit, costPrice, sellingPrice, taxRate, minStockLevel, imageUrl, status, warehouseStocks = [] } = req.body

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Product name is required.',
      })
    }

    if (typeof sku !== 'string' || !sku.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Product SKU is required.',
      })
    }

    if (name.trim().length > 150 || sku.trim().length > 80) {
      return res.status(400).json({
        success: false,
        message: 'Product name or SKU exceeds the maximum length.',
      })
    }

    if (description !== undefined && typeof description !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Description must be text.',
      })
    }

    if (barcode !== undefined && typeof barcode !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Barcode must be text.',
      })
    }

    if (unit !== undefined && (typeof unit !== 'string' || !unit.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Unit must be a non-empty string.',
      })
    }

    if (imageUrl !== undefined && typeof imageUrl !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Image URL must be text.',
      })
    }

    if (status !== undefined && !['Active', 'Inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be Active or Inactive.',
      })
    }

    for (const [field, value] of Object.entries({
      costPrice: costPrice ?? 0,
      sellingPrice: sellingPrice ?? 0,
      taxRate: taxRate ?? 0,
      minStockLevel: minStockLevel ?? 0,
    })) {
      if (!validNonNegativeNumber(value)) {
        return res.status(400).json({
          success: false,
          message: `${field} must be a valid non-negative number.`,
        })
      }
    }

    if (Number(taxRate ?? 0) > 100) {
      return res.status(400).json({
        success: false,
        message: 'Tax rate cannot exceed 100%.',
      })
    }

    if (!Array.isArray(warehouseStocks)) {
      return res.status(400).json({
        success: false,
        message: 'Warehouse stocks must be an array.',
      })
    }

    const seenWarehouseIds = new Set()

    for (const row of warehouseStocks) {
      if (!row || !mongoose.isValidObjectId(row.warehouseId) || !validNonNegativeNumber(row.quantity)) {
        return res.status(400).json({
          success: false,
          message: 'Each warehouse requires a valid ID and non-negative quantity.',
        })
      }

      const warehouseKey = String(row.warehouseId)

      if (seenWarehouseIds.has(warehouseKey)) {
        return res.status(400).json({
          success: false,
          message: 'A warehouse can only be selected once.',
        })
      }

      seenWarehouseIds.add(warehouseKey)
    }

    let normalizedCategoryId = null

    if (categoryId !== undefined && categoryId !== null && categoryId !== '') {
      if (!mongoose.isValidObjectId(categoryId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category ID.',
        })
      }

      const Category = mongoose.models.CategoryEnterPrise

      if (!Category) {
        return res.status(500).json({
          success: false,
          message: 'Category model is not registered.',
        })
      }

      const category = await Category.findOne({
        _id: categoryId,
        companyId,
      }).select('_id')

      if (!category) {
        return res.status(400).json({
          success: false,
          message: 'Selected category does not belong to your company.',
        })
      }

      normalizedCategoryId = category._id
    }

    session = await mongoose.startSession()

    let createdProduct
    let totalOpeningStock = 0

    await session.withTransaction(async () => {
      const product = new Product({
        companyId,
        name: name.trim(),
        sku: sku.trim().toUpperCase(),
        description: description?.trim() || '',
        categoryId: normalizedCategoryId,
        barcode: barcode?.trim() || '',
        unit: unit?.trim() || 'Piece',
        costPrice: Number(costPrice ?? 0),
        sellingPrice: Number(sellingPrice ?? 0),
        taxRate: Number(taxRate ?? 0),
        openingStock: 0,
        minStockLevel: Number(minStockLevel ?? 0),
        imageUrl: imageUrl?.trim() || '',
        status: status || 'Active',
        createdBy: userId,
      })

      await product.save({ session })

      const inventoryRows = []
      const movementRows = []

      for (const row of warehouseStocks) {
        const warehouse = await Warehouse.findOne({
          _id: row.warehouseId,
          companyId,
          status: 'Active',
        }).session(session)

        if (!warehouse) {
          const error = new Error('Every selected warehouse must be active and belong to your company.')
          error.status = 400
          throw error
        }

        const quantity = Number(row.quantity)
        totalOpeningStock += quantity

        if (quantity === 0) continue

        inventoryRows.push({
          companyId,
          productId: product._id,
          warehouseId: warehouse._id,
          currentStock: quantity,
          reservedStock: 0,
          createdBy: userId,
        })

        movementRows.push({
          companyId,
          productId: product._id,
          warehouseId: warehouse._id,
          type: 'STOCK_IN',
          quantity,
          previousStock: 0,
          newStock: quantity,
          reason: 'Initial stock',
          reference: `OPENING-${product._id}`,
          createdBy: userId,
        })
      }

      if (inventoryRows.length) {
        await Inventory.insertMany(inventoryRows, {
          session,
          ordered: true,
        })

        await InventoryMovement.insertMany(movementRows, {
          session,
          ordered: true,
        })
      }

      createdProduct = product
    })

    return res.status(201).json({
      success: true,
      message: 'Product and initial warehouse stock created successfully.',
      product: {
        ...createdProduct.toObject(),
        openingStock: totalOpeningStock,
        totalStock: totalOpeningStock,
        reservedStock: 0,
        availableStock: totalOpeningStock,
      },
      totalOpeningStock,
    })
  } catch (error) {
    const response = sendKnownError(res, error)
    if (response) return response
    return next(error)
  } finally {
    if (session) await session.endSession()
  }
})

// PATCH /erp/products/:id/status
router.patch('/:id/status', permissionMiddleware('Product', 'UPDATE_STATUS'), async (req, res, next) => {
  try {
    const companyId = validCompanyId(req, res)
    if (!companyId) return

    const userId = getUserId(req)
    const { status } = req.body

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID.',
      })
    }

    if (!['Active', 'Inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be Active or Inactive.',
      })
    }

    const product = await Product.findOneAndUpdate({ _id: req.params.id, companyId }, { $set: { status, updatedBy: userId } }, { new: true, runValidators: true })

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Product status updated successfully.',
      product,
    })
  } catch (error) {
    const response = sendKnownError(res, error)
    if (response) return response
    return next(error)
  }
})

// PATCH /erp/products/:id
router.patch('/:id', permissionMiddleware('Product', 'UPDATE'), async (req, res, next) => {
  try {
    const companyId = validCompanyId(req, res)
    if (!companyId) return

    const userId = getUserId(req)

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID.',
      })
    }

    const allowedFields = ['name', 'sku', 'description', 'categoryId', 'barcode', 'unit', 'costPrice', 'sellingPrice', 'taxRate', 'minStockLevel', 'imageUrl']

    const data = {}

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        data[field] = req.body[field]
      }
    }

    if (!Object.keys(data).length) {
      return res.status(400).json({
        success: false,
        message: 'No valid product fields supplied.',
      })
    }

    if (data.name !== undefined) {
      if (typeof data.name !== 'string' || !data.name.trim() || data.name.trim().length > 150) {
        return res.status(400).json({
          success: false,
          message: 'Product name is invalid.',
        })
      }

      data.name = data.name.trim()
    }

    if (data.sku !== undefined) {
      if (typeof data.sku !== 'string' || !data.sku.trim() || data.sku.trim().length > 80) {
        return res.status(400).json({
          success: false,
          message: 'Product SKU is invalid.',
        })
      }

      data.sku = data.sku.trim().toUpperCase()
    }

    if (data.description !== undefined) {
      if (typeof data.description !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Description must be text.',
        })
      }

      data.description = data.description.trim()
    }

    if (data.barcode !== undefined) {
      if (typeof data.barcode !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Barcode must be text.',
        })
      }

      data.barcode = data.barcode.trim()
    }

    if (data.unit !== undefined) {
      if (typeof data.unit !== 'string' || !data.unit.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Unit must be a non-empty string.',
        })
      }

      data.unit = data.unit.trim()
    }

    if (data.imageUrl !== undefined) {
      if (typeof data.imageUrl !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Image URL must be text.',
        })
      }

      data.imageUrl = data.imageUrl.trim()
    }

    for (const field of ['costPrice', 'sellingPrice', 'taxRate', 'minStockLevel']) {
      if (data[field] === undefined) continue

      if (!validNonNegativeNumber(data[field])) {
        return res.status(400).json({
          success: false,
          message: `${field} must be a valid non-negative number.`,
        })
      }

      data[field] = Number(data[field])
    }

    if (data.taxRate !== undefined && data.taxRate > 100) {
      return res.status(400).json({
        success: false,
        message: 'Tax rate cannot exceed 100%.',
      })
    }

    if (data.categoryId !== undefined) {
      if (data.categoryId === null || data.categoryId === '') {
        data.categoryId = null
      } else {
        if (!mongoose.isValidObjectId(data.categoryId)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid category ID.',
          })
        }

        const Category = mongoose.models.CategoryEnterPrise

        if (!Category) {
          return res.status(500).json({
            success: false,
            message: 'Category model is not registered.',
          })
        }

        const category = await Category.findOne({
          _id: data.categoryId,
          companyId,
        }).select('_id')

        if (!category) {
          return res.status(400).json({
            success: false,
            message: 'Selected category does not belong to your company.',
          })
        }

        data.categoryId = category._id
      }
    }

    const product = await Product.findOneAndUpdate({ _id: req.params.id, companyId }, { $set: { ...data, updatedBy: userId } }, { new: true, runValidators: true })

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Product updated successfully.',
      product,
    })
  } catch (error) {
    const response = sendKnownError(res, error)
    if (response) return response
    return next(error)
  }
})

// DELETE /erp/products/:id
router.delete('/:id', permissionMiddleware('Product', 'DELETE'), async (req, res, next) => {
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

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      })
    }

    const [inventoryExists, movementExists] = await Promise.all([Inventory.exists({ companyId, productId: product._id }), InventoryMovement.exists({ companyId, productId: product._id })])

    if (inventoryExists || movementExists) {
      return res.status(409).json({
        success: false,
        message: 'This product has inventory or movement history. Deactivate it instead of deleting it.',
      })
    }

    await product.deleteOne()

    return res.status(200).json({
      success: true,
      message: 'Product deleted successfully.',
    })
  } catch (error) {
    const response = sendKnownError(res, error)
    if (response) return response
    return next(error)
  }
})

module.exports = router
