import { formatClock, isVoiceNoteName, pickVoiceMime, voiceFileName, voiceNoteSeconds } from "@/lib/voiceNote";

describe("voice notes", () => {
  it("picks the first format the browser can record", () => {
    expect(pickVoiceMime((t) => t === "audio/mp4")).toBe("audio/mp4");
    expect(pickVoiceMime(() => true)).toBe("audio/webm;codecs=opus");
    expect(pickVoiceMime(() => false)).toBeUndefined();
  });

  it("names files so they can be recognised and timed later", () => {
    const name = voiceFileName("audio/webm;codecs=opus", 42, 1700);
    expect(name).toBe("voice-note-1700-42s.webm");
    expect(isVoiceNoteName(name)).toBe(true);
    expect(isVoiceNoteName("2025/voice-note-1700-42s.webm")).toBe(true);
    expect(isVoiceNoteName("holiday.mp3")).toBe(false);
    expect(voiceNoteSeconds(name)).toBe(42);
    expect(voiceNoteSeconds("song.mp3")).toBeNull();
    expect(voiceFileName("audio/mp4", 3, 1)).toBe("voice-note-1-3s.m4a");
  });

  it("formats a clock", () => {
    expect(formatClock(75)).toBe("1:15");
    expect(formatClock(5)).toBe("0:05");
  });
});

describe("floatToInt16", () => {
  it("scales and clamps samples for the MP3 encoder", () => {
    const { floatToInt16 } = jest.requireActual("@/lib/audioConvert");
    expect(Array.from(floatToInt16(new Float32Array([0, 1, -1, 2, -2, 0.5])))).toEqual([
      0, 32767, -32768, 32767, -32768, 16383,
    ]);
  });
});
