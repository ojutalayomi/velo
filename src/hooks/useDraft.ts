"use client";

import { Dispatch, SetStateAction, useCallback, useSyncExternalStore } from "react";

const PREFIX = "velo:draft:";
const EVENT = "velo:draft-change";

export const chatDraftKey = (chatId: string) => `chat:${chatId}`;

export function readDraft(key: string): string {
  try {
    return localStorage.getItem(PREFIX + key) ?? "";
  } catch {
    return "";
  }
}

export function writeDraft(key: string, value: string) {
  try {
    if (value.trim()) localStorage.setItem(PREFIX + key, value);
    else localStorage.removeItem(PREFIX + key);
  } catch {
    // storage unavailable (private mode, quota): drafts are best-effort
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: key }));
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Read-only view of a saved draft (e.g. for the "Draft:" preview in the chat list). */
export function useDraftValue(key: string): string {
  return useSyncExternalStore(
    subscribe,
    () => readDraft(key),
    () => ""
  );
}

/** Like useState<string>, but persisted in localStorage under `key`. */
export function useDraft(key: string): [string, Dispatch<SetStateAction<string>>] {
  const value = useDraftValue(key);
  const setValue = useCallback<Dispatch<SetStateAction<string>>>(
    (next) => {
      const resolved = typeof next === "function" ? next(readDraft(key)) : next;
      writeDraft(key, resolved);
    },
    [key]
  );
  return [value, setValue];
}
