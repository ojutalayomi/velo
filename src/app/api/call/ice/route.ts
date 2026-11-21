import { createHmac } from "node:crypto";

import { NextResponse } from "next/server";

import { getAuthenticatedUserId } from "@/lib/statusServer";

const STUN: RTCIceServer = {
  urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"],
};
const TTL_SECONDS = 6 * 60 * 60;

/**
 * ICE servers for WebRTC calls. STUN is always included. A TURN relay (needed when two people are
 * behind strict NATs or firewalls) is added from server-side env, so its credentials are only
 * handed to signed-in users and never baked into the client bundle:
 *
 * - TURN_URLS        comma-separated, e.g. "turn:turn.example.com:3478,turns:turn.example.com:5349"
 * - TURN_USERNAME + TURN_CREDENTIAL   static credentials (Metered, Twilio token, etc.)
 * - TURN_SECRET      instead of the two above: coturn's `static-auth-secret`; short-lived
 *                    credentials are minted per request.
 */
export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const iceServers: RTCIceServer[] = [STUN];
  const urls = (process.env.TURN_URLS ?? "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);

  if (urls.length) {
    const secret = process.env.TURN_SECRET;
    if (secret) {
      const username = `${Math.floor(Date.now() / 1000) + TTL_SECONDS}:${userId}`;
      const credential = createHmac("sha1", secret).update(username).digest("base64");
      iceServers.push({ urls, username, credential });
    } else if (process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL) {
      iceServers.push({
        urls,
        username: process.env.TURN_USERNAME,
        credential: process.env.TURN_CREDENTIAL,
      });
    }
  }

  return NextResponse.json({ iceServers }, { headers: { "Cache-Control": "private, no-store" } });
}
