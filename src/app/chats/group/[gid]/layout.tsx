import ChatPage from "./clientComps";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Group chat",
  description: "Group conversation on Velo.",
  robots: { index: false, follow: false },
};

export default function GroupChatLayout({ children }: { children: React.ReactNode }) {
  return <ChatPage>{children}</ChatPage>;
}
