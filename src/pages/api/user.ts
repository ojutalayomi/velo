import { promises as fs } from "fs";
import path from "path";

import bcrypt from "bcrypt";
import handlebars from "handlebars";
import type { NextApiRequest, NextApiResponse } from "next";
import nodemailer from "nodemailer";

import { SocialMediaUser } from "@/lib/class/User";
import { MongoDBClient } from "@/lib/mongodb";
import { timeFormatter } from "@/templates/PostProps";

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
    const user = new SocialMediaUser(
      (await collection.findOne({
        $or: [{ username: UsernameOrEmail }, { email: UsernameOrEmail }],
      })) as SocialMediaUser
    );
    
    if (user.isUserNull()) {
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

    const time = new Date().toLocaleString();
    const formattedDate = timeFormatter(time);

    await collection.updateOne({ email: user.email }, { $set: { lastLogin: formattedDate } });

    await user.setSession(db, req.headers["user-agent"], "page", res);

    await sendSignInEmail(user.email, user.firstname, user.lastname, time);

    res.status(200).json(user.getClientSafeData());
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
  const info = await transporter.sendMail({
    from: '"Noow App" noreply@ayocodex.site', // sender address
    to: email, // list of receivers
    subject: "Sign-in Successful", // Subject line
    html: template({
      subject: "Sign-in Successful",
      heading: "You have successfully signed in to Noow App!",
      message: `I hope you enjoy your time on our app. You signed in at ${time}.`,
      firstname,
      lastname,
      display: "none",
      imageAlt: "Success Image",
      imageSrc: "https://ojutalayomi.github.io/feetbook/FeetBook/public/images/icon-success.png",
    }),
  });

  console.log("Message sent: %s", info.messageId);
};
