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
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true
  },
  connectTimeoutMS: 60000,
  maxPoolSize: 10
});

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
const emailTemplateSource = fs.readFileSync(path.join(__dirname, '../../templates/emails.hbs'), 'utf8');

// Create a Handlebars template
const template = handlebars.compile(emailTemplateSource);

const generateRandomToken = (length: number) => {
    return crypto.randomBytes(length).toString('hex');
};

export default async function handle(req: NextApiRequest, res: NextApiResponse){
    if(req.method === 'POST'){

      const { UsernameOrEmail, password } = req.body;
      // console.log(req.body);
      if (!password) return res.status(400).json({ error: 'Password is required' });
      await client.connect();
      await client.db("admin").command({ ping: 1 });
      console.log("Mongoconnection. You successfully connected to MongoDB!");
      const collection = client.db('mydb').collection('Users');
      const user = await collection.findOne({ $or: [ { username: UsernameOrEmail }, { email: UsernameOrEmail } ] });

      if (!user) return res.status(401).json({ error: 'Invalid username or email' });
      const { firstname, lastname, email, username } = user;

      const randomToken = generateRandomToken(10);
      // console.log(randomToken,' is the token')
      const time = new Date().toLocaleString();
      const formattedDate = timeFormatter(time);
      const expirationTime = new Date();
      expirationTime.setDate(expirationTime.getDate() + 1);


      // Check if the user's email is confirmed
      if (!user.isEmailConfirmed) return res.status(401).json({ error: 'Email not confirmed' });

      // Compare the provided password with the hashed password from the database
      const passwordMatch = await bcrypt.compare(password, user.password);
      // If passwordMatch is false, it means the password does not match
      if (!passwordMatch) return res.status(401).json({ error: 'Invalid password' });
      
      // Successful sign-in
      await sendSignInEmail(email,firstname,lastname,time);

      await collection.updateOne(
        { email: email },
        { $set: { lastLogin: formattedDate, 
            loginToken: randomToken, } }
      );

      const newUserdata = {
          firstname: user.firstname,
          lastname: user.lastname,
          email: user.email,
          username: user.username,
          dp: user.displayPicture,
          verified: user.verified
      };

      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      const token = await new SignJWT(newUserdata)
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('1d')
        .sign(secret);
      // console.log(user);

      res.setHeader('Set-Cookie', cookie.serialize('velo_12', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development',
        sameSite: 'strict',
        maxAge: 3600 * 24,
        path: '/',
      }));

      res.status(200).json(newUserdata);
        
    } else {
        res.status(405).json({ message: 'Method Not Allowed' });
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