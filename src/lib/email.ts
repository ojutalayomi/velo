import crypto from "crypto";
import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Minimal HTML generator to avoid using handlebars at build time
// Matches the structure of public/emails.hbs
function generateEmailHtml({
  subject = '',
  imageAlt = '',
  style = '',
  imageSrc = '',
  firstname = '',
  lastname = '',
  heading = '',
  message = '',
  message1 = '',
  display = 'none',
  link = '',
  Click = '',
}: {
  subject?: string;
  imageAlt?: string;
  style?: string;
  imageSrc?: string;
  firstname?: string;
  lastname?: string;
  heading?: string;
  message?: string;
  message1?: string;
  display?: string; // 'block' | 'none'
  link?: string;
  Click?: string;
}) {
  const showActions = display && display !== 'none';
  const showMessage1 = Boolean(message);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(subject)}</title>
  <style>
    body { background: white; color: #242742; font-family: Arial, sans-serif; margin: 0; padding: 0; }
    .button { display: inline-block; padding: 10px 20px; background-color: #ff6257; color: #fff; text-decoration: none; border-radius: 5px; }
    .success-message { margin: 0 auto; max-width: 600px; padding: 20px; background-color: #fff; border-radius: 10px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); }
    .success-message img { display: block; margin: 0 auto; width: auto; }
    .success-message-content { text-align: center; margin-top: 30px; display: flex; flex-direction: column; align-items: center; }
    .success-message-content h1 { font-size: 32px; margin: 10px 0; }
    .success-message-content h2 { font-size: 24px; margin: 10px 0; }
    .success-message-content h4 { font-size: 16px; margin: 10px 0; }
    .attribution { text-align: center; margin-top: 20px; color: #666; }
    .attribution a:hover{ text-decoration: underline; }
  </style>
</head>
<body>
  <div class="success-message">
    ${imageSrc ? `<img alt="${escapeHtml(imageAlt)}" style="${escapeHtml(style)}" src="${escapeHtml(imageSrc)}">` : ''}
    <div class="success-message-content" style="flex-direction: column;">
      <h1>Dear ${escapeHtml(firstname)} ${escapeHtml(lastname)},</h1>
      ${heading ? `<h2>${escapeHtml(heading)}</h2>` : ''}
      ${message ? `<h4>${escapeHtml(message)}</h4>` : ''}
      ${showMessage1 ? `<h4>${escapeHtml(message1)}</h4>` : ''}
      ${showActions ? `
        <a href="${escapeAttribute(link)}" style="display: ${escapeAttribute(display)};" class="button">${escapeHtml(Click)}</a>
        <p style="display: ${escapeAttribute(display)};">Or</p>
        <p style="display: ${escapeAttribute(display)};">Click the link below to continue to the next step:</p>
        <a href="${escapeAttribute(link)}" style="display: ${escapeAttribute(display)};" class="button">${escapeHtml(link)}</a>
      ` : ''}
    </div>
  </div>
  <div class="attribution">
    Coded by <a style="text-decoration: none;" href="https://x.com/ojutalayomi">Ayomide Ojutalayo</a>.
  </div>
</body>
</html>`;
}

function escapeHtml(str: string) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttribute(str: string) {
  // Attributes need quotes-escaped at minimum
  return String(str).replace(/"/g, '&quot;');
}

const generateRandomToken = (length: number) => {
  return crypto.randomBytes(length).toString('hex');
};

export const confirmationEmail = async (
  email: string,
  firstname: string,
  lastname: string,
  confirmationLink: string
) => {
  const html = generateEmailHtml({
    subject: 'Email Confirmation',
    heading: 'Confirm Your Email Address',
    message: 'Please confirm your email address by clicking the button below.',
    firstname,
    lastname,
    display: 'block',
    imageAlt: 'Confirmation Image',
    imageSrc: 'https://velo-virid.vercel.app/velo11.png',
    link: confirmationLink,
    Click: 'Confirm Email',
  });

  const info = await transporter.sendMail({
    from: 'Velo <no-reply@velo.com>',
    to: email,
    subject: 'Email Confirmation',
    html,
  });

  console.log('Message sent: %s', info.messageId);
};

export async function sendConfirmationEmail(
  email: string,
  firstname: string,
  lastname: string,
  username: string
) {
  const html = generateEmailHtml({
    subject: 'Account Creation Confirmation',
    message: 'Thank you for creating an account with us.',
    message1: `Dear ${firstname} ${lastname},\n\nThank you for creating an account with us. Your username is ${username}.\n We're excited to have you on board.`,
    firstname,
    lastname,
    display: 'none',
    imageAlt: 'Success Image',
    style: 'width: 300px;',
    imageSrc: 'https://ojutalayomi.github.io/feetbook/FeetBook/public/images/congrats.png',
  });

  transporter.sendMail(
    {
      from: '"Velo <no-reply@velo.com>',
      to: email,
      subject: 'Account Creation Confirmation',
      html,
    },
    function (error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log('Email sent: ' + info.response);
      }
    }
  );
}