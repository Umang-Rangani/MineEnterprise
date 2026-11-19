const PDFDocument = require('pdfkit')

const formatDate = (value) => {
  if (!value) return '-'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '-'

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatAmount = (value, currency = 'INR') => {
  const amount = Number(value)

  if (!Number.isFinite(amount)) return '-'

  return `${currency} ${amount.toLocaleString('en-IN', {
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

const generateStockMovementReportPDF = ({ movements = [], summary = {}, companyName = 'MineERP', filters = {}, company = {} }) => {
  return new Promise((resolve, reject) => {
    try {
      if (!Array.isArray(movements) || !summary) {
        return reject(new Error('Stock movement report data is required.'))
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
          Title: 'Stock Movement Report',
          Author: companyName,
          Subject: 'Stock Movement Report',
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

      let y = 30
      let pageNumber = 1

      // FOOTER
      const drawFooter = () => {
        const previousY = doc.y
        const previousX = doc.x
        const previousBottomMargin = doc.page.margins.bottom

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
          .text('This is a computer-generated stock movement report.', left, pageHeight - 25, {
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

      // Footer on first page and every new page
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
      doc.roundedRect(left, y, contentWidth, 65, 7).fill(colors.light)

      doc
        .font('Helvetica-Bold')
        .fontSize(17)
        .fillColor(colors.primary)
        .text(getText(companyName, 'MineERP'), left + 15, y + 10, {
          width: 420,
        })

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(colors.muted)
        .text(getText(company.address, ''), left + 15, y + 35, {
          width: 420,
        })

      doc
        .font('Helvetica-Bold')
        .fontSize(19)
        .fillColor(colors.dark)
        .text('STOCK MOVEMENT REPORT', right - 290, y + 13, {
          width: 275,
          align: 'right',
        })

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(colors.muted)
        .text(`Generated: ${formatDate(new Date())}`, right - 290, y + 40, {
          width: 275,
          align: 'right',
        })

      y += 80

      // REPORT FILTERS
      doc.font('Helvetica-Bold').fontSize(9).fillColor(colors.primary).text('REPORT FILTERS', left, y)

      y += 15

      const filterParts = [
        filters.fromDate ? `From: ${formatDate(filters.fromDate)}` : null,
        filters.toDate ? `To: ${formatDate(filters.toDate)}` : null,
        filters.productId ? `Product ID: ${filters.productId}` : null,
        filters.warehouseId ? `Warehouse ID: ${filters.warehouseId}` : null,
        filters.type ? `Type: ${filters.type}` : null,
        filters.search ? `Search: ${filters.search}` : null,
      ].filter(Boolean)

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(colors.muted)
        .text(filterParts.length ? filterParts.join('   |   ') : 'All stock movements', left, y, {
          width: contentWidth,
        })

      y += 25

      // SUMMARY CARDS
      const cards = [
        {
          label: 'Total Movements',
          value: formatNumber(summary.totalMovements),
        },
        {
          label: 'Stock IN',
          value: formatNumber(summary.stockIn),
        },
        {
          label: 'Stock OUT',
          value: formatNumber(summary.stockOut),
        },
        {
          label: 'Adjustment Net',
          value: formatNumber(summary.adjustmentNet),
        },
        {
          label: 'Transfer Quantity',
          value: formatNumber(summary.transferQuantity),
        },
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
          .fontSize(10)
          .fillColor(colors.dark)
          .text(card.value, x + 7, y + 25, {
            width: cardWidth - 14,
            lineBreak: false,
          })
      })

      y += 65

      // STOCK MOVEMENT TABLE
      const columns = [
        { label: 'Date', width: 82, align: 'left' },
        { label: 'Product', width: 105, align: 'left' },
        { label: 'SKU', width: 65, align: 'left' },
        { label: 'Type', width: 68, align: 'left' },
        { label: 'Warehouse', width: 95, align: 'left' },
        { label: 'Destination', width: 95, align: 'left' },
        { label: 'Qty', width: 42, align: 'right' },
        { label: 'Unit Cost', width: 65, align: 'right' },
        { label: 'Previous', width: 48, align: 'right' },
        { label: 'New Stock', width: 48, align: 'right' },
        { label: 'Reference', width: 85, align: 'left' },
      ]

      const originalWidth = columns.reduce((total, column) => total + column.width, 0)

      const scale = contentWidth / originalWidth

      columns.forEach((column) => {
        column.width *= scale
      })

      // TABLE HEADER
      const drawTableHeader = () => {
        doc.roundedRect(left, y, contentWidth, 23, 4).fill(colors.primary)

        let x = left + 4

        columns.forEach((column) => {
          doc
            .font('Helvetica-Bold')
            .fontSize(6.5)
            .fillColor(colors.white)
            .text(column.label, x, y + 7, {
              width: column.width - 5,
              align: column.align,
              lineBreak: false,
            })

          x += column.width
        })

        y += 23
      }

      drawTableHeader()

      // TABLE ROWS
      const rowHeight = 27

      if (!movements.length) {
        checkPageSpace(40)

        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor(colors.muted)
          .text('No stock movements found for the selected filters.', left, y + 15, {
            width: contentWidth,
            align: 'center',
          })

        y += 40
      }

      movements.forEach((movement, index) => {
        checkPageSpace(rowHeight + 23)

        // Repeat table header on a new page
        if (y === 30) {
          drawTableHeader()
        }

        const values = [
          formatDate(movement.createdAt),
          getText(movement.productId?.name),
          getText(movement.productId?.sku),
          getText(movement.type),
          getText(movement.warehouseId?.name),
          getText(movement.destinationWarehouseId?.name),
          formatNumber(movement.quantity),
          movement.unitCost != null ? formatAmount(movement.unitCost, currency) : '-',
          formatNumber(movement.previousStock),
          formatNumber(movement.newStock),
          getText(movement.reference),
        ]

        if (index % 2 === 0) {
          doc.rect(left, y, contentWidth, rowHeight).fill('#fafafa')
        }

        doc
          .moveTo(left, y + rowHeight)
          .lineTo(right, y + rowHeight)
          .strokeColor(colors.border)
          .lineWidth(0.4)
          .stroke()

        let x = left + 4

        columns.forEach((column, columnIndex) => {
          doc
            .font('Helvetica')
            .fontSize(6.2)
            .fillColor(colors.dark)
            .text(values[columnIndex], x, y + 8, {
              width: column.width - 5,
              height: rowHeight - 8,
              align: column.align,
              lineBreak: false,
              ellipsis: true,
            })

          x += column.width
        })

        y += rowHeight
      })

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

module.exports = generateStockMovementReportPDF
