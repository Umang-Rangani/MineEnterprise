const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const User = require('../models/User')
const Company = require('../models/Company')

const clearAuthCookie = (res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  })
}

const authMiddleware = async (req, res, next) => {
  try {
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is missing in .env')

      return res.status(500).json({
        success: false,
        message: 'Server authentication configuration error',
      })
    }

    const token = req.cookies?.token

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    if (!decoded.userId || !mongoose.isValidObjectId(decoded.userId)) {
      clearAuthCookie(res)

      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token',
      })
    }

    const user = await User.findById(decoded.userId).select('_id companyId name email role status')

    if (!user || user.status !== 'Active') {
      clearAuthCookie(res)

      return res.status(401).json({
        success: false,
        message: 'User account is inactive or unavailable',
      })
    }

    // Global SuperAdmin does not belong to a company.
    if (user.role === 'SuperAdmin') {
      if (user.companyId || decoded.companyId) {
        clearAuthCookie(res)

        return res.status(401).json({
          success: false,
          message: 'Invalid SuperAdmin authentication',
        })
      }

      req.user = {
        userId: user._id.toString(),
        companyId: null,
        name: user.name,
        email: user.email,
        role: user.role,
      }

      return next()
    }

    // All other users must belong to an active company.
    if (!user.companyId || !decoded.companyId || !mongoose.isValidObjectId(decoded.companyId)) {
      clearAuthCookie(res)

      return res.status(401).json({
        success: false,
        message: 'Invalid company authentication',
      })
    }

    if (user.companyId.toString() !== decoded.companyId) {
      clearAuthCookie(res)

      return res.status(401).json({
        success: false,
        message: 'Invalid company authentication',
      })
    }

    const company = await Company.findById(user.companyId).select('_id status')

    if (!company || company.status !== 'Approved') {
      clearAuthCookie(res)

      return res.status(403).json({
        success: false,
        message: 'Company is not approved or is unavailable.',
      })
    }


    req.user = {
      userId: user._id.toString(),
      companyId: user.companyId.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    }

    return next()
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError' || error.name === 'CastError') {
      clearAuthCookie(res)

      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      })
    }

    console.error('Authentication error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
    })
  }
}

module.exports = authMiddleware
