/**
 * Small in-memory sliding-window limiter. State is per server instance, so on serverless
 * it is best-effort: enough to stop a single client hammering an endpoint, not a hard quota.
 */
export function createRateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, number[]>();

  return function check(key: string, now = Date.now()): { allowed: boolean; retryAfterSeconds: number } {
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= limit) {
      hits.set(key, recent);
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000)) };
    }
    recent.push(now);
    hits.set(key, recent);

    // Drop idle keys occasionally so the map cannot grow without bound.
    if (hits.size > 5000) {
      for (const [k, times] of hits) {
        if (times.every((t) => now - t >= windowMs)) hits.delete(k);
      }
    }
    return { allowed: true, retryAfterSeconds: 0 };
  };
}
