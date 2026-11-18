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
    console.error('Financial Statements API Error:', error)
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

const validateDate = (value, endOfDay = false) => {
  if (!value) return null

  const dateString = String(value).trim()

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    throw httpError(400, 'Invalid date format. Use YYYY-MM-DD.')
  }

  const [year, month, day] = dateString.split('-').map(Number)

  const date = new Date(Date.UTC(year, month - 1, day))

  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw httpError(400, 'Invalid date.')
  }

  if (endOfDay) {
    date.setUTCHours(23, 59, 59, 999)
  }

  return date
}

const roundAmount = (amount) => {
  return Math.round((Number(amount || 0) + Number.EPSILON) * 100) / 100
}

const getNormalBalance = (accountType) => {
  if (['Asset', 'Expense'].includes(accountType)) {
    return 'Debit'
  }

  if (['Liability', 'Equity', 'Income'].includes(accountType)) {
    return 'Credit'
  }

  throw httpError(400, `Invalid account type: ${accountType}`)
}

const getAccountBalance = (debit, credit, accountType) => {
  const normalBalance = getNormalBalance(accountType)

  const balance = normalBalance === 'Debit' ? debit - credit : credit - debit

  return roundAmount(balance)
}

// GET POSTED JOURNAL TOTALS

const getPostedAccountTotals = async ({ companyId, startDate = null, endDate = null }) => {
  const journalFilter = {
    companyId,
    status: 'Posted',
  }

  if (startDate || endDate) {
    journalFilter.entryDate = {}

    if (startDate) {
      journalFilter.entryDate.$gte = startDate
    }

    if (endDate) {
      journalFilter.entryDate.$lte = endDate
    }
  }

  const results = await JournalEntry.aggregate([
    {
      $match: journalFilter,
    },
    {
      $unwind: '$lines',
    },
    {
      $group: {
        _id: '$lines.accountId',
        totalDebit: {
          $sum: '$lines.debit',
        },
        totalCredit: {
          $sum: '$lines.credit',
        },
      },
    },
  ])

  const totalsMap = new Map()

  results.forEach((item) => {
    totalsMap.set(String(item._id), {
      debit: roundAmount(item.totalDebit),
      credit: roundAmount(item.totalCredit),
    })
  })

  return totalsMap
}

// FETCH COMPANY ACCOUNTS

const getCompanyAccounts = async (companyId, accountTypes) => {
  return ChartOfAccount.find({
    companyId,
    accountType: {
      $in: accountTypes,
    },
  })
    .select('accountCode accountName accountType accountSubType parentAccount isActive isSystem')
    .populate('parentAccount', 'accountCode accountName')
    .sort({ accountCode: 1 })
    .lean()
}

// BUILD REPORT ACCOUNT ROWS

const buildAccountRows = (accounts, totalsMap) => {
  return accounts.map((account) => {
    const totals = totalsMap.get(String(account._id)) || {
      debit: 0,
      credit: 0,
    }

    const balance = getAccountBalance(totals.debit, totals.credit, account.accountType)

    return {
      _id: account._id,
      accountCode: account.accountCode,
      accountName: account.accountName,
      accountType: account.accountType,
      accountSubType: account.accountSubType,
      parentAccount: account.parentAccount,
      isActive: account.isActive,

      totalDebit: totals.debit,
      totalCredit: totals.credit,

      balance,
      normalBalance: getNormalBalance(account.accountType),
    }
  })
}

const sumBalances = (accounts) => {
  return roundAmount(accounts.reduce((total, account) => total + account.balance, 0))
}

// PROFIT & LOSS STATEMENT

router.get('/profit-loss', permissionMiddleware('Accounting', 'accounting:view-ledger'), async (req, res) => {
  try {
    const companyId = requireCompanyId(getCompanyId(req))

    const { fromDate, toDate } = req.query

    const startDate = validateDate(fromDate)
    const endDate = validateDate(toDate, true)

    if (startDate && endDate && startDate > endDate) {
      throw httpError(400, 'From date cannot be later than To date.')
    }

    // FETCH POSTED JOURNAL TOTALS

    const totalsMap = await getPostedAccountTotals({
      companyId,
      startDate,
      endDate,
    })

    // FETCH INCOME AND EXPENSE ACCOUNTS

    const accounts = await getCompanyAccounts(companyId, ['Income', 'Expense'])

    const reportAccounts = buildAccountRows(accounts, totalsMap)

    const incomeAccounts = reportAccounts.filter((account) => account.accountType === 'Income')

    const expenseAccounts = reportAccounts.filter((account) => account.accountType === 'Expense')

    // CALCULATE PROFIT & LOSS

    const totalIncome = sumBalances(incomeAccounts)
    const totalExpenses = sumBalances(expenseAccounts)

    const netProfit = roundAmount(totalIncome - totalExpenses)

    return res.status(200).json({
      success: true,
      message: 'Profit and Loss statement fetched successfully.',
      data: {
        fromDate: fromDate || null,
        toDate: toDate || null,

        income: {
          accounts: incomeAccounts,
          total: totalIncome,
        },

        expenses: {
          accounts: expenseAccounts,
          total: totalExpenses,
        },

        summary: {
          totalIncome,
          totalExpenses,
          netProfit,
          status: netProfit > 0 ? 'Profit' : netProfit < 0 ? 'Loss' : 'Break Even',
        },
      },
    })
  } catch (error) {
    return handleError(res, error)
  }
})

// BALANCE SHEET

router.get('/balance-sheet', permissionMiddleware('Accounting', 'accounting:view-ledger'), async (req, res) => {
  try {
    const companyId = requireCompanyId(getCompanyId(req))

    const { asOfDate } = req.query

    const endDate = validateDate(asOfDate, true)

    // FETCH ALL POSTED JOURNAL TOTALS UP TO DATE

    const totalsMap = await getPostedAccountTotals({
      companyId,
      endDate,
    })

    // FETCH ASSET, LIABILITY AND EQUITY ACCOUNTS
    const accounts = await getCompanyAccounts(companyId, ['Asset', 'Liability', 'Equity'])

    const reportAccounts = buildAccountRows(accounts, totalsMap)

    const assetAccounts = reportAccounts.filter((account) => account.accountType === 'Asset')

    const liabilityAccounts = reportAccounts.filter((account) => account.accountType === 'Liability')

    const equityAccounts = reportAccounts.filter((account) => account.accountType === 'Equity')

    // CALCULATE CURRENT EARNINGS
    const profitLossAccounts = await getCompanyAccounts(companyId, ['Income', 'Expense'])

    const profitLossRows = buildAccountRows(profitLossAccounts, totalsMap)

    const incomeAccounts = profitLossRows.filter((account) => account.accountType === 'Income')

    const expenseAccounts = profitLossRows.filter((account) => account.accountType === 'Expense')

    const totalIncome = sumBalances(incomeAccounts)
    const totalExpenses = sumBalances(expenseAccounts)

    const currentEarnings = roundAmount(totalIncome - totalExpenses)

    // CALCULATE BALANCE SHEET TOTALS
    const totalAssets = sumBalances(assetAccounts)
    const totalLiabilities = sumBalances(liabilityAccounts)
    const totalEquity = sumBalances(equityAccounts)

    const totalEquityIncludingEarnings = roundAmount(totalEquity + currentEarnings)

    const totalLiabilitiesAndEquity = roundAmount(totalLiabilities + totalEquityIncludingEarnings)

    const difference = roundAmount(totalAssets - totalLiabilitiesAndEquity)

    return res.status(200).json({
      success: true,
      message: 'Balance Sheet fetched successfully.',
      data: {
        asOfDate: asOfDate || null,

        assets: {
          accounts: assetAccounts,
          total: totalAssets,
        },

        liabilities: {
          accounts: liabilityAccounts,
          total: totalLiabilities,
        },

        equity: {
          accounts: equityAccounts,
          total: totalEquity,
          currentEarnings,
          totalIncludingEarnings: totalEquityIncludingEarnings,
        },

        summary: {
          totalAssets,
          totalLiabilities,
          totalEquity: totalEquityIncludingEarnings,
          totalLiabilitiesAndEquity,
          difference,
          isBalanced: Math.abs(difference) < 0.01,
        },
      },
    })
  } catch (error) {
    return handleError(res, error)
  }
})

module.exports = router
