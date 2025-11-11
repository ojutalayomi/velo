import { Ratelimit } from "@upstash/ratelimit";
import { kv } from "@vercel/kv";
import { NextRequest, NextResponse } from "next/server";

const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(3, "30 s"),
});

export const config = {
  matcher: "/api/getuser",
};

export default async function proxy(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",").shift()?.trim() ||
    request.nextUrl.hostname ||
    "127.0.0.1";

  const hasKV =
    !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN;

  try {
    if (hasKV) {
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