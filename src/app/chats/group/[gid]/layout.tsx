import ChatPage from "./clientComps";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Group Chat",
  description: "Group Chat",
};

export default function GroupChatLayout({ children }: { children: React.ReactNode }) {
  return <ChatPage>{children}</ChatPage>;
}
