"use client";

import {
  TREND_CACHE_TTL_MS,
  TREND_MAX_LIMIT,
  TREND_MIN_AUTHORS,
  TREND_WINDOW_HOURS,
  type TrendsResponse,
} from "./trends";

export type TrendsState = {
  snapshot: TrendsResponse | null;
  loading: boolean;
  error: boolean;
};

const initialState: TrendsState = { snapshot: null, loading: true, error: false };
let state = initialState;
let expiresAt = 0;
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

export const getTrendsState = () => state;
export const getServerTrendsState = () => initialState;
export function subscribeTrends(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function publish(next: TrendsState) {
  state = next;
  listeners.forEach((listener) => listener());
}

function isSnapshot(value: unknown): value is TrendsResponse {
  if (!value || typeof value !== "object") return false;
  const data = value as TrendsResponse;
  return (
    data.windowHours === TREND_WINDOW_HOURS &&
    typeof data.generatedAt === "string" &&
    Number.isFinite(Date.parse(data.generatedAt)) &&
    Array.isArray(data.data) &&
    data.data.length <= TREND_MAX_LIMIT &&
    data.data.every(
      (trend) =>
        trend &&
        typeof trend.tag === "string" &&
        /^[a-z0-9_]+$/.test(trend.tag) &&
        Number.isSafeInteger(trend.postCount) &&
        Number.isSafeInteger(trend.authorCount) &&
        trend.authorCount >= TREND_MIN_AUTHORS &&
        trend.postCount >= trend.authorCount
    )
  );
}

/** Share the full list across sidebar/page mounts and coalesce concurrent refreshes. */
export function refreshTrends(force = false): Promise<void> {
  if (inFlight) return inFlight;
  if (!force && state.snapshot && Date.now() < expiresAt) return Promise.resolve();
  publish({ ...state, loading: true, error: false });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  inFlight = (async () => {
    try {
      const response = await fetch(`/api/trends?limit=${TREND_MAX_LIMIT}`, {
        signal: controller.signal,
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Unable to load trends");
      const snapshot: unknown = await response.json();
      if (!isSnapshot(snapshot)) throw new Error("Invalid trends response");
      // Do not extend a server snapshot's lifetime by another client cache window.
      expiresAt = Math.min(Date.now(), Date.parse(snapshot.generatedAt)) + TREND_CACHE_TTL_MS;
      publish({ snapshot, loading: false, error: false });
    } catch {
      publish({ ...state, loading: false, error: true });
    } finally {
      clearTimeout(timeout);
      inFlight = null;
    }
  })();
  return inFlight;
}
