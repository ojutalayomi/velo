/**
 * @jest-environment node
 */
import { ObjectId } from "mongodb";

import { POST } from "@/app/api/statuses/forward/route";
import { createStatusForUser } from "@/lib/statusCreate";
import { getAuthenticatedUserId } from "@/lib/statusServer";

const send = jest.fn();
jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: (...a: unknown[]) => send(...a) })),
  CopyObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
}));

const messages = { findOne: jest.fn() };
const participants = { findOne: jest.fn() };
const files = { findOne: jest.fn() };
const mockDb = { chatMessages: () => messages, chatParticipants: () => participants, files: () => files };
jest.mock("@/lib/mongodb", () => ({
  MongoDBClient: jest.fn().mockImplementation(() => ({ init: jest.fn().mockResolvedValue(mockDb) })),
}));
jest.mock("@/lib/statusCreate", () => ({ createStatusForUser: jest.fn() }));
jest.mock("@/lib/statusServer", () => ({
  ...jest.requireActual("@/lib/statusServer"),
  getAuthenticatedUserId: jest.fn(),
}));

const userId = new ObjectId().toString();
const messageId = new ObjectId().toString();
const req = (body: unknown) => new Request("http://x/api/statuses/forward", { method: "POST", body: JSON.stringify(body) });

beforeEach(() => {
  jest.clearAllMocks();
  (getAuthenticatedUserId as jest.Mock).mockResolvedValue(userId);
  (createStatusForUser as jest.Mock).mockResolvedValue({ group: { statuses: [] } });
  participants.findOne.mockResolvedValue({ _id: 1 });
});

describe("POST /api/statuses/forward", () => {
  it("requires sign-in and a real message id", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValueOnce(null);
    expect((await POST(req({ messageId }))).status).toBe(401);
    expect((await POST(req({ messageId: "nope" }))).status).toBe(400);
  });

  it("hides messages from chats the user isn't in", async () => {
    messages.findOne.mockResolvedValue({ _id: new ObjectId(messageId), chatId: "c", messageType: "Text", content: "hi", attachments: [] });
    participants.findOne.mockResolvedValue(null);
    expect((await POST(req({ messageId }))).status).toBe(404);
    expect(createStatusForUser).not.toHaveBeenCalled();
  });

  it("turns a text message into a text status", async () => {
    messages.findOne.mockResolvedValue({ _id: new ObjectId(messageId), chatId: "c", messageType: "Text", content: "hello", attachments: [] });
    const res = await POST(req({ messageId }));
    expect(res.status).toBe(201);
    expect(createStatusForUser).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({ mediaType: "text", text: "hello", background: "brand" }),
      mockDb
    );
    expect(send).not.toHaveBeenCalled();
  });

  it("refuses types that can't be shared", async () => {
    messages.findOne.mockResolvedValue({ _id: new ObjectId(messageId), chatId: "c", messageType: "Poll", content: "x", attachments: [] });
    expect((await POST(req({ messageId }))).status).toBe(422);
  });

  it("copies a photo into the status bucket first", async () => {
    messages.findOne.mockResolvedValue({ _id: new ObjectId(messageId), chatId: "c", messageType: "Image", content: "", attachments: ["k1"] });
    files.findOne.mockResolvedValue({ key: "abc-my pic.png", name: "my pic.png", type: "image/png" });
    const res = await POST(req({ messageId }));
    expect(res.status).toBe(201);
    const copy = send.mock.calls[0][0].input;
    expect(copy.Bucket).toBe("post-s");
    expect(copy.CopySource).toBe("files-for-chat/abc-my%20pic.png");
    const created = (createStatusForUser as jest.Mock).mock.calls[0][1];
    expect(created.mediaType).toBe("image");
    expect(created.mediaUrl).toContain("https://post-s.s3.amazonaws.com/status-forward/");
    expect(created.mediaUrl).toContain("my%20pic.png");
  });

  it("reports a file that is gone", async () => {
    messages.findOne.mockResolvedValue({ _id: new ObjectId(messageId), chatId: "c", messageType: "Video", content: "", attachments: ["k1"] });
    files.findOne.mockResolvedValue(null);
    expect((await POST(req({ messageId }))).status).toBe(410);
  });
});
