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

const generateSalesReportPDF = (rows, summary, company, filters = {}) => {
  return new Promise((resolve, reject) => {
    try {
      if (!Array.isArray(rows) || !summary || !company) {
        return reject(new Error('Sales report data and company details are required.'))
      }

      const currency = company.currency || 'INR'

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
          Title: 'Sales Report',
          Author: company.companyName || 'MineERP',
          Subject: 'Sales Report',
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
        doc.font('Helvetica-Bold').fontSize(15).fillColor(colors.primary).text(safeText(company.companyName, 'MineERP'), left, 28, {
          width: contentWidth,
        })

        const address = [company.addressLine1, company.addressLine2, company.city, company.state, company.country, company.postalCode].filter(Boolean).join(', ')

        doc
          .font('Helvetica')
          .fontSize(7)
          .fillColor(colors.muted)
          .text(address || '-', left, 48, {
            width: contentWidth * 0.65,
          })

        const contact = [company.companyEmail, company.companyPhone, company.gstNumber ? `GSTIN: ${company.gstNumber}` : ''].filter(Boolean).join('  |  ')

        doc.font('Helvetica').fontSize(7).fillColor(colors.muted).text(contact, left, 60, {
          width: contentWidth,
        })

        doc.moveTo(left, 77).lineTo(right, 77).strokeColor(colors.border).lineWidth(1).stroke()

        doc.font('Helvetica-Bold').fontSize(13).fillColor(colors.dark).text('SALES REPORT', left, 87)

        doc
          .font('Helvetica')
          .fontSize(7)
          .fillColor(colors.muted)
          .text(`Generated: ${formatDate(new Date())}`, right - 150, 90, {
            width: 150,
            align: 'right',
          })

        const filterParts = []

        if (filters.fromDate) filterParts.push(`From: ${formatDate(filters.fromDate)}`)
        if (filters.toDate) filterParts.push(`To: ${formatDate(filters.toDate)}`)
        if (filters.status) filterParts.push(`Status: ${filters.status}`)
        if (filters.search) filterParts.push(`Search: ${filters.search}`)

        if (filterParts.length) {
          doc.font('Helvetica').fontSize(7).fillColor(colors.muted).text(filterParts.join('  |  '), left, 105, {
            width: contentWidth,
          })
        }
      }

      const drawSummary = (startY) => {
        const cards = [
          ['Invoices', formatNumber(summary.invoiceCount)],
          ['Net Sales', formatAmount(summary.netSales, currency)],
          ['Tax', formatAmount(summary.taxAmount, currency)],
          ['Grand Total', formatAmount(summary.grandTotal, currency)],
          ['Paid', formatAmount(summary.paidAmount, currency)],
          ['Outstanding', formatAmount(summary.balanceAmount, currency)],
          ['Allocated COGS', formatAmount(summary.allocatedCOGS, currency)],
          ['Gross Profit', formatAmount(summary.grossProfit, currency)],
        ]

        const gap = 7
        const cardWidth = (contentWidth - gap * 3) / 4
        const cardHeight = 37

        cards.forEach(([label, value], index) => {
          const row = Math.floor(index / 4)
          const column = index % 4

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
        { label: 'Invoice No.', key: 'invoiceNumber', width: 68 },
        { label: 'Date', key: 'invoiceDate', width: 43 },
        { label: 'Customer', key: 'customer', width: 78 },
        { label: 'Sales Order', key: 'salesOrder', width: 60 },
        { label: 'Warehouse', key: 'warehouse', width: 62 },
        { label: 'Status', key: 'status', width: 48 },
        { label: 'Net Sales', key: 'netSales', width: 52, amount: true },
        { label: 'Tax', key: 'taxAmount', width: 38, amount: true },
        { label: 'Total', key: 'grandTotal', width: 50, amount: true },
        { label: 'Paid', key: 'paidAmount', width: 45, amount: true },
        { label: 'Balance', key: 'balanceAmount', width: 48, amount: true },
        { label: 'COGS', key: 'allocatedCOGS', width: 48, amount: true },
        { label: 'Gross Profit', key: 'grossProfit', width: 55, amount: true },
      ]

      const tableWidth = columns.reduce((sum, column) => sum + column.width, 0)

      const getCellValue = (row, column) => {
        if (column.key === 'invoiceDate') return formatDate(row.invoiceDate)
        if (column.key === 'customer') return row.customer?.name || '-'
        if (column.key === 'salesOrder') return row.salesOrder?.orderNumber || '-'
        if (column.key === 'warehouse') return row.warehouse?.name || '-'

        if (column.amount) {
          return formatAmount(row[column.key], currency)
        }

        return safeText(row[column.key])
      }

      const drawTableHeader = (y) => {
        doc.rect(left, y, tableWidth, 22).fill(colors.primary)

        let x = left

        columns.forEach((column) => {
          doc
            .font('Helvetica-Bold')
            .fontSize(6)
            .fillColor(colors.white)
            .text(column.label, x + 3, y + 7, {
              width: column.width - 6,
              align: column.amount ? 'right' : 'left',
              lineBreak: false,
            })

          x += column.width
        })

        return y + 22
      }

      const drawTableRow = (row, y, index) => {
        const rowHeight = 27

        if (index % 2 === 0) {
          doc.rect(left, y, tableWidth, rowHeight).fill('#fafafa')
        }

        doc
          .moveTo(left, y + rowHeight)
          .lineTo(left + tableWidth, y + rowHeight)
          .strokeColor(colors.border)
          .lineWidth(0.4)
          .stroke()

        let x = left

        columns.forEach((column) => {
          const value = getCellValue(row, column)

          doc
            .font('Helvetica')
            .fontSize(5.8)
            .fillColor(colors.dark)
            .text(value, x + 3, y + 5, {
              width: column.width - 6,
              height: rowHeight - 7,
              align: column.amount ? 'right' : 'left',
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

      if (!rows.length) {
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor(colors.muted)
          .text('No sales records found for the selected filters.', left, y + 15, {
            width: tableWidth,
            align: 'center',
          })
      } else {
        rows.forEach((row, index) => {
          if (y + 27 > pageHeight - 65) {
            doc.addPage()
            drawCompanyHeader()
            y = drawTableHeader(118)
          }

          y = drawTableRow(row, y, index)
        })
      }

      // Footer on every page.
      const pageRange = doc.bufferedPageRange()

      for (let index = 0; index < pageRange.count; index += 1) {
        doc.switchToPage(index)

        // Prevent PDFKit from creating a new page for footer text.
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

module.exports = generateSalesReportPDF
