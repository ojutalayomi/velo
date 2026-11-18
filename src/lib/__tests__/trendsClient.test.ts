const snapshot = () => ({
  data: [{ tag: "velo", postCount: 5, authorCount: 3 }],
  windowHours: 24,
  generatedAt: new Date().toISOString(),
});

beforeEach(() => {
  jest.resetModules();
  jest.useFakeTimers();
  global.fetch = jest
    .fn()
    .mockImplementation(async () => ({ ok: true, json: async () => snapshot() }));
});
afterEach(() => jest.useRealTimers());

it("fetches the full list and coalesces concurrent sidebar/page requests", async () => {
  const store = await import("../trendsClient");
  const listener = jest.fn();
  const unsubscribe = store.subscribeTrends(listener);
  await Promise.all([store.refreshTrends(), store.refreshTrends()]);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledWith(
    "/api/trends?limit=20",
    expect.objectContaining({ cache: "no-store" })
  );
  expect(store.getTrendsState()).toMatchObject({
    loading: false,
    error: false,
    snapshot: snapshot(),
  });
  expect(listener).toHaveBeenCalled();
  unsubscribe();
});
it("reuses a fresh snapshot across mounts and reloads after expiry", async () => {
  const store = await import("../trendsClient");
  await store.refreshTrends();
  await store.refreshTrends();
  expect(fetch).toHaveBeenCalledTimes(1);
  jest.advanceTimersByTime(300_001);
  await store.refreshTrends();
  expect(fetch).toHaveBeenCalledTimes(2);
});
it("does not add five minutes to an already nearly expired server snapshot", async () => {
  jest
    .mocked(fetch)
    .mockResolvedValue({
      ok: true,
      json: async () => ({
        ...snapshot(),
        generatedAt: new Date(Date.now() - 299_000).toISOString(),
      }),
    } as Response);
  const store = await import("../trendsClient");
  await store.refreshTrends();
  jest.advanceTimersByTime(1001);
  await store.refreshTrends();
  expect(fetch).toHaveBeenCalledTimes(2);
});
it("preserves previous results on failure and permits a forced retry", async () => {
  const store = await import("../trendsClient");
  await store.refreshTrends();
  const previous = store.getTrendsState().snapshot;
  jest.mocked(fetch).mockRejectedValueOnce(new Error("Offline"));
  await store.refreshTrends(true);
  expect(store.getTrendsState()).toEqual({ snapshot: previous, loading: false, error: true });
  await store.refreshTrends(true);
  expect(store.getTrendsState().error).toBe(false);
});
it("rejects malformed successful responses without poisoning the cache", async () => {
  jest
    .mocked(fetch)
    .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) } as Response);
  const store = await import("../trendsClient");
  await store.refreshTrends();
  expect(store.getTrendsState()).toEqual({ snapshot: null, loading: false, error: true });
  await store.refreshTrends();
  expect(store.getTrendsState().snapshot).not.toBeNull();
});
it("exposes a stable server snapshot without starting requests", async () => {
  const store = await import("../trendsClient");
  expect(store.getServerTrendsState()).toBe(store.getServerTrendsState());
  expect(fetch).not.toHaveBeenCalled();
});
