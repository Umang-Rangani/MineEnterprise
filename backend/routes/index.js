var express = require('express')
var router = express.Router()

// ERP API Home
router.get('/', function (req, res) {
  res.status(200).json({
    success: true,
    message: 'Welcome to Enterprise ERP API',
    version: '1.0.0',
  })
})

module.exports = router
