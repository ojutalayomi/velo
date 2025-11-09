import { jwtVerify } from "jose";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { setCookie } from "@/lib/auth";
import { SocialMediaUser, UserSchema } from "@/lib/class/User";
import { MongoDBClient } from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // Verify the token
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    if (!payload || typeof payload !== "object") {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    const { email, provider, providerId, backTo } = payload as {
      email?: string;
      provider?: string;
      providerId?: string;
      backTo?: string;
    };

    if (!email || !provider || !providerId) {
      return NextResponse.json({ error: "Invalid token payload" }, { status: 400 });
    }

    return NextResponse.json({
      provider,
      email,
      backTo: backTo || "/home",
    });
  } catch (error: any) {
    console.error("Provider consent verification error:", error);
    if (error.code === "ERR_JWT_EXPIRED") {
      return NextResponse.json({ error: "Token has expired" }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // Verify the token
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    if (!payload || typeof payload !== "object") {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    const { email, provider, providerId, backTo } = payload as {
      email?: string;
      provider?: string;
      providerId?: string;
      backTo?: string;
    };

    if (!email || !provider || !providerId) {
      return NextResponse.json({ error: "Invalid token payload" }, { status: 400 });
    }

    // Update the user's provider field
    const db = await new MongoDBClient().init();
    const users = db.users();

    const user = await users.findOne({ email });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const existingUser = new SocialMediaUser(user as UserSchema);

    // Update providers field
    const currentProviders = existingUser.providers || {};
    await users.updateOne(
      { email },
      {
        $set: {
          lastLogin: new Date().toISOString(),
          providers: {
            ...currentProviders,
            [provider]: {
              id: providerId,
              lastUsed: new Date().toISOString(),
            },
          },
        },
      }
    );

    // Create session for the user
    const userAgent = (await headers()).get("user-agent") || "";
    await existingUser.setSession(db, userAgent, "app", undefined, setCookie);

    return NextResponse.json({
      success: true,
      redirectTo: backTo || "/home",
    });
  } catch (error: any) {
    console.error("Provider consent update error:", error);
    if (error.code === "ERR_JWT_EXPIRED") {
      return NextResponse.json({ error: "Token has expired" }, { status: 400 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to update provider" },
      { status: 500 }
    );
  }
}

