import { voiceFileName } from "@/lib/voiceNote";

/** Every browser can play MP3, unlike webm/opus (Chrome, Firefox) or m4a (Safari), so notes are sent as MP3. */
export const MP3_SAMPLE_RATE = 44100;
const MP3_KBPS = 64;
const FRAME = 1152;

/** Float samples (-1..1) to the 16-bit integers the encoder takes, clamping any overshoot. */
export function floatToInt16(samples: Float32Array): Int16Array {
  const out = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

type AudioContextCtor = typeof AudioContext;

/** Decodes any recording this browser can play, as mono at the MP3 sample rate. */
async function decodeToMono(file: File): Promise<Float32Array> {
  const Ctx: AudioContextCtor | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
  if (!Ctx) throw new Error("Web Audio is not available");

  const context = new Ctx();
  try {
    const decoded = await context.decodeAudioData(await file.arrayBuffer());
    // An offline render does the resampling and the stereo-to-mono mix in one step.
    const offline = new OfflineAudioContext(1, Math.max(1, Math.ceil(decoded.duration * MP3_SAMPLE_RATE)), MP3_SAMPLE_RATE);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();
    return (await offline.startRendering()).getChannelData(0);
  } finally {
    void context.close().catch(() => undefined);
  }
}

/**
 * Re-encodes a recording as MP3 on the sender's device, once, so every listener can play it.
 * Any failure returns the original file untouched: a note is never lost to conversion.
 */
export async function toMp3(file: File, seconds: number): Promise<File> {
  if (file.type === "audio/mpeg") return file;
  try {
    const [{ Mp3Encoder }, samples] = await Promise.all([import("@breezystack/lamejs"), decodeToMono(file)]);
    const pcm = floatToInt16(samples);
    const encoder = new Mp3Encoder(1, MP3_SAMPLE_RATE, MP3_KBPS);
    const parts: Uint8Array<ArrayBuffer>[] = [];

    for (let i = 0; i < pcm.length; i += FRAME) {
      const chunk = encoder.encodeBuffer(pcm.subarray(i, i + FRAME));
      if (chunk.length > 0) parts.push(new Uint8Array(chunk));
      // Hand the thread back now and then so a long note doesn't freeze the page.
      if ((i / FRAME) % 400 === 399) await new Promise((resolve) => setTimeout(resolve, 0));
    }
    const tail = encoder.flush();
    if (tail.length > 0) parts.push(new Uint8Array(tail));

    const blob = new Blob(parts, { type: "audio/mpeg" });
    if (blob.size === 0) return file;
    return new File([blob], voiceFileName("audio/mpeg", seconds), { type: "audio/mpeg" });
  } catch (error) {
    console.warn("[voice] MP3 conversion failed, sending the original recording:", error);
    return file;
  }
}
