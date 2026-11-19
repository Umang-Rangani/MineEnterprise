const express = require('express')
const mongoose = require('mongoose')

const Invoice = require('../models/Invoice')
const SalesDispatch = require('../models/SalesDispatch')
const Purchase = require('../models/Purchase')

const Inventory = require('../models/Inventory')
const Product = require('../models/Product')
const Warehouse = require('../models/Warehouse')
const Customer = require('../models/Customer')
const Supplier = require('../models/Supplier')
const Payment = require('../models/Payment')

const InventoryMovement = require('../models/InventoryMovement')
const Expense = require('../models/Expense')

const authMiddleware = require('../middleware/authMiddleware')
const permissionMiddleware = require('../middleware/permissionMiddleware')
const generateInventoryReportPDF = require('../utils/generateInventoryReportPDF')
const generateCustomerReportPDF = require('../utils/generateCustomerReportPDF')
const generateSupplierReportPDF = require('../utils/generateSupplierReportPDF')
const generateInvoiceReportPDF = require('../utils/generateInvoiceReportPDF')
const generatePaymentReportPDF = require('../utils/generatePaymentReportPDF')
const generateExpenseReportPDF = require('../utils/generateExpenseReportPDF')

const generateSalesReportPDF = require('../utils/generateSalesReportPDF')
const generatePurchaseReportPDF = require('../utils/generatePurchaseReportPDF')
const generateStockMovementReportPDF = require('../utils/generateStockMovementReportPDF')

const router = express.Router()

router.use(authMiddleware)

const REVENUE_STATUSES = ['Approved', 'Partially Paid', 'Paid', 'Overdue']

const roundMoney = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id)

const getCompanyId = (req) => {
  if (req.user?.role === 'SuperAdmin') {
    return req.query.companyId || null
  }

  return req.user?.companyId || req.company?._id || req.company || null
}

const getUserRoles = (user) => {
  const roles = []

  if (user?.role) {
    roles.push(user.role)
  }

  if (Array.isArray(user?.roles)) {
    user.roles.forEach((role) => {
      if (typeof role === 'string') {
        roles.push(role)
      } else if (role?.name) {
        roles.push(role.name)
      }
    })
  }

  return [...new Set(roles)]
}

const isWarehouseAdmin = (user) => {
  const roles = getUserRoles(user)

  return roles.some((role) => ['SuperAdmin', 'CompanyAdmin', 'Manager'].includes(role))
}

const getAllowedWarehouseIds = (user) => {
  const ids = []

  const addId = (value) => {
    if (!value) return

    if (typeof value === 'object') {
      value = value._id || value.id
    }

    if (value && isValidObjectId(value)) {
      ids.push(String(value))
    }
  }

  if (Array.isArray(user?.assignedWarehouses)) {
    user.assignedWarehouses.forEach(addId)
  }

  if (Array.isArray(user?.warehouseIds)) {
    user.warehouseIds.forEach(addId)
  }

  addId(user?.defaultWarehouseId)
  addId(user?.warehouseId)

  return [...new Set(ids)]
}

const getDateFilter = (fromDate, toDate) => {
  const filter = {}

  if (fromDate) {
    const start = new Date(fromDate)

    if (Number.isNaN(start.getTime())) {
      return { error: 'Invalid fromDate.' }
    }

    start.setHours(0, 0, 0, 0)
    filter.$gte = start
  }

  if (toDate) {
    const end = new Date(toDate)

    if (Number.isNaN(end.getTime())) {
      return { error: 'Invalid toDate.' }
    }

    end.setHours(23, 59, 59, 999)
    filter.$lte = end
  }

  if (filter.$gte && filter.$lte && filter.$gte > filter.$lte) {
    return { error: 'fromDate cannot be after toDate.' }
  }

  return filter
}

const getCompanyDetails = async (req, companyId) => {
  const Company = mongoose.model('CompanyEnterPrise')

  const company = await Company.findOne({
    _id: companyId,
    status: 'Approved',
  })
    .select('companyName companyEmail companyPhone addressLine1 addressLine2 city state country postalCode gstNumber panNumber currency logo')
    .lean()

  return company
}

const getStockMovementReportFilter = (req, companyId, allowedWarehouseIds = null) => {
  const filter = { companyId }

  const { fromDate, toDate, productId, warehouseId, type } = req.query

  // Date filter
  if (fromDate || toDate) {
    const createdAt = {}

    if (fromDate) {
      const startDate = new Date(fromDate)
      startDate.setHours(0, 0, 0, 0)

      if (!Number.isNaN(startDate.getTime())) {
        createdAt.$gte = startDate
      }
    }

    if (toDate) {
      const endDate = new Date(toDate)
      endDate.setHours(23, 59, 59, 999)

      if (!Number.isNaN(endDate.getTime())) {
        createdAt.$lte = endDate
      }
    }

    if (Object.keys(createdAt).length) {
      filter.createdAt = createdAt
    }
  }

  // Product filter
  if (productId && mongoose.Types.ObjectId.isValid(productId)) {
    filter.productId = productId
  }

  // Movement type filter
  const allowedTypes = ['STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'TRANSFER']

  if (type && allowedTypes.includes(type)) {
    filter.type = type
  }

  // Warehouse access and selected warehouse filter
  if (warehouseId && mongoose.Types.ObjectId.isValid(warehouseId)) {
    if (allowedWarehouseIds && !allowedWarehouseIds.some((id) => id.toString() === warehouseId.toString())) {
      return null
    }

    filter.$or = [{ warehouseId }, { destinationWarehouseId: warehouseId }]
  } else if (allowedWarehouseIds) {
    filter.$or = [{ warehouseId: { $in: allowedWarehouseIds } }, { destinationWarehouseId: { $in: allowedWarehouseIds } }]
  }

  return filter
}

const getDispatchCostMap = async (companyId, invoices) => {
  const dispatchIds = [
    ...new Set(
      invoices.flatMap((invoice) =>
        (invoice.items || [])
          .map((item) => item.dispatchId)
          .filter(Boolean)
          .map(String),
      ),
    ),
  ]

  if (!dispatchIds.length) {
    return new Map()
  }

  const dispatches = await SalesDispatch.find({
    companyId,
    status: 'Confirmed',
    _id: {
      $in: dispatchIds,
    },
  })
    .select('items')
    .lean()

  const costMap = new Map()

  dispatches.forEach((dispatch) => {
    ;(dispatch.items || []).forEach((item) => {
      const key = `${dispatch._id}_${item._id}`

      const quantity = Number(item.quantity || 0)
      const totalCost = Number(item.totalCost || 0)

      costMap.set(key, {
        quantity,
        totalCost,
      })
    })
  })

  return costMap
}

const calculateInvoiceCost = (invoice, costMap) => {
  let allocatedCOGS = 0
  let missingCostItems = 0

  ;(invoice.items || []).forEach((item) => {
    const key = `${item.dispatchId}_${item.dispatchItemId}`
    const dispatchItem = costMap.get(key)

    if (!dispatchItem || dispatchItem.quantity <= 0 || !Number.isFinite(Number(item.quantity))) {
      missingCostItems += 1
      return
    }

    const itemCost = (dispatchItem.totalCost / dispatchItem.quantity) * Number(item.quantity || 0)

    allocatedCOGS += itemCost
  })

  return {
    allocatedCOGS: roundMoney(allocatedCOGS),
    missingCostItems,
  }
}

const getInvoiceRow = (invoice, costMap) => {
  const cost = calculateInvoiceCost(invoice, costMap)

  const subtotal = Number(invoice.subtotal || 0)
  const discount = Number(invoice.discount || 0)
  const netSales = roundMoney(subtotal - discount)

  const allocatedCOGS = cost.allocatedCOGS

  return {
    _id: invoice._id,
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.invoiceDate,
    dueDate: invoice.dueDate,

    customer: invoice.customerId
      ? {
          _id: invoice.customerId._id,
          name: invoice.customerId.customerName || invoice.customerId.companyName || invoice.customerId.name || '',
          code: invoice.customerId.customerCode || '',
        }
      : null,

    salesOrder: invoice.salesOrderId
      ? {
          _id: invoice.salesOrderId._id,
          orderNumber: invoice.salesOrderId.orderNumber || '',
        }
      : null,

    warehouse: invoice.warehouseId
      ? {
          _id: invoice.warehouseId._id,
          name: invoice.warehouseId.name || '',
          code: invoice.warehouseId.code || '',
        }
      : null,

    status: invoice.status,

    subtotal: roundMoney(subtotal),
    discount: roundMoney(discount),
    netSales,

    taxAmount: roundMoney(invoice.taxAmount),
    grandTotal: roundMoney(invoice.grandTotal),
    paidAmount: roundMoney(invoice.paidAmount),
    balanceAmount: roundMoney(invoice.balanceAmount),

    allocatedCOGS,
    grossProfit: roundMoney(netSales - allocatedCOGS),

    costAllocationMissing: cost.missingCostItems > 0,
    missingCostItems: cost.missingCostItems,

    notes: invoice.notes || '',
  }
}

// GET /erp/reports/sales

router.get('/sales', permissionMiddleware('Reports', 'sales'), async (req, res, next) => {
  try {
    const companyId = getCompanyId(req)

    if (!companyId || !isValidObjectId(companyId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid companyId is required.',
      })
    }

    const { page = 1, limit = 10, status, customerId, warehouseId, fromDate, toDate, search } = req.query

    const currentPage = Math.max(1, Number.parseInt(page, 10) || 1)
    const pageLimit = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 10))

    if (status && !REVENUE_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid invoice status.',
      })
    }

    if (customerId && !isValidObjectId(customerId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customerId.',
      })
    }

    if (warehouseId && !isValidObjectId(warehouseId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid warehouseId.',
      })
    }

    if (search && String(search).trim().length > 150) {
      return res.status(400).json({
        success: false,
        message: 'Search text is too long.',
      })
    }

    const dateFilter = getDateFilter(fromDate, toDate)

    if (dateFilter.error) {
      return res.status(400).json({
        success: false,
        message: dateFilter.error,
      })
    }

    const filter = {
      companyId,
      status: status || { $in: REVENUE_STATUSES },
    }

    if (Object.keys(dateFilter).length) {
      filter.invoiceDate = dateFilter
    }

    if (customerId) {
      filter.customerId = customerId
    }

    if (warehouseId) {
      filter.warehouseId = warehouseId
    }

    // Warehouse access restriction
    if (!isWarehouseAdmin(req.user)) {
      const allowedWarehouseIds = getAllowedWarehouseIds(req.user)

      if (!allowedWarehouseIds.length) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to any warehouse.',
        })
      }

      if (warehouseId) {
        if (!allowedWarehouseIds.includes(String(warehouseId))) {
          return res.status(403).json({
            success: false,
            message: 'You do not have access to this warehouse.',
          })
        }
      } else {
        filter.warehouseId = {
          $in: allowedWarehouseIds.map((id) => new mongoose.Types.ObjectId(id)),
        }
      }
    }

    if (search?.trim()) {
      const searchRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')

      filter.$or = [{ invoiceNumber: searchRegex }, { notes: searchRegex }]
    }

    // Fetch all matching invoices for accurate summary.
    const invoices = await Invoice.find(filter)
      .select('invoiceNumber invoiceDate dueDate customerId salesOrderId warehouseId status subtotal discount taxAmount grandTotal paidAmount balanceAmount items notes createdAt')
      .populate('customerId', 'customerName companyName name customerCode')
      .populate('salesOrderId', 'orderNumber')
      .populate('warehouseId', 'name code')
      .sort({
        invoiceDate: -1,
        createdAt: -1,
      })
      .lean()

    const costMap = await getDispatchCostMap(companyId, invoices)

    const allRows = invoices.map((invoice) => {
      const row = getInvoiceRow(invoice, costMap)

      // Frontend compatibility
      return {
        ...row,
        date: row.invoiceDate,

        customerId: row.customer
          ? {
              _id: row.customer._id,
              customerName: row.customer.name,
              customerCode: row.customer.code,
            }
          : null,

        salesOrderId: row.salesOrder
          ? {
              _id: row.salesOrder._id,
              orderNumber: row.salesOrder.orderNumber,
            }
          : null,

        warehouseId: row.warehouse
          ? {
              _id: row.warehouse._id,
              name: row.warehouse.name,
              code: row.warehouse.code,
            }
          : null,

        tax: row.taxAmount,
        paid: row.paidAmount,
        balance: row.balanceAmount,
      }
    })

    // Summary from all matching invoices.
    const summary = {
      totalInvoices: allRows.length,
      netSales: 0,
      taxAmount: 0,
      grandTotal: 0,
      paidAmount: 0,
      balanceAmount: 0,
      allocatedCOGS: 0,
      grossProfit: 0,
    }

    allRows.forEach((row) => {
      summary.netSales += row.netSales
      summary.taxAmount += row.taxAmount
      summary.grandTotal += row.grandTotal
      summary.paidAmount += row.paidAmount
      summary.balanceAmount += row.balanceAmount
      summary.allocatedCOGS += row.allocatedCOGS
      summary.grossProfit += row.grossProfit
    })

    Object.keys(summary).forEach((key) => {
      if (key !== 'totalInvoices') {
        summary[key] = roundMoney(summary[key])
      }
    })

    // Pagination
    const total = allRows.length
    const totalPages = Math.ceil(total / pageLimit)

    const data = allRows.slice((currentPage - 1) * pageLimit, currentPage * pageLimit)

    return res.status(200).json({
      success: true,
      message: 'Sales Report fetched successfully.',
      data,
      summary,
      pagination: {
        total,
        page: currentPage,
        currentPage,
        limit: pageLimit,
        totalPages,
      },
    })
  } catch (error) {
    next(error)
  }
})

// GET /erp/reports/sales/pdf

router.get('/sales/pdf', permissionMiddleware('Reports', 'sales'), async (req, res, next) => {
  try {
    const companyId = getCompanyId(req)

    if (!companyId || !isValidObjectId(companyId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid companyId is required.',
      })
    }

    const { status, customerId, warehouseId, fromDate, toDate, search } = req.query

    if (status && !REVENUE_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid invoice status for Sales Report.',
      })
    }

    if (customerId && !isValidObjectId(customerId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customerId.',
      })
    }

    if (warehouseId && !isValidObjectId(warehouseId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid warehouseId.',
      })
    }

    if (search && String(search).trim().length > 150) {
      return res.status(400).json({
        success: false,
        message: 'Search text is too long.',
      })
    }

    const dateFilter = getDateFilter(fromDate, toDate)

    if (dateFilter.error) {
      return res.status(400).json({
        success: false,
        message: dateFilter.error,
      })
    }

    const filter = {
      companyId,
      status: status ? status : { $in: REVENUE_STATUSES },
    }

    if (Object.keys(dateFilter).length) {
      filter.invoiceDate = dateFilter
    }

    if (customerId) {
      filter.customerId = customerId
    }

    if (warehouseId) {
      filter.warehouseId = warehouseId
    }

    // Warehouse access restriction
    if (!isWarehouseAdmin(req.user)) {
      const allowedWarehouseIds = getAllowedWarehouseIds(req.user)

      if (!allowedWarehouseIds.length) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to any warehouse.',
        })
      }

      if (warehouseId) {
        if (!allowedWarehouseIds.includes(String(warehouseId))) {
          return res.status(403).json({
            success: false,
            message: 'You do not have access to this warehouse.',
          })
        }
      } else {
        filter.warehouseId = {
          $in: allowedWarehouseIds.map((id) => new mongoose.Types.ObjectId(id)),
        }
      }
    }

    if (search?.trim()) {
      const searchRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')

      filter.$or = [{ invoiceNumber: searchRegex }, { notes: searchRegex }]
    }

    // Fetch ALL matching invoices for PDF.
    const invoices = await Invoice.find(filter)
      .select('invoiceNumber invoiceDate dueDate customerId salesOrderId warehouseId status subtotal discount taxAmount grandTotal paidAmount balanceAmount items notes')
      .populate('customerId', 'customerName companyName name customerCode')
      .populate('salesOrderId', 'orderNumber')
      .populate('warehouseId', 'name code')
      .sort({
        invoiceDate: -1,
        createdAt: -1,
      })
      .lean()

    const costMap = await getDispatchCostMap(companyId, invoices)

    const rows = invoices.map((invoice) => getInvoiceRow(invoice, costMap))

    const summary = {
      invoiceCount: rows.length,
      subtotal: 0,
      discount: 0,
      netSales: 0,
      taxAmount: 0,
      grandTotal: 0,
      paidAmount: 0,
      balanceAmount: 0,
      allocatedCOGS: 0,
      grossProfit: 0,
      invoicesWithMissingCost: 0,
    }

    rows.forEach((row) => {
      summary.subtotal += row.subtotal
      summary.discount += row.discount
      summary.netSales += row.netSales
      summary.taxAmount += row.taxAmount
      summary.grandTotal += row.grandTotal
      summary.paidAmount += row.paidAmount
      summary.balanceAmount += row.balanceAmount
      summary.allocatedCOGS += row.allocatedCOGS
      summary.grossProfit += row.grossProfit

      if (row.costAllocationMissing) {
        summary.invoicesWithMissingCost += 1
      }
    })

    Object.keys(summary).forEach((key) => {
      if (key !== 'invoiceCount' && key !== 'invoicesWithMissingCost') {
        summary[key] = roundMoney(summary[key])
      }
    })

    // Get approved company details.
    const Company = mongoose.model('CompanyEnterPrise')

    const company = await Company.findOne({
      _id: companyId,
      status: 'Approved',
    })
      .select('companyName companyEmail companyPhone addressLine1 addressLine2 city state country postalCode gstNumber panNumber currency logo')
      .lean()

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company details not found.',
      })
    }

    const pdfBuffer = await generateSalesReportPDF(rows, summary, company, {
      fromDate,
      toDate,
      status,
      search,
    })

    const fileName = `Sales-Report-${new Date().toISOString().slice(0, 10)}.pdf`

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${fileName}"`,
      'Content-Length': pdfBuffer.length,
      'Cache-Control': 'private, no-store',
    })

    return res.status(200).send(pdfBuffer)
  } catch (error) {
    next(error)
  }
})

const PURCHASE_STATUSES = ['Draft', 'Ordered', 'Partially Received', 'Received', 'Cancelled']

const PAYMENT_STATUSES = ['Unpaid', 'Partially Paid', 'Paid']

const PURCHASE_FINANCIAL_STATUSES = ['Ordered', 'Partially Received', 'Received']

const getPurchaseReportRow = (purchase) => {
  const items = purchase.items || []

  const orderedQuantity = items.reduce((total, item) => total + Number(item.quantity || 0), 0)

  const receivedQuantity = items.reduce((total, item) => total + Number(item.receivedQuantity || 0), 0)

  const damagedQuantity = items.reduce((total, item) => total + Number(item.damagedQuantity || 0), 0)

  const acceptedQuantity = items.reduce((total, item) => total + Number(item.acceptedQuantity ?? Number(item.receivedQuantity || 0) - Number(item.damagedQuantity || 0)), 0)

  const pendingQuantity = Math.max(0, orderedQuantity - receivedQuantity)

  const financialPurchase = PURCHASE_FINANCIAL_STATUSES.includes(purchase.status)

  const totalAmount = Number(purchase.totalAmount || 0)
  const paidAmount = Number(purchase.paidAmount || 0)

  return {
    _id: purchase._id,
    purchaseNumber: purchase.purchaseNumber,

    supplier: purchase.supplierId
      ? {
          _id: purchase.supplierId._id,
          name: purchase.supplierId.supplierName || purchase.supplierName || '',
          code: purchase.supplierId.supplierCode || '',
        }
      : {
          _id: null,
          name: purchase.supplierName || '',
          code: '',
        },

    purchaseDate: purchase.purchaseDate,
    expectedDeliveryDate: purchase.expectedDeliveryDate,

    status: purchase.status,
    paymentStatus: purchase.paymentStatus,

    subtotal: roundMoney(purchase.subtotal),
    discountAmount: roundMoney(purchase.discountAmount),
    taxAmount: roundMoney(purchase.taxAmount),
    shippingCharges: roundMoney(purchase.shippingCharges),
    adjustmentAmount: roundMoney(purchase.adjustmentAmount),

    totalAmount: roundMoney(totalAmount),
    paidAmount: roundMoney(paidAmount),

    outstandingAmount: financialPurchase ? roundMoney(Math.max(0, totalAmount - paidAmount)) : 0,

    orderedQuantity: roundMoney(orderedQuantity),
    receivedQuantity: roundMoney(receivedQuantity),
    acceptedQuantity: roundMoney(acceptedQuantity),
    damagedQuantity: roundMoney(damagedQuantity),
    pendingQuantity: roundMoney(pendingQuantity),

    itemCount: items.length,

    notes: purchase.notes || '',
  }
}

// GET /erp/reports/purchase

router.get('/purchase', permissionMiddleware('Reports', 'purchase'), async (req, res, next) => {
  try {
    const companyId = getCompanyId(req)

    if (!companyId || !isValidObjectId(companyId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid companyId is required.',
      })
    }

    const { page = 1, limit = 10, status, paymentStatus, supplierId, fromDate, toDate, search } = req.query

    const currentPage = Math.max(1, Number.parseInt(page, 10) || 1)

    const pageLimit = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 10))

    if (status && !PURCHASE_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid purchase status.',
      })
    }

    if (paymentStatus && !PAYMENT_STATUSES.includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment status.',
      })
    }

    if (supplierId && !isValidObjectId(supplierId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid supplierId.',
      })
    }

    if (search && String(search).trim().length > 150) {
      return res.status(400).json({
        success: false,
        message: 'Search text is too long.',
      })
    }

    const dateFilter = getDateFilter(fromDate, toDate)

    if (dateFilter.error) {
      return res.status(400).json({
        success: false,
        message: dateFilter.error,
      })
    }

    const filter = {
      companyId,
    }

    if (status) {
      filter.status = status
    }

    if (paymentStatus) {
      filter.paymentStatus = paymentStatus
    }

    if (supplierId) {
      filter.supplierId = supplierId
    }

    if (Object.keys(dateFilter).length) {
      filter.purchaseDate = dateFilter
    }

    if (search?.trim()) {
      const searchRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')

      filter.$or = [{ purchaseNumber: searchRegex }, { supplierName: searchRegex }, { notes: searchRegex }]
    }

    // Fetch all matching purchases for accurate summary.
    const allPurchases = await Purchase.find(filter)
      .select('purchaseNumber supplierId supplierName purchaseDate expectedDeliveryDate status paymentStatus subtotal discountAmount taxAmount shippingCharges adjustmentAmount totalAmount paidAmount items notes')
      .populate('supplierId', 'supplierName supplierCode')
      .sort({
        purchaseDate: -1,
        createdAt: -1,
      })
      .lean()

    const summary = {
      purchaseCount: allPurchases.length,
      financialPurchaseCount: 0,

      subtotal: 0,
      discountAmount: 0,
      taxAmount: 0,
      shippingCharges: 0,
      adjustmentAmount: 0,

      totalAmount: 0,
      paidAmount: 0,
      outstandingAmount: 0,

      orderedQuantity: 0,
      receivedQuantity: 0,
      acceptedQuantity: 0,
      damagedQuantity: 0,
      pendingQuantity: 0,

      draftCount: 0,
      orderedCount: 0,
      partiallyReceivedCount: 0,
      receivedCount: 0,
      cancelledCount: 0,
    }

    allPurchases.forEach((purchase) => {
      const row = getPurchaseReportRow(purchase)

      // Status counts include all matching purchases.
      if (purchase.status === 'Draft') {
        summary.draftCount += 1
      }

      if (purchase.status === 'Ordered') {
        summary.orderedCount += 1
      }

      if (purchase.status === 'Partially Received') {
        summary.partiallyReceivedCount += 1
      }

      if (purchase.status === 'Received') {
        summary.receivedCount += 1
      }

      if (purchase.status === 'Cancelled') {
        summary.cancelledCount += 1
      }

      // Financial totals exclude Draft and Cancelled purchases.
      if (!PURCHASE_FINANCIAL_STATUSES.includes(purchase.status)) {
        return
      }

      summary.financialPurchaseCount += 1

      summary.subtotal += row.subtotal
      summary.discountAmount += row.discountAmount
      summary.taxAmount += row.taxAmount
      summary.shippingCharges += row.shippingCharges
      summary.adjustmentAmount += row.adjustmentAmount

      summary.totalAmount += row.totalAmount
      summary.paidAmount += row.paidAmount
      summary.outstandingAmount += row.outstandingAmount

      summary.orderedQuantity += row.orderedQuantity
      summary.receivedQuantity += row.receivedQuantity
      summary.acceptedQuantity += row.acceptedQuantity
      summary.damagedQuantity += row.damagedQuantity
      summary.pendingQuantity += row.pendingQuantity
    })

    Object.keys(summary).forEach((key) => {
      if (!key.endsWith('Count') && key !== 'purchaseCount' && key !== 'financialPurchaseCount') {
        summary[key] = roundMoney(summary[key])
      }
    })

    const total = allPurchases.length
    const totalPages = Math.ceil(total / pageLimit)

    const paginatedPurchases = allPurchases.slice((currentPage - 1) * pageLimit, currentPage * pageLimit)

    const data = paginatedPurchases.map(getPurchaseReportRow)

    return res.status(200).json({
      success: true,
      message: 'Purchase Report fetched successfully.',
      data,
      summary,
      pagination: {
        total,
        page: currentPage,
        limit: pageLimit,
        totalPages,
      },
    })
  } catch (error) {
    next(error)
  }
})

// GET /erp/reports/purchase/pdf
router.get('/purchase/pdf', permissionMiddleware('Reports', 'purchase'), async (req, res, next) => {
  try {
    const companyId = getCompanyId(req)

    if (!companyId || !isValidObjectId(companyId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid companyId is required.',
      })
    }

    const { status, paymentStatus, supplierId, fromDate, toDate, search } = req.query

    if (status && !PURCHASE_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid purchase status.',
      })
    }

    if (paymentStatus && !PAYMENT_STATUSES.includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment status.',
      })
    }

    if (supplierId && !isValidObjectId(supplierId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid supplierId.',
      })
    }

    if (search && String(search).trim().length > 150) {
      return res.status(400).json({
        success: false,
        message: 'Search text is too long.',
      })
    }

    const dateFilter = getDateFilter(fromDate, toDate)

    if (dateFilter.error) {
      return res.status(400).json({
        success: false,
        message: dateFilter.error,
      })
    }

    const filter = {
      companyId,
    }

    if (status) {
      filter.status = status
    }

    if (paymentStatus) {
      filter.paymentStatus = paymentStatus
    }

    if (supplierId) {
      filter.supplierId = supplierId
    }

    if (Object.keys(dateFilter).length) {
      filter.purchaseDate = dateFilter
    }

    if (search?.trim()) {
      const searchRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')

      filter.$or = [{ purchaseNumber: searchRegex }, { supplierName: searchRegex }, { notes: searchRegex }]
    }

    // Fetch ALL matching purchases for PDF.
    const purchases = await Purchase.find(filter)
      .select('purchaseNumber supplierId supplierName purchaseDate expectedDeliveryDate status paymentStatus subtotal discountAmount taxAmount shippingCharges adjustmentAmount totalAmount paidAmount items notes createdAt')
      .populate('supplierId', 'supplierName supplierCode')
      .sort({
        purchaseDate: -1,
        createdAt: -1,
      })
      .lean()

    const rows = purchases.map(getPurchaseReportRow)

    // Calculate summary using the same rules as Purchase Report.
    const summary = {
      purchaseCount: purchases.length,
      financialPurchaseCount: 0,

      subtotal: 0,
      discountAmount: 0,
      taxAmount: 0,
      shippingCharges: 0,
      adjustmentAmount: 0,

      totalAmount: 0,
      paidAmount: 0,
      outstandingAmount: 0,

      orderedQuantity: 0,
      receivedQuantity: 0,
      acceptedQuantity: 0,
      damagedQuantity: 0,
      pendingQuantity: 0,

      draftCount: 0,
      orderedCount: 0,
      partiallyReceivedCount: 0,
      receivedCount: 0,
      cancelledCount: 0,
    }

    rows.forEach((row) => {
      if (row.status === 'Draft') summary.draftCount += 1
      if (row.status === 'Ordered') summary.orderedCount += 1
      if (row.status === 'Partially Received') summary.partiallyReceivedCount += 1
      if (row.status === 'Received') summary.receivedCount += 1
      if (row.status === 'Cancelled') summary.cancelledCount += 1

      if (!PURCHASE_FINANCIAL_STATUSES.includes(row.status)) {
        return
      }

      summary.financialPurchaseCount += 1

      summary.subtotal += row.subtotal
      summary.discountAmount += row.discountAmount
      summary.taxAmount += row.taxAmount
      summary.shippingCharges += row.shippingCharges
      summary.adjustmentAmount += row.adjustmentAmount

      summary.totalAmount += row.totalAmount
      summary.paidAmount += row.paidAmount
      summary.outstandingAmount += row.outstandingAmount

      summary.orderedQuantity += row.orderedQuantity
      summary.receivedQuantity += row.receivedQuantity
      summary.acceptedQuantity += row.acceptedQuantity
      summary.damagedQuantity += row.damagedQuantity
      summary.pendingQuantity += row.pendingQuantity
    })

    Object.keys(summary).forEach((key) => {
      if (key !== 'purchaseCount' && key !== 'financialPurchaseCount' && !key.endsWith('Count')) {
        summary[key] = roundMoney(summary[key])
      }
    })

    // Get approved company details.
    const Company = mongoose.model('CompanyEnterPrise')

    const company = await Company.findOne({
      _id: companyId,
      status: 'Approved',
    })
      .select('companyName companyEmail companyPhone addressLine1 addressLine2 city state country postalCode gstNumber panNumber currency logo')
      .lean()

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company details not found.',
      })
    }

    const pdfBuffer = await generatePurchaseReportPDF(rows, summary, company, {
      fromDate,
      toDate,
      status,
      paymentStatus,
      supplierId,
      search,
    })

    const fileName = `Purchase-Report-${new Date().toISOString().slice(0, 10)}.pdf`

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${fileName}"`,
      'Content-Length': pdfBuffer.length,
      'Cache-Control': 'private, no-store',
    })

    return res.status(200).send(pdfBuffer)
  } catch (error) {
    next(error)
  }
})

// Inventory Report
const INVENTORY_STOCK_STATUSES = ['In Stock', 'Low Stock', 'Out of Stock']
const PRODUCT_STATUSES = ['Active', 'Inactive']

const getInventoryStockStatus = (availableStock, minStockLevel) => {
  if (availableStock <= 0) return 'Out of Stock'
  if (availableStock <= minStockLevel) return 'Low Stock'
  return 'In Stock'
}

const getInventoryReportRow = (product, inventoryRows) => {
  const currentStock = inventoryRows.reduce((sum, row) => sum + Number(row.currentStock || 0), 0)

  const reservedStock = inventoryRows.reduce((sum, row) => sum + Number(row.reservedStock || 0), 0)

  const availableStock = Math.max(0, currentStock - reservedStock)

  const stockValue = roundMoney(inventoryRows.reduce((sum, row) => sum + Number(row.stockValue || 0), 0))

  const averageCost = currentStock > 0 ? roundMoney(stockValue / currentStock) : 0

  const minStockLevel = Number(product.minStockLevel || 0)

  return {
    _id: product._id,
    name: product.name,
    sku: product.sku,
    barcode: product.barcode || '',
    unit: product.unit || 'Piece',

    category: product.categoryId
      ? {
          _id: product.categoryId._id,
          name: product.categoryId.name || '',
        }
      : null,

    productStatus: product.status,

    minStockLevel,

    currentStock,
    reservedStock,
    availableStock,

    averageCost,
    stockValue,

    stockStatus: getInventoryStockStatus(availableStock, minStockLevel),

    warehouseStock: inventoryRows.map((row) => ({
      inventoryId: row._id,

      warehouse: row.warehouseId
        ? {
            _id: row.warehouseId._id,
            name: row.warehouseId.name || '',
            code: row.warehouseId.code || '',
          }
        : null,

      currentStock: Number(row.currentStock || 0),
      reservedStock: Number(row.reservedStock || 0),

      availableStock: Math.max(0, Number(row.currentStock || 0) - Number(row.reservedStock || 0)),

      averageCost: Number(row.averageCost || 0),
      stockValue: roundMoney(row.stockValue),
    })),
  }
}

// GET /erp/reports/inventory

router.get('/inventory', permissionMiddleware('Reports', 'inventory'), async (req, res, next) => {
  try {
    const companyId = getCompanyId(req)

    if (!companyId || !isValidObjectId(companyId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid companyId is required.',
      })
    }

    const { page = 1, limit = 10, search, categoryId, warehouseId, productStatus, stockStatus } = req.query

    const currentPage = Math.max(1, Number.parseInt(page, 10) || 1)

    const pageLimit = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 10))

    if (categoryId && !isValidObjectId(categoryId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid categoryId.',
      })
    }

    if (warehouseId && !isValidObjectId(warehouseId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid warehouseId.',
      })
    }

    if (productStatus && !PRODUCT_STATUSES.includes(productStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product status.',
      })
    }

    if (stockStatus && !INVENTORY_STOCK_STATUSES.includes(stockStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid stock status.',
      })
    }

    if (search && String(search).trim().length > 150) {
      return res.status(400).json({
        success: false,
        message: 'Search text is too long.',
      })
    }

    const productFilter = { companyId }

    if (categoryId) {
      productFilter.categoryId = categoryId
    }

    if (productStatus) {
      productFilter.status = productStatus
    }

    if (search?.trim()) {
      const searchRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')

      productFilter.$or = [{ name: searchRegex }, { sku: searchRegex }, { barcode: searchRegex }]
    }

    // Validate selected warehouse belongs to this company.
    let selectedWarehouse = null

    if (warehouseId) {
      selectedWarehouse = await Warehouse.findOne({
        _id: warehouseId,
        companyId,
      })
        .select('_id name code')
        .lean()

      if (!selectedWarehouse) {
        return res.status(404).json({
          success: false,
          message: 'Warehouse not found in your company.',
        })
      }
    }

    // Warehouse access restriction.
    let allowedWarehouseIds = null

    if (!isWarehouseAdmin(req.user)) {
      allowedWarehouseIds = getAllowedWarehouseIds(req.user)

      if (!allowedWarehouseIds.length) {
        return res.status(200).json({
          success: true,
          message: 'Inventory Report fetched successfully.',
          data: [],
          summary: {
            productCount: 0,
            totalStock: 0,
            reservedStock: 0,
            availableStock: 0,
            totalStockValue: 0,
            averageCost: 0,
            inStockCount: 0,
            lowStockCount: 0,
            outOfStockCount: 0,
          },
          pagination: {
            total: 0,
            page: currentPage,
            limit: pageLimit,
            totalPages: 0,
          },
        })
      }

      if (warehouseId && !allowedWarehouseIds.includes(String(warehouseId))) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this warehouse.',
        })
      }
    }

    const inventoryFilter = {
      companyId,
    }

    if (selectedWarehouse) {
      inventoryFilter.warehouseId = selectedWarehouse._id
    } else if (allowedWarehouseIds) {
      inventoryFilter.warehouseId = {
        $in: allowedWarehouseIds.map((id) => new mongoose.Types.ObjectId(id)),
      }
    }

    // Fetch matching products.
    const products = await Product.find(productFilter).select('_id name sku barcode unit categoryId minStockLevel status').populate('categoryId', 'name').sort({ name: 1 }).lean()

    const productIds = products.map((product) => product._id)

    // Fetch inventory records for these products.
    const inventories = productIds.length
      ? await Inventory.find({
          ...inventoryFilter,
          productId: { $in: productIds },
        })
          .populate('warehouseId', 'name code')
          .lean()
      : []

    const inventoryMap = new Map()

    inventories.forEach((row) => {
      const key = String(row.productId)

      if (!inventoryMap.has(key)) {
        inventoryMap.set(key, [])
      }

      inventoryMap.get(key).push(row)
    })

    // Build complete report rows before applying stock-status filter.
    let reportRows = products.map((product) => getInventoryReportRow(product, inventoryMap.get(String(product._id)) || []))

    if (stockStatus) {
      reportRows = reportRows.filter((row) => row.stockStatus === stockStatus)
    }

    // Summary is based on all filtered records, not current page.
    const summary = {
      productCount: reportRows.length,

      totalStock: 0,
      reservedStock: 0,
      availableStock: 0,

      totalStockValue: 0,
      averageCost: 0,

      inStockCount: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
    }

    reportRows.forEach((row) => {
      summary.totalStock += row.currentStock
      summary.reservedStock += row.reservedStock
      summary.availableStock += row.availableStock
      summary.totalStockValue += row.stockValue

      if (row.stockStatus === 'In Stock') {
        summary.inStockCount += 1
      } else if (row.stockStatus === 'Low Stock') {
        summary.lowStockCount += 1
      } else {
        summary.outOfStockCount += 1
      }
    })

    summary.totalStock = roundMoney(summary.totalStock)
    summary.reservedStock = roundMoney(summary.reservedStock)
    summary.availableStock = roundMoney(summary.availableStock)
    summary.totalStockValue = roundMoney(summary.totalStockValue)

    summary.averageCost = summary.totalStock > 0 ? roundMoney(summary.totalStockValue / summary.totalStock) : 0

    // Pagination after all filters.
    const total = reportRows.length
    const totalPages = Math.ceil(total / pageLimit)

    const data = reportRows.slice((currentPage - 1) * pageLimit, currentPage * pageLimit)

    return res.status(200).json({
      success: true,
      message: 'Inventory Report fetched successfully.',
      data,
      summary,
      pagination: {
        total,
        page: currentPage,
        limit: pageLimit,
        totalPages,
      },
    })
  } catch (error) {
    next(error)
  }
})

// GET /erp/reports/inventory/pdf

router.get('/inventory/pdf', permissionMiddleware('Reports', 'inventory'), async (req, res, next) => {
  try {
    const companyId = getCompanyId(req)

    if (!companyId || !isValidObjectId(companyId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid companyId is required.',
      })
    }

    const { search, categoryId, warehouseId, productStatus, stockStatus } = req.query

    if (categoryId && !isValidObjectId(categoryId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid categoryId.',
      })
    }

    if (warehouseId && !isValidObjectId(warehouseId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid warehouseId.',
      })
    }

    if (productStatus && !PRODUCT_STATUSES.includes(productStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product status.',
      })
    }

    if (stockStatus && !INVENTORY_STOCK_STATUSES.includes(stockStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid stock status.',
      })
    }

    if (search && String(search).trim().length > 150) {
      return res.status(400).json({
        success: false,
        message: 'Search text is too long.',
      })
    }

    // Product filters
    const productFilter = { companyId }

    if (categoryId) {
      productFilter.categoryId = categoryId
    }

    if (productStatus) {
      productFilter.status = productStatus
    }

    if (search?.trim()) {
      const searchRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')

      productFilter.$or = [{ name: searchRegex }, { sku: searchRegex }, { barcode: searchRegex }]
    }

    // Validate selected warehouse
    let selectedWarehouse = null

    if (warehouseId) {
      selectedWarehouse = await Warehouse.findOne({
        _id: warehouseId,
        companyId,
      })
        .select('_id name code')
        .lean()

      if (!selectedWarehouse) {
        return res.status(404).json({
          success: false,
          message: 'Warehouse not found in your company.',
        })
      }
    }

    // Warehouse access restriction
    let allowedWarehouseIds = null

    if (!isWarehouseAdmin(req.user)) {
      allowedWarehouseIds = getAllowedWarehouseIds(req.user)

      if (warehouseId && !allowedWarehouseIds.includes(String(warehouseId))) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this warehouse.',
        })
      }
    }

    let reportRows = []

    // Users without assigned warehouses receive an empty report.
    if (isWarehouseAdmin(req.user) || allowedWarehouseIds.length > 0) {
      const inventoryFilter = { companyId }

      if (selectedWarehouse) {
        inventoryFilter.warehouseId = selectedWarehouse._id
      } else if (allowedWarehouseIds) {
        inventoryFilter.warehouseId = {
          $in: allowedWarehouseIds.map((id) => new mongoose.Types.ObjectId(id)),
        }
      }

      // Fetch all matching products.
      const products = await Product.find(productFilter).select('_id name sku barcode unit categoryId minStockLevel status').populate('categoryId', 'name').sort({ name: 1 }).lean()

      const productIds = products.map((product) => product._id)

      // Fetch all matching inventory records.
      const inventories = productIds.length
        ? await Inventory.find({
            ...inventoryFilter,
            productId: { $in: productIds },
          })
            .populate('warehouseId', 'name code')
            .lean()
        : []

      const inventoryMap = new Map()

      inventories.forEach((row) => {
        const key = String(row.productId)

        if (!inventoryMap.has(key)) {
          inventoryMap.set(key, [])
        }

        inventoryMap.get(key).push(row)
      })

      // Build report rows.
      reportRows = products.map((product) => getInventoryReportRow(product, inventoryMap.get(String(product._id)) || []))

      // Apply stock status filter.
      if (stockStatus) {
        reportRows = reportRows.filter((row) => row.stockStatus === stockStatus)
      }
    }

    // Calculate summary using the same rules as Inventory Report.
    const summary = {
      productCount: reportRows.length,

      totalStock: 0,
      reservedStock: 0,
      availableStock: 0,

      totalStockValue: 0,
      averageCost: 0,

      inStockCount: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
    }

    reportRows.forEach((row) => {
      summary.totalStock += row.currentStock
      summary.reservedStock += row.reservedStock
      summary.availableStock += row.availableStock
      summary.totalStockValue += row.stockValue

      if (row.stockStatus === 'In Stock') {
        summary.inStockCount += 1
      } else if (row.stockStatus === 'Low Stock') {
        summary.lowStockCount += 1
      } else {
        summary.outOfStockCount += 1
      }
    })

    summary.totalStock = roundMoney(summary.totalStock)
    summary.reservedStock = roundMoney(summary.reservedStock)
    summary.availableStock = roundMoney(summary.availableStock)
    summary.totalStockValue = roundMoney(summary.totalStockValue)

    summary.averageCost = summary.totalStock > 0 ? roundMoney(summary.totalStockValue / summary.totalStock) : 0

    // Get approved company details.
    const Company = mongoose.model('CompanyEnterPrise')

    const company = await Company.findOne({
      _id: companyId,
      status: 'Approved',
    })
      .select('companyName companyEmail companyPhone addressLine1 addressLine2 city state country postalCode gstNumber panNumber currency logo')
      .lean()

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company details not found.',
      })
    }

    // Get readable filter names for the PDF.
    const categoryName = categoryId ? reportRows.find((row) => row.category?._id)?.category?.name || `Category ID: ${categoryId}` : ''

    const pdfBuffer = await generateInventoryReportPDF(reportRows, summary, company, {
      search: search?.trim() || '',
      categoryName,
      warehouseName: selectedWarehouse?.name || '',
      productStatus: productStatus || '',
      stockStatus: stockStatus || '',
    })

    const fileName = `Inventory-Report-${new Date().toISOString().slice(0, 10)}.pdf`

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${fileName}"`,
      'Content-Length': pdfBuffer.length,
      'Cache-Control': 'private, no-store',
    })

    return res.status(200).send(pdfBuffer)
  } catch (error) {
    next(error)
  }
})

router.get('/stock-movement', permissionMiddleware('Reports', 'inventory'), async (req, res) => {
  try {
    const companyId = getCompanyId(req)

    if (!companyId) {
      return res.status(400).json({
        message: 'Company is required',
      })
    }

    const allowedWarehouseIds = req.user?.role === 'SuperAdmin' || ['CompanyAdmin', 'Manager'].includes(req.user?.role) ? null : await getAllowedWarehouseIds(req.user)

    const filter = getStockMovementReportFilter(req, companyId, allowedWarehouseIds)

    if (!filter) {
      return res.status(403).json({
        message: 'You do not have access to this warehouse',
      })
    }

    const movements = await InventoryMovement.find(filter).populate('productId', 'name sku unit').populate('warehouseId', 'name code').populate('destinationWarehouseId', 'name code').populate('createdBy', 'name').sort({ createdAt: -1 }).lean()

    // Search populated fields
    const search = String(req.query.search || '')
      .trim()
      .toLowerCase()

    const filteredMovements = search
      ? movements.filter((movement) => {
          const searchableText = [
            movement.productId?.name,
            movement.productId?.sku,
            movement.warehouseId?.name,
            movement.warehouseId?.code,
            movement.destinationWarehouseId?.name,
            movement.destinationWarehouseId?.code,
            movement.reference,
            movement.reason,
            movement.type,
            movement.createdBy?.name,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()

          return searchableText.includes(search)
        })
      : movements

    const total = filteredMovements.length
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10))

    const startIndex = (page - 1) * limit

    const data = filteredMovements.slice(startIndex, startIndex + limit)

    // Transfer movements are stored as two records.
    // Count transfer quantity only from the source-side record.
    const summary = filteredMovements.reduce(
      (acc, movement) => {
        const quantity = Number(movement.quantity) || 0

        acc.totalMovements += 1

        if (movement.type === 'STOCK_IN') {
          acc.stockIn += quantity
        }

        if (movement.type === 'STOCK_OUT') {
          acc.stockOut += quantity
        }

        if (movement.type === 'ADJUSTMENT') {
          acc.adjustmentNet += (Number(movement.newStock) || 0) - (Number(movement.previousStock) || 0)
        }

        if (movement.type === 'TRANSFER' && (Number(movement.newStock) || 0) < (Number(movement.previousStock) || 0)) {
          acc.transferQuantity += quantity
        }

        return acc
      },
      {
        totalMovements: 0,
        stockIn: 0,
        stockOut: 0,
        adjustmentNet: 0,
        transferQuantity: 0,
      },
    )

    return res.status(200).json({
      message: 'Stock movement report fetched successfully',
      data,
      summary,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Stock Movement Report Error:', error)

    return res.status(500).json({
      message: 'Failed to fetch stock movement report',
      error: error.message,
    })
  }
})

router.get('/stock-movement/pdf', permissionMiddleware('Reports', 'inventory'), async (req, res) => {
  try {
    const companyId = getCompanyId(req)

    if (!companyId) {
      return res.status(400).json({
        message: 'Company is required',
      })
    }

    const allowedWarehouseIds = req.user?.role === 'SuperAdmin' || ['CompanyAdmin', 'Manager'].includes(req.user?.role) ? null : await getAllowedWarehouseIds(req.user)

    const filter = getStockMovementReportFilter(req, companyId, allowedWarehouseIds)

    if (!filter) {
      return res.status(403).json({
        message: 'You do not have access to this warehouse',
      })
    }

    const movements = await InventoryMovement.find(filter).populate('productId', 'name sku unit').populate('warehouseId', 'name code').populate('destinationWarehouseId', 'name code').populate('createdBy', 'name').sort({ createdAt: -1 }).lean()

    const search = String(req.query.search || '')
      .trim()
      .toLowerCase()

    const filteredMovements = search
      ? movements.filter((movement) => {
          const searchableText = [
            movement.productId?.name,
            movement.productId?.sku,
            movement.warehouseId?.name,
            movement.warehouseId?.code,
            movement.destinationWarehouseId?.name,
            movement.destinationWarehouseId?.code,
            movement.reference,
            movement.reason,
            movement.type,
            movement.createdBy?.name,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()

          return searchableText.includes(search)
        })
      : movements

    const summary = filteredMovements.reduce(
      (acc, movement) => {
        const quantity = Number(movement.quantity) || 0

        acc.totalMovements += 1

        if (movement.type === 'STOCK_IN') {
          acc.stockIn += quantity
        }

        if (movement.type === 'STOCK_OUT') {
          acc.stockOut += quantity
        }

        if (movement.type === 'ADJUSTMENT') {
          acc.adjustmentNet += (Number(movement.newStock) || 0) - (Number(movement.previousStock) || 0)
        }

        if (movement.type === 'TRANSFER' && (Number(movement.newStock) || 0) < (Number(movement.previousStock) || 0)) {
          acc.transferQuantity += quantity
        }

        return acc
      },
      {
        totalMovements: 0,
        stockIn: 0,
        stockOut: 0,
        adjustmentNet: 0,
        transferQuantity: 0,
      },
    )

    const pdfBuffer = await generateStockMovementReportPDF({
      movements: filteredMovements,
      summary,
      companyName: req.company?.companyName || 'MineERP',
      filters: {
        fromDate: req.query.fromDate,
        toDate: req.query.toDate,
        type: req.query.type,
        search: req.query.search,
      },
    })

    const fileName = `Stock-Movement-Report-${new Date().toISOString().slice(0, 10)}.pdf`

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`)

    return res.status(200).send(pdfBuffer)
  } catch (error) {
    console.error('Stock Movement PDF Error:', error)

    return res.status(500).json({
      message: 'Failed to generate stock movement PDF',
      error: error.message,
    })
  }
})

// customer

// CUSTOMER REPORT

const CUSTOMER_STATUSES = ['Active', 'Inactive']

const CUSTOMER_INVOICE_STATUSES = ['Approved', 'Partially Paid', 'Paid', 'Overdue']

// GET /erp/reports/customer

router.get('/customer', permissionMiddleware('Reports', 'customer'), async (req, res, next) => {
  try {
    const companyId = getCompanyId(req)

    if (!companyId || !isValidObjectId(companyId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid companyId is required.',
      })
    }

    const { page = 1, limit = 10, search, status, fromDate, toDate } = req.query

    const currentPage = Math.max(1, Number.parseInt(page, 10) || 1)
    const pageLimit = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 10))

    if (status && !CUSTOMER_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer status.',
      })
    }

    if (search && String(search).trim().length > 150) {
      return res.status(400).json({
        success: false,
        message: 'Search text is too long.',
      })
    }

    // Date validation: applied ONLY to invoice financial calculations.
    const dateFilter = getDateFilter(fromDate, toDate)

    if (dateFilter.error) {
      return res.status(400).json({
        success: false,
        message: dateFilter.error,
      })
    }

    // Customer listing filter.
    // Important: Do not add createdAt/date conditions here.
    const customerFilter = { companyId }

    if (status) {
      customerFilter.status = status
    }

    if (search?.trim()) {
      const searchRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')

      customerFilter.$or = [{ customerName: searchRegex }, { customerCode: searchRegex }, { email: searchRegex }, { phone: searchRegex }, { city: searchRegex }, { state: searchRegex }, { gstNumber: searchRegex }]
    }

    // Fetch ALL matching customers.
    // Date filter must not affect this query.
    const customers = await Customer.find(customerFilter)
      .select('customerName customerCode contactPerson email phone alternatePhone gstNumber addressLine1 addressLine2 city state country postalCode status creditLimit openingBalance createdAt')
      .sort({ customerName: 1, createdAt: -1 })
      .lean()

    const customerIds = customers.map((customer) => customer._id)

    // Invoice financial summary filter.
    // Only this query uses fromDate and toDate.
    const invoiceMatch = {
      companyId: new mongoose.Types.ObjectId(String(companyId)),
      customerId: { $in: customerIds },
      status: { $in: CUSTOMER_INVOICE_STATUSES },
    }

    if (Object.keys(dateFilter).length) {
      invoiceMatch.invoiceDate = dateFilter
    }

    const invoiceSummaries = customerIds.length
      ? await Invoice.aggregate([
          {
            $match: invoiceMatch,
          },
          {
            $group: {
              _id: '$customerId',

              invoiceCount: { $sum: 1 },

              totalInvoiced: { $sum: { $ifNull: ['$grandTotal', 0] } },

              totalPaid: { $sum: { $ifNull: ['$paidAmount', 0] } },

              totalOutstanding: { $sum: { $ifNull: ['$balanceAmount', 0] } },

              lastInvoiceDate: { $max: '$invoiceDate' },
            },
          },
        ])
      : []

    const invoiceMap = new Map(invoiceSummaries.map((item) => [String(item._id), item]))

    // Build customer rows.
    // Customers without invoices in the selected date range remain included.
    const allRows = customers.map((customer) => {
      const financial = invoiceMap.get(String(customer._id))

      return {
        _id: customer._id,

        customerName: customer.customerName || '',
        customerCode: customer.customerCode || '',

        contactPerson: customer.contactPerson || '',
        email: customer.email || '',
        phone: customer.phone || '',
        alternatePhone: customer.alternatePhone || '',

        gstNumber: customer.gstNumber || '',

        addressLine1: customer.addressLine1 || '',
        addressLine2: customer.addressLine2 || '',
        city: customer.city || '',
        state: customer.state || '',
        country: customer.country || '',
        postalCode: customer.postalCode || '',

        status: customer.status,

        creditLimit: roundMoney(customer.creditLimit),
        openingBalance: roundMoney(customer.openingBalance),

        invoiceCount: financial?.invoiceCount || 0,
        totalInvoiced: roundMoney(financial?.totalInvoiced),
        totalPaid: roundMoney(financial?.totalPaid),
        totalOutstanding: roundMoney(financial?.totalOutstanding),
        lastInvoiceDate: financial?.lastInvoiceDate || null,

        createdAt: customer.createdAt,
      }
    })

    // Customer summary is independent of the date filter.
    const summary = {
      totalCustomers: allRows.length,

      activeCustomers: 0,
      inactiveCustomers: 0,

      totalCreditLimit: 0,
      totalOpeningBalance: 0,

      // These financial figures use the selected invoice date range.
      totalInvoiced: 0,
      totalPaid: 0,
      totalOutstanding: 0,
    }

    allRows.forEach((row) => {
      if (row.status === 'Active') {
        summary.activeCustomers += 1
      }

      if (row.status === 'Inactive') {
        summary.inactiveCustomers += 1
      }

      summary.totalCreditLimit += row.creditLimit
      summary.totalOpeningBalance += row.openingBalance

      summary.totalInvoiced += row.totalInvoiced
      summary.totalPaid += row.totalPaid
      summary.totalOutstanding += row.totalOutstanding
    })

    Object.keys(summary).forEach((key) => {
      if (!['totalCustomers', 'activeCustomers', 'inactiveCustomers'].includes(key)) {
        summary[key] = roundMoney(summary[key])
      }
    })

    // Pagination after customer and search/status filtering.
    const total = allRows.length
    const totalPages = Math.ceil(total / pageLimit)

    const data = allRows.slice((currentPage - 1) * pageLimit, currentPage * pageLimit)

    return res.status(200).json({
      success: true,
      message: 'Customer Report fetched successfully.',
      data,
      summary,
      pagination: {
        total,
        page: currentPage,
        currentPage,
        limit: pageLimit,
        totalPages,
      },
    })
  } catch (error) {
    next(error)
  }
})

// GET /erp/reports/customer/pdf

router.get('/customer/pdf', permissionMiddleware('Reports', 'customer'), async (req, res, next) => {
  try {
    const companyId = getCompanyId(req)

    if (!companyId || !isValidObjectId(companyId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid companyId is required.',
      })
    }

    const { search, status, fromDate, toDate } = req.query

    if (status && !CUSTOMER_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer status.',
      })
    }

    if (search && String(search).trim().length > 150) {
      return res.status(400).json({
        success: false,
        message: 'Search text is too long.',
      })
    }

    // Date filter applies ONLY to invoice financial summary.
    const dateFilter = getDateFilter(fromDate, toDate)

    if (dateFilter.error) {
      return res.status(400).json({
        success: false,
        message: dateFilter.error,
      })
    }

    // Customer filter: no date condition here.
    const customerFilter = { companyId }

    if (status) {
      customerFilter.status = status
    }

    if (search?.trim()) {
      const searchRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')

      customerFilter.$or = [{ customerName: searchRegex }, { customerCode: searchRegex }, { email: searchRegex }, { phone: searchRegex }, { city: searchRegex }, { state: searchRegex }, { gstNumber: searchRegex }]
    }

    // Fetch ALL matching customers, regardless of invoice date.
    const customers = await Customer.find(customerFilter)
      .select('customerName customerCode contactPerson email phone alternatePhone gstNumber addressLine1 addressLine2 city state country postalCode status creditLimit openingBalance createdAt')
      .sort({ customerName: 1, createdAt: -1 })
      .lean()

    const customerIds = customers.map((customer) => customer._id)

    // Invoice financial summary uses the selected date range.
    const invoiceMatch = {
      companyId: new mongoose.Types.ObjectId(String(companyId)),
      customerId: { $in: customerIds },
      status: { $in: CUSTOMER_INVOICE_STATUSES },
    }

    if (Object.keys(dateFilter).length) {
      invoiceMatch.invoiceDate = dateFilter
    }

    const invoiceSummaries = customerIds.length
      ? await Invoice.aggregate([
          {
            $match: invoiceMatch,
          },
          {
            $group: {
              _id: '$customerId',
              invoiceCount: { $sum: 1 },
              totalInvoiced: {
                $sum: { $ifNull: ['$grandTotal', 0] },
              },
              totalPaid: {
                $sum: { $ifNull: ['$paidAmount', 0] },
              },
              totalOutstanding: {
                $sum: { $ifNull: ['$balanceAmount', 0] },
              },
              lastInvoiceDate: { $max: '$invoiceDate' },
            },
          },
        ])
      : []

    const invoiceMap = new Map(invoiceSummaries.map((item) => [String(item._id), item]))

    // Build complete customer rows.
    // Customers without invoices in the selected period remain included.
    const rows = customers.map((customer) => {
      const financial = invoiceMap.get(String(customer._id))

      return {
        _id: customer._id,

        customerName: customer.customerName || '',
        customerCode: customer.customerCode || '',

        contactPerson: customer.contactPerson || '',
        email: customer.email || '',
        phone: customer.phone || '',
        alternatePhone: customer.alternatePhone || '',

        gstNumber: customer.gstNumber || '',

        addressLine1: customer.addressLine1 || '',
        addressLine2: customer.addressLine2 || '',
        city: customer.city || '',
        state: customer.state || '',
        country: customer.country || '',
        postalCode: customer.postalCode || '',

        status: customer.status,

        creditLimit: roundMoney(customer.creditLimit),
        openingBalance: roundMoney(customer.openingBalance),

        invoiceCount: financial?.invoiceCount || 0,
        totalInvoiced: roundMoney(financial?.totalInvoiced),
        totalPaid: roundMoney(financial?.totalPaid),
        totalOutstanding: roundMoney(financial?.totalOutstanding),

        lastInvoiceDate: financial?.lastInvoiceDate || null,

        createdAt: customer.createdAt,
      }
    })

    // Summary: customer counts are independent of invoice date.
    const summary = {
      totalCustomers: rows.length,
      activeCustomers: 0,
      inactiveCustomers: 0,

      totalCreditLimit: 0,
      totalOpeningBalance: 0,

      // Financial summary follows the selected invoice date range.
      totalInvoiced: 0,
      totalPaid: 0,
      totalOutstanding: 0,
    }

    rows.forEach((row) => {
      if (row.status === 'Active') {
        summary.activeCustomers += 1
      }

      if (row.status === 'Inactive') {
        summary.inactiveCustomers += 1
      }

      summary.totalCreditLimit += row.creditLimit
      summary.totalOpeningBalance += row.openingBalance

      summary.totalInvoiced += row.totalInvoiced
      summary.totalPaid += row.totalPaid
      summary.totalOutstanding += row.totalOutstanding
    })

    Object.keys(summary).forEach((key) => {
      if (!['totalCustomers', 'activeCustomers', 'inactiveCustomers'].includes(key)) {
        summary[key] = roundMoney(summary[key])
      }
    })

    // Get approved company details.
    const Company = mongoose.model('CompanyEnterPrise')

    const company = await Company.findOne({
      _id: companyId,
      status: 'Approved',
    })
      .select('companyName companyEmail companyPhone addressLine1 addressLine2 city state country postalCode gstNumber panNumber currency logo')
      .lean()

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company details not found.',
      })
    }

    const pdfBuffer = await generateCustomerReportPDF(rows, summary, company, {
      fromDate,
      toDate,
      status,
      search,
    })

    const fileName = `Customer-Report-${new Date().toISOString().slice(0, 10)}.pdf`

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${fileName}"`,
      'Content-Length': pdfBuffer.length,
      'Cache-Control': 'private, no-store',
    })

    return res.status(200).send(pdfBuffer)
  } catch (error) {
    next(error)
  }
})

// @route   GET /erp/reports/supplier
// @desc    Get supplier report
// @access  Private
router.get('/supplier', permissionMiddleware('Reports', 'supplier'), async (req, res) => {
  try {
    const companyId = getCompanyId(req)

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company is required',
      })
    }

    const { search = '', status = '', fromDate, toDate, page = 1, limit = 10 } = req.query

    const currentPage = Math.max(1, Number(page) || 1)
    const pageLimit = Math.min(100, Math.max(1, Number(limit) || 10))
    const skip = (currentPage - 1) * pageLimit

    const supplierFilter = {
      companyId,
    }

    if (['Active', 'Inactive'].includes(status)) {
      supplierFilter.status = status
    }

    if (search.trim()) {
      const searchRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')

      supplierFilter.$or = [{ supplierName: searchRegex }, { supplierCode: searchRegex }, { contactPerson: searchRegex }, { email: searchRegex }, { phone: searchRegex }, { gstNumber: searchRegex }, { city: searchRegex }, { state: searchRegex }]
    }

    const dateFilter = getDateFilter(fromDate, toDate)

    const [suppliers, totalSuppliers, activeSuppliers, inactiveSuppliers] = await Promise.all([
      Supplier.find(supplierFilter).sort({ supplierName: 1 }).skip(skip).limit(pageLimit).lean(),

      Supplier.countDocuments({
        companyId,
        ...(search.trim() ? supplierFilter.$or && { $or: supplierFilter.$or } : {}),
        ...(status ? { status } : {}),
      }),

      Supplier.countDocuments({
        companyId,
        status: 'Active',
      }),

      Supplier.countDocuments({
        companyId,
        status: 'Inactive',
      }),
    ])

    const supplierIds = suppliers.map((supplier) => supplier._id)

    const purchaseMatch = {
      companyId: new mongoose.Types.ObjectId(companyId),
      supplierId: { $in: supplierIds },
      status: { $nin: ['Draft', 'Cancelled'] },
      ...(dateFilter ? { purchaseDate: dateFilter } : {}),
    }

    const purchaseSummary = await Purchase.aggregate([
      {
        $match: purchaseMatch,
      },
      {
        $group: {
          _id: '$supplierId',
          purchaseCount: { $sum: 1 },
          totalPurchaseAmount: { $sum: '$grandTotal' },
          paidAmount: { $sum: '$paidAmount' },
          outstandingAmount: { $sum: '$balanceAmount' },
          lastPurchaseDate: { $max: '$purchaseDate' },
        },
      },
    ])

    const summaryMap = new Map(purchaseSummary.map((item) => [String(item._id), item]))

    const data = suppliers.map((supplier) => {
      const purchase = summaryMap.get(String(supplier._id)) || {}

      return {
        ...supplier,
        purchaseCount: purchase.purchaseCount || 0,
        totalPurchaseAmount: purchase.totalPurchaseAmount || 0,
        paidAmount: purchase.paidAmount || 0,
        outstandingAmount: purchase.outstandingAmount || 0,
        lastPurchaseDate: purchase.lastPurchaseDate || null,
      }
    })

    const overallPurchaseSummary = await Purchase.aggregate([
      {
        $match: {
          companyId: new mongoose.Types.ObjectId(companyId),
          status: { $nin: ['Draft', 'Cancelled'] },
          ...(dateFilter ? { purchaseDate: dateFilter } : {}),
        },
      },
      {
        $group: {
          _id: null,
          totalPurchaseAmount: { $sum: '$grandTotal' },
          totalPaidAmount: { $sum: '$paidAmount' },
          totalOutstandingAmount: { $sum: '$balanceAmount' },
        },
      },
    ])

    const overall = overallPurchaseSummary[0] || {}

    return res.status(200).json({
      success: true,
      message: 'Supplier report fetched successfully',
      data,
      summary: {
        totalSuppliers,
        activeSuppliers,
        inactiveSuppliers,
        totalPurchaseAmount: overall.totalPurchaseAmount || 0,
        totalPaidAmount: overall.totalPaidAmount || 0,
        totalOutstandingAmount: overall.totalOutstandingAmount || 0,
      },
      pagination: {
        page: currentPage,
        limit: pageLimit,
        total: totalSuppliers,
        totalPages: Math.ceil(totalSuppliers / pageLimit),
      },
    })
  } catch (error) {
    console.error('Supplier report error:', error)

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch supplier report',
    })
  }
})

router.get('/supplier/pdf', permissionMiddleware('Reports', 'supplier'), async (req, res) => {
  try {
    const companyId = getCompanyId(req)

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company is required',
      })
    }

    const { search = '', status = '', fromDate, toDate } = req.query

    const supplierFilter = { companyId }

    if (['Active', 'Inactive'].includes(status)) {
      supplierFilter.status = status
    }

    if (search.trim()) {
      const searchRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')

      supplierFilter.$or = [{ supplierName: searchRegex }, { supplierCode: searchRegex }, { contactPerson: searchRegex }, { email: searchRegex }, { phone: searchRegex }, { gstNumber: searchRegex }, { city: searchRegex }, { state: searchRegex }]
    }

    const dateFilter = getDateFilter(fromDate, toDate)

    const suppliers = await Supplier.find(supplierFilter).sort({ supplierName: 1 }).lean()

    const supplierIds = suppliers.map((supplier) => supplier._id)

    const purchaseMatch = {
      companyId: new mongoose.Types.ObjectId(companyId),
      supplierId: { $in: supplierIds },
      status: { $nin: ['Draft', 'Cancelled'] },
      ...(dateFilter ? { purchaseDate: dateFilter } : {}),
    }

    const purchaseSummary = await Purchase.aggregate([
      { $match: purchaseMatch },
      {
        $group: {
          _id: '$supplierId',
          purchaseCount: { $sum: 1 },
          totalPurchaseAmount: { $sum: '$grandTotal' },
          paidAmount: { $sum: '$paidAmount' },
          outstandingAmount: { $sum: '$balanceAmount' },
          lastPurchaseDate: { $max: '$purchaseDate' },
        },
      },
    ])

    const summaryMap = new Map(purchaseSummary.map((item) => [String(item._id), item]))

    const reportSuppliers = suppliers.map((supplier) => {
      const purchase = summaryMap.get(String(supplier._id)) || {}

      return {
        ...supplier,
        purchaseCount: purchase.purchaseCount || 0,
        totalPurchaseAmount: purchase.totalPurchaseAmount || 0,
        paidAmount: purchase.paidAmount || 0,
        outstandingAmount: purchase.outstandingAmount || 0,
        lastPurchaseDate: purchase.lastPurchaseDate || null,
      }
    })

    const [activeSuppliers, inactiveSuppliers, overallPurchaseSummary] = await Promise.all([
      Supplier.countDocuments({ companyId, status: 'Active' }),
      Supplier.countDocuments({ companyId, status: 'Inactive' }),
      Purchase.aggregate([
        {
          $match: {
            companyId: new mongoose.Types.ObjectId(companyId),
            status: { $nin: ['Draft', 'Cancelled'] },
            ...(dateFilter ? { purchaseDate: dateFilter } : {}),
          },
        },
        {
          $group: {
            _id: null,
            totalPurchaseAmount: { $sum: '$grandTotal' },
            totalPaidAmount: { $sum: '$paidAmount' },
            totalOutstandingAmount: { $sum: '$balanceAmount' },
          },
        },
      ]),
    ])

    const overall = overallPurchaseSummary[0] || {}

    const pdfBuffer = await generateSupplierReportPDF({
      suppliers: reportSuppliers,
      summary: {
        totalSuppliers: suppliers.length,
        activeSuppliers,
        inactiveSuppliers,
        totalPurchaseAmount: overall.totalPurchaseAmount || 0,
        totalPaidAmount: overall.totalPaidAmount || 0,
        totalOutstandingAmount: overall.totalOutstandingAmount || 0,
      },
      filters: {
        search,
        status,
        fromDate,
        toDate,
      },
      companyName: req.company?.companyName || 'MineERP',
    })

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename="Supplier-Report.pdf"')

    return res.status(200).send(pdfBuffer)
  } catch (error) {
    console.error('Supplier report PDF error:', error)

    return res.status(500).json({
      success: false,
      message: 'Failed to generate supplier report PDF',
    })
  }
})

// INVOICE REPORT

const INVOICE_REPORT_STATUSES = ['Draft', 'Approved', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled']

const INVOICE_FINANCIAL_STATUSES = ['Approved', 'Partially Paid', 'Paid', 'Overdue']

// GET /erp/reports/invoice

router.get('/invoice', permissionMiddleware('Reports', 'invoice'), async (req, res, next) => {
  try {
    const companyId = getCompanyId(req)

    if (!companyId || !isValidObjectId(companyId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid companyId is required.',
      })
    }

    const { page = 1, limit = 10, status, customerId, warehouseId, fromDate, toDate, search } = req.query

    const currentPage = Math.max(1, Number.parseInt(page, 10) || 1)
    const pageLimit = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 10))

    if (status && !INVOICE_REPORT_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid invoice status.',
      })
    }

    if (customerId && !isValidObjectId(customerId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customerId.',
      })
    }

    if (warehouseId && !isValidObjectId(warehouseId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid warehouseId.',
      })
    }

    if (search && String(search).trim().length > 150) {
      return res.status(400).json({
        success: false,
        message: 'Search text is too long.',
      })
    }

    const dateFilter = getDateFilter(fromDate, toDate)

    if (dateFilter.error) {
      return res.status(400).json({
        success: false,
        message: dateFilter.error,
      })
    }

    const filter = {
      companyId: new mongoose.Types.ObjectId(String(companyId)),
    }

    if (status) {
      filter.status = status
    }

    if (customerId) {
      filter.customerId = customerId
    }

    if (warehouseId) {
      filter.warehouseId = warehouseId
    }

    if (Object.keys(dateFilter).length) {
      filter.invoiceDate = dateFilter
    }

    // Warehouse access restriction.
    if (!isWarehouseAdmin(req.user)) {
      const allowedWarehouseIds = getAllowedWarehouseIds(req.user)

      if (!allowedWarehouseIds.length) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to any warehouse.',
        })
      }

      if (warehouseId) {
        if (!allowedWarehouseIds.includes(String(warehouseId))) {
          return res.status(403).json({
            success: false,
            message: 'You do not have access to this warehouse.',
          })
        }
      } else {
        filter.warehouseId = {
          $in: allowedWarehouseIds.map((id) => new mongoose.Types.ObjectId(id)),
        }
      }
    }

    if (search?.trim()) {
      const searchRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')

      filter.$or = [{ invoiceNumber: searchRegex }, { notes: searchRegex }, { emailSentTo: searchRegex }]
    }

    // Fetch all matching invoices for accurate summary.
    const invoices = await Invoice.find(filter)
      .select('invoiceNumber customerId salesOrderId warehouseId invoiceDate dueDate status subtotal discount taxAmount grandTotal paidAmount balanceAmount emailStatus emailSentAt emailSentTo notes items createdAt')
      .populate('customerId', 'customerName customerCode companyName')
      .populate('salesOrderId', 'orderNumber')
      .populate('warehouseId', 'name code')
      .sort({
        invoiceDate: -1,
        createdAt: -1,
      })
      .lean()

    // Build report rows.
    const allRows = invoices.map((invoice) => ({
      _id: invoice._id,

      invoiceNumber: invoice.invoiceNumber || '',

      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,

      customer: invoice.customerId
        ? {
            _id: invoice.customerId._id,
            name: invoice.customerId.customerName || invoice.customerId.companyName || '',
            code: invoice.customerId.customerCode || '',
          }
        : null,

      salesOrder: invoice.salesOrderId
        ? {
            _id: invoice.salesOrderId._id,
            orderNumber: invoice.salesOrderId.orderNumber || '',
          }
        : null,

      warehouse: invoice.warehouseId
        ? {
            _id: invoice.warehouseId._id,
            name: invoice.warehouseId.name || '',
            code: invoice.warehouseId.code || '',
          }
        : null,

      status: invoice.status,

      subtotal: roundMoney(invoice.subtotal),
      discount: roundMoney(invoice.discount),
      taxAmount: roundMoney(invoice.taxAmount),
      grandTotal: roundMoney(invoice.grandTotal),
      paidAmount: roundMoney(invoice.paidAmount),
      balanceAmount: roundMoney(invoice.balanceAmount),

      itemCount: Array.isArray(invoice.items) ? invoice.items.length : 0,

      emailStatus: invoice.emailStatus || 'Not Sent',
      emailSentAt: invoice.emailSentAt || null,
      emailSentTo: invoice.emailSentTo || '',

      notes: invoice.notes || '',

      createdAt: invoice.createdAt,
    }))

    // Summary from all matching invoices.
    const summary = {
      totalInvoices: allRows.length,

      draftCount: 0,
      approvedCount: 0,
      partiallyPaidCount: 0,
      paidCount: 0,
      overdueCount: 0,
      cancelledCount: 0,

      subtotal: 0,
      discount: 0,
      taxAmount: 0,
      grandTotal: 0,
      paidAmount: 0,
      balanceAmount: 0,
    }

    allRows.forEach((row) => {
      if (row.status === 'Draft') {
        summary.draftCount += 1
      }

      if (row.status === 'Approved') {
        summary.approvedCount += 1
      }

      if (row.status === 'Partially Paid') {
        summary.partiallyPaidCount += 1
      }

      if (row.status === 'Paid') {
        summary.paidCount += 1
      }

      if (row.status === 'Overdue') {
        summary.overdueCount += 1
      }

      if (row.status === 'Cancelled') {
        summary.cancelledCount += 1
      }

      // Draft and Cancelled invoices are excluded
      // from financial totals.
      if (!INVOICE_FINANCIAL_STATUSES.includes(row.status)) {
        return
      }

      summary.subtotal += row.subtotal
      summary.discount += row.discount
      summary.taxAmount += row.taxAmount
      summary.grandTotal += row.grandTotal
      summary.paidAmount += row.paidAmount
      summary.balanceAmount += row.balanceAmount
    })

    Object.keys(summary).forEach((key) => {
      if (!key.endsWith('Count') && key !== 'totalInvoices') {
        summary[key] = roundMoney(summary[key])
      }
    })

    // Pagination after all filters.
    const total = allRows.length
    const totalPages = Math.ceil(total / pageLimit)

    const data = allRows.slice((currentPage - 1) * pageLimit, currentPage * pageLimit)

    return res.status(200).json({
      success: true,
      message: 'Invoice Report fetched successfully.',
      data,
      summary,
      pagination: {
        total,
        page: currentPage,
        currentPage,
        limit: pageLimit,
        totalPages,
      },
    })
  } catch (error) {
    next(error)
  }
})

// GET /erp/reports/invoice/pdf

router.get('/invoice/pdf', permissionMiddleware('Reports', 'invoice'), async (req, res, next) => {
  try {
    // Reuse the same report filters and access restrictions.
    const companyId = getCompanyId(req)

    if (!companyId || !isValidObjectId(companyId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid companyId is required.',
      })
    }

    const { status, customerId, warehouseId, fromDate, toDate, search } = req.query

    const INVOICE_REPORT_STATUSES = ['Draft', 'Approved', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled']

    if (status && !INVOICE_REPORT_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid invoice status.',
      })
    }

    if (customerId && !isValidObjectId(customerId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customerId.',
      })
    }

    if (warehouseId && !isValidObjectId(warehouseId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid warehouseId.',
      })
    }

    if (search && String(search).trim().length > 150) {
      return res.status(400).json({
        success: false,
        message: 'Search text is too long.',
      })
    }

    const dateFilter = getDateFilter(fromDate, toDate)

    if (dateFilter.error) {
      return res.status(400).json({
        success: false,
        message: dateFilter.error,
      })
    }

    const filter = {
      companyId: new mongoose.Types.ObjectId(String(companyId)),
    }

    if (status) filter.status = status
    if (customerId) filter.customerId = customerId
    if (warehouseId) filter.warehouseId = warehouseId

    if (Object.keys(dateFilter).length) {
      filter.invoiceDate = dateFilter
    }

    if (!isWarehouseAdmin(req.user)) {
      const allowedWarehouseIds = getAllowedWarehouseIds(req.user)

      if (!allowedWarehouseIds.length) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to any warehouse.',
        })
      }

      if (warehouseId) {
        if (!allowedWarehouseIds.includes(String(warehouseId))) {
          return res.status(403).json({
            success: false,
            message: 'You do not have access to this warehouse.',
          })
        }
      } else {
        filter.warehouseId = {
          $in: allowedWarehouseIds.map((id) => new mongoose.Types.ObjectId(id)),
        }
      }
    }

    if (search?.trim()) {
      const searchRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')

      filter.$or = [{ invoiceNumber: searchRegex }, { notes: searchRegex }, { emailSentTo: searchRegex }]
    }

    const invoices = await Invoice.find(filter)
      .select('invoiceNumber customerId salesOrderId warehouseId invoiceDate dueDate status subtotal discount taxAmount grandTotal paidAmount balanceAmount emailStatus emailSentAt emailSentTo notes items createdAt')
      .populate('customerId', 'customerName customerCode companyName')
      .populate('salesOrderId', 'orderNumber')
      .populate('warehouseId', 'name code')
      .sort({
        invoiceDate: -1,
        createdAt: -1,
      })
      .lean()

    const rows = invoices.map((invoice) => ({
      _id: invoice._id,
      invoiceNumber: invoice.invoiceNumber || '',
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,

      customer: invoice.customerId
        ? {
            _id: invoice.customerId._id,
            name: invoice.customerId.customerName || invoice.customerId.companyName || '',
            code: invoice.customerId.customerCode || '',
          }
        : null,

      salesOrder: invoice.salesOrderId
        ? {
            _id: invoice.salesOrderId._id,
            orderNumber: invoice.salesOrderId.orderNumber || '',
          }
        : null,

      warehouse: invoice.warehouseId
        ? {
            _id: invoice.warehouseId._id,
            name: invoice.warehouseId.name || '',
            code: invoice.warehouseId.code || '',
          }
        : null,

      status: invoice.status,
      subtotal: roundMoney(invoice.subtotal),
      discount: roundMoney(invoice.discount),
      taxAmount: roundMoney(invoice.taxAmount),
      grandTotal: roundMoney(invoice.grandTotal),
      paidAmount: roundMoney(invoice.paidAmount),
      balanceAmount: roundMoney(invoice.balanceAmount),
      itemCount: Array.isArray(invoice.items) ? invoice.items.length : 0,
      emailStatus: invoice.emailStatus || 'Not Sent',
      emailSentAt: invoice.emailSentAt || null,
      emailSentTo: invoice.emailSentTo || '',
      notes: invoice.notes || '',
      createdAt: invoice.createdAt,
    }))

    const financialStatuses = ['Approved', 'Partially Paid', 'Paid', 'Overdue']

    const summary = {
      totalInvoices: rows.length,
      draftCount: 0,
      approvedCount: 0,
      partiallyPaidCount: 0,
      paidCount: 0,
      overdueCount: 0,
      cancelledCount: 0,
      subtotal: 0,
      discount: 0,
      taxAmount: 0,
      grandTotal: 0,
      paidAmount: 0,
      balanceAmount: 0,
    }

    rows.forEach((row) => {
      if (row.status === 'Draft') summary.draftCount += 1
      if (row.status === 'Approved') summary.approvedCount += 1
      if (row.status === 'Partially Paid') summary.partiallyPaidCount += 1
      if (row.status === 'Paid') summary.paidCount += 1
      if (row.status === 'Overdue') summary.overdueCount += 1
      if (row.status === 'Cancelled') summary.cancelledCount += 1

      if (!financialStatuses.includes(row.status)) return

      summary.subtotal += row.subtotal
      summary.discount += row.discount
      summary.taxAmount += row.taxAmount
      summary.grandTotal += row.grandTotal
      summary.paidAmount += row.paidAmount
      summary.balanceAmount += row.balanceAmount
    })

    Object.keys(summary).forEach((key) => {
      if (!key.endsWith('Count') && key !== 'totalInvoices') {
        summary[key] = roundMoney(summary[key])
      }
    })

    const company = await getCompanyDetails(req, companyId)

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company details not found.',
      })
    }

    const pdfBuffer = await generateInvoiceReportPDF(rows, summary, company, {
      fromDate,
      toDate,
      status,
      search,
    })

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename="invoice-report.pdf"')
    res.setHeader('Content-Length', pdfBuffer.length)

    return res.status(200).send(pdfBuffer)
  } catch (error) {
    next(error)
  }
})

// ==========================================
// PAYMENT REPORT
// ==========================================
router.get('/payment', authMiddleware, permissionMiddleware('Reports', 'payment'), async (req, res) => {
  try {
    const companyId = getCompanyId(req)

    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid company ID is required.',
      })
    }

    const { page = 1, limit = 10, search = '', status = '', paymentMode = '', customerId = '', fromDate = '', toDate = '' } = req.query

    const currentPage = Math.max(1, Number(page) || 1)
    const pageLimit = Math.min(100, Math.max(1, Number(limit) || 10))

    if (search.length > 150) {
      return res.status(400).json({
        success: false,
        message: 'Search cannot exceed 150 characters.',
      })
    }

    const allowedStatuses = ['Completed', 'Refunded', 'Partially Refunded']

    const allowedPaymentModes = ['Cash', 'Bank Transfer', 'UPI', 'Cheque']

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment status.',
      })
    }

    if (paymentMode && !allowedPaymentModes.includes(paymentMode)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment mode.',
      })
    }

    if (customerId && !mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID.',
      })
    }

    const dateFilter = getDateFilter(fromDate, toDate)

    if (dateFilter.error) {
      return res.status(400).json({
        success: false,
        message: dateFilter.error,
      })
    }

    const filter = {
      companyId,
    }

    if (status) filter.status = status
    if (paymentMode) filter.paymentMode = paymentMode
    if (customerId) filter.customerId = customerId

    if (Object.keys(dateFilter).length) {
      filter.paymentDate = dateFilter
    }

    if (search.trim()) {
      const searchRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')

      filter.$or = [{ paymentNumber: searchRegex }, { transactionReference: searchRegex }, { notes: searchRegex }]
    }

    const payments = await Payment.find(filter)
      .select('paymentNumber invoiceId customerId paymentDate amount paymentMode transactionReference notes status refundedAmount refundHistory recordedBy createdAt')
      .populate('customerId', 'customerName customerCode companyName')
      .populate('invoiceId', 'invoiceNumber invoiceDate grandTotal')
      .sort({ paymentDate: -1, createdAt: -1 })
      .lean()

    const rows = payments.map((payment) => {
      const amount = Number(payment.amount || 0)
      const refundedAmount = Number(payment.refundedAmount || 0)

      return {
        _id: payment._id,
        paymentNumber: payment.paymentNumber,
        paymentDate: payment.paymentDate,

        customer: payment.customerId
          ? {
              _id: payment.customerId._id,
              name: payment.customerId.customerName || payment.customerId.companyName || 'N/A',
              code: payment.customerId.customerCode || '',
            }
          : null,

        invoice: payment.invoiceId
          ? {
              _id: payment.invoiceId._id,
              invoiceNumber: payment.invoiceId.invoiceNumber,
              invoiceDate: payment.invoiceId.invoiceDate,
              grandTotal: payment.invoiceId.grandTotal,
            }
          : null,

        amount,
        refundedAmount,
        netReceived: Math.max(0, amount - refundedAmount),

        paymentMode: payment.paymentMode,
        transactionReference: payment.transactionReference || '',
        status: payment.status,
        refundCount: payment.refundHistory?.length || 0,
        notes: payment.notes || '',
        createdAt: payment.createdAt,
      }
    })

    const summary = {
      totalPayments: rows.length,

      completedCount: rows.filter((item) => item.status === 'Completed').length,

      partiallyRefundedCount: rows.filter((item) => item.status === 'Partially Refunded').length,

      refundedCount: rows.filter((item) => item.status === 'Refunded').length,

      totalAmount: 0,
      totalRefunded: 0,
      netReceived: 0,
    }

    rows.forEach((payment) => {
      summary.totalAmount += payment.amount
      summary.totalRefunded += payment.refundedAmount
      summary.netReceived += payment.netReceived
    })

    summary.totalAmount = roundMoney(summary.totalAmount)
    summary.totalRefunded = roundMoney(summary.totalRefunded)
    summary.netReceived = roundMoney(summary.netReceived)

    const total = rows.length
    const totalPages = Math.ceil(total / pageLimit)

    const data = rows.slice((currentPage - 1) * pageLimit, currentPage * pageLimit)

    return res.status(200).json({
      success: true,
      message: 'Payment report fetched successfully.',
      data,
      summary,
      pagination: {
        total,
        page: currentPage,
        limit: pageLimit,
        totalPages,
      },
    })
  } catch (error) {
    console.error('Payment Report Error:', error)

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch payment report.',
    })
  }
})

// ==========================================
// PAYMENT REPORT PDF
// ==========================================
router.get('/payment/pdf', authMiddleware, permissionMiddleware('Reports', 'export'), async (req, res) => {
  try {
    const companyId = getCompanyId(req)

    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid company ID is required.',
      })
    }

    const { search = '', status = '', paymentMode = '', customerId = '', fromDate = '', toDate = '' } = req.query

    if (search.length > 150) {
      return res.status(400).json({
        success: false,
        message: 'Search cannot exceed 150 characters.',
      })
    }

    const allowedStatuses = ['Completed', 'Refunded', 'Partially Refunded']

    const allowedPaymentModes = ['Cash', 'Bank Transfer', 'UPI', 'Cheque']

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment status.',
      })
    }

    if (paymentMode && !allowedPaymentModes.includes(paymentMode)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment mode.',
      })
    }

    if (customerId && !mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID.',
      })
    }

    const dateFilter = getDateFilter(fromDate, toDate)

    if (dateFilter.error) {
      return res.status(400).json({
        success: false,
        message: dateFilter.error,
      })
    }

    const filter = {
      companyId,
    }

    if (status) filter.status = status
    if (paymentMode) filter.paymentMode = paymentMode
    if (customerId) filter.customerId = customerId

    if (Object.keys(dateFilter).length) {
      filter.paymentDate = dateFilter
    }

    if (search.trim()) {
      const searchRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')

      filter.$or = [{ paymentNumber: searchRegex }, { transactionReference: searchRegex }, { notes: searchRegex }]
    }

    const payments = await Payment.find(filter)
      .select('paymentNumber invoiceId customerId paymentDate amount paymentMode transactionReference notes status refundedAmount refundHistory createdAt')
      .populate('customerId', 'customerName customerCode companyName')
      .populate('invoiceId', 'invoiceNumber invoiceDate grandTotal')
      .sort({ paymentDate: -1, createdAt: -1 })
      .lean()

    const rows = payments.map((payment) => {
      const amount = Number(payment.amount || 0)
      const refundedAmount = Number(payment.refundedAmount || 0)

      return {
        _id: payment._id,
        paymentNumber: payment.paymentNumber,
        paymentDate: payment.paymentDate,

        customer: payment.customerId
          ? {
              _id: payment.customerId._id,
              name: payment.customerId.customerName || payment.customerId.companyName || 'N/A',
              code: payment.customerId.customerCode || '',
            }
          : null,

        invoice: payment.invoiceId
          ? {
              _id: payment.invoiceId._id,
              invoiceNumber: payment.invoiceId.invoiceNumber,
              invoiceDate: payment.invoiceId.invoiceDate,
              grandTotal: payment.invoiceId.grandTotal,
            }
          : null,

        amount,
        refundedAmount,
        netReceived: Math.max(0, amount - refundedAmount),
        paymentMode: payment.paymentMode,
        transactionReference: payment.transactionReference || '',
        status: payment.status,
        refundCount: payment.refundHistory?.length || 0,
        notes: payment.notes || '',
        createdAt: payment.createdAt,
      }
    })

    const summary = {
      totalPayments: rows.length,

      completedCount: rows.filter((item) => item.status === 'Completed').length,

      partiallyRefundedCount: rows.filter((item) => item.status === 'Partially Refunded').length,

      refundedCount: rows.filter((item) => item.status === 'Refunded').length,

      totalAmount: 0,
      totalRefunded: 0,
      netReceived: 0,
    }

    rows.forEach((payment) => {
      summary.totalAmount += payment.amount
      summary.totalRefunded += payment.refundedAmount
      summary.netReceived += payment.netReceived
    })

    summary.totalAmount = roundMoney(summary.totalAmount)
    summary.totalRefunded = roundMoney(summary.totalRefunded)
    summary.netReceived = roundMoney(summary.netReceived)

    // Company Details
    const company = await getCompanyDetails(req, companyId)
    const pdfBuffer = await generatePaymentReportPDF(rows, summary, company, {
      fromDate,
      toDate,
      status,
      paymentMode,
      search,
    })

    const fileName = `Payment-Report-${Date.now()}.pdf`

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
    res.setHeader('Content-Length', pdfBuffer.length)

    return res.status(200).send(pdfBuffer)
  } catch (error) {
    console.error('Payment Report PDF Error:', error)

    return res.status(500).json({
      success: false,
      message: 'Failed to generate payment report PDF.',
    })
  }
})

// ==========================================
// EXPENSE REPORT
// ==========================================
router.get('/expense', authMiddleware, permissionMiddleware('Reports', 'expense'), async (req, res) => {
  try {
    const companyId = getCompanyId(req)

    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid company ID is required.',
      })
    }

    const { page = 1, limit = 10, search = '', status = '', category = '', paymentMode = '', fromDate = '', toDate = '' } = req.query

    const currentPage = Math.max(1, Number(page) || 1)
    const pageLimit = Math.min(100, Math.max(1, Number(limit) || 10))

    if (search.length > 150) {
      return res.status(400).json({
        success: false,
        message: 'Search cannot exceed 150 characters.',
      })
    }

    const allowedStatuses = ['Draft', 'Approved']
    const allowedPaymentModes = ['Cash', 'Bank Transfer', 'UPI', 'Cheque', 'Other']

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid expense status.',
      })
    }

    if (paymentMode && !allowedPaymentModes.includes(paymentMode)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment mode.',
      })
    }

    const dateFilter = getDateFilter(fromDate, toDate)

    if (dateFilter.error) {
      return res.status(400).json({
        success: false,
        message: dateFilter.error,
      })
    }

    const filter = {
      companyId,
      isDeleted: { $ne: true },
    }

    if (status) filter.status = status
    if (category) filter.expenseCategory = category
    if (paymentMode) filter.paymentMode = paymentMode

    if (Object.keys(dateFilter).length) {
      filter.expenseDate = dateFilter
    }

    if (search.trim()) {
      const searchRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')

      filter.$or = [{ expenseNumber: searchRegex }, { title: searchRegex }, { description: searchRegex }, { expenseCategory: searchRegex }, { receiptNumber: searchRegex }, { transactionReference: searchRegex }]
    }

    const expenses = await Expense.find(filter)
      .select('expenseNumber expenseCategory title description expenseDate amount taxRate taxAmount totalAmount paymentMode transactionReference receiptNumber status approvedBy approvedAt createdAt')
      .populate('approvedBy', 'name email')
      .sort({ expenseDate: -1, createdAt: -1 })
      .lean()

    const rows = expenses.map((expense) => ({
      _id: expense._id,
      expenseNumber: expense.expenseNumber,
      expenseCategory: expense.expenseCategory,
      title: expense.title,
      description: expense.description || '',
      expenseDate: expense.expenseDate,
      amount: Number(expense.amount || 0),
      taxRate: Number(expense.taxRate || 0),
      taxAmount: Number(expense.taxAmount || 0),
      totalAmount: Number(expense.totalAmount || 0),
      paymentMode: expense.paymentMode,
      transactionReference: expense.transactionReference || '',
      receiptNumber: expense.receiptNumber || '',
      status: expense.status,
      approvedBy: expense.approvedBy
        ? {
            _id: expense.approvedBy._id,
            name: expense.approvedBy.name || '',
            email: expense.approvedBy.email || '',
          }
        : null,
      approvedAt: expense.approvedAt || null,
      createdAt: expense.createdAt,
    }))

    const summary = {
      totalExpenses: rows.length,
      approvedCount: rows.filter((item) => item.status === 'Approved').length,
      draftCount: rows.filter((item) => item.status === 'Draft').length,
      totalAmount: 0,
      totalTax: 0,
      approvedAmount: 0,
      draftAmount: 0,
    }

    rows.forEach((expense) => {
      summary.totalAmount += expense.totalAmount
      summary.totalTax += expense.taxAmount

      if (expense.status === 'Approved') {
        summary.approvedAmount += expense.totalAmount
      }

      if (expense.status === 'Draft') {
        summary.draftAmount += expense.totalAmount
      }
    })

    summary.totalAmount = roundMoney(summary.totalAmount)
    summary.totalTax = roundMoney(summary.totalTax)
    summary.approvedAmount = roundMoney(summary.approvedAmount)
    summary.draftAmount = roundMoney(summary.draftAmount)

    const total = rows.length
    const totalPages = Math.ceil(total / pageLimit)

    const data = rows.slice((currentPage - 1) * pageLimit, currentPage * pageLimit)

    return res.status(200).json({
      success: true,
      message: 'Expense report fetched successfully.',
      data,
      summary,
      pagination: {
        total,
        page: currentPage,
        limit: pageLimit,
        totalPages,
      },
    })
  } catch (error) {
    console.error('Expense Report Error:', error)

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch expense report.',
    })
  }
})

// ==========================================
// EXPENSE REPORT PDF
// ==========================================
router.get('/expense/pdf', authMiddleware, permissionMiddleware('Reports', 'export'), async (req, res) => {
  try {
    const companyId = getCompanyId(req)

    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid company ID is required.',
      })
    }

    const { search = '', status = '', category = '', paymentMode = '', fromDate = '', toDate = '' } = req.query

    if (search.length > 150) {
      return res.status(400).json({
        success: false,
        message: 'Search cannot exceed 150 characters.',
      })
    }

    const allowedStatuses = ['Draft', 'Approved']
    const allowedPaymentModes = ['Cash', 'Bank Transfer', 'UPI', 'Cheque', 'Other']

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid expense status.',
      })
    }

    if (paymentMode && !allowedPaymentModes.includes(paymentMode)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment mode.',
      })
    }

    const dateFilter = getDateFilter(fromDate, toDate)

    if (dateFilter.error) {
      return res.status(400).json({
        success: false,
        message: dateFilter.error,
      })
    }

    const filter = {
      companyId,
      isDeleted: { $ne: true },
    }

    if (status) filter.status = status
    if (category) filter.expenseCategory = category
    if (paymentMode) filter.paymentMode = paymentMode

    if (Object.keys(dateFilter).length) {
      filter.expenseDate = dateFilter
    }

    if (search.trim()) {
      const searchRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')

      filter.$or = [{ expenseNumber: searchRegex }, { title: searchRegex }, { description: searchRegex }, { expenseCategory: searchRegex }, { receiptNumber: searchRegex }, { transactionReference: searchRegex }]
    }

    const expenses = await Expense.find(filter)
      .select('expenseNumber expenseCategory title description expenseDate amount taxRate taxAmount totalAmount paymentMode transactionReference receiptNumber status approvedBy approvedAt createdAt')
      .populate('approvedBy', 'name email')
      .sort({ expenseDate: -1, createdAt: -1 })
      .lean()

    const rows = expenses.map((expense) => ({
      _id: expense._id,
      expenseNumber: expense.expenseNumber,
      expenseCategory: expense.expenseCategory,
      title: expense.title,
      description: expense.description || '',
      expenseDate: expense.expenseDate,
      amount: Number(expense.amount || 0),
      taxRate: Number(expense.taxRate || 0),
      taxAmount: Number(expense.taxAmount || 0),
      totalAmount: Number(expense.totalAmount || 0),
      paymentMode: expense.paymentMode,
      transactionReference: expense.transactionReference || '',
      receiptNumber: expense.receiptNumber || '',
      status: expense.status,
      approvedBy: expense.approvedBy
        ? {
            _id: expense.approvedBy._id,
            name: expense.approvedBy.name || '',
            email: expense.approvedBy.email || '',
          }
        : null,
      approvedAt: expense.approvedAt || null,
      createdAt: expense.createdAt,
    }))

    const summary = {
      totalExpenses: rows.length,
      approvedCount: rows.filter((item) => item.status === 'Approved').length,
      draftCount: rows.filter((item) => item.status === 'Draft').length,
      totalAmount: 0,
      totalTax: 0,
      approvedAmount: 0,
      draftAmount: 0,
    }

    rows.forEach((expense) => {
      summary.totalAmount += expense.totalAmount
      summary.totalTax += expense.taxAmount

      if (expense.status === 'Approved') {
        summary.approvedAmount += expense.totalAmount
      }

      if (expense.status === 'Draft') {
        summary.draftAmount += expense.totalAmount
      }
    })

    summary.totalAmount = roundMoney(summary.totalAmount)
    summary.totalTax = roundMoney(summary.totalTax)
    summary.approvedAmount = roundMoney(summary.approvedAmount)
    summary.draftAmount = roundMoney(summary.draftAmount)

    const company = await getCompanyDetails(req, companyId)

    const pdfBuffer = await generateExpenseReportPDF(rows, summary, company, {
      fromDate,
      toDate,
      status,
      category,
      paymentMode,
      search,
    })

    const fileName = `Expense-Report-${Date.now()}.pdf`

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
    res.setHeader('Content-Length', pdfBuffer.length)

    return res.status(200).send(pdfBuffer)
  } catch (error) {
    console.error('Expense Report PDF Error:', error)

    return res.status(500).json({
      success: false,
      message: 'Failed to generate expense report PDF.',
    })
  }
})

module.exports = router
