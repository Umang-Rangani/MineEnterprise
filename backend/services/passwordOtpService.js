const crypto = require('crypto')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const User = require('../models/User')
const PasswordOtp = require('../models/PasswordOtp')
const { sendEmail } = require('../utils/sendEmail')

const OTP_EXPIRY_MINUTES = 5
const RESEND_COOLDOWN_SECONDS = 60
const MAX_OTP_ATTEMPTS = 5

const ALLOWED_ROLES = ['SuperAdmin', 'CompanyAdmin', 'Employee']

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

// STEP 1: SEND OTP
const requestPasswordOtp = async ({ userId }) => {
  const user = await validateUser(userId)
  const now = new Date()

  const existingChallenge = await PasswordOtp.findOne({
    userId: user._id,
    expiresAt: { $gt: now },
    consumedAt: null,
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

  await PasswordOtp.deleteMany({ userId: user._id })

  const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000)

  const challenge = await PasswordOtp.create({
    userId: user._id,
    otpHash,
    expiresAt,
    attempts: 0,
    verifiedAt: null,
    consumedAt: null,
    lastSentAt: now,
  })

  try {
    const safeName = escapeHtml(user.name)

    await sendEmail({
      to: user.email,
      subject: 'MineERP - Password Change Verification OTP',
      text: `Hello ${user.name}, your MineERP password change OTP is ${otp}. It expires in ${OTP_EXPIRY_MINUTES} minutes. Do not share this OTP with anyone.`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;color:#1f2937;">
          <h2 style="color:#6d28d9;">MineERP Password Verification</h2>
          <p>Hello ${safeName},</p>
          <p>Use the following OTP to verify your password change request:</p>
          <div style="font-size:30px;font-weight:bold;letter-spacing:8px;color:#6d28d9;padding:18px 0;">
            ${otp}
          </div>
          <p>This OTP expires in <strong>${OTP_EXPIRY_MINUTES} minutes</strong>.</p>
          <p style="color:#dc2626;">Do not share this OTP with anyone.</p>
          <p>If you did not request this change, please ignore this email.</p>
          <p>Regards,<br/>MineERP Team</p>
        </div>
      `,
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
    userId,
    expiresAt: { $gt: new Date() },
    consumedAt: null,
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
      {
        $inc: { attempts: 1 },
      },
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
    {
      $set: { verifiedAt: new Date() },
    },
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
  if (!newPassword || !confirmPassword) {
    throw createError('Both password fields are required.')
  }

  if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) {
    throw createError('Password must be between 8 and 128 characters.')
  }

  if (newPassword !== confirmPassword) {
    throw createError('New password and confirm password do not match.')
  }

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
        userId,
        verifiedAt: { $ne: null },
        consumedAt: null,
        expiresAt: { $gt: new Date() },
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
        {
          $set: { consumedAt: new Date() },
        },
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

module.exports = {
  requestPasswordOtp,
  verifyPasswordOtp,
  updatePasswordAfterOtp,
}
