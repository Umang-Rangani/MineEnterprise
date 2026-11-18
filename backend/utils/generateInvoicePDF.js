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

  return `${currency} ${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

const getText = (value, fallback = '-') => {
  if (value === undefined || value === null || value === '') {
    return fallback
  }

  return String(value)
}

const generateInvoicePDF = (invoice, company) => {
  return new Promise((resolve, reject) => {
    try {
      if (!invoice || !company) {
        return reject(new Error('Invoice and company details are required.'))
      }

      const customer = invoice.customerId || {}
      const salesOrder = invoice.salesOrderId || {}
      const warehouse = invoice.warehouseId || {}

      const currency = company.currency || 'INR'

      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: 40,
          bottom: 45,
          left: 40,
          right: 40,
        },
        bufferPages: true,
        info: {
          Title: `Invoice ${invoice.invoiceNumber}`,
          Author: company.companyName || 'MineERP',
          Subject: 'Customer Invoice',
          Creator: 'MineERP',
        },
      })

      const chunks = []

      doc.on('data', (chunk) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      const pageWidth = doc.page.width
      const pageHeight = doc.page.height
      const contentWidth = pageWidth - 80
      const left = 40
      const right = pageWidth - 40

      const colors = {
        primary: '#6d28d9',
        dark: '#1e293b',
        muted: '#64748b',
        light: '#f1f5f9',
        border: '#e2e8f0',
        white: '#ffffff',
        green: '#15803d',
        red: '#dc2626',
      }

      const companyAddress = [company.addressLine1, company.addressLine2, company.city, company.state, company.country, company.postalCode].filter(Boolean).join(', ')

      const customerAddress = [customer.billingAddress, customer.city, customer.state, customer.pincode, customer.country].filter(Boolean).join(', ')

      const drawLabelValue = (label, value, x, y, width = 240) => {
        doc.font('Helvetica-Bold').fontSize(8).fillColor(colors.muted).text(label, x, y, { width: 85 })

        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor(colors.dark)
          .text(getText(value), x + 88, y, {
            width: width - 88,
          })
      }

      const ensureSpace = (requiredHeight, top = 40) => {
        const bottomLimit = pageHeight - 70

        // console.log('[PDF SPACE CHECK]', {
        //   docY: doc.y,
        //   manualY: y,
        //   requiredHeight,
        //   bottomLimit,
        // })

        if (doc.y + requiredHeight > bottomLimit) {
          // console.log('[PDF PAGE BREAK] ensureSpace triggered')

          doc.addPage()
          doc.y = top
        }
      }

      // HEADER
      doc.roundedRect(left, 40, contentWidth, 105, 8).fill(colors.light)

      doc.font('Helvetica-Bold').fontSize(20).fillColor(colors.primary).text(getText(company.companyName, 'Company'), 55, 54, {
        width: 300,
      })

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(colors.dark)
        .text(companyAddress || '-', 55, 82, {
          width: 285,
        })

      doc
        .fontSize(8)
        .fillColor(colors.muted)
        .text(`Email: ${getText(company.companyEmail)}`, 55, 108)

      doc.text(`Phone: ${getText(company.companyPhone)}`, 55, 121)

      doc
        .font('Helvetica-Bold')
        .fontSize(22)
        .fillColor(colors.dark)
        .text('INVOICE', right - 145, 57, {
          width: 130,
          align: 'right',
        })

      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(colors.muted)
        .text(getText(invoice.invoiceNumber), right - 145, 91, {
          width: 130,
          align: 'right',
        })

      doc.fontSize(8).text(`Status: ${getText(invoice.status)}`, right - 145, 109, {
        width: 130,
        align: 'right',
      })

      // COMPANY TAX DETAILS
      let y = 160

      drawLabelValue('Company GSTIN', company.gstNumber, left, y)
      drawLabelValue('Company PAN', company.panNumber, 310, y)

      // CUSTOMER DETAILS
      y = 190

      doc.font('Helvetica-Bold').fontSize(10).fillColor(colors.primary).text('BILL TO', left, y)

      doc.font('Helvetica-Bold').fontSize(10).fillColor(colors.primary).text('INVOICE DETAILS', 310, y)

      y += 20

      doc.font('Helvetica-Bold').fontSize(10).fillColor(colors.dark).text(getText(customer.customerName), left, y, {
        width: 230,
      })

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(colors.dark)
        .text([`Code: ${getText(customer.customerCode)}`, `Email: ${getText(customer.email)}`, `Phone: ${getText(customer.phone)}`, `GSTIN: ${getText(customer.gstNumber)}`, customerAddress].filter(Boolean).join('\n'), left, y + 17, {
          width: 235,
          lineGap: 3,
        })

      drawLabelValue('Invoice Number', invoice.invoiceNumber, 310, y)
      drawLabelValue('Invoice Date', formatDate(invoice.invoiceDate), 310, y + 18)
      drawLabelValue('Due Date', formatDate(invoice.dueDate), 310, y + 36)
      drawLabelValue('Sales Order', salesOrder.orderNumber || salesOrder.salesOrderNumber || salesOrder._id, 310, y + 54)
      drawLabelValue('Warehouse', warehouse.warehouseName || warehouse.name || warehouse._id, 310, y + 72)

      // PRODUCT TABLE
      y = 315

      const columns = [
        { label: '#', width: 25, align: 'left' },
        { label: 'Product', width: 155, align: 'left' },
        { label: 'Qty', width: 42, align: 'right' },
        { label: 'Rate', width: 65, align: 'right' },
        { label: 'Discount', width: 55, align: 'right' },
        { label: 'GST', width: 65, align: 'right' },
        { label: 'Total', width: 68, align: 'right' },
      ]

      const drawTableHeader = () => {
        doc.roundedRect(left, y, contentWidth, 25, 4).fill(colors.primary)

        let x = left + 5

        columns.forEach((column) => {
          doc
            .font('Helvetica-Bold')
            .fontSize(7)
            .fillColor(colors.white)
            .text(column.label, x, y + 8, {
              width: column.width,
              align: column.align,
              lineBreak: false,
            })

          x += column.width
        })

        y += 25
      }

      drawTableHeader()

      const items = Array.isArray(invoice.items) ? invoice.items : []

      items.forEach((item, index) => {
        const productName = getText(item.productName)

        const productHeight = doc
          .font('Helvetica')
          .fontSize(8)
          .heightOfString(productName, {
            width: columns[1].width - 8,
          })

        const rowHeight = Math.max(28, productHeight + 12)

        if (y + rowHeight > pageHeight - 70) {
          // console.log('[PDF PAGE BREAK] Product Table triggered', {
          //   y,
          //   rowHeight,
          //   pageHeight,
          // })

          doc.addPage()
          y = 40
          drawTableHeader()
        }

        if (index % 2 === 0) {
          doc.rect(left, y, contentWidth, rowHeight).fill('#fafafa')
        }

        doc
          .moveTo(left, y + rowHeight)
          .lineTo(right, y + rowHeight)
          .strokeColor(colors.border)
          .lineWidth(0.5)
          .stroke()

        const values = [
          String(index + 1),
          productName,
          Number(item.quantity || 0).toLocaleString('en-IN'),
          formatAmount(item.rate, currency),
          formatAmount(item.discount, currency),
          `${Number(item.taxRate || 0)}%`,
          formatAmount(item.lineTotal, currency),
        ]

        let x = left + 5

        columns.forEach((column, columnIndex) => {
          doc
            .font('Helvetica')
            .fontSize(7)
            .fillColor(colors.dark)
            .text(values[columnIndex], x, y + 8, {
              width: column.width,
              height: rowHeight - 10,
              align: column.align,
              lineBreak: columnIndex === 1,
            })

          x += column.width
        })

        y += rowHeight
      })

      // TOTALS
      y += 22

      const totalsX = right - 225
      const valueX = right - 105

      const drawTotal = (label, value, bold = false) => {
        ensureSpace(bold ? 23 : 19, 40)

        doc
          .font(bold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(bold ? 10 : 9)
          .fillColor(colors.dark)
          .text(label, totalsX, y, {
            width: 115,
          })

        doc
          .font(bold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(bold ? 10 : 9)
          .text(formatAmount(value, currency), valueX, y, {
            width: 105,
            align: 'right',
          })

        y += bold ? 23 : 19
      }

      drawTotal('Subtotal', invoice.subtotal)
      drawTotal('Discount', invoice.discount)
      drawTotal('Tax Amount', invoice.taxAmount)

      doc
        .moveTo(totalsX, y - 5)
        .lineTo(right, y - 5)
        .strokeColor(colors.border)
        .stroke()

      drawTotal('Grand Total', invoice.grandTotal, true)
      drawTotal('Paid Amount', invoice.paidAmount)

      ensureSpace(20, 40)

      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(Number(invoice.balanceAmount || 0) > 0 ? colors.red : colors.green)
        .text('Balance Amount', totalsX, y, {
          width: 115,
        })

      doc.font('Helvetica-Bold').fontSize(10).text(formatAmount(invoice.balanceAmount, currency), valueX, y, {
        width: 105,
        align: 'right',
      })

      y += 35

      // NOTES
      if (invoice.notes) {
        const notesHeight = doc.font('Helvetica').fontSize(8).heightOfString(invoice.notes, {
          width: contentWidth,
          lineGap: 3,
        })

        ensureSpace(notesHeight + 35, 40)

        doc.font('Helvetica-Bold').fontSize(9).fillColor(colors.dark).text('Notes', left, y)

        y += 15

        doc.font('Helvetica').fontSize(8).fillColor(colors.muted).text(invoice.notes, left, y, {
          width: contentWidth,
          lineGap: 3,
        })

        y = doc.y + 20
      }

      // FOOTER
      // Footer is drawn on the current page only.
      // Never create a new page just to draw a footer.
      // FOOTER
      const footerLineY = pageHeight - 75
      const footerTextY = pageHeight - 62

      doc.moveTo(left, footerLineY).lineTo(right, footerLineY).strokeColor(colors.border).stroke()

      doc.font('Helvetica').fontSize(8).fillColor(colors.muted).text('This is a computer-generated invoice.', left, footerTextY, {
        width: contentWidth,
        align: 'center',
        lineBreak: false,
      })

      const pageRange = doc.bufferedPageRange()

      // console.log(`[Invoice PDF] ${invoice.invoiceNumber} | Total Pages: ${pageRange.count}`)

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

module.exports = generateInvoicePDF
