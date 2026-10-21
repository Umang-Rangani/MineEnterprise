  const express = require('express')
  const bcrypt = require('bcryptjs')
  const mongoose = require('mongoose')
  const User = require('../models/User')
  const Company = require('../models/Company')

  const router = express.Router()

  const authMiddleware = require('../middleware/authMiddleware')

  router.get('/me', authMiddleware, async (req, res) => {
    try {
      if (req.user.role !== 'CompanyAdmin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. CompanyAdmin only.',
        })
      }

      const company = await Company.findOne({
        owner: req.user.userId,
      })
        .populate('owner', 'name email phone')
        .lean()

      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company details not found.',
        })
      }

      return res.status(200).json({
        success: true,
        company: {
          ...company,
          id: company._id,
        },
      })
    } catch (error) {
      console.error('Company details error:', error)

      return res.status(500).json({
        success: false,
        message: 'Unable to load company details.',
      })
    }
  })

  // SuperAdmin: Get all registered companies
  router.get('/pending', authMiddleware, async (req, res) => {
    try {
      if (req.user.role !== 'SuperAdmin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. SuperAdmin only.',
        })
      }

      const companies = await Company.find({ status: 'Pending' }).populate('owner', 'name email phone').sort({ createdAt: -1 }).lean()

      return res.status(200).json({
        success: true,
        count: companies.length,
        companies,
      })
    } catch (error) {
      console.error('Pending companies error:', error)

      return res.status(500).json({
        success: false,
        message: 'Unable to fetch pending companies.',
      })
    }
  })

  router.post('/register', async (req, res) => {
    const { name, email, password, phone, companyName, businessType, companyEmail, companyPhone, website, addressLine1, addressLine2, city, state, country, postalCode, gstNumber, panNumber, currency, businessCategory } = req.body

    if (
      !name?.trim() ||
      !email?.trim() ||
      !password ||
      !companyName?.trim() ||
      !businessType ||
      !companyEmail?.trim() ||
      !companyPhone?.trim() ||
      !addressLine1?.trim() ||
      !city?.trim() ||
      !state?.trim() ||
      !country?.trim() ||
      !postalCode?.trim() ||
      !businessCategory?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required owner and company fields.',
      })
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.',
      })
    }

    const allowedBusinessTypes = ['Manufacturer', 'Wholesaler', 'Retailer', 'Distributor', 'Other']

    if (!allowedBusinessTypes.includes(businessType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid business type.',
      })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const normalizedCompanyEmail = companyEmail.trim().toLowerCase()

    const session = await mongoose.startSession()

    try {
      const existingUser = await User.findOne({
        email: normalizedEmail,
      })

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'An account with this email already exists.',
        })
      }

      const existingCompany = await Company.findOne({
        companyEmail: normalizedCompanyEmail,
      })

      if (existingCompany) {
        return res.status(409).json({
          success: false,
          message: 'A company with this email is already registered.',
        })
      }

      const hashedPassword = await bcrypt.hash(password, 12)

      await session.withTransaction(async () => {
        const [owner] = await User.create(
          [
            {
              name: name.trim(),
              email: normalizedEmail,
              password: hashedPassword,
              phone: phone?.trim() || '',
              role: 'CompanyAdmin',
              companyId: null,
              status: 'Active',
            },
          ],
          { session },
        )

        await Company.create(
          [
            {
              companyName: companyName.trim(),
              businessType,
              companyEmail: normalizedCompanyEmail,
              companyPhone: companyPhone.trim(),
              website: website?.trim() || '',
              owner: owner._id,
              addressLine1: addressLine1.trim(),
              addressLine2: addressLine2?.trim() || '',
              city: city.trim(),
              state: state.trim(),
              country: country.trim(),
              postalCode: postalCode.trim(),
              gstNumber: gstNumber?.trim() || '',
              panNumber: panNumber?.trim() || '',
              currency: currency?.trim() || 'INR',
              businessCategory: businessCategory.trim(),
              status: 'Pending',
            },
          ],
          { session },
        )
      })

      return res.status(201).json({
        success: true,
        message: 'Registration submitted successfully. Your company is awaiting SuperAdmin approval.',
      })
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'An account or company with these details already exists.',
        })
      }

      console.error('Company registration error:', error)

      return res.status(500).json({
        success: false,
        message: 'Unable to submit company registration.',
      })
    } finally {
      await session.endSession()
    }
  })

  router.patch('/:companyId/review', authMiddleware, async (req, res) => {
    try {
      if (req.user.role !== 'SuperAdmin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. SuperAdmin only.',
        })
      }

      const { companyId } = req.params
      const { action, rejectionReason } = req.body

      if (!mongoose.isValidObjectId(companyId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid company ID.',
        })
      }

      if (!['Approve', 'Reject'].includes(action)) {
        return res.status(400).json({
          success: false,
          message: 'Action must be Approve or Reject.',
        })
      }

      const company = await Company.findById(companyId)

      if (!company) {
        return res.status(404).json({
          success: false,
          message: 'Company not found.',
        })
      }

      if (company.status !== 'Pending') {
        return res.status(409).json({
          success: false,
          message: 'Only pending companies can be reviewed.',
        })
      }

      if (action === 'Reject' && !rejectionReason?.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a rejection reason.',
        })
      }

      if (action === 'Approve') {
        const session = await mongoose.startSession()

        try {
          await session.withTransaction(async () => {
            const updatedCompany = await Company.findOneAndUpdate(
              { _id: companyId, status: 'Pending' },
              {
                $set: {
                  status: 'Approved',
                  approvedBy: req.user.userId,
                  approvedAt: new Date(),
                  rejectionReason: '',
                },
              },
              { new: true, session },
            )

            if (!updatedCompany) {
              throw new Error('COMPANY_REVIEW_CONFLICT')
            }

            await User.updateOne({ _id: updatedCompany.owner, role: 'CompanyAdmin' }, { $set: { companyId: updatedCompany._id } }, { session })
          })
        } catch (error) {
          if (error.message === 'COMPANY_REVIEW_CONFLICT') {
            return res.status(409).json({
              success: false,
              message: 'Company has already been reviewed.',
            })
          }

          throw error
        } finally {
          await session.endSession()
        }

        return res.status(200).json({
          success: true,
          message: 'Company approved successfully.',
        })
      }

      const updatedCompany = await Company.findOneAndUpdate(
        { _id: companyId, status: 'Pending' },
        {
          $set: {
            status: 'Rejected',
            approvedBy: null,
            approvedAt: null,
            rejectionReason: rejectionReason.trim(),
          },
        },
        { new: true },
      )

      if (!updatedCompany) {
        return res.status(409).json({
          success: false,
          message: 'Company has already been reviewed.',
        })
      }

      return res.status(200).json({
        success: true,
        message: 'Company rejected successfully.',
      })
    } catch (error) {
      console.error('Company review error:', error)

      return res.status(500).json({
        success: false,
        message: 'Unable to review company.',
      })
    }
  })

  module.exports = router
