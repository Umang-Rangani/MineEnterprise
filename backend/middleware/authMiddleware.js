const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const User = require('../models/User')
const Company = require('../models/Company')

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

    if (!decoded.userId || !decoded.companyId || !mongoose.isValidObjectId(decoded.userId) || !mongoose.isValidObjectId(decoded.companyId)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token',
      })
    }

    const user = await User.findById(decoded.userId).select('_id companyId name email role status')

    if (!user || user.status !== 'Active') {
      res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      })

      return res.status(401).json({
        success: false,
        message: 'User account is inactive or unavailable',
      })
    }

    if (user.companyId.toString() !== decoded.companyId) {
      res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      })

      return res.status(401).json({
        success: false,
        message: 'Invalid company authentication',
      })
    }

    const company = await Company.findById(user.companyId).select('_id status')

    if (!company || company.status !== 'Active') {
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

    // Use current database values, not role values supplied by the client.
    req.user = {
      userId: user._id.toString(),
      companyId: user.companyId.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    }

    next()
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError' || error.name === 'CastError') {
      res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      })

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
