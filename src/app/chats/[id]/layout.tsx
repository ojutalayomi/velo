import type { Metadata,Viewport } from "next";
import React, {useState} from "react";
import ChatPage from './clientComps';

export const metadata: Metadata = {
  title: "Chats | Velo",
  description: "Created by Ayomide",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode;}>) {

    return (
      <ChatPage>
        {children}
      </ChatPage>
    )
}
