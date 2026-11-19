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
    currency: currency || 'INR',
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0)
}

const safeText = (value) => {
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

const generateCustomerReportPDF = (rows = [], summary = {}, company = {}, filters = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: {
          top: 35,
          bottom: 40,
          left: 35,
          right: 35,
        },
        bufferPages: true,
      })

      const chunks = []

      doc.on('data', (chunk) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      const pageWidth = doc.page.width
      const pageHeight = doc.page.height

      const left = 35
      const right = pageWidth - 35
      const contentWidth = right - left
      const bottomLimit = pageHeight - 48

      const currency = company.currency || 'INR'

      const purple = '#6D28D9'
      const dark = '#1E293B'
      const muted = '#64748B'
      const light = '#F1F5F9'
      const border = '#E2E8F0'

      const drawLine = (y) => {
        doc.moveTo(left, y).lineTo(right, y).lineWidth(0.7).strokeColor(border).stroke()
      }

      const drawHeader = () => {
        doc.font('Helvetica-Bold').fontSize(17).fillColor(purple).text(safeText(company.companyName), left, 35, {
          width: 500,
          lineBreak: false,
          ellipsis: true,
        })

        const companyAddress = [company.addressLine1, company.addressLine2, company.city, company.state, company.country, company.postalCode].filter(Boolean).join(', ')

        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor(muted)
          .text(companyAddress || '-', left, 58, {
            width: 500,
            lineBreak: false,
            ellipsis: true,
          })

        const contact = [company.companyEmail, company.companyPhone, company.gstNumber ? `GSTIN: ${company.gstNumber}` : null].filter(Boolean).join('  |  ')

        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor(muted)
          .text(contact || '-', left, 72, {
            width: 500,
            lineBreak: false,
            ellipsis: true,
          })

        doc.font('Helvetica-Bold').fontSize(16).fillColor(dark).text('CUSTOMER REPORT', left, 105)

        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor(muted)
          .text(`Generated: ${formatDate(new Date())}`, right - 150, 108, {
            width: 150,
            align: 'right',
          })

        drawLine(128)
      }

      const drawFilters = () => {
        let y = 140

        doc.font('Helvetica-Bold').fontSize(9).fillColor(dark).text('REPORT FILTERS', left, y)

        y += 18

        const filterItems = [
          ['From Date', filters.fromDate ? formatDate(filters.fromDate) : 'All'],
          ['To Date', filters.toDate ? formatDate(filters.toDate) : 'All'],
          ['Customer Status', safeText(filters.status || 'All')],
          ['Search', safeText(filters.search || 'All')],
        ]

        const gap = 8
        const boxWidth = (contentWidth - gap * 3) / 4

        filterItems.forEach((item, index) => {
          const x = left + index * (boxWidth + gap)

          doc.roundedRect(x, y, boxWidth, 38, 4).fillColor(light).fill()

          doc
            .font('Helvetica')
            .fontSize(7)
            .fillColor(muted)
            .text(item[0], x + 8, y + 7, {
              width: boxWidth - 16,
            })

          doc
            .font('Helvetica-Bold')
            .fontSize(8)
            .fillColor(dark)
            .text(item[1], x + 8, y + 20, {
              width: boxWidth - 16,
              ellipsis: true,
              lineBreak: false,
            })
        })

        return y + 50
      }

      const drawSummary = (startY) => {
        const cards = [
          ['Total Customers', summary.totalCustomers || 0],
          ['Active Customers', summary.activeCustomers || 0],
          ['Inactive Customers', summary.inactiveCustomers || 0],
          ['Credit Limit', formatAmount(summary.totalCreditLimit, currency)],
          ['Opening Balance', formatAmount(summary.totalOpeningBalance, currency)],
          ['Total Invoiced', formatAmount(summary.totalInvoiced, currency)],
          ['Total Paid', formatAmount(summary.totalPaid, currency)],
          ['Outstanding', formatAmount(summary.totalOutstanding, currency)],
        ]

        const gap = 8
        const cardWidth = (contentWidth - gap * 3) / 4
        const cardHeight = 48

        cards.forEach((card, index) => {
          const row = Math.floor(index / 4)
          const column = index % 4

          const x = left + column * (cardWidth + gap)
          const y = startY + row * (cardHeight + gap)

          doc.roundedRect(x, y, cardWidth, cardHeight, 4).fillColor('#F8FAFC').fill()

          doc
            .font('Helvetica')
            .fontSize(7)
            .fillColor(muted)
            .text(card[0], x + 9, y + 9, {
              width: cardWidth - 18,
            })

          doc
            .font('Helvetica-Bold')
            .fontSize(10)
            .fillColor(dark)
            .text(String(card[1]), x + 9, y + 24, {
              width: cardWidth - 18,
              ellipsis: true,
              lineBreak: false,
            })
        })

        return startY + 2 * (cardHeight + gap) + 5
      }

      // Column widths total 771 points, matching A4 landscape usable width.
      const columns = [
        { label: 'Code', key: 'customerCode', width: 50 },
        { label: 'Customer', key: 'customerName', width: 105 },
        { label: 'Contact', key: 'contactPerson', width: 72 },
        { label: 'Phone', key: 'phone', width: 65 },
        { label: 'City', key: 'city', width: 58 },
        { label: 'Status', key: 'status', width: 55 },
        { label: 'Invoices', key: 'invoiceCount', width: 48, align: 'right' },
        { label: 'Credit Limit', key: 'creditLimit', width: 78, amount: true },
        { label: 'Invoiced', key: 'totalInvoiced', width: 82, amount: true },
        { label: 'Paid', key: 'totalPaid', width: 75, amount: true },
        { label: 'Outstanding', key: 'totalOutstanding', width: 83, amount: true },
      ]

      const tableWidth = columns.reduce((total, column) => total + column.width, 0)

      const drawTableHeader = (y) => {
        doc.rect(left, y, tableWidth, 23).fillColor(purple).fill()

        let x = left

        columns.forEach((column) => {
          doc
            .font('Helvetica-Bold')
            .fontSize(7)
            .fillColor('#FFFFFF')
            .text(column.label, x + 4, y + 8, {
              width: column.width - 8,
              align: column.align || 'left',
              ellipsis: true,
              lineBreak: false,
            })

          x += column.width
        })

        return y + 23
      }

      const drawTableRow = (row, y, index) => {
        const rowHeight = 25

        if (index % 2 === 0) {
          doc.rect(left, y, tableWidth, rowHeight).fillColor('#F8FAFC').fill()
        }

        let x = left

        columns.forEach((column) => {
          const rawValue = row[column.key]

          const value = column.amount ? formatAmount(rawValue, currency) : safeText(rawValue)

          doc
            .font('Helvetica')
            .fontSize(7)
            .fillColor(dark)
            .text(value, x + 4, y + 8, {
              width: column.width - 8,
              align: column.align || 'left',
              ellipsis: true,
              lineBreak: false,
            })

          x += column.width
        })

        doc
          .moveTo(left, y + rowHeight)
          .lineTo(left + tableWidth, y + rowHeight)
          .lineWidth(0.4)
          .strokeColor(border)
          .stroke()

        return y + rowHeight
      }

      const drawContinuationHeader = () => {
        doc.addPage()

        doc.font('Helvetica-Bold').fontSize(11).fillColor(purple).text('CUSTOMER REPORT (CONTINUED)', left, 35)

        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor(muted)
          .text(`Generated: ${formatDate(new Date())}`, right - 150, 38, {
            width: 150,
            align: 'right',
          })

        drawLine(58)

        return drawTableHeader(72)
      }

      // First page: company details, filters and summary.
      drawHeader()

      let y = drawFilters()
      y = drawSummary(y)

      y += 8

      doc.font('Helvetica-Bold').fontSize(10).fillColor(dark).text(`CUSTOMER LIST (${rows.length})`, left, y)

      y += 18

      // Keep the table together at the start of the page.
      if (y + 23 + 25 > bottomLimit) {
        y = drawContinuationHeader()
      } else {
        y = drawTableHeader(y)
      }

      if (rows.length === 0) {
        if (y + 40 > bottomLimit) {
          y = drawContinuationHeader()
        }

        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor(muted)
          .text('No customers found for the selected filters.', left, y + 10)
      } else {
        rows.forEach((row, index) => {
          if (y + 25 > bottomLimit) {
            y = drawContinuationHeader()
          }

          y = drawTableRow(row, y, index)
        })
      }

      // Page numbers on every page.
      const range = doc.bufferedPageRange()

      for (let index = range.start; index < range.start + range.count; index += 1) {
        doc.switchToPage(index)

        doc
          .font('Helvetica')
          .fontSize(7)
          .fillColor(muted)
          .text(`MineERP | Customer Report | Page ${index + 1} of ${range.count}`, left, pageHeight - 28, {
            width: contentWidth,
            align: 'center',
          })
      }

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

module.exports = generateCustomerReportPDF
