import { NextResponse } from "next/server";

import { resolveIceServers } from "@/lib/call/iceServers";
import { getAuthenticatedUserId } from "@/lib/statusServer";

/**
 * ICE servers for WebRTC calls: STUN, plus a TURN relay from the provider chosen by env
 * (see `.env.example`). Credentials are only handed to signed-in users and never reach the
 * client bundle.
 */
export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { iceServers } = await resolveIceServers(process.env, userId, {
    onError: (error) => console.error("[api/call/ice] TURN provider failed, using STUN only:", error),
  });

  return NextResponse.json({ iceServers }, { headers: { "Cache-Control": "private, no-store" } });
}
