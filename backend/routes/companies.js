const express = require('express')
const bcrypt = require('bcryptjs')
const mongoose = require('mongoose')
const User = require('../models/User')
const Company = require('../models/Company')

const router = express.Router()

const authMiddleware = require('../middleware/authMiddleware')
const initializeDefaultChartOfAccounts = require('../services/defaultChartOfAccounts')
const logSystemActivity = require('../services/systemActivityService')

router.get('/me', authMiddleware, async (req, res) => {
  try {
    if (!['CompanyAdmin', 'Employee'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Company workspace users only.',
      })
    }

    if (!req.user.companyId || !mongoose.isValidObjectId(req.user.companyId)) {
      return res.status(403).json({
        success: false,
        message: 'Your account is not linked to a valid company.',
      })
    }

    const company = await Company.findOne({
      _id: req.user.companyId,
      status: 'Approved',
    })
      .populate('owner', 'name email phone')
      .lean()

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Approved company details not found.',
      })
    }

    return res.status(200).json({
      success: true,
      company: {
        ...company,
        id: company._id,
      },
    })
  } catch (error) {
    console.error('Company details error:', error)

    return res.status(500).json({
      success: false,
      message: 'Unable to load company details.',
    })
  }
})

// SuperAdmin: Get all registered companies
router.get('/pending', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'SuperAdmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. SuperAdmin only.',
      })
    }

    const companies = await Company.find({ status: 'Pending' }).populate('owner', 'name email phone').sort({ createdAt: -1 }).lean()

    return res.status(200).json({
      success: true,
      count: companies.length,
      companies,
    })
  } catch (error) {
    console.error('Pending companies error:', error)

    return res.status(500).json({
      success: false,
      message: 'Unable to fetch pending companies.',
    })
  }
})

router.post('/register', async (req, res) => {
  const { name, email, password, phone, companyName, businessType, companyEmail, companyPhone, website, addressLine1, addressLine2, city, state, country, postalCode, gstNumber, panNumber, currency, businessCategory } = req.body

  if (
    !name?.trim() ||
    !email?.trim() ||
    !password ||
    !companyName?.trim() ||
    !businessType ||
    !companyEmail?.trim() ||
    !companyPhone?.trim() ||
    !addressLine1?.trim() ||
    !city?.trim() ||
    !state?.trim() ||
    !country?.trim() ||
    !postalCode?.trim() ||
    !businessCategory?.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: 'Please fill in all required owner and company fields.',
    })
  }

  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 8 characters long.',
    })
  }

  const allowedBusinessTypes = ['Manufacturer', 'Wholesaler', 'Retailer', 'Distributor', 'Other']

  if (!allowedBusinessTypes.includes(businessType)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid business type.',
    })
  }

  const normalizedEmail = email.trim().toLowerCase()
  const normalizedCompanyEmail = companyEmail.trim().toLowerCase()

  const session = await mongoose.startSession()

  try {
    const existingUser = await User.findOne({
      email: normalizedEmail,
    })

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      })
    }

    const existingCompany = await Company.findOne({
      companyEmail: normalizedCompanyEmail,
    })

    if (existingCompany) {
      return res.status(409).json({
        success: false,
        message: 'A company with this email is already registered.',
      })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    await session.withTransaction(async () => {
      const [owner] = await User.create(
        [
          {
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            phone: phone?.trim() || '',
            role: 'CompanyAdmin',
            companyId: null,
            status: 'Active',
          },
        ],
        { session },
      )

      const [createdCompany] = await Company.create(
        [
          {
            companyName: companyName.trim(),
            businessType,
            companyEmail: normalizedCompanyEmail,
            companyPhone: companyPhone.trim(),
            website: website?.trim() || '',
            owner: owner._id,
            addressLine1: addressLine1.trim(),
            addressLine2: addressLine2?.trim() || '',
            city: city.trim(),
            state: state.trim(),
            country: country.trim(),
            postalCode: postalCode.trim(),
            gstNumber: gstNumber?.trim() || '',
            panNumber: panNumber?.trim() || '',
            currency: currency?.trim() || 'INR',
            businessCategory: businessCategory.trim(),
            status: 'Pending',
          },
        ],
        { session },
      )

      await logSystemActivity({
        actor: {
          userId: owner._id,
          name: owner.name,
          email: owner.email,
          role: owner.role,
        },
        company: {
          companyId: createdCompany._id,
          companyName: createdCompany.companyName,
        },
        action: 'COMPANY_REGISTERED',
        description: `${createdCompany.companyName} was registered and is awaiting approval.`,
        metadata: {
          companyStatus: createdCompany.status,
          businessType: createdCompany.businessType,
        },
        req,
        session,
      })
    })

    return res.status(201).json({
      success: true,
      message: 'Registration submitted successfully. Your company is awaiting SuperAdmin approval.',
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An account or company with these details already exists.',
      })
    }

    console.error('Company registration error:', error)

    return res.status(500).json({
      success: false,
      message: 'Unable to submit company registration.',
    })
  } finally {
    await session.endSession()
  }
})

// SuperAdmin: Get all companies with search, filter and pagination
router.get('/all', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'SuperAdmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. SuperAdmin only.',
      })
    }

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 10))

    const { search = '', status = '' } = req.query

    const allowedStatuses = ['Pending', 'Approved', 'Rejected', 'Inactive']

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid company status.',
      })
    }

    const filter = {}

    if (status) {
      filter.status = status
    }

    const searchText = search.trim()

    if (searchText) {
      const escapedSearch = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

      const regex = new RegExp(escapedSearch, 'i')

      const matchingOwners = await User.find({
        $or: [{ name: regex }, { email: regex }],
      }).distinct('_id')

      filter.$or = [
        { companyName: regex },
        { companyEmail: regex },
        { companyPhone: regex },
        { businessType: regex },
        { businessCategory: regex },
        { city: regex },
        { state: regex },
        { country: regex },
        { gstNumber: regex },
        { panNumber: regex },
        { owner: { $in: matchingOwners } },
      ]
    }

    const [companies, totalCompanies] = await Promise.all([
      Company.find(filter)
        .populate('owner', 'name email phone')
        .populate('approvedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      Company.countDocuments(filter),
    ])

    return res.status(200).json({
      success: true,
      companies,
      pagination: {
        currentPage: page,
        limit,
        totalCompanies,
        totalPages: Math.ceil(totalCompanies / limit),
      },
    })
  } catch (error) {
    console.error('All companies error:', error)

    return res.status(500).json({
      success: false,
      message: 'Unable to fetch companies.',
    })
  }
})

// SuperAdmin: Get single company details
router.get('/:companyId', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'SuperAdmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. SuperAdmin only.',
      })
    }

    const { companyId } = req.params

    if (!mongoose.isValidObjectId(companyId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid company ID.',
      })
    }

    const company = await Company.findById(companyId).populate('owner', 'name email phone status createdAt').populate('approvedBy', 'name email').lean()

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found.',
      })
    }

    return res.status(200).json({
      success: true,
      company,
    })
  } catch (error) {
    console.error('Single company details error:', error)

    return res.status(500).json({
      success: false,
      message: 'Unable to load company details.',
    })
  }
})

// SuperAdmin: Approve or Reject company
router.patch('/:companyId/review', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'SuperAdmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. SuperAdmin only.',
      })
    }

    const { companyId } = req.params
    const { action, rejectionReason } = req.body

    if (!mongoose.isValidObjectId(companyId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid company ID.',
      })
    }

    if (!['Approve', 'Reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be Approve or Reject.',
      })
    }

    const company = await Company.findById(companyId)

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found.',
      })
    }

    if (company.status !== 'Pending') {
      return res.status(409).json({
        success: false,
        message: 'Only pending companies can be reviewed.',
      })
    }

    if (action === 'Reject' && !rejectionReason?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a rejection reason.',
      })
    }

    // Approve company
    if (action === 'Approve') {
      const session = await mongoose.startSession()

      try {
        await session.withTransaction(async () => {
          const updatedCompany = await Company.findOneAndUpdate(
            { _id: companyId, status: 'Pending' },
            {
              $set: {
                status: 'Approved',
                approvedBy: req.user.userId,
                approvedAt: new Date(),
                rejectionReason: '',
              },
            },
            { new: true, session },
          )

          if (!updatedCompany) {
            throw new Error('COMPANY_REVIEW_CONFLICT')
          }

          const ownerUpdate = await User.updateOne(
            {
              _id: updatedCompany.owner,
              role: 'CompanyAdmin',
            },
            {
              $set: {
                companyId: updatedCompany._id,
              },
            },
            { session },
          )

          if (ownerUpdate.matchedCount !== 1) {
            throw new Error('COMPANY_OWNER_NOT_FOUND')
          }

          await initializeDefaultChartOfAccounts(updatedCompany._id, session)

          const companyOwner = await User.findById(updatedCompany.owner).select('name email role').session(session)

          await logSystemActivity({
            actor: {
              userId: req.user.userId,
              name: req.user.name,
              email: req.user.email,
              role: req.user.role,
            },
            target: companyOwner
              ? {
                  userId: companyOwner._id,
                  name: companyOwner.name,
                  email: companyOwner.email,
                  role: companyOwner.role,
                }
              : null,
            company: {
              companyId: updatedCompany._id,
              companyName: updatedCompany.companyName,
            },
            action: 'COMPANY_APPROVED',
            description: `${updatedCompany.companyName} was approved by ${req.user.name}.`,
            metadata: {
              previousStatus: 'Pending',
              newStatus: 'Approved',
            },
            req,
            session,
          })
        })
      } catch (error) {
        if (error.message === 'COMPANY_REVIEW_CONFLICT') {
          return res.status(409).json({
            success: false,
            message: 'Company has already been reviewed.',
          })
        }

        throw error
      } finally {
        await session.endSession()
      }

      return res.status(200).json({
        success: true,
        message: 'Company approved successfully.',
      })
    }

    // Reject company
    const rejectionSession = await mongoose.startSession()
    let updatedCompany = null

    try {
      await rejectionSession.withTransaction(async () => {
        updatedCompany = await Company.findOneAndUpdate(
          { _id: companyId, status: 'Pending' },
          {
            $set: {
              status: 'Rejected',
              approvedBy: null,
              approvedAt: null,
              rejectionReason: rejectionReason.trim(),
            },
          },
          { new: true, session: rejectionSession },
        )

        if (!updatedCompany) {
          throw new Error('COMPANY_REVIEW_CONFLICT')
        }

        const companyOwner = await User.findById(updatedCompany.owner).select('name email role').session(rejectionSession)

        await logSystemActivity({
          actor: {
            userId: req.user.userId,
            name: req.user.name,
            email: req.user.email,
            role: req.user.role,
          },
          target: companyOwner
            ? {
                userId: companyOwner._id,
                name: companyOwner.name,
                email: companyOwner.email,
                role: companyOwner.role,
              }
            : null,
          company: {
            companyId: updatedCompany._id,
            companyName: updatedCompany.companyName,
          },
          action: 'COMPANY_REJECTED',
          description: `${updatedCompany.companyName} was rejected by ${req.user.name}.`,
          metadata: {
            previousStatus: 'Pending',
            newStatus: 'Rejected',
            rejectionReason: rejectionReason.trim(),
          },
          req,
          session: rejectionSession,
        })
      })
    } catch (error) {
      if (error.message === 'COMPANY_REVIEW_CONFLICT') {
        return res.status(409).json({
          success: false,
          message: 'Company has already been reviewed.',
        })
      }

      throw error
    } finally {
      await rejectionSession.endSession()
    }

    return res.status(200).json({
      success: true,
      message: 'Company rejected successfully.',
    })
  } catch (error) {
    console.error('Company review error:', error)

    return res.status(500).json({
      success: false,
      message: 'Unable to review company.',
    })
  }
})

module.exports = router
