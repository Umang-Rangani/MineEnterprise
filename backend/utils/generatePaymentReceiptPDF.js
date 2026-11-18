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

const generatePaymentReceiptPDF = (payment, company) => {
  return new Promise((resolve, reject) => {
    try {
      if (!payment || !company) {
        return reject(new Error('Payment and company details are required.'))
      }

      const customer = payment.customerId || {}
      const invoice = payment.invoiceId || {}

      const currency = company.currency || 'INR'

      const originalAmount = Number(payment.amount || 0)
      const refundedAmount = Number(payment.refundedAmount || 0)
      const netReceivedAmount = Math.max(0, originalAmount - refundedAmount)

      const refundHistory = Array.isArray(payment.refundHistory) ? payment.refundHistory : []

      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: 40,
          bottom: 45,
          left: 40,
          right: 40,
        },
        info: {
          Title: `Payment Receipt ${payment.paymentNumber}`,
          Author: company.companyName || 'MineERP',
          Subject: 'Customer Payment Receipt',
          Creator: 'MineERP',
        },
      })

      const chunks = []

      doc.on('data', (chunk) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      const pageWidth = doc.page.width
      const pageHeight = doc.page.height
      const left = 40
      const right = pageWidth - 40
      const contentWidth = right - left

      const colors = {
        primary: '#6d28d9',
        dark: '#1e293b',
        muted: '#64748b',
        light: '#f1f5f9',
        border: '#e2e8f0',
        white: '#ffffff',
        green: '#15803d',
        red: '#dc2626',
        paleGreen: '#f0fdf4',
        paleRed: '#fef2f2',
      }

      const companyAddress = [company.addressLine1, company.addressLine2, company.city, company.state, company.country, company.postalCode].filter(Boolean).join(', ')

      const customerAddress = [customer.billingAddress, customer.city, customer.state, customer.pincode, customer.country].filter(Boolean).join(', ')

      const drawLabelValue = (label, value, x, y, width = 245) => {
        doc.font('Helvetica-Bold').fontSize(8).fillColor(colors.muted).text(label, x, y, {
          width: 95,
        })

        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor(colors.dark)
          .text(getText(value), x + 100, y, {
            width: width - 100,
          })
      }

      const drawSectionTitle = (title, x, y) => {
        doc.font('Helvetica-Bold').fontSize(10).fillColor(colors.primary).text(title, x, y)
      }

      // HEADER
      doc.roundedRect(left, 40, contentWidth, 112, 8).fill(colors.light)

      doc.font('Helvetica-Bold').fontSize(20).fillColor(colors.primary).text(getText(company.companyName, 'Company'), 55, 54, { width: 290 })

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(colors.dark)
        .text(companyAddress || '-', 55, 83, {
          width: 290,
        })

      doc
        .fontSize(8)
        .fillColor(colors.muted)
        .text(`Email: ${getText(company.companyEmail)}`, 55, 112)

      doc.text(`Phone: ${getText(company.companyPhone)}`, 55, 125)

      doc
        .font('Helvetica-Bold')
        .fontSize(19)
        .fillColor(colors.dark)
        .text('PAYMENT', right - 145, 57, {
          width: 130,
          align: 'right',
        })

      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor(colors.primary)
        .text('RECEIPT', right - 145, 82, {
          width: 130,
          align: 'right',
        })

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(colors.muted)
        .text(getText(payment.paymentNumber), right - 145, 108, {
          width: 130,
          align: 'right',
        })

      // COMPANY DETAILS
      let y = 170

      drawLabelValue('Company GSTIN', company.gstNumber, left, y)
      drawLabelValue('Company PAN', company.panNumber, 310, y)

      // CUSTOMER DETAILS
      y = 205

      drawSectionTitle('RECEIVED FROM', left, y)
      drawSectionTitle('RECEIPT DETAILS', 310, y)

      y += 22

      doc.font('Helvetica-Bold').fontSize(10).fillColor(colors.dark).text(getText(customer.customerName), left, y, {
        width: 235,
      })

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(colors.dark)
        .text([`Code: ${getText(customer.customerCode)}`, `Email: ${getText(customer.email)}`, `Phone: ${getText(customer.phone)}`, `GSTIN: ${getText(customer.gstNumber)}`, customerAddress].filter(Boolean).join('\n'), left, y + 18, {
          width: 235,
          lineGap: 3,
        })

      drawLabelValue('Receipt Number', payment.paymentNumber, 310, y)

      drawLabelValue('Payment Date', formatDate(payment.paymentDate), 310, y + 19)

      drawLabelValue('Payment Mode', payment.paymentMode, 310, y + 38)

      drawLabelValue('Payment Status', payment.status, 310, y + 57)

      drawLabelValue('Transaction Ref.', payment.transactionReference, 310, y + 76)

      // INVOICE DETAILS
      y = 325

      doc.roundedRect(left, y, contentWidth, 82, 6).fill(colors.light)

      drawSectionTitle('INVOICE DETAILS', left + 14, y + 12)

      drawLabelValue('Invoice Number', invoice.invoiceNumber, left + 14, y + 35)

      drawLabelValue('Invoice Date', formatDate(invoice.invoiceDate), 310, y + 35)

      drawLabelValue('Invoice Total', formatAmount(invoice.grandTotal, currency), left + 14, y + 56)

      drawLabelValue('Current Balance', formatAmount(invoice.balanceAmount, currency), 310, y + 56)

      // PAYMENT SUMMARY
      y = 435

      drawSectionTitle('PAYMENT SUMMARY', left, y)

      y += 22

      const summaryRows = [
        {
          label: 'Original Payment Amount',
          value: originalAmount,
          color: colors.dark,
        },
        {
          label: 'Refunded Amount',
          value: refundedAmount,
          color: colors.red,
        },
      ]

      summaryRows.forEach((item) => {
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor(colors.dark)
          .text(item.label, left + 8, y, {
            width: 250,
          })

        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor(item.color)
          .text(formatAmount(item.value, currency), right - 155, y, {
            width: 145,
            align: 'right',
          })

        y += 23
      })

      doc.moveTo(left, y).lineTo(right, y).strokeColor(colors.border).lineWidth(0.8).stroke()

      y += 12

      doc.roundedRect(left, y, contentWidth, 48, 6).fill(colors.paleGreen)

      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor(colors.dark)
        .text('Net Amount Received', left + 12, y + 17)

      doc
        .font('Helvetica-Bold')
        .fontSize(13)
        .fillColor(colors.green)
        .text(formatAmount(netReceivedAmount, currency), right - 190, y + 15, {
          width: 175,
          align: 'right',
        })

      y += 68

      // REFUND HISTORY
      if (refundHistory.length > 0) {
        const requiredHeight = 35 + refundHistory.length * 35

        if (y + requiredHeight > pageHeight - 95) {
          doc.addPage()
          y = 45
        }

        drawSectionTitle('REFUND HISTORY', left, y)

        y += 20

        const columns = [
          { label: 'Date', width: 95, align: 'left' },
          { label: 'Amount', width: 105, align: 'right' },
          { label: 'Reason', width: 255, align: 'left' },
        ]

        doc.roundedRect(left, y, contentWidth, 23, 4).fill(colors.primary)

        let x = left + 6

        columns.forEach((column) => {
          doc
            .font('Helvetica-Bold')
            .fontSize(8)
            .fillColor(colors.white)
            .text(column.label, x, y + 7, {
              width: column.width,
              align: column.align,
              lineBreak: false,
            })

          x += column.width
        })

        y += 23

        refundHistory.forEach((refund, index) => {
          const reason = getText(refund.reason)

          const reasonHeight = doc
            .font('Helvetica')
            .fontSize(8)
            .heightOfString(reason, {
              width: columns[2].width - 8,
            })

          const rowHeight = Math.max(28, reasonHeight + 10)

          if (y + rowHeight > pageHeight - 85) {
            doc.addPage()
            y = 45

            doc.roundedRect(left, y, contentWidth, 23, 4).fill(colors.primary)

            let headerX = left + 6

            columns.forEach((column) => {
              doc
                .font('Helvetica-Bold')
                .fontSize(8)
                .fillColor(colors.white)
                .text(column.label, headerX, y + 7, {
                  width: column.width,
                  align: column.align,
                  lineBreak: false,
                })

              headerX += column.width
            })

            y += 23
          }

          if (index % 2 === 0) {
            doc.rect(left, y, contentWidth, rowHeight).fill('#fafafa')
          }

          const values = [formatDate(refund.refundDate), formatAmount(refund.amount, currency), reason]

          let rowX = left + 6

          columns.forEach((column, columnIndex) => {
            doc
              .font('Helvetica')
              .fontSize(8)
              .fillColor(colors.dark)
              .text(values[columnIndex], rowX, y + 8, {
                width: column.width,
                height: rowHeight - 10,
                align: column.align,
              })

            rowX += column.width
          })

          y += rowHeight
        })

        y += 20
      }

      // NOTES
      if (payment.notes) {
        const notesHeight = doc.font('Helvetica').fontSize(8).heightOfString(payment.notes, {
          width: contentWidth,
          lineGap: 3,
        })

        if (y + notesHeight + 35 > pageHeight - 90) {
          doc.addPage()
          y = 45
        }

        doc.font('Helvetica-Bold').fontSize(9).fillColor(colors.dark).text('Notes', left, y)

        y += 15

        doc.font('Helvetica').fontSize(8).fillColor(colors.muted).text(payment.notes, left, y, {
          width: contentWidth,
          lineGap: 3,
        })
      }

      // FOOTER
      const pageRange = doc.bufferedPageRange()

      for (let pageIndex = pageRange.start; pageIndex < pageRange.start + pageRange.count; pageIndex++) {
        doc.switchToPage(pageIndex)

        const footerLineY = pageHeight - 65
        const footerTextY = pageHeight - 52

        doc.moveTo(left, footerLineY).lineTo(right, footerLineY).strokeColor(colors.border).stroke()

        doc.font('Helvetica').fontSize(8).fillColor(colors.muted).text('This is a computer-generated payment receipt.', left, footerTextY, {
          width: contentWidth,
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

module.exports = generatePaymentReceiptPDF
