const multer = require('multer')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')

const uploadDirectory = path.join(__dirname, '..', 'uploads', 'expenses')

// Create upload directory if it does not exist.
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true })
}

const allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf']

const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf']

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDirectory)
  },

  filename(req, file, cb) {
    const extension = path.extname(file.originalname).toLowerCase()
    const filename = `${Date.now()}-${crypto.randomUUID()}${extension}`

    cb(null, filename)
  },
})

const fileFilter = (req, file, cb) => {
  const extension = path.extname(file.originalname).toLowerCase()

  if (!allowedMimeTypes.includes(file.mimetype) || !allowedExtensions.includes(extension)) {
    const error = new Error('Only JPG, JPEG, PNG and PDF files are allowed.')
    error.status = 400
    return cb(error)
  }

  cb(null, true)
}

const uploadExpenseReceipt = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
    files: 1,
  },
})

module.exports = uploadExpenseReceipt
