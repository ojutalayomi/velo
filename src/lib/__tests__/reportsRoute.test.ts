/**
 * @jest-environment node
 */
import type { NextApiRequest, NextApiResponse } from "next";

import { verifyToken } from "@/lib/auth";
import handler from "@/pages/api/reports";

const reports = { findOne: jest.fn(), insertOne: jest.fn() };
const participants = { findOne: jest.fn() };
const mockDb = {
  chatParticipants: () => participants,
  getDb: async () => ({ collection: () => reports }),
};

jest.mock("@/lib/mongodb", () => ({
  MongoDBClient: jest.fn().mockImplementation(() => ({ init: jest.fn().mockResolvedValue(mockDb) })),
}));
jest.mock("@/lib/auth", () => ({ verifyToken: jest.fn() }));

function call(body: Record<string, unknown>, method = "POST") {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    setHeader: jest.fn(),
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  const req = { method, cookies: { velo_12: "token" }, body } as unknown as NextApiRequest;
  return handler(req, res as unknown as NextApiResponse).then(() => res);
}

beforeEach(() => {
  jest.clearAllMocks();
  (verifyToken as jest.Mock).mockResolvedValue({ _id: "me" });
  reports.findOne.mockResolvedValue(null);
  participants.findOne.mockResolvedValue({ _id: "row" });
});

describe("POST /api/reports", () => {
  it("files a report against a person", async () => {
    const res = await call({ type: "user", targetId: "ada", reason: "spam" });
    expect(res.statusCode).toBe(201);
    expect(reports.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({ type: "user", targetId: "ada", reporterId: "me", reason: "spam", status: "open" })
    );
  });

  it("files a report against a group the reporter is in", async () => {
    const res = await call({ type: "group", targetId: "g1", reason: "harassment", details: " rude " });
    expect(res.statusCode).toBe(201);
    expect(participants.findOne).toHaveBeenCalledWith({ chatId: "g1", userId: "me" }, expect.anything());
    expect(reports.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({ type: "group", targetId: "g1", details: "rude" })
    );
  });

  it("refuses to report a group the reporter is not in", async () => {
    participants.findOne.mockResolvedValue(null);
    const res = await call({ type: "group", targetId: "g1", reason: "spam" });
    expect(res.statusCode).toBe(403);
    expect(reports.insertOne).not.toHaveBeenCalled();
  });

  it("takes one report per person per target", async () => {
    reports.findOne.mockResolvedValue({ _id: "old" });
    const res = await call({ type: "group", targetId: "g1", reason: "spam" });
    expect(res.statusCode).toBe(200);
    expect(reports.insertOne).not.toHaveBeenCalled();
  });

  it("rejects bad input and reporting yourself", async () => {
    expect((await call({ type: "chat", targetId: "g1", reason: "spam" })).statusCode).toBe(400);
    expect((await call({ type: "group", targetId: "g1", reason: "nope" })).statusCode).toBe(400);
    expect((await call({ type: "user", targetId: "me", reason: "spam" })).statusCode).toBe(400);
  });

  it("needs a signed-in user", async () => {
    (verifyToken as jest.Mock).mockResolvedValue(null);
    expect((await call({ type: "user", targetId: "ada", reason: "spam" })).statusCode).toBe(401);
  });
});
