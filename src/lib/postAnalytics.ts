export const POST_ANALYTICS_VERSION = 2 as const;
export const ACTIVE_MILESTONES = [10, 30, 60, 120] as const;
export const MAX_ACTIVE_MS = 30 * 60 * 1000;

export type PostAnalyticsEvent = {
  schemaVersion: typeof POST_ANALYTICS_VERSION;
  postId: string;
  sessionId: string;
  eventId: string;
  event: "view" | "time" | "engagement";
  metadata: {
    activeMs: number;
    continuousVisibleMs?: number;
    milestoneSeconds?: number;
  };
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const onlyKeys = (value: Record<string, unknown>, keys: string[]) =>
  Object.keys(value).every((key) => keys.includes(key));

/** Strict v2 boundary: never spread untrusted client metadata into stored documents. */
export function parsePostAnalyticsEvent(value: unknown): PostAnalyticsEvent | null {
  if (
    !record(value) ||
    !onlyKeys(value, ["schemaVersion", "postId", "sessionId", "eventId", "event", "metadata"]) ||
    value.schemaVersion !== POST_ANALYTICS_VERSION ||
    typeof value.postId !== "string" ||
    !/^[a-zA-Z0-9_.:-]{1,160}$/.test(value.postId) ||
    typeof value.sessionId !== "string" ||
    !uuid.test(value.sessionId) ||
    typeof value.eventId !== "string" ||
    !uuid.test(value.eventId) ||
    !["view", "time", "engagement"].includes(value.event as string) ||
    !record(value.metadata)
  )
    return null;

  const { activeMs, continuousVisibleMs, milestoneSeconds } = value.metadata;
  if (
    !Number.isInteger(activeMs) ||
    (activeMs as number) < 1000 ||
    (activeMs as number) > MAX_ACTIVE_MS
  )
    return null;
  if (value.event === "view") {
    if (
      !onlyKeys(value.metadata, ["activeMs", "continuousVisibleMs"]) ||
      continuousVisibleMs !== 1000
    )
      return null;
  } else if (value.event === "time") {
    if (
      !onlyKeys(value.metadata, ["activeMs", "milestoneSeconds"]) ||
      !ACTIVE_MILESTONES.includes(milestoneSeconds as (typeof ACTIVE_MILESTONES)[number]) ||
      (activeMs as number) < (milestoneSeconds as number) * 1000
    )
      return null;
  } else if (!onlyKeys(value.metadata, ["activeMs"])) return null;

  return value as PostAnalyticsEvent;
}

export function postAnalyticsEventKey(event: PostAnalyticsEvent): string {
  return event.event === "time" ? `time:${event.metadata.milestoneSeconds}` : event.event;
}

/** One mounted post exposure. Time is monotonic and only advances while >=50% exposed. */
export class PostAnalyticsSession {
  private lastAt: number;
  private active = false;
  private activeMs = 0;
  private continuousMs = 0;
  private viewed = false;
  private finalized = false;
  private milestones = new Set<number>();

  constructor(
    private postId: string,
    private sessionId: string,
    private emit: (event: PostAnalyticsEvent, terminal: boolean) => void,
    private newId: () => string,
    now: number
  ) {
    this.lastAt = now;
  }

  setExposure(exposed: boolean, now: number) {
    this.tick(now);
    this.active = exposed && !this.finalized;
    if (!this.active) this.continuousMs = 0;
  }

  tick(now: number, terminal = false) {
    if (this.finalized) return;
    const elapsed = Math.max(0, now - this.lastAt);
    this.lastAt = now;
    if (!this.active) return;
    this.activeMs = Math.min(MAX_ACTIVE_MS, this.activeMs + elapsed);
    this.continuousMs += elapsed;
    if (!this.viewed && this.continuousMs >= 1000) {
      this.viewed = true;
      this.send("view", { continuousVisibleMs: 1000 }, terminal);
    }
    if (!this.viewed) return;
    for (const milestone of ACTIVE_MILESTONES) {
      if (this.activeMs >= milestone * 1000 && !this.milestones.has(milestone)) {
        this.milestones.add(milestone);
        this.send("time", { milestoneSeconds: milestone }, terminal);
      }
    }
  }

  finalize(now: number) {
    if (this.finalized) return;
    this.tick(now, true);
    this.finalized = true;
    this.active = false;
    if (this.viewed) this.send("engagement", {}, true);
  }

  private send(
    event: PostAnalyticsEvent["event"],
    metadata: Omit<PostAnalyticsEvent["metadata"], "activeMs">,
    terminal: boolean
  ) {
    this.emit(
      {
        schemaVersion: POST_ANALYTICS_VERSION,
        postId: this.postId,
        sessionId: this.sessionId,
        eventId: this.newId(),
        event,
        metadata: { activeMs: Math.floor(this.activeMs), ...metadata },
      },
      terminal
    );
  }
}
