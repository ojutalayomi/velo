import { act, render, screen } from "@testing-library/react";
import React from "react";

import SocketProvider, { useSocket } from "@/app/providers/SocketProvider";

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

const mockSocket = () => ({ on: jest.fn(), off: jest.fn(), emit: jest.fn(), disconnect: jest.fn() });
const mockIo = jest.fn();
jest.mock("socket.io-client", () => ({ __esModule: true, default: (...args: unknown[]) => mockIo(...args) }));
jest.mock("@/lib/socketToken", () => ({ getSocketToken: async () => "token" }));
const mockUser = { userdata: { _id: "u1" }, loading: false, error: null };
jest.mock("@/app/providers/UserProvider", () => ({ useUser: () => mockUser }));
const mockDispatch = jest.fn();
jest.mock("@/redux/hooks", () => ({ useAppDispatch: () => mockDispatch }));

function Probe() {
  const socket = useSocket();
  return <p data-testid="socket">{socket ? "socket" : "none"}</p>;
}

function setNetwork(online: boolean) {
  mockStatus = { ...mockStatus, online };
  act(() => mockListeners.forEach((listener) => listener(mockStatus)));
}

beforeEach(() => {
  mockListeners.clear();
  mockStatus = { ...mockStatus, online: true };
  mockIo.mockReset();
  mockIo.mockImplementation(() => mockSocket());
  globalThis.fetch = jest.fn(async () => ({ ok: false, json: async () => null })) as unknown as typeof fetch;
});

const mount = () =>
  render(
    <SocketProvider>
      <Probe />
    </SocketProvider>
  );

describe("SocketProvider connection", () => {
  it("connects when the page opens online", () => {
    mount();
    expect(mockIo).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("socket")).toHaveTextContent("socket");
  });

  it("does not connect while offline", () => {
    mockStatus = { ...mockStatus, online: false };
    mount();
    expect(mockIo).not.toHaveBeenCalled();
    expect(screen.getByTestId("socket")).toHaveTextContent("none");
  });

  it("connects once a page that was opened offline comes online (needed to send queued messages)", () => {
    mockStatus = { ...mockStatus, online: false };
    mount();

    setNetwork(true);

    expect(mockIo).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("socket")).toHaveTextContent("socket");
  });

  it("keeps the same socket across a dropped connection (socket.io reconnects by itself)", () => {
    mount();
    const first = mockIo.mock.results[0].value;

    setNetwork(false);
    setNetwork(true);

    expect(mockIo).toHaveBeenCalledTimes(1);
    expect(first.disconnect).not.toHaveBeenCalled();
  });
});
