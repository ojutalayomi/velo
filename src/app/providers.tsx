"use client";
import React, { ReactNode } from "react";
import { Provider } from "react-redux";

import { CallProvider } from "@/components/call";
import NotificationLiveSync from "@/components/NotificationLiveSync";
import { Toaster } from "@/components/ui/sonner";
import { store } from "@/redux/store";


import NetworkProvider from "./providers/NetworkProvider";
import PostsProvider from "./providers/PostsProvider";
import SocketProvider, { useSocket } from "./providers/SocketProvider";
import StatusProvider from "./providers/StatusProvider";
import ThemeProvider from "./providers/ThemeProvider";
import UserProvider from "./providers/UserProvider";

const WithCallProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const socket = useSocket();
  if (!socket) return <>{children}</>;
  return <CallProvider socket={socket}>{children}</CallProvider>;
};

const Providers: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <Provider store={store}>
      <NetworkProvider>
        <UserProvider>
          <SocketProvider>
            <WithCallProvider>
              <PostsProvider>
                <StatusProvider>
                  <ThemeProvider>
                    <NotificationLiveSync />
                    {children}
                    <Toaster />
                  </ThemeProvider>
                </StatusProvider>
              </PostsProvider>
            </WithCallProvider>
          </SocketProvider>
        </UserProvider>
      </NetworkProvider>
    </Provider>
  );
};
export default Providers;
