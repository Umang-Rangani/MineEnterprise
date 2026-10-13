const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const Company = require('../models/Company')

const roleMiddleware = require('../middleware/roleMiddleware')
const authMiddleware = require('../middleware/authMiddleware')

// POST /companies/register
router.post('/register', authMiddleware, roleMiddleware('SuperAdmin'), async (req, res) => {
  try {
    const { companyName, companyCode, email, phone, gstin, address } = req.body

    // Required field validation
    if (!companyName?.trim() || !companyCode?.trim() || !email?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Company name, company code and email are required',
      })
    }

    // Check whether company code already exists
    const existingCompany = await Company.findOne({
      companyCode: companyCode.trim().toUpperCase(),
    })

    if (existingCompany) {
      return res.status(409).json({
        success: false,
        message: 'Company code already exists',
      })
    }

    // Create company
    const company = await Company.create({
      companyName,
      companyCode,
      email,
      phone,
      gstin,
      address,
    })

    return res.status(201).json({
      success: true,
      message: 'Company registered successfully',
      data: company,
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Company code already exists',
      })
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: error.message,
      })
    }

    console.error('Company registration error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Failed to register company',
    })
  }
})

// GET /companies
router.get('/', authMiddleware, roleMiddleware('SuperAdmin'), async (req, res) => {
  try {
    const companies = await Company.find().sort({ createdAt: -1 }).select('-__v')

    return res.status(200).json({
      success: true,
      count: companies.length,
      message: 'Companies fetched successfully',
      data: companies,
    })
  } catch (error) {
    console.error('Get companies error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch companies',
    })
  }
})

// GET /companies/:id
router.get('/:id', authMiddleware, roleMiddleware('SuperAdmin'), async (req, res) => {
  try {
    const { id } = req.params

    // Validate MongoDB ID
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid company ID',
      })
    }

    // Find company by ID
    const company = await Company.findById(id).select('-__v')

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Company details fetched successfully',
      data: company,
    })
  } catch (error) {
    console.error('Get company details error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch company details',
    })
  }
})

// PUT /companies/:id Update company details
router.put('/:id',authMiddleware, roleMiddleware('SuperAdmin'), async (req, res) => {
  try {
    const { id } = req.params
    const allowedFields = ['companyName', 'companyCode', 'email', 'phone', 'gstin', 'address', 'status']

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid company ID',
      })
    }

    const updates = {}

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields provided for update',
      })
    }

    if (updates.companyName !== undefined && (typeof updates.companyName !== 'string' || !updates.companyName.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Company name cannot be empty',
      })
    }

    if (updates.companyCode !== undefined && (typeof updates.companyCode !== 'string' || !updates.companyCode.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Company code cannot be empty',
      })
    }

    if (updates.email !== undefined && (typeof updates.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.email.trim()))) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email',
      })
    }

    if (updates.status !== undefined && !['Active', 'Inactive'].includes(updates.status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be Active or Inactive',
      })
    }

    if (updates.companyName !== undefined) {
      updates.companyName = updates.companyName.trim()
    }

    if (updates.companyCode !== undefined) {
      updates.companyCode = updates.companyCode.trim().toUpperCase()
    }

    if (updates.email !== undefined) {
      updates.email = updates.email.trim().toLowerCase()
    }

    if (updates.gstin !== undefined) {
      updates.gstin = updates.gstin.trim().toUpperCase()
    }

    for (const field of ['phone', 'address', 'gstin']) {
      if (updates[field] !== undefined && typeof updates[field] !== 'string') {
        return res.status(400).json({
          success: false,
          message: `${field} must be a string`,
        })
      }
    }

    const company = await Company.findByIdAndUpdate(
      id,
      { $set: updates },
      {
        new: true,
        runValidators: true,
      },
    ).select('-__v')

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Company updated successfully',
      data: company,
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Company code already exists',
      })
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: error.message,
      })
    }

    console.error('Update company error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Failed to update company',
    })
  }
})

// PATCH /companies/:id/status Activate or deactivate a company
router.patch('/:id/status',authMiddleware, roleMiddleware('SuperAdmin'), async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid company ID',
      })
    }

    if (!['Active', 'Inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be Active or Inactive',
      })
    }

    const company = await Company.findByIdAndUpdate(
      id,
      { $set: { status } },
      {
        new: true,
        runValidators: true,
      },
    ).select('-__v')

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      })
    }

    return res.status(200).json({
      success: true,
      message: `Company ${status === 'Active' ? 'activated' : 'deactivated'} successfully`,
      data: company,
    })
  } catch (error) {
    console.error('Company status update error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Failed to update company status',
    })
  }
})

module.exports = router
