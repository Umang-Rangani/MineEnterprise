const express = require('express')
const mongoose = require('mongoose')

const Product = require('../models/Product')
const authMiddleware = require('../middleware/authMiddleware')
const permissionMiddleware = require('../middleware/permissionMiddleware')

const router = express.Router()

router.use(authMiddleware)

// GET /erp/products
router.get('/', permissionMiddleware('Product', 'LIST'), async (req, res, next) => {
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

    const filter = { companyId }

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

      filter.$or = [{ name: { $regex: escapedSearch, $options: 'i' } }, { sku: { $regex: escapedSearch, $options: 'i' } }, { barcode: { $regex: escapedSearch, $options: 'i' } }]
    }

    if (['Active', 'Inactive'].includes(req.query.status)) {
      filter.status = req.query.status
    }

    if (req.query.categoryId) {
      if (!mongoose.isValidObjectId(req.query.categoryId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category ID',
        })
      }

      filter.categoryId = req.query.categoryId
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ])

    return res.status(200).json({
      success: true,
      products,
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

// GET /erp/products/:id
router.get('/:id', permissionMiddleware('Product', 'VIEW'), async (req, res, next) => {
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

    return res.status(200).json({
      success: true,
      product,
    })
  } catch (error) {
    return next(error)
  }
})

// POST /erp/products
router.post('/', permissionMiddleware('Product', 'CREATE'), async (req, res, next) => {
  try {
    const companyId = req.user.companyId

    if (!companyId || !mongoose.isValidObjectId(companyId)) {
      return res.status(403).json({
        success: false,
        message: 'Valid company access is required',
      })
    }

    const { name, sku, description, categoryId, barcode, unit, costPrice, sellingPrice, taxRate, openingStock, minStockLevel, imageUrl, status } = req.body

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Product name is required',
      })
    }

    if (typeof sku !== 'string' || !sku.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Product SKU is required',
      })
    }

    if (name.trim().length > 150 || sku.trim().length > 80) {
      return res.status(400).json({
        success: false,
        message: 'Product name or SKU exceeds the maximum length',
      })
    }

    if (description !== undefined && typeof description !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Description must be text',
      })
    }

    if (barcode !== undefined && typeof barcode !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Barcode must be text',
      })
    }

    if (unit !== undefined && (typeof unit !== 'string' || !unit.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Unit must be a non-empty string',
      })
    }

    if (imageUrl !== undefined && typeof imageUrl !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Image URL must be text',
      })
    }

    if (status !== undefined && !['Active', 'Inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be Active or Inactive',
      })
    }

    for (const [field, value] of Object.entries({
      costPrice,
      sellingPrice,
      taxRate,
      openingStock,
      minStockLevel,
    })) {
      if (value === undefined) continue

      if (value === '' || typeof value === 'boolean' || !Number.isFinite(Number(value)) || Number(value) < 0) {
        return res.status(400).json({
          success: false,
          message: `${field} must be a valid non-negative number`,
        })
      }
    }

    if (taxRate !== undefined && Number(taxRate) > 100) {
      return res.status(400).json({
        success: false,
        message: 'Tax rate cannot exceed 100%',
      })
    }

    let normalizedCategoryId = null

    if (categoryId !== undefined && categoryId !== null && categoryId !== '') {
      if (!mongoose.isValidObjectId(categoryId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category ID',
        })
      }

      const Category = mongoose.models.CategoryEnterPrise

      if (!Category) {
        return res.status(500).json({
          success: false,
          message: 'Category model is not registered',
        })
      }

      const category = await Category.findOne({
        _id: categoryId,
        companyId,
      })
        .select('_id')
        .lean()

      if (!category) {
        return res.status(400).json({
          success: false,
          message: 'Selected category does not belong to your company',
        })
      }

      normalizedCategoryId = category._id
    }

    const product = await Product.create({
      companyId,
      name: name.trim(),
      sku: sku.trim().toUpperCase(),
      description: description?.trim() || '',
      categoryId: normalizedCategoryId,
      barcode: barcode?.trim() || '',
      unit: unit?.trim() || 'Piece',
      costPrice: costPrice === undefined ? 0 : Number(costPrice),
      sellingPrice: sellingPrice === undefined ? 0 : Number(sellingPrice),
      taxRate: taxRate === undefined ? 0 : Number(taxRate),
      openingStock: openingStock === undefined ? 0 : Number(openingStock),
      minStockLevel: minStockLevel === undefined ? 0 : Number(minStockLevel),
      imageUrl: imageUrl?.trim() || '',
      status: status || 'Active',
      createdBy: req.user.userId,
    })

    return res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product,
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A product with this SKU already exists in your company',
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
})

// PATCH /erp/products/:id
router.patch('/:id', permissionMiddleware('Product', 'UPDATE'), async (req, res, next) => {
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

    const allowedFields = ['name', 'sku', 'description', 'categoryId', 'barcode', 'unit', 'costPrice', 'sellingPrice', 'taxRate', 'openingStock', 'minStockLevel', 'imageUrl', 'status']

    const data = {}

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        data[field] = req.body[field]
      }
    }

    if (!Object.keys(data).length) {
      return res.status(400).json({
        success: false,
        message: 'No valid product fields supplied',
      })
    }

    if (data.name !== undefined) {
      if (typeof data.name !== 'string' || !data.name.trim() || data.name.trim().length > 150) {
        return res.status(400).json({
          success: false,
          message: 'Product name is invalid',
        })
      }

      data.name = data.name.trim()
    }

    if (data.sku !== undefined) {
      if (typeof data.sku !== 'string' || !data.sku.trim() || data.sku.trim().length > 80) {
        return res.status(400).json({
          success: false,
          message: 'Product SKU is invalid',
        })
      }

      data.sku = data.sku.trim().toUpperCase()
    }

    if (data.description !== undefined) {
      if (typeof data.description !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Description must be text',
        })
      }

      data.description = data.description.trim()
    }

    if (data.barcode !== undefined) {
      if (typeof data.barcode !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Barcode must be text',
        })
      }

      data.barcode = data.barcode.trim()
    }

    if (data.unit !== undefined) {
      if (typeof data.unit !== 'string' || !data.unit.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Unit must be a non-empty string',
        })
      }

      data.unit = data.unit.trim()
    }

    if (data.imageUrl !== undefined) {
      if (typeof data.imageUrl !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Image URL must be text',
        })
      }

      data.imageUrl = data.imageUrl.trim()
    }

    if (data.status !== undefined && !['Active', 'Inactive'].includes(data.status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be Active or Inactive',
      })
    }

    for (const field of ['costPrice', 'sellingPrice', 'taxRate', 'openingStock', 'minStockLevel']) {
      if (data[field] === undefined) continue

      if (data[field] === '' || typeof data[field] === 'boolean' || !Number.isFinite(Number(data[field])) || Number(data[field]) < 0) {
        return res.status(400).json({
          success: false,
          message: `${field} must be a valid non-negative number`,
        })
      }

      data[field] = Number(data[field])
    }

    if (data.taxRate !== undefined && data.taxRate > 100) {
      return res.status(400).json({
        success: false,
        message: 'Tax rate cannot exceed 100%',
      })
    }

    if (data.categoryId !== undefined) {
      if (data.categoryId === null || data.categoryId === '') {
        data.categoryId = null
      } else {
        if (!mongoose.isValidObjectId(data.categoryId)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid category ID',
          })
        }

        const Category = mongoose.models.CategoryEnterPrise

        if (!Category) {
          return res.status(500).json({
            success: false,
            message: 'Category model is not registered',
          })
        }

        const category = await Category.findOne({
          _id: data.categoryId,
          companyId,
        })
          .select('_id')
          .lean()

        if (!category) {
          return res.status(400).json({
            success: false,
            message: 'Selected category does not belong to your company',
          })
        }

        data.categoryId = category._id
      }
    }

    const product = await Product.findOneAndUpdate(
      {
        _id: req.params.id,
        companyId,
      },
      {
        $set: {
          ...data,
          updatedBy: req.user.userId,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    )

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      product,
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A product with this SKU already exists in your company',
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
})

// DELETE /erp/products/:id
router.delete('/:id', permissionMiddleware('Product', 'DELETE'), async (req, res, next) => {
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

    const product = await Product.findOneAndDelete({
      _id: req.params.id,
      companyId,
    })

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    })
  } catch (error) {
    return next(error)
  }
})

module.exports = router
