import type { NextApiRequest, NextApiResponse } from 'next'
import { MongoClient, ServerApiVersion } from 'mongodb'
import { SignJWT } from 'jose'
import cookie from 'cookie'
import { UAParser } from 'ua-parser-js'
import { promises as fs } from 'fs'
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
const filepath = path.join(process.cwd(), 'public/emails.hbs');
const emailTemplateSource = await fs.readFile(filepath, 'utf8');

// Create a Handlebars template
const template = handlebars.compile(emailTemplateSource);

const generateRandomToken = (length: number) => {
    return crypto.randomBytes(length).toString('hex');
};

let client: MongoClient;

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }
  const { query } = req.query;

  if (!query) {
    return res.status(400).json({ error: 'Query parameter is required' });
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
    const users = await collection.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { username: { $regex: query, $options: 'i' } }
      ]
    }).toArray();

    if (!users) {
      return res.status(401).json({ error: 'Invalid username or email' });
    }

    const attributesToRemove = ["password", "password_reset_time", "loginToken"];

    const newUsers = users.map(obj => {
        let newObj = { ...obj };
        attributesToRemove.forEach(attr => delete newObj[attr]);
        return newObj;
    });

    res.status(200).json(newUsers);
  } catch (error) {
    console.error('An error occurred:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}