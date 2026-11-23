import { fetchChats } from "@/redux/chatSlice";

const mockGetAll = jest.fn();
const mockLoadSnapshot = jest.fn();

jest.mock("@/lib/class/ChatRepository", () => ({
  __esModule: true,
  default: class {
    getAllChats = (...args: unknown[]) => mockGetAll(...args);
    getChatsSince = jest.fn();
  },
}));
const mockSaveMeta = jest.fn();
const mockFlush = jest.fn();
jest.mock("@/lib/chatCache", () => ({
  loadChatSnapshot: (...args: unknown[]) => mockLoadSnapshot(...args),
  saveChatMeta: (...args: unknown[]) => mockSaveMeta(...args),
}));
jest.mock("@/redux/chatPersistence", () => ({
  flushChatPersistence: () => mockFlush(),
}));
jest.mock("@/lib/network", () => ({
  networkMonitor: { getNetworkStatus: () => ({ online: true }) },
}));

const response = { chats: [], chatSettings: {}, messages: [], requestId: "u1" };

/** A request the test resolves by hand, so calls can overlap. */
function deferred() {
  let resolve!: (value: unknown) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const dispatch = jest.fn();
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  jest.clearAllMocks();
  mockLoadSnapshot.mockResolvedValue(null);
  mockFlush.mockResolvedValue(true);
});

describe("fetchChats", () => {
  it("shares one request between overlapping calls for the same user", async () => {
    const pending = deferred();
    mockGetAll.mockReturnValue(pending.promise);

    const a = fetchChats(dispatch, "u1");
    const b = fetchChats(dispatch, "u1");
    await flush();
    pending.resolve(response);
    await Promise.all([a, b]);

    expect(mockGetAll).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
  });

  it("does not share between different users", async () => {
    mockGetAll.mockResolvedValue(response);

    await Promise.all([fetchChats(dispatch, "u1"), fetchChats(dispatch, "u2")]);

    expect(mockGetAll).toHaveBeenCalledTimes(2);
  });

  it("never shares calls without a userId, e.g. refreshing after joining by invite", async () => {
    const pending = deferred();
    mockGetAll.mockReturnValue(pending.promise);

    const a = fetchChats(dispatch);
    const b = fetchChats(dispatch);
    await flush();
    pending.resolve(response);
    await Promise.all([a, b]);

    expect(mockGetAll).toHaveBeenCalledTimes(2);
  });

  it("fetches again once the previous request has finished", async () => {
    mockGetAll.mockResolvedValue(response);

    await fetchChats(dispatch, "u1");
    await fetchChats(dispatch, "u1");

    expect(mockGetAll).toHaveBeenCalledTimes(2);
  });

  it("lets a retry through after a failed request", async () => {
    mockGetAll.mockRejectedValueOnce(new Error("offline")).mockResolvedValue(response);

    await expect(fetchChats(dispatch, "u1")).rejects.toThrow("offline");
    await expect(fetchChats(dispatch, "u1")).resolves.toBeDefined();

    expect(mockGetAll).toHaveBeenCalledTimes(2);
  });
});

describe("fetchChats and the cache", () => {
  const withTime = { ...response, serverTime: "2026-06-10T12:00:00.000Z" };
  const actions = () => dispatch.mock.calls.map(([action]) => action as { type: string; payload: unknown });

  it("records the sync cursor once the rows are stored", async () => {
    mockGetAll.mockResolvedValue(withTime);

    await fetchChats(dispatch, "u1");

    expect(mockFlush).toHaveBeenCalledTimes(1);
    expect(mockSaveMeta).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: "u1", serverTime: "2026-06-10T12:00:00.000Z" })
    );
  });

  it("does not record the cursor when the rows could not be stored", async () => {
    mockGetAll.mockResolvedValue(withTime);
    mockFlush.mockResolvedValue(false);

    await fetchChats(dispatch, "u1");

    expect(mockSaveMeta).not.toHaveBeenCalled();
  });

  it("paints the cached conversations before the network answers", async () => {
    const cachedConvo = { id: "c1", name: "Cached chat" };
    mockLoadSnapshot.mockResolvedValue({
      requestId: "u1",
      conversations: [cachedConvo],
      chatSettings: {},
      messages: [],
    });
    const pending = deferred();
    mockGetAll.mockReturnValue(pending.promise);

    const done = fetchChats(dispatch, "u1");
    await flush();

    const painted = actions().find((a) => a.type === "chat/setConversations");
    expect(painted?.payload).toEqual([cachedConvo]);
    expect(mockSaveMeta).not.toHaveBeenCalled(); // network hasn't answered yet

    pending.resolve(withTime);
    await done;
  });
});
