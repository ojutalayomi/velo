"use server";
import { MongoDBClient } from "@/lib/mongodb";
import { confirmationEmail } from "@/lib/email";
import { SignJWT } from "jose";

export async function generateCode(data: { email: string }) {
  const { email } = data;

  try {
    const db = await new MongoDBClient().init();

    const user = await db.users().findOne({ email });

    if (user) {
      if (user.isEmailConfirmed) {
        return { message: "Email already confirmed" };
      }
      // Same 1-hour JWT as /api/signup so the link expires
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      const confirmationToken = await new SignJWT({ _id: user.userId })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("1h")
        .sign(secret);

      // Store the confirmation token in the database
      await db.users().updateOne({ email }, { $set: { confirmationToken } });

      // Must match the route at app/accounts/confirm-email/[token]
      const base = (process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
      const confirmationLink = `${base}/accounts/confirm-email/${confirmationToken}`;

      // Send the confirmation link through email
      await confirmationEmail(email, user.firstname, user.lastname, confirmationLink);
      return { message: "Confirmation link sent" };
    }
    return { message: "User not found" };
  } catch (error) {
    console.error(error);
    return { message: "An error occurred" };
  }
}
