const emailLayout = ({ preheader = '', title = 'Welcome to MineERP', subtitle = 'Smart Business Management', content = '', footerNote = 'This is an automated email from MineERP.' }) => {
  const safePreheader = preheader || title

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />

  <title>${title}</title>

  <style>
    body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      background-color: #f5f3ff;
      font-family: Arial, Helvetica, sans-serif;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }

    table {
      border-spacing: 0;
      border-collapse: collapse;
    }

    img {
      border: 0;
      display: block;
      max-width: 100%;
      height: auto;
    }

    a {
      text-decoration: none;
    }

    .email-wrapper {
      width: 100%;
      background-color: #f5f3ff;
    }

    .email-card {
      width: 100%;
      max-width: 600px;
      background-color: #ffffff;
      border: 1px solid #e9e5f5;
      border-radius: 18px;
      overflow: hidden;
    }

    .email-header {
      padding: 30px 32px;
      background-color: #6d28d9;
      background-image: linear-gradient(135deg, #7c3aed, #5b21b6);
    }

    .email-content {
      padding: 28px 32px 36px;
      color: #334155;
      font-size: 15px;
      line-height: 25px;
      overflow-wrap: anywhere;
      word-break: break-word;
    }

    .email-title {
      margin: 0;
      font-size: 26px;
      line-height: 34px;
      font-weight: 700;
      letter-spacing: -0.6px;
      color: #111827;
    }

    .email-footer {
      padding: 24px 32px;
      background-color: #faf9ff;
      border-top: 1px solid #eeeaf7;
    }

    .button {
      display: inline-block;
      padding: 13px 24px;
      background-color: #6d28d9;
      color: #ffffff !important;
      border-radius: 9px;
      font-size: 14px;
      line-height: 20px;
      font-weight: 700;
      text-align: center;
    }

    .muted {
      color: #64748b;
    }

    @media screen and (max-width: 600px) {
      .outer-padding {
        padding: 12px 8px !important;
      }

      .email-card {
        width: 100% !important;
        border-radius: 12px !important;
      }

      .email-header {
        padding: 24px 20px !important;
      }

      .email-content {
        padding: 24px 20px 28px !important;
        font-size: 15px !important;
        line-height: 25px !important;
      }

      .email-title {
        font-size: 23px !important;
        line-height: 31px !important;
      }

      .email-footer {
        padding: 20px !important;
      }

      .mobile-full-button {
        display: block !important;
        text-align: center !important;
      }

      .mobile-full-button a {
        display: block !important;
      }
    }
  </style>
</head>

<body>
  <!-- Hidden preheader -->
  <div style="
    display:none;
    font-size:1px;
    line-height:1px;
    max-height:0;
    max-width:0;
    opacity:0;
    overflow:hidden;
    color:#f5f3ff;
    mso-hide:all;
  ">
    ${safePreheader}
    &#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;
  </div>

  <table
    role="presentation"
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    class="email-wrapper"
    style="width:100%;background-color:#f5f3ff;"
  >
    <tr>
      <td
        align="center"
        class="outer-padding"
        style="padding:32px 16px;"
      >

        <!-- Main email card -->
        <table
          role="presentation"
          width="600"
          cellpadding="0"
          cellspacing="0"
          border="0"
          class="email-card"
          style="
            width:100%;
            max-width:600px;
            background-color:#ffffff;
            border:1px solid #e9e5f5;
            border-radius:18px;
            overflow:hidden;
          "
        >

          <!-- Brand header -->
          <tr>
            <td
              class="email-header"
              style="
                padding:30px 32px;
                background-color:#6d28d9;
                background-image:linear-gradient(135deg,#7c3aed,#5b21b6);
              "
            >
              <table
                role="presentation"
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
              >
                <tr>
                  <td align="left">
                    <div style="
                      font-size:26px;
                      line-height:32px;
                      font-weight:800;
                      letter-spacing:-0.7px;
                      color:#ffffff;
                    ">
                      Mine<span style="color:#ddd6fe;">ERP</span>
                    </div>

                    <div style="
                      margin-top:7px;
                      font-size:12px;
                      line-height:19px;
                      letter-spacing:1.2px;
                      text-transform:uppercase;
                      color:#ede9fe;
                    ">
                      ${subtitle}
                    </div>
                  </td>

                  <td
                    align="right"
                    valign="middle"
                    style="padding-left:10px;"
                  >
                    <div style="
                      display:inline-block;
                      padding:7px 10px;
                      border:1px solid #a78bfa;
                      border-radius:20px;
                      color:#ffffff;
                      font-size:10px;
                      line-height:14px;
                      font-weight:700;
                      letter-spacing:0.5px;
                      white-space:nowrap;
                    ">
                      BUSINESS SUITE
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Heading -->
          <tr>
            <td style="padding:32px 32px 0;" class="email-content">
              <h1 class="email-title" style="
                margin:0;
                font-size:26px;
                line-height:34px;
                font-weight:700;
                color:#111827;
              ">
                ${title}
              </h1>

              <div style="
                width:48px;
                height:4px;
                margin-top:16px;
                background-color:#8b5cf6;
                border-radius:4px;
                font-size:0;
                line-height:0;
              ">
                &nbsp;
              </div>
            </td>
          </tr>

          <!-- Dynamic content -->
          <tr>
            <td
              class="email-content"
              style="
                padding:20px 32px 36px;
                font-size:15px;
                line-height:25px;
                color:#334155;
                overflow-wrap:anywhere;
                word-break:break-word;
              "
            >
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td
              class="email-footer"
              style="
                padding:24px 32px;
                background-color:#faf9ff;
                border-top:1px solid #eeeaf7;
              "
            >
              <div style="
                margin-bottom:8px;
                font-size:14px;
                line-height:22px;
                font-weight:700;
                color:#4c1d95;
              ">
                MineERP
              </div>

              <p style="
                margin:0 0 12px;
                font-size:12px;
                line-height:20px;
                color:#64748b;
              ">
                ${footerNote}
              </p>

              <div style="
                font-size:11px;
                line-height:18px;
                color:#94a3b8;
              ">
                Business Management Platform
              </div>
            </td>
          </tr>

        </table>

        <!-- Outside footer -->
        <table
          role="presentation"
          width="600"
          cellpadding="0"
          cellspacing="0"
          border="0"
          style="width:100%;max-width:600px;"
        >
          <tr>
            <td
              align="center"
              style="
                padding:20px 12px 0;
                font-size:11px;
                line-height:19px;
                color:#94a3b8;
              "
            >
              This email was sent by MineERP.
              <br />
              Please do not reply unless a response is requested.
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`
}

module.exports = emailLayout
