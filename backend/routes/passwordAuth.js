const express = require('express')
const User = require('../models/User')
const authMiddleware = require('../middleware/authMiddleware')

const { requestPasswordOtp, verifyPasswordOtp, updatePasswordAfterOtp } = require('../services/passwordOtpService')

const router = express.Router()

// Only CompanyAdmin and SuperAdmin can change their own password
const requireSelfPasswordChangeAccess = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).select('role')

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      })
    }

    const allowedRoles = ['CompanyAdmin', 'SuperAdmin']

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to change your own password.',
      })
    }

    next()
  } catch (error) {
    console.error('Password permission error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Failed to verify password change permission.',
    })
  }
}

// STEP 1: Request OTP
router.post('/request-otp', authMiddleware, requireSelfPasswordChangeAccess, async (req, res) => {
  try {
    const result = await requestPasswordOtp({
      userId: req.user.userId,
    })

    return res.status(200).json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Password OTP request error:', error.message)

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : 'Unable to send password verification OTP.',
    })
  }
})

// Resend OTP
router.post('/resend-otp', authMiddleware, requireSelfPasswordChangeAccess, async (req, res) => {
  try {
    const result = await requestPasswordOtp({
      userId: req.user.userId,
    })

    return res.status(200).json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Password OTP resend error:', error.message)

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : 'Unable to resend password verification OTP.',
    })
  }
})

// STEP 2: Verify OTP
router.post('/verify-otp', authMiddleware, requireSelfPasswordChangeAccess, async (req, res) => {
  try {
    const result = await verifyPasswordOtp({
      userId: req.user.userId,
      otp: req.body.otp,
    })

    return res.status(200).json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Password OTP verification error:', error.message)

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : 'Unable to verify OTP.',
    })
  }
})

// STEP 3: Update password after OTP verification
router.post('/update-password', authMiddleware, requireSelfPasswordChangeAccess, async (req, res) => {
  try {
    const result = await updatePasswordAfterOtp({
      userId: req.user.userId,
      newPassword: req.body.newPassword,
      confirmPassword: req.body.confirmPassword,
    })

    return res.status(200).json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Password update error:', error.message)

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : 'Unable to update password.',
    })
  }
})

module.exports = router
