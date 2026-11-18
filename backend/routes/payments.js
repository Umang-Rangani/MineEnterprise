const express = require('express')
const mongoose = require('mongoose')

const Payment = require('../models/Payment')
const PaymentCounter = require('../models/PaymentCounter')
const Invoice = require('../models/Invoice')

const authMiddleware = require('../middleware/authMiddleware')
const permissionMiddleware = require('../middleware/permissionMiddleware')
const generatePaymentReceiptPDF = require('../utils/generatePaymentReceiptPDF')

const router = express.Router()

router.use(authMiddleware)

// HELPERS

const PAYMENT_MODES = ['Cash', 'Bank Transfer', 'UPI', 'Cheque']

const ALLOWED_INVOICE_STATUSES = ['Approved', 'Partially Paid', 'Overdue']

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id)

const getUserId = (req) => req.user?._id || req.user?.id || req.user?.userId

const hasPredefinedRole = (req, roleName) => {
  return req.user?.role === roleName || (req.user?.roles || []).some((role) => role?.type === 'Predefined' && role?.name === roleName)
}

const isSuperAdmin = (req) => {
  return req.user?.role === 'SuperAdmin' || (req.user?.roles || []).some((role) => role?.name === 'SuperAdmin')
}

const getCompanyId = (req) => {
  if (req.user?.companyId) {
    return req.user.companyId
  }

  if (isSuperAdmin(req)) {
    return req.body?.companyId || req.query?.companyId
  }

  return req.company?._id || req.company?.id
}

const httpError = (status, message) => {
  const error = new Error(message)
  error.status = status
  return error
}

const handleError = (res, error) => {
  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'Duplicate payment record found.',
    })
  }

  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: error.message,
    })
  }

  const status = error.status || 500

  return res.status(status).json({
    success: false,
    message: status >= 500 ? 'Internal Server Error' : error.message,
  })
}

const requireCompanyId = (companyId) => {
  if (!companyId || !isValidObjectId(companyId)) {
    throw httpError(400, 'Valid company ID is required.')
  }

  return companyId
}

const requireUserId = (userId) => {
  if (!userId || !isValidObjectId(userId)) {
    throw httpError(401, 'Authenticated user information is missing.')
  }

  return userId
}

const parseNumber = (value) => {
  const number = Number(value)

  if (!Number.isFinite(number)) {
    return null
  }

  return number
}

const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100

const validatePaymentDate = (value) => {
  const date = new Date(value)

  if (!value || Number.isNaN(date.getTime())) {
    throw httpError(400, 'Valid payment date is required.')
  }

  if (date > new Date()) {
    throw httpError(400, 'Payment date cannot be in the future.')
  }

  return date
}

const getInvoicePaymentStatus = ({ paidAmount, balanceAmount, dueDate }) => {
  if (balanceAmount <= 0.009) {
    return 'Paid'
  }

  if (paidAmount > 0) {
    return 'Partially Paid'
  }

  if (dueDate && new Date(dueDate) < new Date()) {
    return 'Overdue'
  }

  return 'Approved'
}

const generatePaymentNumber = async (companyId, paymentDate, session) => {
  const year = new Date(paymentDate).getFullYear()

  const counter = await PaymentCounter.findOneAndUpdate(
    {
      companyId,
      year,
    },
    {
      $inc: { lastNumber: 1 },
      $setOnInsert: {
        companyId,
        year,
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      session,
    },
  )

  return `PAY-${year}-${String(counter.lastNumber).padStart(6, '0')}`
}

const populatePayment = (query) => query.populate('invoiceId').populate('customerId').populate('recordedBy', 'name email').populate('updatedBy', 'name email').populate('refundHistory.refundedBy', 'name email')

// WAREHOUSE ACCESS HELPERS

const isPrivilegedWarehouseUser = (req) => {
  return isSuperAdmin(req) || hasPredefinedRole(req, 'CompanyAdmin') || hasPredefinedRole(req, 'Manager')
}

const getWarehouseId = (warehouse) => {
  if (!warehouse) return null

  if (typeof warehouse === 'object') {
    return String(warehouse._id || warehouse.id || '')
  }

  return String(warehouse)
}

const getAllowedWarehouseIds = (req) => {
  if (isPrivilegedWarehouseUser(req)) {
    return null
  }

  const assignedWarehouses = req.user?.assignedWarehouses || []

  const defaultWarehouseId = req.user?.defaultWarehouseId

  return [...new Set([...assignedWarehouses.map(getWarehouseId), getWarehouseId(defaultWarehouseId)].filter(Boolean))]
}

const validateWarehouseAccess = (req, warehouseId) => {
  if (isPrivilegedWarehouseUser(req)) {
    return
  }

  const allowedWarehouses = getAllowedWarehouseIds(req)

  if (!warehouseId || !allowedWarehouses.includes(String(warehouseId))) {
    throw httpError(403, 'You do not have access to this warehouse.')
  }
}

// GET ALL PAYMENTS

router.get('/', permissionMiddleware('Payment', 'payment:list'), async (req, res) => {
  try {
    const companyId = requireCompanyId(getCompanyId(req))

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1)

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100)

    const skip = (page - 1) * limit

    const filter = { companyId }

    if (req.query.status) {
      filter.status = req.query.status
    }

    if (req.query.paymentMode) {
      filter.paymentMode = req.query.paymentMode
    }

    if (req.query.invoiceId) {
      if (!isValidObjectId(req.query.invoiceId)) {
        throw httpError(400, 'Invalid invoice ID.')
      }

      filter.invoiceId = req.query.invoiceId
    }

    if (req.query.customerId) {
      if (!isValidObjectId(req.query.customerId)) {
        throw httpError(400, 'Invalid customer ID.')
      }

      filter.customerId = req.query.customerId
    }

    if (req.query.startDate || req.query.endDate) {
      filter.paymentDate = {}

      if (req.query.startDate) {
        const startDate = new Date(req.query.startDate)

        if (Number.isNaN(startDate.getTime())) {
          throw httpError(400, 'Invalid start date.')
        }

        filter.paymentDate.$gte = startDate
      }

      if (req.query.endDate) {
        const endDate = new Date(req.query.endDate)

        if (Number.isNaN(endDate.getTime())) {
          throw httpError(400, 'Invalid end date.')
        }

        endDate.setHours(23, 59, 59, 999)
        filter.paymentDate.$lte = endDate
      }
    }

    if (req.query.search?.trim()) {
      const search = req.query.search.trim()

      filter.$or = [
        {
          paymentNumber: {
            $regex: search,
            $options: 'i',
          },
        },
        {
          transactionReference: {
            $regex: search,
            $options: 'i',
          },
        },
      ]
    }

    // WAREHOUSE FILTER

    const allowedWarehouses = getAllowedWarehouseIds(req)

    if (allowedWarehouses !== null) {
      const allowedInvoices = await Invoice.find({
        companyId,
        warehouseId: { $in: allowedWarehouses },
      }).distinct('_id')

      if (filter.invoiceId) {
        const requestedInvoiceId = String(filter.invoiceId)

        filter.invoiceId = {
          $in: allowedInvoices.filter((invoiceId) => String(invoiceId) === requestedInvoiceId),
        }
      } else {
        filter.invoiceId = {
          $in: allowedInvoices,
        }
      }
    }

    const [payments, total] = await Promise.all([
      populatePayment(
        Payment.find(filter)
          .sort({
            paymentDate: -1,
            createdAt: -1,
          })
          .skip(skip)
          .limit(limit),
      ),
      Payment.countDocuments(filter),
    ])

    return res.status(200).json({
      success: true,
      message: 'Payments fetched successfully.',
      data: payments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    return handleError(res, error)
  }
})

// GET SINGLE PAYMENT

router.get('/:id', permissionMiddleware('Payment', 'payment:view'), async (req, res) => {
  try {
    const companyId = requireCompanyId(getCompanyId(req))
    const { id } = req.params

    if (!isValidObjectId(id)) {
      throw httpError(400, 'Invalid payment ID.')
    }

    const payment = await populatePayment(
      Payment.findOne({
        _id: id,
        companyId,
      }),
    )

    if (!payment) {
      throw httpError(404, 'Payment not found.')
    }

    if (!payment.invoiceId) {
      throw httpError(404, 'Related invoice not found.')
    }

    validateWarehouseAccess(req, payment.invoiceId.warehouseId)

    return res.status(200).json({
      success: true,
      message: 'Payment fetched successfully.',
      data: payment,
    })
  } catch (error) {
    return handleError(res, error)
  }
})

// RECORD PAYMENT

router.post('/', permissionMiddleware('Payment', 'payment:record'), async (req, res) => {
  const session = await mongoose.startSession()

  try {
    const companyId = requireCompanyId(getCompanyId(req))
    const userId = requireUserId(getUserId(req))

    const { invoiceId, amount, paymentMode, paymentDate, transactionReference = '', notes = '' } = req.body

    if (!invoiceId || !isValidObjectId(invoiceId)) {
      throw httpError(400, 'Valid invoice ID is required.')
    }

    const parsedAmount = parseNumber(amount)

    if (parsedAmount === null || parsedAmount <= 0) {
      throw httpError(400, 'Payment amount must be greater than zero.')
    }

    const finalAmount = roundMoney(parsedAmount)

    if (!PAYMENT_MODES.includes(paymentMode)) {
      throw httpError(400, 'Invalid payment mode.')
    }

    if (typeof transactionReference !== 'string' || transactionReference.trim().length > 100) {
      throw httpError(400, 'Transaction reference cannot exceed 100 characters.')
    }

    if (typeof notes !== 'string' || notes.trim().length > 1000) {
      throw httpError(400, 'Notes cannot exceed 1000 characters.')
    }

    const finalPaymentDate = paymentDate ? validatePaymentDate(paymentDate) : new Date()

    let createdPaymentId = null

    await session.withTransaction(async () => {
      const invoice = await Invoice.findOne({
        _id: invoiceId,
        companyId,
      }).session(session)

      if (!invoice) {
        throw httpError(404, 'Invoice not found.')
      }

      // WAREHOUSE ACCESS VALIDATION

      validateWarehouseAccess(req, invoice.warehouseId)

      if (!ALLOWED_INVOICE_STATUSES.includes(invoice.status)) {
        throw httpError(400, 'Payment can only be recorded against an approved invoice.')
      }

      const currentBalance = roundMoney(invoice.balanceAmount)

      if (finalAmount > currentBalance) {
        throw httpError(400, `Payment amount cannot exceed the outstanding balance of ${currentBalance}.`)
      }

      const newPaidAmount = roundMoney(invoice.paidAmount + finalAmount)

      const newBalanceAmount = roundMoney(invoice.balanceAmount - finalAmount)

      const newStatus = getInvoicePaymentStatus({
        paidAmount: newPaidAmount,
        balanceAmount: newBalanceAmount,
        dueDate: invoice.dueDate,
      })

      const invoiceUpdate = await Invoice.updateOne(
        {
          _id: invoice._id,
          companyId,
          status: { $in: ALLOWED_INVOICE_STATUSES },
          balanceAmount: { $gte: finalAmount },
        },
        {
          $inc: {
            paidAmount: finalAmount,
            balanceAmount: -finalAmount,
          },
          $set: {
            status: newStatus,
            updatedBy: userId,
          },
        },
        { session },
      )

      if (invoiceUpdate.modifiedCount !== 1) {
        throw httpError(409, 'Invoice balance changed. Please refresh and try again.')
      }

      const paymentNumber = await generatePaymentNumber(companyId, finalPaymentDate, session)

      const [payment] = await Payment.create(
        [
          {
            companyId,
            paymentNumber,
            invoiceId: invoice._id,
            customerId: invoice.customerId,
            paymentDate: finalPaymentDate,
            amount: finalAmount,
            paymentMode,
            transactionReference: transactionReference.trim(),
            notes: notes.trim(),
            status: 'Completed',
            refundedAmount: 0,
            refundHistory: [],
            recordedBy: userId,
          },
        ],
        { session },
      )

      createdPaymentId = payment._id
    })

    const payment = await populatePayment(
      Payment.findOne({
        _id: createdPaymentId,
        companyId,
      }),
    )

    return res.status(201).json({
      success: true,
      message: 'Payment recorded successfully.',
      data: payment,
    })
  } catch (error) {
    return handleError(res, error)
  } finally {
    await session.endSession()
  }
})

// UPDATE PAYMENT DETAILS

router.patch('/:id', permissionMiddleware('Payment', 'payment:update'), async (req, res) => {
  try {
    const companyId = requireCompanyId(getCompanyId(req))
    const userId = requireUserId(getUserId(req))
    const { id } = req.params

    if (!isValidObjectId(id)) {
      throw httpError(400, 'Invalid payment ID.')
    }

    const allowedFields = ['paymentDate', 'paymentMode', 'transactionReference', 'notes']

    const suppliedFields = Object.keys(req.body)

    if (suppliedFields.length === 0 || suppliedFields.some((field) => !allowedFields.includes(field))) {
      throw httpError(400, 'Only payment date, payment mode, transaction reference and notes can be updated.')
    }

    const payment = await Payment.findOne({
      _id: id,
      companyId,
    })

    if (!payment) {
      throw httpError(404, 'Payment not found.')
    }

    // WAREHOUSE ACCESS VALIDATION

    const invoice = await Invoice.findOne({
      _id: payment.invoiceId,
      companyId,
    }).select('warehouseId')

    if (!invoice) {
      throw httpError(404, 'Related invoice not found.')
    }

    validateWarehouseAccess(req, invoice.warehouseId)

    if (payment.status === 'Refunded') {
      throw httpError(400, 'A fully refunded payment cannot be updated.')
    }

    if (req.body.paymentDate !== undefined) {
      payment.paymentDate = validatePaymentDate(req.body.paymentDate)
    }

    if (req.body.paymentMode !== undefined) {
      if (!PAYMENT_MODES.includes(req.body.paymentMode)) {
        throw httpError(400, 'Invalid payment mode.')
      }

      payment.paymentMode = req.body.paymentMode
    }

    if (req.body.transactionReference !== undefined) {
      if (typeof req.body.transactionReference !== 'string' || req.body.transactionReference.trim().length > 100) {
        throw httpError(400, 'Transaction reference cannot exceed 100 characters.')
      }

      payment.transactionReference = req.body.transactionReference.trim()
    }

    if (req.body.notes !== undefined) {
      if (typeof req.body.notes !== 'string' || req.body.notes.trim().length > 1000) {
        throw httpError(400, 'Notes cannot exceed 1000 characters.')
      }

      payment.notes = req.body.notes.trim()
    }

    payment.updatedBy = userId

    await payment.save()

    const updatedPayment = await populatePayment(
      Payment.findOne({
        _id: payment._id,
        companyId,
      }),
    )

    return res.status(200).json({
      success: true,
      message: 'Payment details updated successfully.',
      data: updatedPayment,
    })
  } catch (error) {
    return handleError(res, error)
  }
})

// REFUND PAYMENT

router.post('/:id/refund', permissionMiddleware('Payment', 'payment:refund'), async (req, res) => {
  const session = await mongoose.startSession()

  try {
    const companyId = requireCompanyId(getCompanyId(req))
    const userId = requireUserId(getUserId(req))
    const { id } = req.params

    if (!isValidObjectId(id)) {
      throw httpError(400, 'Invalid payment ID.')
    }

    const refundAmount = parseNumber(req.body.amount)

    const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : ''

    if (refundAmount === null || refundAmount <= 0) {
      throw httpError(400, 'Refund amount must be greater than zero.')
    }

    const finalRefundAmount = roundMoney(refundAmount)

    if (!reason || reason.length < 3) {
      throw httpError(400, 'Refund reason must contain at least 3 characters.')
    }

    if (reason.length > 500) {
      throw httpError(400, 'Refund reason cannot exceed 500 characters.')
    }

    const refundDate = req.body.refundDate ? validatePaymentDate(req.body.refundDate) : new Date()

    await session.withTransaction(async () => {
      const payment = await Payment.findOne({
        _id: id,
        companyId,
      }).session(session)

      if (!payment) {
        throw httpError(404, 'Payment not found.')
      }

      const refundableAmount = roundMoney(payment.amount - payment.refundedAmount)

      if (finalRefundAmount > refundableAmount) {
        throw httpError(400, `Refund cannot exceed the remaining refundable amount of ${refundableAmount}.`)
      }

      const invoice = await Invoice.findOne({
        _id: payment.invoiceId,
        companyId,
      }).session(session)

      if (!invoice) {
        throw httpError(404, 'Related invoice not found.')
      }

      // WAREHOUSE ACCESS VALIDATION

      validateWarehouseAccess(req, invoice.warehouseId)

      if (invoice.status === 'Draft' || invoice.status === 'Cancelled') {
        throw httpError(400, 'Refund cannot be processed for a draft or cancelled invoice.')
      }

      if (invoice.paidAmount < finalRefundAmount) {
        throw httpError(409, 'Invoice paid amount is insufficient for this refund.')
      }

      const newPaidAmount = roundMoney(invoice.paidAmount - finalRefundAmount)

      const newBalanceAmount = roundMoney(invoice.balanceAmount + finalRefundAmount)

      const newInvoiceStatus = getInvoicePaymentStatus({
        paidAmount: newPaidAmount,
        balanceAmount: newBalanceAmount,
        dueDate: invoice.dueDate,
      })

      const invoiceUpdate = await Invoice.updateOne(
        {
          _id: invoice._id,
          companyId,
          paidAmount: { $gte: finalRefundAmount },
          status: { $nin: ['Draft', 'Cancelled'] },
        },
        {
          $inc: {
            paidAmount: -finalRefundAmount,
            balanceAmount: finalRefundAmount,
          },
          $set: {
            status: newInvoiceStatus,
            updatedBy: userId,
          },
        },
        { session },
      )

      if (invoiceUpdate.modifiedCount !== 1) {
        throw httpError(409, 'Invoice payment information changed. Please refresh and try again.')
      }

      payment.refundedAmount = roundMoney(payment.refundedAmount + finalRefundAmount)

      payment.status = payment.refundedAmount >= payment.amount ? 'Refunded' : 'Partially Refunded'

      payment.refundHistory.push({
        amount: finalRefundAmount,
        refundDate,
        reason,
        refundedBy: userId,
      })

      payment.updatedBy = userId

      await payment.save({ session })
    })

    const updatedPayment = await populatePayment(
      Payment.findOne({
        _id: id,
        companyId,
      }),
    )

    return res.status(200).json({
      success: true,
      message: 'Payment refund processed successfully.',
      data: updatedPayment,
    })
  } catch (error) {
    return handleError(res, error)
  } finally {
    await session.endSession()
  }
})

// DOWNLOAD PAYMENT RECEIPT PDF

router.get('/:id/receipt', permissionMiddleware('Payment', 'payment:view'), async (req, res) => {
  try {
    const companyId = requireCompanyId(getCompanyId(req))

    if (!isValidObjectId(req.params.id)) {
      throw httpError(400, 'Invalid payment ID.')
    }

    const payment = await Payment.findOne({
      _id: req.params.id,
      companyId,
    })
      .populate({
        path: 'customerId',
        select: 'customerName customerCode email phone gstNumber billingAddress city state pincode country',
      })
      .populate({
        path: 'invoiceId',
        select: 'invoiceNumber invoiceDate dueDate grandTotal paidAmount balanceAmount status warehouseId',
      })
      .populate({
        path: 'recordedBy',
        select: 'name email',
      })
      .populate({
        path: 'updatedBy',
        select: 'name email',
      })
      .populate({
        path: 'refundHistory.refundedBy',
        select: 'name email',
      })
      .lean()

    if (!payment) {
      throw httpError(404, 'Payment not found.')
    }

    if (!payment.invoiceId) {
      throw httpError(404, 'Related invoice not found.')
    }

    validateWarehouseAccess(req, payment.invoiceId.warehouseId)

    const Company = mongoose.model('CompanyEnterPrise')

    const company = await Company.findOne({
      _id: companyId,
      status: 'Approved',
    })
      .select('companyName companyEmail companyPhone addressLine1 addressLine2 city state country postalCode gstNumber panNumber currency logo')
      .lean()

    if (!company) {
      throw httpError(404, 'Company details not found.')
    }

    const pdfBuffer = await generatePaymentReceiptPDF(payment, company)

    const safePaymentNumber = String(payment.paymentNumber).replace(/[^a-zA-Z0-9_-]/g, '_')

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${safePaymentNumber}.pdf"`,
      'Content-Length': pdfBuffer.length,
      'Cache-Control': 'private, no-store',
    })

    return res.status(200).send(pdfBuffer)
  } catch (error) {
    return handleError(res, error)
  }
})

module.exports = router
