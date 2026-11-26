import crypto from "crypto";
import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const FONT = "'Avenir Next','Segoe UI',Helvetica,Arial,sans-serif";

export interface EmailTemplateOptions {
  /** Used as the document title. */
  subject?: string;
  imageAlt?: string;
  /** Extra inline CSS for the hero image, e.g. `width: 300px;`. */
  style?: string;
  imageSrc?: string;
  firstname?: string;
  lastname?: string;
  heading?: string;
  message?: string;
  message1?: string;
  /** "none" hides the button; any other value shows it. */
  display?: string;
  link?: string;
  /** The button label. */
  Click?: string;
}

/**
 * The one email layout the app uses. Plain string building, so nothing needs a template engine at
 * build time. Most mail clients ignore `<style>`, so every rule that matters is also inlined; the
 * `<style>` block only adds dark mode and the small-screen layout. All values are HTML-escaped.
 */
export function generateEmailHtml({
  subject = "",
  imageAlt = "",
  style = "",
  imageSrc = "",
  firstname = "",
  lastname = "",
  heading = "",
  message = "",
  message1 = "",
  display = "none",
  link = "",
  Click = "",
}: EmailTemplateOptions) {
  const showButton = Boolean(display) && display !== "none";
  const name = `${firstname} ${lastname}`.trim();

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <title>${escapeHtml(subject || "Velo")}</title>
    <!--[if mso]>
      <noscript>
        <xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
      </noscript>
    <![endif]-->
    <style>
      body { margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
      table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
      img { border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
      a { text-decoration: none; }

      @media only screen and (max-width: 620px) {
        .container { width: 100% !important; }
        .px { padding-left: 24px !important; padding-right: 24px !important; }
        .title { font-size: 26px !important; line-height: 32px !important; }
        .btn a { display: block !important; }
      }

      @media (prefers-color-scheme: dark) {
        .page-bg { background-color: #14152a !important; }
        .card { background-color: #1e2040 !important; }
        .hero-panel { background-color: #272a52 !important; }
        .title { color: #f1f2fb !important; }
        .body-text { color: #c3c6e4 !important; }
        .muted { color: #8f93b8 !important; }
        .btn-cell { background-color: #8a90ff !important; }
        .btn-link { color: #14152a !important; }
        .footer-link { color: #b4b8ee !important; }
      }
    </style>
  </head>
  <body class="page-bg" style="margin:0; padding:0; background-color:#f3f4fa;">
    <!-- Preheader: the preview line shown next to the subject in inboxes -->
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; mso-hide:all; font-size:1px; line-height:1px; color:#f3f4fa;">
      ${escapeHtml(heading)}
      &#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;
    </div>

    <table role="presentation" class="page-bg" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f3f4fa;">
      <tr>
        <td align="center" style="padding:32px 16px;">

          <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px;">

            <!-- Wordmark -->
            <tr>
              <td class="px" style="padding:0 8px 20px 8px; font-family:${FONT}; font-size:22px; font-weight:800; letter-spacing:-0.02em; color:#242742;">
                <span class="title" style="color:#242742;">Velo</span>
              </td>
            </tr>

            <!-- Card -->
            <tr>
              <td class="card" style="background-color:#ffffff; border-radius:16px; overflow:hidden;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${
  imageSrc
    ? `
                  <!-- Image panel -->
                  <tr>
                    <td class="hero-panel" align="center" style="background-color:#e9ebf8; padding:36px 24px;">
                      <img
                        alt="${escapeAttribute(imageAlt)}"
                        src="${escapeAttribute(imageSrc)}"
                        style="display:block; margin:0 auto; max-width:100%; height:auto; border:0; ${escapeAttribute(style)}"
                      />
                    </td>
                  </tr>
`
    : ""
}
                  <!-- Content -->
                  <tr>
                    <td class="px" style="padding:40px 48px 8px 48px; font-family:${FONT};">
                      <p class="muted" style="margin:0 0 12px 0; font-size:15px; line-height:22px; color:#5e627f;">
                        Hi ${escapeHtml(name)},
                      </p>${
                        heading
                          ? `
                      <h1 class="title" style="margin:0 0 20px 0; font-size:30px; line-height:36px; font-weight:700; letter-spacing:-0.02em; color:#242742;">
                        ${escapeHtml(heading)}
                      </h1>`
                          : ""
                      }${
                        message
                          ? `
                      <p class="body-text" style="margin:0 0 16px 0; font-size:16px; line-height:26px; color:#3f4260;">
                        ${escapeHtml(message)}
                      </p>`
                          : ""
                      }${
                        message1
                          ? `
                      <p class="body-text" style="margin:0 0 16px 0; font-size:16px; line-height:26px; color:#3f4260; white-space:pre-line;">
                        ${escapeHtml(message1)}
                      </p>`
                          : ""
                      }
                    </td>
                  </tr>
${
  showButton
    ? `
                  <!-- Button -->
                  <tr>
                    <td class="px" style="padding:12px 48px 48px 48px;">
                      <table role="presentation" class="btn" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td class="btn-cell" align="center" bgcolor="#242742" style="background-color:#242742; border-radius:10px;">
                            <a
                              class="btn-link"
                              href="${escapeAttribute(link)}"
                              target="_blank"
                              style="display:inline-block; padding:14px 28px; font-family:${FONT}; font-size:16px; font-weight:600; line-height:20px; color:#ffffff; text-decoration:none; border-radius:10px;"
                            >${escapeHtml(Click)}</a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
`
    : `
                  <tr><td style="height:40px; line-height:40px; font-size:1px;">&nbsp;</td></tr>
`
}
                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td class="px" align="center" style="padding:24px 8px 0 8px; font-family:${FONT}; font-size:13px; line-height:20px; color:#6b6f8d;">
                <span class="muted" style="color:#6b6f8d;">Coded by</span>
                <a class="footer-link" href="https://x.com/ojutalayomi" style="color:#242742; text-decoration:underline;">Ayomide Ojutalayo</a>.
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(str: string) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(str: string) {
  return escapeHtml(str);
}

const generateRandomToken = (length: number) => {
  return crypto.randomBytes(length).toString("hex");
};

export const confirmationEmail = async (
  email: string,
  firstname: string,
  lastname: string,
  confirmationLink: string
) => {
  const html = generateEmailHtml({
    subject: "Email Confirmation",
    heading: "Confirm Your Email Address",
    message: "Please confirm your email address by clicking the button below.",
    firstname,
    lastname,
    display: "block",
    imageAlt: "Confirmation Image",
    imageSrc: "https://velo-virid.vercel.app/velo11.png",
    link: confirmationLink,
    Click: "Confirm Email",
  });

  const info = await transporter.sendMail({
    from: "Velo <no-reply@velo.com>",
    to: email,
    subject: "Email Confirmation",
    html,
  });

  // console.log('Message sent: %s', info.messageId);
};

export async function sendConfirmationEmail(
  email: string,
  firstname: string,
  lastname: string,
  username: string
) {
  const html = generateEmailHtml({
    subject: "Account Creation Confirmation",
    message: "Thank you for creating an account with us.",
    message1: `Dear ${firstname} ${lastname},\n\nThank you for creating an account with us. Your username is ${username}.\n We're excited to have you on board.`,
    firstname,
    lastname,
    display: "none",
    imageAlt: "Success Image",
    style: "width: 300px;",
    imageSrc: "https://ojutalayomi.github.io/feetbook/FeetBook/public/images/congrats.png",
  });

  transporter.sendMail(
    {
      from: '"Velo <no-reply@velo.com>',
      to: email,
      subject: "Account Creation Confirmation",
      html,
    },
    function (error, info) {
      if (error) {
        // console.log(error);
      } else {
        // console.log('Email sent: ' + info.response);
      }
    }
  );
}
