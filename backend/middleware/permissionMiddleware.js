const { hasPermission } = require('../utils/permission')
const Company = require('../models/Company')

const permissionMiddleware = (section, action) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        })
      }

      // SuperAdmin bypasses company-level permission checks.
      if (req.user.role === 'SuperAdmin') {
        return next()
      }

      if (!req.user.companyId) {
        return res.status(403).json({
          success: false,
          message: 'Company access required',
        })
      }

      const company = await Company.findOne({
        _id: req.user.companyId,
        status: 'Approved',
      })
        .select('_id status customRoles predefinedRolePermissions')
        .lean()

      if (!company) {
        return res.status(403).json({
          success: false,
          message: 'Approved company not found',
        })  
      }

      const allowed = hasPermission(req.user, company, section, action)

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to perform this action',
          requiredPermission: `${section}:${action}`,
        })
      }

      // Make the loaded company available to the route handler.
      req.company = company

      return next()
    } catch (error) {
      return next(error)
    }
  }
}

module.exports = permissionMiddleware
