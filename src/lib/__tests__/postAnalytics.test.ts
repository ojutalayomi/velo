import {
  MAX_ACTIVE_MS,
  parsePostAnalyticsEvent,
  PostAnalyticsSession,
  postAnalyticsEventKey,
  type PostAnalyticsEvent,
} from "../postAnalytics";

const sessionId = "11111111-1111-4111-8111-111111111111";
const eventId = "22222222-2222-4222-8222-222222222222";
const valid = (): PostAnalyticsEvent => ({
  schemaVersion: 2,
  postId: "example-post",
  sessionId,
  eventId,
  event: "view",
  metadata: { activeMs: 1000, continuousVisibleMs: 1000 },
});
function tracker(postId = "post-one") {
  const events: PostAnalyticsEvent[] = [];
  const emit = jest.fn<undefined, [PostAnalyticsEvent, boolean]>((event) => {
    events.push(event);
  });
  const session = new PostAnalyticsSession(postId, sessionId, emit, () => eventId, 0);
  return { events, emit, session };
}

describe("post analytics qualification and active dwell", () => {
  it("requires one continuous second and resets continuity on loss of exposure", () => {
    const { session, events } = tracker();
    session.setExposure(true, 0);
    session.tick(999);
    expect(events).toHaveLength(0);
    session.setExposure(false, 999);
    session.setExposure(true, 5000);
    session.tick(5999);
    expect(events).toHaveLength(0);
    session.tick(6000);
    expect(events).toEqual([
      expect.objectContaining({
        event: "view",
        metadata: { activeMs: 1999, continuousVisibleMs: 1000 },
      }),
    ]);
  });

  it("does not count hidden or off-post intervals and deduplicates milestones/finalization", () => {
    const { session, events, emit } = tracker();
    session.setExposure(true, 0);
    session.setExposure(false, 5000);
    session.tick(100000);
    session.setExposure(true, 100000);
    session.tick(105000);
    session.tick(105100);
    session.finalize(105200);
    session.finalize(200000);
    session.setExposure(true, 200001);
    session.tick(300000);
    expect(events.map(postAnalyticsEventKey)).toEqual(["view", "time:10", "engagement"]);
    expect(events[2].metadata.activeMs).toBe(10200);
    expect(emit.mock.calls[2][1]).toBe(true);
  });

  it("does not finalize an unqualified exposure, including StrictMode's immediate cleanup", () => {
    const { session, events } = tracker();
    session.finalize(0);
    expect(events).toEqual([]);
    const short = tracker();
    short.session.setExposure(true, 0);
    short.session.finalize(999);
    expect(short.events).toEqual([]);
  });

  it("caps active dwell, emits each milestone once, and isolates new post sessions", () => {
    const { session, events } = tracker();
    session.setExposure(true, 0);
    session.tick(MAX_ACTIVE_MS * 2);
    session.finalize(MAX_ACTIVE_MS * 3);
    expect(events.map(postAnalyticsEventKey)).toEqual([
      "view",
      "time:10",
      "time:30",
      "time:60",
      "time:120",
      "engagement",
    ]);
    expect(events.every((event) => event.metadata.activeMs === MAX_ACTIVE_MS)).toBe(true);
    const next = tracker("post-two");
    next.session.setExposure(true, 0);
    next.session.tick(1000);
    expect(next.events).toHaveLength(1);
    expect(next.events[0].postId).toBe("post-two");
  });
});

describe("strict v2 analytics validation", () => {
  it("accepts only the new event shapes", () => {
    expect(parsePostAnalyticsEvent(valid())).toEqual(valid());
    expect(
      parsePostAnalyticsEvent({
        ...valid(),
        event: "time",
        metadata: {
          activeMs: 30000,
          milestoneSeconds: 30,
        },
      })
    ).not.toBeNull();
    expect(
      parsePostAnalyticsEvent({
        ...valid(),
        event: "engagement",
        metadata: {
          activeMs: 1000,
        },
      })
    ).not.toBeNull();
  });

  it.each([
    null,
    [],
    {},
    { ...valid(), schemaVersion: 1 },
    { ...valid(), event: "scroll" },
    { ...valid(), event: "like" },
    { ...valid(), postId: { $ne: null } },
    { ...valid(), postId: "x".repeat(161) },
    { ...valid(), sessionId: "fingerprint" },
    { ...valid(), eventId: "x".repeat(1000) },
    { ...valid(), userId: "spoofed" },
    { ...valid(), metadata: { activeMs: Infinity, continuousVisibleMs: 1000 } },
    { ...valid(), metadata: { activeMs: MAX_ACTIVE_MS + 1, continuousVisibleMs: 1000 } },
    { ...valid(), metadata: { activeMs: 999, continuousVisibleMs: 1000 } },
    { ...valid(), metadata: { activeMs: 1000.5, continuousVisibleMs: 1000 } },
    { ...valid(), metadata: { activeMs: 1000, continuousVisibleMs: 999 } },
    { ...valid(), metadata: { activeMs: 1000, continuousVisibleMs: 1000, userAgent: "raw" } },
    { ...valid(), event: "time", metadata: { activeMs: 1000, milestoneSeconds: 10 } },
    { ...valid(), event: "time", metadata: { activeMs: 10000, milestoneSeconds: 11 } },
    { ...valid(), event: "engagement", metadata: { activeMs: 1000, referrer: "private URL" } },
  ])("rejects malformed, unbounded, spoofed and legacy payload %#", (value) => {
    expect(parsePostAnalyticsEvent(value)).toBeNull();
  });
});
