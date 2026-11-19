const PDFDocument = require('pdfkit')

const formatDate = (value) => {
  if (!value) return '-'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '-'

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const formatAmount = (value, currency = 'INR') => {
  const amount = Number(value || 0)

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount)
}

const formatNumber = (value) => {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
  }).format(Number(value || 0))
}

const safeText = (value, fallback = '-') => {
  const text = String(value ?? '').trim()
  return text || fallback
}

const generateSupplierReportPDF = ({ suppliers = [], summary = {}, filters = {}, company = null, companyName = 'MineERP' }) => {
  return new Promise((resolve, reject) => {
    try {
      if (!Array.isArray(suppliers)) {
        return reject(new Error('Invalid supplier report data.'))
      }

      const companyDetails = company || {
        companyName,
      }

      const currency = companyDetails.currency || 'INR'

      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: {
          top: 35,
          bottom: 40,
          left: 25,
          right: 25,
        },
        bufferPages: true,
        info: {
          Title: 'Supplier Report',
          Author: companyDetails.companyName || 'MineERP',
          Subject: 'Supplier Report',
          Creator: 'MineERP',
        },
      })

      const chunks = []

      doc.on('data', (chunk) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      const pageWidth = doc.page.width
      const pageHeight = doc.page.height
      const left = 25
      const right = pageWidth - 25
      const contentWidth = right - left

      const colors = {
        primary: '#6d28d9',
        dark: '#1e293b',
        muted: '#64748b',
        light: '#f1f5f9',
        border: '#e2e8f0',
        white: '#ffffff',
      }

      const drawCompanyHeader = () => {
        doc.font('Helvetica-Bold').fontSize(15).fillColor(colors.primary).text(safeText(companyDetails.companyName, 'MineERP'), left, 28, {
          width: contentWidth,
        })

        const address = [companyDetails.addressLine1, companyDetails.addressLine2, companyDetails.city, companyDetails.state, companyDetails.country, companyDetails.postalCode].filter(Boolean).join(', ')

        doc
          .font('Helvetica')
          .fontSize(7)
          .fillColor(colors.muted)
          .text(address || '-', left, 48, {
            width: contentWidth * 0.65,
          })

        const contact = [companyDetails.companyEmail, companyDetails.companyPhone, companyDetails.gstNumber ? `GSTIN: ${companyDetails.gstNumber}` : ''].filter(Boolean).join('  |  ')

        doc.font('Helvetica').fontSize(7).fillColor(colors.muted).text(contact, left, 60, {
          width: contentWidth,
        })

        doc.moveTo(left, 77).lineTo(right, 77).strokeColor(colors.border).lineWidth(1).stroke()

        doc.font('Helvetica-Bold').fontSize(13).fillColor(colors.dark).text('SUPPLIER REPORT', left, 87)

        doc
          .font('Helvetica')
          .fontSize(7)
          .fillColor(colors.muted)
          .text(`Generated: ${formatDate(new Date())}`, right - 150, 90, {
            width: 150,
            align: 'right',
          })

        const filterParts = []

        if (filters.fromDate) {
          filterParts.push(`From: ${formatDate(filters.fromDate)}`)
        }

        if (filters.toDate) {
          filterParts.push(`To: ${formatDate(filters.toDate)}`)
        }

        if (filters.status) {
          filterParts.push(`Status: ${filters.status}`)
        }

        if (filters.search) {
          filterParts.push(`Search: ${filters.search}`)
        }

        if (filterParts.length) {
          doc.font('Helvetica').fontSize(7).fillColor(colors.muted).text(filterParts.join('  |  '), left, 105, {
            width: contentWidth,
          })
        }
      }

      const drawSummary = (startY) => {
        const cards = [
          ['Total Suppliers', formatNumber(summary.totalSuppliers)],
          ['Active Suppliers', formatNumber(summary.activeSuppliers)],
          ['Inactive Suppliers', formatNumber(summary.inactiveSuppliers)],
          ['Purchase Amount', formatAmount(summary.totalPurchaseAmount, currency)],
          ['Paid Amount', formatAmount(summary.totalPaidAmount, currency)],
          ['Outstanding', formatAmount(summary.totalOutstandingAmount, currency)],
        ]

        const gap = 7
        const cardWidth = (contentWidth - gap * 2) / 3
        const cardHeight = 37

        cards.forEach(([label, value], index) => {
          const row = Math.floor(index / 3)
          const column = index % 3

          const x = left + column * (cardWidth + gap)
          const y = startY + row * (cardHeight + 6)

          doc.roundedRect(x, y, cardWidth, cardHeight, 4).fillAndStroke(colors.light, colors.border)

          doc
            .font('Helvetica')
            .fontSize(7)
            .fillColor(colors.muted)
            .text(label, x + 7, y + 6, {
              width: cardWidth - 14,
              lineBreak: false,
            })

          doc
            .font('Helvetica-Bold')
            .fontSize(9)
            .fillColor(colors.dark)
            .text(value, x + 7, y + 19, {
              width: cardWidth - 14,
              lineBreak: false,
            })
        })

        return startY + cardHeight * 2 + 12
      }

      const columns = [
        {
          label: 'Supplier Code',
          key: 'supplierCode',
          width: 65,
        },
        {
          label: 'Supplier Name',
          key: 'supplierName',
          width: 85,
        },
        {
          label: 'Contact Person',
          key: 'contactPerson',
          width: 72,
        },
        {
          label: 'Phone',
          key: 'phone',
          width: 58,
        },
        {
          label: 'GST Number',
          key: 'gstNumber',
          width: 65,
        },
        {
          label: 'City',
          key: 'city',
          width: 48,
        },
        {
          label: 'Status',
          key: 'status',
          width: 43,
        },
        {
          label: 'Orders',
          key: 'purchaseCount',
          width: 38,
          number: true,
        },
        {
          label: 'Purchase Amount',
          key: 'totalPurchaseAmount',
          width: 75,
          amount: true,
        },
        {
          label: 'Paid Amount',
          key: 'paidAmount',
          width: 65,
          amount: true,
        },
        {
          label: 'Outstanding',
          key: 'outstandingAmount',
          width: 70,
          amount: true,
        },
        {
          label: 'Last Purchase',
          key: 'lastPurchaseDate',
          width: 60,
          date: true,
        },
      ]

      const totalColumnWidth = columns.reduce((total, column) => total + column.width, 0)

      const scale = contentWidth / totalColumnWidth

      columns.forEach((column) => {
        column.width *= scale
      })

      const getCellValue = (supplier, column) => {
        const value = supplier[column.key]

        if (column.amount) {
          return formatAmount(value, currency)
        }

        if (column.date) {
          return formatDate(value)
        }

        if (column.number) {
          return formatNumber(value)
        }

        return safeText(value)
      }

      const drawTableHeader = (y) => {
        doc.rect(left, y, contentWidth, 22).fill(colors.primary)

        let x = left

        columns.forEach((column) => {
          doc
            .font('Helvetica-Bold')
            .fontSize(5.8)
            .fillColor(colors.white)
            .text(column.label, x + 3, y + 7, {
              width: column.width - 6,
              align: column.amount || column.number ? 'right' : 'left',
              lineBreak: false,
            })

          x += column.width
        })

        return y + 22
      }

      const drawTableRow = (supplier, y, index) => {
        const rowHeight = 27

        if (index % 2 === 0) {
          doc.rect(left, y, contentWidth, rowHeight).fill('#fafafa')
        }

        doc
          .moveTo(left, y + rowHeight)
          .lineTo(right, y + rowHeight)
          .strokeColor(colors.border)
          .lineWidth(0.4)
          .stroke()

        let x = left

        columns.forEach((column) => {
          const value = getCellValue(supplier, column)

          doc
            .font('Helvetica')
            .fontSize(5.5)
            .fillColor(colors.dark)
            .text(value, x + 3, y + 5, {
              width: column.width - 6,
              height: rowHeight - 7,
              align: column.amount || column.number ? 'right' : 'left',
              ellipsis: true,
              lineBreak: false,
            })

          x += column.width
        })

        return y + rowHeight
      }

      drawCompanyHeader()

      let y = drawSummary(118)

      y = drawTableHeader(y)

      if (!suppliers.length) {
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor(colors.muted)
          .text('No suppliers found for the selected filters.', left, y + 15, {
            width: contentWidth,
            align: 'center',
          })
      } else {
        suppliers.forEach((supplier, index) => {
          if (y + 27 > pageHeight - 65) {
            doc.addPage()

            drawCompanyHeader()

            y = drawTableHeader(118)
          }

          y = drawTableRow(supplier, y, index)
        })
      }

      const pageRange = doc.bufferedPageRange()

      for (let index = 0; index < pageRange.count; index += 1) {
        doc.switchToPage(pageRange.start + index)

        const originalBottomMargin = doc.page.margins.bottom
        doc.page.margins.bottom = 0

        const footerLineY = pageHeight - 35
        const footerTextY = pageHeight - 27

        doc.moveTo(left, footerLineY).lineTo(right, footerLineY).strokeColor(colors.border).lineWidth(0.5).stroke()

        doc.font('Helvetica').fontSize(7).fillColor(colors.muted).text('Generated by MineERP', left, footerTextY, {
          width: 200,
          lineBreak: false,
        })

        doc
          .font('Helvetica')
          .fontSize(7)
          .fillColor(colors.muted)
          .text(`Page ${index + 1} of ${pageRange.count}`, right - 100, footerTextY, {
            width: 100,
            align: 'right',
            lineBreak: false,
          })

        doc.page.margins.bottom = originalBottomMargin
      }

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

module.exports = generateSupplierReportPDF
