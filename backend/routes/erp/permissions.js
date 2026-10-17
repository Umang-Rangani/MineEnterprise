const express = require('express')
const ErpPermission = require('../../models/erp/ErpPermission')
const authMiddleware = require('../../middleware/authMiddleware')

const router = express.Router()

const SUPERADMIN_PERMISSIONS = [
  {
    name: 'View Dashboard',
    key: 'DASHBOARD_VIEW',
    module: 'DASHBOARD',
    description: 'View the ERP dashboard',
  },
  {
    name: 'View Users',
    key: 'USER_VIEW',
    module: 'USERS',
    description: 'View ERP users',
  },
  {
    name: 'Create Users',
    key: 'USER_CREATE',
    module: 'USERS',
    description: 'Create ERP users',
  },
  {
    name: 'Edit Users',
    key: 'USER_EDIT',
    module: 'USERS',
    description: 'Edit ERP users',
  },
  {
    name: 'Deactivate Users',
    key: 'USER_DEACTIVATE',
    module: 'USERS',
    description: 'Deactivate ERP users',
  },
  {
    name: 'Manage Roles',
    key: 'ROLE_MANAGE',
    module: 'ROLES',
    description: 'Manage user roles and access',
  },
  {
    name: 'View Companies',
    key: 'COMPANY_VIEW',
    module: 'COMPANIES',
    description: 'View registered companies',
  },
  {
    name: 'Approve Companies',
    key: 'COMPANY_APPROVE',
    module: 'COMPANIES',
    description: 'Approve registered companies',
  },
  {
    name: 'View Reports',
    key: 'REPORT_VIEW',
    module: 'REPORTS',
    description: 'View ERP reports',
  },
  {
    name: 'Manage Settings',
    key: 'SETTINGS_MANAGE',
    module: 'SETTINGS',
    description: 'Manage ERP settings',
  },
]

router.post('/seed', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'SuperAdmin') {
      return res.status(403).json({
        success: false,
        message: 'Only SuperAdmin can initialize permissions',
      })
    }

    const operations = SUPERADMIN_PERMISSIONS.map((permission) => ({
      updateOne: {
        filter: {
          module: permission.module,
          key: permission.key,
        },
        update: {
          $setOnInsert: {
            ...permission,
            isSystem: true,
          },
        },
        upsert: true,
      },
    }))

    await ErpPermission.bulkWrite(operations)

    const permissions = await ErpPermission.find().sort({
      module: 1,
      name: 1,
    })

    return res.status(200).json({
      success: true,
      message: 'ERP permissions initialized successfully',
      count: permissions.length,
      data: permissions,
    })
  } catch (error) {
    console.error('ERP permission seed error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Unable to initialize ERP permissions',
    })
  }
})

module.exports = router
