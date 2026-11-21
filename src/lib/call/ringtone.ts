/**
 * Ringtones for calls. By default a tone is synthesised with the Web Audio API, so no audio
 * files are needed. To use your own sound, put a file in `public/sounds/` and set
 * NEXT_PUBLIC_RINGTONE_URL (incoming) and/or NEXT_PUBLIC_RINGBACK_URL (what the caller hears).
 */
export type RingKind = "incoming" | "outgoing";

const CUSTOM_URL: Record<RingKind, string | undefined> = {
  incoming: process.env.NEXT_PUBLIC_RINGTONE_URL,
  outgoing: process.env.NEXT_PUBLIC_RINGBACK_URL,
};

interface Pattern {
  /** Seconds between the start of one ring and the next. */
  period: number;
  /** [frequency Hz, offset s, duration s] */
  beeps: [number, number, number][];
  gain: number;
}

const PATTERNS: Record<RingKind, Pattern> = {
  // Two quick rising notes, then a pause.
  incoming: {
    period: 2.4,
    beeps: [
      [659, 0, 0.18],
      [880, 0.22, 0.18],
      [659, 0.6, 0.18],
      [880, 0.82, 0.18],
    ],
    gain: 0.22,
  },
  // A soft, lower double tone.
  outgoing: {
    period: 3,
    beeps: [
      [440, 0, 0.9],
      [480, 0, 0.9],
    ],
    gain: 0.1,
  },
};

let stop: (() => void) | null = null;

export function stopRingtone() {
  stop?.();
  stop = null;
}

export function startRingtone(kind: RingKind) {
  stopRingtone();
  if (typeof window === "undefined") return;

  const url = CUSTOM_URL[kind];
  if (url) {
    const audio = new Audio(url);
    audio.loop = true;
    // Autoplay can be refused until the person has interacted with the page; ignore that.
    audio.play().catch(() => undefined);
    stop = () => {
      audio.pause();
      audio.src = "";
    };
    return;
  }

  const AudioContextClass =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;

  let ctx: AudioContext;
  try {
    ctx = new AudioContextClass();
  } catch {
    return;
  }
  ctx.resume().catch(() => undefined);

  const pattern = PATTERNS[kind];
  const ring = () => {
    const base = ctx.currentTime + 0.05;
    for (const [frequency, offset, duration] of pattern.beeps) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0, base + offset);
      gain.gain.linearRampToValueAtTime(pattern.gain, base + offset + 0.02);
      gain.gain.setValueAtTime(pattern.gain, base + offset + duration - 0.04);
      gain.gain.linearRampToValueAtTime(0, base + offset + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(base + offset);
      osc.stop(base + offset + duration + 0.02);
    }
    if (kind === "incoming") navigator.vibrate?.([300, 150, 300]);
  };

  ring();
  const timer = setInterval(ring, pattern.period * 1000);
  stop = () => {
    clearInterval(timer);
    if (kind === "incoming") navigator.vibrate?.(0);
    ctx.close().catch(() => undefined);
  };
}
