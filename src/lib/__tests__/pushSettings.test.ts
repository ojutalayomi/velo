/**
 * @jest-environment node
 */
import {
  isWithinQuietHours,
  mergeNotificationPreferences,
  parseNotificationPatch,
} from "@/lib/notificationSettings";
import type { DndWindow } from "@/lib/types/type";

const overnight: DndWindow = {
  enabled: true,
  start: "22:00",
  end: "08:00",
  timezone: "UTC",
};

describe("notification preference merging", () => {
  it("returns defaults for missing settings", () => {
    expect(mergeNotificationPreferences(null)).toEqual({
      messages: true,
      mentions: true,
      follows: true,
      calls: true,
      hideMessagePreview: false,
      dnd: { enabled: false, start: "22:00", end: "08:00", timezone: "UTC" },
    });
  });

  it("keeps valid values and repairs invalid ones", () => {
    const merged = mergeNotificationPreferences({
      messages: false,
      calls: "no",
      dnd: { enabled: true, start: "25:00", end: "07:30", timezone: "Not/AZone" },
    });

    expect(merged.messages).toBe(false);
    expect(merged.calls).toBe(true);
    expect(merged.dnd).toEqual({
      enabled: true,
      start: "22:00",
      end: "07:30",
      timezone: "UTC",
    });
  });
});

describe("notification patch validation", () => {
  it("accepts known boolean keys and partial dnd updates", () => {
    const result = parseNotificationPatch({
      messages: false,
      hideMessagePreview: true,
      dnd: { enabled: true, start: "23:15" },
    });

    expect(result).toEqual({
      ok: true,
      patch: {
        messages: false,
        hideMessagePreview: true,
        dnd: { enabled: true, start: "23:15" },
      },
    });
  });

  it("rejects invalid times and time zones", () => {
    expect(parseNotificationPatch({ dnd: { start: "9:00" } }).ok).toBe(false);
    expect(parseNotificationPatch({ dnd: { end: "24:00" } }).ok).toBe(false);
    expect(parseNotificationPatch({ dnd: { timezone: "Mars/Olympus" } }).ok).toBe(false);
    expect(parseNotificationPatch({ messages: "yes" }).ok).toBe(false);
    expect(parseNotificationPatch(null).ok).toBe(false);
  });
});

describe("quiet hours", () => {
  it("handles same-day windows", () => {
    const dnd: DndWindow = { ...overnight, start: "09:00", end: "17:00" };
    expect(isWithinQuietHours(new Date("2026-01-01T12:00:00Z"), dnd)).toBe(true);
    expect(isWithinQuietHours(new Date("2026-01-01T08:59:00Z"), dnd)).toBe(false);
    expect(isWithinQuietHours(new Date("2026-01-01T17:00:00Z"), dnd)).toBe(false);
  });

  it("handles overnight windows", () => {
    expect(isWithinQuietHours(new Date("2026-01-01T23:00:00Z"), overnight)).toBe(true);
    expect(isWithinQuietHours(new Date("2026-01-01T03:00:00Z"), overnight)).toBe(true);
    expect(isWithinQuietHours(new Date("2026-01-01T12:00:00Z"), overnight)).toBe(false);
    expect(isWithinQuietHours(new Date("2026-01-01T08:00:00Z"), overnight)).toBe(false);
  });

  it("respects the configured time zone", () => {
    const zoned: DndWindow = { ...overnight, timezone: "America/New_York" };
    // 03:00 UTC = 22:00 EST on the previous day
    expect(isWithinQuietHours(new Date("2026-01-01T03:00:00Z"), zoned)).toBe(true);
    // 15:00 UTC = 10:00 EST
    expect(isWithinQuietHours(new Date("2026-01-01T15:00:00Z"), zoned)).toBe(false);
  });

  it("is disabled when dnd is off or the window is empty", () => {
    expect(isWithinQuietHours(new Date("2026-01-01T23:00:00Z"), { ...overnight, enabled: false })).toBe(false);
    expect(
      isWithinQuietHours(new Date("2026-01-01T23:00:00Z"), { ...overnight, start: "22:00", end: "22:00" })
    ).toBe(false);
  });
});
