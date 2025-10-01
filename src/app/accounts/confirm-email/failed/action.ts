"use server";
import { MongoDBClient } from "@/lib/mongodb";
import { confirmationEmail } from "@/lib/email";
import { v4 as uuidv4 } from "uuid";

export async function generateCode(data: { email: string }) {
  const { email } = data;

  try {
    // Generate a new confirmation code
    const confirmationToken = uuidv4();

    const db = await new MongoDBClient().init();

    const user = await db.users().findOne({ email });

    if (user) {
      if (user.isEmailConfirmed) {
        return { message: "Email already confirmed" };
      }
      // Store the confirmation code in the database
      await db.users().updateOne({ email }, { $set: { confirmationToken } });

      // Generate the confirmation link
      const confirmationLink = `${process.env.NEXT_PUBLIC_BASE_URL}/confirm-email?code=${confirmationToken}`;

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
