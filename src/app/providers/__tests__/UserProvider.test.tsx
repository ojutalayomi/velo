import { configureStore } from "@reduxjs/toolkit";
import { act, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { Provider } from "react-redux";

import UserProvider, { useUser } from "@/app/providers/UserProvider";
import { writeCachedUser } from "@/lib/userCache";
import signupReducer from "@/redux/signupSlice";
import userReducer from "@/redux/userSlice";

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
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@/app/providers/SocketProvider", () => ({ useSocket: () => null }));
jest.mock("@/redux/chatSlice", () => ({ fetchChats: jest.fn() }));
jest.mock("sonner", () => ({ toast: { error: jest.fn() } }));

const fetchMock = jest.fn();

function setNetwork(online: boolean) {
  mockStatus = { ...mockStatus, online };
  act(() => mockListeners.forEach((listener) => listener(mockStatus)));
}

function Probe() {
  const { userdata } = useUser();
  return <p data-testid="user">{userdata._id || "none"}</p>;
}

function mount() {
  const store = configureStore({ reducer: { user: userReducer, signups: signupReducer } });
  render(
    <Provider store={store}>
      <UserProvider>
        <Probe />
      </UserProvider>
    </Provider>
  );
}

const savedUser = (id: string, ageMs = 0) =>
  localStorage.setItem(
    "userData",
    JSON.stringify({ data: { _id: id, name: id }, timestamp: Date.now() - ageMs })
  );

beforeEach(() => {
  localStorage.clear();
  mockListeners.clear();
  mockStatus = { ...mockStatus, online: true };
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

describe("UserProvider offline", () => {
  it("starts as the saved user when opened offline, even if the saved copy is old", async () => {
    mockStatus = { ...mockStatus, online: false };
    savedUser("stale-user", 24 * 60 * 60 * 1000); // a day old: far past the online expiry

    mount();

    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("stale-user"));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("has no user when offline with nothing saved (e.g. after logout)", async () => {
    mockStatus = { ...mockStatus, online: false };

    mount();

    await waitFor(() => expect(fetchMock).not.toHaveBeenCalled());
    expect(screen.getByTestId("user")).toHaveTextContent("none");
  });

  it("loads the current user from the server when online", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ _id: "server-user", name: "S" }) });

    mount();

    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("server-user"));
    expect(fetchMock).toHaveBeenCalledWith("/api/getuser");
  });

  it("swaps the saved user for the real one when the connection returns", async () => {
    mockStatus = { ...mockStatus, online: false };
    savedUser("stale-user", 24 * 60 * 60 * 1000);
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ _id: "fresh-user", name: "F" }) });

    mount();
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("stale-user"));
    expect(fetchMock).not.toHaveBeenCalled();

    setNetwork(true);

    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("fresh-user"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("picks up the user when a page opened offline with nothing saved comes online", async () => {
    mockStatus = { ...mockStatus, online: false };
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ _id: "late-user", name: "L" }) });

    mount();
    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("none"));

    setNetwork(true);

    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("late-user"));
  });

  it("does not use an expired saved copy when online", async () => {
    savedUser("stale-user", 24 * 60 * 60 * 1000);
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ _id: "server-user", name: "S" }) });

    mount();

    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("server-user"));
  });

  it("still uses a fresh saved copy online without asking the server", async () => {
    writeCachedUser({ _id: "recent-user", name: "R" } as never);

    mount();

    await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("recent-user"));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
