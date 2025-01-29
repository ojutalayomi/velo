import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';

const ratelimit = new Ratelimit({
  redis: kv,
  // 1 requests from the same IP for every 30 seconds
  limiter: Ratelimit.slidingWindow(3, '30 s'),
});

export const config = {
  matcher: '/api/getuser'
}

export default async function middleware(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const { success, pending, limit, reset, remaining } = await ratelimit.limit(
    ip
  );
  console.log(success)
  return success
    ? NextResponse.next()
    : NextResponse.json({ role: 'assistant', content: 'too many requests' }, {status: 429});
}