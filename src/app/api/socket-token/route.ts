import { SignJWT } from "jose";
import { NextResponse } from "next/server";

import { createRateLimiter } from "@/lib/rateLimit";
import { getAuthenticatedUserId } from "@/lib/statusServer";

/** How long a socket token lives; clients ask for a new one before it runs out. */
export const SOCKET_TOKEN_TTL_SECONDS = 60 * 60;

const limiter = createRateLimiter(30, 60_000);

/**
 * A short-lived token proving who the signed-in user is to the socket server, which cannot read
 * the session cookie (it is HttpOnly and belongs to this site). Signed with SOCKET_AUTH_SECRET,
 * which the socket server shares.
 */
export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const limit = limiter(userId);
  if (!limit.allowed) {
    return NextResponse.json(
      { message: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const secret = process.env.SOCKET_AUTH_SECRET;
  if (!secret) {
    // Not configured: clients carry on without a token (the socket server decides if that is allowed).
    return NextResponse.json({ token: null }, { headers: { "Cache-Control": "private, no-store" } });
  }

  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setAudience("velo-socket")
    .setIssuedAt()
    .setExpirationTime(`${SOCKET_TOKEN_TTL_SECONDS}s`)
    .sign(new TextEncoder().encode(secret));

  return NextResponse.json(
    { token, expiresIn: SOCKET_TOKEN_TTL_SECONDS },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
