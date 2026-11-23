// redux/chatSlice.ts
import { createSlice, Dispatch, PayloadAction } from "@reduxjs/toolkit";

import { Chat } from "@/lib/class/Chat";
import ChatRepository from "@/lib/class/ChatRepository";
import ChatSystem from "@/lib/class/chatSystem";
import { type ChatSnapshot, loadChatSnapshot, saveChatMeta } from "@/lib/chatCache";
import { deltaOverflowed, mergeDelta, sinceForCache } from "@/lib/chatSync";
import { networkMonitor } from "@/lib/network";
import {
  AllChats,
  ChatType,
  ConvoType,
  MessageAttributes,
  NewChatSettings,
  Reaction,
} from "@/lib/types/type";

import { UserDataPartial } from "./userSlice";
import { flushChatPersistence } from "./chatPersistence";
import type { AppDispatch, RootState } from "./store";
export type { ConvoType };

function sortMsgs(a: MessageAttributes, b: MessageAttributes) {
  const ta = new Date(a.timestamp ?? 0).getTime();
  const tb = new Date(b.timestamp ?? 0).getTime();
  if (ta !== tb) return ta - tb;
  return String(a._id).localeCompare(String(b._id));
}

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
    messagesNextSkip: 0,
    messagesHasMore: false,
    loadingMoreMessages: false,
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
    setTypingUser: (
      state,
      action: PayloadAction<{
        chatId: string;
        user: ConvoType["isTypingList"][number];
      }>
    ) => {
      const convo = state.conversations.find((c) => c.id === action.payload.chatId);
      if (!convo) return;
      const { user } = action.payload;
      const others = (convo.isTypingList ?? []).filter((entry) => entry.id !== user.id);
      convo.isTypingList = [...others, user];
    },
    removeTypingUser: (state, action: PayloadAction<{ chatId: string; userId: string }>) => {
      const convo = state.conversations.find((c) => c.id === action.payload.chatId);
      if (!convo) return;
      convo.isTypingList = (convo.isTypingList ?? []).filter(
        (entry) => entry.id !== action.payload.userId
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
      state.messages = [...action.payload].sort(sortMsgs);
    },
    appendMessages: (state, action: PayloadAction<MessageAttributes[]>) => {
      const seen = new Set(state.messages.map((m) => String(m._id)));
      for (const m of action.payload) {
        if (!seen.has(String(m._id))) {
          seen.add(String(m._id));
          state.messages.push(m);
        }
      }
      state.messages.sort(sortMsgs);
    },
    setMessagesPagination: (
      state,
      action: PayloadAction<{ nextSkip: number; hasMore: boolean }>
    ) => {
      state.messagesNextSkip = action.payload.nextSkip;
      state.messagesHasMore = action.payload.hasMore;
    },
    setLoadingMoreMessages: (state, action: PayloadAction<boolean>) => {
      state.loadingMoreMessages = action.payload;
    },
    addMessage: (state, action: PayloadAction<MessageAttributes>) => {
      if (!state.messages.some((msg) => msg._id === action.payload._id)) {
        state.messages.push(action.payload);
        state.messages.sort(sortMsgs);
      }
    },
    editMessage: (state, action: PayloadAction<{ id: string; content: string }>) => {
      state.messages = state.messages?.map((msg) =>
        msg._id === action.payload.id ? { ...msg, content: action.payload.content } : msg
      );
    },
    markMessagesRead: (
      state,
      action: PayloadAction<{ messageIds: string[]; readerId: string }>
    ) => {
      const ids = new Set(action.payload.messageIds);
      state.messages.forEach((message) => {
        if (ids.has(String(message._id))) {
          message.isRead = { ...(message.isRead ?? {}), [action.payload.readerId]: true };
        }
      });
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
  setTypingUser,
  removeTypingUser,
  updateMessageReactions,
  deleteConversation,
  setMessages,
  appendMessages,
  setMessagesPagination,
  setLoadingMoreMessages,
  addMessage,
  editMessage,
  updateMessage,
  markMessagesRead,
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

function applyChats(dispatch: Dispatch, chats: AllChats) {
  const uid = chats.requestId;
  dispatch(setUserId(uid));

  const conversations = chats.chats?.map((chat) => {
    return new Chat(chat, chats.messages).getConvo(uid);
  });

  dispatch(setConversations(conversations));
  dispatch(setMessages((chats.messages ?? []) as MessageAttributes[]));

  const pg = chats.pagination?.messages;
  dispatch(
    setMessagesPagination({
      nextSkip: pg ? pg.skip + pg.limit : 0,
      hasMore: pg?.hasMore ?? false,
    })
  );

  dispatch(setSettings(chats.chatSettings));
  return conversations;
}

// Paint the chats saved in IndexedDB. They are already in the shape the UI reads.
function applySnapshot(dispatch: Dispatch, snapshot: ChatSnapshot) {
  dispatch(setUserId(snapshot.requestId));
  dispatch(setConversations(snapshot.conversations));
  dispatch(setMessages(snapshot.messages));

  const pg = snapshot.pagination?.messages;
  dispatch(
    setMessagesPagination({
      nextSkip: pg ? pg.skip + pg.limit : 0,
      hasMore: pg?.hasMore ?? false,
    })
  );

  dispatch(setSettings(snapshot.chatSettings));
  return snapshot.conversations;
}

// With a usable cache, ask only for what changed since it was saved and merge that in.
// Anything unexpected (no cursor, too old, delta too large, request failed) falls back to a full load.
async function loadFreshChats(cached: ChatSnapshot | null): Promise<AllChats> {
  const since = cached ? sinceForCache(cached) : null;
  if (cached && since) {
    try {
      const delta = await chatSystem.getChatsSince(since);
      if (!deltaOverflowed(delta)) return mergeDelta(cached, delta);
    } catch {
      // fall through to the full load
    }
  }
  return chatSystem.getAllChats();
}

async function runFetchChats(dispatch: Dispatch, userId?: string) {
  try {
    const cached = userId ? await loadChatSnapshot(userId) : null;
    const networkStatus = networkMonitor.getNetworkStatus();

    if (!networkStatus.online) {
      return cached ? applySnapshot(dispatch, cached) : undefined;
    }

    if (cached) {
      applySnapshot(dispatch, cached);
      dispatch(setLoading(false));
    } else {
      dispatch(setLoading(true));
    }

    const chats = await loadFreshChats(cached);
    const conversations = applyChats(dispatch, chats);

    // The live persister writes the rows; record the sync cursor only once they are stored, so
    // the cursor never gets ahead of the data it describes. (It waits while `loading` is true.)
    dispatch(setLoading(false));
    if (await flushChatPersistence()) {
      await saveChatMeta({
        requestId: chats.requestId,
        pagination: chats.pagination,
        serverTime: chats.serverTime,
      });
    }
    return conversations;
  } catch (error) {
    dispatch(setError("Failed to fetch chats"));
    throw error;
  } finally {
    dispatch(setLoading(false));
  }
}

const inFlightFetches = new Map<string, ReturnType<typeof runFetchChats>>();

// Fetch chats on app load. Pass `userId` to paint instantly from the IndexedDB cache
// (and to fall back to it while offline) before the network response arrives.
//
// Several places ask for the chats at startup (the app shell and the user provider). Calls that
// pass a `userId` while one is already running share it, so they don't each hit the API with the
// same cursor. Calls without a `userId` (e.g. after joining a chat by invite) always fetch afresh.
export const fetchChats = (dispatch: Dispatch, userId?: string) => {
  if (!userId) return runFetchChats(dispatch);
  const running = inFlightFetches.get(userId);
  if (running) return running;
  const request = runFetchChats(dispatch, userId).finally(() => inFlightFetches.delete(userId));
  inFlightFetches.set(userId, request);
  return request;
};

export function fetchMoreChatMessages() {
  return async (dispatch: AppDispatch, getState: () => RootState) => {
    const s = getState().chat;
    if (!s.messagesHasMore || s.loadingMoreMessages) return;

    dispatch(setLoadingMoreMessages(true));
    try {
      const batch = await chatRepository.fetchChatsPage(s.messagesNextSkip);
      const extras = (batch.messages ?? []) as MessageAttributes[];
      if (extras.length) {
        dispatch(appendMessages(extras));
      }
      const pg = batch.pagination?.messages;
      dispatch(
        setMessagesPagination({
          nextSkip: pg ? pg.skip + pg.limit : s.messagesNextSkip,
          hasMore: pg?.hasMore ?? false,
        })
      );
    } catch {
      dispatch(setError("Failed to load older messages"));
    } finally {
      dispatch(setLoadingMoreMessages(false));
    }
  };
}
