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

// Multer Memory Storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
})

// Upload Middleware
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

// POST - UPLOAD FILE
router.post('/', handleUpload, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'File is required.',
    })
  }

  try {
    const folder = sanitizeSegment(req.body.uploadFolder, 'common')

    const originalExtension = path.extname(req.file.originalname).toLowerCase()

    const requestedFilename = sanitizeSegment(req.body.filename || path.parse(req.file.originalname).name, 'file')

    const uniqueSuffix = `${Date.now()}-${crypto.randomUUID()}`

    const storedName = `${requestedFilename}-${uniqueSuffix}${originalExtension}`

    // Create upload directory
    const uploadPath = path.resolve(UPLOADS_DIR, folder)

    if (!uploadPath.startsWith(`${UPLOADS_DIR}${path.sep}`)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid upload folder.',
      })
    }

    fs.mkdirSync(uploadPath, {
      recursive: true,
    })

    // Save file
    const fullFilePath = path.join(uploadPath, storedName)

    fs.writeFileSync(fullFilePath, req.file.buffer)

    const filePath = `/uploads/${folder}/${storedName}`

    return res.status(200).json({
      success: true,
      message: 'File uploaded successfully.',
      filePath,
      file: {
        filename: storedName,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
      },
    })
  } catch (error) {
    console.error('Upload Error:', error)

    return res.status(500).json({
      success: false,
      message: 'Failed to upload file.',
      error: error.message,
    })
  }
})

// DELETE - UPLOADED FILE
router.delete('/', async (req, res) => {
  try {
    const { filePath } = req.body

    if (!filePath) {
      return res.status(400).json({
        success: false,
        message: 'filePath is required.',
      })
    }

    // Only allow local uploads paths
    if (/^https?:\/\//i.test(filePath)) {
      return res.status(400).json({
        success: false,
        message: 'Only local uploaded files can be deleted.',
      })
    }

    const relativePath = filePath.replace(/^\/uploads[\\/]/, '')

    const uploadPath = path.resolve(UPLOADS_DIR, relativePath)

    if (!uploadPath.startsWith(`${UPLOADS_DIR}${path.sep}`)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file path.',
      })
    }

    if (!fs.existsSync(uploadPath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found.',
      })
    }

    fs.unlinkSync(uploadPath)

    return res.status(200).json({
      success: true,
      message: 'File deleted successfully.',
    })
  } catch (error) {
    console.error('Delete Upload Error:', error)

    return res.status(500).json({
      success: false,
      message: 'Failed to delete file.',
      error: error.message,
    })
  }
})

module.exports = router
