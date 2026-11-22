"use client";

import { useSyncExternalStore } from "react";

const KEY = "velo:markdown-messages";

let enabled = false; // plain text unless the sender opts in
try {
  enabled = localStorage.getItem(KEY) === "1";
} catch {
  /* storage unavailable: stay on plain text */
}
const listeners = new Set<() => void>();

/** Read at send time (not a hook), so a handler always sees the current choice. */
export const getMarkdownPreference = () => enabled;

export function setMarkdownPreference(next: boolean) {
  enabled = next;
  try {
    localStorage.setItem(KEY, next ? "1" : "0");
  } catch {
    /* applied for this session only */
  }
  listeners.forEach((listener) => listener());
}

/** Whether new messages are sent as Markdown. Remembered on this device. */
export function useMarkdownPreference() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => enabled,
    () => false
  );
}
