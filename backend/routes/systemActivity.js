const express = require('express')

const SystemActivity = require('../models/SystemActivity')
const authMiddleware = require('../middleware/authMiddleware')

const router = express.Router()

const ACTIVITY_ACTIONS = ['SUPERADMIN_SETUP', 'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'COMPANY_REGISTERED', 'COMPANY_APPROVED', 'COMPANY_REJECTED', 'USER_ACTIVATED', 'USER_DEACTIVATED']

const LOGIN_ACTIONS = ['LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT']

const COMPANY_ACTIONS = ['COMPANY_REGISTERED', 'COMPANY_APPROVED', 'COMPANY_REJECTED']

const USER_STATUS_ACTIONS = ['USER_ACTIVATED', 'USER_DEACTIVATED']

// GET /superadmin/activity
// SuperAdmin: Activity listing, summary, search, filters and pagination.
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

    const action = typeof req.query.action === 'string' ? req.query.action : 'All'

    const dateFrom = typeof req.query.dateFrom === 'string' ? req.query.dateFrom : ''

    const dateTo = typeof req.query.dateTo === 'string' ? req.query.dateTo : ''

    if (action !== 'All' && !ACTIVITY_ACTIONS.includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid activity action filter.',
      })
    }

    const filter = {}

    // Action filter
    if (action !== 'All') {
      filter.action = action
    }

    // Date range validation and filter
    const dateFilter = {}

    const isValidDate = (value) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false
      }

      const date = new Date(`${value}T00:00:00.000Z`)

      return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    }

    if (dateFrom) {
      if (!isValidDate(dateFrom)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid start date.',
        })
      }

      dateFilter.$gte = new Date(`${dateFrom}T00:00:00.000Z`)
    }

    if (dateTo) {
      if (!isValidDate(dateTo)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid end date.',
        })
      }

      const endDate = new Date(`${dateTo}T00:00:00.000Z`)
      endDate.setUTCDate(endDate.getUTCDate() + 1)

      dateFilter.$lt = endDate
    }

    if (dateFrom && dateTo && dateFrom > dateTo) {
      return res.status(400).json({
        success: false,
        message: 'Start date cannot be after end date.',
      })
    }

    if (Object.keys(dateFilter).length > 0) {
      filter.createdAt = dateFilter
    }

    // Search by actor, target, company or description.
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const searchRegex = new RegExp(escapedSearch, 'i')

      filter.$or = [
        { 'actor.name': searchRegex },
        { 'actor.email': searchRegex },
        { 'actor.role': searchRegex },
        { 'target.name': searchRegex },
        { 'target.email': searchRegex },
        { 'target.role': searchRegex },
        { 'company.companyName': searchRegex },
        { description: searchRegex },
        { action: searchRegex },
      ]
    }

    // Fetch filtered count and global summary counts.
    const [totalActivities, totalSummaryActivities, loginActivities, companyActivities, userStatusChanges] = await Promise.all([
      SystemActivity.countDocuments(filter),

      SystemActivity.countDocuments(),

      SystemActivity.countDocuments({
        action: { $in: LOGIN_ACTIONS },
      }),

      SystemActivity.countDocuments({
        action: { $in: COMPANY_ACTIONS },
      }),

      SystemActivity.countDocuments({
        action: { $in: USER_STATUS_ACTIONS },
      }),
    ])

    // Pagination
    const totalPages = Math.ceil(totalActivities / limit)

    const safePage = totalPages === 0 ? 1 : Math.min(page, totalPages)

    const activities = await SystemActivity.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((safePage - 1) * limit)
      .limit(limit)
      .lean()

    return res.status(200).json({
      success: true,

      summary: {
        totalActivities: totalSummaryActivities,
        loginActivities,
        companyActivities,
        userStatusChanges,
      },

      activities,

      pagination: {
        page: safePage,
        limit,
        totalActivities,
        totalPages,
        hasNextPage: safePage < totalPages,
        hasPrevPage: safePage > 1,
      },

      filters: {
        search,
        action,
        dateFrom,
        dateTo,
      },
    })
  } catch (error) {
    console.error('SuperAdmin activity listing error:', error)

    return res.status(500).json({
      success: false,
      message: 'Unable to fetch system activities.',
    })
  }
})

module.exports = router
