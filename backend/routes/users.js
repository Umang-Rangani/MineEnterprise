const express = require('express')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const Company = require('../models/Company')
const authMiddleware = require('../middleware/authMiddleware')

const router = express.Router()

const createToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is missing in .env')
  }

  return jwt.sign(
    {
      userId: user._id.toString(),
      companyId: user.companyId.toString(),
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: '1d' },
  )
}

const publicUser = (user) => ({
  id: user._id,
  companyId: user.companyId,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
  lastLogin: user.lastLogin,
})

// Register the first CompanyAdmin for a company.
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

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain at least 8 characters',
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

    const existingUser = await User.findOne({
      companyId: company._id,
      email: normalizedEmail,
    })

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email is already registered in this company',
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
        message: 'Email is already registered in this company',
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

// Login
router.post('/login', async (req, res) => {
  try {
    const { companyId, email, password } = req.body

    if (!companyId || !email?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: 'Company ID, email and password are required',
      })
    }

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

    const user = await User.findOne({
      companyId: company._id,
      email: email.trim().toLowerCase(),
    }).select('+password')

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid company ID, email or password',
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
        message: 'Invalid company ID, email or password',
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

// Get current logged-in user
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id

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

    if (!user.companyId || user.companyId.status !== 'Active') {
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
      data: publicUser({
        ...user.toObject(),
        companyId: user.companyId,
      }),
    })
  } catch (error) {
    console.error('Current user error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Unable to fetch current user',
    })
  }
})

// Logout
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
