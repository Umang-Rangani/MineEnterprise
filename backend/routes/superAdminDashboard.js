const express = require('express')
const router = express.Router()

const Company = require('../models/Company')
const User = require('../models/User')
const authMiddleware = require('../middleware/authMiddleware')

router.get('/stats', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'SuperAdmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. SuperAdmin only.',
      })
    }

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
    console.error('SuperAdmin dashboard stats error:', error)

    return res.status(500).json({
      success: false,
      message: 'Unable to fetch dashboard statistics.',
    })
  }
})

module.exports = router
