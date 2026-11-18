const express = require('express')
const mongoose = require('mongoose')

const JournalEntry = require('../models/JournalEntry')
const ChartOfAccount = require('../models/ChartOfAccount')

const authMiddleware = require('../middleware/authMiddleware')
const permissionMiddleware = require('../middleware/permissionMiddleware')

const router = express.Router()

router.use(authMiddleware)

// HELPERS

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id)

const getCompanyId = (req) => req.user?.companyId || req.company?._id || req.company?.id

const httpError = (status, message) => {
  const error = new Error(message)
  error.status = status
  return error
}

const handleError = (res, error) => {
  if (error.name === 'CastError' || error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: error.message,
    })
  }

  const status = error.status || 500

  if (status >= 500) {
    console.error('General Ledger API Error:', error)
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

  return new mongoose.Types.ObjectId(id)
}

const validateDate = (value, field, endOfDay = false) => {
  if (!value) return null

  const dateString = String(value).trim()

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    throw httpError(400, `Invalid ${field} format. Use YYYY-MM-DD.`)
  }

  const [year, month, day] = dateString.split('-').map(Number)

  const date = new Date(Date.UTC(year, month - 1, day))

  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw httpError(400, `Invalid ${field}.`)
  }

  if (endOfDay) {
    date.setUTCHours(23, 59, 59, 999)
  }

  return date
}

const getNormalBalance = (accountType) => {
  return ['Asset', 'Expense'].includes(accountType) ? 'Debit' : 'Credit'
}

const getBalanceDetails = (debit, credit, normalBalance) => {
  const balance = normalBalance === 'Debit' ? debit - credit : credit - debit

  const roundedBalance = Math.round(balance * 100) / 100

  return {
    balance: Math.abs(roundedBalance),
    balanceType: roundedBalance >= 0 ? normalBalance : normalBalance === 'Debit' ? 'Credit' : 'Debit',
  }
}

// AGGREGATION HELPERS

const getAccountTotals = async ({ accountId, ...filter }) => {
  const result = await JournalEntry.aggregate([
    { $match: filter },
    { $unwind: '$lines' },
    {
      $match: {
        'lines.accountId': accountId,
      },
    },
    {
      $group: {
        _id: null,
        totalDebit: { $sum: '$lines.debit' },
        totalCredit: { $sum: '$lines.credit' },
      },
    },
  ])

  return {
    debit: Math.round(Number(result[0]?.totalDebit || 0) * 100) / 100,
    credit: Math.round(Number(result[0]?.totalCredit || 0) * 100) / 100,
  }
}

// GET GENERAL LEDGER

router.get('/', permissionMiddleware('Accounting', 'accounting:view-ledger'), async (req, res) => {
  try {
    const companyId = requireCompanyId(getCompanyId(req))

    const { accountId, fromDate, toDate, page: pageQuery, limit: limitQuery } = req.query

    if (!accountId || !isValidObjectId(accountId)) {
      throw httpError(400, 'Valid account ID is required.')
    }

    const accountObjectId = new mongoose.Types.ObjectId(accountId)

    const account = await ChartOfAccount.findOne({
      _id: accountObjectId,
      companyId,
    }).lean()

    if (!account) {
      throw httpError(404, 'Account not found.')
    }

    const startDate = validateDate(fromDate, 'from date')
    const endDate = validateDate(toDate, 'to date', true)

    if (startDate && endDate && startDate > endDate) {
      throw httpError(400, 'From date cannot be after to date.')
    }

    const page = Math.max(1, Number.parseInt(pageQuery, 10) || 1)

    const limit = Math.min(100, Math.max(1, Number.parseInt(limitQuery, 10) || 20))

    const skip = (page - 1) * limit

    const normalBalance = getNormalBalance(account.accountType)

    const baseFilter = {
      companyId,
      status: 'Posted',
    }

    // OPENING BALANCE

    const openingTotals = startDate
      ? await getAccountTotals({
          ...baseFilter,
          accountId: accountObjectId,
          entryDate: { $lt: startDate },
        })
      : { debit: 0, credit: 0 }

    const opening = getBalanceDetails(openingTotals.debit, openingTotals.credit, normalBalance)

    // CURRENT PERIOD FILTER

    const periodFilter = {
      ...baseFilter,
      'lines.accountId': accountObjectId,
    }

    if (startDate || endDate) {
      periodFilter.entryDate = {}

      if (startDate) {
        periodFilter.entryDate.$gte = startDate
      }

      if (endDate) {
        periodFilter.entryDate.$lte = endDate
      }
    }

    // TOTAL PERIOD DEBIT AND CREDIT

    const periodTotals = await getAccountTotals({
      ...baseFilter,
      accountId: accountObjectId,
      ...(periodFilter.entryDate ? { entryDate: periodFilter.entryDate } : {}),
    })

    // COUNT LEDGER LINES

    const countResult = await JournalEntry.aggregate([
      { $match: periodFilter },
      { $unwind: '$lines' },
      {
        $match: {
          'lines.accountId': accountObjectId,
        },
      },
      { $count: 'total' },
    ])

    const total = countResult[0]?.total || 0

    // PREVIOUS PAGE BALANCE

    const previousTotals =
      skip > 0
        ? await JournalEntry.aggregate([
            { $match: periodFilter },
            { $unwind: '$lines' },
            {
              $match: {
                'lines.accountId': accountObjectId,
              },
            },
            {
              $sort: {
                entryDate: 1,
                createdAt: 1,
                _id: 1,
                'lines._id': 1,
              },
            },
            { $limit: skip },
            {
              $group: {
                _id: null,
                debit: { $sum: '$lines.debit' },
                credit: { $sum: '$lines.credit' },
              },
            },
          ])
        : []

    const previousDebit = Number(previousTotals[0]?.debit || 0)
    const previousCredit = Number(previousTotals[0]?.credit || 0)

    // CURRENT PAGE ENTRIES

    const entries = await JournalEntry.aggregate([
      { $match: periodFilter },
      { $unwind: '$lines' },
      {
        $match: {
          'lines.accountId': accountObjectId,
        },
      },
      {
        $sort: {
          entryDate: 1,
          createdAt: 1,
          _id: 1,
          'lines._id': 1,
        },
      },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          _id: '$lines._id',
          journalEntryId: '$_id',
          journalNumber: 1,
          entryDate: 1,
          referenceNumber: 1,
          narration: 1,
          sourceType: 1,
          sourceId: 1,
          description: '$lines.description',
          debit: '$lines.debit',
          credit: '$lines.credit',
        },
      },
    ])

    // RUNNING BALANCE

    let runningDebit = openingTotals.debit + previousDebit
    let runningCredit = openingTotals.credit + previousCredit

    const ledgerEntries = entries.map((entry) => {
      const debit = Number(entry.debit || 0)
      const credit = Number(entry.credit || 0)

      runningDebit += debit
      runningCredit += credit

      const balanceDetails = getBalanceDetails(runningDebit, runningCredit, normalBalance)

      return {
        ...entry,
        balance: balanceDetails.balance,
        balanceType: balanceDetails.balanceType,
      }
    })

    // CLOSING BALANCE

    const closing = getBalanceDetails(openingTotals.debit + periodTotals.debit, openingTotals.credit + periodTotals.credit, normalBalance)

    return res.status(200).json({
      success: true,
      message: 'General ledger fetched successfully.',
      data: {
        account: {
          _id: account._id,
          accountCode: account.accountCode,
          accountName: account.accountName,
          accountType: account.accountType,
          accountSubType: account.accountSubType,
          normalBalance,
        },
        summary: {
          openingDebit: openingTotals.debit,
          openingCredit: openingTotals.credit,
          openingBalance: opening.balance,
          openingBalanceType: opening.balanceType,
          totalDebit: periodTotals.debit,
          totalCredit: periodTotals.credit,
          closingBalance: closing.balance,
          closingBalanceType: closing.balanceType,
        },
        entries: ledgerEntries,
        pageSummary: {
          totalDebit: Math.round(ledgerEntries.reduce((sum, entry) => sum + entry.debit, 0) * 100) / 100,
          totalCredit: Math.round(ledgerEntries.reduce((sum, entry) => sum + entry.credit, 0) * 100) / 100,
        },
      },
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

module.exports = router
