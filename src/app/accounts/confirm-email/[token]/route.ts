import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { MongoDBClient } from "@/lib/mongodb";
import { sendConfirmationEmail } from "@/lib/email";
import { headers } from "next/headers";

export async function GET(request: Request) {
  const token = request.url.split("/").pop();
  const headersList = headers();
  const protocol = (await headersList).get("x-forwarded-proto");
  const host = (await headersList).get("host");
  const BaseUrl = `${protocol}://${host}/`;

  if (!token) {
    return NextResponse.redirect(BaseUrl + "accounts/confirm-email/failed?message=Invalid token");
  }

  try {
    // Connect to the database
    const db = await new MongoDBClient().init();
    const users = db.users();

    // Find the user with the confirmationToken
    const user = await users.findOne({ confirmationToken: token });

    if (!user) {
      return NextResponse.redirect(
        BaseUrl + "accounts/confirm-email/failed?message=User not found"
      );
    }

    // Confirm the email
    await users.updateOne(
      { _id: user._id },
      { $set: { isEmailConfirmed: true }, $unset: { confirmationToken: "" } }
    );

    await sendConfirmationEmail(user.email, user.firstname, user.lastname, user.username);
    return NextResponse.redirect(BaseUrl + "accounts/confirm-email/success");
  } catch (error) {
    return NextResponse.redirect(
      BaseUrl + "accounts/confirm-email/failed?message=Internal server error"
    );
  }
}
