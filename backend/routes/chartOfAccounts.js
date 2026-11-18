const express = require('express')
const mongoose = require('mongoose')
const User = require('../models/User')

const ChartOfAccount = require('../models/ChartOfAccount')
const ChartOfAccountCounter = require('../models/ChartOfAccountCounter')

const authMiddleware = require('../middleware/authMiddleware')
const permissionMiddleware = require('../middleware/permissionMiddleware')

const router = express.Router()

router.use(authMiddleware)

// HELPERS

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
      message: 'Account code already exists.',
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
    console.error('Chart of Accounts API Error:', error)
  }

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

const ACCOUNT_TYPES = ['Asset', 'Liability', 'Equity', 'Income', 'Expense']

// ACCOUNT CODE GENERATION

const generateAccountCode = async (companyId) => {
  const counter = await ChartOfAccountCounter.findOneAndUpdate(
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

  return `COA-${String(counter.lastNumber).padStart(4, '0')}`
}

// PARENT ACCOUNT VALIDATION

const validateParentAccount = async (companyId, parentAccountId, currentAccountId = null) => {
  if (!parentAccountId) return null

  if (!isValidObjectId(parentAccountId)) {
    throw httpError(400, 'Invalid parent account ID.')
  }

  if (currentAccountId && String(parentAccountId) === String(currentAccountId)) {
    throw httpError(400, 'An account cannot be its own parent.')
  }

  const parentAccount = await ChartOfAccount.findOne({
    _id: parentAccountId,
    companyId,
    isActive: true,
  }).select('_id parentAccount')

  if (!parentAccount) {
    throw httpError(404, 'Active parent account not found.')
  }

  // Prevent circular account hierarchy.
  let ancestorId = parentAccount.parentAccount

  while (ancestorId) {
    if (currentAccountId && String(ancestorId) === String(currentAccountId)) {
      throw httpError(400, 'This parent account would create a circular hierarchy.')
    }

    const ancestor = await ChartOfAccount.findOne({
      _id: ancestorId,
      companyId,
    }).select('_id parentAccount')

    if (!ancestor) break

    ancestorId = ancestor.parentAccount
  }

  return parentAccount._id
}

// CHECK CHILD ACCOUNTS
const hasActiveChildren = async (companyId, accountId) => {
  return ChartOfAccount.exists({
    companyId,
    parentAccount: accountId,
    isActive: true,
  })
}

// GET ALL ACCOUNTS

router.get('/', permissionMiddleware('Accounting', 'accounting:view'), async (req, res) => {
  try {
    const companyId = requireCompanyId(getCompanyId(req))

    const filter = { companyId }

    if (req.query.accountType) {
      if (!ACCOUNT_TYPES.includes(req.query.accountType)) {
        throw httpError(400, 'Invalid account type.')
      }

      filter.accountType = req.query.accountType
    }

    if (req.query.isActive !== undefined) {
      if (!['true', 'false'].includes(req.query.isActive)) {
        throw httpError(400, 'Invalid account status.')
      }

      filter.isActive = req.query.isActive === 'true'
    }

    if (req.query.search?.trim()) {
      const search = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

      filter.$or = [{ accountCode: { $regex: search, $options: 'i' } }, { accountName: { $regex: search, $options: 'i' } }]
    }

    const accounts = await ChartOfAccount.find(filter).populate('parentAccount', 'accountCode accountName').populate('createdBy', 'name email').populate('updatedBy', 'name email').sort({ accountCode: 1 }).lean()

    return res.status(200).json({
      success: true,
      message: 'Chart of Accounts fetched successfully.',
      data: accounts,
    })
  } catch (error) {
    return handleError(res, error)
  }
})

// GET SINGLE ACCOUNT

router.get('/:id', permissionMiddleware('Accounting', 'accounting:view'), async (req, res) => {
  try {
    const companyId = requireCompanyId(getCompanyId(req))

    if (!isValidObjectId(req.params.id)) {
      throw httpError(400, 'Invalid account ID.')
    }

    const account = await ChartOfAccount.findOne({
      _id: req.params.id,
      companyId,
    })
      .populate('parentAccount', 'accountCode accountName')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')

    if (!account) {
      throw httpError(404, 'Account not found.')
    }

    return res.status(200).json({
      success: true,
      message: 'Account fetched successfully.',
      data: account,
    })
  } catch (error) {
    return handleError(res, error)
  }
})

// CREATE ACCOUNT

router.post('/', permissionMiddleware('Accounting', 'accounting:manage-accounts'), async (req, res) => {
  try {
    const companyId = requireCompanyId(getCompanyId(req))
    const userId = requireUserId(getUserId(req))

    const accountName = validateText(req.body.accountName, 'Account name', 150, true)

    const description = validateText(req.body.description || '', 'Description', 1000)

    const accountSubType = validateText(req.body.accountSubType || '', 'Account sub type', 100)

    const accountType = req.body.accountType

    if (!ACCOUNT_TYPES.includes(accountType)) {
      throw httpError(400, 'Invalid account type.')
    }

    const parentAccount = await validateParentAccount(companyId, req.body.parentAccount)

    const accountCode = await generateAccountCode(companyId)

    const account = await ChartOfAccount.create({
      companyId,
      accountCode,
      accountName,
      accountType,
      accountSubType,
      parentAccount,
      description,
      openingBalance: 0,
      openingBalanceType: 'Debit',
      isSystem: false,
      isActive: true,
      createdBy: userId,
      updatedBy: userId,
    })

    const populatedAccount = await ChartOfAccount.findById(account._id).populate('parentAccount', 'accountCode accountName').populate('createdBy', 'name email').populate('updatedBy', 'name email')

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      data: populatedAccount,
    })
  } catch (error) {
    return handleError(res, error)
  }
})

// UPDATE ACCOUNT

router.patch('/:id', permissionMiddleware('Accounting', 'accounting:manage-accounts'), async (req, res) => {
  try {
    const companyId = requireCompanyId(getCompanyId(req))
    const userId = requireUserId(getUserId(req))

    if (!isValidObjectId(req.params.id)) {
      throw httpError(400, 'Invalid account ID.')
    }

    const account = await ChartOfAccount.findOne({
      _id: req.params.id,
      companyId,
    })

    if (!account) {
      throw httpError(404, 'Account not found.')
    }

    if (account.isSystem) {
      throw httpError(400, 'System accounts cannot be edited.')
    }

    const allowedFields = ['accountName', 'accountSubType', 'parentAccount', 'description']

    const suppliedFields = Object.keys(req.body).filter((field) => field !== 'companyId')

    if (suppliedFields.length === 0 || suppliedFields.some((field) => !allowedFields.includes(field))) {
      throw httpError(400, 'Invalid account update fields.')
    }

    const updateData = {}

    if (req.body.accountName !== undefined) {
      updateData.accountName = validateText(req.body.accountName, 'Account name', 150, true)
    }

    if (req.body.accountSubType !== undefined) {
      updateData.accountSubType = validateText(req.body.accountSubType, 'Account sub type', 100)
    }

    if (req.body.description !== undefined) {
      updateData.description = validateText(req.body.description, 'Description', 1000)
    }

    if (req.body.parentAccount !== undefined) {
      updateData.parentAccount = await validateParentAccount(companyId, req.body.parentAccount, account._id)
    }

    updateData.updatedBy = userId

    const updatedAccount = await ChartOfAccount.findOneAndUpdate(
      {
        _id: account._id,
        companyId,
        isSystem: false,
        __v: account.__v,
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
      .populate('parentAccount', 'accountCode accountName')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')

    if (!updatedAccount) {
      throw httpError(409, 'Account was modified. Refresh and try again.')
    }

    return res.status(200).json({
      success: true,
      message: 'Account updated successfully.',
      data: updatedAccount,
    })
  } catch (error) {
    return handleError(res, error)
  }
})

// UPDATE ACCOUNT STATUS

router.patch('/:id/status', permissionMiddleware('Accounting', 'accounting:manage-accounts'), async (req, res) => {
  try {
    const companyId = requireCompanyId(getCompanyId(req))
    const userId = requireUserId(getUserId(req))

    if (!isValidObjectId(req.params.id)) {
      throw httpError(400, 'Invalid account ID.')
    }

    if (typeof req.body.isActive !== 'boolean') {
      throw httpError(400, 'Valid account status is required.')
    }

    const account = await ChartOfAccount.findOne({
      _id: req.params.id,
      companyId,
    })

    if (!account) {
      throw httpError(404, 'Account not found.')
    }

    if (account.isSystem) {
      throw httpError(400, 'System accounts cannot be deactivated.')
    }

    if (!req.body.isActive) {
      const hasChildren = await hasActiveChildren(companyId, account._id)

      if (hasChildren) {
        throw httpError(400, 'Deactivate child accounts before deactivating this account.')
      }
    }

    const updatedAccount = await ChartOfAccount.findOneAndUpdate(
      {
        _id: account._id,
        companyId,
        isSystem: false,
        __v: account.__v,
      },
      {
        $set: {
          isActive: req.body.isActive,
          updatedBy: userId,
        },
        $inc: { __v: 1 },
      },
      {
        new: true,
        runValidators: true,
      },
    )

    if (!updatedAccount) {
      throw httpError(409, 'Account was modified. Refresh and try again.')
    }

    return res.status(200).json({
      success: true,
      message: `Account ${req.body.isActive ? 'activated' : 'deactivated'} successfully.`,
      data: updatedAccount,
    })
  } catch (error) {
    return handleError(res, error)
  }
})

module.exports = router
