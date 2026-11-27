"use client";

import { Dispatch, SetStateAction, useCallback, useSyncExternalStore } from "react";

const PREFIX = "velo:draft:";
/** How long typing must pause before the draft is saved to localStorage. */
const PERSIST_DELAY_MS = 500;

export const chatDraftKey = (chatId: string) => `chat:${chatId}`;

/*
 * Drafts live in memory first. Writing localStorage is synchronous, and doing it (and reading it
 * back) on every keystroke is what made typing sluggish on phones. Typing now only touches this
 * map and wakes the components watching that one draft; the save to localStorage is debounced.
 */
const cache = new Map<string, string>();
const listeners = new Map<string, Set<() => void>>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();

function load(key: string): string {
  try {
    return localStorage.getItem(PREFIX + key) ?? "";
  } catch {
    return "";
  }
}

function persist(key: string) {
  const timer = timers.get(key);
  if (timer) clearTimeout(timer);
  timers.delete(key);
  const value = cache.get(key) ?? "";
  try {
    if (value.trim()) localStorage.setItem(PREFIX + key, value);
    else localStorage.removeItem(PREFIX + key);
  } catch {
    // storage unavailable (private mode, quota): drafts are best-effort
  }
}

function flushAll() {
  for (const key of [...timers.keys()]) persist(key);
}

if (typeof window !== "undefined") {
  // Don't lose the last few keystrokes when the tab is hidden, backgrounded by the OS, or closed.
  window.addEventListener("pagehide", flushAll);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushAll();
  });
  // Another tab changed a draft.
  window.addEventListener("storage", (e) => {
    if (!e.key?.startsWith(PREFIX)) return;
    const key = e.key.slice(PREFIX.length);
    cache.set(key, e.newValue ?? "");
    listeners.get(key)?.forEach((notify) => notify());
  });
}

export function readDraft(key: string): string {
  if (typeof window === "undefined") return "";
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  const stored = load(key);
  cache.set(key, stored);
  return stored;
}

export function writeDraft(key: string, value: string) {
  if (readDraft(key) === value) return;
  cache.set(key, value);
  listeners.get(key)?.forEach((notify) => notify());
  const timer = timers.get(key);
  if (timer) clearTimeout(timer);
  // Clearing (after a send) is saved at once so a reload can't resurrect a sent message.
  if (!value) persist(key);
  else timers.set(key, setTimeout(() => persist(key), PERSIST_DELAY_MS));
}

function subscribeTo(key: string) {
  return (notify: () => void) => {
    let set = listeners.get(key);
    if (!set) listeners.set(key, (set = new Set()));
    set.add(notify);
    return () => {
      set.delete(notify);
      if (!set.size) listeners.delete(key);
    };
  };
}

/** Read-only view of a saved draft (e.g. for the "Draft:" preview in the chat list). */
export function useDraftValue(key: string): string {
  return useSyncExternalStore(
    useCallback((notify) => subscribeTo(key)(notify), [key]),
    () => readDraft(key),
    () => ""
  );
}

/**
 * Just the setter, with no subscription: a component that only needs to write (or to read the
 * draft at send time with `readDraft`) isn't re-rendered on every keystroke.
 */
export function useDraftSetter(key: string): Dispatch<SetStateAction<string>> {
  return useCallback<Dispatch<SetStateAction<string>>>(
    (next) => {
      writeDraft(key, typeof next === "function" ? next(readDraft(key)) : next);
    },
    [key]
  );
}

/** Like useState<string>, but persisted in localStorage under `key`. */
export function useDraft(key: string): [string, Dispatch<SetStateAction<string>>] {
  return [useDraftValue(key), useDraftSetter(key)];
}
