import crypto from "crypto";
import handlebars from "handlebars";
import { promises as fs } from "fs";
import nodemailer from "nodemailer";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
})

// Read the HTML email template file 
const filepath = path.join(process.cwd(), 'public/emails.hbs')
const emailTemplateSource = await fs.readFile(filepath, 'utf8')
// Create a Handlebars template

export const template = handlebars.compile(emailTemplateSource)

const generateRandomToken = (length: number) => {
  return crypto.randomBytes(length).toString('hex')
}

export const confirmationEmail = async (email: string, firstname: string, lastname: string, confirmationLink: string) => {

    // send mail with defined transport object
    let info = await transporter.sendMail({
        from: 'Velo <no-reply@velo.com>', // sender address
        to: email, // list of receivers
        subject: 'Email Confirmation', // Subject line
        html: template({
            subject: 'Email Confirmation',
            heading: 'Confirm Your Email Address',
            message: `Please confirm your email address by clicking the link below.`,
            firstname: firstname,
            lastname: lastname,
            display: 'block',
            imageAlt: 'Confirmation Image',
            imageSrc: 'https://ojutalayomi.github.io/feetbook/velo/public/velo11.png',
            confirmationLink: confirmationLink
        }),
    })

    console.log('Message sent: %s', info.messageId)
};

export async function sendConfirmationEmail(email: string, firstname: string, lastname: string, username: string) {
  
    const mailOptions = {
      from: '"Velo <no-reply@velo.com>',
      to: email,
      subject: 'Account Creation Confirmation',
      html: template({
            subject: 'Account Creation Confirmation',
            message: `Thank you for creating an account with us.`,
            message1: `Dear ${firstname} ${lastname},\n\nThank you for creating an account with us. Your username is ${username}.\n We're excited to have you on board.`,
            firstname: firstname,
            lastname: lastname,
            display: 'none',
            imageAlt: 'Success Image',
            style: 'width: 300px;',
            imageSrc: 'https://ojutalayomi.github.io/feetbook/FeetBook/public/images/congrats.png'
        })
    };
  
    transporter.sendMail(mailOptions, function(error, info){
      if (error) {
        console.log(error);
      } else {
        console.log('Email sent: ' + info.response);
      }
    });
  
}