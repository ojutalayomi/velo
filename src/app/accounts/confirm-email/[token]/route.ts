import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { MongoDBClient } from "@/lib/mongodb";
import { sendConfirmationEmail } from "@/lib/email";
import { headers } from "next/headers";
import { setCookie } from "@/lib/auth";
import { SocialMediaUser, UserSchema } from "@/lib/class/User";

export async function GET(request: Request) {
  const token = request.url.split("/").pop()?.split("?")[0];
  const headersList = headers();
  const protocol = (await headersList).get("x-forwarded-proto");
  const host = (await headersList).get("host");
  const BaseUrl = `${protocol}://${host}/`;

  if (!token) {
    return NextResponse.redirect(BaseUrl + "accounts/confirm-email/failed?message=Invalid token");
  }

  try {
    // Reject expired or tampered tokens (jwtVerify checks signature and `exp`)
    try {
      await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET));
    } catch {
      return NextResponse.redirect(
        BaseUrl + "accounts/confirm-email/failed?message=Link expired or invalid. Request a new one."
      );
    }

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

    // The emailed link proves ownership of the address, so start the session now.
    // The token was just unset above, which makes the link single-use.
    const userAgent = (await headersList).get("user-agent") || "";
    await new SocialMediaUser(user as unknown as UserSchema).setSession(
      db,
      userAgent,
      "app",
      undefined,
      setCookie
    );

    await sendConfirmationEmail(user.email, user.firstname, user.lastname, user.username);
    return NextResponse.redirect(BaseUrl + "accounts/confirm-email/success");
  } catch (error) {
    return NextResponse.redirect(
      BaseUrl + "accounts/confirm-email/failed?message=Internal server error"
    );
  }
}
