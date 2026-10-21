const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const User = require('../models/User')
const Company = require('../models/Company')

const router = express.Router()

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body

    if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
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

    if (!user || user.role !== 'Employee' || user.status !== 'Active') {
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

    if (!user.companyId) {
      return res.status(403).json({
        success: false,
        message: 'Your account is not linked to a company.',
      })
    }

    const company = await Company.findOne({
      _id: user.companyId,
      status: 'Approved',
    }).select('_id status')

    if (!company) {
      return res.status(403).json({
        success: false,
        message: 'Your company is not approved or is unavailable.',
      })
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        role: user.role,
        companyId: company._id.toString(),
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
      message: 'Employee login successful.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        roles: user.roles,
        status: user.status,
        companyId: company._id,
      },
    })
  } catch (error) {
    return next(error)
  }
})

module.exports = router
