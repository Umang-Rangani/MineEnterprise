const express = require('express')
const mongoose = require('mongoose')

const authMiddleware = require('../middleware/authMiddleware')
const initializeDefaultChartOfAccounts = require('../services/defaultChartOfAccounts')

const router = express.Router()

router.post('/initialize', authMiddleware, async (req, res) => {
  const companyId = req.user?.companyId || req.company?._id

  if (!companyId || !mongoose.isValidObjectId(companyId)) {
    return res.status(400).json({
      success: false,
      message: 'Valid company ID not found.',
    })
  }

  if (!['CompanyAdmin', 'SuperAdmin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Only CompanyAdmin or SuperAdmin can initialize default accounts.',
    })
  }

  const session = await mongoose.startSession()

  try {
    let createdCount = 0

    await session.withTransaction(async () => {
      createdCount = await initializeDefaultChartOfAccounts(companyId, session)
    })

    return res.status(200).json({
      success: true,
      message: 'Default chart of accounts initialized successfully.',
      count: createdCount,
    })
  } catch (error) {
    console.error('Chart of accounts initialization error:', error)

    return res.status(500).json({
      success: false,
      message: 'Unable to initialize default chart of accounts.',
    })
  } finally {
    await session.endSession()
  }
})

module.exports = router
