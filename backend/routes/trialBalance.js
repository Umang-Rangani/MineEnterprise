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
    console.error('Trial Balance API Error:', error)
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

const validateDate = (value) => {
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

  date.setUTCHours(23, 59, 59, 999)

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

const getClosingBalance = (debit, credit, normalBalance) => {
  const balance = normalBalance === 'Debit' ? debit - credit : credit - debit

  const roundedBalance = roundAmount(balance)

  if (roundedBalance > 0) {
    return {
      debit: normalBalance === 'Debit' ? roundedBalance : 0,
      credit: normalBalance === 'Credit' ? roundedBalance : 0,
    }
  }

  if (roundedBalance < 0) {
    return {
      debit: normalBalance === 'Credit' ? Math.abs(roundedBalance) : 0,
      credit: normalBalance === 'Debit' ? Math.abs(roundedBalance) : 0,
    }
  }

  return {
    debit: 0,
    credit: 0,
  }
}

// GET TRIAL BALANCE

router.get('/', permissionMiddleware('Accounting', 'accounting:view-ledger'), async (req, res) => {
  try {
    const companyId = requireCompanyId(getCompanyId(req))

    const { asOfDate } = req.query

    const endDate = validateDate(asOfDate)

    // POSTED JOURNAL ENTRIES FILTER

    const journalFilter = {
      companyId,
      status: 'Posted',
    }

    if (endDate) {
      journalFilter.entryDate = {
        $lte: endDate,
      }
    }

    // ACCOUNT TOTALS AGGREGATION

    const accountTotals = await JournalEntry.aggregate([
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

    // CONVERT TOTALS INTO MAP

    const totalsMap = new Map()

    accountTotals.forEach((item) => {
      totalsMap.set(String(item._id), {
        debit: roundAmount(item.totalDebit),
        credit: roundAmount(item.totalCredit),
      })
    })

    // FETCH ALL COMPANY ACCOUNTS

    const accounts = await ChartOfAccount.find({
      companyId,
    })
      .select('accountCode accountName accountType accountSubType parentAccount isActive isSystem')
      .populate('parentAccount', 'accountCode accountName')
      .sort({ accountCode: 1 })
      .lean()

    // CALCULATE ACCOUNT-WISE TRIAL BALANCE

    const trialBalanceAccounts = accounts.map((account) => {
      const totals = totalsMap.get(String(account._id)) || {
        debit: 0,
        credit: 0,
      }

      const normalBalance = getNormalBalance(account.accountType)

      const closing = getClosingBalance(totals.debit, totals.credit, normalBalance)

      return {
        _id: account._id,
        accountCode: account.accountCode,
        accountName: account.accountName,
        accountType: account.accountType,
        accountSubType: account.accountSubType,
        normalBalance,
        parentAccount: account.parentAccount,
        isActive: account.isActive,
        isSystem: account.isSystem,

        totalDebit: totals.debit,
        totalCredit: totals.credit,

        closingDebit: roundAmount(closing.debit),
        closingCredit: roundAmount(closing.credit),
      }
    })

    // GRAND TOTALS

    const summary = trialBalanceAccounts.reduce(
      (result, account) => {
        result.totalDebit += account.closingDebit
        result.totalCredit += account.closingCredit

        return result
      },
      {
        totalDebit: 0,
        totalCredit: 0,
      },
    )

    summary.totalDebit = roundAmount(summary.totalDebit)
    summary.totalCredit = roundAmount(summary.totalCredit)

    summary.difference = roundAmount(Math.abs(summary.totalDebit - summary.totalCredit))

    summary.isBalanced = summary.difference === 0

    return res.status(200).json({
      success: true,
      message: 'Trial balance fetched successfully.',
      data: {
        asOfDate: asOfDate || null,
        accounts: trialBalanceAccounts,
        summary,
      },
    })
  } catch (error) {
    return handleError(res, error)
  }
})

module.exports = router
