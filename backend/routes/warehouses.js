const express = require('express')
const mongoose = require('mongoose')

const Warehouse = require('../models/Warehouse')
const Company = require('../models/Company')
const WarehouseCounter = require('../models/WarehouseCounter')
const Inventory = require('../models/Inventory')
const InventoryMovement = require('../models/InventoryMovement')

const authMiddleware = require('../middleware/authMiddleware')
const permissionMiddleware = require('../middleware/permissionMiddleware')

const router = express.Router()

router.use(authMiddleware)

// Get approved company for the authenticated user
const getApprovedCompany = async (req, res) => {
  const companyId = req.user?.companyId

  if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
    res.status(400).json({
      success: false,
      message: 'Valid company is required.',
    })
    return null
  }

  const company = await Company.findOne({
    _id: companyId,
    status: 'Approved',
  }).select('_id')

  if (!company) {
    res.status(403).json({
      success: false,
      message: 'Approved company not found.',
    })
    return null
  }

  return company
}

// Handle duplicate warehouse codes and validation errors
const handleRouteError = (res, error, fallbackMessage) => {
  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'This warehouse code already exists in your company.',
    })
  }

  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: error.name === 'ValidationError' ? error.message : 'Invalid warehouse data.',
    })
  }

  console.error('Warehouse route error:', error)

  return res.status(500).json({
    success: false,
    message: fallbackMessage,
  })
}

const generateWarehouseCode = async (companyId) => {
  let counter = await WarehouseCounter.findOne({ companyId })

  if (!counter) {
    const existingWarehouses = await Warehouse.find({
      companyId,
      code: /^WH-\d+$/i,
    })
      .select('code')
      .lean()

    const highestExistingNumber = existingWarehouses.reduce((max, warehouse) => {
      const match = warehouse.code.match(/^WH-(\d+)$/i)
      const number = match ? Number(match[1]) : 0

      return Math.max(max, number)
    }, 0)

    try {
      await WarehouseCounter.create({
        companyId,
        lastNumber: highestExistingNumber,
      })
    } catch (error) {
      // Another simultaneous request may have created the counter.
      if (error.code !== 11000) {
        throw error
      }
    }
  }

  const updatedCounter = await WarehouseCounter.findOneAndUpdate({ companyId }, { $inc: { lastNumber: 1 } }, { new: true })

  if (!updatedCounter) {
    throw new Error('Unable to generate warehouse code.')
  }

  return `WH-${String(updatedCounter.lastNumber).padStart(4, '0')}`
}

// Escape CSV values and protect against formula injection in spreadsheet apps.
const escapeCSV = (value) => {
  let text = value === null || value === undefined ? '' : String(value)

  if (/^[\s\u0000-\u001f]*[=+\-@]/.test(text)) {
    text = `'${text}`
  }

  return `"${text.replace(/"/g, '""')}"`
}

const formatDate = (value) => {
  if (!value) return ''

  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

// GET /erp/warehouses/export
router.get('/export', permissionMiddleware('Warehouse', 'EXPORT'), async (req, res) => {
  try {
    const company = await getApprovedCompany(req, res)
    if (!company) return

    const { search, status } = req.query

    const filter = {
      companyId: company._id,
    }

    if (status && status !== 'All') {
      if (!['Active', 'Inactive'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Status must be Active or Inactive.',
        })
      }

      filter.status = status
    }

    if (typeof search === 'string' && search.trim()) {
      const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

      const searchRegex = new RegExp(escapedSearch, 'i')

      filter.$or = [
        { name: searchRegex },
        { code: searchRegex },
        { address: searchRegex },
        { city: searchRegex },
        { state: searchRegex },
        { manager: searchRegex },
        { contactPerson: searchRegex },
        { phone: searchRegex },
        { managerPhone: searchRegex },
      ]
    }

    const warehouses = await Warehouse.find(filter).sort({ createdAt: -1 }).lean()

    const headers = ['Warehouse Name', 'Warehouse Code', 'Address', 'City', 'State', 'Pincode', 'Manager', 'Manager Phone', 'Contact Person', 'Phone', 'Capacity', 'Status', 'Description', 'Created At']

    const rows = warehouses.map((warehouse) => [
      warehouse.name,
      warehouse.code,
      warehouse.address,
      warehouse.city,
      warehouse.state,
      warehouse.pincode,
      warehouse.manager,
      warehouse.managerPhone,
      warehouse.contactPerson,
      warehouse.phone,
      warehouse.capacity,
      warehouse.status,
      warehouse.description,
      formatDate(warehouse.createdAt),
    ])

    const csv = [headers.map(escapeCSV).join(','), ...rows.map((row) => row.map(escapeCSV).join(','))].join('\r\n')

    // BOM improves UTF-8 compatibility in Excel.
    const csvContent = `\uFEFF${csv}`
    const filename = `warehouses-${new Date().toISOString().slice(0, 10)}.csv`

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Cache-Control', 'no-store')

    return res.status(200).send(csvContent)
  } catch (error) {
    return handleRouteError(res, error, 'Unable to export warehouses.')
  }
})

// GET /erp/warehouses
router.get('/', permissionMiddleware('Warehouse', 'LIST'), async (req, res) => {
  try {
    const company = await getApprovedCompany(req, res)
    if (!company) return

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 10))

    const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''

    const status = typeof req.query.status === 'string' ? req.query.status : 'All'

    if (!['All', 'Active', 'Inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be All, Active, or Inactive.',
      })
    }

    const filter = {
      companyId: company._id,
    }

    if (status !== 'All') {
      filter.status = status
    }

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const searchRegex = new RegExp(escapedSearch, 'i')

      filter.$or = [
        { name: searchRegex },
        { code: searchRegex },
        { address: searchRegex },
        { city: searchRegex },
        { state: searchRegex },
        { manager: searchRegex },
        { contactPerson: searchRegex },
        { phone: searchRegex },
        { managerPhone: searchRegex },
      ]
    }

    const [warehouses, total] = await Promise.all([
      Warehouse.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      Warehouse.countDocuments(filter),
    ])

    // Calculate stock for each warehouse
    const warehouseIds = warehouses.map((warehouse) => warehouse._id)

    const stockSummary = warehouseIds.length
      ? await Inventory.aggregate([
          {
            $match: {
              companyId: company._id,
              warehouseId: { $in: warehouseIds },
            },
          },
          {
            $group: {
              _id: '$warehouseId',
              stockUnits: {
                $sum: { $ifNull: ['$currentStock', 0] },
              },
            },
          },
        ])
      : []

    const stockMap = new Map(stockSummary.map((item) => [String(item._id), item.stockUnits]))

    const data = warehouses.map((warehouse) => ({
      ...warehouse,
      stockUnits: stockMap.get(String(warehouse._id)) ?? 0,
    }))

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    return handleRouteError(res, error, 'Unable to fetch warehouses.')
  }
})

// POST /erp/warehouses
router.post('/', permissionMiddleware('Warehouse', 'CREATE'), async (req, res) => {
  try {
    const company = await getApprovedCompany(req, res)
    if (!company) return

    const { name, address, city, state, pincode, manager, managerPhone, contactPerson, phone, capacity, description } = req.body

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Warehouse name is required.',
      })
    }

    if (capacity !== undefined && (capacity === '' || !Number.isFinite(Number(capacity)) || Number(capacity) < 0)) {
      return res.status(400).json({
        success: false,
        message: 'Capacity must be a valid non-negative number.',
      })
    }

    const code = await generateWarehouseCode(company._id)

    const warehouse = await Warehouse.create({
      companyId: company._id,
      name,
      code,
      address,
      city,
      state,
      pincode,
      manager,
      managerPhone,
      contactPerson,
      phone,
      capacity: capacity === undefined ? 0 : Number(capacity),
      description,
      createdBy: req.user._id || req.user.id,
    })

    return res.status(201).json({
      success: true,
      message: 'Warehouse created successfully.',
      data: warehouse,
    })
  } catch (error) {
    return handleRouteError(res, error, 'Unable to create warehouse.')
  }
})

// GET /erp/warehouses/:id
router.get('/:id', permissionMiddleware('Warehouse', 'VIEW'), async (req, res) => {
  try {
    const company = await getApprovedCompany(req, res)
    if (!company) return

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid warehouse ID.',
      })
    }

    const warehouse = await Warehouse.findOne({
      _id: req.params.id,
      companyId: company._id,
    }).lean()

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found.',
      })
    }

    return res.status(200).json({
      success: true,
      data: warehouse,
    })
  } catch (error) {
    return handleRouteError(res, error, 'Unable to fetch warehouse.')
  }
})

// GET /erp/warehouses/:id/stock-summary
router.get('/:id/stock-summary', permissionMiddleware('Warehouse', 'VIEW'), async (req, res) => {
  try {
    const company = await getApprovedCompany(req, res)
    if (!company) return

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid warehouse ID.',
      })
    }

    const warehouse = await Warehouse.findOne({
      _id: req.params.id,
      companyId: company._id,
    }).lean()

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found.',
      })
    }

    // Get inventory with product and category details.
    const inventoryRecords = await Inventory.find({
      companyId: company._id,
      warehouseId: warehouse._id,
    })
      .populate({
        path: 'productId',
        match: {
          companyId: company._id,
        },
        select: 'companyId name sku categoryId unit minStockLevel costPrice status',
        populate: {
          path: 'categoryId',
          match: {
            companyId: company._id,
          },
          select: 'name',
        },
      })
      .lean()

    let totalStock = 0
    let totalReservedStock = 0
    let totalAvailableStock = 0

    const categoryIds = new Set()
    let lowStockCount = 0

    const products = inventoryRecords
      .filter((record) => record.productId)
      .map((record) => {
        const product = record.productId
        const category = product.categoryId || null

        const currentStock = Number(record.currentStock) || 0
        const reservedStock = Number(record.reservedStock) || 0
        const availableStock = Math.max(0, currentStock - reservedStock)
        const minStockLevel = Number(product.minStockLevel) || 0

        const isLowStock = minStockLevel > 0 && availableStock <= minStockLevel

        totalStock += currentStock
        totalReservedStock += reservedStock
        totalAvailableStock += availableStock

        if (category?._id) {
          categoryIds.add(String(category._id))
        }

        if (isLowStock) {
          lowStockCount += 1
        }

        return {
          inventoryId: record._id,
          productId: product._id,
          name: product.name,
          sku: product.sku,
          category: category
            ? {
                _id: category._id,
                name: category.name,
              }
            : null,
          unit: product.unit,
          currentStock,
          reservedStock,
          availableStock,
          minStockLevel,
          isLowStock,
          productStatus: product.status,
        }
      })

    const capacity = warehouse.capacity || 0

    return res.status(200).json({
      success: true,
      data: {
        warehouseId: warehouse._id,
        warehouseName: warehouse.name,
        warehouseCode: warehouse.code,
        capacity,

        totalProducts: products.length,
        totalCategories: categoryIds.size,
        totalStock,
        totalReservedStock,
        totalAvailableStock,
        lowStockCount,

        remainingCapacity: Math.max(0, capacity - totalStock),

        capacityUsedPercentage: capacity > 0 ? Number(((totalStock / capacity) * 100).toFixed(2)) : 0,

        products,
      },
    })
  } catch (error) {
    return handleRouteError(res, error, 'Unable to fetch warehouse stock summary.')
  }
})

// PATCH /erp/warehouses/:id
router.patch('/:id', permissionMiddleware('Warehouse', 'UPDATE'), async (req, res) => {
  try {
    const company = await getApprovedCompany(req, res)
    if (!company) return

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid warehouse ID.',
      })
    }

    const allowedFields = ['name', 'address', 'city', 'state', 'pincode', 'manager', 'managerPhone', 'contactPerson', 'phone', 'capacity', 'description']

    const updates = {}

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field]
      }
    }

    if (updates.name !== undefined && !String(updates.name).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Warehouse name is required.',
      })
    }

    if (updates.capacity !== undefined) {
      if (updates.capacity === '' || !Number.isFinite(Number(updates.capacity)) || Number(updates.capacity) < 0) {
        return res.status(400).json({
          success: false,
          message: 'Capacity must be a valid non-negative number.',
        })
      }

      updates.capacity = Number(updates.capacity)
    }

    updates.updatedBy = req.user._id || req.user.id

    const warehouse = await Warehouse.findOneAndUpdate(
      {
        _id: req.params.id,
        companyId: company._id,
      },
      { $set: updates },
      {
        new: true,
        runValidators: true,
      },
    )

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found.',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Warehouse updated successfully.',
      data: warehouse,
    })
  } catch (error) {
    return handleRouteError(res, error, 'Unable to update warehouse.')
  }
})

// PATCH /erp/warehouses/:id/status
router.patch('/:id/status', permissionMiddleware('Warehouse', 'UPDATE-STATUS'), async (req, res) => {
  try {
    const company = await getApprovedCompany(req, res)
    if (!company) return

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid warehouse ID.',
      })
    }

    const { status } = req.body

    if (!['Active', 'Inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be Active or Inactive.',
      })
    }

    const warehouse = await Warehouse.findOneAndUpdate(
      {
        _id: req.params.id,
        companyId: company._id,
      },
      {
        $set: {
          status,
          updatedBy: req.user._id || req.user.id,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    )

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found.',
      })
    }

    return res.status(200).json({
      success: true,
      message: `Warehouse ${status.toLowerCase()} successfully.`,
      data: warehouse,
    })
  } catch (error) {
    return handleRouteError(res, error, 'Unable to update warehouse status.')
  }
})

// DELETE /erp/warehouses/:id
router.delete('/:id', permissionMiddleware('Warehouse', 'DELETE'), async (req, res) => {
  try {
    const company = await getApprovedCompany(req, res)
    if (!company) return

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid warehouse ID.',
      })
    }

    const warehouse = await Warehouse.findOne({
      _id: req.params.id,
      companyId: company._id,
    })

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found.',
      })
    }

    const [inventoryCount, movementCount] = await Promise.all([
      Inventory.countDocuments({
        companyId: company._id,
        warehouseId: warehouse._id,
      }),

      InventoryMovement.countDocuments({
        companyId: company._id,
        $or: [{ warehouseId: warehouse._id }, { destinationWarehouseId: warehouse._id }],
      }),
    ])

    if (inventoryCount > 0 || movementCount > 0) {
      return res.status(409).json({
        success: false,
        message: 'This warehouse has inventory records or stock history. Deactivate it instead of deleting it.',
        data: {
          inventoryCount,
          movementCount,
        },
      })
    }

    await Warehouse.deleteOne({
      _id: warehouse._id,
      companyId: company._id,
    })

    return res.status(200).json({
      success: true,
      message: 'Warehouse deleted successfully.',
    })
  } catch (error) {
    return handleRouteError(res, error, 'Unable to delete warehouse.')
  }
})

module.exports = router
