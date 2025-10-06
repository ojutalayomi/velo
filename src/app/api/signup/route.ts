/* eslint-disable import/order */
import bcrypt from "bcrypt";
import { SignJWT } from "jose";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import validator from "validator";

import { confirmationEmail } from "@/lib/email";
import { MongoDBClient } from "@/lib/mongodb";

import { ObjectId } from "mongodb";

import { SocialMediaUser } from "@/lib/class/User";
import { AccountType } from "@/lib/types/user";
import { setCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const headersList = headers();
    const protocol = (await headersList).get("x-forwarded-proto");
    const host = (await headersList).get("host");
    const BaseUrl = `${protocol}://${host}/`;

    const body = await request.json();
    const userAgent = (await headers()).get("user-agent") || "";
    const time = new Date().toISOString();
    const { firstname, lastname, email, username, password, displayPicture } = body;
    const userId = uuidv4();
    const saltRounds = 10;
    const db = await new MongoDBClient().init();

    if (!validator.isEmail(email)) {
      // console.log(`Received an invalid email: ${email}`);
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    // Generate a confirmation token
    const confirmationToken = await new SignJWT({ _id: userId })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(secret);

    // Check if the username or email already exists in the collection
    const result = await db.users().findOne({ $or: [{ username }, { email }] });

    // If a matching document is found
    if (result) {
      if (
        result &&
        result.isEmailConfirmed &&
        result.username === username &&
        result.email === email
      ) {
        // Email is confirmed, prevent account creation

        return NextResponse.json({ error: "Email is already confirmed." }, { status: 403 });
      }

      // Check if the account has exceeded the sign-up limit
      const signUpLimitPerAccount = 5;
      if (result.signUpCount && result.signUpCount >= signUpLimitPerAccount) {
        // Return an error response indicating that sign-ups are not allowed for this account

        return NextResponse.json(
          { error: "Sign-ups are not allowed for this account." },
          { status: 409 }
        );
      }

      if (!result.isEmailConfirmed) {
        const updateFields = {
          firstname,
          lastname,
          name: `${firstname} ${lastname}`,
          password: hashedPassword,
          displayPicture,
          isEmailConfirmed: false, // Set to false to trigger email confirmation
          confirmationToken,
        };

        // Only update the fields that need to be changed
        await db.users().updateOne(
          { email }, // Filter to find the existing document
          { $set: updateFields, $inc: { signUpCount: 1 } }, // Increment signUpCount
          { upsert: false }
        );

        await confirmationEmail(
          email,
          firstname,
          lastname,
          BaseUrl + "accounts/confirm-email/" + confirmationToken
        );
        return NextResponse.json({ message: "Confirmation email sent." }, { status: 200 });
      } else {
        let error = {};
        if (result.username === username) error = "Username is already in use";

        if (result.email === email) error = "Email is already in use";

        if (result.username === username && result.email === email)
          error = "Both Email and Username are in use";
        // console.log(error);

        return NextResponse.json({ error }, { status: 409 });
      }
    } else {
      const user = new SocialMediaUser({
        _id: new ObjectId(),
        time,
        userId,
        firstname,
        lastname,
        name: `${firstname} ${lastname}`,
        email,
        username,
        password: hashedPassword,
        displayPicture,
        isEmailConfirmed: false,
        confirmationToken,
        signUpCount: 1,
        verified: false,
        followers: 0,
        following: 0,
        lastUpdate: [],
        bio: "",
        coverPhoto: "",
        dob: "",
        location: "",
        noOfUpdates: 0,
        website: "",
        providers: {},
        accountType: AccountType.HUMAN,
      });
      // Insert the new user data into the collection
      await user.storeInDB(db);

      await user.createPersonalChatForUser(db);
      await user.setSession(db, userAgent, "app", undefined, setCookie);

      await confirmationEmail(
        email,
        firstname,
        lastname,
        BaseUrl + "accounts/confirm-email/" + confirmationToken
      );
      return NextResponse.json(user.getClientSafeData(), { status: 200 });
    }
  } catch (error) {
    console.error("An error occurred:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
