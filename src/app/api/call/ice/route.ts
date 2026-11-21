import { NextResponse } from "next/server";

import { resolveIceServers } from "@/lib/call/iceServers";
import { createRateLimiter } from "@/lib/rateLimit";
import { getAuthenticatedUserId } from "@/lib/statusServer";

// Clients cache the result for 5 minutes, so 20 requests a minute is generous.
const limiter = createRateLimiter(20, 60_000);

/**
 * ICE servers for WebRTC calls: STUN, plus a TURN relay from the provider chosen by env
 * (see `.env.example`). Credentials are only handed to signed-in users and never reach the
 * client bundle.
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

  const { iceServers } = await resolveIceServers(process.env, userId, {
    onError: (error) => console.error("[api/call/ice] TURN provider failed, using STUN only:", error),
  });

  return NextResponse.json({ iceServers }, { headers: { "Cache-Control": "private, no-store" } });
}
