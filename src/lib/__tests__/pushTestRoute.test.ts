/**
 * @jest-environment node
 */
import { POST } from "@/app/api/push/test/route";
import { getSessionUserId } from "@/lib/auth";
import { isPushConfigured, sendPushToUserId } from "@/lib/push";

jest.mock("@/lib/auth", () => ({
  getSessionUserId: jest.fn(),
}));

jest.mock("@/lib/push", () => ({
  isPushConfigured: jest.fn(),
  sendPushToUserId: jest.fn(),
}));

const getSessionUserIdMock = getSessionUserId as jest.Mock;
const isPushConfiguredMock = isPushConfigured as jest.Mock;
const sendPushToUserIdMock = sendPushToUserId as jest.Mock;

describe("POST /api/push/test", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    getSessionUserIdMock.mockResolvedValue("user-1");
    isPushConfiguredMock.mockReturnValue(true);
  });

  it("returns 401 without a session", async () => {
    getSessionUserIdMock.mockResolvedValue(null);
    const response = await POST();
    expect(response.status).toBe(401);
  });

  it("returns 503 when push is not configured", async () => {
    isPushConfiguredMock.mockReturnValue(false);
    const response = await POST();
    expect(response.status).toBe(503);
  });

  it("returns 404 when the user has no subscriptions", async () => {
    sendPushToUserIdMock.mockResolvedValue({
      sent: 0,
      failed: 0,
      pruned: 0,
      skipped: false,
    });

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.message).toMatch(/No active push subscription/i);
  });

  it("returns 502 when every delivery fails", async () => {
    sendPushToUserIdMock.mockResolvedValue({
      sent: 0,
      failed: 2,
      pruned: 1,
      skipped: false,
    });

    const response = await POST();
    expect(response.status).toBe(502);
  });

  it("returns counts when at least one send succeeds", async () => {
    sendPushToUserIdMock.mockResolvedValue({
      sent: 1,
      failed: 1,
      pruned: 0,
      skipped: false,
    });

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ sent: 1, failed: 1, pruned: 0, skipped: false });
    expect(sendPushToUserIdMock).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ tag: "test" })
    );
  });
});
