import { act, render, screen } from "@testing-library/react";
import React from "react";

import WithCallProvider from "@/app/providers/WithCallProvider";

let mockSocket: unknown = null;
const mockListeners = new Set<() => void>();
jest.mock("@/app/providers/SocketProvider", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  return {
    useSocket: () => {
      const [, force] = React.useReducer((n: number) => n + 1, 0);
      React.useEffect(() => {
        mockListeners.add(force as () => void);
        return () => void mockListeners.delete(force as () => void);
      }, []);
      return mockSocket;
    },
  };
});

const seenSockets: Array<{ connected: boolean }> = [];
jest.mock("@/components/call", () => ({
  CallProvider: ({ socket, children }: { socket: { connected: boolean }; children: React.ReactNode }) => {
    seenSockets.push(socket);
    return <div data-testid="call-provider">{children}</div>;
  },
}));

let mounts = 0;
let unmounts = 0;
function Child() {
  React.useEffect(() => {
    mounts += 1;
    return () => {
      unmounts += 1;
    };
  }, []);
  return <p>child</p>;
}

const socketArrives = (socket: { connected: boolean }) => {
  mockSocket = socket;
  act(() => mockListeners.forEach((listener) => listener()));
};

beforeEach(() => {
  mockSocket = null;
  mockListeners.clear();
  seenSockets.length = 0;
  mounts = 0;
  unmounts = 0;
});

describe("WithCallProvider", () => {
  it("renders the call provider from the start, so the app is not rebuilt when the socket appears", () => {
    render(
      <WithCallProvider>
        <Child />
      </WithCallProvider>
    );
    expect(screen.getByTestId("call-provider")).toBeInTheDocument();
    expect(mounts).toBe(1);

    socketArrives({ connected: true });

    expect(mounts).toBe(1); // not mounted again: nothing inside it fetches or starts a second time
    expect(unmounts).toBe(0);
    expect(screen.getByText("child")).toBeInTheDocument();
  });

  it("gives the call provider an offline stand-in first, then the real socket", () => {
    render(
      <WithCallProvider>
        <Child />
      </WithCallProvider>
    );
    expect(seenSockets[0].connected).toBe(false);
    const stand = seenSockets[0] as unknown as { on: () => unknown; off: () => unknown; emit: () => unknown };
    expect(() => {
      stand.on();
      stand.off();
      stand.emit();
    }).not.toThrow();

    const real = { connected: true };
    socketArrives(real);

    expect(seenSockets[seenSockets.length - 1]).toBe(real);
  });
});
