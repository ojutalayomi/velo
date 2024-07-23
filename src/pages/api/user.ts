import type { NextApiRequest, NextApiResponse } from 'next'
import { MongoClient, ServerApiVersion } from 'mongodb'
import { SignJWT } from 'jose'
import cookie from 'cookie'
import fs from 'fs'
import { fileURLToPath } from 'url'
import path, { dirname } from 'path'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import handlebars from 'handlebars'
import nodemailer from 'nodemailer'
import { timeFormatter } from '@/templates/PostProps'


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const uri = process.env.MONGOLINK ? process.env.MONGOLINK : '';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Read the HTML email template file
const emailTemplateSource = path.join(process.cwd(), 'public/emails.hbs');

// Create a Handlebars template
const template = handlebars.compile(emailTemplateSource);

const generateRandomToken = (length: number) => {
    return crypto.randomBytes(length).toString('hex');
};

let client: MongoClient;

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { UsernameOrEmail, password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  try {
    if (!client) {
      client = new MongoClient(uri, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true
        },
        connectTimeoutMS: 60000,
        maxPoolSize: 10
      });
      await client.connect();
    }

    const collection = client.db('mydb').collection('Users');
    const user = await collection.findOne({ $or: [{ username: UsernameOrEmail }, { email: UsernameOrEmail }] });

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or email' });
    }

    if (!user.isEmailConfirmed) {
      return res.status(401).json({ error: 'Email not confirmed' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    const { firstname, lastname, email, username, displayPicture, verified } = user;

    const randomToken = generateRandomToken(10);
    const time = new Date().toLocaleString();
    const formattedDate = timeFormatter(time);

    await sendSignInEmail(email, firstname, lastname, time);

    await collection.updateOne(
      { email },
      { $set: { lastLogin: formattedDate, loginToken: randomToken } }
    );

    const newUserdata = { firstname, lastname, email, username, dp: displayPicture, verified };

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const token = await new SignJWT(newUserdata)
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1d')
      .sign(secret);

    res.setHeader('Set-Cookie', cookie.serialize('velo_12', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      sameSite: 'strict',
      maxAge: 3600 * 24,
      path: '/',
    }));

    res.status(200).json(newUserdata);
  } catch (error) {
    console.error('An error occurred:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

const sendSignInEmail = async(email: string, firstname: string,lastname: string, time: string) => {

  // send mail with defined transport object
  let info = await transporter.sendMail({
      from: '"Noow App" noreply@ayocodex.site', // sender address
      to: email, // list of receivers
      subject: 'Sign-in Successful', // Subject line
      html: template({
      subject: 'Sign-in Successful',
      heading: 'You have successfully signed in to Noow App!',
      message: `I hope you enjoy your time on our app. You signed in at ${time}.`,
      firstname: firstname,
      lastname: lastname,
      display: 'none',
      imageAlt: 'Success Image',
      imageSrc: 'https://ojutalayomi.github.io/feetbook/FeetBook/public/images/icon-success.png'
      }),
  });

  console.log('Message sent: %s', info.messageId);
}