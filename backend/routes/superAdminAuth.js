const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const Company = require('../models/Company')
const authMiddleware = require('../middleware/authMiddleware')
const logSystemActivity = require('../services/systemActivityService')

const router = express.Router()

const recordActivity = async (data) => {
  try {
    await logSystemActivity(data)
  } catch (error) {
    console.error('Activity recording failed:', error.message)
  }
}

router.get('/me', authMiddleware, async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      user: {
        id: req.user.userId,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        roles: Array.isArray(req.user.roles) ? req.user.roles : [],
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

router.patch('/profile', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'SuperAdmin' || req.user.companyId) {
      return res.status(403).json({
        success: false,
        message: 'Only SuperAdmin can update this profile.',
      })
    }

    const { name, phone } = req.body

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Name is required.',
      })
    }

    if (name.trim().length < 2 || name.trim().length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Name must be between 2 and 100 characters.',
      })
    }

    if (phone !== undefined && typeof phone !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number.',
      })
    }

    if (phone && phone.trim().length > 20) {
      return res.status(400).json({
        success: false,
        message: 'Phone number cannot exceed 20 characters.',
      })
    }

    const user = await User.findOne({
      _id: req.user.userId,
      role: 'SuperAdmin',
      status: 'Active',
      companyId: null,
    })

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'SuperAdmin account not found.',
      })
    }

    user.name = name.trim()

    if (phone !== undefined) {
      user.phone = phone.trim()
    }

    await user.save()

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    })
  } catch (error) {
    console.error('SuperAdmin profile update error:', error)

    return res.status(500).json({
      success: false,
      message: 'Unable to update profile.',
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

    await recordActivity({
      actor: {
        userId: superAdmin._id,
        name: superAdmin.name,
        email: superAdmin.email,
        role: superAdmin.role,
      },
      action: 'SUPERADMIN_SETUP',
      description: `SuperAdmin account created for ${superAdmin.name}.`,
      req,
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

    const normalizedEmail = email.trim().toLowerCase()

    const user = await User.findOne({
      email: normalizedEmail,
    }).select('+password')

    if (!user || user.status !== 'Active' || !['SuperAdmin', 'CompanyAdmin'].includes(user.role)) {
      await recordActivity({
        actor: {
          email: normalizedEmail,
        },
        action: 'LOGIN_FAILED',
        description: `Failed login attempt for ${normalizedEmail}.`,
        metadata: {
          attemptedEmail: normalizedEmail,
          reason: 'Invalid account or inactive user.',
        },
        req,
      })

      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      await recordActivity({
        actor: {
          userId: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        action: 'LOGIN_FAILED',
        description: `Failed login attempt for ${user.email}.`,
        metadata: {
          attemptedEmail: normalizedEmail,
          reason: 'Incorrect password.',
        },
        req,
      })

      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      })
    }

    let companyId = user.companyId || null
    let company = null

    if (user.role === 'CompanyAdmin') {
      if (companyId) {
        company = await Company.findById(companyId)
      }

      if (!company) {
        company = await Company.findOne({
          owner: user._id,
        })
      }

      if (!company || company.status !== 'Approved') {
        await recordActivity({
          actor: {
            userId: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
          company: company
            ? {
                companyId: company._id,
                companyName: company.companyName,
              }
            : null,
          action: 'LOGIN_FAILED',
          description: `Login blocked for ${user.email} because the company is not approved.`,
          metadata: {
            attemptedEmail: normalizedEmail,
            reason: company?.status || 'Company not found.',
          },
          req,
        })

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

    await recordActivity({
      actor: {
        userId: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      company: company
        ? {
            companyId: company._id,
            companyName: company.companyName,
          }
        : null,
      action: 'LOGIN_SUCCESS',
      description: `${user.name} logged in successfully.`,
      req,
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

router.post('/logout', async (req, res) => {
  try {
    const token = req.cookies?.token

    if (token && process.env.JWT_SECRET) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        const user = await User.findById(decoded.userId)

        if (user) {
          let company = null

          if (user.role === 'CompanyAdmin') {
            company = await Company.findOne({
              $or: [...(user.companyId ? [{ _id: user.companyId }] : []), { owner: user._id }],
            })
          }

          await recordActivity({
            actor: {
              userId: user._id,
              name: user.name,
              email: user.email,
              role: user.role,
            },
            company: company
              ? {
                  companyId: company._id,
                  companyName: company.companyName,
                }
              : null,
            action: 'LOGOUT',
            description: `${user.name} logged out.`,
            req,
          })
        }
      } catch (error) {
        console.error('Logout activity identification failed:', error.message)
      }
    }

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
  } catch (error) {
    console.error('Logout error:', error)

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
  }
})

module.exports = router
