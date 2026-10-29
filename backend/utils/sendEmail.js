const nodemailer = require('nodemailer')

const getTransporter = () => {
  const { EMAIL_USER, EMAIL_PASS } = process.env

  if (!EMAIL_USER || !EMAIL_PASS) {
    throw new Error('Email configuration is missing. Set EMAIL_USER and EMAIL_PASS.')
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  })
}

const sendEmail = async ({ to, subject, html, text, attachments = [], bcc = [] }) => {
  if (!to || (Array.isArray(to) && to.length === 0)) {
    throw new Error('Recipient email address is required.')
  }

  if (!subject || !subject.trim()) {
    throw new Error('Email subject is required.')
  }

  if (!html && !text) {
    throw new Error('Email content (html or text) is required.')
  }

  const transporter = getTransporter()

  const mailOptions = {
    from: `"MineERP" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    ...(html ? { html } : {}),
    ...(text ? { text } : {}),
  }

  if (Array.isArray(bcc) && bcc.length > 0) {
    mailOptions.bcc = bcc
  }

  if (Array.isArray(attachments) && attachments.length > 0) {
    mailOptions.attachments = attachments
  }

  try {
    return await transporter.sendMail(mailOptions)
  } catch (error) {
    console.error('MineERP email sending failed:', {
      message: error.message,
      code: error.code,
      responseCode: error.responseCode,
    })

    throw error
  }
}

module.exports = { sendEmail }
