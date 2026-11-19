const express = require('express')
const mongoose = require('mongoose')

const User = require('../models/User')
const Company = require('../models/Company')
const authMiddleware = require('../middleware/authMiddleware')
const logSystemActivity = require('../services/systemActivityService')

const router = express.Router()

// GET /superadmin/users
// SuperAdmin: All company users with search, filters, pagination and stats.
router.get('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'SuperAdmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. SuperAdmin only.',
      })
    }

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 10))

    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : ''

    const role = typeof req.query.role === 'string' ? req.query.role : 'All'

    const status = typeof req.query.status === 'string' ? req.query.status : 'All'

    const companyId = typeof req.query.companyId === 'string' ? req.query.companyId : ''

    if (!['All', 'CompanyAdmin', 'Employee'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user role filter.',
      })
    }

    if (!['All', 'Active', 'Inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user status filter.',
      })
    }

    const filter = {
      role: { $in: ['CompanyAdmin', 'Employee'] },
    }

    if (role !== 'All') {
      filter.role = role
    }

    if (status !== 'All') {
      filter.status = status
    }

    // Company filter also supports pending/rejected CompanyAdmin accounts
    // whose companyId is still null.
    if (companyId) {
      if (!mongoose.isValidObjectId(companyId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid company ID.',
        })
      }

      const company = await Company.findById(companyId).select('_id owner').lean()

      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company not found.',
        })
      }

      filter.$or = [{ companyId: company._id }, { _id: company.owner }]
    }

    // Search by user details or company name.
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const searchRegex = new RegExp(escapedSearch, 'i')

      const matchingCompanies = await Company.find({
        companyName: searchRegex,
      })
        .select('_id owner')
        .lean()

      const searchConditions = [{ name: searchRegex }, { email: searchRegex }, { phone: searchRegex }]

      if (matchingCompanies.length > 0) {
        const matchingCompanyIds = matchingCompanies.map((company) => company._id)
        const matchingOwnerIds = matchingCompanies.map((company) => company.owner)

        searchConditions.push({ companyId: { $in: matchingCompanyIds } }, { _id: { $in: matchingOwnerIds } })
      }

      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchConditions }]
        delete filter.$or
      } else {
        filter.$or = searchConditions
      }
    }

    // Global statistics, independent of active filters.
    const userBaseFilter = {
      role: { $in: ['CompanyAdmin', 'Employee'] },
    }

    const [totalUsers, totalCompanyAdmins, totalEmployees, activeUsers, inactiveUsers, totalFilteredUsers] = await Promise.all([
      User.countDocuments(userBaseFilter),
      User.countDocuments({ role: 'CompanyAdmin' }),
      User.countDocuments({ role: 'Employee' }),
      User.countDocuments({ ...userBaseFilter, status: 'Active' }),
      User.countDocuments({ ...userBaseFilter, status: 'Inactive' }),
      User.countDocuments(filter),
    ])

    const totalPages = Math.ceil(totalFilteredUsers / limit)
    const safePage = totalPages === 0 ? 1 : Math.min(page, totalPages)

    const users = await User.find(filter)
      .select('name email phone role roles permissionOverrides companyId status createdAt updatedAt')
      .sort({ createdAt: -1, _id: -1 })
      .skip((safePage - 1) * limit)
      .limit(limit)
      .lean()

    // Resolve company information for both linked users and pending owners.
    const userIds = users.map((user) => user._id)

    const linkedCompanyIds = users.map((user) => user.companyId).filter(Boolean)

    const companies = await Company.find({
      $or: [{ _id: { $in: linkedCompanyIds } }, { owner: { $in: userIds } }],
    })
      .select('companyName status owner')
      .lean()

    const companyById = new Map(companies.map((company) => [String(company._id), company]))

    const companyByOwner = new Map(companies.map((company) => [String(company.owner), company]))

    const formattedUsers = users.map((user) => {
      const company = (user.companyId && companyById.get(String(user.companyId))) || companyByOwner.get(String(user._id)) || null

      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        roles: Array.isArray(user.roles) ? user.roles : [],
        permissionOverrides: Array.isArray(user.permissionOverrides) ? user.permissionOverrides : null,
        companyId: company?._id || user.companyId || null,
        company: company
          ? {
              _id: company._id,
              companyName: company.companyName,
              status: company.status,
            }
          : null,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }
    })

    return res.status(200).json({
      success: true,
      users: formattedUsers,

      pagination: {
        page: safePage,
        limit,
        totalUsers: totalFilteredUsers,
        totalPages,
        hasNextPage: safePage < totalPages,
        hasPrevPage: safePage > 1,
      },

      stats: {
        totalUsers,
        totalCompanyAdmins,
        totalEmployees,
        activeUsers,
        inactiveUsers,
      },
    })
  } catch (error) {
    console.error('SuperAdmin users error:', error)

    return res.status(500).json({
      success: false,
      message: 'Unable to fetch users.',
    })
  }
})

// GET /superadmin/users/:userId
// SuperAdmin: Get individual user details.
router.get('/:userId', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'SuperAdmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. SuperAdmin only.',
      })
    }

    const { userId } = req.params

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID.',
      })
    }

    const user = await User.findOne({
      _id: userId,
      role: { $in: ['CompanyAdmin', 'Employee'] },
    })
      .select('-password')
      .lean()

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      })
    }

    let company = null

    if (user.companyId) {
      company = await Company.findById(user.companyId).select('companyName companyEmail companyPhone status businessType address owner createdAt').lean()
    }

    // Pending/rejected CompanyAdmin may not have companyId yet.
    if (!company && user.role === 'CompanyAdmin') {
      company = await Company.findOne({ owner: user._id }).select('companyName companyEmail companyPhone status businessType address owner createdAt').lean()
    }

    return res.status(200).json({
      success: true,
      user: {
        ...user,
        company,
      },
    })
  } catch (error) {
    console.error('SuperAdmin user details error:', error)

    return res.status(500).json({
      success: false,
      message: 'Unable to fetch user details.',
    })
  }
})

// PATCH /superadmin/users/:userId/status
// SuperAdmin: Activate or deactivate users only when their company is Approved.
router.patch('/:userId/status', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'SuperAdmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. SuperAdmin only.',
      })
    }

    const { userId } = req.params
    const { status } = req.body

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID.',
      })
    }

    if (!['Active', 'Inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be Active or Inactive.',
      })
    }

    const user = await User.findOne({
      _id: userId,
      role: { $in: ['CompanyAdmin', 'Employee'] },
    })

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      })
    }

    // Find the company linked to this user.
    let company = null

    if (user.companyId) {
      company = await Company.findById(user.companyId).select('_id companyName status').lean()
    }

    // Pending/rejected CompanyAdmin may have companyId as null.
    if (!company && user.role === 'CompanyAdmin') {
      company = await Company.findOne({ owner: user._id }).select('_id companyName status').lean()
    }

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company associated with this user was not found.',
      })
    }

    // Only Approved companies can have their users activated/deactivated.
    if (company.status !== 'Approved') {
      return res.status(403).json({
        success: false,
        message: `User status cannot be changed because this company is ${company.status}. Only users of Approved companies can be activated or deactivated.`,
      })
    }

    if (user.status === status) {
      return res.status(200).json({
        success: true,
        message: `User is already ${status}.`,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          company: {
            _id: company._id,
            companyName: company.companyName,
            status: company.status,
          },
        },
      })
    }

    const previousStatus = user.status

    user.status = status
    await user.save()

    await logSystemActivity({
      actor: {
        userId: req.user.userId,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
      },
      target: {
        userId: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      company: {
        companyId: company._id,
        companyName: company.companyName,
      },
      action: status === 'Active' ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      description: `${user.name} was ${status === 'Active' ? 'activated' : 'deactivated'} by ${req.user.name}.`,
      metadata: {
        previousStatus,
        newStatus: status,
      },
      req,
    })

    return res.status(200).json({
      success: true,
      message: `User ${status === 'Active' ? 'activated' : 'deactivated'} successfully.`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        company: {
          _id: company._id,
          companyName: company.companyName,
          status: company.status,
        },
      },
    })
  } catch (error) {
    console.error('SuperAdmin user status update error:', error)

    return res.status(500).json({
      success: false,
      message: 'Unable to update user status.',
    })
  }
})

module.exports = router
