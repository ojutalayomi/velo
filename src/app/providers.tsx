'use client'
import React, { ReactNode } from 'react';
import { Provider } from "react-redux";
import { store } from "@/redux/store";
import NetworkProvider from './providers/NetworkProvider';
import SocketProvider, { useSocket } from './providers/SocketProvider';
import PostsProvider from './providers/PostsProvider';
import ThemeProvider from './providers/ThemeProvider';
import UserProvider from './providers/UserProvider';
import { CallProvider } from '@/components/call';

const WithCallProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const socket = useSocket();
  if (!socket) return <>{children}</>;
  return (
    <CallProvider socket={socket}>
      {children}
    </CallProvider>
  );
};

const Providers: React.FC<{ children: ReactNode }> = ({ children }) => {

  return (
    <Provider store={store}>
      <NetworkProvider>
        <UserProvider>
          <SocketProvider>
            <WithCallProvider>
              <PostsProvider>
                <ThemeProvider>
                  {children}
                </ThemeProvider>
              </PostsProvider>
            </WithCallProvider>
          </SocketProvider>
        </UserProvider>
      </NetworkProvider>
    </Provider>
  )
}
export default Providers;