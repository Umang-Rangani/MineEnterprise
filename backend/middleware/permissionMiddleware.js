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

      if (req.user.role === 'SuperAdmin') {
        return next()
      }

      if (!req.user.companyId) {
        return res.status(403).json({
          success: false,
          message: 'Company access required',
        })
      }

      const company = await Company.findById(req.user.companyId).select('_id customRoles').lean()

      if (!company) {
        return res.status(403).json({
          success: false,
          message: 'Company not found',
        })
      }

      if (!hasPermission(req.user, company, section, action)) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to perform this action',
          requiredPermission: `${section}:${action}`,
        })
      }

      req.company = company

      return next()
    } catch (error) {
      return next(error)
    }
  }
}

module.exports = permissionMiddleware
