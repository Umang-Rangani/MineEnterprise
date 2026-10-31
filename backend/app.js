require('dotenv').config()

var createError = require('http-errors')
var express = require('express')
var path = require('path')
var cookieParser = require('cookie-parser')
var logger = require('morgan')
var cors = require('cors')

var indexRouter = require('./routes/index')
const superAdminAuth = require('./routes/superAdminAuth')
const superAdminDashboard = require('./routes/superAdminDashboard')

var companiesRouter = require('./routes/companies')

const employeeAuthRouter = require('./routes/employeeAuth')
const employeesRouter = require('./routes/employees')
const rolesRouter = require('./routes/roles')

const erpRouter = require('./routes/erp')
const productsRouter = require('./routes/products')
const categoriesRouter = require('./routes/categories')
const inventoryRouter = require('./routes/inventory')
const warehousesRoutes = require('./routes/warehouses')
const suppliersRouter = require('./routes/suppliers')
const purchasesRouter = require('./routes/purchases')

const goodsReceiptsRouter = require('./routes/goodsReceipts')



var app = express()

// CORS Configuration
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN || 'http://localhost:5173',
    credentials: true,
  }),
)

// Middleware
app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())

// Static Files
app.use(express.static(path.join(__dirname, 'public')))

// Existing Routes
app.use('/', indexRouter)

app.use('/superadmin', superAdminAuth)
app.use('/superadmin/dashboard', superAdminDashboard)

app.use('/companies', companiesRouter)

app.use('/erp/auth', employeeAuthRouter)
app.use('/erp/employees', employeesRouter)
app.use('/erp/roles', rolesRouter)

app.use('/erp/products', productsRouter)
app.use('/erp/categories', categoriesRouter)
app.use('/erp/inventory', inventoryRouter)
app.use('/erp/warehouses', warehousesRoutes)
app.use('/erp/suppliers', suppliersRouter)
app.use('/erp/purchases', purchasesRouter)

app.use('/erp/goods-receipts', goodsReceiptsRouter)


// Roles and My Permissions remain in erp.js
app.use('/erp', erpRouter)

// 404 Handler
app.use(function (req, res, next) {
  next(createError(404, 'API route not found'))
})

// Central Error Handler
app.use(function (err, req, res, next) {
  const statusCode = err.status || 500

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  })
})

module.exports = app
