const express = require('express')
const mongoose = require('mongoose')

const User = require('../models/User')
const Company = require('../models/Company')

const authMiddleware = require('../middleware/authMiddleware')
const permissionMiddleware = require('../middleware/permissionMiddleware')
const { hasPermission, canAssignPermissions } = require('../utils/permission')

const { ROLES, ACTIONS, ROLE_DEFAULT_PERMISSIONS } = require('../constants/permission')

const router = express.Router()

const allowedPredefinedRoles = [ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.ACCOUNTANT, ROLES.INVENTORY_MANAGER, ROLES.SALES_MANAGER]

const validPermissions = new Set(Object.values(ACTIONS).flatMap((sectionActions) => Object.values(sectionActions)))

// GET /erp/roles — search, filter and pagination

router.get('/', authMiddleware, permissionMiddleware('Role', 'LIST'), async (req, res, next) => {
  try {
    // 1. Validate company access
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

    // 2. Read and validate query parameters
    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : ''

    const requestedType = typeof req.query.type === 'string' ? req.query.type : 'All'

    const allowedTypes = ['All', 'Predefined', 'Custom']

    if (!allowedTypes.includes(requestedType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role type filter.',
      })
    }

    const page = Math.max(1, Math.min(1000000, Number.parseInt(req.query.page, 10) || 1))

    const requestedLimit = Number.parseInt(req.query.limit, 10) || 5
    const limit = Math.min(100, Math.max(1, requestedLimit))

    // 3. Find saved predefined role configuration
    const getSavedPredefinedRole = (roleName) => (company.predefinedRolePermissions || []).find((role) => role.name === roleName)

    // 4. Resolve predefined role permissions
    const getPermissions = (roleName) => {
      const savedRole = getSavedPredefinedRole(roleName)

      // Inactive roles grant no permissions
      if (savedRole?.isActive === false) {
        return []
      }

      // Use company-specific permissions if configured
      if (savedRole && Array.isArray(savedRole.permissions)) {
        return [...new Set(savedRole.permissions.filter((permission) => validPermissions.has(permission)))]
      }

      // Otherwise, use predefined default permissions
      const defaults = ROLE_DEFAULT_PERMISSIONS[roleName] || {}

      return [...new Set(Object.values(defaults).flatMap((permissions) => (Array.isArray(permissions) ? permissions.filter((permission) => validPermissions.has(permission)) : [])))]
    }

    // 5. Prepare predefined roles
    const predefinedRoles = allowedPredefinedRoles.map((name) => {
      const savedRole = getSavedPredefinedRole(name)

      return {
        type: 'Predefined',
        name,
        description: `${name} predefined role`,
        permissions: getPermissions(name),
        isSystem: true,
        isActive: savedRole?.isActive !== false,
        updatedAt: savedRole?.updatedAt || null,
      }
    })

    // 6. Prepare company custom roles
    const customRoles = (company.customRoles || []).map((role) => ({
      _id: role._id,
      type: 'Custom',
      name: role.name,
      description: role.description || '',
      permissions: (role.permissions || []).filter((permission) => validPermissions.has(permission)),
      isSystem: role.isSystem === true,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    }))

    const allRoles = [...predefinedRoles, ...customRoles]

    // 7. Calculate counts before filtering
    const stats = {
      totalRoles: allRoles.length,
      predefinedRoles: predefinedRoles.length,
      customRoles: customRoles.length,
    }

    // 8. Apply search and type filter
    const normalizedSearch = search.toLowerCase()

    const filteredRoles = allRoles.filter((role) => {
      const matchesSearch = !normalizedSearch || [role.name, role.description, role.type].filter(Boolean).some((value) => value.toLowerCase().includes(normalizedSearch))

      const matchesType = requestedType === 'All' || role.type === requestedType

      return matchesSearch && matchesType
    })

    // 9. Server-side pagination
    const totalFilteredRoles = filteredRoles.length
    const totalPages = Math.ceil(totalFilteredRoles / limit)

    const safePage = totalPages === 0 ? 1 : Math.min(page, totalPages)

    const startIndex = (safePage - 1) * limit

    const paginatedRoles = filteredRoles.slice(startIndex, startIndex + limit)

    // 10. Send response
    return res.status(200).json({
      success: true,
      roles: paginatedRoles,
      availablePermissions: Object.entries(ACTIONS).map(([section, sectionActions]) => ({
        section,
        permissions: Object.values(sectionActions),
      })),
      stats,
      pagination: {
        page: safePage,
        limit,
        totalRoles: totalFilteredRoles,
        totalPages,
        hasPreviousPage: safePage > 1,
        hasNextPage: safePage < totalPages,
      },
    })
  } catch (error) {
    return next(error)
  }
})

// POST /erp/roles — create custom role
router.post('/', authMiddleware, permissionMiddleware('Role', 'CREATE'), async (req, res, next) => {
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

    // Calculate permissions the current user is allowed to grant.
    const authority = new Set()

    const assignedRoles = [{ type: 'Predefined', name: req.user.role }, ...(Array.isArray(req.user.roles) ? req.user.roles : [])]

    for (const assignedRole of assignedRoles) {
      if (assignedRole?.type === 'Custom') {
        const customRole = (company.customRoles || []).find((role) => String(role._id) === String(assignedRole.customRoleId))

        for (const permission of customRole?.permissions || []) {
          if (validPermissions.has(permission)) {
            authority.add(permission)
          }
        }

        continue
      }

      if (assignedRole?.type && assignedRole.type !== 'Predefined') {
        continue
      }

      const roleName = assignedRole?.name
      const savedRole = (company.predefinedRolePermissions || []).find((role) => role.name === roleName)

      const rolePermissions = savedRole
        ? (savedRole.permissions || []).filter((permission) => validPermissions.has(permission))
        : Object.values(ROLE_DEFAULT_PERMISSIONS[roleName] || {}).flatMap((items) => (Array.isArray(items) ? items.filter((permission) => validPermissions.has(permission)) : []))

      for (const permission of rolePermissions) {
        authority.add(permission)
      }
    }

    // Explicit permission overrides replace role-derived permissions.
    if (Array.isArray(req.user.permissionOverrides)) {
      authority.clear()

      for (const permission of req.user.permissionOverrides) {
        if (validPermissions.has(permission)) {
          authority.add(permission)
        }
      }
    }

    if (requestedPermissions.some((permission) => !authority.has(permission))) {
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
        isSystem: createdRole.isSystem === true,
        createdAt: createdRole.createdAt,
        updatedAt: createdRole.updatedAt,
      },
    })
  } catch (error) {
    return next(error)
  }
})

// GET /erp/roles/:id — get role details

router.get('/:id', authMiddleware, permissionMiddleware('Role', 'VIEW'), async (req, res, next) => {
  try {
    const { id } = req.params

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

    // 1. Check predefined role
    const predefinedRole = allowedPredefinedRoles.find((roleName) => roleName.toLowerCase() === id.toLowerCase())

    if (predefinedRole) {
      const savedRole = (company.predefinedRolePermissions || []).find((role) => role.name === predefinedRole)

      const isActive = savedRole?.isActive !== false

      let permissions = []

      if (isActive) {
        if (savedRole && Array.isArray(savedRole.permissions)) {
          permissions = savedRole.permissions.filter((permission) => validPermissions.has(permission))
        } else {
          permissions = Object.values(ROLE_DEFAULT_PERMISSIONS[predefinedRole] || {}).flatMap((items) => (Array.isArray(items) ? items.filter((permission) => validPermissions.has(permission)) : []))
        }
      }

      return res.status(200).json({
        success: true,
        role: {
          type: 'Predefined',
          name: predefinedRole,
          description: `${predefinedRole} predefined role`,
          permissions: [...new Set(permissions)],
          isSystem: true,
          isActive,
          updatedAt: savedRole?.updatedAt || null,
        },
      })
    }

    // 2. Validate custom role ID
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role ID.',
      })
    }

    // 3. Find custom role inside this company only
    const customRole = company.customRoles.id(id)

    if (!customRole) {
      return res.status(404).json({
        success: false,
        message: 'Role not found in your company.',
      })
    }

    // 4. Return custom role details
    return res.status(200).json({
      success: true,
      role: {
        _id: customRole._id,
        type: 'Custom',
        name: customRole.name,
        description: customRole.description || '',
        permissions: (customRole.permissions || []).filter((permission) => validPermissions.has(permission)),
        isSystem: customRole.isSystem === true,
        createdAt: customRole.createdAt,
        updatedAt: customRole.updatedAt,
      },
    })
  } catch (error) {
    return next(error)
  }
})

/* PATCH /erp/roles/predefined/:name */
// Update predefined role permissions and/or active status.
router.patch('/predefined/:name', authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== ROLES.COMPANY_ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Only CompanyAdmin can manage predefined roles.',
      })
    }

    const roleName = req.params.name

    if (!allowedPredefinedRoles.includes(roleName)) {
      return res.status(404).json({
        success: false,
        message: 'Predefined role not found or cannot be edited.',
      })
    }

    const body = req.body || {}
    const { permissions, isActive } = body

    const hasPermissions = Object.hasOwn(body, 'permissions')
    const hasIsActive = Object.hasOwn(body, 'isActive')

    if (!hasPermissions && !hasIsActive) {
      return res.status(400).json({
        success: false,
        message: 'Provide permissions and/or isActive.',
      })
    }

    if (hasPermissions && (!Array.isArray(permissions) || permissions.some((permission) => typeof permission !== 'string' || !validPermissions.has(permission)))) {
      return res.status(400).json({
        success: false,
        message: 'One or more permissions are invalid.',
      })
    }

    if (hasIsActive && typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be a boolean.',
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

    // Separate permission checks.
    if (hasPermissions && !hasPermission(req.user, company, 'Role', 'UPDATE')) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to edit role permissions.',
        requiredPermission: ACTIONS.Role.UPDATE,
      })
    }

    if (hasIsActive && !hasPermission(req.user, company, 'Role', 'UPDATE_STATUS')) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to activate or deactivate roles.',
        requiredPermission: ACTIONS.Role.UPDATE_STATUS,
      })
    }

    const normalizedPermissions = hasPermissions ? [...new Set(permissions)] : null
    // Ensure the user cannot grant permissions beyond their authority.
    if (hasPermissions && !canAssignPermissions(req.user, company, normalizedPermissions)) {
      return res.status(403).json({
        success: false,
        message: 'You cannot assign permissions you do not have.',
      })
    }

    if (!Array.isArray(company.predefinedRolePermissions)) {
      company.predefinedRolePermissions = []
    }

    let savedRole = company.predefinedRolePermissions.find((role) => role.name === roleName)

    if (!savedRole) {
      const defaults = ROLE_DEFAULT_PERMISSIONS[roleName] || {}

      const defaultPermissions = [...new Set(Object.values(defaults).flatMap((items) => (Array.isArray(items) ? items.filter((permission) => validPermissions.has(permission)) : [])))]

      company.predefinedRolePermissions.push({
        name: roleName,
        permissions: hasPermissions ? normalizedPermissions : defaultPermissions,
        isActive: hasIsActive ? isActive : true,
        updatedBy: req.user.userId,
        updatedAt: new Date(),
      })

      savedRole = company.predefinedRolePermissions.find((role) => role.name === roleName)
    } else {
      if (hasPermissions) {
        savedRole.permissions = normalizedPermissions
      }

      if (hasIsActive) {
        savedRole.isActive = isActive
      }

      savedRole.updatedBy = req.user.userId
      savedRole.updatedAt = new Date()
    }

    await company.save()

    return res.status(200).json({
      success: true,
      message: 'Predefined role updated successfully.',
      role: {
        type: 'Predefined',
        name: roleName,
        permissions: savedRole.isActive === false ? [] : savedRole.permissions || [],
        isSystem: true,
        isActive: savedRole.isActive !== false,
        updatedAt: savedRole.updatedAt,
      },
    })
  } catch (error) {
    return next(error)
  }
})

// PATCH /erp/roles/:id
// Update a custom role or activate/deactivate it.
router.patch('/:id', authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== ROLES.COMPANY_ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Only CompanyAdmin can manage custom roles.',
      })
    }

    const { id } = req.params

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role ID.',
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

    const customRole = company.customRoles.id(id)

    if (!customRole || customRole.isSystem === true) {
      return res.status(404).json({
        success: false,
        message: 'Editable custom role not found.',
      })
    }

    const body = req.body || {}
    const bodyKeys = Object.keys(body)

    // Status-only update requires role:update-status.
    if (bodyKeys.length === 1 && typeof body.isActive === 'boolean') {
      if (!hasPermission(req.user, company, 'Role', 'UPDATE_STATUS')) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to activate or deactivate roles.',
          requiredPermission: ACTIONS.Role.UPDATE_STATUS,
        })
      }

      customRole.isActive = body.isActive

      await company.save()

      return res.status(200).json({
        success: true,
        message: `Custom role ${body.isActive ? 'activated' : 'deactivated'} successfully.`,
        role: {
          _id: customRole._id,
          type: 'Custom',
          name: customRole.name,
          description: customRole.description || '',
          permissions: customRole.permissions || [],
          isActive: customRole.isActive,
          isSystem: customRole.isSystem === true,
          createdAt: customRole.createdAt,
          updatedAt: customRole.updatedAt,
        },
      })
    }

    // Full role update requires role:update.
    if (!hasPermission(req.user, company, 'Role', 'UPDATE')) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to edit roles.',
        requiredPermission: ACTIONS.Role.UPDATE,
      })
    }

    const { name, description = '', permissions } = body

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Role name is required.',
      })
    }

    const normalizedName = name.trim()

    if (normalizedName.length > 100) {
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

    if (!canAssignPermissions(req.user, company, requestedPermissions)) {
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
      role: {
        _id: customRole._id,
        type: 'Custom',
        name: customRole.name,
        description: customRole.description || '',
        permissions: customRole.permissions,
        isActive: customRole.isActive,
        isSystem: customRole.isSystem === true,
        createdAt: customRole.createdAt,
        updatedAt: customRole.updatedAt,
      },
    })
  } catch (error) {
    return next(error)
  }
})

//  DELETE /erp/roles/:id
// Permanently delete an unassigned custom role.
router.delete('/:id', authMiddleware, permissionMiddleware('Role', 'DELETE'), async (req, res, next) => {
  try {
    // 1. Only CompanyAdmin can delete custom roles
    if (req.user.role !== ROLES.COMPANY_ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Only CompanyAdmin can delete custom roles.',
      })
    }

    // 2. Validate role ID
    const { id } = req.params

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role ID.',
      })
    }

    // 3. Validate company access
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

    // 4. Find role only inside this company
    const customRole = company.customRoles.id(id)

    if (!customRole) {
      return res.status(404).json({
        success: false,
        message: 'Custom role not found in your company.',
      })
    }

    // 5. Protect system roles
    if (customRole.isSystem === true) {
      return res.status(403).json({
        success: false,
        message: 'System roles cannot be deleted.',
      })
    }

    const roleId = customRole._id

    // 6. Prevent deletion if assigned to any company employee
    const assignedUsers = await User.countDocuments({
      companyId: company._id,
      'roles.type': 'Custom',
      'roles.customRoleId': roleId,
    })

    if (assignedUsers > 0) {
      return res.status(409).json({
        success: false,
        message: 'This role is assigned to employees. Remove the role from employees before deleting it.',
        assignedUsers,
      })
    }

    // 7. Delete custom role
    company.customRoles.pull(roleId)

    await company.save()

    // 8. Return success response
    return res.status(200).json({
      success: true,
      message: 'Custom role deleted successfully.',
      deletedRoleId: String(roleId),
    })
  } catch (error) {
    return next(error)
  }
})

module.exports = router
