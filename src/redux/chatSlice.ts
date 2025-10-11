// redux/chatSlice.ts
import { createSlice, Dispatch, PayloadAction } from "@reduxjs/toolkit";

import { Chat } from "@/lib/class/Chat";
import ChatRepository from "@/lib/class/ChatRepository";
import ChatSystem from "@/lib/class/chatSystem";
import { networkMonitor } from "@/lib/network";
import {
  ChatType,
  ConvoType,
  MessageAttributes,
  NewChatSettings,
  Reaction,
} from "@/lib/types/type";

import { UserDataPartial } from "./userSlice";
export type { ConvoType };

const chatRepository = new ChatRepository();

const chatSystem = new ChatSystem(chatRepository);

interface ChatSetting {
  [x: string]: NewChatSettings;
}

const defaultSettings = {
  _id: "",
  chatId: "",
  isMuted: false,
  isPinned: false,
  isArchived: false,
  notificationSound: "",
  notificationVolume: 0,
  wallpaper: "",
  theme: "light",
  isPrivate: false,
  inviteLink: "",
  members: [],
  adminIds: [],
  isBlocked: false,
  lastSeen: "",
};
export { defaultSettings };

const stt = {
  "": defaultSettings,
};

const chatSlice = createSlice({
  name: "chat",
  initialState: {
    conversations: [] as unknown as ConvoType[],
    messages: [] as unknown as MessageAttributes[],
    deletedConversations: [] as unknown as ConvoType[],
    newGroupMembers: [] as unknown as UserDataPartial[],
    groupDisplayPicture: null as File | null,
    settings: stt as unknown as ChatSetting,
    loading: true,
    error: "",
    userId: "",
    newChat: {
      type: "" as ChatType,
      name: "",
      description: "",
      participants: [],
      displayPicture: "",
      lastMessage: "",
      timestamp: "",
    },
  },
  reducers: {
    setConversations: (state, action: PayloadAction<ConvoType[]>) => {
      state.conversations = action.payload;
    },
    addConversation: (state, action: PayloadAction<ConvoType>) => {
      if (!state.conversations.some((convo) => convo.id === action.payload.id)) {
        state.conversations.push(action.payload);
      }
    },
    updateConversation: (
      state,
      action: PayloadAction<{ id: string; updates: Partial<ConvoType> }>
    ) => {
      const { id, updates } = action.payload;
      state.conversations = state.conversations.map((convo) =>
        convo.id === id
          ? {
              ...convo,
              ...Object.fromEntries(Object.entries(updates).map(([key, value]) => [key, value])),
            }
          : convo
      );
    },
    updateMessageReactions: (state, action: PayloadAction<{ id: string; updates: Reaction }>) => {
      const { id, updates } = action.payload;
      state.messages = state.messages.map((msg) => {
        if (msg._id === id) {
          // Check if user already reacted
          const existingReactionIndex = msg.reactions.findIndex((r) => r.userId === updates.userId);

          if (existingReactionIndex !== -1) {
            // If same reaction, remove it
            if (msg.reactions[existingReactionIndex].reaction === updates.reaction) {
              msg.reactions = msg.reactions.filter((r) => r.userId !== updates.userId);
            } else {
              // If different reaction, update it
              msg.reactions[existingReactionIndex] = updates;
            }
          } else {
            // Add new reaction
            msg.reactions.push(updates);
          }
          return msg;
        }
        return msg;
      });
    },
    deleteConversation: (state, action: PayloadAction<string>) => {
      const deletedConvo = state.conversations.find((convo) => convo.id === action.payload);
      if (deletedConvo) {
        // Add to deletedConversations array
        state.deletedConversations = [...state.deletedConversations, deletedConvo];
        // Remove from active conversations
        state.conversations = state.conversations.filter((convo) => convo.id !== action.payload);
      }
    },
    setMessages: (state, action: PayloadAction<MessageAttributes[]>) => {
      state.messages = action.payload;
    },
    addMessage: (state, action: PayloadAction<MessageAttributes>) => {
      if (!state.messages.some((msg) => msg._id === action.payload._id)) {
        state.messages.push(action.payload);
      }
    },
    editMessage: (state, action: PayloadAction<{ id: string; content: string }>) => {
      state.messages = state.messages?.map((msg) =>
        msg._id === action.payload.id ? { ...msg, content: action.payload.content } : msg
      );
    },
    updateMessage: (
      state,
      action: PayloadAction<{ id?: string; updates: Partial<MessageAttributes> }>
    ) => {
      const { id, updates } = action.payload;

      let targetId = id;

      // If id is undefined, find the last message with matching senderId
      if (targetId === undefined) {
        const lastMatchingMessage = state.messages
          .slice()
          .reverse()
          .find((msg) => {
            return msg?.sender?.id === state.userId;
          });

        if (lastMatchingMessage) {
          targetId = lastMatchingMessage._id as string;
        } else {
          // If no matching message is found, return the state unchanged
          return;
        }
      }

      state.messages = state.messages.map((msg) =>
        msg._id === targetId
          ? {
              ...msg,
              ...Object.fromEntries(Object.entries(updates).map(([key, value]) => [key, value])),
            }
          : msg
      );
    },
    deleteMessage: (state, action: PayloadAction<string>) => {
      state.messages = state.messages?.filter((msg) => msg._id !== action.payload);
    },
    setSettings: (state, action: PayloadAction<ChatSetting>) => {
      state.settings = action.payload;
    },
    addSetting: (state, action: PayloadAction<{ [key: string]: NewChatSettings }>) => {
      state.settings = { ...state.settings, ...action.payload };
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
    setUserId: (state, action: PayloadAction<string>) => {
      state.userId = action.payload;
    },
    setNewGroupMembers: (state, action: PayloadAction<UserDataPartial[]>) => {
      state.newGroupMembers = action.payload;
    },
    setGroupDisplayPicture: (state, action: PayloadAction<File | null>) => {
      state.groupDisplayPicture = action.payload;
    },
  },
});

export const {
  setConversations,
  addConversation,
  updateConversation,
  updateMessageReactions,
  deleteConversation,
  setMessages,
  addMessage,
  editMessage,
  updateMessage,
  deleteMessage,
  setSettings,
  addSetting,
  setLoading,
  setError,
  setUserId,
  setNewGroupMembers,
  setGroupDisplayPicture,
} = chatSlice.actions;
export default chatSlice.reducer;

// Fetch chats on app load
export const fetchChats = async (dispatch: Dispatch) => {
  try {
    const networkStatus = networkMonitor.getNetworkStatus();

    if (!networkStatus.online) return;

    dispatch(setLoading(true));
    const chats = await chatSystem.getAllChats();

    const uid = chats.requestId;
    dispatch(setUserId(uid));

    const conversations = chats.chats?.map(chat => {
      return new Chat(chat, chats.messages).getConvo(uid)
    });

    dispatch(setConversations(conversations));
    dispatch(setMessages(chats.messages as MessageAttributes[]));
    dispatch(setSettings(chats.chatSettings));
    return conversations;
  } catch (error) {
    dispatch(setError("Failed to fetch chats"));
    throw error;
  } finally {
    dispatch(setLoading(false));
  }
};
