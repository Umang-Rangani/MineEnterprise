const express = require('express')
const mongoose = require('mongoose')

const Invoice = require('../models/Invoice')
const InvoiceCounter = require('../models/InvoiceCounter')
const SalesOrder = require('../models/SalesOrder')
const SalesDispatch = require('../models/SalesDispatch')
const Customer = require('../models/Customer')
const generateInvoicePDF = require('../utils/generateInvoicePDF')

const authMiddleware = require('../middleware/authMiddleware')
const permissionMiddleware = require('../middleware/permissionMiddleware')
const { sendEmail } = require('../utils/sendEmail')
const invoiceEmail = require('../utils/emailTemplates/invoiceEmail')


const router = express.Router()

router.use(authMiddleware)

// COMMON HELPERS

// INVOICE EMAIL HELPERS
const INVOICE_EMAIL_ALLOWED_STATUSES = ['Approved', 'Partially Paid', 'Paid', 'Overdue']

const getInvoiceEmailData = (invoice, company) => {
  return {
    invoice,
    company,
    customer: invoice.customerId,
  }
}

const sendAndRecordInvoiceEmail = async ({ invoice, company, userId, historyId, to, subject }) => {
  let emailStatus = 'Failed'
  let sentAt = null
  let emailError = ''
  let messageId = ''

  const safeTo = typeof to === 'string' ? to.trim() : ''

  try {
    if (!safeTo) {
      throw new Error('Customer email address is missing.')
    }

    const pdfBuffer = await generateInvoicePDF(invoice, company)

    const html = invoiceEmail(getInvoiceEmailData(invoice, company))

    const emailResult = await sendEmail({
      to: safeTo,
      subject,
      html,
      attachments: [
        {
          filename: `${invoice.invoiceNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    })

    emailStatus = 'Sent'
    sentAt = new Date()

    messageId = String(emailResult?.messageId || emailResult?.message?.messageId || '')
  } catch (error) {
    emailError = String(error?.message || 'Invoice email delivery failed.').slice(0, 1000)

    console.error('Invoice email delivery failed:', {
      invoiceNumber: invoice.invoiceNumber,
      message: emailError,
    })
  }

  const updatedInvoice = await Invoice.findOneAndUpdate(
    {
      _id: invoice._id,
      companyId: invoice.companyId,
      emailHistory: {
        $elemMatch: {
          _id: historyId,
          status: 'Pending',
        },
      },
    },
    {
      $set: {
        emailStatus,
        emailSentAt: sentAt,
        emailSentTo: safeTo,
        emailError,
        emailSentBy: userId,

        'emailHistory.$[event].status': emailStatus,
        'emailHistory.$[event].sentAt': sentAt,
        'emailHistory.$[event].messageId': messageId,
        'emailHistory.$[event].error': emailError,
      },
    },
    {
      new: true,
      runValidators: true,
      arrayFilters: [
        {
          'event._id': historyId,
          'event.status': 'Pending',
        },
      ],
    },
  ).lean()

  if (!updatedInvoice) {
    throw new Error('Email result could not be saved. Check invoice email history before retrying.')
  }

  return {
    status: emailStatus.toLowerCase(),
    message: emailStatus === 'Sent' ? 'Invoice email sent successfully.' : emailError,
    invoice: updatedInvoice,
  }
}

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id)

const getUserId = (req) => req.user?._id || req.user?.id || req.user?.userId

const getCompanyId = (req) => {
  if (req.user?.companyId) return req.user.companyId

  if (req.user?.role === 'SuperAdmin') {
    return req.body?.companyId || req.query?.companyId
  }

  return req.company?._id || req.company?.id || null
}

const httpError = (status, message) => {
  const error = new Error(message)
  error.status = status
  return error
}

const handleError = (res, error) => {
  console.error('Invoice Route Error:', error)

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'Duplicate invoice detected. Please try again.',
    })
  }

  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: error.message,
    })
  }

  return res.status(error.status || 500).json({
    success: false,
    message: error.status ? error.message : 'Something went wrong.',
  })
}

const parseNumber = (value, fieldName, options = {}) => {
  const number = Number(value)

  if (!Number.isFinite(number)) {
    throw httpError(400, `${fieldName} must be a valid number.`)
  }

  if (options.min !== undefined && number < options.min) {
    throw httpError(400, `${fieldName} cannot be less than ${options.min}.`)
  }

  return number
}

const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100

const requireCompanyId = (req) => {
  const companyId = getCompanyId(req)

  if (!companyId || !isValidObjectId(companyId)) {
    throw httpError(400, 'Valid company is required.')
  }

  return new mongoose.Types.ObjectId(companyId)
}

const requireUserId = (req) => {
  const userId = getUserId(req)

  if (!userId || !isValidObjectId(userId)) {
    throw httpError(401, 'Authenticated user not found.')
  }

  return new mongoose.Types.ObjectId(userId)
}

const validateDate = (value, fieldName, optional = false) => {
  if (!value && optional) return null

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    throw httpError(400, `${fieldName} is invalid.`)
  }

  return date
}

const validateDueDate = (invoiceDate, dueDate) => {
  if (dueDate && dueDate < invoiceDate) {
    throw httpError(400, 'Due date cannot be before invoice date.')
  }

  return dueDate
}

const generateInvoiceNumber = async (companyId, session, invoiceDate) => {
  const year = new Date(invoiceDate).getFullYear()

  const counter = await InvoiceCounter.findOneAndUpdate(
    { companyId, year },
    {
      $inc: { lastNumber: 1 },
      $setOnInsert: { companyId, year },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      session,
    },
  )

  return `INV-${year}-${String(counter.lastNumber).padStart(6, '0')}`
}

// WAREHOUSE ACCESS

const validateWarehouseAccess = (req, warehouseId) => {
  if (req.user?.role === 'SuperAdmin' || req.user?.role === 'CompanyAdmin') {
    return
  }

  const isManager = (req.user?.roles || []).some((role) => role.type === 'Predefined' && role.name === 'Manager')

  if (isManager) return

  const assignedWarehouses = req.user?.assignedWarehouses || []
  const defaultWarehouseId = req.user?.defaultWarehouseId

  const allowedWarehouses = new Set([...assignedWarehouses.map(String), ...(defaultWarehouseId ? [String(defaultWarehouseId)] : [])])

  if (!allowedWarehouses.has(String(warehouseId))) {
    throw httpError(403, 'You do not have access to this warehouse.')
  }
}

// CUSTOMER VALIDATION

const getActiveCustomer = async (companyId, customerId, session) => {
  if (!isValidObjectId(customerId)) {
    throw httpError(400, 'Valid customer is required.')
  }

  const customer = await Customer.findById(customerId).select('_id customerName companyId status').session(session).lean()

  if (!customer) {
    throw httpError(404, 'Customer not found.')
  }

  if (String(customer.companyId) !== String(companyId)) {
    throw httpError(400, 'Customer does not belong to this company.')
  }

  if (customer.status !== 'Active') {
    throw httpError(400, 'Customer is not Active.')
  }

  return customer
}

// SALES ORDER LOCK
// All invoice mutations for the same sales order use this lock.
// This prevents concurrent invoice creation from over-invoicing dispatch items.
const lockSalesOrder = async ({ companyId, orderId, session, allowCancelled = false }) => {
  const allowedStatuses = ['Approved', 'Partially Dispatched', 'Dispatched']

  if (allowCancelled) {
    allowedStatuses.push('Cancelled')
  }

  const order = await SalesOrder.findOneAndUpdate(
    {
      _id: orderId,
      companyId,
      status: { $in: allowedStatuses },
    },
    {
      $inc: { salesRevision: 1 },
    },
    {
      new: true,
      session,
    },
  )

  if (!order) {
    throw httpError(409, 'Sales order not found or is not eligible for invoicing.')
  }

  return order
}

// INVOICED QUANTITY CALCULATION

const getAlreadyInvoicedQuantities = async ({ companyId, dispatchIds, excludeInvoiceId, session }) => {
  const filter = {
    companyId,
    status: { $ne: 'Cancelled' },
    'items.dispatchId': { $in: dispatchIds },
  }

  if (excludeInvoiceId) {
    filter._id = { $ne: excludeInvoiceId }
  }

  const invoices = await Invoice.find(filter).select('items').session(session).lean()

  const quantities = new Map()

  for (const invoice of invoices) {
    for (const item of invoice.items || []) {
      const key = `${String(item.dispatchId)}_${String(item.dispatchItemId)}`

      quantities.set(key, (quantities.get(key) || 0) + Number(item.quantity || 0))
    }
  }

  return quantities
}

// BUILD INVOICE ITEMS
// Discount is allocated proportionally from the original Sales Order item.
// GST is calculated on the allocated taxable amount.

const buildInvoiceItems = async ({ companyId, order, inputItems, session, excludeInvoiceId = null }) => {
  if (!Array.isArray(inputItems) || inputItems.length === 0) {
    throw httpError(400, 'At least one dispatch item is required.')
  }

  const seenItems = new Set()
  const dispatchMap = new Map()
  const preparedItems = []

  for (const input of inputItems) {
    if (!isValidObjectId(input.dispatchId)) {
      throw httpError(400, 'Invalid dispatch selected.')
    }

    if (!isValidObjectId(input.dispatchItemId)) {
      throw httpError(400, 'Invalid dispatch item selected.')
    }

    const key = `${String(input.dispatchId)}_${String(input.dispatchItemId)}`

    if (seenItems.has(key)) {
      throw httpError(400, 'Duplicate dispatch items are not allowed.')
    }

    seenItems.add(key)

    const quantity = parseNumber(input.quantity, 'Invoice quantity', {
      min: 0.01,
    })

    let dispatch = dispatchMap.get(String(input.dispatchId))

    if (!dispatch) {
      dispatch = await SalesDispatch.findOne({
        _id: input.dispatchId,
        companyId,
        salesOrderId: order._id,
        status: 'Confirmed',
      }).session(session)

      if (!dispatch) {
        throw httpError(404, 'Confirmed dispatch not found.')
      }

      if (String(dispatch.warehouseId) !== String(order.warehouseId)) {
        throw httpError(400, 'Dispatch warehouse does not match the sales order.')
      }

      dispatchMap.set(String(input.dispatchId), dispatch)
    }

    const dispatchItem = dispatch.items.id(input.dispatchItemId)

    if (!dispatchItem) {
      throw httpError(404, 'Dispatch item not found.')
    }

    const orderItem = order.items.id(dispatchItem.salesOrderItemId)

    if (!orderItem) {
      throw httpError(404, 'Related sales order item not found.')
    }

    if (quantity > Number(dispatchItem.quantity)) {
      throw httpError(400, `Invoice quantity exceeds dispatched quantity for ${dispatchItem.productName}.`)
    }

    preparedItems.push({
      dispatchId: dispatch._id,
      dispatchItemId: dispatchItem._id,
      salesOrderItemId: orderItem._id,
      productId: orderItem.productId,
      productName: orderItem.productName,
      sku: orderItem.sku,
      unit: orderItem.unit,
      quantity,
      rate: Number(orderItem.rate),
      orderQuantity: Number(orderItem.quantity),
      orderDiscount: Number(orderItem.discount || 0),
      taxRate: Number(orderItem.taxRate || 0),
      dispatchItemQuantity: Number(dispatchItem.quantity),
    })
  }

  const dispatchIds = [...new Set(preparedItems.map((item) => String(item.dispatchId)))]

  const alreadyInvoiced = await getAlreadyInvoicedQuantities({
    companyId,
    dispatchIds,
    excludeInvoiceId,
    session,
  })

  const result = []

  for (const item of preparedItems) {
    const key = `${String(item.dispatchId)}_${String(item.dispatchItemId)}`

    const invoicedQuantity = alreadyInvoiced.get(key) || 0

    const remainingQuantity = roundMoney(item.dispatchItemQuantity - invoicedQuantity)

    if (item.quantity > remainingQuantity) {
      throw httpError(409, `Only ${remainingQuantity} quantity is available to invoice for ${item.productName}.`)
    }

    const grossAmount = roundMoney(item.quantity * item.rate)

    const discountPerUnit = item.orderQuantity > 0 ? item.orderDiscount / item.orderQuantity : 0

    const discount = roundMoney(discountPerUnit * item.quantity)

    if (discount > grossAmount) {
      throw httpError(400, 'Allocated discount cannot exceed item amount.')
    }

    const taxableAmount = roundMoney(grossAmount - discount)

    const taxAmount = roundMoney((taxableAmount * item.taxRate) / 100)

    const lineTotal = roundMoney(taxableAmount + taxAmount)

    result.push({
      dispatchId: item.dispatchId,
      dispatchItemId: item.dispatchItemId,
      salesOrderItemId: item.salesOrderItemId,
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      unit: item.unit,
      quantity: item.quantity,
      rate: item.rate,
      discount,
      taxRate: item.taxRate,
      taxAmount,
      lineTotal,
    })
  }

  return result
}

// TOTAL CALCULATION

const calculateInvoiceTotals = (items) => {
  const subtotal = roundMoney(items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.rate), 0))

  const discount = roundMoney(items.reduce((sum, item) => sum + Number(item.discount || 0), 0))

  const taxAmount = roundMoney(items.reduce((sum, item) => sum + Number(item.taxAmount || 0), 0))

  const grandTotal = roundMoney(subtotal - discount + taxAmount)

  return {
    subtotal,
    discount,
    taxAmount,
    grandTotal,
    paidAmount: 0,
    balanceAmount: grandTotal,
  }
}

// GET APPROVED COMPANY DETAILS FOR INVOICE EMAIL
const getInvoiceCompanyDetails = async (companyId) => {
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

  return company
}

// GET INVOICE DETAILS FOR EMAIL
const getInvoiceForEmail = async (invoiceId, companyId, req) => {
  if (!isValidObjectId(invoiceId)) {
    throw httpError(400, 'Invalid invoice ID.')
  }

  const invoice = await Invoice.findOne({
    _id: invoiceId,
    companyId,
  })
    .populate({
      path: 'customerId',
      select: 'customerName customerCode email phone gstNumber billingAddress city state pincode country',
    })
    .populate({
      path: 'salesOrderId',
      select: 'orderNumber salesOrderNumber',
    })
    .populate({
      path: 'warehouseId',
      select: 'warehouseName name code',
    })
    .populate({
      path: 'items.dispatchId',
      select: 'dispatchNumber dispatchDate status',
    })
    .lean()

  if (!invoice) {
    throw httpError(404, 'Invoice not found.')
  }

  validateWarehouseAccess(req, invoice.warehouseId?._id || invoice.warehouseId)

  if (!INVOICE_EMAIL_ALLOWED_STATUSES.includes(invoice.status)) {
    throw httpError(400, 'Invoice email can be sent only for approved invoices.')
  }

  console.log('INVOICE CUSTOMER EMAIL DEBUG:', {
    invoiceId: String(invoice._id),
    customerId: invoice.customerId?._id || invoice.customerId,
    customerName: invoice.customerId?.customerName,
    customerEmail: invoice.customerId?.email,
    isPopulated: typeof invoice.customerId === 'object' && Boolean(invoice.customerId?._id),
  })

  const customerEmail = invoice.customerId?.email

  if (!customerEmail || !String(customerEmail).trim()) {
    throw httpError(400, 'Customer email address is missing. Please update the customer details first.')
  }

  return invoice
}

// CREATE EMAIL ATTEMPT
// Atomic update prevents two users from sending the same invoice email simultaneously.

const createInvoiceEmailAttempt = async ({ invoiceId, companyId, userId, to, subject, retry = false }) => {
  const historyId = new mongoose.Types.ObjectId()

  const expectedEmailStatus = retry ? 'Failed' : { $in: ['Not Sent', null] }

  const invoice = await Invoice.findOneAndUpdate(
    {
      _id: invoiceId,   
      companyId,
      status: { $in: INVOICE_EMAIL_ALLOWED_STATUSES },
      emailStatus: expectedEmailStatus,
    },
    {
      $set: {
        emailStatus: 'Pending',
        emailError: '',
      },
      $push: {
        emailHistory: {
          _id: historyId,
          emailType: 'Invoice',
          to,
          subject,
          status: 'Pending',
          attemptedAt: new Date(),
          sentBy: userId,
          messageId: '',
          error: '',
        },
      },
    },
    {
      new: true,
      runValidators: true,
    },
  ).lean()

  if (!invoice) {
    const existingInvoice = await Invoice.findOne({
      _id: invoiceId,
      companyId,
    })
      .select('status emailStatus')
      .lean()

    console.log('INVOICE EMAIL STATUS DEBUG:', {
      invoiceId: String(invoiceId),
      status: existingInvoice?.status,
      emailStatus: existingInvoice?.emailStatus,
      emailStatusType: typeof existingInvoice?.emailStatus,
    })

    if (!existingInvoice) {
      throw httpError(404, 'Invoice not found.')
    }

    if (!INVOICE_EMAIL_ALLOWED_STATUSES.includes(existingInvoice.status)) {
      throw httpError(400, 'Invoice email can be sent only for approved invoices.')
    }

    if (existingInvoice.emailStatus === 'Pending') {
      throw httpError(409, 'Invoice email is already being processed. Please wait.')
    }

    if (existingInvoice.emailStatus === 'Sent') {
      throw httpError(400, 'Invoice email has already been sent successfully.')
    }

    if (retry && existingInvoice.emailStatus !== 'Failed') {
      throw httpError(400, 'Only failed invoice emails can be retried.')
    }

    if (!retry && existingInvoice.emailStatus !== 'Not Sent') {
      throw httpError(400, 'Invoice email cannot be sent in its current email status.')
    }

    throw httpError(409, 'Unable to create invoice email attempt. Please refresh and try again.')
  }

  return {
    invoice,
    historyId,
  }
}

// GET INVOICES
router.get('/', permissionMiddleware('Invoice', 'invoice:list'), async (req, res) => {
  try {
    const companyId = requireCompanyId(req)

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 10))

    const filter = { companyId }

    const isPrivilegedWarehouseUser = req.user?.role === 'SuperAdmin' || req.user?.role === 'CompanyAdmin' || (req.user?.roles || []).some((role) => role.type === 'Predefined' && role.name === 'Manager')

    if (!isPrivilegedWarehouseUser) {
      const allowedWarehouses = [...(req.user?.assignedWarehouses || []).map(String), ...(req.user?.defaultWarehouseId ? [String(req.user.defaultWarehouseId)] : [])]

      filter.warehouseId = {
        $in: [...new Set(allowedWarehouses)],
      }
    }

    if (req.query.status) {
      filter.status = req.query.status
    }

    if (req.query.customerId) {
      if (!isValidObjectId(req.query.customerId)) {
        throw httpError(400, 'Invalid customer filter.')
      }

      filter.customerId = req.query.customerId
    }

    if (req.query.salesOrderId) {
      if (!isValidObjectId(req.query.salesOrderId)) {
        throw httpError(400, 'Invalid sales order filter.')
      }

      filter.salesOrderId = req.query.salesOrderId
    }

    if (req.query.fromDate || req.query.toDate) {
      filter.invoiceDate = {}

      if (req.query.fromDate) {
        filter.invoiceDate.$gte = validateDate(req.query.fromDate, 'From date')
      }

      if (req.query.toDate) {
        const toDate = validateDate(req.query.toDate, 'To date')
        toDate.setHours(23, 59, 59, 999)
        filter.invoiceDate.$lte = toDate
      }
    }

    if (req.query.search?.trim()) {
      const search = req.query.search.trim()

      filter.$or = [{ invoiceNumber: { $regex: search, $options: 'i' } }, { notes: { $regex: search, $options: 'i' } }]
    }

    const [invoices, total] = await Promise.all([
      Invoice.find(filter)
        .populate('customerId', 'customerName customerCode phone email')
        .populate('salesOrderId', 'orderNumber')
        .populate('warehouseId', 'name code')
        .populate('createdBy', 'name email')
        .populate('approvedBy', 'name email')
        .sort({ invoiceDate: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      Invoice.countDocuments(filter),
    ])

    return res.json({
      success: true,
      data: invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    return handleError(res, error)
  }
})

// CREATE INVOICE - DRAFT
router.post('/', permissionMiddleware('Invoice', 'invoice:create'), async (req, res) => {
  const session = await mongoose.startSession()

  try {
    const companyId = requireCompanyId(req)
    const userId = requireUserId(req)

    let createdInvoice

    await session.withTransaction(async () => {
      if (!isValidObjectId(req.body.salesOrderId)) {
        throw httpError(400, 'Valid sales order is required.')
      }

      const order = await lockSalesOrder({
        companyId,
        orderId: req.body.salesOrderId,
        session,
      })

      const customer = await getActiveCustomer(companyId, order.customerId, session)

      validateWarehouseAccess(req, order.warehouseId)

      const items = await buildInvoiceItems({
        companyId,
        order,
        inputItems: req.body.items,
        session,
      })

      const totals = calculateInvoiceTotals(items)

      const invoiceDate = validateDate(req.body.invoiceDate || new Date(), 'Invoice date')

      const invoiceNumber = await generateInvoiceNumber(companyId, session, invoiceDate)

      const dueDate = validateDueDate(invoiceDate, validateDate(req.body.dueDate, 'Due date', true))
      const [invoice] = await Invoice.create(
        [
          {
            companyId,
            invoiceNumber,
            customerId: customer._id,
            salesOrderId: order._id,
            warehouseId: order.warehouseId,
            invoiceDate,
            dueDate,
            items,
            ...totals,
            status: 'Draft',
            notes: String(req.body.notes || '').trim(),
            createdBy: userId,
            updatedBy: userId,
          },
        ],
        { session },
      )

      createdInvoice = invoice
    })

    return res.status(201).json({
      success: true,
      message: 'Draft invoice created successfully.',
      data: createdInvoice,
    })
  } catch (error) {
    return handleError(res, error)
  } finally {
    await session.endSession()
  }
})

// GET SINGLE INVOICE
// GET SINGLE INVOICE

router.get('/:id', permissionMiddleware('Invoice', 'invoice:view'), async (req, res) => {
  try {
    const companyId = requireCompanyId(req)

    if (!isValidObjectId(req.params.id)) {
      throw httpError(400, 'Invalid invoice ID.')
    }

    const invoice = await Invoice.findOne({
      _id: req.params.id,
      companyId,
    })
      .populate({
        path: 'customerId',
        select: 'customerName customerCode email phone gstNumber billingAddress city state pincode country',
      })
      .populate({
        path: 'salesOrderId',
        select: 'orderNumber salesOrderNumber',
      })
      .populate({
        path: 'warehouseId',
        select: 'warehouseName name code',
      })
      .populate({
        path: 'items.dispatchId',
        select: 'dispatchNumber dispatchDate status',
      })
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('cancelledBy', 'name email')
      .lean()

    if (!invoice) {
      throw httpError(404, 'Invoice not found.')
    }

    validateWarehouseAccess(req, invoice.warehouseId?._id || invoice.warehouseId)

    return res.json({
      success: true,
      data: invoice,
    })
  } catch (error) {
    return handleError(res, error)
  }
})

// UPDATE DRAFT INVOICE
router.patch('/:id', permissionMiddleware('Invoice', 'invoice:update'), async (req, res) => {
  const session = await mongoose.startSession()

  try {
    const companyId = requireCompanyId(req)
    const userId = requireUserId(req)

    if (!isValidObjectId(req.params.id)) {
      throw httpError(400, 'Invalid invoice ID.')
    }

    let updatedInvoice

    await session.withTransaction(async () => {
      const invoice = await Invoice.findOne({
        _id: req.params.id,
        companyId,
      }).session(session)

      if (!invoice) {
        throw httpError(404, 'Invoice not found.')
      }

      if (invoice.status !== 'Draft') {
        throw httpError(400, 'Only Draft invoices can be edited.')
      }

      const order = await lockSalesOrder({
        companyId,
        orderId: invoice.salesOrderId,
        session,
      })

      validateWarehouseAccess(req, invoice.warehouseId)

      const inputItems =
        req.body.items !== undefined
          ? req.body.items
          : invoice.items.map((item) => ({
              dispatchId: item.dispatchId,
              dispatchItemId: item.dispatchItemId,
              quantity: item.quantity,
            }))

      const items = await buildInvoiceItems({
        companyId,
        order,
        inputItems,
        session,
        excludeInvoiceId: invoice._id,
      })

      const totals = calculateInvoiceTotals(items)

      invoice.items = items
      invoice.subtotal = totals.subtotal
      invoice.discount = totals.discount
      invoice.taxAmount = totals.taxAmount
      invoice.grandTotal = totals.grandTotal
      invoice.balanceAmount = totals.grandTotal - Number(invoice.paidAmount || 0)

      const finalInvoiceDate = req.body.invoiceDate !== undefined ? validateDate(req.body.invoiceDate, 'Invoice date') : invoice.invoiceDate

      const finalDueDate = req.body.dueDate !== undefined ? validateDate(req.body.dueDate, 'Due date', true) : invoice.dueDate

      validateDueDate(finalInvoiceDate, finalDueDate)

      invoice.invoiceDate = finalInvoiceDate
      invoice.dueDate = finalDueDate

      if (req.body.notes !== undefined) {
        invoice.notes = String(req.body.notes).trim()
      }

      invoice.updatedBy = userId

      await invoice.save({ session })

      updatedInvoice = invoice
    })

    return res.json({
      success: true,
      message: 'Draft invoice updated successfully.',
      data: updatedInvoice,
    })
  } catch (error) {
    return handleError(res, error)
  } finally {
    await session.endSession()
  }
})

// APPROVE INVOICE

router.patch('/:id/approve', permissionMiddleware('Invoice', 'invoice:approve'), async (req, res) => {
  const session = await mongoose.startSession()

  try {
    const companyId = requireCompanyId(req)
    const userId = requireUserId(req)

    if (!isValidObjectId(req.params.id)) {
      throw httpError(400, 'Invalid invoice ID.')
    }

    let approvedInvoice

    await session.withTransaction(async () => {
      const invoice = await Invoice.findOne({
        _id: req.params.id,
        companyId,
      }).session(session)

      if (!invoice) {
        throw httpError(404, 'Invoice not found.')
      }

      if (invoice.status !== 'Draft') {
        throw httpError(400, 'Only Draft invoices can be approved.')
      }

      const order = await lockSalesOrder({
        companyId,
        orderId: invoice.salesOrderId,
        session,
      })

      await getActiveCustomer(companyId, invoice.customerId, session)

      validateWarehouseAccess(req, invoice.warehouseId)

      // Revalidate dispatch quantities before final approval.
      const validatedItems = await buildInvoiceItems({
        companyId,
        order,
        inputItems: invoice.items.map((item) => ({
          dispatchId: item.dispatchId,
          dispatchItemId: item.dispatchItemId,
          quantity: item.quantity,
        })),
        session,
        excludeInvoiceId: invoice._id,
      })

      invoice.items = validatedItems

      const totals = calculateInvoiceTotals(validatedItems)

      invoice.subtotal = totals.subtotal
      invoice.discount = totals.discount
      invoice.taxAmount = totals.taxAmount
      invoice.grandTotal = totals.grandTotal
      invoice.balanceAmount = roundMoney(totals.grandTotal - Number(invoice.paidAmount || 0))

      invoice.status = Number(invoice.balanceAmount) <= 0 ? 'Paid' : 'Approved'

      invoice.approvedBy = userId
      invoice.approvedAt = new Date()
      invoice.updatedBy = userId

      await invoice.save({ session })

      approvedInvoice = invoice
    })

    return res.json({
      success: true,
      message: 'Invoice approved successfully.',
      data: approvedInvoice,
    })
  } catch (error) {
    return handleError(res, error)
  } finally {
    await session.endSession()
  }
})

// CANCEL INVOICE
router.patch('/:id/cancel', permissionMiddleware('Invoice', 'invoice:cancel'), async (req, res) => {
  const session = await mongoose.startSession()

  try {
    const companyId = requireCompanyId(req)
    const userId = requireUserId(req)

    if (!isValidObjectId(req.params.id)) {
      throw httpError(400, 'Invalid invoice ID.')
    }

    const reason = String(req.body.reason || '').trim()

    if (!reason) {
      throw httpError(400, 'Cancellation reason is required.')
    }

    let cancelledInvoice

    await session.withTransaction(async () => {
      const invoice = await Invoice.findOne({
        _id: req.params.id,
        companyId,
      }).session(session)

      if (!invoice) {
        throw httpError(404, 'Invoice not found.')
      }

      if (!['Draft', 'Approved'].includes(invoice.status)) {
        throw httpError(400, 'This invoice cannot be cancelled in its current status.')
      }

      if (Number(invoice.paidAmount || 0) > 0) {
        throw httpError(400, 'An invoice with received payments cannot be cancelled. Reverse or refund the payment first.')
      }

      const order = await lockSalesOrder({
        companyId,
        orderId: invoice.salesOrderId,
        session,
        allowCancelled: true,
      })

      validateWarehouseAccess(req, invoice.warehouseId)

      invoice.status = 'Cancelled'
      invoice.cancelledBy = userId
      invoice.cancelledAt = new Date()
      invoice.cancellationReason = reason
      invoice.updatedBy = userId

      await invoice.save({ session })

      cancelledInvoice = invoice
    })

    return res.json({
      success: true,
      message: 'Invoice cancelled successfully. Its dispatch quantities are available for invoicing again.',
      data: cancelledInvoice,
    })
  } catch (error) {
    return handleError(res, error)
  } finally {
    await session.endSession()
  }
})

// DOWNLOAD INVOICE PDF

router.get('/:id/pdf', permissionMiddleware('Invoice', 'invoice:download'), async (req, res) => {
  try {
    const companyId = requireCompanyId(req)

    if (!isValidObjectId(req.params.id)) {
      throw httpError(400, 'Invalid invoice ID.')
    }

    const invoice = await Invoice.findOne({
      _id: req.params.id,
      companyId,
    })
      .populate({
        path: 'customerId',
        select: 'customerName customerCode email phone gstNumber billingAddress city state pincode country',
      })
      .populate({
        path: 'salesOrderId',
        select: 'orderNumber salesOrderNumber',
      })
      .populate({
        path: 'warehouseId',
        select: 'warehouseName name code',
      })
      .populate({
        path: 'items.dispatchId',
        select: 'dispatchNumber dispatchDate status',
      })
      .lean()

    if (!invoice) {
      throw httpError(404, 'Invoice not found.')
    }

    validateWarehouseAccess(req, invoice.warehouseId?._id || invoice.warehouseId)

    if (!['Approved', 'Partially Paid', 'Paid', 'Overdue'].includes(invoice.status)) {
      throw httpError(400, 'PDF is available only for approved invoices.')
    }

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

    const pdfBuffer = await generateInvoicePDF(invoice, company)

    const safeInvoiceNumber = String(invoice.invoiceNumber).replace(/[^a-zA-Z0-9_-]/g, '_')

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${safeInvoiceNumber}.pdf"`,
      'Content-Length': pdfBuffer.length,
      'Cache-Control': 'private, no-store',
    })

    return res.status(200).send(pdfBuffer)
  } catch (error) {
    return handleError(res, error)
  }
})

// SEND INVOICE EMAIL
router.post('/:id/email', permissionMiddleware('Invoice', 'invoice:email'), async (req, res) => {
  try {
    const companyId = requireCompanyId(req)
    const userId = requireUserId(req)

    const invoice = await getInvoiceForEmail(req.params.id, companyId, req)

    const company = await getInvoiceCompanyDetails(companyId)

    const to = String(invoice.customerId.email).trim()

    const subject = `Invoice ${invoice.invoiceNumber} from ${company.companyName}`

    const { historyId } = await createInvoiceEmailAttempt({
      invoiceId: invoice._id,
      companyId,
      userId,
      to,
      subject,
      retry: false,
    })

    const result = await sendAndRecordInvoiceEmail({
      invoice,
      company,
      userId,
      historyId,
      to,
      subject,
    })

    if (result.status === 'failed') {
      return res.status(502).json({
        success: false,
        message: result.message || 'Invoice email could not be sent.',
        data: result.invoice,
      })
    }

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result.invoice,
    })
  } catch (error) {
    return handleError(res, error)
  }
})

// RETRY FAILED INVOICE EMAIL
router.patch('/:id/retry-email', permissionMiddleware('Invoice', 'invoice:email'), async (req, res) => {
  try {
    const companyId = requireCompanyId(req)
    const userId = requireUserId(req)

    const invoice = await getInvoiceForEmail(req.params.id, companyId, req)

    const company = await getInvoiceCompanyDetails(companyId)

    const to = String(invoice.customerId.email).trim()

    const subject = `Invoice ${invoice.invoiceNumber} from ${company.companyName}`

    const { historyId } = await createInvoiceEmailAttempt({
      invoiceId: invoice._id,
      companyId,
      userId,
      to,
      subject,
      retry: true,
    })

    const result = await sendAndRecordInvoiceEmail({
      invoice,
      company,
      userId,
      historyId,
      to,
      subject,
    })

    if (result.status === 'failed') {
      return res.status(502).json({
        success: false,
        message: result.message || 'Invoice email retry failed.',
        data: result.invoice,
      })
    }

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result.invoice,
    })
  } catch (error) {
    return handleError(res, error)
  }
})

module.exports = router
