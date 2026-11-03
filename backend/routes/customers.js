const express = require('express')
const mongoose = require('mongoose')

const Customer = require('../models/Customer')
const CustomerCounter = require('../models/CustomerCounter')
const authMiddleware = require('../middleware/authMiddleware')
const permissionMiddleware = require('../middleware/permissionMiddleware')

const router = express.Router()

router.use(authMiddleware)

const ALLOWED_FIELDS = [
  'customerName',
  'contactPerson',
  'email',
  'phone',
  'alternatePhone',
  'gstNumber',
  'panNumber',
  'billingAddress',
  'shippingAddress',
  'city',
  'state',
  'pincode',
  'country',
  'paymentTerms',
  'creditLimit',
  'openingBalance',
  'notes',
  'status',
]

const getCompanyId = (req) => {
  if (req.user?.role === 'SuperAdmin') {
    return null
  }

  return req.company?._id || req.user?.companyId || null
}

const validateObjectId = (id) => mongoose.isValidObjectId(id)

const getCustomerPayload = (body = {}, fields = ALLOWED_FIELDS) => {
  const payload = {}

  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      payload[field] = body[field]
    }
  }

  return payload
}

const validateNonNegativeNumber = (value) => {
  return value !== null && value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0
}

const generateCustomerCode = async (companyId) => {
  // Existing counter હોય તો atomic increment કરો.
  let counter = await CustomerCounter.findOneAndUpdate({ companyId }, { $inc: { lastNumber: 1 } }, { new: true })

  if (!counter) {
    // જૂના Customer Codes માંથી છેલ્લો numeric code શોધો.
    const existingCustomers = await Customer.find({
      companyId,
      customerCode: /^CUS-\d+$/i,
    })
      .select('customerCode')
      .lean()

    const highestNumber = existingCustomers.reduce((max, customer) => {
      const match = customer.customerCode.match(/^CUS-(\d+)$/i)
      return match ? Math.max(max, Number(match[1])) : max
    }, 0)

    try {
      counter = await CustomerCounter.create({
        companyId,
        lastNumber: highestNumber + 1,
      })
    } catch (error) {
      // Concurrent first-time requests માં duplicate counter બનતો અટકાવો.
      if (error.code !== 11000) {
        throw error
      }

      counter = await CustomerCounter.findOneAndUpdate({ companyId }, { $inc: { lastNumber: 1 } }, { new: true })
    }
  }

  if (!counter) {
    throw new Error('Unable to generate customer code')
  }

  return `CUS-${String(counter.lastNumber).padStart(4, '0')}`
}

const handleError = (error, res, next) => {
  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'Customer code already exists in this company',
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

// GET /erp/customers
router.get('/', permissionMiddleware('Customer', 'LIST'), async (req, res, next) => {
  try {
    const companyId = getCompanyId(req)

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company context is required to list customers',
      })
    }

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)

    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 10))

    const search = String(req.query.search || '').trim()
    const status = String(req.query.status || '').trim()

    const filter = { companyId }

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(escapedSearch, 'i')

      filter.$or = [{ customerName: regex }, { customerCode: regex }, { contactPerson: regex }, { email: regex }, { phone: regex }, { gstNumber: regex }, { panNumber: regex }]
    }

    if (status) {
      if (!['Active', 'Inactive'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Status must be Active or Inactive',
        })
      }

      filter.status = status
    }

    const [customers, total] = await Promise.all([
      Customer.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      Customer.countDocuments(filter),
    ])

    return res.status(200).json({
      success: true,
      customers,
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

// POST /erp/customers
router.post('/', permissionMiddleware('Customer', 'CREATE'), async (req, res, next) => {
  try {
    const companyId = getCompanyId(req)

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company context is required to create customers',
      })
    }

    const payload = getCustomerPayload(req.body)

    if (!String(payload.customerName || '').trim()) {
      return res.status(400).json({
        success: false,
        message: 'Customer name is required',
      })
    }

    if (payload.status !== undefined && !['Active', 'Inactive'].includes(payload.status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be Active or Inactive',
      })
    }

    if (payload.openingBalance !== undefined && !validateNonNegativeNumber(payload.openingBalance)) {
      return res.status(400).json({
        success: false,
        message: 'Opening balance must be a valid non-negative number',
      })
    }

    if (payload.creditLimit !== undefined && !validateNonNegativeNumber(payload.creditLimit)) {
      return res.status(400).json({
        success: false,
        message: 'Credit limit must be a valid non-negative number',
      })
    }

    if (payload.openingBalance !== undefined) {
      payload.openingBalance = Number(payload.openingBalance)
    }

    if (payload.creditLimit !== undefined) {
      payload.creditLimit = Number(payload.creditLimit)
    }

    const customerCode = await generateCustomerCode(companyId)

    const customer = await Customer.create({
      ...payload,
      customerCode,
      companyId,
      createdBy: req.user.userId,
    })

    return res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      customer,
    })
  } catch (error) {
    return handleError(error, res, next)
  }
})

// GET /erp/customers/:id
router.get('/:id', permissionMiddleware('Customer', 'VIEW'), async (req, res, next) => {
  try {
    if (!validateObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID',
      })
    }

    const companyId = getCompanyId(req)

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company context is required to view customers',
      })
    }

    const customer = await Customer.findOne({
      _id: req.params.id,
      companyId,
    }).lean()

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      })
    }

    return res.status(200).json({
      success: true,
      customer,
    })
  } catch (error) {
    return handleError(error, res, next)
  }
})

// PATCH /erp/customers/:id
router.patch('/:id', permissionMiddleware('Customer', 'UPDATE'), async (req, res, next) => {
  try {
    if (!validateObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID',
      })
    }

    const companyId = getCompanyId(req)

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company context is required to update customers',
      })
    }

    // Opening balance should not be changed through general edit.
    const payload = getCustomerPayload(
      req.body,
      ALLOWED_FIELDS.filter((field) => field !== 'openingBalance'),
    )

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Provide at least one field to update',
      })
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'customerName') && !String(payload.customerName || '').trim()) {
      return res.status(400).json({
        success: false,
        message: 'Customer name cannot be empty',
      })
    }


    if (payload.status !== undefined && !['Active', 'Inactive'].includes(payload.status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be Active or Inactive',
      })
    }

    if (payload.creditLimit !== undefined && !validateNonNegativeNumber(payload.creditLimit)) {
      return res.status(400).json({
        success: false,
        message: 'Credit limit must be a valid non-negative number',
      })
    }

    if (payload.creditLimit !== undefined) {
      payload.creditLimit = Number(payload.creditLimit)
    }

    const customer = await Customer.findOneAndUpdate(
      {
        _id: req.params.id,
        companyId,
      },
      {
        $set: {
          ...payload,
          updatedBy: req.user.userId,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    )

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Customer updated successfully',
      customer,
    })
  } catch (error) {
    return handleError(error, res, next)
  }
})

// PATCH /erp/customers/:id/status
router.patch('/:id/status', permissionMiddleware('Customer', 'UPDATE_STATUS'), async (req, res, next) => {
  try {
    if (!validateObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID',
      })
    }

    const companyId = getCompanyId(req)
    const { status } = req.body || {}

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company context is required to update customer status',
      })
    }

    if (!['Active', 'Inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be Active or Inactive',
      })
    }

    const customer = await Customer.findOneAndUpdate(
      {
        _id: req.params.id,
        companyId,
      },
      {
        $set: {
          status,
          updatedBy: req.user.userId,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    )

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Customer status updated successfully',
      customer,
    })
  } catch (error) {
    return handleError(error, res, next)
  }
})

module.exports = router
