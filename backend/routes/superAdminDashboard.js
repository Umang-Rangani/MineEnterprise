const express = require('express')
const router = express.Router()

const Company = require('../models/Company')
const User = require('../models/User')
const SystemActivity = require('../models/SystemActivity')

const authMiddleware = require('../middleware/authMiddleware')

// SuperAdmin access check
const superAdminOnly = (req, res, next) => {
  if (req.user.role !== 'SuperAdmin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. SuperAdmin only.',
    })
  }

  next()
}

// 1. Dashboard Statistics
router.get('/stats', authMiddleware, superAdminOnly, async (req, res) => {
  try {
    const [totalCompanies, pendingApprovals, approvedCompanies, totalUsers] = await Promise.all([
      Company.countDocuments(),
      Company.countDocuments({ status: 'Pending' }),
      Company.countDocuments({ status: 'Approved' }),
      User.countDocuments({
        role: { $in: ['CompanyAdmin', 'Employee'] },
      }),
    ])

    return res.status(200).json({
      success: true,
      stats: {
        totalCompanies,
        pendingApprovals,
        approvedCompanies,
        totalUsers,
      },
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)

    return res.status(500).json({
      success: false,
      message: 'Unable to fetch dashboard statistics.',
    })
  }
})

// 2. Monthly Company Registration Analytics
router.get('/registration-analytics', authMiddleware, superAdminOnly, async (req, res) => {
  try {
    const currentYear = new Date().getFullYear()

    const registrations = await Company.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(`${currentYear}-01-01T00:00:00.000Z`),
            $lt: new Date(`${currentYear + 1}-01-01T00:00:00.000Z`),
          },
        },
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          total: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ])

    const monthlyRegistrations = Array.from({ length: 12 }, (_, index) => {
      const monthNumber = index + 1
      const found = registrations.find((item) => item._id === monthNumber)

      return {
        month: new Date(currentYear, index).toLocaleString('en-US', {
          month: 'short',
        }),
        total: found ? found.total : 0,
      }
    })

    return res.status(200).json({
      success: true,
      year: currentYear,
      monthlyRegistrations,
    })
  } catch (error) {
    console.error('Registration analytics error:', error)

    return res.status(500).json({
      success: false,
      message: 'Unable to fetch registration analytics.',
    })
  }
})

// 3. Company Status Breakdown
router.get('/company-status', authMiddleware, superAdminOnly, async (req, res) => {
  try {
    const statusBreakdown = await Company.aggregate([
      {
        $group: {
          _id: '$status',
          total: { $sum: 1 },
        },
      },
    ])

    const statuses = ['Pending', 'Approved', 'Rejected', 'Inactive']

    const companyStatus = statuses.map((status) => {
      const found = statusBreakdown.find((item) => item._id === status)

      return {
        status,
        total: found ? found.total : 0,
      }
    })

    return res.status(200).json({
      success: true,
      companyStatus,
    })
  } catch (error) {
    console.error('Company status error:', error)

    return res.status(500).json({
      success: false,
      message: 'Unable to fetch company status.',
    })
  }
})

// 4. Recent Registered Companies
router.get('/recent-companies', authMiddleware, superAdminOnly, async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 5, 1), 20)

    const recentCompanies = await Company.find().select('companyName companyEmail businessType status createdAt').sort({ createdAt: -1 }).limit(limit).lean()

    return res.status(200).json({
      success: true,
      recentCompanies,
    })
  } catch (error) {
    console.error('Recent companies error:', error)

    return res.status(500).json({
      success: false,
      message: 'Unable to fetch recent companies.',
    })
  }
})

// 5. Recent System Activities
router.get('/recent-activities', authMiddleware, superAdminOnly, async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50)

    const recentActivities = await SystemActivity.find().select('actor target company action description createdAt').sort({ createdAt: -1 }).limit(limit).lean()

    return res.status(200).json({
      success: true,
      recentActivities,
    })
  } catch (error) {
    console.error('Recent activities error:', error)

    return res.status(500).json({
      success: false,
      message: 'Unable to fetch recent activities.',
    })
  }
})

// 6. User Analytics
router.get('/user-analytics', authMiddleware, superAdminOnly, async (req, res) => {
  try {
    const userAnalytics = await User.aggregate([
      {
        $match: {
          role: { $in: ['CompanyAdmin', 'Employee'] },
        },
      },
      {
        $group: {
          _id: '$role',
          total: { $sum: 1 },
        },
      },
    ])

    const roles = ['CompanyAdmin', 'Employee']

    const usersByRole = roles.map((role) => {
      const found = userAnalytics.find((item) => item._id === role)

      return {
        role,
        total: found ? found.total : 0,
      }
    })

    return res.status(200).json({
      success: true,
      usersByRole,
    })
  } catch (error) {
    console.error('User analytics error:', error)

    return res.status(500).json({
      success: false,
      message: 'Unable to fetch user analytics.',
    })
  }
})

// 7. Business Type Breakdown
router.get('/business-type', authMiddleware, superAdminOnly, async (req, res) => {
  try {
    const businessTypes = await Company.aggregate([
      {
        $group: {
          _id: '$businessType',
          total: { $sum: 1 },
        },
      },
      {
        $sort: { total: -1 },
      },
    ])

    return res.status(200).json({
      success: true,
      businessTypes: businessTypes.map((item) => ({
        businessType: item._id || 'Other',
        total: item.total,
      })),
    })
  } catch (error) {
    console.error('Business type analytics error:', error)

    return res.status(500).json({
      success: false,
      message: 'Unable to fetch business type analytics.',
    })
  }
})

// 8. Monthly Growth Analytics
router.get('/growth-analytics', authMiddleware, superAdminOnly, async (req, res) => {
  try {
    const now = new Date()

    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    const [currentMonthCompanies, previousMonthCompanies] = await Promise.all([
      Company.countDocuments({
        createdAt: { $gte: currentMonthStart },
      }),
      Company.countDocuments({
        createdAt: {
          $gte: previousMonthStart,
          $lt: currentMonthStart,
        },
      }),
    ])

    let growthPercentage = 0

    if (previousMonthCompanies > 0) {
      growthPercentage = ((currentMonthCompanies - previousMonthCompanies) / previousMonthCompanies) * 100
    } else if (currentMonthCompanies > 0) {
      growthPercentage = 100
    }

    return res.status(200).json({
      success: true,
      growth: {
        currentMonthCompanies,
        previousMonthCompanies,
        growthPercentage: Number(growthPercentage.toFixed(2)),
      },
    })
  } catch (error) {
    console.error('Growth analytics error:', error)

    return res.status(500).json({
      success: false,
      message: 'Unable to fetch growth analytics.',
    })
  }
})

module.exports = router
