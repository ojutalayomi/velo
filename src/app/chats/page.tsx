"use client";
import React from "react";
import { Send } from "lucide-react";
import { useRouter } from "next/navigation";

const ChatPage: React.FC = () => {
  const router = useRouter();

  return (
    <div
      className={`bg-white tablets1:bg-white/55 tablets1:flex hidden dark:bg-black/55 shadow-md flex-col min-h-screen flex-1 rounded-lg overflow-hidden absolute tablets1:relative tablets1:w-auto h-full w-full`}
    >
      <div className="p-4 flex flex-col flex-1 justify-center gap-2 items-center">
        <h1 className="dark:text-white font-semibold text-2xl">Select a message</h1>
        <p className="dark:text-slate-200 text-sm text-center">
          Choose from your existing conversations, start a new one, or just keep swimming.
        </p>
        <button
          onClick={() => router.push("/chats/compose")}
          className="bg-brand flex items-center justify-center gap-2 text-white px-4 py-3 rounded-full hover:bg-tomatom focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <span>New message</span>
          <Send size={20} />
        </button>
      </div>
    </div>
  );
};

export default ChatPage;
