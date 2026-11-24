"use client";
import React, { ReactNode } from "react";
import type { Socket } from "socket.io-client";

import { CallProvider } from "@/components/call";

import { useSocket } from "./SocketProvider";

/**
 * Stands in for the socket until the real one exists. It reports "not connected", so placing a
 * call says "You are offline" (as before), and it never emits or listens.
 *
 * Why it exists: the call provider used to be added around the app only once the socket appeared.
 * Changing what wraps `children` makes React remount everything inside it, so the whole app
 * (including the home feeds, which fetch on mount) started twice on a cold load. Rendering the
 * same provider all the time, with this stand-in first, keeps the tree the same shape.
 */
const NO_SOCKET = {
  connected: false,
  id: undefined,
  on: () => NO_SOCKET,
  off: () => NO_SOCKET,
  emit: () => NO_SOCKET,
} as unknown as Socket;

const WithCallProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const socket = useSocket();
  return <CallProvider socket={socket ?? NO_SOCKET}>{children}</CallProvider>;
};

export default WithCallProvider;
