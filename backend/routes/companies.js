const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const crypto = require('crypto')

const Company = require('../models/Company')
const User = require('../models/User')
const roleMiddleware = require('../middleware/roleMiddleware')
const authMiddleware = require('../middleware/authMiddleware')

// POST /companies/register
// Public company registration request
router.post('/register', async (req, res) => {
  let company

  try {
    const { companyName, email, phone, ownerName, ownerEmail, ownerPassword, businessType, gstin, address } = req.body

    if (!companyName?.trim() || !email?.trim() || !ownerName?.trim() || !ownerEmail?.trim() || !ownerPassword || !businessType?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Company name, company email, owner name, owner email, password and business type are required',
      })
    }

    if (typeof ownerPassword !== 'string' || ownerPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain at least 8 characters',
      })
    }

    const normalizedCompanyEmail = email.trim().toLowerCase()
    const normalizedOwnerEmail = ownerEmail.trim().toLowerCase()

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedCompanyEmail) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedOwnerEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid company and owner email addresses',
      })
    }

    const existingCompany = await Company.findOne({
      email: normalizedCompanyEmail,
      status: { $in: ['Pending', 'Active'] },
    })

    if (existingCompany) {
      return res.status(409).json({
        success: false,
        message: 'A company with this email already has a pending request or an active account',
      })
    }

    // Generate a unique company code directly inside this route
    const prefix =
      companyName
        .trim()
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase()
        .slice(0, 6) || 'COMPANY'

    let companyCode = ''

    for (let attempt = 0; attempt < 5; attempt++) {
      const generatedCode = `${prefix}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`

      const codeExists = await Company.exists({
        companyCode: generatedCode,
      })

      if (!codeExists) {
        companyCode = generatedCode
        break
      }
    }

    if (!companyCode) {
      return res.status(500).json({
        success: false,
        message: 'Unable to generate a company code. Please try again.',
      })
    }

    company = await Company.create({
      companyName: companyName.trim(),
      companyCode,
      email: normalizedCompanyEmail,
      phone: typeof phone === 'string' ? phone.trim() : '',
      ownerName: ownerName.trim(),
      businessType: businessType.trim(),
      gstin: typeof gstin === 'string' ? gstin.trim().toUpperCase() : '',
      address: typeof address === 'string' ? address.trim() : '',
      status: 'Pending',
    })

    await User.create({
      companyId: company._id,
      name: ownerName.trim(),
      email: normalizedOwnerEmail,
      password: ownerPassword,
      role: 'CompanyAdmin',
      status: 'Inactive',
    })

    return res.status(201).json({
      success: true,
      message: 'Registration request submitted successfully. Please wait for SuperAdmin approval.',
      data: {
        companyId: company._id,
        companyName: company.companyName,
        companyCode: company.companyCode,
        status: company.status,
      },
    })
  } catch (error) {
    // Roll back company creation if owner account creation fails
    if (company) {
      await Company.findByIdAndDelete(company._id).catch(() => {})
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Company code or owner account already exists',
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
      message: 'Failed to submit company registration request',
    })
  }
})

// GET /companies
// SuperAdmin: get all companies
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
// SuperAdmin: get company details
router.get('/:id', authMiddleware, roleMiddleware('SuperAdmin'), async (req, res) => {
  try {
    const { id } = req.params

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid company ID',
      })
    }

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

// PUT /companies/:id
// Update company details without changing approval status
router.put('/:id', authMiddleware, roleMiddleware('SuperAdmin'), async (req, res) => {
  try {
    const { id } = req.params

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid company ID',
      })
    }

    const allowedFields = ['companyName', 'companyCode', 'email', 'phone', 'ownerName', 'businessType', 'gstin', 'address']

    const updates = {}

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field]
      }
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields provided for update',
      })
    }

    for (const field of ['companyName', 'email', 'ownerName', 'businessType']) {
      if (updates[field] !== undefined && (typeof updates[field] !== 'string' || !updates[field].trim())) {
        return res.status(400).json({
          success: false,
          message: `${field} cannot be empty`,
        })
      }
    }

    if (updates.companyName !== undefined) {
      updates.companyName = updates.companyName.trim()
    }

    if (updates.ownerName !== undefined) {
      updates.ownerName = updates.ownerName.trim()
    }

    if (updates.businessType !== undefined) {
      updates.businessType = updates.businessType.trim()
    }

    if (updates.email !== undefined) {
      updates.email = updates.email.trim().toLowerCase()

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.email)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid email',
        })
      }
    }

    if (updates.companyCode !== undefined) {
      if (typeof updates.companyCode !== 'string' || !updates.companyCode.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Company code cannot be empty',
        })
      }

      updates.companyCode = updates.companyCode.trim().toUpperCase()
    }

    for (const field of ['phone', 'address', 'gstin']) {
      if (updates[field] !== undefined && typeof updates[field] !== 'string') {
        return res.status(400).json({
          success: false,
          message: `${field} must be a string`,
        })
      }
    }

    if (updates.gstin !== undefined) {
      updates.gstin = updates.gstin.trim().toUpperCase()
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
      message: 'Company details updated successfully',
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

// POST /companies/:id/approve
// SuperAdmin: approve a pending company
router.post('/:id/approve', authMiddleware, roleMiddleware('SuperAdmin'), async (req, res) => {
  try {
    const { id } = req.params

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid company ID',
      })
    }

    const company = await Company.findById(id)

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      })
    }

    if (company.status !== 'Pending') {
      return res.status(409).json({
        success: false,
        message: 'Only pending company requests can be approved',
      })
    }

    const owner = await User.findOne({
      companyId: company._id,
      role: 'CompanyAdmin',
    })

    if (!owner) {
      return res.status(409).json({
        success: false,
        message: 'Company owner account was not found',
      })
    }

    // Activate owner first so company remains Pending if this save fails
    owner.status = 'Active'
    await owner.save()

    company.status = 'Active'
    company.approvedBy = req.user.userId
    company.approvedAt = new Date()
    company.rejectedBy = null
    company.rejectedAt = null
    company.rejectionReason = ''

    await company.save()

    return res.status(200).json({
      success: true,
      message: 'Company approved successfully. Owner can now log in.',
      data: {
        companyId: company._id,
        companyName: company.companyName,
        status: company.status,
        ownerEmail: owner.email,
      },
    })
  } catch (error) {
    console.error('Approve company error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Failed to approve company',
    })
  }
})

// POST /companies/:id/reject
// SuperAdmin: reject a pending company
router.post('/:id/reject', authMiddleware, roleMiddleware('SuperAdmin'), async (req, res) => {
  try {
    const { id } = req.params
    const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : ''

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid company ID',
      })
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'A rejection reason is required',
      })
    }

    if (reason.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason cannot exceed 500 characters',
      })
    }

    const company = await Company.findOne({
      _id: id,
      status: 'Pending',
    })

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Pending company request not found',
      })
    }

    company.status = 'Rejected'
    company.rejectedBy = req.user.userId
    company.rejectedAt = new Date()
    company.rejectionReason = reason

    await company.save()

    return res.status(200).json({
      success: true,
      message: 'Company registration request rejected',
      data: {
        companyId: company._id,
        status: company.status,
        rejectionReason: company.rejectionReason,
      },
    })
  } catch (error) {
    console.error('Reject company error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Failed to reject company request',
    })
  }
})

// PATCH /companies/:id/status
// SuperAdmin: deactivate an active company
router.patch('/:id/status', authMiddleware, roleMiddleware('SuperAdmin'), async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid company ID',
      })
    }

    if (status !== 'Inactive') {
      return res.status(400).json({
        success: false,
        message: 'Only Active companies can be deactivated through this endpoint',
      })
    }

    const company = await Company.findOneAndUpdate({ _id: id, status: 'Active' }, { $set: { status: 'Inactive' } }, { new: true, runValidators: true }).select('-__v')

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Active company not found',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Company deactivated successfully',
      data: company,
    })
  } catch (error) {
    console.error('Company status update error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Failed to deactivate company',
    })
  }
})

module.exports = router
