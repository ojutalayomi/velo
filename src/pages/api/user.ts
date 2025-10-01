import type { NextApiRequest, NextApiResponse } from "next";
import { SignJWT } from "jose";
import { serialize } from "cookie";
import { UAParser } from "ua-parser-js";
import { promises as fs } from "fs";
import { fileURLToPath } from "url";
import path, { dirname } from "path";
import bcrypt from "bcrypt";
import crypto from "crypto";
import handlebars from "handlebars";
import nodemailer from "nodemailer";
import { timeFormatter } from "@/templates/PostProps";
import { UserData } from "@/lib/types/type";
import { MongoDBClient } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Read the HTML email template file
const filepath = path.join(process.cwd(), "public/emails.hbs");
const emailTemplateSource = await fs.readFile(filepath, "utf8");

// Create a Handlebars template
const template = handlebars.compile(emailTemplateSource);

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { UsernameOrEmail, password } = req.body;

  if (!password) {
    return res.status(400).json({ error: "Password is required" });
  }

  try {
    const db = await new MongoDBClient().init();

    const collection = db.users();
    const tokenCollection = db.tokens();
    const user = await collection.findOne({
      $or: [{ username: UsernameOrEmail }, { email: UsernameOrEmail }],
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid username or email" });
    }

    if (!user.isEmailConfirmed) {
      return res.status(401).json({ error: "Email not confirmed" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password as string);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid password" });
    }

    // const following = (await db.followers().find({ followerId: user._id.toString() }).toArray()).length;

    const {
      name,
      firstname,
      lastname,
      email,
      username,
      displayPicture,
      verified,
      userId,
      followers,
      following,
    } = user;

    const time = new Date().toLocaleString();
    const formattedDate = timeFormatter(time);

    await collection.updateOne({ email }, { $set: { lastLogin: formattedDate } });

    const newUserdata = {
      _id: user._id,
      name,
      firstname,
      lastname,
      email,
      username,
      dp: displayPicture,
      verified,
      userId,
      followers,
      following,
    } as unknown as UserData;

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const token = await new SignJWT({ _id: user._id })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("15d")
      .sign(secret);

    // Extract device information
    const parser = new UAParser(req.headers["user-agent"]);
    const deviceInfo = parser.getResult();

    await tokenCollection.insertOne({
      _id: new ObjectId(),
      userId: user._id.toString(),
      token,
      deviceInfo,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    });

    res.setHeader(
      "Set-Cookie",
      serialize("velo_12", token, {
        httpOnly: true,
        secure: true,
        sameSite: process.env.NODE_ENV !== "development" ? "strict" : "none",
        maxAge: 3600 * 24 * 15,
        path: "/",
        // domain: process.env.NODE_ENV !== 'development' ? 'example.com' : undefined,
      })
    );

    await sendSignInEmail(email, firstname, lastname, time);

    res.status(200).json(newUserdata);
  } catch (error) {
    console.error("An error occurred:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

const sendSignInEmail = async (
  email: string,
  firstname: string,
  lastname: string,
  time: string
) => {
  // send mail with defined transport object
  let info = await transporter.sendMail({
    from: '"Noow App" noreply@ayocodex.site', // sender address
    to: email, // list of receivers
    subject: "Sign-in Successful", // Subject line
    html: template({
      subject: "Sign-in Successful",
      heading: "You have successfully signed in to Noow App!",
      message: `I hope you enjoy your time on our app. You signed in at ${time}.`,
      firstname: firstname,
      lastname: lastname,
      display: "none",
      imageAlt: "Success Image",
      imageSrc: "https://ojutalayomi.github.io/feetbook/FeetBook/public/images/icon-success.png",
    }),
  });

  // console.log('Message sent: %s', info.messageId);
};
