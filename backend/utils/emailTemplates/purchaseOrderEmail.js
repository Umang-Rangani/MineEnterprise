
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

const formatCurrency = (amount, currency = 'INR') => {
  const value = Number(amount)

  if (!Number.isFinite(value)) return '—'

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value)
}

const purchaseOrderEmail = ({
  supplierName,
  companyName,
  purchaseNumber,
  purchaseDate,
  expectedDeliveryDate,
  currency = 'INR',
  items = [],
  subtotal,
  taxAmount,
  totalAmount,
  notes,
}) => {
  const safe = escapeHtml

  const itemRows = items
    .map((item, index) => {
      const quantity = Number(item.quantity) || 0
      const unitPrice = Number(item.unitPrice) || 0
      const lineTotal = Number.isFinite(Number(item.total))
        ? Number(item.total)
        : quantity * unitPrice

      return `
        <tr>
          <td style="padding:12px 8px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#334155;">
            ${index + 1}
          </td>
          <td style="padding:12px 8px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#334155;">
            ${safe(item.productName || item.name || 'Product')}
            ${
              item.sku
                ? `<div style="font-size:11px;color:#64748b;margin-top:4px;">SKU: ${safe(item.sku)}</div>`
                : ''
            }
          </td>
          <td style="padding:12px 8px;border-bottom:1px solid #e2e8f0;text-align:right;font-size:13px;color:#334155;">
            ${quantity}
          </td>
          <td style="padding:12px 8px;border-bottom:1px solid #e2e8f0;text-align:right;font-size:13px;color:#334155;">
            ${safe(formatCurrency(unitPrice, currency))}
          </td>
          <td style="padding:12px 8px;border-bottom:1px solid #e2e8f0;text-align:right;font-size:13px;font-weight:600;color:#334155;">
            ${safe(formatCurrency(lineTotal, currency))}
          </td>
        </tr>
      `
    })
    .join('')

  const content = `
    <p style="margin:0 0 16px;">Hello ${safe(supplierName || 'Supplier')},</p>

    <p style="margin:0 0 20px;">
      ${safe(companyName || 'Our company')} has issued the following purchase order.
      Please review the details below and refer to the attached purchase order document.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
      style="margin-bottom:24px;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;">
      <tr>
        <td style="padding:14px;">
          <div style="font-size:12px;color:#6d28d9;margin-bottom:5px;">PURCHASE ORDER</div>
          <div style="font-size:20px;line-height:28px;font-weight:700;color:#4c1d95;overflow-wrap:anywhere;">
            ${safe(purchaseNumber || 'Pending')}
          </div>
          <div style="font-size:13px;color:#475569;margin-top:6px;">
            Status: Ordered
          </div>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
      style="margin-bottom:24px;">
      <tr>
        <td width="50%" valign="top" style="padding:8px 6px 8px 0;">
          <div style="font-size:12px;color:#64748b;">Purchase Date</div>
          <div style="font-size:14px;color:#0f172a;font-weight:600;margin-top:5px;">
            ${safe(purchaseDate || '—')}
          </div>
        </td>
        <td width="50%" valign="top" style="padding:8px 0 8px 6px;">
          <div style="font-size:12px;color:#64748b;">Expected Delivery</div>
          <div style="font-size:14px;color:#0f172a;font-weight:600;margin-top:5px;">
            ${safe(expectedDeliveryDate || 'Not specified')}
          </div>
        </td>
      </tr>
    </table>

    <h2 style="font-size:16px;line-height:24px;color:#0f172a;margin:0 0 12px;">
      Order Items
    </h2>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
      style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <thead>
        <tr style="background:#f8fafc;">
          <th align="left" style="padding:10px 8px;font-size:11px;color:#64748b;border-bottom:1px solid #cbd5e1;">#</th>
          <th align="left" style="padding:10px 8px;font-size:11px;color:#64748b;border-bottom:1px solid #cbd5e1;">Product</th>
          <th align="right" style="padding:10px 8px;font-size:11px;color:#64748b;border-bottom:1px solid #cbd5e1;">Qty</th>
          <th align="right" style="padding:10px 8px;font-size:11px;color:#64748b;border-bottom:1px solid #cbd5e1;">Unit Price</th>
          <th align="right" style="padding:10px 8px;font-size:11px;color:#64748b;border-bottom:1px solid #cbd5e1;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${
          itemRows ||
          `<tr><td colspan="5" style="padding:16px 8px;text-align:center;color:#64748b;font-size:13px;">Please refer to the attached document for item details.</td></tr>`
        }
      </tbody>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
      style="margin-bottom:24px;">
      ${
        subtotal !== undefined
          ? `<tr>
              <td align="right" style="padding:5px;font-size:13px;color:#64748b;">Subtotal</td>
              <td align="right" style="padding:5px;font-size:13px;color:#334155;">${safe(formatCurrency(subtotal, currency))}</td>
            </tr>`
          : ''
      }
      ${
        taxAmount !== undefined
          ? `<tr>
              <td align="right" style="padding:5px;font-size:13px;color:#64748b;">Tax</td>
              <td align="right" style="padding:5px;font-size:13px;color:#334155;">${safe(formatCurrency(taxAmount, currency))}</td>
            </tr>`
          : ''
      }
      <tr>
        <td align="right" style="padding:12px 5px 5px;font-size:15px;font-weight:700;color:#0f172a;border-top:1px solid #e2e8f0;">
          Total
        </td>
        <td align="right" style="padding:12px 5px 5px;font-size:16px;font-weight:700;color:#6d28d9;border-top:1px solid #e2e8f0;">
          ${safe(formatCurrency(totalAmount, currency))}
        </td>
      </tr>
    </table>

    ${
      notes
        ? `<div style="padding:14px;background:#f8fafc;border-radius:8px;margin-bottom:24px;">
            <div style="font-size:13px;font-weight:700;color:#334155;margin-bottom:6px;">Additional Notes</div>
            <div style="font-size:13px;line-height:21px;color:#475569;white-space:pre-wrap;">${safe(notes)}</div>
          </div>`
        : ''
    }

    <p style="margin:0 0 12px;">
      Please confirm receipt of this purchase order and contact us if you have any questions.
    </p>

    <p style="margin:0;">
      Regards,<br />
      <strong>${safe(companyName || 'MineERP Company')}</strong>
    </p>
  `

  return emailLayout({
    preheader: `Purchase order ${purchaseNumber || ''} from ${companyName || 'MineERP'}`,
    title: 'Purchase Order',
    subtitle: 'Official purchase order notification',
    content,
    footerNote: 'This email contains purchase order information. Please retain it for your records.',
  })
}

module.exports = purchaseOrderEmail
