const express = require('express')
const mongoose = require('mongoose')

const Category = require('../models/Category')
const Product = require('../models/Product')
const authMiddleware = require('../middleware/authMiddleware')
const permissionMiddleware = require('../middleware/permissionMiddleware')

const router = express.Router()

router.use(authMiddleware)

// GET /erp/categories - List, search, filter, pagination and stats
router.get('/', permissionMiddleware('Category', 'LIST'), async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 10))

    const baseFilter = { companyId: req.user.companyId }
    const filter = { ...baseFilter }

    if (req.query.search?.trim()) {
      const search = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

      filter.$or = [{ name: { $regex: search, $options: 'i' } }, { code: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }]
    }

    if (['Active', 'Inactive'].includes(req.query.status)) {
      filter.status = req.query.status
    }

    const [categories, total, totalCategories, activeCategories, inactiveCategories] = await Promise.all([
      Category.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      Category.countDocuments(filter),

      Category.countDocuments(baseFilter),

      Category.countDocuments({
        ...baseFilter,
        status: 'Active',
      }),

      Category.countDocuments({
        ...baseFilter,
        status: 'Inactive',
      }),
    ])

    return res.status(200).json({
      success: true,
      categories,

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },

      stats: {
        total: totalCategories,
        active: activeCategories,
        inactive: inactiveCategories,
      },
    })
  } catch (error) {
    return next(error)
  }
})

// GET /erp/categories/export - Export company categories as CSV
router.get('/export', permissionMiddleware('Category', 'EXPORT'), async (req, res, next) => {
  try {
    const filter = {
      companyId: req.user.companyId,
    }

    if (req.query.search?.trim()) {
      const search = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

      filter.$or = [{ name: { $regex: search, $options: 'i' } }, { code: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }]
    }

    if (['Active', 'Inactive'].includes(req.query.status)) {
      filter.status = req.query.status
    }

    const categories = await Category.find(filter).select('name code description status createdAt').sort({ createdAt: -1, _id: -1 }).lean()

    const escapeCsv = (value) => {
      let text = String(value ?? '')

      // Reduce spreadsheet formula-injection risk.
      if (/^[\s]*[=+\-@]/.test(text)) {
        text = `'${text}`
      }

      return `"${text.replace(/"/g, '""')}"`
    }

    const headers = ['Category Name', 'Code', 'Description', 'Status', 'Created At']

    const rows = categories.map((category) => [category.name, category.code, category.description, category.status, category.createdAt ? new Date(category.createdAt).toISOString().slice(0, 10) : ''])

    const csv = [headers.map(escapeCsv).join(','), ...rows.map((row) => row.map(escapeCsv).join(','))].join('\r\n')

    const filename = `categories-${new Date().toISOString().slice(0, 10)}.csv`

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Cache-Control', 'no-store')

    return res.status(200).send('\uFEFF' + csv)
  } catch (error) {
    return next(error)
  }
})

// GET /erp/categories/:id - Get one category
router.get('/:id', permissionMiddleware('Category', 'VIEW'), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid category ID.' })
    }

    const category = await Category.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    }).lean()

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found.' })
    }

    return res.status(200).json({ success: true, category })
  } catch (error) {
    return next(error)
  }
})

// POST /erp/categories - Create category
router.post('/', permissionMiddleware('Category', 'CREATE'), async (req, res, next) => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : ''
    const description = typeof req.body.description === 'string' ? req.body.description.trim() : ''
    const code = typeof req.body.code === 'string' ? req.body.code.trim().toUpperCase() : ''
    const status = req.body.status || 'Active'

    if (!name) {
      return res.status(400).json({ success: false, message: 'Category name is required.' })
    }

    if (name.length > 100 || description.length > 500 || code.length > 40) {
      return res.status(400).json({ success: false, message: 'One or more fields exceed the allowed length.' })
    }

    if (!['Active', 'Inactive'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid category status.' })
    }

    const duplicateFilter = {
      companyId: req.user.companyId,
      name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
    }

    if (await Category.findOne(duplicateFilter).lean()) {
      return res.status(409).json({ success: false, message: 'A category with this name already exists.' })
    }

    if (
      code &&
      (await Category.findOne({
        companyId: req.user.companyId,
        code,
      }).lean())
    ) {
      return res.status(409).json({ success: false, message: 'A category with this code already exists.' })
    }

    const category = await Category.create({
      companyId: req.user.companyId,
      name,
      description,
      code,
      status,
      createdBy: req.user.userId,
    })

    return res.status(201).json({
      success: true,
      message: 'Category created successfully.',
      category,
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'A category with this value already exists.' })
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message })
    }
    return next(error)
  }
})

// PATCH /erp/categories/:id - Update category
router.patch(
  '/:id',
  (req, res, next) => {
    if (req.body.status !== undefined) {
      return permissionMiddleware('Category', 'UPDATE_STATUS')(req, res, next)
    }

    return permissionMiddleware('Category', 'UPDATE')(req, res, next)
  },
  async (req, res, next) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ success: false, message: 'Invalid category ID.' })
      }

      const category = await Category.findOne({
        _id: req.params.id,
        companyId: req.user.companyId,
      })

      if (!category) {
        return res.status(404).json({ success: false, message: 'Category not found.' })
      }

      if (req.body.name !== undefined) {
        if (typeof req.body.name !== 'string' || !req.body.name.trim()) {
          return res.status(400).json({ success: false, message: 'Category name is required.' })
        }
        category.name = req.body.name.trim()
      }

      if (req.body.description !== undefined) {
        if (typeof req.body.description !== 'string' || req.body.description.trim().length > 500) {
          return res.status(400).json({ success: false, message: 'Invalid category description.' })
        }
        category.description = req.body.description.trim()
      }

      if (req.body.code !== undefined) {
        if (typeof req.body.code !== 'string' || req.body.code.trim().length > 40) {
          return res.status(400).json({ success: false, message: 'Invalid category code.' })
        }
        category.code = req.body.code.trim().toUpperCase()
      }

      if (req.body.status !== undefined) {
        if (!['Active', 'Inactive'].includes(req.body.status)) {
          return res.status(400).json({ success: false, message: 'Invalid category status.' })
        }
        category.status = req.body.status
      }

      if (category.name.length > 100) {
        return res.status(400).json({ success: false, message: 'Category name cannot exceed 100 characters.' })
      }

      const duplicateName = await Category.findOne({
        _id: { $ne: category._id },
        companyId: req.user.companyId,
        name: { $regex: `^${category.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
      }).lean()

      if (duplicateName) {
        return res.status(409).json({ success: false, message: 'A category with this name already exists.' })
      }

      if (category.code) {
        const duplicateCode = await Category.findOne({
          _id: { $ne: category._id },
          companyId: req.user.companyId,
          code: category.code,
        }).lean()

        if (duplicateCode) {
          return res.status(409).json({ success: false, message: 'A category with this code already exists.' })
        }
      }

      category.updatedBy = req.user.userId
      await category.save()

      return res.status(200).json({
        success: true,
        message: 'Category updated successfully.',
        category,
      })
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({ success: false, message: 'A category with this value already exists.' })
      }
      if (error.name === 'ValidationError') {
        return res.status(400).json({ success: false, message: error.message })
      }
      return next(error)
    }
  },
)

// DELETE /erp/categories/:id - Delete category
router.delete('/:id', permissionMiddleware('Category', 'DELETE'), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid category ID.' })
    }

    const category = await Category.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    })

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found.' })
    }

    const linkedProducts = await Product.exists({
      companyId: req.user.companyId,
      categoryId: category._id,
    })

    if (linkedProducts) {
      return res.status(409).json({
        success: false,
        message: 'This category is assigned to products. Reassign those products before deleting it.',
      })
    }

    await category.deleteOne()

    return res.status(200).json({
      success: true,
      message: 'Category deleted successfully.',
    })
  } catch (error) {
    return next(error)
  }
})

module.exports = router
