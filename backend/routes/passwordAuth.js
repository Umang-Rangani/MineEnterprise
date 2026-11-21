const express = require('express')
const authMiddleware = require('../middleware/authMiddleware')

const { requestPasswordOtp, verifyPasswordOtp, updatePasswordAfterOtp } = require('../services/passwordOtpService')

const router = express.Router()

// STEP 1: Request OTP
router.post('/request-otp', authMiddleware, async (req, res) => {
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
router.post('/resend-otp', authMiddleware, async (req, res) => {
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
router.post('/verify-otp', authMiddleware, async (req, res) => {
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
router.post('/update-password', authMiddleware, async (req, res) => {
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
