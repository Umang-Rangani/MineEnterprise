const ChartOfAccount = require('../models/ChartOfAccount')

const DEFAULT_ACCOUNTS = [
  // Assets
  {
    accountCode: '1000',
    accountName: 'Cash',
    accountType: 'Asset',
    accountSubType: 'Current Asset',
  },
  {
    accountCode: '1010',
    accountName: 'Bank',
    accountType: 'Asset',
    accountSubType: 'Current Asset',
  },
  {
    accountCode: '1100',
    accountName: 'Accounts Receivable',
    accountType: 'Asset',
    accountSubType: 'Current Asset',
  },
  {
    accountCode: '1200',
    accountName: 'Inventory',
    accountType: 'Asset',
    accountSubType: 'Current Asset',
  },
  {
    accountCode: '1300',
    accountName: 'Input CGST',
    accountType: 'Asset',
    accountSubType: 'GST Input Tax Credit',
  },
  {
    accountCode: '1310',
    accountName: 'Input SGST',
    accountType: 'Asset',
    accountSubType: 'GST Input Tax Credit',
  },
  {
    accountCode: '1320',
    accountName: 'Input IGST',
    accountType: 'Asset',
    accountSubType: 'GST Input Tax Credit',
  },
  {
    accountCode: '1500',
    accountName: 'Fixed Assets',
    accountType: 'Asset',
    accountSubType: 'Non-Current Asset',
  },

  // Liabilities
  {
    accountCode: '2000',
    accountName: 'Accounts Payable',
    accountType: 'Liability',
    accountSubType: 'Current Liability',
  },
  {
    accountCode: '2010',
    accountName: 'Goods Received Not Invoiced (GRNI)',
    accountType: 'Liability',
    accountSubType: 'Current Liability',
  },
  {
    accountCode: '2100',
    accountName: 'Output CGST',
    accountType: 'Liability',
    accountSubType: 'GST Output Tax',
  },
  {
    accountCode: '2110',
    accountName: 'Output SGST',
    accountType: 'Liability',
    accountSubType: 'GST Output Tax',
  },
  {
    accountCode: '2120',
    accountName: 'Output IGST',
    accountType: 'Liability',
    accountSubType: 'GST Output Tax',
  },

  // Equity
  {
    accountCode: '3000',
    accountName: "Owner's Capital",
    accountType: 'Equity',
    accountSubType: 'Capital',
  },

  {
    accountCode: '3200',
    accountName: 'Opening Balance Equity',
    accountType: 'Equity',
    accountSubType: 'Opening Balance Equity',
  },

  {
    accountCode: '3100',
    accountName: 'Retained Earnings',
    accountType: 'Equity',
    accountSubType: 'Retained Earnings',
  },

  // Income
  {
    accountCode: '4000',
    accountName: 'Sales Revenue',
    accountType: 'Income',
    accountSubType: 'Operating Income',
  },
  {
    accountCode: '4100',
    accountName: 'Other Income',
    accountType: 'Income',
    accountSubType: 'Non-Operating Income',
  },
  {
    accountCode: '4200',
    accountName: 'Sales Returns',
    accountType: 'Income',
    accountSubType: 'Contra Revenue',
  },

  // Expenses
  {
    accountCode: '5000',
    accountName: 'Cost of Goods Sold',
    accountType: 'Expense',
    accountSubType: 'Direct Expense',
  },
  {
    accountCode: '5100',
    accountName: 'Operating Expenses',
    accountType: 'Expense',
    accountSubType: 'Indirect Expense',
  },
  {
    accountCode: '5200',
    accountName: 'Purchase Returns',
    accountType: 'Expense',
    accountSubType: 'Contra Expense',
  },
  {
    accountCode: '5300',
    accountName: 'Bank Charges',
    accountType: 'Expense',
    accountSubType: 'Financial Expense',
  },
  {
    accountCode: '5400',
    accountName: 'Depreciation Expense',
    accountType: 'Expense',
    accountSubType: 'Indirect Expense',
  },
]

const initializeDefaultChartOfAccounts = async (companyId, session) => {
  if (!companyId) {
    throw new Error('Company ID is required to initialize chart of accounts.')
  }

  const operations = DEFAULT_ACCOUNTS.map((account) => ({
    updateOne: {
      filter: {
        companyId,
        accountCode: account.accountCode,
      },
      update: {
        $setOnInsert: {
          companyId,
          ...account,
          openingBalance: 0,
          openingBalanceType: 'Debit',
          parentAccount: null,
          description: '',
          isSystem: true,
          isActive: true,
        },
      },
      upsert: true,
    },
  }))

  await ChartOfAccount.bulkWrite(operations, {
    session,
    ordered: true,
  })

  return DEFAULT_ACCOUNTS.length
}

module.exports = initializeDefaultChartOfAccounts
