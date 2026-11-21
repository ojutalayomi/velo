import { createHmac } from "node:crypto";

export type TurnProvider = "cloudflare" | "expressturn" | "coturn" | "static" | "none";

export const STUN: RTCIceServer = {
  urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"],
};

const CREDENTIAL_TTL_SECONDS = 6 * 60 * 60;
const EXPRESSTURN_DEFAULT_URLS = "turn:relay1.expressturn.com:3478";
const CLOUDFLARE_TIMEOUT_MS = 4000;

type Env = Record<string, string | undefined>;

const list = (value?: string) =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

/**
 * Which TURN provider to use. Set TURN_PROVIDER explicitly, or leave it unset and the first
 * provider whose variables are present wins (Cloudflare, ExpressTURN, coturn, static).
 */
export function pickProvider(env: Env): TurnProvider {
  const explicit = (env.TURN_PROVIDER ?? "").trim().toLowerCase();
  if (["cloudflare", "expressturn", "coturn", "static", "none"].includes(explicit)) {
    return explicit as TurnProvider;
  }
  if (env.CLOUDFLARE_TURN_KEY_ID && env.CLOUDFLARE_TURN_API_TOKEN) return "cloudflare";
  if (env.EXPRESSTURN_USERNAME && env.EXPRESSTURN_CREDENTIAL) return "expressturn";
  if (env.TURN_URLS && env.TURN_SECRET) return "coturn";
  if (env.TURN_URLS && env.TURN_USERNAME && env.TURN_CREDENTIAL) return "static";
  return "none";
}

interface CloudflareResponse {
  // `generate-ice-servers` returns an array; the older `generate` endpoint returns one object.
  iceServers?: RTCIceServer | RTCIceServer[];
}

async function cloudflareServers(env: Env, fetchFn: typeof fetch): Promise<RTCIceServer[]> {
  const keyId = env.CLOUDFLARE_TURN_KEY_ID;
  const token = env.CLOUDFLARE_TURN_API_TOKEN;
  if (!keyId || !token) throw new Error("CLOUDFLARE_TURN_KEY_ID / CLOUDFLARE_TURN_API_TOKEN not set");

  const res = await fetchFn(
    `https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(keyId)}/credentials/generate-ice-servers`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ttl: CREDENTIAL_TTL_SECONDS }),
      signal: AbortSignal.timeout(CLOUDFLARE_TIMEOUT_MS),
    }
  );
  if (!res.ok) throw new Error(`Cloudflare TURN responded ${res.status}`);
  const body = (await res.json()) as CloudflareResponse;
  const servers = Array.isArray(body.iceServers) ? body.iceServers : body.iceServers ? [body.iceServers] : [];
  if (!servers.length) throw new Error("Cloudflare TURN returned no ice servers");
  return servers;
}

// Cloudflare credentials last hours, so one set is shared for a while instead of one API call
// per page load. A rejected call is retried on the next request.
let cloudflareCache: { servers: RTCIceServer[]; at: number } | null = null;
const CLOUDFLARE_CACHE_MS = 30 * 60 * 1000;

/** Test hook. */
export function resetIceCache() {
  cloudflareCache = null;
}

/**
 * STUN plus, when configured, a TURN relay. Failures of the relay never fail the call setup:
 * the caller still gets STUN so direct connections keep working.
 */
export async function resolveIceServers(
  env: Env,
  userId: string,
  options: { fetchFn?: typeof fetch; now?: number; onError?: (error: unknown) => void } = {}
): Promise<{ provider: TurnProvider; iceServers: RTCIceServer[] }> {
  const { fetchFn = fetch, now = Date.now(), onError } = options;
  const provider = pickProvider(env);
  const iceServers: RTCIceServer[] = [STUN];

  try {
    switch (provider) {
      case "cloudflare": {
        if (!cloudflareCache || now - cloudflareCache.at > CLOUDFLARE_CACHE_MS) {
          cloudflareCache = { servers: await cloudflareServers(env, fetchFn), at: now };
        }
        // Cloudflare's list already contains its own STUN entries.
        return { provider, iceServers: [STUN, ...cloudflareCache.servers] };
      }
      case "expressturn": {
        if (env.EXPRESSTURN_USERNAME && env.EXPRESSTURN_CREDENTIAL) {
          iceServers.push({
            urls: list(env.EXPRESSTURN_URLS || EXPRESSTURN_DEFAULT_URLS),
            username: env.EXPRESSTURN_USERNAME,
            credential: env.EXPRESSTURN_CREDENTIAL,
          });
        }
        break;
      }
      case "coturn": {
        const urls = list(env.TURN_URLS);
        if (urls.length && env.TURN_SECRET) {
          const username = `${Math.floor(now / 1000) + CREDENTIAL_TTL_SECONDS}:${userId}`;
          const credential = createHmac("sha1", env.TURN_SECRET).update(username).digest("base64");
          iceServers.push({ urls, username, credential });
        }
        break;
      }
      case "static": {
        const urls = list(env.TURN_URLS);
        if (urls.length && env.TURN_USERNAME && env.TURN_CREDENTIAL) {
          iceServers.push({ urls, username: env.TURN_USERNAME, credential: env.TURN_CREDENTIAL });
        }
        break;
      }
      default:
        break;
    }
  } catch (error) {
    onError?.(error);
  }
  return { provider, iceServers };
}
