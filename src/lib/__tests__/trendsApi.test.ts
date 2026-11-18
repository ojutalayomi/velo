/** @jest-environment node */
import type { NextApiRequest, NextApiResponse } from "next";

import handle from "../../pages/api/trends";
import type { TrendsResponse } from "../trends";
import { getTrendsSnapshot } from "../trendsServer";

jest.mock("../trendsServer", () => ({ getTrendsSnapshot: jest.fn() }));

const snapshot: TrendsResponse = {
  data: Array.from({ length: 20 }, (_, i) => ({
    tag: `tag${i}`,
    postCount: 30 - i,
    authorCount: 3,
  })),
  windowHours: 24,
  generatedAt: "2026-11-02T12:00:00.000Z",
};
function response() {
  const res = { status: jest.fn(), json: jest.fn(), setHeader: jest.fn() };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}
function request(limit?: string | string[], method = "GET") {
  return { method, query: limit === undefined ? {} : { limit } } as NextApiRequest;
}
async function call(req: NextApiRequest) {
  const res = response();
  await handle(req, res as unknown as NextApiResponse);
  expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store");
  return res;
}
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getTrendsSnapshot).mockResolvedValue(snapshot);
});

describe("GET /api/trends", () => {
  it.each([
    [undefined, 5],
    ["1", 1],
    ["20", 20],
  ] as const)(
    "returns limit %p with window metadata without mutating the cached full snapshot",
    async (limit, count) => {
      const res = await call(request(limit));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ ...snapshot, data: snapshot.data.slice(0, count) });
      expect(snapshot.data).toHaveLength(20);
      expect(getTrendsSnapshot).toHaveBeenCalledTimes(1);
    }
  );
  it.each(["0", "21", "1.5", "1e1", "", " 5", ["5"], ["1", "2"]])(
    "rejects invalid limit %p before touching the database/cache",
    async (limit) => {
      const res = await call(request(limit));
      expect(res.status).toHaveBeenCalledWith(400);
      expect(getTrendsSnapshot).not.toHaveBeenCalled();
    }
  );
  it("rejects non-GET methods with Allow", async () => {
    const res = await call(request(undefined, "POST"));
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.setHeader).toHaveBeenCalledWith("Allow", "GET");
    expect(getTrendsSnapshot).not.toHaveBeenCalled();
  });
  it("returns a generic error and no-store on refresh failure", async () => {
    jest.mocked(getTrendsSnapshot).mockRejectedValueOnce(new Error("private db details"));
    const log = jest.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await call(request());
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "Internal Server Error" });
    } finally {
      log.mockRestore();
    }
  });
});
