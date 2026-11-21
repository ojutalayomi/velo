/** @jest-environment node */
import { pickProvider, resetIceCache, resolveIceServers, STUN } from "@/lib/call/iceServers";

const cloudflareEnv = { CLOUDFLARE_TURN_KEY_ID: "key", CLOUDFLARE_TURN_API_TOKEN: "tok" };
const expressEnv = { EXPRESSTURN_USERNAME: "u", EXPRESSTURN_CREDENTIAL: "p" };

const json = (body: unknown, ok = true, status = 200) =>
  ({ ok, status, json: async () => body }) as Response;

beforeEach(resetIceCache);

describe("pickProvider", () => {
  it("auto-detects the first configured provider", () => {
    expect(pickProvider({})).toBe("none");
    expect(pickProvider(expressEnv)).toBe("expressturn");
    expect(pickProvider({ ...cloudflareEnv, ...expressEnv })).toBe("cloudflare");
    expect(pickProvider({ TURN_URLS: "turn:a", TURN_SECRET: "s" })).toBe("coturn");
    expect(pickProvider({ TURN_URLS: "turn:a", TURN_USERNAME: "u", TURN_CREDENTIAL: "c" })).toBe("static");
  });

  it("lets TURN_PROVIDER override detection", () => {
    expect(pickProvider({ ...cloudflareEnv, ...expressEnv, TURN_PROVIDER: "expressturn" })).toBe("expressturn");
    expect(pickProvider({ ...cloudflareEnv, TURN_PROVIDER: "none" })).toBe("none");
    expect(pickProvider({ TURN_PROVIDER: "bogus", ...expressEnv })).toBe("expressturn");
  });
});

describe("resolveIceServers", () => {
  it("returns only STUN when nothing is configured", async () => {
    const { iceServers } = await resolveIceServers({}, "u1");
    expect(iceServers).toEqual([STUN]);
  });

  it("builds an ExpressTURN entry with the default relay URL", async () => {
    const { iceServers } = await resolveIceServers(expressEnv, "u1");
    expect(iceServers[1]).toEqual({
      urls: ["turn:relay1.expressturn.com:3478"],
      username: "u",
      credential: "p",
    });
    const custom = await resolveIceServers(
      { ...expressEnv, EXPRESSTURN_URLS: "turn:a:3478, turn:b:443" },
      "u1"
    );
    expect(custom.iceServers[1].urls).toEqual(["turn:a:3478", "turn:b:443"]);
  });

  it("mints coturn credentials from the shared secret", async () => {
    const env = { TURN_URLS: "turn:t.example.com:3478", TURN_SECRET: "secret" };
    const { iceServers } = await resolveIceServers(env, "user9", { now: 1_000_000 });
    const turn = iceServers[1] as RTCIceServer & { username: string; credential: string };
    expect(turn.username).toBe(`${1000 + 6 * 3600}:user9`);
    expect(turn.credential).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  it("fetches Cloudflare credentials (array or single-object shape) and caches them", async () => {
    const turn = { urls: ["turn:turn.cloudflare.com:3478"], username: "cu", credential: "cc" };
    const fetchFn = jest.fn().mockResolvedValue(json({ iceServers: [{ urls: ["stun:stun.cloudflare.com:3478"] }, turn] }));
    const first = await resolveIceServers(cloudflareEnv, "u1", { fetchFn, now: 1 });
    expect(first.iceServers).toContainEqual(turn);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toContain("/turn/keys/key/credentials/generate-ice-servers");
    expect(init.headers.Authorization).toBe("Bearer tok");

    await resolveIceServers(cloudflareEnv, "u2", { fetchFn, now: 2 }); // cached
    expect(fetchFn).toHaveBeenCalledTimes(1);

    resetIceCache();
    const single = jest.fn().mockResolvedValue(json({ iceServers: turn }));
    const second = await resolveIceServers(cloudflareEnv, "u1", { fetchFn: single });
    expect(second.iceServers).toContainEqual(turn);
  });

  it("falls back to STUN when the provider fails, and reports why", async () => {
    const onError = jest.fn();
    const fetchFn = jest.fn().mockResolvedValue(json({}, false, 401));
    const { iceServers } = await resolveIceServers(cloudflareEnv, "u1", { fetchFn, onError });
    expect(iceServers).toEqual([STUN]);
    expect(onError).toHaveBeenCalled();
    // a failure is not cached: the next request tries again
    await resolveIceServers(cloudflareEnv, "u1", { fetchFn, onError });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});
