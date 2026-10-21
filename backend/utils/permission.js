const { ROLES, ACTIONS, SECTION_KEYS, ROLE_DEFAULT_PERMISSIONS } = require('../constants/permission')

const normalizeRole = (role) => {
  if (typeof role !== 'string') return ''
  return role.trim()
}

const normalizeSection = (section) => {
  if (typeof section !== 'string') return ''

  const normalized = section.trim().toLowerCase()

  const matchedSection = Object.keys(SECTION_KEYS).find((key) => key.toLowerCase() === normalized)

  return matchedSection || ''
}

const getPredefinedRolePermissions = (roleName) => {
  const role = normalizeRole(roleName)

  if (!Object.prototype.hasOwnProperty.call(ROLE_DEFAULT_PERMISSIONS, role)) {
    return {}
  }

  if (role === ROLES.SUPER_ADMIN) {
    return null
  }

  return ROLE_DEFAULT_PERMISSIONS[role] || {}
}

const getValidPermissionKeys = () => new Set(Object.values(ACTIONS).flatMap((sectionActions) => Object.values(sectionActions)))

const getCustomRolePermissions = (user, company) => {
  const result = new Set()

  if (!user || !company || !user.companyId || !company._id) {
    return result
  }

  if (String(user.companyId) !== String(company._id)) {
    return result
  }

  const assignedRoles = Array.isArray(user.roles) ? user.roles : []
  const companyRoles = Array.isArray(company.customRoles) ? company.customRoles : []
  const validPermissions = getValidPermissionKeys()

  for (const assignedRole of assignedRoles) {
    if (assignedRole?.type !== 'Custom' || !assignedRole.customRoleId) {
      continue
    }

    const customRole = companyRoles.find((role) => String(role._id) === String(assignedRole.customRoleId))

    if (!customRole || !Array.isArray(customRole.permissions)) {
      continue
    }

    for (const permission of customRole.permissions) {
      if (typeof permission === 'string' && validPermissions.has(permission)) {
        result.add(permission)
      }
    }
  }

  return result
}

const getEffectivePermissions = (user, company) => {
  if (!user) return {}

  if (normalizeRole(user.role) === ROLES.SUPER_ADMIN) {
    return null
  }

  const effective = {}
  const assignedRoles = Array.isArray(user.roles) ? user.roles : []

  const rolesToCheck = [
    {
      type: 'Predefined',
      name: user.role,
    },
    ...assignedRoles,
  ].filter(
    (assignedRole, index, allRoles) =>
      assignedRole?.type !== 'Custom' && typeof assignedRole?.name === 'string' && allRoles.findIndex((candidate) => candidate?.type !== 'Custom' && normalizeRole(candidate?.name) === normalizeRole(assignedRole.name)) === index,
  )

  for (const assignedRole of rolesToCheck) {
    if (assignedRole?.type && assignedRole.type !== 'Predefined') {
      continue
    }

    const rolePermissions = getPredefinedRolePermissions(assignedRole?.name)

    if (rolePermissions === null) {
      return null
    }

    for (const [section, actions] of Object.entries(rolePermissions)) {
      if (!Array.isArray(actions)) continue

      if (!Array.isArray(effective[section])) {
        effective[section] = []
      }

      effective[section].push(...actions)
    }
  }

  for (const section of Object.keys(effective)) {
    effective[section] = [...new Set(effective[section])]
  }

  effective.__customActions = [...getCustomRolePermissions(user, company)]

  return effective
}

const resolvePermissionKey = (section, action) => {
  if (typeof action !== 'string' || !action.trim()) {
    return ''
  }

  const normalizedAction = action.trim()

  if (normalizedAction.includes(':')) {
    return normalizedAction
  }

  const normalizedSection = normalizeSection(section)

  if (!normalizedSection) return ''

  const sectionActions = ACTIONS[normalizedSection]

  const matchingAction = Object.entries(sectionActions || {}).find(([key]) => key.toLowerCase() === normalizedAction.toLowerCase())

  if (matchingAction) {
    return matchingAction[1]
  }

  return `${normalizedSection.toLowerCase()}:${normalizedAction.toLowerCase()}`
}

const hasPermission = (user, company, section, action) => {
  if (!user || !section || !action) {
    return false
  }

  const permissionKey = resolvePermissionKey(section, action)

  if (!permissionKey || !getValidPermissionKeys().has(permissionKey)) {
    return false
  }

  const permissions = getEffectivePermissions(user, company)

  if (permissions === null) {
    return true
  }

  if (!permissions) {
    return false
  }

  const normalizedSection = normalizeSection(section)
  const predefinedPermissions = permissions[normalizedSection] || []

  if (predefinedPermissions.includes(permissionKey)) {
    return true
  }

  return permissions.__customActions?.includes(permissionKey) || false
}

const canAssignPermissions = (user, company, requestedPermissions) => {
  if (!user || !Array.isArray(requestedPermissions)) {
    return false
  }

  if (normalizeRole(user.role) === ROLES.SUPER_ADMIN) {
    return true
  }

  const validPermissions = getValidPermissionKeys()

  if (requestedPermissions.some((permission) => typeof permission !== 'string' || !validPermissions.has(permission))) {
    return false
  }

  const effectivePermissions = getEffectivePermissions(user, company)

  if (!effectivePermissions) {
    return false
  }

  const userPermissions = new Set([...Object.values(effectivePermissions).filter(Array.isArray).flat(), ...(effectivePermissions.__customActions || [])])

  return requestedPermissions.every((permission) => userPermissions.has(permission))
}

module.exports = {
  getPredefinedRolePermissions,
  getCustomRolePermissions,
  getEffectivePermissions,
  hasPermission,
  canAssignPermissions,
}
