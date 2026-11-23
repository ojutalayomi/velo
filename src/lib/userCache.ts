import type { UserData } from "@/lib/types/user";

/**
 * The signed-in user's profile, kept in localStorage.
 *
 * Online it is a short-lived cache that saves a request on quick reloads. Offline it is the only
 * way to know who is using the app, so it is then read regardless of age (`ignoreExpiry`): without
 * a user id the chats saved in IndexedDB can't be looked up. Logout must clear it.
 */

const KEY = "userData";
export const USER_CACHE_TTL_MS = 60_000;

export function readCachedUser(options: { ignoreExpiry?: boolean } = {}): UserData | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data?: UserData; timestamp?: number };
    // A damaged entry must not become a half-empty "user".
    if (!parsed?.data || typeof parsed.data._id !== "string" || !parsed.data._id) return null;
    if (options.ignoreExpiry) return parsed.data;
    const age = Date.now() - (parsed.timestamp ?? 0);
    return age < USER_CACHE_TTL_MS ? parsed.data : null;
  } catch {
    return null;
  }
}

export function writeCachedUser(data: UserData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // Storage unavailable or full; caching is best-effort.
  }
}

export function clearCachedUser(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
