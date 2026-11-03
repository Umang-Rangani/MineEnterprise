const express = require('express')
const mongoose = require('mongoose')

const SalesOrder = require('../models/SalesOrder')
const SalesCounter = require('../models/SalesCounter')
const SalesDispatch = require('../models/SalesDispatch')
const SalesDispatchCounter = require('../models/SalesDispatchCounter')

const Customer = require('../models/Customer')
const Product = require('../models/Product')
const Warehouse = require('../models/Warehouse')
const Inventory = require('../models/Inventory')
const InventoryMovement = require('../models/InventoryMovement')

const authMiddleware = require('../middleware/authMiddleware')
const permissionMiddleware = require('../middleware/permissionMiddleware')

const router = express.Router()

router.use(authMiddleware)

// COMMON HELPERS

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id)

const getUserId = (req) => req.user?._id || req.user?.id

const getCompanyId = (req) => {
  // Company users must always use their own company.
  if (req.user?.companyId) return req.user.companyId

  // SuperAdmin must explicitly select a company.
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
  console.error('Sales Route Error:', error)

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'Duplicate record detected. Please try again.',
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

  if (options.max !== undefined && number > options.max) {
    throw httpError(400, `${fieldName} cannot exceed ${options.max}.`)
  }

  return number
}

const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100

const getCurrentYear = () => new Date().getFullYear()

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

const generateOrderNumber = async (companyId, session) => {
  const year = getCurrentYear()

  const counter = await SalesCounter.findOneAndUpdate(
    { companyId, year },
    {
      $inc: { lastNumber: 1 },
      $setOnInsert: { companyId, year },
    },
    {
      returnDocument: 'after',
      upsert: true,
      setDefaultsOnInsert: true,
      session,
    },
  )

  return `SO-${year}-${String(counter.lastNumber).padStart(6, '0')}`
}

const generateDispatchNumber = async (companyId, session) => {
  const year = getCurrentYear()

  const counter = await SalesDispatchCounter.findOneAndUpdate(
    { companyId, year },
    {
      $inc: { lastNumber: 1 },
      $setOnInsert: { companyId, year },
    },
    {
      returnDocument: 'after',
      upsert: true,
      setDefaultsOnInsert: true,
      session,
    },
  )

  return `SD-${year}-${String(counter.lastNumber).padStart(6, '0')}`
}

const getActiveCustomer = async (companyId, customerId, session) => {
  if (!isValidObjectId(customerId)) {
    throw httpError(400, 'Valid customer is required.')
  }

  const customer = await Customer.findById(customerId).select('_id customerName companyId status').session(session).lean()

  if (!customer) {
    throw httpError(404, 'Customer ID does not exist.')
  }

  if (String(customer.companyId) !== String(companyId)) {
    throw httpError(400, 'Customer does not belong to this company.')
  }

  if (customer.status !== 'Active') {
    throw httpError(400, `Customer is ${customer.status}, not Active.`)
  }

  return customer
}

const getActiveWarehouse = async (companyId, warehouseId, session) => {
  if (!isValidObjectId(warehouseId)) {
    throw httpError(400, 'Valid warehouse is required.')
  }

  const warehouse = await Warehouse.findOne({
    _id: warehouseId,
    companyId,
    status: 'Active',
  }).session(session)

  if (!warehouse) {
    throw httpError(404, 'Active warehouse not found.')
  }

  return warehouse
}

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

// PRODUCT AND ORDER ITEM VALIDATION

const buildOrderItems = async ({ companyId, warehouseId, inputItems, session, existingItems = [], amendment = false }) => {
  if (!Array.isArray(inputItems) || inputItems.length === 0) {
    throw httpError(400, 'At least one product is required.')
  }

  const result = []
  const seenProducts = new Set()
  const existingById = new Map(existingItems.map((item) => [String(item._id), item]))

  for (const input of inputItems) {
    if (!isValidObjectId(input.productId)) {
      throw httpError(400, 'Invalid product selected.')
    }

    const productKey = String(input.productId)

    if (seenProducts.has(productKey)) {
      throw httpError(400, 'Duplicate products are not allowed in one order.')
    }

    seenProducts.add(productKey)

    const product = await Product.findOne({
      _id: input.productId,
      companyId,
      status: 'Active',
    }).session(session)

    if (!product) {
      throw httpError(404, 'One or more active products were not found.')
    }

    const quantity = parseNumber(input.quantity, 'Quantity', { min: 0.01 })

    const rate = parseNumber(input.rate ?? product.sellingPrice, 'Rate', { min: 0 })

    const discount = parseNumber(input.discount ?? 0, 'Discount', { min: 0 })

    const taxRate = parseNumber(input.taxRate ?? product.taxRate ?? 0, 'Tax rate', { min: 0, max: 100 })

    const grossAmount = roundMoney(quantity * rate)

    if (discount > grossAmount) {
      throw httpError(400, 'Discount cannot exceed the item amount.')
    }

    const taxableAmount = roundMoney(grossAmount - discount)
    const taxAmount = roundMoney((taxableAmount * taxRate) / 100)
    const lineTotal = roundMoney(taxableAmount + taxAmount)

    let existingItem = null

    if (amendment) {
      if (input.itemId) {
        existingItem = existingById.get(String(input.itemId))

        if (!existingItem) {
          throw httpError(400, 'Invalid existing order item.')
        }

        if (String(existingItem.productId) !== productKey) {
          throw httpError(400, 'An existing order item product cannot be replaced.')
        }
      } else {
        const alreadyExists = existingItems.some((item) => String(item.productId) === productKey)

        if (alreadyExists) {
          throw httpError(400, 'Existing order items must include their itemId during amendment.')
        }
      }
    }

    const dispatchedQuantity = existingItem ? Number(existingItem.dispatchedQuantity || 0) : 0

    if (quantity < dispatchedQuantity) {
      throw httpError(400, 'Order quantity cannot be less than the already dispatched quantity.')
    }

    result.push({
      ...(existingItem ? { _id: existingItem._id } : {}),
      productId: product._id,
      productName: product.name,
      sku: product.sku,
      unit: product.unit || 'Piece',
      quantity,
      rate,
      discount,
      taxRate,
      taxAmount,
      lineTotal,
      reservedQuantity: existingItem ? Number(existingItem.reservedQuantity || 0) : 0,
      dispatchedQuantity,
    })
  }

  // Do not allow removal of an item that has already been dispatched.
  if (amendment) {
    for (const oldItem of existingItems) {
      const stillExists = result.some((item) => String(item._id) === String(oldItem._id))

      if (!stillExists && Number(oldItem.dispatchedQuantity || 0) > 0) {
        throw httpError(400, 'An item with dispatched quantity cannot be removed.')
      }
    }
  }

  return result
}

const calculateOrderTotals = (items) => {
  const subtotal = roundMoney(items.reduce((sum, item) => sum + item.quantity * item.rate, 0))

  const discount = roundMoney(items.reduce((sum, item) => sum + item.discount, 0))

  const taxAmount = roundMoney(items.reduce((sum, item) => sum + item.taxAmount, 0))

  const grandTotal = roundMoney(subtotal - discount + taxAmount)

  return {
    subtotal,
    discount,
    taxAmount,
    grandTotal,
  }
}

// ORDER LOCK

const lockSalesOrder = async ({ companyId, orderId, session, allowedStatuses }) => {
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
      returnDocument: 'after',
      session,
    },
  )

  if (!order) {
    throw httpError(409, 'Sales order was changed or is no longer in an allowed status. Refresh and try again.')
  }

  return order
}

// INVENTORY RESERVATION

const reserveStock = async ({ companyId, warehouseId, productId, quantity, userId, session }) => {
  const filter = {
    companyId,
    warehouseId,
    productId,
  }

  const inventory = await Inventory.findOneAndUpdate(
    {
      ...filter,
      $expr: {
        $gte: [
          {
            $subtract: [{ $ifNull: ['$currentStock', 0] }, { $ifNull: ['$reservedStock', 0] }],
          },
          quantity,
        ],
      },
    },
    {
      $inc: {
        reservedStock: quantity,
      },
      $set: {
        updatedBy: userId,
      },
    },
    {
      returnDocument: 'after',
      session,
    },
  )

  if (!inventory) {
    const existingInventory = await Inventory.findOne(filter).select('currentStock reservedStock productId warehouseId').session(session).lean()

    if (!existingInventory) {
      throw httpError(409, 'Inventory record not found for this product in the selected warehouse.')
    }

    const currentStock = Number(existingInventory.currentStock ?? 0)
    const reservedStock = Number(existingInventory.reservedStock ?? 0)
    const availableStock = currentStock - reservedStock

    console.log('========== STOCK RESERVATION DEBUG ==========')
    console.log('Product ID:', String(productId))
    console.log('Warehouse ID:', String(warehouseId))
    console.log('Current Stock:', currentStock)
    console.log('Reserved Stock:', reservedStock)
    console.log('Available Stock:', availableStock)
    console.log('Required Quantity:', quantity)
    console.log('=============================================')

    throw httpError(409, `Insufficient stock. Available: ${availableStock}, Required: ${quantity}.`)
  }

  return inventory
}

const releaseReservedStock = async ({ companyId, warehouseId, productId, quantity, userId, session }) => {
  if (quantity <= 0) return

  const inventory = await Inventory.findOneAndUpdate(
    {
      companyId,
      warehouseId,
      productId,
      reservedStock: { $gte: quantity },
    },
    {
      $inc: { reservedStock: -quantity },
      $set: { updatedBy: userId },
    },
    {
      returnDocument: 'after',
      session,
    },
  )

  if (!inventory) {
    throw httpError(409, 'Reserved stock could not be released. Please verify inventory.')
  }

  return inventory
}

const isCancelledOrderMessage = (order) => {
  if (order.status === 'Draft') {
    return 'Sales order updated successfully. It is now in Draft status.'
  }

  return 'Sales order updated successfully.'
}

// GET SALES ORDERS

router.get('/', permissionMiddleware('Sales', 'sales:list'), async (req, res) => {
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

    if (req.query.fromDate || req.query.toDate) {
      filter.orderDate = {}

      if (req.query.fromDate) {
        filter.orderDate.$gte = validateDate(req.query.fromDate, 'From date')
      }

      if (req.query.toDate) {
        const toDate = validateDate(req.query.toDate, 'To date')
        toDate.setHours(23, 59, 59, 999)
        filter.orderDate.$lte = toDate
      }
    }

    if (req.query.search?.trim()) {
      const search = req.query.search.trim()

      filter.$or = [{ orderNumber: { $regex: search, $options: 'i' } }, { notes: { $regex: search, $options: 'i' } }]
    }

    const [orders, total] = await Promise.all([
      SalesOrder.find(filter)
        .populate('customerId', 'customerName customerCode phone email')
        .populate('warehouseId', 'name code')
        .populate('createdBy', 'name email')
        .populate('approvedBy', 'name email')
        .sort({ orderDate: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      SalesOrder.countDocuments(filter),
    ])

    return res.json({
      success: true,
      data: orders,
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

// CREATE SALES ORDER - DRAFT

router.post('/', permissionMiddleware('Sales', 'sales:create'), async (req, res) => {
  const session = await mongoose.startSession()

  try {
    const companyId = requireCompanyId(req)
    const userId = requireUserId(req)

    let createdOrder

    await session.withTransaction(async () => {
      const customer = await getActiveCustomer(companyId, req.body.customerId, session)

      const warehouse = await getActiveWarehouse(companyId, req.body.warehouseId, session)

      validateWarehouseAccess(req, warehouse._id)

      const items = await buildOrderItems({
        companyId,
        warehouseId: warehouse._id,
        inputItems: req.body.items,
        session,
      })

      const totals = calculateOrderTotals(items)

      const orderNumber = await generateOrderNumber(companyId, session)

      const orderDate = validateDate(req.body.orderDate || new Date(), 'Order date')

      const expectedDeliveryDate = validateDate(req.body.expectedDeliveryDate, 'Expected delivery date', true)

      const [order] = await SalesOrder.create(
        [
          {
            companyId,
            orderNumber,
            customerId: customer._id,
            orderDate,
            expectedDeliveryDate,
            warehouseId: warehouse._id,
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

      createdOrder = order
    })

    return res.status(201).json({
      success: true,
      message: 'Sales order created successfully.',
      data: createdOrder,
    })
  } catch (error) {
    return handleError(res, error)
  } finally {
    await session.endSession()
  }
})

// GET SINGLE SALES ORDER

router.get('/:id', permissionMiddleware('Sales', 'sales:view'), async (req, res) => {
  try {
    const companyId = requireCompanyId(req)

    if (!isValidObjectId(req.params.id)) {
      throw httpError(400, 'Invalid sales order ID.')
    }

    const order = await SalesOrder.findOne({
      _id: req.params.id,
      companyId,
    })
      .populate('customerId')
      .populate('warehouseId')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('cancelledBy', 'name email')
      .populate('amendments.amendedBy', 'name email')
      .lean()

    if (!order) {
      throw httpError(404, 'Sales order not found.')
    }

    validateWarehouseAccess(req, order.warehouseId?._id || order.warehouseId)

    const dispatches = await SalesDispatch.find({
      companyId,
      salesOrderId: order._id,
    })
      .populate('dispatchedBy', 'name email')
      .sort({ dispatchDate: -1 })
      .lean()

    return res.json({
      success: true,
      data: {
        ...order,
        dispatches,
      },
    })
  } catch (error) {
    return handleError(res, error)
  }
})

// UPDATE SALES ORDER

router.patch('/:id', permissionMiddleware('Sales', 'sales:update'), async (req, res) => {
  const session = await mongoose.startSession()

  try {
    const companyId = requireCompanyId(req)
    const userId = requireUserId(req)

    if (!isValidObjectId(req.params.id)) {
      throw httpError(400, 'Invalid sales order ID.')
    }

    let updatedOrder
    let amendmentCreated = false

    await session.withTransaction(async () => {
      const currentOrder = await SalesOrder.findOne({
        _id: req.params.id,
        companyId,
      }).session(session)

      if (!currentOrder) {
        throw httpError(404, 'Sales order not found.')
      }

      const editableStatuses = ['Draft', 'Approved', 'Partially Dispatched', 'Cancelled']

      if (!editableStatuses.includes(currentOrder.status)) {
        throw httpError(400, 'This sales order cannot be edited in its current status.')
      }

      const isDraft = currentOrder.status === 'Draft'
      const isCancelled = currentOrder.status === 'Cancelled'
      const isApprovedOrder = ['Approved', 'Partially Dispatched'].includes(currentOrder.status)

      const order = await lockSalesOrder({
        companyId,
        orderId: currentOrder._id,
        session,
        allowedStatuses: [currentOrder.status],
      })

      const customerId = req.body.customerId || order.customerId
      const warehouseId = req.body.warehouseId || order.warehouseId

      if (isApprovedOrder && String(warehouseId) !== String(order.warehouseId)) {
        throw httpError(400, 'Warehouse cannot be changed after order approval.')
      }

      const customer = await getActiveCustomer(companyId, customerId, session)

      const warehouse = await getActiveWarehouse(companyId, warehouseId, session)

      validateWarehouseAccess(req, warehouse._id)

      if (!Array.isArray(req.body.items)) {
        throw httpError(400, 'Order items are required.')
      }

      const oldItems = order.items.map((item) => item.toObject())

      // Approved, partially dispatched and cancelled orders must preserve
      // their existing item IDs and dispatched quantities.
      const preserveExistingItems = !isDraft

      const newItems = await buildOrderItems({
        companyId,
        warehouseId: warehouse._id,
        inputItems: req.body.items,
        session,
        existingItems: oldItems,
        amendment: preserveExistingItems,
      })

      // Approved / partially dispatched orders require amendment reason
      // and inventory reservation adjustments.
      if (isApprovedOrder) {
        const amendmentReason = String(req.body.amendmentReason || '').trim()

        if (!amendmentReason) {
          throw httpError(400, 'Amendment reason is required.')
        }

        for (const newItem of newItems) {
          const oldItem = oldItems.find((item) => String(item._id) === String(newItem._id))

          const oldReserved = oldItem ? Number(oldItem.reservedQuantity || 0) : 0

          const dispatched = Number(newItem.dispatchedQuantity || 0)
          const newRemaining = newItem.quantity - dispatched
          const difference = newRemaining - oldReserved

          if (difference > 0) {
            await reserveStock({
              companyId,
              warehouseId: order.warehouseId,
              productId: newItem.productId,
              quantity: difference,
              userId,
              session,
            })
          } else if (difference < 0) {
            await releaseReservedStock({
              companyId,
              warehouseId: order.warehouseId,
              productId: newItem.productId,
              quantity: Math.abs(difference),
              userId,
              session,
            })
          }

          newItem.reservedQuantity = newRemaining
        }

        // Release reservations for removed undispatched items.
        for (const oldItem of oldItems) {
          const stillExists = newItems.some((item) => String(item._id) === String(oldItem._id))

          if (!stillExists) {
            const oldReserved = Number(oldItem.reservedQuantity || 0)

            if (oldReserved > 0) {
              await releaseReservedStock({
                companyId,
                warehouseId: order.warehouseId,
                productId: oldItem.productId,
                quantity: oldReserved,
                userId,
                session,
              })
            }
          }
        }

        const amendmentNumber = order.amendments.length + 1

        order.amendments.push({
          amendmentNumber,
          changes: {
            before: {
              customerId: order.customerId,
              items: oldItems,
              expectedDeliveryDate: order.expectedDeliveryDate,
              notes: order.notes,
            },
            after: {
              customerId: customer._id,
              items: newItems,
              expectedDeliveryDate: req.body.expectedDeliveryDate !== undefined ? req.body.expectedDeliveryDate : order.expectedDeliveryDate,
              notes: req.body.notes !== undefined ? req.body.notes : order.notes,
            },
          },
          reason: amendmentReason,
          amendedBy: userId,
          amendedAt: new Date(),
        })

        amendmentCreated = true
      }

      // Cancelled orders have no active reservations.
      // Preserve dispatched quantities, but keep remaining reservation at zero.
      if (isCancelled) {
        for (const item of newItems) {
          item.reservedQuantity = 0
        }
      }

      const totals = calculateOrderTotals(newItems)

      order.customerId = customer._id

      // Warehouse can be changed only for Draft or Cancelled orders.
      if (isDraft || isCancelled) {
        order.warehouseId = warehouse._id
      }

      order.items = newItems

      order.expectedDeliveryDate = req.body.expectedDeliveryDate !== undefined ? validateDate(req.body.expectedDeliveryDate, 'Expected delivery date', true) : order.expectedDeliveryDate

      order.notes = req.body.notes !== undefined ? String(req.body.notes).trim() : order.notes

      order.subtotal = totals.subtotal
      order.discount = totals.discount
      order.taxAmount = totals.taxAmount
      order.grandTotal = totals.grandTotal

      // Re-activate cancelled order as Draft.
      // Cancellation history remains unchanged.
      if (isCancelled) {
        order.status = 'Draft'
        order.approvedBy = null
        order.approvedAt = null
      }

      order.updatedBy = userId

      await order.save({ session })

      updatedOrder = order
    })

    return res.json({
      success: true,
      message: isCancelledOrderMessage(updatedOrder),
      data: updatedOrder,
    })
  } catch (error) {
    return handleError(res, error)
  } finally {
    await session.endSession()
  }
})

// APPROVE SALES ORDER - RESERVE STOCK

router.patch('/:id/approve', permissionMiddleware('Sales', 'sales:approve'), async (req, res) => {
  const session = await mongoose.startSession()

  try {
    const companyId = requireCompanyId(req)
    const userId = requireUserId(req)

    if (!isValidObjectId(req.params.id)) {
      throw httpError(400, 'Invalid sales order ID.')
    }

    let approvedOrder

    await session.withTransaction(async () => {
      const order = await lockSalesOrder({
        companyId,
        orderId: req.params.id,
        session,
        allowedStatuses: ['Draft'],
      })

      await getActiveCustomer(companyId, order.customerId, session)

      const warehouse = await getActiveWarehouse(companyId, order.warehouseId, session)

      validateWarehouseAccess(req, warehouse._id)

      let totalRemainingQuantity = 0

      for (const item of order.items) {
        // A cancelled partially-dispatched order can be edited back to Draft.
        // Its already-dispatched quantity must remain dispatched and must
        // never be reserved or dispatched a second time.
        const dispatchedQuantity = Number(item.dispatchedQuantity || 0)
        const remainingQuantity = Number(item.quantity) - dispatchedQuantity

        if (remainingQuantity < 0) {
          throw httpError(400, `Dispatched quantity exceeds ordered quantity for ${item.productName}.`)
        }

        if (remainingQuantity > 0) {
          await reserveStock({
            companyId,
            warehouseId: order.warehouseId,
            productId: item.productId,
            quantity: remainingQuantity,
            userId,
            session,
          })
        }

        item.reservedQuantity = remainingQuantity
        item.dispatchedQuantity = dispatchedQuantity
        totalRemainingQuantity += remainingQuantity
      }

      // If no quantity remains, the order is already complete.
      order.status = totalRemainingQuantity > 0 ? 'Approved' : 'Dispatched'

      order.approvedBy = userId
      order.approvedAt = new Date()
      order.updatedBy = userId

      await order.save({ session })

      approvedOrder = order
    })

    return res.json({
      success: true,
      message: 'Sales order approved and stock reserved successfully.',
      data: approvedOrder,
    })
  } catch (error) {
    return handleError(res, error)
  } finally {
    await session.endSession()
  }
})

// CANCEL SALES ORDER

router.patch('/:id/cancel', permissionMiddleware('Sales', 'sales:cancel'), async (req, res) => {
  const session = await mongoose.startSession()

  try {
    const companyId = requireCompanyId(req)
    const userId = requireUserId(req)

    if (!isValidObjectId(req.params.id)) {
      throw httpError(400, 'Invalid sales order ID.')
    }

    const reason = String(req.body.reason || '').trim()

    if (!reason) {
      throw httpError(400, 'Cancellation reason is required.')
    }

    let cancelledOrder

    await session.withTransaction(async () => {
      const order = await lockSalesOrder({
        companyId,
        orderId: req.params.id,
        session,
        allowedStatuses: ['Draft', 'Approved', 'Partially Dispatched'],
      })

      validateWarehouseAccess(req, order.warehouseId)

      if (order.status !== 'Draft') {
        for (const item of order.items) {
          const remainingReserved = Number(item.reservedQuantity || 0)

          if (remainingReserved > 0) {
            await releaseReservedStock({
              companyId,
              warehouseId: order.warehouseId,
              productId: item.productId,
              quantity: remainingReserved,
              userId,
              session,
            })

            item.reservedQuantity = 0
          }
        }
      }

      order.status = 'Cancelled'
      order.cancelledBy = userId
      order.cancelledAt = new Date()
      order.cancellationReason = reason
      order.updatedBy = userId

      await order.save({ session })

      cancelledOrder = order
    })

    return res.json({
      success: true,
      message: 'Sales order cancelled successfully.',
      data: cancelledOrder,
    })
  } catch (error) {
    return handleError(res, error)
  } finally {
    await session.endSession()
  }
})

// DISPATCH SALES ORDER - PARTIAL / FULL

router.post('/:id/dispatch', permissionMiddleware('Sales', 'sales:dispatch'), async (req, res) => {
  const session = await mongoose.startSession()

  try {
    const companyId = requireCompanyId(req)
    const userId = requireUserId(req)

    if (!isValidObjectId(req.params.id)) {
      throw httpError(400, 'Invalid sales order ID.')
    }

    if (!Array.isArray(req.body.items) || req.body.items.length === 0) {
      throw httpError(400, 'At least one dispatch item is required.')
    }

    let createdDispatch
    let updatedOrder

    await session.withTransaction(async () => {
      const order = await lockSalesOrder({
        companyId,
        orderId: req.params.id,
        session,
        allowedStatuses: ['Approved', 'Partially Dispatched'],
      })

      await getActiveWarehouse(companyId, order.warehouseId, session)

      validateWarehouseAccess(req, order.warehouseId)

      const seenItems = new Set()
      const dispatchItems = []

      for (const input of req.body.items) {
        if (!isValidObjectId(input.salesOrderItemId)) {
          throw httpError(400, 'Invalid sales order item.')
        }

        const itemKey = String(input.salesOrderItemId)

        if (seenItems.has(itemKey)) {
          throw httpError(400, 'Duplicate dispatch items are not allowed.')
        }

        seenItems.add(itemKey)

        const orderItem = order.items.id(input.salesOrderItemId)

        if (!orderItem) {
          throw httpError(404, 'Sales order item not found.')
        }

        const quantity = parseNumber(input.quantity, 'Dispatch quantity', { min: 0.01 })

        const remainingQuantity = Number(orderItem.quantity) - Number(orderItem.dispatchedQuantity || 0)

        const reservedQuantity = Number(orderItem.reservedQuantity || 0)

        if (quantity > remainingQuantity || quantity > reservedQuantity) {
          throw httpError(400, `Dispatch quantity exceeds the remaining reserved quantity for ${orderItem.productName}.`)
        }

        const inventory = await Inventory.findOneAndUpdate(
          {
            companyId,
            warehouseId: order.warehouseId,
            productId: orderItem.productId,
            currentStock: { $gte: quantity },
            reservedStock: { $gte: quantity },
          },
          {
            $inc: {
              currentStock: -quantity,
              reservedStock: -quantity,
            },
            $set: { updatedBy: userId },
          },
          {
            returnDocument: 'after',
            session,
          },
        )

        if (!inventory) {
          throw httpError(409, `Stock update failed for ${orderItem.productName}. Refresh and try again.`)
        }

        const previousStock = roundMoney(inventory.currentStock + quantity)
        const newStock = roundMoney(inventory.currentStock)

        await InventoryMovement.create(
          [
            {
              companyId,
              productId: orderItem.productId,
              warehouseId: order.warehouseId,
              type: 'STOCK_OUT',
              quantity,
              previousStock,
              newStock,
              reason: 'Sales Order Dispatch',
              reference: order.orderNumber,
              createdBy: userId,
            },
          ],
          { session },
        )

        orderItem.dispatchedQuantity = Number(orderItem.dispatchedQuantity || 0) + quantity

        orderItem.reservedQuantity = Number(orderItem.reservedQuantity || 0) - quantity

        dispatchItems.push({
          salesOrderItemId: orderItem._id,
          productId: orderItem.productId,
          productName: orderItem.productName,
          sku: orderItem.sku,
          unit: orderItem.unit,
          quantity,
        })
      }

      const fullyDispatched = order.items.every((item) => Number(item.dispatchedQuantity || 0) >= Number(item.quantity))

      order.status = fullyDispatched ? 'Dispatched' : 'Partially Dispatched'

      order.updatedBy = userId

      await order.save({ session })

      const dispatchNumber = await generateDispatchNumber(companyId, session)

      const [dispatch] = await SalesDispatch.create(
        [
          {
            companyId,
            dispatchNumber,
            salesOrderId: order._id,
            warehouseId: order.warehouseId,
            items: dispatchItems,
            dispatchDate: validateDate(req.body.dispatchDate || new Date(), 'Dispatch date'),
            deliveryReference: String(req.body.deliveryReference || '').trim(),
            transportName: String(req.body.transportName || '').trim(),
            vehicleNumber: String(req.body.vehicleNumber || '').trim(),
            notes: String(req.body.notes || '').trim(),
            status: 'Confirmed',
            dispatchedBy: userId,
            dispatchedAt: new Date(),
          },
        ],
        { session },
      )

      createdDispatch = dispatch
      updatedOrder = order
    })

    return res.status(201).json({
      success: true,
      message: 'Sales order dispatched successfully.',
      data: {
        dispatch: createdDispatch,
        salesOrder: updatedOrder,
      },
    })
  } catch (error) {
    return handleError(res, error)
  } finally {
    await session.endSession()
  }
})

// GET DISPATCHES

router.get('/:id/dispatches', permissionMiddleware('Sales', 'sales:view'), async (req, res) => {
  try {
    const companyId = requireCompanyId(req)

    if (!isValidObjectId(req.params.id)) {
      throw httpError(400, 'Invalid sales order ID.')
    }

    const order = await SalesOrder.findOne({
      _id: req.params.id,
      companyId,
    }).select('warehouseId')

    if (!order) {
      throw httpError(404, 'Sales order not found.')
    }

    validateWarehouseAccess(req, order.warehouseId)

    const dispatches = await SalesDispatch.find({
      companyId,
      salesOrderId: req.params.id,
    })
      .populate('dispatchedBy', 'name email')
      .sort({ dispatchDate: -1 })
      .lean()

    return res.json({
      success: true,
      data: dispatches,
    })
  } catch (error) {
    return handleError(res, error)
  }
})

module.exports = router
