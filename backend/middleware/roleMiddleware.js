const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      })
    }

    const userRoles = new Set([req.user.role])

    if (Array.isArray(req.user.roles)) {
      for (const assignedRole of req.user.roles) {
        if (assignedRole?.type === 'Predefined' && typeof assignedRole.name === 'string') {
          userRoles.add(assignedRole.name)
        }
      }
    }

    const hasAllowedRole = allowedRoles.some((role) => userRoles.has(role))

    if (!hasAllowedRole) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      })
    }

    return next()
  }
}

module.exports = roleMiddleware
