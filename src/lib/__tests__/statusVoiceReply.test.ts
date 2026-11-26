import { replyToStatusWithVoice } from "@/lib/statusApi";

const sender = { id: "me", name: "Me", username: "me", displayPicture: "", verified: false };
// jsdom's File has no arrayBuffer(); browsers do.
const file = () => {
  const f = new File([new Uint8Array([1, 2, 3])], "voice-note-1-3s.mp3", { type: "audio/mpeg" });
  f.arrayBuffer = async () => new Uint8Array([1, 2, 3]).buffer;
  return f;
};

describe("replyToStatusWithVoice", () => {
  it("gets the DM, then sends a voice message that names the status", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { chatId: "c1", receiverId: "owner" } }),
    }) as unknown as typeof fetch;
    const socket = { emit: jest.fn() };
    const out = await replyToStatusWithVoice({ socket, statusId: "s1", file: file(), sender });
    expect(out).toEqual({ chatId: "c1" });
    const [event, msg] = socket.emit.mock.calls[0];
    expect(event).toBe("chatMessage");
    expect(msg).toMatchObject({
      chatId: "c1",
      receiverId: "owner",
      messageType: "VoiceNote",
      statusReply: { statusId: "s1" },
    });
    expect(msg.attachments[0]).toMatchObject({ name: "voice-note-1-3s.mp3", type: "audio/mpeg", data: [1, 2, 3] });
  });

  it("sends nothing when the server refuses, or when offline", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ message: "You can't reply to this status" }),
    }) as unknown as typeof fetch;
    const socket = { emit: jest.fn() };
    await expect(replyToStatusWithVoice({ socket, statusId: "s1", file: file(), sender })).rejects.toThrow();
    expect(socket.emit).not.toHaveBeenCalled();
    await expect(replyToStatusWithVoice({ socket: null, statusId: "s1", file: file(), sender })).rejects.toThrow(/offline/);
  });
});
