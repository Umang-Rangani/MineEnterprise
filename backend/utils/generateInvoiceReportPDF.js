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

const generateInvoiceReportPDF = (rows = [], summary = {}, company = {}, filters = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: {
          top: 35,
          bottom: 60,
          left: 35,
          right: 35,
        },
        bufferPages: true,
        autoFirstPage: true,
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

      // Footer માટે જગ્યા છોડવામાં આવી છે.
      const bottomLimit = pageHeight - 65

      const currency = company.currency || 'INR'

      const purple = '#6D28D9'
      const dark = '#1E293B'
      const muted = '#64748B'
      const light = '#F1F5F9'
      const border = '#E2E8F0'

      const drawLine = (y) => {
        doc.moveTo(left, y).lineTo(right, y).lineWidth(0.7).strokeColor(border).stroke()
      }

      // =========================
      // Company Header
      // =========================

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

        doc.font('Helvetica-Bold').fontSize(16).fillColor(dark).text('INVOICE REPORT', left, 105, {
          lineBreak: false,
        })

        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor(muted)
          .text(`Generated: ${formatDate(new Date())}`, right - 150, 108, {
            width: 150,
            align: 'right',
            lineBreak: false,
          })

        drawLine(128)
      }

      // =========================
      // Report Filters
      // =========================

      const drawFilters = () => {
        let y = 140

        doc.font('Helvetica-Bold').fontSize(9).fillColor(dark).text('REPORT FILTERS', left, y, {
          lineBreak: false,
        })

        y += 18

        const filterItems = [
          ['From Date', filters.fromDate ? formatDate(filters.fromDate) : 'All'],
          ['To Date', filters.toDate ? formatDate(filters.toDate) : 'All'],
          ['Invoice Status', safeText(filters.status || 'All')],
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
              lineBreak: false,
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

      // =========================
      // Summary Cards
      // =========================

      const drawSummary = (startY) => {
        const cards = [
          ['Total Invoices', summary.totalInvoices || 0],
          ['Draft', summary.draftCount || 0],
          ['Approved', summary.approvedCount || 0],
          ['Partially Paid', summary.partiallyPaidCount || 0],
          ['Paid', summary.paidCount || 0],
          ['Overdue', summary.overdueCount || 0],
          ['Cancelled', summary.cancelledCount || 0],
          ['Grand Total', formatAmount(summary.grandTotal, currency)],
          ['Total Paid', formatAmount(summary.paidAmount, currency)],
          ['Outstanding', formatAmount(summary.balanceAmount, currency)],
        ]

        const gap = 8
        const columnsPerRow = 5
        const cardWidth = (contentWidth - gap * (columnsPerRow - 1)) / columnsPerRow

        const cardHeight = 48

        cards.forEach((card, index) => {
          const row = Math.floor(index / columnsPerRow)
          const column = index % columnsPerRow

          const x = left + column * (cardWidth + gap)
          const y = startY + row * (cardHeight + gap)

          doc.roundedRect(x, y, cardWidth, cardHeight, 4).fillColor('#F8FAFC').fill()

          doc
            .font('Helvetica')
            .fontSize(7)
            .fillColor(muted)
            .text(card[0], x + 9, y + 9, {
              width: cardWidth - 18,
              lineBreak: false,
            })

          doc
            .font('Helvetica-Bold')
            .fontSize(9)
            .fillColor(dark)
            .text(String(card[1]), x + 9, y + 24, {
              width: cardWidth - 18,
              ellipsis: true,
              lineBreak: false,
            })
        })

        return startY + 2 * (cardHeight + gap) + 5
      }

      // =========================
      // Table Columns
      // =========================

      const columns = [
        { label: 'Invoice No.', key: 'invoiceNumber', width: 78 },
        { label: 'Date', key: 'invoiceDate', width: 58, date: true },
        { label: 'Customer', key: 'customerName', width: 105 },
        { label: 'Order No.', key: 'orderNumber', width: 70 },
        { label: 'Warehouse', key: 'warehouseName', width: 75 },
        { label: 'Status', key: 'status', width: 65 },
        { label: 'Grand Total', key: 'grandTotal', width: 83, amount: true },
        { label: 'Paid', key: 'paidAmount', width: 75, amount: true },
        { label: 'Outstanding', key: 'balanceAmount', width: 85, amount: true },
        { label: 'Email', key: 'emailStatus', width: 65 },
      ]

      const tableWidth = columns.reduce((total, column) => total + column.width, 0)

      // =========================
      // Table Header
      // =========================

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
              ellipsis: true,
              lineBreak: false,
            })

          x += column.width
        })

        return y + 23
      }

      // =========================
      // Table Row
      // =========================

      const drawTableRow = (row, y, index) => {
        const rowHeight = 25

        if (index % 2 === 0) {
          doc.rect(left, y, tableWidth, rowHeight).fillColor('#F8FAFC').fill()
        }

        let x = left

        columns.forEach((column) => {
          let rawValue = row[column.key]

          if (column.key === 'customerName') {
            rawValue = row.customer?.name
          }

          if (column.key === 'orderNumber') {
            rawValue = row.salesOrder?.orderNumber
          }

          if (column.key === 'warehouseName') {
            rawValue = row.warehouse?.name
          }

          const value = column.amount ? formatAmount(rawValue, currency) : column.date ? formatDate(rawValue) : safeText(rawValue)

          doc
            .font('Helvetica')
            .fontSize(7)
            .fillColor(dark)
            .text(value, x + 4, y + 8, {
              width: column.width - 8,
              height: 10,
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

      // =========================
      // Continuation Page Header
      // =========================

      const drawContinuationHeader = () => {
        doc.addPage({
          size: 'A4',
          layout: 'landscape',
          margins: {
            top: 35,
            bottom: 60,
            left: 35,
            right: 35,
          },
        })

        doc.font('Helvetica-Bold').fontSize(11).fillColor(purple).text('INVOICE REPORT (CONTINUED)', left, 35, {
          lineBreak: false,
        })

        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor(muted)
          .text(`Generated: ${formatDate(new Date())}`, right - 150, 38, {
            width: 150,
            align: 'right',
            lineBreak: false,
          })

        drawLine(58)

        return drawTableHeader(72)
      }

      // =========================
      // Generate Report
      // =========================

      drawHeader()

      let y = drawFilters()

      y = drawSummary(y)

      y += 8

      doc.font('Helvetica-Bold').fontSize(10).fillColor(dark).text(`INVOICE LIST (${rows.length})`, left, y, {
        lineBreak: false,
      })

      y += 18

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
          .text('No invoices found for the selected filters.', left, y + 10, {
            lineBreak: false,
          })
      } else {
        rows.forEach((row, index) => {
          if (y + 25 > bottomLimit) {
            y = drawContinuationHeader()
          }

          y = drawTableRow(row, y, index)
        })
      }

      // =========================
      // Footer on Every Page
      // =========================

      const range = doc.bufferedPageRange()

      for (let index = range.start; index < range.start + range.count; index += 1) {
        doc.switchToPage(index)

        doc
          .font('Helvetica')
          .fontSize(7)
          .fillColor(muted)
          .text(`MineERP | Invoice Report | Page ${index + 1} of ${range.count}`, left, pageHeight - 50, {
            width: contentWidth,
            height: 10,
            align: 'center',
            lineBreak: false,
          })
      }

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

module.exports = generateInvoiceReportPDF
