const express = require('express')
const mongoose = require('mongoose')

const Product = require('../models/Product')
const User = require('../models/User')
const SalesOrder = require('../models/SalesOrder')
const Invoice = require('../models/Invoice')
const Payment = require('../models/Payment')
const Inventory = require('../models/Inventory')
const Warehouse = require('../models/Warehouse')
const SystemActivity = require('../models/SystemActivity')
const Company = require('../models/Company')

const authMiddleware = require('../middleware/authMiddleware')
const permissionMiddleware = require('../middleware/permissionMiddleware')
const { hasPermission } = require('../utils/permission')

const router = express.Router()

router.use(authMiddleware)

const VALID_INVOICE_STATUSES = ['Approved', 'Partially Paid', 'Paid', 'Overdue']

const roundMoney = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100

const getPeriodStart = (period, now) => {
  const date = new Date(now)

  if (period === 'daily') {
    date.setUTCHours(0, 0, 0, 0)
    date.setUTCDate(date.getUTCDate() - 6)
    return date
  }

  if (period === 'weekly') {
    date.setUTCHours(0, 0, 0, 0)
    date.setUTCDate(date.getUTCDate() - 7 * 7)
    return date
  }

  if (period === 'monthly') {
    date.setUTCHours(0, 0, 0, 0)
    date.setUTCDate(1)
    date.setUTCMonth(date.getUTCMonth() - 11)
    return date
  }

  date.setUTCHours(0, 0, 0, 0)
  date.setUTCMonth(0, 1)
  date.setUTCFullYear(date.getUTCFullYear() - 4)

  return date
}

const getPeriodFormat = (period) => {
  if (period === 'daily') return '%Y-%m-%d'
  if (period === 'weekly') return '%G-W%V'
  if (period === 'monthly') return '%Y-%m'
  return '%Y'
}

const getAnalytics = async ({ Model, companyId, dateField, period, now, valueExpression, match = {} }) => {
  const startDate = getPeriodStart(period, now)

  const result = await Model.aggregate([
    {
      $match: {
        companyId,
        ...match,
        [dateField]: {
          $gte: startDate,
          $lte: now,
        },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: getPeriodFormat(period),
            date: `$${dateField}`,
            timezone: 'UTC',
          },
        },
        total: {
          $sum: valueExpression,
        },
      },
    },
    {
      $sort: {
        _id: 1,
      },
    },
  ])

  return result.map((item) => ({
    label: item._id,
    value: roundMoney(item.total),
  }))
}

const runIfAllowed = (allowed, query, fallback) => {
  if (!allowed) {
    return Promise.resolve(fallback)
  }

  return query()
}

router.get('/summary', permissionMiddleware('Dashboard', 'VIEW'), async (req, res) => {
  try {
    const companyId = req.user?.companyId

    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid company is required.',
      })
    }

    const companyObjectId = new mongoose.Types.ObjectId(companyId)
    const now = new Date()

    // Permission checks
    const canViewProducts = hasPermission(req.user, req.company, 'Product', 'LIST')

    const canViewEmployees = hasPermission(req.user, req.company, 'Employee', 'LIST')

    const canViewSales = hasPermission(req.user, req.company, 'Sales', 'LIST')

    const canViewInvoices = hasPermission(req.user, req.company, 'Invoice', 'VIEW')

    const canViewPayments = hasPermission(req.user, req.company, 'Payment', 'LIST')

    const canViewInventory = hasPermission(req.user, req.company, 'Inventory', 'VIEW')

    const canViewWarehouses = hasPermission(req.user, req.company, 'Warehouse', 'LIST')

    const canViewCompanySettings = hasPermission(req.user, req.company, 'Settings', 'VIEW')

    // Dashboard VIEW is already required by permissionMiddleware.
    const canViewActivities = hasPermission(req.user, req.company, 'Dashboard', 'VIEW')

    const invoiceFilter = {
      companyId: companyObjectId,
      status: { $in: VALID_INVOICE_STATUSES },
    }

    const [
      companyDetails,
      productStats,
      employeeStats,
      warehouseStats,
      orderStatusStats,
      recentOrders,
      inventoryStats,
      invoiceStats,
      paymentStats,
      recentActivities,
      dailyRevenue,
      weeklyRevenue,
      monthlyRevenue,
      yearlyRevenue,
      dailyPayments,
      weeklyPayments,
      monthlyPayments,
      yearlyPayments,
    ] = await Promise.all([
      // Company details
      runIfAllowed(
        canViewCompanySettings,
        () =>
          Company.findOne({
            _id: companyObjectId,
            status: 'Approved',
          })
            .select('companyName logo status currency')
            .lean(),
        null,
      ),

      // Product overview
      runIfAllowed(
        canViewProducts,
        () =>
          Product.aggregate([
            {
              $match: {
                companyId: companyObjectId,
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                active: {
                  $sum: {
                    $cond: [{ $eq: ['$status', 'Active'] }, 1, 0],
                  },
                },
                inactive: {
                  $sum: {
                    $cond: [{ $eq: ['$status', 'Inactive'] }, 1, 0],
                  },
                },
              },
            },
          ]),
        [],
      ),

      // Employee overview
      runIfAllowed(
        canViewEmployees,
        () =>
          User.aggregate([
            {
              $match: {
                companyId: companyObjectId,
                role: 'Employee',
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                active: {
                  $sum: {
                    $cond: [{ $eq: ['$status', 'Active'] }, 1, 0],
                  },
                },
                inactive: {
                  $sum: {
                    $cond: [{ $eq: ['$status', 'Inactive'] }, 1, 0],
                  },
                },
              },
            },
          ]),
        [],
      ),

      // Warehouse overview
      runIfAllowed(
        canViewWarehouses,
        () =>
          Warehouse.aggregate([
            {
              $match: {
                companyId: companyObjectId,
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                active: {
                  $sum: {
                    $cond: [{ $eq: ['$status', 'Active'] }, 1, 0],
                  },
                },
                inactive: {
                  $sum: {
                    $cond: [{ $eq: ['$status', 'Inactive'] }, 1, 0],
                  },
                },
              },
            },
          ]),
        [],
      ),

      // Sales order status overview
      runIfAllowed(
        canViewSales,
        () =>
          SalesOrder.aggregate([
            {
              $match: {
                companyId: companyObjectId,
              },
            },
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
                orderValue: { $sum: '$grandTotal' },
              },
            },
          ]),
        [],
      ),

      // Recent sales orders
      runIfAllowed(
        canViewSales,
        () =>
          SalesOrder.find({
            companyId: companyObjectId,
          })
            .populate('customerId', 'customerName customerCode')
            .populate('warehouseId', 'name code')
            .select('orderNumber customerId warehouseId orderDate grandTotal status')
            .sort({ orderDate: -1, createdAt: -1 })
            .limit(5)
            .lean(),
        [],
      ),

      // Inventory overview
      runIfAllowed(
        canViewInventory,
        () =>
          Product.aggregate([
            {
              $match: {
                companyId: companyObjectId,
                status: 'Active',
              },
            },
            {
              $lookup: {
                from: Inventory.collection.name,
                let: { productId: '$_id' },
                pipeline: [
                  {
                    $match: {
                      companyId: companyObjectId,
                      $expr: {
                        $eq: ['$productId', '$$productId'],
                      },
                    },
                  },
                  {
                    $group: {
                      _id: null,
                      currentStock: { $sum: '$currentStock' },
                      reservedStock: { $sum: '$reservedStock' },
                    },
                  },
                ],
                as: 'stockData',
              },
            },
            {
              $addFields: {
                stock: {
                  $ifNull: [{ $arrayElemAt: ['$stockData', 0] }, {}],
                },
              },
            },
            {
              $addFields: {
                currentStock: { $ifNull: ['$stock.currentStock', 0] },
                reservedStock: { $ifNull: ['$stock.reservedStock', 0] },
              },
            },
            {
              $addFields: {
                availableStock: {
                  $max: [0, { $subtract: ['$currentStock', '$reservedStock'] }],
                },
              },
            },
            {
              $group: {
                _id: null,
                totalProducts: { $sum: 1 },
                totalStock: { $sum: '$currentStock' },
                reservedStock: { $sum: '$reservedStock' },
                availableStock: { $sum: '$availableStock' },
                lowStockProducts: {
                  $sum: {
                    $cond: [
                      {
                        $and: [{ $gt: ['$availableStock', 0] }, { $lte: ['$availableStock', '$minStockLevel'] }],
                      },
                      1,
                      0,
                    ],
                  },
                },
                outOfStockProducts: {
                  $sum: {
                    $cond: [{ $lte: ['$availableStock', 0] }, 1, 0],
                  },
                },
              },
            },
          ]),
        [],
      ),

      // Invoice financial overview
      runIfAllowed(
        canViewInvoices,
        () =>
          Invoice.aggregate([
            {
              $match: invoiceFilter,
            },
            {
              $group: {
                _id: null,
                totalInvoices: { $sum: 1 },
                totalRevenue: { $sum: '$grandTotal' },
                totalReceived: { $sum: '$paidAmount' },
                outstanding: {
                  $sum: {
                    $max: [0, '$balanceAmount'],
                  },
                },
                paidInvoices: {
                  $sum: {
                    $cond: [{ $eq: ['$status', 'Paid'] }, 1, 0],
                  },
                },
                partiallyPaidInvoices: {
                  $sum: {
                    $cond: [{ $eq: ['$status', 'Partially Paid'] }, 1, 0],
                  },
                },
                overdueInvoices: {
                  $sum: {
                    $cond: [
                      {
                        $and: [{ $lt: ['$dueDate', now] }, { $gt: ['$balanceAmount', 0] }],
                      },
                      1,
                      0,
                    ],
                  },
                },
                overdueAmount: {
                  $sum: {
                    $cond: [
                      {
                        $and: [{ $lt: ['$dueDate', now] }, { $gt: ['$balanceAmount', 0] }],
                      },
                      '$balanceAmount',
                      0,
                    ],
                  },
                },
              },
            },
          ]),
        [],
      ),

      // Payment overview
      runIfAllowed(
        canViewPayments,
        () =>
          Payment.aggregate([
            {
              $match: {
                companyId: companyObjectId,
              },
            },
            {
              $group: {
                _id: null,
                grossReceived: { $sum: '$amount' },
                refundedAmount: { $sum: '$refundedAmount' },
                paymentCount: { $sum: 1 },
              },
            },
            {
              $project: {
                grossReceived: 1,
                refundedAmount: 1,
                paymentCount: 1,
                netReceived: {
                  $subtract: ['$grossReceived', '$refundedAmount'],
                },
              },
            },
          ]),
        [],
      ),

      // Recent system activities
      runIfAllowed(
        canViewActivities,
        () =>
          SystemActivity.find({
            'company.companyId': companyObjectId,
          })
            .select('action description createdAt')
            .sort({ createdAt: -1 })
            .limit(5)
            .lean(),
        [],
      ),

      // Revenue analytics - daily
      runIfAllowed(
        canViewInvoices,
        () =>
          getAnalytics({
            Model: Invoice,
            companyId: companyObjectId,
            dateField: 'invoiceDate',
            period: 'daily',
            now,
            match: { status: { $in: VALID_INVOICE_STATUSES } },
            valueExpression: '$grandTotal',
          }),
        [],
      ),

      // Revenue analytics - weekly
      runIfAllowed(
        canViewInvoices,
        () =>
          getAnalytics({
            Model: Invoice,
            companyId: companyObjectId,
            dateField: 'invoiceDate',
            period: 'weekly',
            now,
            match: { status: { $in: VALID_INVOICE_STATUSES } },
            valueExpression: '$grandTotal',
          }),
        [],
      ),

      // Revenue analytics - monthly
      runIfAllowed(
        canViewInvoices,
        () =>
          getAnalytics({
            Model: Invoice,
            companyId: companyObjectId,
            dateField: 'invoiceDate',
            period: 'monthly',
            now,
            match: { status: { $in: VALID_INVOICE_STATUSES } },
            valueExpression: '$grandTotal',
          }),
        [],
      ),

      // Revenue analytics - yearly
      runIfAllowed(
        canViewInvoices,
        () =>
          getAnalytics({
            Model: Invoice,
            companyId: companyObjectId,
            dateField: 'invoiceDate',
            period: 'yearly',
            now,
            match: { status: { $in: VALID_INVOICE_STATUSES } },
            valueExpression: '$grandTotal',
          }),
        [],
      ),

      // Payment analytics - daily
      runIfAllowed(
        canViewPayments,
        () =>
          getAnalytics({
            Model: Payment,
            companyId: companyObjectId,
            dateField: 'paymentDate',
            period: 'daily',
            now,
            valueExpression: {
              $subtract: ['$amount', { $ifNull: ['$refundedAmount', 0] }],
            },
          }),
        [],
      ),

      // Payment analytics - weekly
      runIfAllowed(
        canViewPayments,
        () =>
          getAnalytics({
            Model: Payment,
            companyId: companyObjectId,
            dateField: 'paymentDate',
            period: 'weekly',
            now,
            valueExpression: {
              $subtract: ['$amount', { $ifNull: ['$refundedAmount', 0] }],
            },
          }),
        [],
      ),

      // Payment analytics - monthly
      runIfAllowed(
        canViewPayments,
        () =>
          getAnalytics({
            Model: Payment,
            companyId: companyObjectId,
            dateField: 'paymentDate',
            period: 'monthly',
            now,
            valueExpression: {
              $subtract: ['$amount', { $ifNull: ['$refundedAmount', 0] }],
            },
          }),
        [],
      ),

      // Payment analytics - yearly
      runIfAllowed(
        canViewPayments,
        () =>
          getAnalytics({
            Model: Payment,
            companyId: companyObjectId,
            dateField: 'paymentDate',
            period: 'yearly',
            now,
            valueExpression: {
              $subtract: ['$amount', { $ifNull: ['$refundedAmount', 0] }],
            },
          }),
        [],
      ),
    ])

    const product = productStats[0] || {
      total: 0,
      active: 0,
      inactive: 0,
    }

    const employee = employeeStats[0] || {
      total: 0,
      active: 0,
      inactive: 0,
    }

    const warehouse = warehouseStats[0] || {
      total: 0,
      active: 0,
      inactive: 0,
    }

    const inventory = inventoryStats[0] || {
      totalProducts: 0,
      totalStock: 0,
      reservedStock: 0,
      availableStock: 0,
      lowStockProducts: 0,
      outOfStockProducts: 0,
    }

    const invoice = invoiceStats[0] || {
      totalInvoices: 0,
      totalRevenue: 0,
      totalReceived: 0,
      outstanding: 0,
      paidInvoices: 0,
      partiallyPaidInvoices: 0,
      overdueInvoices: 0,
      overdueAmount: 0,
    }

    const payment = paymentStats[0] || {
      grossReceived: 0,
      refundedAmount: 0,
      netReceived: 0,
      paymentCount: 0,
    }

    const orderOverview = {
      Draft: 0,
      Approved: 0,
      'Partially Dispatched': 0,
      Dispatched: 0,
      Cancelled: 0,
      total: 0,
      totalOrderValue: 0,
    }

    orderStatusStats.forEach((item) => {
      if (Object.prototype.hasOwnProperty.call(orderOverview, item._id)) {
        orderOverview[item._id] = item.count
      }

      orderOverview.total += item.count
      orderOverview.totalOrderValue += Number(item.orderValue || 0)
    })

    const company = companyDetails || {}

    // Build permission visibility flags
    const visibleSections = {
      products: canViewProducts,
      employees: canViewEmployees,
      salesOrders: canViewSales,
      inventory: canViewInventory,
      warehouses: canViewWarehouses,
      invoices: canViewInvoices,
      payments: canViewPayments,
      finance: canViewInvoices || canViewPayments,
      company: canViewCompanySettings,
      recentOrders: canViewSales,
      recentActivities: canViewActivities,
    }

    return res.status(200).json({
      success: true,
      message: 'Dashboard summary fetched successfully.',
      data: {
        generatedAt: now,

        visibleSections,

        company: canViewCompanySettings
          ? {
              companyName: company.companyName || '',
              logo: company.logo || '',
              status: company.status || '',
              currency: company.currency || 'INR',
            }
          : null,

        businessOverview: {
          totalProducts: canViewProducts ? product.total : null,
          activeProducts: canViewProducts ? product.active : null,
          inactiveProducts: canViewProducts ? product.inactive : null,

          totalSalesOrders: canViewSales ? orderOverview.total : null,

          totalEmployees: canViewEmployees ? employee.total : null,
          activeEmployees: canViewEmployees ? employee.active : null,
          inactiveEmployees: canViewEmployees ? employee.inactive : null,

          totalRevenue: canViewInvoices ? roundMoney(invoice.totalRevenue) : null,
        },

        salesOrders: canViewSales ? orderOverview : null,

        inventory: canViewInventory
          ? {
              totalProducts: inventory.totalProducts,
              totalStock: roundMoney(inventory.totalStock),
              reservedStock: roundMoney(inventory.reservedStock),
              availableStock: roundMoney(inventory.availableStock),
              lowStockProducts: inventory.lowStockProducts,
              outOfStockProducts: inventory.outOfStockProducts,
            }
          : null,

        warehouses: canViewWarehouses
          ? {
              total: warehouse.total,
              active: warehouse.active,
              inactive: warehouse.inactive,
            }
          : null,

        finance: {
          totalInvoices: canViewInvoices ? invoice.totalInvoices : null,
          totalRevenue: canViewInvoices ? roundMoney(invoice.totalRevenue) : null,
          invoiceReceivedAmount: canViewInvoices ? roundMoney(invoice.totalReceived) : null,

          paymentReceivedAmount: canViewPayments ? roundMoney(payment.netReceived) : null,
          grossPaymentAmount: canViewPayments ? roundMoney(payment.grossReceived) : null,
          refundedAmount: canViewPayments ? roundMoney(payment.refundedAmount) : null,
          paymentCount: canViewPayments ? payment.paymentCount : null,

          outstandingAmount: canViewInvoices ? roundMoney(invoice.outstanding) : null,
          overdueAmount: canViewInvoices ? roundMoney(invoice.overdueAmount) : null,
          paidInvoices: canViewInvoices ? invoice.paidInvoices : null,
          partiallyPaidInvoices: canViewInvoices ? invoice.partiallyPaidInvoices : null,
          overdueInvoices: canViewInvoices ? invoice.overdueInvoices : null,
        },

        analytics: {
          daily: {
            revenue: dailyRevenue,
            received: dailyPayments,
          },
          weekly: {
            revenue: weeklyRevenue,
            received: weeklyPayments,
          },
          monthly: {
            revenue: monthlyRevenue,
            received: monthlyPayments,
          },
          yearly: {
            revenue: yearlyRevenue,
            received: yearlyPayments,
          },
        },

        recentOrders: canViewSales
          ? recentOrders.map((order) => ({
              _id: order._id,
              orderNumber: order.orderNumber,
              customerName: order.customerId?.customerName || 'Unknown Customer',
              warehouseName: order.warehouseId?.name || '',
              orderDate: order.orderDate,
              grandTotal: roundMoney(order.grandTotal),
              status: order.status,
            }))
          : [],

        recentActivities: canViewActivities
          ? recentActivities.map((activity) => ({
              _id: activity._id,
              action: activity.action || '',
              description: activity.description || '',
              createdAt: activity.createdAt,
            }))
          : [],
      },
    })
  } catch (error) {
    console.error('Company Dashboard Error:', error)

    return res.status(error.status || 500).json({
      success: false,
      message: error.status ? error.message : 'Unable to load dashboard summary.',
    })
  }
})

module.exports = router
