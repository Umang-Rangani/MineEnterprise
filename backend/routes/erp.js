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

const getPredefinedRolePermissions = (company, roleName) => {
  const savedRole = (company.predefinedRolePermissions || []).find((role) => role.name === roleName)

  if (savedRole) {
    return [...new Set((savedRole.permissions || []).filter((permission) => validPermissions.has(permission)))]
  }

  const defaults = ROLE_DEFAULT_PERMISSIONS[roleName] || {}

  return [...new Set(Object.values(defaults).flatMap((permissions) => (Array.isArray(permissions) ? permissions.filter((permission) => validPermissions.has(permission)) : [])))]
}

const getRolePermissionList = (roleName, company) => {
  return getPredefinedRolePermissions(company, roleName)
}

const getSafeEmployee = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  roles: Array.isArray(user.roles) ? user.roles : [],
  permissionOverrides: Array.isArray(user.permissionOverrides) ? user.permissionOverrides : null,
  companyId: user.companyId,
  status: user.status,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
})

// Collect the effective permissions the current user may grant.
// Custom permissions are resolved only from this user's company.
const getAssignablePermissions = (user, company) => {
  const permissions = new Set()

  const assignedRoles = [
    {
      type: 'Predefined',
      name: user.role,
    },
    ...(Array.isArray(user.roles) ? user.roles : []),
  ]

  for (const assignedRole of assignedRoles) {
    if (assignedRole?.type === 'Custom') {
      const customRole = (company.customRoles || []).find((role) => String(role._id) === String(assignedRole.customRoleId))

      for (const permission of customRole?.permissions || []) {
        if (validPermissions.has(permission)) {
          permissions.add(permission)
        }
      }

      continue
    }

    if (assignedRole?.type && assignedRole.type !== 'Predefined') {
      continue
    }

    for (const permission of getRolePermissionList(assignedRole?.name, company)) {
      if (validPermissions.has(permission)) {
        permissions.add(permission)
      }
    }
  }

  // Explicit employee permission overrides replace the role-derived permissions.
  if (Array.isArray(user.permissionOverrides)) {
    const overriddenPermissions = new Set(user.permissionOverrides.filter((permission) => validPermissions.has(permission)))

    return overriddenPermissions
  }

  return permissions
}

const getCompanyForUser = async (user) => {
  if (!user.companyId || !mongoose.isValidObjectId(user.companyId)) {
    return null
  }

  return Company.findOne({
    _id: user.companyId,
    status: 'Approved',
  })
}

const normalizeAssignedRoles = (roles, company) => {
  if (!Array.isArray(roles)) {
    return {
      error: {
        status: 400,
        message: 'Roles must be an array.',
      },
    }
  }

  const assignedRoles = []
  const assignedPermissions = new Set()
  const seenRoleKeys = new Set()

  for (const requestedRole of roles) {
    if (!requestedRole || !['Predefined', 'Custom'].includes(requestedRole.type)) {
      return {
        error: {
          status: 400,
          message: 'Each role must have type Predefined or Custom.',
        },
      }
    }

    if (requestedRole.type === 'Predefined') {
      if (!allowedPredefinedRoles.includes(requestedRole.name)) {
        return {
          error: {
            status: 403,
            message: 'You cannot assign this predefined role.',
          },
        }
      }

      const roleKey = `Predefined:${requestedRole.name}`

      if (seenRoleKeys.has(roleKey)) continue
      seenRoleKeys.add(roleKey)

      assignedRoles.push({
        type: 'Predefined',
        name: requestedRole.name,
        customRoleId: null,
      })

      for (const permission of getRolePermissionList(requestedRole.name, company)) {
        if (validPermissions.has(permission)) {
          assignedPermissions.add(permission)
        }
      }

      continue
    }

    if (!mongoose.isValidObjectId(requestedRole.customRoleId)) {
      return {
        error: {
          status: 400,
          message: 'Invalid custom role ID.',
        },
      }
    }

    const customRole = (company.customRoles || []).find((role) => String(role._id) === String(requestedRole.customRoleId))

    if (!customRole) {
      return {
        error: {
          status: 403,
          message: 'Custom role does not belong to your company.',
        },
      }
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

  return {
    assignedRoles,
    assignedPermissions,
  }
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

    const company = await getCompanyForUser(req.user)

    if (!company) {
      return res.status(403).json({
        success: false,
        message: 'Approved company not found or company access is required.',
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
    const company = await getCompanyForUser(req.user)

    if (!company) {
      return res.status(403).json({
        success: false,
        message: 'Approved company not found or company access is required.',
      })
    }

    const employees = await User.find({
      companyId: company._id,
      role: { $ne: ROLES.SUPER_ADMIN },
    })
      .select('name email phone role roles permissionOverrides companyId status createdAt updatedAt')
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

    const company = await getCompanyForUser(req.user)

    if (!company) {
      return res.status(403).json({
        success: false,
        message: 'Approved company not found or company access is required.',
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

    const permissions = getEffectivePermissions(employee, company)

    return res.status(200).json({
      success: true,
      employee: {
        ...getSafeEmployee(employee),
        permissions: permissions || {},
      },
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

    const company = await getCompanyForUser(req.user)

    if (!company) {
      return res.status(403).json({
        success: false,
        message: 'Approved company not found or company access is required.',
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

    const roleResult = normalizeAssignedRoles(roles, company)

    if (roleResult.error) {
      return res.status(roleResult.error.status).json({
        success: false,
        message: roleResult.error.message,
      })
    }

    const { assignedRoles, assignedPermissions } = roleResult
    const currentUserPermissions = getAssignablePermissions(req.user, company)

    const cannotAssignExtraPermissions = [...assignedPermissions].some((permission) => !currentUserPermissions.has(permission))

    if (cannotAssignExtraPermissions) {
      return res.status(403).json({
        success: false,
        message: 'You cannot assign permissions beyond your authority.',
      })
    }

    let normalizedOverrides

    if (permissionOverrides !== undefined) {
      normalizedOverrides = [...new Set(permissionOverrides)]

      const hasInvalidPermission = normalizedOverrides.some((permission) => !validPermissions.has(permission))

      if (hasInvalidPermission) {
        return res.status(400).json({
          success: false,
          message: 'One or more permission keys are invalid.',
        })
      }

      const hasUnauthorizedPermission = normalizedOverrides.some((permission) => !currentUserPermissions.has(permission))

      if (hasUnauthorizedPermission) {
        return res.status(403).json({
          success: false,
          message: 'You cannot assign permissions beyond your authority.',
        })
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const employeeData = {
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      phone: typeof phone === 'string' ? phone.trim() : '',
      role: ROLES.EMPLOYEE,
      roles: assignedRoles,
      companyId: company._id,
      status: 'Active',
    }

    if (normalizedOverrides !== undefined) {
      employeeData.permissionOverrides = normalizedOverrides
    }

    const employee = await User.create(employeeData)

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

    const company = await getCompanyForUser(req.user)

    if (!company) {
      return res.status(403).json({
        success: false,
        message: 'Approved company not found or company access is required.',
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

    const currentUserPermissions = getAssignablePermissions(req.user, company)

    if (roles !== undefined) {
      const roleResult = normalizeAssignedRoles(roles, company)

      if (roleResult.error) {
        return res.status(roleResult.error.status).json({
          success: false,
          message: roleResult.error.message,
        })
      }

      const cannotAssignExtraPermissions = [...roleResult.assignedPermissions].some((permission) => !currentUserPermissions.has(permission))

      if (cannotAssignExtraPermissions) {
        return res.status(403).json({
          success: false,
          message: 'You cannot assign permissions beyond your authority.',
        })
      }

      employee.roles = roleResult.assignedRoles
    }

    if (permissionOverrides !== undefined) {
      const normalizedOverrides = [...new Set(permissionOverrides)]

      const hasInvalidPermission = normalizedOverrides.some((permission) => !validPermissions.has(permission))

      if (hasInvalidPermission) {
        return res.status(400).json({
          success: false,
          message: 'One or more permission keys are invalid.',
        })
      }

      const cannotAssignExtraPermissions = normalizedOverrides.some((permission) => !currentUserPermissions.has(permission))

      if (cannotAssignExtraPermissions) {
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
    const company = await getCompanyForUser(req.user)

    if (!company) {
      return res.status(403).json({
        success: false,
        message: 'Approved company not found or company access is required.',
      })
    }

    const predefinedRoles = allowedPredefinedRoles.map((name) => ({
      type: 'Predefined',
      name,
      permissions: getRolePermissionList(name, company),
    }))

    const customRoles = (company.customRoles || []).map((role) => ({
      _id: role._id,
      type: 'Custom',
      name: role.name,
      description: role.description,
      permissions: role.permissions || [],
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

// POST /erp/roles — create custom role
router.post('/roles', authMiddleware, permissionMiddleware('Role', 'CREATE'), async (req, res, next) => {
  try {
    if (req.user.role !== ROLES.COMPANY_ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Only CompanyAdmin can create custom roles.',
      })
    }

    const { name, description = '', permissions } = req.body

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Role name is required.',
      })
    }

    if (name.trim().length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Role name cannot exceed 100 characters.',
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

    const company = await getCompanyForUser(req.user)

    if (!company) {
      return res.status(403).json({
        success: false,
        message: 'Approved company not found or company access is required.',
      })
    }

    const requestedPermissions = [...new Set(permissions)]

    if (requestedPermissions.some((permission) => typeof permission !== 'string' || !validPermissions.has(permission))) {
      return res.status(400).json({
        success: false,
        message: 'One or more permissions are invalid.',
      })
    }

    const duplicateRole = (company.customRoles || []).some((role) => role.name.toLowerCase() === name.trim().toLowerCase())

    if (duplicateRole) {
      return res.status(409).json({
        success: false,
        message: 'A custom role with this name already exists.',
      })
    }

    const currentUserPermissions = getAssignablePermissions(req.user, company)

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

// PATCH /erp/roles/predefined/:name — save company-specific predefined permissions
router.patch('/roles/predefined/:name', authMiddleware, permissionMiddleware('Role', 'UPDATE'), async (req, res, next) => {
  try {
    if (req.user.role !== ROLES.COMPANY_ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Only CompanyAdmin can edit predefined roles.',
      })
    }

    const roleName = req.params.name

    if (!allowedPredefinedRoles.includes(roleName)) {
      return res.status(404).json({
        success: false,
        message: 'Predefined role not found or cannot be edited.',
      })
    }

    const { permissions } = req.body

    if (!Array.isArray(permissions)) {
      return res.status(400).json({
        success: false,
        message: 'Permissions must be an array.',
      })
    }

    const company = await getCompanyForUser(req.user)

    if (!company) {
      return res.status(403).json({
        success: false,
        message: 'Approved company not found or company access is required.',
      })
    }

    const normalizedPermissions = [...new Set(permissions)]

    if (normalizedPermissions.some((permission) => typeof permission !== 'string' || !validPermissions.has(permission))) {
      return res.status(400).json({
        success: false,
        message: 'One or more permissions are invalid.',
      })
    }

    const authority = getAssignablePermissions(req.user, company)

    if (normalizedPermissions.some((permission) => !authority.has(permission))) {
      return res.status(403).json({
        success: false,
        message: 'You cannot assign permissions you do not have.',
      })
    }

    if (!Array.isArray(company.predefinedRolePermissions)) {
      company.predefinedRolePermissions = []
    }

    let savedRole = company.predefinedRolePermissions.find((role) => role.name === roleName)

    if (savedRole) {
      savedRole.permissions = normalizedPermissions
      savedRole.updatedBy = req.user.userId
      savedRole.updatedAt = new Date()
    } else {
      company.predefinedRolePermissions.push({
        name: roleName,
        permissions: normalizedPermissions,
        updatedBy: req.user.userId,
        updatedAt: new Date(),
      })

      savedRole = company.predefinedRolePermissions.find((role) => role.name === roleName)
    }

    await company.save()

    return res.status(200).json({
      success: true,
      message: 'Predefined role permissions updated successfully.',
      role: {
        type: 'Predefined',
        name: roleName,
        permissions: savedRole.permissions,
        updatedAt: savedRole.updatedAt,
      },
    })
  } catch (error) {
    return next(error)
  }
})

// PATCH /erp/roles/:id — edit custom role
router.patch('/roles/:id', authMiddleware, permissionMiddleware('Role', 'UPDATE'), async (req, res, next) => {
  try {
    if (req.user.role !== ROLES.COMPANY_ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Only CompanyAdmin can edit custom roles.',
      })
    }

    const { id } = req.params
    const { name, description = '', permissions } = req.body

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role ID.',
      })
    }

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Role name is required.',
      })
    }

    if (name.trim().length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Role name cannot exceed 100 characters.',
      })
    }

    if (typeof description !== 'string' || description.trim().length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Description cannot exceed 500 characters.',
      })
    }

    if (!Array.isArray(permissions)) {
      return res.status(400).json({
        success: false,
        message: 'Permissions must be an array.',
      })
    }

    const company = await getCompanyForUser(req.user)

    if (!company) {
      return res.status(403).json({
        success: false,
        message: 'Approved company not found or company access is required.',
      })
    }

    const customRole = company.customRoles.id(id)

    if (!customRole || customRole.isSystem) {
      return res.status(404).json({
        success: false,
        message: 'Editable custom role not found.',
      })
    }

    const normalizedName = name.trim()

    const duplicateRole = company.customRoles.find((role) => String(role._id) !== String(id) && role.name.toLowerCase() === normalizedName.toLowerCase())

    if (duplicateRole) {
      return res.status(409).json({
        success: false,
        message: 'A role with this name already exists.',
      })
    }

    const requestedPermissions = [...new Set(permissions)]

    if (requestedPermissions.some((permission) => typeof permission !== 'string' || !validPermissions.has(permission))) {
      return res.status(400).json({
        success: false,
        message: 'One or more permissions are invalid.',
      })
    }

    const assignablePermissions = getAssignablePermissions(req.user, company)

    if (requestedPermissions.some((permission) => !assignablePermissions.has(permission))) {
      return res.status(403).json({
        success: false,
        message: 'You cannot assign permissions you do not have.',
      })
    }

    customRole.name = normalizedName
    customRole.description = description.trim()
    customRole.permissions = requestedPermissions

    await company.save()

    return res.status(200).json({
      success: true,
      message: 'Custom role updated successfully.',
      role: customRole,
    })
  } catch (error) {
    return next(error)
  }
})

// DELETE /erp/roles/:id — single delete policy:
// refuse deletion while the role is assigned to users.
router.delete('/roles/:id', authMiddleware, permissionMiddleware('Role', 'DELETE'), async (req, res, next) => {
  try {
    if (req.user.role !== ROLES.COMPANY_ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Only CompanyAdmin can delete custom roles.',
      })
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role ID.',
      })
    }

    const company = await getCompanyForUser(req.user)

    if (!company) {
      return res.status(403).json({
        success: false,
        message: 'Approved company not found or company access is required.',
      })
    }

    const customRole = company.customRoles.id(req.params.id)

    if (!customRole) {
      return res.status(404).json({
        success: false,
        message: 'Custom role not found in your company.',
      })
    }

    if (customRole.isSystem === true) {
      return res.status(403).json({
        success: false,
        message: 'System roles cannot be deleted.',
      })
    }

    const roleId = customRole._id

    const assignedUsers = await User.countDocuments({
      companyId: company._id,
      'roles.customRoleId': roleId,
      'roles.type': 'Custom',
    })

    if (assignedUsers > 0) {
      return res.status(409).json({
        success: false,
        message: 'This role is assigned to employees. Remove the role from employees before deleting it.',
        assignedUsers,
      })
    }

    company.customRoles.pull(roleId)
    await company.save()

    return res.status(200).json({
      success: true,
      message: 'Custom role deleted successfully.',
      deletedRoleId: String(roleId),
    })
  } catch (error) {
    return next(error)
  }
})

// DELETE /erp/employees/:id
router.delete('/employees/:id', authMiddleware, permissionMiddleware('Employee', 'DELETE'), async (req, res, next) => {
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

    const company = await getCompanyForUser(req.user)

    if (!company) {
      return res.status(403).json({
        success: false,
        message: 'Approved company not found or company access is required.',
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
