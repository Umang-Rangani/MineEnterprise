const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const Company = require('../models/Company')
const authMiddleware = require('../middleware/authMiddleware')

const router = express.Router()

router.get('/me', authMiddleware, async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      user: {
        id: req.user.userId,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        companyId: req.user.companyId || null,
      },
    })
  } catch (error) {
    console.error('Session restore error:', error)

    return res.status(500).json({
      success: false,
      message: 'Unable to restore session.',
    })
  }
})

router.post('/setup', async (req, res) => {
  try {
    const { name, email, password, phone, setupKey } = req.body
    const serverSetupKey = process.env.SUPERADMIN_SETUP_KEY

    if (!serverSetupKey) {
      return res.status(503).json({
        success: false,
        message: 'SuperAdmin setup is not configured.',
      })
    }

    if (!setupKey || setupKey !== serverSetupKey) {
      return res.status(403).json({
        success: false,
        message: 'Invalid setup key.',
      })
    }

    const existingSuperAdmin = await User.findOne({
      role: 'SuperAdmin',
    })

    if (existingSuperAdmin) {
      return res.status(409).json({
        success: false,
        message: 'SuperAdmin has already been created.',
      })
    }

    if (!name?.trim() || !email?.trim() || !password || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Name, email and password of at least 8 characters are required.',
      })
    }

    const normalizedEmail = email.trim().toLowerCase()

    const existingUser = await User.findOne({
      email: normalizedEmail,
    })

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const superAdmin = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      phone: phone?.trim() || '',
      role: 'SuperAdmin',
      status: 'Active',
    })

    return res.status(201).json({
      success: true,
      message: 'SuperAdmin created successfully.',
      user: {
        id: superAdmin._id,
        name: superAdmin.name,
        email: superAdmin.email,
        role: superAdmin.role,
        status: superAdmin.status,
      },
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      })
    }

    console.error('SuperAdmin setup error:', error)

    return res.status(500).json({
      success: false,
      message: 'Failed to create SuperAdmin.',
    })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      })
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'Authentication is not configured.',
      })
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select('+password')

    if (!user || user.status !== 'Active' || !['SuperAdmin', 'CompanyAdmin'].includes(user.role)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      })
    }

    let companyId = user.companyId || null

    if (user.role === 'CompanyAdmin') {
      let company = null

      if (companyId) {
        company = await Company.findById(companyId)
      }

      if (!company) {
        company = await Company.findOne({
          owner: user._id,
        })
      }

      if (!company || company.status !== 'Approved') {
        return res.status(403).json({
          success: false,
          message: company?.status === 'Rejected' ? 'Your company registration has been rejected.' : 'Your company is awaiting approval.',
        })
      }

      companyId = company._id
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        role: user.role,
        companyId: companyId ? companyId.toString() : null,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '1d',
      },
    )

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    })

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        companyId,
      },
    })
  } catch (error) {
    console.error('Login error:', error)

    return res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.',
    })
  }
})


router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  })

  return res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  })
})


module.exports = router
