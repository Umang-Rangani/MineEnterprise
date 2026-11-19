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
  return `${currency} ${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

const formatNumber = (value) => {
  return Number(value || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  })
}

const getText = (value, fallback = '-') => {
  if (value === undefined || value === null || value === '') {
    return fallback
  }

  return String(value)
}

const generatePurchaseReportPDF = (rows, summary, company, filters = {}) => {
  return new Promise((resolve, reject) => {
    try {
      if (!Array.isArray(rows) || !summary || !company) {
        return reject(new Error('Purchase report data and company details are required.'))
      }

      const currency = company.currency || 'INR'

      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: {
          top: 30,
          bottom: 45,
          left: 25,
          right: 25,
        },
        info: {
          Title: 'Purchase Report',
          Author: company.companyName || 'MineERP',
          Subject: 'Purchase Report',
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
        red: '#dc2626',
      }

      const companyAddress = [company.addressLine1, company.addressLine2, company.city, company.state, company.country, company.postalCode].filter(Boolean).join(', ')

      let y = 30
      let pageNumber = 1

      // FOOTER
      const drawFooter = () => {
        const previousY = doc.y
        const previousX = doc.x
        const previousBottomMargin = doc.page.margins.bottom

        // Footer text must not trigger an automatic page break.
        doc.page.margins.bottom = 0

        doc
          .moveTo(left, pageHeight - 35)
          .lineTo(right, pageHeight - 35)
          .strokeColor(colors.border)
          .lineWidth(0.5)
          .stroke()

        doc
          .font('Helvetica')
          .fontSize(7)
          .fillColor(colors.muted)
          .text('This is a computer-generated purchase report.', left, pageHeight - 25, {
            width: contentWidth - 80,
            height: 10,
            lineBreak: false,
          })

        doc
          .font('Helvetica')
          .fontSize(7)
          .fillColor(colors.muted)
          .text(`Page ${pageNumber}`, right - 70, pageHeight - 25, {
            width: 70,
            height: 10,
            align: 'right',
            lineBreak: false,
          })

        doc.page.margins.bottom = previousBottomMargin
        doc.x = previousX
        doc.y = previousY
      }

      // Draw footer on the first page and every newly created page.
      drawFooter()

      doc.on('pageAdded', () => {
        pageNumber += 1
        drawFooter()
      })

      // PAGE BREAK
      const bottomLimit = pageHeight - 55

      const checkPageSpace = (requiredHeight) => {
        if (y + requiredHeight > bottomLimit) {
          doc.addPage()
          y = 30
          return true
        }

        return false
      }

      // HEADER
      doc.roundedRect(left, y, contentWidth, 75, 7).fill(colors.light)

      doc
        .font('Helvetica-Bold')
        .fontSize(17)
        .fillColor(colors.primary)
        .text(getText(company.companyName, 'Company'), left + 15, y + 12, {
          width: 420,
        })

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(colors.dark)
        .text(companyAddress || '-', left + 15, y + 36, {
          width: 420,
        })

      doc
        .fontSize(8)
        .fillColor(colors.muted)
        .text(`Email: ${getText(company.companyEmail)}  |  Phone: ${getText(company.companyPhone)}`, left + 15, y + 55, {
          width: 420,
        })

      doc
        .font('Helvetica-Bold')
        .fontSize(20)
        .fillColor(colors.dark)
        .text('PURCHASE REPORT', right - 235, y + 17, {
          width: 220,
          align: 'right',
        })

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(colors.muted)
        .text(`Generated: ${formatDate(new Date())}`, right - 235, y + 47, {
          width: 220,
          align: 'right',
        })

      y += 90

      // FILTER DETAILS
      doc.font('Helvetica-Bold').fontSize(9).fillColor(colors.primary).text('REPORT FILTERS', left, y)

      y += 15

      const filterParts = [
        filters.fromDate ? `From: ${formatDate(filters.fromDate)}` : null,
        filters.toDate ? `To: ${formatDate(filters.toDate)}` : null,
        filters.status ? `Status: ${filters.status}` : null,
        filters.paymentStatus ? `Payment: ${filters.paymentStatus}` : null,
        filters.search ? `Search: ${filters.search}` : null,
        filters.supplierId ? `Supplier ID: ${filters.supplierId}` : null,
      ].filter(Boolean)

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(colors.muted)
        .text(filterParts.length ? filterParts.join('   |   ') : 'All purchases', left, y, {
          width: contentWidth,
        })

      y += 25

      // SUMMARY CARDS
      const cards = [
        { label: 'Total Purchases', value: formatNumber(summary.purchaseCount) },
        { label: 'Financial Purchases', value: formatNumber(summary.financialPurchaseCount) },
        { label: 'Total Amount', value: formatAmount(summary.totalAmount, currency) },
        { label: 'Paid Amount', value: formatAmount(summary.paidAmount, currency) },
        { label: 'Outstanding', value: formatAmount(summary.outstandingAmount, currency) },
      ]

      const cardGap = 8
      const cardWidth = (contentWidth - cardGap * 4) / 5

      cards.forEach((card, index) => {
        const x = left + index * (cardWidth + cardGap)

        doc.roundedRect(x, y, cardWidth, 48, 5).fill(colors.light)

        doc
          .font('Helvetica')
          .fontSize(7)
          .fillColor(colors.muted)
          .text(card.label, x + 7, y + 8, {
            width: cardWidth - 14,
            lineBreak: false,
          })

        doc
          .font('Helvetica-Bold')
          .fontSize(9)
          .fillColor(colors.dark)
          .text(card.value, x + 7, y + 25, {
            width: cardWidth - 14,
            lineBreak: false,
          })
      })

      y += 62

      // ADDITIONAL SUMMARY
      doc.font('Helvetica-Bold').fontSize(9).fillColor(colors.primary).text('QUANTITY & STATUS SUMMARY', left, y)

      y += 15

      const summaryText = [
        `Ordered: ${formatNumber(summary.orderedQuantity)}`,
        `Received: ${formatNumber(summary.receivedQuantity)}`,
        `Accepted: ${formatNumber(summary.acceptedQuantity)}`,
        `Damaged: ${formatNumber(summary.damagedQuantity)}`,
        `Pending: ${formatNumber(summary.pendingQuantity)}`,
        `Draft: ${summary.draftCount || 0}`,
        `Ordered: ${summary.orderedCount || 0}`,
        `Partially Received: ${summary.partiallyReceivedCount || 0}`,
        `Received: ${summary.receivedCount || 0}`,
        `Cancelled: ${summary.cancelledCount || 0}`,
      ]

      doc.font('Helvetica').fontSize(7.5).fillColor(colors.dark).text(summaryText.join('   |   '), left, y, {
        width: contentWidth,
      })

      y += 27

      // PURCHASE TABLE
      const columns = [
        { label: 'Purchase Number', width: 86, align: 'left' },
        { label: 'Supplier', width: 105, align: 'left' },
        { label: 'Date', width: 57, align: 'left' },
        { label: 'Status', width: 75, align: 'left' },
        { label: 'Payment', width: 65, align: 'left' },
        { label: 'Total', width: 75, align: 'right' },
        { label: 'Paid', width: 68, align: 'right' },
        { label: 'Balance', width: 68, align: 'right' },
        { label: 'Ordered', width: 55, align: 'right' },
        { label: 'Accepted', width: 55, align: 'right' },
        { label: 'Pending', width: 55, align: 'right' },
      ]

      const drawTableHeader = () => {
        doc.roundedRect(left, y, contentWidth, 23, 4).fill(colors.primary)

        let x = left + 4

        columns.forEach((column) => {
          doc
            .font('Helvetica-Bold')
            .fontSize(6.5)
            .fillColor(colors.white)
            .text(column.label, x, y + 7, {
              width: column.width,
              align: column.align,
              lineBreak: false,
            })

          x += column.width
        })

        y += 23
      }

      drawTableHeader()

      rows.forEach((row, index) => {
        const rowHeight = 27

        if (y + rowHeight > bottomLimit) {
          doc.addPage()
          y = 30
          drawTableHeader()
        }

        const supplierName = row.supplier?.name || '-'
        const supplierCode = row.supplier?.code || ''

        const supplierText = supplierCode ? `${supplierName} (${supplierCode})` : supplierName

        if (index % 2 === 0) {
          doc.rect(left, y, contentWidth, rowHeight).fill('#fafafa')
        }

        doc
          .moveTo(left, y + rowHeight)
          .lineTo(right, y + rowHeight)
          .strokeColor(colors.border)
          .lineWidth(0.4)
          .stroke()

        const values = [
          getText(row.purchaseNumber),
          supplierText,
          formatDate(row.purchaseDate),
          getText(row.status),
          getText(row.paymentStatus),
          formatAmount(row.totalAmount, currency),
          formatAmount(row.paidAmount, currency),
          formatAmount(row.outstandingAmount, currency),
          formatNumber(row.orderedQuantity),
          formatNumber(row.acceptedQuantity),
          formatNumber(row.pendingQuantity),
        ]

        let x = left + 4

        columns.forEach((column, columnIndex) => {
          doc
            .font('Helvetica')
            .fontSize(6.2)
            .fillColor(colors.dark)
            .text(values[columnIndex], x, y + 8, {
              width: column.width,
              height: rowHeight - 8,
              align: column.align,
              lineBreak: false,
              ellipsis: true,
            })

          x += column.width
        })

        y += rowHeight
      })

      // EMPTY STATE
      if (!rows.length) {
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor(colors.muted)
          .text('No purchase records found for the selected filters.', left, y + 15, {
            width: contentWidth,
            align: 'center',
          })

        y += 40
      }

      // FINANCIAL SUMMARY
      const financialRows = [
        ['Subtotal', summary.subtotal],
        ['Discount', summary.discountAmount],
        ['Tax Amount', summary.taxAmount],
        ['Shipping Charges', summary.shippingCharges],
        ['Adjustment', summary.adjustmentAmount],
        ['Total Amount', summary.totalAmount],
        ['Paid Amount', summary.paidAmount],
        ['Outstanding Amount', summary.outstandingAmount],
      ]

      const totalsWidth = 220
      const totalsX = right - totalsWidth
      const valueX = right - 105

      // Keep the financial summary together on one page.
      if (y + 18 + financialRows.length * 19 > bottomLimit) {
        doc.addPage()
        y = 30
      } else {
        y += 18
      }

      doc.font('Helvetica-Bold').fontSize(9).fillColor(colors.primary).text('FINANCIAL SUMMARY', totalsX, y)

      y += 18

      financialRows.forEach(([label, value]) => {
        const isTotal = label === 'Total Amount'
        const isOutstanding = label === 'Outstanding Amount'

        doc
          .font(isTotal || isOutstanding ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(isTotal || isOutstanding ? 9 : 8)
          .fillColor(isOutstanding && Number(value || 0) > 0 ? colors.red : colors.dark)
          .text(label, totalsX, y, {
            width: 115,
            lineBreak: false,
          })

        doc
          .font(isTotal || isOutstanding ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(isTotal || isOutstanding ? 9 : 8)
          .fillColor(isOutstanding && Number(value || 0) > 0 ? colors.red : colors.dark)
          .text(formatAmount(value, currency), valueX, y, {
            width: 105,
            align: 'right',
            lineBreak: false,
          })

        y += 19
      })

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

module.exports = generatePurchaseReportPDF
