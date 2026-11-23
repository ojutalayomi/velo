/** Cached token for the socket server; null when none is available (not signed in, or not configured). */
let cached: { token: string; expiresAt: number } | null = null;
let pending: Promise<string | null> | null = null;

/** Refresh a little early so a token never expires mid-request. */
const MARGIN_MS = 2 * 60_000;

export async function getSocketToken(): Promise<string | null> {
  if (cached && cached.expiresAt - MARGIN_MS > Date.now()) return cached.token;
  pending ??= fetch("/api/socket-token", { cache: "no-store" })
    .then((res) => (res.ok ? res.json() : null))
    .then((body: { token?: string | null; expiresIn?: number } | null) => {
      if (!body?.token) return null;
      cached = { token: body.token, expiresAt: Date.now() + (body.expiresIn ?? 3600) * 1000 };
      return body.token;
    })
    .catch(() => null)
    .finally(() => {
      pending = null;
    });
  return pending;
}

/** Forget the token, e.g. on logout, so the next user does not reuse it. */
export function clearSocketToken() {
  cached = null;
}

/** Authorization header for requests to the socket server's HTTP routes. */
export async function socketAuthHeaders(): Promise<Record<string, string>> {
  const token = await getSocketToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
