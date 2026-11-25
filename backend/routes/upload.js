const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')

const router = express.Router()

const UPLOADS_DIR = path.resolve(__dirname, '..', 'public', 'uploads')
const MAX_FILE_SIZE = 4 * 1024 * 1024

// Sanitize folder and filename
const sanitizeSegment = (value, fallback) => {
  const cleaned = String(value || '')
    .replace(/[\\/]/g, '')
    .replace(/[^a-zA-Z0-9._ -]/g, '')
    .replace(/\.\.+/g, '.')
    .trim()

  return cleaned || fallback
}

// Resolve and validate upload directory
const getSafeUploadPath = (relativePath) => {
  const resolvedPath = path.resolve(UPLOADS_DIR, relativePath)

  if (!resolvedPath.startsWith(`${UPLOADS_DIR}${path.sep}`)) {
    const error = new Error('Invalid file path.')
    error.statusCode = 400
    throw error
  }

  return resolvedPath
}

// Multer Memory Storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
})

// Reusable Upload Middleware
const handleUpload = (req, res, next) => {
  upload.single('file')(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          success: false,
          message: 'File is too large. Maximum size is 4MB.',
        })
      }

      return res.status(400).json({
        success: false,
        message: error.message,
      })
    }

    if (error) {
      return next(error)
    }

    next()
  })
}

// Reusable Save Uploaded File Function
const saveUploadedFile = (file, folder = 'common', filename = 'file') => {
  if (!file || !file.buffer) {
    const error = new Error('File is required.')
    error.statusCode = 400
    throw error
  }

  const safeFolder = sanitizeSegment(folder, 'common')

  const originalExtension = path.extname(file.originalname).toLowerCase()

  const requestedFilename = sanitizeSegment(filename || path.parse(file.originalname).name, 'file')

  const uniqueSuffix = `${Date.now()}-${crypto.randomUUID()}`

  const storedName = `${requestedFilename}-${uniqueSuffix}${originalExtension}`

  const uploadPath = getSafeUploadPath(safeFolder)

  fs.mkdirSync(uploadPath, {
    recursive: true,
  })

  const fullFilePath = path.join(uploadPath, storedName)

  fs.writeFileSync(fullFilePath, file.buffer)

  return {
    filePath: `/uploads/${safeFolder}/${storedName}`,
    filename: storedName,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
  }
}

// Reusable Delete Uploaded File Function
const deleteUploadedFile = (filePath) => {
  if (!filePath || typeof filePath !== 'string') {
    const error = new Error('Valid filePath is required.')
    error.statusCode = 400
    throw error
  }

  if (/^https?:\/\//i.test(filePath)) {
    const error = new Error('Only local uploaded files can be deleted.')
    error.statusCode = 400
    throw error
  }

  if (!filePath.startsWith('/uploads/')) {
    const error = new Error('Invalid file path.')
    error.statusCode = 400
    throw error
  }

  const relativePath = filePath.replace(/^\/uploads[\\/]/, '')

  const uploadPath = getSafeUploadPath(relativePath)

  if (!fs.existsSync(uploadPath)) {
    const error = new Error('File not found.')
    error.statusCode = 404
    throw error
  }

  fs.unlinkSync(uploadPath)

  return true
}

// POST - UPLOAD FILE
router.post('/', handleUpload, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'File is required.',
    })
  }

  try {
    const result = saveUploadedFile(req.file, req.body.uploadFolder, req.body.filename || path.parse(req.file.originalname).name)

    return res.status(200).json({
      success: true,
      message: 'File uploaded successfully.',
      filePath: result.filePath,
      file: {
        filename: result.filename,
        originalName: result.originalName,
        mimeType: result.mimeType,
        size: result.size,
      },
    })
  } catch (error) {
    console.error('Upload Error:', error)

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : 'Failed to upload file.',
    })
  }
})

// DELETE - UPLOADED FILE
router.delete('/', async (req, res) => {
  try {
    const { filePath } = req.body

    deleteUploadedFile(filePath)

    return res.status(200).json({
      success: true,
      message: 'File deleted successfully.',
    })
  } catch (error) {
    console.error('Delete Upload Error:', error)

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : 'Failed to delete file.',
    })
  }
})

// Export reusable functions along with router
module.exports = router
module.exports.handleUpload = handleUpload
module.exports.saveUploadedFile = saveUploadedFile
module.exports.deleteUploadedFile = deleteUploadedFile
