const express = require('express')
const mongoose = require('mongoose')

const JournalEntry = require('../models/JournalEntry')
const JournalEntryCounter = require('../models/JournalEntryCounter')
const ChartOfAccount = require('../models/ChartOfAccount')
const User = require('../models/User')

const authMiddleware = require('../middleware/authMiddleware')
const permissionMiddleware = require('../middleware/permissionMiddleware')

const router = express.Router()

router.use(authMiddleware)

// HELPERS

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id)

const getUserId = (req) => req.user?._id || req.user?.id || req.user?.userId

const getCompanyId = (req) => req.user?.companyId || req.company?._id || req.company?.id

const httpError = (status, message) => {
  const error = new Error(message)
  error.status = status
  return error
}

const handleError = (res, error) => {
  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'Journal number already exists.',
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
    console.error('Journal Entries API Error:', error)
  }

  return res.status(status).json({
    success: false,
    message: status >= 500 ? 'Internal Server Error' : error.message,
  })
}

const requireCompanyId = (id) => {
  if (!id || !isValidObjectId(id)) {
    throw httpError(400, 'Valid company ID is required.')
  }

  return id
}

const requireUserId = (id) => {
  if (!id || !isValidObjectId(id)) {
    throw httpError(401, 'Authenticated user information is missing.')
  }

  return id
}

const validateText = (value, field, maxLength, required = false) => {
  if (typeof value !== 'string') {
    throw httpError(400, `${field} must be valid text.`)
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

// JOURNAL NUMBER

const generateJournalNumber = async (companyId, entryDate) => {
  const year = new Date(entryDate).getFullYear()

  const counter = await JournalEntryCounter.findOneAndUpdate(
    { companyId },
    {
      $inc: { lastNumber: 1 },
      $setOnInsert: { companyId },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  )

  return `JE-${year}-${String(counter.lastNumber).padStart(6, '0')}`
}

// VALIDATE JOURNAL LINES

const validateJournalLines = async (companyId, lines) => {
  if (!Array.isArray(lines) || lines.length < 2) {
    throw httpError(400, 'At least two journal lines are required.')
  }

  const normalizedLines = lines.map((line) => {
    if (!line.accountId || !isValidObjectId(line.accountId)) {
      throw httpError(400, 'Every line must have a valid account.')
    }

    const debit = Number(line.debit || 0)
    const credit = Number(line.credit || 0)

    if (!Number.isFinite(debit) || !Number.isFinite(credit)) {
      throw httpError(400, 'Invalid debit or credit amount.')
    }

    if (debit < 0 || credit < 0) {
      throw httpError(400, 'Debit and credit cannot be negative.')
    }

    if ((debit > 0 && credit > 0) || (debit === 0 && credit === 0)) {
      throw httpError(400, 'Each line must have either debit or credit amount.')
    }

    const description = validateText(line.description || '', 'Line description', 500)

    return {
      accountId: line.accountId,
      description,
      debit: Math.round(debit * 100) / 100,
      credit: Math.round(credit * 100) / 100,
    }
  })

  const accountIds = [...new Set(normalizedLines.map((line) => String(line.accountId)))]

  const accounts = await ChartOfAccount.find({
    _id: { $in: accountIds },
    companyId,
    isActive: true,
  }).select('_id')

  if (accounts.length !== accountIds.length) {
    throw httpError(400, 'One or more accounts are invalid or inactive.')
  }

  const totalDebit = Math.round(normalizedLines.reduce((sum, line) => sum + line.debit, 0) * 100) / 100

  const totalCredit = Math.round(normalizedLines.reduce((sum, line) => sum + line.credit, 0) * 100) / 100

  if (totalDebit <= 0 || totalCredit <= 0) {
    throw httpError(400, 'Journal entry must contain debit and credit amounts.')
  }

  if (Math.abs(totalDebit - totalCredit) > 0.009) {
    throw httpError(400, 'Total debit and total credit must be equal.')
  }

  return {
    lines: normalizedLines,
    totalDebit,
    totalCredit,
  }
}

// VALIDATE ENTRY DATE

const validateEntryDate = (value) => {
  const date = new Date(value)

  if (!value || Number.isNaN(date.getTime())) {
    throw httpError(400, 'Valid entry date is required.')
  }

  return date
}

// GET ALL JOURNAL ENTRIES

router.get('/', permissionMiddleware('Accounting', 'accounting:view'), async (req, res) => {
  try {
    const companyId = requireCompanyId(getCompanyId(req))

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 10))

    const filter = { companyId }

    if (req.query.status) {
      if (!['Draft', 'Posted', 'Cancelled'].includes(req.query.status)) {
        throw httpError(400, 'Invalid journal status.')
      }

      filter.status = req.query.status
    }

    if (req.query.search?.trim()) {
      const search = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

      filter.$or = [{ journalNumber: { $regex: search, $options: 'i' } }, { referenceNumber: { $regex: search, $options: 'i' } }, { narration: { $regex: search, $options: 'i' } }]
    }

    const [entries, total] = await Promise.all([
      JournalEntry.find(filter)
        .populate('createdBy', 'name email')
        .populate('postedBy', 'name email')
        .sort({ entryDate: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      JournalEntry.countDocuments(filter),
    ])

    return res.status(200).json({
      success: true,
      message: 'Journal entries fetched successfully.',
      data: entries,
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

// GET SINGLE JOURNAL ENTRY

router.get('/:id', permissionMiddleware('Accounting', 'accounting:view'), async (req, res) => {
  try {
    const companyId = requireCompanyId(getCompanyId(req))

    if (!isValidObjectId(req.params.id)) {
      throw httpError(400, 'Invalid journal entry ID.')
    }

    const entry = await JournalEntry.findOne({
      _id: req.params.id,
      companyId,
    })
      .populate('lines.accountId', 'accountCode accountName accountType')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('postedBy', 'name email')

    if (!entry) {
      throw httpError(404, 'Journal entry not found.')
    }

    return res.status(200).json({
      success: true,
      message: 'Journal entry fetched successfully.',
      data: entry,
    })
  } catch (error) {
    return handleError(res, error)
  }
})

// CREATE JOURNAL ENTRY

router.post('/', permissionMiddleware('Accounting', 'accounting:journal-entry'), async (req, res) => {
  try {
    const companyId = requireCompanyId(getCompanyId(req))
    const userId = requireUserId(getUserId(req))

    const entryDate = validateEntryDate(req.body.entryDate)

    const narration = validateText(req.body.narration, 'Narration', 2000, true)

    const referenceNumber = validateText(req.body.referenceNumber || '', 'Reference number', 100)

    const validated = await validateJournalLines(companyId, req.body.lines)

    const journalNumber = await generateJournalNumber(companyId, entryDate)

    const [entry] = await JournalEntry.create([
      {
        companyId,
        journalNumber,
        entryDate,
        referenceNumber,
        narration,
        lines: validated.lines,
        totalDebit: validated.totalDebit,
        totalCredit: validated.totalCredit,
        status: 'Draft',
        sourceType: 'Manual',
        createdBy: userId,
        updatedBy: userId,
      },
    ])

    return res.status(201).json({
      success: true,
      message: 'Journal entry created successfully.',
      data: entry,
    })
  } catch (error) {
    return handleError(res, error)
  }
})

// UPDATE DRAFT JOURNAL ENTRY

router.patch('/:id', permissionMiddleware('Accounting', 'accounting:journal-entry'), async (req, res) => {
  try {
    const companyId = requireCompanyId(getCompanyId(req))
    const userId = requireUserId(getUserId(req))

    if (!isValidObjectId(req.params.id)) {
      throw httpError(400, 'Invalid journal entry ID.')
    }

    const entry = await JournalEntry.findOne({
      _id: req.params.id,
      companyId,
    })

    if (!entry) {
      throw httpError(404, 'Journal entry not found.')
    }

    if (entry.status !== 'Draft' || entry.sourceType !== 'Manual') {
      throw httpError(400, 'Only manual draft entries can be edited.')
    }

    const allowedFields = ['entryDate', 'referenceNumber', 'narration', 'lines']

    const suppliedFields = Object.keys(req.body)

    if (suppliedFields.length === 0 || suppliedFields.some((field) => !allowedFields.includes(field))) {
      throw httpError(400, 'Invalid journal entry update fields.')
    }

    const updateData = {}

    if (req.body.entryDate !== undefined) {
      updateData.entryDate = validateEntryDate(req.body.entryDate)
    }

    if (req.body.referenceNumber !== undefined) {
      updateData.referenceNumber = validateText(req.body.referenceNumber, 'Reference number', 100)
    }

    if (req.body.narration !== undefined) {
      updateData.narration = validateText(req.body.narration, 'Narration', 2000, true)
    }

    if (req.body.lines !== undefined) {
      const validated = await validateJournalLines(companyId, req.body.lines)

      updateData.lines = validated.lines
      updateData.totalDebit = validated.totalDebit
      updateData.totalCredit = validated.totalCredit
    }

    updateData.updatedBy = userId

    const updatedEntry = await JournalEntry.findOneAndUpdate(
      {
        _id: entry._id,
        companyId,
        status: 'Draft',
        __v: entry.__v,
      },
      {
        $set: updateData,
        $inc: { __v: 1 },
      },
      {
        new: true,
        runValidators: true,
      },
    )

    if (!updatedEntry) {
      throw httpError(409, 'Journal entry was modified. Refresh and try again.')
    }

    return res.status(200).json({
      success: true,
      message: 'Journal entry updated successfully.',
      data: updatedEntry,
    })
  } catch (error) {
    return handleError(res, error)
  }
})

// POST JOURNAL ENTRY

router.patch('/:id/post', permissionMiddleware('Accounting', 'accounting:journal-entry'), async (req, res) => {
  try {
    const companyId = requireCompanyId(getCompanyId(req))
    const userId = requireUserId(getUserId(req))

    if (!isValidObjectId(req.params.id)) {
      throw httpError(400, 'Invalid journal entry ID.')
    }

    const entry = await JournalEntry.findOne({
      _id: req.params.id,
      companyId,
    })

    if (!entry) {
      throw httpError(404, 'Journal entry not found.')
    }

    if (entry.status !== 'Draft') {
      throw httpError(400, 'Only draft journal entries can be posted.')
    }

    const validated = await validateJournalLines(companyId, entry.lines)

    const postedEntry = await JournalEntry.findOneAndUpdate(
      {
        _id: entry._id,
        companyId,
        status: 'Draft',
        __v: entry.__v,
      },
      {
        $set: {
          status: 'Posted',
          totalDebit: validated.totalDebit,
          totalCredit: validated.totalCredit,
          postedBy: userId,
          postedAt: new Date(),
          updatedBy: userId,
        },
        $inc: { __v: 1 },
      },
      {
        new: true,
        runValidators: true,
      },
    )

    if (!postedEntry) {
      throw httpError(409, 'Journal entry was modified. Refresh and try again.')
    }

    return res.status(200).json({
      success: true,
      message: 'Journal entry posted successfully.',
      data: postedEntry,
    })
  } catch (error) {
    return handleError(res, error)
  }
})

// CANCEL DRAFT JOURNAL ENTRY

router.patch('/:id/cancel', permissionMiddleware('Accounting', 'accounting:journal-entry'), async (req, res) => {
  try {
    const companyId = requireCompanyId(getCompanyId(req))
    const userId = requireUserId(getUserId(req))

    if (!isValidObjectId(req.params.id)) {
      throw httpError(400, 'Invalid journal entry ID.')
    }

    const reason = validateText(req.body.reason, 'Cancellation reason', 500, true)

    if (reason.length < 3) {
      throw httpError(400, 'Cancellation reason must be at least 3 characters.')
    }

    const entry = await JournalEntry.findOneAndUpdate(
      {
        _id: req.params.id,
        companyId,
        status: 'Draft',
      },
      {
        $set: {
          status: 'Cancelled',
          cancellationReason: reason,
          cancelledBy: userId,
          cancelledAt: new Date(),
          updatedBy: userId,
        },
        $inc: { __v: 1 },
      },
      {
        new: true,
        runValidators: true,
      },
    )

    if (!entry) {
      throw httpError(404, 'Draft journal entry not found.')
    }

    return res.status(200).json({
      success: true,
      message: 'Journal entry cancelled successfully.',
      data: entry,
    })
  } catch (error) {
    return handleError(res, error)
  }
})

module.exports = router
