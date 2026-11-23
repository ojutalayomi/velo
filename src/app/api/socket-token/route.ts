import { NextResponse } from "next/server";

import { createRateLimiter } from "@/lib/rateLimit";
import { SOCKET_TOKEN_TTL_SECONDS, signSocketToken } from "@/lib/socketTokenServer";
import { getAuthenticatedUserId } from "@/lib/statusServer";

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

  const token = await signSocketToken(userId);
  if (!token) {
    // Not configured: clients carry on without a token (the socket server decides if that is allowed).
    return NextResponse.json({ token: null }, { headers: { "Cache-Control": "private, no-store" } });
  }

  return NextResponse.json(
    { token, expiresIn: SOCKET_TOKEN_TTL_SECONDS },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
