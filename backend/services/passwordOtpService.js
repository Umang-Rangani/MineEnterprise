const crypto = require('crypto')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const User = require('../models/User')
const Company = require('../models/Company')
const PasswordOtp = require('../models/PasswordOtp')
const { sendEmail } = require('../utils/sendEmail')

const OTP_EXPIRY_MINUTES = 5
const RESEND_COOLDOWN_SECONDS = 60
const MAX_OTP_ATTEMPTS = 5

const ALLOWED_ROLES = ['SuperAdmin', 'CompanyAdmin', 'Employee']

const SELF_SERVICE_PURPOSE = 'SELF_SERVICE'
const ADMIN_RESET_PURPOSE = 'ADMIN_EMPLOYEE_RESET'

const getOtpSecret = () => {
  const secret = process.env.PASSWORD_OTP_SECRET || process.env.JWT_SECRET

  if (!secret) {
    throw new Error('Password OTP secret is not configured.')
  }

  return secret
}

const hashOtp = (otp) => {
  return crypto.createHmac('sha256', getOtpSecret()).update(otp).digest('hex')
}

const safeCompare = (first, second) => {
  const firstBuffer = Buffer.from(first, 'hex')
  const secondBuffer = Buffer.from(second, 'hex')

  if (firstBuffer.length !== secondBuffer.length) return false

  return crypto.timingSafeEqual(firstBuffer, secondBuffer)
}

const createOtp = () => crypto.randomInt(100000, 1000000).toString()

const createError = (message, statusCode = 400) => {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

const escapeHtml = (value = '') => {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }

    return entities[character]
  })
}

const validateUser = async (userId) => {
  const user = await User.findById(userId)

  if (!user || user.status !== 'Active') {
    throw createError('User account is unavailable.', 404)
  }

  if (!ALLOWED_ROLES.includes(user.role)) {
    throw createError('Password change is not allowed for this account.', 403)
  }

  if (!user.email) {
    throw createError('Registered email address is unavailable.')
  }

  return user
}

const validateNewPassword = ({ newPassword, confirmPassword }) => {
  if (!newPassword || !confirmPassword) {
    throw createError('Both password fields are required.')
  }

  if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) {
    throw createError('Password must be between 8 and 128 characters.')
  }

  if (newPassword !== confirmPassword) {
    throw createError('New password and confirm password do not match.')
  }
}

const sendOtpEmail = async ({ user, otp, subject, heading, description }) => {
  const safeName = escapeHtml(user.name)

  await sendEmail({
    to: user.email,
    subject,
    text: `Hello ${user.name}, your MineERP OTP is ${otp}. It expires in ${OTP_EXPIRY_MINUTES} minutes. Do not share this OTP with anyone.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;color:#1f2937;">
        <h2 style="color:#6d28d9;">${heading}</h2>
        <p>Hello ${safeName},</p>
        <p>${description}</p>
        <div style="font-size:30px;font-weight:bold;letter-spacing:8px;color:#6d28d9;padding:18px 0;">
          ${otp}
        </div>
        <p>This OTP expires in <strong>${OTP_EXPIRY_MINUTES} minutes</strong>.</p>
        <p style="color:#dc2626;">Do not share this OTP with anyone.</p>
        <p>If you did not expect this request, please contact your company administrator.</p>
        <p>Regards,<br/>MineERP Team</p>
      </div>
    `,
  })
}

const getPasswordChallenge = (userId, purpose, requestedById = null) => {
  const query = {
    userId,
    expiresAt: { $gt: new Date() },
    consumedAt: null,
  }

  if (purpose === SELF_SERVICE_PURPOSE) {
    // Existing OTP documents may not have a purpose field.
    query.$or = [{ purpose: SELF_SERVICE_PURPOSE }, { purpose: { $exists: false } }]
  } else {
    query.purpose = purpose
    query.requestedById = requestedById
  }

  return query
}

// Validate requester and target for administrator-initiated Employee reset.
const validateEmployeeResetContext = async ({ actorId, employeeId, companyId, session = null }) => {
  if (!actorId || !employeeId || !companyId) {
    throw createError('Invalid password reset request.', 400)
  }

  if (String(actorId) === String(employeeId)) {
    throw createError('You cannot use this process to reset your own password.', 403)
  }

  let actorQuery = User.findOne({
    _id: actorId,
    companyId,
    status: 'Active',
  })

  let employeeQuery = User.findOne({
    _id: employeeId,
    companyId,
    role: 'Employee',
    status: 'Active',
  })

  let companyQuery = Company.findOne({
    _id: companyId,
    status: 'Approved',
  })

  if (session) {
    actorQuery = actorQuery.session(session)
    employeeQuery = employeeQuery.session(session)
    companyQuery = companyQuery.session(session)
  }

  const [actor, employee, company] = await Promise.all([actorQuery, employeeQuery, companyQuery])

  if (!company) {
    throw createError('Approved company account is unavailable.', 403)
  }

  if (!actor || !ALLOWED_ROLES.includes(actor.role)) {
    throw createError('You are not authorized to perform this action.', 403)
  }

  if (!employee || !employee.email) {
    throw createError('Employee account or registered email is unavailable.', 404)
  }

  return { actor, employee }
}

// ======================================================
// SELF-SERVICE PASSWORD CHANGE
// ======================================================

// STEP 1: SEND OTP
const requestPasswordOtp = async ({ userId }) => {
  const user = await validateUser(userId)
  const now = new Date()

  const existingChallenge = await PasswordOtp.findOne({
    ...getPasswordChallenge(user._id, SELF_SERVICE_PURPOSE),
  }).sort({ createdAt: -1 })

  if (existingChallenge) {
    const elapsedSeconds = (now.getTime() - existingChallenge.lastSentAt.getTime()) / 1000

    if (elapsedSeconds < RESEND_COOLDOWN_SECONDS) {
      const remainingSeconds = Math.ceil(RESEND_COOLDOWN_SECONDS - elapsedSeconds)

      throw createError(`Please wait ${remainingSeconds} seconds before requesting another OTP.`, 429)
    }
  }

  const otp = createOtp()
  const otpHash = hashOtp(otp)

  await PasswordOtp.deleteMany({
    userId: user._id,
    $or: [{ purpose: SELF_SERVICE_PURPOSE }, { purpose: { $exists: false } }],
  })

  const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000)

  const challenge = await PasswordOtp.create({
    userId: user._id,
    purpose: SELF_SERVICE_PURPOSE,
    requestedById: null,
    otpHash,
    expiresAt,
    attempts: 0,
    verifiedAt: null,
    consumedAt: null,
    lastSentAt: now,
  })

  try {
    await sendOtpEmail({
      user,
      otp,
      subject: 'MineERP - Password Change Verification OTP',
      heading: 'MineERP Password Verification',
      description: 'Use the following OTP to verify your password change request:',
    })
  } catch (error) {
    console.error('PASSWORD OTP EMAIL ERROR:', {
      message: error.message,
      code: error.code,
      response: error.response,
      responseCode: error.responseCode,
      command: error.command,
    })

    await PasswordOtp.deleteOne({ _id: challenge._id })

    throw createError('Unable to send OTP email. Please try again later.', 500)
  }

  return {
    message: `OTP sent successfully to ${user.email}.`,
    expiresIn: OTP_EXPIRY_MINUTES * 60,
    resendAfter: RESEND_COOLDOWN_SECONDS,
  }
}

// STEP 2: VERIFY OTP
const verifyPasswordOtp = async ({ userId, otp }) => {
  if (!otp || !/^\d{6}$/.test(String(otp))) {
    throw createError('Please enter a valid 6-digit OTP.')
  }

  await validateUser(userId)

  const challenge = await PasswordOtp.findOne({
    ...getPasswordChallenge(userId, SELF_SERVICE_PURPOSE),
    verifiedAt: null,
  }).select('+otpHash')

  if (!challenge) {
    throw createError('OTP is invalid or expired. Please request a new OTP.')
  }

  if (challenge.attempts >= MAX_OTP_ATTEMPTS) {
    throw createError('Maximum OTP attempts exceeded. Please request a new OTP.', 429)
  }

  const submittedHash = hashOtp(String(otp))
  const isOtpValid = safeCompare(submittedHash, challenge.otpHash)

  if (!isOtpValid) {
    const updatedChallenge = await PasswordOtp.findOneAndUpdate(
      {
        _id: challenge._id,
        verifiedAt: null,
        consumedAt: null,
        expiresAt: { $gt: new Date() },
        attempts: { $lt: MAX_OTP_ATTEMPTS },
      },
      { $inc: { attempts: 1 } },
      { new: true },
    )

    if (!updatedChallenge) {
      throw createError('Maximum OTP attempts exceeded. Please request a new OTP.', 429)
    }

    const remainingAttempts = Math.max(0, MAX_OTP_ATTEMPTS - updatedChallenge.attempts)

    throw createError(remainingAttempts > 0 ? `Incorrect OTP. ${remainingAttempts} attempts remaining.` : 'Maximum OTP attempts exceeded. Please request a new OTP.', 400)
  }

  const verifiedChallenge = await PasswordOtp.findOneAndUpdate(
    {
      _id: challenge._id,
      verifiedAt: null,
      consumedAt: null,
      expiresAt: { $gt: new Date() },
      attempts: { $lt: MAX_OTP_ATTEMPTS },
    },
    { $set: { verifiedAt: new Date() } },
    { new: true },
  )

  if (!verifiedChallenge) {
    throw createError('OTP has already been used or expired. Please request a new OTP.')
  }

  return {
    message: 'Email verified successfully. You can now create a new password.',
  }
}

// STEP 3: UPDATE PASSWORD AFTER OTP VERIFICATION
const updatePasswordAfterOtp = async ({ userId, newPassword, confirmPassword }) => {
  validateNewPassword({ newPassword, confirmPassword })

  const session = await mongoose.startSession()

  try {
    let updated = false

    await session.withTransaction(async () => {
      const user = await User.findOne({
        _id: userId,
        status: 'Active',
        role: { $in: ALLOWED_ROLES },
      }).session(session)

      if (!user) {
        throw createError('User account is unavailable.', 404)
      }

      const challenge = await PasswordOtp.findOne({
        ...getPasswordChallenge(userId, SELF_SERVICE_PURPOSE),
        verifiedAt: { $ne: null },
      }).session(session)

      if (!challenge) {
        throw createError('Please verify your email with OTP before changing your password.')
      }

      const passwordHash = await bcrypt.hash(newPassword, 12)

      user.password = passwordHash
      await user.save({ session })

      const consumedChallenge = await PasswordOtp.updateOne(
        {
          _id: challenge._id,
          verifiedAt: { $ne: null },
          consumedAt: null,
          expiresAt: { $gt: new Date() },
        },
        { $set: { consumedAt: new Date() } },
        { session },
      )

      if (consumedChallenge.modifiedCount !== 1) {
        throw createError('OTP verification has expired or has already been used.')
      }

      updated = true
    })

    if (!updated) {
      throw createError('Unable to update password. Please try again.', 500)
    }

    return {
      message: 'Password changed successfully.',
    }
  } finally {
    await session.endSession()
  }
}

// ======================================================
// ADMIN-INITIATED EMPLOYEE PASSWORD RESET
// ======================================================

// STEP 1: SEND OTP TO EMPLOYEE'S REGISTERED EMAIL
const requestEmployeePasswordResetOtp = async ({ actorId, employeeId, companyId }) => {
  const { employee } = await validateEmployeeResetContext({
    actorId,
    employeeId,
    companyId,
  })

  const now = new Date()

  const challengeQuery = getPasswordChallenge(employee._id, ADMIN_RESET_PURPOSE, actorId)

  const existingChallenge = await PasswordOtp.findOne(challengeQuery).sort({ createdAt: -1 })

  if (existingChallenge) {
    const elapsedSeconds = (now.getTime() - existingChallenge.lastSentAt.getTime()) / 1000

    if (elapsedSeconds < RESEND_COOLDOWN_SECONDS) {
      const remainingSeconds = Math.ceil(RESEND_COOLDOWN_SECONDS - elapsedSeconds)

      throw createError(`Please wait ${remainingSeconds} seconds before requesting another OTP.`, 429)
    }
  }

  const otp = createOtp()
  const otpHash = hashOtp(otp)

  // Delete only this requester's previous reset challenge for this Employee.
  await PasswordOtp.deleteMany({
    userId: employee._id,
    purpose: ADMIN_RESET_PURPOSE,
    requestedById: actorId,
  })

  const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000)

  const challenge = await PasswordOtp.create({
    userId: employee._id,
    purpose: ADMIN_RESET_PURPOSE,
    requestedById: actorId,
    otpHash,
    expiresAt,
    attempts: 0,
    verifiedAt: null,
    consumedAt: null,
    lastSentAt: now,
  })

  try {
    await sendOtpEmail({
      user: employee,
      otp,
      subject: 'MineERP - Employee Password Reset Verification OTP',
      heading: 'MineERP Password Reset Verification',
      description: 'A password reset has been requested for your MineERP account by an authorized company user. Share this OTP only with that authorized user.',
    })
  } catch (error) {
    console.error('EMPLOYEE PASSWORD RESET OTP EMAIL ERROR:', {
      message: error.message,
      code: error.code,
      response: error.response,
      responseCode: error.responseCode,
      command: error.command,
    })

    await PasswordOtp.deleteOne({ _id: challenge._id })

    throw createError('Unable to send OTP to the Employee email. Please try again later.', 500)
  }

  return {
    message: `OTP sent successfully to Employee's registered email (${employee.email}).`,
    expiresIn: OTP_EXPIRY_MINUTES * 60,
    resendAfter: RESEND_COOLDOWN_SECONDS,
  }
}

// STEP 2: VERIFY EMPLOYEE OTP
const verifyEmployeePasswordResetOtp = async ({ actorId, employeeId, otp, companyId }) => {
  if (!otp || !/^\d{6}$/.test(String(otp))) {
    throw createError('Please enter a valid 6-digit OTP.')
  }

  const { employee } = await validateEmployeeResetContext({
    actorId,
    employeeId,
    companyId,
  })

  const challenge = await PasswordOtp.findOne({
    ...getPasswordChallenge(employee._id, ADMIN_RESET_PURPOSE, actorId),
    verifiedAt: null,
  }).select('+otpHash')

  if (!challenge) {
    throw createError('OTP is invalid or expired. Please request a new OTP.')
  }

  if (challenge.attempts >= MAX_OTP_ATTEMPTS) {
    throw createError('Maximum OTP attempts exceeded. Please request a new OTP.', 429)
  }

  const submittedHash = hashOtp(String(otp))
  const isOtpValid = safeCompare(submittedHash, challenge.otpHash)

  if (!isOtpValid) {
    const updatedChallenge = await PasswordOtp.findOneAndUpdate(
      {
        _id: challenge._id,
        userId: employee._id,
        purpose: ADMIN_RESET_PURPOSE,
        requestedById: actorId,
        verifiedAt: null,
        consumedAt: null,
        expiresAt: { $gt: new Date() },
        attempts: { $lt: MAX_OTP_ATTEMPTS },
      },
      { $inc: { attempts: 1 } },
      { new: true },
    )

    if (!updatedChallenge) {
      throw createError('Maximum OTP attempts exceeded. Please request a new OTP.', 429)
    }

    const remainingAttempts = Math.max(0, MAX_OTP_ATTEMPTS - updatedChallenge.attempts)

    throw createError(remainingAttempts > 0 ? `Incorrect OTP. ${remainingAttempts} attempts remaining.` : 'Maximum OTP attempts exceeded. Please request a new OTP.', 400)
  }

  const verifiedChallenge = await PasswordOtp.findOneAndUpdate(
    {
      _id: challenge._id,
      userId: employee._id,
      purpose: ADMIN_RESET_PURPOSE,
      requestedById: actorId,
      verifiedAt: null,
      consumedAt: null,
      expiresAt: { $gt: new Date() },
      attempts: { $lt: MAX_OTP_ATTEMPTS },
    },
    { $set: { verifiedAt: new Date() } },
    { new: true },
  )

  if (!verifiedChallenge) {
    throw createError('OTP has already been used or expired. Please request a new OTP.')
  }

  return {
    message: 'Employee email OTP verified successfully. You can now set a new password.',
  }
}

const updateEmployeePasswordAfterOtp = async ({ actorId, employeeId, newPassword, confirmPassword, companyId }) => {
  validateNewPassword({ newPassword, confirmPassword })

  // 1. Validate requester, Employee and company.
  const { employee } = await validateEmployeeResetContext({
    actorId,
    employeeId,
    companyId,
  })

  // 2. Atomically consume the verified OTP.
  // This prevents the same OTP from being used more than once.
  const consumedAt = new Date()

  const challenge = await PasswordOtp.findOneAndUpdate(
    {
      userId: employee._id,
      purpose: ADMIN_RESET_PURPOSE,
      requestedById: actorId,
      verifiedAt: { $ne: null },
      consumedAt: null,
      expiresAt: { $gt: consumedAt },
    },
    {
      $set: {
        consumedAt,
      },
    },
    {
      new: true,
    },
  )

  if (!challenge) {
    throw createError('Please verify the Employee email OTP before changing the password.')
  }

  // 3. Hash the new password.
  const passwordHash = await bcrypt.hash(newPassword, 12)

  // 4. Update Employee password without MongoDB transaction.
  try {
    employee.password = passwordHash
    await employee.save()
  } catch (error) {
    console.error('EMPLOYEE PASSWORD UPDATE ERROR:', {
      message: error.message,
      code: error.code,
    })

    throw createError('Unable to update Employee password. Please request a new OTP.', 500)
  }

  // 5. Notify Employee after successful password update.
  // Notification failure must not undo the password update.
  try {
    const safeName = escapeHtml(employee.name)

    await sendEmail({
      to: employee.email,
      subject: 'MineERP - Your Password Has Been Reset',
      text: `Hello ${employee.name}, your MineERP account password has been reset by an authorized company user. If you did not expect this change, please contact your company administrator.`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;color:#1f2937;">
          <h2 style="color:#6d28d9;">MineERP Password Updated</h2>
          <p>Hello ${safeName},</p>
          <p>Your MineERP account password has been reset successfully by an authorized company user.</p>
          <p>For your security, your new password has not been included in this email.</p>
          <p>If you did not expect this change, please contact your company administrator immediately.</p>
          <p>Regards,<br/>MineERP Team</p>
        </div>
      `,
    })
  } catch (emailError) {
    console.error('EMPLOYEE PASSWORD RESET NOTIFICATION ERROR:', {
      message: emailError.message,
      code: emailError.code,
    })
  }

  return {
    message: 'Employee password reset successfully.',
  }
}

module.exports = {
  // Existing self-service functions
  requestPasswordOtp,
  verifyPasswordOtp,
  updatePasswordAfterOtp,

  // Admin-initiated Employee password reset functions
  requestEmployeePasswordResetOtp,
  verifyEmployeePasswordResetOtp,
  updateEmployeePasswordAfterOtp,
}
