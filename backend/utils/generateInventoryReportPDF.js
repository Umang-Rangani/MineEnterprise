const PDFDocument = require('pdfkit')

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

const generateInventoryReportPDF = (rows, summary, company, filters = {}) => {
  return new Promise((resolve, reject) => {
    try {
      if (!Array.isArray(rows) || !summary || !company) {
        return reject(new Error('Inventory report data and company details are required.'))
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
          Title: 'Inventory Report',
          Author: company.companyName || 'MineERP',
          Subject: 'Inventory Report',
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
        green: '#047857',
        amber: '#b45309',
      }

      const companyAddress = [company.addressLine1, company.addressLine2, company.city, company.state, company.country, company.postalCode].filter(Boolean).join(', ')

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
          .text('This is a computer-generated inventory report.', left, pageHeight - 25, {
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

      drawFooter()

      doc.on('pageAdded', () => {
        pageNumber += 1
        drawFooter()
      })

      const bottomLimit = pageHeight - 55

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
        .text(`Email: ${getText(company.companyEmail)}  |  Phone: ${getText(company.companyPhone)}`, left + 15, y + 55, { width: 420 })

      doc
        .font('Helvetica-Bold')
        .fontSize(20)
        .fillColor(colors.dark)
        .text('INVENTORY REPORT', right - 235, y + 17, {
          width: 220,
          align: 'right',
        })

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(colors.muted)
        .text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, right - 235, y + 47, {
          width: 220,
          align: 'right',
        })

      y += 90

      // REPORT FILTERS
      doc.font('Helvetica-Bold').fontSize(9).fillColor(colors.primary).text('REPORT FILTERS', left, y)

      y += 15

      const filterParts = [
        filters.search ? `Search: ${filters.search}` : null,
        filters.categoryName ? `Category: ${filters.categoryName}` : null,
        filters.warehouseName ? `Warehouse: ${filters.warehouseName}` : null,
        filters.productStatus ? `Product Status: ${filters.productStatus}` : null,
        filters.stockStatus ? `Stock Status: ${filters.stockStatus}` : null,
      ].filter(Boolean)

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(colors.muted)
        .text(filterParts.length ? filterParts.join('   |   ') : 'All inventory products', left, y, {
          width: contentWidth,
        })

      y += 25

      // SUMMARY CARDS
      const cards = [
        { label: 'Total Products', value: formatNumber(summary.productCount) },
        { label: 'Total Stock', value: formatNumber(summary.totalStock) },
        { label: 'Reserved Stock', value: formatNumber(summary.reservedStock) },
        { label: 'Available Stock', value: formatNumber(summary.availableStock) },
        { label: 'Total Stock Value', value: formatAmount(summary.totalStockValue, currency) },
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
            ellipsis: true,
          })
      })

      y += 62

      // STOCK STATUS SUMMARY
      doc.font('Helvetica-Bold').fontSize(9).fillColor(colors.primary).text('STOCK STATUS SUMMARY', left, y)

      y += 15

      const statusText = [
        `In Stock: ${formatNumber(summary.inStockCount)}`,
        `Low Stock: ${formatNumber(summary.lowStockCount)}`,
        `Out of Stock: ${formatNumber(summary.outOfStockCount)}`,
        `Average Cost: ${formatAmount(summary.averageCost, currency)}`,
      ]

      doc.font('Helvetica').fontSize(8).fillColor(colors.dark).text(statusText.join('   |   '), left, y, {
        width: contentWidth,
      })

      y += 27

      // INVENTORY TABLE
      const columns = [
        { label: 'Product', width: 112, align: 'left' },
        { label: 'SKU', width: 65, align: 'left' },
        { label: 'Category', width: 82, align: 'left' },
        { label: 'Status', width: 65, align: 'left' },
        { label: 'Current', width: 55, align: 'right' },
        { label: 'Reserved', width: 55, align: 'right' },
        { label: 'Available', width: 58, align: 'right' },
        { label: 'Avg Cost', width: 75, align: 'right' },
        { label: 'Stock Value', width: 82, align: 'right' },
        { label: 'Stock Status', width: 82, align: 'left' },
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
        const rowHeight = 29

        if (y + rowHeight > bottomLimit) {
          doc.addPage()
          y = 30
          drawTableHeader()
        }

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
          getText(row.name),
          getText(row.sku),
          getText(row.category?.name, 'Uncategorized'),
          getText(row.productStatus),
          formatNumber(row.currentStock),
          formatNumber(row.reservedStock),
          formatNumber(row.availableStock),
          formatAmount(row.averageCost, currency),
          formatAmount(row.stockValue, currency),
          getText(row.stockStatus),
        ]

        let x = left + 4

        columns.forEach((column, columnIndex) => {
          const stockStatus = columnIndex === 9 ? row.stockStatus : ''

          let textColor = colors.dark

          if (stockStatus === 'In Stock') textColor = colors.green
          if (stockStatus === 'Low Stock') textColor = colors.amber
          if (stockStatus === 'Out of Stock') textColor = colors.red

          doc
            .font('Helvetica')
            .fontSize(6.2)
            .fillColor(textColor)
            .text(values[columnIndex], x, y + 9, {
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
          .text('No inventory records found for the selected filters.', left, y + 15, {
            width: contentWidth,
            align: 'center',
          })

        y += 40
      }

      // WAREHOUSE STOCK DETAILS
      const warehouseRows = rows.filter((row) => (row.warehouseStock || []).length > 0)

      if (warehouseRows.length) {
        const detailHeight =
          17 +
          warehouseRows.reduce((total, row) => {
            return total + Math.max(1, Math.ceil((row.warehouseStock || []).length / 3)) * 16 + 8
          }, 0)

        if (y + detailHeight > bottomLimit) {
          doc.addPage()
          y = 30
        } else {
          y += 18
        }

        doc.font('Helvetica-Bold').fontSize(9).fillColor(colors.primary).text('WAREHOUSE-WISE STOCK DETAILS', left, y)

        y += 18

        warehouseRows.forEach((row) => {
          const warehouseStock = row.warehouseStock || []

          const lineCount = Math.ceil(warehouseStock.length / 3)
          const rowHeight = Math.max(1, lineCount) * 16 + 8

          if (y + rowHeight > bottomLimit) {
            doc.addPage()
            y = 30

            doc.font('Helvetica-Bold').fontSize(9).fillColor(colors.primary).text('WAREHOUSE-WISE STOCK DETAILS (CONTINUED)', left, y)

            y += 18
          }

          doc.font('Helvetica-Bold').fontSize(7).fillColor(colors.dark).text(getText(row.name), left, y, {
            width: 180,
            lineBreak: false,
            ellipsis: true,
          })

          y += 12

          warehouseStock.forEach((item, index) => {
            const columnIndex = index % 3
            const x = left + columnIndex * (contentWidth / 3)

            const warehouseName = item.warehouse?.name || item.warehouse?.code || 'Unknown Warehouse'

            doc
              .font('Helvetica')
              .fontSize(6.5)
              .fillColor(colors.muted)
              .text(`${warehouseName}: ${formatNumber(item.currentStock)} current / ${formatNumber(item.reservedStock)} reserved / ${formatNumber(item.availableStock)} available`, x, y, {
                width: contentWidth / 3 - 8,
                lineBreak: false,
                ellipsis: true,
              })

            if (columnIndex === 2 || index === warehouseStock.length - 1) {
              y += 16
            }
          })

          y += 4
        })
      }

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

module.exports = generateInventoryReportPDF
