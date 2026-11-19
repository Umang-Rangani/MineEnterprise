const express = require('express')
const mongoose = require('mongoose')
const PlatformSettings = require('../models/PlatformSettings')
const authMiddleware = require('../middleware/authMiddleware')

const router = express.Router()

const isSuperAdmin = (req) => req.user?.role === 'SuperAdmin' && !req.user?.companyId

// GET PLATFORM SETTINGS

router.get('/', authMiddleware, async (req, res) => {
  try {
    if (!isSuperAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: 'Only SuperAdmin can access platform settings.',
      })
    }

    const settings = await PlatformSettings.findOneAndUpdate(
      { key: 'platform' },
      {
        $setOnInsert: {
          key: 'platform',
          defaultCurrency: 'INR',
          timezone: 'Asia/Kolkata',
          dateFormat: 'DD/MM/YYYY',
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    ).populate('updatedBy', 'name email')

    return res.status(200).json({
      success: true,
      settings,
    })
  } catch (error) {
    console.error('Get platform settings error:', error)

    return res.status(500).json({
      success: false,
      message: 'Unable to load platform settings.',
    })
  }
})

// UPDATE PLATFORM SETTINGS

router.patch('/', authMiddleware, async (req, res) => {
  try {
    if (!isSuperAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: 'Only SuperAdmin can update platform settings.',
      })
    }

    const { defaultCurrency, timezone, dateFormat } = req.body

    const updates = {}

    if (defaultCurrency !== undefined) {
      if (typeof defaultCurrency !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Invalid currency.',
        })
      }

      const currency = defaultCurrency.trim().toUpperCase()

      if (!/^[A-Z]{3}$/.test(currency)) {
        return res.status(400).json({
          success: false,
          message: 'Currency must be a valid 3-letter code.',
        })
      }

      updates.defaultCurrency = currency
    }

    if (timezone !== undefined) {
      if (typeof timezone !== 'string' || !timezone.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Timezone is required.',
        })
      }

      try {
        new Intl.DateTimeFormat('en-US', {
          timeZone: timezone.trim(),
        })
      } catch {
        return res.status(400).json({
          success: false,
          message: 'Invalid timezone.',
        })
      }

      updates.timezone = timezone.trim()
    }

    if (dateFormat !== undefined) {
      if (!['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'].includes(dateFormat)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format.',
        })
      }

      updates.dateFormat = dateFormat
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one valid setting is required.',
      })
    }

    updates.updatedBy = new mongoose.Types.ObjectId(req.user.userId)

    const settings = await PlatformSettings.findOneAndUpdate(
      { key: 'platform' },
      {
        $set: updates,
        $setOnInsert: {
          key: 'platform',
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    ).populate('updatedBy', 'name email')

    return res.status(200).json({
      success: true,
      message: 'Platform settings updated successfully.',
      settings,
    })
  } catch (error) {
    console.error('Update platform settings error:', error)

    return res.status(500).json({
      success: false,
      message: 'Unable to update platform settings.',
    })
  }
})

module.exports = router
