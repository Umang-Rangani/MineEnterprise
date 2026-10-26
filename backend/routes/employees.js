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

const normalizeEmployeePermissions = (permissions = []) => {
  const normalized = new Set(permissions)

  const requiresEmployeeUpdate = [ACTIONS.Employee.ASSIGN_ROLE, ACTIONS.Employee.MANAGE_PERMISSIONS]

  if (requiresEmployeeUpdate.some((permission) => normalized.has(permission))) {
    normalized.add(ACTIONS.Employee.UPDATE)
  }

  return [...normalized]
}

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

    // Employee પોતાનો row જોઈ શકશે નહીં.
    // CompanyAdmin પોતાનો row જોઈ શકશે.
    if (req.user.role === ROLES.EMPLOYEE) {
      baseQuery._id = { $ne: req.user._id }
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

/**
 * GET /erp/employees/export
 * Export company employees as CSV
 */
router.get('/export', authMiddleware, permissionMiddleware('Employee', 'EXPORT'), async (req, res, next) => {
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
    })
      .select('_id')
      .lean()

    if (!company) {
      return res.status(403).json({
        success: false,
        message: 'Approved company not found.',
      })
    }

    const filter = {
      companyId: company._id,
      role: { $ne: ROLES.SUPER_ADMIN },
    }

    // Search filter
    if (typeof req.query.search === 'string' && req.query.search.trim()) {
      const search = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

      const searchRegex = new RegExp(search, 'i')

      filter.$or = [{ name: searchRegex }, { email: searchRegex }, { phone: searchRegex }, { 'roles.name': searchRegex }]
    }

    // Status filter
    if (req.query.status && req.query.status !== 'All') {
      if (!['Active', 'Inactive'].includes(req.query.status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status filter.',
        })
      }

      filter.status = req.query.status
    }

    // Role filter
    if (req.query.role && req.query.role !== 'All') {
      if (req.query.role.startsWith('Custom:')) {
        const customRoleId = req.query.role.slice(7)

        if (!mongoose.isValidObjectId(customRoleId)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid custom role ID.',
          })
        }

        const customRoleExists = (await Company.findById(company._id).select('customRoles').lean())?.customRoles?.some((item) => String(item._id) === customRoleId)

        if (!customRoleExists) {
          return res.status(400).json({
            success: false,
            message: 'Custom role not found.',
          })
        }

        filter['roles.customRoleId'] = new mongoose.Types.ObjectId(customRoleId)
        filter['roles.type'] = 'Custom'
      } else {
        if (!allowedPredefinedRoles.includes(req.query.role)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid role filter.',
          })
        }

        filter['roles.name'] = req.query.role
        filter['roles.type'] = 'Predefined'
      }
    }

    const employees = await User.find(filter).select('name email phone roles status createdAt').sort({ createdAt: -1, _id: -1 }).lean()

    const escapeCsv = (value) => {
      let text = String(value ?? '')

      // Reduce spreadsheet formula-injection risk.
      if (/^[\s]*[=+\-@]/.test(text)) {
        text = `'${text}`
      }

      return `"${text.replace(/"/g, '""')}"`
    }

    const headers = ['Employee Name', 'Email', 'Phone', 'Roles', 'Status', 'Created At']

    const rows = employees.map((employee) => {
      const roles = (employee.roles || [])
        .map((role) => role.name)
        .filter(Boolean)
        .join(', ')

      return [employee.name, employee.email, employee.phone, roles, employee.status, employee.createdAt ? new Date(employee.createdAt).toISOString().slice(0, 10) : '']
    })

    const csv = [headers.map(escapeCsv).join(','), ...rows.map((row) => row.map(escapeCsv).join(','))].join('\r\n')

    const filename = `employees-${new Date().toISOString().slice(0, 10)}.csv`

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Cache-Control', 'no-store')

    return res.status(200).send('\uFEFF' + csv)
  } catch (error) {
    return next(error)
  }
})

// GET /erp/employees/:id
router.get('/:id', authMiddleware, permissionMiddleware('Employee', 'VIEW'), async (req, res, next) => {
  try {
    const { id } = req.params

    if (!mongoose.isValidObjectId(id)) {
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
      _id: id,
      companyId: company._id,
      role: ROLES.EMPLOYEE,
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

router.post('/', authMiddleware, permissionMiddleware('Employee', 'CREATE'), async (req, res, next) => {
  try {
    // 1. Only CompanyAdmin can create employees
    if (req.user.role !== ROLES.COMPANY_ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Only CompanyAdmin can create employees.',
      })
    }

    // 2. Read request body
    const { name, email, password, phone, roles = [], permissionOverrides = [] } = req.body

    // 3. Validate required fields
    if (typeof name !== 'string' || !name.trim() || typeof email !== 'string' || !email.trim() || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Name, email and a password of at least 8 characters are required.',
      })
    }

    // 4. Validate roles
    if (!Array.isArray(roles)) {
      return res.status(400).json({
        success: false,
        message: 'Roles must be an array.',
      })
    }

    // 5. Validate permission overrides
    if (!Array.isArray(permissionOverrides) || permissionOverrides.some((permission) => typeof permission !== 'string')) {
      return res.status(400).json({
        success: false,
        message: 'Permission overrides must be an array of permission keys.',
      })
    }

    // 6. Validate company ID
    if (!req.user.companyId || !mongoose.isValidObjectId(req.user.companyId)) {
      return res.status(403).json({
        success: false,
        message: 'Company access is required.',
      })
    }

    // 7. Find approved company
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

    // 8. Normalize email
    const normalizedEmail = email.trim().toLowerCase()

    // 9. Check duplicate email
    const existingUser = await User.findOne({
      email: normalizedEmail,
    }).select('_id')

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      })
    }

    // 10. Prepare assigned roles and permissions
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

      // 11. Predefined role
      if (requestedRole.type === 'Predefined') {
        if (!allowedPredefinedRoles.includes(requestedRole.name)) {
          return res.status(403).json({
            success: false,
            message: 'You cannot assign this predefined role.',
          })
        }

        const roleKey = `Predefined:${requestedRole.name}`

        if (seenRoleKeys.has(roleKey)) {
          continue
        }

        seenRoleKeys.add(roleKey)

        const savedRole = (company.predefinedRolePermissions || []).find((item) => item.name === requestedRole.name)

        if (savedRole?.isActive === false) {
          return res.status(400).json({
            success: false,
            message: `The ${requestedRole.name} role is inactive.`,
          })
        }

        const rolePermissions = savedRole && Array.isArray(savedRole.permissions) ? savedRole.permissions : Object.values(ROLE_DEFAULT_PERMISSIONS[requestedRole.name] || {}).flatMap((permissions) => (Array.isArray(permissions) ? permissions : []))

        assignedRoles.push({
          type: 'Predefined',
          name: requestedRole.name,
          customRoleId: null,
        })

        for (const permission of rolePermissions) {
          if (validPermissions.has(permission)) {
            assignedPermissions.add(permission)
          }
        }

        continue
      }

      // 12. Custom role ID validation
      if (!mongoose.isValidObjectId(requestedRole.customRoleId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid custom role ID.',
        })
      }

      // 13. Ensure custom role belongs to this company
      const customRole = (company.customRoles || []).find((item) => String(item._id) === String(requestedRole.customRoleId))

      if (!customRole) {
        return res.status(403).json({
          success: false,
          message: 'Custom role does not belong to your company.',
        })
      }

      if (customRole.isActive === false) {
        return res.status(400).json({
          success: false,
          message: 'This custom role is inactive.',
        })
      }

      const roleKey = `Custom:${customRole._id}`

      if (seenRoleKeys.has(roleKey)) {
        continue
      }

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

    // 14. Get CompanyAdmin's effective permissions
    const effectivePermissions = getEffectivePermissions(req.user, company) || {}

    const currentUserPermissions = new Set(Object.values(effectivePermissions).flatMap((permissions) => (Array.isArray(permissions) ? permissions : [])))

    // 15. Ensure assigned roles do not exceed admin authority
    if ([...assignedPermissions].some((permission) => !currentUserPermissions.has(permission))) {
      return res.status(403).json({
        success: false,
        message: 'You cannot assign permissions beyond your authority.',
      })
    }

    // 16. Validate individual permission overrides
    const normalizedOverrides = normalizeEmployeePermissions([...new Set(permissionOverrides)])

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

    // 17. Create employee
    const employee = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: await bcrypt.hash(password, 12),
      phone: typeof phone === 'string' ? phone.trim() : '',
      role: ROLES.EMPLOYEE,
      roles: assignedRoles,
      permissionOverrides: normalizedOverrides,
      companyId: company._id,
      status: 'Active',
    })

    // 18. Success response
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
        permissionOverrides: employee.permissionOverrides,
        companyId: employee.companyId,
        status: employee.status,
        createdAt: employee.createdAt,
        updatedAt: employee.updatedAt,
      },
    })
  } catch (error) {
    // 19. Duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      })
    }

    return next(error)
  }
})

/**
 * PATCH /erp/employees/:id
 * CompanyAdmin or authorized Employee can update another employee.
 * Employees cannot edit their own record.
 */
router.patch('/:id', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params
    const { name, email, phone, roles, status, permissionOverrides } = req.body

    const isCompanyAdmin = req.user.role === ROLES.COMPANY_ADMIN

    // 1. Validate employee ID
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid employee ID.',
      })
    }

    // 2. Require at least one update field
    if (name === undefined && email === undefined && phone === undefined && roles === undefined && status === undefined && permissionOverrides === undefined) {
      return res.status(400).json({
        success: false,
        message: 'At least one field is required to update.',
      })
    }

    // 3. Validate input
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

    // 4. Validate company access
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

    // 5. Only target employees belonging to the same company
    const employee = await User.findOne({
      _id: id,
      companyId: company._id,
      role: ROLES.EMPLOYEE,
    })

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found in your company.',
      })
    }

    // 6. Employees cannot edit their own record
    if (!isCompanyAdmin && String(employee._id) === String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You cannot edit your own employee record.',
      })
    }

    // 7. Resolve current user's effective permissions
    const effectivePermissions = getEffectivePermissions(req.user, company) || {}

    const currentUserPermissions = new Set(Object.values(effectivePermissions).flatMap((items) => (Array.isArray(items) ? items : [])))

    // 8. Check permissions for each requested operation
    if ((name !== undefined || email !== undefined || phone !== undefined) && !currentUserPermissions.has(ACTIONS.Employee.UPDATE)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update employee details.',
      })
    }

    if (status !== undefined && !currentUserPermissions.has(ACTIONS.Employee.UPDATE_STATUS)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to change employee status.',
      })
    }

    if (roles !== undefined && !currentUserPermissions.has(ACTIONS.Employee.ASSIGN_ROLE)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to assign employee roles.',
      })
    }

    if (permissionOverrides !== undefined && !currentUserPermissions.has(ACTIONS.Employee.MANAGE_PERMISSIONS)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to manage employee permissions.',
      })
    }

    // 9. Check email uniqueness
    let normalizedEmail

    if (email !== undefined) {
      normalizedEmail = email.trim().toLowerCase()

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
    }

    // 10. Validate and prepare role assignments before saving
    let assignedRoles

    if (roles !== undefined) {
      assignedRoles = []
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

          const savedRole = (company.predefinedRolePermissions || []).find((item) => item.name === requestedRole.name)

          if (savedRole?.isActive === false) {
            return res.status(400).json({
              success: false,
              message: `The ${requestedRole.name} role is inactive.`,
            })
          }

          const rolePermissions = savedRole && Array.isArray(savedRole.permissions) ? savedRole.permissions : Object.values(ROLE_DEFAULT_PERMISSIONS[requestedRole.name] || {}).flatMap((items) => (Array.isArray(items) ? items : []))

          assignedRoles.push({
            type: 'Predefined',
            name: requestedRole.name,
            customRoleId: null,
          })

          for (const permission of rolePermissions) {
            if (validPermissions.has(permission)) {
              assignedPermissions.add(permission)
            }
          }

          continue
        }

        // Custom role validation
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

        if (customRole.isActive === false) {
          return res.status(400).json({
            success: false,
            message: 'This custom role is inactive.',
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

      // The actor cannot assign a role granting permissions
      // beyond their own authority.
      const unauthorizedRolePermissions = [...assignedPermissions].filter((permission) => !currentUserPermissions.has(permission))

      if (unauthorizedRolePermissions.length > 0) {
        return res.status(403).json({
          success: false,
          message: 'You cannot assign permissions beyond your authority.',
          unauthorizedPermissions: unauthorizedRolePermissions,
        })
      }
    }

    // 11. Validate and normalize explicit permission overrides
    let normalizedOverrides

    if (permissionOverrides !== undefined) {
      normalizedOverrides = normalizeEmployeePermissions([...new Set(permissionOverrides)])

      const invalidPermissions = normalizedOverrides.filter((permission) => !validPermissions.has(permission))

      if (invalidPermissions.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'One or more permission keys are invalid.',
          invalidPermissions,
        })
      }

      const unauthorizedOverrides = normalizedOverrides.filter((permission) => !currentUserPermissions.has(permission))

      if (unauthorizedOverrides.length > 0) {
        return res.status(403).json({
          success: false,
          message: 'You cannot assign permissions beyond your authority.',
          unauthorizedPermissions: unauthorizedOverrides,
        })
      }
    }

    // 12. Apply changes only after validation succeeds
    if (name !== undefined) employee.name = name.trim()
    if (email !== undefined) employee.email = normalizedEmail
    if (phone !== undefined) employee.phone = phone.trim()
    if (status !== undefined) employee.status = status

    if (assignedRoles !== undefined) {
      employee.roles = assignedRoles
    }

    if (normalizedOverrides !== undefined) {
      employee.permissionOverrides = normalizedOverrides
    }

    await employee.save()

    // 13. Return updated employee
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
