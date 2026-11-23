import { Ratelimit } from "@upstash/ratelimit";
import { kv } from "@vercel/kv";
import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(3, "30 s"),
});

/** Page routes that require a registered (signed-in) user. */
const PROTECTED_PREFIXES = [
  "/home",
  "/chats",
  "/bookmarks",
  "/notifications",
  "/compose",
  "/account",
  "/admin",
  "/feedback",
];

export const config = {
  matcher: [
    "/api/getuser",
    "/home/:path*",
    "/chats/:path*",
    "/bookmarks/:path*",
    "/notifications/:path*",
    "/compose/:path*",
    "/account/:path*",
    "/admin/:path*",
    "/feedback/:path*",
  ],
};

async function hasValidSession(request: NextRequest): Promise<boolean> {
  const raw = request.cookies.get("velo_12")?.value;
  if (!raw || !process.env.JWT_SECRET) return false;
  const token = decodeURIComponent(raw).replace(/"/g, "");
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return typeof payload._id === "string" && !!payload._id;
  } catch {
    return false;
  }
}

export default async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    if (await hasValidSession(request)) return NextResponse.next();
    const loginUrl = new URL("/accounts/login", request.url);
    loginUrl.searchParams.set("backto", pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",").shift()?.trim() ||
    request.nextUrl.hostname ||
    "127.0.0.1";

  const hasKV = !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN;

  try {
    if (process.env.NODE_ENV === "production" && hasKV) {
      const { success } = await ratelimit.limit(ip);
      if (!success) {
        return NextResponse.json(
          { role: "assistant", content: "too many requests" },
          { status: 429 }
        );
      }
    }
    // If KV isn’t configured, allow the request (optional: add local in-memory limiter here)
    return NextResponse.next();
  } catch (error) {
    console.error("Ratelimit error:", error);
    // Don’t block app traffic if the ratelimit infra is unreachable
    return NextResponse.next();
  }
}
