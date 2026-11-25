import { forwardBlockReason, canQuote } from "@/lib/messageActions";
import { previewFor } from "@/lib/chatPreview";
import { messageText } from "@/lib/polls";
import { requestViewOnce, viewOnceLabel, viewOnceState } from "@/lib/viewOnce";

describe("viewOnceState", () => {
  it("shows the sender sent, then seen", () => {
    expect(viewOnceState({ viewOnce: true, viewOnceOpenedBy: [] }, "me", "me")).toBe("sent");
    expect(viewOnceState({ viewOnce: true, viewOnceOpenedBy: ["you"] }, "me", "me")).toBe("seen");
  });

  it("shows a recipient ready, then opened, or expired when it went unopened", () => {
    expect(viewOnceState({ viewOnce: true }, "me", "you")).toBe("ready");
    expect(viewOnceState({ viewOnce: true, viewOnceOpenedBy: ["me"] }, "me", "you")).toBe("opened");
    expect(viewOnceState({ viewOnce: true, viewOnceGone: true }, "me", "you")).toBe("expired");
    // Someone else in a group opening it doesn't use up this person's turn.
    expect(viewOnceState({ viewOnce: true, viewOnceOpenedBy: ["third"] }, "me", "you")).toBe("ready");
  });
});

describe("view once never leaks what it is", () => {
  it("labels previews by kind and blocks forwarding and quoting", () => {
    expect(viewOnceLabel("Image")).toBe("📷 View once photo");
    expect(viewOnceLabel("Video")).toBe("🎥 View once video");
    expect(viewOnceLabel("VoiceNote")).toBe("🎤 View once voice message");
    const m = { viewOnce: true, messageType: "Image" as const, content: "", attachments: [] };
    expect(messageText(m)).toBe("📷 View once photo");
    expect(previewFor(m)).toBe("📷 View once photo");
    expect(forwardBlockReason(m)).toMatch(/View once/);
    expect(canQuote(m)).toBe(false);
  });
});

describe("requestViewOnce", () => {
  it("resolves with the server's answer, and with an error when offline or timed out", async () => {
    const answer = { ok: true as const, url: "https://x/y", expiresInSeconds: 60 };
    const socket = { timeout: () => ({ emit: (_e: string, _p: unknown, cb: (e: Error | null, r?: typeof answer) => void) => cb(null, answer) }) };
    expect(await requestViewOnce(socket, "m1")).toEqual(answer);
    expect(await requestViewOnce(null, "m1")).toEqual({ ok: false, error: "You're offline" });
    const slow = { timeout: () => ({ emit: (_e: string, _p: unknown, cb: (e: Error | null) => void) => cb(new Error("t")) }) };
    expect((await requestViewOnce(slow, "m1")).ok).toBe(false);
  });
});
