/**
 * @jest-environment node
 */
import webpush from "web-push";

import { sendPushToUserIds } from "@/lib/push";

jest.mock("web-push", () => ({
  __esModule: true,
  default: {
    setVapidDetails: jest.fn(),
    sendNotification: jest.fn(),
  },
}));

jest.mock("@/lib/mongodb", () => {
  const deleteOne = jest.fn();
  const toArray = jest.fn();
  const collection = {
    find: jest.fn(() => ({ toArray })),
    deleteOne,
    createIndex: jest.fn(),
  };

  return {
    MongoDBClient: jest.fn().mockImplementation(() => ({
      init: jest.fn().mockResolvedValue({ pushSubscriptions: () => collection }),
    })),
    __pushMock: { deleteOne, toArray },
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pushMock = (require("@/lib/mongodb") as { __pushMock: { deleteOne: jest.Mock; toArray: jest.Mock } })
  .__pushMock;

const sendNotification = webpush.sendNotification as jest.Mock;

const subscription = {
  _id: "sub-1",
  userId: "user-1",
  endpoint: "https://push.example/endpoint",
  keys: { p256dh: "key", auth: "auth" },
  expirationTime: null,
  userAgent: "",
  createdAt: "",
  updatedAt: "",
};

function pushError(statusCode: number) {
  return Object.assign(new Error(`status ${statusCode}`), { statusCode });
}

describe("sendPushToUserIds retry and pruning", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "public-key";
    process.env.VAPID_PRIVATE_KEY = "private-key";
    sendNotification.mockReset();
    pushMock.deleteOne.mockReset();
    pushMock.toArray.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  async function run(userIds = ["user-1"]) {
    const promise = sendPushToUserIds(userIds, { title: "Hi", body: "There" });
    await jest.runAllTimersAsync();
    return promise;
  }

  it("prunes 404 subscriptions without retrying", async () => {
    pushMock.toArray.mockResolvedValue([subscription]);
    sendNotification.mockRejectedValue(pushError(404));

    await expect(run()).resolves.toEqual({
      sent: 0,
      failed: 0,
      pruned: 1,
      skipped: false,
    });

    expect(sendNotification).toHaveBeenCalledTimes(1);
    expect(pushMock.deleteOne).toHaveBeenCalledWith({ _id: "sub-1" });
  });

  it("prunes 410 subscriptions", async () => {
    pushMock.toArray.mockResolvedValue([subscription]);
    sendNotification.mockRejectedValue(pushError(410));

    await expect(run()).resolves.toMatchObject({ pruned: 1, failed: 0, sent: 0 });
    expect(pushMock.deleteOne).toHaveBeenCalledTimes(1);
  });

  it("retries 5xx responses and reports success", async () => {
    pushMock.toArray.mockResolvedValue([subscription]);
    sendNotification
      .mockRejectedValueOnce(pushError(500))
      .mockRejectedValueOnce(pushError(503))
      .mockResolvedValueOnce({ statusCode: 201 });

    await expect(run()).resolves.toMatchObject({ sent: 1, failed: 0, pruned: 0 });
    expect(sendNotification).toHaveBeenCalledTimes(3);
  });

  it("gives up after three attempts for persistent 5xx errors", async () => {
    pushMock.toArray.mockResolvedValue([subscription]);
    sendNotification.mockRejectedValue(pushError(502));

    await expect(run()).resolves.toMatchObject({ sent: 0, failed: 1 });
    expect(sendNotification).toHaveBeenCalledTimes(3);
  });

  it("retries 429 responses", async () => {
    pushMock.toArray.mockResolvedValue([subscription]);
    sendNotification.mockRejectedValueOnce(pushError(429)).mockResolvedValueOnce({});

    await expect(run()).resolves.toMatchObject({ sent: 1 });
    expect(sendNotification).toHaveBeenCalledTimes(2);
  });

  it("retries network errors without a status code", async () => {
    pushMock.toArray.mockResolvedValue([subscription]);
    sendNotification.mockRejectedValueOnce(new Error("socket hang up")).mockResolvedValueOnce({});

    await expect(run()).resolves.toMatchObject({ sent: 1 });
    expect(sendNotification).toHaveBeenCalledTimes(2);
  });

  it("does not retry other 4xx responses", async () => {
    pushMock.toArray.mockResolvedValue([subscription]);
    sendNotification.mockRejectedValue(pushError(400));

    await expect(run()).resolves.toMatchObject({ sent: 0, failed: 1, pruned: 0 });
    expect(sendNotification).toHaveBeenCalledTimes(1);
  });

  it("returns skipped when no user ids are supplied", async () => {
    await expect(run([])).resolves.toEqual({
      sent: 0,
      failed: 0,
      pruned: 0,
      skipped: true,
    });
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it("counts across multiple subscriptions", async () => {
    pushMock.toArray.mockResolvedValue([
      subscription,
      { ...subscription, _id: "sub-2", endpoint: "https://push.example/two" },
      { ...subscription, _id: "sub-3", endpoint: "https://push.example/three" },
    ]);
    sendNotification
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(pushError(410))
      .mockRejectedValueOnce(pushError(400));

    await expect(run()).resolves.toEqual({
      sent: 1,
      failed: 1,
      pruned: 1,
      skipped: false,
    });
  });
});
