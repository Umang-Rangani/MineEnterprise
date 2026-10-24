const { ROLES, ACTIONS, SECTION_KEYS, ROLE_DEFAULT_PERMISSIONS } = require('../constants/permission')

const normalizeRole = (role) => {
  if (typeof role !== 'string') return ''
  return role.trim()
}

const normalizeSection = (section) => {
  if (typeof section !== 'string') return ''

  const normalized = section.trim().toLowerCase()

  return Object.keys(SECTION_KEYS).find((key) => key.toLowerCase() === normalized) || ''
}

const getValidPermissionKeys = () => new Set(Object.values(ACTIONS).flatMap((sectionActions) => Object.values(sectionActions)))

// Convert permissions from the defaults object into a unique flat array.
const flattenPermissions = (permissions) => {
  if (!permissions || typeof permissions !== 'object') return []

  const validPermissions = getValidPermissionKeys()

  return [
    ...new Set(
      Object.values(permissions)
        .filter(Array.isArray)
        .flat()
        .filter((permission) => typeof permission === 'string' && validPermissions.has(permission)),
    ),
  ]
}

// Return company-specific permissions when configured.
// Otherwise, use the global predefined defaults.
const getPredefinedRolePermissionList = (roleName, company) => {
  const role = normalizeRole(roleName)

  if (!Object.prototype.hasOwnProperty.call(ROLE_DEFAULT_PERMISSIONS, role)) {
    return []
  }

  if (role === ROLES.SUPER_ADMIN) {
    return []
  }

  // Company-specific overrides must only be used for the matching company.
  const companyMatches = company && company._id && Array.isArray(company.predefinedRolePermissions)

  if (companyMatches) {
    const savedRole = company.predefinedRolePermissions.find((item) => normalizeRole(item?.name) === role)

    // An explicitly saved empty array means no permissions.
    if (savedRole && Array.isArray(savedRole.permissions)) {
      const validPermissions = getValidPermissionKeys()

      return [...new Set(savedRole.permissions.filter((permission) => typeof permission === 'string' && validPermissions.has(permission)))]
    }
  }

  return flattenPermissions(ROLE_DEFAULT_PERMISSIONS[role])
}

// Keep the object format for compatibility with existing code.
const getPredefinedRolePermissions = (roleName, company) => {
  const role = normalizeRole(roleName)

  if (!Object.prototype.hasOwnProperty.call(ROLE_DEFAULT_PERMISSIONS, role)) {
    return {}
  }

  if (role === ROLES.SUPER_ADMIN) {
    return null
  }

  const permissions = getPredefinedRolePermissionList(role, company)

  const result = {}

  for (const [section, sectionActions] of Object.entries(ACTIONS)) {
    const allowed = Object.values(sectionActions).filter((permission) => permissions.includes(permission))

    if (allowed.length > 0) {
      result[section] = allowed
    }
  }

  return result
}

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

  // Prevent permissions from another company's configuration
  // being applied to this user.
  const sameCompany = Boolean(user.companyId && company?._id && String(user.companyId) === String(company._id))

  const effective = {}
  const validPermissions = getValidPermissionKeys()

  // Individual permission overrides apply to Employees.
  // An empty array intentionally means no permissions.
  if (normalizeRole(user.role) === ROLES.EMPLOYEE && Array.isArray(user.permissionOverrides)) {
    const allowedPermissions = new Set(user.permissionOverrides.filter((permission) => typeof permission === 'string' && validPermissions.has(permission)))

    for (const [section, sectionActions] of Object.entries(ACTIONS)) {
      const allowedInSection = Object.values(sectionActions).filter((permission) => allowedPermissions.has(permission))

      if (allowedInSection.length > 0) {
        effective[section] = allowedInSection
      }
    }

    effective.__customActions = []
    return effective
  }

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

    // A company's custom permissions must not be applied to a user
    // whose company does not match.
    const roleCompany = sameCompany ? company : null

    const rolePermissions = getPredefinedRolePermissions(assignedRole?.name, roleCompany)

    if (rolePermissions === null) {
      return null
    }

    for (const [section, permissions] of Object.entries(rolePermissions)) {
      if (!Array.isArray(permissions)) continue

      if (!Array.isArray(effective[section])) {
        effective[section] = []
      }

      effective[section].push(...permissions)
    }
  }

  for (const section of Object.keys(effective)) {
    effective[section] = [...new Set(effective[section])]
  }

  // Add permissions from custom roles belonging to the same company.
  effective.__customActions = [...(sameCompany ? [...getCustomRolePermissions(user, company)] : [])]

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

  const sectionActions = ACTIONS[normalizedSection] || {}

  const matchingAction = Object.entries(sectionActions).find(([key]) => key.toLowerCase() === normalizedAction.toLowerCase())

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
  const sectionPermissions = permissions[normalizedSection] || []

  if (sectionPermissions.includes(permissionKey)) {
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

  const userPermissions = new Set([
    ...Object.entries(effectivePermissions)
      .filter(([key, value]) => key !== '__customActions' && Array.isArray(value))
      .flatMap(([, value]) => value),
    ...(effectivePermissions.__customActions || []),
  ])

  return requestedPermissions.every((permission) => userPermissions.has(permission))
}

module.exports = {
  getPredefinedRolePermissions,
  getCustomRolePermissions,
  getEffectivePermissions,
  hasPermission,
  canAssignPermissions,
}
