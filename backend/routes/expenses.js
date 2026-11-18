const express = require('express')
const mongoose = require('mongoose')
const fs = require('fs')
const path = require('path')

const Expense = require('../models/Expense')
const ExpenseCounter = require('../models/ExpenseCounter')

const authMiddleware = require('../middleware/authMiddleware')
const permissionMiddleware = require('../middleware/permissionMiddleware')

const router = express.Router()

router.use(authMiddleware)

// HELPERS

const PAYMENT_MODES = ['Cash', 'Bank Transfer', 'UPI', 'Cheque', 'Other']

const ALLOWED_RECEIPT_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf']

const MAX_RECEIPT_SIZE = 4 * 1024 * 1024

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id)

const getUserId = (req) => req.user?._id || req.user?.id || req.user?.userId

const isSuperAdmin = (req) => req.user?.role === 'SuperAdmin' || (req.user?.roles || []).some((role) => role?.name === 'SuperAdmin')

const getCompanyId = (req) => {
  if (req.user?.companyId) return req.user.companyId

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
      message: 'Duplicate expense record found.',
    })
  }

  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: error.message,
    })
  }

  const status = error.status || 500

  if (status >= 500) {
    console.error('Expense API Error:', error)
  }

  return res.status(status).json({
    success: false,
    message: status >= 500 ? 'Internal Server Error' : error.message,
  })
}

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// COMPANY / USER VALIDATION

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

// NUMBER HELPERS

const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100

const parseNumber = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

// VALIDATION HELPERS

const validateExpenseDate = (value) => {
  const date = new Date(value)

  if (!value || Number.isNaN(date.getTime())) {
    throw httpError(400, 'Valid expense date is required.')
  }

  if (date > new Date()) {
    throw httpError(400, 'Expense date cannot be in the future.')
  }

  return date
}

const validateText = (value, field, maxLength, required = false) => {
  if (typeof value !== 'string') {
    throw httpError(400, `${field} must be a valid text value.`)
  }

  const text = value.trim()

  if (required && !text) {
    throw httpError(400, `${field} is required.`)
  }

  if (text.length > maxLength) {
    throw httpError(400, `${field} cannot exceed ${maxLength} characters.`)
  }

  return text
}

// AMOUNT CALCULATION

const calculateAmounts = (amount, taxRate) => {
  const taxAmount = roundMoney((amount * taxRate) / 100)

  return {
    taxAmount,
    totalAmount: roundMoney(amount + taxAmount),
  }
}

// EXPENSE NUMBER GENERATION

const generateExpenseNumber = async (companyId, expenseDate) => {
  const year = new Date(expenseDate).getFullYear()

  const counter = await ExpenseCounter.findOneAndUpdate(
    { companyId, year },
    {
      $inc: { lastNumber: 1 },
      $setOnInsert: { companyId, year },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  )

  return `EXP-${year}-${String(counter.lastNumber).padStart(6, '0')}`
}

// POPULATE EXPENSE

const populateExpense = (query) => {
  return query.populate('createdBy', 'name email').populate('updatedBy', 'name email').populate('approvedBy', 'name email').populate('deletedBy', 'name email').populate('expenseHistory.performedBy', 'name email')
}

// RECEIPT HELPERS

const getPublicUploadsDirectory = () => path.resolve(__dirname, '..', 'public', 'uploads')

const getExpenseReceiptDirectory = () => path.resolve(getPublicUploadsDirectory(), 'expenses')

// Receipt metadata from /upload API response
const getReceiptData = (receipt) => {
  if (receipt === undefined || receipt === null) {
    return null
  }

  if (typeof receipt !== 'object' || Array.isArray(receipt)) {
    throw httpError(400, 'Invalid receipt information.')
  }

  const filename = path.basename(String(receipt.filename || ''))

  const originalName = path.basename(String(receipt.originalName || ''))

  const filePath = String(receipt.path || '').trim()

  const mimeType = String(receipt.mimeType || '')

  const size = Number(receipt.size)

  if (!filename || !originalName || !filePath) {
    throw httpError(400, 'Receipt file information is incomplete.')
  }

  if (!ALLOWED_RECEIPT_MIME_TYPES.includes(mimeType)) {
    throw httpError(400, 'Only JPG, PNG and PDF receipts are allowed.')
  }

  if (!Number.isFinite(size) || size <= 0 || size > MAX_RECEIPT_SIZE) {
    throw httpError(400, 'Receipt file size cannot exceed 4 MB.')
  }

  // Only local Expense upload paths are allowed
  const normalizedPath = filePath.replace(/\\/g, '/')

  const pathMatch = normalizedPath.match(/^\/?uploads\/expenses\/([^/]+)$/)

  if (!pathMatch) {
    throw httpError(400, 'Invalid receipt file path.')
  }

  const storedFilename = path.basename(pathMatch[1])

  if (storedFilename !== filename || storedFilename.includes('..')) {
    throw httpError(400, 'Invalid receipt filename.')
  }

  return {
    filename,
    originalName,
    path: `/uploads/expenses/${filename}`,
    mimeType,
    size,
  }
}

// Get safe local receipt path
const getLocalReceiptPath = (receiptPath) => {
  if (!receiptPath) return null

  const normalizedPath = String(receiptPath).replace(/\\/g, '/')

  const match = normalizedPath.match(/^\/?uploads\/expenses\/([^/]+)$/)

  if (!match) return null

  const filename = path.basename(match[1])

  if (!filename || filename.includes('..')) {
    return null
  }

  const allowedDirectory = getExpenseReceiptDirectory()

  const fullPath = path.resolve(allowedDirectory, filename)

  if (!fullPath.startsWith(`${allowedDirectory}${path.sep}`)) {
    return null
  }

  return fullPath
}

// Delete local receipt
const removeReceiptFile = async (receipt) => {
  if (!receipt?.path) return

  try {
    const filePath = getLocalReceiptPath(receipt.path)

    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  } catch (error) {
    console.error('Expense receipt cleanup failed:', error.message)
  }
}

// EXPENSE HISTORY HELPERS

const getExpenseChanges = (oldExpense, newValues) => {
  const changes = []

  Object.entries(newValues).forEach(([field, newValue]) => {
    const oldValue = oldExpense[field]

    if (field === 'receiptFile') {
      const oldPath = oldValue?.path || ''
      const newPath = newValue?.path || ''

      if (oldPath !== newPath) {
        changes.push({
          field,
          oldValue: oldPath || null,
          newValue: newPath || null,
        })
      }

      return
    }

    if (String(oldValue ?? '') !== String(newValue ?? '')) {
      changes.push({
        field,
        oldValue: oldValue ?? null,
        newValue: newValue ?? null,
      })
    }
  })

  return changes
}

const requireDraftExpense = (expense) => {
  if (expense.status !== 'Draft') {
    throw httpError(400, 'Only draft expenses can be updated or deleted.')
  }
}

// CONCURRENCY HELPERS

const getExpenseVersion = (expense) => Number(expense.__v || 0)

const getConcurrencyFilter = (expense) => ({
  _id: expense._id,
  companyId: expense.companyId,
  isDeleted: false,
  status: 'Draft',
  __v: getExpenseVersion(expense),
})

const throwUpdateConflict = async (companyId, expenseId) => {
  const currentExpense = await Expense.findOne({
    _id: expenseId,
    companyId,
    isDeleted: false,
  }).select('_id status')

  if (!currentExpense) {
    throw httpError(404, 'Expense not found.')
  }

  if (currentExpense.status !== 'Draft') {
    throw httpError(409, 'This expense is no longer in Draft status. Refresh and try again.')
  }

  throw httpError(409, 'This expense was modified by another request. Refresh and try again.')
}

// GET ALL EXPENSES

router.get('/', permissionMiddleware('Expense', 'expense:list'), async (req, res) => {
  try {
    const companyId = requireCompanyId(getCompanyId(req))

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1)

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100)

    const skip = (page - 1) * limit

    const filter = {
      companyId,
      isDeleted: false,
    }

    if (req.query.status) {
      if (!['Draft', 'Approved'].includes(req.query.status)) {
        throw httpError(400, 'Invalid expense status.')
      }

      filter.status = req.query.status
    }

    if (req.query.category?.trim()) {
      filter.expenseCategory = {
        $regex: escapeRegex(req.query.category.trim()),
        $options: 'i',
      }
    }

    if (req.query.startDate || req.query.endDate) {
      filter.expenseDate = {}

      if (req.query.startDate) {
        const startDate = new Date(req.query.startDate)

        if (Number.isNaN(startDate.getTime())) {
          throw httpError(400, 'Invalid start date.')
        }

        filter.expenseDate.$gte = startDate
      }

      if (req.query.endDate) {
        const endDate = new Date(req.query.endDate)

        if (Number.isNaN(endDate.getTime())) {
          throw httpError(400, 'Invalid end date.')
        }

        endDate.setHours(23, 59, 59, 999)
        filter.expenseDate.$lte = endDate
      }

      if (filter.expenseDate.$gte && filter.expenseDate.$lte && filter.expenseDate.$gte > filter.expenseDate.$lte) {
        throw httpError(400, 'Start date cannot be after end date.')
      }
    }

    if (req.query.search?.trim()) {
      const search = escapeRegex(req.query.search.trim())

      filter.$or = [
        { expenseNumber: { $regex: search, $options: 'i' } },
        { expenseCategory: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { receiptNumber: { $regex: search, $options: 'i' } },
        {
          transactionReference: {
            $regex: search,
            $options: 'i',
          },
        },
      ]
    }

    const [expenses, total] = await Promise.all([populateExpense(Expense.find(filter).sort({ expenseDate: -1, createdAt: -1 }).skip(skip).limit(limit)), Expense.countDocuments(filter)])

    return res.status(200).json({
      success: true,
      message: 'Expenses fetched successfully.',
      data: expenses,
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

// GET SINGLE EXPENSE

router.get('/:id', permissionMiddleware('Expense', 'expense:view'), async (req, res) => {
  try {
    const companyId = requireCompanyId(getCompanyId(req))
    const { id } = req.params

    if (!isValidObjectId(id)) {
      throw httpError(400, 'Invalid expense ID.')
    }

    const expense = await populateExpense(
      Expense.findOne({
        _id: id,
        companyId,
        isDeleted: false,
      }),
    )

    if (!expense) {
      throw httpError(404, 'Expense not found.')
    }

    return res.status(200).json({
      success: true,
      message: 'Expense fetched successfully.',
      data: expense,
    })
  } catch (error) {
    return handleError(res, error)
  }
})

// CREATE EXPENSE

router.post('/', permissionMiddleware('Expense', 'expense:create'), async (req, res) => {
  try {
    const companyId = requireCompanyId(getCompanyId(req))
    const userId = requireUserId(getUserId(req))

    const expenseCategory = validateText(req.body.expenseCategory, 'Expense category', 100, true)

    const title = validateText(req.body.title, 'Expense title', 150, true)

    const description = validateText(req.body.description || '', 'Description', 2000)

    const amount = parseNumber(req.body.amount)
    const taxRate = parseNumber(req.body.taxRate ?? 0)

    if (amount === null || amount <= 0) {
      throw httpError(400, 'Expense amount must be greater than zero.')
    }

    if (taxRate === null || taxRate < 0 || taxRate > 100) {
      throw httpError(400, 'Tax rate must be between 0 and 100.')
    }

    if (!PAYMENT_MODES.includes(req.body.paymentMode)) {
      throw httpError(400, 'Invalid payment mode.')
    }

    const expenseDate = req.body.expenseDate ? validateExpenseDate(req.body.expenseDate) : new Date()

    const transactionReference = validateText(req.body.transactionReference || '', 'Transaction reference', 100)

    const receiptNumber = validateText(req.body.receiptNumber || '', 'Receipt number', 100)

    // Receipt metadata comes from the separate /upload API
    const receiptFile = getReceiptData(req.body.receiptFile)

    const finalAmount = roundMoney(amount)
    const finalTaxRate = roundMoney(taxRate)

    const amounts = calculateAmounts(finalAmount, finalTaxRate)

    const expenseNumber = await generateExpenseNumber(companyId, expenseDate)

    const expense = await Expense.create({
      companyId,
      expenseNumber,
      expenseCategory,
      title,
      description,
      expenseDate,
      amount: finalAmount,
      taxRate: finalTaxRate,
      taxAmount: amounts.taxAmount,
      totalAmount: amounts.totalAmount,
      paymentMode: req.body.paymentMode,
      transactionReference,
      receiptNumber,
      receiptFile: receiptFile || {},
      status: 'Draft',
      createdBy: userId,
      expenseHistory: [
        {
          action: 'Created',
          fromStatus: '',
          toStatus: 'Draft',
          performedBy: userId,
        },
      ],
    })

    const populatedExpense = await populateExpense(Expense.findById(expense._id))

    return res.status(201).json({
      success: true,
      message: 'Expense created successfully.',
      data: populatedExpense,
    })
  } catch (error) {
    return handleError(res, error)
  }
})

// UPDATE EXPENSE

router.patch('/:id', permissionMiddleware('Expense', 'expense:update'), async (req, res) => {
  try {
    const companyId = requireCompanyId(getCompanyId(req))
    const userId = requireUserId(getUserId(req))
    const { id } = req.params

    if (!isValidObjectId(id)) {
      throw httpError(400, 'Invalid expense ID.')
    }

    const expense = await Expense.findOne({
      _id: id,
      companyId,
      isDeleted: false,
    })

    if (!expense) {
      throw httpError(404, 'Expense not found.')
    }

    requireDraftExpense(expense)

    const allowedFields = ['expenseCategory', 'title', 'description', 'expenseDate', 'amount', 'taxRate', 'paymentMode', 'transactionReference', 'receiptNumber', 'receiptFile']

    const suppliedFields = Object.keys(req.body).filter((field) => field !== 'companyId')

    if (suppliedFields.length === 0) {
      throw httpError(400, 'No expense details were provided for update.')
    }

    if (suppliedFields.some((field) => !allowedFields.includes(field))) {
      throw httpError(400, 'One or more fields cannot be updated.')
    }

    const oldReceipt = expense.receiptFile
    const newValues = {}

    if (req.body.expenseCategory !== undefined) {
      newValues.expenseCategory = validateText(req.body.expenseCategory, 'Expense category', 100, true)
    }

    if (req.body.title !== undefined) {
      newValues.title = validateText(req.body.title, 'Expense title', 150, true)
    }

    if (req.body.description !== undefined) {
      newValues.description = validateText(req.body.description, 'Description', 2000)
    }

    if (req.body.expenseDate !== undefined) {
      newValues.expenseDate = validateExpenseDate(req.body.expenseDate)
    }

    if (req.body.amount !== undefined) {
      const amount = parseNumber(req.body.amount)

      if (amount === null || amount <= 0) {
        throw httpError(400, 'Expense amount must be greater than zero.')
      }

      newValues.amount = roundMoney(amount)
    }

    if (req.body.taxRate !== undefined) {
      const taxRate = parseNumber(req.body.taxRate)

      if (taxRate === null || taxRate < 0 || taxRate > 100) {
        throw httpError(400, 'Tax rate must be between 0 and 100.')
      }

      newValues.taxRate = roundMoney(taxRate)
    }

    if (req.body.paymentMode !== undefined) {
      if (!PAYMENT_MODES.includes(req.body.paymentMode)) {
        throw httpError(400, 'Invalid payment mode.')
      }

      newValues.paymentMode = req.body.paymentMode
    }

    if (req.body.transactionReference !== undefined) {
      newValues.transactionReference = validateText(req.body.transactionReference, 'Transaction reference', 100)
    }

    if (req.body.receiptNumber !== undefined) {
      newValues.receiptNumber = validateText(req.body.receiptNumber, 'Receipt number', 100)
    }

    let newReceipt = null

    if (req.body.receiptFile !== undefined) {
      newReceipt = getReceiptData(req.body.receiptFile)

      if (!newReceipt) {
        throw httpError(400, 'Invalid receipt information.')
      }

      newValues.receiptFile = newReceipt
    }

    const changes = getExpenseChanges(expense, newValues)

    const finalAmount = newValues.amount ?? expense.amount

    const finalTaxRate = newValues.taxRate ?? expense.taxRate

    const amounts = calculateAmounts(finalAmount, finalTaxRate)

    if (expense.taxAmount !== amounts.taxAmount) {
      changes.push({
        field: 'taxAmount',
        oldValue: expense.taxAmount,
        newValue: amounts.taxAmount,
      })
    }

    if (expense.totalAmount !== amounts.totalAmount) {
      changes.push({
        field: 'totalAmount',
        oldValue: expense.totalAmount,
        newValue: amounts.totalAmount,
      })
    }

    const updateData = {
      ...newValues,
      taxAmount: amounts.taxAmount,
      totalAmount: amounts.totalAmount,
      updatedBy: userId,
    }

    const updatedExpense = await Expense.findOneAndUpdate(
      getConcurrencyFilter(expense),
      {
        $set: updateData,
        $push: {
          expenseHistory: {
            action: 'Edited',
            fromStatus: 'Draft',
            toStatus: 'Draft',
            performedBy: userId,
            changes,
          },
        },
        $inc: { __v: 1 },
      },
      {
        new: true,
        runValidators: true,
      },
    )

    if (!updatedExpense) {
      await throwUpdateConflict(companyId, id)
    }

    // Delete old receipt only after successful DB update
    if (newReceipt && oldReceipt?.path && oldReceipt.path !== newReceipt.path) {
      await removeReceiptFile(oldReceipt)
    }

    const populatedExpense = await populateExpense(Expense.findById(updatedExpense._id))

    return res.status(200).json({
      success: true,
      message: 'Expense updated successfully.',
      data: populatedExpense,
    })
  } catch (error) {
    return handleError(res, error)
  }
})

// APPROVE EXPENSE

router.patch('/:id/approve', permissionMiddleware('Expense', 'expense:approve'), async (req, res) => {
  try {
    const companyId = requireCompanyId(getCompanyId(req))
    const userId = requireUserId(getUserId(req))
    const { id } = req.params

    if (!isValidObjectId(id)) {
      throw httpError(400, 'Invalid expense ID.')
    }

    const expense = await Expense.findOne({
      _id: id,
      companyId,
      isDeleted: false,
    })

    if (!expense) {
      throw httpError(404, 'Expense not found.')
    }

    requireDraftExpense(expense)

    const approvedExpense = await Expense.findOneAndUpdate(
      getConcurrencyFilter(expense),
      {
        $set: {
          status: 'Approved',
          approvedBy: userId,
          approvedAt: new Date(),
          updatedBy: userId,
        },
        $push: {
          expenseHistory: {
            action: 'Approved',
            fromStatus: 'Draft',
            toStatus: 'Approved',
            performedBy: userId,
          },
        },
        $inc: { __v: 1 },
      },
      {
        new: true,
        runValidators: true,
      },
    )

    if (!approvedExpense) {
      await throwUpdateConflict(companyId, id)
    }

    const populatedExpense = await populateExpense(Expense.findById(approvedExpense._id))

    return res.status(200).json({
      success: true,
      message: 'Expense approved successfully.',
      data: populatedExpense,
    })
  } catch (error) {
    return handleError(res, error)
  }
})

// SOFT DELETE EXPENSE

router.delete('/:id', permissionMiddleware('Expense', 'expense:delete'), async (req, res) => {
  try {
    const companyId = requireCompanyId(getCompanyId(req))
    const userId = requireUserId(getUserId(req))
    const { id } = req.params

    if (!isValidObjectId(id)) {
      throw httpError(400, 'Invalid expense ID.')
    }

    const expense = await Expense.findOne({
      _id: id,
      companyId,
      isDeleted: false,
    })

    if (!expense) {
      throw httpError(404, 'Expense not found.')
    }

    requireDraftExpense(expense)

    const deletedExpense = await Expense.findOneAndUpdate(
      getConcurrencyFilter(expense),
      {
        $set: {
          isDeleted: true,
          deletedBy: userId,
          deletedAt: new Date(),
          updatedBy: userId,
        },
        $push: {
          expenseHistory: {
            action: 'Deleted',
            fromStatus: 'Draft',
            toStatus: 'Deleted',
            performedBy: userId,
          },
        },
        $inc: { __v: 1 },
      },
      {
        new: true,
        runValidators: true,
      },
    )

    if (!deletedExpense) {
      await throwUpdateConflict(companyId, id)
    }

    return res.status(200).json({
      success: true,
      message: 'Expense deleted successfully.',
    })
  } catch (error) {
    return handleError(res, error)
  }
})

// VIEW / DOWNLOAD EXPENSE RECEIPT

router.get('/:id/receipt', permissionMiddleware('Expense', 'expense:view'), async (req, res) => {
  try {
    const companyId = requireCompanyId(getCompanyId(req))

    if (!isValidObjectId(req.params.id)) {
      throw httpError(400, 'Invalid expense ID.')
    }

    const expense = await Expense.findOne({
      _id: req.params.id,
      companyId,
      isDeleted: false,
    }).select('expenseNumber receiptFile')

    if (!expense) {
      throw httpError(404, 'Expense not found.')
    }

    const receipt = expense.receiptFile

    if (!receipt?.path) {
      throw httpError(404, 'No receipt file is attached to this expense.')
    }

    if (!ALLOWED_RECEIPT_MIME_TYPES.includes(receipt.mimeType)) {
      throw httpError(400, 'Invalid receipt file type.')
    }

    const filePath = getLocalReceiptPath(receipt.path)

    if (!filePath || !fs.existsSync(filePath)) {
      throw httpError(404, 'Receipt file not found.')
    }

    const safeExpenseNumber = String(expense.expenseNumber).replace(/[^a-zA-Z0-9_-]/g, '_')

    res.set({
      'Content-Type': receipt.mimeType,
      'Content-Disposition': `inline; filename="${safeExpenseNumber}-receipt${path.extname(receipt.filename)}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    })

    return res.sendFile(filePath)
  } catch (error) {
    return handleError(res, error)
  }
})

module.exports = router
