// CompanyAdmin & Employee Profile

const express = require('express')
const User = require('../models/User')
const Company = require('../models/Company')
const Warehouse = require('../models/Warehouse')
const authMiddleware = require('../middleware/authMiddleware')

const { handleUpload, saveUploadedFile, deleteUploadedFile } = require('./upload')

const router = express.Router()

const ALLOWED_PROFILE_PHOTO_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
}

// Only CompanyAdmin and SuperAdmin can edit their own profile
const requireProfileEditAccess = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).select('role')

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.',
      })
    }

    const allowedRoles = ['CompanyAdmin', 'SuperAdmin']

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to edit your own profile.',
      })
    }

    next()
  } catch (error) {
    console.error('Profile edit permission error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Failed to verify profile edit permission.',
    })
  }
}

// Validate profile photo MIME type
const validateProfilePhoto = (file) => {
  if (!file) {
    const error = new Error('Profile photo is required.')
    error.statusCode = 400
    throw error
  }

  const extension = ALLOWED_PROFILE_PHOTO_TYPES[file.mimetype]

  if (!extension) {
    const error = new Error('Only JPG, PNG and WEBP images are allowed.')
    error.statusCode = 400
    throw error
  }

  return extension
}

const getProfile = async (userId) => {
  const user = await User.findById(userId).select('_id name email phone profilePhoto role roles status companyId defaultWarehouseId assignedWarehouses createdAt updatedAt')

  if (!user) {
    const error = new Error('User profile not found')
    error.statusCode = 404
    throw error
  }

  let company = null
  let defaultWarehouse = null
  let assignedWarehouses = []

  if (user.companyId) {
    company = await Company.findById(user.companyId)
      .select('companyName businessType companyEmail companyPhone logo website addressLine1 addressLine2 city state country postalCode gstNumber panNumber currency businessCategory status approvedAt')
      .lean()

    const warehouseIds = [...(user.defaultWarehouseId ? [user.defaultWarehouseId] : []), ...(user.assignedWarehouses || [])]

    const warehouses = warehouseIds.length
      ? await Warehouse.find({
          _id: { $in: warehouseIds },
          companyId: user.companyId,
        })
          .select('name code address city state pincode manager managerPhone contactPerson phone capacity capacityUnit status')
          .lean()
      : []

    const warehouseMap = new Map(warehouses.map((warehouse) => [warehouse._id.toString(), warehouse]))

    defaultWarehouse = user.defaultWarehouseId ? warehouseMap.get(user.defaultWarehouseId.toString()) || null : null

    assignedWarehouses = (user.assignedWarehouses || []).map((warehouseId) => warehouseMap.get(warehouseId.toString())).filter(Boolean)
  }

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      profilePhoto: user.profilePhoto || '',
      role: user.role,
      roles: (user.roles || []).map((assignedRole) => ({
        type: assignedRole.type,
        name: assignedRole.name,
        customRoleId: assignedRole.customRoleId || null,
      })),
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    company,
    defaultWarehouse,
    assignedWarehouses,
  }
}

// GET logged-in user's complete profile
router.get('/', authMiddleware, async (req, res) => {
  try {
    const profile = await getProfile(req.user.userId)

    return res.status(200).json({
      success: true,
      message: 'Profile fetched successfully',
      ...profile,
    })
  } catch (error) {
    console.error('Get profile error:', error.message)

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : 'Failed to fetch profile',
    })
  }
})

// UPLOAD - Logged-in user's profile photo
router.post('/upload-photo', authMiddleware, requireProfileEditAccess, handleUpload, async (req, res) => {
  try {
    const extension = validateProfilePhoto(req.file)

    const user = await User.findById(req.user.userId).select('_id')

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.',
      })
    }

    // Use MIME-based extension instead of trusting original filename
    const fileForSave = {
      ...req.file,
      originalname: `profile${extension}`,
    }

    const result = saveUploadedFile(fileForSave, 'profiles', `profile-${user._id}`)

    return res.status(200).json({
      success: true,
      message: 'Profile photo uploaded successfully.',
      filePath: result.filePath,
      file: {
        filename: result.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
      },
    })
  } catch (error) {
    console.error('Profile photo upload error:', error)

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : 'Failed to upload profile photo.',
    })
  }
})

// DELETE - Logged-in user's old profile photo
router.delete('/delete-photo', authMiddleware, requireProfileEditAccess, async (req, res) => {
  try {
    const { filePath } = req.body

    if (!filePath || typeof filePath !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'filePath is required.',
      })
    }

    const user = await User.findById(req.user.userId).select('_id profilePhoto')

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.',
      })
    }

    const photoPattern = new RegExp(`^/uploads/profiles/profile-${user._id}-[a-zA-Z0-9-]+\\.(jpg|png|webp)$`)

    if (!photoPattern.test(filePath)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid profile photo path.',
      })
    }

    // Do not delete the currently active profile photo
    if (user.profilePhoto === filePath) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete the currently active profile photo.',
      })
    }

    deleteUploadedFile(filePath)

    return res.status(200).json({
      success: true,
      message: 'Profile photo deleted successfully.',
    })
  } catch (error) {
    console.error('Profile photo delete error:', error)

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : 'Failed to delete profile photo.',
    })
  }
})

// UPDATE
router.patch('/', authMiddleware, requireProfileEditAccess, async (req, res) => {
  try {
    const allowedFields = ['name', 'phone', 'profilePhoto']
    const receivedFields = Object.keys(req.body || {})

    if (receivedFields.length === 0 || receivedFields.some((field) => !allowedFields.includes(field))) {
      return res.status(400).json({
        success: false,
        message: 'Only name, phone and profile photo can be updated',
      })
    }

    const updates = {}

    if (Object.prototype.hasOwnProperty.call(req.body, 'name')) {
      const name = typeof req.body.name === 'string' ? req.body.name.trim() : ''

      if (name.length < 2 || name.length > 100) {
        return res.status(400).json({
          success: false,
          message: 'Name must be between 2 and 100 characters',
        })
      }

      updates.name = name
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'phone')) {
      const phone = typeof req.body.phone === 'string' ? req.body.phone.trim() : ''

      if (phone.length > 20) {
        return res.status(400).json({
          success: false,
          message: 'Phone cannot exceed 20 characters',
        })
      }

      updates.phone = phone
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'profilePhoto')) {
      const profilePhoto = typeof req.body.profilePhoto === 'string' ? req.body.profilePhoto.trim() : ''

      const userId = req.user.userId

      const photoPattern = new RegExp(`^/uploads/profiles/profile-${userId}-[a-zA-Z0-9-]+\\.(jpg|png|webp)$`)

      if (profilePhoto && !photoPattern.test(profilePhoto)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid profile photo path.',
        })
      }

      updates.profilePhoto = profilePhoto
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: updates },
      {
        new: true,
        runValidators: true,
      },
    )

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found',
      })
    }

    const profile = await getProfile(req.user.userId)

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      ...profile,
    })
  } catch (error) {
    console.error('Update profile error:', error.message)

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : 'Failed to update profile',
    })
  }
})

module.exports = router
