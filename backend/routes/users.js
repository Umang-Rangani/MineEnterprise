const express = require('express')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const User = require('../models/User')
const Company = require('../models/Company')
const authMiddleware = require('../middleware/authMiddleware')

const router = express.Router()

const createToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is missing in .env')
  }

  const payload = {
    userId: user._id.toString(),
    role: user.role,
  }

  if (user.companyId) {
    payload.companyId = user.companyId.toString()
  }

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '1d',
  })
}

const publicUser = (user) => ({
  id: user._id,
  companyId: user.companyId || null,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
  lastLogin: user.lastLogin,
})

const clearAuthCookie = (res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  })
}

const matchesSetupKey = (providedKey, expectedKey) => {
  if (typeof providedKey !== 'string' || !expectedKey) {
    return false
  }

  const provided = Buffer.from(providedKey)
  const expected = Buffer.from(expectedKey)

  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected)
}

// One-time Global SuperAdmin setup.
router.post('/setup-superadmin', async (req, res) => {
  try {
    const setupKey = req.get('x-superadmin-setup-key')
    const expectedKey = process.env.SUPERADMIN_SETUP_KEY

    if (!expectedKey || expectedKey.length < 32) {
      return res.status(503).json({
        success: false,
        message: 'SuperAdmin setup is not configured',
      })
    }

    if (!matchesSetupKey(setupKey, expectedKey)) {
      return res.status(403).json({
        success: false,
        message: 'Invalid setup authorization',
      })
    }

    const { name, email, password } = req.body

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email and password are required',
      })
    }

    if (name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Name must contain at least 2 characters',
      })
    }

    if (password.length < 8 || password.length > 128) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain 8 to 128 characters',
      })
    }

    // Atomic unique index in User.js prevents multiple SuperAdmins.
    const user = await User.create({
      companyId: null,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role: 'SuperAdmin',
      status: 'Active',
    })

    return res.status(201).json({
      success: true,
      message: 'SuperAdmin created successfully',
      data: publicUser(user),
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'SuperAdmin already exists or a duplicate account was detected',
      })
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: error.message,
      })
    }

    console.error('SuperAdmin setup error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Unable to set up SuperAdmin',
    })
  }
})

// Register first CompanyAdmin for a company.
router.post('/register', async (req, res) => {
  try {
    const { companyId, name, email, password } = req.body

    if (!companyId || !name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: 'Company ID, name, email and password are required',
      })
    }

    if (!mongoose.isValidObjectId(companyId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid company ID',
      })
    }

    if (password.length < 8 || password.length > 128) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain 8 to 128 characters',
      })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const company = await Company.findById(companyId)

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      })
    }

    if (company.status !== 'Active') {
      return res.status(403).json({
        success: false,
        message: 'This company is inactive',
      })
    }

    const existingAdmin = await User.findOne({
      companyId: company._id,
      role: 'CompanyAdmin',
    })

    if (existingAdmin) {
      return res.status(403).json({
        success: false,
        message: 'A Company Admin already exists for this company',
      })
    }

    const user = await User.create({
      companyId: company._id,
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: 'CompanyAdmin',
    })

    return res.status(201).json({
      success: true,
      message: 'Company Admin registered successfully',
      data: publicUser(user),
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Duplicate account detected',
      })
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: error.message,
      })
    }

    console.error('Register error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Unable to register user',
    })
  }
})

// Login: SuperAdmin uses email/password.
// Company users use companyId/email/password.
router.post('/login', async (req, res) => {
  try {
    const { companyId, email, password } = req.body

    if (!email?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      })
    }

    const normalizedEmail = email.trim().toLowerCase()
    let user

    if (!companyId) {
      user = await User.findOne({
        role: 'SuperAdmin',
        email: normalizedEmail,
        companyId: null,
      }).select('+password')
    } else {
      if (!mongoose.isValidObjectId(companyId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid company ID',
        })
      }

      const company = await Company.findById(companyId)

      if (!company || company.status !== 'Active') {
        return res.status(401).json({
          success: false,
          message: 'Invalid login details or inactive company',
        })
      }

      user = await User.findOne({
        companyId: company._id,
        email: normalizedEmail,
        role: { $ne: 'SuperAdmin' },
      }).select('+password')
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid login details',
      })
    }

    if (user.status !== 'Active') {
      return res.status(403).json({
        success: false,
        message: 'Your account is inactive. Contact your administrator.',
      })
    }

    const isPasswordValid = await user.comparePassword(password)

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid login details',
      })
    }

    user.lastLogin = new Date()
    await user.save()

    const token = createToken(user)

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    })

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: publicUser(user),
    })
  } catch (error) {
    console.error('Login error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Unable to login',
    })
  }
})

// Current logged-in user.
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token',
      })
    }

    const user = await User.findById(userId).select('-password').populate('companyId', 'companyName companyCode status')

    if (!user || user.status !== 'Active') {
      clearAuthCookie(res)

      return res.status(401).json({
        success: false,
        message: 'User account is unavailable',
      })
    }

    if (user.role === 'SuperAdmin') {
      if (user.companyId) {
        clearAuthCookie(res)

        return res.status(403).json({
          success: false,
          message: 'Invalid SuperAdmin account configuration',
        })
      }
    } else if (!user.companyId || user.companyId.status !== 'Active') {
      clearAuthCookie(res)

      return res.status(403).json({
        success: false,
        message: 'Company is inactive or unavailable',
      })
    }

    return res.status(200).json({
      success: true,
      data: publicUser(user),
    })
  } catch (error) {
    console.error('Current user error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Unable to fetch current user',
    })
  }
})

// Logout.
router.post('/logout', (req, res) => {
  clearAuthCookie(res)

  return res.status(200).json({
    success: true,
    message: 'Logout successful',
  })
})

module.exports = router
