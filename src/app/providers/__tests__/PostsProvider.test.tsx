import { configureStore } from "@reduxjs/toolkit";
import { act, render, waitFor } from "@testing-library/react";
import React from "react";
import { Provider } from "react-redux";

import PostsProvider from "@/app/providers/PostsProvider";
import followingReducer from "@/redux/followingFeedSlice";
import postsReducer from "@/redux/postsSlice";
import userReducer, { setUserData } from "@/redux/userSlice";

const mockListeners = new Set<(status: unknown) => void>();
let mockStatus = { online: true, effectiveType: "4g", downlink: 10, rtt: 50, saveData: false };

jest.mock("@/lib/network", () => ({
  networkMonitor: {
    getNetworkStatus: () => mockStatus,
    subscribe: (callback: (status: unknown) => void) => {
      mockListeners.add(callback);
      callback(mockStatus);
      return () => mockListeners.delete(callback);
    },
  },
}));

const mockFetchPosts = jest.fn();
const mockFetchFollowing = jest.fn();
const mockFetchStatus = jest.fn();
jest.mock("@/lib/getStatus", () => ({
  fetchPostsPage: (...a: unknown[]) => mockFetchPosts(...a),
  fetchFollowingPostsPage: (...a: unknown[]) => mockFetchFollowing(...a),
  fetchStatusPage: (...a: unknown[]) => mockFetchStatus(...a),
}));

const mockLoadFeed = jest.fn();
const mockSaveFeed = jest.fn();
jest.mock("@/lib/feedCache", () => ({
  loadFeed: (...a: unknown[]) => mockLoadFeed(...a),
  saveFeed: (...a: unknown[]) => mockSaveFeed(...a),
}));

const pagination = { skip: 0, limit: 20, hasMore: false };
const post = (id: string) => ({ PostID: id }) as never;
const saved = (data: unknown[]) => ({ key: "x", userId: "u1", data, pagination, savedAt: 1 });

function setNetwork(online: boolean) {
  mockStatus = { ...mockStatus, online };
  act(() => mockListeners.forEach((listener) => listener(mockStatus)));
}

function mount(userId = "u1") {
  const store = configureStore({
    reducer: { posts: postsReducer, followingFeed: followingReducer, user: userReducer },
  });
  store.dispatch(setUserData({ _id: userId } as never));
  render(
    <Provider store={store}>
      <PostsProvider>
        <div />
      </PostsProvider>
    </Provider>
  );
  return store;
}

beforeEach(() => {
  mockListeners.clear();
  mockStatus = { ...mockStatus, online: true };
  jest.clearAllMocks();
  mockLoadFeed.mockResolvedValue(null);
  mockFetchPosts.mockResolvedValue({ data: [post("fresh")], pagination });
  mockFetchFollowing.mockResolvedValue({ data: [post("fresh-f")], pagination });
  mockFetchStatus.mockResolvedValue({ data: ["a.png"], pagination });
});

describe("PostsProvider feeds", () => {
  it("shows the saved feeds before the fresh ones arrive", async () => {
    mockLoadFeed.mockImplementation(async (key: string) =>
      key === "forYou" ? saved([post("old")]) : key === "following" ? saved([post("old-f")]) : null
    );
    // The server never answers in this test.
    mockFetchPosts.mockReturnValue(new Promise(() => {}));
    mockFetchFollowing.mockReturnValue(new Promise(() => {}));
    mockFetchStatus.mockReturnValue(new Promise(() => {}));

    const store = mount();

    await waitFor(() => expect(store.getState().posts.posts).toEqual([post("old")]));
    expect(store.getState().posts.loading).toBe(false);
    expect(store.getState().followingFeed.posts).toEqual([post("old-f")]);
  });

  it("replaces the saved feed with the fresh one and saves it for this user", async () => {
    mockLoadFeed.mockImplementation(async (key: string) => (key === "forYou" ? saved([post("old")]) : null));

    const store = mount();

    await waitFor(() => expect(store.getState().posts.posts).toEqual([post("fresh")]));
    expect(mockSaveFeed).toHaveBeenCalledWith("forYou", "u1", [post("fresh")], pagination);
    expect(mockSaveFeed).toHaveBeenCalledWith("following", "u1", [post("fresh-f")], pagination);
    expect(mockSaveFeed).toHaveBeenCalledWith("status", "u1", ["a.png"], pagination);
  });

  it("opened offline: shows the saved feed and asks the server for nothing", async () => {
    mockStatus = { ...mockStatus, online: false };
    mockLoadFeed.mockImplementation(async (key: string) => (key === "forYou" ? saved([post("old")]) : null));

    const store = mount();

    await waitFor(() => expect(store.getState().posts.posts).toEqual([post("old")]));
    expect(mockFetchPosts).not.toHaveBeenCalled();
    expect(mockFetchFollowing).not.toHaveBeenCalled();
  });

  it("opened offline with nothing saved: says so instead of loading forever", async () => {
    mockStatus = { ...mockStatus, online: false };

    const store = mount();

    await waitFor(() => expect(store.getState().posts.loading).toBe(false));
    expect(store.getState().posts.error).toBe("You're offline");
    expect(store.getState().followingFeed.error).toBe("You're offline");
  });

  it("loads the fresh feeds when a page opened offline comes online", async () => {
    mockStatus = { ...mockStatus, online: false };
    const store = mount();
    await waitFor(() => expect(store.getState().posts.loading).toBe(false));
    expect(mockFetchPosts).not.toHaveBeenCalled();

    setNetwork(true);

    await waitFor(() => expect(store.getState().posts.posts).toEqual([post("fresh")]));
    expect(store.getState().posts.error).toBeNull();
  });

  it("keeps the saved feed on screen when the refresh fails", async () => {
    mockLoadFeed.mockImplementation(async (key: string) => (key === "forYou" ? saved([post("old")]) : null));
    mockFetchPosts.mockRejectedValue(new Error("Failed to fetch"));

    const store = mount();

    await waitFor(() => expect(store.getState().posts.posts).toEqual([post("old")]));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(store.getState().posts.posts).toEqual([post("old")]);
    expect(store.getState().posts.error).toBeNull();
  });

  it("does not refetch on every connection-quality change", async () => {
    mount();
    await waitFor(() => expect(mockFetchPosts).toHaveBeenCalledTimes(1));

    act(() => mockListeners.forEach((listener) => listener({ ...mockStatus, effectiveType: "3g" })));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(mockFetchPosts).toHaveBeenCalledTimes(1);
  });
});
