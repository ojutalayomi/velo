"use client";
import React, { ReactNode } from "react";
import { Provider } from "react-redux";

import NotificationLiveSync from "@/components/NotificationLiveSync";
import { Toaster } from "@/components/ui/toast";
import { store } from "@/redux/store";


import NetworkProvider from "./providers/NetworkProvider";
import PostsProvider from "./providers/PostsProvider";
import SocketProvider from "./providers/SocketProvider";
import StatusProvider from "./providers/StatusProvider";
import ThemeProvider from "./providers/ThemeProvider";
import UserProvider from "./providers/UserProvider";
import WithCallProvider from "./providers/WithCallProvider";

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
