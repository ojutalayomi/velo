'use client'
import React, { ReactNode } from 'react';
import { Provider } from "react-redux";
import { store } from "@/redux/store";
import NetworkProvider from './providers/NetworkProvider';
import SocketProvider from './providers/SocketProvider';
import PostsProvider from './providers/PostsProvider';
import ThemeProvider from './providers/ThemeProvider';
import UserProvider from './providers/UserProvider';

const Providers: React.FC<{ children: ReactNode }> = ({ children }) => {

  return (
    <Provider store={store}>
      <NetworkProvider>
        <UserProvider>
          <SocketProvider>
            <PostsProvider>
              <ThemeProvider>
                {children}
              </ThemeProvider>
            </PostsProvider>
          </SocketProvider>
        </UserProvider>
      </NetworkProvider>
    </Provider>
  )
}
export default Providers;