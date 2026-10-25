const express = require('express')
const mongoose = require('mongoose')

const Company = require('../models/Company')

const authMiddleware = require('../middleware/authMiddleware')

const { ROLES, ACTIONS, ROLE_DEFAULT_PERMISSIONS } = require('../constants/permission')
const { getEffectivePermissions } = require('../utils/permission')

const router = express.Router()

const validPermissions = new Set(Object.values(ACTIONS).flatMap((sectionActions) => Object.values(sectionActions)))

const getCompanyForUser = async (user) => {
  if (!user.companyId || !mongoose.isValidObjectId(user.companyId)) {
    return null
  }

  return Company.findOne({
    _id: user.companyId,
    status: 'Approved',
  })
}

// GET /erp/my-permissions
router.get('/my-permissions', authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role === ROLES.SUPER_ADMIN) {
      return res.status(200).json({
        success: true,
        isSuperAdmin: true,
        permissions: null,
      })
    }

    console.log('MY PERMISSIONS USER:', {
      id: req.user.id || req.user.userId,
      role: req.user.role,
      companyId: req.user.companyId,
    })

    const company = await getCompanyForUser(req.user)

    console.log(
      'COMPANY FOUND:',
      company
        ? {
            id: company._id,
            status: company.status,
          }
        : null,
    )

    if (!company) {
      return res.status(403).json({
        success: false,
        message: 'Approved company not found or company access is required.',
      })
    }

    console.log('USER ROLE:', req.user.role)
    console.log('USER OVERRIDES:', req.user.permissionOverrides)
    console.log('USER ROLES:', req.user.roles)

    const permissions = getEffectivePermissions(req.user, company)

    console.log('FINAL EFFECTIVE PERMISSIONS:', permissions)

    return res.status(200).json({
      success: true,
      isSuperAdmin: false,
      permissions: permissions || {},
    })
  } catch (error) {
    return next(error)
  }
})

module.exports = router
