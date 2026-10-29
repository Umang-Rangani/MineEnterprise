const emailLayout = require('./emailLayout')

const escapeHtml = (value = '') =>
  String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }

    return entities[character]
  })

const purchaseCancellationEmail = ({ supplierName, companyName, purchaseNumber, purchaseDate, cancellationDate, cancellationReason, currency = 'INR', totalAmount }) => {
  const safe = escapeHtml

  const hasTotal = totalAmount !== undefined && totalAmount !== null && String(totalAmount).trim() !== '' && Number.isFinite(Number(totalAmount))

  const formattedTotal = hasTotal
    ? new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
      }).format(Number(totalAmount))
    : null

  const orderNumber = safe(purchaseNumber || 'Purchase Order')
  const safeCompany = safe(companyName || 'our company')

  const content = `
    <!-- Greeting -->
    <p style="
      margin:0 0 12px;
      font-size:15px;
      line-height:24px;
      color:#334155;
    ">
      Hello <strong>${safe(supplierName || 'Supplier')}</strong>,
    </p>

    <p style="
      margin:0 0 24px;
      font-size:14px;
      line-height:24px;
      color:#64748b;
    ">
      This email is to inform you that a purchase order issued by
      <strong style="color:#334155;">${safeCompany}</strong>
      has been cancelled. Please review the details below and update
      your records accordingly.
    </p>

    <!-- Cancellation Status Card -->
    <table
      role="presentation"
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
      style="
        width:100%;
        margin:0 0 28px;
        background-color:#fff7f7;
        border:1px solid #fecaca;
        border-radius:12px;
      "
    >
      <tr>
        <td style="padding:22px 20px;">

          <table
            role="presentation"
            cellpadding="0"
            cellspacing="0"
            border="0"
            style="margin:0 0 16px;"
          >
            <tr>
              <td
                valign="middle"
                style="
                  width:34px;
                  height:34px;
                  background-color:#fee2e2;
                  border-radius:9px;
                  text-align:center;
                  font-size:19px;
                  line-height:34px;
                  color:#b91c1c;
                "
              >
                !
              </td>

              <td
                valign="middle"
                style="
                  padding-left:10px;
                  font-size:12px;
                  line-height:18px;
                  font-weight:700;
                  letter-spacing:0.8px;
                  color:#b91c1c;
                "
              >
                PURCHASE ORDER CANCELLED
              </td>
            </tr>
          </table>

          <div style="
            margin:0 0 8px;
            font-size:23px;
            line-height:31px;
            font-weight:700;
            letter-spacing:-0.4px;
            color:#7f1d1d;
            overflow-wrap:anywhere;
            word-break:break-word;
          ">
            ${orderNumber}
          </div>

          <p style="
            margin:0 0 16px;
            font-size:13px;
            line-height:21px;
            color:#991b1b;
          ">
            This purchase order is no longer active.
          </p>

          <table
            role="presentation"
            cellpadding="0"
            cellspacing="0"
            border="0"
          >
            <tr>
              <td
                style="
                  padding:7px 12px;
                  background-color:#fee2e2;
                  border-radius:20px;
                  font-size:12px;
                  line-height:17px;
                  font-weight:700;
                  color:#b91c1c;
                "
              >
                CANCELLED
              </td>
            </tr>
          </table>

        </td>
      </tr>
    </table>

    <!-- Section Heading -->
    <table
      role="presentation"
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
      style="margin:0 0 14px;"
    >
      <tr>
        <td>
          <div style="
            font-size:18px;
            line-height:26px;
            font-weight:700;
            color:#111827;
          ">
            Purchase Details
          </div>

          <div style="
            margin-top:4px;
            font-size:12px;
            line-height:19px;
            color:#94a3b8;
          ">
            Summary of the cancelled order
          </div>
        </td>
      </tr>
    </table>

    <!-- Details Card -->
    <table
      role="presentation"
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
      style="
        width:100%;
        margin:0 0 24px;
        border:1px solid #e5e7eb;
        border-radius:12px;
      "
    >
      <!-- Purchase Number -->
      <tr>
        <td style="
          padding:15px 16px;
          border-bottom:1px solid #f1f5f9;
          font-size:13px;
          line-height:20px;
          color:#64748b;
        ">
          Purchase Order Number
        </td>

        <td
          align="right"
          style="
            padding:15px 16px;
            border-bottom:1px solid #f1f5f9;
            font-size:13px;
            line-height:20px;
            font-weight:700;
            color:#334155;
            overflow-wrap:anywhere;
            word-break:break-word;
          "
        >
          ${safe(purchaseNumber || '—')}
        </td>
      </tr>

      <!-- Purchase Date -->
      <tr>
        <td style="
          padding:15px 16px;
          border-bottom:1px solid #f1f5f9;
          font-size:13px;
          line-height:20px;
          color:#64748b;
        ">
          Purchase Date
        </td>

        <td
          align="right"
          style="
            padding:15px 16px;
            border-bottom:1px solid #f1f5f9;
            font-size:13px;
            line-height:20px;
            color:#334155;
          "
        >
          ${safe(purchaseDate || '—')}
        </td>
      </tr>

      <!-- Cancellation Date -->
      <tr>
        <td style="
          padding:15px 16px;
          ${hasTotal ? 'border-bottom:1px solid #f1f5f9;' : ''}
          font-size:13px;
          line-height:20px;
          color:#64748b;
        ">
          Cancellation Date
        </td>

        <td
          align="right"
          style="
            padding:15px 16px;
            ${hasTotal ? 'border-bottom:1px solid #f1f5f9;' : ''}
            font-size:13px;
            line-height:20px;
            color:#334155;
          "
        >
          ${safe(cancellationDate || '—')}
        </td>
      </tr>

      ${
        hasTotal
          ? `
            <!-- Total Amount -->
            <tr>
              <td style="
                padding:17px 16px;
                background-color:#faf9ff;
                border-radius:0 0 0 12px;
                font-size:13px;
                line-height:20px;
                font-weight:700;
                color:#475569;
              ">
                Order Total
              </td>

              <td
                align="right"
                style="
                  padding:17px 16px;
                  background-color:#faf9ff;
                  border-radius:0 0 12px 0;
                  font-size:17px;
                  line-height:24px;
                  font-weight:700;
                  color:#6d28d9;
                  overflow-wrap:anywhere;
                "
              >
                ${safe(formattedTotal)}
              </td>
            </tr>
          `
          : ''
      }

    </table>

    ${
      cancellationReason
        ? `
          <!-- Cancellation Reason -->
          <table
            role="presentation"
            width="100%"
            cellpadding="0"
            cellspacing="0"
            border="0"
            style="
              width:100%;
              margin:0 0 26px;
              background-color:#f8fafc;
              border:1px solid #e2e8f0;
              border-radius:12px;
            "
          >
            <tr>
              <td style="padding:18px;">

                <div style="
                  margin:0 0 8px;
                  font-size:14px;
                  line-height:21px;
                  font-weight:700;
                  color:#334155;
                ">
                  Cancellation Reason
                </div>

                <div style="
                  font-size:13px;
                  line-height:22px;
                  color:#64748b;
                  white-space:pre-wrap;
                  overflow-wrap:anywhere;
                  word-break:break-word;
                ">${safe(cancellationReason)}</div>

              </td>
            </tr>
          </table>
        `
        : ''
    }

    <!-- Important Notice -->
    <table
      role="presentation"
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
      style="
        width:100%;
        margin:0 0 24px;
        background-color:#fffbeb;
        border:1px solid #fde68a;
        border-radius:10px;
      "
    >
      <tr>
        <td style="padding:16px;">

          <div style="
            margin:0 0 6px;
            font-size:13px;
            line-height:20px;
            font-weight:700;
            color:#92400e;
          ">
            Important Notice
          </div>

          <div style="
            font-size:13px;
            line-height:22px;
            color:#92400e;
            overflow-wrap:anywhere;
          ">
            Please do not process or fulfil this purchase order.
            If the goods have already been dispatched, please contact
            us to coordinate the next steps.
          </div>

        </td>
      </tr>
    </table>

    <!-- Closing Message -->
    <p style="
      margin:0 0 18px;
      font-size:14px;
      line-height:24px;
      color:#64748b;
    ">
      We apologize for any inconvenience this cancellation may cause
      and appreciate your understanding and cooperation.
    </p>

    <p style="
      margin:0;
      font-size:14px;
      line-height:24px;
      color:#334155;
    ">
      Regards,<br />
      <strong style="color:#111827;">
        ${safe(companyName || 'MineERP Company')}
      </strong>
    </p>
  `

  return emailLayout({
    preheader: `Purchase order ${purchaseNumber || ''} has been cancelled.`,
    title: 'Purchase Order Cancellation',
    subtitle: 'Purchase Management • Order Notification',
    content,
    footerNote: 'This email confirms the cancellation of the purchase order identified above. Please retain it for your records.',
  })
}

module.exports = purchaseCancellationEmail
