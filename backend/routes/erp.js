const express = require('express')
const bcrypt = require('bcryptjs')
const mongoose = require('mongoose')

const User = require('../models/User')
const Company = require('../models/Company')

const authMiddleware = require('../middleware/authMiddleware')
const permissionMiddleware = require('../middleware/permissionMiddleware')

const { ROLES, ACTIONS, ROLE_DEFAULT_PERMISSIONS } = require('../constants/permission')
const { getEffectivePermissions } = require('../utils/permission')
const router = express.Router()

const allowedPredefinedRoles = [ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.ACCOUNTANT, ROLES.INVENTORY_MANAGER, ROLES.SALES_MANAGER]

const getSafeEmployee = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  roles: Array.isArray(user.roles) ? user.roles : [],
  companyId: user.companyId,
  status: user.status,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
})

router.get('/my-permissions', authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role === ROLES.SUPER_ADMIN) {
      return res.status(200).json({
        success: true,
        isSuperAdmin: true,
        permissions: null,
      })
    }

    if (!req.user.companyId || !mongoose.isValidObjectId(req.user.companyId)) {
      return res.status(403).json({
        success: false,
        message: 'Company access is required.',
      })
    }

    const company = await Company.findOne({
      _id: req.user.companyId,
      status: 'Approved',
    })
      .select('_id customRoles')
      .lean()

    if (!company) {
      return res.status(403).json({
        success: false,
        message: 'Approved company not found.',
      })
    }

    const permissions = getEffectivePermissions(req.user, company)

    return res.status(200).json({
      success: true,
      isSuperAdmin: false,
      permissions: permissions || {},
    })
  } catch (error) {
    return next(error)
  }
})

// GET /erp/employees
router.get('/employees', authMiddleware, permissionMiddleware('Employee', 'LIST'), async (req, res, next) => {
  try {
    if (!req.user.companyId) {
      return res.status(403).json({
        success: false,
        message: 'Company access is required.',
      })
    }

    const company = await Company.findOne({
      _id: req.user.companyId,
      status: 'Approved',
    }).select('_id')

    if (!company) {
      return res.status(403).json({
        success: false,
        message: 'Approved company not found.',
      })
    }

    const employees = await User.find({
      companyId: company._id,
      role: { $ne: ROLES.SUPER_ADMIN },
    })
      .select('name email phone role roles companyId status createdAt updatedAt')
      .sort({ createdAt: -1 })
      .lean()

    return res.status(200).json({
      success: true,
      count: employees.length,
      employees: employees.map(getSafeEmployee),
    })
  } catch (error) {
    return next(error)
  }
})

// GET /erp/employees/:id
router.get('/employees/:id', authMiddleware, permissionMiddleware('Employee', 'VIEW'), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid employee ID.',
      })
    }

    if (!req.user.companyId) {
      return res.status(403).json({
        success: false,
        message: 'Company access is required.',
      })
    }

    const employee = await User.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
      role: { $ne: ROLES.SUPER_ADMIN },
    })
      .select('name email phone role roles companyId status createdAt updatedAt')
      .lean()

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found in your company.',
      })
    }

    return res.status(200).json({
      success: true,
      employee: getSafeEmployee(employee),
    })
  } catch (error) {
    return next(error)
  }
})

// POST /erp/employees
router.post('/employees', authMiddleware, permissionMiddleware('Employee', 'CREATE'), async (req, res, next) => {
  try {
    if (req.user.role !== ROLES.COMPANY_ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Only CompanyAdmin can create employees.',
      })
    }

    if (!req.user.companyId || !mongoose.isValidObjectId(req.user.companyId)) {
      return res.status(403).json({
        success: false,
        message: 'Company access is required.',
      })
    }

    const { name, email, password, phone, roles = [] } = req.body

    if (typeof name !== 'string' || !name.trim() || typeof email !== 'string' || !email.trim() || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Name, email and a password of at least 8 characters are required.',
      })
    }

    if (!Array.isArray(roles)) {
      return res.status(400).json({
        success: false,
        message: 'Roles must be an array.',
      })
    }

    const company = await Company.findOne({
      _id: req.user.companyId,
      status: 'Approved',
    })

    if (!company) {
      return res.status(403).json({
        success: false,
        message: 'Approved company not found.',
      })
    }

    const normalizedEmail = email.trim().toLowerCase()

    const existingUser = await User.findOne({
      email: normalizedEmail,
    }).select('_id')

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      })
    }

    const validPermissions = new Set(Object.values(ACTIONS).flatMap((sectionActions) => Object.values(sectionActions)))

    const assignedRoles = []
    const assignedPermissions = new Set()
    const seenRoleKeys = new Set()

    for (const requestedRole of roles) {
      if (!requestedRole || !['Predefined', 'Custom'].includes(requestedRole.type)) {
        return res.status(400).json({
          success: false,
          message: 'Each role must have type Predefined or Custom.',
        })
      }

      if (requestedRole.type === 'Predefined') {
        if (!allowedPredefinedRoles.includes(requestedRole.name)) {
          return res.status(403).json({
            success: false,
            message: 'You cannot assign this predefined role.',
          })
        }

        const roleKey = `Predefined:${requestedRole.name}`

        if (seenRoleKeys.has(roleKey)) continue
        seenRoleKeys.add(roleKey)

        assignedRoles.push({
          type: 'Predefined',
          name: requestedRole.name,
          customRoleId: null,
        })

        const predefinedPermissions = ROLE_DEFAULT_PERMISSIONS[requestedRole.name] || {}

        for (const permissionList of Object.values(predefinedPermissions)) {
          if (!Array.isArray(permissionList)) continue

          for (const permission of permissionList) {
            if (validPermissions.has(permission)) {
              assignedPermissions.add(permission)
            }
          }
        }

        continue
      }

      if (!mongoose.isValidObjectId(requestedRole.customRoleId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid custom role ID.',
        })
      }

      const customRole = company.customRoles.find((role) => String(role._id) === String(requestedRole.customRoleId))

      if (!customRole) {
        return res.status(403).json({
          success: false,
          message: 'Custom role does not belong to your company.',
        })
      }

      const roleKey = `Custom:${customRole._id}`

      if (seenRoleKeys.has(roleKey)) continue
      seenRoleKeys.add(roleKey)

      assignedRoles.push({
        type: 'Custom',
        name: customRole.name,
        customRoleId: customRole._id,
      })

      for (const permission of customRole.permissions || []) {
        if (validPermissions.has(permission)) {
          assignedPermissions.add(permission)
        }
      }
    }

    // Calculate the current user's effective permissions inline.
    const currentUserPermissions = new Set()

    const currentAssignedRoles = [
      {
        type: 'Predefined',
        name: req.user.role,
      },
      ...(Array.isArray(req.user.roles) ? req.user.roles : []),
    ]

    if (req.user.role !== ROLES.SUPER_ADMIN) {
      for (const assignedRole of currentAssignedRoles) {
        if (assignedRole?.type === 'Custom') {
          const currentCustomRole = company.customRoles.find((role) => String(role._id) === String(assignedRole.customRoleId))

          for (const permission of currentCustomRole?.permissions || []) {
            if (validPermissions.has(permission)) {
              currentUserPermissions.add(permission)
            }
          }

          continue
        }

        if (assignedRole?.type && assignedRole.type !== 'Predefined') {
          continue
        }

        const predefinedPermissions = ROLE_DEFAULT_PERMISSIONS[assignedRole?.name] || {}

        for (const permissionList of Object.values(predefinedPermissions)) {
          if (!Array.isArray(permissionList)) continue

          for (const permission of permissionList) {
            if (validPermissions.has(permission)) {
              currentUserPermissions.add(permission)
            }
          }
        }
      }
    }

    const cannotAssignExtraPermissions = [...assignedPermissions].some((permission) => !currentUserPermissions.has(permission))

    if (cannotAssignExtraPermissions) {
      return res.status(403).json({
        success: false,
        message: 'You cannot assign permissions beyond your authority.',
      })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const employee = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      phone: typeof phone === 'string' ? phone.trim() : '',
      role: ROLES.EMPLOYEE,
      roles: assignedRoles,
      companyId: company._id,
      status: 'Active',
    })

    return res.status(201).json({
      success: true,
      message: 'Employee created successfully.',
      employee: getSafeEmployee(employee),
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      })
    }

    return next(error)
  }
})

// PATCH /erp/employees/:id
router.patch('/employees/:id', authMiddleware, permissionMiddleware('Employee', 'UPDATE'), async (req, res, next) => {
  try {
    if (req.user.role !== ROLES.COMPANY_ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Only CompanyAdmin can update employees.',
      })
    }

    if (!req.user.companyId || !mongoose.isValidObjectId(req.user.companyId)) {
      return res.status(403).json({
        success: false,
        message: 'Company access is required.',
      })
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid employee ID.',
      })
    }

    const { name, email, phone, roles, status } = req.body

    if (name === undefined && email === undefined && phone === undefined && roles === undefined && status === undefined) {
      return res.status(400).json({
        success: false,
        message: 'At least one field is required to update.',
      })
    }

    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Employee name cannot be empty.',
      })
    }

    if (email !== undefined && (typeof email !== 'string' || !email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'A valid email is required.',
      })
    }

    if (phone !== undefined && typeof phone !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Phone must be a string.',
      })
    }

    if (roles !== undefined && !Array.isArray(roles)) {
      return res.status(400).json({
        success: false,
        message: 'Roles must be an array.',
      })
    }

    if (status !== undefined && !['Active', 'Inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be Active or Inactive.',
      })
    }

    const company = await Company.findOne({
      _id: req.user.companyId,
      status: 'Approved',
    })

    if (!company) {
      return res.status(403).json({
        success: false,
        message: 'Approved company not found.',
      })
    }

    const employee = await User.findOne({
      _id: req.params.id,
      companyId: company._id,
      role: ROLES.EMPLOYEE,
    })

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found in your company.',
      })
    }

    if (email !== undefined) {
      const normalizedEmail = email.trim().toLowerCase()

      const existingUser = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: employee._id },
      }).select('_id')

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'An account with this email already exists.',
        })
      }

      employee.email = normalizedEmail
    }

    if (name !== undefined) {
      employee.name = name.trim()
    }

    if (phone !== undefined) {
      employee.phone = phone.trim()
    }

    if (status !== undefined) {
      employee.status = status
    }

    if (roles !== undefined) {
      const validPermissions = new Set(Object.values(ACTIONS).flatMap((sectionActions) => Object.values(sectionActions)))

      const assignedRoles = []
      const assignedPermissions = new Set()
      const seenRoleKeys = new Set()

      for (const requestedRole of roles) {
        if (!requestedRole || !['Predefined', 'Custom'].includes(requestedRole.type)) {
          return res.status(400).json({
            success: false,
            message: 'Each role must have type Predefined or Custom.',
          })
        }

        if (requestedRole.type === 'Predefined') {
          if (!allowedPredefinedRoles.includes(requestedRole.name)) {
            return res.status(403).json({
              success: false,
              message: 'You cannot assign this predefined role.',
            })
          }

          const roleKey = `Predefined:${requestedRole.name}`

          if (seenRoleKeys.has(roleKey)) continue
          seenRoleKeys.add(roleKey)

          assignedRoles.push({
            type: 'Predefined',
            name: requestedRole.name,
            customRoleId: null,
          })

          const predefinedPermissions = ROLE_DEFAULT_PERMISSIONS[requestedRole.name] || {}

          for (const permissionList of Object.values(predefinedPermissions)) {
            if (!Array.isArray(permissionList)) continue

            for (const permission of permissionList) {
              if (validPermissions.has(permission)) {
                assignedPermissions.add(permission)
              }
            }
          }

          continue
        }

        if (!mongoose.isValidObjectId(requestedRole.customRoleId)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid custom role ID.',
          })
        }

        const customRole = company.customRoles.find((role) => String(role._id) === String(requestedRole.customRoleId))

        if (!customRole) {
          return res.status(403).json({
            success: false,
            message: 'Custom role does not belong to your company.',
          })
        }

        const roleKey = `Custom:${customRole._id}`

        if (seenRoleKeys.has(roleKey)) continue
        seenRoleKeys.add(roleKey)

        assignedRoles.push({
          type: 'Custom',
          name: customRole.name,
          customRoleId: customRole._id,
        })

        for (const permission of customRole.permissions || []) {
          if (validPermissions.has(permission)) {
            assignedPermissions.add(permission)
          }
        }
      }

      const currentUserPermissions = new Set()

      const currentAssignedRoles = [
        {
          type: 'Predefined',
          name: req.user.role,
        },
        ...(Array.isArray(req.user.roles) ? req.user.roles : []),
      ]

      for (const assignedRole of currentAssignedRoles) {
        if (assignedRole?.type === 'Custom') {
          const currentCustomRole = company.customRoles.find((role) => String(role._id) === String(assignedRole.customRoleId))

          for (const permission of currentCustomRole?.permissions || []) {
            if (validPermissions.has(permission)) {
              currentUserPermissions.add(permission)
            }
          }

          continue
        }

        if (assignedRole?.type && assignedRole.type !== 'Predefined') {
          continue
        }

        const predefinedPermissions = ROLE_DEFAULT_PERMISSIONS[assignedRole?.name] || {}

        for (const permissionList of Object.values(predefinedPermissions)) {
          if (!Array.isArray(permissionList)) continue

          for (const permission of permissionList) {
            if (validPermissions.has(permission)) {
              currentUserPermissions.add(permission)
            }
          }
        }
      }

      const cannotAssignExtraPermissions = [...assignedPermissions].some((permission) => !currentUserPermissions.has(permission))

      if (cannotAssignExtraPermissions) {
        return res.status(403).json({
          success: false,
          message: 'You cannot assign permissions beyond your authority.',
        })
      }

      employee.roles = assignedRoles
    }

    await employee.save()

    return res.status(200).json({
      success: true,
      message: 'Employee updated successfully.',
      employee: getSafeEmployee(employee),
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      })
    }

    return next(error)
  }
})

// GET /erp/roles
router.get('/roles', authMiddleware, permissionMiddleware('Role', 'LIST'), async (req, res, next) => {
  try {
    if (!req.user.companyId || !mongoose.isValidObjectId(req.user.companyId)) {
      return res.status(403).json({
        success: false,
        message: 'Company access is required.',
      })
    }

    const company = await Company.findOne({
      _id: req.user.companyId,
      status: 'Approved',
    }).lean()

    if (!company) {
      return res.status(403).json({
        success: false,
        message: 'Approved company not found.',
      })
    }

    const predefinedRoles = allowedPredefinedRoles.map((name) => ({
      type: 'Predefined',
      name,
      permissions: ROLE_DEFAULT_PERMISSIONS[name] || {},
    }))

    const customRoles = (company.customRoles || []).map((role) => ({
      _id: role._id,
      type: 'Custom',
      name: role.name,
      description: role.description,
      permissions: role.permissions,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    }))

    return res.status(200).json({
      success: true,
      roles: [...predefinedRoles, ...customRoles],
      availablePermissions: Object.entries(ACTIONS).map(([section, sectionActions]) => ({
        section,
        permissions: Object.values(sectionActions),
      })),
    })
  } catch (error) {
    return next(error)
  }
})

// POST /erp/roles
router.post('/roles', authMiddleware, permissionMiddleware('Role', 'CREATE'), async (req, res, next) => {
  try {
    if (req.user.role !== ROLES.COMPANY_ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Only CompanyAdmin can create custom roles.',
      })
    }

    if (!req.user.companyId || !mongoose.isValidObjectId(req.user.companyId)) {
      return res.status(403).json({
        success: false,
        message: 'Company access is required.',
      })
    }

    const { name, description = '', permissions } = req.body

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Role name is required.',
      })
    }

    if (typeof description !== 'string' || description.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Description must be 500 characters or fewer.',
      })
    }

    if (!Array.isArray(permissions)) {
      return res.status(400).json({
        success: false,
        message: 'Permissions must be an array.',
      })
    }

    const company = await Company.findOne({
      _id: req.user.companyId,
      status: 'Approved',
    })

    if (!company) {
      return res.status(403).json({
        success: false,
        message: 'Approved company not found.',
      })
    }

    const validPermissions = new Set(Object.values(ACTIONS).flatMap((sectionActions) => Object.values(sectionActions)))

    const requestedPermissions = [...new Set(permissions)]

    if (requestedPermissions.some((permission) => typeof permission !== 'string' || !validPermissions.has(permission))) {
      return res.status(400).json({
        success: false,
        message: 'One or more permissions are invalid.',
      })
    }

    const duplicateRole = company.customRoles.some((role) => role.name.toLowerCase() === name.trim().toLowerCase())

    if (duplicateRole) {
      return res.status(409).json({
        success: false,
        message: 'A custom role with this name already exists.',
      })
    }

    // Calculate current user's permissions inline.
    const currentUserPermissions = new Set()

    const currentAssignedRoles = [
      {
        type: 'Predefined',
        name: req.user.role,
      },
      ...(Array.isArray(req.user.roles) ? req.user.roles : []),
    ]

    for (const assignedRole of currentAssignedRoles) {
      if (assignedRole?.type === 'Custom') {
        const customRole = company.customRoles.find((role) => String(role._id) === String(assignedRole.customRoleId))

        for (const permission of customRole?.permissions || []) {
          if (validPermissions.has(permission)) {
            currentUserPermissions.add(permission)
          }
        }

        continue
      }

      if (assignedRole?.type && assignedRole.type !== 'Predefined') {
        continue
      }

      const rolePermissions = ROLE_DEFAULT_PERMISSIONS[assignedRole?.name] || {}

      for (const permissionList of Object.values(rolePermissions)) {
        if (!Array.isArray(permissionList)) continue

        for (const permission of permissionList) {
          if (validPermissions.has(permission)) {
            currentUserPermissions.add(permission)
          }
        }
      }
    }

    const cannotAssignExtraPermissions = requestedPermissions.some((permission) => !currentUserPermissions.has(permission))

    if (cannotAssignExtraPermissions) {
      return res.status(403).json({
        success: false,
        message: 'You cannot assign permissions beyond your authority.',
      })
    }

    company.customRoles.push({
      name: name.trim(),
      description: description.trim(),
      permissions: requestedPermissions,
      isSystem: false,
      createdBy: req.user.userId,
    })

    await company.save()

    const createdRole = company.customRoles[company.customRoles.length - 1]

    return res.status(201).json({
      success: true,
      message: 'Custom role created successfully.',
      role: {
        _id: createdRole._id,
        type: 'Custom',
        name: createdRole.name,
        description: createdRole.description,
        permissions: createdRole.permissions,
        createdAt: createdRole.createdAt,
        updatedAt: createdRole.updatedAt,
      },
    })
  } catch (error) {
    return next(error)
  }
})

module.exports = router
