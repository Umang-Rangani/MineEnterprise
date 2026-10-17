const express = require('express')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const User = require('../models/User')
const Company = require('../models/Company')
const authMiddleware = require('../middleware/authMiddleware')

const router = express.Router()

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

    if (typeof setupKey !== 'string') {
      return res.status(403).json({
        success: false,
        message: 'Invalid setup authorization',
      })
    }

    const providedBuffer = Buffer.from(setupKey)
    const expectedBuffer = Buffer.from(expectedKey)

    if (providedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(providedBuffer, expectedBuffer)) {
      return res.status(403).json({
        success: false,
        message: 'Invalid setup authorization',
      })
    }

    const { name, email, password } = req.body

    if (typeof name !== 'string' || !name.trim() || typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
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
      data: {
        id: user._id,
        companyId: null,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        lastLogin: user.lastLogin,
      },
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

// Public user registration is disabled.
// CompanyAdmin is created during company registration.
router.post('/register', (req, res) => {
  return res.status(410).json({
    success: false,
    message: 'Public user registration is disabled. Register your company using /companies/register.',
  })
})

// Login:
// Company users, SuperAdmin: email + password.
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      })
    }

    if (password.length > 128) {
      return res.status(401).json({
        success: false,
        message: 'Invalid login details',
      })
    }

    const normalizedEmail = email.trim().toLowerCase()

    // Find the account using email only.
    // Email must be unique across all companies for password-only login.
    const users = await User.find({
      email: normalizedEmail,
    }).select('+password')

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid login details',
      })
    }

    // Check the supplied password against matching email accounts.
    const matchingUsers = []

    for (const candidate of users) {
      const passwordValid = await candidate.comparePassword(password)

      if (passwordValid) {
        matchingUsers.push(candidate)
      }
    }

    // Reject ambiguous matches instead of choosing the wrong company account.
    if (matchingUsers.length !== 1) {
      return res.status(401).json({
        success: false,
        message: 'Invalid login details',
      })
    }

    const user = matchingUsers[0]
    let company = null

    if (user.status !== 'Active') {
      return res.status(403).json({
        success: false,
        message: 'Your account is inactive. Contact your administrator.',
      })
    }

    if (user.role === 'SuperAdmin') {
      if (user.companyId) {
        return res.status(403).json({
          success: false,
          message: 'Invalid SuperAdmin account configuration',
        })
      }
    } else {
      if (!user.companyId) {
        return res.status(401).json({
          success: false,
          message: 'Invalid login details',
        })
      }

      company = await Company.findById(user.companyId)

      if (!company || company.status !== 'Active') {
        return res.status(403).json({
          success: false,
          message: 'Your company is inactive or unavailable.',
        })
      }

      if (user.companyId.toString() !== company._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Company access denied',
        })
      }
    }

    user.lastLogin = new Date()
    await user.save()

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

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '1d',
    })

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
      data: {
        id: user._id,
        companyId: user.companyId || null,
        companyName: company ? company.companyName : null,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        lastLogin: user.lastLogin,
      },
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
      res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      })

      return res.status(401).json({
        success: false,
        message: 'User account is unavailable',
      })
    }

    if (user.role === 'SuperAdmin') {
      if (user.companyId) {
        res.clearCookie('token', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
        })

        return res.status(403).json({
          success: false,
          message: 'Invalid SuperAdmin account configuration',
        })
      }
    } else if (!user.companyId || user.companyId.status !== 'Active') {
      res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      })

      return res.status(403).json({
        success: false,
        message: 'Company is inactive or unavailable',
      })
    }

    return res.status(200).json({
      success: true,
      data: {
        id: user._id,
        companyId: user.companyId ? user.companyId._id : null,
        companyCode: user.companyId ? user.companyId.companyCode : null,
        companyName: user.companyId ? user.companyId.companyName : null,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        lastLogin: user.lastLogin,
      },
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
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  })

  return res.status(200).json({
    success: true,
    message: 'Logout successful',
  })
})

module.exports = router
