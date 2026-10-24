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

const validPermissions = new Set(Object.values(ACTIONS).flatMap((sectionActions) => Object.values(sectionActions)))


// router.post('/postmancreate', async (req, res, next) => {
//   try {
//     if (!Array.isArray(req.body)) {
//       return res.status(400).json({
//         success: false,
//         message: 'Request body must be an array.',
//       })
//     }

//     const employees = await Promise.all(
//       req.body.map(async (employee) => ({
//         ...employee,
//         password: await bcrypt.hash(employee.password, 12),
//       }))
//     )

//     const users = await User.insertMany(employees)

//     return res.status(201).json({
//       success: true,
//       message: `${users.length} employees created successfully.`,
//       count: users.length,
//       users: users.map(({ _id, name, email, role }) => ({
//         _id,
//         name,
//         email,
//         role,
//       })),
//     })
//   } catch (error) {
//     next(error)
//   }
// })

// GET /erp/employees
// Server-side search, filters, pagination, stats and available roles



router.get('/', authMiddleware, permissionMiddleware('Employee', 'LIST'), async (req, res, next) => {
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

    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 5))

    const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''

    const status = typeof req.query.status === 'string' ? req.query.status : 'All'

    const role = typeof req.query.role === 'string' ? req.query.role : 'All'

    const baseQuery = {
      companyId: company._id,
      role: { $ne: ROLES.SUPER_ADMIN },
    }

    // Status filter
    if (status !== 'All') {
      if (!['Active', 'Inactive'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status filter.',
        })
      }
    }

    // Role filter
    if (role !== 'All') {
      if (role.startsWith('Custom:')) {
        const customRoleId = role.slice(7)

        if (!mongoose.isValidObjectId(customRoleId)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid custom role ID.',
          })
        }

        const customRoleExists = (company.customRoles || []).some((item) => String(item._id) === customRoleId)

        if (!customRoleExists) {
          return res.status(400).json({
            success: false,
            message: 'Custom role not found.',
          })
        }
      } else if (!allowedPredefinedRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role filter.',
        })
      }
    }

    // Search safely using an escaped regular expression
    const escapedSearch = search ? search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : ''

    const searchRegex = escapedSearch ? new RegExp(escapedSearch, 'i') : null

    // Build filtered query
    const filteredQuery = { ...baseQuery }

    if (status !== 'All') {
      filteredQuery.status = status
    }

    if (role.startsWith('Custom:')) {
      filteredQuery['roles.customRoleId'] = new mongoose.Types.ObjectId(role.slice(7))

      filteredQuery['roles.type'] = 'Custom'
    } else if (role !== 'All') {
      filteredQuery['roles.name'] = role
      filteredQuery['roles.type'] = 'Predefined'
    }

    if (searchRegex) {
      filteredQuery.$or = [{ name: searchRegex }, { email: searchRegex }, { phone: searchRegex }, { 'roles.name': searchRegex }]
    }

    // Stats are independent of search, status and role filters
    const [totalEmployees, activeEmployees, inactiveEmployees] = await Promise.all([
      User.countDocuments(baseQuery),
      User.countDocuments({
        ...baseQuery,
        status: 'Active',
      }),
      User.countDocuments({
        ...baseQuery,
        status: 'Inactive',
      }),
    ])

    // Count employees after applying filters
    const totalFilteredEmployees = await User.countDocuments(filteredQuery)

    const totalPages = Math.max(1, Math.ceil(totalFilteredEmployees / limit))

    // Keep the page valid after filtering or deleting an employee
    const safePage = Math.min(page, totalPages)

    const employees = await User.find(filteredQuery)
      .select('name email phone role roles permissionOverrides companyId status createdAt updatedAt')
      .sort({ createdAt: -1, _id: -1 })
      .skip((safePage - 1) * limit)
      .limit(limit)
      .lean()

    // Return all roles available for filtering, including unused roles
    const availableRoles = [
      ...allowedPredefinedRoles.map((name) => ({
        type: 'Predefined',
        name,
        value: name,
      })),
      ...(company.customRoles || []).map((item) => ({
        type: 'Custom',
        name: item.name,
        customRoleId: String(item._id),
        value: `Custom:${item._id}`,
      })),
    ]

    return res.status(200).json({
      success: true,

      employees: employees.map((employee) => ({
        _id: employee._id,
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
        role: employee.role,
        roles: Array.isArray(employee.roles) ? employee.roles : [],
        permissionOverrides: Array.isArray(employee.permissionOverrides) ? employee.permissionOverrides : null,
        companyId: employee.companyId,
        status: employee.status,
        createdAt: employee.createdAt,
        updatedAt: employee.updatedAt,
      })),

      pagination: {
        page: safePage,
        limit,
        totalEmployees: totalFilteredEmployees,
        totalPages,
        hasNextPage: safePage < totalPages,
        hasPrevPage: safePage > 1,
      },

      stats: {
        totalEmployees,
        activeEmployees,
        inactiveEmployees,
      },

      availableRoles,
    })
  } catch (error) {
    return next(error)
  }
})

// GET /erp/employees/:id
router.get('/:id', authMiddleware, permissionMiddleware('Employee', 'VIEW'), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid employee ID.',
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

    if (!company) {
      return res.status(403).json({
        success: false,
        message: 'Approved company not found.',
      })
    }

    const employee = await User.findOne({
      _id: req.params.id,
      companyId: company._id,
      role: { $ne: ROLES.SUPER_ADMIN },
    })
      .select('name email phone role roles permissionOverrides companyId status createdAt updatedAt')
      .lean()

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found in your company.',
      })
    }

    return res.status(200).json({
      success: true,
      employee: {
        _id: employee._id,
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
        role: employee.role,
        roles: Array.isArray(employee.roles) ? employee.roles : [],
        permissionOverrides: Array.isArray(employee.permissionOverrides) ? employee.permissionOverrides : null,
        companyId: employee.companyId,
        status: employee.status,
        createdAt: employee.createdAt,
        updatedAt: employee.updatedAt,
        permissions: getEffectivePermissions(employee, company) || {},
      },
    })
  } catch (error) {
    return next(error)
  }
})

// POST /erp/employees
router.post('/', authMiddleware, permissionMiddleware('Employee', 'CREATE'), async (req, res, next) => {
  try {
    if (req.user.role !== ROLES.COMPANY_ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Only CompanyAdmin can create employees.',
      })
    }

    const { name, email, password, phone, roles = [], permissionOverrides } = req.body

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

    if (permissionOverrides !== undefined && (!Array.isArray(permissionOverrides) || permissionOverrides.some((permission) => typeof permission !== 'string'))) {
      return res.status(400).json({
        success: false,
        message: 'Permission overrides must be an array of permission keys.',
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

        const savedRole = (company.predefinedRolePermissions || []).find((item) => item.name === requestedRole.name)

        const rolePermissions = savedRole ? savedRole.permissions || [] : Object.values(ROLE_DEFAULT_PERMISSIONS[requestedRole.name] || {}).flatMap((permissions) => (Array.isArray(permissions) ? permissions : []))

        for (const permission of rolePermissions) {
          if (validPermissions.has(permission)) {
            assignedPermissions.add(permission)
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

      const customRole = (company.customRoles || []).find((item) => String(item._id) === String(requestedRole.customRoleId))

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

    const currentUserPermissions = new Set(Object.values(getEffectivePermissions(req.user, company) || {}).flat())

    if ([...assignedPermissions].some((permission) => !currentUserPermissions.has(permission))) {
      return res.status(403).json({
        success: false,
        message: 'You cannot assign permissions beyond your authority.',
      })
    }

    let normalizedOverrides

    if (permissionOverrides !== undefined) {
      normalizedOverrides = [...new Set(permissionOverrides)]

      if (normalizedOverrides.some((permission) => !validPermissions.has(permission))) {
        return res.status(400).json({
          success: false,
          message: 'One or more permission keys are invalid.',
        })
      }

      if (normalizedOverrides.some((permission) => !currentUserPermissions.has(permission))) {
        return res.status(403).json({
          success: false,
          message: 'You cannot assign permissions beyond your authority.',
        })
      }
    }

    const employee = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: await bcrypt.hash(password, 12),
      phone: typeof phone === 'string' ? phone.trim() : '',
      role: ROLES.EMPLOYEE,
      roles: assignedRoles,
      companyId: company._id,
      status: 'Active',
      ...(normalizedOverrides !== undefined && {
        permissionOverrides: normalizedOverrides,
      }),
    })

    return res.status(201).json({
      success: true,
      message: 'Employee created successfully.',
      employee: {
        _id: employee._id,
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
        role: employee.role,
        roles: employee.roles,
        companyId: employee.companyId,
        status: employee.status,
        createdAt: employee.createdAt,
        updatedAt: employee.updatedAt,
      },
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
router.patch('/:id', authMiddleware, permissionMiddleware('Employee', 'UPDATE'), async (req, res, next) => {
  try {
    if (req.user.role !== ROLES.COMPANY_ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Only CompanyAdmin can update employees.',
      })
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid employee ID.',
      })
    }

    const { name, email, phone, roles, status, permissionOverrides } = req.body

    if (name === undefined && email === undefined && phone === undefined && roles === undefined && status === undefined && permissionOverrides === undefined) {
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

    if (email !== undefined && (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))) {
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

    if (permissionOverrides !== undefined && (!Array.isArray(permissionOverrides) || permissionOverrides.some((permission) => typeof permission !== 'string'))) {
      return res.status(400).json({
        success: false,
        message: 'Permission overrides must be an array of permission keys.',
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

    if (name !== undefined) employee.name = name.trim()
    if (phone !== undefined) employee.phone = phone.trim()
    if (status !== undefined) employee.status = status

    const currentUserPermissions = new Set(Object.values(getEffectivePermissions(req.user, company) || {}).flat())

    if (roles !== undefined) {
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

          const savedRole = (company.predefinedRolePermissions || []).find((item) => item.name === requestedRole.name)

          const rolePermissions = savedRole ? savedRole.permissions || [] : Object.values(ROLE_DEFAULT_PERMISSIONS[requestedRole.name] || {}).flatMap((permissions) => (Array.isArray(permissions) ? permissions : []))

          for (const permission of rolePermissions) {
            if (validPermissions.has(permission)) {
              assignedPermissions.add(permission)
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

        const customRole = (company.customRoles || []).find((item) => String(item._id) === String(requestedRole.customRoleId))

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

      if ([...assignedPermissions].some((permission) => !currentUserPermissions.has(permission))) {
        return res.status(403).json({
          success: false,
          message: 'You cannot assign permissions beyond your authority.',
        })
      }

      employee.roles = assignedRoles
    }

    if (permissionOverrides !== undefined) {
      const normalizedOverrides = [...new Set(permissionOverrides)]

      if (normalizedOverrides.some((permission) => !validPermissions.has(permission))) {
        return res.status(400).json({
          success: false,
          message: 'One or more permission keys are invalid.',
        })
      }

      if (normalizedOverrides.some((permission) => !currentUserPermissions.has(permission))) {
        return res.status(403).json({
          success: false,
          message: 'You cannot assign permissions beyond your authority.',
        })
      }

      employee.permissionOverrides = normalizedOverrides
    }

    await employee.save()

    return res.status(200).json({
      success: true,
      message: 'Employee updated successfully.',
      employee: {
        _id: employee._id,
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
        role: employee.role,
        roles: employee.roles,
        permissionOverrides: employee.permissionOverrides,
        companyId: employee.companyId,
        status: employee.status,
        createdAt: employee.createdAt,
        updatedAt: employee.updatedAt,
      },
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

// DELETE /erp/employees/:id
router.delete('/:id', authMiddleware, permissionMiddleware('Employee', 'DELETE'), async (req, res, next) => {
  try {
    if (req.user.role !== ROLES.COMPANY_ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Only CompanyAdmin can delete employees.',
      })
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid employee ID.',
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

    if (!company) {
      return res.status(403).json({
        success: false,
        message: 'Approved company not found.',
      })
    }

    const employee = await User.findOneAndDelete({
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

    return res.status(200).json({
      success: true,
      message: 'Employee deleted successfully.',
      employeeId: employee._id,
    })
  } catch (error) {
    return next(error)
  }
})

module.exports = router
