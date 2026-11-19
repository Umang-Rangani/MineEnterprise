const SystemActivity = require('../models/SystemActivity')

const logSystemActivity = async ({ actor, target = null, company = null, action, description, metadata = {}, req = null, session = null }) => {
  try {
    const activity = new SystemActivity({
      actor: actor || {},
      target,
      company,
      action,
      description,
      metadata,
      ipAddress: req?.ip || '',
      userAgent: req?.get('user-agent') || '',
    })

    if (session) {
      await activity.save({ session })
    } else {
      await activity.save()
    }

    return activity
  } catch (error) {
    console.error('System Activity Logging Error:', error.message)
    throw error
  }
}

module.exports = logSystemActivity
