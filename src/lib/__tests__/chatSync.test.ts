import {
  changedSinceFilter,
  deltaOverflowed,
  MAX_CACHE_AGE_MS,
  mergeDelta,
  parseSince,
  SYNC_OVERLAP_MS,
  sinceForCache,
} from "@/lib/chatSync";
import type { ChatSnapshot } from "@/lib/chatCache";
import type { AllChats, ConvoType, MessageAttributes } from "@/lib/types/type";

const NOW = Date.parse("2026-06-10T12:00:00.000Z");

const msg = (id: string, chatId: string, content = `m${id}`) =>
  ({ _id: id, chatId, content }) as unknown as MessageAttributes;

const snap = (
  chatIds: string[],
  messages: MessageAttributes[],
  extra: Partial<AllChats> = {}
): AllChats =>
  ({
    chats: chatIds.map((_id) => ({ _id })),
    chatSettings: {},
    messages,
    requestId: "u1",
    pagination: { messages: { skip: 0, limit: 500, hasMore: false } },
    ...extra,
  }) as unknown as AllChats;

describe("parseSince", () => {
  it("normalises a valid ISO date", () => {
    expect(parseSince("2026-06-10T11:00:00Z", NOW)).toBe("2026-06-10T11:00:00.000Z");
  });

  it("takes the first value of a repeated query param", () => {
    expect(parseSince(["2026-06-10T11:00:00.000Z", "x"], NOW)).toBe("2026-06-10T11:00:00.000Z");
  });

  it.each([undefined, "", "yesterday", "not-a-date", 123, {}])("rejects %p", (raw) => {
    expect(parseSince(raw, NOW)).toBeNull();
  });

  it("rejects a cursor in the future", () => {
    expect(parseSince("2026-06-10T12:00:00.001Z", NOW)).toBeNull();
  });
});

describe("changedSinceFilter", () => {
  const since = "2026-06-10T11:00:00.000Z";

  it("matches stamped rows by updatedAt and legacy rows by timestamp", () => {
    expect(changedSinceFilter(since).$or).toEqual([
      { updatedAt: { $gt: since } },
      { updatedAt: { $exists: false }, timestamp: { $gt: since } },
    ]);
  });

  it("also matches messages whose read receipts changed", () => {
    const f = changedSinceFilter(since, ["a", "b"]);
    expect(f.$or).toContainEqual({ _id: { $in: ["a", "b"] } });
  });
});

describe("sinceForCache", () => {
  it("backs the cursor off by the overlap window", () => {
    const serverTime = new Date(NOW - 5_000).toISOString();
    expect(sinceForCache(snap([], [], { serverTime }), NOW)).toBe(
      new Date(NOW - 5_000 - SYNC_OVERLAP_MS).toISOString()
    );
  });

  it("forces a full load without a cache or serverTime", () => {
    expect(sinceForCache(null, NOW)).toBeNull();
    expect(sinceForCache(snap([], []), NOW)).toBeNull();
  });

  it("forces a full load when the cache is too old", () => {
    const serverTime = new Date(NOW - MAX_CACHE_AGE_MS - 1).toISOString();
    expect(sinceForCache(snap([], [], { serverTime }), NOW)).toBeNull();
  });

  it("forces a full load when the stored time is in the future (clock/data problem)", () => {
    const serverTime = new Date(NOW + 60_000).toISOString();
    expect(sinceForCache(snap([], [], { serverTime }), NOW)).toBeNull();
  });
});

describe("deltaOverflowed", () => {
  it("is true only when the delta itself has more pages", () => {
    const more = snap([], [], { pagination: { messages: { skip: 0, limit: 5, hasMore: true } } });
    expect(deltaOverflowed(more)).toBe(true);
    expect(deltaOverflowed(snap([], []))).toBe(false);
  });
});

/** What the cache holds: conversations (the UI shape), not the server's chat objects. */
const cachedSnap = (
  chatIds: string[],
  messages: MessageAttributes[],
  extra: Partial<ChatSnapshot> = {}
): ChatSnapshot => ({
  requestId: "u1",
  conversations: chatIds.map((id) => ({ id }) as unknown as ConvoType),
  chatSettings: {},
  messages,
  pagination: { messages: { skip: 0, limit: 500, hasMore: false } },
  ...extra,
});

describe("mergeDelta", () => {
  it("adds new messages and keeps untouched cached ones", () => {
    const merged = mergeDelta(cachedSnap(["c1"], [msg("1", "c1")]), snap(["c1"], [msg("2", "c1")]));
    expect(merged.messages?.map((m) => m._id).sort()).toEqual(["1", "2"]);
  });

  it("replaces a cached message with its changed copy (edit/reaction/read)", () => {
    const merged = mergeDelta(
      cachedSnap(["c1"], [msg("1", "c1", "old")]),
      snap(["c1"], [msg("1", "c1", "new")])
    );
    expect(merged.messages).toHaveLength(1);
    expect(merged.messages?.[0].content).toBe("new");
  });

  it("applies a deletion tombstone over the cached original", () => {
    const placeholder = "This message was deleted.≤≤≤";
    const merged = mergeDelta(
      cachedSnap(["c1"], [msg("1", "c1", "secret")]),
      snap(["c1"], [msg("1", "c1", placeholder)])
    );
    expect(merged.messages?.[0].content).toBe(placeholder);
  });

  it("drops messages of a chat that no longer exists", () => {
    const merged = mergeDelta(
      cachedSnap(["c1", "c2"], [msg("1", "c1"), msg("2", "c2")]),
      snap(["c1"], [])
    );
    expect(merged.messages?.map((m) => m._id)).toEqual(["1"]);
  });

  it("keeps messages whose chat was never in the cached chat list", () => {
    const merged = mergeDelta(cachedSnap(["c1"], [msg("9", "legacy")]), snap(["c1"], []));
    expect(merged.messages?.map((m) => m._id)).toEqual(["9"]);
  });

  it("takes chats, settings and serverTime from the delta but pagination from the cache", () => {
    const cached = cachedSnap(["c1"], [], {
      pagination: { messages: { skip: 0, limit: 500, hasMore: true } },
    });
    const delta = snap(["c1", "c3"], [], {
      serverTime: "2026-06-10T12:00:00.000Z",
      chatSettings: { c3: {} as never },
      pagination: { messages: { skip: 0, limit: 500, hasMore: false } },
    });
    const merged = mergeDelta(cached, delta);

    expect(merged.chats.map((c) => c._id)).toEqual(["c1", "c3"]);
    expect(merged.chatSettings).toHaveProperty("c3");
    expect(merged.serverTime).toBe("2026-06-10T12:00:00.000Z");
    expect(merged.pagination?.messages.hasMore).toBe(true);
  });
});
