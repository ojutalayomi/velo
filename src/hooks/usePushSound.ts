"use client";
import { useEffect } from "react";

let audioContext: AudioContext | null = null;

/** Two short rising tones, synthesised so no audio asset needs to ship. */
async function playChime(): Promise<void> {
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return;

  audioContext ??= new Ctor();
  // Browsers keep the context suspended until the user has interacted with the page.
  if (audioContext.state === "suspended") await audioContext.resume();
  if (audioContext.state !== "running") return;

  const start = audioContext.currentTime;
  [660, 880].forEach((frequency, index) => {
    const ctx = audioContext as AudioContext;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const at = start + index * 0.14;

    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.2, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);

    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(at);
    oscillator.stop(at + 0.25);
  });
}

/**
 * The service worker skips the system banner when the user is already on the target page and
 * asks the page to play a sound instead.
 */
export function usePushSound(): void {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== "push-sound") return;
      playChime().catch(() => {
        // Blocked by autoplay policy or unsupported; the sound is best-effort.
      });
    };

    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, []);
}
