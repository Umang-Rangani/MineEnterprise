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
const erpRouter = require('./routes/erp')

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
